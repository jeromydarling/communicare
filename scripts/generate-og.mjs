#!/usr/bin/env node
/**
 * Generate the default Open Graph image at /public/og/default.png.
 *
 * Renders an HTML template using Playwright (already in devDeps via the
 * webapp-testing skill), screenshots at 1200x630, and writes the PNG.
 *
 * Re-run any time the brand voice / tagline changes:
 *   node scripts/generate-og.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const outPath = resolve(repoRoot, "public/og/default.jpg");
mkdirSync(dirname(outPath), { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Source+Serif+4:ital,opsz,wght@1,8..60,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #FBF1EC;
    font-family: 'Source Serif 4', Georgia, serif;
    color: #1A1410;
    position: relative;
    overflow: hidden;
  }
  /* Warm radial wash, top-right */
  body::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 80% 20%, rgba(236,193,95,0.32) 0%, transparent 55%);
  }
  /* Brick wash bottom-left */
  body::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 10% 110%, rgba(193,104,80,0.22) 0%, transparent 60%);
  }
  .grain {
    position: absolute;
    inset: 0;
    opacity: 0.5;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    mix-blend-mode: multiply;
    pointer-events: none;
  }
  .content {
    position: relative;
    z-index: 1;
    height: 100%;
    padding: 80px 96px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .mark {
    width: 56px;
    height: 56px;
    color: #C16850;
    flex-shrink: 0;
  }
  .wordmark {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    line-height: 1;
  }
  .issue {
    margin-top: 2px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(26,20,16,0.55);
  }
  .headline {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 112px;
    line-height: 0.96;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 0;
    max-width: 1000px;
  }
  .headline em {
    font-style: italic;
    color: #C16850;
  }
  .bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 40px;
  }
  .lede {
    font-family: 'Source Serif 4', Georgia, serif;
    font-style: italic;
    font-size: 22px;
    line-height: 1.45;
    color: rgba(26,20,16,0.72);
    max-width: 700px;
  }
  .url {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #C16850;
    text-align: right;
    flex-shrink: 0;
  }
  .url-sub {
    margin-top: 6px;
    font-family: 'Source Serif 4', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(26,20,16,0.55);
    text-transform: none;
    letter-spacing: 0;
  }
</style>
</head>
<body>
  <div class="grain"></div>
  <div class="content">
    <div class="top">
      <svg class="mark" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="3"/>
        <path d="M 32 14 L 32 50 M 14 32 L 50 32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="32" cy="32" r="6" fill="currentColor"/>
      </svg>
      <div>
        <div class="wordmark">Communicare</div>
        <div class="issue">For the farms that feed us</div>
      </div>
    </div>
    <h1 class="headline">For the farms<br/><em>that feed us.</em></h1>
    <div class="bottom">
      <p class="lede">
        A small, slow-built tool for farm shares and the neighbors they feed.
        Members order by texting back. Free homepage, no contracts, nine
        dollars a month.
      </p>
      <div class="url">
        communicare.farm
        <div class="url-sub">Catholic Worker · Wendell Berry · 1976→</div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined,
});
// 1x is enough — Twitter/Facebook display at 1200x630 native. 2x doubles
// file size for almost no perceived quality gain on a card.
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
// Give web fonts a beat to swap in
await page.waitForTimeout(800);
const buffer = await page.screenshot({ type: "jpeg", quality: 88 });
writeFileSync(outPath, buffer);
await browser.close();

console.log(`Wrote ${outPath} (${buffer.byteLength.toLocaleString()} bytes)`);
