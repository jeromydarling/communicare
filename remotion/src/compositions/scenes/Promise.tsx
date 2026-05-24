import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { palette, fonts } from "../../brand/tokens";

const LINES = [
  "We will never charge a setup fee.",
  "We will never lock your data.",
  "We will never sell what your members tell you.",
];

export const Promise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.cream,
        color: palette.soil,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: portrait ? "0 60px" : "0 200px",
      }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: portrait ? 18 : 22,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: palette.brick,
          marginBottom: 50,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Our promise
      </div>
      {LINES.map((line, i) => {
        const start = 15 + i * 35;
        const opacity = interpolate(frame, [start, start + 20], [0, 1], {
          extrapolateRight: "clamp",
        });
        const y = interpolate(frame, [start, start + 20], [20, 0], {
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: portrait ? 56 : 72,
              lineHeight: 1.2,
              textAlign: "center",
              opacity,
              transform: `translateY(${y}px)`,
              marginBottom: 28,
              maxWidth: 1200,
            }}
          >
            <span style={{ color: palette.wheatDark, marginRight: 16 }}>※</span>
            {line}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
