import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";
import { SplitLayout } from "../SplitLayout";

// Scene 9 — Directory. Text left, phone with map right.
// ZIP types in fast, pins drop with bounce, focus pin ripples,
// "Send a note" slides up from the bottom of the phone.

const PINS = [
  { x: 22, y: 38, at: 50, focus: false },
  { x: 38, y: 26, at: 65, focus: false },
  { x: 50, y: 50, at: 80, focus: true },
  { x: 64, y: 28, at: 95, focus: false },
  { x: 76, y: 54, at: 110, focus: false },
];

const ZIP = "80440";

export const Directory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typed = Math.max(0, Math.min(ZIP.length, Math.floor((frame - 20) / 3)));
  const visibleZip = ZIP.slice(0, typed);
  const typing = frame < 20 + ZIP.length * 3 + 8;

  const NOTE_AT = 180;
  const noteIn = spring({
    frame: frame - NOTE_AT,
    fps,
    config: { damping: 16 },
  });

  const SENT_AT = 270;
  const sent = frame > SENT_AT;

  const focusPulse = spring({
    frame: frame - 120,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <SplitLayout
      number="№ 09"
      category="A neighbor in your zip code"
      accent={palette.moss}
      title={
        <>
          Neighbors find you.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            You wake up to a new member.
          </em>
        </>
      }
      lede="Every small farm we know about is listed — whether they're on Communicare or not. The directory is a gift. You keep the relationship."
    >
      <PhoneFrame width={400}>
        <div
          style={{
            padding: "14px 18px 12px",
            background: palette.cream,
            borderBottom: `1px solid ${palette.outlineSoft}`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 10,
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
              fontSize: 18,
              fontWeight: 500,
              color: palette.soil,
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
              fontSize: 22,
              color: palette.soil,
              letterSpacing: "0.05em",
            }}
          >
            {visibleZip}
            {typing && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 20,
                  background: palette.brick,
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  opacity: Math.floor(frame / 8) % 2 ? 1 : 0,
                }}
              />
            )}
          </div>
        </div>

        {/* Map area */}
        <div
          style={{
            position: "relative",
            flex: 1,
            background: `
              radial-gradient(circle at 25% 35%, ${palette.wheat}25 0%, transparent 50%),
              radial-gradient(circle at 75% 60%, ${palette.brick}1A 0%, transparent 55%),
              ${palette.cream2}
            `,
            overflow: "hidden",
            minHeight: 360,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 400 360" style={{ position: "absolute", inset: 0 }}>
            <path
              d="M 40 200 C 40 110, 130 75, 220 95 C 300 70, 360 110, 370 200 C 370 290, 280 320, 200 305 C 110 320, 40 280, 40 200 Z"
              fill={palette.parchment}
              fillOpacity={0.55}
              stroke={palette.outline}
              strokeOpacity={0.12}
              strokeWidth={1.5}
            />
            <path
              d="M 60 220 C 140 200, 200 240, 280 210 C 320 200, 340 220, 360 210"
              stroke={palette.moss}
              strokeOpacity={0.35}
              strokeWidth={2}
              fill="none"
              strokeDasharray="2 6"
            />
          </svg>

          {PINS.map((p, i) => {
            const drop = spring({
              frame: frame - p.at,
              fps,
              config: { damping: 9, stiffness: 110 },
            });
            if (drop <= 0) return null;
            const focusScale = p.focus && frame > 120 ? 1 + focusPulse * 0.3 : 1;
            const ripple = p.focus
              ? interpolate(frame, [130, 200], [0, 4], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: `translate(-50%, -100%) scale(${drop * focusScale})`,
                }}
              >
                {ripple > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "100%",
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: `2px solid ${palette.brick}`,
                      transform: `translate(-50%, -50%) scale(${ripple})`,
                      opacity: Math.max(0, 1 - ripple / 4),
                    }}
                  />
                )}
                <div
                  style={{
                    width: p.focus ? 26 : 20,
                    height: p.focus ? 26 : 20,
                    background: p.focus ? palette.brick : palette.brickDark,
                    border: `2px solid ${palette.parchment}`,
                    borderRadius: "50% 50% 50% 0",
                    transform: "rotate(-45deg)",
                    boxShadow: p.focus
                      ? `0 4px 12px ${palette.brick}66`
                      : "0 3px 6px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            );
          })}

          {/* Note sheet rises from the bottom */}
          {noteIn > 0.01 && (
            <div
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                bottom: 14 + (1 - noteIn) * 80,
                opacity: noteIn,
                background: palette.parchment,
                border: `1px solid ${palette.outlineSoft}`,
                borderRadius: 12,
                padding: 14,
                boxShadow: "0 20px 30px -10px rgba(26,20,16,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: palette.brick,
                  marginBottom: 3,
                }}
              >
                Discovered
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 16,
                  fontWeight: 500,
                  color: palette.soil,
                  marginBottom: 4,
                }}
              >
                Three Forks Dairy
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontStyle: "italic",
                  color: `${palette.soil}77`,
                  marginBottom: 8,
                }}
              >
                Park County, CO · Raw milk herd share
              </div>
              <div
                style={{
                  textAlign: "center",
                  background: sent ? palette.mossDark : palette.brick,
                  color: palette.parchment,
                  fontFamily: fonts.display,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "8px 12px",
                  borderRadius: 999,
                }}
              >
                {sent ? "Sent ✓" : "Send them a note →"}
              </div>
            </div>
          )}
        </div>
      </PhoneFrame>
    </SplitLayout>
  );
};
