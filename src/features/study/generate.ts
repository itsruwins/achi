import { CLOZE_MARKER } from "@/features/cards/types";

import type { Question, QuestionType, StudyCard } from "./types";

/**
 * Fisher-Yates. Returns a new array — callers pass in query results they don't
 * own, and shuffling those in place makes ordering depend on call order.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Normalize a typed answer before comparing.
 *
 * Case, surrounding punctuation, and inconsistent spacing are typing noise, not
 * evidence someone didn't know the answer. Anything beyond this — synonyms,
 * word order, near-misses — needs judgement a string comparison can't make, so
 * the UI lets people override the verdict instead of guessing for them.
 */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"“”‘’()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function isAnswerCorrect(given: string, expected: string): boolean {
  const a = normalizeAnswer(given);
  const b = normalizeAnswer(expected);
  return a.length > 0 && a === b;
}

/** A card can only be asked as a question if it has text on both sides. */
function isAskable(card: StudyCard): boolean {
  return card.front.trim().length > 0 && card.back.trim().length > 0;
}

function base(card: StudyCard) {
  return {
    cardId: card.id,
    deckTitle: card.deckTitle,
    category: card.category,
  };
}

function buildMultipleChoice(
  card: StudyCard,
  pool: StudyCard[],
): Question | null {
  const answer = card.back.trim();

  // Distractors are other cards' answers from the same session, so the wrong
  // options are plausible rather than obviously filler.
  const distractors = [
    ...new Set(
      pool
        .filter((other) => other.id !== card.id)
        .map((other) => other.back.trim())
        .filter((text) => text.length > 0 && text !== answer),
    ),
  ];

  // Two options is a true/false question wearing a disguise. Fall back instead.
  if (distractors.length < 2) return null;

  const options = shuffle([answer, ...shuffle(distractors).slice(0, 3)]);

  return {
    ...base(card),
    type: "multiple_choice",
    prompt: card.front,
    options,
    answerIndex: options.indexOf(answer),
  };
}

function buildTrueFalse(card: StudyCard, pool: StudyCard[]): Question | null {
  const answer = card.back.trim();

  const decoys = pool
    .filter((other) => other.id !== card.id)
    .map((other) => other.back.trim())
    .filter((text) => text.length > 0 && text !== answer);

  // Half the questions should be false, or "always true" becomes the strategy.
  const askTrue = decoys.length === 0 || Math.random() < 0.5;

  return {
    ...base(card),
    type: "true_false",
    prompt: card.front,
    proposed: askTrue ? answer : decoys[Math.floor(Math.random() * decoys.length)],
    isTrue: askTrue,
  };
}

function buildIdentification(card: StudyCard): Question {
  return {
    ...base(card),
    type: "identification",
    prompt: card.front,
    answer: card.back.trim(),
  };
}

/**
 * Cloze questions come from cards the author marked with `___`.
 *
 * Auto-detecting which term to blank would need to know which word carries the
 * meaning — guessing wrong produces questions like "The ___ of the cell",
 * which tests nothing. The marker is the author saying where the gap goes.
 */
function buildCloze(card: StudyCard): Question | null {
  if (!card.front.includes(CLOZE_MARKER)) return null;

  return {
    ...base(card),
    type: "cloze",
    prompt: card.front,
    answer: card.back.trim(),
  };
}

export type GenerateOptions = {
  types: QuestionType[];
  /** Cap on questions; omit for one per card. */
  limit?: number;
};

/**
 * Turn cards into a quiz.
 *
 * Each card yields at most one question. When a card can't support the chosen
 * type — too few cards for distractors, no cloze marker — it falls back rather
 * than dropping out, so the quiz length matches what was asked for.
 */
export function generateQuestions(
  cards: StudyCard[],
  { types, limit }: GenerateOptions,
): Question[] {
  const askable = cards.filter(isAskable);
  if (askable.length === 0 || types.length === 0) return [];

  const selected = shuffle(askable).slice(0, limit ?? askable.length);
  const questions: Question[] = [];

  for (const card of selected) {
    // Try the requested types in random order, then fall back to identification,
    // which any askable card can support.
    const candidates = shuffle(types);
    let question: Question | null = null;

    for (const type of candidates) {
      question =
        type === "multiple_choice"
          ? buildMultipleChoice(card, askable)
          : type === "true_false"
            ? buildTrueFalse(card, askable)
            : type === "cloze"
              ? buildCloze(card)
              : buildIdentification(card);

      if (question) break;
    }

    questions.push(question ?? buildIdentification(card));
  }

  return questions;
}
