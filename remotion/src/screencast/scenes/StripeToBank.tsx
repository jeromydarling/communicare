import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { SplitLayout } from "../SplitLayout";

// Scene 8 — Money flow. Answers the #1 question every farmer asks:
// "where does the money actually go?" Member → Stripe → Farm bank.
// Coin animates along the path. We're NOT in the middle.

export const StripeToBank: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Three boxes appear in sequence (left to right) then a coin slides along
  const boxLeft = spring({ frame, fps, config: { damping: 18 } });
  const boxMid = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const boxRight = spring({ frame: frame - 24, fps, config: { damping: 18 } });

  // Coin slides at frame 60, takes 100 frames to traverse
  const coinPos = interpolate(frame, [60, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse on the bank when the coin lands
  const bankPulse =
    frame > 158 && frame < 175 ? 1 + (175 - frame) * 0.01 : 1;

  // Big stamp arrives at the end
  const stampIn = spring({
    frame: frame - 180,
    fps,
    config: { damping: 13, stiffness: 200 },
  });

  // Box dimensions for coin path math
  const BOX_W = 150;
  const TOTAL_W = 540;
  const arrowSpan = (TOTAL_W - BOX_W * 3) / 2; // gap width

  return (
    <SplitLayout
      number="№ 08"
      category="The question every farmer asks"
      title={
        <>
          The money lands{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            in your bank.
          </em>
        </>
      }
      lede="Members pay through your Stripe. We never see it, never hold it, never take a cut. Nine dollars a month is the only thing you pay us."
    >
      <div style={{ width: 540, position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            height: 180,
          }}
        >
          <FlowBox
            label="Member"
            sub="$36 / week"
            color={palette.soil}
            opacity={boxLeft}
            scale={boxLeft}
          />
          <Arrow opacity={boxMid} />
          <FlowBox
            label="Stripe"
            sub="(your account)"
            color={palette.brick}
            opacity={boxMid}
            scale={boxMid}
          />
          <Arrow opacity={boxRight} />
          <FlowBox
            label="Your bank"
            sub="next day"
            color={palette.mossDark}
            opacity={boxRight}
            scale={boxRight * bankPulse}
          />

          {/* Coin slides along the path */}
          {coinPos > 0 && coinPos < 1 && (
            <div
              style={{
                position: "absolute",
                left: `calc(${BOX_W / 2}px + (100% - ${BOX_W}px) * ${coinPos})`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 44,
                height: 44,
                borderRadius: 999,
                background: palette.wheat,
                border: `3px solid ${palette.wheatDark}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.display,
                fontSize: 18,
                fontWeight: 600,
                color: palette.wheatDark,
                boxShadow: `0 8px 20px ${palette.wheat}66`,
              }}
            >
              $
            </div>
          )}
        </div>

        {/* "We never touch it" stamp */}
        {stampIn > 0.01 && (
          <div
            style={{
              marginTop: 32,
              opacity: stampIn,
              transform: `scale(${stampIn})`,
              background: palette.parchment,
              border: `2px dashed ${palette.brick}`,
              borderRadius: 16,
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 48,
                color: palette.brick,
                lineHeight: 1,
              }}
            >
              0%
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  fontWeight: 500,
                  color: palette.soil,
                  lineHeight: 1.15,
                }}
              >
                We never touch the money.
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontStyle: "italic",
                  color: `${palette.soil}88`,
                  marginTop: 3,
                }}
              >
                $9 a month is the only line item from us. Forever.
              </div>
            </div>
          </div>
        )}
      </div>
    </SplitLayout>
  );
};

const FlowBox: React.FC<{
  label: string;
  sub: string;
  color: string;
  opacity: number;
  scale: number;
}> = ({ label, sub, color, opacity, scale }) => (
  <div
    style={{
      width: 150,
      height: 130,
      background: palette.parchment,
      border: `2px solid ${color}`,
      borderRadius: 14,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      opacity,
      transform: `scale(${scale})`,
      boxShadow: `0 12px 24px -10px ${color}44`,
    }}
  >
    <div
      style={{
        fontFamily: fonts.display,
        fontSize: 22,
        fontWeight: 500,
        color,
        textAlign: "center",
        lineHeight: 1.05,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: fonts.body,
        fontSize: 12,
        fontStyle: "italic",
        color: `${palette.soil}88`,
        marginTop: 6,
        textAlign: "center",
      }}
    >
      {sub}
    </div>
  </div>
);

const Arrow: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      flex: 1,
      height: 2,
      background: `${palette.soil}33`,
      position: "relative",
      opacity,
    }}
  >
    <div
      style={{
        position: "absolute",
        right: -2,
        top: -5,
        width: 0,
        height: 0,
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderLeft: `8px solid ${palette.soil}55`,
      }}
    />
  </div>
);
