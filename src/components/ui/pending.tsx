"use client";

import { useLinkStatus } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button, IconButton, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Pending-state primitives.
 *
 * Kept out of `button.tsx` deliberately: that module is imported by server
 * components (`buttonClass` is called during server render in quiz-options),
 * and a `"use client"` directive there would turn every export into a client
 * reference and break those call sites.
 */

/**
 * Submit button that reads its own form's pending state.
 *
 * `<form action={serverAction}>` posts without any client state to hang an
 * `isPending` flag on, which is why these forms used to sit inert between the
 * click and the revalidation. `useFormStatus` reports the status of the nearest
 * enclosing form, so this has to be rendered *inside* the `<form>` rather than
 * by the component that owns it.
 *
 * For forms already driven by `useActionState` or `useTransition`, pass that
 * hook's flag to `<Button loading>` instead — two sources of truth on one
 * button is how you end up with a spinner that outlives the request.
 */
export function SubmitButton({
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "type" | "loading">) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} disabled={disabled} {...props}>
      {children}
    </Button>
  );
}

/** Icon-only submit that reads its own form's pending state. */
export function SubmitIconButton({
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "type" | "loading">) {
  const { pending } = useFormStatus();

  return (
    <IconButton type="submit" loading={pending} disabled={disabled} {...props}>
      {children}
    </IconButton>
  );
}

/**
 * Text-only submit for destructive inline actions, where a full Button would
 * be too loud. Swaps the label rather than overlaying a spinner — at this size
 * a spinner is smaller than the text it replaces and reads as a glitch.
 */
export function SubmitText({
  children,
  pendingLabel,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(className, pending && "opacity-70")}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * Navigation hint for a `<Link>`, rendered as a child of it.
 *
 * Sized and laid out at all times, toggling only opacity — an indicator that
 * appears in the layout shifts the very row you just clicked. The 120ms
 * animation delay means a prefetched, instant navigation never flashes a
 * spinner: the element is gone before the delay elapses.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn("link-pending", pending && "is-pending", className)}
    />
  );
}

/**
 * Wraps content that should dim while its link navigates. Used by tiles, where
 * a single dot would read as unrelated to the thing that was clicked.
 */
export function LinkPendingVeil({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn(
        "contents",
        pending && "[&>*]:opacity-60 [&>*]:transition-opacity",
      )}
    >
      {children}
    </span>
  );
}
