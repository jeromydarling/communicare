# Lovable starter prompt

Copy the block below into Lovable as your first message. It tells Lovable
exactly what to do, what NOT to touch, and where the existing docs live.

---

```
Hi Lovable. I have a fully-built Next.js project to deploy and connect to
backend services. No design changes, no feature additions, no copy
rewrites — just the wiring described in the project's existing docs.

REPO        https://github.com/jeromydarling/communicare  (branch: main)
STACK       Next.js 15 static export · Cloudflare Pages (hosting)
            · Supabase Postgres + Edge Functions (transitional —
              see docs/CLOUDFLARE_MIGRATION.md for the move to D1
              + Workers)
            · Mapbox · Perplexity Sonar · ElevenLabs · Resend · Stripe

YOUR JOB — five steps, in order

1. DATABASE
   Connect a fresh Supabase project. Run the eight migrations in
   supabase/migrations/ in timestamp order. They're idempotent and tested:
     20260524180000_initial_schema.sql        multi-tenant skeleton, 30+ tables
     20260525120000_limited_quantity.sql      limited-drop product columns
     20260525130000_farm_discovery.sql        public farm directory + RLS
     20260525200000_drop_sites.sql            pickup-distance search
     20260525215000_import_runs.sql           CSV-import audit trail + RLS
     20260525220000_onboarding.sql            farms.onboarded_at + index
     20260525230000_onboarding_rls_fixes.sql  create_farm_for_self RPC + enum
     20260525240000_perf_indexes.sql          profiles.phone partial index

2. SECRETS  (Supabase → Project Settings → Edge Functions → Secrets)
     ANTHROPIC_API_KEY      required · homepage drafter
     PERPLEXITY_API_KEY     required · /find ZIP search
     VITE_MAPBOX_KEY        required · live map on /find
     ELEVENLABS_API_KEY     required · soundtrack for the screencast
     RESEND_API_KEY         optional · enables auto-send on "Send them a note"
     RESEND_FROM            optional · the From: address (e.g. hello@communicare.farm)
     TWILIO_AUTH_TOKEN      optional · only if the SMS swap loop goes live now
     STRIPE_SECRET_KEY      defer · we'll wire Stripe Connect after a
                                       Claude Chrome end-to-end click test

3. EDGE FUNCTIONS
   Deploy all eight with --no-verify-jwt:
     supabase functions deploy generate-homepage   --no-verify-jwt
     supabase functions deploy find-nearby-farms   --no-verify-jwt
     supabase functions deploy record-farm-inquiry --no-verify-jwt
     supabase functions deploy twilio-webhook      --no-verify-jwt
     supabase functions deploy stripe-connect      --no-verify-jwt
     supabase functions deploy ai-parse-csv        --no-verify-jwt
     supabase functions deploy import-members      --no-verify-jwt
     supabase functions deploy invite-members      --no-verify-jwt

4. AUTH
   Flip Google OAuth on in your auth panel — that's all the operator
   sign-in needs. Email + password is already configured server-side.
   Members use magic links only; no separate setup.

5. ENV VARS ON THE BUILD
     NEXT_PUBLIC_SUPABASE_URL       from your Supabase project
     NEXT_PUBLIC_SUPABASE_ANON_KEY  from your Supabase project (publishable)
     VITE_MAPBOX_KEY                same key as #2 (the build aliases it)
     NEXT_PUBLIC_SITE_URL           the live domain (https://communicare.farm)

HANDS OFF

- DO NOT redesign the landing page, manifesto, /find, /farmer/*, or any
  other visual surface. Brand voice is locked — see
  .claude/skills/communicare-voice/SKILL.md.
- DO NOT change the schema, add features, or refactor the codebase.
- DO NOT replace the SVG icons or the watercolor hero image. The full
  "what stays SVG" inventory is in docs/IMAGES.md.
- DO NOT touch the Remotion video pipeline (remotion/ folder) — that
  builds via GitHub Actions independently.

READ FIRST

  docs/SUPABASE_SETUP.md   canonical setup guide, top-to-bottom
  docs/IMAGES.md           watercolor handoff + Gemini prompts
  docs/CUSTOM_DOMAINS.md   path-based farm URLs (communicare.farm/slug)
  docs/SEO.md              SEO surface, sitemap, robots, JSON-LD
  README.md                project map

VERIFY WHEN DONE

The checklist at the bottom of docs/SUPABASE_SETUP.md walks every
critical path: magic-link sign-in, ZIP search returning farms sorted
by pickup distance, "Send them a note" logging an inquiry, /claim
loading a discovered farm, the deploy commit SHA appearing in the
asset cache-bust URLs.

Once those pass, ping me. Stripe Connect comes next, after the
end-to-end click test.

— Jeromy
```

---

## Notes on what Lovable WILL handle automatically

- Google OAuth (their built-in integration — no Cloud Console step)
- HTTPS + custom domain DNS (they manage cert provisioning)
- Continuous deploys on push to `main`
- Preview environments per branch

## What Lovable WON'T handle (you'll do these later)

- Stripe Connect onboarding flow — defer until after the Claude Chrome
  end-to-end test confirms the rest of the platform works
- Resend domain verification (DKIM / SPF) — once you've decided whether
  `hello@communicare.farm` is the From address
- The watercolor image generation via Gemini — per `docs/IMAGES.md`,
  drop four JPEGs into `public/watercolors/` and flip
  `NEXT_PUBLIC_USE_WATERCOLORS=true`. This can land any time.
- Submitting the sitemap to Google Search Console + Bing Webmaster once
  the real domain resolves
