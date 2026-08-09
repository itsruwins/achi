import "server-only";

import { CSV_HEADERS, mapHeaders, parseCsv } from "./csv";
import {
  keepUsableCards,
  stripHtml,
  titleFromFilename,
  TransferDeckSchema,
  type ImportedDeck,
  type TransferCard,
} from "./format";

export class ImportFormatError extends Error {}

export const IMPORTABLE_EXTENSIONS = [".json", ".csv", ".apkg"] as const;

/** Refused before reading. A deck this large is a mistake, not a study set. */
export const MAX_IMPORT_BYTES = 30 * 1024 * 1024;
export const MAX_IMPORT_CARDS = 2_000;

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function normalizeCard(raw: {
  front?: string | null;
  back?: string | null;
  category?: string | null;
  hint?: string | null;
}): TransferCard {
  return {
    front: truncate(stripHtml(raw.front ?? ""), 2000),
    back: truncate(stripHtml(raw.back ?? ""), 2000),
    category: raw.category?.trim() ? truncate(raw.category.trim(), 40) : null,
    hint: raw.hint?.trim() ? truncate(raw.hint.trim(), 200) : null,
  };
}

/** An Achi export, or anything else shaped like one. */
function fromJson(filename: string, text: string): ImportedDeck {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new ImportFormatError("That file isn't valid JSON.");
  }

  const parsed = TransferDeckSchema.safeParse(payload);

  if (parsed.success) {
    if (parsed.data.achi > 1) {
      throw new ImportFormatError(
        "That file was exported by a newer version of Achi than this one can read.",
      );
    }

    return {
      title: parsed.data.deck.title,
      description: parsed.data.deck.description ?? null,
      cards: keepUsableCards(parsed.data.cards.map(normalizeCard)),
      notes: [],
    };
  }

  // Also accept a bare array of cards — the shape people hand-write, and what
  // several other flashcard tools export.
  if (Array.isArray(payload)) {
    const cards = keepUsableCards(
      payload
        .filter((entry): entry is Record<string, unknown> =>
          Boolean(entry && typeof entry === "object"),
        )
        .map((entry) =>
          normalizeCard({
            front: asText(entry.front ?? entry.question ?? entry.term),
            back: asText(entry.back ?? entry.answer ?? entry.definition),
            category: asText(entry.category ?? entry.topic),
            hint: asText(entry.hint),
          }),
        ),
    );

    if (cards.length === 0) {
      throw new ImportFormatError(
        "No cards found. Each entry needs a front/question and a back/answer.",
      );
    }

    return {
      title: titleFromFilename(filename),
      description: null,
      cards,
      notes: ["Imported from a plain card list, so the deck name came from the filename."],
    };
  }

  throw new ImportFormatError(
    "That JSON isn't a deck Achi recognises. Export from Achi, or use a list of cards with front and back.",
  );
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function fromCsv(filename: string, text: string): ImportedDeck {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new ImportFormatError("That CSV is empty.");

  const headers = mapHeaders(rows[0]);
  const notes: string[] = [];

  // No recognisable header means row 1 is data; fall back to column order.
  const mapping =
    headers ?? { front: 0, back: 1, category: 2, hint: 3 };
  const body = headers ? rows.slice(1) : rows;

  if (!headers) {
    notes.push(
      `No header row found, so columns were read in order: ${CSV_HEADERS.join(", ")}.`,
    );
  }

  const cards = keepUsableCards(
    body.map((row) =>
      normalizeCard({
        front: row[mapping.front ?? -1] ?? "",
        back: row[mapping.back ?? -1] ?? "",
        category: row[mapping.category ?? -1] ?? null,
        hint: row[mapping.hint ?? -1] ?? null,
      }),
    ),
  );

  if (cards.length === 0) {
    throw new ImportFormatError(
      "No usable rows. Each row needs text in the front or back column.",
    );
  }

  const dropped = body.length - cards.length;
  if (dropped > 0) {
    notes.push(`${dropped} empty ${dropped === 1 ? "row was" : "rows were"} skipped.`);
  }

  return {
    title: titleFromFilename(filename),
    description: null,
    cards,
    notes,
  };
}

export async function importDocument(
  filename: string,
  bytes: Uint8Array,
): Promise<ImportedDeck> {
  const extension = extensionOf(filename);
  let deck: ImportedDeck;

  switch (extension) {
    case ".json":
      deck = fromJson(filename, new TextDecoder().decode(bytes));
      break;
    case ".csv":
      deck = fromCsv(filename, new TextDecoder().decode(bytes));
      break;
    case ".apkg": {
      // Imported lazily so the SQLite and zip machinery is only loaded for the
      // format that needs it.
      const { parseApkg } = await import("./apkg");
      deck = await parseApkg(filename, bytes);
      break;
    }
    default:
      throw new ImportFormatError(
        `Achi can import ${IMPORTABLE_EXTENSIONS.join(", ")} files.`,
      );
  }

  if (deck.cards.length === 0) {
    throw new ImportFormatError("That file has no cards in it.");
  }

  if (deck.cards.length > MAX_IMPORT_CARDS) {
    deck.notes.push(
      `That file had ${deck.cards.length.toLocaleString()} cards. Only the first ${MAX_IMPORT_CARDS.toLocaleString()} were imported.`,
    );
    deck.cards = deck.cards.slice(0, MAX_IMPORT_CARDS);
  }

  return deck;
}
