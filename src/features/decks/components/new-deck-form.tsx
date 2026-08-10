"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createDeck, type DeckFormState } from "@/features/decks/actions";
import type { Folder } from "@/features/folders/queries";

export function NewDeckForm({ folders }: { folders: Folder[] }) {
  const [state, formAction, isPending] = useActionState<DeckFormState, FormData>(
    createDeck,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <Field label="Icon" htmlFor="emoji">
            <Input
              id="emoji"
              name="emoji"
              maxLength={8}
              placeholder="📚"
              className="text-center"
            />
          </Field>
        </div>

        <div className="flex-1">
          <Field label="Name" htmlFor="title" error={state.fieldErrors?.title}>
            <Input
              id="title"
              name="title"
              required
              autoFocus
              invalid={Boolean(state.fieldErrors?.title)}
              placeholder="Cell Biology — Midterm"
            />
          </Field>
        </div>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        error={state.fieldErrors?.description}
        hint="Optional."
      >
        <Textarea
          id="description"
          name="description"
          invalid={Boolean(state.fieldErrors?.description)}
          placeholder="Everything from chapters 4–7."
        />
      </Field>

      {folders.length > 0 ? (
        <Field label="Folder" htmlFor="folderId" hint="Optional.">
          <Select id="folderId" name="folderId" defaultValue="">
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Button type="submit" loading={isPending}>
        Create deck
      </Button>
    </form>
  );
}
