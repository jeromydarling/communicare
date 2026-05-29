// =============================================================================
// invite-members — Supabase Edge Function (Deno runtime)
// =============================================================================
// Sends a magic-link sign-in invitation to each listed email. Called from:
//   - /farmer/import after a successful commit, when the operator opts in
//   - /farmer/members for re-sending an invite to a single member
//
// We verify the operator is staff at the named farm, and that every email
// being invited belongs to a profile that is bound to that farm (i.e. the
// operator can't use this to send invites to arbitrary email addresses).
//
// Deploy:   supabase functions deploy invite-members --no-verify-jwt
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";
import { preflightResponse } from "../_lib/cors.ts";
import { json } from "../_lib/response.ts";
import { verifyStaff } from "../_lib/verify-staff.ts";

const RequestInput = z.object({
  farm_id: z.string().uuid(),
  emails: z.array(z.string().trim().email()).min(1).max(2000),
  redirect_to: z.string().url().optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse();
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
  const input = parsed.data;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(
      { error: "Supabase service-role config missing." },
      500,
    );
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Auth the operator
  const verification = await verifyStaff(req, admin, input.farm_id);
  if (!verification.ok) return verification.response;

  // Lower-case + dedupe
  const emails = Array.from(
    new Set(input.emails.map((e) => e.toLowerCase().trim())),
  );

  // Only invite emails that belong to profiles bound to this farm. Stops
  // an operator from blast-inviting random addresses.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", emails);
  type ProfRow = { id: string; email: string };
  const profilesByEmail = new Map<string, string>(
    ((profiles ?? []) as ProfRow[]).map((p) => [
      p.email.toLowerCase(),
      p.id,
    ]),
  );

  const profileIds = Array.from(profilesByEmail.values());
  let boundMemberIds = new Set<string>();
  if (profileIds.length > 0) {
    const { data: bound } = await admin
      .from("farm_members")
      .select("user_id")
      .eq("farm_id", input.farm_id)
      .in("user_id", profileIds);
    boundMemberIds = new Set(
      ((bound ?? []) as { user_id: string }[]).map((b) => b.user_id),
    );
  }

  type Result = {
    email: string;
    status: "invited" | "skipped" | "error";
    message?: string;
  };
  const results: Result[] = [];
  let invited = 0;
  let skipped = 0;
  let errored = 0;

  for (const email of emails) {
    const profileId = profilesByEmail.get(email);
    if (!profileId || !boundMemberIds.has(profileId)) {
      results.push({
        email,
        status: "skipped",
        message: "not a member of this farm",
      });
      skipped++;
      continue;
    }
    const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: input.redirect_to,
    });
    if (invErr) {
      results.push({ email, status: "error", message: invErr.message });
      errored++;
    } else {
      results.push({ email, status: "invited" });
      invited++;
    }
  }

  return json({
    ok: true,
    invited,
    skipped,
    errored,
    results,
  });
});
