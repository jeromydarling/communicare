import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { PhoneFrame } from "../frames";
import { SplitLayout } from "../SplitLayout";

// Scene 4 — Pickup roster. At the actual pickup, Mary taps each member
// as they arrive. Checkmarks animate in, the row dims, the counter
// at the top ticks down "12 still coming → 0 still coming". Text left,
// phone right.

const MEMBERS = [
  { name: "Linda O.", site: "Saturday — the dairy" },
  { name: "Tomás R.", site: "Saturday — the dairy" },
  { name: "Esther W.", site: "Wednesday — Bailey library" },
  { name: "Caleb A.", site: "Saturday — the dairy" },
  { name: "Marina V.", site: "Saturday — the dairy" },
];

// Each member gets checked off at staggered frames
const CHECK_AT = [60, 95, 130, 170, 215];

export const PickupRoster: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const remaining = MEMBERS.length - CHECK_AT.filter((t) => frame >= t).length;

  return (
    <SplitLayout
      number="№ 04"
      category="Tuesday afternoon, the pickup site"
      title={
        <>
          Tap as they arrive.{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            No clipboard.
          </em>
        </>
      }
      lede="Pickup roster lives in your pocket. When everyone's collected, you've already done the paperwork."
    >
      <PhoneFrame width={380}>
        <div
          style={{
            padding: "14px 18px 12px",
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
              marginBottom: 4,
            }}
          >
            Pickup roster · Tue May 25
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: 500,
                color: palette.soil,
              }}
            >
              The Dairy · 3 to 6 pm
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 500,
                color: remaining === 0 ? palette.mossDark : palette.brick,
                lineHeight: 1,
                transition: "color 0.3s",
              }}
            >
              {remaining}
            </div>
          </div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 10,
              color: `${palette.soil}66`,
              fontStyle: "italic",
              marginTop: 2,
              textAlign: "right",
            }}
          >
            {remaining === 0 ? "all in" : "still coming"}
          </div>
        </div>

        <div style={{ padding: 12 }}>
          {MEMBERS.map((m, i) => {
            const checked = frame >= CHECK_AT[i];
            const checkBounce = spring({
              frame: frame - CHECK_AT[i],
              fps,
              config: { damping: 10, stiffness: 240 },
            });
            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom:
                    i < MEMBERS.length - 1
                      ? `1px solid ${palette.outlineSoft}55`
                      : "none",
                  opacity: checked ? 0.55 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: `2px solid ${checked ? palette.mossDark : palette.outline}`,
                    background: checked ? palette.mossDark : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${checked ? checkBounce : 1})`,
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12l5 5L20 7"
                        stroke={palette.parchment}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 14,
                      fontWeight: 500,
                      color: palette.soil,
                      textDecoration: checked ? "line-through" : "none",
                      textDecorationColor: `${palette.soil}66`,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 10,
                      color: `${palette.soil}66`,
                      fontStyle: "italic",
                    }}
                  >
                    {m.site}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PhoneFrame>
    </SplitLayout>
  );
};
