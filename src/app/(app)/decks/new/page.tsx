import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/features/auth/queries";
import { NewDeckForm } from "@/features/decks/components/new-deck-form";
import { listFolders } from "@/features/folders/queries";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage() {
  const { user } = await requireOnboardedUser();
  const folders = await listFolders(user.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/decks" className="text-sm text-muted hover:text-text">
        ← Back to decks
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">
        New deck
      </h1>
      <p className="mt-1 text-sm text-muted">
        You can change any of this later.
      </p>

      <div className="mt-6">
        <NewDeckForm folders={folders} />
      </div>
    </div>
  );
}
