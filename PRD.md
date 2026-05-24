# Farm Shares App — Product Requirements Document

**Status:** Draft v0.1
**Date:** 2026-05-24
**Branch:** `claude/farm-shares-market-research-IXSn0`

---

## 1. Executive Summary

We are building a mobile-first SaaS for small direct-to-consumer farms (CSAs, raw-milk herd shares, grass-fed meat, pastured eggs, market gardens) and their customers. The category is fragmented, dated, and resented; the December 2024 sunset of Harvie left ~150 farms shopping for a new home, and the dominant marketer (Barn2Door) is widely complained about for high-pressure sales, $399–$599 setup, and data lock-in.

**Our wedge:** the simplest possible customer experience (magic-link login, SMS-driven weekly swap/skip/pause loop, no passwords) combined with a mobile-first farm admin that handles inventory, pickup rosters, and the two billing models incumbents do poorly: catch-weight meat shares and herd-share boarding fees.

**Positioning, in one line:** *Stripe-simple farm software, with passwordless login, SMS that works, and no setup fee.*

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
| Monthly | $99–$299 | $99–$199 | $124+ | $100 min + 2% | n/a | **$79–$249** |
| Contract | Annual | Monthly | Monthly | Monthly | n/a | **Monthly** |
| Magic-link auth | No | No | No | No | No | **Yes** |
| SMS-driven swap/skip | No | No | No | No | Partial | **Yes** |
| Catch-weight billing | Yes (clunky) | Limited | Yes | No | No | **Yes (clean)** |
| Herd-share native | No | No | No | No | No | **Yes** |
| Data export on cancel | Poor | OK | OK | OK | Forced migration | **One-click** |
| Mobile-first farmer admin | No | No | No | No | OK | **Yes** |
| Self-serve onboarding | No (demo wall) | No (demo wall) | No | No | Yes | **Yes** |

---

## 5. Product Principles

1. **Passwordless by default.** Magic link to email, SMS-OTP fallback. Passwords are an anti-pattern for a 1×/week app.
2. **SMS is the primary surface, not the app.** Customers should never have to log in to swap, skip, pause, gift, or change pickup. The app is for the 10% of actions that need a screen.
3. **Mobile-first for both sides.** Every farmer flow must work on a phone, in a barn, with one hand, on bad LTE.
4. **Flat pricing, no skims, no lock-in.** Month-to-month, instant CSV export, public pricing page.
5. **Templates over blank slates.** Pre-built SMS/email flows per farm type. Pre-built share/boarding contracts per state. Empty composers lose farmers.
6. **No demo-call wall.** Sign up and try the product in 60 seconds.

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
- Stripe Connect Express OAuth (5 min including ID verification)
- Add first 5 products with photos
- Set pickup sites & windows
- Set share definitions
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

**Money**
- Stripe Connect Express, per-farm merchant
- Stripe Subscriptions for recurring billing
- Plaid-verified ACH for upfront / boarding fees (0.8% capped at $5 vs ~3% on cards — material savings on $600 CSA shares)
- Stripe Customer Balance backing our store-credit ledger
- Skip-week button auto-issues credit (positive ledger entry referencing the share-week)
- Damaged-item: admin issues credit, no Stripe refund (saves fees & reconciliation)
- Auto-debit priority: apply credit balance first, charge card/ACH for remainder
- Top-up flow: "Add $500, get $25 bonus" (single Stripe PaymentIntent, $525 credit to ledger)
- Monthly statement PDF emailed to each member

**Reports & data**
- Sales by SKU, by member, by pickup site, by week
- One-click CSV export of: members, orders, products, subscriptions, ledger entries
- QuickBooks / Wave integration via CSV in v1; native sync in v2

### 6.3 Explicitly out of scope for V1

- Native iOS / Android apps (PWA only)
- Multi-producer marketplace / food-hub mode
- Crop / production planning (let Tend, Heirloom own this)
- Wholesale / restaurant accounts with custom price lists
- Box customization UI (the swap-by-SMS flow covers 80% of the value)
- SNAP / EBT online (V2 — requires MarketLink grant application, 3–6 month process)
- Farmers-market POS hardware (use Stripe Terminal tap-to-pay on iPhone)

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

| Plan | Price | Includes |
|---|---|---|
| **Starter** | $79/mo | Up to 50 active members, 500 SMS segments/mo, all features |
| **Grower** | $149/mo | Up to 250 active members, 2,000 SMS segments/mo, herd-share module, white-label SMS sender ID |
| **Pro** | $249/mo | Unlimited members, 10,000 SMS segments/mo, priority support, custom contract templates, QuickBooks sync |
| SMS overage | $0.02 / segment | beyond plan allowance |

- **No setup fee.**
- **No per-transaction skim** (farms pass through Stripe's own fees).
- **Month-to-month, no annual contract.**
- **30-day free trial, no credit card required to start.**
- **One-click data export on cancel.**

Stripe processing (passed through):
- Cards: 2.9% + $0.30
- ACH: 0.8% (capped at $5)
- Tap-to-pay: 2.7% + $0.05

---

## 12. Go-to-Market

### 12.1 Beachhead (months 0–3)
- **Cold-outreach the ~150 Harvie-displaced farms.** Mine the Local Line and GrownBy migration discussions for names; reach out via farm websites and Instagram DMs.
- **Free white-glove migration** from Harvie / Barn2Door / Local Line exports (CSV import + Stripe-Connect transfer).
- **Pitch:** "Sign up your members in 30 seconds — no password ever. Cancel anytime, export your data in one click. $49/mo for your first season."

### 12.2 Herd-share community (months 1–6)
- Partner with **Farm-to-Consumer Legal Defense Fund** for distribution.
- Sponsor a **Weston A. Price Foundation** chapter event.
- State-specific landing pages: `/colorado-herd-share-software`, `/idaho-herd-share-software`, etc.
- Ship the state contract template library as a free standalone tool to seed brand.

### 12.3 Content & SEO (continuous)
- "Barn2Door alternative" SEO play (high-volume queries).
- "How to start a CSA in [state]" guides with embedded onboarding.
- Founder-led YouTube: weekly farm-software teardowns.

### 12.4 Pricing experiment in beta
- First 50 farms: $49/mo for life (founder pricing). Use to fund support staff and reference customers.

---

## 13. Roadmap

### Phase 0 — Foundation (weeks 1–4)
- Repo scaffolding, auth (magic link + OTP), Stripe Connect onboarding, basic farm + product CRUD, member sign-up

### Phase 1 — Core MVP (weeks 5–10)
- Subscriptions, weekly share orders, pickup sites + roster phone view, customer SMS loop (swap/skip/pause), credit ledger

### Phase 2 — Specialization (weeks 11–14)
- Catch-weight billing, herd-share module + e-sign, state contract templates, monthly statement PDFs

### Phase 3 — Polish & Launch (weeks 15–18)
- Onboarding wizard, CSV import from Barn2Door / Harvie / Local Line, public marketing site, pricing page, public beta launch

### Phase 4 — Growth (months 5–9)
- SNAP-online (MarketLink), QuickBooks sync, multi-channel inventory (farmers-market Stripe Terminal), wholesale price lists, native mobile shell

---

## 14. Success Metrics

**North-star:** weekly active farms × paying-member-count per farm.

**MVP success criteria (6 months post-launch):**
- 50 paying farms
- 4,000 active members across all farms
- 70%+ of customer actions (swap/skip/pause) happen via SMS, not web
- Magic-link sign-up completion > 80% (vs Calendly's 71% benchmark post-passwordless)
- Farmer NPS > 50
- Member retention season-over-season > 65% (vs industry baseline 45%)
- < 3% farm churn / month

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

1. **Multi-farm cart (v1 or v2?)** — customer research suggests demand ("one cart for this week's groceries"); operator simplicity suggests single-farm-at-a-time. Recommend v2 to avoid marketplace complexity in v1.
2. **Native app priority** — PWA covers 90%; native lets us use push notifications without OS-level paid SMS. Suggest deferring to month 6+ based on PWA telemetry.
3. **SNAP-online for v1?** — would unlock low-income customer base + federal grant funding (MarketLink). 3–6 month application. Suggest start application now in parallel; ship in v2.
4. **Open-source the herd-share contract templates?** — high-trust signal for the community; potential SEO/distribution play. Recommend yes.
5. **Repo name** — current repo is `communicare` (Latin "to share / commune"). Fits the brand if we want to keep it; otherwise rename. Suggest a brand workshop before launch.
6. **Founding-team support model** — at $79/mo with phone-call-required support expectations, the first 50 customers will consume a lot of human time. Plan for founder-led support for first 6 months.

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
