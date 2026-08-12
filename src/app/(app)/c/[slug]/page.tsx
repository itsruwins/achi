import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SubmitButton, SubmitText } from "@/components/ui/pending";
import { Badge } from "@/components/ui/chip";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Dot, EmptyState, PageHeader, Section } from "@/components/ui/layout";
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
    <div>
      <PageHeader
        backHref="/community"
        backLabel="Community"
        title={community.name}
        description={community.description}
        meta={
          <>
            <span className="tnum">
              {community.member_count}{" "}
              {community.member_count === 1 ? "member" : "members"}
            </span>
            {community.join_policy === "invite_only" ? (
              <>
                <Dot />
                <Badge tone="accent">Invite only</Badge>
              </>
            ) : null}
            {isOwner ? (
              <>
                <Dot />
                <Badge tone="primary">You own this</Badge>
              </>
            ) : null}
          </>
        }
        actions={
          member && !isOwner ? (
            <form action={leaveCommunity}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="communityId" value={community.id} />
              <SubmitButton variant="ghost">
                Leave
              </SubmitButton>
            </form>
          ) : null
        }
      />

      {errorMessage ? (
        <p
          role="alert"
          className="mb-5 rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      {!member ? (
        <section className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-md font-semibold tracking-tight text-text">
            {community.join_policy === "open"
              ? "Join to see posts and shared decks"
              : "This community is invite only"}
          </h2>
          <p className="mt-1 max-w-[62ch] text-base text-muted">
            {community.join_policy === "open"
              ? "Anyone can join. Members can post and share decks with the group."
              : "Enter the invite code someone in the community gave you."}
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
            <SubmitButton>Join</SubmitButton>
          </form>
        </section>
      ) : (
        <>
          <Section title="Posts">
            <form
              action={createPost}
              className="space-y-2.5 rounded-card border border-border bg-surface p-4"
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

            {posts.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  compact
                  title="Nothing posted yet"
                  body="Be the first — a question or what you're working through this week is a fine start."
                />
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="group rounded-card border border-border bg-surface p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-subtle">
                        {post.author?.username ? (
                          <Link
                            href={`/u/${post.author.username}`}
                            className="transition-colors hover:text-text"
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
                        {/* Shown to everyone; RLS rejects it unless the caller
                            is the author or the community owner. */}
                        <SubmitText
                          pendingLabel="Deleting…"
                          className="text-sm text-subtle opacity-0 transition-[opacity,color] duration-[var(--dur-fast)] hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                        >
                          Delete
                        </SubmitText>
                      </form>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-base leading-relaxed text-text">
                      {post.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Shared decks">
            {myDecks.length > 0 ? (
              <form
                action={shareDeckToCommunity}
                className="mb-3 flex flex-wrap gap-2 rounded-card border border-border bg-surface p-3"
              >
                <input type="hidden" name="communityId" value={community.id} />
                <input type="hidden" name="slug" value={slug} />
                <div className="min-w-48 flex-1">
                  <Select
                    name="deckId"
                    required
                    defaultValue=""
                    aria-label="Deck to share"
                  >
                    <option value="" disabled>
                      Choose one of your decks…
                    </option>
                    {myDecks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" variant="secondary">
                  Share here
                </Button>
              </form>
            ) : null}

            {decks.length === 0 ? (
              <EmptyState
                compact
                title="No decks shared yet"
                body="Sharing a deck here lets every member study it without them having to find it."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {decks.map((deck) => (
                  <li key={deck.id}>
                    <Link
                      href={`/decks/${deck.id}`}
                      className="block rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary-border hover:shadow-raised"
                    >
                      <p className="truncate text-md font-medium text-text">
                        {deck.emoji ? `${deck.emoji} ` : ""}
                        {deck.title}
                      </p>
                      <p className="mt-1 text-sm text-subtle">
                        <span className="tnum">{deck.card_count}</span>{" "}
                        {deck.card_count === 1 ? "card" : "cards"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      {isOwner && community.join_policy === "invite_only" ? (
        <Section title="Inviting people">
          <div className="rounded-card border border-border bg-surface p-4">
            {/*
              The invite code is not readable by the client — the policies expose
              the community row but the code is checked server-side inside
              join_community_with_code. Owners get the link, not the code.
            */}
            <p className="max-w-[62ch] text-base text-muted">
              Share this link along with the invite code you set when creating
              the community. Anyone with both can join.
            </p>
            <p className="mt-2 inline-block rounded-control bg-sunken px-2.5 py-1.5 font-mono text-sm text-text">
              /c/{slug}
            </p>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
