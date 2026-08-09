"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { createFolder, type FolderFormState } from "@/features/folders/actions";
import type { Folder } from "@/features/folders/queries";

import { cn } from "@/lib/utils/cn";

type Props = {
  folders: Folder[];
  activeFolderId?: string;
};

export function FolderBar({ folders, activeFolderId }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderChip href="/decks" active={!activeFolderId}>
          All decks
        </FolderChip>

        {folders.map((folder) => (
          <FolderChip
            key={folder.id}
            href={`/decks?folder=${folder.id}`}
            active={activeFolderId === folder.id}
          >
            {folder.name}
          </FolderChip>
        ))}

        <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Folder"}
        </Button>
      </div>

      {showForm ? <NewFolderForm onDone={() => setShowForm(false)} /> : null}
    </div>
  );
}

function FolderChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary-subtle font-medium text-primary"
          : "border-border text-muted hover:border-border-strong hover:text-text",
      )}
    >
      {children}
    </Link>
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
    <form action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
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
          <p role="alert" className="mt-1 text-xs text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
