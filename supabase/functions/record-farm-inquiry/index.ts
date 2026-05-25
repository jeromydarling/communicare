// =============================================================================
// record-farm-inquiry — Supabase Edge Function (Deno runtime)
// =============================================================================
// The "Send them a note" send. Logs an inquiry from a member (or anonymous
// visitor) to a discovered farm. On a discovered farm's FIRST inquiry, also
// fires a single quiet outreach email to the farm — once, ever — telling
// them a neighbor reached out through Communicare.
//
// Sending is delegated to Resend if RESEND_API_KEY is configured. If it
// isn't, the inquiry is still logged and the client can fall back to a
// mailto: handoff so the member's own email client takes over.
//
// Voice rules in the outreach email (see OUTREACH_BODY below): one email,
// ever; no drip; no sales copy; the listing is theirs either way.
//
// Deploy:   supabase functions deploy record-farm-inquiry --no-verify-jwt
// Secrets:  supabase secrets set RESEND_API_KEY=re_...
//           supabase secrets set RESEND_FROM=hello@communicare.farm
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------

const RequestInput = z.object({
  discoveredFarmId: z.string().uuid(),
  senderName: z.string().trim().min(1).max(120),
  senderEmail: z.string().trim().email(),
  senderZip: z.string().trim().max(10).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(10).max(4000),
});

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// -----------------------------------------------------------------------------
// The one-time outreach email. Sent exactly once per discovered farm — on
// the moment the FIRST member sends them a note. Plain, editorial, no drip.
// -----------------------------------------------------------------------------

function outreachSubject(farmName: string): string {
  return `A neighbor just asked about ${farmName} through Communicare`;
}

function outreachBody(opts: {
  farmName: string;
  senderName: string;
  senderZip: string | null;
  claimUrl: string;
}): string {
  const where = opts.senderZip ? ` in ${opts.senderZip}` : "";
  return `Hi —

A neighbor named ${opts.senderName}${where} just sent you a note about your farm. They found you through a small directory we run at communicare.farm.

We're writing once, briefly, because we think you should know it's reaching the people you're growing for.

If you ever want better tools for managing the people you feed — text messages instead of email threads, swaps instead of spreadsheets, no setup fee, no contract — we built one for nine dollars a month. The directory listing is yours either way, and you can claim it here whenever you'd like:

${opts.claimUrl}

That's the whole pitch. We won't write again.

— Communicare
For the farms that feed us.
`;
}

async function sendResendEmail(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      reply_to: opts.replyTo,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text.slice(0, 400) };
  }
  return { ok: true, status: res.status };
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = RequestInput.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(
      { error: "Supabase service-role config missing inside the function." },
      500,
    );
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---------------------------------------------------------------------------
  // 1. Load the discovered farm. Confirm it exists and isn't opted out.
  // ---------------------------------------------------------------------------
  const { data: farm, error: farmErr } = await admin
    .from("discovered_farms")
    .select(
      "id, slug, name, email, opted_out_at, first_inquiry_email_sent_at, claimed_at",
    )
    .eq("id", parsed.data.discoveredFarmId)
    .maybeSingle();

  if (farmErr || !farm) {
    return json({ error: "Farm not found." }, 404);
  }
  type FarmRow = {
    id: string;
    slug: string | null;
    name: string;
    email: string | null;
    opted_out_at: string | null;
    first_inquiry_email_sent_at: string | null;
    claimed_at: string | null;
  };
  const f = farm as FarmRow;
  if (f.opted_out_at) {
    return json({ error: "This farm has asked not to receive inquiries." }, 410);
  }

  // ---------------------------------------------------------------------------
  // 2. Read the requesting user (if logged in) — pulled from the Auth header
  //    the supabase-js client passes through to functions.
  // ---------------------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  let memberUserId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data } = await admin.auth.getUser(token);
    memberUserId = data?.user?.id ?? null;
  }

  // ---------------------------------------------------------------------------
  // 3. Insert the inquiry row. The DB trigger bumps inquiry_count +
  //    last_inquiry_at on discovered_farms automatically.
  // ---------------------------------------------------------------------------
  const { error: insertErr } = await admin
    .from("farm_inquiries")
    .insert({
      discovered_farm_id: f.id,
      member_user_id: memberUserId,
      sender_name: parsed.data.senderName,
      sender_email: parsed.data.senderEmail,
      sender_zip: parsed.data.senderZip ?? null,
      subject:
        parsed.data.subject ??
        `A note from a neighbor — found you through Communicare`,
      body: parsed.data.body,
      channel: "email",
      status: "sent",
    } as never);

  if (insertErr) {
    console.error("inquiry insert error", insertErr);
    return json({ error: "Couldn't record your note. Try again." }, 500);
  }

  // ---------------------------------------------------------------------------
  // 4. Email the farm (if we have an address and Resend is configured)
  // ---------------------------------------------------------------------------
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM") ?? "hello@communicare.farm";
  const siteBase = Deno.env.get("PUBLIC_SITE_URL") ?? "https://communicare.farm";

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

  if (resendKey && f.email) {
    // Send the actual inquiry to the farm with reply-to set to the member.
    const inquirySubject =
      parsed.data.subject ??
      `A note from a neighbor — found you through Communicare`;
    const inquiryEmail = await sendResendEmail({
      apiKey: resendKey,
      from: resendFrom,
      to: f.email,
      subject: inquirySubject,
      text: `${parsed.data.body}\n\n— ${parsed.data.senderName}\n(Sent through Communicare's farm finder. Reply directly to this email to write back.)`,
      replyTo: parsed.data.senderEmail,
    });
    result.inquiryEmailed = inquiryEmail.ok;

    // First-time-only outreach (NOT a sales drip): one email, ever, that
    // says a neighbor found them through us.
    if (!f.first_inquiry_email_sent_at && !f.claimed_at) {
      const claimUrl = `${siteBase}/claim?slug=${encodeURIComponent(f.slug ?? f.id)}`;
      const outreach = await sendResendEmail({
        apiKey: resendKey,
        from: resendFrom,
        to: f.email,
        subject: outreachSubject(f.name),
        text: outreachBody({
          farmName: f.name,
          senderName: parsed.data.senderName,
          senderZip: parsed.data.senderZip ?? null,
          claimUrl,
        }),
      });
      result.farmEmailed = outreach.ok;
      if (outreach.ok) {
        await admin
          .from("discovered_farms")
          .update({ first_inquiry_email_sent_at: new Date().toISOString() })
          .eq("id", f.id);
      }
    }
  } else if (f.email) {
    // No Resend configured — return a mailto: handoff so the client can
    // open the member's own email client.
    const subj = encodeURIComponent(
      parsed.data.subject ??
        `A note from a neighbor — found you through Communicare`,
    );
    const body = encodeURIComponent(
      `${parsed.data.body}\n\n— ${parsed.data.senderName}`,
    );
    result.fallback = "mailto";
    result.mailtoHref = `mailto:${f.email}?subject=${subj}&body=${body}`;
  }

  return json(result);
});
