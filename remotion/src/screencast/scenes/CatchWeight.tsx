import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { SplitLayout } from "../SplitLayout";

// Scene 6 — Catch-weight. A quarter beef finishes at the butcher.
// Cut sheet shows the breakdown, the dollar total counts up as cuts
// drop in one by one. Right side = a paper-style invoice card.

const CUTS = [
  { label: "Ground beef · 28 lb", price: 266, at: 35 },
  { label: "Chuck roasts · 12 lb", price: 132, at: 65 },
  { label: "Ribeye steaks · 8 lb", price: 192, at: 95 },
  { label: "Tenderloin · 4 lb", price: 96, at: 125 },
  { label: "Brisket · 9 lb", price: 117, at: 155 },
  { label: "Bones + organ meats", price: 25, at: 185 },
];

export const CatchWeight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = CUTS.filter((c) => frame >= c.at).reduce((s, c) => s + c.price, 0);

  return (
    <SplitLayout
      number="№ 06"
      category="A quarter beef finishes"
      title={
        <>
          Hanging weight in,{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            invoice out.
          </em>
        </>
      }
      lede="Cut sheet comes back from the butcher. The card on file charges automatically. Mary never opens a calculator."
    >
      <div
        style={{
          width: 460,
          background: palette.parchment,
          border: `1px solid ${palette.outlineSoft}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 30px 50px -15px rgba(26,20,16,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
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
              Catch-weight invoice
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: 500,
                color: palette.soil,
                lineHeight: 1.1,
              }}
            >
              Daniel W. · Quarter beef
            </div>
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 500,
              color: `${palette.soil}88`,
            }}
          >
            61 lb
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            borderTop: `1px solid ${palette.outlineSoft}`,
          }}
        >
          {CUTS.map((c, i) => {
            const reveal = spring({
              frame: frame - c.at,
              fps,
              config: { damping: 16 },
            });
            if (reveal <= 0) return null;
            return (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: `1px solid ${palette.outlineSoft}55`,
                  opacity: reveal,
                  transform: `translateX(${(1 - reveal) * -20}px)`,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: palette.soil,
                }}
              >
                <span>{c.label}</span>
                <span style={{ fontFamily: fonts.mono, fontWeight: 500 }}>
                  ${c.price.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "16px 0 4px",
            borderTop: `2px solid ${palette.soil}`,
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: `${palette.soil}88`,
            }}
          >
            Charged today
          </span>
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 44,
              fontWeight: 500,
              color: palette.brick,
              letterSpacing: "-0.02em",
              transform: `scale(${frame > 185 ? 1.04 : 1})`,
              transition: "transform 0.15s",
              transformOrigin: "right center",
            }}
          >
            ${total.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: fonts.body,
            fontSize: 11,
            fontStyle: "italic",
            color: `${palette.soil}66`,
            textAlign: "right",
          }}
        >
          Card on file · Stripe receipt sent
        </div>
      </div>
    </SplitLayout>
  );
};
