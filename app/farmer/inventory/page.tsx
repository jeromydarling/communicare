"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import {
  demoProducts,
  demoMembers,
  formatCents,
  type DemoProduct,
} from "@/lib/farmer-demo";
import { Wheat } from "@/components/mark";

type NewProduct = {
  name: string;
  description: string;
  kind: "fixed" | "catch_weight" | "share";
  price_cents: number;
  unit_label: string;
  inventory_cap: number | null;
  is_limited: boolean;
  available_through: string;
};

const EMPTY_NEW: NewProduct = {
  name: "",
  description: "",
  kind: "fixed",
  price_cents: 0,
  unit_label: "each",
  inventory_cap: null,
  is_limited: false,
  available_through: "",
};

// Past which timestamp the item is considered "out of season" and hidden
// from members. Demo-side helper.
function isOutOfSeason(p: DemoProduct): boolean {
  return Boolean(
    p.available_through && new Date(p.available_through).getTime() < Date.now(),
  );
}

// How long after a broadcast we soft-block a re-send, to keep a farmer
// from accidentally double-pinging the share list.
const BROADCAST_COOLDOWN_MS = 4 * 60 * 60 * 1000;

function broadcastBlocked(p: DemoProduct): boolean {
  if (!p.broadcast_sent_at) return false;
  return Date.now() - new Date(p.broadcast_sent_at).getTime() < BROADCAST_COOLDOWN_MS;
}

export default function FarmerInventoryPage() {
  const [products, setProducts] = useState(demoProducts);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<NewProduct>(EMPTY_NEW);
  const [priceInput, setPriceInput] = useState("");
  const [broadcastFor, setBroadcastFor] = useState<DemoProduct | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

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

  function addProduct() {
    if (!draft.name.trim() || draft.price_cents <= 0) return;
    if (draft.is_limited && (draft.inventory_cap ?? 0) <= 0) return;
    const newProduct: DemoProduct = {
      id: Math.max(0, ...products.map((p) => p.id)) + 1,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      kind: draft.kind,
      price_cents: draft.price_cents,
      unit_label: draft.unit_label.trim() || "each",
      inventory_cap: draft.inventory_cap,
      inventory_now: draft.inventory_cap,
      is_sold_out: false,
      is_limited: draft.is_limited,
      available_through: draft.available_through
        ? new Date(draft.available_through).toISOString()
        : null,
    };
    setProducts((prev) => [newProduct, ...prev]);
    setDraft(EMPTY_NEW);
    setPriceInput("");
    setShowForm(false);
  }

  function confirmBroadcast(p: DemoProduct) {
    const recipients = demoMembers.filter((m) => m.status === "active").length;
    setProducts((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, broadcast_sent_at: new Date().toISOString() } : x,
      ),
    );
    setBroadcastFor(null);
    setBroadcastResult(`Sent to ${recipients} members. Replies will land in the inbox as they come in.`);
    setTimeout(() => setBroadcastResult(null), 6000);
  }

  function setPrice(v: string) {
    setPriceInput(v);
    const parsed = parseFloat(v);
    if (!Number.isNaN(parsed)) {
      setDraft((d) => ({ ...d, price_cents: Math.round(parsed * 100) }));
    }
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
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn btn-primary"
          >
            {showForm ? "Close form" : "+ Add product"}
          </button>
        }
      />

      <div className="px-6 md:px-10 py-8 grid md:grid-cols-3 gap-6">
        <Stat label="Products listed" value={totalSkus.toString()} />
        <Stat label="Sold out" value={soldOut.toString()} accent="brick" />
        <Stat label="Low stock" value={lowStock.toString()} accent="wheat" />
      </div>

      {showForm && (
        <div className="px-6 md:px-10 pb-6">
          <div className="paper p-7 border-wheat/40 bg-wheat/5">
            <div className="small-caps text-xs text-brick mb-2">
              New product
            </div>
            <h3 className="display text-xl font-medium mb-5">
              What are you adding?
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="np_name">
                  Name
                </label>
                <input
                  id="np_name"
                  className="field"
                  placeholder="e.g. Lacinato kale"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Kind</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { v: "fixed", l: "Fixed", h: "By the dozen, bunch, jar" },
                      { v: "catch_weight", l: "Catch-weight", h: "By the lb, kg" },
                      { v: "share", l: "Share", h: "Subscription only" },
                    ] as const
                  ).map((opt) => {
                    const active = draft.kind === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, kind: opt.v }))
                        }
                        className={`text-left px-3 py-2 rounded-md text-xs border transition-colors ${
                          active
                            ? "border-brick bg-brick/5 text-brick"
                            : "border-soil/15 hover:border-soil/30 text-soil/65"
                        }`}
                      >
                        <div className="display text-sm">{opt.l}</div>
                        <div className="text-[10px] italic">{opt.h}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="np_desc">
                  Description (optional)
                </label>
                <input
                  id="np_desc"
                  className="field"
                  placeholder="e.g. Bunch, ~3/4 lb · sweetened by the cold snap"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div>
                  <label className="label" htmlFor="np_price">
                    Price ($)
                  </label>
                  <input
                    id="np_price"
                    className="field"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4.00"
                    value={priceInput}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="np_unit">
                    Per
                  </label>
                  <input
                    id="np_unit"
                    className="field"
                    placeholder="bunch"
                    value={draft.unit_label}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, unit_label: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="np_cap">
                  Inventory cap{" "}
                  <span className="text-soil/45 italic text-xs">(leave blank = no cap)</span>
                </label>
                <input
                  id="np_cap"
                  className="field"
                  type="number"
                  placeholder="e.g. 80"
                  value={draft.inventory_cap ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      inventory_cap: v === "" ? null : parseInt(v, 10),
                    }));
                  }}
                />
              </div>

              <div className="md:col-span-2 border-t border-soil/10 pt-5 mt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.is_limited}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, is_limited: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 accent-brick"
                  />
                  <div>
                    <div className="display text-sm font-medium">
                      Limited quantity
                    </div>
                    <div className="text-xs text-soil/55 italic mt-0.5 leading-snug">
                      For one-shot drops, seasonal items, or anything you only
                      have once in a while. Members claim first-come,
                      first-served by texting back. You'll get a "Tell the
                      list" button to broadcast when it's live.
                    </div>
                  </div>
                </label>

                {draft.is_limited && (
                  <div className="mt-5 grid md:grid-cols-2 gap-5 pl-7">
                    <div>
                      <label className="label" htmlFor="np_through">
                        Available through{" "}
                        <span className="text-soil/45 italic text-xs">
                          (optional — for seasonal items)
                        </span>
                      </label>
                      <input
                        id="np_through"
                        className="field"
                        type="date"
                        value={draft.available_through}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            available_through: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="text-xs text-soil/55 italic self-end pb-2 leading-snug">
                      Past this date the item disappears from the member view.
                      You'll still see it in inventory, greyed out, ready for
                      next season.
                    </div>
                  </div>
                )}
                {draft.is_limited && (draft.inventory_cap ?? 0) <= 0 && (
                  <div className="mt-3 text-xs text-brick italic pl-7">
                    Set an inventory cap above — limited items need a hard
                    number so the FCFS lock has something to count down.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-soil/15 mt-7 pt-5 flex items-center justify-between">
              <span className="text-xs italic text-soil/55">
                You can edit any of this later. Members see changes within a
                minute.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setDraft(EMPTY_NEW);
                    setPriceInput("");
                  }}
                  className="btn btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addProduct}
                  disabled={!draft.name.trim() || draft.price_cents <= 0}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  Add to inventory →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onToggleSoldOut={() => toggleSoldOut(p.id)}
              onTellTheList={() => setBroadcastFor(p)}
            />
          ))}
        </div>
        {products.length === 0 && (
          <div className="paper p-12 text-center">
            <Wheat className="w-10 h-12 text-wheatDark mx-auto mb-4 opacity-60" />
            <p className="display text-lg mb-3">Nothing in inventory yet.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn btn-primary text-sm"
            >
              + Add your first product
            </button>
          </div>
        )}
      </div>

      {broadcastResult && (
        <div className="fixed bottom-6 right-6 max-w-sm paper p-5 bg-moss/10 border-mossDark/40 shadow-lg">
          <div className="small-caps text-xs text-mossDark mb-1">
            Broadcast sent
          </div>
          <p className="text-sm leading-snug">{broadcastResult}</p>
        </div>
      )}

      {broadcastFor && (
        <BroadcastModal
          product={broadcastFor}
          recipientCount={demoMembers.filter((m) => m.status === "active").length}
          onConfirm={() => confirmBroadcast(broadcastFor)}
          onClose={() => setBroadcastFor(null)}
        />
      )}
    </div>
  );
}

function BroadcastModal({
  product: p,
  recipientCount,
  onConfirm,
  onClose,
}: {
  product: DemoProduct;
  recipientCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const keyword = p.name.split(" ")[0]?.toUpperCase() ?? "YES";
  const preview = `${p.name} just came in — ${p.inventory_now} ${p.unit_label}${
    (p.inventory_now ?? 0) !== 1 ? "s" : ""
  } at ${formatCents(p.price_cents)}/${p.unit_label}. Reply ${keyword} to claim one. First come, first served.`;

  const blocked = broadcastBlocked(p);
  const lastSent = p.broadcast_sent_at
    ? new Date(p.broadcast_sent_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 bg-soil/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="paper max-w-lg w-full p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="small-caps text-xs text-brick mb-2">
          Tell the share list
        </div>
        <h3 className="display text-2xl font-medium mb-1">{p.name}</h3>
        <p className="text-sm text-soil/65 italic mb-5">
          This will text every active member of your share list. Once.
        </p>

        <div className="border border-soil/15 rounded-lg p-4 bg-cream2/30 text-sm leading-relaxed">
          <div className="small-caps text-[10px] text-soil/45 mb-2">
            Message preview
          </div>
          {preview}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
          <div>
            <div className="small-caps text-[10px] text-soil/45">Recipients</div>
            <div className="display text-xl">{recipientCount} members</div>
          </div>
          <div>
            <div className="small-caps text-[10px] text-soil/45">Last sent</div>
            <div className="display text-base">
              {lastSent ?? <span className="italic text-soil/45">never</span>}
            </div>
          </div>
        </div>

        {blocked && (
          <div className="mt-5 text-xs text-brick italic leading-snug border-t border-soil/15 pt-4">
            You broadcast this less than four hours ago. Sending again now
            would mean two pings to the same phones today. Wait it out, or
            cancel.
          </div>
        )}

        <div className="border-t border-soil/15 mt-6 pt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={blocked}
            className="btn btn-primary text-sm disabled:opacity-50"
          >
            {blocked ? "Cooling down" : `Send to ${recipientCount} →`}
          </button>
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
  onTellTheList,
}: {
  product: DemoProduct;
  onToggleSoldOut: () => void;
  onTellTheList: () => void;
}) {
  const cap = p.inventory_cap ?? 0;
  const now = p.inventory_now ?? 0;
  const pct = cap > 0 ? Math.max(0, Math.min(100, (now / cap) * 100)) : 100;
  const offSeason = isOutOfSeason(p);
  const broadcastCooling = broadcastBlocked(p);
  const seasonEnd = p.available_through
    ? new Date(p.available_through).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      className={`paper p-6 flex flex-col gap-3 transition-opacity ${
        p.is_sold_out || offSeason ? "opacity-60" : ""
      } ${p.is_limited ? "border-wheat/60 bg-wheat/5" : ""}`}
    >
      {p.is_limited && (
        <div className="flex items-center justify-between -mt-1 mb-1">
          <span className="small-caps text-[10px] tracking-[0.18em] text-brick">
            {offSeason
              ? "Out of season"
              : p.is_sold_out
                ? `Sold out · ${cap} claimed`
                : `Limited · ${now} left`}
          </span>
          {seasonEnd && !offSeason && (
            <span className="text-[10px] italic text-soil/55">
              through {seasonEnd}
            </span>
          )}
        </div>
      )}

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

      <div className="mt-1 flex flex-col gap-2">
        <button
          type="button"
          onClick={onToggleSoldOut}
          className={`py-2 rounded-md text-sm display border transition-colors ${
            p.is_sold_out
              ? "border-moss text-mossDark hover:bg-moss/10"
              : "border-soil/20 text-soil/65 hover:border-brick hover:text-brick"
          }`}
        >
          {p.is_sold_out ? "Mark back in stock" : "Mark sold out"}
        </button>

        {p.is_limited && !offSeason && !p.is_sold_out && (
          <button
            type="button"
            onClick={onTellTheList}
            disabled={broadcastCooling}
            className="py-2 rounded-md text-sm display border border-brick text-brick hover:bg-brick/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              broadcastCooling
                ? "Already broadcast within the last four hours."
                : "Text every active share-list member that this just came in."
            }
          >
            {broadcastCooling
              ? "Already broadcast — cooling down"
              : p.broadcast_sent_at
                ? "Broadcast again"
                : "Tell the list →"}
          </button>
        )}
      </div>
    </div>
  );
}
