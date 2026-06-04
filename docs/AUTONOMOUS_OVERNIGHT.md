# Autonomous overnight + morning — what's live, what's left

The overnight pass moved every public-facing path to Cloudflare Workers.
The morning pass swapped Resend for the new Cloudflare Email Service
binding (public beta, April 2026), provisioned D1 + KV via the CF MCP
tools, and applied every D1 migration to the live database.

## What is REAL right now

| Layer | Status |
|---|---|
| Cloudflare account | Connected via MCP, bindings verified by `wrangler deploy --dry-run` |
| **D1 `communicare-db`** | **Live** at `e6ec9e5c-563b-4d19-9ed6-da319c6f39c4`. All 27 application tables created. |
| **KV `CACHE`** | **Live** at `9af31b0a4860428c88d7ce792e5978e0` |
| **KV `SESSIONS`** | **Live** at `686f9832f09640d0af41e0f6e315ff56` |
| **KV `RATELIMIT`** | **Live** at `16d7967fcda14facb8c0a5b6703cd1ce` |
| **Workers AI** | Bound, ready for use |
| **Email Sending** | Binding declared (`send_email: { name: "EMAIL", remote: true }`). Public-beta on Workers paid plan. |
| `wrangler.jsonc` | Has all real IDs. Ready to deploy. |

## What you still need to click

The MCP token I have doesn't include R2, Vectorize, or DNS scopes. Three
short dashboard tasks remain:

### 1. R2 buckets (~30s in CLI)

```bash
npx wrangler r2 bucket create communicare-farm-photos
npx wrangler r2 bucket create communicare-product-photos
npx wrangler r2 bucket create communicare-imports
```

Then uncomment the `r2_buckets` block in `wrangler.jsonc` (it's
commented at the bottom with the exact lines to paste).

### 2. Vectorize index (~30s in CLI)

```bash
npx wrangler vectorize create communicare-embeddings \
  --dimensions=384 --metric=cosine
```

Then uncomment the `vectorize` block in `wrangler.jsonc`.

### 3. Cloudflare Email Service domain onboarding (~10 min in dashboard)

CF dashboard → **Compute & AI → Email Service → Onboard Domain →
`mycommuni.care`**. CF adds SPF + DKIM records to your zone
automatically. Verification typically completes in 5–15 minutes.
**Until this finishes, all `EMAIL.send()` calls fail — sign-up, magic
link, forgot password, invite emails will all return "binding missing"
or upstream errors.**

Reply-to on every system email defaults to `gardener@thecros.app`
(declared as `vars.SYSTEM_REPLY_TO` in `wrangler.jsonc`). Inbound Email
Routing isn't needed — you said skip it. Members reply to that
gardener address; farm-to-member emails carry the farm's own reply-to
when that flow lands.

### 4. Secrets (~2 min via `wrangler secret put`)

```bash
npx wrangler secret put ANTHROPIC_API_KEY     # homepage drafter (Claude — Llama failed the voice test)
npx wrangler secret put AI_GATEWAY_TOKEN      # cfut_... — routes Claude + Workers AI through the gateway
npx wrangler secret put PERPLEXITY_API_KEY    # /find ZIP search
npx wrangler secret put MAPBOX_TOKEN          # server-side geocoding
npx wrangler secret put TURNSTILE_SECRET      # /api/waitlist anti-spam — value: 0x4AAAAAADe1zpDIC8hHHiYKSs5y3lbVY5s
```

### 5. Build-time public vars (~1 min in dashboard)

CF dashboard → your Worker → Settings → Variables → Build environment:

- `NEXT_PUBLIC_MAPBOX_TOKEN` (the public Mapbox token)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADe1zsvubT9uji8o`

## What's deferred

- **Google OAuth Worker route** — `oauth_accounts` table exists, the
  handler isn't wired. Email+password and magic link cover launch.
- **Stripe Connect** — deferred per original plan.
- **Twilio SMS swap loop** — Twilio webhook stays on Supabase until
  ported.
- **Cron triggers** — `cache-refresher` + `hortus-sync` need their own
  Worker projects (Pages can't host cron handlers).
- **Image transformations** — `/i/<bucket>/<key>` serves R2 objects
  with cache headers; CF Image Transformations layer ($5/mo add-on)
  transparently picks up `?w=240&q=80` etc. when enabled on the zone.

## Honest gaps

- **Multi-tenant authorization** lives in application code now (D1 has
  no RLS). Every Worker route that touches farm-scoped data verifies
  the operator owns the farm explicitly. Audited every new route; a
  second pre-launch pass is worth doing.
- **Session cookies don't refresh Max-Age** on sliding extension. The
  server-side row stays valid; the cookie expires on its original
  schedule. Next `/api/auth/me` call transparently re-extends. Note in
  `functions/api/auth/me.ts`.
- **Email lib type** is hand-written (`EmailSendBinding`) because the
  CF workers-types package hadn't shipped the public-beta send_email
  shape at the version pinned. When `@cloudflare/workers-types`
  catches up, the local type can come out and we can use
  `SendEmail` from the package.

## Verifying when you're ready

After the four remaining click-tasks above:

```bash
curl https://mycommuni.care/api/_health | jq
```

Every binding should report `true`. Then walk the verification
checklist at the bottom of `docs/CLOUDFLARE_SETUP.md`: sign-up,
sign-in, magic link, forgot/reset, onboarding, CSV import, ZIP search,
"Send them a note", /join.

Pax tibi.
