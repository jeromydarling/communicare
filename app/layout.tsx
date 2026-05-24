import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const body = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Communicare — for the farms that feed us",
  description:
    "A small, slow-built tool for farm shares and the neighbors they feed. Magic-link login, no contracts, $9 a month, free AI-generated homepage. A gift to the small farms that hold the country together.",
  openGraph: {
    title: "Communicare",
    description:
      "For the farms that feed us. $9/month. No contracts. A free homepage. Members order by texting back.",
    type: "website",
  },
};

// Root layout is intentionally bare — just html/body + fonts. The
// public Nav + Footer live in app/(public)/layout.tsx so the farmer
// and member dashboards can take over the whole viewport.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-parchment text-soil">{children}</body>
    </html>
  );
}
