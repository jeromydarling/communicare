// =============================================================================
// POST /api/admin/messages — outbound email or SMS to a contact
// =============================================================================
// Body: { subject_user_id, channel: 'email' | 'sms', subject?, body }
// The admin composes; we send via the existing email service or Twilio.
// A row lands in crm_messages for the timeline; the actual delivery
// state (Twilio sid, email provider id) is stored so future statuses
// can update it. For SMS we require a farm-configured Twilio number
// (uses whichever farm the contact owns/staffs) and the contact must
// have a phone on their profile.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { requireAdmin } from "../../_lib/admin";
import { one, run, uuid, nowIso } from "../../_lib/db";
import { sendEmail, type EmailSendBinding } from "../../_lib/email";
import { sendSms, type TwilioEnv } from "../../_lib/sms";
import { normalizeUsPhone } from "../../_lib/phone";

type Env = TwilioEnv & {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  let body: {
    subject_user_id?: string;
    channel?: "email" | "sms";
    subject?: string;
    body?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const subjectId = (body.subject_user_id ?? "").trim();
  const channel = body.channel;
  const text = (body.body ?? "").trim();
  const subject = body.subject?.toString().trim() ?? "";
  if (!subjectId) return json({ error: "subject_user_id required." }, 400);
  if (channel !== "email" && channel !== "sms") {
    return json({ error: "channel must be 'email' or 'sms'." }, 400);
  }
  if (!text) return json({ error: "body required." }, 400);

  const target = await one<{
    id: string;
    email: string;
    display_name: string | null;
    phone: string | null;
  }>(
    db,
    `select u.id, u.email, u.display_name, p.phone
       from users u left join profiles p on p.id = u.id
      where u.id = ?`,
    [subjectId],
  );
  if (!target) return json({ error: "Subject not found." }, 404);

  const now = nowIso();
  const messageId = uuid();
  let externalId: string | null = null;
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;

  if (channel === "email") {
    if (!ctx.env.EMAIL) return json({ error: "EMAIL binding missing." }, 500);
    const res = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
      to: target.email,
      subject: subject || "(no subject) — from Communicare",
      text: text,
      replyTo: ctx.env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
    });
    if (!res.ok) {
      status = "failed";
      error = res.error;
    }
    // The CF Email Service doesn't expose a delivery id via the send_email binding.
  } else {
    // SMS — find the farm the contact owns/staffs to grab its Twilio number.
    if (!ctx.env.TWILIO_ACCOUNT_SID || !ctx.env.TWILIO_AUTH_TOKEN) {
      return json({ error: "TWILIO credentials missing." }, 500);
    }
    const phone = normalizeUsPhone(target.phone);
    if (!phone) return json({ error: "Contact has no valid US phone." }, 400);
    const farmSms = await one<{
      farm_id: string;
      twilio_phone_number: string | null;
      twilio_messaging_service_sid: string | null;
    }>(
      db,
      `select fsc.farm_id, fsc.twilio_phone_number, fsc.twilio_messaging_service_sid
         from farm_sms_config fsc
         join farm_members fm on fm.farm_id = fsc.farm_id
        where fm.user_id = ? and fm.role in ('owner','staff')
          and fm.archived_at is null
        limit 1`,
      [subjectId],
    );
    if (!farmSms?.twilio_phone_number && !farmSms?.twilio_messaging_service_sid) {
      return json({ error: "Contact's farm has no Twilio number configured." }, 400);
    }
    const res = await sendSms(ctx.env, {
      from: farmSms.twilio_phone_number ?? "",
      to: phone,
      body: text,
      messagingServiceSid: farmSms.twilio_messaging_service_sid ?? undefined,
    });
    if (res.ok) externalId = res.sid;
    else {
      status = "failed";
      error = res.error;
    }
  }

  await run(
    db,
    `insert into crm_messages
       (id, subject_user_id, sender_user_id, channel, subject, body,
        external_message_id, status, error, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      messageId, subjectId, guard.user.id, channel,
      channel === "email" ? subject : null,
      text, externalId, status, error, now, now,
    ],
  );

  if (status === "failed") {
    return json({ ok: false, error }, 502);
  }
  return json({ ok: true, id: messageId, external_id: externalId });
};
