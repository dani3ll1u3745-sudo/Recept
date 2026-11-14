import fs from "fs";
import zlib from "zlib";

function makePng(size) {
  const px = Buffer.alloc(size * size * 4);
  const teal = [15, 118, 110];
  const white = [255, 255, 255];
  const x0 = Math.round(size * 0.28), x1 = Math.round(size * 0.72);
  const y0 = Math.round(size * 0.2), y1 = Math.round(size * 0.8);
  const lineH = Math.max(2, Math.round(size * 0.03));
  const lines = [0.32, 0.42, 0.52, 0.62].map((f) => Math.round(size * f));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = teal;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) {
        c = white;
        const pad = Math.round(size * 0.06);
        for (let k = 0; k < lines.length; k++) {
          const end = k === lines.length - 1 ? Math.round((x0 + x1) / 2) : x1 - pad;
          if (y >= lines[k] && y < lines[k] + lineH && x >= x0 + pad && x < end) c = teal;
        }
      }
      const i = (y * size + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    }
  }
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    px.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync("public/icon-192.png", makePng(192));
fs.writeFileSync("public/icon-512.png", makePng(512));
fs.writeFileSync("public/apple-touch-icon.png", makePng(180));
console.log("Icons created");
