// =============================================================================
// generate-homepage — Supabase Edge Function (Deno runtime)
// =============================================================================
// Mirrors the Node-side route at server/generate-homepage.ts. Drafts a farm
// homepage with Claude Opus 4.7 (adaptive thinking + structured output),
// returns the parsed JSON, and applies CORS so the browser can call it
// directly via supabase.functions.invoke('generate-homepage', { body }).
//
// Deploy:   supabase functions deploy generate-homepage --no-verify-jwt
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Local:    supabase functions serve generate-homepage --no-verify-jwt
//
// JWT verification is OFF by default (see ../../config.toml) so the public
// preview demo on the static site can call it. When you want to gate it,
// flip verify_jwt = true and add a per-IP rate limit at the gateway.
// =============================================================================

import Anthropic from "npm:@anthropic-ai/sdk@^0.88.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@^0.88.0/helpers/zod";
import { z } from "npm:zod@^3.24.0";

// -----------------------------------------------------------------------------
// Schema — inlined so the Edge Function is self-contained. Kept in lockstep
// with lib/homepage-schema.ts on the Node side.
// -----------------------------------------------------------------------------

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
        body: z
          .string()
          .describe(
            "A 1-2 sentence description, 15-40 words, concrete and warm.",
          ),
      }),
    )
    .length(3)
    .describe(
      "Exactly three callouts highlighting concrete things this farm offers. Avoid generic 'fresh, local, sustainable' language — use specifics drawn from the farmer's inputs.",
    ),
  shareName: z
    .string()
    .describe(
      "A name for the farm's main share offering, drawn from the farmer's inputs. 2-5 words.",
    ),
  shareDescription: z
    .string()
    .describe(
      "A single sentence describing what a subscriber gets, 12-30 words.",
    ),
  pickupSummary: z
    .string()
    .describe(
      "A single warm sentence summarizing pickup arrangements, 10-25 words.",
    ),
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
    .describe(
      "Exactly three FAQ entries — practical questions a new subscriber would actually ask this specific farm. Tailor to the farm kind.",
    ),
  closingBlessing: z
    .string()
    .describe(
      "A warm closing line, 4-12 words, like 'Welcome to the table.' or 'We will see you in May.' Not corny.",
    ),
});

// -----------------------------------------------------------------------------
// System prompt — kept in lockstep with server/generate-homepage.ts
// -----------------------------------------------------------------------------

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

Use the farmer's own inputs faithfully. Do not invent acres, animals, names, or events the farmer did not mention. If the farmer says "I grow tomatoes and beans," do not write "we cultivate heirloom Cherokee Purple tomatoes" — that's putting words in their mouth. Stay close to what they told you, but render it warmly.

For FAQ, write questions a real prospective subscriber would ask this specific farm — not generic CSA FAQ. A herd-share dairy's FAQ should address legality and pickup logistics. A beef farm's FAQ should address hanging weight and cut sheets. A vegetable CSA's FAQ should address vacation holds and what to do with too much kale.

Output the JSON per the provided schema. No prose outside the JSON.`;

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = GenerateInput.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json(
      {
        error:
          "ANTHROPIC_API_KEY is not set on the Edge Function. Run `supabase secrets set ANTHROPIC_API_KEY=...`.",
      },
      500,
    );
  }

  const client = new Anthropic({ apiKey });

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
          // Cache the system prompt so repeat calls cost ~10% of the first
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    if (!response.parsed_output) {
      return json(
        {
          error:
            "The model didn't return a valid homepage. Try again — sometimes Tuesdays are like that.",
        },
        502,
      );
    }

    return json({
      homepage: response.parsed_output,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens ?? 0,
        cache_write: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json(
        {
          error:
            "We're being rate-limited by our model provider. Try again in a minute.",
        },
        429,
      );
    }
    if (err instanceof Anthropic.APIError) {
      return json(
        { error: `Model API error (${err.status}): ${err.message}` },
        502,
      );
    }
    console.error("generate-homepage unexpected error:", err);
    return json(
      { error: "Something unexpected happened. Please try again." },
      500,
    );
  }
});
