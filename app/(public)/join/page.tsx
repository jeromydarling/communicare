"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Wheat } from "@/components/mark";
import type { FarmKind } from "@/lib/supabase/types";
import { CLOSING_BLESSING, SUPPORT_EMAIL } from "@/lib/brand-strings";

type FormData = {
  farm_name: string;
  location: string;
  farm_kind: FarmKind | "";
  current_tool: string;
  pain: string;
  name: string;
  email: string;
};

const EMPTY: FormData = {
  farm_name: "",
  location: "",
  farm_kind: "",
  current_tool: "",
  pain: "",
  name: "",
  email: "",
};

const KINDS: { label: string; value: FarmKind; hint: string }[] = [
  { label: "Vegetable CSA", value: "vegetable_csa", hint: "Weekly produce share, May–Oct" },
  { label: "Raw milk herd share", value: "raw_milk_herd_share", hint: "Dairy via herd-share contract" },
  { label: "Pastured meat", value: "pastured_meat", hint: "Beef, pork, chicken — by cut or share" },
  { label: "Pastured eggs", value: "pastured_eggs", hint: "Mobile coop, dozen-a-week subscription" },
  { label: "Mixed farm", value: "mixed_farm", hint: "A bit of everything" },
  { label: "Market garden", value: "market_garden", hint: "Small-scale, hand-worked" },
  { label: "Orchard / fruit", value: "orchard_fruit", hint: "Apples, pears, stone fruit" },
  { label: "Flower farm", value: "flower_farm", hint: "Bouquets, weddings, PYO" },
];

const TOOLS = [
  "Barn2Door",
  "Local Line",
  "Harvie (RIP)",
  "GrazeCart",
  "CSAware",
  "Shopify + apps",
  "Square + spreadsheets",
  "A spreadsheet and a binder",
  "Pen and paper",
  "Just starting out",
];

const STEPS = ["Your farm", "Where you are", "How to reach you"] as const;

export default function JoinPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (!data.farm_name || !data.location || !data.farm_kind) {
        setError("We need the farm's name, where it is, and what kind it is.");
        return;
      }
    }
    if (step === 1) {
      if (!data.current_tool && !data.pain) {
        setError("Tell us at least one — where you are, or what's hardest.");
        return;
      }
    }
    setStep((s) => (s + 1) as 0 | 1 | 2);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2);
  }

  async function submit() {
    setError(null);
    if (!data.name || !data.email) {
      setError("We need a name and email to write you back.");
      return;
    }
    setBusy(true);

    // POST to /api/waitlist (Turnstile-gated + rate-limited).
    // turnstileToken is rendered as null until the widget lands; the
    // Worker passes through when TURNSTILE_SECRET isn't set so dev
    // and pre-Turnstile deploys keep working.
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        farm_name: data.farm_name,
        location: data.location,
        farm_kind: (data.farm_kind as FarmKind) || null,
        current_tool: data.current_tool || null,
        note: data.pain || null,
        source: "landing",
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok && !(body?.error ?? "").toLowerCase().includes("duplicate")) {
      setError(
        `We couldn't save you to the list (${body?.error ?? `HTTP ${res.status}`}). Try again, or write us at ${SUPPORT_EMAIL}.`,
      );
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 md:py-28 text-center">
        <Sun className="w-16 h-16 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          Welcome to the circle
        </div>
        <h1 className="display text-5xl font-medium leading-tight mb-6">
          Thank you, {data.name.split(" ")[0]}.
        </h1>
        <p className="text-lg text-soil/80 leading-relaxed">
          We have you. We&apos;ll email when we&apos;re ready to receive your
          farm — with a magic link, no password to invent. In the meantime,
          the land needs you more than we do.
        </p>
        <p className="display italic text-brick mt-8 text-xl">{CLOSING_BLESSING}</p>

        <div className="rule my-12" />

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/demo" className="btn btn-primary">
            Open the demo →
          </Link>
          <Link href="/manifesto" className="btn btn-ghost">
            Read why we built this
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="text-center mb-10">
        <Wheat className="w-12 h-14 text-wheatDark mx-auto mb-5" />
        <div className="small-caps text-xs text-brick mb-3">
          The early circle
        </div>
        <h1 className="display text-5xl md:text-6xl font-medium leading-[1.0]">
          Join us.
        </h1>
        <p className="mt-5 text-lg text-soil/75 leading-relaxed max-w-md mx-auto">
          Three quick rounds. We&apos;ll email when we&apos;re ready to bring
          your farm on.
        </p>
      </div>

      <StepIndicator current={step} />

      <div className="paper p-8 md:p-10 mt-6">
        {step === 0 && <StepFarm data={data} update={update} />}
        {step === 1 && <StepCurrent data={data} update={update} />}
        {step === 2 && <StepContact data={data} update={update} />}

        {error && (
          <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm mt-6">
            {error}
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-soil/15 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="display italic text-soil/65 hover:text-brick text-sm"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="button" onClick={next} className="btn btn-primary">
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="btn btn-primary disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send →"}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-soil/55 italic mt-8 max-w-md mx-auto leading-relaxed">
        Already running a farm share? When we&apos;re ready, we&apos;ll
        migrate you from Harvie, Barn2Door, Local Line, or your
        spreadsheets — by hand, free of charge.
      </p>
    </div>
  );
}

function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 justify-center flex-wrap">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-xs display border transition-colors ${
                  state === "active"
                    ? "bg-brick text-parchment border-brick"
                    : state === "done"
                      ? "bg-mossDark text-parchment border-mossDark"
                      : "bg-parchment text-soil/45 border-soil/20"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs display ${state === "active" ? "text-soil" : "text-soil/45"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="text-soil/20 mx-1">·····</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepFarm({
  data,
  update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round one</div>
      <h2 className="display text-2xl font-medium mb-6">
        Tell us about your farm.
      </h2>

      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="farm_name">
            What&apos;s the farm called?
          </label>
          <input
            id="farm_name"
            className="field"
            value={data.farm_name}
            onChange={(e) => update("farm_name", e.target.value)}
            placeholder="e.g. Three Forks Dairy"
          />
        </div>

        <div>
          <label className="label" htmlFor="location">
            Where is it?
          </label>
          <input
            id="location"
            className="field"
            value={data.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="County, State"
          />
        </div>

        <div>
          <label className="label">What do you do?</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {KINDS.map((opt) => {
              const active = data.farm_kind === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("farm_kind", opt.value)}
                  className={`text-left px-4 py-3 rounded-md border transition-colors ${
                    active
                      ? "border-brick bg-brick/5 text-soil"
                      : "border-soil/15 hover:border-soil/30"
                  }`}
                >
                  <div className="display text-sm">{opt.label}</div>
                  <div className="text-[11px] text-soil/55 italic">
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StepCurrent({
  data,
  update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round two</div>
      <h2 className="display text-2xl font-medium mb-6">
        Where you are right now.
      </h2>

      <div className="space-y-5">
        <div>
          <label className="label">What are you using today?</label>
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((t) => {
              const active = data.current_tool === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    update("current_tool", active ? "" : t)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active
                      ? "border-brick bg-brick/5 text-brick"
                      : "border-soil/15 text-soil/65 hover:border-soil/30"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pain">
            What&apos;s the most painful part?
          </label>
          <textarea
            id="pain"
            className="field"
            rows={4}
            value={data.pain}
            onChange={(e) => update("pain", e.target.value)}
            placeholder="The thing you'd most like solved. Members forgetting passwords. The Barn2Door contract. Chasing Venmos. A binder of herd-share contracts. Reconciling beef-share hanging weights. Anything."
          />
          <div className="hint">
            We read every one of these by hand. Be specific.
          </div>
        </div>
      </div>
    </>
  );
}

function StepContact({
  data,
  update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round three</div>
      <h2 className="display text-2xl font-medium mb-6">
        How to reach you.
      </h2>

      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="field"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="What we should call you"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@yourfarm.com"
          />
          <div className="hint">
            We write only when we&apos;re ready. No marketing emails. Ever.
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-soil/15 pt-6">
        <div className="small-caps text-[10px] text-soil/55 mb-3">
          What we have so far
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ["Farm", data.farm_name || "—"],
            ["Where", data.location || "—"],
            [
              "What",
              data.farm_kind ? readableKind(data.farm_kind as FarmKind) : "—",
            ],
            ["Today", data.current_tool || "—"],
            ["Hardest part", data.pain || "—"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-soil/55 small-caps text-[10px] pt-1">{k}</dt>
              <dd className="text-soil/85">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

function readableKind(k: FarmKind): string {
  return KINDS.find((opt) => opt.value === k)?.label ?? k;
}
