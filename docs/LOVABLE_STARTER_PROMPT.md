# Lovable starter prompt

Copy the block below into Lovable as your first message. It tells Lovable
exactly what to do, what NOT to touch, and where the existing docs live.
The stack is now fully Cloudflare — Supabase is gone except as a legacy
reference directory.

---

```
Hi Lovable. I have a fully-built Next.js project to deploy and connect to
backend services. No design changes, no feature additions, no copy
rewrites — just the wiring described in the project's existing docs.

REPO        https://github.com/jeromydarling/communicare  (branch: main)
STACK       Next.js 15 static export · Cloudflare Workers Assets
            · Cloudflare D1 + KV + R2 + Vectorize + Workers AI
            · Custom auth on Workers · CF Email Sending (outbound)
            · CF Email Routing (inbound) · Anthropic Claude (homepage
              drafter only) · Workers AI Llama 3.3 70B (CSV mapper +
              alt-text + embeddings)
            · Mapbox · Perplexity Sonar · ElevenLabs

YOUR JOB — five steps, in order

1. CLOUDFLARE PROJECT
   Connect the repo to a Cloudflare Worker project (NOT Pages — the
   modern unified Workers Assets pattern is what's wired up). Build
   command: `npm run build`. Deploy command: `npx wrangler deploy`.
   Custom domain: communicare.farm (or your fork's domain).

2. PROVISION RESOURCES
   Run from a local checkout once `wrangler login` is done:

     npm run cf:provision

   This creates D1, three KV namespaces (CACHE, SESSIONS, RATELIMIT),
   three R2 buckets, and the Vectorize index — then prints sed/node
   commands to apply the new IDs to wrangler.jsonc. Run those.

3. D1 MIGRATIONS
   Five migration files in cloudflare/d1/migrations/:

     npm run d1:migrate

   Verifies with: wrangler d1 execute communicare-db --remote
   --command "select name from sqlite_master where type='table'"

4. SECRETS  (npx wrangler secret put <NAME>)
     ANTHROPIC_API_KEY      required · homepage drafter (Claude Opus —
                                       editorial-voice constraint
                                       adherence; Llama failed the
                                       voice test)
     PERPLEXITY_API_KEY     required · /find ZIP search
     MAPBOX_TOKEN           required · server-side geocoding
     TURNSTILE_SECRET       recommended · /api/waitlist anti-spam
     STRIPE_SECRET_KEY      defer · billing comes later
     TWILIO_AUTH_TOKEN      defer · SMS swap loop comes later
   (No outbound-mail API key needed — CF Email Service binding handles
   it. Onboard the domain at dash → Compute & AI → Email Service.)
   (CSV mapper + low-stakes AI run on Workers AI Llama 3.3 70B; only
   the homepage drafter uses Claude.)

5. BUILD-TIME ENV VARS (CF dashboard → Worker → Settings → Variables)
     NEXT_PUBLIC_MAPBOX_TOKEN          public Mapbox token for the map widget
     NEXT_PUBLIC_TURNSTILE_SITE_KEY    Turnstile site key (paired with
                                       the TURNSTILE_SECRET above)

HANDS OFF

- DO NOT redesign the landing page, manifesto, /find, /farmer/*, or any
  other visual surface. Brand voice is locked — see
  .claude/skills/communicare-voice/SKILL.md.
- DO NOT change the schema, add features, or refactor the codebase.
- DO NOT replace the SVG icons or the watercolor hero image. The full
  "what stays SVG" inventory is in docs/IMAGES.md.
- DO NOT touch the Remotion video pipeline (remotion/ folder) — that
  builds via GitHub Actions independently.
- DO NOT migrate anything back to Supabase. The legacy supabase/
  directory is reference-only; the live stack reads/writes D1.

READ FIRST

  docs/CLOUDFLARE_SETUP.md     canonical setup guide, top-to-bottom
  docs/CLOUDFLARE_MIGRATION.md the phased history of the move from
                               Supabase (Phase 0 → 8). Read this if
                               you wonder why something is structured
                               the way it is.
  docs/IMAGES.md               watercolor handoff + Gemini prompts
  docs/CUSTOM_DOMAINS.md       custom-domain wiring
  docs/SEO.md                  SEO surface, sitemap, robots, JSON-LD
  README.md                    project map

VERIFY WHEN DONE

The checklist at the bottom of docs/CLOUDFLARE_SETUP.md walks every
critical path: magic-link sign-in, email + password sign-up landing in
the onboarding wizard, ZIP search returning farms with sub-10ms cache
hits, "Send them a note" inserting an inquiry, CSV import end-to-end
into D1, /join writing through the Turnstile-gated worker.

curl https://communicare.farm/api/_health | jq

That endpoint reports which bindings are wired. Every entry should be
`true`. If anything is `false`, the dashboard's Bindings tab for the
Worker needs to be re-checked.

Stripe Connect and SMS swap loop come next, after the end-to-end
Claude Chrome click test confirms the core flow works.

— Jeromy
```

---

## Notes on what Cloudflare handles automatically

- HTTPS + custom domain DNS (CF manages cert provisioning)
- Continuous deploys on push to `main`
- Preview deployments per branch (Worker Preview URLs)
- KV / D1 / R2 / Vectorize globally distributed at the edge

## What you (the human) still click

- `wrangler login` once
- `npm run cf:provision` and paste the IDs (the script tells you the
  exact commands)
- Add secrets via `wrangler secret put`
- CF dashboard → Compute & AI → Email Service → Onboard the
  `communicare.farm` domain (CF adds SPF + DKIM automatically)
- Set up Cloudflare Email Routing for hello@, migrate@
- (Optional) `npm run pg-to-d1` if you're migrating from a previous
  Supabase deploy
