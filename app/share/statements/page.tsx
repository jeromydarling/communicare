"use client";

import { useRef } from "react";
import { Mark } from "@/components/mark";
import { formatCents } from "@/lib/farmer-demo";

type Line = { date: string; description: string; cents: number };

type Statement = {
  month: string;
  range: string;
  openingBalance: number;
  closingBalance: number;
  lines: Line[];
};

const STATEMENTS: Statement[] = [
  {
    month: "May 2026",
    range: "May 1 – May 31",
    openingBalance: 7800,
    closingBalance: 4200,
    lines: [
      { date: "May 4", description: "Order — kale, eggs, lettuce, snap peas", cents: -3600 },
      { date: "May 11", description: "Order — beets, eggs, salad mix, scallions", cents: -3600 },
      { date: "May 14", description: "Damaged-item credit — broken eggs (4)", cents: 200 },
      { date: "May 18", description: "Order — kale, carrots, sungolds, garlic scapes", cents: -3600 },
      { date: "May 25", description: "Order — chard, eggs, tomatoes, scallions", cents: -3600 },
      { date: "May 28", description: "Skip-week credit (going away)", cents: 3600 },
      { date: "May 31", description: "Top-up", cents: 5000 },
      { date: "May 31", description: "Top-up bonus (5%)", cents: 250 },
    ],
  },
  {
    month: "April 2026",
    range: "Apr 1 – Apr 30",
    openingBalance: 4200,
    closingBalance: 7800,
    lines: [
      { date: "Apr 7", description: "Order — asparagus, eggs, lettuce, radishes", cents: -3600 },
      { date: "Apr 14", description: "Order — asparagus, eggs, ramps, spring onions", cents: -3600 },
      { date: "Apr 14", description: "Top-up", cents: 10000 },
      { date: "Apr 14", description: "Top-up bonus (5%)", cents: 500 },
      { date: "Apr 21", description: "Order — first share — eggs, lettuce, salad turnips", cents: -3600 },
      { date: "Apr 28", description: "Order — kale, eggs, salad mix, turnips", cents: -3600 },
    ],
  },
];

export default function MyStatementsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-4xl font-medium mb-2">Statements.</h1>
          <p className="text-soil/65 italic">
            Monthly summaries you can save or print as PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-ghost text-sm"
        >
          Print / save as PDF
        </button>
      </div>

      <div className="space-y-10">
        {STATEMENTS.map((s) => (
          <StatementCard key={s.month} statement={s} />
        ))}
      </div>

      <p className="text-center text-xs text-soil/55 italic mt-12">
        Older statements available on request. Send us an email and we&apos;ll
        pull them within a day.
      </p>

      {/* Print stylesheet — strip everything but the statement cards */}
      <style jsx global>{`
        @media print {
          nav,
          header,
          footer,
          button {
            display: none !important;
          }
          .paper {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            page-break-inside: avoid;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatementCard({ statement: s }: { statement: Statement }) {
  const ref = useRef<HTMLDivElement>(null);
  const totalDebits = s.lines.filter((l) => l.cents < 0).reduce((sum, l) => sum + l.cents, 0);
  const totalCredits = s.lines.filter((l) => l.cents > 0).reduce((sum, l) => sum + l.cents, 0);

  return (
    <article ref={ref} className="paper p-7 md:p-9">
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mark className="w-8 h-8 text-brick" />
          <div>
            <h2 className="display text-2xl font-medium leading-tight">
              {s.month}
            </h2>
            <div className="text-xs text-soil/55 small-caps">
              Wren Hollow Farm · Statement for {s.range}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-soil/55 small-caps">Closing balance</div>
          <div className="display text-2xl text-mossDark">
            {formatCents(s.closingBalance)}
          </div>
        </div>
      </div>

      <div className="rule mb-5" />

      <table className="w-full text-sm mb-5">
        <thead>
          <tr className="text-left small-caps text-[10px] text-soil/55 border-b border-outline">
            <th className="py-2 w-20">Date</th>
            <th className="py-2">Description</th>
            <th className="py-2 text-right w-32">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-soil/8">
            <td className="py-2 text-soil/55 display">{s.range.split(" – ")[0]}</td>
            <td className="py-2 italic text-soil/65">
              Opening balance
            </td>
            <td className="py-2 text-right font-mono text-soil/65">
              {formatCents(s.openingBalance)}
            </td>
          </tr>
          {s.lines.map((l, i) => (
            <tr key={i} className="border-b border-soil/8 last:border-0">
              <td className="py-2 text-soil/55 display">{l.date}</td>
              <td className="py-2">{l.description}</td>
              <td
                className={`py-2 text-right font-mono font-medium ${l.cents > 0 ? "text-mossDark" : "text-brick"}`}
              >
                {l.cents > 0 ? "+" : ""}
                {formatCents(l.cents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-soil/15">
            <td colSpan={2} className="pt-3 small-caps text-[10px] text-soil/55">
              Closing balance
            </td>
            <td className="pt-3 text-right display text-base text-mossDark">
              {formatCents(s.closingBalance)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid sm:grid-cols-2 gap-4 text-xs text-soil/65">
        <div>
          <div className="small-caps text-[10px] text-soil/55 mb-1">
            Charges this month
          </div>
          <div className="font-mono text-brick">
            {formatCents(totalDebits)}
          </div>
        </div>
        <div>
          <div className="small-caps text-[10px] text-soil/55 mb-1">
            Credits this month
          </div>
          <div className="font-mono text-mossDark">
            +{formatCents(totalCredits)}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-soil/45 italic text-center mt-6">
        Statement generated by Communicare on behalf of Wren Hollow Farm
        · communicare.farm
      </div>
    </article>
  );
}
