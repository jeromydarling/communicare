// Browser-side Supabase client. Works in both the static GitHub Pages build
// and the eventual Lovable / Vercel deploy. Returns `null` when Supabase
// isn't configured (no env vars), so call sites can fall back cleanly.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;
  cached = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
