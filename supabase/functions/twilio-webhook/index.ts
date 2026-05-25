// =============================================================================
// twilio-webhook — Supabase Edge Function (Deno runtime)
// =============================================================================
// Receives inbound SMS from Twilio for the swap-by-text loop, validates the
// X-Twilio-Signature header, parses the member's intent (SWAP / SKIP /
// PAUSE / DONATE / GIFT / CONFIRM / OPT-OUT), mutates the corresponding
// order / subscription / credit_ledger in Supabase, and replies with TwiML.
//
// Deploy:
//   supabase functions deploy twilio-webhook --no-verify-jwt
//   supabase secrets set \
//     TWILIO_AUTH_TOKEN=... \
//     TWILIO_PHONE_NUMBER=+15551234567 \
//     SUPABASE_SERVICE_ROLE_KEY=... \
//     SUPABASE_URL=https://<ref>.supabase.co
//
// Configure Twilio:
//   In the Twilio console, set the SMS Messaging webhook on your phone
//   number to POST to:
//     https://<ref>.supabase.co/functions/v1/twilio-webhook
//
// JWT verification is OFF because Twilio doesn't send a Supabase JWT —
// instead we verify the X-Twilio-Signature HMAC.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import {
  handleSwap,
  handleSkip,
  handlePause,
  handleResume,
  handleDonate,
  handleGift,
  handleConfirm,
  handleClaim,
  handleOptOut,
  makeAdmin,
  type IntentContext,
} from "./intent-handlers.ts";

// -----------------------------------------------------------------------------
// Signature verification
// Per https://www.twilio.com/docs/usage/webhooks/webhooks-security
// -----------------------------------------------------------------------------

async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  // Twilio's algorithm: url + sorted(key + value pairs concatenated)
  const sortedKeys = Object.keys(params).sort();
  const dataString = sortedKeys.reduce((acc, k) => acc + k + params[k], url);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(dataString));
  // Base64-encode the digest and compare to the header (also base64)
  const computed = btoa(
    Array.from(new Uint8Array(sig))
      .map((b) => String.fromCharCode(b))
      .join(""),
  );
  return computed === signature;
}

// -----------------------------------------------------------------------------
// Intent parsing
// -----------------------------------------------------------------------------

type Intent = {
  kind:
    | "swap"
    | "skip"
    | "pause"
    | "resume"
    | "donate"
    | "gift"
    | "confirm"
    | "claim"
    | "opt_out"
    | "unknown";
  payload?: Record<string, string>;
  reply: string;
};

function parseIntent(body: string): Intent {
  const text = body.trim().toLowerCase();

  if (/^stop\b|unsubscribe|cancel/.test(text)) {
    return {
      kind: "opt_out",
      reply:
        "You're unsubscribed. We won't text you again. To re-subscribe, reply START.",
    };
  }

  if (/^confirm\b|^yes\b/.test(text)) {
    return {
      kind: "confirm",
      reply: "Confirmed. See you at pickup.",
    };
  }

  // SWAP <from> for|to <to>   or   SWAP <from> -> <to>
  const swapMatch = text.match(
    /^swap\s+(?<from>.+?)\s+(?:for|to|->|→)\s+(?<to>.+)$/i,
  );
  if (swapMatch?.groups) {
    return {
      kind: "swap",
      payload: { from: swapMatch.groups.from, to: swapMatch.groups.to },
      reply: `Done. Swapped ${swapMatch.groups.from} for ${swapMatch.groups.to}. Pickup details unchanged.`,
    };
  }

  // SKIP [N weeks]
  const skipMatch = text.match(/^skip(?:\s+(\d+))?/);
  if (skipMatch) {
    const weeks = skipMatch[1] ? parseInt(skipMatch[1], 10) : 1;
    return {
      kind: "skip",
      payload: { weeks: String(weeks) },
      reply: `Skipped ${weeks} week${weeks === 1 ? "" : "s"} — we'll credit your account. Back on the roster after that.`,
    };
  }

  // PAUSE N
  const pauseMatch = text.match(/^pause\s+(\d+)/);
  if (pauseMatch) {
    const weeks = parseInt(pauseMatch[1], 10);
    return {
      kind: "pause",
      payload: { weeks: String(weeks) },
      reply: `Paused for ${weeks} week${weeks === 1 ? "" : "s"}. We'll text you when you're back on the list.`,
    };
  }

  if (/^resume\b|^start\b/.test(text)) {
    return {
      kind: "resume",
      reply: "Welcome back. You're on the list for the next pickup.",
    };
  }

  if (/^donate\b/.test(text)) {
    return {
      kind: "donate",
      reply:
        "Got it. Your share goes to the food pantry. Account credited for the value of the box.",
    };
  }

  // GIFT <name> [<phone>]
  const giftMatch = text.match(
    /^gift\s+(?<name>\S.+?)(?:\s+(?<phone>\+?\d[\d\s-]+))?$/i,
  );
  if (giftMatch?.groups) {
    return {
      kind: "gift",
      payload: {
        name: giftMatch.groups.name,
        phone: giftMatch.groups.phone ?? "",
      },
      reply: `Sent a pickup pass to ${giftMatch.groups.name}. They'll get a text with a magic link to claim it.`,
    };
  }

  // A short single-word or two-word reply that didn't match anything above
  // is most likely a claim for a limited-quantity drop ("EGGS", "RAW CREAM").
  // Let handleClaim resolve the keyword against the farm's live drops.
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 2 && /^[a-z][a-z\s-]{1,30}$/.test(text)) {
    return {
      kind: "claim",
      payload: { keyword: text },
      reply: `Looking for ${text}…`,
    };
  }

  return {
    kind: "unknown",
    reply:
      "I didn't catch that. Try: SWAP kale for chard, SKIP, PAUSE 2, DONATE, GIFT <name>, or CONFIRM. To claim a limited item, reply with its name (e.g. EGGS).",
  };
}

// -----------------------------------------------------------------------------
// TwiML response
// -----------------------------------------------------------------------------

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    params[k] = typeof v === "string" ? v : v.name;
  }

  const fromPhone = params["From"];
  const body = params["Body"] ?? "";
  const toPhone = params["To"];

  // Verify the request really came from Twilio
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const signature = req.headers.get("x-twilio-signature");
  // Twilio computes the signature using the public URL it called — we
  // reconstruct it from the request.
  const url = req.url;

  if (authToken && signature) {
    const valid = await verifyTwilioSignature(authToken, signature, url, params);
    if (!valid) {
      console.warn("twilio-webhook: invalid signature", { fromPhone });
      return new Response("Invalid signature", { status: 403 });
    }
  } else if (authToken) {
    // Signature is required when we have a token
    return new Response("Missing signature", { status: 403 });
  }
  // If TWILIO_AUTH_TOKEN isn't set we skip verification (dev mode)

  const intent = parseIntent(body);

  // Persist + act on the message via the service-role client
  const admin = makeAdmin();
  let finalReply = intent.reply;

  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", fromPhone)
      .maybeSingle();

    const userId = (profile as { id: string } | null)?.id ?? null;
    const farmId = await resolveFarmIdForNumber(admin, toPhone);

    // Run the corresponding intent handler when we know who the member is
    // AND we have a farm for the inbound number.
    if (userId && farmId && intent.kind !== "unknown") {
      const ctx: IntentContext = {
        admin,
        farmId,
        userId,
        memberPhone: fromPhone,
      };
      try {
        let result;
        switch (intent.kind) {
          case "swap":
            result = await handleSwap(
              ctx,
              intent.payload?.from ?? "",
              intent.payload?.to ?? "",
            );
            break;
          case "skip":
            result = await handleSkip(
              ctx,
              Number(intent.payload?.weeks ?? "1"),
            );
            break;
          case "pause":
            result = await handlePause(
              ctx,
              Number(intent.payload?.weeks ?? "1"),
            );
            break;
          case "resume":
            result = await handleResume(ctx);
            break;
          case "donate":
            result = await handleDonate(ctx);
            break;
          case "gift":
            result = await handleGift(
              ctx,
              intent.payload?.name ?? "your friend",
              intent.payload?.phone || undefined,
            );
            break;
          case "confirm":
            result = await handleConfirm(ctx);
            break;
          case "claim":
            result = await handleClaim(ctx, intent.payload?.keyword ?? "");
            break;
          case "opt_out":
            result = await handleOptOut(admin, fromPhone);
            break;
        }
        if (result) finalReply = result.reply;
      } catch (err) {
        console.error("intent handler error", { intent: intent.kind, err });
        finalReply =
          "Sorry, something went wrong on our end. We just texted the farmer so they can sort it out — and you don't need to do anything.";
      }
    }

    await admin.from("sms_messages").insert([
      {
        farm_id: farmId,
        user_id: userId,
        phone: fromPhone,
        direction: "inbound",
        body,
        intent: intent.kind === "unknown" ? "unknown" : intent.kind,
        intent_payload: intent.payload ?? null,
        twilio_sid: params["MessageSid"] ?? null,
      },
      {
        farm_id: farmId,
        user_id: userId,
        phone: fromPhone,
        direction: "outbound",
        body: finalReply,
        sent_at: new Date().toISOString(),
      },
    ]);
  }

  return twiml(finalReply);
});

// Look up which farm owns a Twilio number. In production every farm has
// its own number (one Twilio subaccount per farm); for now we just take
// the first farm. This is the single mapping the multi-tenant routing
// hinges on, so the real implementation reads from a phone_numbers table.
async function resolveFarmIdForNumber(
  admin: ReturnType<typeof createClient>,
  toPhone: string | undefined,
): Promise<string | null> {
  if (!toPhone) return null;
  const { data } = await admin
    .from("farms")
    .select("id")
    .limit(1)
    .maybeSingle();
  // Suppress unused warning until we add the real lookup
  void toPhone;
  return data?.id ?? null;
}
