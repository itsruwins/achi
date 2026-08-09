"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";
import { getDeck } from "@/features/decks/queries";

import { hasErrors, validateCard, type CardFieldErrors } from "./validation";

export type CardFormState = {
  formError?: string;
  fieldErrors?: CardFieldErrors;
  /** Bumped on success so the client form knows to reset itself. */
  savedAt?: number;
};

async function requireDeckOwner(deckId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const deck = await getDeck(deckId);
  if (!deck || deck.user_id !== user.id) redirect("/decks");

  return { userId: user.id, deck };
}

function readCardInput(formData: FormData) {
  return {
    front: String(formData.get("front") ?? "").trim(),
    back: String(formData.get("back") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    hint: String(formData.get("hint") ?? "").trim(),
    frontImageUrl: String(formData.get("frontImageUrl") ?? "").trim() || null,
    backImageUrl: String(formData.get("backImageUrl") ?? "").trim() || null,
  };
}

export async function createCard(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  const deckId = String(formData.get("deckId") ?? "");
  await requireDeckOwner(deckId);

  const input = readCardInput(formData);
  const fieldErrors = validateCard(input);
  if (hasErrors(fieldErrors)) return { fieldErrors };

  const supabase = await createClient();

  // Append to the end. Read-then-write races only matter if the same user adds
  // two cards concurrently from two tabs, and the worst case is two cards
  // sharing a position — which the created_at tiebreak in listCards absorbs.
  const { data: last } = await supabase
    .from("cards")
    .select("position")
    .eq("deck_id", deckId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("cards").insert({
    deck_id: deckId,
    front: input.front,
    back: input.back,
    category: input.category || null,
    hint: input.hint || null,
    front_image_url: input.frontImageUrl,
    back_image_url: input.backImageUrl,
    position: (last?.position ?? -1) + 1,
  });

  if (error) return { formError: error.message };

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  return { savedAt: Date.now() };
}

export async function updateCard(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  const deckId = String(formData.get("deckId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  await requireDeckOwner(deckId);

  const input = readCardInput(formData);
  const fieldErrors = validateCard(input);
  if (hasErrors(fieldErrors)) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({
      front: input.front,
      back: input.back,
      category: input.category || null,
      hint: input.hint || null,
      front_image_url: input.frontImageUrl,
      back_image_url: input.backImageUrl,
    })
    .eq("id", cardId)
    .eq("deck_id", deckId);

  if (error) return { formError: error.message };

  revalidatePath(`/decks/${deckId}`);
  return { savedAt: Date.now() };
}

export async function deleteCard(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  await requireDeckOwner(deckId);

  const supabase = await createClient();
  await supabase.from("cards").delete().eq("id", cardId).eq("deck_id", deckId);

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
}

/**
 * Swap a card with its neighbour.
 *
 * Positions can contain ties and gaps (imports, concurrent inserts), so this
 * works off the rendered order rather than trusting position arithmetic: read
 * the deck's cards in display order, find the card, swap it with the adjacent
 * one, and rewrite both positions from the resulting index. That is correct
 * even when every card currently has position 0.
 */
export async function moveCard(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  await requireDeckOwner(deckId);

  if (direction !== "up" && direction !== "down") return;

  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("deck_id", deckId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (!cards?.length) return;

  const index = cards.findIndex((card) => card.id === cardId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= cards.length) return;

  const reordered = [...cards];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Renumber the whole deck. A deck is a few hundred cards at most, and
  // rewriting every position leaves the sequence dense and tie-free.
  await Promise.all(
    reordered.map((card, position) =>
      supabase.from("cards").update({ position }).eq("id", card.id),
    ),
  );

  revalidatePath(`/decks/${deckId}`);
}
