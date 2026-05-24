// Sitemap covering the public marketing surface. Dashboards are not
// indexable (auth-gated). Includes every farm + journal entry.
import type { MetadataRoute } from "next";
import { sampleFarms } from "@/lib/sample-farms";
import { journalEntries } from "@/lib/journal-entries";

// Required for `output: 'export'` so Next bakes the sitemap at build time
// instead of generating per-request.
export const dynamic = "force-static";

const BASE = "https://jeromydarling.github.io/communicare";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/manifesto",
    "/homepage",
    "/find",
    "/come-in",
    "/join",
    "/demo",
  ];

  const farmRoutes = sampleFarms.flatMap((f) => [
    `/farm/${f.slug}`,
    `/farm/${f.slug}/subscribe`,
    `/farm/${f.slug}/journal`,
  ]);

  const journalRoutes = journalEntries.map(
    (e) => `/farm/${e.farmSlug}/journal/${e.slug}`,
  );

  return [...staticRoutes, ...farmRoutes, ...journalRoutes].map((path) => ({
    url: `${BASE}${path}/`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
