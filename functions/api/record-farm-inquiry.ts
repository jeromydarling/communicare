// =============================================================================
// /api/record-farm-inquiry — Workers-native "send them a note" send
// =============================================================================
// Member sends a note to a discovered (unclaimed) farm through /find.
// We:
//   1. Validate input + rate-limit
//   2. Confirm the farm exists and isn't opted out
//   3. Insert into farm_inquiries
//   4. Bump discovered_farms.inquiry_count + last_inquiry_at (Postgres
//      had a trigger; D1 doesn't, so we do it explicitly in a batch
//      with the insert)
//   5. If the farm has an email and we haven't ever sent them an
//      outreach email, send one — the one-time "a neighbor reached
//      out through Communicare" note + a /claim link. Marked via
//      first_inquiry_email_sent_at so it never sends again.
//   6. Always forward the actual inquiry to the farm's email when we
//      have one. Reply-To is the sender's email so the farm can
//      reply directly.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";
import { sendEmail, type EmailSendBinding } from "../_lib/email";
import { one, run, uuid, nowIso } from "../_lib/db";
import { CLOSING_BLESSING } from "../../lib/brand-strings";

type Env = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
  RATELIMIT?: KVNamespace;
};

type RequestBody = {
  discoveredFarmId?: string;
  senderName?: string;
  senderEmail?: string;
  senderZip?: string;
  subject?: string;
  body?: string;
};

type FarmRow = {
  id: string;
  slug: string | null;
  name: string;
  email: string | null;
  opted_out_at: string | null;
  first_inquiry_email_sent_at: string | null;
  claimed_at: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  const db = ctx.env.DB;

  // Gate 1: per-IP (covers a script blasting many listings)
  const ipKey = ipBucket(ctx.request, "inquiry-ip");
  const ipGate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipKey,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!ipGate.ok) return ipGate.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const discoveredFarmId = (body.discoveredFarmId ?? "").trim();
  const senderName = (body.senderName ?? "").trim();
  const senderEmail = (body.senderEmail ?? "").trim();
  const senderZip = body.senderZip?.toString().trim() || null;
  const subject =
    body.subject?.toString().trim() ||
    "A note from a neighbor — found you through Communicare";
  const text = (body.body ?? "").trim();

  if (!discoveredFarmId) return json({ error: "Missing discoveredFarmId." }, 400);
  if (senderName.length < 1 || senderName.length > 120) {
    return json({ error: "Sender name is required." }, 400);
  }
  if (!/.+@.+\..+/.test(senderEmail)) {
    return json({ error: "Valid sender email required." }, 400);
  }
  if (text.length < 10 || text.length > 4000) {
    return json({ error: "Note must be between 10 and 4000 characters." }, 400);
  }

  // Gate 2: per-(IP, farm) — blocks repeated sends to the same listing
  const farmGate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: `${ipKey}:${discoveredFarmId}`,
    limit: 1,
    windowSeconds: 60 * 60,
  });
  if (!farmGate.ok) return farmGate.response;

  // 1. Confirm the farm exists and isn't opted out
  const farm = await one<FarmRow>(
    db,
    `select id, slug, name, email, opted_out_at,
            first_inquiry_email_sent_at, claimed_at
       from discovered_farms where id = ?`,
    [discoveredFarmId],
  );
  if (!farm) return json({ error: "Farm not found." }, 404);
  if (farm.opted_out_at) {
    return json({ error: "This farm has asked not to receive inquiries." }, 410);
  }

  // 2. Insert the inquiry + bump the discovered_farms counter in one
  //    D1 batch. Atomic per the D1 batch contract.
  const inquiryId = uuid();
  const now = nowIso();
  await db.batch([
    db.prepare(
      `insert into farm_inquiries
         (id, discovered_farm_id, sender_name, sender_email,
          sender_zip, subject, body, channel, status, sent_at)
       values (?, ?, ?, ?, ?, ?, ?, 'email', 'sent', ?)`,
    ).bind(
      inquiryId, farm.id, senderName, senderEmail.toLowerCase(),
      senderZip, subject, text, now,
    ),
    db.prepare(
      `update discovered_farms
          set inquiry_count = inquiry_count + 1,
              last_inquiry_at = ?,
              updated_at = ?
        where id = ?`,
    ).bind(now, now, farm.id),
  ]);

  // 3. Email-side work. Two independent flags so a deploy without
  //    EMAIL still records the inquiry and returns a mailto fallback.
  const result: {
    ok: true;
    inquiryEmailed: boolean;
    farmEmailed: boolean;
    fallback: "mailto" | null;
    mailtoHref?: string;
  } = {
    ok: true,
    inquiryEmailed: false,
    farmEmailed: false,
    fallback: null,
  };

  if (ctx.env.EMAIL && farm.email) {
    // Forward the inquiry to the farm with Reply-To = sender
    const inquiryEmail = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
      to: farm.email,
      subject,
      text: `${text}\n\n— ${senderName}\n(Sent through Communicare's farm finder. Reply directly to this email to write back.)`,
      replyTo: senderEmail,
    });
    result.inquiryEmailed = inquiryEmail.ok;

    // One-time outreach to the farm itself — only the FIRST inquiry
    // ever, and only if the farm hasn't already claimed their listing.
    if (!farm.first_inquiry_email_sent_at && !farm.claimed_at) {
      const siteBase = (ctx.env.SITE_URL ?? "https://mycommuni.care").replace(/\/+$/, "");
      const claimUrl = `${siteBase}/claim?slug=${encodeURIComponent(farm.slug ?? farm.id)}`;
      const outreach = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
        to: farm.email,
        subject: `A neighbor just asked about ${farm.name} through Communicare`,
        text: outreachBody({
          farmName: farm.name,
          senderName,
          senderZip,
          claimUrl,
        }),
        replyTo: ctx.env.SYSTEM_REPLY_TO,
      });
      result.farmEmailed = outreach.ok;
      if (outreach.ok) {
        await run(
          db,
          `update discovered_farms set first_inquiry_email_sent_at = ? where id = ?`,
          [now, farm.id],
        );
      }
    }
  } else if (farm.email) {
    // No EMAIL binding — return a mailto: handoff for the client to
    // open the visitor's own mail app.
    const subj = encodeURIComponent(subject);
    const b = encodeURIComponent(`${text}\n\n— ${senderName}`);
    result.fallback = "mailto";
    result.mailtoHref = `mailto:${farm.email}?subject=${subj}&body=${b}`;
  }

  return json(result);
};

function outreachBody(opts: {
  farmName: string;
  senderName: string;
  senderZip: string | null;
  claimUrl: string;
}): string {
  const where = opts.senderZip ? ` in ${opts.senderZip}` : "";
  return `Hi —

A neighbor named ${opts.senderName}${where} just sent you a note about your farm. They found you through a small directory we run at mycommuni.care.

We're writing once, briefly, because we think you should know it's reaching the people you're growing for.

If you ever want better tools for managing the people you feed — text messages instead of email threads, swaps instead of spreadsheets, no setup fee, no contract — we built one for nine dollars a month. The directory listing is yours either way, and you can claim it here whenever you'd like:

${opts.claimUrl}

That's the whole pitch. We won't write again.

${CLOSING_BLESSING}
— Communicare
For the farms that feed us.
`;
}
