"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { sampleFarms, type SampleFarm } from "@/lib/sample-farms";
import { Wheat, Jar, Leaf, Barn } from "@/components/mark";

const KINDS = [
  "All",
  "Vegetable CSA",
  "Raw milk herd share",
  "Pastured meat",
  "Mixed farm",
] as const;
type Filter = (typeof KINDS)[number];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Lower-48 USA bounding box for the artistic projection. Matches what the
// promo Remotion scene uses, so a viewer who watches the video then lands
// here sees the same continental shape.
const LNG_MIN = -125;
const LNG_MAX = -66;
const LAT_MIN = 25;
const LAT_MAX = 50;

function project(lng: number, lat: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return { x, y };
}

// Pull the county name out of a "Foo County, State" location string for the
// quick-jump pills at the bottom of the map.
function countyOf(farm: SampleFarm): string {
  const [first] = farm.location.split(",");
  return first?.trim() ?? farm.location;
}

export default function FindPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<SampleFarm | null>(null);
  const [hovered, setHovered] = useState<SampleFarm | null>(null);

  const visible = useMemo(
    () => sampleFarms.filter((f) => filter === "All" || f.kind === filter),
    [filter],
  );

  const useMapbox = Boolean(MAPBOX_TOKEN);

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
            Real farms, with shares left for the season. Tap a pin to fly the
            map over the pasture.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs display transition-colors ${
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
        <div className="relative bg-cream" style={{ height: "72vh", minHeight: 520 }}>
          {useMapbox ? (
            <MapboxLive
              farms={visible}
              selected={selected}
              onSelect={setSelected}
              onHover={setHovered}
            />
          ) : (
            <AtlasFallback
              farms={visible}
              selected={selected}
              onSelect={setSelected}
              hovered={hovered}
              onHover={setHovered}
            />
          )}

          {/* Floating county quick-jump pills */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[92%] overflow-x-auto">
            <div className="flex gap-1.5 px-1.5 py-1.5 rounded-full bg-parchment/85 backdrop-blur-sm border border-soil/15 shadow-md">
              {visible.map((f) => (
                <button
                  key={f.slug}
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] display transition-colors ${
                    selected?.slug === f.slug
                      ? "bg-brick text-parchment"
                      : "text-soil/70 hover:bg-cream2/80"
                  }`}
                >
                  {countyOf(f)}
                </button>
              ))}
            </div>
          </div>

          {/* Floating tooltip — driven by hover state in the atlas fallback;
              the Mapbox marker hovers carry their own browser-native title. */}
          {hovered && !useMapbox && (
            <FloatingTooltip farm={hovered} />
          )}
        </div>

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
                    onMouseEnter={() => setHovered(farm)}
                    onMouseLeave={() => setHovered(null)}
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

// -----------------------------------------------------------------------------
// Mapbox live view — outdoors topography + flyTo with pitch & bearing
// -----------------------------------------------------------------------------

type ViewProps = {
  farms: SampleFarm[];
  selected: SampleFarm | null;
  onSelect: (f: SampleFarm) => void;
  onHover: (f: SampleFarm | null) => void;
};

function MapboxLive({ farms, selected, onSelect, onHover }: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [-95, 38],
        zoom: 3.6,
        pitch: 25,
        bearing: -8,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;
      map.on("load", () => setReady(true));
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers when the filtered list changes.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current as
      | { getCanvas: () => HTMLCanvasElement }
      | null;
    if (!map) return;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      for (const m of markersRef.current) {
        (m as { remove: () => void }).remove();
      }
      markersRef.current = [];

      for (const farm of farms) {
        const wrap = document.createElement("div");
        wrap.className = "communicare-pin-wrap";
        wrap.style.cssText =
          "position: relative; width: 36px; height: 44px; cursor: pointer;";
        wrap.title = farm.name;

        // Soft ground glow
        const glow = document.createElement("div");
        glow.className = "pin-glow";
        glow.style.cssText =
          "position: absolute; left: 50%; top: 100%; width: 56px; height: 18px; background: radial-gradient(ellipse at center, rgba(193,104,80,0.55) 0%, rgba(193,104,80,0) 70%); transform: translate(-50%, -50%); pointer-events: none;";
        wrap.appendChild(glow);

        // Expanding ring
        const ring = document.createElement("div");
        ring.className = "pin-ring";
        ring.style.cssText =
          "position: absolute; left: 50%; top: 50%; width: 36px; height: 36px; border: 2px solid rgba(193,104,80,0.65); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;";
        wrap.appendChild(ring);

        // The pin itself — teardrop with glyph
        const pin = document.createElement("button");
        pin.className = "pin-heartbeat";
        pin.style.cssText =
          "position: absolute; left: 50%; top: 100%; width: 32px; height: 32px; background: #C16850; color: #FBF1EC; border: 2.5px solid #FBF1EC; border-radius: 50% 50% 50% 0; transform: translate(-50%, -100%) rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); cursor: pointer;";
        const inner = document.createElement("span");
        inner.style.cssText =
          "transform: rotate(45deg); font-size: 14px; line-height: 1;";
        inner.textContent = kindGlyph(farm.kind);
        pin.appendChild(inner);
        pin.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(farm);
        });
        pin.addEventListener("mouseenter", () => onHover(farm));
        pin.addEventListener("mouseleave", () => onHover(null));
        wrap.appendChild(pin);

        const marker = new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
          .setLngLat(farm.coords)
          .addTo(map as never);
        markersRef.current.push(marker);
      }
    })();
  }, [farms, ready, onSelect, onHover]);

  // Fly to the selected farm. Pitch + bearing make it feel like a camera
  // swooping in rather than a flat pan.
  useEffect(() => {
    if (!ready || !selected) return;
    const map = mapRef.current as
      | {
          flyTo: (opts: Record<string, unknown>) => void;
        }
      | null;
    if (!map) return;
    map.flyTo({
      center: selected.coords,
      zoom: 11,
      pitch: 60,
      bearing: -20 + Math.random() * 40,
      speed: 0.9,
      curve: 1.6,
      essential: true,
    });
  }, [selected, ready]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

// -----------------------------------------------------------------------------
// Atlas fallback — vector canvas with topographic contours + radial gradients
// -----------------------------------------------------------------------------

function AtlasFallback({
  farms,
  selected,
  onSelect,
  hovered,
  onHover,
}: ViewProps & { hovered: SampleFarm | null }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Bioregional radial gradients — Pacific, Plains, Mid-Atlantic,
              Gulf — each a different warm earth tone. */}
          <radialGradient id="bio-pacific" cx="0.12" cy="0.45" r="0.5">
            <stop offset="0%" stopColor="#ECC15F" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ECC15F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bio-plains" cx="0.5" cy="0.5" r="0.55">
            <stop offset="0%" stopColor="#C8A468" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#C8A468" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bio-atlantic" cx="0.86" cy="0.36" r="0.42">
            <stop offset="0%" stopColor="#C16850" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#C16850" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bio-gulf" cx="0.62" cy="0.85" r="0.45">
            <stop offset="0%" stopColor="#A9743F" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#A9743F" stopOpacity="0" />
          </radialGradient>

          {/* Faux land mass shape */}
          <clipPath id="landmass">
            <path d="M 80 350 C 80 200, 250 130, 400 145 C 540 100, 700 105, 820 175 C 920 220, 935 380, 850 480 C 700 540, 500 530, 320 510 C 180 500, 90 460, 80 350 Z" />
          </clipPath>
        </defs>

        {/* Background — parchment with a subtle warm wash */}
        <rect width="1000" height="600" fill="#FBF1EC" />
        <rect width="1000" height="600" fill="url(#bio-plains)" />
        <rect width="1000" height="600" fill="url(#bio-pacific)" />
        <rect width="1000" height="600" fill="url(#bio-atlantic)" />
        <rect width="1000" height="600" fill="url(#bio-gulf)" />

        {/* Landmass silhouette */}
        <path
          d="M 80 350 C 80 200, 250 130, 400 145 C 540 100, 700 105, 820 175 C 920 220, 935 380, 850 480 C 700 540, 500 530, 320 510 C 180 500, 90 460, 80 350 Z"
          fill="#FBE9DD"
          fillOpacity="0.7"
          stroke="#1A1410"
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />

        {/* Topographic contour lines — three layers that drift on different
            phases, giving the impression of a wind passing across the map. */}
        <g clipPath="url(#landmass)" opacity="0.45">
          <g className="contour-drift-a">
            <ContourLines
              count={9}
              cx={200}
              cy={320}
              baseRx={140}
              baseRy={70}
              stroke="#A9743F"
              opacity={0.18}
              wobble={0.6}
            />
          </g>
          <g className="contour-drift-b">
            <ContourLines
              count={7}
              cx={520}
              cy={310}
              baseRx={180}
              baseRy={95}
              stroke="#7C5839"
              opacity={0.16}
              wobble={0.8}
            />
          </g>
          <g className="contour-drift-c">
            <ContourLines
              count={8}
              cx={780}
              cy={340}
              baseRx={130}
              baseRy={75}
              stroke="#5B4A3A"
              opacity={0.14}
              wobble={0.4}
            />
          </g>
        </g>

        {/* River-like accent crossing the middle — purely decorative */}
        <path
          d="M 110 380 C 280 360, 400 410, 540 380 C 680 350, 760 410, 880 380"
          stroke="#7B8E6F"
          strokeOpacity="0.35"
          strokeWidth="2"
          fill="none"
          strokeDasharray="2 6"
        />
      </svg>

      {/* Pins layered above the SVG so they can use real DOM hover state */}
      {farms.map((farm) => {
        const { x, y } = project(farm.coords[0], farm.coords[1]);
        const isSelected = selected?.slug === farm.slug;
        const isHovered = hovered?.slug === farm.slug;
        return (
          <button
            key={farm.slug}
            type="button"
            onClick={() => onSelect(farm)}
            onMouseEnter={() => onHover(farm)}
            onMouseLeave={() => onHover(null)}
            className="absolute group"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -100%)",
              zIndex: isSelected || isHovered ? 20 : 10,
            }}
            aria-label={farm.name}
          >
            {/* Ground glow */}
            <span
              className="pin-glow absolute pointer-events-none"
              style={{
                left: "50%",
                top: "100%",
                width: 60,
                height: 20,
                background:
                  "radial-gradient(ellipse at center, rgba(193,104,80,0.55) 0%, rgba(193,104,80,0) 70%)",
              }}
            />
            {/* Expanding ring */}
            <span
              className="pin-ring absolute pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                width: 36,
                height: 36,
                border: "2px solid rgba(193,104,80,0.55)",
                borderRadius: "50%",
              }}
            />
            {/* The pin itself */}
            <span
              className={`pin-heartbeat relative block w-9 h-9 ${
                isSelected ? "ring-4 ring-brick/30" : ""
              }`}
              style={{
                background: "#C16850",
                border: "2.5px solid #FBF1EC",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.22)",
              }}
            >
              <span
                className="absolute inset-0 flex items-center justify-center text-parchment"
                style={{ transform: "rotate(45deg)", fontSize: 16 }}
              >
                {kindGlyph(farm.kind)}
              </span>
            </span>
          </button>
        );
      })}

      {/* Demo-mode hint pinned to corner */}
      <div className="absolute top-4 left-4 paper px-3 py-2 text-[10px] text-soil/65 italic max-w-[260px]">
        Atlas view · set{" "}
        <code className="font-mono text-brick text-[10px]">
          NEXT_PUBLIC_MAPBOX_TOKEN
        </code>{" "}
        to load real topography.
      </div>
    </div>
  );
}

// One layer of concentric, slightly wobbled rings — the "elevation lines."
function ContourLines({
  count,
  cx,
  cy,
  baseRx,
  baseRy,
  stroke,
  opacity,
  wobble,
}: {
  count: number;
  cx: number;
  cy: number;
  baseRx: number;
  baseRy: number;
  stroke: string;
  opacity: number;
  wobble: number;
}) {
  // Build each ring as a path with sinusoidal radius variation so the
  // contour lines look hand-drawn rather than perfectly elliptical.
  const rings = Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const rx = baseRx * (0.35 + t * 0.7);
    const ry = baseRy * (0.35 + t * 0.7);
    const segments = 36;
    const points: string[] = [];
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      const offset =
        Math.sin(theta * 3 + i) * wobble * 4 +
        Math.cos(theta * 5 + i * 0.4) * wobble * 2;
      const x = cx + Math.cos(theta) * (rx + offset);
      const y = cy + Math.sin(theta) * (ry + offset);
      points.push(`${s === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(" ") + " Z";
  });

  return (
    <g stroke={stroke} strokeOpacity={opacity} strokeWidth="1" fill="none">
      {rings.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

function FloatingTooltip({ farm }: { farm: SampleFarm }) {
  const { x, y } = project(farm.coords[0], farm.coords[1]);
  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, calc(-100% - 18px))",
      }}
    >
      <div className="paper px-3 py-2 shadow-lg border-soil/20 whitespace-nowrap">
        <div className="small-caps text-[9px] text-brick mb-0.5">
          {farm.kind}
        </div>
        <div className="display text-sm font-medium">{farm.name}</div>
        <div className="text-[10px] text-soil/55 italic">{farm.location}</div>
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-parchment border-r border-b border-soil/20"
        style={{ top: "calc(100% - 4px)" }}
      />
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
