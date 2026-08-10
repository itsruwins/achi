import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { CommunityIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, Section } from "@/components/ui/layout";
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
    <div>
      <PageHeader
        title="Community"
        description="Decks other people have made public, and groups you can join."
        actions={
          <Link href="/community/new">
            <Button>
              <PlusIcon className="size-4" />
              Start a community
            </Button>
          </Link>
        }
      />

      {/* GET form: the search term lives in the URL, so results are linkable
          and the page works without JavaScript. */}
      <form method="get" className="flex max-w-lg gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search public decks…"
            aria-label="Search public decks"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <Section
        title={search ? `Decks matching “${search}”` : "Public decks"}
        action={
          decks.length > 0 ? (
            <span className="tnum text-sm text-subtle">{decks.length}</span>
          ) : null
        }
      >
        {decks.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon className="size-5" />}
            title={search ? "Nothing matched that search" : "No public decks yet"}
            body={
              search
                ? "Try a shorter or more general term."
                : "Set one of your decks to Public in its settings and it'll be listed here for anyone to study."
            }
            action={
              search ? (
                <Link href="/community">
                  <Button variant="secondary">Clear search</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <PublicDeckCard deck={deck} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {mine.length > 0 ? (
        <Section title="Your communities">
          <CommunityList communities={mine} />
        </Section>
      ) : null}

      <Section title="Browse communities">
        {communities.length === 0 ? (
          <EmptyState
            compact
            icon={<CommunityIcon className="size-5" />}
            title="No communities yet"
            body="A community is a shared space for decks and posts — a class, a study group, a subject."
            action={
              <Link href="/community/new">
                <Button>Start the first one</Button>
              </Link>
            }
          />
        ) : (
          <CommunityList communities={communities} />
        )}
      </Section>
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
            className="block h-full rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary-border hover:shadow-raised"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-md font-medium text-text">
                {community.name}
              </h3>
              <span className="tnum shrink-0 text-sm text-subtle">
                {community.member_count}{" "}
                {community.member_count === 1 ? "member" : "members"}
              </span>
            </div>
            {community.description ? (
              <p className="mt-1 line-clamp-2 text-base text-muted">
                {community.description}
              </p>
            ) : null}
            {community.join_policy === "invite_only" ? (
              <span className="mt-2 inline-block">
                <Badge tone="accent">Invite only</Badge>
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
