"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Sample cards, drifting past — and every one of them is a real card.
 *
 * Each flips on click exactly like the hero card, so the strip demonstrates the
 * card format rather than asserting it. None of these questions appear in the
 * hero deck, so nothing is duplicated between the two.
 *
 * The track pauses on hover and on keyboard focus. That isn't decoration: a
 * card you have to click while it slides away is a moving target, and without
 * the pause the flip is barely usable with a mouse and unreachable by keyboard.
 */

type Item = {
  subject: string;
  front: string;
  back: string;
};

const STRIP: Item[] = [
  {
    subject: "Biochem",
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

        Duration is total travel time, so it has to track the width of the set:
        it came down from 86s when the notes cards were removed, or the same set
        over a shorter track would have drifted noticeably slower.
      */}
      <div className="sk-marquee overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,black_5rem,black_calc(100%-5rem),transparent)]">
        <ul className="sk-marquee-track flex w-max animate-[achi-marquee_64s_linear_infinite] items-stretch motion-reduce:animate-none">
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
                <FlipCard item={item} seed={i} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
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
