"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { demoProducts, formatCents, type DemoProduct } from "@/lib/farmer-demo";

export default function FarmerInventoryPage() {
  const [products, setProducts] = useState(demoProducts);

  function toggleSoldOut(id: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              is_sold_out: !p.is_sold_out,
              inventory_now: !p.is_sold_out ? 0 : p.inventory_cap,
            }
          : p,
      ),
    );
  }

  const totalSkus = products.length;
  const soldOut = products.filter((p) => p.is_sold_out).length;
  const lowStock = products.filter(
    (p) =>
      !p.is_sold_out &&
      p.inventory_cap !== null &&
      p.inventory_now !== null &&
      p.inventory_now / p.inventory_cap < 0.25,
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="What you're selling this week"
        title="Inventory."
        subtitle="Tap a sold-out toggle from your phone at the market. The web store updates the same second."
        action={
          <button type="button" className="btn btn-primary">
            + Add product
          </button>
        }
      />

      <div className="px-6 md:px-10 py-8 grid md:grid-cols-3 gap-6">
        <Stat label="Products listed" value={totalSkus.toString()} />
        <Stat label="Sold out" value={soldOut.toString()} accent="brick" />
        <Stat label="Low stock" value={lowStock.toString()} accent="wheat" />
      </div>

      <div className="px-6 md:px-10 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onToggleSoldOut={() => toggleSoldOut(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "wheat",
}: {
  label: string;
  value: string;
  accent?: "wheat" | "brick" | "moss";
}) {
  const color =
    accent === "brick"
      ? "text-brick"
      : accent === "moss"
        ? "text-mossDark"
        : "text-wheatDark";
  return (
    <div className="paper p-6">
      <div className={`display text-4xl font-medium leading-none ${color}`}>
        {value}
      </div>
      <div className="text-xs text-soil/55 small-caps mt-2">{label}</div>
    </div>
  );
}

function ProductCard({
  product: p,
  onToggleSoldOut,
}: {
  product: DemoProduct;
  onToggleSoldOut: () => void;
}) {
  const cap = p.inventory_cap ?? 0;
  const now = p.inventory_now ?? 0;
  const pct = cap > 0 ? Math.max(0, Math.min(100, (now / cap) * 100)) : 100;

  return (
    <div
      className={`paper p-6 flex flex-col gap-3 transition-opacity ${p.is_sold_out ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display text-lg font-medium leading-tight">{p.name}</h3>
          {p.description && (
            <p className="text-xs text-soil/55 italic mt-0.5">
              {p.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="display">{formatCents(p.price_cents)}</div>
          <div className="text-[11px] text-soil/55">
            {p.kind === "catch_weight" ? `per ${p.unit_label}` : `/ ${p.unit_label}`}
          </div>
        </div>
      </div>

      {p.inventory_cap !== null && (
        <div>
          <div className="flex items-end justify-between mb-1.5 text-xs">
            <span className="text-soil/55">
              {p.is_sold_out
                ? "Sold out"
                : `${now} of ${cap} ${p.unit_label}${cap !== 1 ? "s" : ""} left`}
            </span>
            {p.kind === "catch_weight" && (
              <span className="small-caps text-[10px] text-wheatDark">
                catch weight
              </span>
            )}
          </div>
          <div className="h-1.5 bg-soil/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                p.is_sold_out
                  ? "bg-brick/60"
                  : pct < 25
                    ? "bg-brick"
                    : pct < 50
                      ? "bg-wheat"
                      : "bg-moss"
              }`}
              style={{ width: `${p.is_sold_out ? 100 : pct}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleSoldOut}
        className={`mt-1 py-2 rounded-md text-sm display border transition-colors ${
          p.is_sold_out
            ? "border-moss text-mossDark hover:bg-moss/10"
            : "border-soil/20 text-soil/65 hover:border-brick hover:text-brick"
        }`}
      >
        {p.is_sold_out ? "Mark back in stock" : "Mark sold out"}
      </button>
    </div>
  );
}
