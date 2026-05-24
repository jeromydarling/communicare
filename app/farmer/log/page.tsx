"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";

type Entry = {
  id: string;
  date: string;
  crop: string;
  weight_lb: number;
  note?: string;
  field?: string;
};

const LOG: Entry[] = [
  { id: "1", date: "2026-05-23", crop: "Lacinato kale", weight_lb: 38, field: "South slope", note: "Heavy growth. Sweet from the cold snap." },
  { id: "2", date: "2026-05-23", crop: "Hakurei turnips", weight_lb: 22, field: "Middle row" },
  { id: "3", date: "2026-05-23", crop: "Spring onions", weight_lb: 14, field: "South slope" },
  { id: "4", date: "2026-05-23", crop: "Pastured eggs", weight_lb: 0, note: "28 dozen — short this week, three hens broody" },
  { id: "5", date: "2026-05-22", crop: "Garlic scapes", weight_lb: 8, field: "Garlic block", note: "Cut early; pesto-grade" },
  { id: "6", date: "2026-05-21", crop: "Strawberries", weight_lb: 12, field: "Lower row", note: "First picking. Tip-top." },
  { id: "7", date: "2026-05-20", crop: "Salad mix", weight_lb: 16, field: "Hoop house 2", note: "Last cut from this bed." },
  { id: "8", date: "2026-05-19", crop: "Asian greens", weight_lb: 11, field: "Hoop house 1" },
  { id: "9", date: "2026-05-18", crop: "Asparagus", weight_lb: 9, field: "North bed", note: "Two weeks left in the season." },
  { id: "10", date: "2026-05-16", crop: "Lacinato kale", weight_lb: 32, field: "South slope" },
];

const TOTALS = {
  weekLb: LOG.slice(0, 7).reduce((s, e) => s + e.weight_lb, 0),
  monthLb: LOG.reduce((s, e) => s + e.weight_lb, 0),
  varieties: new Set(LOG.map((e) => e.crop)).size,
};

export default function HarvestLogPage() {
  const [showAddForm, setShowAddForm] = useState(false);

  // Group entries by date
  const byDate = new Map<string, Entry[]>();
  for (const e of LOG) {
    const k = e.date;
    byDate.set(k, [...(byDate.get(k) ?? []), e]);
  }

  return (
    <div>
      <PageHeader
        eyebrow="What you brought in"
        title="Harvest log."
        subtitle="An honest record of what came out of the field this season. Used for nothing official; kept because it&apos;s worth keeping."
        action={
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="btn btn-primary text-sm"
          >
            + Add today&apos;s harvest
          </button>
        }
      />

      <div className="px-6 md:px-10 py-8 grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-8">
          {showAddForm && (
            <div className="paper p-7">
              <div className="small-caps text-xs text-brick mb-3">
                Add an entry
              </div>
              <div className="grid sm:grid-cols-[1fr_120px_120px] gap-3">
                <input className="field" placeholder="Crop name (e.g. Lacinato kale)" />
                <input className="field" placeholder="lbs" type="number" />
                <input className="field" placeholder="Field" />
              </div>
              <textarea
                className="field mt-3"
                rows={2}
                placeholder="Note (optional)"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs italic text-soil/55">
                  Date defaults to today.
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(false)} className="btn btn-ghost text-sm">
                    Cancel
                  </button>
                  <button className="btn btn-primary text-sm">Save entry</button>
                </div>
              </div>
            </div>
          )}

          {Array.from(byDate.entries()).map(([date, entries]) => {
            const total = entries.reduce((s, e) => s + e.weight_lb, 0);
            return (
              <section key={date}>
                <div className="flex items-baseline justify-between mb-3 px-2">
                  <h2 className="display text-2xl font-medium">{formatDate(date)}</h2>
                  {total > 0 && (
                    <span className="text-sm display italic text-soil/55">
                      {total} lbs
                    </span>
                  )}
                </div>
                <div className="paper overflow-hidden">
                  <ul className="divide-y divide-soil/10">
                    {entries.map((e) => (
                      <li key={e.id} className="px-5 py-3 flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-wheat shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="display text-base">{e.crop}</div>
                          {(e.field || e.note) && (
                            <div className="text-xs text-soil/65 italic">
                              {e.field}
                              {e.field && e.note && " · "}
                              {e.note}
                            </div>
                          )}
                        </div>
                        {e.weight_lb > 0 && (
                          <div className="display text-soil/85">
                            {e.weight_lb} lbs
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="paper p-5">
            <div className="small-caps text-[10px] text-brick mb-3">
              This week
            </div>
            <div className="display text-4xl font-medium text-mossDark">
              {TOTALS.weekLb}
              <span className="text-base text-soil/55 ml-1">lbs</span>
            </div>
            <div className="text-xs text-soil/55 italic mt-1">
              across {Array.from(byDate.keys()).slice(0, 7).length} days
            </div>
          </div>
          <div className="paper p-5">
            <div className="small-caps text-[10px] text-brick mb-3">
              This month
            </div>
            <div className="display text-4xl font-medium">
              {TOTALS.monthLb}
              <span className="text-base text-soil/55 ml-1">lbs</span>
            </div>
            <div className="text-xs text-soil/55 italic mt-1">
              {TOTALS.varieties} varieties
            </div>
          </div>
          <div className="paper p-5 bg-cream/40">
            <div className="display text-sm mb-2">Why we keep this</div>
            <p className="text-xs text-soil/65 leading-relaxed italic">
              For your records, for your tax filing, for the years when
              you&apos;ll want to remember what you grew. Export anytime as
              CSV from Settings.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
