import type { Metadata } from "next";
import Link from "next/link";

import { signIn } from "@/features/auth/actions";
import { GOOGLE_AUTH_ENABLED } from "@/features/auth/config";
import { CredentialsForm } from "@/features/auth/components/credentials-form";
import { GoogleButton } from "@/features/auth/components/google-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  // searchParams is a Promise in Next 16 — the synchronous form was removed.
  const { error } = await searchParams;
  const message = typeof error === "string" ? error : undefined;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Welcome back
        </h1>
        <p className="mt-1 text-base text-muted">Pick up where you left off.</p>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded-control border border-danger-subtle bg-danger-subtle px-3 py-2 text-base text-danger"
        >
          {message}
        </p>
      ) : null}

      {GOOGLE_AUTH_ENABLED ? (
        <>
          <GoogleButton />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
<span className="text-sm text-subtle">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <CredentialsForm action={signIn} mode="sign-in" />

      <p className="text-center text-base text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary-hover">
          Create an account
        </Link>
      </p>
    </div>
  );
}
