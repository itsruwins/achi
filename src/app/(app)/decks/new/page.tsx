import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/features/auth/queries";
import { GeneratePanel } from "@/features/ai/components/generate-panel";
import { getQuotaRemaining } from "@/features/ai/quota";
import { NewDeckForm } from "@/features/decks/components/new-deck-form";
import { listFolders } from "@/features/folders/queries";
import { ImportPanel } from "@/features/transfer/components/import-panel";
import { isGroqConfigured } from "@/lib/groq/client";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage({
  searchParams,
}: PageProps<"/decks/new">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const aiAvailable = isGroqConfigured();
  const mode =
    params.with === "import"
      ? "import"
      : params.with === "ai" && aiAvailable
        ? "ai"
        : "manual";

  const [folders, quota] = await Promise.all([
    listFolders(user.id),
    aiAvailable ? getQuotaRemaining() : Promise.resolve(null),
  ]);

  return (
    <div className={cn("mx-auto", mode === "manual" ? "max-w-lg" : "max-w-2xl")}>
      <Link href="/decks" className="text-sm text-muted hover:text-text">
        ← Back to decks
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">
        New deck
      </h1>

      {/* Tabs as links rather than client state: the choice lives in the URL,
          so it survives a refresh and can be linked to. */}
      <div className="mt-4 flex gap-1 rounded-control border border-border p-1">
        <Tab href="/decks/new" active={mode === "manual"}>
          Write it myself
        </Tab>
        {aiAvailable ? (
          <Tab href="/decks/new?with=ai" active={mode === "ai"}>
            Generate with AI
          </Tab>
        ) : null}
        <Tab href="/decks/new?with=import" active={mode === "import"}>
          Import a file
        </Tab>
      </div>

      <div className="mt-6">
        {mode === "ai" && quota ? (
          <GeneratePanel remaining={quota.generations} />
        ) : mode === "import" ? (
          <ImportPanel />
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
