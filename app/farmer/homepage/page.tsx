"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/farmer/shell";
import { sampleGenerated } from "@/lib/sample-homepages";
import type { GeneratedHomepage } from "@/lib/homepage-schema";

const initial = sampleGenerated["Mixed farm"];

export default function FarmerHomepageEditor() {
  const [content, setContent] = useState<GeneratedHomepage>(initial);
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof GeneratedHomepage>(
    key: K,
    value: GeneratedHomepage[K],
  ) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function rewriteAbout() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1500));
    // In the real app this calls the Edge Function with a "rewrite in tone X"
    // instruction; here we just rotate through pre-baked alternates.
    const alts = [
      "Hannah and Ben came home to Floyd County in 2017 with a baby in October and no farming experience. The barn was older than the country. Six years on, the cows know their names, the vegetable plot has tripled, and they still find a new mistake to make every season.",
      "We are two people, five Jersey cows, forty laying hens, and a vegetable plot that grew a little every year. We do not till. We do not spray. The land was tired when we bought it; we are trying to give it back some life.",
      "A small farm in Floyd County, Virginia, kept by two of us. We grow vegetables on the south slope, keep the cows on the bottomland, and run the hens behind them. We've been at it since 2017 and we are still learning.",
    ];
    const next = alts[Math.floor(Math.random() * alts.length)];
    update("about", next);
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Your farm's homepage"
        title="The page your members see."
        subtitle="Edit any section. Ask the model to rewrite a paragraph in a different tone. Publish in one click."
        action={
          <Link href="/farm/elmwood/" target="_blank" className="btn btn-primary">
            Preview live →
          </Link>
        }
      />

      <div className="px-6 md:px-10 py-8 grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Editor */}
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
                  onClick={rewriteAbout}
                  disabled={busy}
                  className="btn btn-ghost text-sm py-2 disabled:opacity-50"
                >
                  {busy ? "Drafting…" : "Rewrite ✨"}
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

          <div className="border-t border-soil/15 pt-6 flex items-center justify-between">
            <button className="btn btn-primary">Save &amp; publish</button>
            <span className="text-xs italic text-soil/55">
              Members see the change within a minute.
            </span>
          </div>
        </div>

        {/* Preview pane */}
        <aside className="sticky top-24 self-start">
          <div className="text-xs small-caps text-brick mb-2">Live preview</div>
          <div className="paper overflow-hidden">
            <div className="bg-cream border-b border-soil/15 px-4 py-2 text-[10px] text-soil/55 font-mono">
              wren-hollow.communicare.farm
            </div>
            <div className="p-6">
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
    </div>
  );
}

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
