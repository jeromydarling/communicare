// =============================================================================
// Client-side auth — Communicare's own (replaces Supabase Auth)
// =============================================================================
// Thin fetch wrappers around /api/auth/*. All the heavy lifting is
// server-side; this file is what the React components import.
//
// Cookie management is automatic: the server sets __Host-cmcr_session
// on signup / signin / magic-callback / reset, and the browser sends
// it back with every fetch when `credentials: "include"` is set.
//
// Why no global state / context wrapper here: most pages only need a
// one-shot `me()` to decide whether to render the signed-in or
// signed-out view. The few that need reactive auth state (the farmer
// dashboard layout) wire their own useEffect. Keeps the auth library
// tiny and the rendering predictable.
// =============================================================================

export type AuthedUser = {
  id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
};

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
// Auth operations
// -----------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const res = await api<{ user: AuthedUser | null }>("/api/auth/me", {
    method: "GET",
  });
  if (!("ok" in res) || !res.ok) return null;
  return res.user ?? null;
}

export async function signUp(args: {
  email: string;
  password: string;
  display_name?: string;
  farm_name?: string;
}): Promise<ApiOk<{ user: AuthedUser }> | ApiErr> {
  return api<{ user: AuthedUser }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function signInWithPassword(args: {
  email: string;
  password: string;
}): Promise<ApiOk<{ user: AuthedUser }> | ApiErr> {
  return api<{ user: AuthedUser }>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function sendMagicLink(args: {
  email: string;
  redirect_to?: string;
}): Promise<ApiOk<Record<string, never>> | ApiErr> {
  return api<Record<string, never>>("/api/auth/magic", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "include",
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<ApiOk<Record<string, never>> | ApiErr> {
  return api<Record<string, never>>("/api/auth/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function applyPasswordReset(args: {
  token: string;
  password: string;
}): Promise<ApiOk<Record<string, never>> | ApiErr> {
  return api<Record<string, never>>("/api/auth/reset", {
    method: "POST",
    body: JSON.stringify(args),
  });
}
