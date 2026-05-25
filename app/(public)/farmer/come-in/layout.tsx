import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Farm operator sign-in",
  description:
    "Sign in to your Communicare farm desk. Google, password, or magic link — whichever's faster.",
  alternates: { canonical: "/farmer/come-in" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": 0 },
  },
};

export default function FarmerComeInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
