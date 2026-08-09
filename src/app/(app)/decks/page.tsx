import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/features/auth/queries";
import { DeckTile } from "@/features/decks/components/deck-tile";
import { listDecks } from "@/features/decks/queries";
import { FolderBar } from "@/features/folders/components/folder-bar";
import { listFolders } from "@/features/folders/queries";

export const metadata: Metadata = { title: "Your decks" };

export default async function DecksPage({ searchParams }: PageProps<"/decks">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const folderId = typeof params.folder === "string" ? params.folder : undefined;
  const errorMessage = typeof params.error === "string" ? params.error : undefined;

  const [decks, folders] = await Promise.all([
    listDecks(user.id, { folderId }),
    listFolders(user.id),
  ]);

  const activeFolder = folders.find((folder) => folder.id === folderId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {activeFolder ? activeFolder.name : "Your decks"}
        </h1>
        <Link href="/decks/new">
          <Button>New deck</Button>
        </Link>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      <FolderBar folders={folders} activeFolderId={folderId} />

      {decks.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface p-12 text-center">
          <p className="text-sm font-medium text-text">
            {activeFolder ? "Nothing in this folder yet" : "No decks yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            A deck is a set of cards on one topic. Make one and start adding
            cards.
          </p>
          <Link href="/decks/new" className="mt-5 inline-block">
            <Button>Create your first deck</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
