"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { Wheat, Barn, Sun } from "@/components/mark";

type Source =
  | "barn2door"
  | "local-line"
  | "harvie"
  | "grazecart"
  | "csaware"
  | "shopify"
  | "spreadsheet"
  | "paper";

const SOURCES: { id: Source; name: string; hint: string }[] = [
  { id: "barn2door", name: "Barn2Door", hint: "We have a parser for their CSV export" },
  { id: "local-line", name: "Local Line", hint: "We have a parser for their CSV export" },
  { id: "harvie", name: "Harvie (RIP)", hint: "Last known good Harvie dump format" },
  { id: "grazecart", name: "GrazeCart", hint: "Manual mapping, we'll help" },
  { id: "csaware", name: "CSAware", hint: "We support their export" },
  { id: "shopify", name: "Shopify + apps", hint: "Customers + Subscriptions exports" },
  { id: "spreadsheet", name: "A spreadsheet", hint: "Any CSV; we'll help you map the columns" },
  { id: "paper", name: "A binder and a pen", hint: "Email us; we type it in for you" },
];

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source | "">("");

  return (
    <div>
      <PageHeader
        eyebrow="Bring your data home"
        title="Migrate your farm."
        subtitle="Members, subscriptions, ledger entries, herd-share contracts — we'll bring it all over. We do this by hand and for free."
      />

      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <StepBar current={step} />

        <div className="paper p-8 md:p-10 mt-8">
          {step === 0 && (
            <>
              <div className="small-caps text-xs text-brick mb-2">Step one</div>
              <h2 className="display text-2xl font-medium mb-6">
                Where are you coming from?
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {SOURCES.map((s) => {
                  const active = source === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSource(s.id)}
                      className={`text-left p-4 rounded-md border transition-colors ${
                        active
                          ? "border-brick bg-brick/5"
                          : "border-soil/15 hover:border-soil/30"
                      }`}
                    >
                      <div className="display text-base">{s.name}</div>
                      <div className="text-xs text-soil/55 italic mt-1">
                        {s.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="small-caps text-xs text-brick mb-2">Step two</div>
              <h2 className="display text-2xl font-medium mb-6">
                Upload your data.
              </h2>
              {source === "paper" ? (
                <div className="text-center py-12 paper bg-cream">
                  <Barn className="w-14 h-12 text-brick mx-auto mb-4" />
                  <div className="display text-xl mb-2">
                    Write us — we&apos;ll type it in.
                  </div>
                  <p className="text-sm text-soil/65 italic max-w-md mx-auto">
                    Take a photo of the binder pages and email them to{" "}
                    <a
                      href="mailto:migrate@communicare.farm"
                      className="text-brick hover:underline not-italic"
                    >
                      migrate@communicare.farm
                    </a>
                    . We&apos;ll do the data entry for you. Usually under 48
                    hours.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-soil/25 rounded-lg p-12 text-center">
                    <Wheat className="w-14 h-16 text-wheatDark mx-auto mb-4 opacity-60" />
                    <div className="display text-lg mb-1">
                      Drop your CSV here
                    </div>
                    <div className="text-xs text-soil/55 italic mb-5">
                      or click to choose a file
                    </div>
                    <button className="btn btn-primary text-sm">
                      Choose a CSV file →
                    </button>
                  </div>
                  <p className="text-xs text-soil/55 italic mt-4">
                    We auto-detect columns: name, email, phone, share type,
                    pickup site, billing schedule, credit balance, joined
                    date. You&apos;ll preview and confirm everything before
                    anything gets written.
                  </p>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="small-caps text-xs text-brick mb-2">Step three</div>
              <h2 className="display text-2xl font-medium mb-6">
                Preview the import.
              </h2>
              <div className="paper overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cream border-b border-soil/15">
                    <tr className="text-left small-caps text-xs text-soil/55">
                      <th className="px-4 py-2 font-medium">Member</th>
                      <th className="px-4 py-2 font-medium">Share</th>
                      <th className="px-4 py-2 font-medium">Credit</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Sarah Whitmore", "Standard share", "$42.00", "ok"],
                      ["Tomás Reyes", "Standard share", "$0.00", "ok"],
                      ["Mei Chen", "Half share", "$18.00", "needs review — no phone"],
                      ["Caleb Anderson", "1/30th cow share", "$115.00", "ok"],
                      ["Priya Iyer", "Quarter beef", "$250.00", "ok"],
                    ].map(([n, s, c, st]) => (
                      <tr
                        key={n}
                        className="border-b border-soil/8 last:border-0"
                      >
                        <td className="px-4 py-3">{n}</td>
                        <td className="px-4 py-3 text-soil/65">{s}</td>
                        <td className="px-4 py-3 display">{c}</td>
                        <td className="px-4 py-3 text-right">
                          {st === "ok" ? (
                            <span className="text-mossDark small-caps text-xs">
                              ok
                            </span>
                          ) : (
                            <span className="text-brick small-caps text-xs">
                              {st}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-soil/55 italic mt-4">
                We parsed 47 members. 46 look clean; 1 needs review. Once you
                confirm, we&apos;ll create the accounts and send a welcome
                magic link to each member.
              </p>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <Sun className="w-16 h-16 text-wheat mx-auto mb-5" />
              <div className="small-caps text-xs text-brick mb-3">
                Welcome home
              </div>
              <h2 className="display text-3xl font-medium mb-4">
                Your farm is on Communicare.
              </h2>
              <p className="text-soil/75 max-w-md mx-auto leading-relaxed">
                We brought over 47 members, 12 share definitions, $2,418 in
                credit balances, and four years of order history. The
                magic-link welcome emails go out tomorrow morning.
              </p>
              <div className="display italic text-brick mt-6">Pax tibi.</div>
            </div>
          )}

          <div className="pt-6 mt-8 border-t border-soil/15 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="display italic text-soil/65 hover:text-brick text-sm"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !source}
                className="btn btn-primary disabled:opacity-50"
              >
                {step === 2 ? "Confirm + import →" : "Next →"}
              </button>
            ) : (
              <a href="/farmer/" className="btn btn-primary">
                Open my farm →
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-soil/55 italic mt-8">
          Stuck? Write{" "}
          <a
            href="mailto:migrate@communicare.farm"
            className="text-brick hover:underline not-italic"
          >
            migrate@communicare.farm
          </a>{" "}
          and a real person will walk through it with you. Free, always.
        </p>
      </div>
    </div>
  );
}

function StepBar({ current }: { current: number }) {
  const STEPS = ["Source", "Upload", "Preview", "Done"];
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-xs display border ${
                  state === "active"
                    ? "bg-brick text-parchment border-brick"
                    : state === "done"
                      ? "bg-mossDark text-parchment border-mossDark"
                      : "bg-parchment text-soil/45 border-soil/20"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs display ${state === "active" ? "text-soil" : "text-soil/45"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="text-soil/20 mx-1">·····</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
