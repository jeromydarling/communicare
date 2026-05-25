import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the early circle",
  description:
    "Communicare is opening for the small farms first. Tell us about yours and we'll let you in when there's a seat. No card required, no commitment, just the door.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Join the early circle — Communicare",
    description:
      "A free homepage, the SMS swap loop, the directory neighbors are searching. Nine dollars a month when we open the door.",
    url: "/join",
    type: "website",
  },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
