"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { formatCents } from "@/lib/farmer-demo";
import { Wheat, Barn } from "@/components/mark";

// Catch-weight reconciliation. Members reserve a share (a quarter beef, a
// half hog, a side of lamb) with a deposit. The animal goes to the butcher.
// Farmer comes back with the hanging-weight cut sheet and enters it here;
// the system computes the balance and queues it as a card charge.
//
// One demo dataset; in production this reads from supabase via
//   .from("orders")
//   .select("..., order_items!inner(*, products(*))")
//   .eq("status", "confirmed")
//   .is("order_items.actual_weight", null)
//   .eq("order_items.products.kind", "catch_weight")

type PendingShare = {
  id: string;
  member: string;
  memberEmail: string;
  product: string;
  pickupDate: string;
  pricePerLbCents: number;
  estimatedLbs: number;
  depositCents: number;
};

const SEED: PendingShare[] = [
  {
    id: "cw-1",
    member: "Priya Iyer",
    memberEmail: "priya@example.com",
    product: "Quarter Beef · steer #7 (Maggie's calf)",
    pickupDate: "Sat, Nov 23",
    pricePerLbCents: 595,
    estimatedLbs: 160,
    depositCents: 25000,
  },
  {
    id: "cw-2",
    member: "Daniel Walker",
    memberEmail: "daniel.w@example.com",
    product: "Half Hog · sow #3",
    pickupDate: "Sat, Nov 23",
    pricePerLbCents: 595,
    estimatedLbs: 95,
    depositCents: 15000,
  },
  {
    id: "cw-3",
    member: "Nina Hart",
    memberEmail: "nina@example.com",
    product: "Quarter Beef · steer #9",
    pickupDate: "Sat, Dec 7",
    pricePerLbCents: 595,
    estimatedLbs: 165,
    depositCents: 25000,
  },
];

type Entered = Record<string, string>;

export default function CatchWeightPage() {
  const [pending, setPending] = useState<PendingShare[]>(SEED);
  const [weights, setWeights] = useState<Entered>({});
  const [reconciled, setReconciled] = useState<
    {
      share: PendingShare;
      actualLbs: number;
      finalTotalCents: number;
      balanceDueCents: number;
    }[]
  >([]);

  function setWeight(id: string, v: string) {
    setWeights((w) => ({ ...w, [id]: v }));
  }

  function reconcile(share: PendingShare) {
    const lbs = parseFloat(weights[share.id] ?? "");
    if (!Number.isFinite(lbs) || lbs <= 0) return;

    const finalTotalCents = Math.round(lbs * share.pricePerLbCents);
    const balanceDueCents = Math.max(0, finalTotalCents - share.depositCents);

    setReconciled((r) => [
      { share, actualLbs: lbs, finalTotalCents, balanceDueCents },
      ...r,
    ]);
    setPending((p) => p.filter((x) => x.id !== share.id));
    setWeights((w) => {
      const next = { ...w };
      delete next[share.id];
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="The cut-sheet reconciliation"
        title="Catch-weight billing."
        subtitle="Animal goes to the butcher; cut sheet comes back; you enter the hanging weight here; the balance is auto-charged. The reconciliation that drove farms off Barn2Door."
      />

      <div className="px-6 md:px-10 py-8 space-y-10">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Waiting on weights" value={pending.length.toString()} />
          <Stat
            label="Deposits held"
            value={formatCents(
              pending.reduce((s, p) => s + p.depositCents, 0),
            )}
          />
          <Stat
            label="Reconciled this batch"
            value={reconciled.length.toString()}
            accent="moss"
          />
        </div>

        {/* Pending */}
        <section>
          <div className="small-caps text-xs text-brick mb-3">
            Waiting for the butcher
          </div>
          <h2 className="display text-2xl font-medium mb-5">
            {pending.length} share{pending.length === 1 ? "" : "s"} to weigh.
          </h2>

          {pending.length === 0 && (
            <div className="paper p-10 text-center">
              <Barn className="w-12 h-10 text-mossDark mx-auto mb-3 opacity-70" />
              <p className="display text-lg">All caught up.</p>
              <p className="text-soil/65 italic text-sm mt-1">
                Every reserved share has been weighed and the balance queued.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {pending.map((s) => {
              const enteredLbs = parseFloat(weights[s.id] ?? "");
              const preview = Number.isFinite(enteredLbs)
                ? Math.round(enteredLbs * s.pricePerLbCents)
                : null;
              const balance =
                preview !== null ? Math.max(0, preview - s.depositCents) : null;

              return (
                <div key={s.id} className="paper p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                      <div className="display text-lg font-medium leading-tight">
                        {s.member}
                      </div>
                      <div className="text-xs text-soil/55 italic mt-0.5">
                        {s.memberEmail} · pickup {s.pickupDate}
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="small-caps text-[10px] text-wheatDark mr-2">
                          Product
                        </span>
                        {s.product}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <Row k="Price" v={`${formatCents(s.pricePerLbCents)}/lb`} />
                      <Row k="Estimated" v={`${s.estimatedLbs} lbs`} />
                      <Row k="Deposit paid" v={formatCents(s.depositCents)} />
                    </div>
                  </div>

                  <div className="border-t border-soil/10 pt-5 grid sm:grid-cols-[1fr_auto] gap-4 items-end">
                    <div>
                      <label
                        htmlFor={`w-${s.id}`}
                        className="label flex items-baseline justify-between"
                      >
                        <span>Hanging weight from the cut sheet</span>
                        <span className="text-[10px] text-soil/45 italic font-body">
                          to the tenth of a pound
                        </span>
                      </label>
                      <div className="flex gap-2 items-stretch">
                        <input
                          id={`w-${s.id}`}
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          placeholder={`e.g. ${s.estimatedLbs.toFixed(1)}`}
                          value={weights[s.id] ?? ""}
                          onChange={(e) => setWeight(s.id, e.target.value)}
                          className="field flex-1 font-mono"
                        />
                        <div className="bg-cream border border-outline rounded-md px-4 grid place-items-center text-soil/55 font-mono text-sm">
                          lbs
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => reconcile(s)}
                      disabled={!Number.isFinite(enteredLbs) || enteredLbs <= 0}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      Reconcile →
                    </button>
                  </div>

                  {/* Live preview of what the balance will be */}
                  {preview !== null && balance !== null && (
                    <div className="mt-4 p-4 bg-wheat/10 border border-wheat/30 rounded text-sm grid sm:grid-cols-3 gap-3">
                      <PreviewLine label="Final total" value={formatCents(preview)} />
                      <PreviewLine label="Less deposit" value={`−${formatCents(s.depositCents)}`} />
                      <PreviewLine
                        label="To charge"
                        value={formatCents(balance)}
                        bold
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Reconciled */}
        {reconciled.length > 0 && (
          <section>
            <div className="small-caps text-xs text-brick mb-3">
              Just reconciled
            </div>
            <h2 className="display text-2xl font-medium mb-5">
              Balance charges queued.
            </h2>
            <div className="paper overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-soil/15">
                  <tr className="text-left small-caps text-xs text-soil/55">
                    <th className="px-5 py-3 font-medium">Member</th>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium text-right">Actual</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium text-right">Charged</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciled.map((r) => (
                    <tr
                      key={r.share.id}
                      className="border-b border-soil/8 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <div className="display">{r.share.member}</div>
                        <div className="text-[11px] text-soil/55">
                          {r.share.memberEmail}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-soil/75">
                        {r.share.product}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {r.actualLbs.toFixed(1)} lbs
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCents(r.finalTotalCents)}
                      </td>
                      <td className="px-5 py-3 text-right display text-mossDark">
                        +{formatCents(r.balanceDueCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-cream/60 text-xs italic text-soil/65 border-t border-soil/10">
                Charges queue to the next Stripe batch (or, if you&apos;re on
                BYO mode, copy the rows above and run them through your
                processor). Members get an email receipt with the cut sheet
                attached.
              </div>
            </div>
          </section>
        )}

        <div className="paper p-6 bg-cream/40 max-w-2xl mx-auto text-center">
          <Wheat className="w-7 h-9 text-wheatDark mx-auto mb-2" />
          <p className="text-sm text-soil/70 italic leading-relaxed">
            Hanging weight is the carcass after head, hide, and offal —
            before the butcher trims. It&apos;s how every small farm in the
            country prices a beef share, and the reconciliation that drove
            most of you off the bigger platforms.
          </p>
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
  accent?: "wheat" | "moss";
}) {
  const color = accent === "moss" ? "text-mossDark" : "text-wheatDark";
  return (
    <div className="paper p-5">
      <div className={`display text-4xl font-medium leading-none ${color}`}>
        {value}
      </div>
      <div className="text-xs text-soil/55 small-caps mt-2">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-soil/55 small-caps">{k}</span>
      <span className="display">{v}</span>
    </div>
  );
}

function PreviewLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] text-soil/55 small-caps">{label}</div>
      <div className={`font-mono ${bold ? "text-brick text-lg" : "text-soil/85"}`}>
        {value}
      </div>
    </div>
  );
}
