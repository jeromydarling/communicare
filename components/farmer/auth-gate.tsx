"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sun } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getDemoSession,
  clearDemoSession,
  type DemoSession,
} from "@/lib/demo-session";

export type AuthState =
  | { kind: "loading" }
  | { kind: "demo"; session?: DemoSession }
  | { kind: "authed"; email: string; userId: string }
  | { kind: "anon" };

// Client-side auth-gate. In "demo" mode (no Supabase configured), it lets
// content render with mock data. When Supabase is configured and the user
// isn't signed in, it redirects to /come-in. When signed in, it passes
// auth state down to children.
export function AuthGate({
  children,
}: {
  children: (state: AuthState) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    // No Supabase wired → site-wide demo mode (anyone can explore).
    if (!isSupabaseConfigured) {
      setState({ kind: "demo", session: getDemoSession() ?? undefined });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ kind: "demo", session: getDemoSession() ?? undefined });
      return;
    }

    let cancelled = false;
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        // Not signed in. Check for a form-gated demo session before sending
        // them to the gate.
        const demo = getDemoSession();
        if (demo) {
          setState({ kind: "demo", session: demo });
          return;
        }
        setState({ kind: "anon" });
        const next = encodeURIComponent(pathname);
        router.replace(`/demo/?next=${next}`);
        return;
      }
      setState({
        kind: "authed",
        email: data.user.email ?? "",
        userId: data.user.id,
      });
    });

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setState({
          kind: "authed",
          email: session.user.email ?? "",
          userId: session.user.id,
        });
      } else {
        const demo = getDemoSession();
        if (demo) setState({ kind: "demo", session: demo });
        else setState({ kind: "anon" });
      }
    });

    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (state.kind === "loading" || state.kind === "anon") {
    return <Loading />;
  }
  return <>{children(state)}</>;
}

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Sun className="w-12 h-12 text-wheat mx-auto mb-4 animate-[spin_6s_linear_infinite]" />
        <div className="display italic text-soil/65">One moment.</div>
      </div>
    </div>
  );
}

export function DemoBanner({
  note,
  session,
}: {
  note?: string;
  session?: DemoSession;
}) {
  const router = useRouter();
  return (
    <div className="bg-wheat/10 border-b border-wheat/30 px-4 py-2 text-xs text-soil/75 text-center italic">
      <span className="small-caps text-[10px] text-wheat not-italic mr-2">
        Demo mode
      </span>
      {session ? (
        <>
          Welcome, <span className="display not-italic">{session.name}</span>{" "}
          — you&apos;re exploring with sample data.
          <button
            type="button"
            onClick={() => {
              clearDemoSession();
              router.push("/");
            }}
            className="underline hover:text-brick not-italic ml-3"
          >
            End demo
          </button>
        </>
      ) : (
        <>
          {note ?? "You're seeing sample data."}{" "}
          <Link href="/" className="underline hover:text-brick not-italic">
            Back to site
          </Link>
        </>
      )}
    </div>
  );
}
