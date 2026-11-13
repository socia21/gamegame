'use strict';
// Procedural world: 400×400 tiles × 80px = 32,000 × 32,000 px (≈ 2.5 minutes to cross on foot).
// 25 themed regions; every place from your lists is built as a landmark inside a matching region.
const {mulberry32, fbm, vnoise, clamp} = require('./util');
const {T} = require('./data/tiles');
const PLACES = require('./data/places');
const {PLOTS} = require('./data/shelter');
const {RAID_BUNKERS} = require('./data/interiors');

const W = 400, H = 400, TS = 80, RS = 80;
const THEMES = [
  ['alpine', 'alpine', 'volcanic', 'karst', 'coast'],
  ['rural', 'historic', 'historic', 'culture', 'coast'],
  ['rural', 'gov', 'city', 'city', 'sports'],
  ['desert', 'rural', 'city', 'culture', 'sports'],
  ['saltflat', 'canyon', 'lakes', 'sports', 'reef'],
];
const RNAMES = [
  ['Himalayan Heights', 'Glacier Reach', 'Ring of Fire', 'Karst Labyrinth', 'Fjordland'],
  ['Terrace Valleys', 'Old World', 'Imperial Quarter', 'Museum Mile', 'Northern Cliffs'],
  ['Windmill Plains', 'Capitol District', 'Downtown', 'Global Gateway', 'Stadium City'],
  ['Dune Sea', 'Farmlands', 'Harbour City', 'Culture Coast', 'Arena Row'],
  ['Salt Wastes', 'Canyonlands', 'Lake District', 'Speedway & Links', 'Coral Archipelago'],
];
const WILD = new Set(['alpine', 'volcanic', 'karst', 'coast', 'desert', 'saltflat', 'canyon', 'lakes', 'reef']);
const SIZE = {stadium:[12,10],arena:[8,7],court:[6,5],circuit:[20,13],golf:[14,13],airport:[28,12],building:[5,4],big:[7,5],bank:[6,5],capitol:[8,6],
  mall:[10,8],park:[10,10],zoo:[11,10],market:[9,7],complex:[10,8],fort:[10,10],palace:[10,8],cathedral:[7,5],pyramid:[7,7],amphi:[10,8],mosque:[7,7],
  rockcut:[8,7],temple:[6,5],mausoleum:[7,7],aqueduct:[16,2],terrace:[10,8],stepwell:[6,6],estate:[10,9],monastery:[8,8],silo:[8,6],dam:[12,10],green:[8,8],
  windmill:[9,7],busterminal:[9,7],waterfront:[12,8],aquarium:[8,6],
  mountain:[16,16],glacier:[14,12],subglacial:[11,10],pass:[14,9],canyon:[22,8],plateau:[14,14],desert:[16,14],volcano:[14,14],geyser:[9,9],karst:[13,12],
  cenote:[8,8],delta:[15,14],lagoon:[15,12],lake:[13,11],cliff:[16,6],fjord:[20,6],saltflat:[17,15],saltlake:[11,10],waterfall:[10,10],reef:[13,13],strait:[26,9]};
const ROT = new Set(['aqueduct', 'canyon', 'cliff', 'fjord', 'strait', 'pass']);
const BUILD_STYLE = {'Police HQ':'police','Fire Station':'fire','High Court':'court','Art Museum':'museum','Science Centre':'science','National Archive':'archive',
  'Post Office':'post','International HQ':'intl','State Secretariat':'gov','Municipal Office':'civic','Revenue Authority':'gov','Electoral Commission':'civic',
  'Land Registry':'civic','Audit Office':'gov','Central Bank':'bank','Parliament':'capitol'};

function generateMap(seed) {
  const rng = mulberry32(seed);
  const R = (a, b) => a + rng() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1)), pick = (a) => a[Math.floor(rng() * a.length)];
  const tiles = new Uint8Array(W * H), region = new Uint8Array(W * H), occ = new Uint8Array(W * H), road = new Uint8Array(W * H);
  const rects = [], styles = [], styleIdx = {}, landmarks = [], loot = [], vspawns = [], zones = [];
  const idx = (x, y) => y * W + x, inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, t) => { x = Math.floor(x); y = Math.floor(y); if (inb(x, y)) tiles[idx(x, y)] = t; };
  const get = (x, y) => inb(x, y) ? tiles[idx(x, y)] : T.DEEP;
  const fill = (x, y, w, h, t) => { for (let j = Math.floor(y); j < y + h; j++) for (let i = Math.floor(x); i < x + w; i++) set(i, j, t); };
  const ell = (cx, cy, rx, ry, t, nz = 0, ns = 0, only) => {
    for (let j = Math.floor(cy - ry - 2); j <= cy + ry + 2; j++) for (let i = Math.floor(cx - rx - 2); i <= cx + rx + 2; i++) {
      if (!inb(i, j)) continue; const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry; let d = dx * dx + dy * dy;
      if (nz) d += (vnoise(i * 0.35, j * 0.35, seed + ns) - 0.5) * nz;
      if (d < 1 && (!only || only(tiles[idx(i, j)]))) tiles[idx(i, j)] = t;
    }
  };
  const sty = s => { if (styleIdx[s] === undefined) { styleIdx[s] = styles.length; styles.push(s); } return styleIdx[s]; };
  const rect = (px, py, pw, ph, s) => { if (pw > 4 && ph > 4) rects.push([Math.round(px), Math.round(py), Math.round(pw), Math.round(ph), sty(s)]); };
  const lp = (px, py, tag, locked) => loot.push([Math.round(px), Math.round(py), tag, locked ? 1 : 0]);
  const vs = (px, py, a, pool) => vspawns.push([Math.round(px), Math.round(py), +(+a).toFixed(2), pool]);
  const P = v => v * TS;
  const themeOf = r => THEMES[Math.floor(r / 5)][r % 5];
  const walls = (x0, y0, x1, y1, th, gates, s) => {
    const g = 2 * TS, Wd = x1 - x0, Hd = y1 - y0;
    const side = (ax, ay, len, horiz, gate) => {
      if (!gate) { horiz ? rect(ax, ay, len, th, s) : rect(ax, ay, th, len, s); return; }
      const a = (len - g) / 2;
      if (horiz) { rect(ax, ay, a, th, s); rect(ax + a + g, ay, a, th, s); } else { rect(ax, ay, th, a, s); rect(ax, ay + a + g, th, a, s); }
    };
    side(x0, y0, Wd, true, gates.t); side(x0, y1 - th, Wd, true, gates.b);
    side(x0, y0 + th, Hd - 2 * th, false, gates.l); side(x1 - th, y0 + th, Hd - 2 * th, false, gates.r);
  };

  // ── regions (with wobbly borders) ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + (fbm(x * 0.025, y * 0.025, seed + 11, 3) - 0.5) * 22, wy = y + (fbm(x * 0.025, y * 0.025, seed + 23, 3) - 0.5) * 22;
    region[idx(x, y)] = clamp(Math.floor(wy / RS), 0, 4) * 5 + clamp(Math.floor(wx / RS), 0, 4);
  }
  // ── base terrain (elevation + moisture topography) ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), th = themeOf(region[i]);
    const n = fbm(x * 0.045, y * 0.045, seed + 1, 4);
    const m = fbm(x * 0.11, y * 0.11, seed + 2, 3);
    const elev = fbm(x * 0.022, y * 0.022, seed + 37, 4);
    const ridge = 1 - Math.abs(fbm(x * 0.032, y * 0.032, seed + 61, 3) * 2 - 1);
    const micro = vnoise(x * 0.24, y * 0.24, seed + 83);
    let t;
    switch (th) {
      case 'alpine':
        t = (elev > 0.66 || ridge > 0.88) ? (elev > 0.72 ? T.SNOW : T.ROCK)
          : n > 0.56 ? (m > 0.68 ? T.ICE : T.SNOW)
          : (m > 0.54 ? T.FOREST : (elev < 0.34 && m > 0.45 ? T.SHALLOW : T.GRASS));
        break;
      case 'volcanic':
        t = (ridge > 0.87 && elev > 0.55) ? T.LAVA
          : (n > 0.64 || elev > 0.68) ? T.ROCK
          : m > 0.82 ? T.LAVA : m < 0.3 ? T.GRASS : T.DIRT;
        break;
      case 'karst':
        t = ((m > 0.68 && n > 0.42) || ridge > 0.89) ? T.ROCK
          : n < 0.31 ? T.SHALLOW
          : m < 0.45 ? T.FOREST : (elev < 0.3 ? T.SWAMP : T.GRASS);
        break;
      case 'coast':
        t = (n > 0.67 || ridge > 0.88) ? T.ROCK
          : elev < 0.28 ? T.SAND
          : m > 0.56 ? T.FOREST : T.GRASS;
        break;
      case 'desert': {
        const oasis = elev < 0.22 && m > 0.66;
        t = oasis ? (elev < 0.17 ? T.SHALLOW : T.GRASS)
          : (n > 0.72 || ridge > 0.90) ? T.ROCK
          : (m > 0.52 || micro > 0.68) ? T.DUNE : T.SAND;
        break;
      }
      case 'saltflat':
        t = ridge > 0.91 ? T.ROCK : n > 0.4 ? T.SALT : T.SAND;
        break;
      case 'canyon':
        t = (n > 0.63 || ridge > 0.84) ? T.ROCK
          : elev < 0.28 ? T.SAND : (m > 0.68 ? T.GRASS : T.DIRT);
        break;
      case 'lakes':
        t = (n < 0.31 || elev < 0.27) ? T.DEEP
          : n < 0.38 ? T.SHALLOW
          : m > 0.60 ? T.SWAMP
          : m > 0.48 ? T.FOREST : T.GRASS;
        break;
      case 'reef':
        t = n > 0.65 ? (m > 0.56 ? T.FOREST : T.SAND) : n > 0.56 ? T.SHALLOW : T.DEEP;
        break;
      case 'rural':
        t = (ridge > 0.92 && elev > 0.64) ? T.ROCK
          : elev < 0.25 && m > 0.62 ? T.SHALLOW
          : m > 0.55 ? T.FARM : m < 0.28 ? T.FOREST : T.GRASS;
        break;
      case 'historic':
        t = ridge > 0.91 ? T.ROCK : m > 0.68 ? T.FOREST : m > 0.55 ? T.DIRT : T.GRASS;
        break;
      case 'sports':
        t = m > 0.6 ? T.GRASS : T.CONCRETE;
        break;
      default:
        t = m > 0.72 ? T.GRASS : T.CONCRETE;
    }
    // meandering rivers with sandy/gravel banks
    const rv = Math.abs(fbm(x * 0.012, y * 0.012, seed + 99, 3) - 0.5);
    if (th !== 'reef') {
      if (rv < 0.011) t = (th === 'desert' || th === 'saltflat') ? T.DIRT : (rv < 0.0052 ? T.DEEP : T.SHALLOW);
      else if (rv < 0.0185 && t !== T.ROCK && t !== T.CONCRETE && t !== T.LAVA) t = (th === 'lakes' || m > 0.62) ? T.SWAMP : T.SAND;
    }
    // ocean border
    const e = Math.min(x, y, W - 1 - x, H - 1 - y) + (vnoise(x * 0.08, y * 0.08, seed + 5) - 0.5) * 8;
    if (e < 6) t = T.DEEP; else if (e < 8.5) t = T.SHALLOW; else if (e < 11) t = (th === 'coast' && n > 0.5) ? T.ROCK : T.SAND;
    tiles[i] = t;
  }
  // ── road network ──
  const HW = [40, 120, 200, 280, 360];
  for (const c of HW) for (let k = 13; k < W - 13; k++) for (let d = -1; d <= 1; d++) { road[idx(k, c + d)] = 1; road[idx(c + d, k)] = 1; }
  for (let r = 0; r < 25; r++) {
    const th = themeOf(r); const step = (th === 'city' || th === 'gov' || th === 'culture') ? 16 : th === 'sports' ? 20 : 0; if (!step) continue;
    const rx0 = (r % 5) * RS, ry0 = Math.floor(r / 5) * RS;
    for (let g = 8; g < RS; g += step) for (let j = 2; j < RS - 2; j++) for (let d = 0; d < 2; d++) {
      if (inb(rx0 + g + d, ry0 + j) && !road[idx(rx0 + g + d, ry0 + j)]) road[idx(rx0 + g + d, ry0 + j)] = 2;
      if (inb(rx0 + j, ry0 + g + d) && !road[idx(rx0 + j, ry0 + g + d)]) road[idx(rx0 + j, ry0 + g + d)] = 2;
    }
  }
  for (let i = 0; i < W * H; i++) if (road[i] === 1) occ[i] = 1;

  // ── landmark builders ──
  const lm = (it, tx, ty, w, h) => landmarks.push([it.name, it.pc.cat, Math.round(P(tx + w / 2)), Math.round(P(ty + h / 2)), it.pc.kind]);
  const around = (tx, ty, w, h, tag, n = 4) => {
    const pts = [[P(tx) + 40, P(ty + h / 2)], [P(tx + w) - 40, P(ty + h / 2)], [P(tx + w / 2), P(ty) + 40], [P(tx + w / 2), P(ty + h) - 40], [P(tx) + 40, P(ty) + 40], [P(tx + w) - 40, P(ty + h) - 40], [P(tx + w) - 40, P(ty) + 40], [P(tx) + 40, P(ty + h) - 40]];
    for (let i = 0; i < n && i < pts.length; i++) lp(pts[i][0], pts[i][1], tag);
  };
  const scatter = (tx, ty, w, h, tag, n) => { for (let i = 0; i < n; i++) lp(P(tx + R(0.6, w - 0.6)), P(ty + R(0.6, h - 0.6)), tag); };
  const vehFor = (tag, tx, ty, w, h) => {
    const x = P(tx) + 40, y = P(ty + h) - 40, x2 = P(tx + w) - 40;
    if (tag === 'police') { vs(x, y, 0, ['police']); vs(x2, y, Math.PI, ['police', 'suv']); }
    else if (tag === 'fire') { vs(x, y, 0, ['firetruck']); vs(x2, y, Math.PI, ['ambulance']); }
    else if (tag === 'military') { vs(x, y, 0, ['humvee']); vs(x2, y, Math.PI, ['apc', 'humvee']); if (rng() < 0.45) vs(P(tx + w / 2), P(ty) + 40, 0, ['tank']); if (rng() < 0.3) vs(x, P(ty) + 40, 0, ['himars']); }
    else if (tag === 'gov') vs(x, y, 0, ['suv', 'sedan', 'sportscar']);
    else if (rng() < 0.5) vs(x, y, 0, ['sedan', 'suv', 'pickup', 'motorcycle']);
  };
  const BUILD = {
    stadium(tx, ty, w, h, it, o = {}) {
      fill(tx, ty, w, h, o.base !== undefined ? o.base : T.CONCRETE);
      let inner = o.inner !== undefined ? o.inner : T.TURF; const n = it.name;
      if (/Wimbledon/.test(n)) inner = T.GREEN; if (/Chatrier|Lenglen|Foro Italico|Rainier/.test(n)) inner = T.DIRT;
      fill(tx + 2, ty + 2, w - 4, h - 4, inner);
      const x0 = P(tx + 1), y0 = P(ty + 1), x1 = P(tx + w - 1), y1 = P(ty + h - 1);
      walls(x0, y0, x1, y1, o.th || 40, o.gates || {t: 1, b: 1, l: 1, r: 1}, o.style || 'stand');
      const tag = it.pc.loot;
      lp(x0 + 110, y0 + 110, tag); lp(x1 - 110, y0 + 110, tag); lp(x0 + 110, y1 - 110, tag); lp(x1 - 110, y1 - 110, tag); lp((x0 + x1) / 2, (y0 + y1) / 2, tag);
      lp(P(tx) + 40, P(ty + h / 2), tag); lp(P(tx + w) - 40, P(ty + h / 2), tag);
      vs(P(tx + 1.5), P(ty + h) - 40, 0, ['sedan', 'suv', 'pickup', 'bus']); vs(P(tx + w - 1.5), P(ty) + 40, Math.PI, ['sedan', 'sportscar', 'motorcycle']);
      lm(it, tx, ty, w, h);
    },
    arena(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 34, inner: /Hockey/.test(it.pc.cat) ? T.ICE : T.TURF}); },
    court(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 30, gates: {t: 1, b: 1}}); },
    amphi(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 50, base: T.DIRT, inner: T.SAND, style: 'stone', gates: {l: 1, r: 1}}); },
    circuit(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      const L = tx + 2, Rr = tx + w - 3, Tt = ty + 2, B = ty + h - 3;
      for (let i = L; i <= Rr; i++) { set(i, Tt, T.TRACK); set(i, Tt + 1, T.TRACK); set(i, B, T.TRACK); set(i, B - 1, T.TRACK); }
      for (let j = Tt; j <= B; j++) { set(L, j, T.TRACK); set(L + 1, j, T.TRACK); set(Rr, j, T.TRACK); set(Rr - 1, j, T.TRACK); }
      const mx = Math.floor((L + Rr) / 2); for (let j = Tt; j <= B; j++) set(mx, j, T.TRACK);
      rect(P(L + 3), P(Tt + 2) + 10, P(Math.min(4, mx - L - 3)), P(1) - 20, 'pit');
      vs(P(L + 3), P(Tt) + 80, 0, ['f1']); vs(P(L + 5), P(Tt) + 80, 0, ['f1']); vs(P(L + 7), P(Tt) + 80, 0, ['sportscar', 'f1']); vs(P(Rr - 2), P(B) + 0, Math.PI, ['sportscar']);
      lp(P(L + 3), P(Tt + 3) + 40, 'circuit'); lp(P(L + 5), P(Tt + 3) + 40, 'circuit'); lp(P(mx + 2), P(Tt + 4), 'circuit');
      lm(it, tx, ty, w, h);
    },
    golf(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      for (let k = 0; k < 4; k++) ell(tx + R(3, w - 3), ty + R(3, h - 3), R(1.8, 3.2), R(1.2, 2.2), T.GREEN);
      for (let k = 0; k < 3; k++) ell(tx + R(2, w - 2), ty + R(2, h - 2), 1, 0.8, T.SAND);
      ell(tx + R(4, w - 4), ty + R(4, h - 4), 1.8, 1.4, T.SHALLOW);
      for (let i = tx; i < tx + w; i++) { if (rng() < 0.4) set(i, ty, T.FOREST); if (rng() < 0.4) set(i, ty + h - 1, T.FOREST); }
      rect(P(tx + 1) + 10, P(ty + 1) + 10, P(2) - 20, P(1.4), 'club');
      vs(P(tx + 3.5), P(ty + 1.5), 0, ['golfcart']); vs(P(tx + 3.5), P(ty + 2.3), 0, ['golfcart']);
      lp(P(tx + 1.5), P(ty + 2.8), 'golf'); lp(P(tx + 2.8), P(ty + 2.8), 'golf'); scatter(tx, ty, w, h, 'golf', 2);
      lm(it, tx, ty, w, h);
    },
    airport(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); fill(tx + 1, ty + 2, w - 2, 2, T.RUNWAY); fill(tx + 3, ty + 5, w - 6, 1, T.ROAD);
      rect(P(tx + 2), P(ty + h - 4), P(10), P(3) - 20, 'terminal'); rect(P(tx + w - 8), P(ty + h - 4), P(3), P(3) - 20, 'hangar'); rect(P(tx + w - 4), P(ty + h - 4), P(3), P(3) - 20, 'hangar');
      vs(P(tx + 15), P(ty + 7), 0, ['heli']); vs(P(tx + 18), P(ty + 7), 0, ['heli']); vs(P(tx + 4), P(ty + 7), 0, ['bus']); vs(P(tx + 7), P(ty + 7), 0, ['suv', 'sedan']);
      for (let k = 0; k < 5; k++) lp(P(tx + 3 + k * 2), P(ty + h - 4) - 40, 'airport');
      lp(P(tx + w - 6.5), P(ty + h - 4) - 40, 'airport'); lp(P(tx + w - 2.5), P(ty + h - 4) - 40, 'military');
      lm(it, tx, ty, w, h);
    },
    building(tx, ty, w, h, it, style) {
      fill(tx, ty, w, h, T.CONCRETE);
      rect(P(tx + 1), P(ty + 1), P(w - 2), P(h - 2), style || BUILD_STYLE[it.pc.cat] || 'b');
      around(tx, ty, w, h, it.pc.loot, 5);
      if (/Parliament|Central Bank/.test(it.pc.cat) || /NATO|Pentagon|Federal Reserve|Bank of England/.test(it.name)) lp(P(tx + w) - 40, P(ty) + 40, 'vault', 1);
      if (it.pc.cat === 'Science Centre' && rng() < 0.5) zones.push(['toxic', Math.round(P(tx + w / 2)), Math.round(P(ty + h)), 260]);
      vehFor(it.pc.loot, tx, ty, w, h);
      lm(it, tx, ty, w, h);
    },
    big(tx, ty, w, h, it) { BUILD.building(tx, ty, w, h, it); },
    bank(tx, ty, w, h, it) { BUILD.building(tx, ty, w, h, it, 'bank'); lp(P(tx) + 40, P(ty) + 40, 'vault', 1); },
    capitol(tx, ty, w, h, it) { BUILD.building(tx, ty, w, h, it, 'capitol'); },
    mall(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 1), P(ty + 1), P(w - 2), P(h - 4), it.pc.cat === 'Convention Centre' ? 'hall' : 'mall');
      for (let k = 0; k < 3; k++) vs(P(tx + 2 + k * 2.5), P(ty + h - 1.5), Math.PI / 2, ['sedan', 'suv', 'pickup', 'sportscar']);
      for (let k = 0; k < 4; k++) lp(P(tx + 1.5 + k * 2), P(ty + h - 3) + 40, it.pc.loot);
      lp(P(tx) + 40, P(ty + 2), it.pc.loot); lp(P(tx + w) - 40, P(ty + 2), it.pc.loot);
      lm(it, tx, ty, w, h);
    },
    park(tx, ty, w, h, it, zoo) {
      fill(tx, ty, w, h, T.GRASS);
      for (let k = 0; k < 5; k++) ell(tx + R(1, w - 1), ty + R(1, h - 1), R(1, 2.2), R(1, 2.2), T.FOREST);
      fill(tx, ty + Math.floor(h / 2), w, 1, T.DIRT); fill(tx + Math.floor(w / 2), ty, 1, h, T.DIRT);
      if (zoo) {
        for (const [ex, ey] of [[tx + 1, ty + 1], [tx + w / 2 + 1, ty + 1], [tx + 1, ty + h / 2 + 1]]) walls(P(ex), P(ey), P(ex + w / 2 - 2), P(ey + h / 2 - 2), 8, {b: 1}, 'fence');
        rect(P(tx + w / 2 + 1), P(ty + h / 2 + 1), P(2), P(1.4), 'b');
      } else { rect(P(tx + 1), P(ty + 1), P(2.4), P(1.6), 'glass'); rect(P(tx + w - 3.5), P(ty + h - 2.8), P(2.4), P(1.6), 'glass'); }
      scatter(tx, ty, w, h, it.pc.loot, 5); lm(it, tx, ty, w, h);
    },
    zoo(tx, ty, w, h, it) { BUILD.park(tx, ty, w, h, it, true); },
    market(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      for (let i = tx + 1; i < tx + w - 1.4; i += 1.5) for (let j = ty + 1; j < ty + h - 1.4; j += 1.6) if (rng() < 0.8) rect(P(i) + 10, P(j) + 10, 56, 46, 'stall');
      scatter(tx, ty, w, h, it.pc.loot, 10); vs(P(tx) + 40, P(ty + h) - 40, 0, ['pickup', 'motorcycle', 'quad']); lm(it, tx, ty, w, h);
    },
    complex(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); fill(tx + 1, ty + 1, w - 2, h - 2, T.GRASS);
      const bw = (w - 2) / 3, bh = (h - 2) / 2;
      const st = it.pc.cat === 'University Campus' ? 'campus' : it.pc.cat === 'Olympic Park' ? 'hall' : 'embassy';
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) rect(P(tx + 1 + c * bw) + 24, P(ty + 1 + r * bh) + 24, P(bw) - 48, P(bh) - 48, st);
      for (let c = 0; c < 3; c++) lp(P(tx + 1 + c * bw + bw / 2), P(ty + 1 + bh), it.pc.loot);
      around(tx, ty, w, h, it.pc.loot, 4); vehFor(it.pc.loot, tx, ty, w, h); lm(it, tx, ty, w, h);
    },
    fort(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.DIRT);
      walls(P(tx + 0.5), P(ty + 0.5), P(tx + w - 0.5), P(ty + h - 0.5), 50, {b: 1}, 'fortwall');
      for (const [cx, cy] of [[tx + 0.5, ty + 0.5], [tx + w - 0.5, ty + 0.5], [tx + 0.5, ty + h - 0.5], [tx + w - 0.5, ty + h - 0.5]]) rect(P(cx) - 55, P(cy) - 55, 110, 110, 'tower');
      rect(P(tx + w / 2 - 1.5), P(ty + h / 2 - 2), P(3), P(3), 'keep');
      lp(P(tx + 2), P(ty + 2), 'military'); lp(P(tx + w - 2), P(ty + 2), 'military'); lp(P(tx + 2), P(ty + h - 2), 'historic'); lp(P(tx + w - 2), P(ty + h - 2), 'museum');
      if (it.pc.loot === 'military') { vs(P(tx + 2.5), P(ty + h / 2 + 1), Math.PI / 2, ['humvee', 'apc']); if (rng() < 0.5) vs(P(tx + w - 2.5), P(ty + h / 2 + 1), Math.PI / 2, ['tank', 'himars']); }
      lm(it, tx, ty, w, h);
    },
    palace(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      for (let i = tx; i < tx + w; i++) { if (i % 3) { set(i, ty, T.FOREST); set(i, ty + h - 1, T.FOREST); } }
      rect(P(tx + 2), P(ty + 1.5), P(w - 4), P(h - 5), it.name === 'The Forbidden City' ? 'pagoda' : 'palace');
      ell(tx + w / 2, ty + h - 2, 1.3, 0.8, T.SHALLOW);
      around(tx, ty, w, h, it.pc.loot, 6); lp(P(tx + w / 2) - 160, P(ty + h - 2), it.pc.loot);
      vs(P(tx + 1.5), P(ty + h - 1.5), 0, ['sportscar', 'suv']); lm(it, tx, ty, w, h);
    },
    cathedral(tx, ty, w, h, it) { fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 1), P(ty + 1), P(w - 2), P(h - 2), 'church'); around(tx, ty, w, h, it.pc.loot, 4); lm(it, tx, ty, w, h); },
    temple(tx, ty, w, h, it) { fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 1), P(ty + 1), P(w - 2), P(h - 2), 'temple'); around(tx, ty, w, h, it.pc.loot, 4); lm(it, tx, ty, w, h); },
    pyramid(tx, ty, w, h, it) { fill(tx, ty, w, h, T.SAND); rect(P(tx + 1), P(ty + 1), P(w - 2), P(h - 2), 'pyramid'); around(tx, ty, w, h, 'museum', 5); lp(P(tx + w / 2), P(ty + h) - 40, 'vault', 1); lm(it, tx, ty, w, h); },
    mosque(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 1.5), P(ty + 1.5), P(w - 3), P(h - 3), 'mosque');
      for (const [cx, cy] of [[tx + 0.75, ty + 0.75], [tx + w - 0.75, ty + 0.75], [tx + 0.75, ty + h - 0.75], [tx + w - 0.75, ty + h - 0.75]]) rect(P(cx) - 20, P(cy) - 20, 40, 40, 'minaret');
      lp(P(tx + w / 2), P(ty) + 40, it.pc.loot); lp(P(tx + w / 2), P(ty + h) - 40, it.pc.loot); lp(P(tx) + 40, P(ty + h / 2), it.pc.loot); lm(it, tx, ty, w, h);
    },
    rockcut(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.ROCK); fill(tx + 2, ty + 2, w - 4, h - 4, T.DIRT); fill(tx + Math.floor(w / 2) - 1, ty + h - 2, 2, 2, T.DIRT);
      rect(P(tx + 3), P(ty + 2) + 10, P(w - 6), P(1) - 20, 'temple');
      lp(P(tx + 2.5), P(ty + h - 3), 'museum'); lp(P(tx + w - 2.5), P(ty + h - 3), 'museum'); lp(P(tx + w / 2), P(ty + 3.5), 'museum'); lm(it, tx, ty, w, h);
    },
    mausoleum(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); fill(tx + Math.floor(w / 2), ty + h - 3, 1, 3, T.SHALLOW);
      rect(P(tx + 1.5), P(ty + 1), P(w - 3), P(h - 4), 'dome'); around(tx, ty, w, h, it.pc.loot, 4); lm(it, tx, ty, w, h);
    },
    aqueduct(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      if (w > h) for (let i = 0; i < w; i++) rect(P(tx + i), P(ty) + 60, P(1) - 44, 40, 'aqueduct');
      else for (let j = 0; j < h; j++) rect(P(tx) + 60, P(ty + j), 40, P(1) - 44, 'aqueduct');
      lp(P(tx) + 40, P(ty) + 20, it.pc.loot); lp(P(tx + w) - 40, P(ty + h) - 20, it.pc.loot); lm(it, tx, ty, w, h);
    },
    terrace(tx, ty, w, h, it) {
      const n = it.name; const vine = /Lavaux|Cinque/.test(n), salt = /Salineras/.test(n);
      for (let j = 0; j < h; j++) fill(tx, ty + j, w, 1, j % 3 === 2 ? (vine ? T.FOREST : salt ? T.SALT : T.SHALLOW) : (salt ? T.SALT : T.FARM));
      rect(P(tx) + 20, P(ty) + 20, P(1.8), P(1.3), 'farmhouse');
      vs(P(tx + 3), P(ty + 0.5), 0, ['tractor', 'quad', 'pickup']); scatter(tx, ty, w, h, 'rural', 3); lm(it, tx, ty, w, h);
    },
    stepwell(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); fill(tx + 1, ty + 1, w - 2, h - 2, T.SHALLOW); fill(tx + 2, ty + 2, w - 4, h - 4, T.DEEP);
      walls(P(tx + 1) - 14, P(ty + 1) - 14, P(tx + w - 1) + 14, P(ty + h - 1) + 14, 24, {b: 1}, 'stone');
      lp(P(tx) + 30, P(ty) + 30, 'historic'); lp(P(tx + w) - 30, P(ty + h) - 30, 'rural'); lm(it, tx, ty, w, h);
    },
    estate(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); for (let i = tx + 1; i < tx + w - 1; i++) { set(i, ty + 1, T.FOREST); }
      rect(P(tx + 2), P(ty + 2), P(w - 4), P(h - 5), 'manor'); ell(tx + w / 2, ty + h - 1.7, 1.2, 0.7, T.SHALLOW);
      walls(P(tx) + 10, P(ty) + 10, P(tx + w) - 10, P(ty + h) - 10, 12, {b: 1}, 'fence');
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, 'house', 6); vs(P(tx + 2), P(ty + h - 1.5), 0, ['sportscar', 'suv', 'pickup']); lm(it, tx, ty, w, h);
    },
    monastery(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2;
      ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 7); ell(cx, cy, w / 2 - 2, h / 2 - 2, T.DIRT); fill(Math.floor(cx) - 1, Math.floor(cy), 2, h / 2 + 1, T.DIRT);
      rect(P(cx - 1.5), P(cy - 1.5), P(3), P(2), 'church');
      lp(P(cx - 2), P(cy + 1), 'historic'); lp(P(cx + 2), P(cy + 1), 'hospital'); lp(P(cx), P(cy + 2.4), 'historic'); lm(it, tx, ty, w, h);
    },
    silo(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.FARM); for (let k = 0; k < 4; k++) rect(P(tx + 1 + k * 1.5), P(ty + 1.5), 70, 70, 'silo');
      rect(P(tx + 1), P(ty + h - 2.5), P(2.5), P(1.5), 'barn');
      vs(P(tx + w - 2), P(ty + h - 1.5), 0, ['pickup', 'tractor']); scatter(tx, ty + h / 2, w, h / 2, 'rural', 3); lm(it, tx, ty, w, h);
    },
    dam(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); const mid = ty + Math.floor(h / 2);
      ell(tx + w / 2, ty + h / 4, w / 2, h / 4 + 0.5, T.SHALLOW); ell(tx + w / 2, ty + h / 4, w / 2 - 1.2, h / 4 - 0.6, T.DEEP);
      for (let i = tx; i < tx + w; i++) { set(i, mid, T.CONCRETE); set(i, mid + 1, T.ROAD); }
      rect(P(tx), P(mid) + 10, P(w), 60, 'dam'); fill(tx + Math.floor(w / 2) - 1, mid + 2, 2, h - (mid - ty) - 2, T.SHALLOW);
      rect(P(tx + 1), P(mid + 2.4), P(2), P(1.2), 'civic');
      vs(P(tx + w / 2), P(ty + 1.6), 0, ['boat', 'jetski']); lp(P(tx + 2), P(mid + 4), 'rural'); lp(P(tx + 4), P(mid + 4), 'gov'); lm(it, tx, ty, w, h);
    },
    green(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); ell(tx + w / 2, ty + h / 2, 1.2, 1, T.SHALLOW);
      for (const [cx, cy] of [[tx + 0.5, ty + 0.5], [tx + w - 2, ty + 0.5], [tx + 0.5, ty + h - 2], [tx + w - 2, ty + h - 2], [tx + w / 2 - 0.7, ty + 0.3]]) rect(P(cx), P(cy), P(1.4), P(1.2), 'cottage');
      scatter(tx + 1, ty + 1, w - 2, h - 2, 'house', 5); lm(it, tx, ty, w, h);
    },
    windmill(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.FARM); const water = /Watermill|Mill at/.test(it.name);
      if (water) fill(tx + 2, ty, 1, h, T.SHALLOW);
      for (let k = 0; k < 3; k++) rect(P(tx + (water ? 3.4 : 1) + k * 2), P(ty + 2 + (k % 2)), 70, 70, water ? 'watermill' : 'windmill');
      scatter(tx, ty, w, h, 'rural', 3); vs(P(tx + w - 1.5), P(ty + h - 1), 0, ['tractor', 'pickup']); lm(it, tx, ty, w, h);
    },
    busterminal(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 1), P(ty + 0.6), P(w - 2), P(2), 'terminal');
      for (let k = 0; k < 3; k++) vs(P(tx + 2 + k * 2.5), P(ty + 4.5), Math.PI / 2, ['bus']);
      for (let k = 0; k < 4; k++) lp(P(tx + 1.5 + k * 2), P(ty + 3), it.pc.loot); lm(it, tx, ty, w, h);
    },
    waterfront(tx, ty, w, h, it) {
      const hh = Math.floor(h / 2); fill(tx, ty, w, hh, T.DEEP); fill(tx, ty + hh - 1, w, 1, T.SHALLOW); fill(tx, ty + hh, w, h - hh, T.CONCRETE);
      fill(tx + Math.floor(w / 2), ty + 1, 2, hh, T.CONCRETE);
      for (let k = 0; k < 3; k++) rect(P(tx + 1 + k * 3.5), P(ty + h - 2), 70, 56, 'stall');
      vs(P(tx + w / 2 - 1.5), P(ty + 1.5), 0, ['boat']); vs(P(tx + w / 2 + 3.5), P(ty + 1.5), 0, ['jetski', 'hovercraft']);
      for (let k = 0; k < 4; k++) lp(P(tx + 1.5 + k * 3), P(ty + hh + 1.2), it.pc.loot); lm(it, tx, ty, w, h);
    },
    aquarium(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 0.6), P(ty + 0.6), P(w * 0.55), P(h - 1.2), 'aquarium'); fill(tx + Math.ceil(w * 0.65), ty + 1, Math.floor(w * 0.3), h - 2, T.SHALLOW);
      around(tx, ty, w, h, it.pc.loot, 3); lm(it, tx, ty, w, h);
    },
    // ── natural ──
    mountain(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2, r = w / 2;
      ell(cx, cy, r * 0.98, r * 0.98, T.FOREST, 0.5, 1); ell(cx, cy, r * 0.75, r * 0.75, T.ROCK, 0.6, 3); ell(cx, cy, r * 0.32, r * 0.32, T.SNOW, 0.4, 4);
      lp(P(cx - r * 0.85), P(cy), 'nature'); lp(P(cx + r * 0.85), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    glacier(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.SNOW, 0.4, 8); ell(cx, cy, w / 2 - 1.5, h / 2 - 1.5, T.ICE, 0.4, 9);
      lp(P(cx), P(cy), 'nature'); vs(P(cx - w / 2 + 1.5), P(cy), 0, ['snowmobile']); lm(it, tx, ty, w, h);
    },
    subglacial(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; const under = /Vostok|Ellsworth|Mercer/.test(it.name);
      ell(cx, cy, w / 2, h / 2, under ? T.ICE : T.SNOW, 0.4, 10); ell(cx, cy, w / 2 * 0.55, h / 2 * 0.55, under ? T.SHALLOW : T.DEEP, 0.3, 11);
      if (!under) ell(cx, cy, w / 2 * 0.7, h / 2 * 0.7, T.SHALLOW, 0.3, 12, t => t !== T.DEEP);
      lp(P(cx - w / 2 + 1), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    pass(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 13);
      const horiz = w > h;
      for (let k = 0; k < (horiz ? w : h); k++) {
        const off = Math.round(Math.sin(k * 0.5) * 1.5);
        for (let d = -2; d <= 2; d++) { const t = Math.abs(d) === 2 ? T.SNOW : T.DIRT; horiz ? set(tx + k, Math.floor(cy) + off + d, t) : set(Math.floor(cx) + off + d, ty + k, t); }
      }
      rect(P(cx) + 90, P(cy) - 140, 70, 50, 'checkpoint');
      lp(P(cx), P(cy), 'military'); lp(P(cx) - 160, P(cy), 'nature'); vs(P(cx) + 200, P(cy), horiz ? 0 : Math.PI / 2, ['snowmobile', 'quad', 'humvee']); lm(it, tx, ty, w, h);
    },
    canyon(tx, ty, w, h, it) {
      const horiz = w > h; fill(tx, ty, w, h, T.DIRT);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const off = horiz ? j - h / 2 : i - w / 2, half = (horiz ? h : w) / 2; const nz = vnoise((tx + i) * 0.4, (ty + j) * 0.4, seed + 14) * 1.5;
        if (Math.abs(off + 0.5) > half - 2 - nz) set(tx + i, ty + j, T.ROCK);
        if (Math.abs(off + 0.5) < 0.6) set(tx + i, ty + j, T.SHALLOW);
      }
      lp(P(tx + w / 3), P(ty + h / 3), 'nature'); lp(P(tx + w * 2 / 3), P(ty + h * 2 / 3), 'nature'); lm(it, tx, ty, w, h);
    },
    plateau(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 15); ell(cx, cy, w / 2 - 2, h / 2 - 2, T.GRASS, 0.3, 16);
      fill(Math.floor(cx) - 1, Math.floor(cy), 2, h / 2 + 1, T.DIRT);
      lp(P(cx - 2), P(cy - 1), 'nature'); lp(P(cx + 2), P(cy + 1), 'nature'); lm(it, tx, ty, w, h);
    },
    desert(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.DUNE, 0.6, 17); ell(cx, cy, w / 4, h / 4, T.SAND, 0.6, 18);
      if (/Lençóis/.test(it.name)) for (let k = 0; k < 6; k++) ell(cx + R(-w / 3, w / 3), cy + R(-h / 3, h / 3), 1.2, 0.8, T.SHALLOW);
      lp(P(cx), P(cy), 'nature'); lp(P(cx + 2), P(cy - 2), 'military'); vs(P(cx - 3), P(cy + 2), 0, ['dunebuggy']); lm(it, tx, ty, w, h);
    },
    volcano(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2, n = it.name, r = w / 2;
      if (/Causeway|Traps/.test(n)) { for (let j = ty; j < ty + h; j += 2) for (let i = tx; i < tx + w; i += 2) set(i, j, rng() < 0.55 ? T.ROCK : T.DIRT); }
      else if (/Crater|Caldera|Ngorongoro|Santorini/.test(n)) {
        ell(cx, cy, r, r, T.ROCK, 0.3, 19); ell(cx, cy, r - 1.6, r - 1.6, T.GRASS, 0.3, 20); ell(cx, cy, r * 0.4, r * 0.4, T.SHALLOW, 0.3, 21);
        fill(Math.floor(cx) - 1, Math.floor(cy), 2, r + 1, T.DIRT);
        if (/Yellowstone/.test(n)) for (let k = 0; k < 3; k++) zones.push(['geyser', Math.round(P(cx + R(-3, 3))), Math.round(P(cy + R(-3, 3))), 110]);
        if (/Dallol/.test(n)) ell(cx, cy, r * 0.5, r * 0.5, T.TOXIC, 0.4, 22, t => t !== T.ROCK);
      } else {
        ell(cx, cy, r, r, T.DIRT, 0.4, 23); ell(cx, cy, r, r, T.TOXIC, 0.6, 24, t => t === T.DIRT && rng() < 0.45);
        ell(cx, cy, r * 0.7, r * 0.7, T.ROCK, 0.3, 25); ell(cx, cy, r * 0.38, r * 0.38, T.LAVA, 0.2, 26);
        fill(Math.floor(cx), Math.floor(cy), 1, r * 0.75, T.DIRT);
      }
      lp(P(cx - r + 1), P(cy), 'crater'); lp(P(cx + r - 1), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    geyser(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2, n = it.name;
      ell(cx, cy, w / 2, h / 2, /Pamukkale/.test(n) ? T.SALT : T.DIRT, 0.4, 27);
      for (let k = 0; k < 4; k++) { const px = cx + R(-2.5, 2.5), py = cy + R(-2.5, 2.5); ell(px, py, 0.9, 0.9, T.SHALLOW); if (k < 3) zones.push(['geyser', Math.round(P(px)), Math.round(P(py)), 110]); }
      if (/Blue Lagoon|Champagne/.test(n)) ell(cx, cy, 2.2, 1.6, T.SHALLOW);
      lp(P(cx - 3.5), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    karst(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2, n = it.name;
      if (/Cave|Grotto|Postojna|Caves/.test(n)) {
        ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 28);
        let x = Math.floor(cx), y = ty + h - 1; for (let k = 0; k < 60; k++) { fill(x - 1, y - 1, 2, 2, T.DIRT); const d = Math.floor(rng() * 4); if (d === 0 && x > tx + 2) x--; else if (d === 1 && x < tx + w - 3) x++; else if (y > ty + 2) y--; }
        if (/Waitomo/.test(n)) zones.push(['glow', Math.round(P(cx)), Math.round(P(cy)), 320]);
        lp(P(cx), P(cy), 'nature'); lp(P(x), P(y), 'museum');
      } else if (/Blue Hole/.test(n)) { ell(cx, cy, w / 2, h / 2, T.SHALLOW, 0.3, 29); ell(cx, cy, w / 4, h / 4, T.DEEP); }
      else if (/Chocolate/.test(n)) { fill(tx, ty, w, h, T.GRASS); for (let k = 0; k < 18; k++) ell(tx + R(1, w - 1), ty + R(1, h - 1), 0.9, 0.9, T.DIRT); scatter(tx, ty, w, h, 'nature', 2); }
      else {
        const water = /Ha Long/.test(n); fill(tx, ty, w, h, water ? T.SHALLOW : T.GRASS); if (water) ell(cx, cy, w / 3, h / 3, T.DEEP, 0.4, 30);
        for (let k = 0; k < 22; k++) { const px = Math.floor(tx + R(0, w - 1)), py = Math.floor(ty + R(0, h - 1)); fill(px, py, rng() < 0.5 ? 1 : 2, rng() < 0.5 ? 1 : 2, T.ROCK); }
        scatter(tx, ty, w, h, 'nature', 2); if (water) vs(P(cx), P(cy), 0, ['boat', 'jetski']);
      }
      lm(it, tx, ty, w, h);
    },
    cenote(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2;
      if (/Cenote|Sac Actun/.test(it.name)) { ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 31); ell(cx, cy, w / 2 - 1.4, h / 2 - 1.4, T.DEEP); fill(Math.floor(cx), Math.floor(cy), 1, h / 2 + 1, T.SHALLOW); }
      else { ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 32); fill(tx, Math.floor(cy), w, 1, T.SHALLOW); fill(tx, Math.floor(cy) + 1, w, 1, T.DIRT); }
      lp(P(cx), P(cy) + 100, 'nature'); lm(it, tx, ty, w, h);
    },
    delta(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.SWAMP, 0.5, 33);
      if (/Sundarbans|Amazon|Irrawaddy|Mekong/.test(it.name)) for (let k = 0; k < 6; k++) ell(cx + R(-w / 3, w / 3), cy + R(-h / 3, h / 3), 1.4, 1, T.FOREST);
      for (let b = 0; b < 4; b++) { let x = cx, y = ty + 0.5; const dx = R(-0.7, 0.7); for (let k = 0; k < h; k++) { fill(Math.floor(x), Math.floor(y), 2, 1, T.SHALLOW); x += dx + R(-0.5, 0.5); y += 1; } }
      vs(P(cx), P(ty + 1), Math.PI / 2, ['boat', 'hovercraft']); scatter(tx + 2, ty + 2, w - 4, h - 4, 'nature', 3); lm(it, tx, ty, w, h);
    },
    lagoon(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2 + 0.5, h / 2 + 0.5, T.SAND, 0.3, 34); ell(cx, cy, w / 2 - 0.5, h / 2 - 0.8, T.SHALLOW, 0.4, 35);
      if (/Venetian/.test(it.name)) for (let k = 0; k < 5; k++) { const px = cx + R(-4, 4), py = cy + R(-3, 3); ell(px, py, 1.2, 1, T.CONCRETE); rect(P(px) - 30, P(py) - 25, 60, 50, 'house'); lp(P(px) + 50, P(py), 'house'); }
      if (/Kerala|Chilika|Pulicat/.test(it.name)) for (let k = 0; k < 5; k++) ell(cx + R(-4, 4), cy + R(-3, 3), 1, 0.8, T.FOREST);
      vs(P(cx), P(cy), 0, ['boat', 'jetski', 'hovercraft']); lp(P(cx - w / 2 + 0.5), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    lake(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2;
      if (/Crater/.test(it.name)) { ell(cx, cy, w / 2, h / 2, T.ROCK, 0.3, 36); fill(Math.floor(cx), Math.floor(cy), 1, h / 2 + 1, T.DIRT); }
      else ell(cx, cy, w / 2, h / 2, /Pangong|Titicaca/.test(it.name) ? T.DIRT : T.SAND, 0.4, 37);
      ell(cx, cy, w / 2 - 1, h / 2 - 1, T.SHALLOW, 0.4, 38); ell(cx, cy, w / 2 - 2.2, h / 2 - 2.2, T.DEEP, 0.4, 39);
      vs(P(cx - w / 2 + 2), P(cy), 0, ['boat', 'jetski']); lp(P(cx + w / 2 - 0.8), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    cliff(tx, ty, w, h, it) {
      const horiz = w > h;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const off = horiz ? j : i, len = horiz ? h : w, along = horiz ? i : j;
        let t = off < len / 2 - 1 ? T.GRASS : off < len / 2 + 1 ? T.ROCK : off < len / 2 + 2 ? T.SAND : T.SHALLOW;
        if (t === T.ROCK && along % 5 === 2 && /Arches|Apostles|Gozo/.test(it.name)) t = T.SHALLOW;
        set(tx + i, ty + j, t);
      }
      lp(P(tx + 1), P(ty + 1), 'nature'); lm(it, tx, ty, w, h);
    },
    fjord(tx, ty, w, h, it) {
      const horiz = w > h;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const off = horiz ? j - h / 2 : i - w / 2, nz = vnoise((tx + i) * 0.5, (ty + j) * 0.5, seed + 40);
        set(tx + i, ty + j, Math.abs(off + 0.5) < 1.2 ? T.DEEP : Math.abs(off + 0.5) < 2 + nz ? T.ROCK : T.FOREST);
      }
      if (/Ilulissat|Scoresby/.test(it.name)) for (let k = 0; k < 4; k++) set(tx + (horiz ? 3 + k * 4 : w / 2), ty + (horiz ? h / 2 : 3 + k * 4), T.ICE);
      vs(P(tx + (horiz ? 2 : w / 2)), P(ty + (horiz ? h / 2 : 2)), horiz ? 0 : Math.PI / 2, ['boat']); lm(it, tx, ty, w, h);
    },
    saltflat(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.SALT, 0.3, 41);
      vs(P(cx), P(cy), 0, ['dunebuggy', 'sportscar']); lp(P(cx + 2), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    saltlake(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.SALT, 0.4, 42); ell(cx, cy, w / 2 - 1.5, h / 2 - 1.5, T.SHALLOW, 0.4, 43);
      if (/Mono/.test(it.name)) for (let k = 0; k < 6; k++) set(cx + R(-3, 3), cy + R(-3, 3), T.ROCK);
      lp(P(cx - w / 2 + 0.7), P(cy), 'nature'); lm(it, tx, ty, w, h);
    },
    waterfall(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.FOREST); const mid = ty + Math.floor(h / 2);
      fill(tx, mid - 1, w, 2, T.ROCK); fill(tx + Math.floor(w / 2) - 1, ty, 2, h, T.SHALLOW); ell(tx + w / 2, mid + 2.5, 2.2, 1.6, T.DEEP);
      lp(P(tx + 1), P(mid + 2), 'nature'); lm(it, tx, ty, w, h);
    },
    reef(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2; ell(cx, cy, w / 2, h / 2, T.SHALLOW, 0.5, 44);
      if (/Atoll|Maldivian|Lakshadweep/.test(it.name)) { ell(cx, cy, w / 2 * 0.8, h / 2 * 0.8, T.SAND, 0.2, 45); ell(cx, cy, w / 2 * 0.6, h / 2 * 0.6, T.SHALLOW, 0.2, 46); if (/Bikini/.test(it.name)) ell(cx, cy, w / 2 * 0.8, h / 2 * 0.8, T.TOXIC, 0.2, 47, t => t === T.SAND); }
      else { ell(cx, cy, 2, 1.6, T.SAND); ell(cx, cy, 0.9, 0.9, T.FOREST); }
      lp(P(cx), P(cy - 1), 'drop'); vs(P(cx + w / 2 - 1.5), P(cy), Math.PI / 2, ['jetski', 'boat']); lm(it, tx, ty, w, h);
    },
    strait(tx, ty, w, h, it) {
      const horiz = w > h;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const off = Math.abs((horiz ? j - h / 2 : i - w / 2) + 0.5);
        set(tx + i, ty + j, off < 1.5 ? T.DEEP : off < 2.3 ? T.SHALLOW : off < 3 ? T.SAND : T.GRASS);
      }
      vs(P(tx + w / 2), P(ty + h / 2), horiz ? 0 : Math.PI / 2, ['boat', 'hovercraft']);
      lp(P(tx + (horiz ? 2 : 0.6)), P(ty + (horiz ? 0.6 : 2)), 'nature'); lp(P(tx + w - 2), P(ty + h - 0.6), 'transit'); lm(it, tx, ty, w, h);
    },
  };

  // ── placement ──
  const regionsOf = th => { const a = []; for (let r = 0; r < 25; r++) if (themeOf(r) === th) a.push(r); return a; };
  const DEV_R = [], WILD_R = []; for (let r = 0; r < 25; r++) (WILD.has(themeOf(r)) ? WILD_R : DEV_R).push(r);
  const fits = (tx, ty, w, h, wild, kind) => {
    if (tx < 12 || ty < 12 || tx + w > W - 12 || ty + h > H - 12) return false;
    let over = 0;
    for (let j = ty; j < ty + h; j++) for (let i = tx; i < tx + w; i++) {
      const o = occ[idx(i, j)];
      if (wild) { if (o >= 3) return false; if (o === 2) over++; }
      else { if (o) return false; const t = tiles[idx(i, j)]; if (t === T.DEEP || t === T.ROCK || t === T.SHALLOW) return false; }
    }
    if (wild && over > w * h * 0.12) return false;
    if (wild && !['reef', 'strait', 'lagoon', 'fjord'].includes(kind) && tiles[idx(Math.floor(tx + w / 2), Math.floor(ty + h / 2))] === T.DEEP) return false;
    return true;
  };
  const items = []; const seen = new Set();
  for (const pc of PLACES) for (const name of pc.names) { if (seen.has(name)) continue; seen.add(name); items.push({name, pc}); }
  items.sort((a, b) => { const A = SIZE[a.pc.kind], B = SIZE[b.pc.kind]; return B[0] * B[1] - A[0] * A[1]; });
  let skipped = 0; const skippedK = {};
  for (const it of items) {
    const kind = it.pc.kind; let [w, h] = SIZE[kind]; if (ROT.has(kind) && rng() < 0.5) [w, h] = [h, w];
    const wild = WILD.has(it.pc.theme);
    const tryR = (list, tries) => {
      for (let t = 0; t < tries; t++) {
        const r = pick(list), rx0 = (r % 5) * RS, ry0 = Math.floor(r / 5) * RS;
        const tx = RI(rx0 + 2, rx0 + RS - 2 - w), ty = RI(ry0 + 2, ry0 + RS - 2 - h);
        if (fits(tx, ty, w, h, wild, kind)) return [tx, ty];
      }
      return null;
    };
    const pos = tryR(regionsOf(it.pc.theme), 400) || tryR(wild ? WILD_R : DEV_R, 900) || (wild ? null : tryR(WILD_R, 600)) || tryR([...DEV_R, ...WILD_R], 1500);
    if (!pos) { skipped++; skippedK[kind] = (skippedK[kind] || 0) + 1; continue; }
    for (let j = pos[1] - 1; j <= pos[1] + h; j++) for (let i = pos[0] - 1; i <= pos[0] + w; i++) if (inb(i, j)) { if (occ[idx(i, j)] < 2) occ[idx(i, j)] = wild ? 2 : 3; if (!wild && road[idx(i, j)] === 2 && i >= pos[0] && j >= pos[1] && i < pos[0] + w && j < pos[1] + h) road[idx(i, j)] = 0; }
    BUILD[kind](pos[0], pos[1], w, h, it);
  }

  // ── filler: houses, shops, hospitals, gas stations, farms ──
  const HOUSE_P = {city: 0.82, gov: 0.6, culture: 0.6, sports: 0.35, historic: 0.35, rural: 0.16};
  for (let gy = 12; gy < H - 18; gy += 6) for (let gx = 12; gx < W - 18; gx += 6) {
    const th = themeOf(region[idx(gx + 3, gy + 3)]); const p = HOUSE_P[th]; if (!p || rng() > p) continue;
    let ok = true; for (let j = gy; j < gy + 6 && ok; j++) for (let i = gx; i < gx + 6; i++) { const t = tiles[idx(i, j)]; if (occ[idx(i, j)] || road[idx(i, j)] || t === T.DEEP || t === T.SHALLOW || t === T.ROCK) { ok = false; break; } }
    if (!ok) continue;
    for (let j = gy; j < gy + 6; j++) for (let i = gx; i < gx + 6; i++) occ[idx(i, j)] = 3;
    if (th === 'rural') {
      fill(gx, gy, 6, 6, T.FARM); fill(gx + 0.5, gy + 0.5, 2.5, 2.5, T.GRASS); rect(P(gx + 0.7), P(gy + 0.7), P(1.6), P(1.2), rng() < 0.3 ? 'barn' : 'farmhouse');
      lp(P(gx + 0.6), P(gy + 2.4), 'rural'); lp(P(gx + 2.6), P(gy + 1.2), 'rural'); if (rng() < 0.4) vs(P(gx + 2.8), P(gy + 2.6), 0, ['pickup', 'tractor', 'quad', 'sedan']);
      continue;
    }
    if (th === 'historic') fill(gx, gy, 6, 6, T.DIRT);
    const roll = rng();
    if (roll < 0.05) { rect(P(gx + 1), P(gy + 1), P(4), P(4), 'hospital'); for (const [a, b] of [[0.5, 3], [5.5, 3], [3, 0.5], [3, 5.5]]) lp(P(gx + a), P(gy + b), 'hospital'); vs(P(gx + 0.5), P(gy + 5.5), 0, ['ambulance']); }
    else if (roll < 0.09) { fill(gx, gy, 6, 6, T.CONCRETE); rect(P(gx + 1), P(gy + 1), P(2.5), P(1.6), 'gasstation'); rect(P(gx + 1), P(gy + 3.4), P(3.4), P(0.6), 'canopy'); lp(P(gx + 4.2), P(gy + 1.5), 'gas'); lp(P(gx + 1.5), P(gy + 4.8), 'gas'); vs(P(gx + 4.5), P(gy + 4.6), 0, ['sedan', 'pickup', 'motorcycle']); }
    else if (roll < 0.11) { rect(P(gx + 1), P(gy + 1), P(4), P(3), 'police'); lp(P(gx + 3), P(gy + 4.6), 'police'); lp(P(gx + 0.5), P(gy + 2), 'police'); vs(P(gx + 1.5), P(gy + 5.3), 0, ['police']); }
    else if (roll < 0.45) { const s = pick(['office', 'apartment', 'shop', 'office']); rect(P(gx + 0.8), P(gy + 0.8), P(4.4), P(4.4), s); lp(P(gx + 0.4), P(gy + 3), s === 'shop' ? 'mall' : 'house'); lp(P(gx + 5.6), P(gy + 3), 'house'); lp(P(gx + 3), P(gy + 5.6), 'house'); }
    else {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if (rng() < 0.85) { rect(P(gx + 0.6 + a * 2.6), P(gy + 0.6 + b * 2.6), P(2), P(2), pick(['house', 'house', 'shop', 'apartment'])); lp(P(gx + 0.3 + a * 2.6), P(gy + 2.85 + b * 2.6), 'house'); }
    }
    if (rng() < 0.35) vs(P(gx + 5.5), P(gy + 0.6), Math.PI / 2, ['sedan', 'suv', 'sportscar', 'motorcycle', 'pickup']);
  }
  // parked cars along highways
  for (const c of HW) for (let k = 16; k < W - 16; k += 7) {
    if (rng() < 0.1) vs(P(k) + 40, P(c + 1) + 40, 0, ['sedan', 'suv', 'pickup', 'motorcycle', 'sportscar', 'bus']);
    if (rng() < 0.1) vs(P(c - 1) + 40, P(k) + 40, Math.PI / 2, ['sedan', 'suv', 'pickup', 'motorcycle', 'police']);
  }
  // roads (bridges over water, passes through rock) + winding wilderness dirt trails
  for (let i = 0; i < W * H; i++) if (road[i] && occ[i] < 3) tiles[i] = T.ROAD;
  for (let y = 14; y < H - 14; y++) for (let x = 14; x < W - 14; x++) {
    const i = idx(x, y);
    if (road[i] || occ[i] >= 2) continue;
    const t = tiles[i];
    if (t === T.DEEP || t === T.SHALLOW || t === T.LAVA || t === T.CONCRETE) continue;
    const tr = Math.abs(fbm(x * 0.019, y * 0.019, seed + 211, 3) - 0.5);
    if (tr < 0.0055) tiles[i] = T.DIRT;
  }

  // ── clear shelter plots & raid bunker pads (guarantee unobstructed compounds + starter vehicles) ──
  const clearZone = (cx, cy, padRadiusPx, tilePadRadius, isPlot) => {
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (r[0] < cx + padRadiusPx && r[0] + r[2] > cx - padRadiusPx && r[1] < cy + padRadiusPx && r[1] + r[3] > cy - padRadiusPx) {
        rects.splice(i, 1);
      }
    }
    for (let i = loot.length - 1; i >= 0; i--) {
      if (Math.abs(loot[i][0] - cx) < 260 && Math.abs(loot[i][1] - cy) < 260) {
        loot.splice(i, 1);
      }
    }
    for (let i = vspawns.length - 1; i >= 0; i--) {
      if (Math.abs(vspawns[i][0] - cx) < 280 && Math.abs(vspawns[i][1] - cy) < 280) {
        vspawns.splice(i, 1);
      }
    }
    const ctxT = Math.floor(cx / TS), ctyT = Math.floor(cy / TS);
    for (let dy = -tilePadRadius; dy <= tilePadRadius; dy++) {
      for (let dx = -tilePadRadius; dx <= tilePadRadius; dx++) {
        const tx = ctxT + dx, ty = ctyT + dy;
        if (!inb(tx, ty)) continue;
        const inner = Math.abs(dx) <= tilePadRadius - 2 && Math.abs(dy) <= tilePadRadius - 2;
        set(tx, ty, inner ? T.CONCRETE : (tiles[idx(tx, ty)] === T.ROAD ? T.ROAD : T.GRASS));
      }
    }
    if (isPlot) {
      // Southern driveway apron + 2 guaranteed vehicles + starter supply spot
      fill(ctxT - 1, ctyT + 2, 3, tilePadRadius + 2, T.CONCRETE);
      vs(cx - 210, cy + 345, 0, ['sedan', 'pickup', 'suv', 'dunebuggy']);
      vs(cx + 210, cy + 345, Math.PI, ['motorcycle', 'quad', 'humvee']);
      lp(cx + 120, cy + 280, 'military', false);
    } else {
      vs(cx + 160, cy + 160, 0, ['humvee', 'pickup', 'quad']);
      lp(cx - 120, cy + 120, 'military', false);
    }
  };
  for (const pl of PLOTS) clearZone(pl.x, pl.y, 460, 6, true);
  for (const rb of RAID_BUNKERS) clearZone(rb.x, rb.y, 320, 4, false);

  // spawn points
  const roadPts = (regs, n) => { const out = []; for (let t = 0; t < 8000 && out.length < n; t++) { const r = pick(regs); const x = (r % 5) * RS + RI(4, RS - 5), y = Math.floor(r / 5) * RS + RI(4, RS - 5); if (tiles[idx(x, y)] === T.ROAD) out.push([P(x) + 40, P(y) + 40]); } return out; };
  const spawns = roadPts([12, 13, 17, 7, 11], 80);
  const teamSpawns = [roadPts([6], 30), roadPts([8], 30), roadPts([16], 30), roadPts([18], 30)];

  return {W, H, TS, tiles, region, rects, styles, landmarks, loot, vspawns, zones, spawns, teamSpawns, skipped, skippedK,
    themes: THEMES.flat(), rnames: RNAMES.flat()};
}
module.exports = {generateMap};
