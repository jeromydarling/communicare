import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { SceneBackground } from "../SceneBackground";

// =============================================================================
// Scene 1 — Cold open (8s)
// =============================================================================
// "Mary, at the farm desk." Three big stats count up. No browser frame, no
// busy chrome — just the three numbers, each anchoring a corner, each
// hitting its final value with a subtle scale-pulse. Drifting background.
// =============================================================================

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 12, fps, config: { damping: 18 } });

  // Three counters, staggered. Each finishes well before scene end.
  const shareholders = Math.floor(
    interpolate(frame, [50, 130], [0, 38], { extrapolateRight: "clamp" }),
  );
  const cows = Math.floor(
    interpolate(frame, [70, 150], [0, 12], { extrapolateRight: "clamp" }),
  );
  const revenue = Math.floor(
    interpolate(frame, [90, 175], [0, 4370], { extrapolateRight: "clamp" }),
  );

  // Each number gets a subtle scale-pulse on every tick it changes.
  const pulse = (target: number, lastChangeFrame: number) => {
    const delta = frame - lastChangeFrame;
    return delta >= 0 && delta < 6 ? 1 + (6 - delta) * 0.01 : 1;
  };

  return (
    <AbsoluteFill>
      <SceneBackground />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 100,
          gap: 60,
        }}
      >
        <div
          style={{
            opacity: eyebrow,
            transform: `translateY(${(1 - eyebrow) * 16}px)`,
            fontFamily: fonts.body,
            fontSize: 28,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            textAlign: "center",
          }}
        >
          № 01 · Five minutes a day
        </div>

        <h1
          style={{
            opacity: title,
            transform: `translateY(${(1 - title) * 24}px)`,
            fontFamily: fonts.display,
            fontSize: 140,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: palette.soil,
            textAlign: "center",
            margin: 0,
          }}
        >
          Mary,{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            at the farm desk.
          </em>
        </h1>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 80,
            opacity: interpolate(frame, [40, 80], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <BigStat
            value={shareholders}
            label="shareholders"
            scale={pulse(shareholders, 50 + shareholders * 2)}
          />
          <BigStat
            value={cows}
            label="jersey cows"
            scale={pulse(cows, 70 + cows * 6)}
          />
          <BigStat
            value={`$${revenue.toLocaleString()}`}
            label="this week"
            scale={pulse(revenue, 90 + Math.floor(revenue / 50))}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const BigStat: React.FC<{
  value: number | string;
  label: string;
  scale: number;
}> = ({ value, label, scale }) => {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 86,
          fontWeight: 500,
          color: palette.soil,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          transform: `scale(${scale})`,
          transition: "transform 0.1s",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: fonts.body,
          fontSize: 16,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: `${palette.soil}88`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
