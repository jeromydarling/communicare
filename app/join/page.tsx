"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Wheat } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database, FarmKind } from "@/lib/supabase/types";

type WaitlistInsert = Database["public"]["Tables"]["waitlist"]["Insert"];

const KIND_OPTIONS: { label: string; value: FarmKind | "" }[] = [
  { label: "Pick one", value: "" },
  { label: "Vegetable CSA", value: "vegetable_csa" },
  { label: "Raw milk herd share", value: "raw_milk_herd_share" },
  { label: "Pastured meat", value: "pastured_meat" },
  { label: "Pastured eggs", value: "pastured_eggs" },
  { label: "Mixed farm", value: "mixed_farm" },
  { label: "Market garden", value: "market_garden" },
  { label: "Orchard / fruit", value: "orchard_fruit" },
  { label: "Flowers", value: "flower_farm" },
];

export default function JoinPage() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmName, setFarmName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const rawKind = String(form.get("kind") ?? "").trim();
    const payload: WaitlistInsert = {
      email,
      name: String(form.get("who") ?? "").trim() || null,
      farm_name: String(form.get("farm") ?? "").trim() || null,
      location: String(form.get("loc") ?? "").trim() || null,
      farm_kind: rawKind ? (rawKind as FarmKind) : null,
      note: String(form.get("note") ?? "").trim() || null,
      source: "landing",
    };

    if (!payload.email) {
      setError("We need an email address to reach you at.");
      setBusy(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (supabase) {
      // Real waitlist insert into Supabase. Unique-on-email constraint will
      // catch double-submits; treat that as a success.
      // The `as never` cast works around a hand-written Database type
      // limitation — replace with `supabase gen types typescript --linked`
      // once we link a real project.
      const { error: dbError } = await supabase
        .from("waitlist")
        .insert([payload] as never);

      if (dbError && !dbError.message.toLowerCase().includes("duplicate")) {
        setError(
          `We couldn't save you to the list (${dbError.message}). Try again, or write us at hello@communicare.farm.`,
        );
        setBusy(false);
        return;
      }
    }
    // If Supabase isn't configured (e.g. static preview without env vars),
    // we still acknowledge the submission — the form's job is to feel
    // received, and the user can come back when we're really live.

    setSubmitted(true);
    setBusy(false);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 md:py-28 text-center">
        <Sun className="w-16 h-16 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          Welcome to the circle
        </div>
        <h1 className="display text-5xl font-medium leading-tight mb-6">
          Thank you{farmName ? `, ${farmName}` : ""}.
        </h1>
        <p className="text-lg text-soil/80 leading-relaxed">
          We have you. We'll email when we're ready to receive your farm — with
          a magic link, no password to invent. In the meantime, the land needs
          you more than we do.
        </p>
        <p className="display italic text-brick mt-8 text-xl">Pax tibi.</p>

        <div className="rule my-12" />

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/homepage" className="btn btn-ghost">
            Try the AI homepage
          </Link>
          <Link href="/manifesto" className="btn btn-ghost">
            Read why we built this
          </Link>
          <Link href="/come-in" className="btn btn-ghost">
            Already on the list? Come in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-20 md:py-28">
      <div className="text-center mb-12">
        <Wheat className="w-12 h-14 text-wheatDark mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          The early circle
        </div>
        <h1 className="display text-5xl md:text-6xl font-medium leading-[1.0]">
          Join us.
        </h1>
        <p className="mt-6 text-lg text-soil/80 leading-relaxed max-w-md mx-auto">
          We're building Communicare for a small first group of farms. Leave
          your name and a way to reach you, and we'll email when we're ready
          to bring your farm on.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="border border-wheat/40 bg-wheat/5 px-4 py-3 mb-6 text-sm text-soil/75 italic rounded">
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          Supabase isn't configured on this deploy — your submission won't be
          stored, but the form works. To wire it up, set{" "}
          <code className="font-mono not-italic text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="font-mono not-italic text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          .
        </div>
      )}

      <form onSubmit={onSubmit} className="paper p-10 space-y-6">
        <div>
          <label className="label" htmlFor="who">
            Who are you?
          </label>
          <input id="who" name="who" required className="field" placeholder="Your name" />
        </div>

        <div>
          <label className="label" htmlFor="farm">
            What's the farm called?
          </label>
          <input
            id="farm"
            name="farm"
            required
            className="field"
            placeholder="e.g. Three Forks Dairy"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="loc">
              Where is it?
            </label>
            <input
              id="loc"
              name="loc"
              required
              className="field"
              placeholder="County, State"
            />
          </div>
          <div>
            <label className="label" htmlFor="kind">
              What do you do?
            </label>
            <select id="kind" name="kind" className="field" defaultValue="" required>
              {KIND_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.value === ""}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="field"
            placeholder="you@yourfarm.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="note">
            Anything else? (optional)
          </label>
          <textarea
            id="note"
            name="note"
            className="field"
            placeholder="Where are you now (Barn2Door, spreadsheets, paper, nothing yet)? What's the most painful part?"
            rows={3}
          />
        </div>

        {error && (
          <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-soil/15 flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Sending…" : "Send →"}
          </button>
          <span className="text-xs italic text-soil/55 max-w-xs text-right">
            We will not put you on a list, sell you anything, or write you a
            single sales email.
          </span>
        </div>
      </form>

      <p className="text-center text-xs text-soil/55 italic mt-8 max-w-sm mx-auto leading-relaxed">
        Already running a farm share? When we're ready, we'll migrate you from
        Harvie, Barn2Door, Local Line, or your spreadsheets — by hand, free of
        charge.
      </p>
    </div>
  );
}
