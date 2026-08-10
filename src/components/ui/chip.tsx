import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Filter and tag pills.
 *
 * Selection is carried by fill + border + weight, never by hue alone — a
 * colour-only selected state disappears for anyone who can't separate the two
 * hues, and washes out on a bright screen outdoors.
 */
const chipBase =
  "inline-flex items-center gap-1.5 rounded-pill border px-3 h-7 text-sm " +
  "transition-[background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]";

const chipTone = {
  on: "border-primary-border bg-primary-subtle font-medium text-primary",
  off: "border-border bg-surface text-muted hover:border-border-strong hover:text-text",
} as const;

export function FilterChip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(chipBase, active ? chipTone.on : chipTone.off)}
    >
      {children}
      {typeof count === "number" ? (
        <span className={cn("tnum text-2xs", active ? "opacity-70" : "text-subtle")}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function ToggleChip({
  active,
  count,
  children,
  ...props
}: {
  active: boolean;
  count?: number;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(chipBase, active ? chipTone.on : chipTone.off)}
      {...props}
    >
      {children}
      {typeof count === "number" ? (
        <span className={cn("tnum text-2xs", active ? "opacity-70" : "text-subtle")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-border bg-sunken text-muted",
  primary: "border-primary-border bg-primary-subtle text-primary",
  accent: "border-accent-border bg-accent-subtle text-accent",
  success: "border-transparent bg-success-subtle text-success",
  warning: "border-transparent bg-warning-subtle text-warning",
  danger: "border-transparent bg-danger-subtle text-danger",
  info: "border-transparent bg-info-subtle text-info",
};

/** Static status marker. Not clickable — use a chip if it filters something. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-2xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
