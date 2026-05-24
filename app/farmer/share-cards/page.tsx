"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { Sun, Mark } from "@/components/mark";

// Generate Instagram-ready share cards from farm data — square (1080×1080
// for feed posts) and portrait (1080×1920 for Stories/Reels). Renders to
// an SVG inline, then converts to PNG via canvas for one-click download.
//
// No external image dependency. Brand-locked colors. The farmer types in
// the items, picks a template, and downloads.

type Template = "this-week" | "new-season" | "sold-out" | "weather";
type AspectId = "square" | "story";

const TEMPLATES: { id: Template; label: string; hint: string }[] = [
  {
    id: "this-week",
    label: "This week's share",
    hint: "List of items in the box, with the farm's name and pickup info",
  },
  {
    id: "new-season",
    label: "Season opening",
    hint: "Announce a new CSA season with the start date and a CTA",
  },
  {
    id: "sold-out",
    label: "Last shares",
    hint: "Only a few subscriptions left — drives urgency",
  },
  {
    id: "weather",
    label: "Weather note",
    hint: "Tell members about a delay, a flood, a frost",
  },
];

const ASPECTS: { id: AspectId; label: string; w: number; h: number }[] = [
  { id: "square", label: "Instagram feed (1080×1080)", w: 1080, h: 1080 },
  { id: "story", label: "Stories / Reels (1080×1920)", w: 1080, h: 1920 },
];

export default function ShareCardsPage() {
  const [template, setTemplate] = useState<Template>("this-week");
  const [aspect, setAspect] = useState<AspectId>("square");
  const [farmName, setFarmName] = useState("Wren Hollow Farm");
  const [location, setLocation] = useState("Floyd County, Virginia");
  const [date, setDate] = useState("Tuesday, May 28");
  const [items, setItems] = useState(
    "Lacinato kale\nHakurei turnips\nSungold tomatoes\nSpring onions\nPastured eggs\nSunflower bouquet",
  );
  const [callout, setCallout] = useState("");
  const [pickup, setPickup] = useState("Donkey Coffee · 3–7 pm");
  const [domain, setDomain] = useState("wren-hollow.communicare.farm");

  // Defaults change per template
  useEffect(() => {
    if (template === "this-week") {
      setCallout("");
    } else if (template === "new-season") {
      setCallout("Spring shares open Monday at 9 am");
      setItems("Twenty-two weeks of vegetables\nMay through October\nSeven members left to take");
    } else if (template === "sold-out") {
      setCallout("Six shares left for the season");
      setItems(
        "If you've been thinking about it\nthis is the week\nbefore we close subscriptions",
      );
    } else if (template === "weather") {
      setCallout("Tuesday pickup moved to Wednesday");
      setItems("Forecast calls for severe storms\nWednesday looks clear, same window\nReply SKIP if Wed doesn't work");
    }
  }, [template]);

  const itemLines = items.split("\n").filter(Boolean);
  const aspectMeta = ASPECTS.find((a) => a.id === aspect)!;

  return (
    <div>
      <PageHeader
        eyebrow="Posters for the neighbors"
        title="Share cards."
        subtitle="Instagram-ready, print-ready, link-preview-ready. Generated from your share data. No designer required."
      />

      <div className="px-6 md:px-10 py-8 grid lg:grid-cols-[400px_1fr] gap-8">
        <div className="space-y-6">
          {/* Template picker */}
          <div>
            <div className="label">Template</div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      active
                        ? "border-brick bg-brick/5"
                        : "border-soil/15 hover:border-soil/30"
                    }`}
                  >
                    <div className="display text-sm">{t.label}</div>
                    <div className="text-[10px] text-soil/55 italic mt-0.5">
                      {t.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect ratio */}
          <div>
            <div className="label">Size</div>
            <div className="flex gap-2">
              {ASPECTS.map((a) => {
                const active = aspect === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAspect(a.id)}
                    className={`flex-1 px-3 py-2 rounded-md border text-xs transition-colors ${
                      active
                        ? "border-brick bg-brick/5 text-brick"
                        : "border-soil/15 text-soil/65 hover:border-soil/30"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Farm name" value={farmName} onChange={setFarmName} />
          <Field label="Location" value={location} onChange={setLocation} />
          {template === "this-week" && (
            <Field label="Date" value={date} onChange={setDate} />
          )}
          {callout !== undefined && template !== "this-week" && (
            <Field label="Headline" value={callout} onChange={setCallout} />
          )}
          <FieldArea
            label={template === "this-week" ? "Items in the box" : "Body"}
            value={items}
            onChange={setItems}
            rows={6}
          />
          {template === "this-week" && (
            <Field label="Pickup info" value={pickup} onChange={setPickup} />
          )}
          <Field label="Domain" value={domain} onChange={setDomain} />
        </div>

        {/* Preview + download */}
        <CardPreview
          template={template}
          aspect={aspectMeta}
          farmName={farmName}
          location={location}
          date={date}
          itemLines={itemLines}
          callout={callout}
          pickup={pickup}
          domain={domain}
        />
      </div>
    </div>
  );
}

function CardPreview({
  template,
  aspect,
  farmName,
  location,
  date,
  itemLines,
  callout,
  pickup,
  domain,
}: {
  template: Template;
  aspect: { id: AspectId; w: number; h: number; label: string };
  farmName: string;
  location: string;
  date: string;
  itemLines: string[];
  callout: string;
  pickup: string;
  domain: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadPng() {
    if (!svgRef.current) return;
    setBusy(true);
    try {
      const svg = svgRef.current;
      const xml = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("image load failed"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = aspect.w;
      canvas.height = aspect.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(img, 0, 0, aspect.w, aspect.h);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const dl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = dl;
          a.download = `${farmName.toLowerCase().replace(/\s+/g, "-")}-${template}-${aspect.id}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(dl);
        },
        "image/png",
        0.95,
      );
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setBusy(false);
    }
  }

  function downloadSvg() {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${farmName.toLowerCase().replace(/\s+/g, "-")}-${template}-${aspect.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Compute scaled preview size so the SVG fits the screen
  const previewMaxW = 460;
  const scale = previewMaxW / aspect.w;
  const previewH = aspect.h * scale;

  return (
    <div className="space-y-4 sticky top-24 self-start">
      <div className="small-caps text-xs text-brick">Live preview</div>

      <div
        className="paper p-4 overflow-hidden"
        style={{ width: previewMaxW + 32 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${aspect.w} ${aspect.h}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: previewMaxW, height: previewH, display: "block" }}
        >
          <defs>
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.10 0" />
            </filter>
            <linearGradient id="card-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBF1EC" />
              <stop offset="100%" stopColor="#FBE9DD" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={aspect.w} height={aspect.h} fill="url(#card-bg)" />
          <rect x="0" y="0" width={aspect.w} height={aspect.h} filter="url(#grain)" opacity="0.5" />

          {/* Top eyebrow */}
          <text
            x={aspect.w / 2}
            y={120}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize={aspect.id === "story" ? 32 : 36}
            letterSpacing={6}
            fill="#C16850"
          >
            {(
              template === "this-week"
                ? `THIS WEEK AT`
                : template === "new-season"
                  ? `NEW SEASON`
                  : template === "sold-out"
                    ? `LAST SHARES`
                    : `A NOTE FROM THE FARM`
            )}
          </text>

          {/* Farm name */}
          <text
            x={aspect.w / 2}
            y={210}
            textAnchor="middle"
            fontFamily="Fraunces, Georgia, serif"
            fontSize={aspect.id === "story" ? 84 : 76}
            fontWeight="600"
            fill="#1A1410"
            style={{ letterSpacing: "-0.025em" }}
          >
            {farmName}
          </text>

          <text
            x={aspect.w / 2}
            y={260}
            textAnchor="middle"
            fontFamily="Source Serif 4, Georgia, serif"
            fontStyle="italic"
            fontSize={aspect.id === "story" ? 32 : 30}
            fill="#56423E"
          >
            {location}
          </text>

          {/* Centered sun glyph */}
          <g transform={`translate(${aspect.w / 2 - 50}, ${aspect.id === "story" ? 360 : 320})`}>
            <circle cx="50" cy="50" r="32" fill="#ECC15F" />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={50 + Math.cos(angle) * 44}
                  y1={50 + Math.sin(angle) * 44}
                  x2={50 + Math.cos(angle) * 60}
                  y2={50 + Math.sin(angle) * 60}
                  stroke="#ECC15F"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Headline (for non-this-week templates) */}
          {template !== "this-week" && callout && (
            <text
              x={aspect.w / 2}
              y={aspect.id === "story" ? 600 : 530}
              textAnchor="middle"
              fontFamily="Fraunces, Georgia, serif"
              fontSize={aspect.id === "story" ? 56 : 50}
              fill="#1A1410"
              fontWeight="500"
            >
              {callout}
            </text>
          )}

          {/* Items list */}
          {itemLines.map((item, i) => {
            const lineH = aspect.id === "story" ? 80 : 70;
            const startY = template === "this-week"
              ? (aspect.id === "story" ? 600 : 550)
              : (aspect.id === "story" ? 720 : 640);
            return (
              <g key={i} transform={`translate(${aspect.w / 2}, ${startY + i * lineH})`}>
                <text
                  x="-22"
                  y="0"
                  textAnchor="end"
                  fontFamily="Fraunces, Georgia, serif"
                  fontSize={aspect.id === "story" ? 42 : 36}
                  fill="#ECC15F"
                >
                  ❀
                </text>
                <text
                  x="22"
                  y="0"
                  textAnchor="start"
                  fontFamily="Source Serif 4, Georgia, serif"
                  fontSize={aspect.id === "story" ? 42 : 36}
                  fill="#1A1410"
                >
                  {item}
                </text>
              </g>
            );
          })}

          {/* Pickup info / footer */}
          {template === "this-week" && pickup && (
            <text
              x={aspect.w / 2}
              y={aspect.h - 220}
              textAnchor="middle"
              fontFamily="Fraunces, Georgia, serif"
              fontStyle="italic"
              fontSize={aspect.id === "story" ? 36 : 32}
              fill="#56423E"
            >
              Pick up {pickup}
            </text>
          )}

          {/* Bottom rule */}
          <line
            x1={aspect.w * 0.2}
            y1={aspect.h - 140}
            x2={aspect.w * 0.8}
            y2={aspect.h - 140}
            stroke="#DCC1BA"
            strokeWidth="1"
          />

          {/* Domain footer */}
          <g transform={`translate(${aspect.w / 2 - 12}, ${aspect.h - 100})`}>
            <circle cx="0" cy="0" r="14" fill="#C16850" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontFamily="Fraunces, Georgia, serif"
              fontSize="16"
              fill="#FBF1EC"
              fontWeight="600"
            >
              C
            </text>
          </g>
          <text
            x={aspect.w / 2 + 12}
            y={aspect.h - 95}
            textAnchor="start"
            fontFamily="JetBrains Mono, monospace"
            fontSize={aspect.id === "story" ? 26 : 24}
            letterSpacing={2}
            fill="#1A1410"
          >
            {domain.toUpperCase()}
          </text>

          <text
            x={aspect.w / 2}
            y={aspect.h - 50}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize={aspect.id === "story" ? 20 : 18}
            letterSpacing={4}
            fill="#89726D"
          >
            № {Math.floor(Math.random() * 50) + 1}
          </text>
        </svg>
      </div>

      <div className="text-[10px] text-soil/55 italic text-center">
        {aspect.w}×{aspect.h}px · brand-locked SVG
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={busy}
          className="btn btn-primary text-sm justify-center disabled:opacity-50"
        >
          {busy ? "Rendering…" : "Download PNG ↓"}
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          className="btn btn-ghost text-sm justify-center"
        >
          SVG ↓
        </button>
      </div>

      <p className="text-[11px] text-soil/55 italic text-center leading-relaxed">
        Save the PNG, drop into Instagram. Or share the link to your Tuesday
        post and the image appears automatically as the link card.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="field"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: "var(--font-body)" }}
      />
    </div>
  );
}
