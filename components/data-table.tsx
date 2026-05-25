"use client";

import { useState } from "react";

// =============================================================================
// DataTable — desktop table / mobile expandable cards
// =============================================================================
// On md+ the data renders as a normal table. On mobile (sub-768px) each row
// becomes a tap-to-expand card: primary field in display, secondary field
// in muted small text, an optional badge in the corner, and the rest of the
// columns hidden until the row is tapped open.
//
// Columns declare their mobile role:
//   - "primary"    — heading text in the closed card (required)
//   - "secondary"  — sub-heading text in the closed card
//   - "badge"      — pill in the top-right of the closed card
//   - "detail"     — only shown on the expanded card (default)
//   - "hidden"     — never shown on mobile
//
// The desktop table is unaffected by these roles.
// =============================================================================

export type ColumnAlign = "left" | "right";
export type MobileRole = "primary" | "secondary" | "badge" | "detail" | "hidden";

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: ColumnAlign;
  mobile?: MobileRole;
  // Optional override of the cell's th/td className on desktop
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getKey,
  minWidth = 520,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  minWidth?: number;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return <div className="px-5 py-10 text-center">{empty}</div>;
  }

  return (
    <>
      {/* Desktop — md+ — proper table. Horizontal scroll inside the parent
          card handled by the surrounding ScrollFade where present. */}
      <table
        className="hidden md:table w-full text-sm"
        style={{ minWidth }}
      >
        <thead className="bg-cream border-b border-outline">
          <tr className="text-left small-caps text-xs text-soil/55">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-5 py-3 font-medium ${
                  c.align === "right" ? "text-right" : ""
                } ${c.className ?? ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              className="border-b border-soil/8 last:border-0 hover:bg-cream/50"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-5 py-4 ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — sub-md — tap-to-expand cards */}
      <ul className="md:hidden divide-y divide-outline">
        {rows.map((row) => (
          <MobileRow
            key={getKey(row)}
            row={row}
            columns={columns}
          />
        ))}
      </ul>
    </>
  );
}

function MobileRow<T>({
  row,
  columns,
}: {
  row: T;
  columns: Column<T>[];
}) {
  const [open, setOpen] = useState(false);
  const primary = columns.find((c) => c.mobile === "primary");
  const secondary = columns.find((c) => c.mobile === "secondary");
  const badge = columns.find((c) => c.mobile === "badge");
  const details = columns.filter(
    (c) =>
      c.mobile !== "primary" &&
      c.mobile !== "secondary" &&
      c.mobile !== "badge" &&
      c.mobile !== "hidden",
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-cream/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          {primary && (
            <div className="display text-base font-medium leading-tight">
              {primary.render(row)}
            </div>
          )}
          {secondary && (
            <div className="text-xs text-soil/55 italic mt-0.5">
              {secondary.render(row)}
            </div>
          )}
        </div>
        {badge && (
          <div className="shrink-0 text-right">{badge.render(row)}</div>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <dl className="px-5 pb-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
          {details.map((c) => (
            <div key={c.key} className="contents">
              <dt className="small-caps text-[10px] text-soil/55 pt-1">
                {c.label}
              </dt>
              <dd
                className={`${
                  c.align === "right" ? "text-right" : ""
                } text-soil/85`}
              >
                {c.render(row)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 mt-1 text-soil/45 transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
