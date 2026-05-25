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

// Honor the deploy-time base path (e.g. "/communicare" on a GitHub Pages
// project page) so the asset URLs resolve against the right origin.
// Next.js handles this automatically for <Link> and <Image>, but raw
// <video src=…> needs the prefix prepended manually.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SRC = `${BASE}/video/screencast.mp4`;
const POSTER = `${BASE}/video/screencast-poster.jpg`;

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
      </div>

      {/* "Turn the music on" lives BELOW the video — not over the play
          button. Keeping it out of the touch zone matters on mobile
          where the entire video face is tappable. */}
      <div className="flex items-center justify-center gap-4 mt-5">
        <button
          type="button"
          onClick={toggleSound}
          className="display italic text-sm text-brick hover:underline"
        >
          {muted ? "Turn the music on →" : "Mute the music ←"}
        </button>
        <span className="text-soil/30">·</span>
        <span className="text-xs text-soil/55 italic">
          Music: ElevenLabs · animation: Remotion · words: us
        </span>
      </div>
    </section>
  );
}
