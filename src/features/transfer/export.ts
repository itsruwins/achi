import { CSV_HEADERS, toCsv } from "./csv";
import { ACHI_FORMAT_VERSION, type TransferDeck } from "./format";

type ExportableDeck = {
  title: string;
  description: string | null;
  emoji: string | null;
};

type ExportableCard = {
  front: string;
  back: string;
  category: string | null;
  hint: string | null;
};

export function buildJsonExport(
  deck: ExportableDeck,
  cards: ExportableCard[],
): TransferDeck {
  return {
    achi: ACHI_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      title: deck.title,
      description: deck.description,
      emoji: deck.emoji,
    },
    cards: cards.map((card) => ({
      front: card.front,
      back: card.back,
      category: card.category,
      hint: card.hint,
    })),
  };
}

export function buildCsvExport(cards: ExportableCard[]): string {
  return toCsv([
    [...CSV_HEADERS],
    ...cards.map((card) => [
      card.front,
      card.back,
      card.category ?? "",
      card.hint ?? "",
    ]),
  ]);
}

/** A downloadable CSV showing the expected columns and one example row. */
export function csvTemplate(): string {
  return toCsv([
    [...CSV_HEADERS],
    [
      "What is the powerhouse of the cell?",
      "The mitochondrion",
      "Cell biology",
      "It has its own DNA",
    ],
    ["Define osmosis", "Diffusion of water across a semi-permeable membrane", "Transport", ""],
  ]);
}

/**
 * Make a filename safe to put in a Content-Disposition header.
 *
 * Deck titles are user input, and a quote or newline in one would let a crafted
 * title inject header content. Anything outside a conservative set is replaced.
 */
export function safeDownloadName(title: string, extension: string): string {
  const base = title
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${base || "deck"}${extension}`;
}
