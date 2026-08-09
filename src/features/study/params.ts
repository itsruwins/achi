import type { QuestionType } from "./types";

type ParamValue = string | string[] | undefined;

/**
 * Read a repeated query param.
 *
 * A GET form with several checkboxes of the same name yields a string for one
 * checked box and an array for several — normalizing here keeps that quirk out
 * of the pages.
 */
export function readList(value: ParamValue): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((entry) => entry.trim()).filter(Boolean);
}

const ALL_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "identification",
  "cloze",
];

export function readQuestionTypes(value: ParamValue): QuestionType[] {
  const requested = readList(value).filter((entry): entry is QuestionType =>
    ALL_TYPES.includes(entry as QuestionType),
  );
  // An empty selection means "no preference", not "no questions".
  return requested.length > 0 ? requested : ["multiple_choice"];
}

export function readCount(value: ParamValue): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, 100);
}

/** Where "Done" and "Quit" go back to. */
export function studyBackHref(deckIds: string[]): string {
  return deckIds.length === 1 ? `/decks/${deckIds[0]}` : "/study";
}
