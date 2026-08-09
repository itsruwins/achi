"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";

import { countPinnedDecks, getDeck } from "./queries";
import { MAX_PINNED_DECKS } from "./types";
import {
  isVisibility,
  normalizeEmoji,
  validateDeckDescription,
  validateDeckTitle,
} from "./validation";

export type DeckFormState = {
  formError?: string;
  fieldErrors?: Partial<Record<"title" | "description", string>>;
};

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user.id;
}

/**
 * Confirm the current user owns this deck before mutating it.
 *
 * RLS would reject the write anyway, but that surfaces as an opaque "0 rows
 * updated" rather than an error — this turns it into a clear failure and
 * avoids reporting success for a write that silently did nothing.
 */
async function requireOwnedDeck(deckId: string, userId: string) {
  const deck = await getDeck(deckId);
  if (!deck || deck.user_id !== userId) redirect("/decks");
  return deck;
}

export async function createDeck(
  _prev: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const userId = await requireUserId();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = normalizeEmoji(String(formData.get("emoji") ?? ""));
  const folderIdRaw = String(formData.get("folderId") ?? "");

  const fieldErrors = {
    title: validateDeckTitle(title),
    description: validateDeckDescription(description),
  };
  if (fieldErrors.title || fieldErrors.description) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: userId,
      title,
      description: description || null,
      emoji,
      folder_id: folderIdRaw || null,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { formError: error.message };

  revalidatePath("/decks");
  redirect(`/decks/${data.id}`);
}

export async function updateDeck(
  _prev: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  await requireOwnedDeck(deckId, userId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = normalizeEmoji(String(formData.get("emoji") ?? ""));

  const fieldErrors = {
    title: validateDeckTitle(title),
    description: validateDeckDescription(description),
  };
  if (fieldErrors.title || fieldErrors.description) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("decks")
    .update({ title, description: description || null, emoji })
    .eq("id", deckId);

  if (error) return { formError: error.message };

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  return {};
}

export async function deleteDeck(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  await requireOwnedDeck(deckId, userId);

  const supabase = await createClient();
  // Cards cascade via the FK; no need to clear them first.
  await supabase.from("decks").delete().eq("id", deckId);

  revalidatePath("/decks");
  redirect("/decks");
}

export async function togglePin(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  const deck = await requireOwnedDeck(deckId, userId);

  // Enforced here rather than as a DB constraint: expressing "at most 3 rows
  // per user" in Postgres needs a trigger, and this limit is a UI affordance
  // rather than a data-integrity rule.
  if (!deck.is_pinned && (await countPinnedDecks(userId)) >= MAX_PINNED_DECKS) {
    redirect(
      `/decks?error=${encodeURIComponent(
        `You can pin ${MAX_PINNED_DECKS} decks. Unpin one first.`,
      )}`,
    );
  }

  const supabase = await createClient();
  await supabase
    .from("decks")
    .update({ is_pinned: !deck.is_pinned })
    .eq("id", deckId);

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

export async function setVisibility(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  await requireOwnedDeck(deckId, userId);

  if (!isVisibility(visibility)) return;

  const supabase = await createClient();
  await supabase.from("decks").update({ visibility }).eq("id", deckId);

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

export async function moveDeckToFolder(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  const folderId = String(formData.get("folderId") ?? "");
  await requireOwnedDeck(deckId, userId);

  const supabase = await createClient();
  await supabase
    .from("decks")
    .update({ folder_id: folderId || null })
    .eq("id", deckId);

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

/**
 * Copy a deck and all its cards.
 *
 * Cards are re-inserted in one batch rather than per row: a 200-card deck
 * would otherwise be 200 round trips.
 */
export async function duplicateDeck(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");
  const source = await requireOwnedDeck(deckId, userId);

  const supabase = await createClient();

  const { data: copy, error: deckError } = await supabase
    .from("decks")
    .insert({
      user_id: userId,
      title: `${source.title} (copy)`.slice(0, 120),
      description: source.description,
      emoji: source.emoji,
      folder_id: source.folder_id,
      source: "duplicate",
      origin_deck_id: source.id,
      // Copies start private regardless of the original's visibility — sharing
      // is a decision to make deliberately, not one to inherit.
      visibility: "private",
    })
    .select("id")
    .single();

  if (deckError || !copy) {
    redirect(
      `/decks?error=${encodeURIComponent("Could not duplicate that deck.")}`,
    );
  }

  const { data: cards } = await supabase
    .from("cards")
    .select("front, back, front_image_url, back_image_url, category, hint, position")
    .eq("deck_id", deckId)
    .order("position", { ascending: true });

  if (cards?.length) {
    await supabase
      .from("cards")
      .insert(cards.map((card) => ({ ...card, deck_id: copy.id })));
  }

  revalidatePath("/decks");
  redirect(`/decks/${copy.id}`);
}
