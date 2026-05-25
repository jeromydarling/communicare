import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { SplitLayout } from "../SplitLayout";

// Scene 5 — Tell the list. Text left, broadcast card + giant counter right.
// Send button pulses, replies stream IN FROM THE RIGHT one by one as the
// counter ticks up.

const REPLIES = [
  { name: "Esther", at: 75 },
  { name: "Caleb", at: 90 },
  { name: "Tomás", at: 105 },
  { name: "Jana", at: 125 },
  { name: "Linda", at: 150 },
  { name: "Marcus", at: 175 },
  { name: "Hannah", at: 205 },
  { name: "Frances", at: 245 },
];

export const TellTheList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SEND_AT = 60;
  const sendPulse = spring({
    frame: frame - SEND_AT,
    fps,
    config: { damping: 10, stiffness: 220 },
  });
  const sent = frame > SEND_AT + 10;

  const arrived = REPLIES.filter((r) => frame >= r.at).length;
  const counter = Math.min(arrived, 8);

  return (
    <SplitLayout
      number="№ 05"
      category="A surprise wheel of cheddar"
      accent={palette.wheat}
      title={
        <>
          Tap once.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            Tell the list.
          </em>
        </>
      }
      lede="Eight in stock. First eight to reply win one. The rest get on the alert list for next time."
      titleSize={88}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Broadcast card */}
        <div
          style={{
            width: 540,
            background: palette.parchment,
            border: `1px solid ${palette.outlineSoft}`,
            borderRadius: 16,
            padding: 26,
            boxShadow: "0 30px 60px -20px rgba(26,20,16,0.3)",
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: palette.brick,
              marginBottom: 8,
            }}
          >
            Tell the share list
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 30,
              fontWeight: 500,
              lineHeight: 1.05,
              color: palette.soil,
              marginBottom: 12,
            }}
          >
            Aged cheddar wheel
          </div>
          <div
            style={{
              background: `${palette.cream2}55`,
              border: `1px solid ${palette.outlineSoft}`,
              borderRadius: 10,
              padding: 14,
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 1.5,
              color: palette.soil,
            }}
          >
            Aged cheddar wheel just came in — 8 wheels at $24 a wheel. Reply
            CHEDDAR to claim one. First come, first served.
          </div>
          <div
            style={{
              marginTop: 18,
              background: sent ? palette.mossDark : palette.brick,
              color: palette.parchment,
              padding: "12px 22px",
              borderRadius: 999,
              fontFamily: fonts.display,
              fontSize: 14,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textAlign: "center",
              boxShadow:
                sendPulse > 0 && sendPulse < 2
                  ? `0 0 0 ${sendPulse * 20}px ${palette.brick}33`
                  : "none",
              transition: "background 0.2s",
            }}
          >
            {sent ? "Sent to 38 ✓" : "Send to 38 →"}
          </div>
        </div>

        {/* Counter + recent replies */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 28,
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
              Claimed
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 130,
                fontWeight: 500,
                lineHeight: 0.9,
                color: palette.soil,
                letterSpacing: "-0.04em",
                transform: `scale(${1 + (counter > 0 && frame - (REPLIES[counter - 1]?.at ?? 0) < 6 ? 0.08 : 0)})`,
                transition: "transform 0.08s",
                transformOrigin: "left bottom",
              }}
            >
              {counter}
              <span
                style={{
                  fontSize: 40,
                  color: `${palette.soil}55`,
                  marginLeft: 10,
                }}
              >
                of 8
              </span>
            </div>
          </div>

          {/* Replies slide in FROM THE RIGHT */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
              minWidth: 200,
            }}
          >
            {REPLIES.slice(0, counter)
              .slice(-4)
              .map((r) => {
                const slide = spring({
                  frame: frame - r.at,
                  fps,
                  config: { damping: 16 },
                });
                return (
                  <div
                    key={r.name}
                    style={{
                      opacity: slide,
                      transform: `translateX(${(1 - slide) * 60}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: fonts.body,
                      fontSize: 16,
                      color: palette.soil,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: palette.mossDark,
                      }}
                    />
                    <strong style={{ fontWeight: 600 }}>{r.name}</strong>
                    <span style={{ fontStyle: "italic", color: `${palette.soil}66` }}>
                      claimed one
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </SplitLayout>
  );
};
