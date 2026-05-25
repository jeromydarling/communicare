import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";

// 15s — Mary's at the market. Taps "Mark sold out" on the eggs row.
// The badge flips and a small SMS notification slides up confirming the
// wait-list got a text. Tap pulse + spring-back gives the "actually tapped"
// feeling.

export const SoldOutTap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18, stiffness: 80 },
  });

  // Tap happens at ~6s into the scene (frame 180)
  const TAP_AT = 180;
  const tapScale = spring({
    frame: frame - TAP_AT,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  // After the tap, the eggs row badge flips
  const flipped = frame > TAP_AT + 8;

  // Wait-list notification slides up at ~9s
  const NOTIFY_AT = 270;
  const notifyIn = spring({
    frame: frame - NOTIFY_AT,
    fps,
    config: { damping: 18 },
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.parchment,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "0 120px",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          opacity: captionIn,
          transform: `translateX(${(1 - captionIn) * -20}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 18,
          }}
        >
          № 02 · The market, eight a.m.
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 88,
            fontWeight: 500,
            lineHeight: 0.98,
            letterSpacing: "-0.025em",
            margin: 0,
            marginBottom: 24,
            color: palette.soil,
          }}
        >
          The eggs are gone.{" "}
          <em style={{ color: palette.brick }}>One tap.</em>
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 26,
            fontStyle: "italic",
            lineHeight: 1.42,
            color: `${palette.soil}B5`,
            margin: 0,
          }}
        >
          The web store updates the same second. Members on the wait list
          get a text.
        </p>
      </div>

      <div
        style={{
          opacity: phoneIn,
          transform: `translateX(${(1 - phoneIn) * 60}px)`,
        }}
      >
        <PhoneFrame width={420}>
          {/* Header */}
          <div
            style={{
              padding: "16px 22px 12px",
              background: palette.cream,
              borderBottom: `1px solid ${palette.outlineSoft}`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 4,
              }}
            >
              Inventory
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 26,
                fontWeight: 500,
                color: palette.soil,
                letterSpacing: "-0.015em",
              }}
            >
              Today's products.
            </div>
          </div>

          {/* Product card — Pastured eggs */}
          <div style={{ padding: 18, position: "relative" }}>
            <ProductRow
              name="Pastured eggs"
              kind="Dozen"
              price="$8.00"
              soldOut={flipped}
              tapScale={tapScale}
            />
            <ProductRow name="Lacinato kale" kind="Bunch" price="$4.00" />
            <ProductRow name="Hakurei turnips" kind="Bunch" price="$3.50" />

            {/* Wait-list SMS notification */}
            {notifyIn > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: -18 + (1 - notifyIn) * 60,
                  opacity: notifyIn,
                  background: palette.soil,
                  color: palette.parchment,
                  padding: "14px 16px",
                  borderRadius: 12,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  boxShadow: "0 20px 30px -10px rgba(26,20,16,0.4)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: palette.wheat,
                    marginBottom: 4,
                  }}
                >
                  Sent · 4 wait-listed members
                </div>
                <div style={{ fontStyle: "italic", lineHeight: 1.35 }}>
                  &ldquo;Eggs just opened up at Three Forks. Reply YES to
                  claim a dozen at pickup.&rdquo;
                </div>
              </div>
            )}
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};

const ProductRow: React.FC<{
  name: string;
  kind: string;
  price: string;
  soldOut?: boolean;
  tapScale?: number;
}> = ({ name, kind, price, soldOut, tapScale }) => {
  return (
    <div
      style={{
        position: "relative",
        background: palette.parchment,
        border: `1px solid ${palette.outlineSoft}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: soldOut ? 0.55 : 1,
        transition: "opacity 200ms",
      }}
    >
      <div>
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
            fontStyle: "italic",
            color: `${palette.soil}66`,
            marginTop: 2,
          }}
        >
          {kind}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: palette.soil,
          }}
        >
          {price}
        </div>
        {soldOut ? (
          <div
            style={{
              marginTop: 4,
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: `${palette.brick}22`,
              color: palette.brick,
              borderRadius: 999,
              padding: "2px 8px",
              display: "inline-block",
              fontWeight: 600,
            }}
          >
            Sold out
          </div>
        ) : (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontFamily: fonts.body,
              color: palette.mossDark,
            }}
          >
            ● in stock
          </div>
        )}
      </div>

      {/* Tap pulse indicator on the eggs row only */}
      {tapScale !== undefined && tapScale > 0 && (
        <div
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: `translateY(-50%) scale(${tapScale})`,
            width: 76,
            height: 76,
            borderRadius: 999,
            border: `3px solid ${palette.brick}`,
            opacity: Math.max(0, 1 - tapScale * 0.6),
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};
