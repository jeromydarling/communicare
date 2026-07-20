// =============================================================================
// engagement-cron — hourly pass for onboarding drip, digest, dormant nudge
// =============================================================================
// Runs alongside runCronTick from the same scheduled() handler. Each of
// the three passes is idempotent (guarded by a per-user *_sent_at
// column) so re-firing an hour or a day later is safe.
//
//   1. Onboarding drip: for each active/paid user whose signup was
//      ≥1d / ≥3d / ≥7d ago and who hasn't been sent that letter yet,
//      send it.
//   2. Weekly digest: Monday mornings (UTC 14:00) for each active
//      farmer with a farm, send the last-week counts. Skip if the
//      counts are all zero — no "you did nothing" letters.
//   3. Dormant nudge: for each active/paid user whose last_login_at is
//      more than 7 days ago and dormant_nudge_sent_at is null, send
//      it. On next login the nudge_sent flag is cleared so a re-nudge
//      is possible.
// =============================================================================

import { many, one, run, nowIso } from "./db";
import {
  sendEmail,
  onboardingDayOneEmail,
  onboardingDayThreeEmail,
  onboardingDaySevenEmail,
  dormantNudgeEmail,
  weeklyDigestEmail,
  type EmailSendBinding,
} from "./email";

export type EngagementEnv = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
};

type DripCandidate = {
  id: string;
  email: string;
  display_name: string | null;
  preferred_locale: string | null;
  created_at: string;
};

type DormantCandidate = DripCandidate & {
  last_login_at: string | null;
};

type DigestCandidate = DripCandidate & {
  farm_id: string;
  farm_name: string;
  weekly_digest_last_sent_at: string | null;
};

export async function runEngagementCron(
  now: Date,
  env: EngagementEnv,
): Promise<{
  drip_day1: number;
  drip_day3: number;
  drip_day7: number;
  dormant: number;
  digest: number;
  errors: string[];
}> {
  const summary = { drip_day1: 0, drip_day3: 0, drip_day7: 0, dormant: 0, digest: 0, errors: [] as string[] };
  if (!env.DB) return summary;
  if (!env.EMAIL) {
    summary.errors.push("EMAIL binding missing");
    return summary;
  }
  const db = env.DB;
  const site = (env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");

  // ------------------ Drip -----------------------------------------------
  const day1Cutoff = new Date(now.getTime() - 1 * 86400 * 1000).toISOString();
  const day3Cutoff = new Date(now.getTime() - 3 * 86400 * 1000).toISOString();
  const day7Cutoff = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  summary.drip_day1 = await runDripPass(env, db, site, "day1", day1Cutoff);
  summary.drip_day3 = await runDripPass(env, db, site, "day3", day3Cutoff);
  summary.drip_day7 = await runDripPass(env, db, site, "day7", day7Cutoff);

  // ------------------ Dormant nudge --------------------------------------
  // Only nudge active/paid farmers so we don't harass free-tier signups.
  const sevenAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
  const dormant = await many<DormantCandidate>(
    db,
    `select id, email, display_name, preferred_locale, created_at, last_login_at
       from users
      where subscription_status = 'active'
        and coalesce(last_login_at, created_at) < ?
        and dormant_nudge_sent_at is null
      limit 50`,
    [sevenAgo],
  );
  for (const u of dormant) {
    try {
      const msg = dormantNudgeEmail({
        to: u.email,
        displayName: u.display_name,
        siteUrl: site,
        locale: u.preferred_locale === "es" ? "es" : "en",
      });
      const res = await sendEmail(env.EMAIL, env.SEND_FROM, {
        ...msg,
        replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
      });
      if (res.ok) {
        await run(
          db,
          `update users set dormant_nudge_sent_at = ?, updated_at = ? where id = ?`,
          [nowIso(), nowIso(), u.id],
        );
        summary.dormant++;
      } else {
        summary.errors.push(`dormant to ${u.id}: ${res.error}`);
      }
    } catch (e) {
      summary.errors.push(
        `dormant to ${u.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ------------------ Weekly digest --------------------------------------
  // Monday, 14:00 UTC ≈ 9-10am ET. Skip other hours.
  if (now.getUTCDay() === 1 && now.getUTCHours() === 14) {
    const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
    const cands = await many<DigestCandidate>(
      db,
      `select u.id, u.email, u.display_name, u.preferred_locale, u.created_at,
              f.id as farm_id, f.name as farm_name,
              u.weekly_digest_last_sent_at
         from users u
         join farm_members fm on fm.user_id = u.id
              and fm.role in ('owner','staff') and fm.archived_at is null
         join farms f on f.id = fm.farm_id
        where u.subscription_status = 'active'
          and (u.weekly_digest_last_sent_at is null
               or u.weekly_digest_last_sent_at < ?)
        limit 200`,
      [weekAgo],
    );
    for (const u of cands) {
      try {
        const [offers, replies, newMembers, canceled] = await Promise.all([
          one<{ n: number }>(
            db,
            `select count(*) as n from weekly_offers
              where farm_id = ? and created_at >= ?`,
            [u.farm_id, weekAgo],
          ),
          one<{ n: number }>(
            db,
            `select count(*) as n from weekly_offers
              where farm_id = ? and created_at >= ?
                and reply_received_at is not null`,
            [u.farm_id, weekAgo],
          ),
          one<{ n: number }>(
            db,
            `select count(*) as n from member_sms_subscriptions
              where farm_id = ? and opted_in_at >= ?`,
            [u.farm_id, weekAgo],
          ),
          one<{ n: number }>(
            db,
            `select count(*) as n from member_sms_subscriptions
              where farm_id = ? and opted_out_at >= ?`,
            [u.farm_id, weekAgo],
          ),
        ]);
        const o = offers?.n ?? 0;
        const r = replies?.n ?? 0;
        const nm = newMembers?.n ?? 0;
        const c = canceled?.n ?? 0;
        // Skip if the week was entirely quiet — no "you did nothing" letters.
        if (o + r + nm + c === 0) {
          continue;
        }
        const msg = weeklyDigestEmail({
          to: u.email,
          displayName: u.display_name,
          siteUrl: site,
          farmName: u.farm_name,
          weeklyOffersSent: o,
          repliesReceived: r,
          newMembers: nm,
          canceledMembers: c,
          locale: u.preferred_locale === "es" ? "es" : "en",
        });
        const res = await sendEmail(env.EMAIL, env.SEND_FROM, {
          ...msg,
          replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
        });
        if (res.ok) {
          await run(
            db,
            `update users set weekly_digest_last_sent_at = ?, updated_at = ? where id = ?`,
            [nowIso(), nowIso(), u.id],
          );
          summary.digest++;
        } else {
          summary.errors.push(`digest to ${u.id}: ${res.error}`);
        }
      } catch (e) {
        summary.errors.push(
          `digest to ${u.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  return summary;
}

async function runDripPass(
  env: EngagementEnv,
  db: D1Database,
  site: string,
  stage: "day1" | "day3" | "day7",
  cutoff: string,
): Promise<number> {
  const col =
    stage === "day1"
      ? "onboarding_day1_sent_at"
      : stage === "day3"
        ? "onboarding_day3_sent_at"
        : "onboarding_day7_sent_at";
  const cands = await many<DripCandidate>(
    db,
    `select id, email, display_name, preferred_locale, created_at
       from users
      where created_at <= ?
        and ${col} is null
        and coalesce(subscription_status, 'unpaid') = 'active'
      limit 50`,
    [cutoff],
  );
  let sent = 0;
  for (const u of cands) {
    try {
      const args = {
        to: u.email,
        displayName: u.display_name,
        siteUrl: site,
        locale: (u.preferred_locale === "es" ? "es" : "en") as "es" | "en",
      };
      const msg =
        stage === "day1"
          ? onboardingDayOneEmail(args)
          : stage === "day3"
            ? onboardingDayThreeEmail(args)
            : onboardingDaySevenEmail(args);
      const res = await sendEmail(env.EMAIL!, env.SEND_FROM, {
        ...msg,
        replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
      });
      if (res.ok) {
        await run(
          db,
          `update users set ${col} = ?, updated_at = ? where id = ?`,
          [nowIso(), nowIso(), u.id],
        );
        sent++;
      }
    } catch {
      /* continue with the rest of the batch */
    }
  }
  return sent;
}
