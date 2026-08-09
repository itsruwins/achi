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
