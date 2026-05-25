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
// Scene 5 — The directory (12s)
// =============================================================================
// Giant map fills the frame. ZIP types into a big input at top. Five pins
// drop with bounce + ripple. Focus pin scales up, ripple expands outward.
// "Send them a note" card slides in at the bottom.
// =============================================================================

// Pin positions (% of map area)
const PINS = [
  { x: 22, y: 35, at: 60, focus: false },
  { x: 38, y: 24, at: 75, focus: false },
  { x: 50, y: 48, at: 90, focus: true },
  { x: 62, y: 28, at: 105, focus: false },
  { x: 76, y: 52, at: 120, focus: false },
];

const ZIP = "80440";

export const Directory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const inputIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });

  // ZIP letters type fast — one per 3 frames starting at f=22
  const typed = Math.max(0, Math.min(ZIP.length, Math.floor((frame - 22) / 3)));
  const visibleZip = ZIP.slice(0, typed);
  const typing = frame < 22 + ZIP.length * 3 + 10;

  // Map slides in after the ZIP is typed
  const mapIn = spring({
    frame: frame - 40,
    fps,
    config: { damping: 18 },
  });

  const NOTE_AT = 200;
  const noteIn = spring({
    frame: frame - NOTE_AT,
    fps,
    config: { damping: 16 },
  });

  const SENT_AT = 290;
  const sent = frame > SENT_AT;

  // Focus pin grows after all pins are placed
  const focusPulse = spring({
    frame: frame - 140,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <AbsoluteFill>
      <SceneBackground accent={palette.moss} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "50px 80px",
        }}
      >
        <div
          style={{
            opacity: eyebrow,
            transform: `translateY(${(1 - eyebrow) * 14}px)`,
            fontFamily: fonts.body,
            fontSize: 24,
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
            opacity: title,
            transform: `translateY(${(1 - title) * 18}px)`,
            fontFamily: fonts.display,
            fontSize: 96,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: palette.soil,
            textAlign: "center",
            margin: 0,
            marginBottom: 28,
          }}
        >
          A neighbor finds you.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            You wake up to a new member.
          </em>
        </h2>

        {/* Big ZIP input */}
        <div
          style={{
            opacity: inputIn,
            transform: `translateY(${(1 - inputIn) * 16}px)`,
            background: palette.parchment,
            border: `2px solid ${palette.outlineSoft}`,
            borderRadius: 16,
            padding: "20px 32px",
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginBottom: 30,
            boxShadow: "0 16px 32px -10px rgba(26,20,16,0.15)",
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: `${palette.soil}88`,
            }}
          >
            Within 20 miles of
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 56,
              color: palette.soil,
              letterSpacing: "0.06em",
              fontWeight: 500,
            }}
          >
            {visibleZip}
            {typing && (
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: 56,
                  background: palette.brick,
                  marginLeft: 4,
                  verticalAlign: "middle",
                  opacity: Math.floor(frame / 10) % 2 ? 1 : 0,
                }}
              />
            )}
          </span>
        </div>

        {/* The map */}
        <div
          style={{
            position: "relative",
            width: 1100,
            height: 400,
            opacity: mapIn,
            transform: `scale(${0.95 + mapIn * 0.05})`,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1100 400"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <radialGradient id="dir-wash" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor={palette.cream2} stopOpacity="0.9" />
                <stop offset="100%" stopColor={palette.parchment} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1100" height="400" fill="url(#dir-wash)" />
            {/* Land mass blob */}
            <path
              d="M 80 220 C 80 120, 240 80, 400 100 C 580 70, 800 90, 960 160 C 1040 200, 1060 320, 980 360 C 800 380, 550 380, 320 360 C 160 360, 60 320, 80 220 Z"
              fill={palette.parchment}
              fillOpacity={0.7}
              stroke={palette.outline}
              strokeOpacity={0.18}
              strokeWidth={2}
            />
            {/* River */}
            <path
              d="M 100 240 C 280 220, 420 260, 580 230 C 720 210, 880 250, 1020 230"
              stroke={palette.moss}
              strokeOpacity={0.4}
              strokeWidth={3}
              fill="none"
              strokeDasharray="3 8"
            />
          </svg>

          {/* Pins drop with bounce */}
          {PINS.map((p, i) => {
            const drop = spring({
              frame: frame - p.at,
              fps,
              config: { damping: 9, stiffness: 110 },
            });
            if (drop <= 0) return null;
            const focusScale =
              p.focus && frame > 140 ? 1 + focusPulse * 0.4 : 1;
            const focusGlow = p.focus && frame > 140 ? focusPulse : 0;
            // Ripple under focus pin
            const ripple1 = p.focus
              ? interpolate(frame, [150, 220], [0, 5], {
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
                {focusGlow > 0 && ripple1 > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "100%",
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      border: `3px solid ${palette.brick}`,
                      transform: `translate(-50%, -50%) scale(${ripple1})`,
                      opacity: Math.max(0, 1 - ripple1 / 5),
                    }}
                  />
                )}
                <div
                  style={{
                    width: p.focus ? 44 : 32,
                    height: p.focus ? 44 : 32,
                    background: p.focus ? palette.brick : palette.brickDark,
                    border: `3px solid ${palette.parchment}`,
                    borderRadius: "50% 50% 50% 0",
                    transform: "rotate(-45deg)",
                    boxShadow: p.focus
                      ? `0 6px 16px ${palette.brick}66`
                      : "0 4px 8px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Send-them-a-note sheet slides up at the bottom */}
        {noteIn > 0.01 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 50,
              transform: `translateX(-50%) translateY(${(1 - noteIn) * 60}px)`,
              opacity: noteIn,
              background: palette.parchment,
              border: `2px solid ${palette.outlineSoft}`,
              borderRadius: 18,
              padding: "20px 32px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              boxShadow: "0 24px 50px -10px rgba(26,20,16,0.3)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: palette.brick,
                  marginBottom: 4,
                }}
              >
                Three Forks Dairy · Discovered
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 24,
                  fontWeight: 500,
                  color: palette.soil,
                }}
              >
                Park County, CO · Herd share
              </div>
            </div>
            <div
              style={{
                background: sent ? palette.mossDark : palette.brick,
                color: palette.parchment,
                fontFamily: fonts.display,
                fontSize: 16,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "14px 24px",
                borderRadius: 999,
                transition: "background 0.2s",
              }}
            >
              {sent ? "Sent ✓" : "Send them a note →"}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
