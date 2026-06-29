// =============================================================================
// /api/farmer/sms/subscriptions — opt-in roster management
// =============================================================================
//   GET → list subscriptions for the operator's farm
//   POST → enroll a phone (sends the consent text). Body:
//          { phone, display_name?, locale?, member_user_id? }
//   DELETE → remove a subscription (?id=...). Marks opted_out by the farmer,
//          but federal compliance also requires honoring STOP from the
//          member side — that's handled by the inbound webhook (PR 3).
//
// On POST: we insert with consent_status='pending', kick off a consent
// text, and only flip to 'opted_in' when the member replies YES (PR 3).
// Until then no other texts go to this number.
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, many, run, uuid, nowIso } from "../../../_lib/db";
import { normalizeUsPhone } from "../../../_lib/phone";
import { sendSms } from "../../../_lib/sms";
import { consentRequestText } from "../../../_lib/sms-templates";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
};

type SubRow = {
  id: string;
  farm_id: string;
  member_user_id: string | null;
  member_profile_id: string | null;
  phone_e164: string;
  display_name: string | null;
  locale: "en" | "es";
  consent_status: "pending" | "opted_in" | "opted_out";
  consent_text_sent_at: string | null;
  opted_in_at: string | null;
  opted_out_at: string | null;
  outbound_number: string | null;
  created_at: string;
  updated_at: string;
};

async function resolveOperatorFarm(
  db: D1Database,
  userId: string,
  requestedFarmId: string | null,
): Promise<string | null> {
  if (requestedFarmId) {
    const fm = await one<{ farm_id: string }>(
      db,
      `select farm_id from farm_members
        where user_id = ? and farm_id = ?
          and role in ('owner', 'staff')
          and archived_at is null`,
      [userId, requestedFarmId],
    );
    return fm?.farm_id ?? null;
  }
  const fm = await one<{ farm_id: string }>(
    db,
    `select farm_id from farm_members
      where user_id = ? and role in ('owner', 'staff')
        and archived_at is null
      order by joined_at asc
      limit 1`,
    [userId],
  );
  return fm?.farm_id ?? null;
}

export const onRequestOptions: PagesFunction = () => preflight();

// ----- GET ----------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;
  const url = new URL(ctx.request.url);
  const farmId = await resolveOperatorFarm(
    ctx.env.DB,
    auth.user.id,
    url.searchParams.get("farm_id"),
  );
  if (!farmId) return json({ error: "No farm." }, 404);

  const rows = await many<SubRow>(
    ctx.env.DB,
    `select * from member_sms_subscriptions
      where farm_id = ?
      order by created_at desc`,
    [farmId],
  );
  return json({ subscriptions: rows });
};

// ----- POST ---------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;
  const url = new URL(ctx.request.url);
  const farmId = await resolveOperatorFarm(
    ctx.env.DB,
    auth.user.id,
    url.searchParams.get("farm_id"),
  );
  if (!farmId) return json({ error: "No farm." }, 404);

  let body: {
    phone?: string;
    display_name?: string;
    locale?: "en" | "es";
    member_user_id?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const phone = normalizeUsPhone(body.phone);
  if (!phone) return json({ error: "Valid US phone required." }, 400);
  const locale = body.locale === "es" ? "es" : "en";

  // Need farm name + outbound number to compose + send the consent text.
  const farm = await one<{ id: string; name: string }>(
    ctx.env.DB,
    `select id, name from farms where id = ?`,
    [farmId],
  );
  if (!farm) return json({ error: "No farm." }, 404);

  const config = await one<{
    twilio_phone_number: string | null;
    twilio_messaging_service_sid: string | null;
  }>(
    ctx.env.DB,
    `select twilio_phone_number, twilio_messaging_service_sid
       from farm_sms_config where farm_id = ?`,
    [farmId],
  );
  const outboundNumber = config?.twilio_phone_number ?? null;

  // Idempotent: if (farm, phone) already exists, return the existing row.
  const existing = await one<SubRow>(
    ctx.env.DB,
    `select * from member_sms_subscriptions
      where farm_id = ? and phone_e164 = ?`,
    [farmId, phone],
  );
  if (existing) {
    return json({
      subscription: existing,
      already_existed: true,
      consent_text_sent: false,
    });
  }

  const id = uuid();
  const now = nowIso();
  await run(
    ctx.env.DB,
    `insert into member_sms_subscriptions
       (id, farm_id, member_user_id, phone_e164, display_name, locale,
        consent_status, outbound_number, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      id, farmId, body.member_user_id ?? null, phone,
      body.display_name?.toString().slice(0, 120) ?? null,
      locale, outboundNumber, now, now,
    ],
  );

  // Send the consent text. If Twilio creds or number aren't configured,
  // the subscription is still recorded — the farmer can configure later
  // and we'll send on demand.
  let consentSent = false;
  if (
    ctx.env.TWILIO_ACCOUNT_SID && ctx.env.TWILIO_AUTH_TOKEN &&
    (outboundNumber || config?.twilio_messaging_service_sid)
  ) {
    const result = await sendSms(ctx.env, {
      from: outboundNumber ?? "",
      to: phone,
      body: consentRequestText({ farmName: farm.name, locale }),
      messagingServiceSid: config?.twilio_messaging_service_sid ?? undefined,
    });
    if (result.ok) {
      consentSent = true;
      const sentNow = nowIso();
      await run(
        ctx.env.DB,
        `update member_sms_subscriptions
            set consent_text_sent_at = ?, updated_at = ?
          where id = ?`,
        [sentNow, sentNow, id],
      );
      // Log the outbound consent message
      await run(
        ctx.env.DB,
        `insert into sms_messages
           (id, farm_id, subscription_id, direction, from_number, to_number,
            body, twilio_message_sid, twilio_status, kind, created_at, updated_at)
         values (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, 'consent_request', ?, ?)`,
        [
          uuid(), farmId, id,
          outboundNumber ?? "messaging_service",
          phone,
          consentRequestText({ farmName: farm.name, locale }),
          result.sid, result.status, sentNow, sentNow,
        ],
      );
    } else {
      console.error("consent send failed:", result.error, result.code);
    }
  }

  const row = await one<SubRow>(
    ctx.env.DB,
    `select * from member_sms_subscriptions where id = ?`,
    [id],
  );
  return json({
    subscription: row,
    already_existed: false,
    consent_text_sent: consentSent,
  });
};

// ----- DELETE -------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;
  const url = new URL(ctx.request.url);
  const farmId = await resolveOperatorFarm(
    ctx.env.DB,
    auth.user.id,
    url.searchParams.get("farm_id"),
  );
  if (!farmId) return json({ error: "No farm." }, 404);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing ?id." }, 400);

  const now = nowIso();
  const result = await run(
    ctx.env.DB,
    `update member_sms_subscriptions
        set consent_status = 'opted_out',
            opted_out_at = ?,
            opted_out_reason = 'farmer_removed',
            updated_at = ?
      where id = ? and farm_id = ?`,
    [now, now, id, farmId],
  );
  if (result.changes === 0) return json({ error: "Not found." }, 404);
  return json({ ok: true });
};
