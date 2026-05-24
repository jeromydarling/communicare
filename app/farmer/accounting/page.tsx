"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/farmer/shell";
import { downloadCsv } from "@/lib/csv-export";
import { demoOrders, demoProducts, demoMembers, formatCents } from "@/lib/farmer-demo";

type Integration =
  | { id: "quickbooks"; name: "QuickBooks Online"; status: "available"; oauth: true }
  | { id: "wave"; name: "Wave"; status: "available"; oauth: true }
  | { id: "csv"; name: "CSV exports for your CPA"; status: "available"; oauth: false }
  | { id: "xero"; name: "Xero"; status: "coming"; oauth: true };

const INTEGRATIONS: Integration[] = [
  { id: "quickbooks", name: "QuickBooks Online", status: "available", oauth: true },
  { id: "wave", name: "Wave", status: "available", oauth: true },
  { id: "csv", name: "CSV exports for your CPA", status: "available", oauth: false },
  { id: "xero", name: "Xero", status: "coming", oauth: true },
];

export default function AccountingPage() {
  const [connected, setConnected] = useState<string | null>(null);

  // Compute the dataset that would sync
  const totalRevenue = demoOrders.reduce((s, o) => s + o.total_cents, 0);
  const totalMembers = demoMembers.length;

  return (
    <div>
      <PageHeader
        eyebrow="Books-keeping integrations"
        title="Accounting."
        subtitle="Move sales, refunds, credit-ledger entries, and 1099 data into your bookkeeping. Or download the CSVs and hand them to a CPA."
      />

      <div className="px-6 md:px-10 py-8 space-y-8 max-w-4xl">
        {connected ? (
          <div className="paper p-6 bg-moss/5 border-moss/30">
            <div className="display text-mossDark text-lg">
              ✓ Connected to {connected}
            </div>
            <p className="text-sm text-soil/75 mt-2">
              We&apos;ll sync new orders, refunds, and ledger entries every
              night at 2am Eastern. Manual sync available from your{" "}
              <Link href="/farmer/settings/" className="text-brick hover:underline">
                Settings
              </Link>{" "}
              page.
            </p>
            <button
              type="button"
              onClick={() => setConnected(null)}
              className="text-xs italic text-soil/55 hover:text-brick mt-3"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {INTEGRATIONS.map((opt) => (
              <div
                key={opt.id}
                className={`paper p-6 ${opt.status === "coming" ? "opacity-60" : ""}`}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="display text-lg font-medium">{opt.name}</h3>
                  {opt.status === "coming" && (
                    <span className="small-caps text-[10px] text-soil/55">
                      Coming
                    </span>
                  )}
                </div>
                <p className="text-sm text-soil/65 italic mb-5 leading-relaxed">
                  {opt.id === "quickbooks" &&
                    "Syncs orders as invoices, refunds as credit memos, the ledger as journal entries. Class-tracked per pickup site so you can see margin by location."}
                  {opt.id === "wave" &&
                    "Same sync as QuickBooks, free tier. Best for farms with under $50k in sales."}
                  {opt.id === "csv" &&
                    "Six CSVs: sales by month, refunds, ledger, members (for 1099), payouts, and a year-end summary. Download as often as you like."}
                  {opt.id === "xero" &&
                    "Common request — write us if you'd use it and we'll prioritize."}
                </p>

                {opt.id === "csv" ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          "ledger-summary.csv",
                          demoOrders.map((o) => ({
                            date: o.pickup_date,
                            member: o.member,
                            product: o.items.join(" | "),
                            site: o.pickup_site,
                            cents: o.total_cents,
                            status: o.status,
                          })),
                        )
                      }
                      className="btn btn-primary text-sm w-full justify-center"
                    >
                      Download ledger summary →
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          "members-for-1099.csv",
                          demoMembers.map((m) => ({
                            display_name: m.display_name,
                            email: m.email,
                            joined: m.joined_on,
                            credit_balance: m.credit_balance_cents,
                            status: m.status,
                          })),
                        )
                      }
                      className="btn btn-ghost text-sm w-full justify-center"
                    >
                      Members for 1099
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={opt.status === "coming"}
                    onClick={() => setConnected(opt.name)}
                    className="btn btn-primary text-sm w-full justify-center disabled:opacity-50"
                  >
                    {opt.status === "coming"
                      ? "Notify me"
                      : `Connect ${opt.name} →`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* What gets synced */}
        <section className="paper p-7">
          <div className="small-caps text-xs text-brick mb-3">
            What we sync
          </div>
          <h3 className="display text-xl font-medium mb-5">
            The data your accountant cares about.
          </h3>
          <div className="grid sm:grid-cols-3 gap-5">
            <SyncCol
              n="01"
              title="Sales"
              body="Every order → invoice with date, member, items, and pickup site as a class tag. Catch-weight items show the actual hanging weight."
              sample={`${demoOrders.length} orders · ${formatCents(totalRevenue)}`}
            />
            <SyncCol
              n="02"
              title="Refunds & credits"
              body="Skip-week credits, damaged-item refunds, donation credits — each posts as a credit memo against the original invoice."
              sample={`${demoOrders.filter((o) => o.status === "donated").length} credits this batch`}
            />
            <SyncCol
              n="03"
              title="1099 data"
              body="At year end, we generate the 1099-K data for every member who paid by card and met the threshold. Downloadable as a CSV ready for upload."
              sample={`${totalMembers} members on file`}
            />
          </div>
        </section>

        {/* SNAP-online (deferred but stubbed) */}
        <section className="paper p-7">
          <div className="small-caps text-xs text-brick mb-3">
            SNAP-online
          </div>
          <h3 className="display text-xl font-medium mb-3">
            EBT acceptance for online produce sales.
          </h3>
          <p className="text-sm text-soil/75 leading-relaxed mb-5">
            Run by USDA through the{" "}
            <a
              href="https://www.fns.usda.gov/snap/online-purchasing-pilot"
              target="_blank"
              rel="noreferrer"
              className="text-brick hover:underline"
            >
              MarketLink program
            </a>
            . The application is a 6-month process and you need to apply
            directly to USDA — we can&apos;t do it for you, but we&apos;ve
            done the integration work so the moment you&apos;re approved
            you can flip a switch and accept SNAP at checkout.
          </p>
          <div className="paper p-5 bg-cream border-outline">
            <div className="small-caps text-[10px] text-soil/55 mb-3">
              Where you are
            </div>
            <ol className="space-y-3 text-sm">
              {[
                { done: true, label: "Read the eligibility guide", detail: "Farms accepting SNAP must meet 'eligible food' criteria — produce, dairy, eggs, meat, plants. Prepared foods don't count." },
                { done: true, label: "Get your FNS number from USDA", detail: "Apply at usda.gov/fns/retailer-application. Free, takes ~3 weeks." },
                { done: false, label: "Submit to the MarketLink pilot", detail: "Tell USDA you'll be using Communicare; we'll send their integration team your account info." },
                { done: false, label: "Flip the switch", detail: "Once approved, this turns into an 'Accept SNAP' toggle on your Payments page." },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center text-[10px] shrink-0 ${
                      step.done
                        ? "bg-mossDark border-mossDark text-parchment"
                        : "border-soil/25"
                    }`}
                  >
                    {step.done ? "✓" : i + 1}
                  </div>
                  <div>
                    <div className="display">{step.label}</div>
                    <div className="text-xs text-soil/65 italic">
                      {step.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

function SyncCol({
  n,
  title,
  body,
  sample,
}: {
  n: string;
  title: string;
  body: string;
  sample: string;
}) {
  return (
    <div>
      <div className="small-caps text-[10px] text-wheat mb-1">№ {n}</div>
      <h4 className="display text-base font-medium leading-tight mb-2">
        {title}
      </h4>
      <p className="text-xs text-soil/75 leading-relaxed mb-3">{body}</p>
      <div className="text-[10px] font-mono text-soil/55 bg-cream/50 rounded px-2 py-1 inline-block">
        {sample}
      </div>
    </div>
  );
}
