import { z } from "zod";

export const FARM_KINDS = [
  "Vegetable CSA",
  "Raw milk herd share",
  "Pastured meat",
  "Pastured eggs",
  "Mixed farm",
  "Market garden",
  "Orchard / fruit share",
  "Flower farm",
] as const;

export const GenerateInput = z.object({
  farmName: z.string().min(1).max(120),
  location: z.string().min(1).max(120),
  kind: z.enum(FARM_KINDS),
  whatYouGrow: z.string().min(1).max(600),
  story: z.string().min(1).max(1000),
  pickupInfo: z.string().min(1).max(400),
  founderName: z.string().max(120).optional(),
});
export type GenerateInput = z.infer<typeof GenerateInput>;

export const GeneratedHomepage = z.object({
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
        label: z
          .string()
          .describe("A short feature heading — 3 to 8 words."),
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
export type GeneratedHomepage = z.infer<typeof GeneratedHomepage>;
