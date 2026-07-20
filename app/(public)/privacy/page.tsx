import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/brand-strings";
import { CROS_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — what we hold, and what we don't",
  description:
    "We hold as little as we need to run your farm's account. No ads, no data sold. Ever.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Privacy</div>
      <h1 className="display text-5xl font-medium mb-3">
        What we hold, and what we don&apos;t.
      </h1>
      <p className="text-soil/60 italic mb-10">
        A plain reading of how Communicare handles the data of the farmers
        and neighbors who use it. If a lawyer helped write this, it&apos;s
        because we asked them to; the voice is ours.
      </p>

      <h2>What we collect</h2>
      <p>
        The minimum to run your farm&apos;s account: your email, the name
        you gave us, your farm&apos;s name and location, any share
        definitions you configured, the phone numbers of members who
        opted in to your SMS line, and the messages that pass between you
        and them. We keep a log of every text sent and received through
        Communicare because federal SMS rules require it and because your
        farm may need to look one up.
      </p>

      <h2>What we don&apos;t collect</h2>
      <p>
        We do not run behavioral advertising. We do not embed ad-network
        pixels, third-party analytics with device fingerprinting, or any
        tracker that follows a visitor across the open web. There is no
        cookie set for marketing. The one cookie we set (
        <code>__Host-cmcr_session</code>) is what keeps you signed in;
        it&apos;s HttpOnly, SameSite=Strict, and lasts thirty days.
      </p>

      <h2>Who else sees your data</h2>
      <p>We use a small number of vendors, each for one clear job:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosts the site, the database, the
          email service, and the SMS routing at the edge. Everything you
          type into Communicare lives on Cloudflare&apos;s infrastructure.
        </li>
        <li>
          <strong>Stripe</strong> — takes payment. We never see or store
          card numbers; Stripe holds them.
        </li>
        <li>
          <strong>Twilio</strong> — sends SMS. Every text your members
          receive goes through Twilio&apos;s network to their carrier.
        </li>
        <li>
          <strong>Anthropic + Cloudflare Workers AI</strong> — drafts
          your homepage when you ask us to, and translates system emails
          into Spanish. The prompts we send them include only what you
          typed into the homepage form; we do not train models on your
          data.
        </li>
        <li>
          <strong>Perplexity + Mapbox</strong> — power the ZIP-search on
          the public directory. Your farm&apos;s public listing is the
          only thing we send them.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can download a complete JSON of every row we hold about you
        from your account settings, at any time — not just at cancel.
        You can ask us to delete your account by canceling and, if you
        want your data purged rather than kept for accounting, writing
        to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We
        will confirm within a week and complete the deletion within
        thirty days.
      </p>

      <h2>How long we keep things</h2>
      <p>
        Active account data lives as long as your account does. If you
        cancel, we keep the audit-trail rows Stripe and the FCC require
        us to keep (billing history, SMS delivery logs) for seven years,
        and delete everything else on request. If we go out of business,
        we will migrate your data to a comparable tool, or return it to
        you and delete our copies. Which one, we&apos;ll tell you before
        it happens.
      </p>

      <h2>Children</h2>
      <p>
        Communicare is a tool for adults running a business. We do not
        knowingly collect data about children under thirteen. If you
        think we have, write us and we will delete it.
      </p>

      <h2>Changes to this page</h2>
      <p>
        When we change what we hold or who else sees it, we&apos;ll
        update this page and email every active account. We won&apos;t
        add a tracker without saying so first.
      </p>

      <h2>Getting in touch</h2>
      <p>
        Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        — it goes to a person, not a bot. Communicare is one of the{" "}
        <a href={CROS_URL} target="_blank" rel="noopener noreferrer">
          CROS
        </a>{" "}
        family of apps; the same practices apply across all of them.
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
