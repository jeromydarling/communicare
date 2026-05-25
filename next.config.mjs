// Static export for GitHub Pages. When BASE_PATH is unset (e.g. local dev or
// custom domain), it stays empty. For project-page deploys (github.io/<repo>),
// the deploy workflow sets BASE_PATH=/communicare at build time.
const basePath = process.env.BASE_PATH || "";

// Normalize the Mapbox token across the common env-var names people set.
// Lovable's UI tends to write VITE_MAPBOX_KEY, our docs say
// NEXT_PUBLIC_MAPBOX_TOKEN, some CI configs just use MAPBOX_TOKEN. Whichever
// is present at build time gets baked into NEXT_PUBLIC_MAPBOX_TOKEN, which is
// what the /find page actually reads.
const mapboxToken =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.VITE_MAPBOX_KEY ||
  process.env.MAPBOX_TOKEN ||
  "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_MAPBOX_TOKEN: mapboxToken,
  },
};

export default nextConfig;
