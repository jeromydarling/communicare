# Supabase setup for Communicare

This is the "here's the code, here's the SQL, bam it works" doc for getting
the Communicare backend running on a fresh Supabase project. Lovable, or
anyone else, can follow it top to bottom.

Total time: about ten minutes if the secrets are ready, twenty if you're
also setting up Resend, Twilio, Mapbox, and Perplexity accounts.

---

## 0. Prerequisites

You'll need:

- A Supabase project (free tier is fine to start). Note the **Project ref**
  (e.g. `abcdefgh`), the **Project URL** (`https://abcdefgh.supabase.co`),
  and the **publishable anon key**. They're all on the Supabase dashboard
  under Project Settings → API.
- The Supabase CLI installed locally: `brew install supabase/tap/supabase`
  or `npm install -g supabase`.
- A copy of this repo, with the working directory at the repo root.

```bash
supabase login              # pastes a token into your CLI
supabase link --project-ref abcdefgh
```

The link command writes `.supabase/config` and you're ready.

---

## 1. Run the migrations

Three migration files live in `supabase/migrations/`. They run in
timestamp order. Run them all at once:

```bash
supabase db push
```

Or, if you'd rather paste SQL directly into the Supabase SQL Editor, the
order is:

| # | File                                          | What it creates                                                                                                                                  |
|---|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `20260524180000_initial_schema.sql`           | Profiles, farms, memberships, share definitions, products, subscriptions, orders, order_items, credit_ledger (append-only), herd-share contracts, SMS messages, waitlist. 30+ tables, 50+ RLS policies, indexes. The whole multi-tenant skeleton. |
| 2 | `20260525120000_limited_quantity.sql`         | Two columns on `products` — `is_limited` and `available_through` — plus two indexes for the live-drops query and the SMS keyword lookup.          |
| 3 | `20260525130000_farm_discovery.sql`           | `discovered_farms`, `farm_inquiries`, `discovery_searches`, the `bump_discovered_farm_inquiry_count` trigger, RLS policies for the public directory + the claim-page reads. |

**Verify** with one query in the SQL Editor:

```sql
select count(*) from pg_tables where schemaname = 'public';
-- should return 32 (give or take, depending on Postgres version)
```

---

## 2. Set Edge Function secrets

The Edge Functions read these from `Deno.env`. They're not used at build
time, only at function runtime, so a missing secret won't break the static
site — it'll just degrade the corresponding feature to a graceful fallback.

```bash
# Always set:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# For /find (Perplexity-powered ZIP search):
supabase secrets set PERPLEXITY_API_KEY=pplx-...
supabase secrets set MAPBOX_TOKEN=pk....

# For "Send them a note" outbound emails (optional — falls back to mailto):
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM=hello@communicare.farm
supabase secrets set PUBLIC_SITE_URL=https://communicare.farm

# For the SMS swap loop (only if you're wiring Twilio):
supabase secrets set TWILIO_AUTH_TOKEN=...

# For the Stripe Connect onboarding flow (only if billing is on):
supabase secrets set STRIPE_SECRET_KEY=sk_test_or_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are populated automatically
inside every Edge Function — you don't set them.

---

## 3. Deploy the Edge Functions

Five functions live in `supabase/functions/`. The ones with public webhooks
or anonymous callers deploy with `--no-verify-jwt`; the ones gated to
logged-in users would deploy without that flag.

```bash
supabase functions deploy generate-homepage --no-verify-jwt
supabase functions deploy find-nearby-farms --no-verify-jwt
supabase functions deploy record-farm-inquiry --no-verify-jwt
supabase functions deploy twilio-webhook --no-verify-jwt
supabase functions deploy stripe-connect --no-verify-jwt
```

**Verify** in the Supabase dashboard under Edge Functions — all five
should show "Active" with green dots. Try one:

```bash
curl -i https://abcdefgh.supabase.co/functions/v1/find-nearby-farms \
  -H "Content-Type: application/json" \
  -d '{"zip":"24091"}'
# expect 200 with a JSON body containing { farms: [...] }
```

---

## 4. Configure Auth

In the Supabase dashboard under Authentication → URL Configuration:

| Field                       | Value                                                                                  |
|-----------------------------|----------------------------------------------------------------------------------------|
| Site URL                    | `https://communicare.farm` (or your real domain)                                       |
| Redirect URLs (allowlist)   | `https://communicare.farm/auth/callback/`, `http://localhost:3000/auth/callback/`, plus any preview / Lovable URLs |

Under Authentication → Providers → **Email**:

| Setting                     | Value                                                                                  |
|-----------------------------|----------------------------------------------------------------------------------------|
| Email signup enabled        | On                                                                                     |
| Confirm email               | On                                                                                     |
| Secure email change         | On                                                                                     |
| Magic link                  | On (this is the primary entry today)                                                   |
| Mailer rate limit           | 1/min default is fine                                                                  |

**Two audiences, two doors:**

- **Members** (CSA buyers, herd-share holders, meat-share customers) sign in
  at `/come-in` with a magic link. No password. One field, one tap.
- **Farms** (operators, staff) sign in at `/farmer/come-in` with a password
  or with Google. Sign-up at `/farmer/sign-up`, password reset at
  `/farmer/forgot-password` → `/farmer/reset-password`. Magic link is still
  offered as a fallback on the operator sign-in page for anyone who'd
  rather skip passwords.

The Auth-Gate on `/farmer/*` dashboard pages redirects un-signed-in
visitors to `/farmer/come-in/?next=...` so they land back where they
were trying to go.

---

## 5. Configure Storage (optional — only for photos)

If farms will upload photos for their homepages / product images, create
two buckets in the dashboard under Storage:

```sql
-- Run in SQL Editor
insert into storage.buckets (id, name, public) values ('farm-photos', 'farm-photos', true);
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true);
```

Then this RLS lets only a farm's members upload to their own farm's
subfolder:

```sql
create policy "Farm members can upload farm photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'farm-photos'
    and public.is_farm_member((storage.foldername(name))[1]::uuid)
  );

create policy "Farm members can upload product photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and public.is_farm_member((storage.foldername(name))[1]::uuid)
  );

create policy "Photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('farm-photos', 'product-photos'));
```

---

## 6. Front-end environment variables

In Lovable (or wherever the Next.js app runs):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...   # publishable anon key, safe to expose

# Required for the live Mapbox topography view on /find
NEXT_PUBLIC_MAPBOX_TOKEN=pk....

# Optional — only for the Remotion video subproject
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

When deploying as a GitHub Pages project page, also set
`BASE_PATH=/communicare` in the GitHub Actions secret store. For custom
domains or Lovable hosting, leave it unset.

---

## 7. Verification checklist

Run through these once after setup:

- [ ] `select count(*) from public.farms` returns 0 (clean install)
- [ ] `select count(*) from public.discovered_farms` returns 0
- [ ] All five Edge Functions show Active in the dashboard
- [ ] Visiting `/come-in` lets you send yourself a magic link
- [ ] Magic-link email arrives, clicking it lands on `/auth/callback/`
  and forwards into the app
- [ ] Visiting `/find` and typing a ZIP returns at least one farm within
  twenty miles (if PERPLEXITY_API_KEY is set)
- [ ] Clicking "Send them a note" on a discovered farm logs a row in
  `farm_inquiries` and bumps `inquiry_count` on `discovered_farms`
- [ ] Visiting `/claim?slug=<one-of-the-slugs>` shows the listing

---

## Google OAuth — one dashboard step

Password sign-in works out of the box once you `supabase db push` —
`supabase/config.toml` enables it and the `/farmer/*` pages are ready.

For **Google sign-in** to work, paste the OAuth credentials into the
Supabase dashboard (we don't keep them in the repo):

1. Go to https://console.cloud.google.com/apis/credentials → Create
   credentials → OAuth client ID → Web application.
2. Add this Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID + Client Secret.
4. In Supabase dashboard → Authentication → Providers → Google:
   - Flip Enabled to On
   - Paste Client ID + Client Secret
   - Save

That's it. The "Continue with Google" button on `/farmer/come-in` and
`/farmer/sign-up` becomes live the next time someone clicks it.

### What's in the repo for auth

These are all built and shipped:

| Route                            | What it is                                                                          |
|----------------------------------|-------------------------------------------------------------------------------------|
| `/come-in`                       | Member magic-link sign-in. One email field, one button.                             |
| `/farmer/come-in`                | Operator sign-in: Google, then email + password, then magic-link fallback below.    |
| `/farmer/sign-up`                | Operator sign-up: Google or email + name + farm name + password (with strength meter). |
| `/farmer/forgot-password`        | Operator password reset request — sends an email with a recovery link.              |
| `/farmer/reset-password`         | Lands here from the recovery email. Exchanges the code, sets a new password.        |
| `/auth/callback/`                | Shared post-auth landing. Handles both magic-link and OAuth code exchanges.         |
| `components/auth/password-input` | Shared input with show/hide toggle and a live four-rule strength meter (no zxcvbn). |

Voice rules followed throughout: editorial copy, the Berry pull-quote
on every operator page, "the desk is waiting for you" instead of
"Welcome to your dashboard," and `Pax tibi.` on the confirmation
screens. Members never see a password field; farms get the full kit.

---

## Troubleshooting

**"Magic link arrives but the callback page says 'invalid code'"**
The redirect URL in the link doesn't match an allowlisted URL in the
Supabase dashboard. Add it to Authentication → URL Configuration →
Redirect URLs.

**"find-nearby-farms returns 500"**
Check `supabase functions logs find-nearby-farms`. Most common cause:
PERPLEXITY_API_KEY or MAPBOX_TOKEN unset. Set them with
`supabase secrets set ...` and the function picks them up on the next
call (no redeploy needed).

**"The inquiry email never arrives"**
Without RESEND_API_KEY set, the function falls back to returning a
mailto: URL and the client opens the visitor's email app. Set Resend
to make sending automatic.

**"Migrations error: function is_farm_member already exists"**
You ran the initial schema twice. To start over:
`supabase db reset` (wipes everything and replays migrations).
