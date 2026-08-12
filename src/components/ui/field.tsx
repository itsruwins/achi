import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  /** Right-aligned next to the label — character counts, "optional", links. */
  aside?: ReactNode;
  children: ReactNode;
};

/**
 * Label + control + error, wired for screen readers.
 *
 * The error is rendered in an aria-live region so it is announced when it
 * appears after a failed submit, not just when focus happens to land on it.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  aside,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-base font-medium text-text">
          {label}
        </label>
        {aside ? <span className="text-sm text-subtle">{aside}</span> : null}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-subtle">
          {hint}
        </p>
      ) : null}
      <p
        id={`${htmlFor}-error`}
        aria-live="polite"
        className={cn("text-sm text-danger", !error && "sr-only")}
      >
        {error ?? ""}
      </p>
    </div>
  );
}

/**
 * Controls sit on `surface` with a strong border, and shift to a primary border
 * on focus in addition to the global focus ring — the ring alone is easy to
 * lose against a page of bordered boxes.
 */
const controlBase =
  "w-full rounded-control border bg-surface px-3 text-text " +
  // 16px on phones, the app's 14px from `sm` up.
  //
  // This is not a taste choice: iOS Safari zooms the viewport when a focused
  // form control has a font-size below 16px, and it does not zoom back out when
  // the field blurs. Every form in the app was doing it. The rule is the
  // control's *rendered* size, so it has to live here rather than on a wrapper.
  "text-[1rem] sm:text-base " +
  "placeholder:text-subtle " +
  "transition-[border-color,background-color] duration-[var(--dur-fast)] " +
  "focus:outline-none focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-[var(--disabled-opacity)]";

/**
 * Control height. 44px on touch, the denser 38px on pointer screens — 44 is the
 * smallest reliable touch target, and a form of 38px fields is a form of near
 * misses.
 */
const controlHeight = "h-11 sm:h-9.5";

const controlRing =
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlRing,
        controlHeight,
        invalid
          ? "border-danger focus-visible:border-danger focus-visible:ring-danger/25"
          : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlRing,
        "resize-y py-2 leading-relaxed",
        invalid
          ? "border-danger focus-visible:border-danger focus-visible:ring-danger/25"
          : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Native select with a drawn chevron.
 *
 * `appearance-none` removes the platform arrow so the control matches Input;
 * the menu itself stays native, which is the right call on mobile.
 */
export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlRing,
          controlHeight,
          "cursor-pointer appearance-none pr-9",
          invalid ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}

/**
 * Checkbox or radio with its label, as one click target.
 *
 * Built on the native input with `accent-color` rather than a custom-drawn box,
 * so keyboard behaviour, form participation, and forced-colors mode all keep
 * working for free.
 */
export function Choice({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      className={cn(
        // The whole label is the target, so the padding is what makes the row
        // clear 44px on a phone rather than the box itself.
        "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-control border border-border bg-surface p-3 sm:min-h-0 sm:p-2.5",
        "transition-[border-color,background-color] duration-[var(--dur-fast)]",
        "hover:border-border-strong has-checked:border-primary-border has-checked:bg-primary-subtle",
        className,
      )}
    >
      <input
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)] sm:size-4"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-base text-text">{label}</span>
        {hint ? <span className="block text-sm text-subtle">{hint}</span> : null}
      </span>
    </label>
  );
}
