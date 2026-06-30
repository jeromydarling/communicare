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

export type BillingSnapshot = {
  subscription_status:
    | "unpaid" | "active" | "past_due" | "canceled"
    | "incomplete" | "incomplete_expired";
  period_end: string | null;
  has_stripe_customer: boolean;
};

export type MeWithFarm = {
  user: AuthedUser;
  farm: (OperatorFarm & {
    connect_account_id?: string | null;
    connect_charges_enabled?: number;
    connect_payouts_enabled?: number;
    connect_details_submitted?: number;
  }) | null;
  role: "owner" | "staff" | null;
  billing: BillingSnapshot;
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

// -----------------------------------------------------------------------------
// SMS — Tuesday text loop
// -----------------------------------------------------------------------------

export type SmsConfig = {
  farm_id: string;
  twilio_phone_number: string | null;
  twilio_messaging_service_sid: string | null;
  send_day_of_week: number;
  send_local_hour: number;
  send_timezone: string;
  reply_window_hours: number;
  auto_action_on_no_reply: "confirm" | "skip";
  is_active: number;
};

export type SmsSubscription = {
  id: string;
  farm_id: string;
  phone_e164: string;
  display_name: string | null;
  locale: "en" | "es";
  consent_status: "pending" | "opted_in" | "opted_out";
  consent_text_sent_at: string | null;
  opted_in_at: string | null;
  opted_out_at: string | null;
  outbound_number: string | null;
  created_at: string;
  updated_at: string;
};

export function getSmsConfig() {
  return api<{ config: SmsConfig | null }>("/api/farmer/sms/config");
}

export function updateSmsConfig(args: Partial<{
  twilio_phone_number: string | null;
  send_day_of_week: number;
  send_local_hour: number;
  send_timezone: string;
  reply_window_hours: number;
  auto_action_on_no_reply: "confirm" | "skip";
  is_active: boolean;
}>) {
  return api<{ config: SmsConfig }>("/api/farmer/sms/config", {
    method: "PUT",
    body: JSON.stringify(args),
  });
}

export function listSmsSubscriptions() {
  return api<{ subscriptions: SmsSubscription[] }>(
    "/api/farmer/sms/subscriptions",
  );
}

export function addSmsSubscription(args: {
  phone: string;
  display_name?: string;
  locale?: "en" | "es";
}) {
  return api<{
    subscription: SmsSubscription;
    already_existed: boolean;
    consent_text_sent: boolean;
  }>("/api/farmer/sms/subscriptions", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function deleteSmsSubscription(id: string) {
  return api<{ ok: true }>(
    `/api/farmer/sms/subscriptions?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function sendSmsTest(phone: string) {
  return api<{ ok: true; sid: string; status: string }>(
    "/api/farmer/sms/send-test",
    { method: "POST", body: JSON.stringify({ phone }) },
  );
}

// -----------------------------------------------------------------------------
// Billing — Stripe Checkout + Portal + Connect onboarding
// -----------------------------------------------------------------------------

export function startCheckoutSession() {
  return api<{ url: string; sessionId: string }>(
    "/api/billing/create-checkout-session",
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function openBillingPortal() {
  return api<{ url: string }>("/api/billing/portal", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function startConnectOnboarding(args: { farm_id?: string } = {}) {
  return api<{ url: string; accountId: string }>(
    "/api/billing/connect-onboard",
    { method: "POST", body: JSON.stringify(args) },
  );
}
