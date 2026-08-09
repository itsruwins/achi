import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { requireOnboardedUser } from "@/features/auth/queries";
import {
  createPost,
  deletePost,
  joinCommunity,
  leaveCommunity,
  shareDeckToCommunity,
} from "@/features/community/actions";
import {
  getCommunityBySlug,
  isMember,
  listCommunityDecks,
  listCommunityPosts,
} from "@/features/community/queries";
import { listDecks } from "@/features/decks/queries";

export async function generateMetadata({
  params,
}: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  return { title: community?.name ?? "Community" };
}

export default async function CommunityPage({
  params,
  searchParams,
}: PageProps<"/c/[slug]">) {
  const { user } = await requireOnboardedUser();
  const { slug } = await params;
  const query = await searchParams;
  const errorMessage = typeof query.error === "string" ? query.error : undefined;

  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const member = await isMember(community.id, user.id);
  const isOwner = community.owner_id === user.id;

  // Posts and shared decks are members-only at the database level; not fetching
  // them for non-members avoids a page full of empty sections.
  const [posts, decks, myDecks] = await Promise.all([
    member ? listCommunityPosts(community.id) : Promise.resolve([]),
    member ? listCommunityDecks(community.id) : Promise.resolve([]),
    member ? listDecks(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/community" className="text-sm text-muted hover:text-text">
            ← Community
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            {community.name}
          </h1>
          {community.description ? (
            <p className="mt-1 max-w-prose text-sm text-muted">
              {community.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-subtle">
            {community.member_count}{" "}
            {community.member_count === 1 ? "member" : "members"}
            {community.join_policy === "invite_only" ? " · invite only" : ""}
          </p>
        </div>

        {member ? (
          isOwner ? (
            <span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-medium text-primary">
              You own this
            </span>
          ) : (
            <form action={leaveCommunity}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="communityId" value={community.id} />
              <Button type="submit" variant="ghost">
                Leave
              </Button>
            </form>
          )
        ) : null}
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      {!member ? (
        <section className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-text">
            {community.join_policy === "open"
              ? "Join to see posts and shared decks"
              : "This community is invite only"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {community.join_policy === "open"
              ? "Anyone can join."
              : "Enter the invite code someone gave you."}
          </p>

          <form action={joinCommunity} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="slug" value={slug} />
            {community.join_policy === "invite_only" ? (
              <Input
                name="code"
                required
                placeholder="Invite code"
                aria-label="Invite code"
                className="max-w-xs"
              />
            ) : null}
            <Button type="submit">Join</Button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-medium text-text">Post</h2>
            <form
              action={createPost}
              className="space-y-3 rounded-card border border-border bg-surface p-4"
            >
              <input type="hidden" name="communityId" value={community.id} />
              <input type="hidden" name="slug" value={slug} />
              <Textarea
                name="body"
                required
                maxLength={2000}
                rows={3}
                placeholder="Ask a question, share what you're studying…"
                aria-label="Your post"
              />
              <Button type="submit" size="sm">
                Post
              </Button>
            </form>

            <ul className="mt-4 space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-subtle">
                      {post.author?.username ? (
                        <Link
                          href={`/u/${post.author.username}`}
                          className="hover:text-text"
                        >
                          @{post.author.username}
                        </Link>
                      ) : (
                        "Someone"
                      )}
                    </p>
                    <form action={deletePost}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="slug" value={slug} />
                      {/* Shown to everyone; RLS rejects it unless the caller is
                          the author or the community owner. */}
                      <button
                        type="submit"
                        className="text-xs text-subtle hover:text-danger"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-text">
                    {post.body}
                  </p>
                </li>
              ))}
            </ul>

            {posts.length === 0 ? (
              <p className="mt-4 rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
                Nothing posted yet.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-text">Shared decks</h2>

            {myDecks.length > 0 ? (
              <form
                action={shareDeckToCommunity}
                className="mb-4 flex flex-wrap gap-2 rounded-card border border-border bg-surface p-4"
              >
                <input type="hidden" name="communityId" value={community.id} />
                <input type="hidden" name="slug" value={slug} />
                <select
                  name="deckId"
                  required
                  defaultValue=""
                  aria-label="Deck to share"
                  className="h-9 flex-1 rounded-control border border-border-strong bg-surface px-3 text-sm text-text"
                >
                  <option value="" disabled>
                    Choose one of your decks…
                  </option>
                  {myDecks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="secondary">
                  Share here
                </Button>
              </form>
            ) : null}

            {decks.length === 0 ? (
              <p className="rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
                No decks shared yet.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {decks.map((deck) => (
                  <li key={deck.id}>
                    <Link
                      href={`/decks/${deck.id}`}
                      className="block rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary"
                    >
                      <p className="truncate font-medium text-text">
                        {deck.emoji ? `${deck.emoji} ` : ""}
                        {deck.title}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {deck.card_count} cards
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {isOwner && community.join_policy === "invite_only" ? (
        <InviteCodePanel slug={slug} />
      ) : null}
    </div>
  );
}

/**
 * The invite code is not readable by the client — the policies expose the
 * community row but the code is checked server-side inside
 * join_community_with_code. Owners get a link that carries it instead.
 */
function InviteCodePanel({ slug }: { slug: string }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text">Inviting people</h2>
      <p className="mt-1 text-xs text-muted">
        Share the community link and the invite code you set when creating it.
        Anyone with both can join.
      </p>
      <p className="mt-2 font-mono text-xs text-subtle">/c/{slug}</p>
    </section>
  );
}
