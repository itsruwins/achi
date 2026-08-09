import Link from "next/link";

import type { PublicDeck } from "@/features/community/queries";

export function PublicDeckCard({ deck }: { deck: PublicDeck }) {
  const author = deck.author?.display_name ?? deck.author?.username;

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="group flex flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-colors hover:border-primary"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {deck.emoji ?? "🗂️"}
      </span>

      <h3 className="mt-3 line-clamp-2 font-medium text-text group-hover:text-primary">
        {deck.title}
      </h3>

      {deck.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted">{deck.description}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <span>{deck.card_count} cards</span>
        {author ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {deck.author?.username ? `@${deck.author.username}` : author}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
