// =============================================================================
// /api/farmer/sms/config — per-farm SMS settings (number, schedule, policy)
// =============================================================================
//   GET → returns the current config (creates a row with defaults on first
//         call so the dashboard always has something to render)
//   PUT → updates settable fields. Owner/staff only.
//
// The Twilio phone number itself is not yet assignable from here — that
// belongs to a future onboarding step that purchases a number via the
// Twilio API. For PR 2 we let the farmer SET twilio_phone_number
// directly if they bought one manually, and let is_active be flipped.
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, run, nowIso } from "../../../_lib/db";
import { normalizeUsPhone } from "../../../_lib/phone";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type ConfigRow = {
  farm_id: string;
  twilio_phone_number: string | null;
  twilio_phone_number_sid: string | null;
  twilio_messaging_service_sid: string | null;
  send_day_of_week: number;
  send_local_hour: number;
  send_timezone: string;
  reply_window_hours: number;
  auto_action_on_no_reply: "confirm" | "skip";
  is_active: number;
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

  let row = await one<ConfigRow>(
    ctx.env.DB,
    `select * from farm_sms_config where farm_id = ?`,
    [farmId],
  );
  if (!row) {
    // Lazy-create the default row so the dashboard always has shape.
    const now = nowIso();
    await run(
      ctx.env.DB,
      `insert into farm_sms_config (farm_id, created_at, updated_at)
         values (?, ?, ?)`,
      [farmId, now, now],
    );
    row = await one<ConfigRow>(
      ctx.env.DB,
      `select * from farm_sms_config where farm_id = ?`,
      [farmId],
    );
  }
  return json({ config: row });
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
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
    twilio_phone_number?: string | null;
    send_day_of_week?: number;
    send_local_hour?: number;
    send_timezone?: string;
    reply_window_hours?: number;
    auto_action_on_no_reply?: "confirm" | "skip";
    is_active?: boolean;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.twilio_phone_number !== undefined) {
    const norm = body.twilio_phone_number === null
      ? null
      : normalizeUsPhone(body.twilio_phone_number);
    if (body.twilio_phone_number !== null && !norm) {
      return json({ error: "Invalid US phone for twilio_phone_number." }, 400);
    }
    updates.push("twilio_phone_number = ?");
    params.push(norm);
  }
  if (body.send_day_of_week !== undefined) {
    if (!Number.isInteger(body.send_day_of_week) || body.send_day_of_week < 0 || body.send_day_of_week > 6) {
      return json({ error: "send_day_of_week must be 0..6." }, 400);
    }
    updates.push("send_day_of_week = ?");
    params.push(body.send_day_of_week);
  }
  if (body.send_local_hour !== undefined) {
    if (!Number.isInteger(body.send_local_hour) || body.send_local_hour < 0 || body.send_local_hour > 23) {
      return json({ error: "send_local_hour must be 0..23." }, 400);
    }
    updates.push("send_local_hour = ?");
    params.push(body.send_local_hour);
  }
  if (body.send_timezone !== undefined) {
    // Trust IANA names; validate by trying Intl.DateTimeFormat.
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.send_timezone });
    } catch {
      return json({ error: "Unknown IANA timezone." }, 400);
    }
    updates.push("send_timezone = ?");
    params.push(body.send_timezone);
  }
  if (body.reply_window_hours !== undefined) {
    if (!Number.isInteger(body.reply_window_hours) || body.reply_window_hours < 1 || body.reply_window_hours > 168) {
      return json({ error: "reply_window_hours must be 1..168." }, 400);
    }
    updates.push("reply_window_hours = ?");
    params.push(body.reply_window_hours);
  }
  if (body.auto_action_on_no_reply !== undefined) {
    if (body.auto_action_on_no_reply !== "confirm" && body.auto_action_on_no_reply !== "skip") {
      return json({ error: "auto_action_on_no_reply must be 'confirm' or 'skip'." }, 400);
    }
    updates.push("auto_action_on_no_reply = ?");
    params.push(body.auto_action_on_no_reply);
  }
  if (body.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(body.is_active ? 1 : 0);
  }
  if (updates.length === 0) {
    return json({ error: "Nothing to update." }, 400);
  }

  const now = nowIso();
  // Upsert: lazy-create the row if missing so PUT doesn't need a prior GET.
  await run(
    ctx.env.DB,
    `insert into farm_sms_config (farm_id, created_at, updated_at)
       values (?, ?, ?)
     on conflict(farm_id) do nothing`,
    [farmId, now, now],
  );
  updates.push("updated_at = ?");
  params.push(now);
  params.push(farmId);
  await run(
    ctx.env.DB,
    `update farm_sms_config set ${updates.join(", ")} where farm_id = ?`,
    params,
  );

  const row = await one<ConfigRow>(
    ctx.env.DB,
    `select * from farm_sms_config where farm_id = ?`,
    [farmId],
  );
  return json({ config: row });
};
