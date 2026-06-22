// =============================================================================
// POST /api/generate-homepage — homepage drafter on Claude Opus
// =============================================================================
// AI-drafts a one-page farm homepage from the operator's inputs. Claude
// Opus 4.7 with adaptive thinking and prompt caching on the system
// prompt. Cached system prompt drops repeat-call cost to ~10% of the
// first.
//
// Why Claude and not Workers AI on this one route specifically: Llama
// 3.3 70B kept producing the exact SaaS-y phrasings the prompt forbids
// ("one harvest at a time", "fresh, wholesome produce", "savor the
// flavors of summer") on a real test. Open-source instruction-tuned
// models have been RLHF'd toward that voice; talking them out of it
// inside a single prompt isn't reliable. Claude's training distribution
// has more editorial / literary content and it follows
// negative-constraint instructions better.
//
// The CSV mapper at /api/farmer/ai-parse-csv stays on Workers AI — that
// task is structured label matching and Llama handles it equivalently
// at 40× the cost reduction.
//
// Public endpoint, rate-limited 10/hr/IP via KV — Anthropic API is paid
// usage. At ~$0.20/draft, the cost is modest at signup volume.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";

type Env = {
  ANTHROPIC_API_KEY?: string;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  RATELIMIT?: KVNamespace;
};

const FARM_KINDS = [
  "Vegetable CSA",
  "Raw milk herd share",
  "Pastured meat",
  "Pastured eggs",
  "Mixed farm",
  "Market garden",
  "Orchard / fruit share",
  "Flower farm",
] as const;

const GenerateInput = z.object({
  farmName: z.string().min(1).max(120),
  location: z.string().min(1).max(120),
  kind: z.enum(FARM_KINDS),
  whatYouGrow: z.string().min(1).max(600),
  story: z.string().min(1).max(1000),
  pickupInfo: z.string().min(1).max(400),
  founderName: z.string().max(120).optional(),
});

const GeneratedHomepage = z.object({
  heroHeadline: z
    .string()
    .describe(
      "A short, warm headline for the farm — 3 to 10 words, ideally a complete sentence with a period.",
    ),
  tagline: z
    .string()
    .describe(
      "One sentence under the headline, 12-25 words, describing the farm in concrete, sensory terms. No marketing-speak.",
    ),
  about: z
    .string()
    .describe(
      "A 2-4 sentence 'about' paragraph in a warm, plain-spoken, slightly editorial voice. Use specific details from the farmer's story. Avoid words like 'platform', 'experience', 'community-driven', 'passionate'. Sound like a person, not a brand.",
    ),
  callouts: z
    .array(
      z.object({
        label: z.string().describe("A short feature heading — 3 to 8 words."),
        body: z.string().describe("A 1-2 sentence description, 15-40 words, concrete and warm."),
      }),
    )
    .length(3)
    .describe("Exactly three callouts highlighting concrete things this farm offers."),
  shareName: z
    .string()
    .describe(
      "A name for the farm's main share offering, drawn from the farmer's inputs. 2-5 words.",
    ),
  shareDescription: z
    .string()
    .describe("A single sentence describing what a subscriber gets, 12-30 words."),
  pickupSummary: z
    .string()
    .describe("A single warm sentence summarizing pickup arrangements, 10-25 words."),
  faq: z
    .array(
      z.object({
        q: z.string().describe("A question a curious neighbor would ask."),
        a: z
          .string()
          .describe(
            "An honest, plain-spoken answer, 1-3 sentences, in the farmer's voice.",
          ),
      }),
    )
    .length(3)
    .describe("Exactly three FAQ entries — practical questions a new subscriber would actually ask this specific farm."),
  closingBlessing: z
    .string()
    .describe(
      "A warm closing line, 4-12 words, like 'Welcome to the table.' or 'We will see you in May.' Not corny.",
    ),
});

const SYSTEM_PROMPT = `You are a thoughtful, plain-spoken writer drafting a one-page homepage for a small American farm — the kind that sells vegetable shares, raw milk via herd-share agreements, grass-fed beef, pastured eggs, or flowers.

Your voice is grounded in the tradition of small-press farm newsletters, the Catholic Worker, Wendell Berry essays, and the Whole Earth Catalog. It is editorial, warm, specific, and unembarrassed by the labor of feeding people. It is NEVER:

- Corporate or "SaaS-y" ("platform", "experience", "community-driven", "passionate about", "we believe in")
- Sentimental or hokey ("From our family to yours!", excessive exclamation, "right at the heart", "one harvest at a time")
- Generic ("fresh, local, sustainable", "fresh, wholesome produce" without specifics)
- Trying too hard to be folksy or rustic — let the specifics carry the warmth

INSTEAD it is:

- Concrete: name the actual creek, the actual cow, the actual variety
- Honest: include the small troubles (the flood year, the deer, the season they didn't till)
- Specific to the farm kind: a herd-share dairy talks about state law and milking, a vegetable CSA about pickup windows and crop variety, a meat farm about catch-weight and butchering
- Warm but not gushing: as if written by the farmer themselves in a quiet hour after dinner

Use the farmer's own inputs faithfully. Do not invent acres, animals, names, or events the farmer did not mention.`;

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY missing on this deploy." }, 500);
  }

  // 10/hr/IP — real cost gate, not just anti-spam
  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "homepage-draft"),
    limit: 10,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }
  const parsed = GenerateInput.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const farmerNote = parsed.data.founderName
    ? `\n\nThe farmer's name (use it once, casually, in the about paragraph if it fits): ${parsed.data.founderName}.`
    : "";
  const userMessage = `Draft a homepage for the following farm.

Farm name: ${parsed.data.farmName}
Location: ${parsed.data.location}
Farm kind: ${parsed.data.kind}

What they grow / raise:
${parsed.data.whatYouGrow}

Their story, in their own words:
${parsed.data.story}

Pickup information:
${parsed.data.pickupInfo}${farmerNote}

Render the homepage now, in the voice and style I described. Output only the JSON.`;

  try {
    // Route through Cloudflare AI Gateway when configured. Gives us
    // caching, cost monitoring, and per-call observability without
    // changing the SDK surface. The Anthropic key still pays for the
    // call; the gateway token (cf-aig-authorization) authenticates the
    // gateway-side hop when "Authenticated Gateway" is on.
    const baseURL = ctx.env.AI_GATEWAY_URL
      ? `${ctx.env.AI_GATEWAY_URL.replace(/\/+$/, "")}/anthropic`
      : undefined;
    const defaultHeaders = ctx.env.AI_GATEWAY_TOKEN
      ? { "cf-aig-authorization": `Bearer ${ctx.env.AI_GATEWAY_TOKEN}` }
      : undefined;
    const client = new Anthropic({
      apiKey: ctx.env.ANTHROPIC_API_KEY,
      baseURL,
      defaultHeaders,
    });
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        format: zodOutputFormat(GeneratedHomepage),
        effort: "medium",
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Cache the system prompt so repeat calls cost ~10% of the first.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    if (!response.parsed_output) {
      return json({ error: "Anthropic returned no parsed output." }, 502);
    }
    return json({ ok: true, homepage: response.parsed_output });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-homepage failed:", msg);
    return json({ error: `Generation failed: ${msg}` }, 502);
  }
};
