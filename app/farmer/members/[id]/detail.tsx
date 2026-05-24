"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/farmer/shell";
import {
  demoMembers,
  demoSms,
  demoOrders,
  formatCents,
} from "@/lib/farmer-demo";
import { Sun } from "@/components/mark";

export function MemberDetail({ id }: { id: string }) {
  const router = useRouter();
  const member = demoMembers.find((m) => m.id === id);

  if (!member) {
    return (
      <div className="px-6 md:px-10 py-16 text-center">
        <Sun className="w-12 h-12 text-wheat mx-auto mb-4 opacity-60" />
        <h2 className="display text-2xl font-medium mb-2">
          That member isn&apos;t in the demo set.
        </h2>
        <p className="text-soil/65 italic mb-6">
          The full directory is at{" "}
          <Link href="/farmer/members/" className="text-brick hover:underline">
            /farmer/members
          </Link>
          .
        </p>
      </div>
    );
  }

  const threads = demoSms.filter((m) => m.member === member.display_name);
  const orders = demoOrders.filter((o) => o.member === member.display_name);
  const lifetime = orders.reduce((s, o) => s + o.total_cents, 0);

  const statusColor =
    member.status === "active"
      ? "text-mossDark bg-moss/15"
      : member.status === "paused"
        ? "text-wheatDark bg-wheat/20"
        : "text-brickDark bg-brick/15";

  return (
    <div>
      <div className="px-6 md:px-10 pt-6">
        <button
          type="button"
          onClick={() => router.push("/farmer/members/")}
          className="text-sm display italic text-soil/65 hover:text-brick"
        >
          ← All members
        </button>
      </div>

      <PageHeader
        eyebrow={`Member since ${formatJoined(member.joined_on)}`}
        title={member.display_name}
        subtitle={`${member.email} · ${member.share_name} · ${member.pickup_site}`}
        action={
          <div className="flex gap-2">
            <button className="btn btn-ghost text-sm">Text member</button>
            <button className="btn btn-primary text-sm">Edit subscription</button>
          </div>
        }
      />

      <div className="px-6 md:px-10 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          <div className="grid sm:grid-cols-4 gap-4">
            <Stat label="Status" value={member.status} pillClass={statusColor} />
            <Stat label="Credit balance" value={formatCents(member.credit_balance_cents)} />
            <Stat label="Lifetime spent" value={formatCents(lifetime || 51800)} />
            <Stat label="Shares delivered" value={String(orders.length || 14)} />
          </div>

          <section className="paper p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="small-caps text-xs text-brick mb-1">
                  Recent shares
                </div>
                <h2 className="display text-2xl font-medium">
                  What they&apos;ve received.
                </h2>
              </div>
            </div>

            <ul className="divide-y divide-soil/10">
              {(orders.length > 0
                ? orders
                : [
                    {
                      id: "p1",
                      member: member.display_name,
                      pickup_site: member.pickup_site,
                      pickup_date: "May 21",
                      status: "picked_up" as const,
                      total_cents: 3600,
                      items: ["kale", "carrots", "eggs", "tomatoes"],
                    },
                    {
                      id: "p2",
                      member: member.display_name,
                      pickup_site: member.pickup_site,
                      pickup_date: "May 14",
                      status: "picked_up" as const,
                      total_cents: 3600,
                      items: ["beets", "eggs", "lettuce", "snap peas"],
                    },
                    {
                      id: "p3",
                      member: member.display_name,
                      pickup_site: member.pickup_site,
                      pickup_date: "May 7",
                      status: "donated" as const,
                      total_cents: 3600,
                      items: ["donated to food pantry"],
                    },
                  ]
              ).map((o) => (
                <li key={o.id} className="py-3 flex items-center gap-4">
                  <div className="display text-soil/55 w-20">{o.pickup_date}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{o.items.join(", ")}</div>
                    <div className="text-[11px] text-soil/55 italic capitalize">
                      {o.pickup_site} · {o.status.replace("_", " ")}
                    </div>
                  </div>
                  <div className="display text-sm">
                    {formatCents(o.total_cents)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="paper p-7">
            <div className="small-caps text-xs text-brick mb-2">
              Staff notes
            </div>
            <h2 className="display text-xl font-medium mb-3">
              What we know about {member.display_name.split(" ")[0]}.
            </h2>
            <ul className="space-y-3 text-sm text-soil/80">
              <li className="border-l-2 border-wheat pl-4">
                Allergic to walnuts (told us in April). Don&apos;t put walnuts
                in the recipe email to this address.
              </li>
              <li className="border-l-2 border-wheat pl-4">
                Always picks up at Donkey Coffee, never the farm. Prefers
                Wednesday morning.
              </li>
              <li className="border-l-2 border-wheat pl-4">
                Has two kids who love cherry tomatoes. Send an extra pint in
                August when we have a surplus.
              </li>
            </ul>
            <button className="mt-5 text-sm display italic text-brick hover:underline">
              + Add a note
            </button>
          </section>

          {threads.length > 0 && (
            <section className="paper p-7">
              <div className="small-caps text-xs text-brick mb-2">
                Recent messages
              </div>
              <h2 className="display text-xl font-medium mb-5">
                What they&apos;ve said.
              </h2>
              <div className="space-y-3">
                {threads.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                        m.direction === "outbound"
                          ? "bg-soil text-parchment rounded-br-sm"
                          : "bg-cream text-soil rounded-bl-sm"
                      }`}
                    >
                      {m.body}
                      <div
                        className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-parchment/55" : "text-soil/45"}`}
                      >
                        {m.at}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/farmer/messages/"
                className="display italic text-brick hover:underline text-sm mt-5 inline-block"
              >
                Open the full thread →
              </Link>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="paper p-5">
            <div className="small-caps text-[10px] text-brick mb-3">
              Quick actions
            </div>
            <div className="space-y-2 text-sm">
              <ActionBtn label="Text member" />
              <ActionBtn label="Issue $20 credit" />
              <ActionBtn label="Pause subscription" />
              <ActionBtn label="Change pickup site" />
              <ActionBtn label="Refund a share" />
            </div>
          </div>

          <div className="paper p-5">
            <div className="small-caps text-[10px] text-brick mb-3">
              Subscription
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-soil/55">Share</dt>
                <dd className="display">{member.share_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-soil/55">Billing</dt>
                <dd className="display">Monthly</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-soil/55">Next charge</dt>
                <dd className="display">Jun 1 · $144</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-soil/55">Card on file</dt>
                <dd className="display">•••• 4421</dd>
              </div>
            </dl>
          </div>

          <div className="paper p-5 bg-brick/5 border-brick/30">
            <div className="small-caps text-[10px] text-brickDark mb-2">
              Danger
            </div>
            <button className="text-sm display italic text-brick hover:underline">
              Cancel this subscription
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  pillClass,
}: {
  label: string;
  value: string;
  pillClass?: string;
}) {
  return (
    <div className="paper p-5">
      <div className="small-caps text-[10px] text-soil/55 mb-2">{label}</div>
      {pillClass ? (
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs small-caps capitalize ${pillClass}`}
        >
          {value}
        </span>
      ) : (
        <div className="display text-2xl font-medium">{value}</div>
      )}
    </div>
  );
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="w-full text-left px-3 py-2 rounded hover:bg-cream transition-colors text-soil/85"
    >
      {label}
    </button>
  );
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
