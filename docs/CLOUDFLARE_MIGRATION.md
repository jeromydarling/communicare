# Cloudflare migration plan

The whole stack is moving to Cloudflare. Supabase Postgres, Supabase Auth,
Supabase Storage, Supabase Edge Functions, and GitHub Pages all get
replaced. Resend stays for outbound email (we send from Workers via
Resend's REST API; Cloudflare doesn't have a peer service).

This is a real migration — 4–8 weeks of work, not a weekend swap. The
phases below are ordered so each one ships independently and the live
site keeps working throughout.

## Target stack

| Layer | From | To |
|---|---|---|
| Hosting | GitHub Pages | Cloudflare Pages |
| Server logic | Supabase Edge Functions (Deno) | Cloudflare Workers |
| Database | Supabase Postgres | Cloudflare D1 (SQLite) |
| Auth | Supabase Auth | TBD — custom on Workers OR Clerk |
| Storage | Supabase Storage | R2 + Cloudflare Images |
| Cache | Postgres rows | KV |
| AI (low-stakes) | n/a | Workers AI |
| AI (homepage drafter, CSV parse) | Anthropic Claude | **Stays Anthropic** — Workers AI's open-source models don't match Claude on structured output yet |
| Inbound email | Resend forward | Cloudflare Email Routing |
| Outbound email | Resend (partial) | Resend (full) |
| DNS | various | Cloudflare |
| Domain | communicare.farm (planned) | **mycommuni.care** (live) |

## Phases

### Phase 0 — Hosting move (in progress, this PR)

- [x] Drop `output: "export"` `BASE_PATH` plumbing — root domain
- [x] `SITE_URL` → `https://mycommuni.care`
- [x] Delete `.github/workflows/deploy.yml` (Cloudflare Pages auto-builds on push to main; the dashboard project handles deploys directly)
- [x] Build verified at root

What you click in the CF dashboard:
- Confirm the Pages project is set to "Next.js (Static HTML Export)" preset
- Confirm `mycommuni.care` is the production custom domain
- Add build env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SITE_URL=https://mycommuni.care`

### Phase 1 — Email + DNS hygiene

- [ ] Resend account, verify `mycommuni.care` sending domain (DKIM via 2 CNAMEs, SPF as TXT, DMARC as TXT)
- [ ] Wire Resend into the existing `record-farm-inquiry` send path
- [ ] Set the same Resend SMTP credentials in Supabase Auth (temporary — until Phase 3 replaces auth entirely)
- [ ] Cloudflare Email Routing already enabled for `mycommuni.care`; confirm `hello@`, `migrate@` route to your real inbox

### Phase 2 — D1 schema port

- [ ] Translate all 8 Postgres migrations to SQLite:
  - `citext` → `text collate nocase`
  - `jsonb` → `json` (uses SQLite JSON1)
  - Postgres enums → `text check (... in (...))` constraints
  - Partial indexes (D1 supports them)
  - `uuid` defaults → application-generated UUIDs via `crypto.randomUUID()` in Workers
  - `auth.users` references → our own `users` table
- [ ] **Replace RLS entirely** with authorization code in every Worker that touches data. The 50+ Postgres policies become application checks. This is the largest single chunk of work.
- [ ] Replace `plpgsql` security-definer RPCs (`create_farm_for_self`, `handle_new_user`, `prevent_ledger_mutation`) with Worker functions.
- [ ] Write a one-time export script: Postgres → D1 (uses Supabase to dump tables to SQL, runs `wrangler d1 execute` against the target). Lives in `scripts/migrate-pg-to-d1.ts`.

### Phase 3 — Auth on Workers

Decision needed before this phase starts: **custom (Workers + D1 + KV
sessions, lucia / oslo patterns)** or **Clerk**.

If custom:
- [ ] `users`, `sessions`, `oauth_accounts`, `email_verification_tokens`, `password_reset_tokens` tables in D1
- [ ] Worker routes: `/auth/signup`, `/auth/signin`, `/auth/oauth/google`, `/auth/callback`, `/auth/forgot`, `/auth/reset`, `/auth/magic`, `/auth/signout`
- [ ] Session cookies (`__Host-` prefix, `SameSite=Lax`, `Secure`, `HttpOnly`); session store in KV with a D1 fallback for durability
- [ ] Password hashing with `oslo` (`argon2id` via WebAssembly on Workers)
- [ ] Magic-link + email-confirmation tokens delivered via Resend
- [ ] Google OAuth flow against `mycommuni.care/auth/oauth/google/callback`

If Clerk:
- [ ] Clerk project, custom domain, theming
- [ ] Replace `getSupabaseBrowser().auth.*` calls with `@clerk/clerk-react` hooks
- [ ] Worker middleware verifies Clerk session JWTs

### Phase 4 — Edge functions → Workers

Each Supabase edge function gets reimplemented as a Worker route. They
talk to D1 instead of Supabase Postgres.

- [ ] `ai-parse-csv` → Worker (still calls Anthropic)
- [ ] `import-members` → Worker (talks to D1, calls our auth Worker for invites)
- [ ] `invite-members` → Worker
- [ ] `find-nearby-farms` → Worker (cache now in KV instead of `discovered_farms` row, but the row stays for the public directory)
- [ ] `record-farm-inquiry` → Worker (sends via Resend)
- [ ] `generate-homepage` → Worker (still Anthropic)
- [ ] `twilio-webhook` → Worker
- [ ] `stripe-connect` → Worker
- [ ] `hortus-link`, `hortus-webhook` → Workers
- [ ] `create_farm_for_self` RPC → Worker route

### Phase 5 — Storage + Images

- [ ] R2 buckets: `farm-photos`, `product-photos`, `imports` (audit CSVs)
- [ ] Worker: signed-upload URLs for browser direct-upload to R2
- [ ] Cloudflare Images set up with R2 as the source; variant rules for
  card / detail / hero / OG image sizes
- [ ] Replace any Supabase Storage references in the codebase

### Phase 6 — KV caching + rate limiting

- [ ] KV namespace: `cache` (find-nearby-farms results, 7-day TTL)
- [ ] KV namespace: `ratelimit` (per-IP buckets on `/find` searches and
  `/record-farm-inquiry` submissions)
- [ ] KV namespace: `sessions` (if we go custom auth in Phase 3)

### Phase 7 — Workers AI (low-stakes only)

- [ ] Alt-text for uploaded farm/product photos (Llama 3.2 vision)
- [ ] Embedding generation for farm descriptions, stored in D1 (powers
  semantic search later via Vectorize)
- [ ] **Stays on Anthropic**: homepage drafter, ai-parse-csv. Structured-
  output quality + system-prompt steering matter more than CF margin.

### Phase 8 — Decommission Supabase

- [ ] Verify D1 has 100% of production data
- [ ] Verify every Worker route handles its case
- [ ] Cut DNS / app config to point only at Cloudflare
- [ ] Cancel Supabase project (keep the export for 90 days as cold backup)
- [ ] Update `LOVABLE_STARTER_PROMPT.md` to drop Supabase entirely
- [ ] Update `README.md`, `SUPABASE_SETUP.md` → rename / rewrite as
  `CLOUDFLARE_SETUP.md`

## Why we're not moving certain things

**Anthropic Claude stays as the AI provider for high-stakes generation.**
Workers AI is great for what it's great for — image alt text, embeddings,
classification — but the homepage drafter's structured Zod output and the
CSV-mapping prompt both depend on Claude's instruction-following and JSON
mode. Workers AI's open-source models trail there. We use both: Claude
for content quality, Workers AI for cost-sensitive batch work.

**Resend stays as the outbound mail provider.** Cloudflare doesn't have a
peer service after the MailChannels integration ended. Workers can call
the Resend REST API just fine; there's no win to picking a worse pipe.

**Supabase Postgres stays in Phase 2 of D1's lifetime, not before.** Until
the D1 schema is fully migrated and tested in parallel, the live app reads
and writes Postgres. The cutover is one DNS / config change at the end of
Phase 8.

## Honest scope

- Phase 0: today
- Phase 1: ~1 day (mostly dashboard clicks + a Resend account)
- Phase 2: 2–3 days (schema translation + export script)
- Phase 3: 1 week custom / 1 day Clerk
- Phase 4: ~1 week
- Phase 5: 2–3 days
- Phase 6: 2 days
- Phase 7: 2 days
- Phase 8: 1 day

Total realistic estimate: **3–4 weeks** if we go custom auth, **2–3 weeks**
if we go Clerk. The live site keeps working the entire time.
