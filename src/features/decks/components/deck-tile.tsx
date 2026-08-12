import Link from "next/link";

import { Badge } from "@/components/ui/chip";
import { PinIcon } from "@/components/ui/icons";
import { LinkPending } from "@/components/ui/pending";
import type { Deck } from "@/features/decks/types";
import { cn } from "@/lib/utils/cn";

const SOURCE_LABELS: Partial<Record<Deck["source"], string>> = {
  ai: "AI",
  import: "Imported",
};

/**
 * A deck in the grid.
 *
 * The whole tile is the link — a card with a small link inside it makes people
 * aim. Hover lifts by 2px and warms the border; that's the entire effect. Tiles
 * that scale or glow turn a page of twelve decks into a light show.
 */
export function DeckTile({ deck, due }: { deck: Deck; due?: number }) {
  const source = SOURCE_LABELS[deck.source];

  return (
    <Link
      href={`/decks/${deck.id}`}
      className={cn(
        "group relative flex h-full flex-col rounded-card border border-border bg-surface p-4",
        "transition-[border-color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:border-primary-border hover:shadow-raised",
      )}
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

        {deck.is_pinned ? (
          <span
            className="shrink-0 text-accent"
            title="Pinned to the top of your decks"
          >
            <PinIcon className="size-3.5" />
            <span className="sr-only">Pinned</span>
          </span>
        ) : null}
      </div>

      {/* Footer pinned to the bottom so tiles of different text lengths still
          line their metadata up across the row. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-4 text-sm text-subtle">
        <span className="tnum">
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </span>

        {due && due > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="tnum font-medium text-primary">{due} due</span>
          </>
        ) : null}

        <span className="ml-auto flex items-center gap-1.5">
          <LinkPending className="text-primary" />
          {source ? <Badge tone="neutral">{source}</Badge> : null}
          {deck.visibility !== "private" ? (
            <Badge tone={deck.visibility === "public" ? "info" : "neutral"}>
              {deck.visibility === "public" ? "Public" : "Unlisted"}
            </Badge>
          ) : null}
        </span>
      </div>
    </Link>
  );
}
