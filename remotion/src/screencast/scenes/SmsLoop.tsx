import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";
import { SceneBackground } from "../SceneBackground";

// =============================================================================
// Scene 3 — The SMS swap loop (16s)
// =============================================================================
// The big SMS conversation, full screen. After the third message, a
// "ROSTER UPDATED" overlay slides across, showing Linda's row flipping to
// paused — no busy split-screen, one focus at a time.
// =============================================================================

const MESSAGES = [
  {
    from: "them" as const,
    text: "Hey Linda — kale, chard, eggs, half-gallon milk in your Tuesday share. Reply SWAP, SKIP, or DONATE.",
    at: 30,
  },
  { from: "me" as const, text: "skip 2", at: 150 },
  {
    from: "them" as const,
    text: "Done. Skipped May 27 and June 3. Account credited $72.",
    at: 230,
  },
];

export const SmsLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });

  const ROSTER_AT = 330;
  const rosterIn = spring({
    frame: frame - ROSTER_AT,
    fps,
    config: { damping: 16, stiffness: 75 },
  });

  return (
    <AbsoluteFill>
      <SceneBackground />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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
          № 03 · Monday morning
        </div>

        <h2
          style={{
            opacity: title,
            transform: `translateY(${(1 - title) * 18}px)`,
            fontFamily: fonts.display,
            fontSize: 96,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.025em",
            color: palette.soil,
            textAlign: "center",
            margin: 0,
            marginBottom: 36,
          }}
        >
          Swap. Skip. Donate.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            By text.
          </em>
        </h2>

        <div
          style={{
            position: "relative",
            opacity: phoneIn,
            transform: `scale(${0.94 + phoneIn * 0.06})`,
          }}
        >
          <PhoneFrame width={380}>
            <div
              style={{
                background: palette.cream,
                borderBottom: `1px solid ${palette.outlineSoft}`,
                padding: "14px 20px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  fontWeight: 500,
                  color: palette.soil,
                }}
              >
                Three Forks Dairy
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  color: `${palette.soil}66`,
                  marginTop: 2,
                }}
              >
                +1 720 555 0140
              </div>
            </div>
            <div
              style={{
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: palette.parchment,
              }}
            >
              {MESSAGES.map((m, i) => {
                const reveal = spring({
                  frame: frame - m.at,
                  fps,
                  config: { damping: 18 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: reveal,
                      transform: `translateY(${(1 - reveal) * 18}px)`,
                      alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                    }}
                  >
                    <div
                      style={{
                        background:
                          m.from === "me" ? palette.soil : palette.cream2,
                        color:
                          m.from === "me" ? palette.parchment : palette.soil,
                        padding: "10px 14px",
                        borderRadius: 18,
                        borderBottomRightRadius: m.from === "me" ? 4 : 18,
                        borderBottomLeftRadius: m.from === "me" ? 18 : 4,
                        fontFamily: fonts.body,
                        fontSize: 14,
                        lineHeight: 1.35,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </PhoneFrame>

          {/* "ROSTER UPDATED" overlay flies in from the right and pulses,
              proving the SMS thread has live consequences. */}
          {rosterIn > 0.01 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "100%",
                marginLeft: 40,
                transform: `translateY(-50%) translateX(${(1 - rosterIn) * 80}px)`,
                opacity: rosterIn,
                background: palette.parchment,
                border: `2px solid ${palette.wheat}`,
                borderRadius: 16,
                padding: "22px 26px",
                width: 340,
                boxShadow: "0 30px 60px -10px rgba(26,20,16,0.4)",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: palette.brick,
                  marginBottom: 8,
                }}
              >
                Roster · live
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 28,
                  fontWeight: 500,
                  color: palette.soil,
                  lineHeight: 1.1,
                  marginBottom: 12,
                }}
              >
                Linda Olsen
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: palette.wheat,
                  color: palette.wheatDark,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Paused · 2 weeks
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: `${palette.soil}88`,
                }}
              >
                $72 credited · back May 17
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
