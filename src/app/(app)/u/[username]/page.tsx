import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Section } from "@/components/ui/layout";
import { Avatar } from "@/components/shell/user-menu";
import { requireOnboardedUser } from "@/features/auth/queries";
import { toggleFollow } from "@/features/community/actions";
import { PublicDeckCard } from "@/features/community/components/deck-card";
import {
  getCreatorStats,
  getProfileByUsername,
  isFollowing,
  listPublicDecks,
} from "@/features/community/queries";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { user } = await requireOnboardedUser();
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const isSelf = profile.id === user.id;

  const [decks, stats, following] = await Promise.all([
    listPublicDecks({ authorId: profile.id }),
    getCreatorStats(profile.id),
    isSelf ? Promise.resolve(false) : isFollowing(user.id, profile.id),
  ]);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar
              username={profile.username ?? username}
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              className="size-10 text-base"
            />
            <span className="min-w-0">
              {profile.display_name ?? `@${profile.username}`}
            </span>
          </span>
        }
        description={profile.bio}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {profile.display_name ? <span>@{profile.username}</span> : null}
            <Stat value={stats.publicDecks} one="public deck" many="public decks" />
            <Stat value={stats.followers} one="follower" many="followers" />
            <span>
              <span className="tnum font-medium text-text">
                {stats.following}
              </span>{" "}
              following
            </span>
          </span>
        }
        actions={
          isSelf ? null : (
            <form action={toggleFollow}>
              <input type="hidden" name="userId" value={profile.id} />
              <input type="hidden" name="username" value={profile.username ?? ""} />
              <Button type="submit" variant={following ? "secondary" : "primary"}>
                {following ? "Following" : "Follow"}
              </Button>
            </form>
          )
        }
      />

      <Section title="Public decks">
        {decks.length === 0 ? (
          <EmptyState
            compact
            title={isSelf ? "None of your decks are public" : "Nothing public yet"}
            body={
              isSelf
                ? "Open a deck, go to Settings, and set it to Public. It'll appear here and in Community."
                : "This person hasn't shared any decks publicly."
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
    </div>
  );
}

function Stat({
  value,
  one,
  many,
}: {
  value: number;
  one: string;
  many: string;
}) {
  return (
    <span>
      <span className="tnum font-medium text-text">{value}</span>{" "}
      {value === 1 ? one : many}
    </span>
  );
}
