import type { Metadata } from "next";
import Link from "next/link";

import { signUp } from "@/features/auth/actions";
import { GOOGLE_AUTH_ENABLED } from "@/features/auth/config";
import { CredentialsForm } from "@/features/auth/components/credentials-form";
import { GoogleButton } from "@/features/auth/components/google-button";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Create your account
        </h1>
        <p className="mt-1 text-base text-muted">
          Free, and your decks sync everywhere.
        </p>
      </div>

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

      <CredentialsForm action={signUp} mode="sign-up" />

      <p className="text-center text-base text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
