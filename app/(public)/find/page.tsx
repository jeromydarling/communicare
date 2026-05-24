"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { sampleFarms, type SampleFarm } from "@/lib/sample-farms";
import { Wheat, Sun, Jar, Leaf, Barn } from "@/components/mark";

// Lazy-loaded so the map JS isn't in the main bundle.
const KINDS = [
  "All",
  "Vegetable CSA",
  "Raw milk herd share",
  "Pastured meat",
  "Mixed farm",
] as const;
type Filter = (typeof KINDS)[number];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function FindPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<SampleFarm | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const visible = useMemo(
    () => sampleFarms.filter((f) => filter === "All" || f.kind === filter),
    [filter],
  );

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    if (!MAPBOX_TOKEN) {
      setMapError(
        "Set NEXT_PUBLIC_MAPBOX_TOKEN in your env to load the real map.",
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-95, 38],
        zoom: 3.6,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;
      map.on("load", () => setMapReady(true));
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers whenever filter changes (after the map is ready).
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current as
      | {
          getCanvas: () => HTMLCanvasElement;
        }
      | null;
    if (!map) return;

    // Re-import mapbox to grab the Marker constructor (already cached)
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      // Clear old markers
      for (const m of markersRef.current) {
        (m as { remove: () => void }).remove();
      }
      markersRef.current = [];

      // Add a marker per visible farm
      for (const farm of visible) {
        const el = document.createElement("button");
        el.className =
          "communicare-pin block w-9 h-9 rounded-full bg-brick text-parchment shadow-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-110";
        el.style.border = "2px solid #FFF8F5";
        el.title = farm.name;
        el.innerHTML = kindGlyph(farm.kind);
        el.addEventListener("click", () => setSelected(farm));
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(farm.coords)
          .addTo(map as never);
        markersRef.current.push(marker);
      }
    })();
  }, [visible, mapReady]);

  return (
    <div className="relative">
      <div className="max-w-page mx-auto px-6 pt-10 pb-6 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="small-caps text-xs text-brick mb-3">
            The discovery map
          </div>
          <h1 className="display text-4xl md:text-5xl font-medium leading-tight">
            Find a farm share near you.
          </h1>
          <p className="text-soil/65 italic mt-3 max-w-md">
            Real farms, with shares left for the season. Click a pin to see
            what's growing.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs display ${
                filter === k
                  ? "bg-soil text-parchment"
                  : "bg-cream text-soil/65 hover:bg-cream2 border border-soil/10"
              }`}
            >
              {k}
              {k !== "All" && (
                <span className="ml-1.5 text-[10px] opacity-65">
                  · {sampleFarms.filter((f) => f.kind === k).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-0 border-t border-soil/15">
        {/* Map */}
        <div
          ref={containerRef}
          className="bg-cream relative"
          style={{ height: "72vh", minHeight: 520 }}
        >
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center p-12">
              <div className="paper p-10 max-w-md text-center">
                <Sun className="w-14 h-14 text-wheat mx-auto mb-4 opacity-70" />
                <div className="small-caps text-xs text-brick mb-2">
                  Demo mode
                </div>
                <h3 className="display text-xl font-medium mb-3">
                  The map is sleeping.
                </h3>
                <p className="text-sm text-soil/65 italic">{mapError}</p>
                <p className="text-xs text-soil/55 mt-4">
                  Sample farms are still listed in the panel to the right.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side list */}
        <aside className="bg-cream border-l border-soil/15 overflow-y-auto" style={{ maxHeight: "72vh" }}>
          {selected && (
            <div className="paper m-4 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-brick">{kindIcon(selected.kind)}</div>
                <span className="small-caps text-[10px] text-brick">
                  {selected.kind}
                </span>
              </div>
              <h3 className="display text-2xl font-medium leading-tight mb-1">
                {selected.name}
              </h3>
              <div className="text-xs text-soil/55 italic mb-3">
                {selected.location}
              </div>
              <p className="text-sm text-soil/80 leading-relaxed mb-4">
                {selected.tagline}
              </p>
              <Link
                href={`/farm/${selected.slug}/`}
                className="btn btn-primary text-sm w-full justify-center"
              >
                Open the homepage →
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="display italic text-soil/55 hover:text-soil text-xs mt-3 block mx-auto"
              >
                Close
              </button>
            </div>
          )}

          <div className="p-4">
            <div className="small-caps text-[10px] text-soil/55 mb-2 px-2">
              {visible.length} farm{visible.length === 1 ? "" : "s"}
            </div>
            <ul className="space-y-2">
              {visible.map((farm) => (
                <li key={farm.slug}>
                  <button
                    type="button"
                    onClick={() => setSelected(farm)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selected?.slug === farm.slug
                        ? "bg-wheat/20"
                        : "hover:bg-parchment"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brick">{kindIcon(farm.kind)}</span>
                      <span className="display text-base">{farm.name}</span>
                    </div>
                    <div className="text-[11px] text-soil/55 italic">
                      {farm.location}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 border-t border-soil/10 text-xs text-soil/55 italic">
            <p>
              This map is seeded with the four sample farms. As real farms
              join Communicare, the map fills out — and it becomes the
              best way to find a farm share in your county.
            </p>
            <Link
              href="/join"
              className="display italic text-brick hover:underline not-italic mt-3 block"
            >
              Are you a farm? Join the early circle →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function kindGlyph(kind: SampleFarm["kind"]): string {
  if (kind === "Raw milk herd share") return "🥛";
  if (kind === "Pastured meat") return "🐄";
  if (kind === "Vegetable CSA") return "🌱";
  if (kind === "Mixed farm") return "🌾";
  return "❀";
}

function kindIcon(kind: SampleFarm["kind"]) {
  if (kind === "Raw milk herd share") return <Jar className="w-4 h-5 inline-block" />;
  if (kind === "Pastured meat") return <Barn className="w-5 h-4 inline-block" />;
  if (kind === "Vegetable CSA") return <Leaf className="w-4 h-4 inline-block" />;
  return <Wheat className="w-4 h-5 inline-block" />;
}
