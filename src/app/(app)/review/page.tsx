import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { CheckIcon, ReviewIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/layout";
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
      <div>
        <PageHeader title="Review" />
        <EmptyState
          icon={<ReviewIcon className="size-5" />}
          title="No decks in review yet"
          body="Review schedules each card for the day you're about to forget it. Open a deck and switch review on to start."
          action={
            <Link href="/decks">
              <Button>Pick a deck</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const filtered = categories.length > 0 || Boolean(deckId);

  if (due.length === 0) {
    return (
      <div>
        <PageHeader title="Review" />
        <EmptyState
          icon={<CheckIcon className="size-5 text-success" />}
          title={filtered ? "Nothing due with those filters" : "Nothing due today"}
          body={
            filtered
              ? "Cards may still be waiting under a different topic or deck."
              : "You're caught up. Cards reappear here as their intervals come round — usually a few each day once a deck gets going."
          }
          action={
            <>
              {filtered ? (
                <Link href="/review">
                  <Button>Clear filters</Button>
                </Link>
              ) : null}
              <Link href="/study">
                <Button variant={filtered ? "secondary" : "primary"}>
                  Free-study instead
                </Button>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Review"
        meta={
          <span className="tnum">
            {due.length} due{deckId ? " in this deck" : ""}
          </span>
        }
      />

      {dueCategories.length > 1 && !deckId ? (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <FilterChip href="/review" active={categories.length === 0}>
            All topics
          </FilterChip>
          {dueCategories.map((category) => (
            <FilterChip
              key={category}
              href={`/review?category=${encodeURIComponent(category)}`}
              active={categories.includes(category)}
            >
              {category}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <ReviewSession cards={due} />
    </div>
  );
}
