import { createClient } from "@/lib/supabase/server";

import type { Deck } from "./types";

const DECK_COLUMNS =
  "id, user_id, folder_id, title, description, emoji, visibility, source, is_pinned, card_count, created_at, updated_at";

/**
 * Decks owned by the current user, pinned first then most recently touched —
 * matching the decks_user_updated_idx index so this stays an index scan.
 *
 * RLS already scopes rows to the owner; the explicit user_id filter is here so
 * the query planner can use that index rather than relying on the policy
 * predicate alone.
 */
export async function listDecks(
  userId: string,
  options: { folderId?: string | null } = {},
): Promise<Deck[]> {
  const supabase = await createClient();

  let query = supabase
    .from("decks")
    .select(DECK_COLUMNS)
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (options.folderId) {
    query = query.eq("folder_id", options.folderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[decks] listDecks failed:", error.message);
    return [];
  }

  return (data ?? []) as Deck[];
}

/** A single deck, or null if it doesn't exist or RLS hides it. */
export async function getDeck(deckId: string): Promise<Deck | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decks")
    .select(DECK_COLUMNS)
    .eq("id", deckId)
    .maybeSingle();

  if (error) {
    console.error("[decks] getDeck failed:", error.message);
    return null;
  }

  return data as Deck | null;
}

export async function countPinnedDecks(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("decks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_pinned", true);

  if (error) {
    console.error("[decks] countPinnedDecks failed:", error.message);
    return 0;
  }

  return count ?? 0;
}
