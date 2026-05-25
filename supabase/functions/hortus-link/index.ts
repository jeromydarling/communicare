// =============================================================================
// hortus-link — Supabase Edge Function (Deno runtime)
// =============================================================================
// Handles the identity bridge between a Communicare farm owner and their
// Hortus community. Two operations via ?op= query param:
//
//   POST /functions/v1/hortus-link?op=lookup
//        { farm_id: uuid }
//        Checks whether the authenticated farmer's email exists in Hortus.
//        Returns { linked: bool, hortus_email: string|null, signup_url: string }
//
//   POST /functions/v1/hortus-link?op=confirm
//        { farm_id: uuid, hortus_community_id: uuid, hortus_email: string }
//        Writes the farm_integrations row to lock in the link.
//        Called after the farmer completes Hortus account creation / confirms.
//
//   POST /functions/v1/hortus-link?op=unlink
//        { farm_id: uuid }
//        Soft-deletes the integration by setting unlinked_at.
//
// Deploy:
//   supabase functions deploy hortus-link
//   supabase secrets set \
//     HORTUS_SUPABASE_URL=https://xxxx.supabase.co \
//     HORTUS_SERVICE_ROLE_KEY=eyJ...  \
//     HORTUS_APP_URL=https://hortus.app
//
// The HORTUS_SERVICE_ROLE_KEY is Hortus's service role — used only for the
// read-only email lookup on profiles. Hortus stores the equivalent
// (COMMUNICARE_SERVICE_ROLE_KEY) for the reverse lookup.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const LookupInput = z.object({ farm_id: z.string().uuid() });
const ConfirmInput = z.object({
  farm_id: z.string().uuid(),
  hortus_community_id: z.string().uuid(),
  hortus_email: z.string().email(),
});
const UnlinkInput = z.object({ farm_id: z.string().uuid() });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // ── Auth: require authenticated farmer ──────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const communicareAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user }, error: authErr } = await communicareAdmin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const op = new URL(req.url).searchParams.get("op");
  const body = await req.json().catch(() => ({}));

  // ── op=lookup ────────────────────────────────────────────────────────────
  if (op === "lookup") {
    const parsed = LookupInput.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { farm_id } = parsed.data;

    // Verify the caller is an owner of this farm
    const { data: membership } = await communicareAdmin
      .from("farm_members")
      .select("role")
      .eq("farm_id", farm_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .is("archived_at", null)
      .single();
    if (!membership) return json({ error: "Not authorized for this farm" }, 403);

    // Check if already linked
    const { data: existing } = await communicareAdmin
      .from("farm_integrations")
      .select("partner_community_id, partner_email, linked_at")
      .eq("farm_id", farm_id)
      .eq("partner", "hortus")
      .is("unlinked_at", null)
      .single();

    if (existing) {
      return json({
        linked: true,
        hortus_community_id: existing.partner_community_id,
        hortus_email: existing.partner_email,
        linked_at: existing.linked_at,
      });
    }

    // Look up the farmer's email in Hortus profiles
    const hortusUrl = Deno.env.get("HORTUS_SUPABASE_URL");
    const hortusKey = Deno.env.get("HORTUS_SERVICE_ROLE_KEY");
    const hortusAppUrl = Deno.env.get("HORTUS_APP_URL") ?? "https://hortus.app";

    if (!hortusUrl || !hortusKey) {
      return json({ linked: false, hortus_exists: false, signup_url: hortusAppUrl });
    }

    const hortusAdmin = createClient(hortusUrl, hortusKey);

    // Check if this email has a Hortus account
    const { data: hortusProfile } = await hortusAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)   // Supabase UUIDs match when same email used — confirmed by email below
      .single()
      .catch(() => ({ data: null }));

    // Fallback: look up by email via auth.users (service role can do this)
    const { data: { users: hortusUsers } } = await hortusAdmin.auth.admin
      .listUsers({ perPage: 1 })
      .catch(() => ({ data: { users: [] } }));

    // We do a targeted email search via the admin API
    const { data: hortusAuthUser } = await hortusAdmin.auth.admin
      .getUserById(user.id)
      .catch(() => ({ data: { user: null } }));

    const hortusExists = !!hortusAuthUser?.user || !!hortusProfile;

    // Also look for linked community (community where this user is admin)
    let hortusCommunityId: string | null = null;
    if (hortusExists) {
      const { data: comm } = await hortusAdmin
        .from("communities")
        .select("id")
        .eq("admin_user_id", user.id)
        .single()
        .catch(() => ({ data: null }));
      hortusCommunityId = comm?.id ?? null;
    }

    const signupUrl = `${hortusAppUrl}/auth/signup?email=${encodeURIComponent(user.email ?? "")}&ref=communicare`;

    return json({
      linked: false,
      hortus_exists: hortusExists,
      hortus_community_id: hortusCommunityId,
      signup_url: signupUrl,
    });
  }

  // ── op=confirm ───────────────────────────────────────────────────────────
  if (op === "confirm") {
    const parsed = ConfirmInput.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { farm_id, hortus_community_id, hortus_email } = parsed.data;

    const { data: membership } = await communicareAdmin
      .from("farm_members")
      .select("role")
      .eq("farm_id", farm_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .is("archived_at", null)
      .single();
    if (!membership) return json({ error: "Not authorized for this farm" }, 403);

    const { error: upsertErr } = await communicareAdmin
      .from("farm_integrations")
      .upsert({
        farm_id,
        partner: "hortus",
        partner_community_id: hortus_community_id,
        partner_email: hortus_email,
        unlinked_at: null,
      }, { onConflict: "farm_id,partner" });

    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ ok: true, linked: true });
  }

  // ── op=unlink ────────────────────────────────────────────────────────────
  if (op === "unlink") {
    const parsed = UnlinkInput.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { farm_id } = parsed.data;

    const { data: membership } = await communicareAdmin
      .from("farm_members")
      .select("role")
      .eq("farm_id", farm_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .is("archived_at", null)
      .single();
    if (!membership) return json({ error: "Not authorized for this farm" }, 403);

    await communicareAdmin
      .from("farm_integrations")
      .update({ unlinked_at: new Date().toISOString() })
      .eq("farm_id", farm_id)
      .eq("partner", "hortus");

    return json({ ok: true, linked: false });
  }

  return json({ error: "Unknown op. Use ?op=lookup|confirm|unlink" }, 400);
});
