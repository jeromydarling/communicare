"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";

type Mode = "byo" | "managed";

export default function FarmerPaymentsPage() {
  const [mode, setMode] = useState<Mode>("byo");
  const [byoKind, setByoKind] = useState<
    "stripe" | "square" | "venmo" | "zelle" | "cash"
  >("stripe");

  return (
    <div>
      <PageHeader
        eyebrow="How you take money"
        title="Payments."
        subtitle="Bring your own processor — we don't touch your money. Or hand it over and pay us 1%."
      />

      <div className="px-6 md:px-10 py-8 space-y-8">
        {/* Mode picker */}
        <div className="grid md:grid-cols-2 gap-5">
          <ModeCard
            active={mode === "byo"}
            onClick={() => setMode("byo")}
            title="Bring your own processor"
            price="$0 platform fee"
            blurb="Stripe, Square, Venmo, ACH, cash at pickup — keep doing what you do. We generate the right checkout link per order. Money settles directly to you."
          />
          <ModeCard
            active={mode === "managed"}
            onClick={() => setMode("managed")}
            title="Managed payments"
            price="1% platform fee + Stripe pass-through"
            blurb="We set you up on Stripe Connect Express in five minutes, hold the merchant relationship, handle disputes and payouts, and issue your 1099. The only thing we ever charge you a percentage for."
          />
        </div>

        {mode === "byo" ? <ByoEditor kind={byoKind} setKind={setByoKind} /> : <ManagedEditor />}

        <div className="text-xs text-soil/55 italic text-center max-w-xl mx-auto">
          You can switch modes any time. Members never notice — they see the
          same checkout flow either way.
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  price,
  blurb,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  price: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`paper p-6 text-left transition-colors ${
        active ? "ring-2 ring-brick" : "hover:bg-cream/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="display text-xl font-medium">{title}</h3>
        {active && (
          <span className="text-[10px] small-caps text-brick">Selected</span>
        )}
      </div>
      <div className="text-sm display text-wheatDark mb-3">{price}</div>
      <p className="text-sm text-soil/75 leading-relaxed">{blurb}</p>
    </button>
  );
}

function ByoEditor({
  kind,
  setKind,
}: {
  kind: "stripe" | "square" | "venmo" | "zelle" | "cash";
  setKind: (k: "stripe" | "square" | "venmo" | "zelle" | "cash") => void;
}) {
  return (
    <div className="paper p-8">
      <div className="small-caps text-xs text-brick mb-2">Pick your weapon</div>
      <h2 className="display text-2xl font-medium mb-6">
        How members pay you today.
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
        {(
          [
            { value: "stripe", label: "Stripe" },
            { value: "square", label: "Square" },
            { value: "venmo", label: "Venmo" },
            { value: "zelle", label: "Zelle" },
            { value: "cash", label: "Cash at pickup" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setKind(opt.value)}
            className={`py-3 px-4 rounded-md text-sm display border transition-colors ${
              kind === opt.value
                ? "border-brick bg-brick/5 text-brick"
                : "border-soil/15 text-soil/65 hover:border-soil/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {kind === "stripe" && (
        <div className="space-y-4">
          <div>
            <label className="label">Stripe secret key</label>
            <input
              className="field font-mono text-sm"
              placeholder="sk_live_..."
              type="password"
            />
            <div className="hint">
              Stored encrypted via Supabase Vault. We never log it.
            </div>
          </div>
          <div>
            <label className="label">Stripe account ID</label>
            <input className="field font-mono text-sm" placeholder="acct_..." />
          </div>
        </div>
      )}

      {kind === "square" && (
        <div className="text-center py-12 paper bg-cream">
          <div className="display text-xl mb-2">Connect with Square</div>
          <p className="text-sm text-soil/65 mb-4">
            We'll redirect you to Square to authorize Communicare.
          </p>
          <button className="btn btn-primary">Connect Square →</button>
        </div>
      )}

      {(kind === "venmo" || kind === "zelle") && (
        <div className="space-y-4">
          <div>
            <label className="label">Your handle</label>
            <input
              className="field"
              placeholder={kind === "venmo" ? "@your-handle" : "your@email.com"}
            />
            <div className="hint">
              Members see a "{kind === "venmo" ? "Pay with Venmo" : "Pay via Zelle"}"
              button at checkout that deep-links to the right app.
            </div>
          </div>
        </div>
      )}

      {kind === "cash" && (
        <div className="text-soil/75 italic">
          Great — no setup. Orders are marked unpaid; you collect at pickup.
          Tap the green checkmark on the roster screen to mark each one paid.
        </div>
      )}

      <div className="border-t border-soil/15 pt-6 mt-8 flex items-center justify-between">
        <button className="btn btn-primary">Save</button>
        <div className="text-xs italic text-soil/55">
          You can change this any time.
        </div>
      </div>
    </div>
  );
}

function ManagedEditor() {
  const [step, setStep] = useState<"intro" | "connecting" | "done">("intro");

  return (
    <div className="paper p-8">
      <div className="small-caps text-xs text-brick mb-2">Managed Payments</div>
      <h2 className="display text-2xl font-medium mb-6">
        We set up Stripe for you.
      </h2>

      {step === "intro" && (
        <>
          <ul className="space-y-3 text-soil/85 mb-8">
            {[
              "We open a Stripe Connect Express account in your farm's name.",
              "You verify your ID and bank account on Stripe (~5 minutes).",
              "We handle disputes, payouts, and 1099-K issuance.",
              "Our 1% platform fee comes off the top of card and ACH charges.",
            ].map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-wheat display">№ {i + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setStep("connecting");
              setTimeout(() => setStep("done"), 1500);
            }}
            className="btn btn-primary"
          >
            Begin Stripe onboarding →
          </button>
        </>
      )}

      {step === "connecting" && (
        <div className="text-center py-8">
          <div className="display italic text-soil/65">
            Opening your Stripe Connect account…
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="border border-moss bg-moss/5 p-6 rounded">
          <div className="display text-lg font-medium text-mossDark mb-2">
            ✓ Stripe connected.
          </div>
          <p className="text-soil/75 text-sm">
            You're ready to take card and ACH payments. The 1% platform fee
            applies to processed volume only — no monthly minimum.
          </p>
        </div>
      )}
    </div>
  );
}
