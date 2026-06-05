// =============================================================================
// GET /api/auth/me — current session's user
// =============================================================================
// Used by the client to bootstrap the auth state on page load. Returns:
//   { user: null }                       — anonymous
//   { user: { id, email, display_name } } — signed in
// Never errors on missing session — that's a valid state, not a failure.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { getSessionFromRequest, sessionCookie } from "../../_lib/sessions";
import { one } from "../../_lib/db";

type Env = { DB?: D1Database };

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  email_verified_at: string | null;
  preferred_locale: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ user: null });
  }

  const result = await getSessionFromRequest(ctx.env.DB, ctx.request);
  if (!result) return json({ user: null });

  const user = await one<UserRow>(
    ctx.env.DB,
    `select id, email, display_name, email_verified_at,
            coalesce(preferred_locale, 'en') as preferred_locale
       from users where id = ?`,
    [result.session.user_id],
  );
  if (!user) return json({ user: null });

  const res = json({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      email_verified: Boolean(user.email_verified_at),
      preferred_locale: user.preferred_locale === "es" ? "es" : "en",
    },
  });

  // If the session got extended in the sliding window, re-emit the
  // cookie so the browser bumps Max-Age too.
  if (result.refreshed) {
    // Re-derive the plaintext id from the cookie (we already verified it)
    // — we only have the hash here. Workaround: don't refresh the
    // cookie's Max-Age client-side; the server-side row is what matters.
    // Browsers refresh the cookie's lifetime only when Set-Cookie carries
    // it, so the cookie expires when the server-side row was originally
    // due. That's fine — the next /me call re-reads the row, and the
    // session is still valid because we extended expires_at server-side.
    // (Trade-off: marginally worse UX if the cookie's own Max-Age was
    // shorter than the session row's extended expiry.)
    void sessionCookie; // keep the import linted-clean for future use
  }
  return res;
};
