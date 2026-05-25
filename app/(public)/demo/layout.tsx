import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try the dashboard with sample data",
  description:
    "Poke around a working Communicare farm desk — sample members, sample orders, sample SMS conversations. No sign-up required, no card.",
  alternates: { canonical: "/demo" },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
