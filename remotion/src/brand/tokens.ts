// Ported verbatim from app/globals.css + tailwind.config.ts so the video
// matches the website exactly. Edit both files together; the brand voice
// skill (.claude/skills/communicare-voice/SKILL.md) is the source of truth
// on tone.

export const palette = {
  parchment: "#FAF5ED",
  cream: "#F2EAD8",
  cream2: "#EFE4CD",
  soil: "#2D1F12",
  soil2: "#4A3621",
  wheat: "#C19A3C",
  wheatDark: "#9B7A28",
  brick: "#B5563E",
  brickDark: "#8E3F2B",
  moss: "#4A6650",
  mossDark: "#33493A",
  sky: "#8FB3D3",
  clay: "#D9B98C",
} as const;

export const fonts = {
  display: "Fraunces",
  body: "Source Serif 4",
  mono: "ui-monospace, monospace",
} as const;

// Common spring config — slower, gentler than defaults. Matches the
// editorial pacing of the website.
export const editorialSpring = {
  damping: 18,
  stiffness: 60,
  mass: 0.9,
};

export const timing = {
  fps: 30,
  // One "beat" = one second at our default fps. Most scenes are 5 beats.
  beat: 30,
  scene: 150, // 5 seconds
  half: 15,
  quarter: 8,
  intro: 12, // fade-in framing window
} as const;
