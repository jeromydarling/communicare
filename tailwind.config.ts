import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Lighter, airier "agrarian almanac" palette. Page background is a
        // pale pink-cream wash; cards are pure white with thin outlines.
        // Token NAMES stay the same so components and Remotion don't break.
        parchment: "#FBF1EC", // page bg — lighter pink-cream
        cream: "#FBE9DD", // accent surface (eyebrow tints, banners)
        cream2: "#F5E0D2", // slightly deeper surface
        soil: "#1A1410", // text — nearly black, warm
        soil2: "#56423E", // muted body text
        wheat: "#ECC15F", // tertiary-fixed-dim
        wheatDark: "#8F6D0E", // tertiary-container
        brick: "#C16850", // a touch lighter / more salmon than before
        brickDark: "#963F28", // primary
        moss: "#7A8E70", // softer sage for muted cards
        mossDark: "#324D38",
        sky: "#8FB3D3",
        clay: "#EFD5C1",
        outline: "#DCC1BA", // hairlines / card borders — soft tan, not gray
        outlineSoft: "#EBD9CF",
        error: "#BA1A1A",
        errorSoft: "#FFDAD6",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "65ch",
        page: "1200px",
      },
      backgroundImage: {
        // Grain overlay tinted with the new soil (#26190C ≈ rgb 38, 25, 12 ≈
        // r 0.15 / g 0.10 / b 0.05) — slightly warmer than the previous noise.
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.10 0 0 0 0 0.05 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
