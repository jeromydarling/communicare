"use client";

import { PageHeader } from "@/components/farmer/shell";
import { formatCents } from "@/lib/farmer-demo";

const WEEKLY_REVENUE = [
  { week: "Apr 23", cents: 138000 },
  { week: "Apr 30", cents: 142000 },
  { week: "May 7", cents: 156000 },
  { week: "May 14", cents: 162000 },
  { week: "May 21", cents: 169200 },
  { week: "May 28", cents: 174000 },
];

const RETENTION = 88;
const ACTIVE = 47;
const PAUSED = 4;

export default function AnalyticsPage() {
  const max = Math.max(...WEEKLY_REVENUE.map((w) => w.cents));
  const total = WEEKLY_REVENUE.reduce((s, w) => s + w.cents, 0);
  const lastWeek = WEEKLY_REVENUE[WEEKLY_REVENUE.length - 1].cents;
  const prevWeek = WEEKLY_REVENUE[WEEKLY_REVENUE.length - 2].cents;
  const wow = ((lastWeek - prevWeek) / prevWeek) * 100;

  return (
    <div>
      <PageHeader
        eyebrow="The season, in numbers"
        title="A small dashboard."
        subtitle="Used for taxes, for planning next year, for noticing the slow drift you wouldn't see otherwise. Not for chasing growth."
      />

      <div className="px-6 md:px-10 py-8 space-y-8">
        <div className="grid sm:grid-cols-4 gap-4">
          <Stat label="Active members" value={String(ACTIVE)} sub={`${PAUSED} paused`} />
          <Stat label="Last week's revenue" value={formatCents(lastWeek)} sub={`${wow >= 0 ? "+" : ""}${wow.toFixed(0)}% wow`} subColor={wow >= 0 ? "moss" : "brick"} />
          <Stat label="Season retention" value={`${RETENTION}%`} sub="vs 45% industry baseline" />
          <Stat label="Member-pickup ratio" value="94%" sub="6% no-shows · all donated" />
        </div>

        {/* Revenue chart */}
        <section className="paper p-7">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="small-caps text-xs text-brick mb-1">
                Revenue by week
              </div>
              <h2 className="display text-2xl font-medium">
                Steady growth, not viral growth.
              </h2>
            </div>
            <div className="text-right">
              <div className="display text-2xl font-medium">
                {formatCents(total)}
              </div>
              <div className="text-xs text-soil/55 italic">total to date</div>
            </div>
          </div>

          <svg viewBox="0 0 600 240" className="w-full h-56">
            {/* Axis baseline */}
            <line x1="50" y1="200" x2="580" y2="200" stroke="rgba(45,31,18,0.15)" />
            {/* Bars */}
            {WEEKLY_REVENUE.map((w, i) => {
              const x = 60 + i * 90;
              const h = (w.cents / max) * 160;
              const y = 200 - h;
              return (
                <g key={w.week}>
                  <rect
                    x={x}
                    y={y}
                    width="60"
                    height={h}
                    fill="#C19A3C"
                    rx="2"
                  />
                  <rect
                    x={x}
                    y={y}
                    width="60"
                    height="6"
                    fill="#9B7A28"
                  />
                  <text
                    x={x + 30}
                    y={y - 8}
                    textAnchor="middle"
                    fontFamily="Fraunces"
                    fontSize="13"
                    fill="#2D1F12"
                  >
                    ${(w.cents / 100).toFixed(0)}
                  </text>
                  <text
                    x={x + 30}
                    y={220}
                    textAnchor="middle"
                    fontFamily="Source Serif 4"
                    fontSize="11"
                    fill="rgba(45,31,18,0.55)"
                  >
                    {w.week}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pickup distribution */}
          <section className="paper p-7">
            <div className="small-caps text-xs text-brick mb-1">
              Pickup distribution
            </div>
            <h3 className="display text-xl font-medium mb-5">
              Where members collect.
            </h3>
            {[
              { name: "Donkey Coffee, Athens", pct: 48, count: 23 },
              { name: "The farm gate", pct: 32, count: 15 },
              { name: "Nelsonville library", pct: 20, count: 9 },
            ].map((p) => (
              <div key={p.name} className="mb-4 last:mb-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-soil/55">
                    {p.count} members · {p.pct}%
                  </span>
                </div>
                <div className="h-2.5 bg-soil/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mossDark rounded-full"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Top crops by member request */}
          <section className="paper p-7">
            <div className="small-caps text-xs text-brick mb-1">
              Most-swapped-for crops
            </div>
            <h3 className="display text-xl font-medium mb-5">
              What members ask for more of.
            </h3>
            <ul className="space-y-3">
              {[
                { crop: "Cherry tomatoes", count: 18 },
                { crop: "Salad mix", count: 14 },
                { crop: "Strawberries", count: 11 },
                { crop: "Pastured eggs", count: 9 },
                { crop: "Sweet corn", count: 7 },
              ].map((c, i) => (
                <li key={c.crop} className="flex items-baseline gap-4">
                  <span className="display text-wheat text-xs">№ 0{i + 1}</span>
                  <span className="flex-1">{c.crop}</span>
                  <span className="text-sm display text-soil/65">
                    {c.count} swaps
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* The note */}
        <div className="paper p-6 bg-cream/40 max-w-2xl mx-auto text-center">
          <p className="text-sm text-soil/65 italic leading-relaxed">
            We don&apos;t chase vanity metrics here. There&apos;s no "Member
            Health Score." There&apos;s no "Retention Pulse." Just the
            numbers a farmer would actually want to see at the end of a
            season.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: "moss" | "brick";
}) {
  const subClass =
    subColor === "moss"
      ? "text-mossDark"
      : subColor === "brick"
        ? "text-brick"
        : "text-soil/55";
  return (
    <div className="paper p-5">
      <div className="small-caps text-[10px] text-soil/55 mb-2">{label}</div>
      <div className="display text-2xl font-medium leading-none">{value}</div>
      {sub && <div className={`text-xs italic mt-2 ${subClass}`}>{sub}</div>}
    </div>
  );
}
