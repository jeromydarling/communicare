"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sun } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// We use a Suspense boundary because useSearchParams is a Suspense hook in
// Next 15. The inner component does the actual work.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Letting you in…" />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Letting you in…");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setStatus("error");
      setMessage(
        "This site doesn't have a Supabase backend configured. Ask the operator to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const code = params.get("code");
    const errorDesc = params.get("error_description") ?? params.get("error");

    if (errorDesc) {
      setStatus("error");
      setMessage(errorDesc);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage(
        "This page is the landing for the magic link in your email. Open the email and click the link from there.",
      );
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setStatus("ok");
        setMessage("Signed in. Taking you home…");
        const next = params.get("next") ?? "/";
        setTimeout(() => router.replace(next), 600);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Something went wrong handling the link.",
        );
      });
  }, [params, router]);

  return <CallbackShell message={message} status={status} />;
}

function CallbackShell({
  message,
  status = "working",
}: {
  message: string;
  status?: "working" | "ok" | "error";
}) {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <Sun
        className={`w-14 h-14 mx-auto mb-8 ${
          status === "error" ? "text-brick opacity-70" : "text-wheat"
        } ${status === "working" ? "animate-[spin_6s_linear_infinite]" : ""}`}
      />
      <div className="small-caps text-xs text-brick mb-4">
        {status === "error"
          ? "Something's not right"
          : status === "ok"
            ? "You're in"
            : "Checking the link"}
      </div>
      <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-6">
        {status === "error" ? "We couldn't sign you in." : "One moment."}
      </h1>
      <p className="text-soil/80 leading-relaxed">{message}</p>
      {status === "error" && (
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/come-in" className="btn btn-primary">
            Try again
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back to the homepage
          </Link>
        </div>
      )}
    </div>
  );
}
