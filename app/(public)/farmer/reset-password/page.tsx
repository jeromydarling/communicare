"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PasswordInput,
  isPasswordStrongEnough,
} from "@/components/auth/password-input";
import {
  FarmerAuthShell,
  FarmerAuthFooterLinks,
  FormError,
} from "@/components/auth/farmer-auth-shell";
import { applyPasswordReset } from "@/lib/auth/client";
import { CLOSING_BLESSING } from "@/lib/brand-strings";

// =============================================================================
// /farmer/reset-password — landing page from the password-reset email
// =============================================================================
// The reset link points here with ?token=<one-shot>. We POST the token
// + new password to /api/auth/reset, which validates the token, applies
// the new hash, invalidates every other session, and mints a fresh one.
// On success we walk the operator straight to the desk.
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
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [stage, setStage] = useState<"ready" | "saving" | "done">("ready");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(
        "This reset link is missing its token. Request a new one from the forgot-password page.",
      );
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;
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
    setStage("saving");
    const result = await applyPasswordReset({ token, password });
    if (!("ok" in result) || !result.ok) {
      setError(result.error);
      setStage("ready");
      return;
    }
    setStage("done");
    setTimeout(() => router.replace("/farmer/"), 1800);
  }

  if (stage === "done") {
    return (
      <FarmerAuthShell
        eyebrow="Done"
        title={<>Password set.</>}
        subtitle={<>Walking you to the desk…</>}
      >
        <p className="display italic text-brick text-xl">{CLOSING_BLESSING}</p>
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
            disabled={stage === "saving" || !token}
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
