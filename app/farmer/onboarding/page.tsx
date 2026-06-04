"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/farmer/shell";
import { Sun, Wheat, Barn, Leaf } from "@/components/mark";
import { StepBar } from "@/components/step-bar";
import {
  getMeWithFarm,
  createFarm,
  listShares,
  createShare,
  listPickupSites,
  createPickupSite,
  completeOnboarding,
} from "@/lib/farmer/api";
import { slugify } from "@/lib/slugify";
import { CLOSING_BLESSING, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand-strings";

const ONBOARDING_STEPS = ["Farm", "Share", "Pickup", "Members", "Done"] as const;

// =============================================================================
// /farmer/onboarding — first-five-minutes wizard.
// =============================================================================
// Auto-launched after sign-up and on any visit to /farmer/ where the farm
// hasn't been onboarded yet. The goal is that by the time the operator
// finally lands on /farmer/, the dashboard isn't an empty shell — it has
// their share, their pickup, and (if they import) their members already.
//
// Five steps, all idempotent — close the browser at any point and you'll
// come back where you left off:
//
//   0. Welcome + tell us about your farm     → creates farms + farm_members(owner)
//   1. Define your first share               → inserts share_definitions
//   2. Add your first pickup site            → inserts pickup_sites
//   3. Import your customer list (or skip)   → routes to /farmer/import/?from=onboarding
//   4. Done                                  → sets farms.onboarded_at, opens /farmer/
//
// The wizard reads its own progress from the database — what's been created
// is the step state — so refreshing the page doesn't lose anything.
// =============================================================================

const FARM_KINDS: { id: FarmKind; label: string; example: string }[] = [
  { id: "vegetable_csa", label: "Vegetable CSA", example: "weekly produce shares" },
  { id: "raw_milk_herd_share", label: "Raw milk / herd share", example: "regulated herd-share dairy" },
  { id: "pastured_meat", label: "Pastured meat", example: "beef, pork, lamb shares" },
  { id: "pastured_eggs", label: "Pastured eggs", example: "weekly egg subscription" },
  { id: "mixed_farm", label: "Mixed farm", example: "a little of everything" },
  { id: "market_garden", label: "Market garden", example: "market plus farm-pickup" },
  { id: "orchard_fruit", label: "Orchard or fruit share", example: "seasonal fruit shares" },
  { id: "flower_farm", label: "Flower farm", example: "bouquet subscriptions" },
];

type FarmKind =
  | "vegetable_csa"
  | "raw_milk_herd_share"
  | "pastured_meat"
  | "pastured_eggs"
  | "mixed_farm"
  | "market_garden"
  | "orchard_fruit"
  | "flower_farm";

type ShareCadence = "weekly" | "biweekly" | "monthly" | "season_long" | "on_demand";
type BillingModel =
  | "pay_per_pickup"
  | "monthly_installment"
  | "season_upfront"
  | "monthly_boarding_fee";

const CADENCES: { id: ShareCadence; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every other week" },
  { id: "monthly", label: "Monthly" },
  { id: "season_long", label: "Whole season (one box)" },
  { id: "on_demand", label: "On demand" },
];

const BILLING: { id: BillingModel; label: string; hint: string }[] = [
  { id: "pay_per_pickup", label: "Pay-as-you-go", hint: "Credit account, debited each pickup" },
  { id: "monthly_installment", label: "Monthly installment", hint: "Billed automatically each month" },
  { id: "season_upfront", label: "Season upfront", hint: "One payment, then weekly pickups" },
  { id: "monthly_boarding_fee", label: "Monthly boarding fee", hint: "For herd-share dairies" },
];

const DAYS = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();

  // The "current" step is derived from what's in the database, but we let
  // the user override (e.g. they want to go back and re-edit). When state
  // is uncertain we land on step 0.
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 0 state
  const [farmName, setFarmName] = useState("");
  const [farmKind, setFarmKind] = useState<FarmKind | "">("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmId, setFarmId] = useState<string | null>(null);

  // Step 1 state
  const [shareName, setShareName] = useState("");
  const [shareCadence, setShareCadence] = useState<ShareCadence>("weekly");
  const [shareBilling, setShareBilling] = useState<BillingModel>("pay_per_pickup");
  const [sharePriceDollars, setSharePriceDollars] = useState("");

  // Step 2 state
  const [pickupName, setPickupName] = useState("");
  const [pickupDay, setPickupDay] = useState(3); // Wednesday default
  const [pickupStart, setPickupStart] = useState("16:00");
  const [pickupEnd, setPickupEnd] = useState("19:00");
  const [pickupAddress, setPickupAddress] = useState("");

  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // On mount, figure out where this farm is in the flow.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getMeWithFarm();
      if (cancelled) return;
      if (!("ok" in me) || !me.ok) {
        router.replace("/farmer/come-in/?next=%2Ffarmer%2Fonboarding%2F");
        return;
      }

      if (!me.farm) {
        // No farm yet — start at step 0
        setStep(0);
        setLoading(false);
        return;
      }
      setFarmId(me.farm.id);
      setFarmName(me.farm.name);
      setFarmKind(me.farm.kind as FarmKind);
      setFarmLocation(me.farm.location);
      if (me.farm.onboarded_at) {
        router.replace("/farmer/");
        return;
      }

      const [sharesRes, pickupsRes] = await Promise.all([
        listShares(),
        listPickupSites(),
      ]);
      if (cancelled) return;

      const hasShares =
        "ok" in sharesRes && sharesRes.ok && sharesRes.shares.length > 0;
      const hasPickups =
        "ok" in pickupsRes && pickupsRes.ok && pickupsRes.pickup_sites.length > 0;

      // Honor an explicit ?step= override (used when returning from import)
      const explicit = Number(params.get("step") ?? NaN);
      if (Number.isFinite(explicit) && explicit >= 0 && explicit <= 4) {
        setStep(explicit);
      } else if (!hasShares) {
        setStep(1);
      } else if (!hasPickups) {
        setStep(2);
      } else {
        setStep(3);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Step 0 → create the farm + farm_members(owner)
  // ---------------------------------------------------------------------------
  async function saveFarm() {
    if (!farmName.trim() || !farmKind || !farmLocation.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createFarm({
      name: farmName.trim(),
      slug: slugify(farmName.trim()),
      kind: farmKind,
      location: farmLocation.trim(),
    });
    setSaving(false);
    if (!("ok" in result) || !result.ok) {
      setError(result.error);
      return;
    }
    setFarmId(result.farm_id);
    setStep(1);
  }

  // ---------------------------------------------------------------------------
  // Step 1 → create the first share_definition
  // ---------------------------------------------------------------------------
  async function saveShare() {
    if (!farmId || !shareName.trim()) return;
    const priceCents = sharePriceDollars
      ? Math.round(parseFloat(sharePriceDollars) * 100)
      : undefined;
    setSaving(true);
    setError(null);
    const result = await createShare({
      name: shareName.trim(),
      cadence: shareCadence,
      billing_model: shareBilling,
      price_cents: priceCents,
    });
    setSaving(false);
    if (!("ok" in result) || !result.ok) {
      setError(result.error);
      return;
    }
    setStep(2);
  }

  // ---------------------------------------------------------------------------
  // Step 2 → create the first pickup_site
  // ---------------------------------------------------------------------------
  async function savePickup() {
    if (!farmId || !pickupName.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createPickupSite({
      name: pickupName.trim(),
      address: pickupAddress.trim() || undefined,
      day_of_week: pickupDay,
      window_start: pickupStart || undefined,
      window_end: pickupEnd || undefined,
    });
    setSaving(false);
    if (!("ok" in result) || !result.ok) {
      setError(result.error);
      return;
    }
    setStep(3);
  }

  // ---------------------------------------------------------------------------
  // Step 4 → mark onboarded_at and route to the dashboard
  // ---------------------------------------------------------------------------
  async function finishOnboarding() {
    if (!farmId) {
      router.replace("/farmer/");
      return;
    }
    setSaving(true);
    await completeOnboarding();
    router.replace("/farmer/");
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sun className="w-12 h-12 text-wheat mx-auto mb-4 animate-[spin_6s_linear_infinite]" />
          <div className="display italic text-soil/65">One moment.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="The first five minutes"
        title="Set up your farm."
        subtitle="Three quick things, and your dashboard is alive. You can change everything later — this is just the seed."
      />

      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <StepBar steps={ONBOARDING_STEPS} current={step} />

        <div className="paper p-8 md:p-10 mt-8">
          {step === 0 && (
            <Step0
              farmName={farmName}
              setFarmName={setFarmName}
              farmKind={farmKind}
              setFarmKind={setFarmKind}
              farmLocation={farmLocation}
              setFarmLocation={setFarmLocation}
            />
          )}
          {step === 1 && (
            <Step1
              shareName={shareName}
              setShareName={setShareName}
              shareCadence={shareCadence}
              setShareCadence={setShareCadence}
              shareBilling={shareBilling}
              setShareBilling={setShareBilling}
              sharePriceDollars={sharePriceDollars}
              setSharePriceDollars={setSharePriceDollars}
            />
          )}
          {step === 2 && (
            <Step2
              pickupName={pickupName}
              setPickupName={setPickupName}
              pickupAddress={pickupAddress}
              setPickupAddress={setPickupAddress}
              pickupDay={pickupDay}
              setPickupDay={setPickupDay}
              pickupStart={pickupStart}
              setPickupStart={setPickupStart}
              pickupEnd={pickupEnd}
              setPickupEnd={setPickupEnd}
            />
          )}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}

          {error && (
            <div className="text-xs text-brick italic mt-4">{error}</div>
          )}

          {/* Footer nav */}
          <div className="pt-6 mt-8 border-t border-soil/15 flex items-center justify-between gap-4">
            {step > 0 && step < 4 && step !== 3 ? (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="display italic text-soil/65 hover:text-brick text-sm"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step === 0 && (
              <button
                onClick={saveFarm}
                disabled={
                  saving ||
                  !farmName.trim() ||
                  !farmKind ||
                  !farmLocation.trim()
                }
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "Planting…" : "Next →"}
              </button>
            )}
            {step === 1 && (
              <button
                onClick={saveShare}
                disabled={saving || !shareName.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "Saving…" : "Next →"}
              </button>
            )}
            {step === 2 && (
              <button
                onClick={savePickup}
                disabled={saving || !pickupName.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "Saving…" : "Next →"}
              </button>
            )}
            {step === 3 && (
              <div className="flex flex-wrap items-center gap-4 ml-auto">
                <button
                  onClick={() => setStep(4)}
                  className="display italic text-sm text-soil/65 hover:text-brick"
                >
                  Skip — I&apos;ll seed members later
                </button>
                <Link
                  href="/farmer/import/?from=onboarding"
                  className="btn btn-primary"
                >
                  Bring my customer list →
                </Link>
              </div>
            )}
            {step === 4 && (
              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="btn btn-primary disabled:opacity-50 ml-auto"
              >
                {saving ? "Opening…" : "Open my farm →"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-soil/55 italic mt-8">
          Need help? Write{" "}
          <a
            href={SUPPORT_MAILTO}
            className="text-brick hover:underline not-italic"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          — a real person, usually back within the day.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step views
// -----------------------------------------------------------------------------

function Step0({
  farmName,
  setFarmName,
  farmKind,
  setFarmKind,
  farmLocation,
  setFarmLocation,
}: {
  farmName: string;
  setFarmName: (v: string) => void;
  farmKind: FarmKind | "";
  setFarmKind: (v: FarmKind) => void;
  farmLocation: string;
  setFarmLocation: (v: string) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Step one</div>
      <h2 className="display text-2xl font-medium mb-2">Tell us about your farm.</h2>
      <p className="text-sm text-soil/65 italic leading-snug mb-6">
        Just enough to set up your homepage and member roster. You can edit
        everything from settings later.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="farm-name" className="label">
            What&apos;s the farm called?
          </label>
          <input
            id="farm-name"
            className="field"
            placeholder="Three Forks Dairy"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            autoComplete="organization"
            autoFocus
          />
        </div>

        <div>
          <div className="label mb-2">What kind of farm?</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {FARM_KINDS.map((k) => {
              const active = farmKind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setFarmKind(k.id)}
                  className={`text-left p-3 rounded-md border transition-colors ${
                    active
                      ? "border-brick bg-brick/5"
                      : "border-soil/15 hover:border-soil/30"
                  }`}
                >
                  <div className="display text-sm">{k.label}</div>
                  <div className="text-[10px] text-soil/55 italic mt-0.5">
                    {k.example}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="farm-location" className="label">
            Where you&apos;re from
          </label>
          <input
            id="farm-location"
            className="field"
            placeholder="Athens County, Ohio"
            value={farmLocation}
            onChange={(e) => setFarmLocation(e.target.value)}
          />
          <p className="text-[11px] italic text-soil/55 mt-1.5">
            Plain English is fine. We just need it for the public listing.
          </p>
        </div>
      </div>
    </>
  );
}

function Step1({
  shareName,
  setShareName,
  shareCadence,
  setShareCadence,
  shareBilling,
  setShareBilling,
  sharePriceDollars,
  setSharePriceDollars,
}: {
  shareName: string;
  setShareName: (v: string) => void;
  shareCadence: ShareCadence;
  setShareCadence: (v: ShareCadence) => void;
  shareBilling: BillingModel;
  setShareBilling: (v: BillingModel) => void;
  sharePriceDollars: string;
  setSharePriceDollars: (v: string) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Step two</div>
      <h2 className="display text-2xl font-medium mb-2">
        What do members get?
      </h2>
      <p className="text-sm text-soil/65 italic leading-snug mb-6">
        Define your main share. Add more from settings later — most farms
        start with one and grow from there.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="share-name" className="label">
            Share name
          </label>
          <input
            id="share-name"
            className="field"
            placeholder="Standard share"
            value={shareName}
            onChange={(e) => setShareName(e.target.value)}
            autoFocus
          />
          <p className="text-[11px] italic text-soil/55 mt-1.5">
            What members will see. &quot;Standard share&quot;, &quot;Half cow share&quot;, &quot;Weekly dozen&quot;.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="share-cadence" className="label">
              How often
            </label>
            <select
              id="share-cadence"
              className="field"
              value={shareCadence}
              onChange={(e) => setShareCadence(e.target.value as ShareCadence)}
            >
              {CADENCES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="share-price" className="label">
              Price (USD)
            </label>
            <input
              id="share-price"
              type="number"
              step="0.01"
              min="0"
              className="field font-mono"
              placeholder="35.00"
              value={sharePriceDollars}
              onChange={(e) => setSharePriceDollars(e.target.value)}
            />
            <p className="text-[11px] italic text-soil/55 mt-1.5">
              Per pickup / per month / per season — depends on how you bill.
            </p>
          </div>
        </div>

        <div>
          <div className="label mb-2">How you bill</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {BILLING.map((b) => {
              const active = shareBilling === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setShareBilling(b.id)}
                  className={`text-left p-3 rounded-md border transition-colors ${
                    active
                      ? "border-brick bg-brick/5"
                      : "border-soil/15 hover:border-soil/30"
                  }`}
                >
                  <div className="display text-sm">{b.label}</div>
                  <div className="text-[10px] text-soil/55 italic mt-0.5">
                    {b.hint}
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

function Step2({
  pickupName,
  setPickupName,
  pickupAddress,
  setPickupAddress,
  pickupDay,
  setPickupDay,
  pickupStart,
  setPickupStart,
  pickupEnd,
  setPickupEnd,
}: {
  pickupName: string;
  setPickupName: (v: string) => void;
  pickupAddress: string;
  setPickupAddress: (v: string) => void;
  pickupDay: number;
  setPickupDay: (v: number) => void;
  pickupStart: string;
  setPickupStart: (v: string) => void;
  pickupEnd: string;
  setPickupEnd: (v: string) => void;
}) {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Step three</div>
      <h2 className="display text-2xl font-medium mb-2">
        Where do members pick up?
      </h2>
      <p className="text-sm text-soil/65 italic leading-snug mb-6">
        One spot to start. Add more drop sites (farmers markets, town
        libraries, neighbors&apos; porches) from settings later.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="pickup-name" className="label">
            Name this pickup
          </label>
          <input
            id="pickup-name"
            className="field"
            placeholder="At the farm"
            value={pickupName}
            onChange={(e) => setPickupName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="pickup-address" className="label">
            Address (optional)
          </label>
          <input
            id="pickup-address"
            className="field"
            placeholder="1248 Ridge Road, Athens, OH"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
          />
          <p className="text-[11px] italic text-soil/55 mt-1.5">
            Shown to members on their pickup-day reminders.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pickup-day" className="label">
              Day of week
            </label>
            <select
              id="pickup-day"
              className="field"
              value={pickupDay}
              onChange={(e) => setPickupDay(Number(e.target.value))}
            >
              {DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pickup-start" className="label">
              From
            </label>
            <input
              id="pickup-start"
              type="time"
              className="field font-mono"
              value={pickupStart}
              onChange={(e) => setPickupStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pickup-end" className="label">
              Until
            </label>
            <input
              id="pickup-end"
              type="time"
              className="field font-mono"
              value={pickupEnd}
              onChange={(e) => setPickupEnd(e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Step3() {
  return (
    <>
      <div className="small-caps text-xs text-brick mb-2">Step four</div>
      <h2 className="display text-2xl font-medium mb-2">
        Bring your customer list.
      </h2>
      <p className="text-soil/75 leading-relaxed mb-6">
        Already running on Barn2Door, Local Line, Harvie, a spreadsheet, or a
        paper binder? Drop your file and the AI sorts the columns for you —
        most farms are done in two minutes. Each member gets a sign-in link
        in the same step so your roster is alive before you close the tab.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Bullet
          icon={<Wheat className="w-9 h-10 text-wheatDark" />}
          title="Any CSV"
          body="Barn2Door, Local Line, Square, a Google Sheet."
        />
        <Bullet
          icon={<Leaf className="w-8 h-8 text-mossDark" />}
          title="AI maps it"
          body="Columns + share types matched in one shot."
        />
        <Bullet
          icon={<Sun className="w-8 h-8 text-wheat" />}
          title="One-click invites"
          body="A magic link to every member, ready to confirm."
        />
      </div>

      <p className="text-xs text-soil/55 italic">
        Or skip for now — you can do this anytime from{" "}
        <span className="display not-italic">Members → Import</span>.
      </p>
    </>
  );
}

function Step4() {
  return (
    <div className="text-center py-6">
      <Barn className="w-16 h-14 text-brick mx-auto mb-5" />
      <div className="small-caps text-xs text-brick mb-3">All set</div>
      <h2 className="display text-3xl font-medium mb-3">Your farm is open.</h2>
      <p className="text-soil/75 max-w-md mx-auto leading-relaxed">
        The desk is waiting for you. You&apos;ll see your share, your pickup,
        and any members you imported on the dashboard. Add more, edit
        anything, and send your first message when you&apos;re ready.
      </p>
      <div className="display italic text-brick mt-6">{CLOSING_BLESSING}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared bits
// -----------------------------------------------------------------------------

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="p-4 border border-soil/15 rounded-md">
      <div className="mb-3">{icon}</div>
      <div className="display text-sm mb-1">{title}</div>
      <div className="text-xs text-soil/65 italic leading-snug">{body}</div>
    </div>
  );
}
