"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PasswordInput,
  isPasswordStrongEnough,
} from "@/components/auth/password-input";
import {
  FarmerAuthShell,
  FarmerAuthFooterLinks,
  FormError,
  GoogleButton,
  OrDivider,
} from "@/components/auth/farmer-auth-shell";
import { signUp } from "@/lib/auth/client";

export default function FarmerSignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 1 &&
    farmName.trim().length > 1 &&
    /.+@.+\..+/.test(email) &&
    isPasswordStrongEnough(password);

  async function signUpWithGoogle() {
    // Google OAuth lands in Phase 3.1 — see docs/CLOUDFLARE_MIGRATION.md
    // (custom Workers auth supports it; the Worker route hasn't been
    // wired yet because email + password covers the launch path).
    setError(
      "Google sign-up is back online soon. For now, sign up with email below.",
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setBusy(true);
    const result = await signUp({
      email: email.trim(),
      password,
      display_name: name.trim(),
      farm_name: farmName.trim(),
    });
    if (!("ok" in result) || !result.ok) {
      setBusy(false);
      setError(humanize(result.error));
      return;
    }
    // Account exists; session cookie is set. Now we send them straight
    // to Stripe Checkout for the $9/mo platform plan. The success_url
    // brings them back into the onboarding wizard once Stripe confirms.
    // If Stripe isn't reachable for some reason, drop them into the
    // dashboard with a banner — the gate logic will keep them out of
    // the destructive paths until they pay.
    const checkout = await fetch("/api/billing/create-checkout-session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await checkout.json().catch(() => ({}));
    setBusy(false);
    if (checkout.ok && body?.url) {
      window.location.href = body.url;
      return;
    }
    // Fallback: drop into onboarding; the dashboard surfaces the
    // "complete payment" banner.
    router.replace("/farmer/onboarding/?billing=pending");
  }

  return (
    <FarmerAuthShell
      eyebrow="Start your farm desk"
      title={
        <>
          Open your{" "}
          <span className="italic text-brick">farm desk.</span>
        </>
      }
      subtitle="Two minutes here, then nine dollars, then the homepage, the SMS swap loop, and the pickup roster all work the same evening. Cancel anytime."
      footer={<FarmerAuthFooterLinks current="sign-up" />}
    >
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
            disabled={busy || !canSubmit}
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
