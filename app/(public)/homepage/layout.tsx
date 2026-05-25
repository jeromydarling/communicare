import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draft a homepage for your farm — free",
  description:
    "Paste a few honest sentences about what you grow and how members pick up. We draft you a homepage in your own voice — no marketing copy, no stock photos, no template smell. Free to try, yours to keep.",
  alternates: { canonical: "/homepage" },
  openGraph: {
    title: "Draft a homepage for your farm — Communicare",
    description:
      "Type a few sentences about your farm, get a homepage back that sounds like you wrote it. Free to try; yours to keep either way.",
    url: "/homepage",
    type: "website",
  },
};

export default function HomepageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
