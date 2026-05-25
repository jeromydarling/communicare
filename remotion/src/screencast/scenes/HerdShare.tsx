import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { palette, fonts } from "../../brand/tokens";
import { SplitLayout } from "../SplitLayout";

// Scene 7 — Herd-share contracts. The unique-to-us regulatory moat.
// State badges pop in with scale + rotation, then a contract card slides
// up with a "3-year retention" stamp. The dairy farms watching this video
// stop scrolling here.

const STATES = [
  { code: "CO", name: "Colorado", at: 30 },
  { code: "ID", name: "Idaho", at: 45 },
  { code: "TN", name: "Tennessee", at: 60 },
  { code: "CT", name: "Connecticut", at: 75 },
  { code: "WI", name: "Wisconsin", at: 90 },
  { code: "PA", name: "Pennsylvania", at: 105 },
  { code: "MO", name: "Missouri", at: 120 },
  { code: "ME", name: "Maine", at: 135 },
];

export const HerdShare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const contractIn = spring({
    frame: frame - 160,
    fps,
    config: { damping: 16 },
  });

  return (
    <SplitLayout
      number="№ 07"
      category="Built for dairy regulators"
      title={
        <>
          State-aware{" "}
          <em style={{ color: palette.brick, fontStyle: "italic" }}>
            herd shares.
          </em>
        </>
      }
      lede="Eight states' worth of contract templates. CFU/mL test posting. Three-year retention enforcement. We read the statutes so you don't have to."
    >
      <div style={{ width: 540, position: "relative" }}>
        {/* State badges — pop in randomly with scale + rotation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {STATES.map((s) => {
            const pop = spring({
              frame: frame - s.at,
              fps,
              config: { damping: 11, stiffness: 180 },
            });
            // Each badge rotates a slightly different way as it lands
            const rotateBy = ((s.code.charCodeAt(0) % 7) - 3) * 1.5;
            return (
              <div
                key={s.code}
                style={{
                  opacity: pop,
                  transform: `scale(${pop}) rotate(${(1 - pop) * 30 + rotateBy}deg)`,
                  background: palette.parchment,
                  border: `2px solid ${palette.wheat}`,
                  borderRadius: 12,
                  padding: "14px 8px",
                  textAlign: "center",
                  boxShadow: "0 8px 20px -6px rgba(26,20,16,0.18)",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 32,
                    fontWeight: 500,
                    color: palette.brick,
                    lineHeight: 1,
                  }}
                >
                  {s.code}
                </div>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    color: `${palette.soil}88`,
                    marginTop: 3,
                    fontStyle: "italic",
                  }}
                >
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contract card slides up from below */}
        {contractIn > 0.01 && (
          <div
            style={{
              opacity: contractIn,
              transform: `translateY(${(1 - contractIn) * 40}px)`,
              background: palette.parchment,
              border: `1px solid ${palette.outlineSoft}`,
              borderRadius: 14,
              padding: 22,
              boxShadow: "0 24px 50px -15px rgba(26,20,16,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: palette.brick,
                marginBottom: 6,
              }}
            >
              Colorado · §25-5.5
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                fontWeight: 500,
                color: palette.soil,
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              Linda Olsen · 1/30th share
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Badge label="Signed May 2 2025" color={palette.mossDark} bg={`${palette.moss}22`} />
              <Badge label="3-year retention" color={palette.wheatDark} bg={`${palette.wheat}33`} />
              <Badge label="Milk tests · 11 of 12" color={palette.mossDark} bg={`${palette.moss}22`} />
            </div>
            {/* Stamp */}
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                width: 78,
                height: 78,
                borderRadius: 999,
                border: `3px solid ${palette.brick}`,
                color: palette.brick,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: fonts.display,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 500,
                lineHeight: 1.05,
                transform: `rotate(-${10 + (1 - contractIn) * 30}deg)`,
                opacity: contractIn,
              }}
            >
              On file
            </div>
          </div>
        )}
      </div>
    </SplitLayout>
  );
};

const Badge: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span
    style={{
      background: bg,
      color,
      fontFamily: fonts.body,
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 600,
    }}
  >
    {label}
  </span>
);
