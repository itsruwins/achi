"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SparkIcon } from "@/components/ui/icons";
import {
  MAX_TUTOR_MESSAGE_CHARS,
  TUTOR_HISTORY_TURNS,
} from "@/features/ai/limits";
import { cn } from "@/lib/utils/cn";

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain the hardest idea in this deck simply",
  "What do people usually mix up here?",
  "Give me a mnemonic for these",
];

export function TutorPanel({
  deckId,
  remaining,
}: {
  deckId: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [left, setLeft] = useState(remaining);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the newest text in view as it streams in.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming || left <= 0) return;

    setError(null);
    setDraft("");
    setStreaming(true);

    // Only the recent turns are sent: the whole point of a bounded window is
    // that a long conversation doesn't grow the bill on every message.
    const history = turns.slice(-TUTOR_HISTORY_TURNS * 2);
    setTurns((current) => [
      ...current,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, message: question, history }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "The tutor is unavailable right now.");
        if (response.status === 429) setLeft(0);
        // Drop the empty assistant bubble we optimistically added.
        setTurns((current) => current.slice(0, -1));
        return;
      }

      const quotaHeader = response.headers.get("X-Quota-Remaining");
      if (quotaHeader) setLeft(Number(quotaHeader));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setTurns((current) => {
          const next = [...current];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch {
      setError("Connection dropped mid-answer.");
      setTurns((current) => current.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-6">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <SparkIcon className="size-4 text-primary" />
          Ask about this deck
        </Button>
      </div>
    );
  }

  const spent = remaining > 0 ? 1 - left / remaining : 1;

  return (
    <section className="mb-6 overflow-hidden rounded-card border border-border bg-surface shadow-card [animation:achi-fade-up_var(--dur)_var(--ease-out)]">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-sunken px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-md font-semibold tracking-tight text-text">
            <SparkIcon className="size-4 text-primary" />
            Tutor
          </h2>
          <p className="text-sm text-subtle">
            Scoped to this deck ·{" "}
            <span className="tnum">{left}</span>{" "}
            {left === 1 ? "message" : "messages"} left today
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </header>

      {/* Quota as a hairline under the header — present but not something you
          have to read on every message. */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-primary transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
          style={{ width: `${Math.max(0, Math.min(1, 1 - spent)) * 100}%` }}
        />
      </div>

      <div
        ref={logRef}
        className="max-h-96 space-y-2.5 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {turns.length === 0 ? (
          <div className="space-y-2.5">
            <p className="text-base text-muted">
              Ask about anything in this deck — the cards are the context, so
              answers stay on topic.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={left <= 0}
                  className={cn(
                    "rounded-pill border border-border bg-surface px-3 py-1 text-sm text-muted",
                    "transition-[border-color,color,background-color] duration-[var(--dur-fast)]",
                    "hover:border-primary-border hover:bg-primary-subtle hover:text-primary",
                    "disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <div
            key={index}
            className={cn(
              "w-fit rounded-card px-3.5 py-2.5 [animation:achi-fade-up_var(--dur)_var(--ease-out)]",
              turn.role === "user"
                ? "ml-auto max-w-[85%] bg-primary-subtle"
                : "max-w-[92%] border border-border bg-sunken",
            )}
          >
            <p className="whitespace-pre-wrap text-base leading-relaxed text-text">
              {turn.content}
              {/* A blinking caret is the only signal that a slow first token
                  isn't a hang. */}
              {streaming &&
              index === turns.length - 1 &&
              turn.role === "assistant" ? (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-text-bottom" />
              ) : null}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex gap-2 border-t border-border px-4 py-3"
      >
        <Input
          value={draft}
          onChange={(event) =>
            setDraft(event.target.value.slice(0, MAX_TUTOR_MESSAGE_CHARS))
          }
          disabled={streaming || left <= 0}
          placeholder={
            left <= 0 ? "No messages left today" : "Ask about this deck…"
          }
          aria-label="Message the tutor"
        />
        <Button
          type="submit"
          loading={streaming}
          disabled={left <= 0 || !draft.trim()}
        >
          Send
        </Button>
      </form>

      <p className="border-t border-border bg-sunken px-4 py-2.5 text-sm text-subtle">
        The tutor can be wrong — verify anything that matters against your
        source. Your messages and this deck&rsquo;s cards are sent to Groq; no
        chat history is stored by Achi.
      </p>
    </section>
  );
}
