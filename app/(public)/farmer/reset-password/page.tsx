"use client";

import { Suspense, useEffect, useState } from "react";
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
} from "@/components/auth/farmer-auth-shell";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// =============================================================================
// /farmer/reset-password — landing page from the password-reset email
// =============================================================================
// Supabase's reset email contains a `code` (or legacy access_token) in the
// URL. We exchange it for a temporary session, let the operator set a new
// password via updateUser({ password }), then send them on to the desk.
// =============================================================================

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const [stage, setStage] = useState<"exchanging" | "ready" | "saving" | "done">(
    "exchanging",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Step 1 — exchange the URL code for a session as soon as the page loads.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase isn't configured on this deploy.");
      setStage("ready");
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    // Newer Supabase reset emails send `code`; older ones land with a
    // hash fragment containing access_token + refresh_token + type=recovery.
    // supabase-js handles the hash form for us as long as
    // detectSessionInUrl is on (it is by default). For the code form we
    // exchange explicitly.
    (async () => {
      if (code) {
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        if (ex) {
          setError(
            "This reset link can't be used — it may have expired or already been used. Request a new one.",
          );
          setStage("ready");
          return;
        }
        // Clean the code out of the URL so a refresh doesn't try again.
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }
      // At this point a recovery session should be live. Confirm it.
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError(
          "This reset link can't be used — it may have expired or already been used. Request a new one.",
        );
      }
      setStage("ready");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordStrongEnough(password)) {
      setError(
        "Pick a stronger password — twelve characters or more, mixed case, with a number.",
      );
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match yet.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setStage("saving");
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) {
      setError(upErr.message);
      setStage("ready");
      return;
    }
    setStage("done");
    setTimeout(() => router.replace("/farmer/"), 1800);
  }

  if (stage === "exchanging") {
    return (
      <FarmerAuthShell
        eyebrow="One moment"
        title={<>Reading your reset link…</>}
      >
        <p className="text-soil/55 italic text-sm">
          We&apos;re checking the link from your email.
        </p>
      </FarmerAuthShell>
    );
  }

  if (stage === "done") {
    return (
      <FarmerAuthShell
        eyebrow="Done"
        title={<>Password set.</>}
        subtitle={<>Walking you to the desk…</>}
      >
        <p className="display italic text-brick text-xl">Pax tibi.</p>
      </FarmerAuthShell>
    );
  }

  return (
    <FarmerAuthShell
      eyebrow="Set a new password"
      title={
        <>
          A new key for{" "}
          <span className="italic text-brick">the desk.</span>
        </>
      }
      subtitle="Pick something you'll remember. We don't see passwords, so we can't help you recover one we never had."
      footer={<FarmerAuthFooterLinks current="reset" />}
    >
      {!isSupabaseConfigured && (
        <FormNotice>
          <span className="not-italic small-caps text-[10px] text-wheat mr-2">
            Demo mode
          </span>
          Password reset needs a Supabase project.
        </FormNotice>
      )}

      <form onSubmit={onSubmit} className="space-y-4 mt-5">
        <PasswordInput
          value={password}
          onChange={setPassword}
          label="New password"
          autoComplete="new-password"
          showStrength
          required
          autoFocus
        />

        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          label="Confirm new password"
          autoComplete="new-password"
          required
        />

        {error && <FormError message={error} />}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={stage === "saving"}
            className="btn btn-primary disabled:opacity-50"
          >
            {stage === "saving" ? "Saving…" : "Set new password →"}
          </button>
          <Link
            href="/farmer/come-in/"
            className="text-xs italic text-soil/65 hover:text-brick"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </FarmerAuthShell>
  );
}
