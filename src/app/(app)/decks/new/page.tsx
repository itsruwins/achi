import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/features/auth/queries";
import { GeneratePanel } from "@/features/ai/components/generate-panel";
import { getQuotaRemaining } from "@/features/ai/quota";
import { NewDeckForm } from "@/features/decks/components/new-deck-form";
import { listFolders } from "@/features/folders/queries";
import { isGroqConfigured } from "@/lib/groq/client";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage({
  searchParams,
}: PageProps<"/decks/new">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const aiAvailable = isGroqConfigured();
  const useAi = aiAvailable && params.with === "ai";

  const [folders, quota] = await Promise.all([
    listFolders(user.id),
    aiAvailable ? getQuotaRemaining() : Promise.resolve(null),
  ]);

  return (
    <div className={cn("mx-auto", useAi ? "max-w-2xl" : "max-w-lg")}>
      <Link href="/decks" className="text-sm text-muted hover:text-text">
        ← Back to decks
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">
        New deck
      </h1>

      {aiAvailable ? (
        // Tabs as links rather than client state: the choice lives in the URL,
        // so it survives a refresh and can be linked to.
        <div className="mt-4 flex gap-1 rounded-control border border-border p-1">
          <Tab href="/decks/new" active={!useAi}>
            Write it myself
          </Tab>
          <Tab href="/decks/new?with=ai" active={useAi}>
            Generate with AI
          </Tab>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">You can change any of this later.</p>
      )}

      <div className="mt-6">
        {useAi && quota ? (
          <GeneratePanel remaining={quota.generations} />
        ) : (
          <NewDeckForm folders={folders} />
        )}
      </div>
    </div>
  );
}

function Tab({
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
        "flex-1 rounded-[7px] px-3 py-1.5 text-center text-sm transition-colors",
        active
          ? "bg-primary-subtle font-medium text-primary"
          : "text-muted hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}
