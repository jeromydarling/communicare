"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/farmer/shell";
import { sampleGenerated } from "@/lib/sample-homepages";
import type { GeneratedHomepage } from "@/lib/homepage-schema";
import { Mark, Sun, Wheat, Leaf } from "@/components/mark";

type Tab = "content" | "theme" | "photos" | "domain" | "seo";

const initial = sampleGenerated["Mixed farm"];

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "content", label: "Content", hint: "what your homepage says" },
  { id: "theme", label: "Theme", hint: "palette + typography" },
  { id: "photos", label: "Photos", hint: "your gallery" },
  { id: "domain", label: "Domain", hint: "wren-hollow.communicare.farm" },
  { id: "seo", label: "Search & social", hint: "what Google + Instagram see" },
];

type Palette = {
  id: "cream" | "evergreen" | "midnight" | "rosehip" | "linen";
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  hint: string;
};

const PALETTES: Palette[] = [
  {
    id: "cream",
    name: "Agrarian almanac",
    bg: "#FBF1EC",
    surface: "#FBE9DD",
    text: "#1A1410",
    accent: "#C16850",
    hint: "Our default — pale pink-cream and salmon. Lightest, airiest option.",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    bg: "#F2F3EF",
    surface: "#DCE3D8",
    text: "#1F2A1F",
    accent: "#324D38",
    hint: "Cooler, forest-y. Good for orchards and tree-fruit farms.",
  },
  {
    id: "midnight",
    name: "Midnight & wheat",
    bg: "#1F1814",
    surface: "#2D2520",
    text: "#FFF8F5",
    accent: "#ECC15F",
    hint: "Dark editorial. Works for grass-fed meat and herd-share dairies.",
  },
  {
    id: "rosehip",
    name: "Rosehip",
    bg: "#FDF4F0",
    surface: "#F5DDD2",
    text: "#3A1F18",
    accent: "#A53F2B",
    hint: "Pink-tinted warm. Suits flower farms and PYO operations.",
  },
  {
    id: "linen",
    name: "Linen",
    bg: "#F5F2EA",
    surface: "#E6E0CE",
    text: "#262219",
    accent: "#7A5C2E",
    hint: "Quietest. The understated option.",
  },
];

const TYPE_PAIRS = [
  {
    id: "fraunces-source",
    display: "Fraunces",
    body: "Source Serif 4",
    hint: "Our default — editorial, warm, character to spare",
  },
  {
    id: "playfair-lora",
    display: "Playfair Display",
    body: "Lora",
    hint: "More formal, magazine-page weight",
  },
  {
    id: "newsreader-newsreader",
    display: "Newsreader",
    body: "Newsreader",
    hint: "A single family — quiet and readable",
  },
  {
    id: "cooper-charter",
    display: "Cooper",
    body: "Charter",
    hint: "Soft display, classic body. Old-almanac feel.",
  },
];

export default function FarmerSiteBuilder() {
  const [tab, setTab] = useState<Tab>("content");

  return (
    <div>
      <PageHeader
        eyebrow="Your farm's homepage"
        title="Site builder."
        subtitle="One page. Drafted by the AI. Edited by you. Published when ready."
        action={
          <div className="flex gap-2">
            <Link
              href="/farm/elmwood/"
              target="_blank"
              className="btn btn-ghost text-sm"
            >
              Preview live →
            </Link>
            <button className="btn btn-primary text-sm">
              Publish changes
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-soil/15 bg-cream/40 sticky top-0 md:top-0 z-10 backdrop-blur">
        <div className="px-4 md:px-10 flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 border-b-2 display whitespace-nowrap text-sm ${
                  active
                    ? "border-brick text-brick"
                    : "border-transparent text-soil/65 hover:text-soil"
                }`}
              >
                {t.label}
                <span className="ml-2 text-[10px] text-soil/45 italic font-body">
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 md:px-10 py-8">
        {tab === "content" && <ContentTab />}
        {tab === "theme" && <ThemeTab />}
        {tab === "photos" && <PhotosTab />}
        {tab === "domain" && <DomainTab />}
        {tab === "seo" && <SeoTab />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function ContentTab() {
  const [content, setContent] = useState<GeneratedHomepage>(initial);
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function update<K extends keyof GeneratedHomepage>(
    key: K,
    value: GeneratedHomepage[K],
  ) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function rewrite(key: keyof GeneratedHomepage, hint: string) {
    setBusy(true);
    setBusyKey(key as string);
    // In production this calls supabase.functions.invoke('generate-homepage')
    // with the rewrite instruction. Here we rotate through alternates so the
    // demo feels responsive.
    await new Promise((r) => setTimeout(r, 1400));
    if (key === "about") {
      const alts = [
        "Hannah and Ben came home to Floyd County in 2017 with a baby in October and no farming experience. The barn was older than the country. Six years on, the cows know their names, the vegetable plot has tripled, and they still find a new mistake to make every season.",
        "We are two people, five Jersey cows, forty laying hens, and a vegetable plot that grew a little every year. We do not till. We do not spray. The land was tired when we bought it; we are trying to give it back some life.",
        "A small farm in Floyd County, Virginia, kept by two of us. We grow vegetables on the south slope, keep the cows on the bottomland, and run the hens behind them. We've been at it since 2017 and we are still learning.",
      ];
      update("about", alts[Math.floor(Math.random() * alts.length)]);
    }
    setBusy(false);
    setBusyKey(null);
    void hint;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8">
      <div className="space-y-6">
        <Field
          label="Headline"
          help="3 to 10 words, ideally a complete sentence."
          value={content.heroHeadline}
          onChange={(v) => update("heroHeadline", v)}
        />
        <Field
          label="Tagline"
          help="One sentence under the headline. Sensory, specific."
          value={content.tagline}
          onChange={(v) => update("tagline", v)}
        />
        <FieldArea
          label="About the farm"
          help="The longer story. Where members get to know you."
          value={content.about}
          onChange={(v) => update("about", v)}
          rows={5}
          extra={
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                placeholder="e.g. shorter, warmer, more practical"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="field flex-1 text-sm py-2"
              />
              <button
                type="button"
                onClick={() => rewrite("about", tone)}
                disabled={busy}
                className="btn btn-ghost text-sm py-2 disabled:opacity-50 whitespace-nowrap"
              >
                {busy && busyKey === "about" ? "Drafting…" : "Rewrite ✨"}
              </button>
            </div>
          }
        />

        <div>
          <div className="label">Callouts</div>
          <div className="space-y-3">
            {content.callouts.map((c, i) => (
              <div key={i} className="paper p-5">
                <div className="small-caps text-[10px] text-wheatDark mb-2">
                  Callout № {i + 1}
                </div>
                <input
                  className="field mb-3 text-base display"
                  value={c.label}
                  onChange={(e) => {
                    const next = [...content.callouts];
                    next[i] = { ...c, label: e.target.value };
                    update("callouts", next);
                  }}
                />
                <textarea
                  className="field text-sm"
                  rows={2}
                  value={c.body}
                  onChange={(e) => {
                    const next = [...content.callouts];
                    next[i] = { ...c, body: e.target.value };
                    update("callouts", next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <FieldArea
          label="Share description"
          help="What subscribers get, in one sentence."
          value={content.shareDescription}
          onChange={(v) => update("shareDescription", v)}
          rows={2}
        />
        <Field
          label="Pickup summary"
          help="Where, when. One warm sentence."
          value={content.pickupSummary}
          onChange={(v) => update("pickupSummary", v)}
        />
        <Field
          label="Closing blessing"
          help="A warm goodbye. 4–12 words. Not corny."
          value={content.closingBlessing}
          onChange={(v) => update("closingBlessing", v)}
        />
      </div>

      <aside className="lg:sticky lg:top-24 self-start">
        <div className="text-xs small-caps text-brick mb-2">Live preview</div>
        <div className="paper overflow-hidden">
          <div className="bg-cream border-b border-soil/15 px-4 py-2 text-[10px] text-soil/55 font-mono">
            wren-hollow.communicare.farm
          </div>
          <div className="p-6 text-soil">
            <h2 className="display text-2xl font-medium leading-tight">
              {content.heroHeadline}
            </h2>
            <p className="mt-2 text-sm text-soil/75 italic">
              {content.tagline}
            </p>
            <p className="mt-4 text-sm text-soil/85 leading-relaxed">
              {content.about}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3">
              {content.callouts.map((c, i) => (
                <div key={i}>
                  <div className="display text-sm font-medium">{c.label}</div>
                  <p className="text-xs text-soil/65 leading-snug">{c.body}</p>
                </div>
              ))}
            </div>
            <p className="display italic text-brick mt-5 text-sm text-center">
              {content.closingBlessing}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* THEME                                                                      */
/* -------------------------------------------------------------------------- */

function ThemeTab() {
  const [palette, setPalette] = useState<Palette>(PALETTES[0]);
  const [type, setType] = useState(TYPE_PAIRS[0]);

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8">
      <div className="space-y-10">
        <section>
          <div className="small-caps text-xs text-brick mb-2">Color palette</div>
          <h2 className="display text-2xl font-medium mb-5">
            Pick the feel of your page.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PALETTES.map((p) => {
              const active = palette.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p)}
                  className={`text-left rounded-lg overflow-hidden border-2 transition-colors ${
                    active ? "border-brick" : "border-transparent hover:border-soil/15"
                  }`}
                >
                  <div
                    className="p-5 grid grid-cols-4 gap-1.5"
                    style={{ background: p.bg }}
                  >
                    <Swatch color={p.bg} label="Page" />
                    <Swatch color={p.surface} label="Card" />
                    <Swatch color={p.text} label="Text" />
                    <Swatch color={p.accent} label="Accent" />
                  </div>
                  <div className="p-4 bg-parchment border-t border-soil/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="display font-medium">{p.name}</span>
                      {active && (
                        <span className="small-caps text-[10px] text-brick">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-soil/65 italic">{p.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="small-caps text-xs text-brick mb-2">Typography</div>
          <h2 className="display text-2xl font-medium mb-5">
            Pick a pair of typefaces.
          </h2>
          <div className="space-y-3">
            {TYPE_PAIRS.map((t) => {
              const active = type.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t)}
                  className={`w-full text-left p-5 rounded-md border transition-colors ${
                    active ? "border-brick bg-brick/5" : "border-soil/15 hover:border-soil/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <div
                      className="text-2xl font-medium"
                      style={{ fontFamily: t.display, letterSpacing: "-0.02em" }}
                    >
                      {t.display}
                    </div>
                    {active && (
                      <span className="small-caps text-[10px] text-brick">
                        Selected
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm text-soil/85 mb-2"
                    style={{ fontFamily: t.body }}
                  >
                    {t.body} — the quick brown fox jumps over the lazy dog.
                  </div>
                  <div className="text-xs text-soil/55 italic">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="small-caps text-xs text-brick mb-2">Custom CSS</div>
          <h2 className="display text-xl font-medium mb-3">
            Need to override something?
          </h2>
          <p className="text-sm text-soil/65 italic mb-4">
            One-off tweaks if you know what you&apos;re doing. Most farms
            won&apos;t touch this.
          </p>
          <textarea
            className="field font-mono text-xs"
            rows={5}
            placeholder=":root { --custom-accent: #B5563E; }"
          />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 self-start">
        <div className="text-xs small-caps text-brick mb-2">Live preview</div>
        <div
          className="paper overflow-hidden"
          style={{
            background: palette.bg,
            color: palette.text,
          }}
        >
          <div className="bg-cream border-b border-soil/15 px-4 py-2 text-[10px] text-soil/55 font-mono">
            wren-hollow.communicare.farm
          </div>
          <div className="p-7">
            <h2
              className="text-3xl font-medium leading-tight"
              style={{
                fontFamily: type.display,
                letterSpacing: "-0.02em",
              }}
            >
              A hundred acres, kept by two of us.
            </h2>
            <p
              className="text-sm italic mt-2"
              style={{ fontFamily: type.body, color: palette.text, opacity: 0.65 }}
            >
              Floyd County, Virginia
            </p>
            <div
              className="mt-5 p-5 rounded-md"
              style={{ background: palette.surface }}
            >
              <div
                className="text-xs uppercase mb-2"
                style={{
                  fontFamily: type.body,
                  color: palette.accent,
                  letterSpacing: "0.15em",
                }}
              >
                The standard share
              </div>
              <div
                className="text-2xl font-medium"
                style={{ fontFamily: type.display, color: palette.text }}
              >
                $620 / season
              </div>
              <button
                className="mt-3 px-5 py-2 rounded-full text-sm display"
                style={{
                  background: palette.accent,
                  color: palette.bg,
                }}
              >
                Subscribe →
              </button>
            </div>
            <p
              className="text-sm leading-relaxed mt-5"
              style={{ fontFamily: type.body, color: palette.text, opacity: 0.85 }}
            >
              We keep five Jerseys, forty laying hens, and a vegetable plot
              that&apos;s grown a little every year. We don&apos;t till. We
              don&apos;t spray. The cows know their names.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="aspect-square rounded border border-soil/10"
        style={{ background: color }}
      />
      <div className="text-[9px] small-caps text-soil/55 text-center">
        {label}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PHOTOS                                                                     */
/* -------------------------------------------------------------------------- */

type Photo = {
  id: string;
  caption: string;
  role: "hero" | "story" | "gallery" | "share";
  uploadedOn: string;
};

const SEED_PHOTOS: Photo[] = [
  { id: "p1", caption: "South pasture at dawn, late May", role: "hero", uploadedOn: "May 4" },
  { id: "p2", caption: "Hannah with the new heifer calf", role: "story", uploadedOn: "May 31" },
  { id: "p3", caption: "Tuesday's share, in the crate", role: "share", uploadedOn: "May 21" },
  { id: "p4", caption: "Garlic curing in the barn", role: "gallery", uploadedOn: "May 22" },
  { id: "p5", caption: "Lucia and the laying hens", role: "gallery", uploadedOn: "May 14" },
  { id: "p6", caption: "Spring greens, the first big cut", role: "gallery", uploadedOn: "May 7" },
];

const ROLE_COLOR: Record<Photo["role"], string> = {
  hero: "bg-brick/15 text-brickDark",
  story: "bg-wheat/20 text-wheatDark",
  gallery: "bg-soil/10 text-soil/65",
  share: "bg-moss/15 text-mossDark",
};

function PhotosTab() {
  const [photos, setPhotos] = useState<Photo[]>(SEED_PHOTOS);
  const [drag, setDrag] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const next: Photo[] = Array.from(files).map((f, i) => ({
      id: `new-${Date.now()}-${i}`,
      caption: f.name.replace(/\.[^.]+$/, ""),
      role: "gallery" as const,
      uploadedOn: "Just now",
    }));
    setPhotos((p) => [...next, ...p]);
  }

  function remove(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  function setRole(id: string, role: Photo["role"]) {
    setPhotos((p) => p.map((x) => (x.id === id ? { ...x, role } : x)));
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="small-caps text-xs text-brick mb-2">Your gallery</div>
      <h2 className="display text-2xl font-medium mb-1">
        Photos for your homepage.
      </h2>
      <p className="text-soil/65 italic mb-6">
        One hero image, two or three for the story, however many you want for
        the gallery. We&apos;ll resize and optimize for you.
      </p>

      {/* Upload zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={() => setDrag(false)}
        className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          drag ? "border-brick bg-brick/5" : "border-soil/25 hover:border-soil/40"
        }`}
      >
        <Sun className="w-12 h-12 text-wheat mx-auto mb-4 opacity-70" />
        <div className="display text-lg mb-1">Drop photos here</div>
        <div className="text-xs text-soil/55 italic mb-4">
          or click to pick — JPG, PNG, HEIC. We compress to web sizes.
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />
        <span className="btn btn-primary text-sm">Choose photos →</span>
      </label>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((p) => (
          <div key={p.id} className="paper overflow-hidden">
            <div
              className="aspect-[4/3] bg-cream relative grid place-items-center"
              style={{
                backgroundImage: `linear-gradient(135deg, ${shade(p.id, 0.4)}, ${shade(p.id, 0.15)})`,
              }}
            >
              <Wheat className="w-10 h-12 text-wheatDark/40" />
              <span
                className={`absolute top-2 left-2 text-[9px] small-caps px-2 py-0.5 rounded-full ${ROLE_COLOR[p.role]}`}
              >
                {p.role}
              </span>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={p.caption}
                onChange={(e) =>
                  setPhotos((prev) =>
                    prev.map((x) =>
                      x.id === p.id ? { ...x, caption: e.target.value } : x,
                    ),
                  )
                }
                className="display text-sm w-full bg-transparent outline-none border-b border-transparent focus:border-soil/20 transition-colors"
              />
              <div className="text-[10px] text-soil/55 italic mt-1">
                {p.uploadedOn}
              </div>
              <div className="flex items-center gap-1 mt-3">
                <RoleButton
                  active={p.role === "hero"}
                  onClick={() => setRole(p.id, "hero")}
                >
                  Hero
                </RoleButton>
                <RoleButton
                  active={p.role === "story"}
                  onClick={() => setRole(p.id, "story")}
                >
                  Story
                </RoleButton>
                <RoleButton
                  active={p.role === "gallery"}
                  onClick={() => setRole(p.id, "gallery")}
                >
                  Gallery
                </RoleButton>
                <RoleButton
                  active={p.role === "share"}
                  onClick={() => setRole(p.id, "share")}
                >
                  Share
                </RoleButton>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="ml-auto text-[10px] text-soil/45 hover:text-brick"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-soil/55 italic text-center">
        We store originals in your account, serve compressed versions on your
        homepage, and never use your photos for anything else.
      </p>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] px-2 py-1 rounded-full small-caps transition-colors ${
        active
          ? "bg-soil text-parchment"
          : "bg-cream text-soil/65 hover:bg-cream2"
      }`}
    >
      {children}
    </button>
  );
}

// deterministic placeholder shade per id (so the demo "image" doesn't flicker)
function shade(id: string, opacity: number): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 60; // browns + warms
  return `hsla(${20 + hue}, 35%, 55%, ${opacity})`;
}

/* -------------------------------------------------------------------------- */
/* DOMAIN                                                                     */
/* -------------------------------------------------------------------------- */

function DomainTab() {
  const [subdomain, setSubdomain] = useState("wren-hollow");
  const [custom, setCustom] = useState("");

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 max-w-5xl">
      <div className="space-y-8">
        <section className="paper p-7">
          <div className="small-caps text-xs text-brick mb-2">
            Communicare subdomain
          </div>
          <h2 className="display text-2xl font-medium mb-4">
            Your address on the internet.
          </h2>
          <p className="text-sm text-soil/65 italic mb-5">
            Every farm gets one of these. Free. Always.
          </p>
          <div className="flex items-stretch border border-soil/15 rounded-md overflow-hidden bg-parchment">
            <input
              type="text"
              value={subdomain}
              onChange={(e) =>
                setSubdomain(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 40),
                )
              }
              className="flex-1 px-4 py-3 outline-none font-mono text-sm"
            />
            <span className="px-4 py-3 bg-cream text-soil/55 text-sm font-mono border-l border-soil/15">
              .communicare.farm
            </span>
          </div>
          <div className="text-xs text-mossDark mt-2 italic">
            ✓ Available
          </div>
        </section>

        <section className="paper p-7">
          <div className="small-caps text-xs text-brick mb-2">
            Your own domain
          </div>
          <h2 className="display text-2xl font-medium mb-4">
            Bring a domain you already own.
          </h2>
          <p className="text-sm text-soil/65 italic mb-5">
            We&apos;ll issue a free SSL certificate and serve your homepage on
            your domain. No extra fee — same $9/month.
          </p>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="wrenhollow.farm"
            className="field font-mono text-sm"
          />
          {custom && (
            <div className="mt-5 p-4 bg-cream rounded-md">
              <div className="small-caps text-xs text-soil/55 mb-2">
                DNS setup
              </div>
              <p className="text-sm text-soil/85 mb-3">
                In your domain registrar (GoDaddy, Cloudflare, Namecheap),
                point your domain at us with these records:
              </p>
              <table className="w-full text-xs font-mono">
                <thead className="border-b border-soil/15">
                  <tr className="text-left text-soil/55">
                    <th className="py-2">Type</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soil/10">
                  <tr>
                    <td className="py-2">CNAME</td>
                    <td className="py-2">www</td>
                    <td className="py-2">
                      {subdomain}.communicare.farm
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">A</td>
                    <td className="py-2">@</td>
                    <td className="py-2">76.76.21.21</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[11px] italic text-soil/55 mt-3">
                Propagation usually takes 5 minutes to an hour. We&apos;ll
                email when your domain is live.
              </p>
            </div>
          )}
        </section>

        <section className="paper p-7 bg-cream/40">
          <div className="display text-lg mb-2">Need help?</div>
          <p className="text-sm text-soil/65 italic">
            Write{" "}
            <a
              href="mailto:domains@communicare.farm"
              className="text-brick hover:underline not-italic"
            >
              domains@communicare.farm
            </a>{" "}
            and a real person will walk through it with you. Includes setting
            up email forwarding (hello@yourfarm.com), if you want that too.
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 self-start">
        <div className="paper p-5">
          <div className="small-caps text-xs text-brick mb-3">
            Will show as
          </div>
          <div className="space-y-3">
            <div className="font-mono text-sm bg-cream rounded px-3 py-2">
              https://{subdomain || "your-farm"}.communicare.farm
            </div>
            {custom && (
              <div className="font-mono text-sm bg-cream rounded px-3 py-2">
                https://{custom}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SEO + SOCIAL                                                               */
/* -------------------------------------------------------------------------- */

function SeoTab() {
  const [title, setTitle] = useState(
    "Wren Hollow Farm — Vegetables, dairy, and eggs in Floyd County, VA",
  );
  const [description, setDescription] = useState(
    "A hundred acres, kept by two of us. Weekly vegetable share May–October, raw-milk herd share year-round, eggs while they last. Pickup in Floyd or at the farm.",
  );

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8 max-w-5xl">
      <div className="space-y-6">
        <div className="small-caps text-xs text-brick mb-2">Search & social</div>
        <h2 className="display text-2xl font-medium mb-4">
          What Google and Instagram see.
        </h2>

        <Field
          label="Page title"
          help="What appears in browser tabs and search results. 50–60 chars is the sweet spot."
          value={title}
          onChange={setTitle}
        />
        <FieldArea
          label="Description"
          help="One or two sentences. Appears under your title in Google. 120–160 chars."
          value={description}
          onChange={setDescription}
          rows={3}
        />
        <Field
          label="Address (for the map)"
          help="Where the farm is. Used for Google's local listings."
          value="2417 Indian Run Rd, Floyd VA 24091"
          onChange={() => {}}
        />
        <Field
          label="Phone (optional)"
          help="If you want it shown publicly."
          value="+1 540 555 0142"
          onChange={() => {}}
        />

        <div>
          <div className="label">Social card image</div>
          <div className="paper p-5 border border-soil/15">
            <p className="text-xs text-soil/65 italic mb-3">
              We auto-generate a 1200×630 social card from your hero photo +
              farm name + tagline. Used when your link is shared on Facebook,
              Twitter, iMessage, Slack — anywhere with a link preview.
            </p>
            <div className="aspect-[1200/630] bg-parchment border border-soil/15 rounded-md grid place-items-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-grain opacity-30" />
              <div className="relative text-center">
                <Mark className="w-9 h-9 text-brick mx-auto mb-3" />
                <div className="display text-2xl font-medium">Wren Hollow Farm</div>
                <div className="text-sm text-soil/65 italic mt-1">
                  Floyd County, Virginia
                </div>
                <div className="mt-3 small-caps text-[10px] text-wheatDark">
                  $9/month · A gift to the farm-share community
                </div>
              </div>
            </div>
            <button className="text-sm display italic text-brick hover:underline mt-3">
              Regenerate from new hero photo →
            </button>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 self-start space-y-4">
        <div>
          <div className="small-caps text-[10px] text-brick mb-2">
            Google preview
          </div>
          <div className="paper p-4">
            <div className="text-xs font-mono text-soil/55">
              wren-hollow.communicare.farm
            </div>
            <div className="display text-base text-sky-700 hover:underline cursor-pointer leading-tight mt-1">
              {title.slice(0, 60)}
              {title.length > 60 ? "…" : ""}
            </div>
            <div className="text-xs text-soil/75 mt-1 leading-snug">
              {description.slice(0, 160)}
              {description.length > 160 ? "…" : ""}
            </div>
          </div>
        </div>

        <div>
          <div className="small-caps text-[10px] text-brick mb-2">
            iMessage preview
          </div>
          <div className="paper p-3 max-w-xs">
            <div className="aspect-[1200/630] bg-cream rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-grain opacity-30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Leaf className="w-5 h-5 text-mossDark" />
                <div className="display text-xs mt-1">Wren Hollow Farm</div>
              </div>
            </div>
            <div className="display text-xs font-medium leading-tight">
              {title.slice(0, 70)}
            </div>
            <div className="text-[10px] text-soil/55 mt-0.5">
              wren-hollow.communicare.farm
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SHARED FIELDS                                                              */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
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
      {help && <div className="hint">{help}</div>}
    </div>
  );
}

function FieldArea({
  label,
  help,
  value,
  onChange,
  rows = 3,
  extra,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
      {help && <div className="hint">{help}</div>}
      {extra}
    </div>
  );
}
