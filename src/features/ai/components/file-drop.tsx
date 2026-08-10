"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ImportIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

export type ExtractedFile = {
  filename: string;
  text: string;
  pages: number | null;
  truncated: boolean;
};

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md";

export function FileDrop({
  onExtracted,
  disabled,
}: {
  onExtracted: (file: ExtractedFile) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/extract", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Couldn't read that file.");
        return;
      }

      onExtracted({
        filename: payload.filename,
        text: payload.text,
        pages: payload.pages,
        truncated: payload.truncated,
      });
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
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
            // Reset so re-picking the same file fires onChange again.
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
            ? "Reading your file…"
            : dragging
              ? "Drop to read it"
              : "Drop a file here"}
        </p>
        <p className="mt-1 text-sm text-muted">
          PDF, Word, PowerPoint, or plain text — up to 20 MB
        </p>

        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          loading={busy}
          disabled={disabled}
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

      <p className="text-sm text-subtle">
        Scanned pages and photos of slides have no text layer, so nothing can be
        read from them without OCR.
      </p>
    </div>
  );
}
