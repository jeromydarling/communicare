// =============================================================================
// sessions — D1-backed sessions + cookie management
// =============================================================================
// Session lifecycle:
//   1. createSession(userId): mints a fresh CSPRNG id, writes its SHA-256
//      hash to the `sessions` D1 table, returns { id, expiresAt }. The
//      caller wraps the id in a Set-Cookie via sessionCookie().
//   2. getSession(req): reads the cookie, hashes, looks up the row,
//      returns the user_id + expiresAt or null.
//   3. extendSession(id): when a session is in its last 7 days, bump
//      expires_at back to "now + 30d". Sliding window.
//   4. destroySession(id): delete the row + return a cookie that
//      expires immediately.
//
// Cookie shape:
//   __Host-cmcr_session=<base64url-32-bytes>; Path=/; Secure; HttpOnly;
//   SameSite=Lax; Max-Age=2592000
//
// The `__Host-` prefix REQUIRES Secure, no Domain, Path=/. Browsers
// refuse to set the cookie otherwise.
// =============================================================================

import { newSessionId, sha256Hex } from "./crypto";
import { one, run } from "./db";

export const SESSION_COOKIE = "__Host-cmcr_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // last 7 days

export type SessionRow = {
  id_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
};

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------

export async function createSession(
  db: D1Database,
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<{ id: string; expiresAt: Date }> {
  const id = newSessionId();
  const idHash = await sha256Hex(id);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await run(
    db,
    `insert into sessions (id_hash, user_id, expires_at, ip, user_agent)
     values (?, ?, ?, ?, ?)`,
    [
      idHash,
      userId,
      expiresAt.toISOString(),
      meta?.ip ?? null,
      meta?.userAgent ? meta.userAgent.slice(0, 200) : null,
    ],
  );
  return { id, expiresAt };
}

// -----------------------------------------------------------------------------
// Read (+ optional sliding-window extension)
// -----------------------------------------------------------------------------

export async function getSessionFromRequest(
  db: D1Database,
  req: Request,
): Promise<{ session: SessionRow; refreshed: boolean } | null> {
  const id = parseSessionCookie(req.headers.get("Cookie"));
  if (!id) return null;
  const idHash = await sha256Hex(id);

  const row = await one<SessionRow>(
    db,
    `select id_hash, user_id, expires_at, created_at
       from sessions where id_hash = ?`,
    [idHash],
  );
  if (!row) return null;

  const expires = new Date(row.expires_at).getTime();
  const now = Date.now();
  if (expires <= now) {
    // Expired — try to clean up but don't block the response
    await run(db, `delete from sessions where id_hash = ?`, [idHash]);
    return null;
  }

  // Sliding window: if we're within the renew threshold, push expiry out
  let refreshed = false;
  if (expires - now < SESSION_RENEW_THRESHOLD_MS) {
    const next = new Date(now + SESSION_LIFETIME_MS).toISOString();
    await run(
      db,
      `update sessions set expires_at = ? where id_hash = ?`,
      [next, idHash],
    );
    row.expires_at = next;
    refreshed = true;
  }

  return { session: row, refreshed };
}

// -----------------------------------------------------------------------------
// Destroy
// -----------------------------------------------------------------------------

export async function destroySessionByCookie(
  db: D1Database,
  req: Request,
): Promise<void> {
  const id = parseSessionCookie(req.headers.get("Cookie"));
  if (!id) return;
  const idHash = await sha256Hex(id);
  await run(db, `delete from sessions where id_hash = ?`, [idHash]);
}

export async function destroyAllUserSessions(
  db: D1Database,
  userId: string,
): Promise<void> {
  await run(db, `delete from sessions where user_id = ?`, [userId]);
}

// -----------------------------------------------------------------------------
// Cookie helpers
// -----------------------------------------------------------------------------

export function sessionCookie(id: string, expiresAt: Date): string {
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    "Path=/",
    "Secure",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "Secure",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== SESSION_COOKIE) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}
