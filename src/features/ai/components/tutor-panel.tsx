"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  MAX_TUTOR_MESSAGE_CHARS,
  TUTOR_HISTORY_TURNS,
} from "@/features/ai/limits";

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
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Ask about this deck
      </Button>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 className="text-sm font-medium text-text">Tutor</h2>
          <p className="text-xs text-subtle">
            Scoped to this deck · {left} {left === 1 ? "message" : "messages"}{" "}
            left today
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </header>

      <div ref={logRef} className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Ask about anything in this deck.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={left <= 0}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-55"
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
            className={
              turn.role === "user"
                ? "ml-auto max-w-[85%] rounded-card bg-primary-subtle px-3.5 py-2.5"
                : "max-w-[92%] rounded-card bg-bg px-3.5 py-2.5"
            }
          >
            <p className="whitespace-pre-wrap text-sm text-text">
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
        <p role="alert" className="px-5 pb-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex gap-2 border-t border-border px-5 py-3"
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
        <Button type="submit" disabled={streaming || left <= 0 || !draft.trim()}>
          {streaming ? "…" : "Send"}
        </Button>
      </form>

      <p className="px-5 pb-4 text-[11px] text-subtle">
        The tutor can be wrong — verify anything that matters against your
        source. Your messages and this deck&rsquo;s cards are sent to Groq; no
        chat history is stored by Achi.
      </p>
    </section>
  );
}
