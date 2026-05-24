// Static export for GitHub Pages. When BASE_PATH is unset (e.g. local dev or
// custom domain), it stays empty. For project-page deploys (github.io/<repo>),
// the deploy workflow sets BASE_PATH=/communicare at build time.
const basePath = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
