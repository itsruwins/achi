import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/features/auth/queries";
import { syncEnrolledSchedules } from "@/features/srs/actions";
import { ReviewSession } from "@/features/srs/components/review-session";
import {
  listDueCards,
  listDueCategories,
  listEnrolledDeckIds,
} from "@/features/srs/queries";
import { readList } from "@/features/study/params";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({
  searchParams,
}: PageProps<"/review">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const deckId = typeof params.deck === "string" ? params.deck : undefined;
  const categories = readList(params.category);

  // Cards added to an enrolled deck after enrollment have no schedule row yet.
  // Catching up here means a card is picked up whether it was created before or
  // after the deck was enrolled, without a trigger on every card insert.
  await syncEnrolledSchedules();

  const [enrolled, due, dueCategories] = await Promise.all([
    listEnrolledDeckIds(user.id),
    listDueCards(user.id, { deckId, categories }),
    listDueCategories(user.id),
  ]);

  if (enrolled.length === 0) {
    return (
      <EmptyReview
        title="No decks in review yet"
        body="Open a deck and turn on review to start scheduling its cards."
      />
    );
  }

  if (due.length === 0) {
    return (
      <EmptyReview
        title="Nothing due today"
        body={
          categories.length > 0 || deckId
            ? "Nothing due with those filters. Try clearing them."
            : "You're caught up. New cards appear here as their intervals come round."
        }
        showClear={categories.length > 0 || Boolean(deckId)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Review
        </h1>
        <p className="text-sm text-muted">
          {due.length} due{deckId ? " in this deck" : ""}
        </p>
      </div>

      {dueCategories.length > 1 && !deckId ? (
        <TopicFilter
          categories={dueCategories}
          selected={categories}
        />
      ) : null}

      <ReviewSession cards={due} />
    </div>
  );
}

function TopicFilter({
  categories,
  selected,
}: {
  categories: string[];
  selected: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/review"
        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
          selected.length === 0
            ? "border-primary bg-primary-subtle font-medium text-primary"
            : "border-border text-muted hover:border-border-strong"
        }`}
      >
        All topics
      </Link>
      {categories.map((category) => {
        const active = selected.includes(category);
        return (
          <Link
            key={category}
            href={`/review?category=${encodeURIComponent(category)}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? "border-primary bg-primary-subtle font-medium text-primary"
                : "border-border text-muted hover:border-border-strong"
            }`}
          >
            {category}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyReview({
  title,
  body,
  showClear,
}: {
  title: string;
  body: string;
  showClear?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-dashed border-border-strong bg-surface p-12 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <div className="mt-6 flex justify-center gap-2">
        {showClear ? (
          <Link href="/review">
            <Button variant="secondary">Clear filters</Button>
          </Link>
        ) : null}
        <Link href="/decks">
          <Button variant={showClear ? "ghost" : "secondary"}>
            Back to decks
          </Button>
        </Link>
      </div>
    </div>
  );
}
