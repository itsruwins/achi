import Link from "next/link";

import { FlameIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Streak indicator in the utility rail.
 *
 * Amber is reserved for this and nothing else in the chrome, so the one warm
 * spot on the page always means the same thing. At zero it stays visible but
 * goes neutral — hiding it would make the streak appear out of nowhere on the
 * day you start one, with no prior hint that it existed.
 */
export function StreakPill({ days }: { days: number }) {
  const active = days > 0;

  return (
    <Link
      href="/stats"
      title={active ? `${days}-day streak` : "No streak yet — study today to start one"}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-pill border px-2 transition-colors duration-[var(--dur-fast)]",
        active
          ? "border-accent-border bg-accent-subtle text-accent"
          : "border-border bg-sunken text-subtle hover:text-muted",
      )}
    >
      <FlameIcon className="size-3.5" />
      <span className="tnum text-sm font-medium">{days}</span>
      <span className="sr-only">day streak</span>
    </Link>
  );
}
