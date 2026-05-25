import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { palette, fonts } from "../brand/tokens";
import { SceneBackground } from "./SceneBackground";

// =============================================================================
// SplitLayout — the consistent "text on the left, visual on the right" frame.
// Every scene with a phone or card mockup uses this so the eye knows where
// to look from scene to scene.
//
// Eyebrow slides in from the LEFT. Headline slides up from BELOW. Visual
// flies in from the RIGHT. Three different motion vectors per scene — no
// more "everything fades from the bottom."
// =============================================================================

export const SplitLayout: React.FC<{
  number: string; // "№ 02"
  category: string; // "The market, eight a.m."
  title: React.ReactNode; // can include <em> for brick italic
  lede: React.ReactNode;
  children: React.ReactNode; // the right-hand visual
  accent?: string;
  titleSize?: number;
}> = ({
  number,
  category,
  title,
  lede,
  children,
  accent = palette.brick,
  titleSize = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const ledeIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });
  const visualIn = spring({ frame: frame - 18, fps, config: { damping: 17 } });

  return (
    <AbsoluteFill>
      <SceneBackground accent={accent} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 90,
          padding: "60px 100px",
        }}
      >
        {/* LEFT — text */}
        <div
          style={{
            flex: "0 1 720px",
            maxWidth: 720,
          }}
        >
          <div
            style={{
              opacity: eyebrowIn,
              // eyebrow slides in from the LEFT
              transform: `translateX(${(1 - eyebrowIn) * -40}px)`,
              fontFamily: fonts.body,
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: palette.brick,
              marginBottom: 18,
            }}
          >
            {number} · {category}
          </div>
          <h2
            style={{
              opacity: titleIn,
              // headline slides UP from below
              transform: `translateY(${(1 - titleIn) * 24}px)`,
              fontFamily: fonts.display,
              fontSize: titleSize,
              fontWeight: 500,
              lineHeight: 0.94,
              letterSpacing: "-0.03em",
              color: palette.soil,
              margin: 0,
              marginBottom: 22,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              opacity: ledeIn,
              // lede slides in from the LEFT, like the eyebrow but slower
              transform: `translateX(${(1 - ledeIn) * -30}px)`,
              fontFamily: fonts.body,
              // Bumped 26→36 so the italic body text is legible when the
              // 1920-wide video gets scaled to a 375-wide phone viewport.
              fontSize: 36,
              fontStyle: "italic",
              lineHeight: 1.36,
              color: `${palette.soil}BB`,
              margin: 0,
            }}
          >
            {lede}
          </p>
        </div>

        {/* RIGHT — visual flies in from the right */}
        <div
          style={{
            flex: "0 0 auto",
            opacity: visualIn,
            transform: `translateX(${(1 - visualIn) * 80}px)`,
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
