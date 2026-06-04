"use client";

// =============================================================================
// HortusIntegrationCard
// =============================================================================
// Drop this inside the existing FarmerSettingsPage grid, after the "Team"
// section. It handles the full link / unlink lifecycle inline.
//
// Usage:
//   import { HortusIntegrationCard } from "./HortusIntegrationCard";
//   ...
//   <HortusIntegrationCard farmId={farmId} />
// =============================================================================

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type LinkState =
  | { status: "loading" }
  | { status: "linked"; hortus_community_id: string; hortus_email: string; linked_at: string }
  | { status: "exists"; hortus_community_id: string | null }  // Hortus account found, not yet linked
  | { status: "unlinked"; signup_url: string }                // No Hortus account
  | { status: "error"; message: string };

interface HortusIntegrationCardProps {
  farmId: string;
}

export function HortusIntegrationCard({ farmId }: HortusIntegrationCardProps) {
  const [state, setState] = useState<LinkState>({ status: "loading" });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!farmId) return;
    lookup();
  }, [farmId]);

  async function lookup() {
    setState({ status: "loading" });
    const { data, error } = await supabase.functions.invoke("hortus-link", {
      body: { farm_id: farmId },
      // Append ?op=lookup via the headers workaround — or use a wrapper route
    });
    // Note: invoke doesn't support query params natively; use fetch directly
    const res = await callLink("lookup", { farm_id: farmId });
    if (!res.ok) {
      setState({ status: "error", message: res.error ?? "Lookup failed" });
      return;
    }
    if (res.linked) {
      setState({
        status: "linked",
        hortus_community_id: res.hortus_community_id,
        hortus_email: res.hortus_email,
        linked_at: res.linked_at,
      });
    } else if (res.hortus_exists && res.hortus_community_id) {
      setState({ status: "exists", hortus_community_id: res.hortus_community_id });
    } else {
      setState({ status: "unlinked", signup_url: res.signup_url });
    }
  }

  async function callLink(op: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hortus-link?op=${op}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleConfirm() {
    if (state.status !== "exists" || !state.hortus_community_id) return;
    setWorking(true);
    const { data: { user } } = await supabase.auth.getUser();
    const res = await callLink("confirm", {
      farm_id:            farmId,
      hortus_community_id: state.hortus_community_id,
      hortus_email:       user?.email ?? "",
    });
    setWorking(false);
    if (res.ok) await lookup();
    else setState({ status: "error", message: res.error ?? "Link failed" });
  }

  async function handleUnlink() {
    if (!confirm("Disconnect Hortus? Harvest syncing and map promotion will stop.")) return;
    setWorking(true);
    const res = await callLink("unlink", { farm_id: farmId });
    setWorking(false);
    if (res.ok) await lookup();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const HORTUS_GREEN = "#0d6f74";

  if (state.status === "loading") {
    return (
      <section className="paper p-8 opacity-60 animate-pulse">
        <div className="h-4 bg-soil/10 rounded w-48 mb-3" />
        <div className="h-3 bg-soil/10 rounded w-72" />
      </section>
    );
  }

  return (
    <section className="paper p-8" style={{ borderLeftColor: HORTUS_GREEN, borderLeftWidth: 3 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="small-caps text-xs mb-1" style={{ color: HORTUS_GREEN }}>
            Hortus Integration
          </div>
          <h2 className="display text-2xl font-medium mb-1">
            Connect your growing data.
          </h2>
          <p className="text-sm text-soil/65 max-w-md leading-relaxed">
            Link your Hortus garden to automatically update inventory when you
            log a harvest, pre-fill this week&apos;s share contents from your
            succession plan, and list your farm as a verified pin on the Hortus
            food map.
          </p>
        </div>
        {/* Hortus logo mark — simple leaf SVG */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
          <circle cx="18" cy="18" r="18" fill="#0d6f74" fillOpacity=".12" />
          <path
            d="M18 28C14 22 10 17 14 12C16 9 21 9 23 12C27 17 22 24 18 28Z"
            fill={HORTUS_GREEN}
            opacity=".85"
          />
        </svg>
      </div>

      <div className="mt-6">
        {/* ── Linked ── */}
        {state.status === "linked" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-moss/10 border border-moss/25">
              <span className="text-mossDark text-lg">✓</span>
              <div>
                <div className="text-sm font-semibold text-soil">Connected to Hortus</div>
                <div className="text-xs text-soil/55 mt-0.5">{state.hortus_email}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Benefit icon="🌾" label="Harvest → Inventory" description="Auto-updates when you log a harvest in Hortus" />
              <Benefit icon="📅" label="Week Preview" description="Succession plan feeds this week's share contents" />
              <Benefit icon="📍" label="Map Pin" description="Verified subscribe pin on Hortus food map" />
            </div>
            <button
              onClick={handleUnlink}
              disabled={working}
              className="btn btn-ghost text-sm text-soil/50 mt-2"
            >
              {working ? "Disconnecting…" : "Disconnect Hortus"}
            </button>
          </div>
        )}

        {/* ── Hortus account found, one-tap link ── */}
        {state.status === "exists" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
              We found your Hortus account. Connect it to start syncing your harvest data.
            </div>
            <button
              onClick={handleConfirm}
              disabled={working}
              className="btn btn-primary"
              style={{ background: HORTUS_GREEN }}
            >
              {working ? "Connecting…" : "Connect Hortus"}
            </button>
          </div>
        )}

        {/* ── No Hortus account ── */}
        {state.status === "unlinked" && (
          <div className="space-y-3">
            <p className="text-sm text-soil/65">
              No Hortus account found for this email. Create one to connect your growing data.
            </p>
            <a
              href={state.signup_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost text-sm inline-flex items-center gap-2"
              style={{ borderColor: HORTUS_GREEN, color: HORTUS_GREEN }}
            >
              Create Hortus account →
            </a>
          </div>
        )}

        {/* ── Error ── */}
        {state.status === "error" && (
          <div className="p-4 rounded-xl border border-brick/25 bg-brick/5 text-sm text-brick">
            {state.message}{" "}
            <button onClick={lookup} className="underline">Try again</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Benefit({ icon, label, description }: { icon: string; label: string; description: string }) {
  return (
    <div className="p-3 rounded-xl bg-parchment border border-soil/10">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs font-semibold text-soil mb-0.5">{label}</div>
      <div className="text-[11px] text-soil/55 leading-snug">{description}</div>
    </div>
  );
}
