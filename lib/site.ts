// =============================================================================
// Site-wide constants used by metadata, sitemap, robots, JSON-LD, and
// outbound emails. One file, one source of truth.
// =============================================================================

const explicit = process.env.NEXT_PUBLIC_SITE_URL;

// Order of precedence:
//   1. NEXT_PUBLIC_SITE_URL (explicit override, e.g. a preview deploy)
//   2. The canonical production domain
//   3. Local dev default
export const SITE_URL = (
  explicit ??
  "https://mycommuni.care"
).replace(/\/+$/, "");

export const SITE_NAME = "Communicare";

export const SITE_DESCRIPTION =
  "A small, slow-built tool for farm shares and the neighbors they feed. Members order by texting back. Farms get a free homepage, the SMS swap loop, and the directory neighbors are searching. Nine dollars a month, no contracts.";

export const SITE_TAGLINE = "For the farms that feed us.";

// The Twitter/X handle, if we have one. Used in OG cards.
export const TWITTER_HANDLE = "";

// Absolute URL helper — handles trailing slashes correctly.
export function url(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

// Default OG image. Static export means we can't generate per-page OG
// images at request time; this is the universal fallback. Farm pages
// override with their own image when available.
export const DEFAULT_OG_IMAGE = "/og/default.jpg";

export const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  slogan: SITE_TAGLINE,
  knowsAbout: [
    "Community Supported Agriculture",
    "CSA",
    "Herd shares",
    "Raw milk",
    "Pastured meat",
    "Direct-to-consumer farms",
    "Farm software",
  ],
};
