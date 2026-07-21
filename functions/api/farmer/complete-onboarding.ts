// =============================================================================
// POST /api/farmer/complete-onboarding — stamp farms.onboarded_at
// =============================================================================
// Optional body { farm_id } lets multi-farm operators say which farm
// they're completing. Without it we stamp the first farm they staff
// (the wizard's normal single-farm case).

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { requireActiveSubscription } from "../../_lib/billing";
import { one, run, nowIso } from "../../_lib/db";
import {
  sendEmail,
  firstFarmPublishedEmail,
  type EmailSendBinding,
} from "../../_lib/email";

type Env = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = { farm_id?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  // Publishing the farm flips is_published — that's the moment the
  // listing goes live. Gate it behind an active subscription so unpaid
  // accounts can fill in the wizard but can't push the published bit.
  const gate = await requireActiveSubscription(ctx.env.DB, auth.user.id);
  if (!gate.ok) return gate.response;

  // Body is optional; if present, pin the farm_id.
  let body: RequestBody = {};
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    // empty body is fine
  }

  const fm = body.farm_id
    ? await one<{ farm_id: string }>(
        ctx.env.DB,
        `select farm_id from farm_members
          where user_id = ? and farm_id = ?
            and role in ('owner', 'staff')
            and archived_at is null`,
        [auth.user.id, body.farm_id],
      )
    : await one<{ farm_id: string }>(
        ctx.env.DB,
        `select farm_id from farm_members
          where user_id = ? and role in ('owner', 'staff')
            and archived_at is null
          order by joined_at asc
          limit 1`,
        [auth.user.id],
      );
  if (!fm) {
    return json({ error: "No farm found for this account." }, 404);
  }

  // Detect whether this is the first time we're stamping — used to gate
  // the milestone email so re-hits don't fire duplicates.
  const before = await one<{
    onboarded_at: string | null;
    name: string;
    slug: string;
  }>(
    ctx.env.DB,
    `select onboarded_at, name, slug from farms where id = ?`,
    [fm.farm_id],
  );
  const wasFirst = !before?.onboarded_at;

  await run(
    ctx.env.DB,
    `update farms set onboarded_at = coalesce(onboarded_at, ?),
                      updated_at = ?
      where id = ?`,
    [nowIso(), nowIso(), fm.farm_id],
  );

  if (wasFirst && ctx.env.EMAIL && before) {
    const u = await one<{
      email: string;
      display_name: string | null;
      preferred_locale: string | null;
    }>(
      ctx.env.DB,
      `select email, display_name,
              coalesce(preferred_locale,'en') as preferred_locale
         from users where id = ?`,
      [auth.user.id],
    );
    if (u) {
      const site = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
      const msg = firstFarmPublishedEmail({
        to: u.email,
        displayName: u.display_name,
        farmName: before.name,
        farmSlug: before.slug,
        siteUrl: site,
        locale: u.preferred_locale === "es" ? "es" : "en",
      });
      ctx.waitUntil(
        sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
          ...msg,
          replyTo: ctx.env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
        }),
      );
    }
  }

  return json({ ok: true, farm_id: fm.farm_id });
};
