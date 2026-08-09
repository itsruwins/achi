import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation landing point.
 *
 * Supabase sends the browser here with a one-time `code`, which we exchange
 * for a session. The exchange writes auth cookies, which is why this is a
 * route handler — server components cannot set cookies.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const origin = resolveOrigin(request);

  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("That sign-in link is missing its code. Try again.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("That sign-in link has expired or was already used.")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Only ever redirect to a path on this site.
 *
 * `next` arrives in a URL the user can edit, so an unchecked value turns this
 * endpoint into an open redirect — a phisher could send a real Achi sign-in
 * link that lands the user on their site. Rejecting `//evil.com` matters as
 * much as rejecting `https://evil.com`: browsers read a leading `//` as
 * protocol-relative and treat it as an absolute URL.
 */
function safeNext(value: string | null): string {
  if (!value) return "/welcome";
  if (!value.startsWith("/") || value.startsWith("//")) return "/welcome";
  return value;
}

/** Honour proxy headers so redirects work behind Vercel. */
function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return url.origin;
}
