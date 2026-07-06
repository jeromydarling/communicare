"use client";

import { useEffect, useState } from "react";
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
import {
  openBillingPortal,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getMeWithFarm,
  DATA_EXPORT_URL,
} from "@/lib/farmer/api";

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
  const [status, setStatus] = useState<string>("unpaid");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<string>(defaultResumeDate());

  useEffect(() => {
    let cancelled = false;
    getMeWithFarm().then((r) => {
      if (cancelled) return;
      if ("billing" in r && r.billing?.subscription_status) {
        setStatus(r.billing.subscription_status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runPortal() {
    setError(null);
    setBusy("portal");
    const res = await openBillingPortal();
    setBusy(null);
    if ("error" in res) return setError(res.error);
    window.location.href = res.url;
  }

  async function runPause() {
    setError(null);
    setBusy("pause");
    const res = await pauseSubscription({ resume_at: resumeAt });
    setBusy(null);
    if ("error" in res) return setError(res.error);
    setStatus("paused");
    setFlash(`Paused. See you around ${resumeAt}.`);
    setTimeout(() => setFlash(null), 4000);
  }

  async function runResume() {
    setError(null);
    setBusy("resume");
    const res = await resumeSubscription();
    setBusy(null);
    if ("error" in res) return setError(res.error);
    setStatus("active");
    setFlash("Welcome back.");
    setTimeout(() => setFlash(null), 4000);
  }

  async function runCancel() {
    if (
      !confirm(
        "Cancel your subscription? You'll keep access until the end of the current billing period. We'll email you a copy of your data.",
      )
    )
      return;
    setError(null);
    setBusy("cancel");
    const res = await cancelSubscription();
    setBusy(null);
    if ("error" in res) return setError(res.error);
    setFlash(
      "Canceled. Look for the note from gardener@thecros.app with your data export.",
    );
    setTimeout(() => setFlash(null), 6000);
  }

  return (
    <section className="paper p-8">
      <div className="small-caps text-xs text-brick mb-2">Billing</div>
      <h2 className="display text-2xl font-medium mb-3">
        Manage your subscription.
      </h2>
      <p className="text-sm text-soil/75 mb-5">
        Nine dollars a month keeps the farm desk open. Pause it when your
        season ends, cancel any time, or open the Stripe billing portal
        for cards and invoices.
      </p>

      {error && (
        <div className="border border-brick bg-brick/5 px-3 py-2 text-brick text-sm mb-4">
          {error}
        </div>
      )}
      {flash && (
        <div className="border border-mossDark bg-mossDark/5 px-3 py-2 text-mossDark text-sm mb-4">
          {flash}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <div className="border border-soil/10 rounded p-5">
          <div className="small-caps text-[10px] text-brick mb-2">
            Pause for the season
          </div>
          <p className="text-sm text-soil/75 leading-snug mb-3">
            Winter dormancy for your farm desk. No bills, no texts, dashboard
            stays read-only. Auto-resumes on the date you pick.
          </p>
          {status === "paused" ? (
            <button
              type="button"
              onClick={runResume}
              disabled={busy !== null}
              className="btn btn-primary disabled:opacity-50 text-sm"
            >
              {busy === "resume" ? "Resuming…" : "Resume now →"}
            </button>
          ) : (
            <div className="space-y-2">
              <label className="label text-xs" htmlFor="resume-date">
                Resume on
              </label>
              <input
                id="resume-date"
                type="date"
                className="field"
                value={resumeAt}
                min={tomorrow()}
                onChange={(e) => setResumeAt(e.target.value)}
              />
              <button
                type="button"
                onClick={runPause}
                disabled={busy !== null || status !== "active"}
                className="btn btn-ghost disabled:opacity-50 text-sm"
              >
                {busy === "pause" ? "Pausing…" : "Pause the desk"}
              </button>
            </div>
          )}
        </div>

        <div className="border border-soil/10 rounded p-5">
          <div className="small-caps text-[10px] text-brick mb-2">
            Cards, invoices, receipts
          </div>
          <p className="text-sm text-soil/75 leading-snug mb-3">
            Update your card, download past invoices, or view every charge.
            Stripe hosts the whole page.
          </p>
          <button
            type="button"
            onClick={runPortal}
            disabled={busy !== null}
            className="btn btn-ghost disabled:opacity-50 text-sm"
          >
            {busy === "portal" ? "Opening Stripe…" : "Open billing portal →"}
          </button>
        </div>
      </div>

      <div className="border-t border-soil/15 mt-8 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="small-caps text-[10px] text-soil/55 mb-1">
            Take your data
          </div>
          <p className="text-sm text-soil/70">
            A full JSON export of your farm, members, orders, SMS log, and
            everything else we hold about you — anytime, not just at cancel.
          </p>
        </div>
        <a
          href={DATA_EXPORT_URL}
          className="btn btn-ghost text-sm whitespace-nowrap"
        >
          Download my export ↓
        </a>
      </div>

      <div className="border-t border-soil/15 mt-6 pt-6">
        <button
          type="button"
          onClick={runCancel}
          disabled={busy !== null}
          className="text-brick hover:underline text-sm italic disabled:opacity-50"
        >
          {busy === "cancel" ? "Canceling…" : "Cancel my subscription"}
        </button>
        <p className="text-xs text-soil/55 mt-1 italic">
          Keeps access through the end of the current period. One honest note
          from us before you go.
        </p>
      </div>
    </section>
  );
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultResumeDate(): string {
  // Six months out — a reasonable "next season" pick that the farmer
  // can adjust before clicking Pause.
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
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
