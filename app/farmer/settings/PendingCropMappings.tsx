"use client";

// =============================================================================
// PendingCropMappings
// =============================================================================
// Shows when Hortus has sent a harvest for a crop name that doesn't match
// any existing Communicare product. Farmer taps to link or create.
//
// Drop inside FarmerSettingsPage or the inventory page — wherever you want
// to surface the badge. The component self-fetches.
// =============================================================================

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface CropMapping {
  id: number;
  hortus_crop_name: string;
  hortus_variety: string | null;
  gemini_confidence: number | null;
  suggested_product_id: number | null;
  suggested_product_name?: string;
  raw_payload: Record<string, unknown>;
}

interface Product {
  id: number;
  name: string;
}

interface PendingCropMappingsProps {
  farmId: string;
}

export function PendingCropMappings({ farmId }: PendingCropMappingsProps) {
  const [mappings, setMappings] = useState<CropMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<number, number | "new">>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    if (!farmId) return;
    fetchMappings();
    fetchProducts();
  }, [farmId]);

  async function fetchMappings() {
    setLoading(true);
    const { data } = await supabase
      .from("pending_crop_mappings")
      .select(`
        id, hortus_crop_name, hortus_variety,
        gemini_confidence, suggested_product_id, raw_payload,
        suggested:products!suggested_product_id(name)
      `)
      .eq("farm_id", farmId)
      .is("resolved_at", null)
      .order("created_at", { ascending: false });

    setMappings(
      (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as CropMapping),
        suggested_product_name: (r.suggested as { name: string } | null)?.name,
      })),
    );
    setLoading(false);
  }

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("farm_id", farmId)
      .eq("is_active", true)
      .order("name");
    setProducts(data ?? []);
  }

  async function resolve(mappingId: number, productId: number) {
    setSaving(mappingId);

    // 1. Update the mapping as resolved
    await supabase
      .from("pending_crop_mappings")
      .update({ resolved_product_id: productId, resolved_at: new Date().toISOString() })
      .eq("id", mappingId);

    // 2. Write the crop name into the product's hortus_crop_mappings metadata
    const mapping = mappings.find((m) => m.id === mappingId);
    if (mapping) {
      const { data: product } = await supabase
        .from("products")
        .select("metadata")
        .eq("id", productId)
        .single();

      const existingMappings =
        ((product?.metadata as Record<string, unknown>)?.hortus_crop_mappings as unknown[] ?? []);

      await supabase
        .from("products")
        .update({
          metadata: {
            ...(product?.metadata as object ?? {}),
            hortus_crop_mappings: [
              ...existingMappings,
              { hortus_name: mapping.hortus_crop_name, linked_at: new Date().toISOString() },
            ],
          },
        })
        .eq("id", productId);

      // 3. Apply the original harvest's weight to inventory
      const weight = mapping.raw_payload?.weight_lbs as number | null;
      if (weight && weight > 0) {
        const { data: currentProduct } = await supabase
          .from("products")
          .select("inventory_now")
          .eq("id", productId)
          .single();
        const newInventory = (currentProduct?.inventory_now ?? 0) + Math.round(weight);
        await supabase
          .from("products")
          .update({ inventory_now: newInventory, is_sold_out: false })
          .eq("id", productId);
      }
    }

    setSaving(null);
    await fetchMappings();
  }

  if (loading || mappings.length === 0) return null;

  return (
    <section className="paper p-8 border-amber-300 bg-amber-50/50">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold">
          {mappings.length}
        </span>
        <div>
          <div className="small-caps text-xs text-amber-700 mb-0">Hortus Harvest</div>
          <h2 className="display text-xl font-medium text-soil">
            {mappings.length === 1
              ? "1 new crop needs linking."
              : `${mappings.length} new crops need linking.`}
          </h2>
        </div>
      </div>
      <p className="text-sm text-soil/65 mb-5">
        Hortus sent a harvest for crops we haven't seen before. Link each one to
        a product so future harvests auto-update inventory.
      </p>

      <div className="space-y-4">
        {mappings.map((m) => (
          <div key={m.id} className="bg-white rounded-xl p-4 border border-amber-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-semibold text-soil">{m.hortus_crop_name}</span>
                {m.hortus_variety && (
                  <span className="text-soil/55 text-sm ml-1.5">({m.hortus_variety})</span>
                )}
                {m.raw_payload?.weight_lbs && (
                  <span className="ml-2 text-xs text-soil/50">
                    {String(m.raw_payload.weight_lbs)} lbs logged
                  </span>
                )}
              </div>
              {m.gemini_confidence !== null && (
                <span className="text-xs text-soil/40">
                  AI confidence {Math.round((m.gemini_confidence ?? 0) * 100)}%
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Gemini suggestion, if present */}
              {m.suggested_product_id && m.suggested_product_name && (
                <button
                  onClick={() => resolve(m.id, m.suggested_product_id!)}
                  disabled={saving === m.id}
                  className="btn btn-primary text-sm py-1.5 px-3"
                >
                  {saving === m.id ? "Saving…" : `Link to "${m.suggested_product_name}"`}
                </button>
              )}

              {/* Manual product picker */}
              <select
                value={selected[m.id] ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelected((s) => ({ ...s, [m.id]: val === "new" ? "new" : Number(val) }));
                }}
                className="field text-sm py-1.5 max-w-[200px]"
              >
                <option value="">Choose a product…</option>
                {products
                  .filter((p) => p.id !== m.suggested_product_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                <option value="new">+ Create new product</option>
              </select>

              {selected[m.id] && selected[m.id] !== "new" && (
                <button
                  onClick={() => resolve(m.id, selected[m.id] as number)}
                  disabled={saving === m.id}
                  className="btn btn-ghost text-sm py-1.5 px-3"
                >
                  {saving === m.id ? "Saving…" : "Confirm"}
                </button>
              )}

              {selected[m.id] === "new" && (
                <a
                  href={`/farmer/inventory?prefill=${encodeURIComponent(m.hortus_crop_name)}`}
                  className="btn btn-ghost text-sm py-1.5 px-3"
                >
                  Create product →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
