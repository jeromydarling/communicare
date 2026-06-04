// =============================================================================
// POST /api/generate-homepage — Workers AI port of the homepage drafter
// =============================================================================
// AI-drafts a one-page farm homepage from the operator's inputs. Uses the
// AI binding (@cf/meta/llama-3.3-70b-instruct-fp8-fast) with the
// response_format: { type: "json_schema" } structured-output mode that
// Workers AI added in February 2025.
//
// Public endpoint, rate-limited 10/hr/IP via KV — Workers AI is paid
// usage ($0.29 / M input + $2.25 / M output tokens for 70B), so we
// still care about runaway request loops.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";

type Env = {
  AI?: Ai;
  RATELIMIT?: KVNamespace;
};

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VALID_KINDS = new Set([
  "Vegetable CSA",
  "Raw milk herd share",
  "Pastured meat",
  "Pastured eggs",
  "Mixed farm",
  "Market garden",
  "Orchard / fruit share",
  "Flower farm",
]);

type RequestBody = {
  farmName?: string;
  location?: string;
  kind?: string;
  whatYouGrow?: string;
  story?: string;
  pickupInfo?: string;
  founderName?: string;
};

// The shape we ask the model to produce, expressed as JSON Schema. Kept
// in lockstep with the GeneratedHomepage zod schema on the client side
// (lib/homepage-schema.ts on the Node side).
const HOMEPAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    heroHeadline: {
      type: "string",
      description:
        "A short, warm headline for the farm — 3 to 10 words, ideally a complete sentence with a period.",
    },
    tagline: {
      type: "string",
      description:
        "One sentence under the headline, 12-25 words, describing the farm in concrete, sensory terms. No marketing-speak.",
    },
    about: {
      type: "string",
      description:
        "A 2-4 sentence 'about' paragraph in a warm, plain-spoken, slightly editorial voice. Use specific details from the farmer's story. Avoid 'platform', 'experience', 'community-driven', 'passionate'. Sound like a person, not a brand.",
    },
    callouts: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: {
            type: "string",
            description: "A short feature heading — 3 to 8 words.",
          },
          body: {
            type: "string",
            description: "A 1-2 sentence description, 15-40 words, concrete and warm.",
          },
        },
        required: ["label", "body"],
      },
    },
    shareName: {
      type: "string",
      description:
        "A name for the farm's main share offering, drawn from the farmer's inputs. 2-5 words.",
    },
    shareDescription: {
      type: "string",
      description: "A single sentence describing what a subscriber gets, 12-30 words.",
    },
    pickupSummary: {
      type: "string",
      description: "A single warm sentence summarizing pickup arrangements, 10-25 words.",
    },
    faq: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          q: { type: "string", description: "A question a curious neighbor would ask." },
          a: {
            type: "string",
            description: "An honest, plain-spoken answer, 1-3 sentences, in the farmer's voice.",
          },
        },
        required: ["q", "a"],
      },
    },
    closingBlessing: {
      type: "string",
      description: "A warm closing line, 4-12 words, like 'Welcome to the table.' Not corny.",
    },
  },
  required: [
    "heroHeadline", "tagline", "about", "callouts",
    "shareName", "shareDescription", "pickupSummary", "faq", "closingBlessing",
  ],
} as const;

const SYSTEM_PROMPT = `You are a thoughtful, plain-spoken writer drafting a one-page homepage for a small American farm — the kind that sells vegetable shares, raw milk via herd-share agreements, grass-fed beef, pastured eggs, or flowers.

Your voice is grounded in the tradition of small-press farm newsletters, the Catholic Worker, Wendell Berry essays, and the Whole Earth Catalog. It is editorial, warm, specific, and unembarrassed by the labor of feeding people. It is NEVER:

- Corporate or "SaaS-y" ("platform", "experience", "community-driven", "passionate about", "we believe in")
- Sentimental or hokey ("From our family to yours!", excessive exclamation, "right at the heart")
- Generic ("fresh, local, sustainable" without specifics)
- Trying too hard to be folksy or rustic — let the specifics carry the warmth

INSTEAD it is:

- Concrete: name the actual creek, the actual cow, the actual variety
- Honest: include the small troubles (the flood year, the deer, the season they didn't till)
- Specific to the farm kind: a herd-share dairy talks about state law and milking, a vegetable CSA about pickup windows and crop variety, a meat farm about catch-weight and butchering
- Warm but not gushing: as if written by the farmer themselves in a quiet hour after dinner

Use the farmer's own inputs faithfully. Do not invent acres, animals, names, or events the farmer did not mention. Stay close to what they told you, but render it warmly.

Output ONLY valid JSON matching the provided schema. No prose, no code fences.`;

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.AI) {
    return json({ error: "Workers AI binding missing on this deploy." }, 500);
  }

  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "homepage-draft"),
    limit: 10,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  // Validate inputs
  const farmName = (body.farmName ?? "").trim();
  const location = (body.location ?? "").trim();
  const kind = body.kind ?? "";
  const whatYouGrow = (body.whatYouGrow ?? "").trim();
  const story = (body.story ?? "").trim();
  const pickupInfo = (body.pickupInfo ?? "").trim();
  const founderName = (body.founderName ?? "").trim();

  if (!farmName || farmName.length > 120) {
    return json({ error: "Farm name required (≤ 120 chars)." }, 400);
  }
  if (!location || location.length > 120) {
    return json({ error: "Location required (≤ 120 chars)." }, 400);
  }
  if (!VALID_KINDS.has(kind)) {
    return json({ error: "Pick a farm kind." }, 400);
  }
  if (!whatYouGrow || whatYouGrow.length > 600) {
    return json({ error: "What you grow / raise required (≤ 600 chars)." }, 400);
  }
  if (!story || story.length > 1000) {
    return json({ error: "Story required (≤ 1000 chars)." }, 400);
  }
  if (!pickupInfo || pickupInfo.length > 400) {
    return json({ error: "Pickup info required (≤ 400 chars)." }, 400);
  }

  const farmerNote = founderName
    ? `\n\nThe farmer's name (use it once, casually, in the about paragraph if it fits): ${founderName}.`
    : "";

  const userMessage = `Draft a homepage for the following farm.

Farm name: ${farmName}
Location: ${location}
Farm kind: ${kind}

What they grow / raise:
${whatYouGrow}

Their story, in their own words:
${story}

Pickup information:
${pickupInfo}${farmerNote}

Render the homepage now, in the voice and style I described. Output only the JSON object that satisfies the schema.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResp: any = await ctx.env.AI.run(MODEL as never, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        schema: HOMEPAGE_SCHEMA,
      },
      max_tokens: 4000,
    } as never);

    // Workers AI may return:
    //   { response: <object> } when json_schema is honored
    //   { response: "<json string>" } when the model serialized as text
    //   <object directly> in some shapes
    const candidate =
      typeof aiResp === "object" && aiResp !== null && "response" in aiResp
        ? aiResp.response
        : aiResp;
    let parsed: unknown;
    if (typeof candidate === "string") {
      const stripped = candidate
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(stripped);
    } else {
      parsed = candidate;
    }

    if (!parsed || typeof parsed !== "object") {
      return json({ error: "Workers AI returned an unexpected shape." }, 502);
    }

    return json({ ok: true, homepage: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-homepage failed:", msg);
    return json({ error: `Generation failed: ${msg}` }, 502);
  }
};
