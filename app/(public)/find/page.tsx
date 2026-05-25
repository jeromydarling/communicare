"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { sampleFarms, type SampleFarm } from "@/lib/sample-farms";
import { getSupabaseBrowser } from "@/lib/supabase/client";
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

const LNG_MIN = -125;
const LNG_MAX = -66;
const LAT_MIN = 25;
const LAT_MAX = 50;

function project(lng: number, lat: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return { x, y };
}

// Unified type — we render sample farms (curated) and discovered farms
// (Perplexity-surfaced) through the same map + side list code.
type AnyFarm = {
  id: string; // slug for sample, uuid for discovered
  source: "sample" | "discovered";
  name: string;
  kind: string;
  location: string;
  lat: number;
  lng: number;
  slug?: string;
  // Sample
  tagline?: string;
  // Discovered
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  pickup_info?: string;
  share_price?: string;
  inquiry_count?: number;
  citations?: string[];
};

type DiscoveredFarmRow = {
  id: string;
  slug: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  website: string | null;
  email: string | null;
  phone: string | null;
  pickup_info: string | null;
  share_price: string | null;
  inquiry_count: number;
  citations: string[] | null;
};

function sampleToAny(f: SampleFarm): AnyFarm {
  return {
    id: f.slug,
    source: "sample",
    name: f.name,
    kind: f.kind,
    location: f.location,
    lat: f.coords[1],
    lng: f.coords[0],
    slug: f.slug,
    tagline: f.tagline,
  };
}

function discoveredToAny(d: DiscoveredFarmRow): AnyFarm {
  return {
    id: d.id,
    source: "discovered",
    name: d.name,
    kind: d.kind ?? "Mixed farm",
    location: d.location ?? [d.city, d.state].filter(Boolean).join(", "),
    lat: d.lat,
    lng: d.lng,
    slug: d.slug ?? undefined,
    description: d.description ?? undefined,
    website: d.website ?? undefined,
    email: d.email ?? undefined,
    phone: d.phone ?? undefined,
    pickup_info: d.pickup_info ?? undefined,
    share_price: d.share_price ?? undefined,
    inquiry_count: d.inquiry_count,
    citations: d.citations ?? undefined,
  };
}

function matchesFilter(f: AnyFarm, filter: Filter): boolean {
  if (filter === "All") return true;
  return f.kind.toLowerCase().includes(filter.toLowerCase());
}

function regionOf(f: AnyFarm): string {
  const [first] = f.location.split(",");
  return first?.trim() || f.location;
}

export default function FindPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<AnyFarm | null>(null);
  const [hovered, setHovered] = useState<AnyFarm | null>(null);

  // ZIP-search state
  const [zipInput, setZipInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedZip, setSearchedZip] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [discovered, setDiscovered] = useState<AnyFarm[]>([]);
  const [inquiryFor, setInquiryFor] = useState<AnyFarm | null>(null);

  const all = useMemo<AnyFarm[]>(
    () => [...sampleFarms.map(sampleToAny), ...discovered],
    [discovered],
  );
  const visible = useMemo(
    () => all.filter((f) => matchesFilter(f, filter)),
    [all, filter],
  );

  const useMapbox = Boolean(MAPBOX_TOKEN);

  async function runZipSearch(e: React.FormEvent) {
    e.preventDefault();
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) {
      setSearchError("Use a 5-digit US ZIP — for example, 24091.");
      return;
    }
    setSearchError(null);
    setSearching(true);

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setSearchError(
        "The discovery service is offline in this preview. Set the Supabase env vars to enable it.",
      );
      setSearching(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "find-nearby-farms",
        { body: { zip, radiusMiles: 20 } },
      );
      if (error) {
        setSearchError(error.message ?? "Couldn't reach the discovery service.");
        setSearching(false);
        return;
      }
      if (!data?.farms) {
        setSearchError(data?.error ?? "No farms returned.");
        setSearching(false);
        return;
      }
      const rows = (data.farms as DiscoveredFarmRow[]).map(discoveredToAny);
      setDiscovered(rows);
      setSearchedZip(zip);
      setSearchCenter(data.center ?? null);
      // Auto-select the first discovered result to nudge the eye
      if (rows.length > 0) {
        setSelected(rows[0]);
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "We couldn't reach the discovery service. Try again in a moment.",
      );
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setDiscovered([]);
    setSearchedZip(null);
    setSearchCenter(null);
    setZipInput("");
    setSearchError(null);
  }

  return (
    <div className="relative">
      <div className="max-w-page mx-auto px-6 pt-10 pb-6">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="small-caps text-xs text-brick mb-3">
              The discovery map
            </div>
            <h1 className="display text-4xl md:text-5xl font-medium leading-tight">
              Find a farm share near you.
            </h1>
            <p className="text-soil/65 italic mt-3 max-w-md">
              Real farms, with shares left for the season. Type a ZIP to find
              farms within twenty miles — we list them whether they're on
              Communicare or not.
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
                    · {all.filter((f) => matchesFilter(f, k)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ZIP search row */}
        <form
          onSubmit={runZipSearch}
          className="mt-6 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label
              className="small-caps text-[10px] text-soil/55 mb-1 block"
              htmlFor="zip"
            >
              Find within 20 miles of
            </label>
            <input
              id="zip"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={10}
              placeholder="ZIP — e.g. 24091"
              className="field font-mono"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              disabled={searching}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !zipInput.trim()}
            className="btn btn-primary text-sm disabled:opacity-50"
          >
            {searching ? "Looking…" : "Find farms →"}
          </button>
          {searchedZip && (
            <button
              type="button"
              onClick={clearSearch}
              className="display italic text-soil/55 text-xs hover:text-soil"
            >
              Clear search
            </button>
          )}
          {searchError && (
            <div className="text-xs text-brick italic mt-1 w-full">
              {searchError}
            </div>
          )}
          {searchedZip && discovered.length > 0 && (
            <div className="text-xs text-soil/65 italic w-full">
              Discovered {discovered.length} farm
              {discovered.length === 1 ? "" : "s"} within 20 miles of {searchedZip}.
              We list them whether they're on Communicare or not.
            </div>
          )}
          {searchedZip && discovered.length === 0 && !searching && (
            <div className="text-xs text-soil/65 italic w-full">
              No farms surfaced within 20 miles of {searchedZip}. Try a wider
              search, or{" "}
              <Link href="/join" className="text-brick hover:underline">
                tell us about a farm we missed
              </Link>
              .
            </div>
          )}
        </form>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-0 border-t border-soil/15">
        <div
          className="relative bg-cream"
          // 75dvh gives the mobile dynamic-viewport-height proper treatment
          // (browser chrome doesn't eat it like static vh does); minHeight
          // is the floor so it stays usable on very short windows.
          style={{ height: "75dvh", minHeight: 540 }}
        >
          {useMapbox ? (
            <MapboxLive
              farms={visible}
              selected={selected}
              onSelect={setSelected}
              onHover={setHovered}
              flyToCenter={searchCenter}
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

          {/* Region quick-jump pills */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[92%] overflow-x-auto">
            <div className="flex gap-1.5 px-1.5 py-1.5 rounded-full bg-parchment/85 backdrop-blur-sm border border-soil/15 shadow-md">
              {visible.slice(0, 10).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] display transition-colors ${
                    selected?.id === f.id
                      ? "bg-brick text-parchment"
                      : "text-soil/70 hover:bg-cream2/80"
                  }`}
                >
                  {regionOf(f)}
                </button>
              ))}
            </div>
          </div>

          {hovered && !useMapbox && <FloatingTooltip farm={hovered} />}
        </div>

        <aside
          className="bg-cream border-l border-soil/15 overflow-y-auto"
          style={{ maxHeight: "75dvh" }}
        >
          {selected && (
            <FarmCard
              farm={selected}
              onClose={() => setSelected(null)}
              onSendNote={() => setInquiryFor(selected)}
            />
          )}

          <div className="p-4">
            <div className="small-caps text-[10px] text-soil/55 mb-2 px-2">
              {visible.length} farm{visible.length === 1 ? "" : "s"}
              {discovered.length > 0 && (
                <span className="ml-1 text-brick">
                  · {discovered.length} discovered
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {visible.map((farm) => (
                <li key={farm.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(farm)}
                    onMouseEnter={() => setHovered(farm)}
                    onMouseLeave={() => setHovered(null)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selected?.id === farm.id
                        ? "bg-wheat/20"
                        : "hover:bg-parchment"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brick">{kindIcon(farm.kind)}</span>
                      <span className="display text-base">{farm.name}</span>
                      {farm.source === "discovered" && (
                        <span className="small-caps text-[9px] text-brick bg-brick/10 px-1.5 py-0.5 rounded-full">
                          new
                        </span>
                      )}
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
              As real farms join Communicare, the map fills out — and it
              becomes the best way to find a farm share in your county.
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

      {inquiryFor && (
        <InquiryModal
          farm={inquiryFor}
          onClose={() => setInquiryFor(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Side-panel farm card — handles both sample and discovered shapes
// -----------------------------------------------------------------------------

function FarmCard({
  farm,
  onClose,
  onSendNote,
}: {
  farm: AnyFarm;
  onClose: () => void;
  onSendNote: () => void;
}) {
  return (
    <div className="paper m-4 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-brick">{kindIcon(farm.kind)}</div>
        <span className="small-caps text-[10px] text-brick">{farm.kind}</span>
        {farm.source === "discovered" && (
          <span className="small-caps text-[9px] text-brick bg-brick/10 px-1.5 py-0.5 rounded-full ml-auto">
            discovered
          </span>
        )}
      </div>
      <h3 className="display text-2xl font-medium leading-tight mb-1">
        {farm.name}
      </h3>
      <div className="text-xs text-soil/55 italic mb-3">{farm.location}</div>

      {farm.tagline && (
        <p className="text-sm text-soil/80 leading-relaxed mb-4">
          {farm.tagline}
        </p>
      )}
      {farm.description && (
        <p className="text-sm text-soil/80 leading-relaxed mb-4">
          {farm.description}
        </p>
      )}

      {(farm.pickup_info || farm.share_price) && (
        <dl className="text-xs text-soil/70 space-y-1.5 mb-4 border-t border-soil/10 pt-3">
          {farm.share_price && (
            <div className="flex gap-2">
              <dt className="small-caps text-[10px] text-soil/55 w-16 shrink-0 pt-0.5">
                Share
              </dt>
              <dd>{farm.share_price}</dd>
            </div>
          )}
          {farm.pickup_info && (
            <div className="flex gap-2">
              <dt className="small-caps text-[10px] text-soil/55 w-16 shrink-0 pt-0.5">
                Pickup
              </dt>
              <dd>{farm.pickup_info}</dd>
            </div>
          )}
          {farm.website && (
            <div className="flex gap-2">
              <dt className="small-caps text-[10px] text-soil/55 w-16 shrink-0 pt-0.5">
                Web
              </dt>
              <dd className="truncate">
                <a
                  href={farm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brick hover:underline"
                >
                  {farm.website.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}

      {farm.source === "sample" && (
        <Link
          href={`/farm/${farm.slug}/`}
          className="btn btn-primary text-sm w-full justify-center"
        >
          Open the homepage →
        </Link>
      )}

      {farm.source === "discovered" && (
        <>
          <button
            type="button"
            onClick={onSendNote}
            className="btn btn-primary text-sm w-full justify-center"
          >
            Send them a note →
          </button>
          <p className="text-[11px] text-soil/55 italic text-center mt-3 leading-snug">
            Not yet on Communicare. We list them anyway, because the point is
            connecting you to a farm — not selling you software.
          </p>
        </>
      )}

      {farm.source === "discovered" &&
        farm.citations &&
        farm.citations.length > 0 && (
          <details className="mt-3 text-[10px] text-soil/45">
            <summary className="cursor-pointer hover:text-soil/65">
              Where we found them
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-3 list-disc">
              {farm.citations.slice(0, 4).map((c, i) => (
                <li key={i} className="truncate">
                  <a
                    href={c}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {c.replace(/^https?:\/\//, "").slice(0, 60)}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

      <button
        type="button"
        onClick={onClose}
        className="display italic text-soil/55 hover:text-soil text-xs mt-3 block mx-auto"
      >
        Close
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Inquiry modal — the "Send them a note" experience
// -----------------------------------------------------------------------------

function InquiryModal({
  farm,
  onClose,
}: {
  farm: AnyFarm;
  onClose: () => void;
}) {
  const region = farm.location.split(",")[0]?.trim() ?? farm.location;
  const defaultBody = `Hi —

I found your farm through Communicare's farm finder. I'm in your area and looking for a ${
    farm.kind.toLowerCase().includes("herd")
      ? "herd share"
      : farm.kind.toLowerCase().includes("meat")
        ? "meat share"
        : "share"
  } for the season. Are you taking new members?

Thank you,
`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | null
    | { ok: true; mailtoHref?: string; resentViaEmail: boolean }
    | { ok: false; error: string }
  >(null);

  async function send() {
    setSending(true);
    setResult(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setResult({
        ok: false,
        error:
          "The send service is offline in this preview. Try again after the env vars are set.",
      });
      setSending(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "record-farm-inquiry",
        {
          body: {
            discoveredFarmId: farm.id,
            senderName: name.trim(),
            senderEmail: email.trim(),
            senderZip: zip.trim() || undefined,
            subject: `A note from a neighbor — found you through Communicare`,
            body: body.trim(),
          },
        },
      );

      if (error) {
        setResult({
          ok: false,
          error: error.message ?? "Couldn't send the note.",
        });
        setSending(false);
        return;
      }
      if (data?.ok === false || data?.error) {
        setResult({ ok: false, error: data?.error ?? "Couldn't send the note." });
        setSending(false);
        return;
      }
      setResult({
        ok: true,
        mailtoHref: data?.mailtoHref,
        resentViaEmail: Boolean(data?.inquiryEmailed),
      });
    } catch (err) {
      setResult({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "We couldn't reach the send service. Try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const canSend =
    name.trim().length > 0 && /.+@.+\..+/.test(email) && body.trim().length >= 20;

  return (
    <div
      className="fixed inset-0 bg-soil/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="paper max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!result?.ok && (
          <>
            <div className="small-caps text-xs text-brick mb-1">
              Write a note to {region}
            </div>
            <h3 className="display text-2xl font-medium mb-1">{farm.name}</h3>
            <p className="text-xs text-soil/65 italic mb-5 leading-snug">
              We'll pass your note along and tell them where you found them.
              Your email goes only to the farm, never to anyone else.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label" htmlFor="iq_name">
                  Your name
                </label>
                <input
                  id="iq_name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Linda Olsen"
                  autoFocus
                />
              </div>
              <div>
                <label className="label" htmlFor="iq_email">
                  Your email
                </label>
                <input
                  id="iq_email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="linda@example.com"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label" htmlFor="iq_zip">
                Your ZIP{" "}
                <span className="text-soil/45 italic text-xs">(optional)</span>
              </label>
              <input
                id="iq_zip"
                inputMode="numeric"
                maxLength={5}
                className="field max-w-[140px] font-mono"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="24091"
              />
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="iq_body">
                Your note
              </label>
              <textarea
                id="iq_body"
                className="field min-h-[140px] leading-snug"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="text-[10px] text-soil/45 italic mt-1">
                Editable. We'll sign it with your name.
              </div>
            </div>

            {result && !result.ok && (
              <div className="text-xs text-brick italic mb-3">
                {result.error}
              </div>
            )}

            <div className="border-t border-soil/15 mt-4 pt-4 flex items-center justify-between gap-3">
              <p className="text-[10px] italic text-soil/55 leading-snug max-w-[260px]">
                One quiet email goes to {farm.name} too — just the first time
                someone reaches out — telling them they were found through
                Communicare. They can claim their listing or ignore us. We
                won't follow up.
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend || sending}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send the note →"}
                </button>
              </div>
            </div>
          </>
        )}

        {result?.ok && (
          <div className="text-center py-6">
            <div className="small-caps text-xs text-brick mb-2">Sent</div>
            <h3 className="display text-2xl font-medium mb-3">
              {result.resentViaEmail
                ? `Your note is on its way to ${farm.name}.`
                : `Your note is logged.`}
            </h3>
            {result.mailtoHref && !result.resentViaEmail && (
              <p className="text-sm text-soil/70 leading-relaxed mb-5 max-w-md mx-auto">
                We've also opened a draft in your email client so you can send
                it from your own address. Watch for a reply there.
              </p>
            )}
            {result.resentViaEmail && (
              <p className="text-sm text-soil/70 leading-relaxed mb-5 max-w-md mx-auto">
                They can reply directly to you. We'll quietly tell them once
                that a neighbor found them through us — that's it.
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {result.mailtoHref && (
                <a
                  href={result.mailtoHref}
                  className="btn btn-primary text-sm"
                  onClick={onClose}
                >
                  Open in my email client
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mapbox live view — outdoors topography + flyTo with pitch & bearing
// -----------------------------------------------------------------------------

type ViewProps = {
  farms: AnyFarm[];
  selected: AnyFarm | null;
  onSelect: (f: AnyFarm) => void;
  onHover: (f: AnyFarm | null) => void;
};

function MapboxLive({
  farms,
  selected,
  onSelect,
  onHover,
  flyToCenter,
}: ViewProps & {
  flyToCenter: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const resizeTimers: number[] = [];
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
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      mapRef.current = map;
      const m = map as unknown as { resize: () => void };

      // Brute-force resize sweep covering every plausible time the container
      // could finish settling — mobile dynamic viewports take a few frames
      // to commit, the URL bar collapse is on a delay, the canvas needs to
      // catch up. Cheap calls; the visual is worth the certainty.
      [16, 80, 200, 500, 1000, 2000].forEach((delay) => {
        resizeTimers.push(
          window.setTimeout(() => {
            if (!cancelled) m.resize();
          }, delay),
        );
      });

      map.on("load", () => {
        m.resize();
        setReady(true);
      });

      // Re-fit on any subsequent container size change.
      resizeObserver = new ResizeObserver(() => m.resize());
      resizeObserver.observe(containerRef.current!);
    })();
    return () => {
      cancelled = true;
      resizeTimers.forEach((t) => clearTimeout(t));
      resizeObserver?.disconnect();
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
  }, []);

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

        const glow = document.createElement("div");
        glow.className = "pin-glow";
        glow.style.cssText =
          "position: absolute; left: 50%; top: 100%; width: 56px; height: 18px; background: radial-gradient(ellipse at center, rgba(193,104,80,0.55) 0%, rgba(193,104,80,0) 70%); transform: translate(-50%, -50%); pointer-events: none;";
        wrap.appendChild(glow);

        const ring = document.createElement("div");
        ring.className = "pin-ring";
        ring.style.cssText =
          "position: absolute; left: 50%; top: 50%; width: 36px; height: 36px; border: 2px solid rgba(193,104,80,0.65); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;";
        wrap.appendChild(ring);

        const pin = document.createElement("button");
        pin.className = "pin-heartbeat";
        const pinColor = farm.source === "discovered" ? "#A9743F" : "#C16850";
        pin.style.cssText = `position: absolute; left: 50%; top: 100%; width: 32px; height: 32px; background: ${pinColor}; color: #FBF1EC; border: 2.5px solid #FBF1EC; border-radius: 50% 50% 50% 0; transform: translate(-50%, -100%) rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); cursor: pointer;`;
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

        const marker = new mapboxgl.Marker({
          element: wrap,
          anchor: "bottom",
        })
          .setLngLat([farm.lng, farm.lat])
          .addTo(map as never);
        markersRef.current.push(marker);
      }
    })();
  }, [farms, ready, onSelect, onHover]);

  // Fly to selected — pitch + bearing for the swoop feel
  useEffect(() => {
    if (!ready || !selected) return;
    const map = mapRef.current as
      | { flyTo: (opts: Record<string, unknown>) => void }
      | null;
    if (!map) return;
    map.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 11,
      pitch: 60,
      bearing: -20 + Math.random() * 40,
      speed: 0.9,
      curve: 1.6,
      essential: true,
    });
  }, [selected, ready]);

  // When a new ZIP search lands, fly to the search center first (gentler
  // overview) so the user sees the area, not just one farm.
  useEffect(() => {
    if (!ready || !flyToCenter) return;
    const map = mapRef.current as
      | { flyTo: (opts: Record<string, unknown>) => void }
      | null;
    if (!map) return;
    map.flyTo({
      center: [flyToCenter.lng, flyToCenter.lat],
      zoom: 9,
      pitch: 30,
      bearing: 0,
      speed: 0.8,
      curve: 1.4,
      essential: true,
    });
  }, [flyToCenter, ready]);

  // Explicit width/height instead of `absolute inset-0`. Mapbox-GL reads
  // dimensions from the container at init time; `inset-0` on an absolutely
  // positioned div sometimes resolves to 0×0 on mobile before layout
  // completes, even when the parent has an explicit height. Setting
  // 100%/100% directly gives the canvas a stable size to read.
  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
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
}: ViewProps & { hovered: AnyFarm | null }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
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

          <clipPath id="landmass">
            <path d="M 80 350 C 80 200, 250 130, 400 145 C 540 100, 700 105, 820 175 C 920 220, 935 380, 850 480 C 700 540, 500 530, 320 510 C 180 500, 90 460, 80 350 Z" />
          </clipPath>
        </defs>

        <rect width="1000" height="600" fill="#FBF1EC" />
        <rect width="1000" height="600" fill="url(#bio-plains)" />
        <rect width="1000" height="600" fill="url(#bio-pacific)" />
        <rect width="1000" height="600" fill="url(#bio-atlantic)" />
        <rect width="1000" height="600" fill="url(#bio-gulf)" />

        <path
          d="M 80 350 C 80 200, 250 130, 400 145 C 540 100, 700 105, 820 175 C 920 220, 935 380, 850 480 C 700 540, 500 530, 320 510 C 180 500, 90 460, 80 350 Z"
          fill="#FBE9DD"
          fillOpacity="0.7"
          stroke="#1A1410"
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />

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

        <path
          d="M 110 380 C 280 360, 400 410, 540 380 C 680 350, 760 410, 880 380"
          stroke="#7B8E6F"
          strokeOpacity="0.35"
          strokeWidth="2"
          fill="none"
          strokeDasharray="2 6"
        />
      </svg>

      {farms.map((farm) => {
        // Skip any farm outside the lower-48 box (Alaska, Hawaii, Puerto Rico).
        if (
          farm.lng < LNG_MIN ||
          farm.lng > LNG_MAX ||
          farm.lat < LAT_MIN ||
          farm.lat > LAT_MAX
        ) {
          return null;
        }
        const { x, y } = project(farm.lng, farm.lat);
        const isSelected = selected?.id === farm.id;
        const isHovered = hovered?.id === farm.id;
        const isDiscovered = farm.source === "discovered";
        return (
          <button
            key={farm.id}
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
            <span
              className={`pin-heartbeat relative block w-9 h-9 ${
                isSelected ? "ring-4 ring-brick/30" : ""
              }`}
              style={{
                background: isDiscovered ? "#A9743F" : "#C16850",
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

function FloatingTooltip({ farm }: { farm: AnyFarm }) {
  if (
    farm.lng < LNG_MIN ||
    farm.lng > LNG_MAX ||
    farm.lat < LAT_MIN ||
    farm.lat > LAT_MAX
  ) {
    return null;
  }
  const { x, y } = project(farm.lng, farm.lat);
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

function kindGlyph(kind: string): string {
  const k = kind.toLowerCase();
  if (k.includes("herd") || k.includes("milk")) return "🥛";
  if (k.includes("meat") || k.includes("beef") || k.includes("pork")) return "🐄";
  if (k.includes("egg")) return "🥚";
  if (k.includes("csa") || k.includes("vegetable") || k.includes("garden"))
    return "🌱";
  if (k.includes("mixed") || k.includes("farm")) return "🌾";
  return "❀";
}

function kindIcon(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("herd") || k.includes("milk"))
    return <Jar className="w-4 h-5 inline-block" />;
  if (k.includes("meat"))
    return <Barn className="w-5 h-4 inline-block" />;
  if (k.includes("csa") || k.includes("vegetable") || k.includes("garden"))
    return <Leaf className="w-4 h-4 inline-block" />;
  return <Wheat className="w-4 h-5 inline-block" />;
}
