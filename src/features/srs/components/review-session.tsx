"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { CheckIcon, FlameIcon } from "@/components/ui/icons";
import { ProgressRail } from "@/components/ui/layout";
import { reviewCard } from "@/features/srs/actions";
import { RATINGS, type Rating } from "@/features/srs/algorithm";
import type { DueCard } from "@/features/srs/queries";
import { KeyHints } from "@/features/study/components/flashcard-session";
import { cn } from "@/lib/utils/cn";

const RATING_LABELS: Record<Rating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const RATING_HINTS: Record<Rating, string> = {
  again: "Didn't know it",
  hard: "Barely got it",
  good: "Knew it",
  easy: "Instant",
};

/**
 * Each rating gets a full border, tinted fill on hover, and its own hue — but
 * the label carries the meaning on its own, so the four are still separable
 * without color.
 */
const RATING_STYLES: Record<Rating, string> = {
  again: "border-danger/45 text-danger hover:bg-danger-subtle hover:border-danger",
  hard: "border-warning/45 text-warning hover:bg-warning-subtle hover:border-warning",
  good: "border-success/45 text-success hover:bg-success-subtle hover:border-success",
  easy: "border-info/45 text-info hover:bg-info-subtle hover:border-info",
};

export function ReviewSession({ cards }: { cards: DueCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tally per rating, so the summary at the end says something more useful than
  // a raw count of cards seen.
  const [tally, setTally] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const card = cards[index];
  const done = index >= cards.length;

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || isPending) return;
      setError(null);

      startTransition(async () => {
        const result = await reviewCard(card.cardId, rating);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setTally((current) => ({ ...current, [rating]: current[rating] + 1 }));
        setRevealed(false);
        setIndex((current) => current + 1);
      });
    },
    [card, isPending],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if (done) return;

      if (!revealed) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }

      // 1–4 map to the rating buttons in the order they're displayed.
      const position = Number.parseInt(event.key, 10);
      if (position >= 1 && position <= 4) {
        event.preventDefault();
        rate(RATINGS[position - 1]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, rate, done]);

  if (done) {
    const known = tally.good + tally.easy;
    const accuracy =
      cards.length > 0 ? Math.round((known / cards.length) * 100) : 0;

    return (
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card [animation:achi-pop_var(--dur-slow)_var(--ease-out)]">
        <span className="mx-auto grid size-11 place-items-center rounded-pill bg-success-subtle text-success">
          <CheckIcon className="size-5" />
        </span>

        <p className="mt-4 text-xl font-semibold tracking-tight text-text">
          All caught up
        </p>
        <p className="mt-1 text-base text-muted">
          {cards.length} {cards.length === 1 ? "card" : "cards"} reviewed. Each
          one is scheduled to come back when you&rsquo;re about to forget it.
        </p>

        <dl className="mt-6 grid grid-cols-4 gap-1.5 text-left">
          {RATINGS.map((rating) => (
            <div
              key={rating}
              className="rounded-control bg-sunken px-2 py-2 text-center"
            >
              <dt className="text-2xs text-subtle">{RATING_LABELS[rating]}</dt>
              <dd className="tnum text-lg font-semibold text-text">
                {tally[rating]}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted">
          <FlameIcon className="size-3.5 text-accent" />
          <span className="tnum">{accuracy}%</span> recalled without a struggle
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => router.refresh()}>Check for more</Button>
          <Link href="/decks">
            <Button variant="secondary">Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ProgressRail
        current={index + 1}
        total={cards.length}
        label={`Card ${index + 1} of ${cards.length}`}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {error}
        </p>
      ) : null}

      {/*
        Review deliberately does NOT flip. Self-grading needs the question and
        the answer visible at once — you're judging how close your recall was,
        and a flip hides the thing you're comparing against.
      */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        <span className="label-data">Question</span>
        <div className="mt-3 text-center">
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-text">
            {card.front}
          </p>
          {card.frontImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.frontImageUrl}
              alt=""
              className="mx-auto mt-4 max-h-48 rounded-control object-contain"
            />
          ) : null}
        </div>

        {revealed ? (
          <div className="mt-6 border-t border-border pt-5 [animation:achi-fade-up_var(--dur)_var(--ease-out)]">
            <span className="label-data text-primary">Answer</span>
            <div className="mt-3 text-center">
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-text">
                {card.back}
              </p>
              {card.backImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.backImageUrl}
                  alt=""
                  className="mx-auto mt-4 max-h-48 rounded-control object-contain"
                />
              ) : null}
            </div>
          </div>
        ) : card.hint ? (
          <p className="mt-5 text-center text-base text-muted">
            <span className="font-medium">Hint </span>
            {card.hint}
          </p>
        ) : null}
      </div>

      {revealed ? (
        <div className="[animation:achi-fade-up_var(--dur)_var(--ease-out)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating, position) => (
              <button
                key={rating}
                type="button"
                disabled={isPending}
                onClick={() => rate(rating)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-control border bg-surface px-3 py-2.5",
                  "transition-[background-color,border-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                  "active:translate-y-px disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]",
                  RATING_STYLES[rating],
                )}
              >
                <span className="flex items-center gap-1.5 text-base font-medium">
                  {RATING_LABELS[rating]}
                  <kbd className="rounded border border-current/25 px-1 font-mono text-2xs opacity-60">
                    {position + 1}
                  </kbd>
                </span>
                <span className="text-sm text-subtle">
                  {RATING_HINTS[rating]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-subtle">
            Be honest — the schedule is only as good as the ratings.
          </p>
        </div>
      ) : (
        <Button size="lg" onClick={() => setRevealed(true)} className="w-full">
          Show answer
        </Button>
      )}

      <div className="flex items-center justify-between gap-2 text-sm text-subtle">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{card.deckTitle}</span>
          {card.category ? <Badge>{card.category}</Badge> : null}
        </span>
        <KeyHints
          hints={revealed ? [["1–4", "rate"]] : [["Space", "reveal"]]}
        />
      </div>
    </div>
  );
}
