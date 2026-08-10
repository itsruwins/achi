"use client";

import { useEffect, useRef } from "react";

import { IconButton } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Side drawer built on native `<dialog>`.
 *
 * `showModal()` gives the focus trap, Escape-to-close, inertness of the page
 * behind, and top-layer rendering for free — all of which a div-based drawer has
 * to reimplement, usually incompletely. Top layer also means it can never be
 * clipped by an ancestor's `overflow`.
 *
 * On small screens it becomes a bottom sheet: a 420px panel pinned to the right
 * edge of a phone is just a full-screen panel with the content pushed off.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Fires for Escape and for programmatic close alike, so parent state
      // never drifts out of sync with the element's own open state.
      onClose={onClose}
      onClick={(event) => {
        // The dialog element itself is the backdrop area; a click that lands on
        // it rather than on the panel inside means "outside".
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="drawer-title"
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-text backdrop:bg-overlay",
        "ml-auto h-full w-full sm:w-[26rem]",
        "open:[animation:achi-fade-up_var(--dur)_var(--ease-out)]",
      )}
    >
      <div className="flex h-full flex-col border-l border-border bg-surface shadow-modal">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="drawer-title"
              className="text-md font-semibold tracking-tight text-text"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <IconButton size="sm" onClick={onClose} aria-label="Close">
            <CloseIcon className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-border bg-sunken px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
