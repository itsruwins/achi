"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";

import { GeneratedDeckSchema } from "./schema";

export type SaveResult = { ok: false; error: string };

/**
 * Persist a generated deck after the user has reviewed it.
 *
 * Re-validated here rather than trusted: the payload has been through the
 * browser, so "it came from our own /api/generate" is not something the server
 * can know. On success this redirects and never returns.
 */
export async function saveGeneratedDeck(
  payload: unknown,
): Promise<SaveResult | never> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const parsed = GeneratedDeckSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "That deck didn't look right. Try generating again." };
  }

  const deck = parsed.data;
  if (deck.cards.length === 0) {
    return { ok: false, error: "There are no cards to save." };
  }

  const supabase = await createClient();

  const { data: created, error: deckError } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: deck.title.slice(0, 120) || "Generated deck",
      description: deck.description.slice(0, 500) || null,
      source: "ai",
    })
    .select("id")
    .single();

  if (deckError || !created) {
    return { ok: false, error: deckError?.message ?? "Could not create the deck." };
  }

  const { error: cardsError } = await supabase.from("cards").insert(
    deck.cards.map((card, position) => ({
      deck_id: created.id,
      front: card.front.slice(0, 2000),
      back: card.back.slice(0, 2000),
      // The model is asked for an empty string when a field doesn't apply;
      // the database wants null.
      category: card.category.trim().slice(0, 40) || null,
      hint: card.hint.trim().slice(0, 200) || null,
      position,
    })),
  );

  if (cardsError) {
    // Roll back the empty deck rather than leaving a titled shell behind.
    await supabase.from("decks").delete().eq("id", created.id);
    return { ok: false, error: cardsError.message };
  }

  revalidatePath("/decks");
  redirect(`/decks/${created.id}`);
}
