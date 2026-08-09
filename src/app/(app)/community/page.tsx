import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { requireOnboardedUser } from "@/features/auth/queries";
import { PublicDeckCard } from "@/features/community/components/deck-card";
import { listCommunities, listPublicDecks } from "@/features/community/queries";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({
  searchParams,
}: PageProps<"/community">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";

  const [decks, communities, mine] = await Promise.all([
    listPublicDecks({ search }),
    listCommunities(),
    listCommunities({ mine: user.id }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Community
        </h1>
        <p className="mt-1 text-sm text-muted">
          Decks other people have made public, and groups you can join.
        </p>
      </div>

      {/* GET form: the search term lives in the URL, so results are linkable
          and the page works without JavaScript. */}
      <form method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search public decks…"
          aria-label="Search public decks"
        />
        <Button type="submit">Search</Button>
      </form>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-text">
            {search ? `Decks matching “${search}”` : "Public decks"}
          </h2>
          <Link href="/community/new" className="text-sm text-primary underline">
            Start a community
          </Link>
        </div>

        {decks.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-sm text-muted">
            {search
              ? "Nothing matched that search."
              : "No public decks yet. Set one of yours to Public and it'll show up here."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <PublicDeckCard deck={deck} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {mine.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-text">Your communities</h2>
          <CommunityList communities={mine} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-text">Browse communities</h2>
        {communities.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-sm text-muted">
            No communities yet.{" "}
            <Link href="/community/new" className="text-primary underline">
              Start the first one
            </Link>
            .
          </p>
        ) : (
          <CommunityList communities={communities} />
        )}
      </section>
    </div>
  );
}

function CommunityList({
  communities,
}: {
  communities: Awaited<ReturnType<typeof listCommunities>>;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {communities.map((community) => (
        <li key={community.id}>
          <Link
            href={`/c/${community.slug}`}
            className="block rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate font-medium text-text">{community.name}</h3>
              <span className="shrink-0 text-xs text-subtle">
                {community.member_count}{" "}
                {community.member_count === 1 ? "member" : "members"}
              </span>
            </div>
            {community.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {community.description}
              </p>
            ) : null}
            {community.join_policy === "invite_only" ? (
              <span className="mt-2 inline-block rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">
                Invite only
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
