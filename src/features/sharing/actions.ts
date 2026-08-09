"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";
import { getDeck } from "@/features/decks/queries";

/**
 * A share token.
 *
 * 16 random bytes as base64url — ~128 bits, so an unlisted deck cannot be found
 * by guessing. `Math.random()` would not do: it is not a CSPRNG, and the token
 * is the only thing standing between an unlisted deck and the public.
 */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type ShareResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Create (or reuse) a share link for a deck.
 *
 * A private deck is promoted to unlisted, because a link to a private deck
 * resolves to nothing — issuing one would hand the user a URL that silently
 * fails for everyone they send it to.
 */
export async function createShareLink(formData: FormData): Promise<ShareResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const deckId = String(formData.get("deckId") ?? "");
  const deck = await getDeck(deckId);
  if (!deck || deck.user_id !== user.id) {
    return { ok: false, error: "Deck not found." };
  }

  const supabase = await createClient();

  if (deck.visibility === "private") {
    await supabase
      .from("decks")
      .update({ visibility: "unlisted" })
      .eq("id", deckId);
  }

  // Reuse an existing link rather than minting a second one — two live URLs for
  // the same deck means revoking one silently leaves the other working.
  const { data: existing } = await supabase
    .from("deck_shares")
    .select("token")
    .eq("deck_id", deckId)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) {
    revalidatePath(`/decks/${deckId}`);
    return { ok: true, token: existing.token as string };
  }

  const token = generateToken();
  const { error } = await supabase.from("deck_shares").insert({
    deck_id: deckId,
    created_by: user.id,
    token,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/decks/${deckId}`);
  return { ok: true, token };
}

/**
 * Revoke every link to a deck and make it private again.
 *
 * Both halves matter: marking the links revoked stops them resolving, and
 * making the deck private stops it appearing in discovery.
 */
export async function revokeShareLinks(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const deckId = String(formData.get("deckId") ?? "");
  const deck = await getDeck(deckId);
  if (!deck || deck.user_id !== user.id) return;

  const supabase = await createClient();

  await supabase
    .from("deck_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("deck_id", deckId)
    .is("revoked_at", null);

  await supabase.from("decks").update({ visibility: "private" }).eq("id", deckId);

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
}

/** Copy someone else's shared deck into your own library. */
export async function importSharedDeck(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const deckId = String(formData.get("deckId") ?? "");
  const supabase = await createClient();

  // Read through RLS: a deck the caller cannot see returns nothing here, so a
  // forged id copies nothing.
  const source = await getDeck(deckId);
  if (!source) redirect("/community");

  const { data: created, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: source.title.slice(0, 120),
      description: source.description,
      emoji: source.emoji,
      source: "duplicate",
      origin_deck_id: source.id,
      visibility: "private",
    })
    .select("id")
    .single();

  if (error || !created) redirect("/community");

  const { data: cards } = await supabase
    .from("cards")
    .select("front, back, front_image_url, back_image_url, category, hint, position")
    .eq("deck_id", deckId)
    .order("position", { ascending: true });

  if (cards?.length) {
    await supabase
      .from("cards")
      .insert(cards.map((card) => ({ ...card, deck_id: created.id })));
  }

  revalidatePath("/decks");
  redirect(`/decks/${created.id}`);
}
