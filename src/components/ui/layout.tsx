import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Page scaffolding.
 *
 * Every screen uses the same header shape — optional back link, title, one
 * line of context, actions on the right. Consistency screen-to-screen is the
 * point: users stop having to re-find the primary action on each page.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {backHref ? (
        <Link
          href={backHref}
          className="group -ml-1 mb-3 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm text-muted transition-colors duration-[var(--dur-fast)] hover:text-text"
        >
          <span
            aria-hidden="true"
            className="transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] group-hover:-translate-x-0.5"
          >
            ←
          </span>
          {backLabel ?? "Back"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-text">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-[68ch] text-base text-muted">{description}</p>
          ) : null}
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-subtle">
              {meta}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/** Separator between meta items. Purely decorative, hidden from readers. */
export function Dot() {
  return (
    <span aria-hidden="true" className="text-border-strong">
      ·
    </span>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8 first:mt-0", className)}>
      {title || action ? (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title ? (
            <h2 className="text-md font-semibold tracking-tight text-text">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Card({
  className,
  interactive,
  children,
}: {
  className?: string;
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface",
        interactive &&
          "transition-[border-color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary-border hover:shadow-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Empty state.
 *
 * Teaches the interface rather than announcing absence. "No decks yet" tells
 * you nothing you didn't know from the blank screen; what belongs here is what
 * the thing is and how to make one.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-border-strong bg-surface/60 text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
      )}
    >
      {icon ? (
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-pill bg-sunken text-muted">
          {icon}
        </div>
      ) : null}
      <p className="text-md font-medium text-text">{title}</p>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-[46ch] text-base text-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Grouped actions in a bar. Used for study controls and card tools.
 *
 * `role="group"` so a screen reader announces these as one cluster rather than
 * a run of unrelated buttons.
 */
export function Toolbar({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {children}
    </div>
  );
}

/** Loading placeholder shaped like the content it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-control", className)} />;
}

/**
 * Thin progress rail. Used by every session so "how far in am I" reads the
 * same in flashcards, quiz, and review.
 */
export function ProgressRail({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="tnum text-muted">
          {label ?? `${current} of ${total}`}
        </span>
        <span className="tnum text-subtle">{Math.round(pct)}%</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-pill bg-border"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
