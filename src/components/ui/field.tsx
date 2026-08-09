import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils/cn";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

/**
 * Label + control + error, wired for screen readers.
 *
 * The error is rendered in an aria-live region so it is announced when it
 * appears after a failed submit, not just when focus happens to land on it.
 */
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      <p
        id={`${htmlFor}-error`}
        aria-live="polite"
        className={cn("text-xs text-danger", !error && "sr-only")}
      >
        {error ?? ""}
      </p>
    </div>
  );
}

const controlBase =
  "w-full rounded-control border bg-surface px-3 text-sm text-text placeholder:text-subtle";

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
        "h-11",
        invalid ? "border-danger" : "border-border-strong",
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
        "resize-y py-2.5 leading-relaxed",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
