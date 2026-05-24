"use client";

import { formatCents } from "@/lib/farmer-demo";

const ORDERS = [
  {
    week: "May 21",
    items: "kale, carrots, eggs, tomatoes, garlic, chard, bouquet",
    total_cents: 3600,
    status: "delivered",
  },
  {
    week: "May 14",
    items: "kale, beets, eggs, lettuce, snap peas, scallions",
    total_cents: 3600,
    status: "delivered",
  },
  {
    week: "May 7",
    items: "asparagus, eggs, lettuce, radishes, spring onions, rhubarb",
    total_cents: 3600,
    status: "delivered",
  },
  {
    week: "Apr 30",
    items: "skipped — credited",
    total_cents: 0,
    status: "skipped",
  },
  {
    week: "Apr 23",
    items: "first share — asparagus, eggs, lettuce, salad turnips, ramps",
    total_cents: 3600,
    status: "delivered",
  },
];

export default function MyOrdersPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="display text-4xl font-medium mb-2">Past shares.</h1>
      <p className="text-soil/65 italic mb-8">
        Every Tuesday since you joined.
      </p>

      <div className="paper overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-soil/15">
            <tr className="text-left small-caps text-xs text-soil/55">
              <th className="px-5 py-3 font-medium">Week</th>
              <th className="px-5 py-3 font-medium">Items</th>
              <th className="px-5 py-3 font-medium text-right">Charged</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr
                key={o.week}
                className={`border-b border-soil/8 last:border-0 ${
                  o.status === "skipped" ? "bg-cream/50 italic text-soil/55" : ""
                }`}
              >
                <td className="px-5 py-4 display">{o.week}</td>
                <td className="px-5 py-4 max-w-md">{o.items}</td>
                <td className="px-5 py-4 text-right display">
                  {o.total_cents > 0 ? formatCents(o.total_cents) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
