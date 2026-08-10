"use client";

import { useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { ArrowUpIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/layout";
import { deleteCard, moveCard } from "@/features/cards/actions";
import { deriveCategories, type Card } from "@/features/cards/types";
import { cn } from "@/lib/utils/cn";

import { CardEditor } from "./card-editor";

type Props = {
  deckId: string;
  userId: string;
  cards: Card[];
};

export function CardList({ deckId, userId, cards }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const categories = deriveCategories(cards);

  if (cards.length === 0) {
    return (
      <EmptyState
        compact
        title="No cards yet"
        body="Add the first one with the editor above. A card is a question on one side and its answer on the other."
      />
    );
  }

  return (
    <ol className="space-y-1.5">
      {cards.map((card, index) => (
        <li key={card.id}>
          {editingId === card.id ? (
            <CardEditor
              deckId={deckId}
              userId={userId}
              card={card}
              categories={categories}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <article
              className={cn(
                "group relative rounded-card border border-border bg-surface p-4",
                "transition-colors duration-[var(--dur-fast)] hover:border-border-strong",
              )}
            >
              {/* The row number anchors the ordering controls to something
                  concrete — "move up" is only meaningful if you can see where
                  the card currently sits. */}
              <span className="tnum absolute left-4 top-4 text-2xs text-subtle">
                {index + 1}
              </span>

              <div className="flex items-start justify-between gap-4 pl-6">
                <div className="min-w-0 flex-1">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CardSide text={card.front} imageUrl={card.front_image_url} />
                    <CardSide
                      text={card.back}
                      imageUrl={card.back_image_url}
                      muted
                    />
                  </div>

                  {card.category || card.hint ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      {card.category ? (
                        <Badge tone="primary">{card.category}</Badge>
                      ) : null}
                      {card.hint ? (
                        <span className="text-subtle">Hint: {card.hint}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/*
                  Controls stay dimmed until the row is hovered or something
                  inside it has focus, so a long list reads as content rather
                  than a wall of buttons. focus-within keeps them reachable by
                  keyboard, where there is no hover to trigger.
                */}
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 transition-opacity duration-[var(--dur-fast)]",
                    "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                    "max-sm:opacity-100",
                  )}
                >
                  <MoveButton
                    deckId={deckId}
                    cardId={card.id}
                    direction="up"
                    disabled={index === 0}
                    label="Move up"
                  />
                  <MoveButton
                    deckId={deckId}
                    cardId={card.id}
                    direction="down"
                    disabled={index === cards.length - 1}
                    label="Move down"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(card.id)}
                  >
                    Edit
                  </Button>
                  <DeleteCardButton deckId={deckId} cardId={card.id} />
                </div>
              </div>
            </article>
          )}
        </li>
      ))}
    </ol>
  );
}

function CardSide({
  text,
  imageUrl,
  muted,
}: {
  text: string;
  imageUrl: string | null;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      {text ? (
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-base",
            muted ? "text-muted" : "text-text",
          )}
        >
          {text}
        </p>
      ) : null}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="max-h-28 rounded-control border border-border object-contain"
        />
      ) : null}
    </div>
  );
}

/**
 * Reordering is up/down buttons rather than drag-and-drop.
 *
 * Drag needs a dependency to be smooth, and a keyboard-accessible drag
 * implementation is significantly more work than two buttons that already
 * work with a keyboard and a screen reader.
 */
function MoveButton({
  deckId,
  cardId,
  direction,
  disabled,
  label,
}: {
  deckId: string;
  cardId: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveCard}>
      <input type="hidden" name="deckId" value={deckId} />
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="direction" value={direction} />
      <IconButton
        type="submit"
        size="sm"
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        <ArrowUpIcon
          className={cn("size-4", direction === "down" && "rotate-180")}
        />
      </IconButton>
    </form>
  );
}

function DeleteCardButton({
  deckId,
  cardId,
}: {
  deckId: string;
  cardId: string;
}) {
  return (
    <form
      action={deleteCard}
      onSubmit={(event) => {
        if (!confirm("Delete this card? This can't be undone."))
          event.preventDefault();
      }}
    >
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="hover:bg-danger-subtle hover:text-danger"
      >
        Delete
      </Button>
      <input type="hidden" name="deckId" value={deckId} />
      <input type="hidden" name="cardId" value={cardId} />
    </form>
  );
}
