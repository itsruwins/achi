"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { saveGeneratedDeck } from "@/features/ai/actions";
import {
  CARD_COUNT_OPTIONS,
  DEFAULT_CARD_COUNT,
  MAX_SOURCE_CHARS,
} from "@/features/ai/limits";
import type { GeneratedDeck } from "@/features/ai/schema";
import { cn } from "@/lib/utils/cn";

import { FileDrop, type ExtractedFile } from "./file-drop";

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
  const [saving, startSaving] = useTransition();

  const outOfQuota = left <= 0;

  async function generate() {
    setError(null);
    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          source: source.trim(),
          cardCount,
          fidelity,
          filename: upload?.filename,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Generation failed.");
        // A 429 means the allowance is gone; reflect that immediately rather
        // than letting the user press the button again for another rejection.
        if (response.status === 429) setLeft(0);
        return;
      }

      setDeck(payload.deck);
      setDropped(new Set());
      setLeft(payload.remaining ?? left - 1);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setGenerating(false);
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
                : `Paste lecture notes, a summary, a chapter. Up to ${MAX_SOURCE_CHARS.toLocaleString()} characters.`
          }
        >
          <Textarea
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value.slice(0, MAX_SOURCE_CHARS))}
            rows={mode === "topic" ? 2 : 10}
            placeholder={
              mode === "topic"
                ? "What should the deck cover?"
                : "Paste what you're studying…"
            }
          />
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
            ? "Writing cards…"
            : outOfQuota
              ? "No generations left today"
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
