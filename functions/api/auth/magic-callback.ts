// =============================================================================
// GET /api/auth/magic-callback?token=... — magic-link landing
// =============================================================================
// The clicked URL in the email lands here. We validate the token, mark
// it used, mint a session, set the cookie, and 302 to either the
// redirect_to that was captured at request time (validated as
// same-origin) or the default landing page.
//
// Same handler covers all three token purposes:
//   - signin: drops the user on /farmer/ or wherever they came from
//   - invite: same effect; the wizard takes over post-redirect
//   - confirm: also marks email_verified_at on the user
// =============================================================================

import { json } from "../../_lib/cors";
import { sha256Hex } from "../../_lib/crypto";
import { createSession, sessionCookie } from "../../_lib/sessions";
import { one, run, nowIso } from "../../_lib/db";
import { isSafeRedirect } from "../../_lib/redirects";

type Env = {
  DB?: D1Database;
  SITE_URL?: string;
};

type TokenRow = {
  token_hash: string;
  email: string;
  user_id: string | null;
  purpose: "signin" | "invite" | "confirm";
  redirect_to: string | null;
  locale: string;
  expires_at: string;
  used_at: string | null;
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return errorPage("Database not configured on this deploy.");
  }
  const db = ctx.env.DB;

  const url = new URL(ctx.request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return errorPage("Missing token.");
  }
  const tokenHash = await sha256Hex(token);

  const row = await one<TokenRow>(
    db,
    `select token_hash, email, user_id, purpose, redirect_to,
            coalesce(locale, 'en') as locale, expires_at, used_at
       from magic_link_tokens where token_hash = ?`,
    [tokenHash],
  );
  if (!row) return errorPage("This link isn't valid.");
  if (row.used_at) return errorPage("This link's already been used.");
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return errorPage("This link has expired. Send yourself a new one.");
  }

  // user_id is null on confirm-tokens issued before signup ran (rare —
  // we always have it from the current schema, but defensive).
  let userId = row.user_id;
  if (!userId) {
    const user = await one<{ id: string }>(
      db,
      `select id from users where email = ?`,
      [row.email.toLowerCase()],
    );
    if (!user) return errorPage("No account found for this link.");
    userId = user.id;
  }

  const now = nowIso();
  await run(
    db,
    `update magic_link_tokens set used_at = ? where token_hash = ?`,
    [now, tokenHash],
  );
  // confirm-purpose tokens also stamp email_verified_at
  if (row.purpose === "confirm") {
    await run(
      db,
      `update users set email_verified_at = coalesce(email_verified_at, ?)
        where id = ?`,
      [now, userId],
    );
  }

  const ip = ctx.request.headers.get("cf-connecting-ip") ?? undefined;
  const ua = ctx.request.headers.get("user-agent") ?? undefined;
  const sess = await createSession(db, userId, { ip, userAgent: ua });

  const siteUrl = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
  // Re-validate the token's redirect_to: even though magic.ts validated
  // at request time, the DB row should never be trusted as plain
  // browser-followable input. Belt + suspenders for open-redirect.
  const safeRedirect = isSafeRedirect(row.redirect_to);
  const landing =
    safeRedirect ?? (row.purpose === "invite" ? "/farmer/onboarding/" : "/farmer/");

  const res = new Response(null, {
    status: 302,
    headers: {
      Location: siteUrl + landing,
    },
  });
  res.headers.append("Set-Cookie", sessionCookie(sess.id, sess.expiresAt));

  // Carry the token's locale forward as a readable cookie. Front-end
  // language toggle reads this to pick the right copy on first paint.
  // Not __Host- prefixed because it needs to be JS-readable; not
  // sensitive (it's a locale code, not a credential).
  const locale = row.locale === "es" ? "es" : "en";
  res.headers.append(
    "Set-Cookie",
    `cmcr_locale=${locale}; Path=/; Secure; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}`,
  );
  return res;
};

function errorPage(message: string): Response {
  // HTML response — this is a GET landing, not an API call. Keep it
  // tiny and styled in line with the site palette.
  const body = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><title>Communicare — link error</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Georgia,serif;background:#f5efe2;color:#1A1410;
       padding:6rem 1.5rem;text-align:center;margin:0;line-height:1.6}
  h1{font-weight:500;font-size:1.75rem;margin:1rem 0}
  p{max-width:32rem;margin:0 auto 1.5rem}
  a{color:#c16850;text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head><body>
<h1>This link isn't working.</h1>
<p>${escapeHtml(message)}</p>
<p><a href="/come-in/">Send yourself a new sign-in link →</a></p>
</body></html>`;
  return new Response(body, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return map[c];
  });
}
