"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/chip";
import { CheckIcon, ReviewIcon, SparkIcon, StudyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type Mode = "flashcards" | "quiz" | "tutor" | "generate";

const MODES: {
  id: Mode;
  label: string;
  blurb: string;
  icon: (p: { className?: string }) => React.ReactNode;
}[] = [
  {
    id: "flashcards",
    label: "Flashcards",
    blurb:
      "Front, back, flip. Rate how well you knew it and the card schedules itself.",
    icon: StudyIcon,
  },
  {
    id: "quiz",
    label: "Quiz yourself",
    blurb:
      "Multiple choice, true/false, and fill-in-the-blank, written from your own cards — no setup.",
    icon: ReviewIcon,
  },
  {
    id: "tutor",
    label: "Ask the tutor",
    blurb:
      "Stuck on a concept? The tutor has your deck as context, so answers stay on the material.",
    icon: SparkIcon,
  },
  {
    id: "generate",
    label: "Generate from notes",
    blurb:
      "Paste a chapter or upload a file and get a draft deck you can edit before saving.",
    icon: CheckIcon,
  },
];

/**
 * Tabbed product tour.
 *
 * One preview panel that swaps rather than four screenshots stacked down the
 * page: it keeps the section short, and it lets someone compare the modes by
 * clicking between them instead of scrolling back and forth.
 *
 * The tab list is a real ARIA tablist with arrow-key roving focus — this is the
 * one place on a marketing page where a keyboard user is likely to get stuck if
 * it's faked with divs.
 */
export function Showcase() {
  const [active, setActive] = useState<Mode>("flashcards");
  const baseId = useId();

  function onKeyDown(event: React.KeyboardEvent) {
    const index = MODES.findIndex((mode) => mode.id === active);
    let next = index;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MODES.length - 1;
    else return;

    event.preventDefault();
    const wrapped = (next + MODES.length) % MODES.length;
    setActive(MODES[wrapped].id);
    document.getElementById(`${baseId}-tab-${MODES[wrapped].id}`)?.focus();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-6">
      <div
        role="tablist"
        aria-label="Study modes"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {MODES.map((mode) => {
          const selected = mode.id === active;
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              id={`${baseId}-tab-${mode.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              // Roving tabindex: one stop for the whole group, arrows move
              // within it. Four separate tab stops would be four things to get
              // past on the way to the CTA.
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(mode.id)}
              className={cn(
                "shrink-0 rounded-card border p-3 text-left",
                "transition-[background-color,border-color] duration-[var(--dur-fast)]",
                selected
                  ? "border-primary-border bg-primary-subtle"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-primary" : "text-subtle",
                  )}
                />
                <span
                  className={cn(
                    "text-base font-medium whitespace-nowrap",
                    selected ? "text-primary" : "text-text",
                  )}
                >
                  {mode.label}
                </span>
              </span>

              {/* The blurb only shows on the selected tab, and only on desktop —
                  on mobile the list is a horizontal strip where it wouldn't fit. */}
              {selected ? (
                <span className="mt-1 hidden text-sm leading-relaxed text-muted lg:block">
                  {mode.blurb}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-live="polite"
        className="min-h-[22rem] rounded-card border border-border bg-surface p-5 sm:p-6"
      >
        <div key={active} className="[animation:achi-fade-up_var(--dur)_var(--ease-out)]">
          {active === "flashcards" ? <FlashcardDemo /> : null}
          {active === "quiz" ? <QuizDemo /> : null}
          {active === "tutor" ? <TutorDemo /> : null}
          {active === "generate" ? <GenerateDemo /> : null}
        </div>

        {/* Mobile gets the blurb under the panel, since the tab strip drops it. */}
        <p className="mt-4 text-sm leading-relaxed text-muted lg:hidden">
          {MODES.find((mode) => mode.id === active)?.blurb}
        </p>
      </div>
    </div>
  );
}

function PanelHead({ label, aside }: { label: string; aside?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <span className="label-data">{label}</span>
      {aside ? <span className="text-sm text-subtle">{aside}</span> : null}
    </div>
  );
}

function FlashcardDemo() {
  return (
    <div>
      <PanelHead label="Flashcards · Pharmacology" aside="Card 3 of 40" />

      <div className="rounded-card border border-border bg-sunken p-6 text-center">
        <p className="text-lg leading-relaxed text-text">
          Which receptor does propranolol block?
        </p>
        <div className="mt-4 border-t border-border pt-4">
          <span className="label-data text-primary">Answer</span>
          <p className="mt-1.5 text-lg leading-relaxed text-text">
            Both β₁ and β₂ — it&rsquo;s a non-selective beta blocker.
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-subtle">How well did you know it?</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[
          ["Again", "border-danger/45 text-danger"],
          ["Hard", "border-warning/45 text-warning"],
          ["Good", "border-success/45 text-success"],
          ["Easy", "border-info/45 text-info"],
        ].map(([label, tone]) => (
          <span
            key={label}
            className={cn(
              "rounded-control border bg-surface px-3 py-2 text-center text-base font-medium",
              tone,
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuizDemo() {
  const options = [
    ["A", "Propranolol", false],
    ["B", "Metoprolol", true],
    ["C", "Carvedilol", false],
    ["D", "Labetalol", false],
  ] as const;

  return (
    <div>
      <PanelHead label="Multiple choice · Pharmacology" aside="Question 3 of 10" />

      <p className="text-lg leading-relaxed text-text">
        Which of these is a selective β₁ blocker?
      </p>

      <ul className="mt-4 space-y-1.5">
        {options.map(([key, text, correct]) => (
          <li
            key={key}
            className={cn(
              "flex items-center gap-3 rounded-control border px-3 py-2.5 text-base",
              correct
                ? "border-success bg-success-subtle text-text"
                : "border-border text-subtle",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-control border font-mono text-2xs",
                correct
                  ? "border-success bg-success text-primary-fg"
                  : "border-border-strong text-subtle",
              )}
            >
              {correct ? <CheckIcon className="size-3.5" /> : key}
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TutorDemo() {
  return (
    <div>
      <PanelHead label="Tutor · scoped to this deck" />

      <div className="space-y-2.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-card bg-primary-subtle px-3.5 py-2.5">
          <p className="text-base leading-relaxed text-text">
            Why does propranolol cause bronchospasm but metoprolol usually
            doesn&rsquo;t?
          </p>
        </div>

        <div className="w-fit max-w-[92%] rounded-card border border-border bg-sunken px-3.5 py-2.5">
          <p className="text-base leading-relaxed text-text">
            Because propranolol blocks β₂ as well as β₁. β₂ receptors relax
            airway smooth muscle, so blocking them lets the airways constrict.
            Metoprolol is β₁-selective, so at normal doses it mostly leaves β₂
            alone — which is why it&rsquo;s the safer choice in asthma.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Give me a mnemonic", "What do people mix up here?"].map((chip) => (
          <span
            key={chip}
            className="rounded-pill border border-border bg-surface px-3 py-1 text-sm text-muted"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function GenerateDemo() {
  return (
    <div>
      <PanelHead label="Generate · from your notes" aside="15 cards drafted" />

      <div className="rounded-control border border-border bg-sunken p-3">
        <span className="label-data">Your notes</span>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          …Beta blockers are classified by receptor selectivity. Propranolol is
          non-selective (β₁ and β₂), while metoprolol and atenolol are
          cardioselective, acting mainly on β₁…
        </p>
      </div>

      <div
        aria-hidden="true"
        className="my-3 flex items-center gap-2 text-sm text-subtle"
      >
        <span className="h-px flex-1 bg-border" />
        becomes
        <span className="h-px flex-1 bg-border" />
      </div>

      <ul className="space-y-1.5">
        {[
          [
            "Which beta blockers are cardioselective?",
            "Metoprolol and atenolol — they act mainly on β₁.",
          ],
          [
            "Propranolol is selective for which receptors?",
            "Neither — it is non-selective, blocking both β₁ and β₂.",
          ],
        ].map(([front, back]) => (
          <li
            key={front}
            className="grid gap-2 rounded-control border border-border bg-surface p-3 sm:grid-cols-2"
          >
            <p className="text-base text-text">{front}</p>
            <p className="text-base text-muted">{back}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3">
        <Badge tone="primary">Answers kept in your source&rsquo;s wording</Badge>
      </p>
    </div>
  );
}
