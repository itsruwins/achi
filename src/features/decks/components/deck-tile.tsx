import Link from "next/link";

import type { Deck } from "@/features/decks/types";

export function DeckTile({ deck }: { deck: Deck }) {
  return (
    <Link
      href={`/decks/${deck.id}`}
      className="group flex flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          {deck.emoji ?? "🗂️"}
        </span>
        {deck.is_pinned ? (
          <span
            className="text-xs font-medium text-accent"
            title="Pinned to the top of your decks"
          >
            Pinned
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 font-medium text-text group-hover:text-primary">
        {deck.title}
      </h3>

      {deck.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted">
          {deck.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <span>
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </span>
        {deck.visibility !== "private" ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{deck.visibility}</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
