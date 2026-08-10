import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/features/auth/queries";
import { NewCommunityForm } from "@/features/community/components/new-community-form";

export const metadata: Metadata = { title: "Start a community" };

export default async function NewCommunityPage() {
  await requireOnboardedUser();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        backHref="/community"
        backLabel="Community"
        title="Start a community"
        description="A place for a class or study group to post and share decks."
      />
      <NewCommunityForm />
    </div>
  );
}
