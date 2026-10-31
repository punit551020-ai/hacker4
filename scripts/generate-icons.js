import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function encodeRGBAtoPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(rawData, rowOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderIconRGBA(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * (isMaskable ? 0.38 : 0.46);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient: dark racing carbon / neon amber-violet
      let r = Math.round(18 + 14 * (y / size));
      let g = Math.round(16 + 20 * (x / size));
      let b = Math.round(28 + 32 * (y / size));

      // Metallic border ring
      if (dist < 0.92 && dist > 0.86) {
        r = 255; g = 170; b = 0;
      } else if (dist <= 0.86) {
        // Inner badge
        r = Math.round(24 + 40 * (1 - dist));
        g = Math.round(20 + 20 * (1 - dist));
        b = Math.round(36 + 50 * (1 - dist));

        // Checkered stripe pattern across diagonal
        const check = (Math.floor((x + y) / (size * 0.08)) % 2 === 0);
        if (check && y > size * 0.60 && y < size * 0.78) {
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 40);
        }

        // Kart silhouette / racing helmet in center
        const kx = (x - center) / (size * 0.35);
        const ky = (y - center * 0.9) / (size * 0.35);
        const kDist = Math.sqrt(kx * kx + ky * ky);

        if (kDist < 0.65) {
          // Helmet dome: vibrant red/orange
          r = 255; g = 59; b = 48;
          // Helmet Visor
          if (ky > -0.15 && ky < 0.25 && Math.abs(kx) < 0.52) {
            r = 0; g = 229; b = 255; // Neon cyan visor
          }
        }

        // Speed arrows / wings
        if (y > size * 0.72 && y < size * 0.82 && Math.abs(x - center) < size * 0.32) {
          r = 255; g = 214; b = 0; // Racing yellow speed stripe
        }
      }

      buf[idx + 0] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }

  return encodeRGBAtoPNG(size, size, buf);
}

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderIconRGBA(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderIconRGBA(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderIconRGBA(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderIconRGBA(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), renderIconRGBA(48, false));

console.log('Generated PWA icon PNGs in public/ successfully!');
