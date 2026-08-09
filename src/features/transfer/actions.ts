"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";

import { TransferCardSchema } from "./format";

const SavePayloadSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  cards: z.array(TransferCardSchema).min(1).max(2_000),
});

export type SaveImportResult = { ok: false; error: string };

/**
 * Persist an imported deck after the user has reviewed it.
 *
 * Re-validated rather than trusted: the payload has been through the browser,
 * so "it came from our own /api/import" is not something the server can know.
 * Redirects on success and never returns.
 */
export async function saveImportedDeck(
  payload: unknown,
): Promise<SaveImportResult | never> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const parsed = SavePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "That deck didn't look right. Try importing again." };
  }

  const { title, description, cards } = parsed.data;
  const supabase = await createClient();

  const { data: created, error: deckError } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      source: "import",
    })
    .select("id")
    .single();

  if (deckError || !created) {
    return { ok: false, error: deckError?.message ?? "Could not create the deck." };
  }

  // One batch rather than a row at a time: a 500-card Anki deck would otherwise
  // be 500 round trips.
  const { error: cardsError } = await supabase.from("cards").insert(
    cards.map((card, position) => ({
      deck_id: created.id,
      front: card.front,
      back: card.back,
      category: card.category?.trim() || null,
      hint: card.hint?.trim() || null,
      position,
    })),
  );

  if (cardsError) {
    // Roll back rather than leaving an empty titled deck behind.
    await supabase.from("decks").delete().eq("id", created.id);
    return { ok: false, error: cardsError.message };
  }

  revalidatePath("/decks");
  redirect(`/decks/${created.id}`);
}
