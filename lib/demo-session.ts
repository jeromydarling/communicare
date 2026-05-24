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

const KEY = "communicare_demo_v1";

export type DemoSession = {
  name: string;
  email: string;
  reason: string;
  unlockedAt: string;
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

export const DEMO_REASONS = [
  "I run a farm and I'm shopping for software",
  "I belong to a CSA / farm share already",
  "I'm thinking about joining a CSA",
  "I write or report about food and farms",
  "I build software (curious how this works)",
  "Something else",
] as const;
