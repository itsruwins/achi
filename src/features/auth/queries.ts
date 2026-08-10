import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email?: string;
};

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

/**
 * The signed-in user, or null.
 *
 * Uses `getClaims()`, which verifies the JWT signature — never `getSession()`,
 * which just decodes whatever is in the cookie and will happily hand back a
 * forged identity.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  return { id: data.claims.sub, email: data.claims.email };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] failed to load profile:", error.message);
    return null;
  }

  return data;
}

/**
 * Guard for authenticated routes: returns the user and their profile, or
 * redirects. `/welcome` is where a user without a username finishes signing up.
 *
 * Call this in a layout so every page beneath it inherits the guard, rather
 * than repeating the check per page and eventually forgetting one.
 */
export async function requireOnboardedUser(): Promise<{
  user: SessionUser;
  // `username` is non-null past the redirect below. Encoding that in the type
  // saves every caller a check the guard has already done.
  profile: Profile & { username: string };
}> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(user.id);

  // No profile row means the trigger in 0001_auth.sql did not run — most
  // likely the migration has not been applied yet.
  if (!profile) redirect("/welcome");

  // Narrowed through a local: TypeScript refines `username` on its own, but not
  // the object that holds it, so the value is carried back out explicitly.
  const { username } = profile;
  if (!username) redirect("/welcome");

  return { user, profile: { ...profile, username } };
}
