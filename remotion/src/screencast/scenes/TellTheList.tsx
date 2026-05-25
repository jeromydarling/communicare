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
// Scene 4 — Tell the list (12s)
// =============================================================================
// No browser frame — the message card IS the scene. Send button pulses,
// then a giant counter (1 of 8 → 8 of 8) animates as replies arrive. Each
// new claim flashes a brief +1 particle that floats up.
// =============================================================================

const REPLIES = [
  { name: "Esther", at: 120 },
  { name: "Caleb", at: 135 },
  { name: "Tomás", at: 150 },
  { name: "Jana", at: 170 },
  { name: "Linda", at: 195 },
  { name: "Marcus", at: 220 },
  { name: "Hannah", at: 250 },
  { name: "Frances", at: 290 },
];

export const TellTheList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const cardIn = spring({ frame: frame - 20, fps, config: { damping: 18 } });

  const SEND_AT = 100;
  const sendPulse = spring({
    frame: frame - SEND_AT,
    fps,
    config: { damping: 10, stiffness: 220 },
  });
  const sent = frame > SEND_AT + 12;

  const arrived = REPLIES.filter((r) => frame >= r.at).length;
  const counter = Math.min(arrived, 8);

  // +1 particle on the most recent claim
  const lastReply = REPLIES.slice(0, counter).pop();
  const particleAge = lastReply ? frame - lastReply.at : 999;
  const particleVisible = particleAge >= 0 && particleAge < 40;
  const particleY = interpolate(particleAge, [0, 40], [0, -80]);
  const particleOpacity = interpolate(particleAge, [0, 10, 30, 40], [0, 1, 1, 0]);

  return (
    <AbsoluteFill>
      <SceneBackground accent={palette.wheat} />

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
          № 04 · A surprise wheel of cheddar
        </div>

        <h2
          style={{
            opacity: title,
            transform: `translateY(${(1 - title) * 18}px)`,
            fontFamily: fonts.display,
            fontSize: 104,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: palette.soil,
            textAlign: "center",
            margin: 0,
            marginBottom: 36,
          }}
        >
          Tap once.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            Tell the list.
          </em>
        </h2>

        <div
          style={{
            display: "flex",
            gap: 50,
            alignItems: "flex-start",
            opacity: cardIn,
            transform: `translateY(${(1 - cardIn) * 30}px)`,
          }}
        >
          {/* The message card — looks like the broadcast modal */}
          <div
            style={{
              width: 640,
              background: palette.parchment,
              border: `1px solid ${palette.outlineSoft}`,
              borderRadius: 18,
              padding: 32,
              boxShadow: "0 40px 70px -20px rgba(26,20,16,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 10,
              }}
            >
              Tell the share list
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 36,
                fontWeight: 500,
                lineHeight: 1.05,
                color: palette.soil,
                marginBottom: 16,
              }}
            >
              Aged cheddar wheel
            </div>
            <div
              style={{
                background: `${palette.cream2}55`,
                border: `1px solid ${palette.outlineSoft}`,
                borderRadius: 12,
                padding: 18,
                fontFamily: fonts.body,
                fontSize: 18,
                lineHeight: 1.5,
                color: palette.soil,
              }}
            >
              Aged cheddar wheel just came in — 8 wheels at $24 a wheel.
              Reply CHEDDAR to claim one. First come, first served.
            </div>

            <div
              style={{
                marginTop: 24,
                background: sent ? palette.mossDark : palette.brick,
                color: palette.parchment,
                padding: "16px 28px",
                borderRadius: 999,
                fontFamily: fonts.display,
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textAlign: "center",
                position: "relative",
                boxShadow:
                  sendPulse > 0 && sendPulse < 2
                    ? `0 0 0 ${sendPulse * 18}px ${palette.brick}22`
                    : "none",
                transition: "background 0.2s",
              }}
            >
              {sent ? "Sent to 38 ✓" : "Send to 38 →"}
            </div>
          </div>

          {/* The counter — dominant element, gets every eye */}
          <div
            style={{
              position: "relative",
              minWidth: 360,
              paddingTop: 20,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 14,
              }}
            >
              Replies
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 200,
                fontWeight: 500,
                lineHeight: 0.9,
                color: palette.soil,
                letterSpacing: "-0.04em",
                position: "relative",
                transform: `scale(${1 + (counter > 0 && frame - (REPLIES[counter - 1]?.at ?? 0) < 8 ? 0.05 : 0)})`,
                transition: "transform 0.1s",
              }}
            >
              {counter}
              <span
                style={{
                  fontSize: 56,
                  color: `${palette.soil}55`,
                  marginLeft: 16,
                }}
              >
                of 8
              </span>

              {particleVisible && (
                <span
                  style={{
                    position: "absolute",
                    right: -50,
                    top: 0,
                    fontSize: 40,
                    fontFamily: fonts.display,
                    color: palette.mossDark,
                    transform: `translateY(${particleY}px)`,
                    opacity: particleOpacity,
                  }}
                >
                  +1
                </span>
              )}
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: fonts.body,
                fontSize: 18,
                fontStyle: "italic",
                color: `${palette.soil}88`,
              }}
            >
              {lastReply
                ? `${lastReply.name} just claimed one.`
                : "Waiting on the share list…"}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
