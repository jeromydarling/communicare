import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";
import { SplitLayout } from "../SplitLayout";

// Scene 2 — Sold-out tap. Text left, phone right.
// Tap rings expand from the eggs row, notification slides in from below
// the phone (not over the controls), eggs row dims.

export const SoldOutTap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const TAP_AT = 80;
  const ring1 = interpolate(frame, [TAP_AT, TAP_AT + 25], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring2 = interpolate(frame, [TAP_AT + 5, TAP_AT + 30], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring3 = interpolate(frame, [TAP_AT + 10, TAP_AT + 35], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = (r: number) => Math.max(0, 1 - r / 3);
  const flipped = frame > TAP_AT + 8;

  const NOTIFY_AT = 160;
  const notifyIn = spring({
    frame: frame - NOTIFY_AT,
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  return (
    <SplitLayout
      number="№ 02"
      category="The market, 8 a.m."
      title={
        <>
          The eggs are gone.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            One tap.
          </em>
        </>
      }
      lede="The web store updates the same second. Wait-list members get a text in their pocket."
    >
      <div style={{ position: "relative" }}>
        <PhoneFrame width={360}>
          <div
            style={{
              padding: "14px 18px 10px",
              background: palette.cream,
              borderBottom: `1px solid ${palette.outlineSoft}`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 3,
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
            <ProductRow name="Pastured eggs" kind="Dozen" price="$8.00" soldOut={flipped} />
            <ProductRow name="Lacinato kale" kind="Bunch" price="$4.00" />
            <ProductRow name="Hakurei turnips" kind="Bunch" price="$3.50" />

            {[ring1, ring2, ring3].map((r, i) =>
              r > 0 ? (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    right: 28,
                    top: 56,
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    border: `3px solid ${palette.brick}`,
                    transform: `scale(${r})`,
                    opacity: ringOpacity(r),
                    pointerEvents: "none",
                  }}
                />
              ) : null,
            )}
          </div>
        </PhoneFrame>

        {/* Notification slides up FROM BELOW the phone */}
        {notifyIn > 0.01 && (
          <div
            style={{
              position: "absolute",
              left: -30,
              top: "100%",
              marginTop: 16,
              opacity: notifyIn,
              transform: `translateY(${(1 - notifyIn) * 40}px)`,
              background: palette.soil,
              color: palette.parchment,
              padding: "14px 20px",
              borderRadius: 14,
              fontFamily: fonts.body,
              fontSize: 15,
              width: 420,
              boxShadow: "0 20px 36px -10px rgba(26,20,16,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: palette.wheat,
                marginBottom: 6,
              }}
            >
              Sent · 4 wait-listed
            </div>
            <div style={{ fontStyle: "italic", lineHeight: 1.3 }}>
              &ldquo;Eggs just opened up at Three Forks. Reply YES.&rdquo;
            </div>
          </div>
        )}
      </div>
    </SplitLayout>
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
