"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sun, Wheat, Barn, Leaf } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { setDemoSession, bypassDemo, DEMO_REASONS } from "@/lib/demo-session";
import type { Database, FarmKind } from "@/lib/supabase/types";

type WaitlistInsert = Database["public"]["Tables"]["waitlist"]["Insert"];

const REASON_TO_KIND: Record<string, FarmKind | null> = {
  "I run a farm and I'm shopping for software": "mixed_farm",
  "I belong to a CSA / farm share already": null,
  "I'm thinking about joining a CSA": null,
  "I write or report about food and farms": null,
  "I build software (curious how this works)": null,
  "Something else": null,
};

export default function DemoGatePage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/farmer/";
  const role = params.get("as") === "member" ? "member" : "farmer";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();

    if (!name || !email || !reason) {
      setError("We need your name, email, and one reason.");
      setBusy(false);
      return;
    }

    // Best-effort: write to waitlist with source='demo' so we capture
    // the lead. If Supabase isn't configured we just skip this.
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload: WaitlistInsert = {
        email,
        name,
        source: "demo",
        note: `Reason: ${reason}`,
        farm_kind: REASON_TO_KIND[reason] ?? null,
      };
      const { error: dbError } = await supabase
        .from("waitlist")
        .insert([payload] as never);
      // Duplicates are fine — they already gave us their info.
      if (dbError && !dbError.message.toLowerCase().includes("duplicate")) {
        // We don't block on this — the demo is more important than the lead.
        console.warn("waitlist insert failed:", dbError.message);
      }
    }

    setDemoSession({
      name,
      email,
      reason,
      unlockedAt: new Date().toISOString(),
    });

    setBusy(false);
    router.replace(next);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <div className="text-center mb-10">
        <Sun className="w-14 h-14 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-3">
          {role === "member" ? "The member's view" : "The farmer's view"}
        </div>
        <h1 className="display text-4xl md:text-5xl font-medium leading-[1.05]">
          Come in &amp; poke around.
        </h1>
        <p className="mt-6 text-lg text-soil/75 leading-relaxed max-w-md mx-auto">
          A hands-on demo of the {role === "member" ? "share-holder" : "farmer"}{" "}
          dashboard with sample data. Three quick questions and we'll let you in.
        </p>
      </div>

      <form onSubmit={onSubmit} className="paper p-8 space-y-5">
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            name="name"
            required
            className="field"
            placeholder="What we should call you"
          />
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
            placeholder="you@somewhere.com"
          />
          <div className="hint">
            We&apos;ll only email when we&apos;re ready to bring your farm on
            (or when we ship something we think you&apos;d want).
          </div>
        </div>

        <div>
          <label className="label" htmlFor="reason">
            What brings you here?
          </label>
          <select id="reason" name="reason" required defaultValue="" className="field">
            <option value="" disabled>
              Pick the closest one
            </option>
            {DEMO_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
            className="btn btn-primary disabled:opacity-50"
          >
            {busy ? "Letting you in…" : "Open the demo →"}
          </button>
          <span className="text-xs italic text-soil/55 max-w-xs text-right">
            No password. No credit card. End the demo anytime — your session
            lives in your browser only.
          </span>
        </div>
      </form>

      {!isSupabaseConfigured && (
        <p className="text-center text-[11px] text-soil/45 italic mt-6">
          Site is in demo mode. Your info is held locally and not sent
          anywhere until Supabase is wired.
        </p>
      )}

      <div className="ornament my-12 max-w-md mx-auto">❦</div>

      <div className="grid sm:grid-cols-2 gap-4">
        <DemoChoice
          icon={<Wheat className="w-7 h-9 text-wheatDark" />}
          label="As a farmer"
          blurb="Today's roster, inventory, members, messages, the AI homepage editor, and payments."
          active={role === "farmer"}
          href={`/demo/?as=farmer&next=${encodeURIComponent("/farmer/")}`}
        />
        <DemoChoice
          icon={<Leaf className="w-7 h-7 text-mossDark" />}
          label="As a member"
          blurb="This week's share with swap / skip / donate / gift, order history, and credit ledger."
          active={role === "member"}
          href={`/demo/?as=member&next=${encodeURIComponent("/share/")}`}
        />
      </div>

      <div className="text-center text-xs text-soil/55 italic mt-10 space-y-2">
        <p>
          Have a magic link already?{" "}
          <Link href="/come-in" className="text-brick hover:underline">
            Sign in →
          </Link>
        </p>
        <p>
          In a hurry?{" "}
          <button
            type="button"
            onClick={() => {
              bypassDemo();
              router.replace(next);
            }}
            className="text-brick hover:underline not-italic"
          >
            Skip the form — open the demo →
          </button>
        </p>
      </div>
    </div>
  );
}

function DemoChoice({
  icon,
  label,
  blurb,
  active,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  blurb: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`paper p-5 block transition-colors hover:bg-cream/40 ${active ? "ring-2 ring-brick" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div>
          <div className="display text-lg font-medium leading-tight">
            {label}
          </div>
          <p className="text-xs text-soil/65 italic mt-1">{blurb}</p>
        </div>
      </div>
    </Link>
  );
}
