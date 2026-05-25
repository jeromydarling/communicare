#!/usr/bin/env node
/**
 * screenshot-find-map.mjs — captures the /find page (with live Mapbox tiles
 * if a token is configured) and writes it to out/find-map-preview.jpg, the
 * file the landing page references for its "Find them on the map" section.
 *
 * Run by the Deploy workflow after `next build` whenever a Mapbox token is
 * present in any of the common env-var names. Also runnable locally:
 *
 *   NEXT_PUBLIC_MAPBOX_TOKEN=pk....  \
 *     node scripts/screenshot-find-map.mjs \
 *       http://localhost:3000/find/  \
 *       public/find-map-preview.jpg
 *
 * Args:
 *   1. URL of the /find page (defaults to http://localhost:3000/find/)
 *   2. Output path for the JPEG (defaults to public/find-map-preview.jpg)
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.argv[2] || "http://localhost:3000/find/";
const out = process.argv[3] || "public/find-map-preview.jpg";

mkdirSync(dirname(out), { recursive: true });

// Prefer system Chrome / Chromium when available (faster than downloading
// the Playwright-bundled browser on every CI run). Falls back to whatever
// Playwright finds.
const tryPaths = [
  process.env.PLAYWRIGHT_CHROMIUM,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];
const { statSync } = await import("node:fs");
const systemChrome = tryPaths.find((p) => {
  if (!p) return false;
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
});

const browser = await chromium.launch({
  headless: true,
  ...(systemChrome ? { executablePath: systemChrome } : {}),
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
console.log(`→ Browser: ${systemChrome ?? "playwright-bundled"}`);
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

console.log(`→ Loading ${url}`);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForLoadState("networkidle", { timeout: 45000 });

// Give Mapbox tiles + custom pin markers a beat to render. The map fires
// its 'idle' event when tiles are settled; we use a fixed wait as a
// pragmatic guard since the Mapbox JS isn't easy to introspect from
// outside the iframe.
await page.waitForTimeout(2500);

// Suppress the atlas-mode debug pill if it's still showing (i.e. token
// wasn't loaded). Hiding it is cheap insurance.
await page.addStyleTag({
  content: `
    /* the "Atlas view — set NEXT_PUBLIC_MAPBOX_TOKEN" notice */
    .paper.px-3.py-2.text-\\[10px\\] { display: none !important; }
  `,
});
await page.waitForTimeout(200);

// Crop to the map grid container, not the whole page.
const region = page.locator("div.grid.lg\\:grid-cols-\\[1fr_360px\\]").first();
const count = await region.count();
if (count === 0) {
  throw new Error(
    "Couldn't find the find-page grid container. Did the layout change?",
  );
}
await region.screenshot({ path: out, type: "jpeg", quality: 82 });
console.log(`✓ Wrote ${out}`);

await browser.close();
