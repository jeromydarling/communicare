"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { demoOrders, formatCents } from "@/lib/farmer-demo";

type Order = (typeof demoOrders)[number];

export default function FarmerRosterPage() {
  const [orders, setOrders] = useState<Order[]>(demoOrders);

  function setStatus(id: string, status: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  // Group by pickup site
  const sites = Array.from(new Set(orders.map((o) => o.pickup_site)));

  const picked = orders.filter((o) => o.status === "picked_up").length;
  const remaining = orders.length - picked;

  return (
    <div>
      <PageHeader
        eyebrow="Tuesday, in the field"
        title="Pickup roster."
        subtitle={`${picked} of ${orders.length} picked up · ${remaining} to go.`}
      />

      <div className="px-4 md:px-10 py-6">
        {sites.map((site) => {
          const siteOrders = orders.filter((o) => o.pickup_site === site);
          return (
            <section key={site} className="mb-10">
              <div className="flex items-end justify-between mb-3 px-2 md:px-0">
                <h2 className="display text-2xl font-medium">{site}</h2>
                <span className="text-sm text-soil/55 italic">
                  {siteOrders.length} share{siteOrders.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="paper overflow-hidden">
                <ul className="divide-y divide-soil/10">
                  {siteOrders.map((o) => (
                    <RosterRow
                      key={o.id}
                      order={o}
                      onStatus={(s) => setStatus(o.id, s)}
                    />
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

        <p className="text-center text-xs text-soil/55 italic mt-12 mb-8">
          Long-press a member's row to text them. Long-press a no-show to
          donate their share. We promise it'll feel less like software.
        </p>
      </div>
    </div>
  );
}

function RosterRow({
  order,
  onStatus,
}: {
  order: Order;
  onStatus: (s: Order["status"]) => void;
}) {
  const picked = order.status === "picked_up";
  return (
    <li
      className={`px-4 md:px-6 py-4 flex items-center gap-4 transition-colors ${
        picked ? "bg-moss/5" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={picked}
        onChange={() => onStatus(picked ? "confirmed" : "picked_up")}
        className="w-5 h-5 accent-mossDark cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div
          className={`display text-lg leading-tight ${picked ? "line-through text-soil/55" : ""}`}
        >
          {order.member}
        </div>
        <div className="text-xs text-soil/55 italic truncate">
          {order.items.join(" · ")}
        </div>
      </div>
      <div className="text-right text-sm shrink-0">
        <div className="display">{formatCents(order.total_cents)}</div>
        <div className="text-[11px] text-soil/55 capitalize italic">
          {order.status.replace("_", " ")}
        </div>
      </div>
      {order.status === "no_show" ? (
        <button
          type="button"
          onClick={() => onStatus("donated")}
          className="btn-ghost border border-wheatDark text-wheatDark text-xs px-3 py-1 rounded-full hover:bg-wheatDark hover:text-parchment transition-colors shrink-0"
        >
          Donate
        </button>
      ) : (
        <button
          type="button"
          className="text-xs text-soil/45 hover:text-brick px-2 shrink-0"
          title="Text the member"
        >
          Text
        </button>
      )}
    </li>
  );
}
