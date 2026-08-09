import "server-only";

/**
 * Pull plain text out of an uploaded study document.
 *
 * Runs on the server rather than in the browser. Client-side PDF parsing means
 * shipping a multi-megabyte worker to every visitor and wiring it through the
 * bundler; here it is three server dependencies and no build configuration.
 * The extracted text is handed straight back to the browser so the user can
 * read and edit it before spending a generation on it — extraction itself costs
 * no AI quota.
 */

export type ExtractedDocument = {
  text: string;
  /** Present for PDFs; undefined for formats without a page concept. */
  pages?: number;
  truncated: boolean;
};

export const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
] as const;

/** Refused before reading: an 80 MB scan is not study notes. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class UnsupportedFileError extends Error {}
export class EmptyDocumentError extends Error {}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Collapse the whitespace that layout-based formats produce.
 *
 * PDFs in particular emit a lot of incidental spacing and hard line breaks
 * mid-sentence. Left alone, that noise ends up quoted verbatim on the cards.
 * Blank lines are preserved because they carry the document's structure.
 */
function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fromPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  return {
    text: normalize(Array.isArray(text) ? text.join("\n\n") : text),
    pages: totalPages,
    truncated: false,
  };
}

async function fromDocx(bytes: Uint8Array): Promise<ExtractedDocument> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return { text: normalize(result.value), truncated: false };
}

/**
 * PowerPoint text.
 *
 * A .pptx is a zip of XML. Every run of visible text sits in an `<a:t>` element,
 * so slide text is those elements in document order — no XML parser needed for
 * what is effectively one tag.
 *
 * Slides are sorted numerically: the archive lists `slide10.xml` before
 * `slide2.xml`, and lexicographic order would silently scramble the deck.
 */
async function fromPptx(bytes: Uint8Array): Promise<ExtractedDocument> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);

  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const order = (path: string) => Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return order(a) - order(b);
    });

  const slides: string[] = [];

  for (const path of slidePaths) {
    const xml = await zip.files[path].async("string");
    const runs = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) =>
      decodeXmlEntities(match[1]),
    );

    const slideText = normalize(runs.join(" "));
    if (slideText) slides.push(slideText);
  }

  return { text: slides.join("\n\n"), pages: slidePaths.length, truncated: false };
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Ampersand last, or "&amp;lt;" would decode twice into "<".
    .replace(/&amp;/g, "&");
}

export async function extractDocument(
  filename: string,
  bytes: Uint8Array,
  maxChars: number,
): Promise<ExtractedDocument> {
  const extension = extensionOf(filename);

  let result: ExtractedDocument;

  switch (extension) {
    case ".pdf":
      result = await fromPdf(bytes);
      break;
    case ".docx":
      result = await fromDocx(bytes);
      break;
    case ".pptx":
      result = await fromPptx(bytes);
      break;
    case ".txt":
    case ".md":
      result = {
        text: normalize(new TextDecoder().decode(bytes)),
        truncated: false,
      };
      break;
    default:
      throw new UnsupportedFileError(
        `Achi can read ${SUPPORTED_EXTENSIONS.join(", ")} files.`,
      );
  }

  if (!result.text) {
    throw new EmptyDocumentError(
      "No text found. If this is a scanned document or images of slides, the text isn't readable — it would need OCR.",
    );
  }

  if (result.text.length > maxChars) {
    // Cut on a paragraph boundary so the tail isn't a severed sentence the
    // model then tries to make a card out of.
    const clipped = result.text.slice(0, maxChars);
    const lastBreak = clipped.lastIndexOf("\n\n");
    return {
      ...result,
      text: lastBreak > maxChars * 0.5 ? clipped.slice(0, lastBreak) : clipped,
      truncated: true,
    };
  }

  return result;
}
