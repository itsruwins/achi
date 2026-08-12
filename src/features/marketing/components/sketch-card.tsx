"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

const SAMPLE = [
  {
    topic: "Neuroanatomy",
    front: "Which cranial nerve carries taste from the anterior two-thirds of the tongue?",
    back: "The facial nerve (CN VII), via the chorda tympani.",
  },
  {
    topic: "Cell biology",
    front: "What drives phosphorylation at ATP synthase?",
    back: "The proton-motive force — a H⁺ gradient across the inner mitochondrial membrane.",
  },
  {
    topic: "Constitutional law",
    front: "What must a warrant be supported by?",
    back: "Probable cause, determined personally by a judge after examination under oath.",
  },
];

/**
 * The pinned card in the hero.
 *
 * Purpose-built for the landing page rather than reusing the production
 * FlipCard: the drawn edge is a pseudo-element treatment, not a token, so the
 * real component can't inherit it from the scope the way colours and radii do.
 * Phase 4 gives FlipCard the same treatment and this can then be reconsidered.
 *
 * It is a real button, not a div with a click handler — flipping is the
 * product's core interaction and it has to work from the keyboard here too.
 */
export function SketchCard() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touched, setTouched] = useState(false);

  const card = SAMPLE[index];

  // One unprompted flip shortly after load, so the card reads as interactive
  // rather than as a screenshot, then it settles back on the question — which
  // is where a visitor should be left. It stops the moment someone touches it:
  // an animation still running while you're using something is the interface
  // arguing with you.
  useEffect(() => {
    if (touched) return;
    const out = setTimeout(() => setFlipped(true), 1900);
    const back = setTimeout(() => setFlipped(false), 4400);
    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [touched]);

  function flip() {
    setTouched(true);
    setFlipped((v) => !v);
  }

  function next() {
    setTouched(true);
    setFlipped(false);
    setIndex((i) => (i + 1) % SAMPLE.length);
  }

  return (
    <div className="w-full max-w-[26rem]">
      <button
        type="button"
        onClick={flip}
        aria-pressed={flipped}
        className={cn(
          "sk-edge sk-cast sk-tilt-r group relative block w-full text-left",
          "min-h-[15rem] p-6 sm:min-h-[16.5rem] sm:p-7",
          "transition-transform duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:-translate-y-0.5 active:translate-y-px",
        )}
      >
        <span className="sk-mono block">{card.topic}</span>

        {/*
          Both faces are always in the DOM and the hidden one is inert, rather
          than swapping text on flip: swapping would let the card resize between
          states and shift the page under the cursor mid-click.
        */}
        <span className="mt-5 block">
          <span
            className={cn(
              "block text-[1.35rem] leading-snug text-text sm:text-[1.5rem]",
              flipped && "hidden",
            )}
          >
            {card.front}
          </span>

          <span className={cn("block", !flipped && "hidden")}>
            <span className="sk-mono block text-primary">Answer</span>
            <span className="mt-2 block text-[1.2rem] leading-snug text-text sm:text-[1.3rem]">
              {card.back}
            </span>
          </span>
        </span>

        <span className="sk-hand mt-6 block text-base text-subtle">
          {flipped ? "tap to flip back" : "tap to see the answer"}
        </span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {SAMPLE.map((s, i) => (
            <span
              key={s.topic}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-[var(--ink-soft)]",
              )}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={next}
          className="sk-hand min-h-11 px-1 text-lg text-muted transition-colors hover:text-text sm:min-h-0"
        >
          next card →
        </button>
      </div>
    </div>
  );
}
