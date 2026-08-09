import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/features/auth/queries";
import { NewCommunityForm } from "@/features/community/components/new-community-form";

export const metadata: Metadata = { title: "Start a community" };

export default async function NewCommunityPage() {
  await requireOnboardedUser();

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/community" className="text-sm text-muted hover:text-text">
        ← Community
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">
        Start a community
      </h1>
      <p className="mt-1 text-sm text-muted">
        A place for a class or study group to post and share decks.
      </p>

      <div className="mt-6">
        <NewCommunityForm />
      </div>
    </div>
  );
}
