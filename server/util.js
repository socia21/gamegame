'use strict';
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(ix, iy, seed) { let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed, oct = 4) { let s = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, seed + i * 131); n += amp; amp *= 0.5; f *= 2; } return s / n; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function pickW(rng, arr) { let t = 0; for (const e of arr) t += e[1]; let r = rng() * t; for (const e of arr) { r -= e[1]; if (r <= 0) return e[0]; } return arr[arr.length - 1][0]; }
function circleRect(cx, cy, r, rx, ry, rw, rh) { const nx = cx < rx ? rx : cx > rx + rw ? rx + rw : cx; const ny = cy < ry ? ry : cy > ry + rh ? ry + rh : cy; const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy < r * r; }

// Rebuilt-every-tick spatial hash for moving things (zombies, vehicles)
class Hash {
  constructor(c) { this.c = c; this.m = new Map(); }
  clear() { this.m.clear(); }
  add(o) { const k = Math.floor(o.x / this.c) * 65536 + Math.floor(o.y / this.c); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(o); }
  query(x, y, r, out) {
    const c = this.c, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = this.m.get(cx * 65536 + cy); if (a) for (let i = 0; i < a.length; i++) out.push(a[i]); }
    return out;
  }
}
// Persistent index for things that rarely move (items, structures)
class Index {
  constructor(c) { this.c = c; this.m = new Map(); }
  add(o) { o._k = Math.floor(o.x / this.c) * 65536 + Math.floor(o.y / this.c); let s = this.m.get(o._k); if (!s) { s = new Set(); this.m.set(o._k, s); } s.add(o); }
  remove(o) { const s = this.m.get(o._k); if (s) { s.delete(o); if (!s.size) this.m.delete(o._k); } }
  query(x, y, r, out) {
    const c = this.c, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const s = this.m.get(cx * 65536 + cy); if (s) for (const o of s) out.push(o); }
    return out;
  }
}
// Static grid of map rectangles (buildings, walls)
class RectGrid {
  constructor(rects, cell) {
    this.c = cell; this.r = rects; this.m = new Map(); this.stamp = new Uint32Array(rects.length); this.q = 0;
    rects.forEach((R, i) => {
      for (let cx = Math.floor(R[0] / cell); cx <= Math.floor((R[0] + R[2]) / cell); cx++)
        for (let cy = Math.floor(R[1] / cell); cy <= Math.floor((R[1] + R[3]) / cell); cy++) { const k = cx * 65536 + cy; let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(i); }
    });
  }
  query(x0, y0, x1, y1, out) {
    this.q = (this.q + 1) >>> 0; if (this.q === 0) { this.stamp.fill(0); this.q = 1; }
    const c = this.c;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++) for (let cy = Math.floor(y0 / c); cy <= Math.floor(y1 / c); cy++) {
      const a = this.m.get(cx * 65536 + cy); if (!a) continue;
      for (const i of a) if (this.stamp[i] !== this.q) { this.stamp[i] = this.q; out.push(this.r[i]); }
    }
    return out;
  }
}
module.exports = {mulberry32, hash2, vnoise, fbm, clamp, angDiff, pickW, circleRect, Hash, Index, RectGrid};
