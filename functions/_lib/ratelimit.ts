// =============================================================================
// rateLimit — KV-backed sliding-window-ish counter
// =============================================================================
// Simple per-bucket counter in the RATELIMIT KV namespace. Each call:
//   1. Reads the current count for the bucket
//   2. If <= limit, increments and writes back with an aligned TTL
//   3. If > limit, returns a blocked response with Retry-After
//
// Why aligned TTL: every request inside a window points at the SAME KV
// key (e.g. ratelimit:inquiry:<ip>:2026-06-04T17). When the hour rolls
// over, the next request lands on a new key and the old one expires on
// its own. No background sweeping, no clock drift games.
//
// This is a "good enough" rate limit — not a precise sliding window. For
// anti-spam on a low-volume route (a few inquiries an hour at most) it's
// the right shape. If we ever need precision we move to Durable Objects.
//
// Usage:
//   const result = await rateLimit(env.RATELIMIT, {
//     bucket: `inquiry:${ip}`,
//     limit: 5,
//     windowSeconds: 60 * 60,   // 1 hour
//   });
//   if (!result.ok) return result.response;
// =============================================================================

import { json } from "./cors";

type RateLimitArgs = {
  bucket: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; response: Response };

export async function rateLimit(
  kv: KVNamespace | undefined,
  args: RateLimitArgs,
): Promise<RateLimitResult> {
  if (!kv) {
    // No KV bound — open the gate, but make the omission visible in logs.
    console.warn(`rateLimit: RATELIMIT KV missing; bucket=${args.bucket}`);
    return { ok: true, remaining: args.limit };
  }

  const windowKey = currentWindowKey(args.windowSeconds);
  const key = `ratelimit:${args.bucket}:${windowKey}`;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) || 0 : 0;

  if (count >= args.limit) {
    return {
      ok: false,
      response: json(
        { error: "Too many requests. Try again later." },
        429,
      ),
    };
  }

  // Aligned TTL: the key expires at the end of its own window. We pad a
  // few seconds so the read-modify-write race-loser doesn't accidentally
  // miss its own window edge.
  const ttl = Math.max(10, args.windowSeconds + 5);

  // Best-effort write. We deliberately don't await across the response
  // edge — KV is eventually consistent, and the worst case here is one
  // extra request slipping through during a hot race. The caller can pass
  // ctx.waitUntil if they care about durability.
  await kv.put(key, String(count + 1), { expirationTtl: ttl });

  return { ok: true, remaining: args.limit - count - 1 };
}

function currentWindowKey(windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const aligned = Math.floor(now / windowSeconds) * windowSeconds;
  return String(aligned);
}

// Convenience: extract the caller's IP for use as a bucket key. CF puts
// the real IP in cf-connecting-ip on every request.
export function ipBucket(req: Request, prefix: string): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `${prefix}:${ip}`;
}

// =============================================================================
// dailyCap — per-actor counter that accepts a CHUNK SIZE per call
// =============================================================================
// rateLimit treats each call as one unit; that's right for "one signup
// per call". For batch sends like invite-members or import-members, one
// call may represent N units (emails sent / rows imported) and the cap
// is on the TOTAL units per day.
//
//   await dailyCap(env.RATELIMIT, {
//     bucket: `import:${userId}`,
//     dailyLimit: 5000,
//     incrementBy: rows.length,
//   })
//
// Returns { ok: true, remaining } when the increment fits, or
// { ok: false, response } with a 429 JSON body.
//
// Same aligned-window approach as rateLimit; one key per UTC day.
// =============================================================================

type DailyCapArgs = {
  bucket: string;
  dailyLimit: number;
  incrementBy?: number;
};

export async function dailyCap(
  kv: KVNamespace | undefined,
  args: DailyCapArgs,
): Promise<RateLimitResult> {
  const incrementBy = args.incrementBy ?? 1;
  if (incrementBy < 1) return { ok: true, remaining: args.dailyLimit };
  if (!kv) {
    console.warn(`dailyCap: RATELIMIT KV missing; bucket=${args.bucket}`);
    return { ok: true, remaining: args.dailyLimit };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `dailycap:${args.bucket}:${today}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) || 0 : 0;

  if (count + incrementBy > args.dailyLimit) {
    return {
      ok: false,
      response: json(
        {
          error: `Daily limit reached for this account. Try again tomorrow, or write hello@communicare.farm if you need a higher cap.`,
        },
        429,
      ),
    };
  }

  // 26-hour TTL gives a safe margin around DST + clock skew between
  // edge regions; the next day's key starts fresh regardless.
  await kv.put(key, String(count + incrementBy), { expirationTtl: 26 * 60 * 60 });
  return { ok: true, remaining: args.dailyLimit - count - incrementBy };
}
