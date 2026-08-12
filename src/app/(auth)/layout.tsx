import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/shell/logo";
import { getSessionUser } from "@/features/auth/queries";

/**
 * Shell for /sign-in and /sign-up.
 *
 * Bounces users who already have a session — landing on a sign-in form while
 * signed in is confusing, and submitting it would just re-auth the same
 * account.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (user) redirect("/decks");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Centred, but only as wide as the mark — a full-width link means the
            dead space either side of the logo is also a link home. */}
        <Link href="/" className="mx-auto mb-6 flex min-h-11 w-fit items-center justify-center">
          <Logo />
        </Link>

        {/* The form sits on a raised card rather than the bare page: on a
            near-empty screen the card is what tells you where to look. */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          {children}
        </div>
      </div>
    </main>
  );
}
