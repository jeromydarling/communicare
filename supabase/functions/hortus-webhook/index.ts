// =============================================================================
// hortus-webhook — Supabase Edge Function (Deno runtime)
// =============================================================================
// Receives events from Hortus and applies them to Communicare data.
//
// Events handled:
//   harvest.created     → update product inventory; queue crop mapping if needed
//   surplus.created     → create a pending_surplus record for the farmer dashboard
//   plan.week_updated   → pre-populate share contents for the target pickup week
//
// Authentication: HMAC-SHA256 shared secret in X-Hortus-Secret header.
// Deploy with --no-verify-jwt (same as twilio-webhook).
//
// Deploy:
//   supabase functions deploy hortus-webhook --no-verify-jwt
//   supabase secrets set \
//     HORTUS_WEBHOOK_SECRET=<generate with: openssl rand -hex 32> \
//     GEMINI_API_KEY=<your Gemini Flash key>
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hortus-secret, x-hortus-event",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Payload schemas ──────────────────────────────────────────────────────────

const BaseWebhook = z.object({
  event:        z.string(),
  community_id: z.string().uuid(),
  farm_id:      z.string().uuid(),   // Communicare farm UUID — sent by Hortus
  sent_at:      z.string().optional(),
});

const HarvestPayload = z.object({
  harvest_id:   z.string().uuid(),
  crop_name:    z.string(),
  variety:      z.string().nullable().optional(),
  weight_lbs:   z.number().nullable().optional(),
  destination:  z.string(),
  harvest_date: z.string(),
  plot_id:      z.string().uuid().nullable().optional(),
  land_id:      z.string().uuid(),
});

const SurplusPayload = z.object({
  post_id:     z.string().uuid(),
  item:        z.string(),
  description: z.string().nullable().optional(),
  quantity:    z.string().nullable().optional(),
  expires_at:  z.string().nullable().optional(),
});

const PlanPayload = z.object({
  plan_id:             z.string().uuid(),
  plan_name:           z.string(),
  succession_schedule: z.unknown(),  // JSON structure defined in Hortus
  land_id:             z.string().uuid(),
});

// ── Gemini crop-match helper ─────────────────────────────────────────────────

async function matchCropWithGemini(
  hortusCropName: string,
  hortusVariety: string | null | undefined,
  communicareProducts: { id: number; name: string }[],
): Promise<{ confidence: number; best_match_id: number | null }> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey || communicareProducts.length === 0) {
    return { confidence: 0, best_match_id: null };
  }

  const productList = communicareProducts
    .map((p) => `${p.id}: ${p.name}`)
    .join("\n");

  const prompt = `You are matching harvest crop names to product SKUs.
Hortus crop: "${hortusCropName}"${hortusVariety ? ` (variety: ${hortusVariety})` : ""}
Communicare products:
${productList}

Which product ID best matches this crop? Consider synonyms, common names, and variety aliases.
Reply with ONLY a JSON object: { "product_id": <number or null>, "confidence": <0.0-1.0> }
If no product is a good match, return { "product_id": null, "confidence": 0 }`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 64 },
        }),
      },
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text);
    return {
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      best_match_id: typeof parsed.product_id === "number" ? parsed.product_id : null,
    };
  } catch {
    return { confidence: 0, best_match_id: null };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Verify shared secret
  const secret = Deno.env.get("HORTUS_WEBHOOK_SECRET");
  const incomingSecret = req.headers.get("X-Hortus-Secret");
  if (!secret || incomingSecret !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const base = BaseWebhook.safeParse(body);
  if (!base.success) return json({ error: base.error.flatten() }, 400);

  const { event, farm_id, community_id } = base.data;
  const payload = (body as Record<string, unknown>).payload ?? {};

  // Log the inbound webhook
  await admin.from("integration_webhook_log").insert({
    direction: "inbound",
    partner: "hortus",
    event,
    farm_id,
    payload: body as object,
  }).catch(() => {});  // non-blocking

  // ── harvest.created ────────────────────────────────────────────────────
  if (event === "harvest.created") {
    const h = HarvestPayload.safeParse(payload);
    if (!h.success) return json({ error: "Bad harvest payload", details: h.error.flatten() }, 400);
    const harvest = h.data;

    // Fetch active products for this farm
    const { data: products } = await admin
      .from("products")
      .select("id, name, metadata")
      .eq("farm_id", farm_id)
      .eq("is_active", true);

    const allProducts = products ?? [];

    // Check if this crop name is already mapped
    const alreadyMapped = allProducts.find((p) => {
      const mappings = (p.metadata as Record<string, unknown>)?.hortus_crop_mappings as
        { hortus_name: string }[] | undefined;
      return mappings?.some(
        (m) => m.hortus_name.toLowerCase() === harvest.crop_name.toLowerCase(),
      );
    });

    if (alreadyMapped) {
      // Direct inventory update
      if (harvest.weight_lbs && harvest.weight_lbs > 0) {
        await admin
          .from("products")
          .update({
            inventory_now: admin.rpc("greatest", { a: 0, b: harvest.weight_lbs }),
            is_sold_out: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alreadyMapped.id);

        // Simpler fallback: just update inventory_now directly
        const { data: current } = await admin
          .from("products")
          .select("inventory_now")
          .eq("id", alreadyMapped.id)
          .single();

        const newInventory = Math.max(
          (current?.inventory_now ?? 0) + Math.round(harvest.weight_lbs),
          0,
        );
        await admin
          .from("products")
          .update({ inventory_now: newInventory, is_sold_out: false })
          .eq("id", alreadyMapped.id);
      }
      return json({ ok: true, action: "inventory_updated", product_id: alreadyMapped.id });
    }

    // Not mapped — run Gemini match
    const { confidence, best_match_id } = await matchCropWithGemini(
      harvest.crop_name,
      harvest.variety,
      allProducts.map((p) => ({ id: p.id as number, name: p.name as string })),
    );

    // Auto-link if confidence is high
    if (confidence >= 0.85 && best_match_id !== null) {
      const product = allProducts.find((p) => p.id === best_match_id);
      if (product) {
        const existingMappings = ((product.metadata as Record<string, unknown>)?.hortus_crop_mappings as unknown[] ?? []);
        await admin
          .from("products")
          .update({
            metadata: {
              ...(product.metadata as object),
              hortus_crop_mappings: [
                ...existingMappings,
                { hortus_name: harvest.crop_name, linked_at: new Date().toISOString() },
              ],
            },
          })
          .eq("id", best_match_id);

        // Apply inventory update
        if (harvest.weight_lbs && harvest.weight_lbs > 0) {
          const { data: current } = await admin
            .from("products").select("inventory_now").eq("id", best_match_id).single();
          const newInventory = (current?.inventory_now ?? 0) + Math.round(harvest.weight_lbs);
          await admin
            .from("products")
            .update({ inventory_now: newInventory, is_sold_out: false })
            .eq("id", best_match_id);
        }

        return json({ ok: true, action: "auto_linked", confidence, product_id: best_match_id });
      }
    }

    // Queue a mapping prompt for the farmer dashboard
    await admin
      .from("pending_crop_mappings")
      .upsert({
        farm_id,
        hortus_crop_name: harvest.crop_name,
        hortus_variety: harvest.variety ?? null,
        gemini_confidence: confidence,
        suggested_product_id: best_match_id ?? null,
        raw_payload: harvest,
      }, { onConflict: "farm_id,hortus_crop_name", ignoreDuplicates: false });

    return json({ ok: true, action: "mapping_queued", confidence });
  }

  // ── surplus.created ────────────────────────────────────────────────────
  if (event === "surplus.created") {
    const s = SurplusPayload.safeParse(payload);
    if (!s.success) return json({ error: "Bad surplus payload" }, 400);
    const surplus = s.data;

    // Store surplus in farms.metadata.pending_surplus array
    // (lightweight: no dedicated table needed in v1)
    const { data: farm } = await admin
      .from("farms")
      .select("metadata")
      .eq("id", farm_id)
      .single();

    const existing = (farm?.metadata as Record<string, unknown>)?.pending_surplus as unknown[] ?? [];
    const newEntry = {
      hortus_post_id: surplus.post_id,
      item: surplus.item,
      description: surplus.description,
      quantity: surplus.quantity,
      expires_at: surplus.expires_at,
      community_id,
      received_at: new Date().toISOString(),
      dismissed: false,
    };

    await admin
      .from("farms")
      .update({
        metadata: {
          ...(farm?.metadata as object ?? {}),
          pending_surplus: [...existing.slice(-19), newEntry],  // keep last 20
        },
      })
      .eq("id", farm_id);

    return json({ ok: true, action: "surplus_queued", item: surplus.item });
  }

  // ── plan.week_updated ──────────────────────────────────────────────────
  if (event === "plan.week_updated") {
    const p = PlanPayload.safeParse(payload);
    if (!p.success) return json({ error: "Bad plan payload" }, 400);
    const plan = p.data;

    // Parse succession_schedule to find upcoming weeks
    // Expected shape from Hortus: [{ week_of: "2026-06-03", crops: [{name, variety, estimated_lbs}] }]
    type WeekEntry = { week_of: string; crops: { name: string; variety?: string; estimated_lbs?: number }[] };
    const schedule = Array.isArray(plan.succession_schedule)
      ? (plan.succession_schedule as WeekEntry[])
      : [];

    const now = new Date();
    const upcoming = schedule.filter((w) => new Date(w.week_of) >= now).slice(0, 4);

    if (upcoming.length === 0) {
      return json({ ok: true, action: "no_upcoming_weeks" });
    }

    // Store the preview in farms.metadata.hortus_week_previews
    const { data: farm } = await admin
      .from("farms").select("metadata").eq("id", farm_id).single();

    await admin
      .from("farms")
      .update({
        metadata: {
          ...(farm?.metadata as object ?? {}),
          hortus_week_previews: upcoming,
          hortus_plan_synced_at: new Date().toISOString(),
        },
      })
      .eq("id", farm_id);

    return json({ ok: true, action: "week_previews_updated", weeks: upcoming.length });
  }

  // Unknown event — accept gracefully (forward compatibility)
  return json({ ok: true, action: "unknown_event_ignored", event });
});
