// =============================================================================
// turnstile — Cloudflare's privacy-friendly captcha verifier
// =============================================================================
// Used on the /join form (waitlist) and any other anonymous-write endpoint
// where IP rate-limiting alone isn't enough. The client renders the
// Turnstile widget with the site key (NEXT_PUBLIC_TURNSTILE_SITE_KEY,
// baked at build time) and gets back a token. The token comes in with the
// form submission; we POST it here against Cloudflare's siteverify
// endpoint along with the secret.
//
// Why Turnstile over hCaptcha / reCAPTCHA:
//   * No "select all the buses" UI — usually invisible, sometimes a
//     single click
//   * Privacy-respecting (no Google / hCaptcha behavioral profiling)
//   * Free, integrates natively with Cloudflare
//   * The siteverify endpoint is the only network call; no widget
//     handshake to babysit
//
// In dev / when TURNSTILE_SECRET is unset, this passes through so local
// development isn't blocked.
// =============================================================================

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; hostname?: string }
  | { ok: false; reason: string; codes?: string[] };

export async function verifyTurnstile(
  token: string | null | undefined,
  secret: string | undefined,
  remoteip?: string,
): Promise<TurnstileResult> {
  if (!secret) {
    // Pass-through in dev so developers can iterate without a deployed
    // Turnstile site key.
    return { ok: true };
  }
  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteip) params.set("remoteip", remoteip);

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `verify-fetch-failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    return { ok: false, reason: `verify-http-${res.status}` };
  }

  const json = (await res.json()) as {
    success?: boolean;
    "error-codes"?: string[];
    hostname?: string;
  };

  if (json.success) {
    return { ok: true, hostname: json.hostname };
  }
  return {
    ok: false,
    reason: "verify-rejected",
    codes: json["error-codes"] ?? [],
  };
}
