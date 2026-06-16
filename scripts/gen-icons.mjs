// Generates brand PNG icons (white "T" monogram on brand blue) with no deps.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x1d, 0x4e, 0xd8, 0xff]; // #1d4ed8
const FG = [0xff, 0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const inBar = (x, y) => {
    const vx = x >= 0.42 * size && x <= 0.58 * size && y >= 0.3 * size && y <= 0.74 * size;
    const hx = x >= 0.28 * size && x <= 0.72 * size && y >= 0.3 * size && y <= 0.42 * size;
    return vx || hx;
  };
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const c = inBar(x, y) ? FG : BG;
      raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2]; raw[p++] = c[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [192, 512]) {
  writeFileSync(`public/icons/icon-${s}.png`, makePng(s));
  console.log(`wrote public/icons/icon-${s}.png`);
}
