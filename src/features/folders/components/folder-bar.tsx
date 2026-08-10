"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { PlusIcon } from "@/components/ui/icons";
import { createFolder, type FolderFormState } from "@/features/folders/actions";
import type { Folder } from "@/features/folders/queries";

type Props = {
  folders: Folder[];
  activeFolderId?: string;
};

export function FolderBar({ folders, activeFolderId }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      {/* Scrolls sideways rather than wrapping to three rows once someone has a
          dozen folders. The fade at the edge is what signals there's more. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <FilterChip href="/decks" active={!activeFolderId}>
          All decks
        </FilterChip>

        {folders.map((folder) => (
          <FilterChip
            key={folder.id}
            href={`/decks?folder=${folder.id}`}
            active={activeFolderId === folder.id}
          >
            {folder.name}
          </FilterChip>
        ))}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          className="shrink-0"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <PlusIcon className="size-3.5" />
              Folder
            </>
          )}
        </Button>
      </div>

      {showForm ? <NewFolderForm onDone={() => setShowForm(false)} /> : null}
    </div>
  );
}

function NewFolderForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, isPending] = useActionState<
    FolderFormState,
    FormData
  >(async (prev, formData) => {
    const result = await createFolder(prev, formData);
    if (!result.error) onDone();
    return result;
  }, {});

  return (
    <form
      action={formAction}
      className="flex items-start gap-2 [animation:achi-fade-up_var(--dur)_var(--ease-out)]"
    >
      <div className="max-w-xs flex-1">
        <Input
          name="name"
          required
          autoFocus
          maxLength={60}
          placeholder="Semester 1"
          invalid={Boolean(state.error)}
          aria-label="Folder name"
        />
        {state.error ? (
          <p role="alert" className="mt-1 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" loading={isPending}>
        Add
      </Button>
    </form>
  );
}
