import { AbsoluteFill, Series, Audio, useVideoConfig } from "remotion";
import { z } from "zod";
import { palette } from "../brand/tokens";
import { Grain } from "../brand/Logo";
import { ColdOpen } from "../screencast/scenes/ColdOpen";
import { SoldOutTap } from "../screencast/scenes/SoldOutTap";
import { PickupRoster } from "../screencast/scenes/PickupRoster";
import { SmsLoop } from "../screencast/scenes/SmsLoop";
import { TellTheList } from "../screencast/scenes/TellTheList";
import { CatchWeight } from "../screencast/scenes/CatchWeight";
import { HerdShare } from "../screencast/scenes/HerdShare";
import { StripeToBank } from "../screencast/scenes/StripeToBank";
import { Directory } from "../screencast/scenes/Directory";
import { Close } from "../screencast/scenes/Close";

export const screencastPropsSchema = z.object({
  audioSrc: z.string().optional(),
});

// Ten scenes, 90 seconds at 30fps. Every phone-bearing scene uses the
// shared SplitLayout (text left, phone right) so the eye knows where to
// look from beat to beat. Eyebrow slides in from the left, headline drops
// from below, visual flies in from the right — three different motion
// vectors per scene, no more "everything fades from the bottom."
const FPS = 30;
const SCENES = {
  open: 7 * FPS, // 210 — title + three pulsing stats
  soldOut: 9 * FPS, // 270 — tap rings + notification slides up
  pickup: 9 * FPS, // 270 — 5 members checked off, counter ticks down
  sms: 12 * FPS, // 360 — SMS thread + roster card flies in
  broadcast: 10 * FPS, // 300 — message + counter + replies stream in
  catchWeight: 8 * FPS, // 240 — cut sheet items drop, total counts up
  herdShare: 9 * FPS, // 270 — state badges pop, contract slides up
  stripe: 9 * FPS, // 270 — money flow + 0% stamp
  directory: 9 * FPS, // 270 — ZIP types, pins drop, note rises
  close: 8 * FPS, // 240 — mark, two-line title, URL, $9 pill
} as const;

export const TOTAL = Object.values(SCENES).reduce((a, b) => a + b, 0); // 2700

export const Screencast: React.FC<z.infer<typeof screencastPropsSchema>> = ({
  audioSrc,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.parchment }}>
      <Grain opacity={0.22} />

      <Series>
        <Series.Sequence durationInFrames={SCENES.open}>
          <ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.soldOut}>
          <SoldOutTap />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.pickup}>
          <PickupRoster />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.sms}>
          <SmsLoop />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.broadcast}>
          <TellTheList />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.catchWeight}>
          <CatchWeight />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.herdShare}>
          <HerdShare />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.stripe}>
          <StripeToBank />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.directory}>
          <Directory />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.close}>
          <Close />
        </Series.Sequence>
      </Series>

      {/* Upbeat banjo-and-tambourine bed. Falls back to silence if the MP3
          isn't present (workflow renders that way on first run without
          ELEVENLABS_API_KEY). */}
      {audioSrc && <Audio src={audioSrc} volume={0.65} />}

      {!audioSrc && <span style={{ display: "none" }}>{fps}</span>}
    </AbsoluteFill>
  );
};
