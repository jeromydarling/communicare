"use client";

import { useEffect, useState } from "react";
import { getMeWithFarm } from "@/lib/farmer/api";
import { PageHeader } from "@/components/farmer/shell";
import {
  demoFarm,
  demoMembers,
  demoOrders,
  demoProducts,
  demoSms,
} from "@/lib/farmer-demo";
import { downloadBundle, downloadCsv } from "@/lib/csv-export";
import { HortusIntegrationCard } from "./HortusIntegrationCard";
import { PendingCropMappings } from "./PendingCropMappings";
import { openBillingPortal } from "@/lib/farmer/api";

export default function FarmerSettingsPage() {
  const [farmId, setFarmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getMeWithFarm();
      if (cancelled) return;
      if ("ok" in me && me.ok && me.farm) setFarmId(me.farm.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Your farm's details"
        title="Settings."
        subtitle="What members see, where they pick up, who else can manage the farm."
      />

      <div className="px-6 md:px-10 py-8 max-w-3xl space-y-8">
        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">Farm profile</div>
          <h2 className="display text-2xl font-medium mb-6">
            How members find you.
          </h2>

          <div className="space-y-5">
            <Field label="Farm name" defaultValue={demoFarm.name} />
            <Field label="Location" defaultValue={demoFarm.location} />
            <Field label="Founder(s)" defaultValue="Hannah & Ben Walsh" />
            <Field label="Short tagline" defaultValue="A hundred acres, kept by two of us." />
            <Field label="Domain" defaultValue="wren-hollow.communicare.farm" hint="Add a custom domain in the Domains tab." />
          </div>

          <div className="border-t border-soil/15 pt-5 mt-6">
            <button className="btn btn-primary">Save profile</button>
          </div>
        </section>

        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">Notifications</div>
          <h2 className="display text-2xl font-medium mb-6">
            When we should reach you.
          </h2>

          <div className="space-y-4">
            <Toggle
              label="SMS me when a member sends a question we couldn't auto-handle"
              defaultChecked
            />
            <Toggle
              label="Email me a daily roster the morning of each pickup day"
              defaultChecked
            />
            <Toggle
              label="Email me a weekly summary on Mondays"
              defaultChecked
            />
            <Toggle label="SMS me when a payment fails" defaultChecked />
            <Toggle label="Send me product updates from Communicare" />
          </div>
        </section>

        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">Team</div>
          <h2 className="display text-2xl font-medium mb-6">
            Other people who help you run the farm.
          </h2>

          <ul className="divide-y divide-soil/10">
            <li className="py-4 flex items-center justify-between">
              <div>
                <div className="display">Hannah Walsh</div>
                <div className="text-xs text-soil/55">
                  hannah@wrenhollow.farm · Owner
                </div>
              </div>
              <span className="small-caps text-[10px] text-mossDark">You</span>
            </li>
            <li className="py-4 flex items-center justify-between">
              <div>
                <div className="display">Ben Walsh</div>
                <div className="text-xs text-soil/55">
                  ben@wrenhollow.farm · Owner
                </div>
              </div>
              <button className="text-xs display italic text-soil/45 hover:text-brick">
                Manage
              </button>
            </li>
          </ul>
          <div className="mt-6">
            <button className="btn btn-ghost text-sm">+ Invite someone</button>
          </div>
        </section>

        {/* Integrations */}
        {farmId && (
          <section className="paper p-8">
            <div className="small-caps text-xs text-brick mb-2">Integrations</div>
            <h2 className="display text-2xl font-medium mb-6">
              Connect your other tools.
            </h2>
            <div className="space-y-4">
              <HortusIntegrationCard farmId={farmId} />
              <PendingCropMappings farmId={farmId} />
            </div>
          </section>
        )}

        <BillingSection />

        <section className="paper p-8 border-brick/30 bg-brick/5">
          <div className="small-caps text-xs text-brickDark mb-2">
            Take your farm with you
          </div>
          <h2 className="display text-2xl font-medium mb-3 text-brickDark">
            Export everything, or close this farm.
          </h2>
          <p className="text-sm text-soil/75 mb-5">
            One-click CSV of every member, order, product, subscription, and
            ledger entry. No retention loop, no contract. Closing your farm
            removes you from Communicare and stops billing.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                downloadBundle([
                  { filename: "members.csv", rows: demoMembers },
                  { filename: "orders.csv", rows: demoOrders.map((o) => ({ ...o, items: o.items.join(" | ") })) },
                  { filename: "products.csv", rows: demoProducts },
                  { filename: "sms.csv", rows: demoSms },
                ])
              }
              className="btn btn-ghost text-sm"
            >
              Download a full export (4 CSVs)
            </button>
            <button
              type="button"
              onClick={() => downloadCsv("members.csv", demoMembers)}
              className="btn btn-ghost text-sm"
            >
              Just members
            </button>
            <button className="btn text-sm text-brick border-brick hover:bg-brick hover:text-parchment">
              Close this farm
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function BillingSection() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="paper p-8">
      <div className="small-caps text-xs text-brick mb-2">Billing</div>
      <h2 className="display text-2xl font-medium mb-3">
        Manage your subscription.
      </h2>
      <p className="text-sm text-soil/75 mb-5">
        Update your card, view invoices, or cancel. Stripe handles all of it
        through their billing portal.
      </p>
      {error && (
        <div className="border border-brick bg-brick/5 px-3 py-2 text-brick text-sm mb-4">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          setError(null);
          setBusy(true);
          const res = await openBillingPortal();
          setBusy(false);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          window.location.href = res.url;
        }}
        className="btn btn-primary disabled:opacity-50"
        disabled={busy}
      >
        {busy ? "Opening Stripe…" : "Open billing portal →"}
      </button>
    </section>
  );
}

function Field({
  label,
  defaultValue,
  hint,
}: {
  label: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" defaultValue={defaultValue} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function Toggle({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 w-4 h-4 accent-mossDark"
      />
      <span className="text-soil/85">{label}</span>
    </label>
  );
}
