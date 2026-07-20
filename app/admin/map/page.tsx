"use client";

// =============================================================================
// /admin/map — every farm on a map, color-coded by lifecycle
// =============================================================================
// Reuses the same Mapbox token the public /find page uses (via
// window.__COMMUNICARE_PUBLIC_ENV__). Loads the entire contacts list
// once, drops a pin per farm that has coords. Click a pin → contact
// detail.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listContacts, type ContactRow } from "@/lib/admin/api";

// Colors match the status pills used elsewhere. Kept in one place here
// so future rebalances are surgical.
const STATUS_COLOR: Record<string, string> = {
  active: "#4a6d3f",     // moss dark
  paused: "#b58840",     // wheat dark
  past_due: "#a04e2e",   // brick
  canceled: "#7a6c5a",   // soil/60
  unpaid: "#c3b7a2",     // cream2
};

declare global {
  interface Window {
    __COMMUNICARE_PUBLIC_ENV__?: {
      MAPBOX_TOKEN?: string;
      TURNSTILE_SITE_KEY?: string;
      CF_ANALYTICS_TOKEN?: string;
    };
  }
}

export default function AdminMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listContacts().then((r) => {
      if (cancelled) return;
      if ("contacts" in r) setRows(r.contacts);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current) return;
    if (typeof window === "undefined") return;
    const token = window.__COMMUNICARE_PUBLIC_ENV__?.MAPBOX_TOKEN;
    if (!token) {
      setTokenMissing(true);
      return;
    }
    let cancelled = false;
    let map: unknown = null;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const m = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [-95, 38],
        zoom: 3.6,
      });
      map = m;

      m.on("load", () => {
        for (const c of rows) {
          if (c.farm_lat == null || c.farm_lng == null) continue;
          const el = document.createElement("div");
          el.style.cssText = `
            width: 14px; height: 14px; border-radius: 50%;
            background: ${STATUS_COLOR[c.subscription_status] ?? "#c3b7a2"};
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            cursor: pointer;
          `;
          el.title = `${c.farm_name ?? c.email} · ${c.subscription_status}`;
          el.addEventListener("click", () => {
            window.location.href = `/admin/contact/?id=${c.id}`;
          });
          new mapboxgl.Marker({ element: el })
            .setLngLat([c.farm_lng, c.farm_lat])
            .addTo(m);
        }
      });
    })();

    return () => {
      cancelled = true;
      const m = map as { remove?: () => void } | null;
      m?.remove?.();
    };
  }, [loading, rows]);

  const withCoords = rows.filter((r) => r.farm_lat != null && r.farm_lng != null).length;

  return (
    <div>
      <header className="border-b border-soil/15 px-6 md:px-10 py-8">
        <div className="small-caps text-xs text-brick mb-2">Map</div>
        <h1 className="display text-4xl font-medium">Every farm.</h1>
        <p className="text-soil/70 mt-1 text-sm">
          {loading
            ? "Loading contacts…"
            : `${withCoords} of ${rows.length} farms have coordinates. Click a pin for the contact.`}
        </p>
      </header>

      <div className="p-6 md:p-10">
        {tokenMissing ? (
          <div className="paper p-8 text-center text-soil/60 italic">
            Mapbox token missing on the deploy. Set MAPBOX_TOKEN in the
            Worker secrets to enable the map.
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full rounded"
            style={{ height: "70vh", minHeight: 500 }}
          />
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-soil/60 mt-4">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <li key={status} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: color }}
              />
              {status}
            </li>
          ))}
        </ul>

        <p className="text-xs text-soil/55 italic mt-6">
          Farms without a coordinate (haven&apos;t completed onboarding
          with a geocodable location) don&apos;t appear. Add a geocoder
          call to onboarding to fix that.
        </p>
      </div>
    </div>
  );
}
