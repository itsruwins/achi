import { cn } from "@/lib/utils/cn";

/**
 * The mark: a card being turned.
 *
 * Two rounded rectangles, the front one tilted off-axis — the gesture the whole
 * product is built on, legible at 20px. Drawn rather than lettered so it holds
 * up as a favicon and inside the tab bar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[0.5rem] bg-primary text-primary-fg",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[65%]" aria-hidden="true">
        <rect
          x="6"
          y="4"
          width="12"
          height="16"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          opacity="0.45"
        />
        <rect
          x="4"
          y="6"
          width="12"
          height="16"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          transform="rotate(-8 10 14)"
        />
      </svg>
    </span>
  );
}

/** Mark plus wordmark. `compact` drops the word on narrow screens. */
export function Logo({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight text-text",
          compact && "hidden sm:inline",
        )}
      >
        Achi
      </span>
    </span>
  );
}
