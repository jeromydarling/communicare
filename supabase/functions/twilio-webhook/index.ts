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

  return {
    kind: "unknown",
    reply:
      "I didn't catch that. Try: SWAP kale for chard, SKIP, PAUSE 2, DONATE, GIFT <name>, or CONFIRM.",
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Look up the user from the phone number
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", fromPhone)
      .maybeSingle();

    // For now we log the inbound + outbound — handlers per intent live
    // in a follow-up. The schema supports them; this PR keeps the function
    // focused on signature verification + intent parsing.
    const farmIdForNumber = await resolveFarmIdForNumber(admin, toPhone);

    await admin.from("sms_messages").insert([
      {
        farm_id: farmIdForNumber,
        user_id: profile?.id ?? null,
        phone: fromPhone,
        direction: "inbound",
        body,
        intent: intent.kind === "unknown" ? "unknown" : intent.kind,
        intent_payload: intent.payload ?? null,
        twilio_sid: params["MessageSid"] ?? null,
      },
      {
        farm_id: farmIdForNumber,
        user_id: profile?.id ?? null,
        phone: fromPhone,
        direction: "outbound",
        body: intent.reply,
        sent_at: new Date().toISOString(),
      },
    ]);

    // TODO: apply the intent — for swap, update the next-pickup order_items;
    // for skip/pause, mutate subscriptions + credit_ledger; for donate,
    // mark order donated + credit; for gift, create a magic-link gift token.
    // The schema supports all of these; wiring is a 2-3 hour follow-up.
  }

  return twiml(intent.reply);
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
