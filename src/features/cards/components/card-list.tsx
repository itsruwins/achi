"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteCard, moveCard } from "@/features/cards/actions";
import { deriveCategories, type Card } from "@/features/cards/types";

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
      <p className="rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
        No cards yet. Add the first one above.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
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
            <article className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
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
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {card.category ? (
                        <span className="rounded-full bg-primary-subtle px-2 py-0.5 font-medium text-primary">
                          {card.category}
                        </span>
                      ) : null}
                      {card.hint ? (
                        <span className="text-subtle">Hint: {card.hint}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-0.5">
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
                  </div>
                  <div className="flex items-center gap-0.5">
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
          className={`whitespace-pre-wrap break-words text-sm ${
            muted ? "text-muted" : "text-text"
          }`}
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
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        {direction === "up" ? "↑" : "↓"}
      </Button>
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
        if (!confirm("Delete this card?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="deckId" value={deckId} />
      <input type="hidden" name="cardId" value={cardId} />
      <Button type="submit" size="sm" variant="ghost">
        Delete
      </Button>
    </form>
  );
}
