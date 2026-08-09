export type Card = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  front_image_url: string | null;
  back_image_url: string | null;
  category: string | null;
  hint: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

/** Marker used in card text to blank a term for cloze questions in Phase 3. */
export const CLOZE_MARKER = "___";

export function hasCloze(text: string): boolean {
  return text.includes(CLOZE_MARKER);
}

/** Distinct categories in a deck, for the study-mode filters. */
export function deriveCategories(cards: Pick<Card, "category">[]): string[] {
  const seen = new Set<string>();
  for (const card of cards) {
    const category = card.category?.trim();
    if (category) seen.add(category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
