import {
  AbsoluteFill,
  Series,
  Audio,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Hero } from "./scenes/Hero";
import { Price } from "./scenes/Price";
import { Promise } from "./scenes/Promise";
import { SmsDemo } from "./scenes/SmsDemo";
import { Map } from "./scenes/Map";
import { Closing } from "./scenes/Closing";
import { palette } from "../brand/tokens";
import { Grain } from "../brand/Logo";

export const communicarePropsSchema = z.object({
  audioSrc: z.string().optional(),
  narrationSrc: z.string().optional(),
});

const SCENE = 150; // 5s @ 30fps

export const Communicare: React.FC<z.infer<typeof communicarePropsSchema>> = ({
  audioSrc,
  narrationSrc,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.parchment }}>
      <Grain opacity={0.35} />

      <Series>
        <Series.Sequence durationInFrames={SCENE}>
          <Hero />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE}>
          <Price />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE}>
          <Promise />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE}>
          <SmsDemo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE}>
          <Map />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE}>
          <Closing />
        </Series.Sequence>
      </Series>

      {/* Music bed — soft fingerpicked acoustic; falls back gracefully if
          the audio file doesn't exist (a 404 on the Remotion dev server). */}
      {audioSrc && <Audio src={audioSrc} volume={0.35} />}
      {/* Narration on top; quieter than music until the closing line */}
      {narrationSrc && <Audio src={narrationSrc} volume={0.85} />}

      {/* Avoid unused-variable warning when audio is omitted in dev */}
      {!audioSrc && !narrationSrc && (
        <span style={{ display: "none" }}>{fps}</span>
      )}
    </AbsoluteFill>
  );
};
