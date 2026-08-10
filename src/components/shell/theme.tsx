"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils/cn";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "achi-theme";

/**
 * Runs before first paint, inlined into <head>.
 *
 * Without this the page renders in the system theme and then snaps to the
 * stored one — a white flash on every load for anyone who chose dark. Kept as a
 * string because it has to execute before React hydrates.
 */
export const themeBootstrapScript = `
try {
  var t = localStorage.getItem("${THEME_STORAGE_KEY}");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`.trim();

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/* ---- localStorage as an external store ---------------------------------- */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // `storage` covers the case of another tab changing the preference.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private mode or blocked storage — behave as if nothing was ever chosen.
    return null;
  }
}

/** Nothing is knowable server-side, so the server always renders "system". */
function getServerSnapshot(): string | null {
  return null;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

/**
 * Three-state theme control: Light / System / Dark.
 *
 * System is a real option rather than an implicit default, because "follow my
 * OS" is a preference people actively hold — collapsing it into a two-way
 * toggle silently opts them out of it.
 */
export function ThemeToggle() {
  // localStorage is an external mutable store, so it's read through
  // useSyncExternalStore rather than an effect that calls setState — the effect
  // version renders once with the wrong answer and then again with the right
  // one, which is a visible flicker on the control.
  // useSyncExternalStore is hydration-safe on its own: the first client render
  // uses the server snapshot, then React re-renders with the real one. No
  // mounted flag needed.
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme: Theme = isTheme(stored) ? stored : "system";

  function choose(next: Theme) {
    apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; the current page still changes.
    }
    // localStorage doesn't fire `storage` in the tab that wrote it, so the
    // store has to be nudged by hand.
    notify();
  }

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "system", label: "System", icon: <SystemIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-sunken p-0.5"
    >
      {options.map((option) => {
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => choose(option.value)}
            className={cn(
              "grid size-6.5 place-items-center rounded-pill transition-colors duration-[var(--dur-fast)]",
              active
                ? "bg-surface text-text shadow-sm"
                : "text-subtle hover:text-text",
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-3.5",
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...svg}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg {...svg}>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M9 20h6" />
    </svg>
  );
}
