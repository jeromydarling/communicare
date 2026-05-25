import {
  AbsoluteFill,
  Series,
  Audio,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { palette } from "../brand/tokens";
import { Grain } from "../brand/Logo";
import { ColdOpen } from "../screencast/scenes/ColdOpen";
import { SoldOutTap } from "../screencast/scenes/SoldOutTap";
import { SmsLoop } from "../screencast/scenes/SmsLoop";
import { TellTheList } from "../screencast/scenes/TellTheList";
import { Directory } from "../screencast/scenes/Directory";
import { Close } from "../screencast/scenes/Close";

// Deliberately no narration prop. Farms hear hired voiceover and know it
// isn't us — they distrust it. The story reads itself: big on-screen type,
// concrete subtitles under each tap, an instrumental bed. Quiet. Honest.
export const screencastPropsSchema = z.object({
  audioSrc: z.string().optional(),
});

// 70 seconds at 30fps. Six scenes, full rewrite — no narration, every
// scene now has a single focal element with HUGE typography (96-160px),
// drifting background, multi-step pulses, and motion that doesn't stop.
const FPS = 30;
const SCENES = {
  open: 8 * FPS, // 240 — title + three pulsing stats
  soldOut: 12 * FPS, // 360 — phone + three-ring tap + notification fly-in
  sms: 16 * FPS, // 480 — phone with thread + roster overlay flies in
  broadcast: 12 * FPS, // 360 — card + giant counter ticking up
  directory: 12 * FPS, // 360 — ZIP types into big input + pins drop + ripple
  close: 10 * FPS, // 300 — mark + two-line title + URL + price
} as const;

export const TOTAL = Object.values(SCENES).reduce((a, b) => a + b, 0); // 2700

export const Screencast: React.FC<
  z.infer<typeof screencastPropsSchema>
> = ({ audioSrc }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.parchment }}>
      <Grain opacity={0.28} />

      <Series>
        <Series.Sequence durationInFrames={SCENES.open}>
          <ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.soldOut}>
          <SoldOutTap />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.sms}>
          <SmsLoop />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.broadcast}>
          <TellTheList />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.directory}>
          <Directory />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.close}>
          <Close />
        </Series.Sequence>
      </Series>

      {/* Music bed only — louder than the old version because nothing else
          competes for the ear. Falls back to silence if the MP3 isn't present
          (e.g. local dev without an ELEVENLABS key). */}
      {audioSrc && <Audio src={audioSrc} volume={0.62} />}

      {!audioSrc && <span style={{ display: "none" }}>{fps}</span>}
    </AbsoluteFill>
  );
};
