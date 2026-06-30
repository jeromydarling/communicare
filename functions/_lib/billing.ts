// =============================================================================
// billing — gate helper for paid-only routes
// =============================================================================
// Reads users.subscription_status to decide whether a caller is allowed
// to do destructive things: publish a farm, send SMS, accept invites,
// charge a card. Read-only endpoints (auth/me, dashboard data, etc.)
// are always open so an unpaid account can still see what they signed
// up for and find the Pay button.
//
// Usage:
//   const auth = await verifyAuth(req, env);
//   if (!auth.ok) return auth.response;
//   const gate = await requireActiveSubscription(env.DB, auth.user.id);
//   if (!gate.ok) return gate.response;
//
// The status string comes from the Stripe webhook, denormalized onto
// users for fast reads. 'active' is the only green light.
// =============================================================================

import { json } from "./cors";
import { one } from "./db";

export type GateResult =
  | { ok: true; status: "active" }
  | { ok: false; response: Response };

export async function requireActiveSubscription(
  db: D1Database | undefined,
  userId: string,
): Promise<GateResult> {
  if (!db) {
    return {
      ok: false,
      response: json({ error: "Database not configured." }, 500),
    };
  }
  const row = await one<{ subscription_status: string }>(
    db,
    `select subscription_status from users where id = ?`,
    [userId],
  );
  const status = row?.subscription_status ?? "unpaid";
  if (status === "active") return { ok: true, status: "active" };

  return {
    ok: false,
    response: json(
      {
        error: "Add a payment method to unlock this.",
        code: "subscription_required",
        subscription_status: status,
      },
      402, // Payment Required
    ),
  };
}
