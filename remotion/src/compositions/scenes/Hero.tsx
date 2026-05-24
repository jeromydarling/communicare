import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { Mark, Ornament } from "../../brand/Logo";

export const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;

  const logoIn = spring({ frame, fps, config: { damping: 16 } });
  const headlineIn = spring({
    frame: frame - 12,
    fps,
    config: { damping: 18 },
  });
  const subIn = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [10, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.parchment,
        color: palette.soil,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: portrait ? "0 80px" : "0 160px",
      }}
    >
      <div style={{ opacity: logoIn, transform: `scale(${logoIn})` }}>
        <Mark size={portrait ? 84 : 96} color={palette.brick} />
      </div>
      <h1
        style={{
          fontFamily: fonts.display,
          fontWeight: 500,
          fontSize: portrait ? 110 : 180,
          lineHeight: 0.95,
          letterSpacing: "-0.025em",
          margin: portrait ? "40px 0 0" : "60px 0 0",
          textAlign: "center",
          opacity: headlineIn,
          transform: `translateY(${(1 - headlineIn) * 30}px)`,
        }}
      >
        For the farms
        <br />
        that feed us.
      </h1>
      <div
        style={{
          marginTop: 40,
          opacity: subIn,
          transform: `translateY(${subY}px)`,
          fontFamily: fonts.body,
          fontSize: portrait ? 30 : 36,
          color: "rgba(38,25,12, 0.65)",
          fontStyle: "italic",
        }}
      >
        and the neighbors who set the table.
      </div>
      <div style={{ marginTop: 60, opacity: subIn }}>
        <Ornament char="❦" />
      </div>
    </AbsoluteFill>
  );
};
