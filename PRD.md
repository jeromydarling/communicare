# Farm Shares App — Product Requirements Document

**Status:** Draft v0.1
**Date:** 2026-05-24
**Branch:** `claude/farm-shares-market-research-IXSn0`

---

## 1. Executive Summary

We are building a mobile-first app for small direct-to-consumer farms (CSAs, raw-milk herd shares, grass-fed meat, pastured eggs, market gardens) and their customers. The category is fragmented, dated, and resented; the December 2024 sunset of Harvie left ~150 farms shopping for a new home, and the dominant marketer (Barn2Door) is widely complained about for high-pressure sales, $399–$599 setup, and data lock-in.

**This is a gift to the farm-share community, not a venture-scale SaaS bet.** We charge one flat, extremely low price for the software (placeholder: **$9/month, no tiers, no setup, no contract**), and earn a small platform fee only on the opt-in "Managed Payments" service for farms that don't want to set up their own processor.

**Our wedge:** the simplest possible customer experience (magic-link login, SMS-driven weekly swap/skip/pause loop, no passwords) combined with a mobile-first farm admin that handles inventory, pickup rosters, and the two billing models incumbents do poorly: catch-weight meat shares and herd-share boarding fees. Plus an AI-generated one-page farm homepage and social-promotion toolkit so farms can market themselves without hiring a designer.

**Positioning, in one line:** *The $9/month app that runs your farm share — keep your own payment processor, get a free homepage, and let your members swap a box by texting back.*

---

## 2. Target Users

### 2.1 Primary segments (in priority order)

| Tier | Segment | Why first | Approx. US count |
|---|---|---|---|
| 1 | **Harvie-displaced vegetable CSAs** | Actively shopping, identifiable, share a defunct-vendor migration narrative | ~150 |
| 1 | **Raw-milk herd-share dairies** | Underserved (only Smart F.D.S.), organized community, regulatory complexity is a moat | ~500–1,000 (CO, ID, CT, TN, VA, MI, OH, WV) |
| 2 | Grass-fed beef / pastured pork producers | Catch-weight billing pain is acute; leaving Barn2Door over it | ~3,000 |
| 2 | Pastured egg / mixed protein farms | Inventory drift is acute; tech-comfortable Salatin-style operators | ~2,000 |
| 3 | Diversified vegetable CSAs (general) | Largest pool but most incumbent competition | ~7,000 |

### 2.2 User personas

**The Farmer-Operator** — typically 40–60 years old, runs the farm and the business, time-starved, owns a smartphone, hates desktop software they have to learn at 9pm. Spends 7–10 hr/week on customer communication today. Will pay $50–$300/mo for software if hours saved are visible. Hates % skims and annual contracts.

**The Member-Customer** — typically 30–50 years old, urban/suburban, values local food and the farmer relationship, but is busy and forgets pickups. Logs into farm software roughly 1x/week, peaks at 4x/week, then 0x for a month. The forgotten-password rate is brutal. Wants SMS reminders, easy swaps, and the ability to gift / pause / split a share.

---

## 3. Market Opportunity (summary)

- **~117k US farms** sell direct-to-consumer ($3.3B in 2022, +16% from 2017 — USDA).
- **~7,200 CSA farms** specifically.
- Average US farmer age is 58.1; **beginning farmer** cohort (avg 47.1) is growing 11% — wedge demographic is younger, more tech-comfortable, and second-career.
- Existing tools: Barn2Door, Local Line, GrazeCart, CSAware, Farmigo (legacy), Member Assembler, Cropolis, EatFromFarms, Open Food Network, Tend, GrownBy, Smart F.D.S.
- **No incumbent uses magic-link / passwordless auth.**
- **No incumbent is meaningfully mobile-first** for the farmer admin.
- **No incumbent has herd-share-native primitives** (share certificates, boarding agreements, state regulatory templates).

---

## 4. Competitive Positioning

| Axis | Barn2Door | Local Line | GrazeCart | CSAware | Harvie (RIP) | **Us** |
|---|---|---|---|---|---|---|
| Setup fee | $399–$599 | $0 | $0 | $0 | $0 | **$0** |
| Monthly | $99–$299 | $99–$199 | $124+ | $100 min + 2% | n/a | **$9 flat** |
| Contract | Annual | Monthly | Monthly | Monthly | n/a | **Monthly** |
| Bring-your-own payment processor | No | No | No | No | No | **Yes (default)** |
| AI-generated farm homepage | No | No | No | No | No | **Yes** |
| Social-promotion toolkit | No | No | No | No | No | **Yes** |
| Magic-link auth | No | No | No | No | No | **Yes** |
| SMS-driven swap/skip | No | No | No | No | Partial | **Yes** |
| Catch-weight billing | Yes (clunky) | Limited | Yes | No | No | **Yes (clean)** |
| Herd-share native | No | No | No | No | No | **Yes** |
| Data export on cancel | Poor | OK | OK | OK | Forced migration | **One-click** |
| Mobile-first farmer admin | No | No | No | No | OK | **Yes** |
| Self-serve onboarding | No (demo wall) | No (demo wall) | No | No | Yes | **Yes** |

---

## 5. Product Principles

1. **This is a gift to the farms.** One flat low price, no tiers, no upsell tricks. We make money on optional Managed Payments only.
2. **Bring your own payment processor.** Farms already use Stripe, Square, Helcim, Venmo, cash, or check. Don't make them rip-and-replace. Managed Payments via our Stripe Connect is optional, for farms that want zero setup.
3. **Passwordless by default.** Magic link to email, SMS-OTP fallback. Passwords are an anti-pattern for a 1×/week app.
4. **SMS is the primary surface, not the app.** Customers should never have to log in to swap, skip, pause, gift, or change pickup. The app is for the 10% of actions that need a screen.
5. **Mobile-first for both sides.** Every farmer flow must work on a phone, in a barn, with one hand, on bad LTE.
6. **Flat pricing, no skims, no lock-in.** Month-to-month, instant CSV export, public pricing page.
7. **Templates over blank slates.** Pre-built SMS/email flows per farm type. Pre-built share/boarding contracts per state. AI generates the homepage so the farmer never faces an empty composer.
8. **No demo-call wall.** Sign up and try the product in 60 seconds.
9. **Discovery comes last.** The national farm-share map is the final phase — we only build it once we have enough farms on the platform to make discovery genuinely useful.

---

## 6. MVP Scope (V1)

### 6.1 Customer-facing (PWA — no native app v1)

**Discovery & sign-up**
- Map-first farm browse by zip / current location
- Farm profile: photos, owner bio, certifications, current week's offerings, reviews, distance, pickup sites
- Sign-up with email or phone; magic-link sent to email or OTP to phone
- One-tap "follow farm" → starts receiving weekly SMS digest (no account required)

**Ordering**
- Browse this week's available items
- One-tap add to cart; cart persists across magic-link sessions
- Pickup site picker (defaults to nearest; can change per order)
- Stripe Checkout via saved card or Plaid-verified ACH
- Tipping line at checkout (default 0; suggested 5/10/15%)

**Subscriptions (the recurring share)**
- Subscribe to a share with: weekly / biweekly / monthly cadence
- Billing model picker: pay-as-you-go credit account, monthly installments, or full-season upfront (with farmer-set discount)
- Default to monthly installments (highest conversion per Civil Eats / Land Connection data)

**The weekly SMS loop** (this is the killer feature)
- T-48h: "Hey Sarah — your Tuesday share: kale, carrots, eggs, a chicken. Reply SWAP, SKIP, DONATE, or GIFT by Mon 6pm."
- T-12h: pickup reminder with site + window
- T-2h: optional "pickup closing soon" if not yet collected
- Each reply hits a Twilio webhook that mutates state without requiring login

**Account self-serve (web, magic-link gated)**
- Pause for N weeks (1-tap)
- Gift this week's share to a friend (SMS them a pickup pass)
- Split share with a neighbor (invite by SMS; cost split next billing cycle)
- Change pickup site for this week or going forward
- Update saved payment method
- Donate forgotten box to a food bank (1-tap, frees the farmer from "I missed pickup" guilt)
- View store-credit ledger
- Download invoices / annual statement PDF
- Cancel subscription with one click (no retention loop)

### 6.2 Farm-facing (mobile-first admin)

**Onboarding (10 minutes, self-serve)**
- Pick farm type (CSA vegetable / herd share dairy / meat / eggs / mixed) → loads sensible defaults
- **Pick a payment mode:**
  - *Bring Your Own* (default): paste your Stripe / Square / PayPal / Venmo / Zelle / ACH details, or "I'll collect by cash/check at pickup." We track what's owed; you collect however you already do.
  - *Managed Payments*: we set you up on Stripe Connect Express (5 min including ID verification). 1% platform fee on top of Stripe's own fees; we handle disputes, payouts, and 1099s.
- Add first 5 products with photos
- Set pickup sites & windows
- Set share definitions
- **Generate your homepage**: answer 6 questions (farm name, location, what you grow, your story in 2 sentences, hours, photos) → AI drafts a working one-page site you can publish in one click
- Invite first members by CSV or paste a Barn2Door / Harvie export — we parse and migrate

**Inventory**
- Per-SKU on-hand count with hard caps
- "Sold out" tap from phone (1 second) — blocks web store immediately
- Cap auto-resets per harvest cycle (configurable)
- Catch-weight items: define price/lb + estimated weight; system computes deposit; farmer enters actual hanging weight post-processing; balance auto-charged

**Pickup roster (phone view)**
- For each pickup site/day: list of members, share contents, paid status
- Tap to check off; long-press to text the member ("Hey, share's ready early — pickup until 8?")
- No-show flag → optional auto-credit or auto-donate per farm policy
- Driver mode for route delivery: sequence by zip, one-tap "delivered," ETA SMS to next 3 stops

**Members & subscriptions**
- Member roster with: contact, share type, payment method status, lifetime spend, credit balance, contracts on file
- Bulk message (templated SMS / email)
- Individual conversation view (Twilio-backed; replies show inline; farm never gives out personal cell)

**Herd-share module** (toggleable per farm)
- Share definitions (e.g., 1/30th of cow = "1 share")
- Boarding fee billing schedule (monthly subscription)
- Per-member milk allotment (e.g., "2 gal/week")
- Contract storage: upload PDF Bill of Sale + Boarding Agreement, e-sign at signup (DocuSeal or HelloSign integration)
- State-specific templates (CO, ID, CT, TN, VA, MI, OH, WV) bundled
- Monthly milk-test result distribution (upload PDF, auto-SMS to shareholders)
- 3-year contract retention with audit log
- Charged as "Herd Share Boarding Fee" on card descriptors (never "raw milk")

**Money (two modes — farmer picks at onboarding)**

*Mode A — Bring Your Own Processor (default, $0 platform fee)*
- Farm enters its existing payment method(s): Stripe API key, Square OAuth, PayPal email, Venmo handle, Zelle email, bank/ACH details, "cash at pickup," or "check by mail."
- We generate a checkout link per order that redirects to the farm's chosen processor (Stripe Checkout / Square Checkout / PayPal.me link / Venmo deep link), or shows pay-at-pickup instructions.
- We track paid / unpaid status; farm reconciles in their own processor dashboard.
- Members can store a card-on-file with the farm's own Stripe / Square if the farm has connected those.
- We never touch the money — the farm's processor settles directly to the farm.

*Mode B — Managed Payments (opt-in, 1% platform fee + Stripe pass-through)*
- Stripe Connect Express, per-farm merchant, we hold the platform Stripe account.
- Stripe Subscriptions for recurring billing.
- Plaid-verified ACH for upfront / boarding fees (0.8% capped at $5 vs ~3% on cards — material savings on $600 CSA shares).
- Stripe Customer Balance backing our store-credit ledger.
- Skip-week button auto-issues credit (positive ledger entry referencing the share-week).
- Damaged-item: admin issues credit, no Stripe refund (saves fees & reconciliation).
- Auto-debit priority: apply credit balance first, charge card/ACH for remainder.
- Top-up flow: "Add $500, get $25 bonus" (single Stripe PaymentIntent, $525 credit to ledger).
- Monthly statement PDF emailed to each member.
- 1% application fee taken via Stripe Connect (on top of Stripe's own 2.9%+30¢ or 0.8% ACH).
- We handle: dispute responses, 1099-K issuance, payout schedule.

*Credit ledger and store credits work in both modes* — in Mode A we track the IOU and surface it to the farm; in Mode B we settle it through Stripe Customer Balance.

**Reports & data**
- Sales by SKU, by member, by pickup site, by week
- One-click CSV export of: members, orders, products, subscriptions, ledger entries
- QuickBooks / Wave integration via CSV in v1; native sync in v2

**AI-driven one-page CMS (every farm gets a homepage)**
- 6-question setup wizard: farm name, location, what you grow, your story (2 sentences), pickup days, photos (3+).
- AI (Claude) drafts: hero headline, "about the farm" paragraph, product callouts, FAQ, pickup info section, "subscribe to a share" CTA.
- Farmer reviews, edits inline, publishes in one click.
- Free subdomain: `farmname.communicare.farm` (or chosen brand domain TBD).
- Custom domain support (CNAME) included in the $9 plan — no upcharge.
- Auto-generated meta tags, JSON-LD `LocalBusiness` + `FoodEstablishment` schema, OpenGraph cards.
- Re-generation: farmer can hit "rewrite this section in a friendlier tone" and AI redrafts.
- Templates by farm type so the homepage looks different for a herd-share dairy vs a vegetable CSA vs a beef ranch.
- This is **not** a general website builder — it's a one-page farm storefront. No blog, no multi-page nav. Resist scope creep here.

**Social & community promotion toolkit**
- **Auto-generated share cards**: every week, generate Instagram-ready square + story images of "this week's share" using farm photos + AI layout. Farmer taps "share to Instagram" → opens Instagram app with image pre-loaded.
- **Subscribe link / QR**: every farm gets a short link (`comm.farm/elmwood`) and a downloadable QR poster (PDF, print-ready) for farmers markets, community boards, coffee shops.
- **Embeddable subscribe widget**: 3-line JS snippet that drops a "Subscribe to our share" button onto any existing farm website (Squarespace, Wix, WordPress).
- **Referral mechanic**: each member gets a personal referral link; first share for referrer earns a credit (farm-configurable amount, default $20).
- **Gift-a-share**: any member can gift a 4-week share to a friend via SMS in 30 seconds — recipient gets a magic link to claim and pick a pickup site.
- **"This week's share" email** auto-composed and sent to the farm's mailing list (BYO Mailchimp / ConvertKit or use ours for $0 included).
- **Press kit page** auto-generated: high-res photos, farm story, owner quote, contact info — for local newspapers and food bloggers.
- All assets carry the farm's brand, not ours (no "powered by" watermark on share cards in MVP — earn the right to brand later).

### 6.3 Explicitly out of scope for V1

- Native iOS / Android apps (PWA only)
- Multi-producer marketplace / food-hub mode
- Crop / production planning (let Tend, Heirloom own this)
- Wholesale / restaurant accounts with custom price lists
- Box customization UI (the swap-by-SMS flow covers 80% of the value)
- SNAP / EBT online (V2 — requires MarketLink grant application, 3–6 month process)
- Farmers-market POS hardware (use Stripe Terminal tap-to-pay on iPhone in Managed Payments mode)
- **National farm-share discovery map** (Phase 5 — built last, only once we have enough farms on platform to make it useful)
- General website builder / blog / multi-page CMS (the AI homepage is intentionally one page only)

---

## 7. User Flows (key journeys)

### 7.1 New customer: discovery → first order
1. Lands on farm profile via Google / Instagram / SMS share
2. Sees "Subscribe to a share" CTA → picks share type + cadence
3. Enters email + phone
4. Magic link sent to email; clicks → lands back on subscribe page, authenticated
5. Stripe Checkout (card or ACH) → confirms
6. Sees confirmation + first pickup date
7. Twilio sends T-48h SMS with first share contents

**Target: < 90 seconds from landing to confirmed subscription.**

### 7.2 Recurring customer: weekly swap by SMS
1. T-48h SMS arrives: "Tuesday share: kale, carrots, eggs. Reply SWAP, SKIP, DONATE, or GIFT."
2. Customer replies "SWAP kale for spinach"
3. Twilio webhook → parse intent → check spinach availability → mutate order → reply "Done. Tuesday share: spinach, carrots, eggs."

**No login. No app. < 10 seconds.**

### 7.3 Farmer: morning of farmers market
1. Opens PWA on phone at 6am
2. Sees today's pickup roster (87 shares to pack)
3. Notices eggs are short → taps "sold out" on egg SKU
4. Web store immediately blocks further egg orders
5. At market, taps members off as they pick up
6. One member never shows; long-presses → "Hey, share's still here until 12 if you can come"
7. End of market: taps "donate remaining 3 boxes to food bank"; system issues credits to those members automatically

### 7.4 Herd-share onboarding
1. New shareholder signs up via farm's link
2. Picks "1/30th cow share" + monthly $45 boarding fee
3. Magic-link verifies email
4. State-specific contract pre-fills with shareholder name → e-sign in browser
5. Stripe Connect ACH setup (Plaid)
6. Confirmation; first month's boarding fee charged
7. Welcome SMS with first pickup details + farm's milk-test schedule

---

## 8. Data Model (sketch)

**Core entities:**
- `Farm` — owner, plan tier, Stripe Connect account ID, branding, settings
- `User` — email, phone, magic-link tokens, current Farm scope
- `Membership` — User × Farm × role (member | farm-admin | farm-staff)
- `Product` — SKU, type (fixed | catch-weight | share), price, inventory cap
- `PickupSite` — Farm × address × day × time-window × fee
- `Share` — Farm × definition (cadence, size, contents-policy), pricing model
- `Subscription` — User × Share × cadence × billing-model × status
- `Order` — User × Farm × pickup-site × week, status
- `OrderItem` — Order × Product × qty × actual-weight (for catch-weight)
- `CreditLedger` — User × Farm × delta-cents × reason × related-order-id (append-only)
- `HerdShareContract` — User × Farm × share-fraction × signed-pdf-url × state-template × effective-date
- `SMSMessage` — User × direction × body × intent-parsed × order-ref
- `MilkTestResult` — Farm × date × pdf-url (broadcast to shareholders)
- `Payout` — Farm × Stripe transfer reference × period

Append-only ledger and audit log for everything money-touching.

---

## 9. Tech Stack

**Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui. PWA-first; native shell deferred to v2.

**Backend:** Next.js API routes + tRPC or REST; Postgres (Supabase or Neon); Prisma or Drizzle ORM.

**Auth:** custom magic-link via Resend or Loops for email; Twilio Verify for SMS OTP. JWT or session cookie; no passwords.

**Payments:** Stripe Connect Express, Stripe Subscriptions, Stripe Customer Balance, Plaid Link for ACH.

**SMS:** Twilio Programmable Messaging; per-farm Twilio number (subaccount per farm in v2; shared short-code in v1 with farm name prefix).

**Email:** Resend or Loops (transactional + magic links).

**File storage:** S3 / R2 for contracts, milk-test PDFs, farm photos.

**E-sign:** DocuSeal (open-source) or HelloSign API for herd-share contracts.

**Hosting:** Vercel for app, Supabase/Neon for DB, Cloudflare for CDN/R2.

**Observability:** Sentry, PostHog.

**Backup processor (herd shares):** PaymentCloud relationship warm in case Stripe flags raw-milk-adjacent accounts.

---

## 10. Security & Compliance

- **PII:** member name, email, phone, address, payment-method tokens (Stripe holds card details). At-rest encryption via Postgres + KMS.
- **ACH authorization:** capture written authorization at subscribe (NACHA requirement); store with timestamp and IP.
- **Herd-share contracts:** 3-year retention required (CO, ID, CT); audit log of access.
- **State raw-milk geo-gating:** block herd-share sign-up from states where it's illegal (NJ, HI, etc.) at the share level, not the customer level.
- **Card descriptors:** "Herd Share Boarding Fee" or "[Farm Name] Membership" — never "raw milk."
- **Sales tax:** Stripe Tax integration; produce typically exempt, value-added foods not. Farm sets tax category per SKU.
- **GDPR/CCPA:** data-export and account-deletion endpoints from day 1.

---

## 11. Pricing

**One price. For everyone. Forever.**

| | Price |
|---|---|
| **Software** | **$9 / month** (flat — placeholder; final price TBD) |
| Setup fee | $0 |
| Contract | Month-to-month |
| Free trial | 30 days, no credit card required |
| Member count | Unlimited |
| Features | All of them. There are no tiers. |
| SMS | Unlimited reasonable use (~2,000 segments/farm/mo soft cap; we email if you go wild) |
| AI homepage | Included |
| Promotion toolkit | Included |
| Herd-share module | Included |
| Catch-weight billing | Included |
| Data export | One-click CSV anytime |

**Optional: Managed Payments add-on**
- For farms that don't want to set up their own Stripe/Square/etc.
- We set up Stripe Connect Express in 5 min.
- **1% platform fee** on processed volume, on top of Stripe's own fees:
  - Cards: 2.9% + $0.30 (Stripe) + 1% (us) = 3.9% + $0.30
  - ACH: 0.8% capped at $5 (Stripe) + 1% (us)
  - Tap-to-pay iPhone: 2.7% + $0.05 (Stripe) + 1% (us)
- We handle: disputes, payouts, 1099-Ks.
- Toggle off anytime; farm migrates to BYO mode with one click.

**Why so cheap?**
This is a gift to the farm-share community. Most of these farms gross $50k–$200k/year; $99/mo from Barn2Door is meaningful money. $9/mo is invisible. The mission is to make it irrational for a farm to *not* run on us. We earn enough on Managed Payments (the farms that opt in) and from the eventual national farm-share map (sponsored placements, lead-gen for new farms entering the space — TBD) to cover operating costs.

**What we will never do**
- Charge a setup fee.
- Take a % of farm revenue when the farm is using their own processor.
- Lock data in.
- Hide pricing behind a demo call.
- Charge per member, per pickup site, per product, per SMS, per anything.
- Sell upsell tiers, "Pro" features, or "Enterprise" features.

Stripe processing pass-through (Managed Payments only):
- Cards: 2.9% + $0.30
- ACH: 0.8% (capped at $5)
- Tap-to-pay iPhone: 2.7% + $0.05

---

## 12. Go-to-Market

### 12.1 Beachhead (months 0–3)
- **Cold-outreach the ~150 Harvie-displaced farms.** Mine the Local Line and GrownBy migration discussions for names; reach out via farm websites and Instagram DMs.
- **Free white-glove migration** from Harvie / Barn2Door / Local Line exports (CSV import + payment-method handoff).
- **Pitch:** "$9/month, keep your own Stripe/Square, free AI-generated homepage, members swap a box by texting back. No contract, export your data anytime. We built this as a gift to farm shares."

### 12.2 Herd-share community (months 1–6)
- Partner with **Farm-to-Consumer Legal Defense Fund** for distribution.
- Sponsor a **Weston A. Price Foundation** chapter event.
- State-specific landing pages: `/colorado-herd-share-software`, `/idaho-herd-share-software`, etc.
- Ship the state contract template library as a free standalone tool to seed brand.

### 12.3 Content & SEO (continuous)
- "Barn2Door alternative" SEO play (high-volume queries — and now even more compelling: "Barn2Door is $99/mo + setup, we're $9").
- "How to start a CSA in [state]" guides with embedded onboarding.
- Founder-led YouTube: weekly farm-software teardowns.
- Free public farm-share starter kit: state contract templates + AI homepage generator + QR poster generator, all standalone, all funnels.

### 12.4 The map flywheel (Phase 5+)
- The national farm-share discovery map is the consumer-facing growth engine.
- Every farm on platform gets a verified listing (real-time availability, accurate pickup info, owner-confirmed).
- Non-platform farms get a basic scraped listing with a "Claim this listing" CTA → onboarding funnel.
- For customers: best farm-share discovery experience in the country (LocalHarvest's listings are stale, Eatwild charges farms to list).
- For us: every consumer search becomes a farm-acquisition opportunity.

### 12.5 No founder-pricing tricks
- $9 is $9 for everyone, day one. No early-bird discount, no founder pricing, no annual prepay discount.
- The price IS the marketing.

---

## 13. Roadmap

### Phase 0 — Foundation (weeks 1–4)
- Repo scaffolding, magic-link + SMS-OTP auth, farm + product + member CRUD, BYO payment-processor config (Stripe key, Square OAuth, PayPal/Venmo handles, "cash at pickup")

### Phase 1 — Core MVP (weeks 5–11)
- Subscriptions, weekly share orders, pickup sites + roster phone view, customer SMS loop (swap/skip/pause), credit ledger, **AI-generated one-page farm homepage**, subscribe-link + QR poster generator

### Phase 2 — Specialization (weeks 12–15)
- Catch-weight billing, herd-share module + e-sign, state contract templates, monthly statement PDFs, Managed Payments option (Stripe Connect Express + 1% platform fee)

### Phase 3 — Promotion toolkit (weeks 16–19)
- Auto-generated social share cards (Instagram square + story), referral mechanic, gift-a-share by SMS, embeddable subscribe widget for existing farm sites, press-kit page, "this week's share" email composer

### Phase 4 — Polish & Launch (weeks 20–22)
- Onboarding wizard refinement, CSV import from Barn2Door / Harvie / Local Line, public marketing site, public beta launch

### Phase 5 — National farm-share discovery map (months 6–9+)
- **Built last, intentionally.** Public consumer-facing map of every farm share in the US.
- Seeded from our platform farms (free, accurate, owner-verified data).
- Augmented with scraped data from LocalHarvest, USDA, Eatwild, Real Milk finder, state ag departments (with attribution / opt-out).
- Filters: share type (vegetable / dairy / meat / eggs), pickup type, certification, distance, price range, availability now.
- "Claim your listing" CTA for non-platform farms — onboarding funnel back into the $9 plan.
- Eventual revenue: sponsored top-of-list placements (clearly labeled), lead-gen for organic certifications, farm-tour booking. Carefully — must stay member-trusted.

### Phase 6 — Growth (months 9–15)
- SNAP-online (MarketLink — application started in parallel from Phase 1)
- QuickBooks sync (native)
- Stripe Terminal tap-to-pay for farmers-market POS (Managed Payments mode)
- Wholesale / restaurant price lists
- Native mobile shell (only if PWA telemetry justifies it)
- Multi-farm cart (the marketplace mode for customers shopping across multiple platform farms)

---

## 14. Success Metrics

**North-star:** number of US farm shares running on us (the mission metric — not revenue).

**Secondary:** members served × weeks-of-share-delivered (the value-to-the-community metric).

**MVP success criteria (6 months post-launch):**
- **500 paying farms** (the bar is much higher than a normal SaaS because the price is invisible — adoption should be the constraint, not willingness-to-pay)
- 30,000 active members across all farms
- 70%+ of customer actions (swap/skip/pause) happen via SMS, not web
- Magic-link sign-up completion > 80% (vs Calendly's 71% benchmark post-passwordless)
- 80%+ of farms publish their AI homepage within 7 days of signup
- 25%+ of farms opt in to Managed Payments (revenue funding for ongoing ops)
- Farmer NPS > 60 (higher target — the price means we win the love or we go home)
- Member retention season-over-season > 65% (vs industry baseline 45%)
- < 2% farm churn / month

**Revenue at 6 months (sanity check):**
- 500 farms × $9 = $4,500/mo from software
- 125 farms (25%) on Managed Payments × ~$8k/mo GMV × 1% = $10,000/mo from platform fee
- ~$14,500/mo total — covers a small team and infrastructure but not VC-scale. **By design.**

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe freezes a raw-milk farm's funds | Medium | High | Card descriptor discipline ("Herd Share Boarding Fee"), MCC vigilance, warm PaymentCloud relationship |
| Farmer onboarding takes longer than 10 min in practice | High | Medium | Hybrid model: optional 30-min Zoom for any farm that wants it; templated defaults |
| Twilio costs spiral with chatty members | Medium | Medium | Per-plan SMS allowances; overage at $0.02; intent classifier minimizes back-and-forth |
| State raw-milk law changes mid-season | Low | High | Stay close to Farm-to-Consumer Legal Defense Fund; monthly legal review |
| Barn2Door launches a magic-link auth response | Medium | Medium | Wedge isn't just auth — it's auth + SMS + flat pricing + herd-share + data portability; hard for an incumbent to copy holistically |
| CSV import from competitors is messier than expected | High | Low | White-glove migration for first 50; manual cleanup acceptable at small scale |
| Customer dropout because they're tired of CSAs generally (industry trend) | High | High | Position as making the CSA experience *better*, not as betting on CSA growth; segments like herd shares are growing |

---

## 16. Open Questions

### Resolved by new direction (2026-05-24)
- ~~Pricing tiers~~ → resolved: **one flat price ($9/mo placeholder), no tiers**
- ~~Stripe Connect default~~ → resolved: **BYO processor by default, Managed Payments opt-in**
- ~~SNAP-online priority~~ → still deferred to Phase 6; start MarketLink application in parallel from Phase 1

### Still open

1. **Exact price point.** $9/mo is the placeholder. Candidates: $5, $9, $12, $15, $19, or free-with-Managed-Payments-only. Lower number = stronger gift narrative + faster adoption; higher number = more runway. Recommend $9.
2. **Managed Payments platform fee.** 1% is placeholder; could be 0.5% (more generous) or 2% (faster path to profitability). Recommend 1% — material savings vs Barn2Door's 3–5% all-in but still funds ops.
3. **Multi-farm cart** — defer to Phase 6. Customer demand exists but operator simplicity matters more in v1.
4. **Native app priority** — PWA covers 90%; defer to Phase 6 based on PWA telemetry.
5. **Open-source the herd-share contract templates?** — recommend yes (trust + SEO + distribution).
6. **Repo name → product name.** Current repo is `communicare` (Latin "to share / commune"). Possible product names: Communicare, Farm.share, ShareFarm, Commons, Acre, Boxshare. Need a brand decision before public marketing site (Phase 4).
7. **National map data strategy.** Scrape LocalHarvest / USDA / Eatwild with attribution and opt-out, or partner with them? Partnership is slower but more defensible. Scraping is faster but legally grayer.
8. **AI homepage subdomain.** `farmname.communicare.farm` is placeholder. Need final root domain.
9. **Founder-led support model.** At $9/mo, support cost matters even more than at $79. Plan: chat-first (Intercom-style) with founder coverage during business hours for first 500 farms; community forum / Discord for off-hours; AI-assisted first-response after Phase 4.
10. **Mailing list product.** Do we ship our own list-sender (cheap, locked-in) or just generate Mailchimp/ConvertKit-compatible exports? Recommend ship our own — every dollar saved matters when farms only pay $9.
11. **Branding-free social share cards in MVP, or "powered by" footer for distribution?** Recommend branding-free for the gift framing; revisit later.

---

## 17. Appendix — Research sources

Full research is in `research/` (TBD). Key findings drawn from:

- USDA 2022 Census of Agriculture
- Civil Eats, Land Connection, UC Davis (Galt et al.) on CSA retention
- Penn State Extension on CSA member dynamics
- Barn2Door BBB / Glassdoor / Cattletoday forum complaints
- Local Line migration case studies (Walnut Lane, Edwards Family Farm, Shakefork)
- Farmhand success stories (7+ hrs/week reclaimed)
- Smart F.D.S. on herd-share legal structures
- Farm-to-Consumer Legal Defense Fund raw-milk state map
- Stripe / Plaid / Twilio / GoCardless pricing documentation
- BayTech / Calendly data on magic-link conversion lift (43% → 71%)
- TASTE Magazine, Vegan Family Kitchen on customer dropout drivers
- Trustpilot reviews of Misfits Market / Imperfect Foods for adjacent customer voice
