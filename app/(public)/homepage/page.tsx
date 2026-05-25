"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Wheat, Leaf, Barn, Jar } from "@/components/mark";
import {
  FARM_KINDS,
  type GenerateInput,
  type GeneratedHomepage,
} from "@/lib/homepage-schema";
import { sampleGenerated } from "@/lib/sample-homepages";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const SAMPLE_PREFILL: GenerateInput = {
  farmName: "Wren Hollow Farm",
  location: "Floyd County, Virginia",
  kind: "Mixed farm",
  whatYouGrow:
    "Forty kinds of vegetables in summer, twenty in winter. Five Jersey cows, herd-share only. Forty laying hens. A small fruit orchard with apples, pears, and persimmons.",
  story:
    "We're Hannah and Ben. We met farming for someone else and bought this hundred-acre place in 2017 with money we borrowed from Hannah's father. The barn is older than the country. We don't till, we don't spray, and we have made every mistake there is to make.",
  pickupInfo:
    "Saturday mornings at the farm, 9 to noon. Tuesday afternoons at the Floyd country store, 4 to 6:30. We deliver to Blacksburg on the first Thursday of the month.",
  founderName: "Hannah & Ben",
};

const EMPTY: GenerateInput = {
  farmName: "",
  location: "",
  kind: "Mixed farm",
  whatYouGrow: "",
  story: "",
  pickupInfo: "",
  founderName: "",
};

export default function HomepageGenerator() {
  const [form, setForm] = useState<GenerateInput>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedHomepage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    input: number;
    output: number;
    cache_read: number;
  } | null>(null);

  function update<K extends keyof GenerateInput>(
    key: K,
    value: GenerateInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Priority:
    //   1. Supabase Edge Function (live Claude generation) — when env vars set
    //   2. Pre-baked sample homepage per farm kind — fallback for static demo
    const supabase = getSupabaseBrowser();

    if (supabase) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-homepage",
          { body: form },
        );
        if (fnError) {
          setError(fnError.message ?? "The model didn't respond.");
          setLoading(false);
          return;
        }
        if (!data?.homepage) {
          setError(data?.error ?? "The model returned no homepage.");
          setLoading(false);
          return;
        }
        setResult(data.homepage);
        setUsage(data.usage ?? null);
        requestAnimationFrame(() =>
          document
            .getElementById("preview")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't reach the generator. Try again in a moment.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // No Supabase — show a pre-baked sample homepage so visitors can see
    // what the generator produces.
    await new Promise((r) => setTimeout(r, 2000));
    const baked = sampleGenerated[form.kind] ?? sampleGenerated["Mixed farm"];
    setResult(baked);
    setUsage(null);
    requestAnimationFrame(() =>
      document
        .getElementById("preview")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    setLoading(false);
  }

  return (
    <div>
      <section className="border-b border-soil/15 bg-cream">
        <div className="max-w-page mx-auto px-6 py-16 md:py-20">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="small-caps text-xs text-brick mb-4">
                The homepage generator
              </div>
              <h1 className="display text-5xl md:text-6xl font-medium leading-[0.95]">
                Tell us about your farm.
                <br />
                <span className="italic text-brick">We'll write your homepage.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-soil/75 leading-relaxed">
                Answer six questions in your own words. Our model will draft a
                warm, specific one-page site for your farm — headline, story,
                share details, FAQ, the whole thing. You edit anything you
                like and publish in a click.
              </p>
              <p className="mt-3 text-sm italic text-soil/55 max-w-xl">
                {isSupabaseConfigured ? (
                  <>
                    <span className="not-italic small-caps text-[10px] text-moss mr-2">
                      Live
                    </span>
                    The generator is wired to the Supabase Edge Function — each
                    draft is unique to your inputs and may take 10–25 seconds.
                  </>
                ) : (
                  <>
                    <span className="not-italic small-caps text-[10px] text-wheat mr-2">
                      Demo mode
                    </span>
                    This public preview serves a pre-baked sample (one per
                    farm kind) so you can see the format. The live generator
                    runs when the Supabase backend is configured.
                  </>
                )}
              </p>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={() => setForm(SAMPLE_PREFILL)}
                className="text-sm display italic text-brick hover:underline underline-offset-4"
              >
                Or fill in a sample farm for me →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-page mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12">
        {/* FORM */}
        <form onSubmit={submit} className="lg:col-span-5 space-y-7">
          <div>
            <label className="label" htmlFor="farmName">
              What's the farm called?
            </label>
            <input
              id="farmName"
              required
              className="field"
              placeholder="e.g. Elmwood Farm"
              value={form.farmName}
              onChange={(e) => update("farmName", e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="location">
                Where is it?
              </label>
              <input
                id="location"
                required
                className="field"
                placeholder="e.g. Athens County, Ohio"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="kind">
                What kind of farm?
              </label>
              <select
                id="kind"
                className="field"
                value={form.kind}
                onChange={(e) =>
                  update("kind", e.target.value as GenerateInput["kind"])
                }
              >
                {FARM_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="whatYouGrow">
              What do you grow or raise?
            </label>
            <textarea
              id="whatYouGrow"
              required
              className="field"
              placeholder="A few sentences — be specific. Forty kinds of vegetables. Five Jersey cows. Forty laying hens. An orchard..."
              value={form.whatYouGrow}
              onChange={(e) => update("whatYouGrow", e.target.value)}
              rows={3}
            />
            <div className="hint">
              Specifics make a much better homepage than general claims.
            </div>
          </div>

          <div>
            <label className="label" htmlFor="story">
              Your story, briefly.
            </label>
            <textarea
              id="story"
              required
              className="field"
              placeholder="Why did you start? Who farms with you? What's the land like? Don't worry about polish — just tell us."
              value={form.story}
              onChange={(e) => update("story", e.target.value)}
              rows={4}
            />
            <div className="hint">2–4 sentences in your own voice is plenty.</div>
          </div>

          <div>
            <label className="label" htmlFor="pickupInfo">
              How do members pick up their share?
            </label>
            <textarea
              id="pickupInfo"
              required
              className="field"
              placeholder="Saturdays at the farm 9–noon. Tuesdays at the country store. We deliver to Blacksburg on the first Thursday..."
              value={form.pickupInfo}
              onChange={(e) => update("pickupInfo", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="label" htmlFor="founderName">
              Your name (optional)
            </label>
            <input
              id="founderName"
              className="field"
              placeholder="e.g. Hannah & Ben"
              value={form.founderName ?? ""}
              onChange={(e) => update("founderName", e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-soil/15 flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Drafting your homepage…" : "Generate my homepage →"}
            </button>
            <span className="text-xs italic text-soil/55">
              ~15 seconds. Free, forever.
            </span>
          </div>

          {error && (
            <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm">
              {error}
            </div>
          )}
        </form>

        {/* PREVIEW */}
        <div className="lg:col-span-7" id="preview">
          {!result && !loading && (
            <EmptyPreview kind={form.kind} />
          )}
          {loading && <LoadingPreview />}
          {result && (
            <GeneratedPreview
              homepage={result}
              farmName={form.farmName}
              location={form.location}
              kind={form.kind}
              usage={usage}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyPreview({ kind }: { kind: string }) {
  return (
    <div className="paper p-12 text-center min-h-[500px] flex flex-col items-center justify-center">
      <Sun className="w-16 h-16 text-wheat mb-6 opacity-50" />
      <h3 className="display text-2xl font-medium mb-3 text-soil/70">
        Your farm's homepage will appear here.
      </h3>
      <p className="text-soil/55 max-w-sm leading-relaxed italic">
        Fill in the form on the left. We'll draft a one-page site for your{" "}
        <span className="text-brick not-italic">{kind.toLowerCase()}</span> in
        about fifteen seconds.
      </p>
      <div className="ornament mt-12 w-48">❦</div>
    </div>
  );
}

function LoadingPreview() {
  return (
    <div className="paper p-12 min-h-[500px] flex flex-col items-center justify-center">
      <div className="relative mb-8 animate-[spin_8s_linear_infinite]">
        <Sun className="w-20 h-20 text-wheat" />
      </div>
      <h3 className="display text-2xl font-medium mb-3">
        Drafting your homepage…
      </h3>
      <p className="text-soil/65 italic text-center max-w-sm leading-relaxed">
        We're thinking carefully. Specific words about your specific farm take
        a moment. This usually takes 10–20 seconds.
      </p>
      <div className="mt-8 flex gap-2">
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-brick animate-pulse"
      style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
    />
  );
}

function GeneratedPreview({
  homepage,
  farmName,
  location,
  kind,
  usage,
}: {
  homepage: GeneratedHomepage;
  farmName: string;
  location: string;
  kind: string;
  usage: { input: number; output: number; cache_read: number } | null;
}) {
  return (
    <div className="space-y-6 fade-up">
      <div className="paper overflow-hidden">
        {/* Mock browser chrome */}
        <div className="bg-cream border-b border-soil/15 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brick/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-wheat/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-moss/40" />
          </div>
          <div className="text-xs text-soil/55 ml-3 font-mono">
            {farmName ? slug(farmName) : "your-farm"}.communicare.farm
          </div>
        </div>

        {/* The generated homepage */}
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-2 mb-6">
            <PreviewIcon kind={kind} />
            <span className="small-caps text-xs text-brick">{kind}</span>
          </div>

          <h1 className="display text-3xl md:text-4xl font-medium leading-[1.05] tracking-tight">
            {homepage.heroHeadline}
          </h1>
          <div className="display italic text-soil/65 mt-2 text-sm">
            {location}
          </div>
          <p className="mt-5 text-lg leading-relaxed text-soil/85">
            {homepage.tagline}
          </p>

          <div className="rule my-8" />

          <div className="small-caps text-xs text-brick mb-3">
            About the farm
          </div>
          <p className="text-soil/85 leading-relaxed">{homepage.about}</p>

          <div className="rule my-8" />

          <div className="grid sm:grid-cols-3 gap-5">
            {homepage.callouts.map((c, i) => (
              <div key={i}>
                <div className="small-caps text-[10px] text-wheat mb-2">
                  № {i + 1}
                </div>
                <div className="display text-base font-medium mb-1.5 leading-tight">
                  {c.label}
                </div>
                <p className="text-sm text-soil/75 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="rule my-8" />

          <div className="bg-soil text-parchment -mx-8 md:-mx-12 px-8 md:px-12 py-8 text-center">
            <div className="small-caps text-[10px] text-wheat mb-2">
              Subscribe to the share
            </div>
            <div className="display text-2xl font-medium">
              {homepage.shareName}
            </div>
            <p className="text-parchment/80 text-sm mt-2 max-w-md mx-auto">
              {homepage.shareDescription}
            </p>
            <div className="mt-5">
              <button className="btn bg-wheat text-soil border-wheat hover:bg-parchment hover:border-parchment text-sm py-2 px-5">
                Sign me up
              </button>
            </div>
            <div className="text-parchment/55 text-xs mt-3 italic">
              {homepage.pickupSummary}
            </div>
          </div>

          <div className="mt-8">
            <div className="small-caps text-xs text-brick mb-4">
              Questions, asked & answered
            </div>
            <div className="space-y-5">
              {homepage.faq.map((q, i) => (
                <div
                  key={i}
                  className="border-b border-soil/10 pb-5 last:border-0"
                >
                  <div className="display font-medium text-soil mb-1.5 text-base">
                    {q.q}
                  </div>
                  <p className="text-sm text-soil/75 leading-relaxed">{q.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ornament mt-10">❦</div>
          <p className="display italic text-center text-brick mt-6">
            {homepage.closingBlessing}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="text-xs text-soil/55 italic">
          {usage ? (
            <>
              Drafted live from your sentences · {usage.input.toLocaleString()}{" "}
              in / {usage.output.toLocaleString()} out tokens
              {usage.cache_read > 0 &&
                ` · ${usage.cache_read.toLocaleString()} from cache`}
            </>
          ) : (
            <>
              Pre-baked sample · the live generator runs when self-hosted with
              an Anthropic API key
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/join" className="btn btn-ghost text-sm py-2 px-4">
            I want this for real →
          </Link>
        </div>
      </div>

      <p className="text-xs text-center text-soil/55 italic max-w-md mx-auto">
        This is a draft. In the real app, every paragraph, callout, and FAQ is
        editable inline — and you can ask the model to rewrite any section in
        a different tone.
      </p>
    </div>
  );
}

function PreviewIcon({ kind }: { kind: string }) {
  const c = "w-6 h-6 text-brick";
  if (kind === "Raw milk herd share") return <Jar className={c} />;
  if (kind === "Pastured meat") return <Barn className={c} />;
  if (kind === "Vegetable CSA" || kind === "Market garden")
    return <Leaf className={c} />;
  return <Wheat className={c} />;
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
