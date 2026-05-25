import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { Mark } from "../../brand/Logo";
import { SceneBackground } from "../SceneBackground";

// =============================================================================
// Scene 6 — Close (10s)
// =============================================================================
// Brand mark draws in. Pitch line lands in two beats. URL lands. $9 pill
// lands last, with a subtle drift on the background continuing throughout.
// =============================================================================

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markIn = spring({ frame, fps, config: { damping: 14 } });
  const line1 = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const line2 = spring({ frame: frame - 70, fps, config: { damping: 18 } });
  const urlIn = spring({ frame: frame - 120, fps, config: { damping: 18 } });
  const priceIn = spring({
    frame: frame - 160,
    fps,
    config: { damping: 18 },
  });

  return (
    <AbsoluteFill>
      <SceneBackground accent={palette.brick} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 60,
        }}
      >
        <div
          style={{
            opacity: markIn,
            transform: `scale(${0.6 + markIn * 0.4})`,
            color: palette.brick,
          }}
        >
          <Mark size={140} color={palette.brick} />
        </div>

        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 160,
            fontWeight: 500,
            lineHeight: 0.94,
            letterSpacing: "-0.03em",
            margin: 0,
            textAlign: "center",
            color: palette.soil,
          }}
        >
          <span
            style={{
              display: "block",
              opacity: line1,
              transform: `translateY(${(1 - line1) * 30}px)`,
            }}
          >
            For the farms
          </span>
          <span
            style={{
              display: "block",
              opacity: line2,
              transform: `translateY(${(1 - line2) * 30}px)`,
              fontStyle: "italic",
              color: palette.brick,
            }}
          >
            that feed us.
          </span>
        </h1>

        <div
          style={{
            opacity: urlIn,
            transform: `translateY(${(1 - urlIn) * 18}px)`,
            fontFamily: fonts.mono,
            fontSize: 38,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.brick,
            marginTop: 16,
          }}
        >
          communicare.farm
        </div>

        <div
          style={{
            opacity: priceIn,
            transform: `translateY(${(1 - priceIn) * 16}px)`,
            marginTop: 22,
            background: palette.soil,
            color: palette.parchment,
            padding: "22px 50px",
            borderRadius: 999,
            display: "flex",
            alignItems: "baseline",
            gap: 22,
          }}
        >
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 56,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            $9
          </span>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 26,
              fontStyle: "italic",
              letterSpacing: "0.04em",
              opacity: 0.92,
              lineHeight: 1,
            }}
          >
            a month · no setup · no contracts
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
