import {
  useCurrentFrame,
  AbsoluteFill,
} from "remotion";
import { palette } from "../brand/tokens";

// =============================================================================
// SceneBackground — drifts continuously so the frame is never still
// =============================================================================
// Two warm radial washes that slowly pan across the parchment. Adds a sense
// of motion to every scene even when the foreground is paused. Use as the
// first child of an AbsoluteFill in each scene.
// =============================================================================

export const SceneBackground: React.FC<{ accent?: string }> = ({
  accent = palette.brick,
}) => {
  const frame = useCurrentFrame();
  // Drift cycles over 4 seconds per orbit — slow enough to feel ambient,
  // fast enough that you notice if you focus on it.
  const t = (frame / 120) % 1;
  const x1 = 12 + Math.sin(t * Math.PI * 2) * 8;
  const y1 = 28 + Math.cos(t * Math.PI * 2) * 6;
  const x2 = 88 + Math.sin(t * Math.PI * 2 + Math.PI) * 6;
  const y2 = 76 + Math.cos(t * Math.PI * 2 + Math.PI) * 8;

  return (
    <AbsoluteFill style={{ background: palette.parchment, zIndex: 0 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x1}% ${y1}%, ${palette.wheat}55 0%, transparent 38%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x2}% ${y2}%, ${accent}30 0%, transparent 42%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 50%, ${palette.soil}12 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
