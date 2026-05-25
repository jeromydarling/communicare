"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================================
// ScreencastEmbed — the 90-second product walkthrough, rendered on the
// landing page.
//
// The MP4 + poster are produced by the Render Videos workflow
// (.github/workflows/render-videos.yml) and committed to /public/video/.
// If the files aren't there yet (e.g. first deploy after a fresh clone),
// the component hides itself gracefully via an onError handler — better
// than showing a broken player.
// =============================================================================

const SRC = "/video/screencast.mp4";
const POSTER = "/video/screencast-poster.jpg";

export function ScreencastEmbed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const [muted, setMuted] = useState(true);

  // Try to autoplay muted on mount; fall back gracefully if blocked.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      // Autoplay was blocked — that's fine, user can press play.
    });
  }, []);

  if (missing) return null;

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  }

  return (
    <section className="relative max-w-page mx-auto px-6 py-16 md:py-24">
      <div className="text-center mb-10 md:mb-14">
        <div className="small-caps text-xs text-brick mb-4">
          Ninety seconds, from her phone at the market to a new member by morning
        </div>
        <h2 className="display text-4xl md:text-5xl font-medium leading-tight">
          A day with Communicare,
          <br className="hidden md:inline" /> in moving pictures.
        </h2>
      </div>

      <div className="relative paper overflow-hidden mx-auto" style={{ maxWidth: 1100 }}>
        {/* The "Mac window" header bar — matches the landing screenshots */}
        <div className="bg-cream border-b border-soil/15 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brick/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-wheat/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-moss/40" />
          </div>
          <div className="text-xs text-soil/55 font-mono ml-2 truncate">
            communicare.farm/screencast.mp4
          </div>
        </div>

        <video
          ref={videoRef}
          className="block w-full bg-soil"
          style={{ aspectRatio: "16 / 9" }}
          poster={POSTER}
          controls
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setMissing(true)}
        >
          <source src={SRC} type="video/mp4" />
        </video>

        {/* Soft "unmute" toggle bottom-right while muted — invites the user
            to turn the music on without competing with the native controls */}
        {muted && (
          <button
            type="button"
            onClick={toggleSound}
            className="absolute bottom-16 right-5 z-10 display italic text-xs bg-parchment/90 backdrop-blur px-3 py-1.5 rounded-full border border-soil/15 hover:bg-parchment shadow-md"
          >
            Turn the music on →
          </button>
        )}
      </div>

      <p className="text-center text-xs text-soil/55 italic mt-5">
        Music: ElevenLabs · animation: Remotion · words: us
      </p>
    </section>
  );
}
