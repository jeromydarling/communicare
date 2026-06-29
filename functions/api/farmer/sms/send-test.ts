// =============================================================================
// /api/farmer/sms/send-test — farmer pings their own phone
// =============================================================================
// First-call sanity check: the farmer enters their own phone, we send
// "Communicare test from <farm>. If you can see this, the SMS line is
// alive." Goes through the farm's outbound number using the same code
// path the weekly cron will. If this works, the loop will work.
//
// Rate-limited 5/hr/user to prevent the test endpoint from becoming an
// SMS spammer (Twilio bills regardless of our intent).
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, run, uuid, nowIso } from "../../../_lib/db";
import { rateLimit } from "../../../_lib/ratelimit";
import { normalizeUsPhone } from "../../../_lib/phone";
import { sendSms } from "../../../_lib/sms";
import { farmerTestText } from "../../../_lib/sms-templates";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: `sms-test:${auth.user.id}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: { phone?: string; farm_id?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const phone = normalizeUsPhone(body.phone);
  if (!phone) return json({ error: "Valid US phone required." }, 400);

  const farmId = await resolveOperatorFarm(
    ctx.env.DB, auth.user.id, body.farm_id ?? null,
  );
  if (!farmId) return json({ error: "No farm." }, 404);

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
  if (!outboundNumber && !config?.twilio_messaging_service_sid) {
    return json(
      {
        error: "Set a Twilio number (or messaging service SID) for this farm before testing.",
      },
      400,
    );
  }
  if (!ctx.env.TWILIO_ACCOUNT_SID || !ctx.env.TWILIO_AUTH_TOKEN) {
    return json({ error: "Twilio credentials not configured." }, 500);
  }

  const text = farmerTestText({ farmName: farm.name });
  const result = await sendSms(ctx.env, {
    from: outboundNumber ?? "",
    to: phone,
    body: text,
    messagingServiceSid: config?.twilio_messaging_service_sid ?? undefined,
  });

  // Log either way — failed sends are useful diagnostics.
  const now = nowIso();
  await run(
    ctx.env.DB,
    `insert into sms_messages
       (id, farm_id, direction, from_number, to_number, body,
        twilio_message_sid, twilio_status, twilio_error_code,
        kind, created_at, updated_at)
     values (?, ?, 'outbound', ?, ?, ?, ?, ?, ?, 'other', ?, ?)`,
    [
      uuid(), farmId,
      outboundNumber ?? "messaging_service", phone, text,
      result.ok ? result.sid : null,
      result.ok ? result.status : "failed",
      result.ok ? null : (result.code ?? null),
      now, now,
    ],
  );

  if (!result.ok) {
    return json({ error: `Send failed: ${result.error}`, code: result.code }, 502);
  }
  return json({ ok: true, sid: result.sid, status: result.status });
};
