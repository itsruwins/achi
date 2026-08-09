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

type Mode = "topic" | "notes";

export function GeneratePanel({ remaining }: { remaining: number }) {
  const [mode, setMode] = useState<Mode>("notes");
  const [source, setSource] = useState("");
  const [cardCount, setCardCount] = useState<number>(DEFAULT_CARD_COUNT);

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
        body: JSON.stringify({ mode, source: source.trim(), cardCount }),
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
          {(["notes", "topic"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-sm transition-colors",
                mode === value
                  ? "bg-primary-subtle font-medium text-primary"
                  : "text-muted hover:text-text",
              )}
            >
              {value === "notes" ? "Paste notes" : "Just a topic"}
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

      <Field
        label={mode === "notes" ? "Your notes" : "Topic"}
        htmlFor="source"
        hint={
          mode === "notes"
            ? `Paste lecture notes, a summary, a chapter. Up to ${MAX_SOURCE_CHARS.toLocaleString()} characters.`
            : "e.g. 'The Krebs cycle' or 'Philippine constitutional law — bill of rights'"
        }
      >
        <Textarea
          id="source"
          value={source}
          onChange={(event) => setSource(event.target.value.slice(0, MAX_SOURCE_CHARS))}
          rows={mode === "notes" ? 10 : 2}
          placeholder={
            mode === "notes"
              ? "Paste what you're studying…"
              : "What should the deck cover?"
          }
        />
      </Field>

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
