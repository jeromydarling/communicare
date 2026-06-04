# Communicare on Cloudflare — setup guide

This is the canonical "from clone to live" doc for deploying Communicare
on Cloudflare. It supersedes `docs/SUPABASE_SETUP.md`, which described the
older Supabase-backed deploy. See `docs/CLOUDFLARE_MIGRATION.md` for the
phased history of how we got here.

Total time: ~30 minutes if you already have a Cloudflare account with
all your secrets in hand, ~1 hour from scratch.

## Architecture (one paragraph)

A single Cloudflare Worker (`src/worker.ts`) serves both the static site
and the API. `output: "export"` builds the Next.js app into `./out`, which
the Worker attaches as the `ASSETS` binding. Requests to `/api/*` and
`/i/*` route through handlers in `functions/`; everything else falls
through to `env.ASSETS.fetch(req)` so the right HTML or JS chunk comes
from the edge. Data lives in **D1** (SQLite). Sessions, cache, and rate
limits live in **KV**. Photos and import CSVs live in **R2**. Embeddings
live in **Vectorize**. Outbound mail goes through the **Cloudflare Email Service `send_email` binding**; inbound at
`hello@`, `migrate@` goes through **Cloudflare Email Routing**. The
homepage drafter and the CSV column mapper run on **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, JSON schema mode);
low-stakes AI (alt-text, embeddings) uses **Workers AI**.

## 0. Prerequisites

- A Cloudflare account with Workers paid plan ($5/mo for the D1 + Vectorize
  + Workers AI quota we'll use). The free tier works for everything except
  prolonged AI usage.
- A registered domain on Cloudflare DNS (this repo expects `mycommuni.care`
  but any domain works — see "Customizing the domain" at the bottom).
- (No Resend account needed — outbound uses Cloudflare Email Service direct.)
- (No Anthropic key needed — homepage drafter + CSV mapper run on Workers AI Llama 3.3 70B.)
- A Mapbox token for the `/find` geocoder.
- A Perplexity API key for the discovery search.
- Local: Node 22+, `npx wrangler login` once.

## 1. Provision Cloudflare resources

```bash
npx wrangler login          # one-time browser handshake
npm run cf:provision        # creates D1, KV, R2, Vectorize
```

The script is idempotent. It prints, for each resource, the exact `sed` or
`node` commands to apply the new IDs to `wrangler.jsonc`. **Run those
commands.** The bindings block in `wrangler.jsonc` is commented out by
default; the provisioning script's output is what fills it in.

When the script finishes you should have:

- `communicare-db` (D1)
- `CACHE`, `SESSIONS`, `RATELIMIT` (KV)
- `communicare-farm-photos`, `communicare-product-photos`,
  `communicare-imports` (R2)
- `communicare-embeddings` (Vectorize, 384-dim, cosine)

## 2. Apply D1 migrations

```bash
npm run d1:migrate           # five migrations in cloudflare/d1/migrations/
```

Verify with:

```bash
npx wrangler d1 execute communicare-db --remote \
  --command "select name from sqlite_master where type='table' order by name"
```

You should see at least: `farms`, `farm_homepages`, `farm_inquiries`,
`farm_integrations`, `farm_members`, `import_runs`, `magic_link_tokens`,
`oauth_accounts`, `password_reset_tokens`, `pending_crop_mappings`,
`pickup_sites`, `products`, `profiles`, `sessions`, `share_definitions`,
`subscriptions`, `users`, `waitlist`, `discovered_farms`,
`discovery_searches`, `order_items`, `orders`, `credit_ledger`,
`payment_config`, `herd_share_contracts`, `milk_test_results`,
`sms_messages`.

## 3. Set secrets

Secrets are values you DON'T want in `wrangler.jsonc`. Set each via
`npx wrangler secret put <NAME>` — it prompts for the value and uploads
encrypted.

| Secret | Required? | What it does |
|---|---|---|
| `PERPLEXITY_API_KEY` | yes | `/find` ZIP search |
| `MAPBOX_TOKEN` | yes | Geocoding inside `find-nearby-farms` (server-side; the public token still goes in vars) |
| `TURNSTILE_SECRET` | recommended | Anti-spam on `/api/waitlist`; pass-through if unset (dev-friendly) |
| `TWILIO_AUTH_TOKEN` | when SMS lands | Twilio webhook verification |
| `STRIPE_SECRET_KEY` | when billing lands | Stripe Connect |
| `STRIPE_WEBHOOK_SECRET` | when billing lands | Stripe webhook |

Outbound email uses the **Cloudflare Email Service `send_email` binding**
declared in `wrangler.jsonc` — no API key required, the binding talks
directly to CF's send API. Domain onboarding is a one-time dashboard
step (next section).

Public env vars (safe in `wrangler.jsonc`'s `vars` block):

- `SITE_URL=https://mycommuni.care`
- `SEND_FROM=Communicare <hello@mycommuni.care>` (the From: address every Worker uses)
- `ENVIRONMENT=production`

Browser-side env vars baked at build time:

- `NEXT_PUBLIC_MAPBOX_TOKEN` — the public Mapbox token for the map widget
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Turnstile widget site key (the
  secret is server-side; this one is rendered into the HTML)

Set these in the Cloudflare dashboard at:
**Workers & Pages → communicare → Settings → Variables and Secrets → Build environment**

## 4. Onboard the domain to Cloudflare Email Service

Cloudflare Email Sending (public beta, April 2026) handles outbound
transactional mail directly through the `send_email` Workers binding —
no third-party provider needed. One-time setup:

1. CF dashboard → **Compute & AI → Email Service**
2. Click **Onboard Domain**, pick `mycommuni.care`
3. CF adds SPF + DKIM records to your zone automatically (since DNS is
   already on Cloudflare)

DNS changes typically propagate in 5–15 minutes; the dashboard reports
green when the domain is verified for sending. Until verification
completes, `EMAIL.send()` calls will fail and the Worker logs will
show "domain not verified" errors.

Sending is available on the **Workers Paid plan** ($5/mo). The first
~100k messages/month are included.

## 5. Inbound email routing

Cloudflare Email Routing forwards mail at custom addresses to your real
inbox without an SMTP server. In the CF dashboard:

**mycommuni.care → Email → Email Routing**

Add routes:

- `hello@mycommuni.care` → your real inbox
- `migrate@mycommuni.care` → your real inbox (or a shared one if you've
  got migration help)

Cloudflare auto-adds the MX records. SPF you already added in step 4.

## 6. Deploy

Push to `main`. The Worker project rebuilds on push:

```bash
git push origin main
```

CF runs `npm run build` (produces `./out`) then `npx wrangler deploy`
(uploads the Worker + assets). When green:

```bash
curl https://mycommuni.care/api/_health | jq
```

You should see `ok: true` and every binding showing `true`. If any
binding shows `false`, the dashboard's "Bindings" tab for the Worker
needs to be re-checked — either the `wrangler.jsonc` is missing the
binding, the resource ID is wrong, or the resource itself is missing.

## 7. (Optional) Migrate existing Supabase data

If you had a previous Supabase-backed deployment with real data, the
migration script in `scripts/migrate-pg-to-d1.ts` dumps every table to
a SQL file that D1 can ingest:

```bash
SUPABASE_URL=https://<your-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run pg-to-d1 > d1-import.sql

npx wrangler d1 execute communicare-db --remote --file d1-import.sql
```

The script handles UUID → text, jsonb → text, boolean → 0/1, FK-correct
table ordering, and synthesizes a `users` row from each `profiles` row
since D1's `users` is owned by the app, not by an external auth service.

After migrating data, every existing user's password is invalidated (we
can't migrate Supabase's bcrypt hashes into our PBKDF2 store). Tell
existing users to use the magic-link flow at `/come-in` for their first
sign-in; from there they can set a new password if they want one.

## 8. Verification checklist

- [ ] `curl /api/_health` → `ok: true`, every binding `true`
- [ ] `/come-in` accepts an email, sends a magic-link, the click lands on
  the site signed in
- [ ] `/farmer/sign-up` creates an account, redirects to
  `/farmer/onboarding/`
- [ ] `/farmer/come-in` accepts email + password and lands on `/farmer/`
- [ ] `/farmer/forgot-password` sends a reset email; the link lands on
  `/farmer/reset-password/?token=…` and accepts a new password
- [ ] `/farmer/onboarding/` writes farms / shares / pickups to D1
  (verify with `wrangler d1 execute … --command "select * from farms"`)
- [ ] `/farmer/import` parses a CSV, AI maps it, imports → `import_runs`
  shows the row with `status='committed'` and per-row results
- [ ] `/find` accepts a ZIP, returns farms, sub-second on the second
  search (KV cache hit)
- [ ] `/find` "Send them a note" creates a row in `farm_inquiries`
- [ ] `/join` writes a `waitlist` row via `/api/waitlist`
- [ ] Per-IP rate limits return 429 when hammered

## What I clicked vs. what the script did

| Step | Where |
|---|---|
| 1. Provision | `npm run cf:provision` + run printed patches |
| 2. Migrations | `npm run d1:migrate` |
| 3. Secrets | CF dashboard, `wrangler secret put`, or `npx wrangler secret put` |
| 4.  CF Email DNS| Resend dashboard prints records → CF DNS tab |
| 5. Email Routing | CF dashboard → Email tab |
| 6. Deploy | `git push origin main` |
| 7. Data migration | `npm run pg-to-d1` then `wrangler d1 execute … --file` |
| 8. Verify | `npm run cf:status` + checklist above |

## Customizing the domain

`mycommuni.care` is hardcoded in two places:

- `wrangler.jsonc` → `vars.SITE_URL`
- `lib/site.ts` → the default for `SITE_URL`

If you fork to a different domain, swap both. Email templates and OAuth
redirect URIs auto-pick up `SITE_URL` so no other edits needed.

## What's still on Supabase

Nothing user-facing, as of this commit. The legacy `supabase/` directory
contains the Postgres migrations and edge functions that informed the
D1 port — kept in-tree as reference until the next "drop Supabase"
cleanup pass. The auth fallback in `functions/_lib/auth.ts` accepts
Supabase JWTs in case any imported account still has one, but new
sessions are 100% Workers-native.

## Troubleshooting

**`/api/_health` shows `d1: false`**
The `D1` binding isn't wired. Open the CF dashboard → your Worker →
Settings → Bindings → add a D1 binding with `binding: "DB"` and the
right database. Or check `wrangler.jsonc`'s `d1_databases` block has
the correct `database_id`.

**Magic-link emails aren't arriving**
Check the Worker logs for `EMAIL.send` errors. The most common cause
verify your DKIM/SPF/DMARC records in step 4. If `sendEmail` is returning
`{ ok: false, status: 401 }`, `RESEND_API_KEY` is wrong or unset.

**"You're not on staff at this farm" on legitimate calls**
The Worker is reading from D1; the user might exist in Supabase but not
yet in D1. Run `npm run pg-to-d1` or sign up fresh.

**Image transformations don't resize**
Cloudflare Image Transformations is a separate paid feature ($5/mo on top
of Workers). Without it, `/i/<bucket>/<key>?w=240` serves the original.
That's still correct — just larger.

**Sessions expire too fast**
The default is 30 days with a 7-day sliding renewal window. If you want
longer, edit `SESSION_LIFETIME_MS` in `functions/_lib/sessions.ts`.
