"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  createCommunity,
  type CommunityFormState,
} from "@/features/community/actions";
import { cn } from "@/lib/utils/cn";

const POLICIES = [
  {
    value: "open" as const,
    label: "Anyone can join",
    note: "Listed publicly, and anyone with an account can join.",
  },
  {
    value: "invite_only" as const,
    label: "Invite only",
    note: "Still listed, but joining needs a code you share.",
  },
];

export function NewCommunityForm() {
  const [state, formAction, isPending] = useActionState<
    CommunityFormState,
    FormData
  >(createCommunity, {});
  const [policy, setPolicy] = useState<"open" | "invite_only">("open");

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Field
        label="Name"
        htmlFor="name"
        hint="The web address is made from this, so pick something you'll keep."
      >
        <Input
          id="name"
          name="name"
          required
          autoFocus
          maxLength={60}
          placeholder="BSCS 2A — Data Structures"
        />
      </Field>

      <Field label="Description" htmlFor="description" hint="Optional.">
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          placeholder="What is this group for?"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-text">Who can join</legend>
        <div className="mt-2 space-y-1.5">
          {POLICIES.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-2.5 rounded-control border px-3 py-2 transition-colors",
                policy === option.value
                  ? "border-primary bg-primary-subtle"
                  : "border-border hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name="joinPolicy"
                value={option.value}
                checked={policy === option.value}
                onChange={() => setPolicy(option.value)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="min-w-0">
                <span className="block text-sm text-text">{option.label}</span>
                <span className="block text-xs text-muted">{option.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-subtle">
        Posts and shared decks are visible to members only. Anyone can see the
        community&rsquo;s name and description so they can ask to join.
      </p>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create community"}
      </Button>
    </form>
  );
}
