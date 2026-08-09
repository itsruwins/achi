"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { isAnswerCorrect } from "@/features/study/generate";
import { QUESTION_TYPE_LABELS, type Question } from "@/features/study/types";

import { EmptyState, ProgressBar } from "./flashcard-session";

type Result = {
  question: Question;
  given: string;
  correct: boolean;
};

export function QuizSession({
  questions,
  backHref,
}: {
  questions: Question[];
  backHref: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [pending, setPending] = useState<Result | null>(null);
  const [typed, setTyped] = useState("");

  const question = questions[index];

  if (questions.length === 0) {
    return (
      <EmptyState backHref={backHref}>
        Not enough cards to build a quiz. Add a few more and try again.
      </EmptyState>
    );
  }

  if (index >= questions.length) {
    return (
      <QuizSummary
        results={results}
        backHref={backHref}
        onRetake={() => router.refresh()}
      />
    );
  }

  function submit(given: string, correct: boolean) {
    setPending({ question: questions[index], given, correct });
  }

  function next() {
    if (!pending) return;
    setResults((current) => [...current, pending]);
    setPending(null);
    setTyped("");
    setIndex((current) => current + 1);
  }

  /**
   * Let people override the verdict on typed answers.
   *
   * String comparison can't tell "mitochondrion" from "the mitochondria" or
   * recognise a synonym. Rather than pretend it can, the grader defers to the
   * person — who knows whether they actually knew it.
   */
  function overrideVerdict() {
    setPending((current) =>
      current ? { ...current, correct: !current.correct } : current,
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <ProgressBar current={index + 1} total={questions.length} />

      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-xs uppercase tracking-wide text-subtle">
          {QUESTION_TYPE_LABELS[question.type]}
        </p>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-text">
          {question.prompt}
        </p>

        {question.type === "true_false" ? (
          <p className="mt-4 rounded-control border border-border bg-bg p-3 text-base text-text">
            {question.proposed}
          </p>
        ) : null}

        <div className="mt-5">
          {question.type === "multiple_choice" ? (
            <MultipleChoice
              question={question}
              pending={pending}
              onAnswer={(choice) =>
                submit(question.options[choice], choice === question.answerIndex)
              }
            />
          ) : question.type === "true_false" ? (
            <TrueFalse
              question={question}
              pending={pending}
              onAnswer={(said) =>
                submit(said ? "True" : "False", said === question.isTrue)
              }
            />
          ) : (
            <TypedAnswer
              value={typed}
              onChange={setTyped}
              disabled={Boolean(pending)}
              onSubmit={() =>
                submit(typed, isAnswerCorrect(typed, question.answer))
              }
            />
          )}
        </div>
      </div>

      {pending ? (
        <Feedback
          result={pending}
          onNext={next}
          onOverride={
            pending.question.type === "identification" ||
            pending.question.type === "cloze"
              ? overrideVerdict
              : undefined
          }
          isLast={index === questions.length - 1}
        />
      ) : null}

      <div className="flex items-center justify-between text-xs text-subtle">
        <span>
          {question.deckTitle}
          {question.category ? ` · ${question.category}` : ""}
        </span>
        <Link href={backHref} className="hover:text-text">
          Quit
        </Link>
      </div>
    </div>
  );
}

function MultipleChoice({
  question,
  pending,
  onAnswer,
}: {
  question: Extract<Question, { type: "multiple_choice" }>;
  pending: Result | null;
  onAnswer: (index: number) => void;
}) {
  return (
    <ul className="space-y-2">
      {question.options.map((option, optionIndex) => {
        const isAnswer = optionIndex === question.answerIndex;
        const chosen = pending?.given === option;

        return (
          <li key={option}>
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => onAnswer(optionIndex)}
              className={`w-full rounded-control border px-4 py-3 text-left text-sm transition-colors ${
                pending
                  ? isAnswer
                    ? "border-success bg-success-subtle text-text"
                    : chosen
                      ? "border-danger bg-danger-subtle text-text"
                      : "border-border text-muted"
                  : "border-border-strong text-text hover:border-primary hover:bg-primary-subtle"
              }`}
            >
              {option}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TrueFalse({
  question,
  pending,
  onAnswer,
}: {
  question: Extract<Question, { type: "true_false" }>;
  pending: Result | null;
  onAnswer: (said: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map((value) => {
        const label = value ? "True" : "False";
        const isAnswer = value === question.isTrue;
        const chosen = pending?.given === label;

        return (
          <button
            key={label}
            type="button"
            disabled={Boolean(pending)}
            onClick={() => onAnswer(value)}
            className={`flex-1 rounded-control border px-4 py-3 text-sm font-medium transition-colors ${
              pending
                ? isAnswer
                  ? "border-success bg-success-subtle text-text"
                  : chosen
                    ? "border-danger bg-danger-subtle text-text"
                    : "border-border text-muted"
                : "border-border-strong text-text hover:border-primary hover:bg-primary-subtle"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TypedAnswer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      className="flex gap-2"
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        placeholder="Your answer"
        aria-label="Your answer"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Check
      </Button>
    </form>
  );
}

function Feedback({
  result,
  onNext,
  onOverride,
  isLast,
}: {
  result: Result;
  onNext: () => void;
  onOverride?: () => void;
  isLast: boolean;
}) {
  const expected =
    result.question.type === "identification" || result.question.type === "cloze"
      ? result.question.answer
      : result.question.type === "multiple_choice"
        ? result.question.options[result.question.answerIndex]
        : result.question.isTrue
          ? "True"
          : "False";

  return (
    <div
      role="status"
      className={`rounded-card border p-4 ${
        result.correct
          ? "border-success bg-success-subtle"
          : "border-danger bg-danger-subtle"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">
            {result.correct ? "Correct" : "Not quite"}
          </p>
          {!result.correct ? (
            <p className="mt-0.5 text-sm text-muted">
              Answer: <span className="text-text">{expected}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {onOverride ? (
            <Button variant="ghost" size="sm" onClick={onOverride}>
              {result.correct ? "Mark wrong" : "I was right"}
            </Button>
          ) : null}
          <Button size="sm" onClick={onNext} autoFocus>
            {isLast ? "See results" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizSummary({
  results,
  backHref,
  onRetake,
}: {
  results: Result[];
  backHref: string;
  onRetake: () => void;
}) {
  const correct = results.filter((result) => result.correct).length;
  const missed = results.filter((result) => !result.correct);
  const score = Math.round((correct / results.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-sm text-muted">You scored</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight text-text">
          {score}%
        </p>
        <p className="mt-2 text-sm text-muted">
          {correct} of {results.length} correct
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onRetake}>New quiz</Button>
          <Link href={backHref}>
            <Button variant="secondary">Done</Button>
          </Link>
        </div>
      </div>

      {missed.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-text">
            Worth another look
          </h2>
          <ul className="space-y-2">
            {missed.map((result, position) => (
              <li
                key={`${result.question.cardId}-${position}`}
                className="rounded-card border border-border bg-surface p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-text">
                  {result.question.prompt}
                </p>
                <p className="mt-2 text-sm text-muted">
                  You said{" "}
                  <span className="text-danger">{result.given || "nothing"}</span>
                  {" · "}Answer:{" "}
                  <span className="text-text">
                    {result.question.type === "identification" ||
                    result.question.type === "cloze"
                      ? result.question.answer
                      : result.question.type === "multiple_choice"
                        ? result.question.options[result.question.answerIndex]
                        : result.question.isTrue
                          ? "True"
                          : "False"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
