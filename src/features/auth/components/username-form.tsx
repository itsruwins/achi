"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { setUsername, type UsernameFormState } from "@/features/auth/actions";

export function UsernameForm({
  defaultDisplayName,
}: {
  defaultDisplayName?: string;
}) {
  const [state, formAction, isPending] = useActionState<
    UsernameFormState,
    FormData
  >(setUsername, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {state.formError}
        </p>
      ) : null}

      <Field
        label="Username"
        htmlFor="username"
        error={state.fieldErrors?.username}
        hint="Lowercase letters, numbers, and underscores. This appears on decks you share."
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          autoFocus
          spellCheck={false}
          invalid={Boolean(state.fieldErrors?.username)}
          placeholder="studybuddy"
        />
      </Field>

      <Field
        label="Display name"
        htmlFor="displayName"
        error={state.fieldErrors?.displayName}
        hint="Optional — how your name shows up to other people."
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          defaultValue={defaultDisplayName}
          invalid={Boolean(state.fieldErrors?.displayName)}
          placeholder="Your name"
        />
      </Field>

      <Button type="submit" size="lg" loading={isPending} className="w-full">
        Continue
      </Button>
    </form>
  );
}
