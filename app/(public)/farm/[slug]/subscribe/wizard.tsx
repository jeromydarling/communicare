"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SampleFarm } from "@/lib/sample-farms";
import { Sun, Wheat, Leaf, Mark } from "@/components/mark";
import { CLOSING_BLESSING } from "@/lib/brand-strings";

const STEPS = ["Your details", "Pickup", "Add-ons", "Confirm"] as const;

const ADD_ONS = [
  { id: "eggs", label: "1 dozen pastured eggs · weekly", price: 800 },
  { id: "bouquet", label: "Sunflower bouquet · weekly", price: 1500 },
  { id: "cream", label: "1/2 gal raw cream · biweekly", price: 1800 },
  { id: "newsletter", label: "Weekly recipe newsletter (free)", price: 0 },
];

export function SubscribeWizard({ farm }: { farm: SampleFarm }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pickup, setPickup] = useState(farm.pickup[0]?.place ?? "");
  const [addons, setAddons] = useState<Set<string>>(new Set(["newsletter"]));
  const [billing, setBilling] = useState<"monthly" | "season">("monthly");
  const [done, setDone] = useState(false);

  function toggle(id: string) {
    setAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function next() {
    if (step < 3) setStep((s) => s + 1);
    else {
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
    else router.push(`/farm/${farm.slug}/`);
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <Sun className="w-16 h-16 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          You&apos;re on the list
        </div>
        <h1 className="display text-5xl font-medium leading-tight mb-6">
          Welcome to {farm.name}, {name.split(" ")[0]}.
        </h1>
        <p className="text-lg text-soil/80 leading-relaxed">
          We sent a magic link to{" "}
          <span className="display">{email}</span> so you can come in and
          manage your share. We&apos;ll text you on Monday with what&apos;s in
          your first box.
        </p>
        <p className="display italic text-brick mt-8 text-xl">{CLOSING_BLESSING}</p>
        <div className="rule my-12" />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/farm/${farm.slug}/`} className="btn btn-ghost">
            Back to the farm page
          </Link>
          <Link href="/share/" className="btn btn-primary">
            See your share →
          </Link>
        </div>
      </div>
    );
  }

  const sharePrice = billing === "season" ? 62000 : 3600;
  const addonsTotal = ADD_ONS.filter((a) => addons.has(a.id)).reduce(
    (s, a) => s + a.price,
    0,
  );
  const totalDue =
    billing === "season"
      ? sharePrice + addonsTotal * 22
      : sharePrice + addonsTotal;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <Mark className="w-10 h-10 text-brick mx-auto mb-4" />
        <div className="small-caps text-xs text-brick mb-2">
          Subscribe to the share
        </div>
        <h1 className="display text-4xl md:text-5xl font-medium leading-tight">
          {farm.name}
        </h1>
        <div className="text-soil/65 italic mt-1">{farm.location}</div>
      </div>

      <StepIndicator current={step} />

      <div className="grid md:grid-cols-[1fr_320px] gap-8 mt-8">
        <div className="paper p-8 md:p-10">
          {step === 0 && (
            <StepDetails
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
            />
          )}
          {step === 1 && (
            <StepPickup farm={farm} pickup={pickup} setPickup={setPickup} />
          )}
          {step === 2 && (
            <StepAddOns
              addons={addons}
              toggle={toggle}
              billing={billing}
              setBilling={setBilling}
            />
          )}
          {step === 3 && (
            <StepConfirm
              farm={farm}
              name={name}
              email={email}
              pickup={pickup}
              addons={addons}
              billing={billing}
            />
          )}

          <div className="pt-6 mt-8 border-t border-soil/15 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              className="display italic text-soil/65 hover:text-brick text-sm"
            >
              {step === 0 ? "← Cancel" : "← Back"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={
                (step === 0 && (!name || !email)) ||
                (step === 1 && !pickup)
              }
              className="btn btn-primary disabled:opacity-50"
            >
              {step === 3 ? "Confirm subscription →" : "Next →"}
            </button>
          </div>
        </div>

        <aside className="md:sticky md:top-24 self-start">
          <div className="paper p-6">
            <div className="small-caps text-[10px] text-brick mb-3">
              Your share
            </div>
            <div className="space-y-3 text-sm">
              <Row
                k="Standard share"
                v={billing === "season" ? "$620" : "$36/wk"}
              />
              {ADD_ONS.filter((a) => addons.has(a.id) && a.price > 0).map(
                (a) => (
                  <Row
                    key={a.id}
                    k={a.label.split(" · ")[0]}
                    v={
                      billing === "season"
                        ? `$${((a.price * 22) / 100).toLocaleString("en-US")}`
                        : `$${(a.price / 100).toFixed(2)}/wk`
                    }
                  />
                ),
              )}
            </div>
            <div className="rule my-4" />
            <Row
              k={billing === "season" ? "Season total" : "Per pickup"}
              v={`$${(totalDue / 100).toLocaleString("en-US")}`}
              bold
            />
            {billing === "season" && (
              <div className="text-[10px] text-mossDark small-caps mt-2 text-right">
                5% bonus credit if you pay today
              </div>
            )}
          </div>

          <div className="paper p-5 mt-4 bg-cream/40">
            <div className="display text-sm mb-1">Pickup</div>
            <div className="text-xs text-soil/65">{pickup || "Pick one →"}</div>
          </div>

          <div className="text-[10px] text-soil/55 italic text-center mt-4">
            We never auto-charge without your say. Pause, skip, gift, or cancel
            any week by text.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={bold ? "display text-base" : "text-soil/75"}>{k}</span>
      <span className={`display ${bold ? "text-lg text-brick" : ""}`}>{v}</span>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
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

function StepDetails({
  name,
  setName,
  email,
  setEmail,
}: {
  name: string;
  setName: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round one</div>
      <h2 className="display text-2xl font-medium mb-6">Who are you?</h2>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@somewhere.com"
          />
          <div className="hint">
            We send the weekly share text to your phone, and a magic link to
            this email so you can manage your subscription.
          </div>
        </div>
      </div>
    </>
  );
}

function StepPickup({
  farm,
  pickup,
  setPickup,
}: {
  farm: SampleFarm;
  pickup: string;
  setPickup: (s: string) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round two</div>
      <h2 className="display text-2xl font-medium mb-6">
        Where will you pick up?
      </h2>
      <div className="space-y-3">
        {farm.pickup.map((p) => {
          const active = pickup === p.place;
          return (
            <button
              key={p.place}
              type="button"
              onClick={() => setPickup(p.place)}
              className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                active
                  ? "border-brick bg-brick/5"
                  : "border-soil/15 hover:border-soil/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <Wheat className="w-5 h-7 text-wheatDark shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="display text-base">{p.place}</div>
                  <div className="text-xs text-soil/65 italic mt-0.5">
                    {p.day}, {p.window}
                  </div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 shrink-0 ${active ? "bg-brick border-brick" : "border-soil/30"}`}
                />
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-soil/55 italic mt-5">
        You can change this any week by replying to your share text — say{" "}
        <span className="font-mono not-italic">pickup farm</span> or{" "}
        <span className="font-mono not-italic">pickup library</span>.
      </p>
    </>
  );
}

function StepAddOns({
  addons,
  toggle,
  billing,
  setBilling,
}: {
  addons: Set<string>;
  toggle: (id: string) => void;
  billing: "monthly" | "season";
  setBilling: (b: "monthly" | "season") => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Round three</div>
      <h2 className="display text-2xl font-medium mb-6">
        Anything else with your share?
      </h2>

      <div className="space-y-3 mb-8">
        {ADD_ONS.map((a) => {
          const active = addons.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={`w-full text-left px-5 py-4 rounded-md border transition-colors flex items-center gap-4 ${
                active
                  ? "border-brick bg-brick/5"
                  : "border-soil/15 hover:border-soil/30"
              }`}
            >
              <Leaf
                className={`w-6 h-6 shrink-0 ${active ? "text-brick" : "text-mossDark"}`}
              />
              <div className="flex-1">
                <div className="display text-base">
                  {a.label.split(" · ")[0]}
                </div>
                <div className="text-xs text-soil/65 italic">
                  {a.label.split(" · ")[1]}
                </div>
              </div>
              <div className="text-right">
                <div className="display">
                  {a.price > 0 ? `$${(a.price / 100).toFixed(2)}` : "Free"}
                </div>
                {a.price > 0 && (
                  <div className="text-[10px] text-soil/55">per pickup</div>
                )}
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 shrink-0 ${active ? "bg-brick border-brick" : "border-soil/30"}`}
              />
            </button>
          );
        })}
      </div>

      <div className="small-caps text-xs text-brick mb-3">
        How would you like to pay?
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            v: "monthly",
            t: "Monthly installments",
            d: "Same price; just spread out. Most members pay this way.",
          },
          {
            v: "season",
            t: "Pay for the season",
            d: "All up front — 5% bonus on top, paid to your credit balance.",
          },
        ].map((opt) => {
          const active = billing === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => setBilling(opt.v as "monthly" | "season")}
              className={`text-left p-5 rounded-md border transition-colors ${active ? "border-brick bg-brick/5" : "border-soil/15 hover:border-soil/30"}`}
            >
              <div className="display text-base mb-1">{opt.t}</div>
              <div className="text-xs text-soil/65 italic">{opt.d}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepConfirm({
  farm,
  name,
  email,
  pickup,
  addons,
  billing,
}: {
  farm: SampleFarm;
  name: string;
  email: string;
  pickup: string;
  addons: Set<string>;
  billing: "monthly" | "season";
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">One last look</div>
      <h2 className="display text-2xl font-medium mb-6">
        Confirm your subscription to {farm.name}.
      </h2>

      <dl className="space-y-4">
        {[
          ["Subscriber", `${name} · ${email}`],
          ["Pickup", pickup],
          [
            "Add-ons",
            ADD_ONS.filter((a) => addons.has(a.id))
              .map((a) => a.label.split(" · ")[0])
              .join(", ") || "None",
          ],
          [
            "Billing",
            billing === "season"
              ? "Pay for the season (+5% bonus credit)"
              : "Monthly installments",
          ],
        ].map(([k, v]) => (
          <div
            key={k}
            className="grid grid-cols-[120px_1fr] gap-4 pb-3 border-b border-soil/10 last:border-0"
          >
            <dt className="small-caps text-[10px] text-soil/55 pt-1">{k}</dt>
            <dd className="text-soil/85">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-soil/55 italic mt-6 leading-relaxed">
        By confirming, you&apos;ll receive a magic link to {email}. We&apos;ll
        text you Monday with your first share contents. You can pause, skip,
        gift, or cancel from any text reply, with no notice.
      </p>
    </>
  );
}
