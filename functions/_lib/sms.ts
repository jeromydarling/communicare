// =============================================================================
// sms — Twilio wrapper for outbound + inbound signature verification
// =============================================================================
// Outbound goes through Twilio's REST API (Messages.json) with Basic
// auth from TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN. Inbound arrives at
// /api/sms/inbound as application/x-www-form-urlencoded; Twilio signs
// the request with X-Twilio-Signature (HMAC-SHA1 of url+sortedParams).
//
// Why we re-implement the HMAC instead of pulling in the twilio npm
// SDK: the SDK is a ~600KB Node-shaped client that bundles into Workers
// poorly and runs the request through axios. The wire protocol is
// trivial (form-urlencoded over Basic-auth HTTPS) and the signature
// scheme is documented. One file, no dependency, no surprises in the
// Worker bundle.
//
// What this module does NOT handle:
//   - 10DLC campaign registration (one-time, done in Twilio console)
//   - Number purchase (also Twilio console / API but separate route)
//   - Rate limiting per Twilio's MPS limits (we don't fan out fast
//     enough to hit them yet — when we do, queue + token bucket)
// =============================================================================

export type TwilioEnv = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
};

export type SmsSendArgs = {
  from: string;        // E.164 — the farm's outbound number
  to: string;          // E.164 — the member
  body: string;        // already-localized and length-aware
  statusCallback?: string; // Twilio will POST delivery updates here
  messagingServiceSid?: string; // when set, overrides `from` for routing
};

export type SmsSendResult =
  | { ok: true; sid: string; status: string }
  | { ok: false; status: number; error: string; code?: string };

// -----------------------------------------------------------------------------
// Outbound — POST /2010-04-01/Accounts/{sid}/Messages.json
// -----------------------------------------------------------------------------

export async function sendSms(env: TwilioEnv, args: SmsSendArgs): Promise<SmsSendResult> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return { ok: false, status: 500, error: "TWILIO credentials missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", args.to);
  params.set("Body", args.body);
  if (args.messagingServiceSid) {
    params.set("MessagingServiceSid", args.messagingServiceSid);
  } else {
    params.set("From", args.from);
  }
  if (args.statusCallback) {
    params.set("StatusCallback", args.statusCallback);
  }

  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }

  let data: {
    sid?: string;
    status?: string;
    message?: string;
    code?: number | string;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, status: res.status, error: `Twilio ${res.status}: non-JSON response` };
  }

  if (!res.ok || !data.sid) {
    return {
      ok: false,
      status: res.status,
      error: data.message ?? `Twilio ${res.status}`,
      code: data.code != null ? String(data.code) : undefined,
    };
  }
  return { ok: true, sid: data.sid, status: data.status ?? "queued" };
}

// -----------------------------------------------------------------------------
// Inbound signature verification
// -----------------------------------------------------------------------------
// Twilio computes:
//   signature = base64( HMAC-SHA1( authToken, fullUrl + sortedKeyValues ) )
// where sortedKeyValues is the concatenation of `key + value` for each
// form param, alphabetically by key. The fullUrl is the EXACT URL
// Twilio used to POST — including query string if any. Behind a
// proxy/CDN the host header may differ from the Worker-perceived one;
// for our setup the request URL is the canonical /api/sms/inbound on
// communicare.farm, so we read it directly from the incoming Request.
//
// The comparison is constant-time so we don't leak the byte at which
// the signatures diverge.
// -----------------------------------------------------------------------------

export async function verifyTwilioSignature(
  authToken: string,
  fullUrl: string,
  params: Record<string, string>,
  signature: string,
): Promise<boolean> {
  if (!authToken || !signature) return false;

  const sortedKeys = Object.keys(params).sort();
  let payload = fullUrl;
  for (const k of sortedKeys) {
    payload += k + params[k];
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  // base64-encode the 20-byte digest
  let expected = "";
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < u8.length; i++) expected += String.fromCharCode(u8[i]);
  const expectedB64 = btoa(expected);

  return constantTimeEqual(signature, expectedB64);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// -----------------------------------------------------------------------------
// Helper: parse Twilio's form-encoded inbound body into a plain object
// -----------------------------------------------------------------------------

export async function readTwilioForm(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/x-www-form-urlencoded")) return {};
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const part of text.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) {
      out[decodeURIComponent(part)] = "";
    } else {
      out[decodeURIComponent(part.slice(0, eq).replace(/\+/g, " "))] =
        decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// TwiML response — what Twilio expects from the inbound webhook.
// For our flow we usually return an empty <Response/> and send any
// outbound replies via the REST API (so they're tracked the same way
// as every other outbound). This wrapper exists so route handlers can
// return a 200 quickly even when downstream work happens via waitUntil.
// -----------------------------------------------------------------------------

export function emptyTwimlResponse(): Response {
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
