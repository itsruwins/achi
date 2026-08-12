"use client";

import { useEffect, useState } from "react";

import { FlipCard } from "@/features/study/components/flip-card";
import { cn } from "@/lib/utils/cn";

const SAMPLE = [
  {
    front: "Which cranial nerve carries taste from the anterior two-thirds of the tongue?",
    back: "The facial nerve (CN VII), via the chorda tympani.",
    topic: "Neuroanatomy",
  },
  {
    front: "What does the ATP synthase enzyme use to drive phosphorylation?",
    back: "The proton-motive force — a H⁺ gradient across the inner mitochondrial membrane.",
    topic: "Cell biology",
  },
  {
    front: "Under Article III, what must a warrant be supported by?",
    back: "Probable cause, determined personally by a judge after examination under oath.",
    topic: "Constitutional law",
  },
];

/**
 * The hero demo: a real card you can actually flip.
 *
 * Reusing the production `FlipCard` rather than mocking one means the landing
 * page can't drift from the thing it's advertising — if the flip changes, this
 * changes with it.
 */
export function DemoCard() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touched, setTouched] = useState(false);

  const card = SAMPLE[index];

  // One unprompted there-and-back flip a moment after load, so the card reads
  // as interactive rather than as a screenshot — then it settles on the
  // question, which is where a visitor should be left. It stops the instant
  // someone touches it: an animation that keeps going while you're using
  // something is the interface arguing with you.
  useEffect(() => {
    if (touched) return;

    const out = setTimeout(() => setFlipped(true), 1800);
    const back = setTimeout(() => setFlipped(false), 4300);
    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [touched]);

  function next() {
    setTouched(true);
    setFlipped(false);
    setIndex((current) => (current + 1) % SAMPLE.length);
  }

  return (
    <div className="w-full max-w-md">
      <FlipCard
        key={index}
        eyebrow={card.topic}
        front={{ text: card.front }}
        back={{ text: card.back }}
        flipped={flipped}
        onFlip={() => {
          setTouched(true);
          setFlipped((value) => !value);
        }}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {SAMPLE.map((sample, position) => (
            <span
              key={sample.topic}
              className={cn(
                "h-1 rounded-pill transition-[width,background-color] duration-[var(--dur)] ease-[var(--ease-out)]",
                position === index ? "w-5 bg-primary" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="-my-1.5 flex min-h-11 items-center rounded-control px-2 text-sm text-muted transition-colors duration-[var(--dur-fast)] hover:text-text sm:my-0 sm:min-h-0 sm:py-1"
        >
          Next card →
        </button>
      </div>
    </div>
  );
}
