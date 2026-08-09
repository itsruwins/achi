"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reviewCard } from "@/features/srs/actions";
import { RATINGS, type Rating } from "@/features/srs/algorithm";
import type { DueCard } from "@/features/srs/queries";
import { ProgressBar } from "@/features/study/components/flashcard-session";

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

const RATING_STYLES: Record<Rating, string> = {
  again: "border-danger text-danger hover:bg-danger-subtle",
  hard: "border-warning text-warning hover:bg-warning-subtle",
  good: "border-success text-success hover:bg-success-subtle",
  easy: "border-info text-info hover:bg-info-subtle",
};

export function ReviewSession({ cards }: { cards: DueCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    return (
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-2xl font-semibold tracking-tight text-text">
          All caught up
        </p>
        <p className="mt-2 text-sm text-muted">
          You reviewed {cards.length} {cards.length === 1 ? "card" : "cards"}.
          Come back tomorrow.
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
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <ProgressBar current={index + 1} total={cards.length} />

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <span className="text-xs uppercase tracking-wide text-subtle">
          Question
        </span>
        <p className="whitespace-pre-wrap text-xl leading-relaxed text-text">
          {card.front}
        </p>
        {card.frontImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.frontImageUrl}
            alt=""
            className="max-h-48 rounded-control object-contain"
          />
        ) : null}

        {revealed ? (
          <>
            <hr className="w-full border-border" />
            <span className="text-xs uppercase tracking-wide text-subtle">
              Answer
            </span>
            <p className="whitespace-pre-wrap text-xl leading-relaxed text-text">
              {card.back}
            </p>
            {card.backImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.backImageUrl}
                alt=""
                className="max-h-48 rounded-control object-contain"
              />
            ) : null}
          </>
        ) : card.hint ? (
          <p className="text-sm text-muted">Hint: {card.hint}</p>
        ) : null}
      </div>

      {revealed ? (
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating, position) => (
              <button
                key={rating}
                type="button"
                disabled={isPending}
                onClick={() => rate(rating)}
                className={`flex flex-col items-center gap-0.5 rounded-control border-[1.5px] bg-surface px-3 py-3 transition-colors disabled:opacity-55 ${RATING_STYLES[rating]}`}
              >
                <span className="text-sm font-medium">
                  {RATING_LABELS[rating]}
                </span>
                <span className="text-xs text-subtle">
                  {RATING_HINTS[rating]}
                </span>
                <span className="mt-0.5 font-mono text-[10px] text-subtle">
                  {position + 1}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-subtle">
            Be honest — the schedule is only as good as the ratings.
          </p>
        </div>
      ) : (
        <Button onClick={() => setRevealed(true)} className="w-full">
          Show answer
        </Button>
      )}

      <div className="flex items-center justify-between text-xs text-subtle">
        <span>
          {card.deckTitle}
          {card.category ? ` · ${card.category}` : ""}
        </span>
        <span className="hidden sm:inline">
          {revealed ? "1–4 to rate" : "Space to reveal"}
        </span>
      </div>
    </div>
  );
}
