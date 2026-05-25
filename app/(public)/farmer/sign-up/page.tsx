"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PasswordInput,
  isPasswordStrongEnough,
} from "@/components/auth/password-input";
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

export default function FarmerSignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit =
    name.trim().length > 1 &&
    farmName.trim().length > 1 &&
    /.+@.+\..+/.test(email) &&
    isPasswordStrongEnough(password);

  async function signUpWithGoogle() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (authError) {
      setBusy(false);
      setError(authError.message);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      return;
    }
    setBusy(true);
    const { error: authError, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: callbackUrl(),
        data: {
          // Stored in user_metadata. The post-signup onboarding step reads
          // these to create the public.farms row.
          full_name: name.trim(),
          farm_name: farmName.trim(),
        },
      },
    });
    setBusy(false);
    if (authError) {
      setError(humanize(authError.message));
      return;
    }
    // Supabase returns a session immediately if email confirmation is off,
    // or a null session if it's on (the more common production setup).
    if (data.session) {
      router.replace("/farmer/");
      return;
    }
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <FarmerAuthShell
        eyebrow="One last thing"
        title={<>Confirm your email.</>}
        subtitle={
          <>
            We sent a verification link to{" "}
            <span className="display">{email}</span>. Tap it and we&apos;ll
            walk you to your farm desk.
          </>
        }
      >
        <p className="display italic text-brick text-xl mb-6">
          Welcome aboard.
        </p>
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
      eyebrow="Start your farm desk"
      title={
        <>
          The desk is{" "}
          <span className="italic text-brick">free until June.</span>
        </>
      }
      subtitle="Set up your account in two minutes. After that, the homepage, the SMS swap loop, the pickup roster — all of it works the same evening."
      footer={<FarmerAuthFooterLinks current="sign-up" />}
    >
      {!isSupabaseConfigured && (
        <FormNotice>
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          The form works; account creation needs a Supabase project.
        </FormNotice>
      )}

      <div className="mt-5">
        <GoogleButton
          onClick={signUpWithGoogle}
          disabled={busy}
          label="Sign up with Google"
        />
      </div>

      <OrDivider label="or with email" />

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              type="text"
              required
              className="field"
              placeholder="Mary Hoffmeier"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="farmName">
              Farm name
            </label>
            <input
              id="farmName"
              type="text"
              required
              className="field"
              placeholder="Three Forks Dairy"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              autoComplete="organization"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            className="field"
            placeholder="mary@threeforksdairy.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <PasswordInput
          value={password}
          onChange={setPassword}
          label="Pick a password"
          autoComplete="new-password"
          showStrength
          required
          hint="Twelve characters or more, with a mix. Use a phrase you can remember — the soil is the great connector of lives."
        />

        {error && <FormError message={error} />}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={busy || !canSubmit || !isSupabaseConfigured}
            className="btn btn-primary disabled:opacity-50"
          >
            {busy ? "One moment…" : "Start your farm →"}
          </button>
          <span className="text-[11px] italic text-soil/55 text-right max-w-[170px] leading-snug">
            No card needed. Nine dollars a month after June.
          </span>
        </div>
      </form>
    </FarmerAuthShell>
  );
}

function humanize(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There's already an account with this email. Sign in instead — or send yourself a magic link.";
  if (m.includes("rate limit"))
    return "Too many tries — wait a minute and try again.";
  if (m.includes("weak password") || m.includes("password is too"))
    return "Pick a stronger password — twelve characters or more, mixed case and a number.";
  return message;
}
