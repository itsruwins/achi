import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Choice, Select } from "@/components/ui/field";
import { ReviewIcon, StudyIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/layout";
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
      <div>
        <PageHeader title="Study" />
        <EmptyState
          icon={<StudyIcon className="size-5" />}
          title="Nothing to study yet"
          body="A deck shows up here as soon as it has at least one card. Add some to a deck and come back."
          action={
            <Link href="/decks">
              <Button>Go to your decks</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Study"
        description="Pick what you want covered, then choose how you want to be tested. Leave everything unchecked to include all of it."
      />

      {/*
        A plain GET form: the selection ends up in the URL, so a session is
        shareable and bookmarkable, and the whole thing works before any
        JavaScript loads. The two submit buttons differ only in formAction.
      */}
      <form method="get" className="space-y-4">
        <Fieldset
          legend="Decks"
          hint={`${withCards.length} with cards`}
        >
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {withCards.map((deck) => (
              <li key={deck.id}>
                <Choice
                  type="checkbox"
                  name="deck"
                  value={deck.id}
                  label={
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        {deck.emoji ? `${deck.emoji} ` : ""}
                        {deck.title}
                      </span>
                      <span className="tnum shrink-0 text-sm text-subtle">
                        {deck.card_count}
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </Fieldset>

        {categories.length > 0 ? (
          <Fieldset legend="Topics" hint="Narrows to matching cards">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <Choice
                  key={category}
                  type="checkbox"
                  name="category"
                  value={category}
                  label={category}
                  className="w-auto rounded-pill py-1.5 pl-2.5 pr-3.5"
                />
              ))}
            </div>
          </Fieldset>
        ) : null}

        <Fieldset
          legend="Quiz options"
          hint="Ignored by flashcards, which show every card"
        >
          <div className="flex flex-wrap gap-1.5">
            {QUESTION_TYPES.map((type) => (
              <Choice
                key={type}
                type="checkbox"
                name="type"
                value={type}
                defaultChecked={type === "multiple_choice"}
                label={QUESTION_TYPE_LABELS[type]}
                className="w-auto rounded-pill py-1.5 pl-2.5 pr-3.5"
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="count" className="text-base text-muted">
              How many questions
            </label>
            <Select id="count" name="count" defaultValue="" className="w-36">
              <option value="">All cards</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </Select>
          </div>
        </Fieldset>

        {/* Sticky so the start buttons stay reachable while you scroll a long
            list of decks — the thing you came here to do shouldn't scroll away. */}
        <div className="sticky bottom-20 z-[var(--z-sticky)] flex flex-wrap gap-2 rounded-card border border-border bg-surface/90 p-2 shadow-raised backdrop-blur-md md:bottom-4">
          <Button type="submit" formAction="/study/flashcards" size="lg">
            <StudyIcon className="size-4" />
            Start flashcards
          </Button>
          <Button
            type="submit"
            formAction="/study/quiz"
            variant="secondary"
            size="lg"
          >
            <ReviewIcon className="size-4" />
            Start quiz
          </Button>
        </div>
      </form>
    </div>
  );
}

function Fieldset({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-card border border-border bg-surface p-4">
      <legend className="flex items-baseline gap-2 px-1">
        <span className="text-md font-semibold tracking-tight text-text">
          {legend}
        </span>
        {hint ? <span className="text-sm text-subtle">{hint}</span> : null}
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}
