// =============================================================================
// POST /api/auth/signout — destroy the current session
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { destroySessionByCookie, clearSessionCookie } from "../../_lib/sessions";

type Env = { DB?: D1Database };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (ctx.env.DB) {
    await destroySessionByCookie(ctx.env.DB, ctx.request);
  }
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
};
