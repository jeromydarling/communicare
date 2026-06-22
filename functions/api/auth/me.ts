// =============================================================================
// GET /api/auth/me — current session's user
// =============================================================================
// Used by the client to bootstrap the auth state on page load. Returns:
//   { user: null }                                — anonymous
//   { user: { id, email, display_name, ... } }    — signed in
// Never errors on missing session — that's a valid state, not a failure.
//
// On a sliding-window session that just got extended server-side, we
// could re-emit Set-Cookie here to bump the browser-side Max-Age, but
// we'd need the plaintext session id and only the hash is available
// after the lookup. Browsers honor the cookie until its own expiry;
// the server-side row stays valid past that, and the next /me call
// re-reads the user transparently. The trade-off is documented and
// intentional — not worth re-architecting sessions.ts to surface the
// plaintext id back up to here.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { getSessionFromRequest } from "../../_lib/sessions";
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

  return json({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      email_verified: Boolean(user.email_verified_at),
      preferred_locale: user.preferred_locale === "es" ? "es" : "en",
    },
  });
};
