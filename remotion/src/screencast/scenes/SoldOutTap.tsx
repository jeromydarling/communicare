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
// Scene 2 — Sold-out tap (12s)
// =============================================================================
// Phone centered + huge. Headline above, action sentence below — each lays
// in with its own beat. Tap lands with THREE expanding rings + a flash.
// Then notification cascades up.
// =============================================================================

export const SoldOutTap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });

  // Tap at frame 100. Three rings stagger out from it.
  const TAP_AT = 100;
  const ring1 = interpolate(frame, [TAP_AT, TAP_AT + 30], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring2 = interpolate(frame, [TAP_AT + 6, TAP_AT + 36], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring3 = interpolate(frame, [TAP_AT + 12, TAP_AT + 42], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = (r: number) => Math.max(0, 1 - r / 3);
  const flipped = frame > TAP_AT + 8;

  const NOTIFY_AT = 200;
  const notifyIn = spring({
    frame: frame - NOTIFY_AT,
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  // Lede swaps from intent to outcome at the tap.
  const ledeAfter = frame > TAP_AT + 15;

  return (
    <AbsoluteFill>
      <SceneBackground />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
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
            marginBottom: 18,
          }}
        >
          № 02 · The market, eight a.m.
        </div>

        <h2
          style={{
            opacity: title,
            transform: `translateY(${(1 - title) * 18}px)`,
            fontFamily: fonts.display,
            fontSize: 110,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: palette.soil,
            textAlign: "center",
            margin: 0,
            marginBottom: 26,
          }}
        >
          The eggs are gone.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            One tap.
          </em>
        </h2>

        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 30,
            fontStyle: "italic",
            lineHeight: 1.4,
            color: `${palette.soil}B0`,
            margin: 0,
            marginBottom: 36,
            textAlign: "center",
            maxWidth: 1100,
            transition: "color 0.4s",
          }}
        >
          {ledeAfter
            ? "The web store updates the same second. Wait-list members get a text."
            : "Eight a.m. at the farmers' market. She marks it sold out from her phone."}
        </p>

        <div
          style={{
            position: "relative",
            opacity: phoneIn,
            transform: `scale(${0.92 + phoneIn * 0.08})`,
          }}
        >
          <PhoneFrame width={340}>
            <div
              style={{
                padding: "14px 20px 10px",
                background: palette.cream,
                borderBottom: `1px solid ${palette.outlineSoft}`,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
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
                  fontSize: 22,
                  fontWeight: 500,
                  color: palette.soil,
                }}
              >
                Today's products.
              </div>
            </div>

            <div style={{ padding: 14, position: "relative" }}>
              <ProductRow
                name="Pastured eggs"
                kind="Dozen"
                price="$8.00"
                soldOut={flipped}
              />
              <ProductRow name="Lacinato kale" kind="Bunch" price="$4.00" />
              <ProductRow name="Hakurei turnips" kind="Bunch" price="$3.50" />

              {/* Three staggered tap rings */}
              {[
                { r: ring1, op: ringOpacity(ring1) },
                { r: ring2, op: ringOpacity(ring2) },
                { r: ring3, op: ringOpacity(ring3) },
              ].map((ring, i) =>
                ring.r > 0 ? (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      right: 30,
                      top: 56,
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      border: `3px solid ${palette.brick}`,
                      transform: `scale(${ring.r})`,
                      opacity: ring.op,
                      pointerEvents: "none",
                    }}
                  />
                ) : null,
              )}
            </div>
          </PhoneFrame>

          {/* Notification flies up beside the phone, doesn't sit ON it */}
          {notifyIn > 0.01 && (
            <div
              style={{
                position: "absolute",
                left: "100%",
                bottom: 40,
                marginLeft: 30,
                opacity: notifyIn,
                transform: `translateY(${(1 - notifyIn) * 30}px)`,
                background: palette.soil,
                color: palette.parchment,
                padding: "16px 22px",
                borderRadius: 16,
                fontFamily: fonts.body,
                fontSize: 17,
                lineHeight: 1.35,
                width: 320,
                boxShadow: "0 24px 40px -10px rgba(26,20,16,0.5)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: palette.wheat,
                  marginBottom: 6,
                }}
              >
                Sent · 4 wait-listed
              </div>
              <div style={{ fontStyle: "italic" }}>
                &ldquo;Eggs just opened up at Three Forks. Reply YES.&rdquo;
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ProductRow: React.FC<{
  name: string;
  kind: string;
  price: string;
  soldOut?: boolean;
}> = ({ name, kind, price, soldOut }) => {
  return (
    <div
      style={{
        background: palette.parchment,
        border: `1px solid ${palette.outlineSoft}`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: soldOut ? 0.5 : 1,
        transition: "opacity 0.2s",
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
            fontSize: 11,
            color: `${palette.soil}66`,
            fontStyle: "italic",
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
            fontSize: 16,
            color: palette.soil,
          }}
        >
          {price}
        </div>
        {soldOut ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 8,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: `${palette.brick}22`,
              color: palette.brick,
              borderRadius: 999,
              padding: "2px 6px",
              display: "inline-block",
              fontWeight: 600,
            }}
          >
            Sold out
          </div>
        ) : (
          <div
            style={{
              marginTop: 3,
              fontSize: 9,
              fontFamily: fonts.body,
              color: palette.mossDark,
            }}
          >
            ● in stock
          </div>
        )}
      </div>
    </div>
  );
};
