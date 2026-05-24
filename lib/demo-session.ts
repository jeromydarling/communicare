// Form-gated demo session.
//
// When Supabase is configured, anyone visiting /farmer or /share must
// either be signed in OR have completed the demo gate at /demo. The gate
// collects name + email + reason-for-visiting (writes to waitlist if
// Supabase is up) and sets a localStorage flag so future page loads in
// this browser skip the gate.
//
// This pattern is the conversion funnel: visitors get a real, hands-on
// demo of the dashboard without us giving away the database to anyone
// who reads the URL. The form is a soft gate, not a security boundary —
// the demo dashboard is showing mock data anyway.
//
// BYPASSES (for testing, deep-links, or just impatience):
//   1. Append `?skip=1` to /farmer or /share URLs — AuthGate sets a
//      generic demo session and lets you straight in
//   2. Click "Skip the form — open the demo →" on /demo
//   3. Run `bypassDemo()` from the browser console anywhere

const KEY = "communicare_demo_v1";

export type DemoSession = {
  name: string;
  email: string;
  reason: string;
  unlockedAt: string;
};

const BYPASS_SESSION: DemoSession = {
  name: "Visitor",
  email: "visitor@communicare.farm",
  reason: "Bypass — direct link",
  unlockedAt: "1970-01-01T00:00:00Z", // sentinel value so we can tell it apart
};

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed.email || !parsed.unlockedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDemoSession(session: DemoSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

// Quick bypass — sets a generic session without going through the form.
// Reachable from /demo's "Skip" link, from ?skip=1 URLs, and from the
// browser console (we expose it on window in dev).
export function bypassDemo() {
  setDemoSession(BYPASS_SESSION);
}

if (typeof window !== "undefined") {
  // Expose for console debugging — `bypassDemo()` from anywhere
  (window as unknown as { bypassDemo: () => void }).bypassDemo = bypassDemo;
}

export const DEMO_REASONS = [
  "I run a farm and I'm shopping for software",
  "I belong to a CSA / farm share already",
  "I'm thinking about joining a CSA",
  "I write or report about food and farms",
  "I build software (curious how this works)",
  "Something else",
] as const;

