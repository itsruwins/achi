/**
 * Input validation for the auth forms.
 *
 * Hand-rolled rather than pulling in a schema library for four fields. When
 * Phase 6 needs zod for Claude's structured outputs, this is a candidate to
 * fold in — until then it isn't worth the dependency.
 *
 * These rules mirror the CHECK constraints in 0001_auth.sql. The database is
 * the real enforcement point; this exists to give a useful message instead of
 * a raw Postgres error.
 */

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

/** Kept in sync with Supabase Auth's own minimum. */
export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  // Intentionally loose. Anything stricter rejects valid addresses; the
  // confirmation email is what actually proves the address works.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "That doesn't look like an email address.";
  }
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "Enter a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return undefined;
}

export function validateUsername(value: string): string | undefined {
  const username = value.trim();
  if (!username) return "Pick a username.";
  if (username !== username.toLowerCase()) {
    return "Usernames are lowercase only.";
  }
  if (username.length < 3) return "At least 3 characters.";
  if (username.length > 30) return "At most 30 characters.";
  if (!/^[a-z]/.test(username)) return "Start with a letter.";
  if (!USERNAME_PATTERN.test(username)) {
    return "Letters, numbers, and underscores only.";
  }
  return undefined;
}
