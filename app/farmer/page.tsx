"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/farmer/shell";
import {
  demoFarm,
  demoOrders,
  demoSms,
  demoProducts,
  formatCents,
} from "@/lib/farmer-demo";
import { Sun, Wheat, Leaf } from "@/components/mark";
import { getMeWithFarm } from "@/lib/farmer/api";

export default function FarmerHomePage() {
  // First-five-minutes guard: if the operator is signed in but hasn't
  // finished onboarding, send them back into the wizard before they see
  // an empty dashboard. The AuthGate has already verified there's a real
  // session by the time this runs.
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getMeWithFarm();
      if (cancelled) return;
      if (!("ok" in me) || !me.ok) return; // anon / demo — let it render
      if (!me.farm || !me.farm.onboarded_at) {
        router.replace("/farmer/onboarding/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const today = demoOrders.filter((o) => o.pickup_date === "today");
  const confirmed = today.filter((o) => o.status === "confirmed").length;
  const packed = today.filter((o) => o.status === "packed").length;
  const noShow = today.filter((o) => o.status === "no_show").length;
  const soldOut = demoProducts.filter((p) => p.is_sold_out).length;
  const recentMessages = demoSms.slice(0, 4);
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader
        eyebrow={todayLabel}
        title="Today on the farm."
        subtitle={`${demoFarm.active_members} active members. ${today.length} shares to pack.`}
        action={
          <Link href="/farmer/roster/" className="btn btn-primary">
            Open the pickup roster →
          </Link>
        }
      />

      <div className="px-6 md:px-10 py-8 grid md:grid-cols-3 gap-6">
        <Stat label="Active members" value={demoFarm.active_members.toString()} icon={<Sun className="w-7 h-7 text-wheat" />} />
        <Stat
          label="This week's revenue"
          value={formatCents(demoFarm.weekly_revenue_cents)}
          icon={<Wheat className="w-7 h-9 text-wheatDark" />}
        />
        <Stat
          label="Unread messages"
          value={demoFarm.unread_messages.toString()}
          icon={<Leaf className="w-7 h-7 text-mossDark" />}
          href="/farmer/messages/"
        />
      </div>

      <div className="px-6 md:px-10 grid md:grid-cols-3 gap-6 pb-12">
        <div className="md:col-span-2 paper p-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="small-caps text-xs text-brick mb-1">
                Today's pickup roster
              </div>
              <h2 className="display text-2xl font-medium">
                {today.length} shares, three sites.
              </h2>
            </div>
            <Link
              href="/farmer/roster/"
              className="display italic text-sm text-brick hover:underline"
            >
              See all →
            </Link>
          </div>

          <ul className="divide-y divide-soil/10">
            {today.map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-4">
                <StatusDot status={o.status} />
                <div className="flex-1 min-w-0">
                  <div className="display">{o.member}</div>
                  <div className="text-xs text-soil/55">
                    {o.pickup_site} · {o.items.join(", ")}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="display">{formatCents(o.total_cents)}</div>
                  <div className="text-xs text-soil/55 italic capitalize">
                    {o.status.replace("_", " ")}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Tag color="moss">{confirmed} confirmed</Tag>
            <Tag color="wheat">{packed} packed</Tag>
            {noShow > 0 && <Tag color="brick">{noShow} no-show — text them?</Tag>}
          </div>
        </div>

        <div className="paper p-8">
          <div className="small-caps text-xs text-brick mb-1">
            Recent messages
          </div>
          <h2 className="display text-xl font-medium mb-5">
            From your members.
          </h2>

          <ul className="space-y-4">
            {recentMessages.map((m) => (
              <li key={m.id} className="text-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="display">{m.member}</span>
                  <span className="text-[11px] text-soil/45">{m.at}</span>
                </div>
                <p
                  className={
                    m.direction === "inbound"
                      ? "text-soil/85"
                      : "text-soil/55 italic"
                  }
                >
                  {m.direction === "outbound" ? "→ " : "← "}
                  {m.body}
                </p>
              </li>
            ))}
          </ul>

          <Link
            href="/farmer/messages/"
            className="display italic text-sm text-brick hover:underline mt-5 inline-block"
          >
            Open the inbox →
          </Link>
        </div>
      </div>

      {soldOut > 0 && (
        <div className="px-6 md:px-10 pb-12">
          <div className="paper p-6 bg-wheat/10 border-wheat/40 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="display text-lg">
                {soldOut} item{soldOut === 1 ? "" : "s"} sold out
              </div>
              <div className="text-sm text-soil/65">
                The web store has stopped accepting new orders for those items.
              </div>
            </div>
            <Link href="/farmer/inventory/" className="btn btn-ghost text-sm">
              Open inventory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="paper p-6 flex items-center gap-5 hover:-translate-y-0.5 transition-transform">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="display text-3xl font-medium leading-none">{value}</div>
        <div className="text-xs text-soil/55 small-caps mt-1">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "packed"
      ? "bg-moss"
      : status === "picked_up"
        ? "bg-mossDark"
        : status === "no_show"
          ? "bg-brick"
          : status === "donated"
            ? "bg-wheatDark"
            : "bg-wheat";
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

function Tag({
  color,
  children,
}: {
  color: "moss" | "wheat" | "brick";
  children: React.ReactNode;
}) {
  const bg =
    color === "moss"
      ? "bg-moss/15 text-mossDark"
      : color === "wheat"
        ? "bg-wheat/20 text-wheatDark"
        : "bg-brick/15 text-brickDark";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full ${bg}`}>
      {children}
    </span>
  );
}
