import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Session refresh on every request.
 *
 * In Next 16 this file is `proxy.ts` exporting `proxy()` — the old
 * `middleware.ts` / `middleware()` convention is gone, and every Supabase SSR
 * guide online still shows the old name. It always runs on the Node runtime;
 * `runtime: "edge"` is not supported here and is not configurable.
 *
 * Without this, access tokens expire and users get logged out at random:
 * server components cannot write cookies, so this is the only place a refreshed
 * token can be persisted.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Update the request so anything downstream in this same pass sees the
        // fresh token, then rebuild the response carrying the new cookies.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // No-store headers supplied by @supabase/ssr. Without them a CDN can
        // cache a Set-Cookie response and hand one user's session to another.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Must happen before the response is committed — a refresh that completes
  // after that point is silently lost and the next request refreshes again.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Running session refresh
     * on a favicon request is wasted work and wasted Supabase quota.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
