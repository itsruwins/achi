"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  CommunityIcon,
  DecksIcon,
  ReviewIcon,
  StatsIcon,
  StudyIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type Item = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  badge?: number;
};

/**
 * Primary navigation, shared by the desktop bar and the mobile tab strip.
 *
 * A client component only because the active item depends on the current path.
 * Highlighting server-side would need the pathname threaded through every page.
 */
function useItems(dueCount: number): Item[] {
  return [
    { href: "/decks", label: "Decks", icon: DecksIcon },
    { href: "/study", label: "Study", icon: StudyIcon },
    { href: "/review", label: "Review", icon: ReviewIcon, badge: dueCount },
    { href: "/stats", label: "Stats", icon: StatsIcon },
    { href: "/community", label: "Community", icon: CommunityIcon },
  ];
}

/**
 * `/decks` must not stay lit while you're on `/study`, and `/decks/abc` must
 * keep it lit — so it's an exact match plus a path-segment prefix, never a bare
 * `startsWith` (which would also match `/decksomething`).
 */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav({ dueCount }: { dueCount: number }) {
  const pathname = usePathname();
  const items = useItems(dueCount);

  return (
    <nav aria-label="Main" className="hidden md:flex md:items-center md:gap-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-2 rounded-control px-3 text-base transition-colors duration-[var(--dur-fast)]",
              active
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:bg-hover-wash hover:text-text",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-subtle")} />
            {item.label}
            {item.badge ? <CountPip value={item.badge} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Bottom tab bar on small screens.
 *
 * Responsive behaviour here is structural — the nav changes shape rather than
 * shrinking. `pb-[env(safe-area-inset-bottom)]` keeps the tabs clear of the
 * home indicator on iOS.
 */
export function MobileNav({ dueCount }: { dueCount: number }) {
  const pathname = usePathname();
  const items = useItems(dueCount);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border bg-sunken/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs transition-colors duration-[var(--dur-fast)]",
                active ? "text-primary" : "text-subtle",
              )}
            >
              <span className="relative">
                <Icon className="size-5" />
                {item.badge ? (
                  <span className="absolute -right-2 -top-1 grid min-w-3.5 place-items-center rounded-pill bg-primary px-1 text-[9px] font-semibold leading-[14px] text-primary-fg">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CountPip({ value }: { value: number }) {
  return (
    <span className="tnum ml-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-primary px-1 text-2xs font-semibold text-primary-fg">
      {value > 99 ? "99+" : value}
    </span>
  );
}
