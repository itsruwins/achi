import Link from "next/link";
import type { ReactNode } from "react";

import { requireOnboardedUser } from "@/features/auth/queries";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { countDueCards } from "@/features/srs/queries";

/**
 * Shell for every signed-in route.
 *
 * The auth guard lives here rather than in each page: one check that every
 * page beneath inherits, instead of a per-page check that eventually gets
 * forgotten on a new route.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireOnboardedUser();
  const dueCount = await countDueCards(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-5">
            <Link
              href="/decks"
              className="text-base font-semibold tracking-tight text-text"
            >
              Achi
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/decks" className="text-muted hover:text-text">
                Decks
              </Link>
              <Link href="/study" className="text-muted hover:text-text">
                Study
              </Link>
              <Link
                href="/review"
                className="flex items-center gap-1.5 text-muted hover:text-text"
              >
                Review
                {dueCount > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary-fg">
                    {dueCount > 99 ? "99+" : dueCount}
                  </span>
                ) : null}
              </Link>
              <Link href="/stats" className="text-muted hover:text-text">
                Stats
              </Link>
              <Link
                href="/community"
                className="hidden text-muted hover:text-text sm:inline"
              >
                Community
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/u/${profile.username}`}
              className="hidden text-sm text-muted hover:text-text sm:inline"
            >
              @{profile.username}
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
