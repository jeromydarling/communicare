// =============================================================================
// Farmer-side API client — talks to /api/farmer/*
// =============================================================================
// Same shape as lib/auth/client.ts: fetch with credentials, returns
// `{ ok, ... }` or `{ error }`. Used by the onboarding wizard, the
// import flow, and the dashboard layouts.
// =============================================================================

type ApiOk<T> = T & { ok: true };
type ApiErr = { ok?: false; error: string };

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiOk<T> | ApiErr> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    return { error: `HTTP ${res.status}` };
  }
  if (!res.ok) {
    const err = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
    return { error: err };
  }
  return body as ApiOk<T>;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AuthedUser = {
  id: string;
  email: string;
};

export type OperatorFarm = {
  id: string;
  slug: string;
  name: string;
  location: string;
  kind: string;
  onboarded_at: string | null;
};

export type MeWithFarm = {
  user: AuthedUser;
  farm: OperatorFarm | null;
  role: "owner" | "staff" | null;
};

export type ShareDef = {
  id: string;
  name: string;
  description: string | null;
  cadence: string;
  billing_model: string;
  price_per_pickup_cents: number | null;
  monthly_price_cents: number | null;
  season_price_cents: number | null;
};

export type PickupSite = {
  id: number;
  name: string;
  address: string | null;
  day_of_week: number | null;
  window_start: string | null;
  window_end: string | null;
};

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

export function getMeWithFarm() {
  return api<MeWithFarm>("/api/farmer/me-with-farm");
}

export function createFarm(args: {
  name: string;
  slug: string;
  kind: string;
  location: string;
}) {
  return api<{ farm_id: string }>("/api/farmer/onboarding/create-farm", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function listShares() {
  return api<{ shares: ShareDef[] }>("/api/farmer/shares");
}

export function createShare(args: {
  name: string;
  cadence: string;
  billing_model: string;
  description?: string;
  price_cents?: number;
}) {
  return api<{ id: string }>("/api/farmer/shares", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function listPickupSites() {
  return api<{ pickup_sites: PickupSite[] }>("/api/farmer/pickup-sites");
}

export function createPickupSite(args: {
  name: string;
  address?: string;
  day_of_week?: number;
  window_start?: string;
  window_end?: string;
}) {
  return api<{ id: number | null }>("/api/farmer/pickup-sites", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function completeOnboarding() {
  return api<{ farm_id: string }>("/api/farmer/complete-onboarding", {
    method: "POST",
  });
}
