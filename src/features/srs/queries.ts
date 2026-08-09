import { createClient } from "@/lib/supabase/server";

import { todayString } from "./algorithm";

export type DueCard = {
  cardId: string;
  deckId: string;
  deckTitle: string;
  front: string;
  back: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  hint: string | null;
  category: string | null;
  /** Null for a card that has never been reviewed. */
  intervalDays: number | null;
};

type DueRow = {
  card_id: string;
  deck_id: string;
  interval_days: number;
  cards: {
    front: string;
    back: string;
    front_image_url: string | null;
    back_image_url: string | null;
    hint: string | null;
    category: string | null;
    decks: { title: string } | null;
  } | null;
};

export async function isEnrolled(
  userId: string,
  deckId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("deck_enrollments")
    .select("deck_id")
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .maybeSingle();

  return Boolean(data);
}

export async function listEnrolledDeckIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deck_enrollments")
    .select("deck_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[srs] listEnrolledDeckIds failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.deck_id as string);
}

/**
 * Cards due for review today.
 *
 * `due_date <= today` rather than `= today`: a card missed on Tuesday is still
 * due on Thursday. Filtering on equality would silently drop every card from
 * any day the user skipped, which is precisely the history worth catching up on.
 */
export async function listDueCards(
  userId: string,
  options: { deckId?: string; categories?: string[]; limit?: number } = {},
): Promise<DueCard[]> {
  const supabase = await createClient();

  let query = supabase
    .from("card_srs")
    .select(
      "card_id, deck_id, interval_days, cards!inner(front, back, front_image_url, back_image_url, hint, category, decks!inner(title))",
    )
    .eq("user_id", userId)
    .lte("due_date", todayString())
    .order("due_date", { ascending: true })
    .limit(options.limit ?? 100);

  if (options.deckId) query = query.eq("deck_id", options.deckId);
  if (options.categories?.length) {
    query = query.in("cards.category", options.categories);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[srs] listDueCards failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as DueRow[])
    .filter((row) => row.cards)
    .map((row) => ({
      cardId: row.card_id,
      deckId: row.deck_id,
      deckTitle: row.cards?.decks?.title ?? "Untitled deck",
      front: row.cards?.front ?? "",
      back: row.cards?.back ?? "",
      frontImageUrl: row.cards?.front_image_url ?? null,
      backImageUrl: row.cards?.back_image_url ?? null,
      hint: row.cards?.hint ?? null,
      category: row.cards?.category ?? null,
      intervalDays: row.interval_days,
    }));
}

export async function countDueCards(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("card_srs")
    .select("card_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due_date", todayString());

  if (error) {
    console.error("[srs] countDueCards failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Topics present among the cards currently due, for the review filter. */
export async function listDueCategories(userId: string): Promise<string[]> {
  const due = await listDueCards(userId, { limit: 1000 });

  const categories = new Set<string>();
  for (const card of due) {
    const category = card.category?.trim();
    if (category) categories.add(category);
  }

  return [...categories].sort((a, b) => a.localeCompare(b));
}
