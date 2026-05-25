import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Come in",
  description:
    "Sign in to your CSA, herd-share, or meat-share account. Magic link only — no password to remember, no password to lose.",
  alternates: { canonical: "/come-in" },
  robots: {
    // Sign-in pages are public but not content. Index for brand searches,
    // but don't snippet the form copy.
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": 0 },
  },
};

export default function ComeInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
