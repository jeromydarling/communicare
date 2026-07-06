"use client";

// =============================================================================
// HealthSignalsCard — quiet usage numbers, no nag
// =============================================================================
// Shows the farmer what their $9 is buying this month. Self-loading via
// /api/farmer/health-signals. If numbers are all zero (new farm just
// getting started) we render the empty state, not a "you should do
// more" prompt — the whole point of the health-signals feature is
// dignity, not pressure.
// =============================================================================

import { useEffect, useState } from "react";
import { getHealthSignals, type HealthSignals } from "@/lib/farmer/api";

export function HealthSignalsCard() {
  const [signals, setSignals] = useState<HealthSignals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealthSignals().then((r) => {
      if (cancelled) return;
      if ("signals" in r) setSignals(r.signals);
      else if ("error" in r) setError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null; // don't clutter the dashboard on API error
  if (!signals) return null;

  const isBrandNew =
    signals.opted_in_members === 0 &&
    signals.weekly_offers_this_month === 0 &&
    signals.inbound_messages_this_month === 0;

  if (isBrandNew) {
    return (
      <div className="paper p-6">
        <div className="small-caps text-[10px] text-brick mb-2">
          What this month has done
        </div>
        <p className="text-sm text-soil/70 italic leading-relaxed">
          Nothing yet — you're just getting started. Once you enroll members
          and the Tuesday text loop runs a week, this space will fill up.
        </p>
      </div>
    );
  }

  return (
    <div className="paper p-6">
      <div className="small-caps text-[10px] text-brick mb-3">
        What this month has done
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Stat
          label="Members on the line"
          value={signals.opted_in_members}
          hint="Opted in via SMS"
        />
        <Stat
          label="Weekly texts sent"
          value={signals.weekly_offers_this_month}
          hint={
            signals.last_offer_sent_at
              ? `Last on ${signals.last_offer_sent_at.slice(0, 10)}`
              : undefined
          }
        />
        <Stat
          label="Replies came back"
          value={signals.replies_this_month}
          hint={
            signals.reply_rate != null ? `${signals.reply_rate}% reply rate` : undefined
          }
        />
        <Stat
          label="Inbound messages"
          value={signals.inbound_messages_this_month}
          hint="From your members"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="display text-3xl font-medium">{value}</div>
      <div className="text-xs text-soil/70 leading-tight mt-1">{label}</div>
      {hint && (
        <div className="text-[10px] italic text-soil/50 mt-1">{hint}</div>
      )}
    </div>
  );
}
