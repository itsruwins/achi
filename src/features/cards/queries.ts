import { createClient } from "@/lib/supabase/server";

import type { Card } from "./types";

const CARD_COLUMNS =
  "id, deck_id, front, back, front_image_url, back_image_url, category, hint, position, created_at, updated_at";

/**
 * Cards in a deck, in study order.
 *
 * Ordered by (position, created_at) to match cards_deck_position_idx. The
 * created_at tiebreak keeps ordering stable when several cards share a
 * position — which happens after a bulk import that doesn't assign them.
 */
export async function listCards(deckId: string): Promise<Card[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .eq("deck_id", deckId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[cards] listCards failed:", error.message);
    return [];
  }

  return (data ?? []) as Card[];
}
