/**
 * Rasterize brand SVG into PWA icons + Open Graph preview image.
 * Run from apps/web: node scripts/generate-brand-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');
const imagesDir = join(root, 'public', 'images');

mkdirSync(iconsDir, { recursive: true });
mkdirSync(imagesDir, { recursive: true });

function renderSvg(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}

const iconSvg = readFileSync(join(iconsDir, 'icon.svg'), 'utf8');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  const buf = renderSvg(iconSvg, size);
  writeFileSync(join(iconsDir, name), buf);
  console.log(`Wrote icons/${name} (${buf.length} bytes)`);
}

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="45%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8c878"/>
      <stop offset="100%" stop-color="#d4a853"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#94a3b8" stroke-opacity="0.1" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="980" cy="120" r="220" fill="#d4a853" fill-opacity="0.14"/>
  <circle cx="80" cy="560" r="180" fill="#4338ca" fill-opacity="0.25"/>

  <rect x="88" y="180" width="96" height="96" rx="24" fill="#4338ca"/>
  <circle cx="136" cy="228" r="28" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.95"/>
  <circle cx="136" cy="196" r="7" fill="url(#gold)"/>
  <circle cx="136" cy="260" r="6" fill="#ffffff" opacity="0.9"/>
  <circle cx="104" cy="228" r="6" fill="#ffffff" opacity="0.9"/>
  <circle cx="168" cy="228" r="6" fill="#ffffff" opacity="0.9"/>
  <circle cx="136" cy="228" r="10" fill="url(#gold)"/>

  <text x="208" y="230" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#ffffff">Church<tspan fill="#d4a853">_Hub</tspan></text>
  <text x="208" y="268" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#94a3b8">Enterprise Ministry Platform</text>

  <text x="88" y="360" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#ffffff">One platform for the entire</text>
  <text x="88" y="412" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#c7d2fe">church community</text>
  <text x="88" y="470" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#cbd5e1">Membership · Discipleship · Outreach · Youth · Operations</text>

  <rect x="88" y="510" width="220" height="40" rx="10" fill="url(#gold)"/>
  <text x="118" y="537" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#1e1b4b">Start free trial →</text>
</svg>`;

const ogBuf = renderSvg(ogSvg, 1200);
writeFileSync(join(imagesDir, 'og-image.png'), ogBuf);
console.log(`Wrote images/og-image.png (${ogBuf.length} bytes)`);
