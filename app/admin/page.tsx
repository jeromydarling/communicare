"use client";

// =============================================================================
// /admin — operator desk
// =============================================================================
// The landing surface: MRR + counts + your open action items + the two
// most recent lifecycle events. Meant to be the page you open first
// thing Monday.
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMetrics,
  myOpenActions,
  toggleActionDone,
  type Metrics,
} from "@/lib/admin/api";

export default function AdminDeskPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [actions, setActions] = useState<
    Awaited<ReturnType<typeof myOpenActions>>
  >({ actions: [], ok: true } as never);

  async function reload() {
    const [m, a] = await Promise.all([getMetrics(), myOpenActions()]);
    if ("ok" in m && m.ok) setMetrics(m);
    if ("ok" in a && a.ok) setActions(a);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <header className="border-b border-soil/15 px-6 md:px-10 py-8">
        <div className="small-caps text-xs text-brick mb-2">Operator desk</div>
        <h1 className="display text-4xl font-medium">The room.</h1>
        <p className="text-soil/70 mt-1">
          MRR, lifecycle counts, and your open work.
        </p>
      </header>

      <div className="px-6 md:px-10 py-8 space-y-8">
        {metrics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <Big label="MRR" value={`$${(metrics.mrr_cents / 100).toFixed(0)}`} hint={`${metrics.active} active`} />
              <Big label="Active" value={metrics.active.toString()} />
              <Big label="Paused" value={metrics.paused.toString()} />
              <Big label="Past due" value={metrics.past_due.toString()} tone={metrics.past_due > 0 ? "warn" : undefined} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <Big label="Unpaid" value={metrics.unpaid.toString()} hint="Signed up, never charged" />
              <Big label="Signups (30d)" value={metrics.signups_last_30d.toString()} />
              <Big label="Canceled (30d)" value={metrics.canceled_last_30d.toString()} tone={metrics.canceled_last_30d > 0 ? "warn" : undefined} />
              <div className="paper p-5">
                <div className="small-caps text-[10px] text-soil/55 mb-2">Most recent</div>
                {metrics.recent_signup && (
                  <div className="text-sm mb-1">
                    <span className="text-mossDark">Signup</span> · {metrics.recent_signup.email} ·{" "}
                    <span className="text-soil/55">{metrics.recent_signup.created_at.slice(0, 10)}</span>
                  </div>
                )}
                {metrics.recent_cancel && (
                  <div className="text-sm">
                    <span className="text-brick">Cancel</span> · {metrics.recent_cancel.email} ·{" "}
                    <span className="text-soil/55">{metrics.recent_cancel.canceled_at.slice(0, 10)}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="italic text-soil/60 text-sm">Loading metrics…</p>
        )}

        <section className="paper p-6">
          <div className="small-caps text-xs text-brick mb-3">
            Your open work
          </div>
          {"actions" in actions && actions.actions.length === 0 ? (
            <p className="text-soil/60 italic text-sm">Nothing waiting.</p>
          ) : (
            <ul className="space-y-3">
              {"actions" in actions &&
                actions.actions.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 accent-mossDark"
                      onChange={async () => {
                        await toggleActionDone(a.id, true);
                        reload();
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm">
                        <Link
                          href={`/admin/contact/?id=${a.subject_user_id}`}
                          className="text-brick hover:underline"
                        >
                          {a.subject_name ?? a.subject_email ?? a.subject_user_id.slice(0, 8)}
                        </Link>{" "}
                        · {a.body}
                      </div>
                      {a.snooze_until && (
                        <div className="text-[10px] italic text-soil/50">
                          due {a.snooze_until.slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Big({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div className={`paper p-5 ${tone === "warn" ? "border-brick/40 bg-brick/5" : ""}`}>
      <div className="display text-4xl font-medium">{value}</div>
      <div className="text-xs text-soil/60 mt-1 small-caps">{label}</div>
      {hint && <div className="text-[10px] italic text-soil/50 mt-1">{hint}</div>}
    </div>
  );
}
