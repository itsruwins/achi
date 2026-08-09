"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createShareLink, revokeShareLinks } from "@/features/sharing/actions";

export function SharePanel({
  deckId,
  existingToken,
}: {
  deckId: string;
  existingToken: string | null;
}) {
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Built in the browser rather than on the server: the origin here is the one
  // the user is actually looking at, so the link works in local dev and in
  // production without configuring a base URL.
  const url = token ? `${window.location.origin}/s/${token}` : null;

  function create() {
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.append("deckId", deckId);
      const result = await createShareLink(form);
      if (result.ok) setToken(result.token);
      else setError(result.error);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-text">Share a link</p>
      <p className="mt-0.5 text-xs text-muted">
        Anyone with the link can view this deck and save a copy — no account
        needed to look.
      </p>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {url ? (
        <div className="mt-3 space-y-2">
          <input
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            aria-label="Share link"
            className="h-9 w-full rounded-control border border-border-strong bg-bg px-3 font-mono text-xs text-text"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <form
              action={revokeShareLinks}
              onSubmit={(event) => {
                if (
                  !confirm(
                    "Stop sharing? The link stops working for everyone and the deck goes back to private.",
                  )
                ) {
                  event.preventDefault();
                } else {
                  setToken(null);
                }
              }}
            >
              <input type="hidden" name="deckId" value={deckId} />
              <Button type="submit" size="sm" variant="ghost">
                Stop sharing
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={create}
          disabled={pending}
        >
          {pending ? "Creating…" : "Create share link"}
        </Button>
      )}
    </div>
  );
}
