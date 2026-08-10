"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils/cn";

/**
 * Account menu.
 *
 * Rendered as an absolutely-positioned panel anchored to the trigger. The
 * header is not a scroll container, so there's no clipping risk here — if this
 * ever moves inside one it needs the popover API instead.
 */
export function UserMenu({
  username,
  displayName,
  avatarUrl,
  signOut,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Navigating with the menu open would leave it hanging over the new page.
  // Adjusted during render rather than in an effect: an effect would paint the
  // new route with the old menu still on screen for a frame first.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-pill p-0.5 pr-2 transition-colors duration-[var(--dur-fast)]",
          open ? "bg-active-wash" : "hover:bg-hover-wash",
        )}
      >
        <Avatar username={username} displayName={displayName} avatarUrl={avatarUrl} />
        <span className="hidden max-w-28 truncate text-sm text-muted sm:block">
          {displayName || username}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[var(--z-dropdown)] w-60 origin-top-right rounded-card border border-border bg-raised p-1.5 shadow-modal [animation:achi-pop_var(--dur)_var(--ease-out)]"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-base font-medium text-text">
              {displayName || username}
            </p>
            <p className="truncate text-sm text-subtle">@{username}</p>
          </div>

          <div className="my-1 h-px bg-border" />

          <MenuLink href={`/u/${username}`}>Your profile</MenuLink>
          <MenuLink href="/decks">Your decks</MenuLink>
          <MenuLink href="/stats">Your stats</MenuLink>

          <div className="my-1 h-px bg-border" />

          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>

          <div className="my-1 h-px bg-border" />

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-control px-2.5 py-1.5 text-left text-base text-muted transition-colors duration-[var(--dur-fast)] hover:bg-danger-subtle hover:text-danger"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block rounded-control px-2.5 py-1.5 text-base text-muted transition-colors duration-[var(--dur-fast)] hover:bg-hover-wash hover:text-text"
    >
      {children}
    </Link>
  );
}

/**
 * Avatar with an initial fallback.
 *
 * Most accounts have no picture, so the fallback is the common case and gets
 * designed rather than left as a gray blob.
 */
export function Avatar({
  username,
  displayName,
  avatarUrl,
  className,
}: {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  className?: string;
}) {
  const label = displayName || username;

  if (avatarUrl) {
    return (
      /* Avatars come from arbitrary Supabase Storage / OAuth hosts; next/image
         would need every one allow-listed in next.config. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn("size-7 shrink-0 rounded-pill object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-pill bg-primary-subtle text-2xs font-semibold uppercase text-primary",
        className,
      )}
    >
      {label.slice(0, 1)}
    </span>
  );
}
