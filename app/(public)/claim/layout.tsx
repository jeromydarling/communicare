import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim your listing",
  description:
    "Communicare's farm directory found your farm and your neighbors are reaching out. Claim the listing to take over the keys, get the inquiries, and (if you want) the rest of the tools.",
  alternates: { canonical: "/claim" },
  // Each /claim?slug=... is unique per farm. Robots can index the
  // canonical no-arg page but the slug variants are query-string only,
  // which Google generally ignores for indexing.
  robots: { index: true, follow: true },
};

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
