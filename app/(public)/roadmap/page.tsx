import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/brand-strings";

export const metadata: Metadata = {
  title: "Roadmap — what we're building, in order",
  description:
    "The public plan for what comes next. No investor slides; just an honest list.",
  alternates: { canonical: "/roadmap" },
};

type Item = {
  status: "done" | "now" | "next" | "later";
  title: string;
  detail: string;
};

const ITEMS: Item[] = [
  { status: "done", title: "The homepage drafter", detail: "Six questions in your voice; we draft a farm page." },
  { status: "done", title: "The find-a-farm directory", detail: "ZIP-based discovery of real CSAs, herd shares, meat shares." },
  { status: "done", title: "The Tuesday text loop", detail: "One SMS per member per week. Reply YES / SKIP / PAUSE / swap." },
  { status: "done", title: "Members import", detail: "CSV mapper from Barn2Door, Local Line, Harvie, or a spreadsheet." },
  { status: "done", title: "Stripe billing + Managed Payments", detail: "$9/mo platform, optional 1% Connect for taking money on your behalf." },
  { status: "done", title: "Seasonal pause + data export", detail: "Pause in winter, unpause in spring. Full JSON export any time." },

  { status: "now", title: "First paying farm", detail: "Onboard a real farm end-to-end. Every bug they hit is documented and fixed same week." },
  { status: "now", title: "Herd-share compliance reminders", detail: "State milk-test due dates, boarding-fee renewals, contract expirations." },

  { status: "next", title: "Catch-weight billing that actually works", detail: "Deposit → butcher → hanging weight → auto-charge the difference. For meat farms." },
  { status: "next", title: "Share cards + printable QR posters", detail: "Two-tap Instagram graphics of this week's share; a market-stand QR poster." },
  { status: "next", title: "Bring-your-own domain", detail: "Point yourfarm.com at your Communicare page." },
  { status: "next", title: "Two-way SMS conversations with members", detail: "Beyond the Tuesday loop — a real threaded inbox per member." },

  { status: "later", title: "Web store for non-share products", detail: "For farms that sell one-off boxes or events, not just recurring shares." },
  { status: "later", title: "Delivery-driver mode", detail: "For farms that drop shares to homes rather than to a pickup site." },
  { status: "later", title: "Multi-farm collectives", detail: "For neighboring farms that share pickup sites or bundle boxes together." },
];

export default function RoadmapPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Roadmap</div>
      <h1 className="display text-5xl md:text-6xl font-medium leading-tight mb-4">
        What we&apos;re building, in order.
      </h1>
      <p className="text-lg text-soil/70 italic leading-relaxed mb-14">
        No investor slides. No feature parity race. The list is short on
        purpose. If you keep a farm and something isn&apos;t here that you
        need, write us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brick hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        — that&apos;s how the next thing gets on the list.
      </p>

      {(["done", "now", "next", "later"] as const).map((bucket) => (
        <Bucket
          key={bucket}
          heading={
            {
              done: "Shipped",
              now: "In progress",
              next: "Next up",
              later: "Later, if the road leads there",
            }[bucket]
          }
          items={ITEMS.filter((i) => i.status === bucket)}
        />
      ))}

      <div className="rule my-16" />

      <p className="text-sm text-soil/60 leading-relaxed italic">
        Communicare will always be a tool, not a platform.{" "}
        <Link href="/manifesto" className="text-brick hover:underline">
          Read why
        </Link>
        . This roadmap will never contain a line about ads, upsells, an
        &ldquo;enterprise tier,&rdquo; or turning the software into a lead
        generator for something else.
      </p>
    </div>
  );
}

function Bucket({
  heading,
  items,
}: {
  heading: string;
  items: Item[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="display text-2xl font-medium mb-5">{heading}</h2>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 items-start">
            <StatusMark status={item.status} />
            <div className="flex-1">
              <div className="display text-lg font-medium leading-tight">
                {item.title}
              </div>
              <div className="text-sm text-soil/70 mt-1 leading-relaxed">
                {item.detail}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusMark({ status }: { status: Item["status"] }) {
  if (status === "done") {
    return (
      <div className="w-6 h-6 rounded-full bg-mossDark text-parchment display text-xs grid place-items-center shrink-0 mt-0.5">
        ✓
      </div>
    );
  }
  if (status === "now") {
    return (
      <div className="w-6 h-6 rounded-full bg-brick text-parchment display text-xs grid place-items-center shrink-0 mt-0.5 animate-pulse">
        ●
      </div>
    );
  }
  if (status === "next") {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-brick text-brick display text-xs grid place-items-center shrink-0 mt-0.5" />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full border-2 border-dashed border-soil/30 shrink-0 mt-0.5" />
  );
}
