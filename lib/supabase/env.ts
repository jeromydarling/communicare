// Centralized env access so every Supabase helper degrades gracefully when
// the project hasn't been configured yet. The static GitHub Pages preview
// works without any Supabase env vars set — the auth flow and /join writes
// just no-op with a friendly notice.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);
