"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createCard, updateCard, type CardFormState } from "@/features/cards/actions";
import { CLOZE_MARKER, type Card } from "@/features/cards/types";

import { ImageField } from "./image-field";

type Props = {
  deckId: string;
  userId: string;
  /** Existing card to edit; omit to add a new one. */
  card?: Card;
  categories: string[];
  onDone?: () => void;
};

export function CardEditor({ deckId, userId, card, categories, onDone }: Props) {
  const isEdit = Boolean(card);
  const [state, formAction, isPending] = useActionState<CardFormState, FormData>(
    isEdit ? updateCard : createCard,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // On a successful add, clear the form so the next card can be typed straight
  // away — the common case is entering many cards in a row.
  useEffect(() => {
    if (!state.savedAt) return;
    if (isEdit) onDone?.();
    else formRef.current?.reset();
  }, [state.savedAt, isEdit, onDone]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-card border border-border bg-surface p-4"
    >
      <input type="hidden" name="deckId" value={deckId} />
      {card ? <input type="hidden" name="cardId" value={card.id} /> : null}

      {state.formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Field
            label="Front"
            htmlFor={`front-${card?.id ?? "new"}`}
            error={state.fieldErrors?.front}
            hint={`Type ${CLOZE_MARKER} to blank a term for cloze questions.`}
          >
            <Textarea
              id={`front-${card?.id ?? "new"}`}
              name="front"
              defaultValue={card?.front}
              invalid={Boolean(state.fieldErrors?.front)}
              placeholder="What is the powerhouse of the cell?"
            />
          </Field>
          <ImageField
            name="frontImageUrl"
            label="front image"
            userId={userId}
            defaultValue={card?.front_image_url}
          />
        </div>

        <div className="space-y-2">
          <Field
            label="Back"
            htmlFor={`back-${card?.id ?? "new"}`}
            error={state.fieldErrors?.back}
          >
            <Textarea
              id={`back-${card?.id ?? "new"}`}
              name="back"
              defaultValue={card?.back}
              invalid={Boolean(state.fieldErrors?.back)}
              placeholder="The mitochondrion"
            />
          </Field>
          <ImageField
            name="backImageUrl"
            label="back image"
            userId={userId}
            defaultValue={card?.back_image_url}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Topic"
          htmlFor={`category-${card?.id ?? "new"}`}
          error={state.fieldErrors?.category}
          hint="Optional. Used to filter study sessions."
        >
          <Input
            id={`category-${card?.id ?? "new"}`}
            name="category"
            defaultValue={card?.category ?? ""}
            list="card-categories"
            invalid={Boolean(state.fieldErrors?.category)}
            placeholder="Cell biology"
          />
          {/* Suggests topics already used in this deck without forcing them. */}
          <datalist id="card-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Hint"
          htmlFor={`hint-${card?.id ?? "new"}`}
          error={state.fieldErrors?.hint}
          hint="Optional nudge shown before the answer."
        >
          <Input
            id={`hint-${card?.id ?? "new"}`}
            name="hint"
            defaultValue={card?.hint ?? ""}
            invalid={Boolean(state.fieldErrors?.hint)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={isPending}>
          {isEdit ? "Save changes" : "Add card"}
        </Button>
        {isEdit && onDone ? (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
