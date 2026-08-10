import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * The single button vocabulary for the app.
 *
 * Every variant defines the full state set — default, hover, active, focus,
 * disabled, loading. Shipping half of them is how two buttons on the same
 * screen end up behaving differently.
 *
 * `active:translate-y-px` is the whole press affordance: one pixel, no scale,
 * no shadow bloom. It reads as a physical press without becoming decoration.
 */
const base =
  "relative inline-flex select-none items-center justify-center gap-2 " +
  "rounded-control font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] " +
  "active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border border-border-strong bg-surface text-text hover:bg-hover-wash active:bg-active-wash",
  ghost: "text-muted hover:bg-hover-wash hover:text-text active:bg-active-wash",
  danger: "bg-danger text-danger-fg hover:brightness-110 active:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9.5 px-3.5 text-base",
  lg: "h-11 px-5 text-md",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      // Buttons default to submit inside a form, which silently posts when you
      // meant a plain click. Opt in instead.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {/* The label keeps its space while loading, so the button never resizes
          mid-click and shift the layout under the cursor. */}
      <span className={cn("contents", loading && "invisible")}>{children}</span>
      {loading ? <Spinner /> : null}
    </button>
  );
}

function Spinner() {
  return (
    <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <svg viewBox="0 0 16 16" className="size-4 animate-spin">
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.25"
        />
        <path
          d="M8 2a6 6 0 0 1 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Square icon-only button. Always needs an aria-label. */
export function IconButton({
  className,
  size = "md",
  variant = "ghost",
  ...props
}: Props) {
  return (
    <Button
      variant={variant}
      className={cn(
        "px-0",
        size === "sm" ? "size-8" : size === "lg" ? "size-11" : "size-9.5",
        className,
      )}
      {...props}
    />
  );
}
