"use client";

import { FarmScene } from "@/components/farm-scene";

// =============================================================================
// WatercolorScene — image-or-SVG bleed illustration
// =============================================================================
// Replaces the FarmScene SVG when a watercolor JPEG/PNG is available under
// /public/watercolors/. If the file isn't there (or the env flag isn't on),
// falls back to the hand-drawn SVG so the auth pages always render.
//
// Lovable: drop images into /public/watercolors/ following the spec in
// docs/IMAGES.md, then either set NEXT_PUBLIC_USE_WATERCOLORS=true OR pass
// an explicit src= prop at the call site. The call sites already point at
// the right names below, so dropping the files in is enough.
// =============================================================================

const USE_WATERCOLORS = process.env.NEXT_PUBLIC_USE_WATERCOLORS === "true";

// The set of scenes we currently use, with their file names + alt text.
// Add new ones here when you add a watercolor.
const SCENES = {
  "dawn-pasture": {
    file: "/watercolors/dawn-pasture.jpg",
    alt: "Dawn light over a rolling pasture, watercolor",
  },
  "dusk-table": {
    file: "/watercolors/dusk-table.jpg",
    alt: "Evening light on a wooden table with a jar and a loaf, watercolor",
  },
  "field-rows": {
    file: "/watercolors/field-rows.jpg",
    alt: "Neat rows of vegetables under summer sky, watercolor",
  },
  "hands-and-soil": {
    file: "/watercolors/hands-and-soil.jpg",
    alt: "Hands cupping dark soil, watercolor",
  },
} as const;

type SceneName = keyof typeof SCENES;

export function WatercolorScene({
  name,
  src,
  className,
}: {
  name?: SceneName;
  src?: string;          // optional explicit override
  className?: string;
}) {
  const scene = name ? SCENES[name] : undefined;
  const url = src ?? scene?.file;

  if (!USE_WATERCOLORS || !url) {
    return <FarmScene className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={scene?.alt ?? ""}
      className={`${className ?? ""} object-cover`}
      draggable={false}
    />
  );
}
