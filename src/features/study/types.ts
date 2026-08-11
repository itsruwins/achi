export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "identification"
  | "cloze";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  identification: "Type the answer",
  cloze: "Fill in the blank",
};

/** Every type, in the order they're offered. */
export const QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "identification",
  "cloze",
];

/**
 * What a quiz asks when nobody chose.
 *
 * A mix beats a single type — answering the same shape thirty times turns into
 * pattern matching on the options rather than recall. Cloze is left out because
 * it only works on cards whose front carries the `___` marker; offering it by
 * default would quietly degrade to identification on decks that don't use it.
 */
export const DEFAULT_QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "identification",
];

type Base = {
  cardId: string;
  /** Deck the card came from — shown in cross-deck sessions. */
  deckTitle: string;
  category: string | null;
};

export type Question = Base &
  (
    | {
        type: "multiple_choice";
        prompt: string;
        options: string[];
        answerIndex: number;
      }
    | {
        type: "true_false";
        prompt: string;
        /** The answer being proposed, which may be a decoy from another card. */
        proposed: string;
        isTrue: boolean;
      }
    | { type: "identification"; prompt: string; answer: string }
    | { type: "cloze"; prompt: string; answer: string }
  );

/** A card prepared for study, carrying its deck for display. */
export type StudyCard = {
  id: string;
  deck_id: string;
  deckTitle: string;
  front: string;
  back: string;
  front_image_url: string | null;
  back_image_url: string | null;
  category: string | null;
  hint: string | null;
};
