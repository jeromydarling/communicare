import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/brand-strings";
import { CROS_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support — write to a person",
  description:
    "One address, one inbox, one person. Real hours, honest response times.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Support</div>
      <h1 className="display text-5xl md:text-6xl font-medium leading-tight mb-6">
        Write to a person.
      </h1>
      <p className="text-lg text-soil/75 leading-relaxed mb-10">
        Communicare is small, on purpose. When you write to us, a person
        reads it, and a person answers. Not a bot, not a tier-one queue,
        not a &ldquo;kindly bear with us&rdquo; auto-reply.
      </p>

      <div className="paper p-8 mb-10">
        <div className="small-caps text-xs text-brick mb-2">
          The one address
        </div>
        <div className="display text-2xl md:text-3xl font-medium mb-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-brick hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        <p className="text-sm text-soil/70">
          Questions, bugs, feature ideas, story of the year — all one
          inbox. We answer inside a business day, usually inside a few
          hours during the eastern-time workday.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card
          title="Something is broken"
          body="Tell us what you were doing when it broke, what you expected, and what happened. If you can, include the ZIP or the farm slug so we can look at your account."
        />
        <Card
          title="Something is wrong"
          body="If we said we'd never do something and then we did, tell us. The manifesto is a promise. We want to know when we've broken it."
        />
        <Card
          title="A feature would help"
          body="Small farms already told us most of what to build. If we're missing something you need, that's how the next thing gets on the list."
        />
        <Card
          title="You want to talk"
          body="We're not on Twitter or LinkedIn much. Email is where we live. If you'd like a real call, ask — we'll pick a time."
        />
      </div>

      <div className="rule my-12" />

      <div className="text-sm text-soil/70 leading-relaxed">
        <p>
          <strong>Related pages:</strong>{" "}
          <Link href="/manifesto" className="text-brick hover:underline">
            Why we built this
          </Link>
          {" · "}
          <Link href="/privacy" className="text-brick hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-brick hover:underline">
            Terms
          </Link>
          {" · "}
          <Link href="/refunds" className="text-brick hover:underline">
            Refunds
          </Link>
          .
        </p>
        <p className="mt-3 italic text-soil/55">
          Communicare is one of the{" "}
          <a
            href={CROS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brick hover:underline"
          >
            CROS
          </a>{" "}
          family of apps. The same inbox handles all of them.
        </p>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-soil/15 rounded p-5">
      <div className="display text-lg font-medium mb-2">{title}</div>
      <p className="text-sm text-soil/70 leading-relaxed">{body}</p>
    </div>
  );
}
