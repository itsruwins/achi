export type Visibility = "private" | "unlisted" | "public";

export type DeckSource = "manual" | "ai" | "import" | "duplicate";

export type Deck = {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  emoji: string | null;
  visibility: Visibility;
  source: DeckSource;
  is_pinned: boolean;
  card_count: number;
  created_at: string;
  updated_at: string;
};

/** How many decks a user may pin to the top of their grid. */
export const MAX_PINNED_DECKS = 3;

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  private: "Only you can open this deck.",
  unlisted: "Anyone with the link can view it.",
  public: "Listed publicly and open to anyone.",
};
