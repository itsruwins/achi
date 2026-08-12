import Link from "next/link";
import type { ReactNode } from "react";

import { DesktopNav, MobileNav } from "@/components/shell/nav";
import { Logo } from "@/components/shell/logo";
import { StreakPill } from "@/components/shell/streak-pill";
import { UserMenu } from "@/components/shell/user-menu";
import { PlusIcon } from "@/components/ui/icons";
import { signOut } from "@/features/auth/actions";
import { requireOnboardedUser } from "@/features/auth/queries";
import { countDueCards } from "@/features/srs/queries";
import { getDailyCounts } from "@/features/stats/queries";
import { summarizeStreak } from "@/features/stats/streaks";
import { todayString } from "@/features/srs/algorithm";

/**
 * Shell for every signed-in route.
 *
 * The auth guard lives here rather than in each page: one check that every
 * page beneath inherits, instead of a per-page check that eventually gets
 * forgotten on a new route.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireOnboardedUser();

  // Independent reads, so they overlap instead of stacking three round trips.
  const [dueCount, daily] = await Promise.all([
    countDueCards(user.id),
    getDailyCounts(120),
  ]);

  const streak = summarizeStreak(
    daily.filter((day) => day.reviewed > 0).map((day) => day.day),
    todayString(),
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/*
        Sticky, translucent, and one step darker than the page. Chrome sitting
        on the sunken layer is what separates "app" from "document" — content
        scrolls under something, rather than the whole page moving as a sheet.
      */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-sunken/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/decks" className="flex h-14 shrink-0 items-center rounded-control pr-1">
            <Logo compact />
          </Link>

          <div className="mx-1 hidden h-5 w-px bg-border md:block" />

          <DesktopNav dueCount={dueCount} />

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/decks/new"
              className="flex h-8 items-center gap-1.5 rounded-pill bg-primary pl-2 pr-3 text-sm font-medium text-primary-fg transition-[background-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-primary-hover active:translate-y-px"
            >
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">New deck</span>
              <span className="sr-only sm:hidden">New deck</span>
            </Link>

            <StreakPill days={streak.current} />

            <UserMenu
              username={profile.username}
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              signOut={signOut}
            />
          </div>
        </div>
      </header>

      {/*
        Bottom padding clears the mobile tab bar; on desktop the tab bar is gone
        and the padding drops back to normal.
      */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-6 md:pb-16">
        {children}
      </main>

      <MobileNav dueCount={dueCount} />
    </div>
  );
}
