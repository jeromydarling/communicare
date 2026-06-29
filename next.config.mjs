// Deploys to Cloudflare Pages, communicare.farm at root.
//
// Cloudflare Pages auto-builds on push to main (configured in the CF
// dashboard, project linked to this GitHub repo). We don't need a GitHub
// Actions deploy step — CF handles the build with `npm run build` and
// publishes the `out/` directory directly. Per-branch preview deploys
// happen automatically.
//
// `output: "export"` produces a static `out/` directory; that's what CF
// Pages serves. When we add Workers for server-side logic we'll either
// keep this static export and call Workers as APIs from the client, or
// switch to `@cloudflare/next-on-pages` for SSR-on-Workers. Static-export
// remains the right call today because every server need is already
// served by edge functions.

const mapboxToken =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.VITE_MAPBOX_KEY ||
  process.env.MAPBOX_TOKEN ||
  "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: mapboxToken,
  },
};

export default nextConfig;
