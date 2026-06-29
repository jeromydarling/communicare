# Communicare

A small, slow-built tool for farm shares and the neighbors they feed.

- Live at **[communicare.farm](https://communicare.farm)**
- Manifesto — `/manifesto`
- Find a farm by ZIP — `/find`
- Run a farm yourself — `/farmer/`

## Stack

| Layer | Service |
|---|---|
| Hosting | Cloudflare Workers + Workers Assets (Next.js 15 static export under `./out`) |
| Database | Cloudflare D1 (SQLite) |
| Sessions / cache / rate limits | Cloudflare KV |
| Photos + audit storage | Cloudflare R2 |
| Vector search | Cloudflare Vectorize |
| Background work | Cloudflare Workers (cron when needed) |
| Auth | Custom on Workers — PBKDF2 + cookies in D1, magic links, password reset, OAuth (Phase 3.1) |
| Inbound email | Cloudflare Email Routing (free, forwards to a real inbox) |
| Outbound email | Cloudflare Email Service (`send_email` binding, public-beta)  |
| Discovery search | Perplexity Sonar |
| Geocoding + maps | Mapbox |
| AI generation (homepage drafter) | Anthropic Claude Opus (editorial-voice constraint adherence) |
| AI generation (CSV mapper) | Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, JSON schema mode) |
| AI generation (alt-text, embeddings) | Workers AI |

## Deploy

The canonical deploy guide is **[docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md)**.
A typical first-time setup runs:

```bash
npx wrangler login            # one-time
npm run cf:provision          # creates D1 + KV + R2 + Vectorize
# patch printed resource IDs into wrangler.jsonc
npm run d1:migrate            # apply 5 D1 migrations
# `wrangler secret put` each secret (see docs/CLOUDFLARE_SETUP.md §3)
git push origin main          # CF rebuilds + deploys automatically
npm run cf:status             # curl /api/_health, verify bindings
```

## Local development

```bash
npm install
npm run dev            # Next.js dev server, no Workers
npm run typecheck      # both Next and Worker tsconfigs
npm run build          # produces ./out
npm run deploy:dry     # bundles the Worker without uploading
```

For local Workers dev (bindings + KV + D1 against a local SQLite):

```bash
npx wrangler dev       # runs the Worker locally on :8787
npm run d1:migrate:local
```

## Where things live

```
app/                       # Next.js routes (the static site)
  (public)/                # /, /find, /come-in, /join, /claim, /manifesto, …
  farmer/                  # /farmer/* (auth-gated dashboard)
  share/                   # /share/* (member views)

functions/                 # API handler implementations, organized like
                           # Pages Functions would be (one file per route).
                           # src/router.ts wires each one into the Worker.
  _lib/                    # shared: cors, auth, db, sessions, crypto,
                           # email, ratelimit, turnstile
  api/                     # /api/* — auth, farmer/*, ai/*, uploads, etc.
  i/                       # /i/<bucket>/<key> — R2 image serve

src/                       # Worker entry + router + adapter
  worker.ts                # fetch handler, ASSETS fallback
  router.ts                # URLPattern table → handler dispatch
  adapter.ts               # PagesFunction → Worker handler shim

cloudflare/d1/migrations/  # SQLite schema migrations
  0001_initial_schema.sql  …
  0005_auth.sql            # sessions, oauth_accounts, token tables

scripts/                   # one-off scripts
  cf-provision.sh          # creates D1 + KV + R2 + Vectorize
  migrate-pg-to-d1.ts      # one-shot Supabase → D1 data dump

docs/
  CLOUDFLARE_SETUP.md      # canonical deploy guide
  CLOUDFLARE_MIGRATION.md  # phased history of the move from Supabase
  LOVABLE_STARTER_PROMPT.md  Lovable handoff prompt (kept current)
  IMAGES.md                # watercolor + Gemini prompt notes
  CUSTOM_DOMAINS.md        # custom domain handling
  SEO.md                   # robots, sitemap, JSON-LD

remotion/                  # promo video build (separate package, GH Actions)
supabase/                  # LEGACY — kept as reference until next cleanup
```

## Health

```bash
curl https://communicare.farm/api/_health | jq
```

Reports which bindings (D1, KV, R2, AI, Vectorize) are wired on the
current deploy. Useful when a binding shows `false` and you need to
trace whether `wrangler.jsonc` or the dashboard binding is the problem.

## Voice

The brand voice is locked. Anything user-facing — landing copy,
manifesto, error messages, button labels, emails — should match the
editorial register documented in `.claude/skills/communicare-voice/SKILL.md`.
Wendell Berry / Catholic Worker, not SaaS. "Pax tibi" closes every
confirmation screen.
