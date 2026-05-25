import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";

// 15s — Member's perspective. ZIP types in. Pins drop onto a warm map.
// One pin scales up, modal opens, "Send them a note" — confirmation.

// Pin positions on the map (% of map width/height)
const PINS = [
  { x: 24, y: 38, at: 90, focus: false },
  { x: 38, y: 28, at: 100, focus: false },
  { x: 50, y: 50, at: 110, focus: true }, // Mary's farm
  { x: 62, y: 32, at: 120, focus: false },
  { x: 75, y: 56, at: 130, focus: false },
];

const ZIP = "80440";

export const Directory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18 },
  });
  // ZIP letters type in one per 4 frames starting at f=30
  const typed = Math.max(0, Math.min(ZIP.length, Math.floor((frame - 30) / 4)));
  const visibleZip = ZIP.slice(0, typed);

  const NOTE_AT = 240;
  const noteIn = spring({
    frame: frame - NOTE_AT,
    fps,
    config: { damping: 18 },
  });

  const CONFIRM_AT = 350;
  const confirmIn = spring({
    frame: frame - CONFIRM_AT,
    fps,
    config: { damping: 16 },
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.parchment,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "0 100px",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          opacity: captionIn,
          transform: `translateX(${(1 - captionIn) * -20}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 20,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 14,
          }}
        >
          № 05 · The discovery map
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 20,
            color: palette.soil,
          }}
        >
          A neighbor in your zip code{" "}
          <em style={{ color: palette.brick }}>finds you.</em>
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 22,
            fontStyle: "italic",
            lineHeight: 1.45,
            color: `${palette.soil}AA`,
            margin: 0,
          }}
        >
          Listed whether you&apos;re on Communicare or not. The directory is
          a gift; you keep the relationship.
        </p>
      </div>

      <div
        style={{
          opacity: phoneIn,
          transform: `translateX(${(1 - phoneIn) * 50}px)`,
        }}
      >
        <PhoneFrame width={420}>
          {/* Header */}
          <div
            style={{
              padding: "16px 22px 14px",
              background: palette.cream,
              borderBottom: `1px solid ${palette.outlineSoft}`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 4,
              }}
            >
              Find a farm share
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                fontWeight: 500,
                color: palette.soil,
                letterSpacing: "-0.01em",
              }}
            >
              Within 20 miles of
            </div>
            <div
              style={{
                marginTop: 8,
                background: palette.parchment,
                border: `1px solid ${palette.outlineSoft}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: fonts.mono,
                fontSize: 18,
                color: palette.soil,
              }}
            >
              {visibleZip}
              {frame < 90 && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 18,
                    background: palette.brick,
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                    opacity: Math.floor(frame / 15) % 2 ? 1 : 0,
                  }}
                />
              )}
            </div>
          </div>

          {/* Map area with pins */}
          <div
            style={{
              position: "relative",
              flex: 1,
              background: `
                radial-gradient(circle at 25% 35%, ${palette.wheat}22 0%, transparent 50%),
                radial-gradient(circle at 75% 60%, ${palette.brick}1A 0%, transparent 55%),
                ${palette.cream2}
              `,
              overflow: "hidden",
              minHeight: 320,
            }}
          >
            {/* Soft "landmass" blob */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 400 380"
              style={{ position: "absolute", inset: 0 }}
            >
              <path
                d="M 40 200 C 40 120, 120 80, 200 90 C 280 70, 340 110, 360 200 C 360 300, 280 320, 200 310 C 120 320, 40 290, 40 200 Z"
                fill={palette.parchment}
                fillOpacity={0.5}
                stroke={palette.outline}
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              {/* Wandering river accent */}
              <path
                d="M 60 220 C 140 200, 200 240, 280 210 C 320 200, 340 220, 360 210"
                stroke={palette.moss}
                strokeOpacity={0.35}
                strokeWidth={2}
                fill="none"
                strokeDasharray="2 6"
              />
            </svg>
            {/* Pins */}
            {PINS.map((p, i) => {
              const drop = spring({
                frame: frame - p.at,
                fps,
                config: { damping: 14, stiffness: 110 },
              });
              if (drop <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%, -100%) scale(${drop * (p.focus && frame > 200 ? 1.2 : 1)})`,
                    opacity: drop,
                  }}
                >
                  <div
                    style={{
                      width: p.focus ? 26 : 22,
                      height: p.focus ? 26 : 22,
                      background: p.focus ? palette.brick : palette.brickDark,
                      border: `2px solid ${palette.parchment}`,
                      borderRadius: "50% 50% 50% 0",
                      transform: "rotate(-45deg)",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.25)",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* "Send them a note" sheet appears */}
          {noteIn > 0.01 && (
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 16 + (1 - noteIn) * 100,
                opacity: noteIn,
                background: palette.parchment,
                border: `1px solid ${palette.outlineSoft}`,
                borderRadius: 14,
                padding: 16,
                boxShadow: "0 20px 30px -10px rgba(26,20,16,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: palette.brick,
                  marginBottom: 4,
                }}
              >
                Discovered
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  fontWeight: 500,
                  color: palette.soil,
                  marginBottom: 6,
                }}
              >
                Three Forks Dairy
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  fontStyle: "italic",
                  color: `${palette.soil}77`,
                  marginBottom: 12,
                }}
              >
                Park County, Colorado · Raw milk herd share
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  background: palette.brick,
                  color: palette.parchment,
                  fontFamily: fonts.display,
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "10px 16px",
                  borderRadius: 999,
                }}
              >
                {confirmIn > 0.3 ? "Sent ✓" : "Send them a note →"}
              </div>
            </div>
          )}
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
