/** Mirrors the CHECK constraints in 0002_decks.sql. */

export type CardInput = {
  front: string;
  back: string;
  category: string;
  hint: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
};

export type CardFieldErrors = Partial<
  Record<"front" | "back" | "category" | "hint", string>
>;

export function validateCard(input: CardInput): CardFieldErrors {
  const errors: CardFieldErrors = {};

  if (input.front.length > 2000) errors.front = "At most 2000 characters.";
  if (input.back.length > 2000) errors.back = "At most 2000 characters.";
  if (input.category.length > 40) errors.category = "At most 40 characters.";
  if (input.hint.length > 200) errors.hint = "At most 200 characters.";

  // Matches the cards_not_empty constraint: a card needs *something* on it.
  const isEmpty =
    !input.front.trim() &&
    !input.back.trim() &&
    !input.frontImageUrl &&
    !input.backImageUrl;

  if (isEmpty) errors.front = "Add text or an image to at least one side.";

  return errors;
}

export function hasErrors(errors: CardFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
