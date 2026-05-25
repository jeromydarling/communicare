# Farm web addresses — paths, not subdomains

## The decision

Every farm gets a path under our root domain:

```
communicare.farm/wren-hollow
communicare.farm/three-forks
communicare.farm/elmwood
```

Not subdomains (`wren-hollow.communicare.farm`). Not subpaths off a
generic `/farm/`. Just `communicare.farm/<slug>` — the slug the operator
picks in the Web Address tab of the site builder.

## Why paths

- **One TLS certificate.** Subdomains either need a wildcard certificate
  (which is fine but harder to provision) or one certificate per farm
  (which is a lot at scale). Path-based serves every farm under the same
  cert.
- **One DNS configuration.** Lovable, Vercel, GitHub Pages — wherever
  this lives — needs zero subdomain setup. A new farm is a new row in
  the database, not a new DNS record.
- **Simpler to print, simpler to remember.** &ldquo;communicare.farm
  slash wren hollow&rdquo; is one breath. Subdomains require explaining
  the dot.
- **No subdomain takeover risk.** Stale subdomains pointed at us
  forever are a security headache; paths can&apos;t be taken over.
- **SEO clarity.** Google can naturally crawl
  `communicare.farm/elmwood` as a page on our site without needing to
  treat each farm as a separate origin.

## Operator-owned domains (still supported)

A farm that already owns `wrenhollow.farm` can point it at us with two
DNS records:

| Type  | Name (host) | Value (target)     | Purpose                                                  |
|-------|-------------|--------------------|----------------------------------------------------------|
| A     | `@`         | `76.76.21.21`      | Sends the bare `wrenhollow.farm` to our servers.         |
| CNAME | `www`       | `communicare.farm` | Sends `www.wrenhollow.farm` to the same place.           |

When we see a request arrive at `wrenhollow.farm` we look up which
slug they configured in the site builder and serve the corresponding
farm homepage at the apex domain. The `communicare.farm/<slug>` URL
keeps working too — they&apos;re aliases.

The DNS instructions live in two places, kept identical:

- The Web Address tab of the site builder
  (`app/farmer/site/page.tsx::DomainTab`) — for self-serve setup
- This doc — for Lovable, support replies, and the FAQ

If those two ever drift, the site builder is the source of truth
(it&apos;s what a farmer reads first); update this doc to match.

## When a farmer is stuck on DNS

The site builder has a quiet section near the bottom of the Web Address
tab that offers:

> If &ldquo;A record&rdquo; and &ldquo;CNAME&rdquo; mean nothing to you,
> that&apos;s fine — they meant nothing to us once either. Write us and
> a real person will share their screen with you and walk you through
> it. Usually five minutes.

That promise is real — route `domains@communicare.farm` to a human (or
a small triage rotation) and budget five to ten minutes per setup.

## Implementation notes (for whoever wires the routing)

- The static export already serves `communicare.farm/<slug>` for every
  sample farm via `app/(public)/farm/[slug]/page.tsx` with
  `generateStaticParams()`.
- For real farms (the eventual production path), the same route handles
  them — the static generation is replaced with a per-request database
  lookup when running on a Node runtime, or with build-time pre-generation
  refreshed on a daily cron on the static deploy.
- Custom domains route through the same `[slug]` page; the host name is
  looked up against a `domain_aliases` table (`domain → farm_id`) and the
  page renders with the farm&apos;s data.

We have not yet built the `domain_aliases` table or the per-request
lookup. When a farm signs up and configures a custom domain, the
practical workflow today is:

1. Farm enters the domain in the Web Address tab.
2. The form emails `domains@communicare.farm` with the domain + farm
   slug.
3. A human at our end adds the alias to a static config until we ship
   the table.

This is acceptable for the first hundred farms. Past that, build the
table.
