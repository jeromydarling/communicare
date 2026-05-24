"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function ComeInPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError(
        "Supabase isn't configured on this deploy. Magic-link sign-in needs a wired backend.",
      );
      return;
    }

    setBusy(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname.replace(/come-in\/?$/, "")}auth/callback/`
        : undefined;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <Sun className="w-16 h-16 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          The link is in your inbox
        </div>
        <h1 className="display text-5xl font-medium leading-tight mb-6">
          Check your email.
        </h1>
        <p className="text-lg text-soil/80 leading-relaxed">
          We sent a magic link to <span className="display">{email}</span>.
          Click it from any device and it will let you in. No password to
          invent. The link is good for an hour.
        </p>
        <p className="display italic text-brick mt-8 text-xl">Pax tibi.</p>

        <div className="rule my-12" />

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="btn btn-ghost"
        >
          Send to a different email →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <Sun className="w-14 h-14 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          Come in
        </div>
        <h1 className="display text-5xl md:text-6xl font-medium leading-[1.0]">
          Welcome back.
        </h1>
        <p className="mt-6 text-lg text-soil/80 leading-relaxed max-w-md mx-auto">
          Type your email. We'll send a magic link that signs you in. No
          password to remember; no password to lose.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="border border-wheat/40 bg-wheat/5 px-4 py-3 mb-6 text-sm text-soil/75 italic rounded">
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          Magic-link sign-in is wired up but needs a Supabase project to
          actually send mail. Set{" "}
          <code className="font-mono not-italic text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="font-mono not-italic text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to turn it on.
        </div>
      )}

      <form onSubmit={onSubmit} className="paper p-10 space-y-6">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="field"
            placeholder="you@yourfarm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            disabled={busy || !isSupabaseConfigured}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Sending…" : "Send the link →"}
          </button>
          <span className="text-xs italic text-soil/55 max-w-xs text-right">
            The link is good for one hour, on one device.
          </span>
        </div>
      </form>

      <p className="text-center text-xs text-soil/55 italic mt-8 max-w-sm mx-auto leading-relaxed">
        Not on the list yet?{" "}
        <Link href="/join" className="text-brick hover:underline">
          Join the early circle
        </Link>{" "}
        — we'll write when we're ready for you.
      </p>
    </div>
  );
}
