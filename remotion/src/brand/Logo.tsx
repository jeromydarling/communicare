// Animated port of components/mark.tsx for the video. The inner radial
// strokes grow outward in staggered fashion like wheat coming up.

import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Mark: React.FC<{ size?: number; color?: string }> = ({
  size = 64,
  color = "currentColor",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const circleProgress = spring({ frame, fps, config: { damping: 18 } });
  const inner1 = spring({ frame: frame - 4, fps, config: { damping: 16 } });
  const inner2 = spring({ frame: frame - 8, fps, config: { damping: 16 } });
  const inner3 = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const inner4 = spring({ frame: frame - 16, fps, config: { damping: 16 } });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ display: "block" }}
    >
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={Math.PI * 44}
        strokeDashoffset={Math.PI * 44 * (1 - circleProgress)}
      />
      <g
        style={{ transform: `scale(${inner1})`, transformOrigin: "24px 24px" }}
      >
        <path
          d="M24 8 C 22 18, 22 30, 24 40 M24 8 C 26 18, 26 30, 24 40"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{ transform: `scale(${inner2})`, transformOrigin: "24px 24px" }}
      >
        <path
          d="M16 15 C 19 18, 22 21, 24 24 M32 15 C 29 18, 26 21, 24 24"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{ transform: `scale(${inner3})`, transformOrigin: "24px 24px" }}
      >
        <path
          d="M14 23 C 18 25, 22 26, 24 27 M34 23 C 30 25, 26 26, 24 27"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{ transform: `scale(${inner4})`, transformOrigin: "24px 24px" }}
      >
        <path
          d="M16 31 C 19 32, 22 33, 24 33 M32 31 C 29 32, 26 33, 24 33"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

// Tiny inline grain overlay — same SVG noise used in tailwind.config.ts
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.4 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      pointerEvents: "none",
      mixBlendMode: "multiply",
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.18 0 0 0 0 0.12 0 0 0 0 0.07 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }}
  />
);

export const Ornament: React.FC<{ char?: string; color?: string }> = ({
  char = "❦",
  color,
}) => (
  <span
    style={{
      fontFamily: "Fraunces",
      color: color ?? "rgba(38,25,12, 0.4)",
      fontSize: 28,
      letterSpacing: "0.5em",
    }}
  >
    {char}
  </span>
);
