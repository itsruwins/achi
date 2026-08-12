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
  // Named group so a child (a trailing arrow, say) can react to the button's
  // own hover without colliding with any group the button happens to sit in.
  "group/btn relative inline-flex select-none items-center justify-center gap-2 " +
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

/**
 * Heights step up on touch and back down from `sm` up.
 *
 * 44px is the smallest target most people hit reliably with a thumb, and the
 * pointer-screen sizes here (32/38px) are well under it. Rather than making the
 * whole app roomier, each size gains a touch tier and keeps its dense desktop
 * one. `lg` is already 44px, so it only grows its padding.
 */
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm sm:h-8 sm:px-2.5",
  md: "h-11 px-4 text-base sm:h-9.5 sm:px-3.5",
  lg: "h-12 px-5 text-md sm:h-11",
};

/**
 * The button's look, without the button.
 *
 * For the handful of elements that must not be a `<button>` but should read as
 * one — a `<summary>` that opens a disclosure, say. Prefer `<Button>` anywhere
 * a real button works; this exists so those exceptions don't fork the styling.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

type Props = ButtonProps;

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
      {loading ? <SpinnerOverlay /> : null}
    </button>
  );
}

/**
 * The app's only spinner. Inherits `currentColor`, so it reads correctly on a
 * primary button, a danger button, and a bare rating tile without variants.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("size-4 animate-spin", className)}
    >
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
  );
}

/** Spinner centred over a button's own box, replacing the hidden label. */
export function SpinnerOverlay() {
  return (
    <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <Spinner />
    </span>
  );
}

/**
 * Square icon-only button. Always needs an aria-label.
 *
 * Only the *width* is set here, and the size is forwarded so the height comes
 * from the shared size map. `cn` is a plain join with no conflict resolution
 * (see lib/utils/cn), so a `size-*` here would land alongside the map's `h-*`
 * and leave the winner up to Tailwind's output order rather than to this file.
 */
const iconWidths: Record<Size, string> = {
  sm: "w-9 sm:w-8",
  md: "w-11 sm:w-9.5",
  lg: "w-12 sm:w-11",
};

export function IconButton({
  className,
  size = "md",
  variant = "ghost",
  ...props
}: Props) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("px-0 sm:px-0", iconWidths[size], className)}
      {...props}
    />
  );
}
