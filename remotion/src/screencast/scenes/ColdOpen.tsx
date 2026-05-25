import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { BrowserFrame } from "../frames";

// 10 seconds — establishes Mary, the farm, and the promise of "five minutes
// a day." The browser frame settles in, the dashboard appears, the stat
// numbers count up as the narration lands.

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 18 } });
  const frameIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20, stiffness: 70 },
  });
  const dashIn = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Stat counters
  const shareholders = Math.floor(interpolate(frame, [90, 180], [0, 38], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));
  const cows = Math.floor(interpolate(frame, [110, 190], [0, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));
  const revenue = Math.floor(interpolate(frame, [130, 220], [0, 4370], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));

  return (
    <AbsoluteFill
      style={{
        background: palette.parchment,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 20}px)`,
          textAlign: "center",
          marginBottom: 36,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 18,
          }}
        >
          № 01 · Five minutes a day
        </div>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 84,
            fontWeight: 500,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            margin: 0,
            color: palette.soil,
          }}
        >
          Mary, at the farm desk.
        </h1>
      </div>

      <div
        style={{
          opacity: frameIn,
          transform: `translateY(${(1 - frameIn) * 60}px) scale(${0.96 + frameIn * 0.04})`,
        }}
      >
        <BrowserFrame
          url="communicare.farm/farmer"
          width={1180}
          height={480}
        >
          <div
            style={{
              padding: 36,
              opacity: dashIn,
              transform: `translateY(${(1 - dashIn) * 12}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 12,
              }}
            >
              Monday, May 25
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: 56,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 32,
                color: palette.soil,
              }}
            >
              Today on the farm.
            </h2>
            <div style={{ display: "flex", gap: 18 }}>
              <DashStat label="Active shareholders" value={shareholders} />
              <DashStat label="Jersey cows" value={cows} />
              <DashStat
                label="This week's revenue"
                value={revenue}
                prefix="$"
                comma
              />
            </div>
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

const DashStat: React.FC<{
  label: string;
  value: number;
  prefix?: string;
  comma?: boolean;
}> = ({ label, value, prefix = "", comma = false }) => {
  const display = comma ? value.toLocaleString() : value.toString();
  return (
    <div
      style={{
        flex: 1,
        background: palette.parchment,
        border: `1px solid ${palette.outlineSoft}`,
        borderRadius: 10,
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 56,
          fontWeight: 500,
          color: palette.soil,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {prefix}
        {display}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: `${palette.soil}88`,
          marginTop: 10,
        }}
      >
        {label}
      </div>
    </div>
  );
};
