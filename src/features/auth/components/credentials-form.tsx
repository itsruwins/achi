"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/validation";
import type { AuthFormState } from "@/features/auth/actions";

type Props = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "sign-in" | "sign-up";
};

/**
 * Email + password form, shared by sign-in and sign-up.
 *
 * The two differ only in copy and autocomplete hints, so they share one
 * component — a second near-identical form is where the two silently drift.
 */
export function CredentialsForm({ action, mode }: Props) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );

  const isSignUp = mode === "sign-up";

  if (state.awaitingConfirmation) {
    return (
      <div className="rounded-card border border-border bg-primary-subtle p-5">
        <h2 className="text-sm font-medium text-text">Check your email</h2>
        <p className="mt-1.5 text-sm text-muted">
          We sent a confirmation link to{" "}
          <span className="font-medium text-text">
            {state.awaitingConfirmation}
          </span>
          . Open it to finish setting up your account.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {state.formError}
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={Boolean(state.fieldErrors?.email)}
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint={isSignUp ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? isSignUp
            ? "Creating account…"
            : "Signing in…"
          : isSignUp
            ? "Create account"
            : "Sign in"}
      </Button>
    </form>
  );
}
