// Server-side Supabase client. Required for any flow that needs the user's
// session in a Server Component or Route Handler — i.e. the full @supabase/ssr
// pattern with HTTP-only cookies.
//
// IMPORTANT: this file is NOT used by the static GitHub Pages build. It's
// here for when we redeploy on Lovable / Vercel / Cloudflare Workers (which
// all support Node-runtime routes and cookies). Importing it from a server
// component or route handler in a dynamic deploy will give you a fully
// cookie-backed Supabase session.
//
// To activate:
//   1. Remove `output: "export"` from next.config.mjs
//   2. Add `middleware.ts` at the project root (see middleware.example.ts below)
//   3. Use this `getSupabaseServer()` in any server component or route handler
//
// Until then, the project relies on the browser client only (lib/supabase/client.ts).

import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Lazy-import `next/headers` so this module can still be statically analyzed
// in the export build without errors. The function itself only runs at
// request time on a Node runtime.
export async function getSupabaseServer() {
  if (!isSupabaseConfigured) return null;

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as never);
          }
        } catch {
          // setAll called from a Server Component (read-only context) — fine,
          // middleware refreshes the session on the next request.
        }
      },
    },
  });
}
