import { createClient } from "@/lib/supabase/server";

export type PublicDeck = {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  card_count: number;
  updated_at: string;
  author: { username: string | null; display_name: string | null } | null;
};

export type CommunitySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  join_policy: "open" | "invite_only";
  member_count: number;
};

const PUBLIC_DECK_COLUMNS =
  "id, title, description, emoji, card_count, updated_at, profiles!decks_user_id_fkey(username, display_name)";

type DeckRow = Omit<PublicDeck, "author"> & {
  profiles: { username: string | null; display_name: string | null } | null;
};

/**
 * Publicly listed decks, newest activity first.
 *
 * Only `visibility = 'public'` — unlisted decks are reachable by link but must
 * never appear in a listing, which is the whole distinction between the two.
 */
export async function listPublicDecks(
  options: { search?: string; authorId?: string; limit?: number } = {},
): Promise<PublicDeck[]> {
  const supabase = await createClient();

  let query = supabase
    .from("decks")
    .select(PUBLIC_DECK_COLUMNS)
    .eq("visibility", "public")
    .gt("card_count", 0)
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 40);

  if (options.authorId) query = query.eq("user_id", options.authorId);

  if (options.search?.trim()) {
    // Escaping % and _ so a search for "100%" isn't read as a wildcard.
    const term = options.search.trim().replace(/[%_]/g, "\\$&");
    query = query.ilike("title", `%${term}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[community] listPublicDecks failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as DeckRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    card_count: row.card_count,
    updated_at: row.updated_at,
    author: row.profiles,
  }));
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return data;
}

export async function getCreatorStats(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("creator_stats", { target_user: userId })
    .maybeSingle();

  const row = data as
    | { public_decks: number; followers: number; following: number }
    | null;

  return {
    publicDecks: Number(row?.public_decks ?? 0),
    followers: Number(row?.followers ?? 0),
    following: Number(row?.following ?? 0),
  };
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return Boolean(data);
}

export async function listCommunities(
  options: { mine?: string } = {},
): Promise<CommunitySummary[]> {
  const supabase = await createClient();

  if (options.mine) {
    // Communities the user belongs to, via their membership rows.
    const { data } = await supabase
      .from("community_members")
      .select("communities(id, slug, name, description, join_policy, member_count)")
      .eq("user_id", options.mine);

    return ((data ?? []) as unknown as { communities: CommunitySummary | null }[])
      .map((row) => row.communities)
      .filter((entry): entry is CommunitySummary => Boolean(entry));
  }

  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description, join_policy, member_count")
    .order("member_count", { ascending: false })
    .limit(40);

  if (error) {
    console.error("[community] listCommunities failed:", error.message);
    return [];
  }

  return (data ?? []) as CommunitySummary[];
}

export async function getCommunityBySlug(slug: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("communities")
    .select("id, owner_id, slug, name, description, join_policy, member_count, created_at")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  return data;
}

/**
 * Whether the caller is inside a community.
 *
 * Read straight from the membership table — the RLS policy already restricts
 * this to the caller's own row, so no extra filtering is needed here.
 */
export async function isMember(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export type CommunityPost = {
  id: string;
  body: string;
  created_at: string;
  deck_id: string | null;
  author: { username: string | null; display_name: string | null } | null;
};

export async function listCommunityPosts(
  communityId: string,
): Promise<CommunityPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select("id, body, created_at, deck_id, profiles!community_posts_author_id_fkey(username, display_name)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[community] listCommunityPosts failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as (Omit<CommunityPost, "author"> & {
    profiles: CommunityPost["author"];
  })[]).map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    deck_id: row.deck_id,
    author: row.profiles,
  }));
}

export async function listCommunityDecks(communityId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_decks")
    .select("deck_id, shared_at, decks(id, title, description, emoji, card_count, visibility)")
    .eq("community_id", communityId)
    .order("shared_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[community] listCommunityDecks failed:", error.message);
    return [];
  }

  type Row = {
    deck_id: string;
    decks: {
      id: string;
      title: string;
      description: string | null;
      emoji: string | null;
      card_count: number;
      visibility: string;
    } | null;
  };

  // A deck listed here but hidden by the decks policies comes back null —
  // filtered out rather than rendered as a broken row.
  return ((data ?? []) as unknown as Row[])
    .map((row) => row.decks)
    .filter((deck): deck is NonNullable<Row["decks"]> => Boolean(deck));
}

/** Resolve a share token to its deck id, or null. */
export async function resolveShareToken(token: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("deck_shares")
    .select("deck_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  return (data?.deck_id as string | undefined) ?? null;
}
