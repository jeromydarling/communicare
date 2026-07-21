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
  herdShareReminderEmail,
  anniversaryEmail,
  endOfSeasonEmail,
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
  herdshare: number;
  anniversary: number;
  end_of_season: number;
  errors: string[];
}> {
  const summary = {
    drip_day1: 0,
    drip_day3: 0,
    drip_day7: 0,
    dormant: 0,
    digest: 0,
    herdshare: 0,
    anniversary: 0,
    end_of_season: 0,
    errors: [] as string[],
  };
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

  // ------------------ Herd-share monthly check-in ------------------------
  // First-of-month, 14:00 UTC. For each active farmer whose farm.kind is
  // 'raw_milk_herd_share', send the monthly reminder. Guarded by a
  // per-user column so a re-run within the same month is a no-op.
  if (now.getUTCDate() === 1 && now.getUTCHours() === 14) {
    const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
    const cands = await many<{
      id: string;
      email: string;
      display_name: string | null;
      preferred_locale: string | null;
      farm_name: string;
      herdshare_state: string | null;
    }>(
      db,
      `select u.id, u.email, u.display_name, u.preferred_locale,
              f.name as farm_name, f.herdshare_state
         from users u
         join farm_members fm on fm.user_id = u.id
              and fm.role in ('owner','staff') and fm.archived_at is null
         join farms f on f.id = fm.farm_id
        where u.subscription_status = 'active'
          and f.kind = 'raw_milk_herd_share'
          and (u.weekly_digest_last_sent_at is null
               or strftime('%Y-%m', u.weekly_digest_last_sent_at) != ?)
        limit 100`,
      [monthKey],
    );
    // Reusing weekly_digest_last_sent_at as the "last sent this month"
    // stamp — the herd-share reminder is monthly and never conflicts
    // with the digest schedule (Mondays 14:00 vs 1st-of-month 14:00).
    for (const u of cands) {
      try {
        const msg = herdShareReminderEmail({
          to: u.email,
          displayName: u.display_name,
          farmName: u.farm_name,
          siteUrl: site,
          herdshareState: u.herdshare_state,
          locale: u.preferred_locale === "es" ? "es" : "en",
        });
        const res = await sendEmail(env.EMAIL!, env.SEND_FROM, {
          ...msg,
          replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
        });
        if (res.ok) {
          await run(
            db,
            `update users set weekly_digest_last_sent_at = ?, updated_at = ? where id = ?`,
            [nowIso(), nowIso(), u.id],
          );
          summary.herdshare++;
        }
      } catch (e) {
        summary.errors.push(
          `herdshare to ${u.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  // ------------------ Anniversary — one per year of signup --------------
  // Runs on the user's signup month-day at 14:00 UTC. Idempotency key
  // per year: "anniversary:<N>" where N is years since signup.
  if (now.getUTCHours() === 14) {
    const monthDay = `${(now.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
    const anniversaries = await many<{
      id: string;
      email: string;
      display_name: string | null;
      preferred_locale: string | null;
      created_at: string;
      lifecycle_last_sent_key: string | null;
    }>(
      db,
      `select id, email, display_name, preferred_locale, created_at,
              lifecycle_last_sent_key
         from users
        where subscription_status = 'active'
          and substr(created_at, 6, 5) = ?
          and created_at < ?
        limit 100`,
      [
        monthDay,
        new Date(now.getTime() - 365 * 86400 * 1000).toISOString(),
      ],
    );
    for (const u of anniversaries) {
      const yearNumber = Math.floor(
        (now.getTime() - new Date(u.created_at).getTime()) /
          (365.25 * 86400 * 1000),
      );
      if (yearNumber < 1) continue;
      const key = `anniversary:${yearNumber}`;
      if (u.lifecycle_last_sent_key === key) continue;
      try {
        const msg = anniversaryEmail({
          to: u.email,
          displayName: u.display_name,
          siteUrl: site,
          yearNumber,
          locale: u.preferred_locale === "es" ? "es" : "en",
        });
        const res = await sendEmail(env.EMAIL!, env.SEND_FROM, {
          ...msg,
          replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
        });
        if (res.ok) {
          await run(
            db,
            `update users set lifecycle_last_sent_key = ?, updated_at = ? where id = ?`,
            [key, nowIso(), u.id],
          );
          summary.anniversary++;
        }
      } catch (e) {
        summary.errors.push(
          `anniversary to ${u.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  // ------------------ End-of-season summary -----------------------------
  // Season endings by farm kind (northern hemisphere defaults; U.S.
  // launch scope). October 15 for veg CSAs, November 15 for meat/eggs,
  // 14:00 UTC. Idempotency key per year: "endofseason:<YYYY>".
  const seasonHitsToday = (): { kind: string; day: number; month: number } | null => {
    if (now.getUTCHours() !== 14) return null;
    const md = { m: now.getUTCMonth() + 1, d: now.getUTCDate() };
    if (md.m === 10 && md.d === 15) return { kind: "vegetable_csa", day: 15, month: 10 };
    if (md.m === 11 && md.d === 15) return { kind: "pastured_meat", day: 15, month: 11 };
    return null;
  };
  const hit = seasonHitsToday();
  if (hit) {
    const year = now.getUTCFullYear();
    const key = `endofseason:${year}:${hit.kind}`;
    const weekAgo = new Date(now.getTime() - 30 * 7 * 86400 * 1000).toISOString(); // full 30-week window
    const cands = await many<{
      id: string;
      email: string;
      display_name: string | null;
      preferred_locale: string | null;
      farm_id: string;
      farm_name: string;
      lifecycle_last_sent_key: string | null;
    }>(
      db,
      `select u.id, u.email, u.display_name, u.preferred_locale,
              f.id as farm_id, f.name as farm_name,
              u.lifecycle_last_sent_key
         from users u
         join farm_members fm on fm.user_id = u.id
              and fm.role in ('owner','staff') and fm.archived_at is null
         join farms f on f.id = fm.farm_id
        where u.subscription_status = 'active'
          and f.kind = ?
        limit 200`,
      [hit.kind],
    );
    for (const u of cands) {
      if (u.lifecycle_last_sent_key === key) continue;
      try {
        const [weeks, membersServed, replies] = await Promise.all([
          one<{ n: number }>(
            db,
            `select count(distinct week_starting) as n from weekly_offers
              where farm_id = ? and created_at >= ?`,
            [u.farm_id, weekAgo],
          ),
          one<{ n: number }>(
            db,
            `select count(distinct subscription_id) as n from weekly_offers
              where farm_id = ? and state in ('sent','confirmed','swapped','gifted')
                and created_at >= ?`,
            [u.farm_id, weekAgo],
          ),
          one<{ n: number }>(
            db,
            `select count(*) as n from weekly_offers
              where farm_id = ? and reply_received_at is not null
                and created_at >= ?`,
            [u.farm_id, weekAgo],
          ),
        ]);
        const w = weeks?.n ?? 0;
        if (w === 0) continue; // no season data, no letter
        const msg = endOfSeasonEmail({
          to: u.email,
          displayName: u.display_name,
          farmName: u.farm_name,
          siteUrl: site,
          weeksOffered: w,
          membersServed: membersServed?.n ?? 0,
          totalReplies: replies?.n ?? 0,
          locale: u.preferred_locale === "es" ? "es" : "en",
        });
        const res = await sendEmail(env.EMAIL!, env.SEND_FROM, {
          ...msg,
          replyTo: env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
        });
        if (res.ok) {
          await run(
            db,
            `update users set lifecycle_last_sent_key = ?, updated_at = ? where id = ?`,
            [key, nowIso(), u.id],
          );
          summary.end_of_season++;
        }
      } catch (e) {
        summary.errors.push(
          `endofseason to ${u.id}: ${e instanceof Error ? e.message : String(e)}`,
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
