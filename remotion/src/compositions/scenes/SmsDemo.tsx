import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { palette, fonts } from "../../brand/tokens";

type Bubble = { from: "them" | "me"; text: string; appearAt: number };

const BUBBLES: Bubble[] = [
  {
    from: "them",
    text: "Hey Sarah — your Tuesday share: kale, eggs, tomatoes. Reply SWAP, SKIP, DONATE.",
    appearAt: 0,
  },
  { from: "me", text: "swap kale for chard", appearAt: 40 },
  { from: "them", text: "Done. Tuesday share: chard, eggs, tomatoes.", appearAt: 80 },
];

export const SmsDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.parchment,
        color: palette.soil,
        display: "flex",
        flexDirection: portrait ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: portrait ? "60px 50px" : "0 140px",
      }}
    >
      {/* Caption */}
      <div style={{ maxWidth: portrait ? 900 : 600 }}>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: portrait ? 22 : 26,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: palette.brick,
            marginBottom: 24,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          № 02 · The whole UX
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: portrait ? 64 : 84,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: 0,
            opacity: interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Members order
          <br />
          by texting back.
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontStyle: "italic",
            fontSize: portrait ? 24 : 28,
            color: "rgba(38,25,12,0.65)",
            marginTop: 28,
            opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" }),
            lineHeight: 1.5,
          }}
        >
          No app to open. No password to invent. The fastest way to keep a CSA
          member happy.
        </p>
      </div>

      {/* Phone */}
      <PhoneFrame portrait={portrait}>
        {BUBBLES.map((b, i) => {
          const localFrame = frame - b.appearAt;
          if (localFrame < 0) return null;
          const animation = spring({
            frame: localFrame,
            fps,
            config: { damping: 14 },
          });
          return (
            <SmsBubble
              key={i}
              from={b.from}
              opacity={animation}
              translate={(1 - animation) * 16}
            >
              {b.text}
            </SmsBubble>
          );
        })}
      </PhoneFrame>
    </AbsoluteFill>
  );
};

function PhoneFrame({
  children,
  portrait,
}: {
  children: React.ReactNode;
  portrait: boolean;
}) {
  return (
    <div
      style={{
        background: palette.soil,
        borderRadius: 56,
        padding: 12,
        width: portrait ? 480 : 380,
        aspectRatio: "9/19.5",
        boxShadow: "0 30px 80px -20px rgba(38,25,12,0.5)",
        position: "relative",
      }}
    >
      <div
        style={{
          background: palette.parchment,
          borderRadius: 46,
          height: "100%",
          padding: "60px 20px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 28,
            background: palette.soil,
            borderRadius: 999,
          }}
        />
        <div
          style={{
            textAlign: "center",
            fontFamily: fonts.display,
            fontSize: 16,
            color: "rgba(38,25,12,0.6)",
            marginBottom: 4,
          }}
        >
          Wren Hollow Farm
        </div>
        {children}
      </div>
    </div>
  );
}

function SmsBubble({
  from,
  children,
  opacity,
  translate,
}: {
  from: "me" | "them";
  children: React.ReactNode;
  opacity: number;
  translate: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: from === "me" ? "flex-end" : "flex-start",
        opacity,
        transform: `translateY(${translate}px)`,
      }}
    >
      <div
        style={{
          background: from === "me" ? palette.sky : palette.cream,
          color: from === "me" ? palette.parchment : palette.soil,
          padding: "10px 14px",
          borderRadius: 18,
          borderBottomLeftRadius: from === "me" ? 18 : 4,
          borderBottomRightRadius: from === "me" ? 4 : 18,
          fontFamily: fonts.body,
          fontSize: 17,
          lineHeight: 1.35,
          maxWidth: "80%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
