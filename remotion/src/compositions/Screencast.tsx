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

// 70 seconds at 30fps. Six scenes, retimed without narration. The earlier
// 90-second cut was paced against a voice that no longer exists; without
// it the dwells felt slow, so each scene is tightened ~25% with the action
// pulled earlier so something moves in every second.
const FPS = 30;
const SCENES = {
  open: 7 * FPS, // 210 — establish + go
  soldOut: 12 * FPS, // 360 — tap lands at ~5s, notification slides at ~8s
  sms: 16 * FPS, // 480 — three messages over 12s, roster reacts
  broadcast: 12 * FPS, // 360 — modal in fast, replies stream over 6s
  directory: 12 * FPS, // 360 — ZIP types fast, pins drop, send confirmation
  close: 11 * FPS, // 330 — mark, line, line, URL, price — all visible by 8s
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
