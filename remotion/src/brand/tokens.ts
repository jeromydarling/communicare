// Ported verbatim from app/globals.css + tailwind.config.ts so the video
// matches the website exactly. Edit both files together; the brand voice
// skill (.claude/skills/communicare-voice/SKILL.md) is the source of truth
// on tone.

// Mirrors tailwind.config.ts → colors. Adopted from Stitch's
// `agrarian_heritage` palette: warmer + pinker. Edit both files together.
export const palette = {
  parchment: "#FFF8F5",
  cream: "#FFEADB",
  cream2: "#F8DEC9",
  soil: "#26190C",
  soil2: "#56423E",
  wheat: "#ECC15F",
  wheatDark: "#8F6D0E",
  brick: "#B5563E",
  brickDark: "#963F28",
  moss: "#4F6B55",
  mossDark: "#324D38",
  sky: "#8FB3D3",
  clay: "#EFD5C1",
  outline: "#89726D",
  outlineSoft: "#DCC1BA",
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
