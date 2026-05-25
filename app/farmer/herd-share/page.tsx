"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import {
  HERD_SHARE_TEMPLATES,
  render,
  type StateCode,
} from "@/lib/herd-share-templates";
import { Jar, Mark } from "@/components/mark";
import { ScrollFade } from "@/components/scroll-fade";
import { DataTable, type Column } from "@/components/data-table";
import { formatCents } from "@/lib/farmer-demo";

type Shareholder = {
  id: string;
  name: string;
  email: string;
  shareFraction: string;
  buyInCents: number;
  monthlyBoardingCents: number;
  allotment: string;
  signedOn: string;
  state: StateCode;
  status: "active" | "pending_signature" | "archived";
};

type MilkTest = {
  id: string;
  date: string;
  plateCount: number;
  coliforms: number;
  lab: string;
  notes?: string;
};

const SHAREHOLDERS: Shareholder[] = [
  {
    id: "h1",
    name: "Mary Hoffmeier (Farm)",
    email: "mary@threeforks.farm",
    shareFraction: "operator",
    buyInCents: 0,
    monthlyBoardingCents: 0,
    allotment: "—",
    signedOn: "2024-01-01",
    state: "CO",
    status: "active",
  },
  {
    id: "h2",
    name: "Caleb Anderson",
    email: "caleb.a@example.com",
    shareFraction: "1/30",
    buyInCents: 22000,
    monthlyBoardingCents: 11500,
    allotment: "2 gallons/week",
    signedOn: "2024-11-08",
    state: "CO",
    status: "active",
  },
  {
    id: "h3",
    name: "Esther Whitmore",
    email: "esther.w@example.com",
    shareFraction: "1/30",
    buyInCents: 22000,
    monthlyBoardingCents: 11500,
    allotment: "2 gallons/week",
    signedOn: "2025-03-15",
    state: "CO",
    status: "active",
  },
  {
    id: "h4",
    name: "Tomás Reyes",
    email: "tomas@example.com",
    shareFraction: "2/30",
    buyInCents: 44000,
    monthlyBoardingCents: 23000,
    allotment: "4 gallons/week",
    signedOn: "2025-05-22",
    state: "CO",
    status: "active",
  },
  {
    id: "h5",
    name: "Marina Voss",
    email: "marina.v@example.com",
    shareFraction: "1/30",
    buyInCents: 22000,
    monthlyBoardingCents: 11500,
    allotment: "2 gallons/week",
    signedOn: "2026-05-20",
    state: "CO",
    status: "pending_signature",
  },
];

const MILK_TESTS: MilkTest[] = [
  { id: "t1", date: "2026-06-05", plateCount: 1200, coliforms: 0, lab: "CSU Extension" },
  { id: "t2", date: "2026-05-05", plateCount: 1450, coliforms: 0, lab: "CSU Extension" },
  { id: "t3", date: "2026-04-05", plateCount: 980, coliforms: 0, lab: "CSU Extension", notes: "Lowest count of the year" },
  { id: "t4", date: "2026-03-05", plateCount: 2100, coliforms: 0, lab: "CSU Extension" },
  { id: "t5", date: "2026-02-05", plateCount: 1800, coliforms: 0, lab: "CSU Extension" },
];

type Tab = "shareholders" | "contracts" | "tests" | "templates";

export default function HerdSharePage() {
  const [tab, setTab] = useState<Tab>("shareholders");

  const active = SHAREHOLDERS.filter((s) => s.status === "active" && s.shareFraction !== "operator");
  const pending = SHAREHOLDERS.filter((s) => s.status === "pending_signature");
  const totalMonthly = active.reduce((s, x) => s + x.monthlyBoardingCents, 0);
  const totalAllotment = active.reduce((s, x) => {
    // crude parser of "N gallons/week" or "N/M gallons"
    const m = x.allotment.match(/^(\d+)/);
    return s + (m ? parseInt(m[1], 10) : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        eyebrow="The herd-share module"
        title="Herd-share."
        subtitle="State-aware contracts. Monthly boarding-fee billing. Mandatory milk-test posting. The whole regulated workflow, in one place."
        action={
          <button className="btn btn-primary text-sm">
            + Onboard a new shareholder
          </button>
        }
      />

      <div className="px-6 md:px-10 py-8 grid sm:grid-cols-4 gap-4">
        <Stat label="Active shareholders" value={active.length.toString()} />
        <Stat label="Monthly boarding revenue" value={formatCents(totalMonthly)} />
        <Stat label="Weekly milk allotment" value={`${totalAllotment} gal`} accent="moss" />
        <Stat
          label="Last milk test"
          value={`${MILK_TESTS[0].plateCount.toLocaleString()} CFU/mL`}
          accent="moss"
        />
      </div>

      {/* Tabs */}
      <ScrollFade fadeColor="cream" className="border-b border-outline px-4 md:px-10 -mb-px">
        <div className="flex gap-1">
        {(
          [
            { id: "shareholders", label: "Shareholders" },
            { id: "contracts", label: "Contracts" },
            { id: "tests", label: "Milk tests" },
            { id: "templates", label: "State templates" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 border-b-2 display whitespace-nowrap text-sm ${
              tab === t.id
                ? "border-brick text-brick"
                : "border-transparent text-soil/65 hover:text-soil"
            }`}
          >
            {t.label}
          </button>
        ))}
        </div>
      </ScrollFade>

      <div className="px-6 md:px-10 py-8">
        {tab === "shareholders" && (
          <ShareholdersTab active={active} pending={pending} />
        )}
        {tab === "contracts" && <ContractsTab />}
        {tab === "tests" && <MilkTestsTab />}
        {tab === "templates" && <TemplatesTab />}
      </div>
    </div>
  );
}

function ShareholdersTab({
  active,
  pending,
}: {
  active: Shareholder[];
  pending: Shareholder[];
}) {
  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <div className="small-caps text-xs text-wheatDark mb-3">
            Pending signature
          </div>
          <h3 className="display text-xl font-medium mb-4">
            {pending.length} contract{pending.length === 1 ? "" : "s"} sent,
            waiting on signature.
          </h3>
          <div className="paper overflow-hidden">
            <ul className="divide-y divide-outline">
              {pending.map((s) => (
                <li key={s.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="display">{s.name}</div>
                    <div className="text-xs text-soil/55 italic">
                      {s.email} · {s.shareFraction} share · {s.allotment}
                    </div>
                  </div>
                  <button className="btn btn-ghost text-xs py-1.5 px-3">
                    Resend
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <div className="small-caps text-xs text-brick mb-3">
          Active shareholders
        </div>
        <h3 className="display text-xl font-medium mb-4">
          {active.length} shareholders, contributing{" "}
          {formatCents(
            active.reduce((s, x) => s + x.monthlyBoardingCents, 0),
          )}{" "}
          per month.
        </h3>
        <div className="paper overflow-hidden">
          <ScrollFade fadeColor="parchment">
            <DataTable<Shareholder>
              rows={active}
              getKey={(s) => s.id}
              minWidth={520}
              columns={[
                {
                  key: "name",
                  label: "Shareholder",
                  mobile: "primary",
                  render: (s) => (
                    <>
                      <div className="display">{s.name}</div>
                      <div className="text-[11px] text-soil/55 font-body normal-case">
                        {s.email}
                      </div>
                    </>
                  ),
                },
                {
                  key: "share",
                  label: "Share",
                  mobile: "secondary",
                  render: (s) => (
                    <span className="font-mono">{s.shareFraction}</span>
                  ),
                },
                {
                  key: "allotment",
                  label: "Allotment",
                  render: (s) => (
                    <span className="text-soil/75">{s.allotment}</span>
                  ),
                },
                {
                  key: "since",
                  label: "Since",
                  render: (s) => (
                    <span className="text-soil/55 text-xs">
                      {new Date(s.signedOn).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ),
                },
                {
                  key: "fee",
                  label: "Monthly fee",
                  align: "right",
                  mobile: "badge",
                  render: (s) => (
                    <span className="display">
                      {formatCents(s.monthlyBoardingCents)}
                    </span>
                  ),
                },
              ]}
            />
          </ScrollFade>
        </div>
      </section>
    </div>
  );
}

function ContractsTab() {
  const [filter, setFilter] = useState<"all" | "signed" | "pending">("all");
  const all = SHAREHOLDERS.filter((s) => s.shareFraction !== "operator");
  const filtered = filter === "all" ? all : all.filter((s) => (filter === "signed" ? s.status === "active" : s.status === "pending_signature"));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs">
        {(["all", "signed", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full small-caps ${
              filter === f
                ? "bg-soil text-parchment"
                : "bg-cream text-soil/65 hover:bg-cream2"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="paper overflow-hidden">
        <ScrollFade fadeColor="parchment">
          <DataTable<Shareholder>
            rows={filtered}
            getKey={(s) => s.id}
            minWidth={520}
            columns={[
              {
                key: "name",
                label: "Shareholder",
                mobile: "primary",
                render: (s) => <span className="display">{s.name}</span>,
              },
              {
                key: "state",
                label: "State",
                mobile: "secondary",
                render: (s) => <span className="font-mono">{s.state}</span>,
              },
              {
                key: "signed",
                label: "Signed",
                render: (s) => (
                  <span className="text-xs text-soil/65">
                    {s.status === "active"
                      ? new Date(s.signedOn).toLocaleDateString()
                      : "—"}
                  </span>
                ),
              },
              {
                key: "retention",
                label: "Retention",
                render: (s) => (
                  <span className="text-xs text-soil/55">
                    {s.status === "active" ? "3 years" : "—"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                align: "right",
                mobile: "badge",
                render: (s) =>
                  s.status === "active" ? (
                    <span className="small-caps text-[10px] px-2 py-0.5 rounded-full bg-moss/15 text-mossDark">
                      Signed
                    </span>
                  ) : (
                    <span className="small-caps text-[10px] px-2 py-0.5 rounded-full bg-wheat/20 text-wheatDark">
                      Pending
                    </span>
                  ),
              },
            ]}
          />
        </ScrollFade>
      </div>
      <p className="text-xs text-soil/55 italic">
        Signed contracts are kept for the full state-required retention period
        (3 years in CO/ID/CT/TN; longer in some). Downloadable from each
        shareholder&apos;s detail page; deleting is blocked until the
        retention window expires.
      </p>
    </div>
  );
}

function MilkTestsTab() {
  return (
    <div className="space-y-6">
      <div className="paper p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="small-caps text-xs text-brick mb-1">
              Upload a new test
            </div>
            <h3 className="display text-xl font-medium">
              Monthly milk-test results.
            </h3>
            <p className="text-xs text-soil/65 italic mt-1">
              Colorado law requires monthly testing + 3-year retention. When
              you upload here, we text every shareholder a link to the result.
            </p>
          </div>
          <button className="btn btn-primary text-sm">
            + Upload PDF
          </button>
        </div>
      </div>

      <div className="paper overflow-hidden">
        <ScrollFade fadeColor="parchment">
          <DataTable<MilkTest>
            rows={MILK_TESTS}
            getKey={(t) => t.id}
            minWidth={600}
            columns={[
              {
                key: "date",
                label: "Date",
                mobile: "primary",
                render: (t) => (
                  <span className="display">
                    {new Date(t.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
              {
                key: "plate",
                label: "Standard plate count",
                mobile: "badge",
                render: (t) => {
                  const safe = t.plateCount < 15000 && t.coliforms === 0;
                  return (
                    <span
                      className={`font-mono ${safe ? "text-mossDark" : "text-brick"}`}
                    >
                      {t.plateCount.toLocaleString()} CFU/mL
                    </span>
                  );
                },
              },
              {
                key: "coliforms",
                label: "Coliforms",
                render: (t) => (
                  <span
                    className={`font-mono ${t.coliforms === 0 ? "text-mossDark" : "text-brick"}`}
                  >
                    {t.coliforms === 0 ? "Not detected" : `${t.coliforms}`}
                  </span>
                ),
              },
              {
                key: "lab",
                label: "Lab",
                mobile: "secondary",
                render: (t) => (
                  <span className="text-xs text-soil/65 font-body normal-case">
                    {t.lab}
                  </span>
                ),
              },
              {
                key: "notes",
                label: "Notes",
                render: (t) => (
                  <span className="text-xs text-soil/55 italic">
                    {t.notes ?? "—"}
                  </span>
                ),
              },
            ]}
          />
        </ScrollFade>
      </div>

      <div className="paper p-5 bg-cream/40 text-xs text-soil/65 italic max-w-2xl mx-auto text-center">
        Colorado legal ceiling for raw milk is 15,000 CFU/mL standard plate
        count. FDA pasteurized standard is 100,000. Every test below shows
        the herd well within state law and on the better side of the FDA
        standard for raw — even though the FDA standard doesn&apos;t apply
        to herd-share milk.
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [selected, setSelected] = useState<StateCode>(HERD_SHARE_TEMPLATES[0].code);
  const tpl = HERD_SHARE_TEMPLATES.find((t) => t.code === selected)!;
  const sample = useMemo(
    () =>
      render(tpl.body, {
        farm_name: "Three Forks Dairy",
        farm_address: "1842 Co. Rd. 6, Fairplay CO 80440",
        shareholder_name: "Sarah Whitmore",
        shareholder_address: "1402 Elm St., Athens OH 45701",
        share_fraction: "1/30",
        buy_in_amount: "220.00",
        monthly_boarding_fee: "115.00",
        allotment: "2 gallons",
        effective_date: "May 1, 2026",
      }),
    [tpl],
  );

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-1">
        <div className="small-caps text-[10px] text-soil/55 px-2 mb-2">
          State templates
        </div>
        {HERD_SHARE_TEMPLATES.map((t) => {
          const active = selected === t.code;
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => setSelected(t.code)}
              className={`w-full text-left px-4 py-3 rounded transition-colors ${
                active ? "bg-wheat/15 text-brick" : "hover:bg-cream"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="display">{t.state}</span>
                <span className="font-mono text-[10px] text-soil/55">
                  {t.code}
                </span>
              </div>
              <div className="text-[11px] text-soil/55 italic mt-0.5">
                {t.retentionYears} yr retention
              </div>
            </button>
          );
        })}
        <div className="rule my-4" />
        <p className="text-[11px] text-soil/55 italic px-2 leading-relaxed">
          Not legal advice. Have a local attorney review before using with
          shareholders. These templates capture the substantive legal
          requirements as commonly understood; specifics vary by jurisdiction.
        </p>
      </aside>

      <div className="paper p-7">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="display text-2xl font-medium">{tpl.state}</h3>
          <div className="text-xs text-soil/55 small-caps">
            {tpl.retentionYears}-year retention
          </div>
        </div>
        <p className="text-sm text-soil/75 italic mb-5 leading-relaxed">
          {tpl.legalRegime}
        </p>

        <div className="rule my-5" />

        <div className="text-xs text-soil/65 mb-4 small-caps">
          Preview with sample values
        </div>
        <div className="bg-cream/40 p-6 rounded border border-outline">
          <pre className="font-body text-sm whitespace-pre-wrap leading-relaxed">
            {sample}
          </pre>
        </div>

        {tpl.notes && (
          <p className="text-xs text-soil/55 italic mt-4 leading-relaxed">
            <Jar className="w-3 h-4 inline text-wheatDark mr-1" />
            <strong className="not-italic font-mono small-caps text-[10px] text-brick mr-1">
              Note
            </strong>
            {tpl.notes}
          </p>
        )}

        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-outline">
          <button className="btn btn-primary text-sm">
            Use this template →
          </button>
          <button className="btn btn-ghost text-sm">Download markdown</button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "wheat",
}: {
  label: string;
  value: string;
  accent?: "wheat" | "moss" | "brick";
}) {
  const color =
    accent === "moss"
      ? "text-mossDark"
      : accent === "brick"
        ? "text-brick"
        : "text-wheatDark";
  return (
    <div className="paper p-5">
      <div className={`display text-3xl font-medium leading-none ${color}`}>
        {value}
      </div>
      <div className="text-xs text-soil/55 small-caps mt-2">{label}</div>
    </div>
  );
}
