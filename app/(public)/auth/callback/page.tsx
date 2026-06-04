"use client";

import Link from "next/link";
import { Sun } from "@/components/mark";

// =============================================================================
// /auth/callback — legacy landing page
// =============================================================================
// This used to handle Supabase OAuth code exchanges. Auth has moved to
// Workers (see docs/CLOUDFLARE_MIGRATION.md Phase 3). New magic links
// land at /api/auth/magic-callback (a Worker route, not a Next page).
// This page exists only to give visitors with a stale Supabase link a
// graceful explanation + a clear path back into the sign-in flow.
// =============================================================================

export default function AuthCallbackPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <Sun className="w-14 h-14 text-wheat mx-auto mb-8 opacity-70" />
      <div className="small-caps text-xs text-brick mb-4">
        Try the link again
      </div>
      <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-6">
        This sign-in link is from an older version.
      </h1>
      <p className="text-soil/80 leading-relaxed mb-8">
        We moved sign-in over to Cloudflare last week. The link you clicked
        is from before that. Request a fresh one and it&apos;ll work.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/come-in/" className="btn btn-primary">
          Send me a new sign-in link
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
