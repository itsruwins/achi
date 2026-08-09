import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center text-xl font-semibold tracking-tight text-text"
        >
          Achi
        </Link>
        {children}
      </div>
    </main>
  );
}
