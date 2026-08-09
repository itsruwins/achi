import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseKey, supabaseUrl } from "./env";

/**
 * Supabase client for server components, server actions, and route handlers.
 *
 * Create a new one per request — never hoist this to a module-level singleton,
 * or one user's session leaks into another's request.
 *
 * `cookies()` is async in Next 16, so this function is too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot write cookies. That is fine: src/proxy.ts
          // refreshes the session on every request, so the write that matters
          // has already happened by the time we get here.
        }
      },
    },
  });
}
