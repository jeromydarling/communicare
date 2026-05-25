import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { Mark } from "../../brand/Logo";

// 15s — close. Mark draws in, pitch line appears, URL chip lands, $9/mo
// badge fades in last.

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markIn = spring({ frame, fps, config: { damping: 16 } });
  const line1 = spring({
    frame: frame - 45,
    fps,
    config: { damping: 18 },
  });
  const line2 = spring({
    frame: frame - 90,
    fps,
    config: { damping: 18 },
  });
  const urlIn = spring({
    frame: frame - 150,
    fps,
    config: { damping: 18 },
  });
  const priceIn = spring({
    frame: frame - 220,
    fps,
    config: { damping: 18 },
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.parchment,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "60px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Warm radial wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 80% 20%, ${palette.wheat}40 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 10% 110%, ${palette.brick}30 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          opacity: markIn,
          transform: `scale(${0.7 + markIn * 0.3})`,
          color: palette.brick,
          position: "relative",
        }}
      >
        <Mark size={120} color={palette.brick} />
      </div>

      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: 110,
          fontWeight: 500,
          lineHeight: 0.96,
          letterSpacing: "-0.025em",
          margin: 0,
          textAlign: "center",
          color: palette.soil,
          position: "relative",
        }}
      >
        <span
          style={{
            display: "block",
            opacity: line1,
            transform: `translateY(${(1 - line1) * 24}px)`,
          }}
        >
          For the farms
        </span>
        <span
          style={{
            display: "block",
            opacity: line2,
            transform: `translateY(${(1 - line2) * 24}px)`,
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
          transform: `translateY(${(1 - urlIn) * 16}px)`,
          fontFamily: fonts.mono,
          fontSize: 32,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: palette.brick,
          marginTop: 12,
          position: "relative",
        }}
      >
        communicare.farm
      </div>

      <div
        style={{
          opacity: priceIn,
          transform: `translateY(${(1 - priceIn) * 14}px)`,
          marginTop: 18,
          background: palette.soil,
          color: palette.parchment,
          padding: "16px 36px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 18,
          position: "relative",
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 30,
            fontWeight: 500,
          }}
        >
          $9
        </span>
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            fontStyle: "italic",
            letterSpacing: "0.1em",
            opacity: 0.85,
          }}
        >
          a month · no setup · no contracts
        </span>
      </div>
    </AbsoluteFill>
  );
};
