import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/brand-strings";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The agreement between Communicare and the farms and neighbors who use it. Nine dollars a month, monthly contract, no tricks.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Terms of service</div>
      <h1 className="display text-5xl font-medium mb-3">
        The agreement between us.
      </h1>
      <p className="text-soil/60 italic mb-10">
        Written in plain English on purpose. If we changed something you
        should know about, we&apos;ll email you before it takes effect.
      </p>

      <h2>What Communicare is</h2>
      <p>
        Communicare is a small piece of software built by CROS LLC
        (&ldquo;we&rdquo;) that helps a farm run their share program —
        the homepage, the members, the weekly SMS loop, the pickup
        roster, the share cards. Using it is called &ldquo;the
        service.&rdquo;
      </p>

      <h2>Your account</h2>
      <p>
        You must be at least eighteen years old and running a real farm
        or farm share to use Communicare as an operator. You must give
        us a real email and keep it current. You&apos;re responsible for
        what happens on your account, including anything sent from your
        farm&apos;s SMS number.
      </p>

      <h2>The price</h2>
      <p>
        Nine United States dollars per calendar month, charged the day
        you sign up and every month after. If you take Managed Payments
        through us, there is a one percent platform fee on the volume
        we process on your behalf — nothing else. We will never invent
        a new fee without telling every active account first.
      </p>

      <h2>Cancellation and pause</h2>
      <p>
        You can cancel any time from your account settings. Your access
        continues through the end of the billing period you already
        paid for. You can also pause for the season: no bills, no
        texts, dashboard is read-only, and we resume on the date you
        picked. See our <Link href="/refunds">refund policy</Link>{" "}
        for the money side of a cancel.
      </p>

      <h2>Your content, your data</h2>
      <p>
        Everything you put into Communicare — your farm&apos;s story,
        your members, your prices, your journal, your photos — belongs
        to you. We hold a license only as broad as what we need to run
        the service: display, back up, transmit to the members you tell
        us to. That license ends when you cancel. You can pull a full
        JSON of your data from settings any time you want.
      </p>

      <h2>What we won&apos;t do with your data</h2>
      <p>
        We do not sell it. We do not share it with advertising networks.
        We do not use it to train foundation models. We do not put
        sponsored placements on your farm&apos;s page. If we ever break
        one of these, the account holders who paid us nine dollars a
        month should feel betrayed, and they should leave.
      </p>

      <h2>SMS + the Tuesday loop</h2>
      <p>
        Sending SMS through Communicare means agreeing to only text
        members who have given clear opt-in consent (they replied YES
        to a consent message from your Twilio-provided number, and we
        recorded the timestamp). Federal law and carrier rules require
        this. If you text people who did not consent, or if you use the
        SMS system to send spam, we will suspend your access. We do
        not owe you a warning before we do that.
      </p>

      <h2>Uptime, breakage, and limits of liability</h2>
      <p>
        We build carefully and monitor the system, but we cannot
        guarantee the service will never break. If it goes down for
        more than four hours in a calendar month, credit us; if we
        agree, we&apos;ll credit the month back. Beyond that, our
        maximum liability to you for any incident is the total amount
        you paid us in the twelve months before the incident. We
        aren&apos;t liable for indirect damages, lost profits, or the
        consequences of your members not showing up.
      </p>

      <h2>Managed Payments (Stripe Connect)</h2>
      <p>
        If you turn on Managed Payments, you&apos;re also agreeing to
        Stripe&apos;s{" "}
        <a
          href="https://stripe.com/connect-account/legal/full"
          target="_blank"
          rel="noopener noreferrer"
        >
          Connected Account Agreement
        </a>
        . We handle the merchant relationship on your farm&apos;s
        behalf, deduct our one percent platform fee, and pass the rest
        through to your bank. If a member disputes a charge or the
        card fails to authorize, Stripe&apos;s rules apply.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or close an account that&apos;s violating these
        terms, sending unsolicited SMS, or attempting to defraud a
        member. Where we can reach you first with a warning, we will.
        You can close your own account at any time.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        When we change something material — the price, our data
        practices, the SMS rules — we&apos;ll email every active
        account and give you at least thirty days before the change
        takes effect. If you don&apos;t agree with the change, cancel
        before it does.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of Virginia. If there is
        a dispute we cannot resolve by writing, it will be handled in
        the state or federal courts of Virginia.
      </p>

      <h2>Contact</h2>
      <p>
        The address on record for CROS LLC is on file with the state.
        For anything Communicare-related, write us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <p className="text-soil/55 italic text-sm mt-16">
        Last updated: 2026-07-01.{" "}
        <Link href="/privacy" className="text-brick hover:underline">
          Privacy →
        </Link>
      </p>
    </article>
  );
}
