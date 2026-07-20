"use client";

// =============================================================================
// CookieNotice — a small, honest disclosure
// =============================================================================
// We don't run ads and we don't set behavioral trackers. The only
// cookie we set is __Host-cmcr_session (auth). Sentry sets a
// SentryReplaySession cookie if session replay is on. That's it.
//
// So this isn't a nag banner; it's a one-line honest note with a link
// to the full policy, dismissible forever via localStorage.
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cmcr:cookie-notice-dismissed";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
      setVisible(true);
    } catch {
      /* private mode or blocked storage — just show it */
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50"
    >
      <div className="paper p-4 bg-parchment shadow-lg border-soil/15">
        <p className="text-sm text-soil/85 leading-snug">
          One cookie keeps you signed in. That&apos;s the only cookie we
          set. No ads, no cross-site trackers.{" "}
          <Link href="/privacy" className="text-brick hover:underline">
            Read the privacy page →
          </Link>
        </p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs small-caps px-3 py-1 rounded bg-soil text-parchment hover:bg-brick transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
