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

// Music-only. Voiceover removed — see the Screencast composition for the
// reasoning; the same logic applies here. Farms distrust hired voices.
export const communicarePropsSchema = z.object({
  audioSrc: z.string().optional(),
});

const SCENE = 150; // 5s @ 30fps
const CLOSING_SCENE = 240; // 8s — needs room for the pitch line to land

export const Communicare: React.FC<z.infer<typeof communicarePropsSchema>> = ({
  audioSrc,
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
        <Series.Sequence durationInFrames={CLOSING_SCENE}>
          <Closing />
        </Series.Sequence>
      </Series>

      {/* Instrumental bed only. Bumped from 0.35 to 0.6 since voiceover is
          gone and the music can carry more weight without overpowering. */}
      {audioSrc && <Audio src={audioSrc} volume={0.6} />}

      {!audioSrc && (
        <>
          <span style={{ display: "none" }}>{fps}</span>
          <span style={{ display: "none" }}>{staticFile("/")}</span>
        </>
      )}
    </AbsoluteFill>
  );
};
