# Launch checklist

Every item that's still between us and paying customers. What I built is
already deployed; this list is what only you can do (dashboard clicks,
DNS records at your registrar, carrier registrations, real-card tests).

Cross items off as you go. Order matters roughly — DNS unlocks everything
email-related; 10DLC unlocks everything SMS-related; the Stripe portal
config unlocks the "manage billing" button.

---

## 🔴 Hard blockers (can't sell without these)

### 1. Email deliverability — SPF/DKIM/DMARC in DNS

Cloudflare Email Service needs three records on the `communicare.farm`
domain to keep magic-links, invites, password resets, and consent-SMS
confirmations out of Gmail Spam.

- **Where**: dash.cloudflare.com → Compute & AI → Email Service →
  Domain onboarding → `communicare.farm`
- **What**: CF gives you the exact SPF, DKIM, and DMARC records to add.
  Add them to your `communicare.farm` DNS zone.
- **Verify**: send yourself a magic-link from the live site; check that
  it lands in Inbox, not Spam. Use https://www.mail-tester.com for a
  10-point breakdown if you want detail.

### 2. Stripe 10DLC brand + campaign registration (Twilio)

Blocker for SMS to non-verified numbers. You're on trial today; real
member SMS won't route reliably until 10DLC clears.

- **Where**: Twilio Console → Messaging → Regulatory Compliance →
  A2P 10DLC
- **What**: use the Claude Chrome prompt from earlier in this session,
  or click through manually. Sole-Proprietor brand, "Mixed" campaign,
  the samples from `functions/_lib/sms-templates.ts` (consent request,
  weekly offer, confirmation).
- **Timing**: 1–3 business days for brand + campaign approval; up to 2
  weeks if the carrier requests revisions.

### 3. Stripe Billing Portal default configuration

Right now `/farmer/settings` "Open billing portal" 502s because Stripe
hasn't been told what the portal should look like.

- **Where**: https://dashboard.stripe.com/settings/billing/portal
- **What to enable**: update payment method ✓ · view invoice history ✓ ·
  cancel subscriptions ✓ (cancel mode "Immediately" with prorated
  refund is most honest given the manifesto).
- **Business name**: Communicare · **Support email**: gardener@thecros.app.

### 4. Full end-to-end paid signup (once, with a real card)

The CI smoke test now covers everything up to the Checkout URL AND
signature-verified webhook → gate release via synthetic events. It
does NOT prove a real Stripe payment completes and delivers the
`customer.subscription.created` event to our endpoint. One real $9
charge closes that gap.

- **Steps**: fresh incognito → https://communicare.farm/farmer/sign-up →
  fill form → land on Checkout → pay $9 with a real card → confirm you
  return to `/farmer/onboarding/?billing=success` → check dashboard for
  no orange banner → open DevTools console:
  ```js
  fetch('/api/farmer/me-with-farm').then(r=>r.json()).then(d=>console.log(d.billing))
  ```
  Expect `{ subscription_status: "active", ... }`.
- **Refund after**: Stripe MCP `create_refund` or the dashboard.

### 5. Onboarding wizard finish-to-publish (once, after paying)

The CI smoke test proves the create-farm step doesn't 500 and the
publish step returns the correct gate response. It does NOT prove the
whole wizard produces a working live farm page.

- **Steps**: complete every wizard step → click Publish → visit
  https://communicare.farm/farm/<your-slug>/ → confirm the page renders
  with your inputs, not "Sample farm homepage" banner.

---

## 🟡 Should-do before public launch

### 6. Legal review

The four pages at `/privacy`, `/terms`, `/refunds`, `/support` are
written in the manifesto voice and cover the essentials, but a lawyer
should read them before real farmers rely on them. Especially the
governing law + limitation-of-liability clauses in `/terms`.

### 7. Real farm demo — replace or hand-populate

The four sample farms (`/farm/elmwood`, `/farm/three-forks`,
`/farm/low-creek`, `/farm/morning-glory`) still render as demos with
the "Sample farm homepage" banner. Either onboard one real pilot farm
and swap it in, or leave the banner and let the samples stand as
"here's what it looks like."

### 8. `thecros.app` — the CROS family landing

Communicare now links to `thecros.app` prominently. If that URL 404s
or doesn't reflect the family concept, the branding sweep looks broken.

### 9. Twilio secrets on the Worker

For SMS to work end-to-end past the 10DLC gate:
- `TWILIO_ACCOUNT_SID` (from twilio.com/console)
- `TWILIO_AUTH_TOKEN`
Set both in the CF Worker → Settings → Variables and Secrets.

### 10. Cloudflare Web Analytics token (optional but recommended)

- **Where**: dash.cloudflare.com → Analytics & Logs → Web Analytics →
  Add a site → `communicare.farm`
- **What**: copy the site tag ("token") → add as `CF_ANALYTICS_TOKEN`
  in Worker Secrets. Beacon loads automatically once set.

### 11. Team digest webhook (optional)

If you want the daily "here's who signed up / canceled" summary
delivered to Slack or Discord:
- Create an incoming webhook in Slack or Discord
- Save the URL as `TEAM_DIGEST_WEBHOOK_URL` in Worker Secrets
- Fires daily at 10:00 UTC (once — never a "quiet day" post)

---

## 🟢 Post-launch iterate

- Real testimonials in `lib/testimonials.ts` as pilot farms come in
- New journal entries via `lib/site-journal.ts`
- Roadmap updates via `app/(public)/roadmap/page.tsx` when priorities shift
- Adding admin emails: edit `cloudflare/d1/bootstrap-admin.sql`
- Custom-domain support for farms (in the "Later" roadmap bucket)
- Catch-weight billing (Next-up bucket)
- Bring-your-own domain (Next-up bucket)
- Two-way SMS threaded inbox per member (Next-up bucket)

---

## What I already handled from your list

For the record, the following are done in code and either live now or
land on the next deploy:

- Privacy / Terms / Refunds / Support pages ✓
- Cookie notice ✓
- Sitemap includes new pages ✓
- Post-payment welcome email ✓
- Day 1 / 3 / 7 onboarding drip ✓
- Weekly Monday digest ✓
- Dormant-farmer nudge (7-day) ✓
- Herd-share monthly reminder ✓
- CROS team daily digest (webhook) ✓
- Public roadmap page ✓
- Notes-from-the-workshop journal (with per-entry pages) ✓
- Testimonials strip (silent until real quotes land) ✓
- Cloudflare Web Analytics beacon (activates when token set) ✓
- Admin map view with lifecycle-colored pins ✓
- `/find` global daily cost cap (500/day, ~$10 max) ✓
- Smoke test extended to onboarding + password reset ✓

Everything in this file is the human-only remainder.
