import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";

export const Price: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;

  const priceIn = spring({ frame, fps, config: { damping: 14 } });
  const lineIn = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: "clamp",
  });
  const noteIn = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.soil,
        color: palette.parchment,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 500,
          fontSize: portrait ? 380 : 560,
          lineHeight: 0.8,
          letterSpacing: "-0.04em",
          opacity: priceIn,
          transform: `scale(${0.6 + priceIn * 0.4})`,
        }}
      >
        $9<span style={{ color: palette.wheat }}>.</span>
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: portrait ? 38 : 50,
          marginTop: 30,
          color: "rgba(250, 245, 237, 0.85)",
          opacity: lineIn,
          textAlign: "center",
        }}
      >
        a month. for every farm. forever.
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: portrait ? 22 : 26,
          color: palette.wheat,
          marginTop: 50,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: noteIn,
        }}
      >
        no setup · no contract · no tiers
      </div>
    </AbsoluteFill>
  );
};
