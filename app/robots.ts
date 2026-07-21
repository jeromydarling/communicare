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
          "/farmer/accounting",
          "/farmer/analytics",
          "/farmer/catch-weight",
          "/farmer/emails",
          "/farmer/herd-share",
          "/farmer/homepage",
          "/farmer/import",
          "/farmer/inventory",
          "/farmer/log",
          "/farmer/members",
          "/farmer/messages",
          "/farmer/onboarding",
          "/farmer/payments",
          "/farmer/roster",
          "/farmer/settings",
          "/farmer/share-cards",
          "/farmer/site",
          "/farmer/sms",
          "/share/",
          "/admin/",
          "/auth/callback",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
