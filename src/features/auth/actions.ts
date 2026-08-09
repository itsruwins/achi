"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { validateEmail, validatePassword, validateUsername } from "./validation";

export type AuthFormState = {
  formError?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "username", string>>;
  /** Set after signup when Supabase requires email confirmation. */
  awaitingConfirmation?: string;
};

/**
 * Absolute origin of this deployment, for OAuth redirects.
 *
 * `x-forwarded-*` first, because behind Vercel (or any proxy) the raw host
 * header is the internal one and OAuth would bounce the user to a URL that
 * doesn't exist publicly.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors = {
    email: validateEmail(email),
    // Only check presence here. Applying the length rule would tell an
    // attacker their guess was too short to be a real password.
    password: password ? undefined : "Enter your password.",
  };
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: distinguishing "no such account" from "wrong
    // password" turns the login form into an account-enumeration oracle.
    return { formError: "Wrong email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/decks");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/welcome` },
  });

  if (error) return { formError: error.message };

  // When email confirmation is on and the address is already registered,
  // Supabase returns a decoy user with an empty identities array rather than
  // an error — again, to avoid leaking who has an account. Show the same
  // "check your email" message either way.
  if (data.user && data.user.identities?.length === 0) {
    return { awaitingConfirmation: email };
  }

  // No session means a confirmation email went out.
  if (!data.session) return { awaitingConfirmation: email };

  revalidatePath("/", "layout");
  redirect("/welcome");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect(`/sign-in?error=${encodeURIComponent("Could not reach Google.")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export type UsernameFormState = {
  formError?: string;
  fieldErrors?: Partial<Record<"username" | "displayName", string>>;
};

export async function setUsername(
  _prev: UsernameFormState,
  formData: FormData,
): Promise<UsernameFormState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();

  const usernameError = validateUsername(username);
  if (usernameError) return { fieldErrors: { username: usernameError } };
  if (displayName.length > 60) {
    return { fieldErrors: { displayName: "At most 60 characters." } };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims) redirect("/sign-in");

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName || null,
    })
    .eq("id", claims.claims.sub);

  if (error) {
    // 23505 = unique_violation, i.e. the username is taken.
    if (error.code === "23505") {
      return { fieldErrors: { username: "That username is taken." } };
    }
    return { formError: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/decks");
}
