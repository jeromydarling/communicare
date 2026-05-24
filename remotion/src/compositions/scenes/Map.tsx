import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";

// Sample farm pins — same coords as lib/sample-farms.ts plus a sprinkle
// of fictional ones so the map fills out across the country.
const PINS: { lng: number; lat: number; appearAt: number }[] = [
  { lng: -82.0834, lat: 39.3292, appearAt: 0 }, // Elmwood OH
  { lng: -105.8231, lat: 39.2247, appearAt: 15 }, // Three Forks CO
  { lng: -87.5495, lat: 35.5520, appearAt: 30 }, // Low Creek TN
  { lng: -122.8164, lat: 38.4021, appearAt: 45 }, // Morning Glory CA
  { lng: -76.7, lat: 40.3, appearAt: 60 },
  { lng: -98.7, lat: 31.6, appearAt: 70 },
  { lng: -90.4, lat: 41.5, appearAt: 80 },
  { lng: -71.8, lat: 42.4, appearAt: 90 },
  { lng: -84.1, lat: 30.4, appearAt: 100 },
  { lng: -118.2, lat: 34.0, appearAt: 110 },
  { lng: -111.6, lat: 40.7, appearAt: 120 },
  { lng: -86.2, lat: 39.7, appearAt: 130 },
];

// Project lng/lat to a 0-100% box for the lower-48 USA. Very approximate.
const LNG_MIN = -125;
const LNG_MAX = -66;
const LAT_MIN = 25;
const LAT_MAX = 50;

export const Map: React.FC = () => {
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
        padding: 80,
      }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: portrait ? 18 : 22,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: palette.brick,
          marginBottom: 30,
        }}
      >
        № 03 · The discovery map
      </div>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: portrait ? 56 : 76,
          fontWeight: 500,
          lineHeight: 1.05,
          margin: "0 0 50px",
          textAlign: "center",
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        A real farm,
        <br />
        within driving distance.
      </h2>

      <div
        style={{
          position: "relative",
          width: portrait ? "92%" : "70%",
          aspectRatio: "16/9",
          background: palette.parchment,
          borderRadius: 12,
          border: `1px solid rgba(45,31,18,0.12)`,
          overflow: "hidden",
        }}
      >
        {/* Faux land mass — single rounded shape */}
        <svg
          viewBox="0 0 1000 600"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <path
            d="M 80 350 C 80 200, 250 130, 400 145 C 540 100, 700 105, 820 175 C 920 220, 935 380, 850 480 C 700 540, 500 530, 320 510 C 180 500, 90 460, 80 350 Z"
            fill={palette.cream2}
            stroke={palette.soil}
            strokeOpacity="0.18"
            strokeWidth="2"
          />
        </svg>

        {PINS.map((pin, i) => {
          const localFrame = frame - pin.appearAt;
          if (localFrame < 0) return null;
          const animation = spring({
            frame: localFrame,
            fps,
            config: { damping: 12 },
          });
          const x = ((pin.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
          const y = ((LAT_MAX - pin.lat) / (LAT_MAX - LAT_MIN)) * 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -100%) scale(${animation})`,
                width: 28,
                height: 28,
                background: palette.brick,
                borderRadius: "50% 50% 50% 0",
                border: `2px solid ${palette.parchment}`,
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                rotate: "-45deg",
              }}
            />
          );
        })}
      </div>

      <p
        style={{
          fontFamily: fonts.body,
          fontStyle: "italic",
          fontSize: portrait ? 22 : 26,
          color: "rgba(45,31,18,0.65)",
          marginTop: 36,
          opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Every published farm. Live. Tap a pin to subscribe.
      </p>
    </AbsoluteFill>
  );
};
