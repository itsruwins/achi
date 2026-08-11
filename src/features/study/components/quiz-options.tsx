import { Button, buttonClass } from "@/components/ui/button";
import { Choice, Select } from "@/components/ui/field";
import { ChevronDownIcon, ReviewIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

import {
  DEFAULT_QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
} from "../types";

/**
 * The "Quiz" button on a deck, with its options attached.
 *
 * Sending someone straight into a quiz picks the question types for them, and
 * a deck page has no room for the full study hub form. A disclosure splits the
 * difference: one click to open, and the choices are right there.
 *
 * Built on `<details>` and a GET form, so it needs no JavaScript and the
 * resulting quiz stays a shareable URL — the same contract as /study.
 */
export function QuizOptions({ deckId }: { deckId: string }) {
  return (
    <details className="group open:w-full">
      <summary
        className={cn(
          buttonClass({ variant: "secondary" }),
          // Both rules are needed: `list-none` covers Chrome and Firefox,
          // the pseudo-element covers Safari.
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        Quiz
        <ChevronDownIcon className="size-3.5 text-subtle transition-transform duration-[var(--dur-fast)] group-open:rotate-180" />
      </summary>

      <form
        method="get"
        action="/study/quiz"
        className="mt-3 rounded-card border border-border bg-surface p-4"
      >
        <input type="hidden" name="deck" value={deckId} />

        <p className="px-1 text-sm text-subtle">
          How you want to be tested. Leave all unchecked for a mix.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUESTION_TYPES.map((type) => (
            <Choice
              key={type}
              type="checkbox"
              name="type"
              value={type}
              defaultChecked={DEFAULT_QUESTION_TYPES.includes(type)}
              label={QUESTION_TYPE_LABELS[type]}
              className="w-auto rounded-pill py-1.5 pl-2.5 pr-3.5"
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="quiz-count" className="text-base text-muted">
            How many questions
          </label>
          <Select id="quiz-count" name="count" defaultValue="" className="w-36">
            <option value="">All cards</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </Select>

          <Button type="submit" variant="primary" className="ml-auto">
            <ReviewIcon className="size-4" />
            Start quiz
          </Button>
        </div>
      </form>
    </details>
  );
}
