"use client";

// =============================================================================
// TurnstileWidget — Cloudflare Turnstile, explicit-render React wrapper
// =============================================================================
// The pattern: load Cloudflare's turnstile script once (via next/script),
// then on mount render a widget into a ref'd div. On token issuance the
// widget calls our `onToken` callback; on expiry / error we clear it.
//
// Why explicit render instead of the implicit `className="cf-turnstile"`
// pattern: implicit needs a window-global callback name (data-callback),
// which is awkward in React and doesn't survive route changes cleanly.
// Explicit render lets every component instance own its own widget +
// callback closure.
//
// Required: NEXT_PUBLIC_TURNSTILE_SITE_KEY at build time. When the key is
// missing we render nothing and call onToken(null) once — the parent's
// submit handler decides whether that's an error or a dev pass-through
// (the server's verifyTurnstile() passes when TURNSTILE_SECRET is unset).
// =============================================================================

import { useEffect, useRef } from "react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileGlobal = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileWidget({ onToken, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) {
      // No site key baked into the build — surface nothing in the DOM
      // and tell the parent there's no token. The server still
      // accepts the submission when TURNSTILE_SECRET is also unset.
      onTokenRef.current(null);
      return;
    }

    let cancelled = false;
    let pollId: number | undefined;

    function tryRender() {
      if (cancelled) return;
      const ts = window.turnstile;
      if (!ts || !containerRef.current) return false;
      if (widgetIdRef.current) return true;
      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        theme: "light",
      });
      return true;
    }

    if (!tryRender()) {
      pollId = window.setInterval(() => {
        if (tryRender() && pollId != null) {
          window.clearInterval(pollId);
          pollId = undefined;
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (pollId != null) window.clearInterval(pollId);
      const ts = window.turnstile;
      if (ts && widgetIdRef.current) {
        try {
          ts.remove(widgetIdRef.current);
        } catch {
          // Widget may have unmounted already; safe to ignore.
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
