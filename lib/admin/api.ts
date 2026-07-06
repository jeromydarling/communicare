// =============================================================================
// Admin CRM API client — talks to /api/admin/*
// =============================================================================
// Same ApiOk<T>|ApiErr shape as lib/farmer/api.ts. Every route returns
// 404 to non-admins, so a rendering client can just treat that as "no
// access" and redirect.
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
    return { error: (body as { error?: string })?.error ?? `HTTP ${res.status}` };
  }
  return body as ApiOk<T>;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Metrics = {
  active: number;
  paused: number;
  past_due: number;
  unpaid: number;
  canceled_last_30d: number;
  signups_last_30d: number;
  mrr_cents: number;
  recent_signup: { email: string; created_at: string } | null;
  recent_cancel: { email: string; canceled_at: string } | null;
};

export type ContactRow = {
  id: string;
  email: string;
  display_name: string | null;
  subscription_status: string;
  subscription_current_period_end: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  farm_id: string | null;
  farm_slug: string | null;
  farm_name: string | null;
  farm_location: string | null;
  farm_kind: string | null;
  farm_is_published: number | null;
  farm_lat: number | null;
  farm_lng: number | null;
  open_actions: number;
  last_activity_at: string | null;
};

export type ContactDetail = {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    preferred_locale: string | null;
    subscription_status: string | null;
    subscription_id: string | null;
    subscription_current_period_end: string | null;
    stripe_customer_id: string | null;
    canceled_at: string | null;
    cancel_reason: string | null;
    is_admin: number;
    created_at: string;
    email_verified_at: string | null;
  };
  profile: {
    phone?: string | null;
    display_name?: string | null;
    preferred_sms?: number;
    preferred_email?: number;
  } | null;
  farms: Array<{
    id: string;
    slug: string;
    name: string;
    location: string;
    kind: string;
    is_published: number;
    onboarded_at: string | null;
    created_at: string;
  }>;
  pinned_notes: Array<{
    id: string;
    author_user_id: string;
    body: string;
    pinned: number;
    created_at: string;
    updated_at: string;
  }>;
  open_actions: Array<{
    id: string;
    assigned_to_user_id: string;
    body: string;
    snooze_until: string | null;
    created_at: string;
  }>;
  stripe_subscriptions: Array<{
    id: string;
    status: string;
    price_id: string | null;
    current_period_end: string;
    canceled_at: string | null;
    paused_at: string | null;
    resume_at: string | null;
  }>;
  timeline: Array<{
    kind: string;
    ts: string;
    id: string;
    payload: string;
  }>;
};

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

export function getMetrics() {
  return api<Metrics>("/api/admin/metrics");
}

export function listContacts(opts: { status?: string; q?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.status) p.set("status", opts.status);
  if (opts.q) p.set("q", opts.q);
  const qs = p.toString();
  return api<{ contacts: ContactRow[] }>(
    `/api/admin/contacts${qs ? `?${qs}` : ""}`,
  );
}

export function getContact(id: string) {
  return api<ContactDetail>(`/api/admin/contacts/${encodeURIComponent(id)}`);
}

export function postNote(args: { subject_user_id: string; body: string; pinned?: boolean }) {
  return api<{ ok: true; id: string }>("/api/admin/notes", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function postAction(args: {
  subject_user_id: string;
  body: string;
  snooze_until?: string;
}) {
  return api<{ ok: true; id: string }>("/api/admin/actions", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function toggleActionDone(id: string, done: boolean) {
  return api<{ ok: true }>(`/api/admin/actions?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ done }),
  });
}

export function myOpenActions() {
  return api<{
    actions: Array<{
      id: string;
      subject_user_id: string;
      subject_email: string | null;
      subject_name: string | null;
      body: string;
      snooze_until: string | null;
      created_at: string;
    }>;
  }>("/api/admin/actions?assigned_to=me");
}

export function sendMessage(args: {
  subject_user_id: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
}) {
  return api<{ ok: true; id: string }>("/api/admin/messages", {
    method: "POST",
    body: JSON.stringify(args),
  });
}
