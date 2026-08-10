"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { ProgressRail } from "@/components/ui/layout";
import { isAnswerCorrect } from "@/features/study/generate";
import { QUESTION_TYPE_LABELS, type Question } from "@/features/study/types";
import { cn } from "@/lib/utils/cn";

import { SessionEmpty } from "./flashcard-session";

type Result = {
  question: Question;
  given: string;
  correct: boolean;
};

const CHOICE_KEYS = ["A", "B", "C", "D", "E", "F"];

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
      <SessionEmpty backHref={backHref}>
        Not enough cards to build a quiz. A quiz needs at least a handful of
        cards to draw wrong answers from — add a few more and try again.
      </SessionEmpty>
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ProgressRail
        current={index + 1}
        total={questions.length}
        label={`Question ${index + 1} of ${questions.length}`}
      />

      <div
        key={index}
        className="rounded-card border border-border bg-surface p-5 shadow-card [animation:achi-fade-up_var(--dur)_var(--ease-out)] sm:p-6"
      >
        <span className="label-data">{QUESTION_TYPE_LABELS[question.type]}</span>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-text">
          {question.prompt}
        </p>

        {question.type === "true_false" ? (
          <p className="mt-4 rounded-control border border-border bg-sunken p-3 text-base text-text">
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

      <div className="flex items-center justify-between gap-2 text-sm text-subtle">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{question.deckTitle}</span>
          {question.category ? <Badge>{question.category}</Badge> : null}
        </span>
        <Link href={backHref} className="shrink-0 hover:text-text">
          Quit
        </Link>
      </div>
    </div>
  );
}

/**
 * After answering, every option is marked — right one green with a check,
 * your wrong pick outlined in danger. Both carry a glyph as well as a hue, so
 * the verdict survives a colorblind reader or a washed-out screen.
 */
function MultipleChoice({
  question,
  pending,
  onAnswer,
}: {
  question: Extract<Question, { type: "multiple_choice" }>;
  pending: Result | null;
  onAnswer: (index: number) => void;
}) {
  // A–D pick an option, matching the letter shown on each row.
  useEffect(() => {
    if (pending) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      const position = CHOICE_KEYS.indexOf(event.key.toUpperCase());
      if (position >= 0 && position < question.options.length) {
        event.preventDefault();
        onAnswer(position);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, question.options.length, onAnswer]);

  return (
    <ul className="space-y-1.5">
      {question.options.map((option, optionIndex) => {
        const isAnswer = optionIndex === question.answerIndex;
        const chosen = pending?.given === option;

        return (
          <li key={option}>
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => onAnswer(optionIndex)}
              className={cn(
                "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left text-base",
                "transition-[background-color,border-color] duration-[var(--dur-fast)]",
                "disabled:pointer-events-none",
                pending
                  ? isAnswer
                    ? "border-success bg-success-subtle text-text"
                    : chosen
                      ? "border-danger bg-danger-subtle text-text"
                      : "border-border text-subtle"
                  : "border-border-strong text-text hover:border-primary hover:bg-primary-subtle",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-control border font-mono text-2xs",
                  pending && isAnswer
                    ? "border-success bg-success text-primary-fg"
                    : pending && chosen
                      ? "border-danger text-danger"
                      : "border-border-strong text-subtle",
                )}
              >
                {pending && isAnswer ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  CHOICE_KEYS[optionIndex]
                )}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
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
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-control border px-4 py-2.5 text-base font-medium",
              "transition-[background-color,border-color] duration-[var(--dur-fast)]",
              "disabled:pointer-events-none",
              pending
                ? isAnswer
                  ? "border-success bg-success-subtle text-text"
                  : chosen
                    ? "border-danger bg-danger-subtle text-text"
                    : "border-border text-subtle"
                : "border-border-strong text-text hover:border-primary hover:bg-primary-subtle",
            )}
          >
            {pending && isAnswer ? (
              <CheckIcon className="size-4 text-success" />
            ) : null}
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
  const expected = expectedAnswer(result.question);

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-card border p-3 pl-4",
        "[animation:achi-fade-up_var(--dur)_var(--ease-out)]",
        result.correct
          ? "border-success/40 bg-success-subtle"
          : "border-danger/40 bg-danger-subtle",
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "flex items-center gap-1.5 text-base font-medium",
            result.correct ? "text-success" : "text-danger",
          )}
        >
          {result.correct ? <CheckIcon className="size-4" /> : null}
          {result.correct ? "Correct" : "Not quite"}
        </p>
        {!result.correct ? (
          <p className="mt-0.5 text-base text-muted">
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
  );
}

function expectedAnswer(question: Question): string {
  switch (question.type) {
    case "identification":
    case "cloze":
      return question.answer;
    case "multiple_choice":
      return question.options[question.answerIndex];
    case "true_false":
      return question.isTrue ? "True" : "False";
  }
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-col items-center gap-5 rounded-card border border-border bg-surface p-6 text-center shadow-card [animation:achi-pop_var(--dur-slow)_var(--ease-out)] sm:flex-row sm:text-left">
        <ScoreRing score={score} />

        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tracking-tight text-text">
            {score === 100
              ? "Clean sweep"
              : score >= 80
                ? "Solid round"
                : score >= 50
                  ? "Getting there"
                  : "Worth another pass"}
          </p>
          <p className="mt-1 text-base text-muted">
            <span className="tnum">{correct}</span> of{" "}
            <span className="tnum">{results.length}</span> correct
            {missed.length > 0
              ? ` · ${missed.length} to revisit below`
              : " · nothing to revisit"}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button onClick={onRetake}>New quiz</Button>
            <Link href={backHref}>
              <Button variant="secondary">Done</Button>
            </Link>
          </div>
        </div>
      </div>

      {missed.length > 0 ? (
        <section>
          <h2 className="mb-2 text-md font-semibold tracking-tight text-text">
            Worth another look
          </h2>
          <ul className="space-y-2">
            {missed.map((result, position) => (
              <li
                key={`${result.question.cardId}-${position}`}
                className="rounded-card border border-border bg-surface p-4"
              >
                <p className="whitespace-pre-wrap text-base text-text">
                  {result.question.prompt}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
                  <span className="text-subtle">You said</span>
                  <span className="text-danger line-through decoration-danger/40">
                    {result.given || "nothing"}
                  </span>
                  <span aria-hidden="true" className="text-border-strong">
                    ·
                  </span>
                  <span className="text-subtle">Answer</span>
                  <span className="font-medium text-text">
                    {expectedAnswer(result.question)}
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

/**
 * Score as an arc rather than a bare percentage.
 *
 * The number alone gives no sense of scale; the ring shows how much of the
 * quiz it represents at a glance. The figure stays the primary read — the arc
 * is the context around it, which is why it's a thin stroke and not a donut.
 */
function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90 size-24">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={
            score >= 80
              ? "var(--success)"
              : score >= 50
                ? "var(--warning)"
                : "var(--danger)"
          }
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-[600ms] ease-[var(--ease-out)]"
        />
      </svg>
      <span className="tnum font-display relative text-2xl text-text">
        {score}
        <span className="text-lg text-subtle">%</span>
      </span>
    </div>
  );
}
