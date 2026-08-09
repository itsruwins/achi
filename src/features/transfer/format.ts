import * as z from "zod";

/**
 * The `.achi.json` export envelope.
 *
 * Versioned from the first release so a future format change can be detected
 * rather than guessed at. An importer that has to sniff the shape of a file is
 * an importer that silently mis-reads the next version of it.
 */
export const ACHI_FORMAT_VERSION = 1;

export const TransferCardSchema = z.object({
  front: z.string().max(2000),
  back: z.string().max(2000),
  category: z.string().max(40).nullish(),
  hint: z.string().max(200).nullish(),
});

export const TransferDeckSchema = z.object({
  achi: z.number().int().positive(),
  exportedAt: z.string().optional(),
  deck: z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(500).nullish(),
    emoji: z.string().max(8).nullish(),
  }),
  cards: z.array(TransferCardSchema),
});

export type TransferDeck = z.infer<typeof TransferDeckSchema>;
export type TransferCard = z.infer<typeof TransferCardSchema>;

/**
 * A deck ready to import, whatever file it came from.
 *
 * CSV and Anki files carry no deck title, so the importer supplies one from the
 * filename and the user can edit it before saving.
 */
export type ImportedDeck = {
  title: string;
  description: string | null;
  cards: TransferCard[];
  /** Set when a file was well-formed but partly unusable. */
  notes: string[];
};

/** Filename → a reasonable deck title. */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Imported deck";
  return cleaned.slice(0, 120);
}

/**
 * Strip the HTML that Anki (and pasted rich text) leaves in card fields.
 *
 * Anki stores fields as HTML, so an unprocessed import puts literal `<div>`
 * and `&nbsp;` on the front of cards. Block-level tags become line breaks so
 * multi-line fields survive as multi-line text rather than running together.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr)\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // Ampersand last, or "&amp;lt;" decodes twice.
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Drop cards that carry no usable content, mirroring the cards_not_empty check. */
export function keepUsableCards(cards: TransferCard[]): TransferCard[] {
  return cards.filter((card) => card.front.trim() || card.back.trim());
}
