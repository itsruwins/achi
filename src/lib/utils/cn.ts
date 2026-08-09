type ClassValue = string | false | null | undefined;

/**
 * Join conditional class names.
 *
 * Deliberately not tailwind-merge: nothing here needs to override a class it
 * also sets. If a component ever needs real conflict resolution, that's the
 * point to add the dependency — not before.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
