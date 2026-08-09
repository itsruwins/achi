import type { Visibility } from "./types";

/** Mirrors the CHECK constraints in 0002_decks.sql. */

export function validateDeckTitle(value: string): string | undefined {
  const title = value.trim();
  if (!title) return "Give the deck a name.";
  if (title.length > 120) return "At most 120 characters.";
  return undefined;
}

export function validateDeckDescription(value: string): string | undefined {
  if (value.trim().length > 500) return "At most 500 characters.";
  return undefined;
}

export function isVisibility(value: string): value is Visibility {
  return value === "private" || value === "unlisted" || value === "public";
}

/**
 * Emoji are stored as a short string rather than validated as "one emoji" —
 * counting grapheme clusters correctly across skin tones and ZWJ sequences is
 * more trouble than it's worth. Cap the length and move on.
 */
export function normalizeEmoji(value: string): string | null {
  const emoji = value.trim();
  if (!emoji) return null;
  return [...emoji].slice(0, 4).join("");
}
