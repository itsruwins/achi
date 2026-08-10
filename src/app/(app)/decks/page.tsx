import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DecksIcon, ImportIcon, PlusIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/features/auth/queries";
import { DeckTile } from "@/features/decks/components/deck-tile";
import { listDecks } from "@/features/decks/queries";
import { FolderBar } from "@/features/folders/components/folder-bar";
import { listFolders } from "@/features/folders/queries";
import { countDueByDeck } from "@/features/srs/queries";

export const metadata: Metadata = { title: "Your decks" };

export default async function DecksPage({ searchParams }: PageProps<"/decks">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const folderId = typeof params.folder === "string" ? params.folder : undefined;
  const errorMessage = typeof params.error === "string" ? params.error : undefined;

  const [decks, folders, dueByDeck] = await Promise.all([
    listDecks(user.id, { folderId }),
    listFolders(user.id),
    countDueByDeck(user.id),
  ]);

  const activeFolder = folders.find((folder) => folder.id === folderId);
  const totalCards = decks.reduce((sum, deck) => sum + deck.card_count, 0);

  return (
    <div>
      <PageHeader
        title={activeFolder ? activeFolder.name : "Your decks"}
        meta={
          decks.length > 0 ? (
            <span className="tnum">
              {decks.length} {decks.length === 1 ? "deck" : "decks"} ·{" "}
              {totalCards} {totalCards === 1 ? "card" : "cards"}
            </span>
          ) : null
        }
        actions={
          <>
            <Link href="/decks/new?with=import">
              <Button variant="secondary">
                <ImportIcon className="size-4" />
                Import
              </Button>
            </Link>
            <Link href="/decks/new">
              <Button>
                <PlusIcon className="size-4" />
                New deck
              </Button>
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <p
          role="alert"
          className="mb-5 rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      <FolderBar folders={folders} activeFolderId={folderId} />

      <div className="mt-5">
        {decks.length === 0 ? (
          <EmptyState
            icon={<DecksIcon className="size-5" />}
            title={
              activeFolder
                ? `Nothing in ${activeFolder.name} yet`
                : "Start with one deck"
            }
            body={
              activeFolder
                ? "Move a deck into this folder from its settings, or make a new one here."
                : "A deck is a set of cards on one topic. Write them yourself, paste your notes and let AI draft them, or bring a file you already have."
            }
            action={
              <>
                <Link href="/decks/new">
                  <Button>Create a deck</Button>
                </Link>
                <Link href="/decks/new?with=import">
                  <Button variant="secondary">Import a file</Button>
                </Link>
              </>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <DeckTile deck={deck} due={dueByDeck[deck.id]} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
