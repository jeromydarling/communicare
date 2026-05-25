"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/auth/password-input";
import {
  FarmerAuthShell,
  FarmerAuthFooterLinks,
  FormError,
  FormNotice,
  GoogleButton,
  OrDivider,
  callbackUrl,
} from "@/components/auth/farmer-auth-shell";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function FarmerSignInPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/farmer/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (authError) {
      setError(humanize(authError.message));
      return;
    }
    router.replace(nextPath);
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (authError) {
      setBusy(false);
      setError(humanize(authError.message));
    }
    // Otherwise the browser is being redirected to Google; nothing else to do.
  }

  async function sendMagicLink() {
    setError(null);
    if (!email.trim()) {
      setError("Type your email first, then tap the magic-link option.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl(),
        shouldCreateUser: false,
      },
    });
    setBusy(false);
    if (authError) {
      setError(humanize(authError.message));
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <FarmerAuthShell
        eyebrow="The link is on its way"
        title={<>Check your inbox.</>}
        subtitle={
          <>
            We sent a magic link to <span className="display">{email}</span>.
            Tap it from any device and we&apos;ll let you in. Good for one hour.
          </>
        }
      >
        <p className="display italic text-brick text-xl mb-6">Pax tibi.</p>
        <button
          type="button"
          onClick={() => setMagicSent(false)}
          className="text-sm display italic text-soil/65 hover:text-brick"
        >
          Try a different email →
        </button>
      </FarmerAuthShell>
    );
  }

  return (
    <FarmerAuthShell
      eyebrow="Welcome back"
      title={
        <>
          The desk{" "}
          <span className="italic text-brick">is waiting for you.</span>
        </>
      }
      subtitle="Sign in to your farm. Members of your share have their own door at /come-in — this one is just for operators."
      footer={<FarmerAuthFooterLinks current="sign-in" />}
    >
      {!isSupabaseConfigured && (
        <FormNotice>
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          The form works; sign-in needs a Supabase project. Try the{" "}
          <Link
            href="/demo/"
            className="not-italic underline hover:text-brick"
          >
            form-gated demo
          </Link>{" "}
          for now.
        </FormNotice>
      )}

      <div className="mt-5">
        <GoogleButton onClick={signInWithGoogle} disabled={busy} />
      </div>

      <OrDivider label="or with email" />

      <form onSubmit={signInWithPassword} className="space-y-4">
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
            autoComplete="username"
            autoFocus
          />
        </div>

        <PasswordInput
          value={password}
          onChange={setPassword}
          label="Password"
          autoComplete="current-password"
          required
        />

        {error && <FormError message={error} />}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="btn btn-primary disabled:opacity-50"
          >
            {busy ? "One moment…" : "Sign in →"}
          </button>
          <Link
            href="/farmer/forgot-password/"
            className="text-xs italic text-soil/65 hover:text-brick"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      <OrDivider label="or" />

      <button
        type="button"
        onClick={sendMagicLink}
        disabled={busy}
        className="w-full px-4 py-3 rounded-md border border-soil/20 hover:border-brick hover:text-brick transition-colors text-sm display italic text-soil/70 disabled:opacity-50"
      >
        Send me a magic link instead →
      </button>
    </FarmerAuthShell>
  );
}

// Translate the most common Supabase auth error messages into editorial English.
function humanize(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password didn't match. Try again, or reset the password below.";
  if (m.includes("email not confirmed"))
    return "We need to verify your email first. Check your inbox for the confirmation link we sent when you signed up.";
  if (m.includes("user not found"))
    return "We don't have an account with that email yet. Start your farm desk first.";
  if (m.includes("rate limit"))
    return "Too many tries — wait a minute and try again.";
  return message;
}
