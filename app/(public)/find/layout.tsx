import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find a farm share near you",
  description:
    "Discover real CSAs, herd shares, pastured meat shares, and pastured egg shares within twenty miles of any US ZIP. Live farms looking for members, listed whether they use Communicare or not.",
  alternates: { canonical: "/find" },
  openGraph: {
    title: "Find a farm share near you — Communicare",
    description:
      "Real farms with shares left for the season. Type a ZIP, we'll show you the farms within twenty miles.",
    url: "/find",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find a farm share near you",
    description:
      "Real farms with shares left for the season. Search by ZIP, send a note in one tap.",
  },
};

export default function FindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
