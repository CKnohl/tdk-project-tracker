// Generates the full app/PWA icon set from the TDK arrow mark.
//  - Transparent arrow  → favicon + Android "any" icons
//  - Navy (#081224) bg  → iOS Apple touch + maskable icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'public/brand/tdk-arrow.png';
const NAVY = '#081224';
mkdirSync('public/icons', { recursive: true });

const transparent = (size, out) =>
  sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);

async function navy(size, out, padRatio = 0.2) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const arrow = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: arrow, gravity: 'center' }])
    .png()
    .toFile(out);
}

await Promise.all([
  // Favicon + browser tab + Windows PWA (transparent)
  transparent(512, 'app/icon.png'),
  transparent(192, 'public/icons/icon-192.png'),
  transparent(512, 'public/icons/icon-512.png'),
  transparent(96, 'public/brand/tdk-arrow-96.png'),
  // iOS Apple touch (navy, padded) — Next picks up app/apple-icon.png
  navy(180, 'app/apple-icon.png'),
  // Maskable / Android adaptive (navy safe-area)
  navy(192, 'public/icons/maskable-192.png'),
  navy(512, 'public/icons/maskable-512.png'),
  // Splash mark
  navy(512, 'public/icons/icon-navy-512.png'),
]);

console.log('app icons generated');
