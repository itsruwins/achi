import { createClient } from "@/lib/supabase/server";

import type { StudyCard } from "./types";

type CardWithDeck = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  front_image_url: string | null;
  back_image_url: string | null;
  category: string | null;
  hint: string | null;
  decks: { title: string } | null;
};

/**
 * Cards to study, across one deck or many.
 *
 * `decks!inner` makes this a join rather than two round trips, and filtering on
 * `decks.user_id` scopes the result to the caller's own decks even when deck
 * ids arrive from the query string.
 */
export async function listStudyCards(
  userId: string,
  options: { deckIds?: string[]; categories?: string[] } = {},
): Promise<StudyCard[]> {
  const supabase = await createClient();

  let query = supabase
    .from("cards")
    .select(
      "id, deck_id, front, back, front_image_url, back_image_url, category, hint, decks!inner(title, user_id)",
    )
    .eq("decks.user_id", userId);

  if (options.deckIds?.length) {
    query = query.in("deck_id", options.deckIds);
  }
  if (options.categories?.length) {
    query = query.in("category", options.categories);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[study] listStudyCards failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as CardWithDeck[]).map((card) => ({
    id: card.id,
    deck_id: card.deck_id,
    deckTitle: card.decks?.title ?? "Untitled deck",
    front: card.front,
    back: card.back,
    front_image_url: card.front_image_url,
    back_image_url: card.back_image_url,
    category: card.category,
    hint: card.hint,
  }));
}

/** Every topic the user has used, for the cross-deck filters. */
export async function listAllCategories(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cards")
    .select("category, decks!inner(user_id)")
    .eq("decks.user_id", userId)
    .not("category", "is", null);

  if (error) {
    console.error("[study] listAllCategories failed:", error.message);
    return [];
  }

  const categories = new Set<string>();
  for (const row of (data ?? []) as { category: string | null }[]) {
    const category = row.category?.trim();
    if (category) categories.add(category);
  }

  return [...categories].sort((a, b) => a.localeCompare(b));
}
