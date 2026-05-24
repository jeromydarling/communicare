"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { demoMembers, formatCents } from "@/lib/farmer-demo";

export default function FarmerMembersPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "cancelled"
  >("all");

  const filtered = useMemo(() => {
    return demoMembers.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        m.display_name.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle) ||
        m.share_name.toLowerCase().includes(needle)
      );
    });
  }, [q, statusFilter]);

  const totalCredit = demoMembers.reduce(
    (s, m) => s + m.credit_balance_cents,
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Your members"
        title="The people you're feeding."
        subtitle={`${demoMembers.length} on the books · ${formatCents(totalCredit)} held as credit.`}
        action={
          <button type="button" className="btn btn-primary">
            + Invite
          </button>
        }
      />

      <div className="px-6 md:px-10 py-6 flex items-center gap-4 flex-wrap">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or share"
          className="field max-w-md"
        />
        <div className="flex gap-1.5 text-xs">
          {(["all", "active", "paused", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full small-caps ${
                statusFilter === s
                  ? "bg-soil text-parchment"
                  : "bg-soil/5 text-soil/65 hover:bg-soil/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 pb-12">
        <div className="paper overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream border-b border-soil/15">
              <tr className="text-left small-caps text-xs text-soil/55">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Share</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Pickup</th>
                <th className="px-4 py-3 font-medium text-right">Credit</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-soil/55 italic">
                    No members match that search.
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-soil/8 last:border-0 hover:bg-cream/50 cursor-pointer"
                  onClick={() => (window.location.href = `/farmer/members/${m.id}/`)}
                >
                  <td className="px-4 py-4">
                    <div className="display text-base">{m.display_name}</div>
                    <div className="text-[11px] text-soil/55">{m.email}</div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell text-soil/75">
                    {m.share_name}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-soil/75">
                    {m.pickup_site}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="display">{formatCents(m.credit_balance_cents)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <StatusPill status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "paused" | "cancelled" }) {
  const cls =
    status === "active"
      ? "bg-moss/15 text-mossDark"
      : status === "paused"
        ? "bg-wheat/20 text-wheatDark"
        : "bg-brick/15 text-brickDark";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] small-caps ${cls}`}>
      {status}
    </span>
  );
}
