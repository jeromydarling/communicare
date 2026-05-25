import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  alternates: { canonical: "/farmer/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
