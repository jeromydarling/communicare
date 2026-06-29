// =============================================================================
// cron-tick — the hourly heartbeat that runs the Tuesday text loop
// =============================================================================
// Cron fires every hour (wrangler.jsonc triggers.crons). For each farm
// whose local day-of-week + hour matches NOW:
//
//   1. Compute the Monday-of-this-week date in the farm's tz; that's
//      the week_starting key.
//   2. For each opted-in subscription on that farm: INSERT OR IGNORE
//      into weekly_offers — the unique (subscription_id, week_starting)
//      index makes re-runs idempotent.
//   3. Send the outbound text via Twilio. Record the sms_messages row
//      and flip weekly_offers.state to 'sent'.
//
// A second pass: expire old offers. For each weekly_offer in (sent)
// state whose sent_at + reply_window_hours is past, transition to the
// farm's auto_action_on_no_reply ('confirm' | 'skip') and mark
// resolved_by='auto'.
//
// We deliberately don't batch outbound sends across farms — each farm's
// sends are serialized so a Twilio failure on farm A doesn't poison
// farm B. At our launch volume this is fine; when a single farm has
// thousands of members we'll move to a queue.
// =============================================================================

import { many, one, run, uuid, nowIso } from "./db";
import { sendSms } from "./sms";
import { weeklyOfferText } from "./sms-templates";

export type CronEnv = {
  DB?: D1Database;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
};

type FarmConfigRow = {
  farm_id: string;
  twilio_phone_number: string | null;
  twilio_messaging_service_sid: string | null;
  send_day_of_week: number;
  send_local_hour: number;
  send_timezone: string;
  reply_window_hours: number;
  auto_action_on_no_reply: "confirm" | "skip";
  is_active: number;
};

type FarmRow = {
  id: string;
  name: string;
};

type SubRow = {
  id: string;
  farm_id: string;
  phone_e164: string;
  locale: "en" | "es";
};

// -----------------------------------------------------------------------------
// Public entry — called from src/worker.ts `scheduled()`
// -----------------------------------------------------------------------------

export async function runCronTick(now: Date, env: CronEnv): Promise<{
  scanned: number;
  fired: number;
  sent: number;
  expired: number;
  errors: string[];
}> {
  if (!env.DB) return { scanned: 0, fired: 0, sent: 0, expired: 0, errors: ["no DB"] };

  const errors: string[] = [];
  let scanned = 0;
  let fired = 0;
  let sent = 0;

  const configs = await many<FarmConfigRow>(
    env.DB,
    `select * from farm_sms_config where is_active = 1`,
  );
  scanned = configs.length;

  for (const cfg of configs) {
    const local = farmLocalParts(now, cfg.send_timezone);
    if (!local) {
      errors.push(`bad tz on farm ${cfg.farm_id}: ${cfg.send_timezone}`);
      continue;
    }
    if (local.dayOfWeek !== cfg.send_day_of_week) continue;
    if (local.hour !== cfg.send_local_hour) continue;
    fired++;

    try {
      const dispatched = await dispatchWeeklyOffers(env, cfg, local);
      sent += dispatched;
    } catch (err) {
      errors.push(
        `dispatch failed for farm ${cfg.farm_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Second pass: expire stale offers regardless of farm send-hour.
  const expired = await expireStaleOffers(env, now);

  return { scanned, fired, sent, expired, errors };
}

// -----------------------------------------------------------------------------
// Per-farm dispatch
// -----------------------------------------------------------------------------

async function dispatchWeeklyOffers(
  env: CronEnv,
  cfg: FarmConfigRow,
  local: ReturnType<typeof farmLocalParts> & object,
): Promise<number> {
  if (!env.DB) return 0;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO credentials missing");
  }
  if (!cfg.twilio_phone_number && !cfg.twilio_messaging_service_sid) {
    throw new Error(`farm ${cfg.farm_id} has no outbound number`);
  }

  const farm = await one<FarmRow>(
    env.DB,
    `select id, name from farms where id = ?`,
    [cfg.farm_id],
  );
  if (!farm) throw new Error(`farm ${cfg.farm_id} not found`);

  const subs = await many<SubRow>(
    env.DB,
    `select id, farm_id, phone_e164, locale
       from member_sms_subscriptions
      where farm_id = ? and consent_status = 'opted_in'`,
    [cfg.farm_id],
  );

  let sentCount = 0;
  for (const sub of subs) {
    try {
      const dispatched = await dispatchOne(env, cfg, farm, sub, local.weekStarting);
      if (dispatched) sentCount++;
    } catch (err) {
      console.error(
        `dispatchOne failed sub=${sub.id} farm=${cfg.farm_id}`,
        err,
      );
    }
  }
  return sentCount;
}

async function dispatchOne(
  env: CronEnv,
  cfg: FarmConfigRow,
  farm: FarmRow,
  sub: SubRow,
  weekStarting: string,
): Promise<boolean> {
  if (!env.DB) return false;

  // Compose the body first so the row's outbound_body matches what Twilio sent.
  const body = weeklyOfferText({
    farmName: farm.name,
    locale: sub.locale,
    // PR 2 keeps shareSummary/pickupHint optional — wired up properly
    // when farmers can configure them. The plain "this week's share"
    // body still gives members an actionable text.
  });

  // INSERT OR IGNORE — duplicate (subscription, week) means we already
  // queued this round in an earlier cron tick.
  const offerId = uuid();
  const now = nowIso();
  const insertRes = await run(
    env.DB,
    `insert or ignore into weekly_offers
       (id, farm_id, subscription_id, week_starting, outbound_body,
        state, created_at, updated_at)
     values (?, ?, ?, ?, ?, 'queued', ?, ?)`,
    [offerId, cfg.farm_id, sub.id, weekStarting, body, now, now],
  );
  if (insertRes.changes === 0) {
    // Already queued (or sent) by an earlier tick.
    return false;
  }

  const result = await sendSms(env as Parameters<typeof sendSms>[0], {
    from: cfg.twilio_phone_number ?? "",
    to: sub.phone_e164,
    body,
    messagingServiceSid: cfg.twilio_messaging_service_sid ?? undefined,
  });

  if (!result.ok) {
    await run(
      env.DB,
      `update weekly_offers
          set state = 'failed', updated_at = ?
        where id = ?`,
      [nowIso(), offerId],
    );
    await run(
      env.DB,
      `insert into sms_messages
         (id, farm_id, subscription_id, related_offer_id, direction,
          from_number, to_number, body, twilio_status, twilio_error_code,
          kind, created_at, updated_at)
       values (?, ?, ?, ?, 'outbound', ?, ?, ?, 'failed', ?, 'weekly_offer', ?, ?)`,
      [
        uuid(), cfg.farm_id, sub.id, offerId,
        cfg.twilio_phone_number ?? "messaging_service",
        sub.phone_e164, body, result.code ?? null,
        nowIso(), nowIso(),
      ],
    );
    return false;
  }

  // Successful send — record sms_messages, flip offer to 'sent'.
  const msgId = uuid();
  const sentNow = nowIso();
  await run(
    env.DB,
    `insert into sms_messages
       (id, farm_id, subscription_id, related_offer_id, direction,
        from_number, to_number, body, twilio_message_sid, twilio_status,
        kind, created_at, updated_at)
     values (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, 'weekly_offer', ?, ?)`,
    [
      msgId, cfg.farm_id, sub.id, offerId,
      cfg.twilio_phone_number ?? "messaging_service",
      sub.phone_e164, body, result.sid, result.status, sentNow, sentNow,
    ],
  );
  await run(
    env.DB,
    `update weekly_offers
        set state = 'sent', outbound_message_id = ?, updated_at = ?
      where id = ?`,
    [msgId, sentNow, offerId],
  );
  return true;
}

// -----------------------------------------------------------------------------
// Expiry pass
// -----------------------------------------------------------------------------

type StaleOfferRow = {
  id: string;
  farm_id: string;
  auto_action_on_no_reply: "confirm" | "skip";
};

async function expireStaleOffers(env: CronEnv, now: Date): Promise<number> {
  if (!env.DB) return 0;

  // Offers in 'sent' state whose age exceeds the farm's reply_window_hours.
  // We do the comparison server-side (in SQL) using the offer's updated_at
  // (set to sent_at on dispatch) so timezone math doesn't fight us.
  const stale = await many<StaleOfferRow>(
    env.DB,
    `select wo.id, wo.farm_id, fsc.auto_action_on_no_reply
       from weekly_offers wo
       join farm_sms_config fsc on fsc.farm_id = wo.farm_id
      where wo.state = 'sent'
        and julianday(?) - julianday(wo.updated_at) >= fsc.reply_window_hours / 24.0`,
    [now.toISOString()],
  );

  let count = 0;
  for (const s of stale) {
    const action = s.auto_action_on_no_reply;
    const finalState = action === "skip" ? "skipped" : "confirmed";
    await run(
      env.DB,
      `update weekly_offers
          set state = ?, resolved_at = ?, resolved_by = 'auto', updated_at = ?
        where id = ?`,
      [finalState, nowIso(), nowIso(), s.id],
    );
    count++;
  }
  return count;
}

// -----------------------------------------------------------------------------
// Timezone helpers — Intl.DateTimeFormat is available in Workers
// -----------------------------------------------------------------------------

type LocalParts = {
  dayOfWeek: number;        // 0=Sun..6=Sat
  hour: number;             // 0..23
  weekStarting: string;     // 'YYYY-MM-DD' of the Monday-of-this-week in tz
};

function farmLocalParts(now: Date, tz: string): LocalParts | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(now);
  } catch {
    return null;
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday"); // "Mon", "Tue", ...
  const hour = parseInt(get("hour"), 10);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (Number.isNaN(hour) || !year || !month || !day || !weekday) return null;
  const dayOfWeek = WEEKDAY_MAP[weekday];
  if (dayOfWeek === undefined) return null;

  // Compute Monday-of-this-week in the farm tz. Subtract (dayOfWeek + 6) % 7
  // days from the date-in-tz. We build a UTC date from the tz-local
  // YMD just to do the day arithmetic — only the date part matters for
  // the weekStarting key.
  const local = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const daysFromMonday = (dayOfWeek + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysFromMonday);
  const ms = `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;

  return { dayOfWeek, hour, weekStarting: ms };
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
