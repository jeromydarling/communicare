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
        // Adopted from Stitch's `agrarian_heritage` palette — warmer, pinker,
        // more "old farmhouse + terracotta" than our previous cooler cream.
        // Token NAMES stay the same so components and Remotion don't break.
        parchment: "#FFF8F5", // background (was #FAF5ED)
        cream: "#FFEADB", // surface-container (was #F2EAD8)
        cream2: "#F8DEC9", // surface-container-highest (was #EFE4CD)
        soil: "#26190C", // on-surface (was #2D1F12) — richer
        soil2: "#56423E", // on-surface-variant (was #4A3621)
        wheat: "#ECC15F", // tertiary-fixed-dim (was #C19A3C) — brighter gold
        wheatDark: "#8F6D0E", // tertiary-container (was #9B7A28)
        brick: "#B5563E", // primary-container (unchanged)
        brickDark: "#963F28", // primary (was #8E3F2B) — deeper
        moss: "#4F6B55", // on-secondary-container (was #4A6650)
        mossDark: "#324D38", // on-secondary-fixed-variant (was #33493A)
        sky: "#8FB3D3", // unchanged — Stitch had no equivalent
        clay: "#EFD5C1", // surface-dim (was #D9B98C) — warmer
        // New tokens from Stitch
        outline: "#89726D",
        outlineSoft: "#DCC1BA",
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
