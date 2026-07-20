// =============================================================================
// team-digest — daily summary posted to a Slack or Discord webhook
// =============================================================================
// Once a day (10:00 UTC), summarize what happened at Communicare in
// the last 24 hours: signups, cancels, paid conversions, failed
// payments, high-priority events. Sent to the CROS team's chat via
// an incoming webhook URL configured as a Worker secret
// (TEAM_DIGEST_WEBHOOK_URL).
//
// Slack and Discord accept slightly different payloads. We format for
// Slack ({"text": "..."}) and rely on Discord's default which also
// accepts a "content" key. When the URL host is discord.com we swap
// the field name; otherwise we send Slack's shape. Both surfaces
// render markdown-lite in the message body.
// =============================================================================

import { many, one, nowIso } from "./db";

export type TeamDigestEnv = {
  DB?: D1Database;
  TEAM_DIGEST_WEBHOOK_URL?: string;
};

export async function runTeamDigest(now: Date, env: TeamDigestEnv): Promise<{
  sent: boolean;
  posted_at?: string;
  reason?: string;
}> {
  if (!env.DB || !env.TEAM_DIGEST_WEBHOOK_URL) {
    return { sent: false, reason: "missing DB or TEAM_DIGEST_WEBHOOK_URL" };
  }
  // Guard: only fire at 10:00 UTC (once a day). The scheduled handler
  // runs every hour, so we're the one that decides which hour is "now."
  if (now.getUTCHours() !== 10) {
    return { sent: false, reason: `not the digest hour (utc ${now.getUTCHours()})` };
  }
  const twentyFourAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  const [
    signups,
    paidConversions,
    canceled,
    pastDue,
    smsSent,
    inquiries,
  ] = await Promise.all([
    many<{ email: string; created_at: string }>(
      env.DB,
      `select email, created_at from users where created_at >= ? order by created_at desc`,
      [twentyFourAgo],
    ),
    one<{ n: number }>(
      env.DB,
      `select count(*) as n from users
        where subscription_status = 'active'
          and welcome_email_sent_at >= ?`,
      [twentyFourAgo],
    ),
    many<{ email: string; canceled_at: string }>(
      env.DB,
      `select email, canceled_at from users
        where canceled_at is not null and canceled_at >= ?
        order by canceled_at desc`,
      [twentyFourAgo],
    ),
    one<{ n: number }>(
      env.DB,
      `select count(*) as n from users where subscription_status = 'past_due'`,
    ),
    one<{ n: number }>(
      env.DB,
      `select count(*) as n from sms_messages
        where direction = 'outbound' and created_at >= ?`,
      [twentyFourAgo],
    ),
    one<{ n: number }>(
      env.DB,
      `select count(*) as n from farm_inquiries where sent_at >= ?`,
      [twentyFourAgo],
    ),
  ]);

  const lines: string[] = [];
  lines.push("*Communicare — last 24h*");
  lines.push("");
  lines.push(`• ${signups.length} new signups${signups.length ? ` — ${signups.map((s) => s.email).slice(0, 5).join(", ")}${signups.length > 5 ? "…" : ""}` : ""}`);
  lines.push(`• ${paidConversions?.n ?? 0} newly paid`);
  lines.push(`• ${canceled.length} canceled${canceled.length ? ` — ${canceled.map((c) => c.email).slice(0, 5).join(", ")}${canceled.length > 5 ? "…" : ""}` : ""}`);
  lines.push(`• ${pastDue?.n ?? 0} past-due right now`);
  lines.push(`• ${smsSent?.n ?? 0} SMS sent to members`);
  lines.push(`• ${inquiries?.n ?? 0} discovery inquiries on /find`);

  const isDiscord = /(^|\.)discord\.com/i.test(new URL(env.TEAM_DIGEST_WEBHOOK_URL).host);
  const body = isDiscord
    ? { content: lines.join("\n") }
    : { text: lines.join("\n") };

  try {
    const res = await fetch(env.TEAM_DIGEST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { sent: false, reason: `webhook ${res.status}` };
    }
    return { sent: true, posted_at: nowIso() };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
