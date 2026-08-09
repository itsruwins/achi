"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user.id;
}

export async function toggleFollow(formData: FormData) {
  const userId = await requireUserId();
  const targetId = String(formData.get("userId") ?? "");
  const username = String(formData.get("username") ?? "");

  // The CHECK constraint would reject this anyway; catching it here avoids a
  // raw Postgres error reaching the user.
  if (!targetId || targetId === userId) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: userId, following_id: targetId });
  }

  if (username) revalidatePath(`/u/${username}`);
}

export type CommunityFormState = { error?: string };

/** Slugify a community name: lowercase, hyphenated, matching the CHECK. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  // The constraint requires a leading letter, which a name like "2026 Biology"
  // would otherwise fail.
  return /^[a-z]/.test(slug) ? slug : `c-${slug}`.slice(0, 40);
}

function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Buffer.from(bytes).toString("base64url");
}

export async function createCommunity(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const joinPolicy = String(formData.get("joinPolicy") ?? "open");

  if (!name) return { error: "Name the community." };
  if (name.length > 60) return { error: "At most 60 characters." };
  if (joinPolicy !== "open" && joinPolicy !== "invite_only") {
    return { error: "Pick who can join." };
  }

  const slug = slugify(name);
  if (slug.length < 3) return { error: "Use a name with a few more letters." };

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("communities")
    .insert({
      owner_id: userId,
      slug,
      name,
      description: description || null,
      join_policy: joinPolicy,
      invite_code: joinPolicy === "invite_only" ? generateInviteCode() : null,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "That name is taken. Try a different one." };
    }
    return { error: error.message };
  }

  // The creator is a member too — otherwise the owner cannot read their own
  // community's posts, which are members-only.
  await supabase.from("community_members").insert({
    community_id: created.id,
    user_id: userId,
    role: "owner",
  });

  revalidatePath("/community");
  redirect(`/c/${created.slug}`);
}

/**
 * Join a community.
 *
 * Always routed through the database function, even for open communities: it
 * checks the invite code with definer rights, so the code never has to be
 * readable by the client.
 */
export async function joinCommunity(formData: FormData) {
  await requireUserId();

  const slug = String(formData.get("slug") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_community_with_code", {
    target_slug: slug,
    code,
  });

  if (error || !data) {
    redirect(`/c/${slug}?error=${encodeURIComponent("That invite code didn't work.")}`);
  }

  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}`);
}

export async function leaveCommunity(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const communityId = String(formData.get("communityId") ?? "");

  const supabase = await createClient();
  await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  revalidatePath(`/c/${slug}`);
  redirect("/community");
}

export async function createPost(formData: FormData) {
  const userId = await requireUserId();

  const communityId = String(formData.get("communityId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body || body.length > 2000) return;

  const supabase = await createClient();
  await supabase.from("community_posts").insert({
    community_id: communityId,
    author_id: userId,
    body,
  });

  revalidatePath(`/c/${slug}`);
}

export async function deletePost(formData: FormData) {
  await requireUserId();

  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();
  // RLS decides whether this is allowed — author or community owner.
  await supabase.from("community_posts").delete().eq("id", postId);

  revalidatePath(`/c/${slug}`);
}

/**
 * Share one of your decks into a community.
 *
 * A private deck is promoted to unlisted first. Listing a private deck would
 * create a row members can see but a deck they cannot open — the community
 * table grants no access to the deck itself.
 */
export async function shareDeckToCommunity(formData: FormData) {
  const userId = await requireUserId();

  const communityId = String(formData.get("communityId") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, visibility, user_id")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck || deck.user_id !== userId) return;

  if (deck.visibility === "private") {
    await supabase
      .from("decks")
      .update({ visibility: "unlisted" })
      .eq("id", deckId);
  }

  await supabase.from("community_decks").insert({
    community_id: communityId,
    deck_id: deckId,
    shared_by: userId,
  });

  revalidatePath(`/c/${slug}`);
}
