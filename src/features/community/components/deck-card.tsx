import Link from "next/link";

import type { PublicDeck } from "@/features/community/queries";

/**
 * A public deck in the discovery grid.
 *
 * Same shape as your own deck tile — a deck should look like a deck wherever it
 * appears — with the author replacing the visibility badge, since here that's
 * the fact you're deciding on.
 */
export function PublicDeckCard({ deck }: { deck: PublicDeck }) {
  const author = deck.author?.display_name ?? deck.author?.username;

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="group flex h-full flex-col rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary-border hover:shadow-raised"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-control bg-sunken text-lg leading-none"
        >
          {deck.emoji ?? "🗂"}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-md font-medium leading-snug text-text">
            {deck.title}
          </h3>
          {deck.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {deck.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4 text-sm text-subtle">
        <span className="tnum">
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </span>
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
