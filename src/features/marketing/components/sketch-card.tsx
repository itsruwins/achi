"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * The hero demo — a real card, and the subjects that drive it.
 *
 * This replaced a scrolling ticker of sample questions that sat across the
 * bottom of the first viewport. That strip had four problems at once: pinned
 * full-bleed at the fold it read as browser chrome rather than page content, it
 * was sliced by the viewport edge, it scrolled the *same* question the card was
 * already showing, and it put a second unprompted motion in the first screen
 * beside the card's own flip.
 *
 * Turning the subjects into a control fixes all of it. The breadth claim
 * becomes something you operate instead of something you watch, and the card is
 * now the only sample so nothing is duplicated. Nothing here moves unprompted.
 */

type Card = { front: string; back: string };

const DECK: { subject: string; cards: Card[] }[] = [
  {
    subject: "Anatomy",
    cards: [
      {
        front:
          "Which cranial nerve carries taste from the anterior two-thirds of the tongue?",
        back: "The facial nerve (CN VII), via the chorda tympani.",
      },
      {
        front: "What passes through the foramen ovale?",
        back: "The mandibular division of the trigeminal nerve (V₃), with the accessory meningeal artery.",
      },
    ],
  },
  {
    subject: "Org Chem",
    cards: [
      {
        front: "SN1 or SN2 — which favours a tertiary substrate?",
        back: "SN1. The tertiary carbocation is stabilised, and the crowding blocks backside attack.",
      },
      {
        front: "What does a bulky strong base favour in an elimination?",
        back: "E2 giving the Hofmann product — the less substituted alkene.",
      },
    ],
  },
  {
    subject: "Consti Law",
    cards: [
      {
        front: "What must a warrant be supported by?",
        back: "Probable cause, determined personally by a judge after examination under oath.",
      },
      {
        front: "What did the Malolos Constitution establish?",
        back: "The First Philippine Republic, with legislative supremacy over the executive.",
      },
    ],
  },
  {
    subject: "Pharma",
    cards: [
      {
        front: "Which beta blockers are cardioselective?",
        back: "Metoprolol and atenolol — they act mainly on β₁.",
      },
      {
        front: "Why does propranolol risk bronchospasm?",
        back: "It blocks β₂ as well as β₁, and β₂ is what relaxes airway smooth muscle.",
      },
    ],
  },
  {
    subject: "Econ",
    cards: [
      {
        front: "Define price elasticity of demand.",
        back: "The percentage change in quantity demanded, divided by the percentage change in price.",
      },
      {
        front: "Demand is elastic and price falls. What happens to revenue?",
        back: "It rises — quantity climbs proportionally more than price drops.",
      },
    ],
  },
];

export function SketchCard() {
  const [subject, setSubject] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck = DECK[subject];
  const card = deck.cards[index];

  // No auto-flip. The card only ever moves because someone moved it — nothing
  // on this page animates unprompted now. The "tap to see the answer" line is
  // what tells you the card is interactive, which is the job the unprompted
  // flip used to do.
  function pick(next: number) {
    setFlipped(false);
    setSubject(next);
    setIndex(0);
  }

  function nextCard() {
    setFlipped(false);
    setIndex((i) => (i + 1) % deck.cards.length);
  }

  return (
    // 26rem, not wider. The margin annotation in the hero lives in the gutter
    // between this card and the headline column; widening the card to fit the
    // chips ate that gutter and the drawn arrow collided with the card corner.
    // Shortening the subject labels is what actually made the chips fit.
    <div className="w-full max-w-[26rem]">
      {/*
        A real 3D flip. The probe confirmed the displacement-filtered edge
        survives rotation and that backface-visibility still culls correctly.

        preserve-3d lives on the inner element, never on the <button>: a
        filtered element can't establish a 3D rendering context, and the button
        carries the focus ring. The button also holds the height, since both
        faces are absolutely positioned and would otherwise collapse the box.
      */}
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={`${deck.subject} card. ${flipped ? "Showing answer" : "Showing question"}. Activate to flip.`}
        className="sk-flip sk-tilt-r block h-[16rem] w-full text-left sm:h-[17.5rem]"
      >
        <span className="sk-flip-inner block" data-flipped={flipped}>
          <span className="sk-flip-face sk-edge sk-cast sk-lift sk-live block p-6 sm:p-7">
            <span className="sk-mono block">{deck.subject}</span>
            <span className="mt-5 block text-[1.35rem] leading-snug text-text sm:text-[1.5rem]">
              {card.front}
            </span>
            <span className="sk-hand absolute bottom-6 left-6 block text-base text-subtle sm:left-7">
              tap to see the answer
            </span>
          </span>

          <span className="sk-flip-face sk-flip-back sk-edge sk-cast sk-b sk-lift sk-live block p-6 sm:p-7">
            <span className="sk-mono block text-primary">Answer</span>
            <span className="mt-5 block text-[1.2rem] leading-snug text-text sm:text-[1.3rem]">
              {card.back}
            </span>
            <span className="sk-hand absolute bottom-6 left-6 block text-base text-subtle sm:left-7">
              tap to flip back
            </span>
          </span>
        </span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {deck.cards.map((c, i) => (
            <span
              key={c.front}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-[var(--ink-soft)]",
              )}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={nextCard}
          className="sk-hand min-h-11 px-1 text-lg text-muted transition-colors hover:text-text sm:min-h-0"
        >
          next card →
        </button>
      </div>

      {/*
        The subjects, as a control rather than a claim.

        Sits directly under the card it drives, so the relationship needs no
        explaining. `aria-pressed` rather than a tablist: these are toggles that
        change the content of a card elsewhere on the page, not tabs owning
        their own panels, and mislabelling them as tabs would promise arrow-key
        navigation that isn't there.
      */}
      <div className="mt-6">
        <p className="sk-hand mb-2.5 text-base text-subtle">
          or try another subject —
        </p>
        <div
          role="group"
          aria-label="Sample subjects"
          className="flex flex-wrap gap-2"
        >
          {DECK.map((d, i) => {
            const active = i === subject;
            return (
              <button
                key={d.subject}
                type="button"
                aria-pressed={active}
                onClick={() => pick(i)}
                className={cn(
                  "sk-edge sk-fine sk-press sk-live px-3 py-1.5 text-[0.8125rem] font-semibold",
                  active
                    ? "sk-fill-primary text-[var(--primary-fg)]"
                    : "text-muted",
                  i % 3 === 1 && "sk-b",
                  i % 3 === 2 && "sk-c",
                )}
                style={{ ["--sk-radius" as string]: "9px" }}
              >
                {d.subject}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
