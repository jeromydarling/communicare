# Communicare — Remotion video

The marketing / explainer videos for Communicare, rendered as React with
[Remotion](https://www.remotion.dev). Brand-locked to the main app's
palette and typography via `src/brand/tokens.ts`.

## Quick start

```bash
cd remotion
npm install
npm run studio          # preview at http://localhost:3001
```

## Composing the video

The main composition lives at `src/compositions/Communicare.tsx`. Six 5-second
scenes, 30 seconds total, 30 fps, 1920×1080. A `CommunicarePortrait`
composition renders the same six scenes at 1080×1920 for Instagram Stories
and Reels.

| # | Scene | File |
|---|---|---|
| 1 | Hero — "For the farms that feed us." | `src/compositions/scenes/Hero.tsx` |
| 2 | Price — $9 fills the screen | `src/compositions/scenes/Price.tsx` |
| 3 | Promise — three "we will never" lines | `src/compositions/scenes/Promise.tsx` |
| 4 | SMS demo — animated swap-by-text conversation | `src/compositions/scenes/SmsDemo.tsx` |
| 5 | Discovery map — pins growing across the country | `src/compositions/scenes/Map.tsx` |
| 6 | Closing — Communicare + Pax tibi | `src/compositions/scenes/Closing.tsx` |

The brand-voice skill at `.claude/skills/communicare-voice/SKILL.md` is the
source of truth on tone. Read it before editing copy.

## Audio (ElevenLabs)

The composition references two audio files:

- `public/audio/soundtrack.mp3` — instrumental music bed (fingerpicked guitar)
- `public/audio/narration.mp3` — voiceover

Generate both:

```bash
export ELEVENLABS_API_KEY=eleven_...
npm run audio
```

Just music, or just narration:

```bash
npm run music
npm run voiceover
```

The composition gracefully omits audio if the files don't exist, so you can
preview the visuals before generating sound.

Edit the narration script and music prompt at the top of
`scripts/generate-audio.ts`. The default narration is the manifesto in
30 seconds, in the voice of Rachel (a warm, slightly editorial female voice).

## Rendering

```bash
npm run render             # 1920×1080 landscape → out/communicare.mp4
npm run render:portrait    # 1080×1920 portrait → out/communicare-portrait.mp4
npm run render:still       # single frame for a poster → out/poster.png
```

## Brand discipline

- Background is always `palette.parchment` or `palette.cream` or `palette.soil`.
  Never pure white. Never gray.
- Display headlines: Fraunces, weight 500, letter-spacing -0.025em.
- Body: Source Serif 4.
- Accent colors: `palette.brick` for emphasis, `palette.wheat` for warmth,
  `palette.moss` for "alive."
- Pacing is slow. Each scene holds at least 3 seconds before introducing new
  content. Springs use `damping: 14–18` (gentler than Remotion defaults).
- No purple gradients. No glassmorphism. No neon. No emoji in body text
  (use ornaments: ❦ ❀ ※ ◊).
- Logo: never spin it. The radial strokes grow outward like wheat coming up.

If something starts looking like a generic SaaS ad, read
`.claude/skills/communicare-voice/SKILL.md` again.
