import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { Mark, Ornament } from "../../brand/Logo";

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;

  const logoIn = spring({ frame, fps, config: { damping: 16 } });
  const tagIn = interpolate(frame, [40, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const urlIn = interpolate(frame, [80, 110], [0, 1], {
    extrapolateRight: "clamp",
  });
  const blessingIn = interpolate(frame, [110, 135], [0, 1], {
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
        gap: 40,
        padding: 100,
      }}
    >
      <div style={{ opacity: logoIn, transform: `scale(${logoIn})` }}>
        <Mark size={portrait ? 110 : 130} color={palette.brick} />
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 500,
          fontSize: portrait ? 96 : 130,
          lineHeight: 1,
          letterSpacing: "-0.025em",
          opacity: logoIn,
        }}
      >
        Communicare
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: portrait ? 24 : 30,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(45,31,18,0.6)",
          opacity: tagIn,
          textAlign: "center",
        }}
      >
        for the farms that feed us
      </div>
      <div style={{ marginTop: 20, opacity: urlIn }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: portrait ? 36 : 44,
            color: palette.brick,
          }}
        >
          communicare.farm
        </div>
      </div>
      <div style={{ marginTop: 12, opacity: blessingIn }}>
        <Ornament char="❦ ◊ ❦" />
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: portrait ? 32 : 38,
          color: palette.wheatDark,
          opacity: blessingIn,
          marginTop: 0,
        }}
      >
        Pax tibi.
      </div>
    </AbsoluteFill>
  );
};
