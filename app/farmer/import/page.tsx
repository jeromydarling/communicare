"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { Wheat, Barn, Sun } from "@/components/mark";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// =============================================================================
// /farmer/import — CSV import with AI-assisted column mapping.
// =============================================================================
// Five steps:
//   0. Where are you coming from? (Barn2Door / Local Line / Harvie / etc.)
//   1. Drop a CSV. We parse it client-side.
//   2. AI maps the columns + matches share types + matches pickup sites.
//      Operator confirms or overrides.
//   3. Preview + commit.
//   4. Invite everyone? (Optional magic-link email to each imported member.)
//
// The concierge path ("paper") never goes through steps 1-4 — it emails
// the operator at migrate@communicare.farm. Always available at the bottom.
// =============================================================================

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
  { id: "barn2door", name: "Barn2Door", hint: "We parse their CSV export directly" },
  { id: "local-line", name: "Local Line", hint: "We parse their CSV export directly" },
  { id: "harvie", name: "Harvie (RIP)", hint: "Last known Harvie dump format" },
  { id: "grazecart", name: "GrazeCart", hint: "Manual mapping, we help" },
  { id: "csaware", name: "CSAware", hint: "We support their export" },
  { id: "shopify", name: "Shopify + apps", hint: "Customers + Subscriptions exports" },
  { id: "spreadsheet", name: "A spreadsheet", hint: "Any CSV; the AI maps the columns" },
  { id: "paper", name: "A binder and a pen", hint: "Email us; we type it in for you" },
];

type CanonField =
  | "name"
  | "email"
  | "phone"
  | "share"
  | "pickup"
  | "credit"
  | "started"
  | "note"
  | "skip";

type ParsedRow = {
  row_number: number;
  raw: Record<string, string>;
  name: string;
  email: string | null;
  phone: string | null;
  shareLabel: string;
  pickupLabel: string | null;
  credit_cents: number;
  started_on: string | null;
  note: string | null;
};

type ShareDef = {
  id: string;
  name: string;
  description: string | null;
};
type PickupSite = {
  id: number;
  name: string;
  address: string | null;
};

type ResultPayload = {
  imported: number;
  warned: number;
  invited: number;
  messages: string[];
  importableEmails: string[];
};

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source | "">("");
  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, CanonField>>({});
  const [shareDefs, setShareDefs] = useState<ShareDef[]>([]);
  const [pickupSites, setPickupSites] = useState<PickupSite[]>([]);
  const [shareMap, setShareMap] = useState<Record<string, string>>({});
  const [pickupMap, setPickupMap] = useState<Record<string, number>>({});
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmLoadError, setFarmLoadError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);

  // ---------------------------------------------------------------------------
  // Load the operator's farm + their defined shares + pickup sites on mount.
  // Without these the mapping step is unusable.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userData?.user) {
        setFarmLoadError("Sign in before importing.");
        return;
      }
      const { data: fm } = await supabase
        .from("farm_members")
        .select("farm_id, role")
        .eq("user_id", userData.user.id)
        .in("role", ["owner", "staff"])
        .maybeSingle();
      const fmRow = fm as { farm_id: string; role: string } | null;
      if (cancelled) return;
      if (!fmRow) {
        setFarmLoadError("No farm found for this account.");
        return;
      }
      setFarmId(fmRow.farm_id);

      const [{ data: shares }, { data: pickups }] = await Promise.all([
        supabase
          .from("share_definitions")
          .select("id, name, description")
          .eq("farm_id", fmRow.farm_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("pickup_sites")
          .select("id, name, address")
          .eq("farm_id", fmRow.farm_id)
          .eq("is_active", true)
          .order("display_order"),
      ]);
      if (cancelled) return;
      setShareDefs((shares ?? []) as ShareDef[]);
      setPickupSites((pickups ?? []) as PickupSite[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFile(file: File) {
    setParseError(null);
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const { headers: h, rows: r } = parseCsv(text);
        if (h.length === 0 || r.length === 0) {
          setParseError("That file looked empty. Is the first row your headers?");
          return;
        }
        setHeaders(h);
        setRows(r);
        // Reset any prior AI output
        setColumnMap({});
        setShareMap({});
        setPickupMap({});
        setAiNotes(null);
        setAiError(null);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Couldn't parse that file.",
        );
      }
    };
    reader.readAsText(file);
  }

  // Derive the parsed rows from the current column mapping
  const parsed = useMemo<ParsedRow[]>(() => {
    if (rows.length === 0) return [];
    return rows.map((r, idx) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => {
        raw[h] = (r[i] ?? "").trim();
      });
      const find = (field: CanonField): string => {
        const header = headers.find((h) => columnMap[h] === field);
        return header ? (raw[header] ?? "") : "";
      };
      const credit = find("credit");
      const credit_cents = credit
        ? Math.round(parseFloat(credit.replace(/[^0-9.-]/g, "") || "0") * 100)
        : 0;
      return {
        row_number: idx + 2,
        raw,
        name: find("name"),
        email: find("email") || null,
        phone: find("phone") || null,
        shareLabel: find("share"),
        pickupLabel: find("pickup") || null,
        credit_cents: isNaN(credit_cents) ? 0 : credit_cents,
        started_on: find("started") || null,
        note: find("note") || null,
      };
    });
  }, [rows, headers, columnMap]);

  const uniqueShareLabels = useMemo(
    () =>
      Array.from(new Set(parsed.map((r) => r.shareLabel).filter(Boolean))).sort(),
    [parsed],
  );
  const uniquePickupLabels = useMemo(
    () =>
      Array.from(
        new Set(parsed.map((r) => r.pickupLabel ?? "").filter(Boolean)),
      ).sort(),
    [parsed],
  );

  const importable = useMemo(
    () =>
      parsed.filter((r) => r.name && shareMap[r.shareLabel] !== undefined),
    [parsed, shareMap],
  );
  const skipped = parsed.length - importable.length;

  // ---------------------------------------------------------------------------
  // AI parse — runs once after upload, fills column_map + share_map + pickup_map.
  // ---------------------------------------------------------------------------
  async function runAiParse() {
    if (rows.length === 0) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setAiError("Supabase isn't configured on this deploy.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-parse-csv", {
        body: {
          preview: {
            headers,
            rows: rows.slice(0, 30),
          },
          share_definitions: shareDefs,
          pickup_sites: pickupSites,
          source_hint: source || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error ?? "AI parse failed");

      const cm = data.column_map as Record<string, CanonField>;
      const sm = data.share_map as Record<string, string | null>;
      const pm = data.pickup_map as Record<string, number | null>;

      // Only keep mappings that point to real fields/IDs.
      const cleanColumnMap: Record<string, CanonField> = {};
      for (const h of headers) {
        cleanColumnMap[h] = (cm?.[h] as CanonField) ?? "skip";
      }
      const cleanShareMap: Record<string, string> = {};
      for (const [label, id] of Object.entries(sm ?? {})) {
        if (id) cleanShareMap[label] = id;
      }
      const cleanPickupMap: Record<string, number> = {};
      for (const [label, id] of Object.entries(pm ?? {})) {
        if (typeof id === "number") cleanPickupMap[label] = id;
      }

      setColumnMap(cleanColumnMap);
      setShareMap(cleanShareMap);
      setPickupMap(cleanPickupMap);
      setAiNotes(typeof data.notes === "string" ? data.notes : null);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Couldn't reach the AI.");
    } finally {
      setAiLoading(false);
    }
  }

  // Trigger AI parse when the operator moves from upload → map for the first
  // time (or when they re-upload). Keeps the wizard one-click for the common
  // case while leaving the override UI in place.
  useEffect(() => {
    if (step !== 2) return;
    if (rows.length === 0) return;
    // Already mapped (operator went back and came forward)? Skip.
    if (Object.keys(columnMap).length > 0) return;
    if (aiLoading) return;
    runAiParse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------------------------------------------------------------------------
  // Commit — sends importable rows to the import-members edge function.
  // ---------------------------------------------------------------------------
  async function commit(sendInvites: boolean) {
    if (!farmId) {
      setResult({
        imported: 0,
        warned: 0,
        invited: 0,
        messages: [farmLoadError ?? "No farm loaded."],
        importableEmails: [],
      });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setResult({
        imported: 0,
        warned: 0,
        invited: 0,
        messages: ["Supabase isn't configured on this deploy."],
        importableEmails: [],
      });
      return;
    }

    setCommitting(true);
    setResult(null);

    const payload = {
      farm_id: farmId,
      source: (source as Source) || "spreadsheet",
      filename,
      send_invites: sendInvites,
      mapping: { column_map: columnMap, share_map: shareMap, pickup_map: pickupMap },
      rows: importable.map((r) => ({
        row_number: r.row_number,
        name: r.name,
        email: r.email,
        phone: r.phone,
        share_definition_id: shareMap[r.shareLabel],
        pickup_site_id: r.pickupLabel ? pickupMap[r.pickupLabel] ?? null : null,
        credit_cents: r.credit_cents,
        started_on: r.started_on,
        note: r.note,
      })),
    };

    const { data, error } = await supabase.functions.invoke("import-members", {
      body: payload,
    });
    if (error) {
      setResult({
        imported: 0,
        warned: 0,
        invited: 0,
        messages: [error.message],
        importableEmails: [],
      });
    } else {
      const messages = ((data?.results ?? []) as { status: string; row_number: number; name: string; message?: string }[])
        .filter((r) => r.status === "warned")
        .slice(0, 10)
        .map((r) => `Row ${r.row_number} (${r.name}): ${r.message ?? "warned"}`);
      setResult({
        imported: data?.imported ?? 0,
        warned: data?.warned ?? 0,
        invited: data?.invited ?? 0,
        messages,
        importableEmails: importable
          .map((r) => r.email)
          .filter((e): e is string => Boolean(e)),
      });
      // After commit, jump to the invite step (3) so the operator can
      // choose whether to send invites now.
      setStep(3);
    }
    setCommitting(false);
  }

  // ---------------------------------------------------------------------------
  // Invite — called from step 3 when the operator says yes. Hits the
  // invite-members edge function with the list of emails we just imported.
  // ---------------------------------------------------------------------------
  async function sendInvites() {
    if (!farmId || !result) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSendingInvites(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { data, error } = await supabase.functions.invoke("invite-members", {
      body: {
        farm_id: farmId,
        emails: result.importableEmails,
        redirect_to: redirectTo,
      },
    });
    if (error) {
      setResult({
        ...result,
        messages: [...result.messages, `Invite send failed: ${error.message}`],
      });
    } else {
      setResult({
        ...result,
        invited: data?.invited ?? 0,
      });
      setStep(4);
    }
    setSendingInvites(false);
  }

  const emailableCount = result?.importableEmails.length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Bring your data home"
        title="Migrate your farm."
        subtitle="Members, subscriptions, opening balances — we'll bring it all over. Free, and we'll do it by hand if your data is messy."
      />

      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <StepBar current={step} />

        {farmLoadError && (
          <div className="paper p-4 bg-brick/5 border-brick/30 text-sm text-brick italic mt-6">
            {farmLoadError}
          </div>
        )}

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
                Drop your CSV.
              </h2>
              {source === "paper" ? (
                <ConciergePanel />
              ) : (
                <>
                  <FileDrop
                    onFile={handleFile}
                    filename={filename}
                    error={parseError}
                  />
                  {rows.length > 0 && (
                    <p className="text-xs text-soil/55 italic mt-4">
                      Found {rows.length} row{rows.length === 1 ? "" : "s"} and{" "}
                      {headers.length} column{headers.length === 1 ? "" : "s"}.
                      Next step: the AI maps your columns + matches each share
                      type to one you've defined here. You'll get to confirm
                      before any rows are written.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="small-caps text-xs text-brick mb-2">Step three</div>
              <h2 className="display text-2xl font-medium mb-6">
                Confirm the mapping.
              </h2>

              {aiLoading && (
                <div className="paper p-4 bg-cream border-soil/15 text-sm italic mb-6">
                  Reading your CSV and matching it to your shares…
                </div>
              )}
              {aiNotes && !aiLoading && (
                <div className="paper p-4 bg-wheat/10 border-wheat/40 text-sm leading-snug mb-6">
                  <span className="display italic text-brick">From the AI: </span>
                  {aiNotes}
                </div>
              )}
              {aiError && (
                <div className="paper p-4 bg-brick/5 border-brick/30 text-sm text-brick italic mb-6">
                  {aiError}{" "}
                  <button
                    onClick={runAiParse}
                    className="not-italic underline ml-1"
                  >
                    try again
                  </button>
                </div>
              )}

              {/* Column mapping */}
              <div className="mb-8">
                <div className="small-caps text-[10px] text-soil/55 mb-3">
                  Which column is what?
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {headers.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-2 p-3 border border-soil/15 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="display text-sm truncate">{h}</div>
                        <div className="text-[10px] text-soil/55 italic truncate">
                          e.g. {rows[0]?.[headers.indexOf(h)] ?? "—"}
                        </div>
                      </div>
                      <select
                        value={columnMap[h] ?? "skip"}
                        onChange={(e) =>
                          setColumnMap({
                            ...columnMap,
                            [h]: e.target.value as CanonField,
                          })
                        }
                        className="text-sm border border-soil/20 rounded px-2 py-1 bg-parchment"
                      >
                        <option value="skip">— skip —</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="share">Share type</option>
                        <option value="pickup">Pickup site</option>
                        <option value="credit">Credit balance</option>
                        <option value="started">Joined / started</option>
                        <option value="note">Note</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share-type mapping */}
              {uniqueShareLabels.length > 0 && (
                <div className="mb-8">
                  <div className="small-caps text-[10px] text-soil/55 mb-3">
                    Match share types — what your CSV calls them ↔ what's
                    defined on Communicare
                  </div>
                  {shareDefs.length === 0 ? (
                    <div className="paper p-4 bg-wheat/10 border-wheat/40 text-sm leading-snug">
                      Define your shares first at{" "}
                      <a
                        href="/farmer/settings/"
                        className="text-brick hover:underline"
                      >
                        /farmer/settings → Shares
                      </a>
                      , then come back. The importer needs to know "Standard
                      share" maps to one of your defined shares so each
                      imported member is subscribed to the right thing.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uniqueShareLabels.map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 p-3 border border-soil/15 rounded-md"
                        >
                          <div className="flex-1 display text-sm truncate">
                            {label}
                          </div>
                          <span className="text-soil/30">→</span>
                          <select
                            value={shareMap[label] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = { ...shareMap };
                              if (v) next[label] = v;
                              else delete next[label];
                              setShareMap(next);
                            }}
                            className="text-sm border border-soil/20 rounded px-2 py-1 bg-parchment min-w-[180px]"
                          >
                            <option value="">— skip these —</option>
                            {shareDefs.map((sd) => (
                              <option key={sd.id} value={sd.id}>
                                {sd.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pickup-site mapping (optional) */}
              {uniquePickupLabels.length > 0 && pickupSites.length > 0 && (
                <div className="mb-8">
                  <div className="small-caps text-[10px] text-soil/55 mb-3">
                    Match pickup sites
                  </div>
                  <div className="space-y-2">
                    {uniquePickupLabels.map((label) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 p-3 border border-soil/15 rounded-md"
                      >
                        <div className="flex-1 display text-sm truncate">
                          {label}
                        </div>
                        <span className="text-soil/30">→</span>
                        <select
                          value={pickupMap[label] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next = { ...pickupMap };
                            if (v) next[label] = Number(v);
                            else delete next[label];
                            setPickupMap(next);
                          }}
                          className="text-sm border border-soil/20 rounded px-2 py-1 bg-parchment min-w-[180px]"
                        >
                          <option value="">— no default —</option>
                          {pickupSites.map((ps) => (
                            <option key={ps.id} value={String(ps.id)}>
                              {ps.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="border-t border-soil/15 pt-6">
                <div className="small-caps text-[10px] text-soil/55 mb-3">
                  Preview · first 8 rows
                </div>
                <div className="paper overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-cream border-b border-outline">
                      <tr className="text-left small-caps text-xs text-soil/55">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Share</th>
                        <th className="px-3 py-2 font-medium">Pickup</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Credit
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          Will import
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 8).map((r) => {
                        const ok =
                          r.name && shareMap[r.shareLabel] !== undefined;
                        return (
                          <tr
                            key={r.row_number}
                            className="border-b border-soil/8 last:border-0"
                          >
                            <td className="px-3 py-2 display">
                              {r.name || (
                                <em className="text-brick">missing</em>
                              )}
                            </td>
                            <td className="px-3 py-2 text-soil/65 truncate">
                              {r.email ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-soil/65">
                              {r.shareLabel || "—"}
                            </td>
                            <td className="px-3 py-2 text-soil/65">
                              {r.pickupLabel ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {r.credit_cents > 0
                                ? `$${(r.credit_cents / 100).toFixed(2)}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {ok ? (
                                <span className="text-mossDark small-caps text-[10px]">
                                  yes
                                </span>
                              ) : (
                                <span className="text-brick small-caps text-[10px]">
                                  skip
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-soil/55 italic mt-3">
                  {importable.length} of {parsed.length} rows will import.{" "}
                  {skipped > 0 ? `${skipped} skipped (no share match or missing name).` : "All good."}
                </p>
              </div>
            </>
          )}

          {step === 3 && result && (
            <div>
              <div className="text-center pt-2 pb-6">
                <Sun className="w-14 h-14 text-wheat mx-auto mb-4" />
                <div className="small-caps text-xs text-brick mb-2">
                  Welcome home
                </div>
                <h2 className="display text-3xl font-medium mb-2">
                  {result.imported} member
                  {result.imported === 1 ? "" : "s"} imported.
                </h2>
                {result.warned > 0 && (
                  <p className="text-soil/75 max-w-md mx-auto leading-relaxed text-sm">
                    {result.warned} row{result.warned === 1 ? " needs" : "s need"}{" "}
                    a closer look — see below. We kept the rest.
                  </p>
                )}
              </div>

              {emailableCount > 0 && (
                <div className="border-t border-soil/15 pt-6 mt-2">
                  <div className="small-caps text-[10px] text-soil/55 mb-2">
                    The next thing
                  </div>
                  <h3 className="display text-xl mb-3">
                    Send {emailableCount} member
                    {emailableCount === 1 ? "" : "s"} a sign-in link?
                  </h3>
                  <p className="text-sm text-soil/75 leading-relaxed mb-5">
                    A short email goes to each member with a one-click link to
                    your Communicare page. They can confirm their share, set
                    their pickup, and put a card on file. No password to set
                    up — clicking the link signs them in.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={sendInvites}
                      disabled={sendingInvites}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {sendingInvites
                        ? "Sending invites…"
                        : `Send ${emailableCount} invite${emailableCount === 1 ? "" : "s"} →`}
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="display italic text-sm text-soil/65 hover:text-brick"
                    >
                      Not yet — I'll do it later
                    </button>
                  </div>
                </div>
              )}

              {result.messages.length > 0 && (
                <div className="border-t border-soil/15 pt-6 mt-6">
                  <div className="small-caps text-[10px] text-soil/55 mb-3">
                    Rows that need a closer look
                  </div>
                  <ul className="text-xs text-soil/65 space-y-1.5 italic">
                    {result.messages.map((m, i) => (
                      <li key={i}>• {m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 4 && result && (
            <div className="text-center py-8">
              <Sun className="w-16 h-16 text-wheat mx-auto mb-5" />
              <div className="small-caps text-xs text-brick mb-3">
                {result.invited > 0 ? "Invites are out" : "All set"}
              </div>
              <h2 className="display text-3xl font-medium mb-4">
                {result.invited > 0
                  ? `${result.invited} invite${result.invited === 1 ? "" : "s"} sent.`
                  : "Your farm is ready."}
              </h2>
              <p className="text-soil/75 max-w-md mx-auto leading-relaxed">
                {result.invited > 0
                  ? "We'll let you know who clicks. You can resend any invite from the Members page."
                  : "Your members are in the roster. You can invite them any time from the Members page."}
              </p>
              <div className="display italic text-brick mt-6">Pax tibi.</div>
            </div>
          )}

          {/* Footer nav */}
          <div className="pt-6 mt-8 border-t border-soil/15 flex items-center justify-between">
            {step > 0 && step < 3 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="display italic text-soil/65 hover:text-brick text-sm"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step === 0 && (
              <button
                onClick={() => setStep(1)}
                disabled={!source}
                className="btn btn-primary disabled:opacity-50"
              >
                Next →
              </button>
            )}
            {step === 1 && source !== "paper" && (
              <button
                onClick={() => setStep(2)}
                disabled={rows.length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                Next →
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => commit(false)}
                disabled={committing || importable.length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                {committing
                  ? "Importing…"
                  : `Import ${importable.length} member${importable.length === 1 ? "" : "s"} →`}
              </button>
            )}
            {step === 3 && (
              <a
                href="/farmer/"
                className="display italic text-sm text-soil/65 hover:text-brick"
              >
                Skip — open my farm →
              </a>
            )}
            {step === 4 && (
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

// -----------------------------------------------------------------------------
// File-drop widget
// -----------------------------------------------------------------------------

function FileDrop({
  onFile,
  filename,
  error,
}: {
  onFile: (f: File) => void;
  filename: string | null;
  error: string | null;
}) {
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }
  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-soil/25 rounded-lg p-12 text-center cursor-pointer hover:border-soil/40 transition-colors block"
      >
        <Wheat className="w-14 h-16 text-wheatDark mx-auto mb-4 opacity-60" />
        <div className="display text-lg mb-1">
          {filename ? filename : "Drop your CSV here"}
        </div>
        <div className="text-xs text-soil/55 italic mb-5">
          {filename ? "Click to choose a different file" : "or click to choose a file"}
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
          className="hidden"
        />
        <span className="btn btn-primary text-sm">Choose a CSV file →</span>
      </label>
      {error && (
        <div className="text-xs text-brick italic mt-3">{error}</div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// "Email us and we'll type it in" panel
// -----------------------------------------------------------------------------

function ConciergePanel() {
  return (
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
        . We&apos;ll do the data entry for you. Usually under 48 hours.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step bar
// -----------------------------------------------------------------------------

function StepBar({ current }: { current: number }) {
  const STEPS = ["Source", "Upload", "Confirm", "Imported", "Invite"];
  return (
    <ol className="flex items-center gap-2 flex-wrap">
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
              <span className="text-soil/20 mx-1 hidden sm:inline">·····</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// =============================================================================
// CSV parser — tiny but correct for the standard case (quoted fields,
// escaped quotes, commas inside quotes, CRLF or LF line endings)
// =============================================================================

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine).filter((r) => r.some((c) => c));
  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i - 1] !== "\\") inQuote = !inQuote;
    if ((c === "\n" || c === "\r") && !inQuote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (buf.length > 0) out.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  out.push(buf);
  return out.map((s) => s.trim());
}
