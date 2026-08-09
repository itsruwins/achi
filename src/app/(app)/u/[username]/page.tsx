import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {profile.display_name ?? `@${profile.username}`}
          </h1>
          {profile.display_name ? (
            <p className="text-sm text-muted">@{profile.username}</p>
          ) : null}
          {profile.bio ? (
            <p className="mt-2 max-w-prose text-sm text-muted">{profile.bio}</p>
          ) : null}

          <div className="mt-3 flex gap-4 text-sm text-muted">
            <span>
              <span className="font-medium text-text">{stats.publicDecks}</span>{" "}
              public {stats.publicDecks === 1 ? "deck" : "decks"}
            </span>
            <span>
              <span className="font-medium text-text">{stats.followers}</span>{" "}
              {stats.followers === 1 ? "follower" : "followers"}
            </span>
            <span>
              <span className="font-medium text-text">{stats.following}</span>{" "}
              following
            </span>
          </div>
        </div>

        {isSelf ? null : (
          <form action={toggleFollow}>
            <input type="hidden" name="userId" value={profile.id} />
            <input type="hidden" name="username" value={profile.username ?? ""} />
            <Button type="submit" variant={following ? "secondary" : "primary"}>
              {following ? "Following" : "Follow"}
            </Button>
          </form>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-text">Public decks</h2>
        {decks.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-sm text-muted">
            {isSelf
              ? "None of your decks are public yet. Set one to Public in its settings."
              : "This person hasn't shared any decks publicly."}
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
    </div>
  );
}
