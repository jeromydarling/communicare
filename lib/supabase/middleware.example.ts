// Reference middleware for the dynamic Next.js deploy (Lovable / Vercel).
// Copy to /middleware.ts at the project root after removing `output: "export"`
// from next.config.mjs. Refreshes the Supabase session on every request.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as never);
        }
      },
    },
  });

  // Touching getUser refreshes the access token if needed
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Run on every request except static assets and the auth callback
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
