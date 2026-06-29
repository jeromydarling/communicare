// =============================================================================
// /api/sms/inbound — Twilio webhook for member replies
// =============================================================================
// Twilio POSTs this URL whenever a member texts a farm's outbound
// number. The flow:
//
//   1. Verify X-Twilio-Signature against the raw form body. Anyone
//      can spoof a POST, but only Twilio knows the auth token, so
//      HMAC-SHA1 of url+sortedParams gates entry.
//   2. Match To (the receiving Twilio number) to a farm_sms_config row.
//   3. Match From (the member's phone) to a member_sms_subscriptions row
//      for that farm.
//   4. Parse the intent (strict regex first, Llama fallback for the
//      natural-language SWAP / GIFT cases that didn't match cleanly).
//   5. Apply the intent:
//        - YES (pre-consent): flip to opted_in, save opted_in_message_sid
//        - STOP / opt-out: opted_out + acknowledgment
//        - HELP: send the keyword cheatsheet
//        - For opted-in subs with an open weekly_offer in 'sent':
//            CONFIRM → state='confirmed'
//            SKIP    → state='skipped'
//            PAUSE   → state='paused' + subscription quiet flag
//            SWAP    → state='swapped' + swap_details
//            GIFT    → state='gifted' + gift_recipient_*
//        - UNKNOWN: HELP ack
//   6. Send the ack via Twilio REST API (NOT via TwiML). Keeps every
//      outbound consistent with the cron path and creates a uniform
//      audit trail in sms_messages.
//   7. Return empty <Response/> TwiML — Twilio expects 200 OK.
//
// Idempotency: if Twilio retries the same MessageSid (network blip on
// their side), the unique index on sms_messages.twilio_message_sid
// blocks the second insert. We detect that and short-circuit without
// reprocessing.
// =============================================================================

import {
  verifyTwilioSignature,
  readTwilioForm,
  emptyTwimlResponse,
  sendSms,
} from "../../_lib/sms";
import { parseIntentSmart } from "../../_lib/sms-parse";
import { replyAck } from "../../_lib/sms-templates";
import { normalizeUsPhone } from "../../_lib/phone";
import { one, run, uuid, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  AI?: Ai;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
};

type FarmConfigRow = {
  farm_id: string;
  twilio_phone_number: string | null;
  twilio_messaging_service_sid: string | null;
};

type SubRow = {
  id: string;
  farm_id: string;
  phone_e164: string;
  consent_status: "pending" | "opted_in" | "opted_out";
  locale: "en" | "es";
};

type OpenOfferRow = {
  id: string;
  farm_id: string;
  state: string;
};

type FarmRow = { id: string; name: string };

// -----------------------------------------------------------------------------
// Entry — Twilio always POSTs
// -----------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return emptyTwimlResponse();
  if (!ctx.env.TWILIO_ACCOUNT_SID || !ctx.env.TWILIO_AUTH_TOKEN) {
    console.error("inbound: TWILIO creds missing — ignoring webhook");
    return emptyTwimlResponse();
  }

  // ---- 1. Signature verify ------------------------------------------------
  const signature = ctx.request.headers.get("x-twilio-signature");
  if (!signature) {
    console.warn("inbound: no signature header");
    return new Response("forbidden", { status: 403 });
  }

  // We need to read the body BOTH for params (to verify) and to
  // process. Twilio sends form-urlencoded, so we parse once.
  const params = await readTwilioForm(ctx.request);
  const fullUrl = ctx.request.url;
  const sigOk = await verifyTwilioSignature(
    ctx.env.TWILIO_AUTH_TOKEN,
    fullUrl,
    params,
    signature,
  );
  if (!sigOk) {
    console.warn("inbound: signature mismatch", { fullUrl });
    return new Response("forbidden", { status: 403 });
  }

  // Sanity: ensure the request says it's for our account.
  if (params.AccountSid && params.AccountSid !== ctx.env.TWILIO_ACCOUNT_SID) {
    console.warn("inbound: AccountSid mismatch", params.AccountSid);
    return new Response("forbidden", { status: 403 });
  }

  const messageSid = params.MessageSid ?? params.SmsMessageSid ?? "";
  const fromRaw = params.From ?? "";
  const toRaw = params.To ?? "";
  const body = params.Body ?? "";
  if (!messageSid || !fromRaw || !toRaw) {
    return emptyTwimlResponse();
  }

  const from = normalizeUsPhone(fromRaw) ?? fromRaw;
  const to = normalizeUsPhone(toRaw) ?? toRaw;

  // ---- 2. Match `To` → farm ----------------------------------------------
  const farmConfig = await one<FarmConfigRow>(
    ctx.env.DB,
    `select farm_id, twilio_phone_number, twilio_messaging_service_sid
       from farm_sms_config
      where twilio_phone_number = ?
         or twilio_messaging_service_sid = ?
      limit 1`,
    [to, params.MessagingServiceSid ?? ""],
  );
  if (!farmConfig) {
    console.warn("inbound: no farm matches To", { to });
    // Still 200 — Twilio doesn't need to retry.
    return emptyTwimlResponse();
  }

  // ---- Idempotency: have we already logged this MessageSid? --------------
  const existing = await one<{ id: string }>(
    ctx.env.DB,
    `select id from sms_messages where twilio_message_sid = ?`,
    [messageSid],
  );
  if (existing) return emptyTwimlResponse();

  // ---- 3. Match `From` → subscription ------------------------------------
  let sub = await one<SubRow>(
    ctx.env.DB,
    `select id, farm_id, phone_e164, consent_status, locale
       from member_sms_subscriptions
      where farm_id = ? and phone_e164 = ?`,
    [farmConfig.farm_id, from],
  );
  const farm = await one<FarmRow>(
    ctx.env.DB,
    `select id, name from farms where id = ?`,
    [farmConfig.farm_id],
  );
  const farmName = farm?.name ?? "Communicare";

  // Log the inbound regardless of whether we can match the sender.
  const inboundMsgId = uuid();
  const nowStamp = nowIso();
  await run(
    ctx.env.DB,
    `insert into sms_messages
       (id, farm_id, subscription_id, direction, from_number, to_number,
        body, twilio_message_sid, twilio_status, kind, created_at, updated_at)
     values (?, ?, ?, 'inbound', ?, ?, ?, ?, 'received', 'weekly_reply', ?, ?)`,
    [
      inboundMsgId, farmConfig.farm_id, sub?.id ?? null,
      from, to, body, messageSid, nowStamp, nowStamp,
    ],
  );

  if (!sub) {
    // Unknown sender for this farm. Don't auto-reply (could be a spammer).
    return emptyTwimlResponse();
  }

  // ---- 4. Parse intent ----------------------------------------------------
  const parsed = await parseIntentSmart(body, ctx.env);

  // ---- 5. Apply intent ----------------------------------------------------
  const ack = await applyIntent({
    db: ctx.env.DB,
    sub,
    farmName,
    parsed,
    inboundMessageSid: messageSid,
    inboundMessageId: inboundMsgId,
  });

  // ---- 6. Send ack via REST so it lands in sms_messages ------------------
  if (ack && (farmConfig.twilio_phone_number || farmConfig.twilio_messaging_service_sid)) {
    const result = await sendSms(ctx.env, {
      from: farmConfig.twilio_phone_number ?? "",
      to: from,
      body: ack.text,
      messagingServiceSid: farmConfig.twilio_messaging_service_sid ?? undefined,
    });
    const ackId = uuid();
    const ackNow = nowIso();
    if (result.ok) {
      await run(
        ctx.env.DB,
        `insert into sms_messages
           (id, farm_id, subscription_id, related_offer_id, direction,
            from_number, to_number, body, twilio_message_sid,
            twilio_status, kind, created_at, updated_at)
         values (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ackId, sub.farm_id, sub.id, ack.relatedOfferId ?? null,
          farmConfig.twilio_phone_number ?? "messaging_service",
          from, ack.text, result.sid, result.status, ack.kind, ackNow, ackNow,
        ],
      );
    } else {
      console.warn("ack send failed", result);
    }
  }

  // ---- 7. Empty TwiML ----------------------------------------------------
  return emptyTwimlResponse();
};

// -----------------------------------------------------------------------------
// Intent application
// -----------------------------------------------------------------------------

type ApplyArgs = {
  db: D1Database;
  sub: SubRow;
  farmName: string;
  parsed: Awaited<ReturnType<typeof parseIntentSmart>>;
  inboundMessageSid: string;
  inboundMessageId: string;
};

type AckPlan = {
  text: string;
  kind:
    | "consent_confirmation" | "stop_ack" | "help_ack"
    | "weekly_confirmation" | "other";
  relatedOfferId?: string;
};

async function applyIntent(args: ApplyArgs): Promise<AckPlan | null> {
  const { db, sub, farmName, parsed, inboundMessageSid, inboundMessageId } = args;
  const now = nowIso();

  // ---- Federal: STOP always wins, regardless of consent_status ----------
  if (parsed.intent === "stop") {
    await run(
      db,
      `update member_sms_subscriptions
          set consent_status = 'opted_out',
              opted_out_at = ?,
              opted_out_reason = 'stop_keyword',
              updated_at = ?
        where id = ?`,
      [now, now, sub.id],
    );
    return {
      text: replyAck({ intent: "stop", farmName, locale: sub.locale }),
      kind: "stop_ack",
    };
  }

  if (parsed.intent === "help") {
    return {
      text: replyAck({ intent: "help", farmName, locale: sub.locale }),
      kind: "help_ack",
    };
  }

  // ---- Consent state branching ------------------------------------------
  if (sub.consent_status === "pending") {
    // Only YES / START accepted before opt-in. Anything else gets a HELP-y
    // ack but the subscription stays pending.
    if (parsed.intent === "confirm" || parsed.intent === "start") {
      await run(
        db,
        `update member_sms_subscriptions
            set consent_status = 'opted_in',
                opted_in_at = ?,
                opted_in_message_sid = ?,
                updated_at = ?
          where id = ?`,
        [now, inboundMessageSid, now, sub.id],
      );
      return {
        text:
          sub.locale === "es"
            ? `Bienvenido. ${farmName} le escribirá cada semana.`
            : `Welcome. ${farmName} will text you each week.`,
        kind: "consent_confirmation",
      };
    }
    return {
      text:
        sub.locale === "es"
          ? `Estamos esperando su confirmación. Responda SÍ para suscribirse a ${farmName}, o BASTA para no recibir más.`
          : `We're waiting on your confirmation. Reply YES to subscribe to ${farmName}, or STOP to opt out.`,
      kind: "help_ack",
    };
  }

  if (sub.consent_status === "opted_out") {
    if (parsed.intent === "start") {
      await run(
        db,
        `update member_sms_subscriptions
            set consent_status = 'opted_in',
                opted_in_at = ?,
                opted_out_at = null,
                opted_out_reason = null,
                updated_at = ?
          where id = ?`,
        [now, now, sub.id],
      );
      return {
        text:
          sub.locale === "es"
            ? `Bienvenido de vuelta. ${farmName} le escribirá el próximo martes.`
            : `Welcome back. ${farmName} will text again next Tuesday.`,
        kind: "consent_confirmation",
      };
    }
    // Don't reply at all to an opted-out sender — that's the whole point.
    return null;
  }

  // ---- Opted-in path ----------------------------------------------------
  // Find the most recent open offer (state in queued, sent) for this sub.
  const open = await one<OpenOfferRow>(
    db,
    `select id, farm_id, state
       from weekly_offers
      where subscription_id = ? and state in ('queued', 'sent')
      order by week_starting desc
      limit 1`,
    [sub.id],
  );

  // PAUSE/RESUME act on the subscription (not the offer) and always work.
  if (parsed.intent === "pause") {
    // Mark any open offer as paused; subsequent ticks won't queue new offers
    // for this sub until they resume.
    if (open) {
      await markOfferResolved(db, open.id, "paused", "member_reply", inboundMessageId);
    }
    // We also flip consent_status to 'opted_out' but with a 'paused' reason
    // so the resume keyword can flip it back. Simpler than a separate flag.
    await run(
      db,
      `update member_sms_subscriptions
          set consent_status = 'opted_out',
              opted_out_at = ?,
              opted_out_reason = 'paused',
              updated_at = ?
        where id = ?`,
      [now, now, sub.id],
    );
    return {
      text: replyAck({ intent: "pause", farmName, locale: sub.locale }),
      kind: "weekly_confirmation",
      relatedOfferId: open?.id,
    };
  }

  if (parsed.intent === "resume") {
    // No-op for already opted-in subs except sending the ack.
    return {
      text: replyAck({ intent: "resume", farmName, locale: sub.locale }),
      kind: "weekly_confirmation",
    };
  }

  // From here on the intent applies to an open offer. If there isn't
  // one, send a HELP-y ack so the member knows nothing is queued.
  if (!open) {
    return {
      text:
        sub.locale === "es"
          ? `No tenemos un envío abierto esta semana. ${farmName} le escribirá el próximo martes.`
          : `We don't have an open offer this week. ${farmName} will text next Tuesday.`,
      kind: "help_ack",
    };
  }

  if (parsed.intent === "confirm") {
    await markOfferResolved(db, open.id, "confirmed", "member_reply", inboundMessageId);
    return {
      text: replyAck({ intent: "confirm", farmName, locale: sub.locale }),
      kind: "weekly_confirmation",
      relatedOfferId: open.id,
    };
  }

  if (parsed.intent === "skip") {
    await markOfferResolved(db, open.id, "skipped", "member_reply", inboundMessageId);
    return {
      text: replyAck({ intent: "skip", farmName, locale: sub.locale }),
      kind: "weekly_confirmation",
      relatedOfferId: open.id,
    };
  }

  if (parsed.intent === "swap" && parsed.swap) {
    const swapDetails = JSON.stringify(parsed.swap);
    const detailHuman =
      sub.locale === "es"
        ? `${parsed.swap.out} → ${parsed.swap.in}`
        : `${parsed.swap.out} → ${parsed.swap.in}`;
    await run(
      db,
      `update weekly_offers
          set state = 'swapped',
              swap_details = ?,
              reply_intent = 'swap',
              reply_message_id = ?,
              resolved_at = ?, resolved_by = 'member_reply', updated_at = ?
        where id = ?`,
      [swapDetails, inboundMessageId, now, now, open.id],
    );
    return {
      text: replyAck({ intent: "swap", farmName, detail: detailHuman, locale: sub.locale }),
      kind: "weekly_confirmation",
      relatedOfferId: open.id,
    };
  }

  if (parsed.intent === "gift" && parsed.gift?.recipientName) {
    await run(
      db,
      `update weekly_offers
          set state = 'gifted',
              gift_recipient_name = ?,
              gift_recipient_phone = ?,
              reply_intent = 'gift',
              reply_message_id = ?,
              resolved_at = ?, resolved_by = 'member_reply', updated_at = ?
        where id = ?`,
      [
        parsed.gift.recipientName,
        parsed.gift.recipientPhone ?? null,
        inboundMessageId, now, now, open.id,
      ],
    );
    const detail =
      sub.locale === "es"
        ? `para ${parsed.gift.recipientName}`
        : `to ${parsed.gift.recipientName}`;
    return {
      text: replyAck({ intent: "gift", farmName, detail, locale: sub.locale }),
      kind: "weekly_confirmation",
      relatedOfferId: open.id,
    };
  }

  // Fall-through (unknown / regex-missed swap or gift): leave the offer
  // open, send help-ish ack.
  return {
    text: replyAck({ intent: "unknown", farmName, locale: sub.locale }),
    kind: "help_ack",
    relatedOfferId: open.id,
  };
}

async function markOfferResolved(
  db: D1Database,
  offerId: string,
  state: "confirmed" | "skipped" | "paused",
  by: "member_reply" | "auto" | "farmer",
  replyMessageId: string,
) {
  const intent = state === "confirmed" ? "confirm" : state === "skipped" ? "skip" : "pause";
  const now = nowIso();
  await run(
    db,
    `update weekly_offers
        set state = ?,
            reply_intent = ?,
            reply_message_id = ?,
            resolved_at = ?, resolved_by = ?, updated_at = ?
      where id = ?`,
    [state, intent, replyMessageId, now, by, now, offerId],
  );
}
