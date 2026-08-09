"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  deleteDeck,
  duplicateDeck,
  moveDeckToFolder,
  setVisibility,
  togglePin,
  updateDeck,
  type DeckFormState,
} from "@/features/decks/actions";
import {
  VISIBILITY_HINTS,
  VISIBILITY_LABELS,
  type Deck,
  type Visibility,
} from "@/features/decks/types";
import type { Folder } from "@/features/folders/queries";
import { SharePanel } from "@/features/sharing/components/share-panel";

const VISIBILITIES: Visibility[] = ["private", "unlisted", "public"];

export function DeckSettings({
  deck,
  folders,
  shareToken,
}: {
  deck: Deck;
  folders: Folder[];
  shareToken: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        {open ? "Close settings" : "Deck settings"}
      </Button>

      {open ? (
        <div className="mt-4 space-y-6 rounded-card border border-border bg-surface p-5">
          <EditDeckForm deck={deck} />

          <hr className="border-border" />

          <VisibilitySection deck={deck} />

          {folders.length > 0 ? (
            <>
              <hr className="border-border" />
              <FolderSection deck={deck} folders={folders} />
            </>
          ) : null}

          <hr className="border-border" />

          <SharePanel deckId={deck.id} existingToken={shareToken} />

          <hr className="border-border" />

          <div>
            <p className="text-sm font-medium text-text">Export</p>
            <p className="mt-0.5 text-xs text-muted">
              JSON keeps everything and imports back into Achi. CSV opens in a
              spreadsheet.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`/api/decks/${deck.id}/export?format=json`} download>
                <Button variant="secondary" size="sm">
                  Download JSON
                </Button>
              </a>
              <a href={`/api/decks/${deck.id}/export?format=csv`} download>
                <Button variant="secondary" size="sm">
                  Download CSV
                </Button>
              </a>
            </div>
          </div>

          <hr className="border-border" />

          <div className="flex flex-wrap items-center gap-2">
            <form action={togglePin}>
              <input type="hidden" name="deckId" value={deck.id} />
              <Button type="submit" variant="secondary" size="sm">
                {deck.is_pinned ? "Unpin deck" : "Pin deck"}
              </Button>
            </form>

            <form action={duplicateDeck}>
              <input type="hidden" name="deckId" value={deck.id} />
              <Button type="submit" variant="secondary" size="sm">
                Duplicate
              </Button>
            </form>

            <form
              action={deleteDeck}
              onSubmit={(event) => {
                if (
                  !confirm(
                    `Delete "${deck.title}" and its ${deck.card_count} card(s)? This cannot be undone.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="deckId" value={deck.id} />
              <Button type="submit" variant="danger" size="sm">
                Delete deck
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditDeckForm({ deck }: { deck: Deck }) {
  const [state, formAction, isPending] = useActionState<DeckFormState, FormData>(
    updateDeck,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="deckId" value={deck.id} />

      {state.formError ? (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <Field label="Icon" htmlFor="edit-emoji">
            <Input
              id="edit-emoji"
              name="emoji"
              maxLength={8}
              defaultValue={deck.emoji ?? ""}
              className="text-center"
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Name" htmlFor="edit-title" error={state.fieldErrors?.title}>
            <Input
              id="edit-title"
              name="title"
              required
              defaultValue={deck.title}
              invalid={Boolean(state.fieldErrors?.title)}
            />
          </Field>
        </div>
      </div>

      <Field
        label="Description"
        htmlFor="edit-description"
        error={state.fieldErrors?.description}
      >
        <Textarea
          id="edit-description"
          name="description"
          defaultValue={deck.description ?? ""}
          invalid={Boolean(state.fieldErrors?.description)}
        />
      </Field>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

function VisibilitySection({ deck }: { deck: Deck }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-text">Who can see this</legend>
      <div className="mt-2 space-y-1.5">
        {VISIBILITIES.map((value) => (
          <form key={value} action={setVisibility}>
            <input type="hidden" name="deckId" value={deck.id} />
            <input type="hidden" name="visibility" value={value} />
            <button
              type="submit"
              className={`flex w-full items-baseline gap-2 rounded-control border px-3 py-2 text-left text-sm transition-colors ${
                deck.visibility === value
                  ? "border-primary bg-primary-subtle"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <span className="font-medium text-text">
                {VISIBILITY_LABELS[value]}
              </span>
              <span className="text-xs text-muted">
                {VISIBILITY_HINTS[value]}
              </span>
            </button>
          </form>
        ))}
      </div>
    </fieldset>
  );
}

function FolderSection({ deck, folders }: { deck: Deck; folders: Folder[] }) {
  return (
    <form action={moveDeckToFolder} className="space-y-2">
      <input type="hidden" name="deckId" value={deck.id} />
      <label htmlFor="deck-folder" className="block text-sm font-medium text-text">
        Folder
      </label>
      <div className="flex gap-2">
        <select
          id="deck-folder"
          name="folderId"
          defaultValue={deck.folder_id ?? ""}
          className="h-9 flex-1 rounded-control border border-border-strong bg-surface px-3 text-sm text-text"
        >
          <option value="">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Move
        </Button>
      </div>
    </form>
  );
}
