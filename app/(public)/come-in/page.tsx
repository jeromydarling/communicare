"use client";

import { useState } from "react";
import Link from "next/link";
import { WatercolorScene } from "@/components/watercolor-scene";
import { Mark } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CLOSING_BLESSING } from "@/lib/brand-strings";

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

  return (
    <div className="min-h-[calc(100vh-64px)] grid md:grid-cols-2">
      {/* LEFT — farm scene, full bleed, Berry quote anchored bottom-left */}
      <div className="relative bg-soil overflow-hidden order-2 md:order-1 min-h-[300px] md:min-h-0">
        <WatercolorScene name="dusk-table" className="absolute inset-0 w-full h-full" />
        <div className="absolute top-8 left-8 text-parchment/85 z-10">
          <div className="small-caps text-[10px] text-parchment/60 tracking-[0.2em]">
            Issue №&nbsp;13 · Late spring of the year MMXXVI
          </div>
        </div>
        <div className="absolute bottom-8 left-8 right-8 md:right-auto md:max-w-sm z-10">
          <div className="bg-parchment/95 backdrop-blur p-6 paper border-soil/10">
            <p className="display italic text-soil leading-snug text-lg md:text-xl">
              &ldquo;The soil is the great connector of lives, the source and
              destination of all.&rdquo;
            </p>
            <p className="text-xs text-soil/60 mt-3 small-caps">
              Wendell Berry · The Unsettling of America, 1977
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — magic-link form */}
      <div className="relative bg-parchment flex flex-col order-1 md:order-2">
        <div className="flex-1 flex items-center justify-center px-6 py-16 md:py-12">
          <div className="w-full max-w-md">
            {sent ? (
              <>
                <Mark className="w-12 h-12 text-brick mb-8" />
                <div className="small-caps text-xs text-brick mb-3">
                  The link is on its way
                </div>
                <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-5">
                  Check your inbox.
                </h1>
                <p className="text-lg text-soil/80 leading-relaxed mb-6">
                  We sent a magic link to{" "}
                  <span className="display">{email}</span>. Tap it from any
                  device and we&apos;ll let you in. No password to invent. The
                  link is good for an hour.
                </p>
                <p className="display italic text-brick text-xl mb-8">
                  {CLOSING_BLESSING}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="text-sm display italic text-soil/65 hover:text-brick"
                >
                  Send to a different email →
                </button>
              </>
            ) : (
              <>
                <Mark className="w-12 h-12 text-brick mb-8" />
                <div className="small-caps text-xs text-brick mb-3">
                  Come in
                </div>
                <h1 className="display text-4xl md:text-6xl font-medium leading-[0.95] mb-5">
                  Welcome back
                  <br />
                  <span className="italic text-brick">to the table.</span>
                </h1>
                <p className="text-lg text-soil/75 leading-relaxed mb-8">
                  Type your email. We&apos;ll send a magic link that signs you
                  in — no password to remember, no password to lose. We
                  believe in quiet entries.
                </p>

                {!isSupabaseConfigured && (
                  <div className="border border-wheat/40 bg-wheat/5 px-4 py-3 mb-5 text-sm text-soil/75 italic rounded">
                    <span className="not-italic small-caps text-[10px] text-wheat mr-2">
                      Demo mode
                    </span>
                    The form works; magic-link delivery needs a Supabase
                    project. Try the{" "}
                    <Link href="/demo" className="not-italic underline hover:text-brick">
                      form-gated demo
                    </Link>{" "}
                    instead.
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">
                  <div>
                    <label className="label" htmlFor="email">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      className="field text-base"
                      placeholder="you@yourfarm.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={busy || !isSupabaseConfigured}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {busy ? "Sending the link…" : "Send the magic link →"}
                    </button>
                    <span className="text-xs italic text-soil/55 text-right">
                      Good for one hour.
                      <br />
                      Works on any device.
                    </span>
                  </div>
                </form>

                <div className="rule my-10" />
                <p className="text-sm text-soil/65 italic leading-relaxed">
                  Not on the list yet?{" "}
                  <Link href="/join" className="text-brick hover:underline not-italic">
                    Join the early circle
                  </Link>
                  , or{" "}
                  <Link href="/demo" className="text-brick hover:underline not-italic">
                    open the demo
                  </Link>{" "}
                  to poke around with sample data.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
