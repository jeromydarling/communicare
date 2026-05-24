// Live AI homepage generator — Claude Opus 4.7 with adaptive thinking and
// structured outputs via zod.
//
// This file is NOT included in the static Pages build. It is preserved here
// for the self-hosted version of Communicare. To wire it up:
//
//   1. Switch next.config.mjs back to a dynamic build (remove `output: "export"`).
//   2. Copy this file to app/api/generate-homepage/route.ts.
//   3. Set ANTHROPIC_API_KEY in your environment.
//   4. Deploy to a runtime that supports server functions
//      (Vercel, Cloudflare Workers w/ next-on-pages, Fly.io, etc.).
//
// The /homepage page already calls this endpoint when the deployed origin is
// not github.io — it falls back to the pre-baked sample homepages otherwise.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  GenerateInput,
  GeneratedHomepage,
} from "@/lib/homepage-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const parsed = GenerateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
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
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "The model did not return a valid homepage. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
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
      return NextResponse.json(
        { error: "Rate-limited by the model provider. Try again in a minute." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Model API error (${err.status}): ${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Something unexpected happened. Please try again." },
      { status: 500 },
    );
  }
}
