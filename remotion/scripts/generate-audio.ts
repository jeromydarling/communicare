/**
 * generate-audio.ts — pull the instrumental beds for the Communicare promo
 * videos from ElevenLabs Music and write them to public/audio/.
 *
 * We intentionally do not generate voiceover. Farms hear hired narration and
 * distrust it. The videos run on music + on-screen typography only.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=eleven_xxx npm run audio
 *
 * Optional env:
 *   ELEVENLABS_MUSIC_MODEL   Override the ElevenLabs music model name.
 *
 * Outputs:
 *   public/audio/soundtrack.mp3              — 33-second bed for the
 *                                              original Communicare composition
 *   public/audio/screencast-soundtrack.mp3   — 90-second bed for the
 *                                              product-walkthrough composition
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "audio");

const SHORT_PROMPT =
  "Soft fingerpicked acoustic guitar in C major. Slow tempo around 70 BPM. Sparse, contemplative, hopeful. The feeling of a farm field at dawn in early summer. Solo guitar, no drums, no synths, no vocals. Warm and patient. About thirty-three seconds long, with a gentle resolution at the end.";

const SCREENCAST_PROMPT =
  "Warm fingerpicked acoustic guitar in C major. Slow tempo around 72 BPM. A subtle bowed cello drone enters around the thirty-second mark and stays under the guitar to the end. Sparse, contemplative, gently uplifting. Editorial, like the background to a New York Times short documentary about a small farm. No drums, no electronic sounds, no vocals. Ninety seconds long, with a quiet resolution.";

const API_BASE = "https://api.elevenlabs.io/v1";

type Mode = "all" | "short" | "screencast";

function parseMode(argv: string[]): Mode {
  if (argv.includes("--short-only")) return "short";
  if (argv.includes("--screencast-only")) return "screencast";
  return "all";
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error(
      "ELEVENLABS_API_KEY is not set. Get a key at https://elevenlabs.io/app/settings/api-keys",
    );
    process.exit(1);
  }
  const mode = parseMode(process.argv);
  await mkdir(OUT_DIR, { recursive: true });

  if (mode !== "screencast") {
    await generateMusic(apiKey, {
      prompt: SHORT_PROMPT,
      lengthMs: 33_000,
      outFile: "soundtrack.mp3",
      label: "short promo soundtrack",
    });
  }
  if (mode !== "short") {
    await generateMusic(apiKey, {
      prompt: SCREENCAST_PROMPT,
      lengthMs: 90_000,
      outFile: "screencast-soundtrack.mp3",
      label: "screencast soundtrack",
    });
  }

  console.log("\n✓ Done. Run `npm run studio` to preview, or `npm run render`.");
}

async function generateMusic(
  apiKey: string,
  opts: { prompt: string; lengthMs: number; outFile: string; label: string },
) {
  console.log(`→ Generating ${opts.label} via ElevenLabs Music…`);
  const res = await fetch(`${API_BASE}/music`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      music_length_ms: opts.lengthMs,
      model_id: process.env.ELEVENLABS_MUSIC_MODEL ?? "music_v1",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${opts.label} request failed: ${res.status} ${res.statusText}\n${body.slice(0, 400)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = join(OUT_DIR, opts.outFile);
  await writeFile(outPath, buf);
  console.log(`  wrote ${outPath} (${(buf.byteLength / 1024).toFixed(1)} kb)`);
}

main().catch((err) => {
  console.error("Failed to generate audio:");
  console.error(err);
  process.exit(1);
});
