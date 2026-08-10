"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ImportIcon } from "@/components/ui/icons";
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
        <div className="rounded-card border border-border bg-surface p-4">
          <span className="label-data">Read from {parsed.filename}</span>
          <p className="mt-1 text-base text-muted">
            <span className="tnum">{keptCount}</span> of{" "}
            <span className="tnum">{parsed.cards.length}</span> cards selected.
            Uncheck anything you don&rsquo;t want before importing.
          </p>
        </div>

        {parsed.notes.length > 0 ? (
          <ul className="space-y-1 rounded-control border border-warning/40 bg-warning-subtle px-3 py-2">
            {parsed.notes.map((note) => (
              <li key={note} className="text-sm text-text">
                {note}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
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
                    "flex cursor-pointer gap-3 rounded-card border p-3.5",
                    "transition-[background-color,border-color,opacity] duration-[var(--dur-fast)]",
                    kept
                      ? "border-border bg-surface hover:border-border-strong"
                      : "border-border bg-sunken opacity-55",
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
                    <p className="whitespace-pre-wrap break-words text-base text-text">
                      {card.front}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-base text-muted">
                      {card.back}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-card border border-border bg-surface/90 p-2 shadow-raised backdrop-blur-md md:bottom-4">
          <Button onClick={save} loading={saving} disabled={keptCount === 0}>
            Import {keptCount} {keptCount === 1 ? "card" : "cards"}
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
          "rounded-card border border-dashed p-8 text-center",
          "transition-[background-color,border-color] duration-[var(--dur-fast)]",
          dragging
            ? "border-primary bg-primary-subtle"
            : "border-border-strong bg-surface/60",
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

        <span
          aria-hidden="true"
          className={cn(
            "mx-auto mb-3 grid size-10 place-items-center rounded-pill transition-colors duration-[var(--dur-fast)]",
            dragging ? "bg-primary text-primary-fg" : "bg-sunken text-muted",
          )}
        >
          <ImportIcon className="size-5" />
        </span>

        <p className="text-md font-medium text-text">
          {busy
            ? "Reading your deck…"
            : dragging
              ? "Drop to read it"
              : "Drop a deck file here"}
        </p>
        <p className="mt-1 text-sm text-muted">
          An Achi export (.json), a spreadsheet (.csv), or an Anki deck (.apkg)
        </p>

        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-md font-semibold tracking-tight text-text">
          Building a CSV yourself?
        </h2>
        <p className="mt-1 max-w-[62ch] text-base text-muted">
          Use the columns{" "}
          <code className="rounded bg-sunken px-1 py-0.5 font-mono text-sm">
            front, back, category, hint
          </code>
          . A header row is optional — without one, columns are read in that
          order.
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
