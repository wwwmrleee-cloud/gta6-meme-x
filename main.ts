// gta6-meme-x-01 — "Post a GTA 6 meme on X" (make.fun).
//
// main.ts generates the meme image deterministically (Node 22, standard
// library only: no network, no wall clock, no files outside the repository,
// no randomness — a fixed-seed generator is used for the skyline windows)
// and copies POST.json to the output directory, which is all the gate
// reads. The entry itself is the X post: this program's meme.png is the
// picture posted on X, and POST.json names that post.
//
// Run locally:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// That writes out/meme.png (1080x1080) and out/POST.json.
//
// The meme: a Vice City / Leonida sunset. The joke is a heist with a
// twist: GTA 6 is a game about heists, but "THE BIGGEST HEIST / WASN'T
// IN THE GAME" — the make.fun ghost's AI agent pulled it off on make.fun,
// and the pink "LEGAL!" stamp says it was all above board. The make.fun
// ghost mascot (white ghost, sunglasses, gold "$" medallion) drives the
// picture, and "ON MAKE.FUN" sits at the bottom, so the picture itself
// carries make.fun and sells it at a glance.

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Pixel buffer (RGBA, 1080 x 1080)
// ---------------------------------------------------------------------------

const W = 1080;
const H = 1080;
const px = new Uint8Array(W * H * 4);

type RGB = [number, number, number];

function setPixel(x: number, y: number, c: RGB, a = 1): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
  const i = (yi * W + xi) * 4;
  if (a >= 1) {
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
    px[i + 3] = 255;
  } else {
    px[i] = Math.round(px[i] * (1 - a) + c[0] * a);
    px[i + 1] = Math.round(px[i + 1] * (1 - a) + c[1] * a);
    px[i + 2] = Math.round(px[i + 2] * (1 - a) + c[2] * a);
    px[i + 3] = 255;
  }
}

function fillRect(x0: number, y0: number, w: number, h: number, c: RGB, a = 1): void {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y0 + h)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x0 + w)); x++) {
      setPixel(x, y, c, a);
    }
  }
}

function fillDisc(cx: number, cy: number, r: number, c: RGB, a = 1): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) setPixel(x, y, c, a);
  }
}

// A line of the given thickness, drawn as a chain of discs.
function drawLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB, a = 1): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    fillDisc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, t / 2, c, a);
  }
}

function lerp(a: number, b: number, f: number): number {
  return Math.round(a + (b - a) * f);
}

function lerpColor(c1: RGB, c2: RGB, f: number): RGB {
  return [lerp(c1[0], c2[0], f), lerp(c1[1], c2[1], f), lerp(c1[2], c2[2], f)];
}

// Fixed-seed deterministic pseudo-random (no Math.random anywhere).
let seed = 20261119;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ---------------------------------------------------------------------------
// 5x7 pixel font (uppercase, digits, a few punctuation marks)
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawGlyph(ch: string, x0: number, y0: number, scale: number, c: RGB): void {
  const g = FONT[ch] ?? FONT['?'];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') fillRect(x0 + col * scale, y0 + r * scale, scale, scale, c);
    }
  }
}

// Centered text. The font holds capitals only, so text is upper-cased
// first (a lower-case letter would otherwise fall back to '?'). When
// `outline` is given, the glyphs are first drawn in the outline colour
// shifted in 8 directions, so the text reads on any background (the judge
// sees the picture shrunk to 480 px, so the letters are drawn big and
// outlined).
function drawText(text: string, cx: number, y: number, scale: number, c: RGB, outline?: RGB): void {
  text = text.toUpperCase();
  const w = textWidth(text, scale);
  const x0 = Math.round(cx - w / 2);
  if (outline) {
    const o = Math.max(2, Math.round(scale * 0.25));
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]]) {
      let x = x0 + dx;
      for (const ch of text) {
        drawGlyph(ch, x, y + dy, scale, outline);
        x += 6 * scale;
      }
    }
  }
  let x = x0;
  for (const ch of text) {
    drawGlyph(ch, x, y, scale, c);
    x += 6 * scale;
  }
}

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------

const SKY_STOPS: Array<[number, RGB]> = [
  [0, [22, 10, 46]],
  [300, [91, 42, 134]],
  [520, [201, 75, 124]],
  [650, [255, 126, 95]],
  [700, [255, 179, 71]],
];

function skyColorAt(y: number): RGB {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [y0, c0] = SKY_STOPS[i];
    const [y1, c1] = SKY_STOPS[i + 1];
    if (y >= y0 && y <= y1) return lerpColor(c0, c1, (y - y0) / (y1 - y0));
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

function drawSky(): void {
  for (let y = 0; y < 780; y++) fillRect(0, y, W, 1, skyColorAt(y));
}

function drawSun(): void {
  const cx = 540;
  const cy = 540;
  const r = 200;
  // Vertical gradient: yellow at the top, hot pink at the bottom.
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
    const f = (y - (cy - r)) / (2 * r);
    fillRect(cx - hw, y, hw * 2, 1, lerpColor([255, 211, 25], [255, 41, 117], f));
  }
  // Retro slats: horizontal cuts across the sun's lower half, widening
  // towards the bottom, in the sky colour at that height.
  let y = cy + 20;
  let gap = 6;
  while (y < cy + r) {
    fillRect(cx - r, y, r * 2, gap, skyColorAt(y));
    y += gap + 26;
    gap += 5;
  }
}

function drawSkyline(): void {
  const base = 700;
  let x = 0;
  while (x < W) {
    const bw = 60 + Math.floor(rnd() * 70);
    const bh = 70 + Math.floor(rnd() * 130);
    fillRect(x, base - bh, bw, bh, [42, 15, 61]);
    // A few lit windows, deterministic via the fixed-seed generator.
    for (let wy = base - bh + 12; wy < base - 14; wy += 22) {
      for (let wx = x + 10; wx < x + bw - 12; wx += 20) {
        if (rnd() < 0.35) fillRect(wx, wy, 8, 10, [255, 211, 25]);
      }
    }
    x += bw + Math.floor(rnd() * 14);
  }
  fillRect(0, base, W, 4, [255, 41, 117]);
}

function drawGrid(): void {
  // Neon perspective grid on the ground strip, 700..780.
  const pink: RGB = [255, 41, 117];
  for (const y of [700, 712, 728, 748, 772]) drawLine(0, y, W, y, 2, pink, 0.55);
  for (let i = -10; i <= 10; i++) drawLine(540, 700, 540 + i * 150, 780, 2, pink, 0.45);
}

// A quadratic Bezier curve, drawn as a chain of discs.
function drawCurve(
  x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number, c: RGB, a = 1,
): void {
  for (let i = 0; i <= 28; i++) {
    const f = i / 28;
    const x = (1 - f) * (1 - f) * x0 + 2 * (1 - f) * f * cx + f * f * x1;
    const y = (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * cy + f * f * y1;
    fillDisc(x, y, t / 2, c, a);
  }
}

function drawPalm(bx: number, topY: number, lean: number): void {
  const dark: RGB = [26, 11, 46];
  const topX = bx + lean;
  // Curved trunk: a dense chain of discs along a quadratic curve, so the
  // trunk reads as one smooth stem instead of beads.
  for (let i = 0; i <= 60; i++) {
    const f = i / 60;
    const x = (1 - f) * (1 - f) * bx + 2 * (1 - f) * f * (bx + lean * 0.4) + f * f * topX;
    const y = (1 - f) * (1 - f) * 780 + 2 * (1 - f) * f * 600 + f * f * topY;
    fillDisc(x, y, 10 - f * 3, dark);
  }
  // Fronds: smooth drooping arcs from the crown.
  const fronds: Array<[number, number, number, number]> = [
    [-150, 30, -170, 110], [-115, -25, -140, 60], [-60, -60, -75, 25],
    [5, -75, 10, 10], [65, -55, 85, 30], [120, -15, 145, 65], [155, 40, 175, 115],
  ];
  for (const [cx, cy, ex, ey] of fronds) {
    drawCurve(topX, topY, topX + cx, topY + cy, topX + ex, topY + ey, 9, dark);
  }
  fillDisc(topX, topY, 16, dark);
}

// The make.fun ghost: white body with a wavy hem, black sunglasses, a
// smile, and a gold chain with a "$" medallion.
function drawGhost(): void {
  const cx = 540;
  const top = 300;
  const cy = 470; // centre of the head semicircle
  const r = 170;
  const bottom = 660;
  const outline: RGB = [26, 11, 46];
  const white: RGB = [255, 255, 255];

  const hemY = (dx: number): number => {
    const phase = (((dx + r) / (2 * r / 3)) % 1 + 1) % 1;
    return bottom - 26 * Math.sin(Math.PI * phase);
  };
  const inside = (x: number, y: number, rr: number): boolean => {
    const dx = x - cx;
    if (Math.abs(dx) > rr) return false;
    if (y < cy) {
      const dy = y - cy;
      return dx * dx + dy * dy <= rr * rr;
    }
    return y <= hemY(dx * (r / rr));
  };
  for (let y = top - 8; y <= bottom; y++) {
    for (let x = cx - r - 8; x <= cx + r + 8; x++) {
      if (inside(x, y, r + 8)) setPixel(x, y, outline);
    }
  }
  for (let y = top; y <= bottom; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (inside(x, y, r)) setPixel(x, y, white);
    }
  }
  // Sunglasses.
  const black: RGB = [12, 8, 20];
  fillRect(448, 408, 86, 54, black);
  fillRect(546, 408, 86, 54, black);
  fillRect(530, 426, 16, 14, black);
  fillRect(458, 416, 22, 10, [255, 255, 255]);
  fillRect(556, 416, 22, 10, [255, 255, 255]);
  // Smile (wide, clear of the medallion below it).
  for (let deg = 20; deg <= 160; deg++) {
    const a = (deg * Math.PI) / 180;
    fillDisc(cx + 58 * Math.cos(a), 478 + 42 * Math.sin(a), 5, black);
  }
  // Gold chain + "$" medallion.
  const gold: RGB = [255, 211, 25];
  for (let deg = 25; deg <= 155; deg++) {
    const a = (deg * Math.PI) / 180;
    fillDisc(cx + 145 * Math.cos(a), 400 + 145 * Math.sin(a), 6, gold);
  }
  fillDisc(cx, 575, 30, gold);
  fillDisc(cx, 575, 30, gold);
  drawText('$', cx, 561, 4, black);
}

function drawScene(): void {
  drawSky();
  drawSun();
  drawSkyline();
  drawGrid();
  drawPalm(95, 430, -35);
  drawPalm(985, 450, 35);
  drawGhost();
  // Top caption.
  drawText('THE BIGGEST HEIST', 540, 56, 10, [255, 255, 255], [12, 8, 20]);
  drawText('WASN\'T IN THE GAME', 540, 156, 10, [255, 255, 255], [12, 8, 20]);
  // Bottom band + punchline + wordmark.
  fillRect(0, 780, W, 300, [20, 8, 42]);
  fillRect(0, 780, W, 6, [255, 41, 117]);
  drawText('MY AGENT PULLED IT', 540, 812, 10, [255, 211, 25], [12, 8, 20]);
  drawText('ON MAKE.FUN', 540, 912, 10, [255, 255, 255], [12, 8, 20]);
  fillRect(390, 1000, 300, 56, [255, 41, 117]);
  drawText('LEGAL!', 540, 1012, 5, [255, 255, 255]);
}

// ---------------------------------------------------------------------------
// Minimal deterministic PNG encoder (RGBA, 8-bit, zlib level 9)
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

drawScene();
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'meme.png'), encodePng());
try {
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
console.log('wrote meme.png and POST.json to ' + OUTPUT_DIR);
