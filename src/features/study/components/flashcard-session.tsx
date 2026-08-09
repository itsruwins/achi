"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { shuffle } from "@/features/study/generate";
import type { StudyCard } from "@/features/study/types";

export function FlashcardSession({
  cards: initialCards,
  backHref,
}: {
  cards: StudyCard[];
  backHref: string;
}) {
  const [cards, setCards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const card = cards[index];
  const atStart = index === 0;
  const atEnd = index === cards.length - 1;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        if (next < 0 || next >= cards.length) return current;
        return next;
      });
      setFlipped(false);
      setShowHint(false);
    },
    [cards.length],
  );

  const reshuffle = useCallback(() => {
    setCards((current) => shuffle(current));
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Don't hijack keys while someone is typing somewhere on the page.
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      switch (event.key) {
        case " ":
        case "Enter":
          event.preventDefault();
          setFlipped((value) => !value);
          break;
        case "ArrowRight":
          go(1);
          break;
        case "ArrowLeft":
          go(-1);
          break;
        case "s":
        case "S":
          reshuffle();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, reshuffle]);

  if (!card) {
    return (
      <EmptyState backHref={backHref}>
        Nothing to study with those filters.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <ProgressBar current={index + 1} total={cards.length} />

      {/* The whole card is the flip target — clicking anywhere is the obvious
          gesture, and a button keeps it reachable by keyboard and screen reader. */}
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-live="polite"
        className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface p-8 text-center shadow-card transition-colors hover:border-primary"
      >
        <span className="text-xs uppercase tracking-wide text-subtle">
          {flipped ? "Answer" : "Question"}
        </span>

        <p className="whitespace-pre-wrap text-xl leading-relaxed text-text">
          {flipped ? card.back : card.front}
        </p>

        {(flipped ? card.back_image_url : card.front_image_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(flipped ? card.back_image_url : card.front_image_url) ?? ""}
            alt=""
            className="max-h-56 rounded-control object-contain"
          />
        ) : null}

        {!flipped && showHint && card.hint ? (
          <p className="text-sm text-muted">Hint: {card.hint}</p>
        ) : null}

        <span className="text-xs text-subtle">
          {flipped ? "Tap to see the question" : "Tap to reveal"}
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => go(-1)} disabled={atStart}>
            ← Previous
          </Button>
          <Button onClick={() => go(1)} disabled={atEnd}>
            Next →
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {card.hint && !flipped ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(true)}
              disabled={showHint}
            >
              Hint
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={reshuffle}>
            Shuffle
          </Button>
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              Done
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
        <span>
          {card.deckTitle}
          {card.category ? ` · ${card.category}` : ""}
        </span>
        <span className="hidden sm:inline">
          Space flips · ← → moves · S shuffles
        </span>
      </div>
    </div>
  );
}

export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs text-subtle">
        <span>
          {current} of {total}
        </span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-dashed border-border-strong bg-surface p-10 text-center">
      <p className="text-sm text-muted">{children}</p>
      <Link href={backHref} className="mt-5 inline-block">
        <Button variant="secondary">Back</Button>
      </Link>
    </div>
  );
}
