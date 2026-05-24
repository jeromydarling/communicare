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
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.18 0 0 0 0 0.12 0 0 0 0 0.07 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
