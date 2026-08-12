"use client";

import { useState } from "react";

import { SketchConnector } from "@/components/ui/sketch";
import { cn } from "@/lib/utils/cn";

/**
 * Sample cards, drifting past — and every one of them is a real card.
 *
 * Each entry flips on click exactly like the hero card, rather than the strip
 * showing pre-flipped answers as separate items. Where a card was written from
 * source material, the notes sit *beside* it with an arrow between, so the
 * paste-in / card-out idea reads as one object instead of two positions in a
 * queue.
 *
 * None of these questions appear in the hero deck, so nothing is duplicated
 * between the two.
 *
 * The track pauses on hover and on focus-within. That isn't decoration: a card
 * you have to click while it slides away is a moving target, and without the
 * pause the flip is effectively unusable with a mouse and impossible to reach
 * by keyboard.
 */

type Item = {
  subject: string;
  front: string;
  back: string;
  /** Source material this card was written from, shown alongside it. */
  note?: string;
};

const STRIP: Item[] = [
  {
    subject: "Biochem",
    note: "…PFK-1 catalyses the committed step of glycolysis…",
    front: "Which enzyme is the rate-limiting step of glycolysis?",
    back: "Phosphofructokinase-1 — the committed step of the pathway.",
  },
  {
    subject: "Psychology",
    front: "What separates classical from operant conditioning?",
    back: "Classical pairs two stimuli; operant pairs behaviour with consequence.",
  },
  {
    subject: "Nursing",
    front: "What's the earliest sign of hypovolaemic shock?",
    back: "Tachycardia — the heart compensates before blood pressure falls.",
  },
  {
    subject: "Engineering",
    note: "…Young's modulus = stress ÷ strain, and only within the elastic region…",
    front: "What does Young's modulus actually measure?",
    back: "Stiffness — a material's resistance to elastic deformation.",
  },
  {
    subject: "Physiology",
    front: "Where is antidiuretic hormone released from?",
    back: "The posterior pituitary, though it's made in the hypothalamus.",
  },
  {
    subject: "Statistics",
    front: "When would you use a paired t-test?",
    back: "When the same subjects are measured twice — before and after.",
  },
  {
    subject: "Phil History",
    note: "…at Pugad Lawin, August 1896, the Katipuneros tore up their cédulas…",
    front: "What did the Cry of Pugad Lawin begin?",
    back: "The Philippine Revolution against Spanish rule.",
  },
  {
    subject: "Genetics",
    front: "What does a Punnett square predict?",
    back: "Genotype ratios of offspring from two known parents.",
  },
];

export function SketchStrip() {
  return (
    <section className="pb-10 lg:pb-12">
      <div className="mx-auto w-full max-w-6xl px-5">
        <p className="sk-hand mb-4 text-lg text-subtle">
          a few it wrote for other people — tap any of them
        </p>
      </div>

      {/*
        Spacing is `pr-*` on each item rather than `gap` on the track. With a
        gap, the full width contains one more gap than the half-width does, so
        translating exactly -50% lands half a gap off and the loop jumps.

        Duration scales with the item count — it's total travel time, so adding
        cards at a fixed duration silently speeds the drift up.
      */}
      <div className="sk-marquee overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,black_5rem,black_calc(100%-5rem),transparent)]">
        <ul className="sk-marquee-track flex w-max animate-[achi-marquee_86s_linear_infinite] items-stretch motion-reduce:animate-none">
          {[...STRIP, ...STRIP].map((item, i) => {
            // The second copy exists only so the loop can seam. It's hidden
            // from readers and made inert, because it contains real buttons —
            // aria-hidden alone would leave them in the tab order, which is how
            // you end up tabbing into a control nobody can see.
            const duplicate = i >= STRIP.length;

            return (
              <li
                key={`${item.subject}-${i}`}
                className="shrink-0 pr-4"
                aria-hidden={duplicate || undefined}
                inert={duplicate || undefined}
              >
                <Entry item={item} seed={i} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Entry({ item, seed }: { item: Item; seed: number }) {
  if (!item.note) return <FlipCard item={item} seed={seed} />;

  return (
    <div className="flex items-center gap-2">
      {/* The source, on the second surface — raw material rather than output,
          and deliberately not a card, so it never looks flippable. */}
      <div
        className={cn(
          "sk-edge sk-cast-sm sk-fill-sunken sk-live h-[7.75rem] w-[12.5rem] px-3.5 py-3",
          seed % 2 === 0 ? "sk-tilt-a" : "sk-tilt-b",
        )}
      >
        <span className="sk-mono block text-subtle">your notes</span>
        <p className="mt-1 text-[0.875rem] leading-snug text-muted">
          {item.note}
        </p>
      </div>

      <SketchConnector
        aria-hidden="true"
        className="h-5 w-8 shrink-0 text-[var(--ink-soft)]"
      />

      <FlipCard item={item} seed={seed + 1} />
    </div>
  );
}

function FlipCard({ item, seed }: { item: Item; seed: number }) {
  const [flipped, setFlipped] = useState(false);

  // Same construction as the hero card: preserve-3d on the inner element, never
  // on the button — a filtered element can't establish a 3D rendering context,
  // and the button is what carries the focus ring and the height.
  const face = cn(
    "sk-flip-face sk-edge sk-cast-sm sk-live block px-3.5 py-3",
    seed % 3 === 1 && "sk-b",
    seed % 3 === 2 && "sk-c",
  );

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      aria-pressed={flipped}
      aria-label={`${item.subject} card. ${flipped ? "Showing answer" : "Showing question"}. Activate to flip.`}
      className={cn(
        "sk-flip block h-[7.75rem] w-[16rem] text-left",
        seed % 2 === 0 ? "sk-tilt-b" : "sk-tilt-a",
      )}
    >
      <span className="sk-flip-inner block" data-flipped={flipped}>
        <span className={face}>
          <span className="sk-mono block text-primary">{item.subject}</span>
          <p className="sk-hand mt-1 text-[1rem] leading-snug text-text">
            {item.front}
          </p>
        </span>

        <span className={cn(face, "sk-flip-back sk-fill-sunken")}>
          <span className="sk-mono block text-primary">answer</span>
          <p className="sk-hand mt-1 text-[1rem] leading-snug text-text">
            {item.back}
          </p>
        </span>
      </span>
    </button>
  );
}
