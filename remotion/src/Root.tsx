import { Composition, staticFile } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSourceSerif } from "@remotion/google-fonts/SourceSerif4";
import { Communicare } from "./compositions/Communicare";

// Preload fonts so they're available during render
loadFraunces();
loadSourceSerif();

// 30 seconds @ 30fps = 900 frames. Six scenes of 5 seconds each.
const FPS = 30;
const DURATION_SECONDS = 30;
const DURATION = FPS * DURATION_SECONDS;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Communicare"
        component={Communicare}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          audioSrc: staticFile("audio/soundtrack.mp3"),
          narrationSrc: staticFile("audio/narration.mp3"),
        }}
      />

      <Composition
        id="CommunicarePortrait"
        component={Communicare}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          audioSrc: staticFile("audio/soundtrack.mp3"),
          narrationSrc: staticFile("audio/narration.mp3"),
        }}
      />
    </>
  );
};
