import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile, getSessionUser } from "@/features/auth/queries";
import { UsernameForm } from "@/features/auth/components/username-form";

export const metadata: Metadata = { title: "Pick a username" };

/**
 * Final step of signup: claim a username.
 *
 * Deliberately outside the (app) group — that layout redirects here when a
 * username is missing, so living inside it would loop forever.
 */
export default async function WelcomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(user.id);

  // Already onboarded — nothing to do here.
  if (profile?.username) redirect("/decks");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            One last thing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose a username so people can find the decks you share.
          </p>
        </div>

        {profile ? (
          <UsernameForm defaultDisplayName={profile.display_name ?? undefined} />
        ) : (
          <p
            role="alert"
            className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            Your profile row is missing. Apply{" "}
            <code className="font-mono">supabase/migrations/0001_auth.sql</code>{" "}
            — the trigger that creates it has not run yet.
          </p>
        )}
      </div>
    </main>
  );
}
