"use client";

import Link from "next/link";
import { Mark } from "@/components/mark";

// Shared two-pane layout for all four /farmer auth pages. Mirrors the
// /come-in shell so member and farm sign-in feel like siblings.
export function FarmerAuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  quote,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  quote?: { text: string; cite: string };
}) {
  const q = quote ?? {
    text:
      "Husbandry is the name of all the practices that sustain life by connecting us conservingly to our places and our world.",
    cite: "Wendell Berry · The Way of Ignorance, 2005",
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid md:grid-cols-2">
      <div className="relative bg-soil overflow-hidden order-2 md:order-1 min-h-[280px] md:min-h-0">
        {/* Same hero photograph the homepage uses — keeps the brand
            visually coherent from landing through signup. The soil-tinted
            gradient on top tames the highlights enough that the eyebrow
            text and the Berry quote card stay readable. */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/hero-watercolor.jpg)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(48,38,30,0.55) 0%, rgba(48,38,30,0.30) 45%, rgba(48,38,30,0.55) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="absolute top-8 left-8 text-parchment/85 z-10">
          <div className="small-caps text-[10px] text-parchment/60 tracking-[0.2em]">
            The farm desk · for operators
          </div>
        </div>
        <div className="absolute bottom-8 left-8 right-8 md:right-auto md:max-w-sm z-10">
          <div className="bg-parchment/95 backdrop-blur p-6 paper border-soil/10">
            <p className="display italic text-soil leading-snug text-base md:text-lg">
              &ldquo;{q.text}&rdquo;
            </p>
            <p className="text-xs text-soil/60 mt-3 small-caps">{q.cite}</p>
          </div>
        </div>
      </div>

      <div className="relative bg-parchment flex flex-col order-1 md:order-2">
        <div className="flex-1 flex items-center justify-center px-6 py-16 md:py-12">
          <div className="w-full max-w-md">
            <Mark className="w-12 h-12 text-brick mb-7" />
            <div className="small-caps text-xs text-brick mb-3">{eyebrow}</div>
            <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-soil/75 leading-relaxed mb-7">
                {subtitle}
              </p>
            )}
            {children}
            {footer && (
              <>
                <div className="rule my-10" />
                <div className="text-sm text-soil/65 italic leading-relaxed">
                  {footer}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// "Continue with Google" pill — used on sign-in and sign-up. Hooks up to
// supabase.auth.signInWithOAuth in the page-level handler since we need
// access to the supabase client there.
export function GoogleButton({
  onClick,
  disabled,
  label = "Continue with Google",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md border border-soil/20 hover:border-soil/40 bg-parchment hover:bg-cream2 transition-colors text-sm display disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <GoogleGlyph />
      {label}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-soil/15" />
      <span className="text-[10px] small-caps text-soil/55 tracking-[0.2em]">
        {label}
      </span>
      <div className="flex-1 h-px bg-soil/15" />
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm rounded">
      {message}
    </div>
  );
}

export function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-wheat/40 bg-wheat/5 px-4 py-3 text-sm text-soil/75 italic rounded">
      {children}
    </div>
  );
}

// Convenience: build the absolute callback URL for OAuth + magic-link
// redirects. Lives at the site root on communicare.farm.
export function callbackUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  // Strip the current path back to the site root + add /auth/callback/.
  const { origin, pathname } = window.location;
  // Trim any trailing slug to the site root we're hosted at — the deepest
  // "shared" prefix is everything up to the first /farmer/ or /share/.
  const root = pathname.split("/").slice(0, 2).filter(Boolean)[0]
    ? `/${pathname.split("/").slice(0, 2).filter(Boolean)[0]}`
    : "";
  // Don't include /farmer or /come-in in the base — those aren't a prefix.
  const cleaned =
    root === "/farmer" || root === "/come-in" || root === "/share"
      ? ""
      : root;
  return `${origin}${cleaned}/auth/callback/`;
}

// Eyebrow + footer prop wrapper for switching links between the four
// farmer auth pages. Re-used across sign-in, sign-up, forgot, reset.
export function FarmerAuthFooterLinks({
  current,
}: {
  current: "sign-in" | "sign-up" | "forgot" | "reset";
}) {
  return (
    <div className="space-y-2">
      {current !== "sign-in" && (
        <p>
          Already have an account?{" "}
          <Link
            href="/farmer/come-in/"
            className="text-brick hover:underline not-italic"
          >
            Sign in →
          </Link>
        </p>
      )}
      {current !== "sign-up" && (
        <p>
          New here?{" "}
          <Link
            href="/farmer/sign-up/"
            className="text-brick hover:underline not-italic"
          >
            Start your farm desk →
          </Link>
        </p>
      )}
      {current === "sign-in" && (
        <p className="text-soil/55">
          Forgot your password?{" "}
          <Link
            href="/farmer/forgot-password/"
            className="text-brick hover:underline not-italic"
          >
            Send a reset link
          </Link>
          .
        </p>
      )}
      <p className="text-soil/55">
        Not a farm?{" "}
        <Link
          href="/come-in/"
          className="text-brick hover:underline not-italic"
        >
          Members sign in here
        </Link>
        .
      </p>
    </div>
  );
}
