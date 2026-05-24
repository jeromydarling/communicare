/**
 * generate-audio.ts — pull both the music bed and the voiceover for the
 * Communicare promo from ElevenLabs and write them to public/audio/.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=eleven_xxx npm run audio
 *   ELEVENLABS_API_KEY=eleven_xxx npm run music
 *   ELEVENLABS_API_KEY=eleven_xxx npm run voiceover
 *
 * Optional env:
 *   ELEVENLABS_VOICE_ID    Voice ID for narration (defaults to a warm female
 *                          voice — Rachel: 21m00Tcm4TlvDq8ikWAM).
 *   ELEVENLABS_MUSIC_MODEL Override the music model name.
 *
 * Outputs:
 *   public/audio/soundtrack.mp3   — 30-second instrumental bed
 *   public/audio/narration.mp3    — 30-second voiceover
 */

import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "audio");

const NARRATION_TEXT = `For the farms that feed us. Communicare is software for your farm share — nine dollars a month, no setup, no contract, and a free homepage written for you. Members order by texting back. Find a farm near you at communicare dot farm. Pax tibi.`;

const MUSIC_PROMPT =
  "Soft fingerpicked acoustic guitar in C major. Slow tempo around 70 BPM. Sparse, contemplative, hopeful. The feeling of a farm field at dawn in early summer. Solo guitar, no drums, no synths. Warm and patient. Thirty seconds long, with a gentle resolution at the end.";

const API_BASE = "https://api.elevenlabs.io/v1";
const VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel

type Mode = "all" | "music-only" | "voiceover-only";

function parseMode(argv: string[]): Mode {
  if (argv.includes("--music-only")) return "music-only";
  if (argv.includes("--voiceover-only")) return "voiceover-only";
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

  if (mode !== "voiceover-only") {
    await generateMusic(apiKey);
  }
  if (mode !== "music-only") {
    await generateNarration(apiKey);
  }

  console.log("\n✓ Done. Run `npm run studio` to preview, or `npm run render`.");
}

async function generateMusic(apiKey: string) {
  console.log("→ Generating music bed via ElevenLabs Music…");
  // ElevenLabs Music API endpoint. Returns audio/mpeg.
  // Endpoint: POST /v1/music
  const res = await fetch(`${API_BASE}/music`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: MUSIC_PROMPT,
      music_length_ms: 30000,
      model_id: process.env.ELEVENLABS_MUSIC_MODEL ?? "music_v1",
    }),
  });
  await writeAudioFrom(res, join(OUT_DIR, "soundtrack.mp3"), "music");
}

async function generateNarration(apiKey: string) {
  console.log(`→ Generating narration with voice ${VOICE_ID}…`);
  const res = await fetch(`${API_BASE}/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: NARRATION_TEXT,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.75,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });
  await writeAudioFrom(res, join(OUT_DIR, "narration.mp3"), "narration");
}

async function writeAudioFrom(
  res: Response,
  outPath: string,
  label: string,
) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${label} request failed: ${res.status} ${res.statusText}\n${body.slice(0, 400)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  console.log(`  wrote ${outPath} (${(buf.byteLength / 1024).toFixed(1)} kb)`);
}

main().catch((err) => {
  console.error("Failed to generate audio:");
  console.error(err);
  process.exit(1);
});
