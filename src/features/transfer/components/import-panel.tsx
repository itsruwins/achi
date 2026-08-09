"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { saveImportedDeck } from "@/features/transfer/actions";
import type { TransferCard } from "@/features/transfer/format";
import { cn } from "@/lib/utils/cn";

type Parsed = {
  title: string;
  description: string | null;
  cards: TransferCard[];
  notes: string[];
  filename: string;
};

const ACCEPT = ".json,.csv,.apkg";

export function ImportPanel() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [title, setTitle] = useState("");
  const [dropped, setDropped] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/import", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Couldn't read that file.");
        return;
      }

      setParsed(payload);
      setTitle(payload.title);
      setDropped(new Set());
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!parsed) return;
    setError(null);

    const kept = parsed.cards.filter((_, index) => !dropped.has(index));
    if (kept.length === 0) {
      setError("Keep at least one card.");
      return;
    }
    if (!title.trim()) {
      setError("Give the deck a name.");
      return;
    }

    startSaving(async () => {
      const result = await saveImportedDeck({
        title: title.trim(),
        description: parsed.description,
        cards: kept,
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  if (parsed) {
    const keptCount = parsed.cards.length - dropped.size;

    return (
      <div className="space-y-5">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-subtle">
            Read from {parsed.filename}
          </p>
          <p className="mt-1 text-sm text-muted">
            {keptCount} of {parsed.cards.length} cards selected.
          </p>
        </div>

        {parsed.notes.length > 0 ? (
          <ul className="space-y-1 rounded-control border border-warning bg-warning-subtle px-3 py-2">
            {parsed.notes.map((note) => (
              <li key={note} className="text-xs text-text">
                {note}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <Field label="Deck name" htmlFor="import-title">
          <Input
            id="import-title"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 120))}
            required
          />
        </Field>

        <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
          {parsed.cards.map((card, index) => {
            const kept = !dropped.has(index);
            return (
              <li key={index}>
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors",
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
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <p className="whitespace-pre-wrap break-words text-sm text-text">
                      {card.front}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-muted">
                      {card.back}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving || keptCount === 0}>
            {saving ? "Saving…" : `Import ${keptCount} cards`}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setParsed(null)}
            disabled={saving}
          >
            Choose another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "rounded-card border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-subtle"
            : "border-border-strong bg-surface",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />

        <p className="text-sm text-text">
          {busy ? "Reading your deck…" : "Drop a deck file here"}
        </p>
        <p className="mt-1 text-xs text-muted">
          An Achi export (.json), a spreadsheet (.csv), or an Anki deck (.apkg)
        </p>

        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Reading…" : "Choose file"}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-text">Building a CSV yourself?</h2>
        <p className="mt-1 text-xs text-muted">
          Use the columns <code className="font-mono">front, back, category, hint</code>.
          A header row is optional — without one, columns are read in that order.
        </p>
        <a href="/api/import/template" download className="mt-3 inline-block">
          <Button variant="secondary" size="sm">
            Download template
          </Button>
        </a>
      </div>
    </div>
  );
}
