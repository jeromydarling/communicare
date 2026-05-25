import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";
import { SplitLayout } from "../SplitLayout";

// Scene 3 — SMS swap. Text left, phone right. After the conversation
// completes, a small "Roster · live" card slides in from the right
// behind the phone showing Linda's paused row.

const MESSAGES = [
  {
    from: "them" as const,
    text: "Hey Linda — kale, chard, eggs, half-gal milk in Tuesday's share. Reply SWAP, SKIP, or DONATE.",
    at: 25,
  },
  { from: "me" as const, text: "skip 2", at: 110 },
  {
    from: "them" as const,
    text: "Done. Skipped May 27 and June 3. Account credited $72.",
    at: 175,
  },
];

export const SmsLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ROSTER_AT = 250;
  const rosterIn = spring({
    frame: frame - ROSTER_AT,
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  return (
    <SplitLayout
      number="№ 03"
      category="Monday morning"
      title={
        <>
          Swap. Skip. Donate.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            By text.
          </em>
        </>
      }
      lede="Roster updates in real time. No phone calls. No inbox archaeology. Mary keeps her morning."
    >
      <div style={{ position: "relative" }}>
        <PhoneFrame width={360}>
          <div
            style={{
              background: palette.cream,
              borderBottom: `1px solid ${palette.outlineSoft}`,
              padding: "12px 18px 10px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                fontWeight: 500,
                color: palette.soil,
              }}
            >
              Three Forks Dairy
            </div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 10,
                color: `${palette.soil}66`,
                marginTop: 2,
              }}
            >
              +1 720 555 0140
            </div>
          </div>
          <div
            style={{
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: palette.parchment,
            }}
          >
            {MESSAGES.map((m, i) => {
              const reveal = spring({
                frame: frame - m.at,
                fps,
                config: { damping: 18 },
              });
              // Incoming from left, outgoing from right — different motion vectors
              const slideX = m.from === "me" ? 24 : -24;
              return (
                <div
                  key={i}
                  style={{
                    opacity: reveal,
                    transform: `translateX(${(1 - reveal) * slideX}px)`,
                    alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                  }}
                >
                  <div
                    style={{
                      background:
                        m.from === "me" ? palette.soil : palette.cream2,
                      color: m.from === "me" ? palette.parchment : palette.soil,
                      padding: "9px 13px",
                      borderRadius: 16,
                      borderBottomRightRadius: m.from === "me" ? 4 : 16,
                      borderBottomLeftRadius: m.from === "me" ? 16 : 4,
                      fontFamily: fonts.body,
                      fontSize: 13,
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

        {/* Roster card flies in from FURTHER right behind the phone */}
        {rosterIn > 0.01 && (
          <div
            style={{
              position: "absolute",
              top: "55%",
              left: "100%",
              marginLeft: 30,
              transform: `translateY(-50%) translateX(${(1 - rosterIn) * 80}px) rotate(${(1 - rosterIn) * 4}deg)`,
              opacity: rosterIn,
              background: palette.parchment,
              border: `2px solid ${palette.wheat}`,
              borderRadius: 14,
              padding: "18px 22px",
              width: 280,
              boxShadow: "0 24px 50px -10px rgba(26,20,16,0.4)",
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 6,
              }}
            >
              Roster · live
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: 500,
                color: palette.soil,
                lineHeight: 1.1,
                marginBottom: 10,
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
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Paused · 2 weeks
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: fonts.body,
                fontSize: 11,
                fontStyle: "italic",
                color: `${palette.soil}88`,
              }}
            >
              $72 credited · back May 17
            </div>
          </div>
        )}
      </div>
    </SplitLayout>
  );
};
