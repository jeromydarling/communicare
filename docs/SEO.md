# SEO baseline

What's in the repo, what's automated, and what still needs human eyes
when a real domain is wired up.

## Site URL — one variable, every metadata tag

Set `NEXT_PUBLIC_SITE_URL` on the deploy environment. Everything else —
canonical tags, sitemap URLs, Open Graph URLs, Twitter card URLs, the
JSON-LD `url` properties on Organization / WebSite / LocalBusiness /
Article — reads from that one variable through `lib/site.ts`. Don't
hardcode the production domain anywhere else.

Precedence in `lib/site.ts`:

1. `NEXT_PUBLIC_SITE_URL` (explicit)
2. `https://jeromydarling.github.io${BASE_PATH}` (project-page deploy)
3. `http://localhost:3000` (local dev)

## What's automated

- **Root metadata** in `app/layout.tsx` — `metadataBase`, title template
  (`%s — Communicare`), description, keywords, OG block, Twitter card,
  robots directives. Inherited by every page that doesn't override.
- **Organization JSON-LD** on every page via the body of the root
  layout. Crawlers see a consistent identity.
- **Per-route metadata** through `layout.tsx` files inside each public
  client-component route (find, join, homepage, demo, come-in, farmer/*).
- **Per-farm metadata + LocalBusiness JSON-LD** on `/farm/[slug]` via
  `generateMetadata` + an inline `<JsonLd>`. Includes geo coordinates
  so Google can pin it on a map.
- **WebSite + SoftwareApplication JSON-LD** on the homepage. WebSite
  declares a SearchAction template so Google can build the sitelinks
  search box. SoftwareApplication declares pricing.
- **Article JSON-LD** on `/manifesto`.
- **Sitemap** at `/sitemap.xml`. Static routes + every sample farm +
  every farm's subscribe page + every journal entry. Priorities tuned
  by content value (1.0 homepage, 0.95 find, 0.85 farms, 0.5 journal).
- **Robots** at `/robots.txt`. Allows public marketing surface. Blocks
  every farmer dashboard route (/farmer/inventory, /farmer/payments,
  etc.) and the entire /share/ member dashboard plus /auth/callback.
- **OG image** at `/public/og/default.jpg` (1200×630, 77KB). Generated
  by `scripts/generate-og.mjs` — Playwright renders a brand-aligned
  HTML template, screenshots it. Re-run any time the tagline changes.
- **Canonical URLs** on every page that exports metadata.
- **Noindex** on `/farmer/forgot-password` and `/farmer/reset-password`
  (utility pages, not content). Other auth pages allowed for brand
  searches but `max-snippet:0` so Google doesn't snippet the form.

## What needs human attention

- **Per-farm OG images.** Right now every farm page falls back to the
  generic default. The `<WatercolorScene>` work in `docs/IMAGES.md`
  produces nice illustration variants — once those exist, extend the
  farm-page `generateMetadata` to point each one at its own per-farm
  OG image (e.g. `/og/farm/elmwood.jpg`).
- **Real domain.** The deploy workflow needs `NEXT_PUBLIC_SITE_URL`
  set in repo secrets so the sitemap, canonicals, and JSON-LD don't
  point at the localhost / github.io fallback.
- **Twitter handle.** When we have one, set `TWITTER_HANDLE` in
  `lib/site.ts`. Picked up by the `twitter` metadata block.
- **Google Search Console verification.** After the domain is live,
  add the verification meta tag via root layout `verification.google`.
- **Submit the sitemap.** Once the domain resolves, submit
  `https://<domain>/sitemap.xml` to Search Console and Bing Webmaster.
- **Per-farm review JSON-LD.** When we have real members + reviews
  for sample / claimed farms, extend `schemaForFarm` in
  `app/(public)/farm/[slug]/page.tsx` to include `aggregateRating`
  and `review` arrays. Rich-result eligible.

## Performance touches that double as SEO

- **`output: "export"`** — no SSR, no cold starts. Lighthouse perf
  scores stay high.
- **`images.unoptimized: true`** with hand-tuned image sizes in
  `lib/site.ts` and `docs/IMAGES.md`. No runtime image-CDN dependency.
- **Font self-hosting** via `next/font/google` — first paint isn't
  blocked on a third-party DNS lookup.

## Re-running the OG generator

```bash
PLAYWRIGHT_CHROMIUM=/path/to/chromium node scripts/generate-og.mjs
```

The `PLAYWRIGHT_CHROMIUM` env var is only needed if you don't have
the standard Playwright browser cache populated; on most dev machines
plain `node scripts/generate-og.mjs` works.
