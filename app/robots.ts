// Robots policy. Public marketing + auth landings indexable; dashboards
// behind auth + the OAuth callback excluded.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/farmer/inventory",
          "/farmer/members",
          "/farmer/messages",
          "/farmer/payments",
          "/farmer/roster",
          "/farmer/settings",
          "/farmer/site",
          "/farmer/herd-share",
          "/farmer/share-cards",
          "/farmer/roster",
          "/farmer/analytics",
          "/farmer/emails",
          "/farmer/accounting",
          "/farmer/log",
          "/farmer/catch-weight",
          "/farmer/import",
          "/share/",
          "/auth/callback",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
