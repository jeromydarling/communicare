// =============================================================================
// i18n — client-side locale + translation helpers
// =============================================================================
// The site itself stays English in the UI chrome (manifesto, /find,
// /farmer/* etc.) — the Spanish surface is a follow-up that wants
// proper editorial review per page.
//
// What this module gives you NOW:
//   * Reading the current locale from the cmcr_locale cookie (set on
//     magic-link click-through) or from /api/auth/me on signed-in views.
//   * `translate(text, target)` — async wrapper around the Worker
//     route. Cached on the server side via KV; this client caches in
//     memory per page-load so a list of N items hitting the same
//     phrases only round-trips once.
// =============================================================================

export type Locale = "en" | "es";
export const LOCALES: readonly Locale[] = ["en", "es"];

const COOKIE = "cmcr_locale";

export function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)cmcr_locale=([^;]+)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "es" ? "es" : "en";
}

export function setLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const oneYear = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE}=${locale}; Path=/; Secure; SameSite=Lax; Max-Age=${oneYear}`;
}

// Per-page-load in-memory cache so a grid of products / share names
// renders without N round trips to the Worker.
const inflight = new Map<string, Promise<string>>();

export async function translate(
  text: string,
  target: Locale,
  source: Locale = "en",
): Promise<string> {
  if (!text || target === source) return text;
  const key = `${source}|${target}|${text}`;
  const hit = inflight.get(key);
  if (hit) return hit;

  const p = (async () => {
    const res = await fetch("/api/translate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target, source }),
    });
    if (!res.ok) return text; // graceful fallback to source
    const data = (await res.json().catch(() => ({}))) as {
      translated?: string;
    };
    return data.translated || text;
  })();
  inflight.set(key, p);
  return p;
}
