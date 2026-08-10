import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/ui/layout";
import { ImportIcon, SparkIcon, StudyIcon } from "@/components/ui/icons";
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
    <div className={cn("mx-auto", mode === "manual" ? "max-w-xl" : "max-w-2xl")}>
      <PageHeader
        title="New deck"
        description="Three ways in. They all end up in the same place — a deck you can study."
        backHref="/decks"
        backLabel="Decks"
      />

      {/* Tabs as links rather than client state: the choice lives in the URL,
          so it survives a refresh and can be linked to. */}
      <div
        role="tablist"
        aria-label="How to create the deck"
        className="grid gap-1.5 sm:grid-cols-3"
      >
        <Tab
          href="/decks/new"
          active={mode === "manual"}
          icon={<StudyIcon className="size-4" />}
          title="Write it myself"
          hint="One card at a time"
        />
        {aiAvailable ? (
          <Tab
            href="/decks/new?with=ai"
            active={mode === "ai"}
            icon={<SparkIcon className="size-4" />}
            title="Generate with AI"
            hint="From notes or a file"
          />
        ) : null}
        <Tab
          href="/decks/new?with=import"
          active={mode === "import"}
          icon={<ImportIcon className="size-4" />}
          title="Import a file"
          hint="CSV, JSON, or Anki"
        />
      </div>

      <div
        // Keyed on the mode so switching tabs replays the entrance instead of
        // silently swapping content under the cursor.
        key={mode}
        className="mt-6 [animation:achi-fade-up_var(--dur)_var(--ease-out)]"
      >
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
  icon,
  title,
  hint,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex items-start gap-2.5 rounded-card border p-3 transition-[background-color,border-color] duration-[var(--dur-fast)]",
        active
          ? "border-primary-border bg-primary-subtle"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className={cn("mt-0.5", active ? "text-primary" : "text-subtle")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-base font-medium",
            active ? "text-primary" : "text-text",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "block text-sm",
            active ? "text-primary/75" : "text-subtle",
          )}
        >
          {hint}
        </span>
      </span>
    </Link>
  );
}
