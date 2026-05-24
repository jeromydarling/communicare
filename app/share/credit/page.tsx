"use client";

import { formatCents } from "@/lib/farmer-demo";

const LEDGER = [
  { date: "May 21", reason: "Order — kale, carrots, eggs", delta: -3600, balance: 4200 },
  { date: "Apr 30", reason: "Skip-week credit", delta: 3600, balance: 7800 },
  { date: "Apr 14", reason: "Top-up + 5% bonus", delta: 10500, balance: 4200 },
  { date: "Apr 14", reason: "Top-up", delta: -10000, balance: -6300 },
  { date: "Apr 14", reason: "Initial credit (top-up)", delta: 10000, balance: 3700 },
  { date: "Apr 7", reason: "Damaged item — eggs", delta: 800, balance: -6300 },
  { date: "Apr 7", reason: "Order — Tuesday share", delta: -3600, balance: -7100 },
];

export default function MyCreditPage() {
  const balance = LEDGER[0].balance;
  const lifetime = LEDGER.filter((e) => e.delta > 0).reduce(
    (s, e) => s + e.delta,
    0,
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="display text-4xl font-medium mb-2">Your credit.</h1>
      <p className="text-soil/65 italic mb-8">
        Every dollar in, every dollar out — append-only, like a real ledger.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <div className="paper p-6">
          <div className="display text-5xl font-medium text-mossDark leading-none">
            {formatCents(balance)}
          </div>
          <div className="text-xs text-soil/55 small-caps mt-2">
            Balance today
          </div>
        </div>
        <div className="paper p-6">
          <div className="display text-5xl font-medium leading-none">
            {formatCents(lifetime)}
          </div>
          <div className="text-xs text-soil/55 small-caps mt-2">
            Topped up to date
          </div>
        </div>
      </div>

      <div className="paper p-6 mb-8 bg-wheat/10 border-wheat/30">
        <div className="display text-lg mb-2">Top up your balance</div>
        <p className="text-sm text-soil/75 mb-4">
          Add $200 or more and we throw in 5% on top of the deposit. Use it
          weekly as your shares arrive.
        </p>
        <div className="flex gap-2 flex-wrap">
          {[10000, 20000, 50000].map((c) => (
            <button
              key={c}
              className="btn btn-ghost text-sm border-wheatDark text-wheatDark hover:bg-wheatDark hover:text-parchment"
            >
              {formatCents(c)}
              {c >= 20000 && (
                <span className="ml-2 text-[10px] small-caps">+5%</span>
              )}
            </button>
          ))}
          <button className="btn btn-ghost text-sm">Other amount</button>
        </div>
      </div>

      <div className="paper overflow-hidden">
        <div className="px-5 py-3 bg-cream border-b border-soil/15 small-caps text-xs text-soil/55">
          Ledger
        </div>
        <table className="w-full text-sm">
          <tbody>
            {LEDGER.map((e, i) => (
              <tr
                key={i}
                className="border-b border-soil/8 last:border-0"
              >
                <td className="px-5 py-3 text-soil/65 w-24 display">{e.date}</td>
                <td className="px-5 py-3">{e.reason}</td>
                <td
                  className={`px-5 py-3 text-right display font-medium ${
                    e.delta > 0 ? "text-mossDark" : "text-brick"
                  }`}
                >
                  {e.delta > 0 ? "+" : ""}
                  {formatCents(e.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
