"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { saveGeneratedDeck } from "@/features/ai/actions";
import {
  CARD_COUNT_OPTIONS,
  DEFAULT_CARD_COUNT,
  maxSourceChars,
} from "@/features/ai/limits";
import { allocateCards, mergeCards, splitSource } from "@/features/ai/chunk";
import type { GeneratedCard, GeneratedDeck } from "@/features/ai/schema";
import { cn } from "@/lib/utils/cn";

import { FileDrop, type ExtractedFile } from "./file-drop";

/** Long enough for the per-minute token bucket to refill between passes. */
const RATE_LIMIT_PAUSE_MS = 62_000;

type Mode = "topic" | "notes" | "document";
type Fidelity = "verbatim" | "adapted";

const MODE_LABELS: Record<Mode, string> = {
  document: "Upload a file",
  notes: "Paste notes",
  topic: "Just a topic",
};

export function GeneratePanel({ remaining }: { remaining: number }) {
  const [mode, setMode] = useState<Mode>("document");
  const [source, setSource] = useState("");
  const [cardCount, setCardCount] = useState<number>(DEFAULT_CARD_COUNT);
  const [fidelity, setFidelity] = useState<Fidelity>("verbatim");
  const [upload, setUpload] = useState<ExtractedFile | null>(null);

  const [deck, setDeck] = useState<GeneratedDeck | null>(null);
  const [dropped, setDropped] = useState<Set<number>>(new Set());
  const [left, setLeft] = useState(remaining);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    waiting: boolean;
  } | null>(null);
  const [saving, startSaving] = useTransition();

  const outOfQuota = left <= 0;
  // The budget is shared between the text sent and the cards asked for, so the
  // ceiling moves when the card count does.
  const sourceLimit = maxSourceChars(cardCount);

  // A document past the per-request ceiling is generated in passes. Each pass
  // is its own short request — the alternative, one long server request, would
  // sit past most platform timeouts.
  const parts = splitSource(source.trim(), sourceLimit);
  const needsChunking = parts.length > 1;

  async function generate() {
    setError(null);
    setGenerating(true);
    setProgress(null);

    const chunks = splitSource(source.trim(), sourceLimit);
    const allocation = allocateCards(chunks, cardCount);
    const collected: GeneratedCard[][] = [];
    let title = "";
    let description = "";
    let remaining = left;

    try {
      for (let index = 0; index < chunks.length; index++) {
        if (chunks.length > 1) {
          setProgress({ done: index, total: chunks.length, waiting: false });
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            source: chunks[index],
            cardCount: allocation[index],
            fidelity,
            filename: upload?.filename,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          // Partial results are kept: several minutes of work should not be
          // thrown away because the last pass hit a limit.
          if (collected.length > 0) {
            setError(
              `${payload.error ?? "Generation failed."} Keeping the ${collected.flat().length} cards made so far.`,
            );
            break;
          }
          setError(payload.error ?? "Generation failed.");
          if (response.status === 429) setLeft(0);
          return;
        }

        collected.push(payload.deck.cards);
        title ||= payload.deck.title;
        description ||= payload.deck.description;
        remaining = payload.remaining ?? remaining - 1;
        setLeft(remaining);

        // The token bucket refills over about a minute, and the next pass would
        // otherwise be rejected outright. Skipped after the final pass.
        if (index < chunks.length - 1) {
          setProgress({ done: index + 1, total: chunks.length, waiting: true });
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE_MS));
        }
      }

      if (collected.length === 0) return;

      setDeck({
        title: title || "Generated deck",
        description,
        cards: mergeCards(collected),
      });
      setDropped(new Set());
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }

  function save() {
    if (!deck) return;
    setError(null);

    const kept = deck.cards.filter((_, index) => !dropped.has(index));
    if (kept.length === 0) {
      setError("Keep at least one card.");
      return;
    }

    startSaving(async () => {
      // Redirects on success, so anything returned is a failure.
      const result = await saveGeneratedDeck({ ...deck, cards: kept });
      if (result && !result.ok) setError(result.error);
    });
  }

  if (deck) {
    const keptCount = deck.cards.length - dropped.size;

    return (
      <div className="space-y-5">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-subtle">Preview</p>
          <h2 className="mt-1 text-lg font-medium text-text">{deck.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{deck.description}</p>
          <p className="mt-3 text-xs text-subtle">
            {keptCount} of {deck.cards.length} cards selected. Uncheck anything
            you don&rsquo;t want — you can edit the rest after saving.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <ul className="space-y-2">
          {deck.cards.map((card, index) => {
            const kept = !dropped.has(index);
            return (
              <li key={index}>
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-card border p-4 transition-colors",
                    kept
                      ? "border-border bg-surface"
                      : "border-border bg-bg opacity-55",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={kept}
                    onChange={() =>
                      setDropped((current) => {
                        const next = new Set(current);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p className="text-sm text-text">{card.front}</p>
                      <p className="text-sm text-muted">{card.back}</p>
                    </div>
                    {card.category ? (
                      <span className="mt-2 inline-block rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
                        {card.category}
                      </span>
                    ) : null}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving || keptCount === 0}>
            {saving ? "Saving…" : `Save ${keptCount} cards`}
          </Button>
          <Button variant="ghost" onClick={() => setDeck(null)} disabled={saving}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-control border border-border p-1">
          {(["document", "notes", "topic"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
                // A topic has no source document to quote, so verbatim is
                // meaningless there — fall back rather than silently sending a
                // setting that can't apply.
                if (value === "topic") setFidelity("adapted");
                else setFidelity("verbatim");
              }}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-sm transition-colors",
                mode === value
                  ? "bg-primary-subtle font-medium text-primary"
                  : "text-muted hover:text-text",
              )}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>

        <p className="text-xs text-subtle">
          {left} {left === 1 ? "generation" : "generations"} left today
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {mode === "document" && !upload ? (
        <FileDrop
          disabled={outOfQuota}
          onExtracted={(file) => {
            setUpload(file);
            setSource(file.text);
          }}
        />
      ) : null}

      {mode === "document" && upload ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-text">{upload.filename}</p>
            <button
              type="button"
              onClick={() => {
                setUpload(null);
                setSource("");
              }}
              className="text-xs text-muted underline hover:text-text"
            >
              Use a different file
            </button>
          </div>
          <p className="mt-0.5 text-xs text-subtle">
            {upload.pages ? `${upload.pages} pages · ` : ""}
            {source.length.toLocaleString()} characters
            {upload.truncated ? " · trimmed to fit" : ""}
          </p>
          {upload.truncated ? (
            <p className="mt-2 rounded-control border border-warning bg-warning-subtle px-3 py-2 text-xs text-text">
              This file was longer than the limit, so only the first part is
              being used. For the rest, upload the later sections separately.
            </p>
          ) : null}
        </div>
      ) : null}

      {mode !== "document" || upload ? (
        <Field
          label={
            mode === "topic"
              ? "Topic"
              : mode === "document"
                ? "Text from your file"
                : "Your notes"
          }
          htmlFor="source"
          hint={
            mode === "topic"
              ? "e.g. 'The Krebs cycle' or 'Philippine constitutional law — bill of rights'"
              : mode === "document"
                ? "Check what was read out of the file, and delete anything you don't want cards from — headers, page numbers, references."
                : "Paste lecture notes, a summary, a chapter." 
          }
        >
          <Textarea
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={mode === "topic" ? 2 : 10}
            placeholder={
              mode === "topic"
                ? "What should the deck cover?"
                : "Paste what you're studying…"
            }
          />
          <p className="text-xs text-subtle">
            {source.length.toLocaleString()} characters
            {needsChunking
              ? ` — over the ${sourceLimit.toLocaleString()} per-pass limit, so this runs in ${parts.length} passes.`
              : ` of ${sourceLimit.toLocaleString()} in one pass`}
          </p>
        </Field>
      ) : null}

      {mode !== "topic" ? (
        <fieldset className="rounded-card border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-medium text-text">Wording</legend>
          <div className="mt-2 space-y-1.5">
            {(
              [
                {
                  value: "verbatim" as const,
                  label: "Use the source's exact words",
                  note: "Answers are copied from your material, not reworded. Best when you'll be marked on its definitions.",
                },
                {
                  value: "adapted" as const,
                  label: "Let it rephrase for clarity",
                  note: "Keeps the technical terms but may simplify the phrasing.",
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-control border px-3 py-2 transition-colors",
                  fidelity === option.value
                    ? "border-primary bg-primary-subtle"
                    : "border-border hover:border-border-strong",
                )}
              >
                <input
                  type="radio"
                  name="fidelity"
                  value={option.value}
                  checked={fidelity === option.value}
                  onChange={() => setFidelity(option.value)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-text">{option.label}</span>
                  <span className="block text-xs text-muted">{option.note}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-subtle">
            Questions are always written fresh — your material states facts, it
            doesn&rsquo;t ask them. Exact wording applies to the answers.
          </p>
        </fieldset>
      ) : null}

      {needsChunking && !generating ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text">
            This is longer than one request allows
          </p>
          <p className="mt-1 text-sm text-muted">
            It&rsquo;ll be split into <strong>{parts.length} passes</strong> of
            up to {sourceLimit.toLocaleString()} characters, then merged into
            one deck with duplicate questions removed.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-subtle">
            <li>
              Takes about {Math.ceil(((parts.length - 1) * 62 + parts.length * 4) / 60)}{" "}
              minutes — the free API key needs a minute between passes.
            </li>
            <li>
              Uses {parts.length} of your {left} remaining generations.
            </li>
            <li>Keep this tab open until it finishes.</li>
          </ul>
        </div>
      ) : null}

      {progress ? (
        <div
          role="status"
          className="rounded-card border border-border bg-surface p-4"
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-text">
              {progress.waiting
                ? "Waiting for the rate limit to clear…"
                : `Writing pass ${progress.done + 1} of ${progress.total}`}
            </span>
            <span className="tabular-nums text-subtle">
              {progress.done}/{progress.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="cardCount" className="block text-sm font-medium text-text">
            How many cards
          </label>
          <select
            id="cardCount"
            value={cardCount}
            onChange={(event) => setCardCount(Number(event.target.value))}
            className="mt-1.5 h-11 rounded-control border border-border-strong bg-surface px-3 text-sm text-text"
          >
            {CARD_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                Up to {count}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={generate}
          disabled={generating || outOfQuota || source.trim().length < 3}
        >
          {generating
            ? progress
              ? progress.waiting
                ? `Pass ${progress.done} of ${progress.total} — waiting…`
                : `Writing pass ${progress.done + 1} of ${progress.total}…`
              : "Writing cards…"
            : outOfQuota
              ? "No generations left today"
              : needsChunking
                ? `Generate in ${parts.length} passes`
                : "Generate deck"}
        </Button>
      </div>

      <p className="text-xs text-subtle">
        Cards are drafted by AI and can be wrong. Check anything you&rsquo;d be
        marked down for. Your text is sent to Groq to generate the cards and
        isn&rsquo;t stored by Achi.
      </p>
    </div>
  );
}
