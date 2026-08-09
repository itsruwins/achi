import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/features/auth/queries";
import { listDecks } from "@/features/decks/queries";
import { listAllCategories } from "@/features/study/queries";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/features/study/types";

export const metadata: Metadata = { title: "Study" };

const QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "identification",
  "cloze",
];

export default async function StudyHubPage() {
  const { user } = await requireOnboardedUser();

  const [decks, categories] = await Promise.all([
    listDecks(user.id),
    listAllCategories(user.id),
  ]);

  const withCards = decks.filter((deck) => deck.card_count > 0);

  if (withCards.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border-strong bg-surface p-12 text-center">
        <p className="text-sm font-medium text-text">Nothing to study yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Add cards to a deck and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Study</h1>
        <p className="mt-1 text-sm text-muted">
          Pick decks and topics, then choose how you want to be tested. Leave
          everything unchecked to study all of it.
        </p>
      </div>

      {/*
        A plain GET form: the selection ends up in the URL, so a session is
        shareable and bookmarkable, and the whole thing works before any
        JavaScript loads. The two submit buttons differ only in formAction.
      */}
      <form method="get" className="space-y-6">
        <fieldset className="rounded-card border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-medium text-text">Decks</legend>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {withCards.map((deck) => (
              <li key={deck.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-control border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong">
                  <input
                    type="checkbox"
                    name="deck"
                    value={deck.id}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-text">
                    {deck.emoji ? `${deck.emoji} ` : ""}
                    {deck.title}
                  </span>
                  <span className="shrink-0 text-xs text-subtle">
                    {deck.card_count}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {categories.length > 0 ? (
          <fieldset className="rounded-card border border-border bg-surface p-5">
            <legend className="px-1 text-sm font-medium text-text">Topics</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-border-strong"
                >
                  <input
                    type="checkbox"
                    name="category"
                    value={category}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  <span className="text-text">{category}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="rounded-card border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-medium text-text">
            Quiz options
          </legend>
          <p className="mt-1 text-xs text-subtle">
            Only applies to quizzes. Flashcards just show every card.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUESTION_TYPES.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-border-strong"
              >
                <input
                  type="checkbox"
                  name="type"
                  value={type}
                  defaultChecked={type === "multiple_choice"}
                  className="size-3.5 accent-[var(--primary)]"
                />
                <span className="text-text">{QUESTION_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="count" className="text-sm text-muted">
              How many questions
            </label>
            <select
              id="count"
              name="count"
              defaultValue=""
              className="h-9 rounded-control border border-border-strong bg-surface px-2 text-sm text-text"
            >
              <option value="">All cards</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" formAction="/study/flashcards">
            Start flashcards
          </Button>
          <Button type="submit" formAction="/study/quiz" variant="secondary">
            Start quiz
          </Button>
        </div>
      </form>
    </div>
  );
}
