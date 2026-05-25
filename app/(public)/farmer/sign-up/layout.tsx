import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start your farm desk",
  description:
    "Set up your Communicare account in two minutes. A free homepage, the SMS swap loop, the directory neighbors are searching. Nine dollars a month, no setup, no contract.",
  alternates: { canonical: "/farmer/sign-up" },
};

export default function FarmerSignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
