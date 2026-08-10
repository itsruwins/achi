"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
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
import { cn } from "@/lib/utils/cn";

const VISIBILITIES: Visibility[] = ["private", "unlisted", "public"];

/**
 * Deck settings, in a drawer rather than an inline expander.
 *
 * Seven groups of controls expanding in place shoves the card list — the thing
 * you were looking at — off the bottom of the screen. In a drawer the deck
 * stays visible behind, which is what you're editing against.
 */
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
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <GearIcon />
        Settings
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Deck settings"
        description={deck.title}
      >
        <div className="space-y-6">
          <EditDeckForm deck={deck} />

          <Divider />
          <VisibilitySection deck={deck} />

          {folders.length > 0 ? (
            <>
              <Divider />
              <FolderSection deck={deck} folders={folders} />
            </>
          ) : null}

          <Divider />
          <SharePanel deckId={deck.id} existingToken={shareToken} />

          <Divider />
          <Group
            title="Export"
            hint="JSON keeps everything and imports back into Achi. CSV opens in a spreadsheet."
          >
            <div className="flex flex-wrap gap-2">
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
          </Group>

          <Divider />
          <Group title="Manage">
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
            </div>
          </Group>

          {/*
            Destructive action, last and visually separated. The count is in the
            confirm text because "delete deck" understates it — the cards go too.
          */}
          <div className="rounded-card border border-danger/30 bg-danger-subtle p-3">
            <p className="text-base font-medium text-danger">Delete this deck</p>
            <p className="mt-0.5 text-sm text-muted">
              Removes the deck and all {deck.card_count}{" "}
              {deck.card_count === 1 ? "card" : "cards"} in it. Export first if
              you might want them back.
            </p>
            <form
              className="mt-3"
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
      </Drawer>
    </>
  );
}

function Divider() {
  return <hr className="border-border" />;
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-base font-medium text-text">{title}</p>
      {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function EditDeckForm({ deck }: { deck: Deck }) {
  const [state, formAction, isPending] = useActionState<DeckFormState, FormData>(
    updateDeck,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="deckId" value={deck.id} />

      {state.formError ? (
        <p role="alert" className="text-base text-danger">
          {state.formError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <div className="w-16 shrink-0">
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

      <Button type="submit" size="sm" loading={isPending}>
        Save details
      </Button>
    </form>
  );
}

function VisibilitySection({ deck }: { deck: Deck }) {
  return (
    <fieldset>
      <legend className="text-base font-medium text-text">Who can see this</legend>
      <div className="mt-2 space-y-1.5">
        {VISIBILITIES.map((value) => {
          const active = deck.visibility === value;

          return (
            <form key={value} action={setVisibility}>
              <input type="hidden" name="deckId" value={deck.id} />
              <input type="hidden" name="visibility" value={value} />
              <button
                type="submit"
                aria-pressed={active}
                className={cn(
                  "block w-full rounded-control border px-3 py-2 text-left",
                  "transition-[background-color,border-color] duration-[var(--dur-fast)]",
                  active
                    ? "border-primary-border bg-primary-subtle"
                    : "border-border hover:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "block text-base font-medium",
                    active ? "text-primary" : "text-text",
                  )}
                >
                  {VISIBILITY_LABELS[value]}
                </span>
                <span className="block text-sm text-muted">
                  {VISIBILITY_HINTS[value]}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </fieldset>
  );
}

function FolderSection({ deck, folders }: { deck: Deck; folders: Folder[] }) {
  return (
    <form action={moveDeckToFolder} className="space-y-2">
      <input type="hidden" name="deckId" value={deck.id} />
      <label
        htmlFor="deck-folder"
        className="block text-base font-medium text-text"
      >
        Folder
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select
            id="deck-folder"
            name="folderId"
            defaultValue={deck.folder_id ?? ""}
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="sm" variant="secondary">
          Move
        </Button>
      </div>
    </form>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  );
}
