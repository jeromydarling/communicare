import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/brand-strings";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "Full refund within 14 days. After that, cancel any time and keep what you already paid for.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <article className="prose prose-slate max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Refunds</div>
      <h1 className="display text-5xl font-medium mb-3">
        The honest refund policy.
      </h1>
      <p className="text-soil/60 italic mb-10">
        Two rules, no surprises.
      </p>

      <h2>Within fourteen days</h2>
      <p>
        If it&apos;s been fourteen days or less since your most recent
        charge, we&apos;ll refund it in full, no questions asked. Reply
        to your Stripe receipt or write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we
        will do it the same day.
      </p>

      <h2>After fourteen days</h2>
      <p>
        We keep the last month&apos;s payment and cancel you at the end
        of the current billing period. You keep everything you already
        paid for through the end of that period. We don&apos;t claw
        back prorated dollars, but we don&apos;t refund them either.
      </p>

      <h2>Managed Payments (the 1% platform fee)</h2>
      <p>
        If your subscriber refunds a member, we refund our 1% platform
        fee on that transaction automatically. Stripe processing fees
        may or may not be refundable — that&apos;s Stripe&apos;s policy,
        not ours.
      </p>

      <h2>How to ask</h2>
      <p>
        Cancel from your account settings — you&apos;ll get one honest
        note from us with a link to your full data export. If you want
        the refund on top of that, reply to it, or write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> in the
        same window. Either lands with a person.
      </p>

      <p className="text-soil/55 italic text-sm mt-16">
        Last updated: 2026-07-01.{" "}
        <Link href="/terms" className="text-brick hover:underline">
          Terms of service →
        </Link>
      </p>
    </article>
  );
}
