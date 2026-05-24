---
name: remotion-promo
description: |
  Build short promotional / explainer videos for Communicare (or any farm-software
  oriented product) using Remotion — a React framework for programmatic video.
  Use when the user asks to "make a video", "build a promo", "render an animated
  homepage video", "generate a marketing clip", "produce a landing-page hero
  video", or similar. Defaults to landscape 1920×1080, 30 fps. Outputs MP4.

  Trigger phrases:
  - "make a promo video"
  - "remotion"
  - "animated hero"
  - "marketing video"
  - "render a video"
  - "/promo"
---

# Remotion promo video

A focused skill for producing short (15s–90s) promo videos for Communicare
using [Remotion](https://www.remotion.dev). Remotion renders React components
into MP4 frame-by-frame — it's the right tool when you want code-driven motion
graphics, branded animation, and version-controlled video.

## When to use this skill

- The user wants a marketing or onboarding video that should match the
  Communicare brand (warm cream, harvest gold, brick, Fraunces type)
- They want an animated hero element on the landing page
- They want a short "what is Communicare" explainer to share on social media
- They want a generated render of "this week's share" in animated form

Do **not** use this skill for:
- Live-action editing (use a real NLE)
- Slideshow exports (use the pptx skill)
- Animated GIFs for Slack (use the `slack-gif-creator` skill if installed)

## Setup

Remotion lives in its own subproject so it doesn't pull video deps into the
main Next.js bundle. Recommended layout:

```
communicare/
  remotion/                  ← new
    package.json             (React 18 + Remotion 4)
    src/
      Root.tsx               (registers compositions)
      compositions/
        PromoHero.tsx
        WhatsInTheShare.tsx
      brand/
        tokens.ts            (mirror app/globals.css palette)
        Logo.tsx             (port from components/mark.tsx)
        Type.tsx             (Fraunces wrapper)
    remotion.config.ts
```

Install:

```bash
mkdir -p remotion && cd remotion
npm init -y
npm install remotion @remotion/cli @remotion/google-fonts react react-dom
```

## Brand tokens (port from app/globals.css)

Always start a new composition by importing the shared tokens — never
hardcode colors or fonts. Match the main app exactly.

```ts
// remotion/src/brand/tokens.ts
export const palette = {
  parchment: "#FAF5ED",
  cream: "#F2EAD8",
  soil: "#2D1F12",
  wheat: "#C19A3C",
  wheatDark: "#9B7A28",
  brick: "#B5563E",
  moss: "#4A6650",
  sky: "#8FB3D3",
};

export const fonts = {
  display: "Fraunces",
  body: "Source Serif 4",
};

export const timing = {
  fps: 30,
  beat: 30,      // 1 beat = 1s @ 30fps
  half: 15,
  quarter: 8,
};
```

## Core Remotion primitives — minimal reference

| Primitive | What it does |
|---|---|
| `<Composition>` | Declares one renderable video (id, dimensions, fps, duration) — lives in `Root.tsx` |
| `useCurrentFrame()` | Returns current frame number (0-indexed); your animation source-of-truth |
| `useVideoConfig()` | `{ fps, width, height, durationInFrames }` for the active composition |
| `interpolate(frame, [a, b], [from, to], { extrapolateRight: "clamp" })` | Map a frame range to any value (opacity, x, y, scale, etc.) |
| `spring({ frame, fps, config: { damping: 12 } })` | Physics-based easing — better than linear interpolate for UI motion |
| `<Sequence from={N} durationInFrames={M}>` | Schedule a subtree to appear at frame N for M frames |
| `<Series>` / `<Series.Sequence durationInFrames={N}>` | Chain sequences back-to-back without manual offset math |
| `<Audio src={...} volume={interpolate(...)} />` | Pin audio to a frame range; same interpolate trick for fades |
| `<Img src={staticFile("foo.png")} />` | Load assets from `/public` |

**Cardinal rule:** never use `setState`, `useEffect`, or animation libraries
that read wall-clock time. Remotion renders frames out of order in parallel —
all animation must be a pure function of `useCurrentFrame()`.

## Template: 30-second Communicare hero

This is the canonical "show me what Communicare is" video. Six beats of 5s:

```tsx
// remotion/src/compositions/PromoHero.tsx
import { AbsoluteFill, Series, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { palette, fonts, timing } from "../brand/tokens";

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: palette.parchment, color: palette.soil, fontFamily: fonts.display, alignItems: "center", justifyContent: "center" }}>
    {children}
  </AbsoluteFill>
);

const beat = timing.beat * 5; // 5s per scene

export const PromoHero: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={beat}><Scene1 /></Series.Sequence>
    <Series.Sequence durationInFrames={beat}><Scene2 /></Series.Sequence>
    <Series.Sequence durationInFrames={beat}><Scene3 /></Series.Sequence>
    <Series.Sequence durationInFrames={beat}><Scene4 /></Series.Sequence>
    <Series.Sequence durationInFrames={beat}><Scene5 /></Series.Sequence>
    <Series.Sequence durationInFrames={beat}><Scene6 /></Series.Sequence>
  </Series>
);

const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = spring({ frame, fps, config: { damping: 18 } });
  return (
    <Card>
      <h1 style={{ fontSize: 180, lineHeight: 0.9, opacity: o, transform: `translateY(${interpolate(o, [0, 1], [40, 0])}px)` }}>
        For the farms<br />that feed us.
      </h1>
    </Card>
  );
};

// ...Scene2 through Scene6 follow the same pattern.
// Suggested beats:
//   1. Hero headline ("For the farms that feed us.")
//   2. The price ($9 fills the screen, brick accent)
//   3. The promise (no setup. no contract. no tracking.) — three crossfaded lines
//   4. The magic-link text demo — animated SMS bubble
//   5. The herd-share section — small jar icon + boarding-fee line
//   6. Closing — "Communicare — Pax tibi" with leaf motif
```

Register in `Root.tsx`:

```tsx
import { Composition } from "remotion";
import { PromoHero } from "./compositions/PromoHero";

export const Root: React.FC = () => (
  <>
    <Composition
      id="PromoHero"
      component={PromoHero}
      durationInFrames={30 * 30}  // 30 seconds @ 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
```

## Preview and render

```bash
npx remotion studio                              # browser preview at localhost:3001
npx remotion render PromoHero out/promo.mp4       # render to MP4
npx remotion render PromoHero out/promo.webm --codec=vp8
```

For a portrait (Instagram Stories / Reels) variant:

```tsx
<Composition id="PromoHeroPortrait" component={PromoHero}
  durationInFrames={900} fps={30} width={1080} height={1920} />
```

## Communicare-specific design notes

- **Pacing is slow.** This is a Catholic-Worker-voiced product, not a tech
  ad. Hold each scene for at least 3 seconds before introducing new
  content. Avoid kinetic typography that flashes — use slow fades and
  patient spring eases (`damping: 18+`).
- **No purple gradients. No glassmorphism. No neon.** Stay in the warm
  palette: parchment background, soil for primary text, brick for emphasis,
  wheat for accent. Add the `bg-grain` SVG noise overlay from
  `tailwind.config.ts` as a final layer in every composition.
- **Type pairing:** display headlines in Fraunces (variable, opt-sz 144);
  body in Source Serif 4. Never Inter, never Roboto, never system-ui.
- **Ornaments allowed:** ❦, ❀, ※, ◊ — sparingly, in soil/40 opacity, used as
  scene breaks the way they appear in the manifesto page.
- **Logo motion:** the `<Mark>` SVG from `components/mark.tsx` should be
  ported into `remotion/src/brand/Logo.tsx`. Animate its inner radial lines
  with staggered `interpolate` calls so they appear to grow outward (like
  wheat). Never spin it.
- **Audio:** if voiceover is wanted, prefer warm female voice at a slow
  cadence (75% rate). Music: solo piano or solo guitar, never electronic.
  Many compositions work better silent with bold typography.

## Common pitfalls

- **Don't use `setTimeout` / `setInterval`.** Frames render in parallel.
- **Don't fetch from APIs at render time.** Pre-fetch into `staticFile()` or
  pass via props in `defaultProps` on the `<Composition>`.
- **Don't import client-only browser APIs** (`window`, `localStorage`). The
  renderer runs in headless Chromium but evaluates JS in a stricter
  context — defensive code wins.
- **Match `fps` everywhere.** If the composition is 30fps, all interpolates
  must use that. Use `useVideoConfig()` rather than hardcoding.

## Live docs

When in doubt:
- Remotion docs: https://www.remotion.dev/docs
- API reference: https://www.remotion.dev/docs/api
- Examples gallery: https://www.remotion.dev/templates
