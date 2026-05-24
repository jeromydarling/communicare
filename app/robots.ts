// Robots: allow everything. Sitemap at /sitemap.xml.
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://jeromydarling.github.io/communicare/sitemap.xml",
  };
}
