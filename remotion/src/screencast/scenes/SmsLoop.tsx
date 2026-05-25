import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame, BrowserFrame } from "../frames";

// 20s — the killer feature. Phone on the left runs the member SMS thread.
// Roster on the right updates as the texts come in. Three messages, three
// roster updates.

const MESSAGES: Array<{
  from: "them" | "me";
  text: string;
  at: number; // frame relative to scene start
}> = [
  {
    from: "them",
    text: "Hey Linda — kale, chard, eggs, half-gallon milk in your Tuesday share. Reply SWAP, SKIP, or DONATE.",
    at: 60,
  },
  { from: "me", text: "skip 2", at: 220 },
  {
    from: "them",
    text: "Done. Skipped May 27 and June 3. Account credited $72. Back on the roster after that.",
    at: 320,
  },
];

export const SmsLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18 },
  });
  const browserIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20 },
  });

  // Roster Linda row flips to "PAUSED — 2 WEEKS" at frame 280
  const PAUSED_AT = 280;
  const pausedHilite = spring({
    frame: frame - PAUSED_AT,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.parchment,
      }}
    >
      {/* Caption strip at the top */}
      <div
        style={{
          textAlign: "center",
          paddingTop: 48,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * -12}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 18,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 8,
          }}
        >
          № 03 · Monday morning
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 60,
            fontWeight: 500,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            margin: 0,
            color: palette.soil,
          }}
        >
          Members swap. Skip. Donate.{" "}
          <em style={{ color: palette.brick }}>By texting back.</em>
        </h2>
      </div>

      {/* Phone + Browser side by side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
          padding: "20px 80px 60px",
        }}
      >
        {/* Phone with SMS */}
        <div
          style={{
            opacity: phoneIn,
            transform: `translateX(${(1 - phoneIn) * -60}px)`,
          }}
        >
          <PhoneFrame width={400}>
            <div
              style={{
                background: palette.cream,
                borderBottom: `1px solid ${palette.outlineSoft}`,
                padding: "16px 22px 12px",
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
                  fontSize: 12,
                  color: `${palette.soil}66`,
                  marginTop: 2,
                }}
              >
                +1 720 555 0140
              </div>
            </div>
            <div
              style={{
                padding: "16px 14px",
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
                      transform: `translateY(${(1 - reveal) * 14}px)`,
                      alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                      maxWidth: "82%",
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
        </div>

        {/* Browser with roster */}
        <div
          style={{
            opacity: browserIn,
            transform: `translateX(${(1 - browserIn) * 60}px)`,
          }}
        >
          <BrowserFrame
            url="communicare.farm/farmer/roster"
            width={760}
            height={500}
          >
            <div style={{ padding: 28 }}>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: palette.brick,
                  marginBottom: 8,
                }}
              >
                Tuesday's pickup roster
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 32,
                  fontWeight: 500,
                  color: palette.soil,
                  letterSpacing: "-0.015em",
                  marginBottom: 20,
                }}
              >
                Four shares, three pickup sites.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <RosterRow
                  name="Linda Olsen"
                  share="1/30"
                  pickup="Saturday — the dairy"
                  status={pausedHilite > 0.5 ? "paused" : "active"}
                  hiliteScale={pausedHilite}
                />
                <RosterRow
                  name="Tomás Reyes"
                  share="2/30"
                  pickup="Saturday — the dairy"
                  status="active"
                />
                <RosterRow
                  name="Esther Whitmore"
                  share="1/30"
                  pickup="Wednesday — Bailey library"
                  status="active"
                />
                <RosterRow
                  name="Caleb Anderson"
                  share="1/30"
                  pickup="Saturday — the dairy"
                  status="active"
                />
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RosterRow: React.FC<{
  name: string;
  share: string;
  pickup: string;
  status: "active" | "paused";
  hiliteScale?: number;
}> = ({ name, share, pickup, status, hiliteScale = 0 }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background:
          status === "paused"
            ? `${palette.wheat}22`
            : palette.parchment,
        border: `1px solid ${
          status === "paused" ? palette.wheat : palette.outlineSoft
        }`,
        borderRadius: 10,
        transition: "all 200ms",
        transform: status === "paused" ? `scale(${1 + hiliteScale * 0.02})` : "scale(1)",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            fontWeight: 500,
            color: palette.soil,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: `${palette.soil}66`,
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          {share} share · {pickup}
        </div>
      </div>
      <div>
        {status === "paused" ? (
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: palette.wheat,
              color: palette.wheatDark,
              borderRadius: 999,
              padding: "4px 12px",
              fontWeight: 600,
            }}
          >
            Paused · 2 wks
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: palette.mossDark,
              fontFamily: fonts.body,
            }}
          >
            On the roster
          </span>
        )}
      </div>
    </div>
  );
};
