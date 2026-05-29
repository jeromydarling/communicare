"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FarmerAuthShell,
  FarmerAuthFooterLinks,
  FormError,
  FormNotice,
} from "@/components/auth/farmer-auth-shell";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CLOSING_BLESSING } from "@/lib/brand-strings";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/farmer/reset-password/`
        : undefined;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <FarmerAuthShell
        eyebrow="The reset link is on its way"
        title={<>Check your inbox.</>}
        subtitle={
          <>
            We sent a reset link to <span className="display">{email}</span>.
            Tap it and you&apos;ll be able to set a new password. The link is
            good for one hour.
          </>
        }
        footer={
          <p>
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-brick hover:underline not-italic display italic"
            >
              Try a different email
            </button>
            .
          </p>
        }
      >
        <p className="display italic text-brick text-xl mb-6">{CLOSING_BLESSING}</p>
        <Link
          href="/farmer/come-in/"
          className="text-sm display italic text-soil/65 hover:text-brick"
        >
          Back to sign in →
        </Link>
      </FarmerAuthShell>
    );
  }

  return (
    <FarmerAuthShell
      eyebrow="Reset your password"
      title={
        <>
          We&apos;ll send you{" "}
          <span className="italic text-brick">a new key.</span>
        </>
      }
      subtitle="Type the email you signed up with. We'll send a link that lets you set a new password. The old one stops working as soon as you do."
      footer={<FarmerAuthFooterLinks current="forgot" />}
    >
      {!isSupabaseConfigured && (
        <FormNotice>
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          The form works; sending the reset email needs a Supabase project.
        </FormNotice>
      )}

      <form onSubmit={onSubmit} className="space-y-4 mt-5">
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            className="field"
            placeholder="you@yourfarm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
        </div>

        {error && <FormError message={error} />}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="btn btn-primary disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send the reset link →"}
          </button>
          <span className="text-[11px] italic text-soil/55 text-right">
            Good for one hour.
          </span>
        </div>
      </form>
    </FarmerAuthShell>
  );
}
