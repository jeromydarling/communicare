"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sun } from "@/components/mark";
import { getCurrentUser } from "@/lib/auth/client";
import {
  getDemoSession,
  clearDemoSession,
  bypassDemo,
  type DemoSession,
} from "@/lib/demo-session";

export type AuthState =
  | { kind: "loading" }
  | { kind: "demo"; session?: DemoSession }
  | { kind: "authed"; email: string; userId: string }
  | { kind: "anon" };

// Client-side auth-gate. Calls /api/auth/me on mount; on 401 redirects
// to the operator sign-in. A form-gated demo session in localStorage
// (set by /demo) lets unsigned-in visitors explore with sample data
// without ever hitting the gate.
export function AuthGate({
  children,
}: {
  children: (state: AuthState) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    // Bypass: ?skip=1 anywhere short-circuits the gate. We read directly
    // off window.location so the component doesn't need to be wrapped in
    // a Suspense boundary (which useSearchParams would require under
    // static export).
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("skip") === "1"
    ) {
      bypassDemo();
    }

    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        const demo = getDemoSession();
        if (demo) {
          setState({ kind: "demo", session: demo });
          return;
        }
        setState({ kind: "anon" });
        const next = encodeURIComponent(pathname);
        router.replace(`/farmer/come-in/?next=${next}`);
        return;
      }
      setState({ kind: "authed", email: user.email, userId: user.id });
    });

    return () => {
      cancelled = true;
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
