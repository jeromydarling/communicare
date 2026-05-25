// Sitemap covering the public marketing surface. Dashboards (/farmer/*,
// /share/*) are auth-gated and not indexable. Auth-only pages
// (/auth/callback, /farmer/forgot-password, /farmer/reset-password) are
// excluded — they're not content pages.
import type { MetadataRoute } from "next";
import { sampleFarms } from "@/lib/sample-farms";
import { journalEntries } from "@/lib/journal-entries";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static marketing routes worth indexing. The auth landing pages
  // (/come-in, /farmer/come-in, /farmer/sign-up) are intentionally in
  // here at low priority — somebody searching "communicare sign in"
  // should find them.
  const staticRoutes: Array<[string, number, "weekly" | "monthly"]> = [
    ["", 1.0, "weekly"],
    ["/manifesto", 0.9, "monthly"],
    ["/find", 0.95, "weekly"],
    ["/homepage", 0.7, "monthly"],
    ["/join", 0.8, "weekly"],
    ["/demo", 0.6, "monthly"],
    ["/come-in", 0.3, "monthly"],
    ["/farmer/come-in", 0.3, "monthly"],
    ["/farmer/sign-up", 0.5, "monthly"],
  ];

  const farmRoutes: Array<[string, number, "weekly" | "monthly"]> =
    sampleFarms.flatMap((f) => [
      [`/farm/${f.slug}`, 0.85, "weekly"],
      [`/farm/${f.slug}/subscribe`, 0.7, "weekly"],
      [`/farm/${f.slug}/journal`, 0.6, "weekly"],
    ]);

  const journalRoutes: Array<[string, number, "weekly" | "monthly"]> =
    journalEntries.map((e) => [
      `/farm/${e.farmSlug}/journal/${e.slug}`,
      0.5,
      "monthly",
    ]);

  return [...staticRoutes, ...farmRoutes, ...journalRoutes].map(
    ([path, priority, freq]) => ({
      url: `${SITE_URL}${path}/`,
      lastModified: now,
      changeFrequency: freq,
      priority,
    }),
  );
}
