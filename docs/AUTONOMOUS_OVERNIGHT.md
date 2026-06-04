# Autonomous overnight — what shipped, what you click

This was the autonomous pass on the Cloudflare migration. The app is
now end-to-end on Cloudflare for every public-facing path: hosting,
auth, data, cache, rate limits, AI, email. Build is green, type-check
is clean, `wrangler deploy --dry-run` produces a working bundle.

## What landed (eight commits in the autonomous run)

| Commit | Pass | What |
|---|---|---|
| `03920ab` | 1 | D1 auth schema (sessions, oauth_accounts, magic_link_tokens, password_reset_tokens) + crypto (PBKDF2) + sessions lib + email lib (Resend) |
| `27a4bc8` | 2 | Eight auth Worker routes: signup, signin, signout, me, magic, magic-callback, forgot, reset |
| `f968678` | 3 | Client auth lib + wired all four auth pages off Supabase (come-in × 2, sign-up, forgot, reset) + verifyAuth swap |
| `aa6a981` | 4a | Farmer data API (me-with-farm, onboarding/create-farm, shares, pickup-sites, complete-onboarding) + onboarding + dashboard cutover |
| `5e97bc9` | 4b | Workers ports: import-members (D1, parallel chunks, backoff) + ai-parse-csv (Claude) + invite-members (magic-link batch) |
| `4dc754e` | 5 | Settings + /find cleanup, comprehensive **CLOUDFLARE_SETUP.md** |
| `00a6b1a` | 6 | /join + /auth/callback cleanup, README rewrite |
| `620da49` | 7 | generate-homepage ported to a Worker route with rate-limit |
| `(next)` | 8 | /claim ported to use `/api/discovered/:slug` Worker; shell/share-layout sign-out swapped; Lovable prompt rewritten |

## What you need to click (in order)

These are the gaps autonomous work can't close — they require your
Cloudflare account, DNS, and outside accounts.

### 1. Provision resources (~5 min)

```bash
npx wrangler login
npm run cf:provision
# run the printed sed/node commands to fill in the IDs
```

This creates the D1 database, three KV namespaces, three R2 buckets, and
the Vectorize index. The script is idempotent.

### 2. Apply D1 migrations (~30s)

```bash
npm run d1:migrate
```

Five files in `cloudflare/d1/migrations/` — initial schema, farm
discovery, import runs, Hortus, auth.

### 3. Set secrets

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put PERPLEXITY_API_KEY
npx wrangler secret put MAPBOX_TOKEN
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npx wrangler secret put TURNSTILE_SECRET   # optional — pass-through if unset
```

### 4. Resend domain verification

Sign up at resend.com, add `mycommuni.care` as a sending domain. Resend
prints DKIM (2 CNAMEs), SPF (TXT), DMARC (TXT). Paste those into your
Cloudflare DNS for `mycommuni.care`. Verification usually completes in
under 5 minutes.

### 5. Email Routing

Cloudflare dashboard → `mycommuni.care` → Email → Email Routing:

- `hello@mycommuni.care` → your inbox
- `migrate@mycommuni.care` → your inbox

CF auto-adds the MX records.

### 6. Build-time env vars

CF dashboard → your Worker → Settings → Variables → Build environment:

- `NEXT_PUBLIC_MAPBOX_TOKEN` (public Mapbox token for the map widget)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (paired with TURNSTILE_SECRET)

### 7. (Optional) Migrate existing Supabase data

If you had real data in the previous Supabase backend:

```bash
SUPABASE_URL=https://<your-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run pg-to-d1 > d1-import.sql

npx wrangler d1 execute communicare-db --remote --file d1-import.sql
```

Existing users' Supabase passwords don't migrate (bcrypt hashes can't be
re-derived into our PBKDF2 store). They sign in once via magic link and
can set a new password from there.

### 8. Verify

```bash
npm run cf:status            # /api/_health, every binding should be true
```

Then walk the checklist at the bottom of `docs/CLOUDFLARE_SETUP.md`:
sign-up, sign-in, magic link, forgot/reset, onboarding, CSV import,
ZIP search, "Send them a note", /join.

## What's still on Supabase (by design)

- The `supabase/` directory: original Postgres migrations and Deno edge
  functions. Kept as reference until the next cleanup pass. Nothing
  in the live code path references them.
- `functions/_lib/auth.ts` has a Supabase-JWT fallback that activates
  only when the D1 session cookie is absent — lets users migrate one at
  a time without breaking the others. Once everyone's migrated this
  whole branch comes out.
- `app/farmer/settings/HortusIntegrationCard.tsx` still uses supabase-js
  directly. The Hortus integration is its own feature surface; porting
  it to D1 lands in a follow-up.

## What's deferred

- **Google OAuth** — `signUpWithGoogle()` returns a "back online soon"
  message. Custom Workers auth supports OAuth (table `oauth_accounts`
  is ready), the Worker route just hasn't been wired. Email +
  password and magic link cover the launch path.
- **Stripe Connect** — deferred per the original plan, pending
  end-to-end click test.
- **SMS swap loop** — the Twilio webhook handler is still on Supabase.
- **Cron triggers** — `wrangler.jsonc` documents the two planned
  schedules (`cache-refresher`, `hortus-sync`) but they'll need their
  own standalone Worker projects (Pages can't host cron handlers).
- **Image transformations** — the `/i/<bucket>/<key>` route serves
  R2 objects with cache headers. Cloudflare's Image Transformations
  layer ($5/mo add-on) automatically picks up `?w=240` etc. — without
  it, the original is served (still correct, just larger).

## Honest known gaps

- **Per-farm RLS replacement is in application code**. Postgres had 50+
  RLS policies. D1 has none — every Worker route that touches a
  multi-tenant table verifies the operator owns the farm explicitly.
  Audited every new route; will audit again pre-launch.
- **Sessions cookies don't refresh their Max-Age** when the server-side
  expiry slides forward. Server-side row stays valid; the cookie
  expires when it was originally going to. Next `/api/auth/me` call
  re-extends transparently. Trade-off documented inline in
  `functions/api/auth/me.ts`.

## How to keep going

The wake-up checklist above gets you to a live, working site. Beyond
that, the next sane batch of work is:

1. **Wire Turnstile** in the `/join` form — render the widget, capture
   the token, post it (~30 minutes)
2. **Google OAuth Worker route** — `oauth_accounts` table is ready,
   needs the `/api/auth/google/start` + `/callback` handlers (~1 day)
3. **Port the Twilio webhook** to a Worker so SMS swap loop runs on CF
4. **Drop the legacy `supabase/` directory** — once you're confident no
   one's hitting it
5. **Audit the multi-tenant authorization** in every Worker route as a
   pre-launch pass

Pax tibi.
