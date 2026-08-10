"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { ProgressRail } from "@/components/ui/layout";
import { FlipCard } from "@/features/study/components/flip-card";
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
      <SessionEmpty backHref={backHref}>
        Nothing matched those filters. Widen the topic selection, or pick a
        different deck.
      </SessionEmpty>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ProgressRail current={index + 1} total={cards.length} />

      <FlipCard
        // Remounting per card resets the rotation instantly instead of
        // animating backwards through the flip on every Next.
        key={card.id}
        front={{ text: card.front, imageUrl: card.front_image_url }}
        back={{ text: card.back, imageUrl: card.back_image_url }}
        flipped={flipped}
        onFlip={() => setFlipped((value) => !value)}
        hint={card.hint}
        showHint={showHint}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => go(-1)} disabled={atStart}>
          ← Previous
        </Button>
        <Button onClick={() => go(1)} disabled={atEnd}>
          Next →
        </Button>

        <span className="ml-auto flex items-center gap-1">
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
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-subtle">
        <span className="flex items-center gap-2">
          <span className="truncate">{card.deckTitle}</span>
          {card.category ? <Badge>{card.category}</Badge> : null}
        </span>
        <KeyHints />
      </div>
    </div>
  );
}

/**
 * Keyboard shortcuts, shown rather than hidden in a help menu.
 *
 * Desktop only — on touch there is no keyboard to press, and the line is just
 * noise under the thing you actually tap.
 */
export function KeyHints({
  hints = [
    ["Space", "flip"],
    ["← →", "move"],
    ["S", "shuffle"],
  ],
}: {
  hints?: [string, string][];
}) {
  return (
    <span className="hidden items-center gap-3 sm:flex">
      {hints.map(([key, action]) => (
        <span key={key} className="flex items-center gap-1.5">
          <kbd className="rounded border border-border bg-sunken px-1.5 py-0.5 font-mono text-2xs text-muted">
            {key}
          </kbd>
          {action}
        </span>
      ))}
    </span>
  );
}

export function SessionEmpty({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-dashed border-border-strong bg-surface/60 p-10 text-center">
      <p className="text-base text-muted">{children}</p>
      <Link href={backHref} className="mt-5 inline-block">
        <Button variant="secondary">Back</Button>
      </Link>
    </div>
  );
}
