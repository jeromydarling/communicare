import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  DEFAULT_OG_IMAGE,
  ORG_JSON_LD,
} from "@/lib/site";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const body = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase().replace(/\.$/, "")}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  publisher: "CROS",
  keywords: [
    "CSA",
    "community supported agriculture",
    "farm share",
    "herd share",
    "raw milk",
    "pastured meat",
    "small farm software",
    "farm CRM",
    "farm management",
    "farm directory",
    "find a CSA",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Helpful when the homepage is the default crawl entry
  category: "agriculture",
};

// Root layout is intentionally bare — just html/body + fonts. The
// public Nav + Footer live in app/(public)/layout.tsx so the farmer
// and member dashboards can take over the whole viewport.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-parchment text-soil">
        {/* Public env shim. Loads window.__COMMUNICARE_PUBLIC_ENV__ from
            /api/public-env.js, which the Worker fills in from its env
            (set via `wrangler secret put MAPBOX_TOKEN` etc.). We tried
            inlining via Next's NEXT_PUBLIC_* mechanism and it silently
            shipped empty strings into the client bundle; this route is
            the durable fix. Sync <script> so the values land before any
            consumer module evaluates. */}
        <script src="/api/public-env.js" />
        {/* Site-wide Organization structured data — appears on every page so
            crawlers know what entity this is. Per-page JSON-LD layers on top
            of this on /farm/[slug], /manifesto, and the homepage. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
