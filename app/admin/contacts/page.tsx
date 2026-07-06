"use client";

// =============================================================================
// /admin/contacts — the CRM roster
// =============================================================================
// Searchable, filterable list. Click a row → detail. Status filter is a
// simple button row; search is client-fetched with debounce.
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { listContacts, type ContactRow } from "@/lib/admin/api";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
  { value: "unpaid", label: "Unpaid" },
];

export default function AdminContactsPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await listContacts({ status: status || undefined, q: q || undefined });
      if (cancelled) return;
      if ("contacts" in r) setRows(r.contacts);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, status]);

  return (
    <div>
      <header className="border-b border-soil/15 px-6 md:px-10 py-8">
        <div className="small-caps text-xs text-brick mb-2">Contacts</div>
        <h1 className="display text-4xl font-medium">Every farm.</h1>
        <p className="text-soil/70 mt-1">
          Search by email, farm name, or operator. Filter by lifecycle.
        </p>
      </header>

      <div className="px-6 md:px-10 py-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="search"
            placeholder="Search email, farm name, or operator"
            className="field flex-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`px-3 py-1.5 rounded text-xs small-caps transition-colors ${
                  status === opt.value
                    ? "bg-brick text-parchment"
                    : "bg-cream2 text-soil/70 hover:bg-cream2/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="paper overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs small-caps text-soil/55 border-b border-soil/15">
                <th className="p-3">Farm</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Status</th>
                <th className="p-3">Location</th>
                <th className="p-3">Joined</th>
                <th className="p-3">Todo</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-soil/50 italic">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-soil/50 italic">
                    No contacts match.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-soil/10 hover:bg-cream2/40">
                  <td className="p-3">
                    <Link
                      href={`/admin/contact/?id=${c.id}`}
                      className="text-brick hover:underline"
                    >
                      {c.farm_name ?? <span className="italic text-soil/50">—</span>}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div>{c.display_name ?? c.email.split("@")[0]}</div>
                    <div className="text-[10px] text-soil/50 font-mono">{c.email}</div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={c.subscription_status} />
                  </td>
                  <td className="p-3 text-soil/70">{c.farm_location ?? "—"}</td>
                  <td className="p-3 text-soil/55 text-xs">
                    {c.created_at.slice(0, 10)}
                  </td>
                  <td className="p-3">
                    {c.open_actions > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brick/15 text-brick">
                        {c.open_actions}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-soil/50 italic text-center">
          {rows.length} shown. Add ?limit= for more.
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-mossDark/15 text-mossDark",
    paused: "bg-wheat/15 text-wheatDark",
    past_due: "bg-brick/15 text-brick",
    canceled: "bg-soil/15 text-soil/60",
    unpaid: "bg-cream2 text-soil/60",
    incomplete: "bg-cream2 text-soil/60",
    incomplete_expired: "bg-cream2 text-soil/50",
  };
  const cls = map[status] ?? "bg-cream2 text-soil/60";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>
      {status}
    </span>
  );
}
