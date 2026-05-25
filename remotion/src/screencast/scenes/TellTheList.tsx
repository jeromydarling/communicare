import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { BrowserFrame } from "../frames";

// 15s — "Tell the list" broadcast. We open the modal on a cheddar wheel
// drop, hit send, watch replies stream in with a counter.

const REPLIES = [
  { name: "Esther", at: 130 },
  { name: "Caleb", at: 145 },
  { name: "Tomás", at: 160 },
  { name: "Jana", at: 180 },
  { name: "Linda", at: 200 },
  { name: "Marcus", at: 230 },
  { name: "Hannah", at: 260 },
  { name: "Frances", at: 300 },
];

export const TellTheList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionIn = spring({ frame, fps, config: { damping: 18 } });
  const browserIn = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18 },
  });
  // Modal fades open at 30, send pressed at 100, replies start flowing at 130
  const modalIn = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const SEND_AT = 100;
  const sendPulse = spring({
    frame: frame - SEND_AT,
    fps,
    config: { damping: 12, stiffness: 220 },
  });

  // How many replies have arrived by this frame
  const arrived = REPLIES.filter((r) => frame >= r.at).length;
  const counter = Math.min(arrived, 8);

  return (
    <AbsoluteFill style={{ background: palette.parchment }}>
      <div
        style={{
          textAlign: "center",
          paddingTop: 56,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * -10}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 20,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 10,
          }}
        >
          № 04 · A surprise wheel of cheddar
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            margin: 0,
            color: palette.soil,
          }}
        >
          Tap once. <em style={{ color: palette.brick }}>Tell the list.</em>
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 80px",
          opacity: browserIn,
          transform: `scale(${0.96 + browserIn * 0.04})`,
        }}
      >
        <BrowserFrame
          url="communicare.farm/farmer/inventory"
          width={1280}
          height={560}
        >
          <div style={{ position: "relative", padding: 36 }}>
            {/* Background — three product cards, the cheddar in the middle */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                filter: modalIn > 0.1 ? "blur(2px) brightness(0.94)" : "none",
                transition: "filter 200ms",
              }}
            >
              <SmallProductCard name="Pastured eggs" sub="40 left" />
              <SmallProductCard
                name="Aged cheddar wheel"
                sub="8 in stock · limited"
                highlight
              />
              <SmallProductCard name="Raw cream" sub="6 left" />
            </div>

            {/* Broadcast modal */}
            {modalIn > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `${palette.soil}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: modalIn,
                }}
              >
                <div
                  style={{
                    width: 600,
                    background: palette.parchment,
                    border: `1px solid ${palette.outlineSoft}`,
                    borderRadius: 14,
                    padding: 30,
                    boxShadow:
                      "0 40px 80px -10px rgba(26,20,16,0.4)",
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
                    Tell the share list
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 28,
                      fontWeight: 500,
                      color: palette.soil,
                      marginBottom: 6,
                    }}
                  >
                    Aged cheddar wheel
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontStyle: "italic",
                      fontSize: 13,
                      color: `${palette.soil}88`,
                      marginBottom: 16,
                    }}
                  >
                    This will text every active shareholder. Once.
                  </div>
                  <div
                    style={{
                      background: `${palette.cream2}55`,
                      border: `1px solid ${palette.outlineSoft}`,
                      borderRadius: 10,
                      padding: 16,
                      fontFamily: fonts.body,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: palette.soil,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: `${palette.soil}55`,
                        marginBottom: 6,
                      }}
                    >
                      Message preview
                    </div>
                    Aged cheddar wheel just came in — 8 wheels at $24 a wheel.
                    Reply CHEDDAR to claim one. First come, first served.
                  </div>
                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: `${palette.soil}55`,
                        }}
                      >
                        Recipients
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontSize: 20,
                          color: palette.soil,
                        }}
                      >
                        38 shareholders
                      </div>
                    </div>
                    <div
                      style={{
                        background: palette.brick,
                        color: palette.parchment,
                        padding: "12px 22px",
                        borderRadius: 999,
                        fontFamily: fonts.display,
                        fontSize: 14,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        position: "relative",
                        boxShadow:
                          sendPulse > 0
                            ? `0 0 0 ${sendPulse * 14}px ${palette.brick}22`
                            : "none",
                      }}
                    >
                      Send to 38 →
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Replies stream — appears after send */}
            {frame > SEND_AT + 20 && (
              <div
                style={{
                  position: "absolute",
                  right: 36,
                  top: 36,
                  width: 280,
                  background: palette.parchment,
                  border: `1px solid ${palette.outlineSoft}`,
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: "0 20px 40px -10px rgba(26,20,16,0.18)",
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
                  Replies — first come, first served
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 36,
                    fontWeight: 500,
                    color: palette.soil,
                    lineHeight: 1,
                  }}
                >
                  {counter} <span style={{ color: `${palette.soil}55`, fontSize: 24 }}>of 8</span>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {REPLIES.slice(0, counter).map((r, i) => {
                    const enter = spring({
                      frame: frame - r.at,
                      fps,
                      config: { damping: 16 },
                    });
                    return (
                      <div
                        key={i}
                        style={{
                          opacity: enter,
                          transform: `translateX(${(1 - enter) * 12}px)`,
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color: palette.soil,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
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
            )}
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

const SmallProductCard: React.FC<{
  name: string;
  sub: string;
  highlight?: boolean;
}> = ({ name, sub, highlight }) => {
  return (
    <div
      style={{
        background: highlight ? `${palette.wheat}15` : palette.parchment,
        border: `1px solid ${highlight ? palette.wheat : palette.outlineSoft}`,
        borderRadius: 12,
        padding: 18,
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
        {name}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: `${palette.soil}66`,
          fontStyle: "italic",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
};
