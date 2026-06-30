// Static export served by the Cloudflare Worker in src/worker.ts.
// `output: "export"` writes ./out; wrangler uploads it as the
// ASSETS binding alongside the Worker code.

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

// Diagnostic — surfaces what NEXT_PUBLIC_MAPBOX_TOKEN resolves to at
// config-load. If this prints empty in CI, the workflow env isn't
// reaching the next process; if it prints "pk.…", Next's NEXT_PUBLIC_
// inliner will bake it into the client bundle and the /find map will
// work. Cheap, deterministic, and leaves a clear trail in the build log.
const tok = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
console.log(
  `[next.config] NEXT_PUBLIC_MAPBOX_TOKEN: present=${Boolean(tok)} length=${tok.length} prefix=${tok.slice(0, 8)}`,
);

export default nextConfig;
