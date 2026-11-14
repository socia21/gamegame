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
  ['alpine', 'alpine', 'volcanic', 'coast', 'coast'],
  ['rural', 'historic', 'historic', 'culture', 'sports'],
  ['rural', 'gov', 'city', 'city', 'sports'],
  ['canyon', 'rural', 'city', 'culture', 'sports'],
  ['saltflat', 'desert', 'karst', 'lakes', 'reef'],
];
const RNAMES = [
  ['Himalayan Heights', 'Glacier Reach', 'Ring of Fire', 'Fjordland', 'Northern Cliffs'],
  ['Terrace Valleys', 'Old World', 'Imperial Quarter', 'Museum Mile', 'Olympic Coast'],
  ['Windmill Plains', 'Capitol District', 'Downtown', 'Harbour City', 'Stadium City'],
  ['Canyonlands', 'Farmlands', 'Global Gateway', 'Culture Quarter', 'Speedway & Links'],
  ['Salt Wastes', 'Dune Sea', 'Karst Labyrinth', 'Lake District', 'Coral Archipelago'],
];
const WILD = new Set(['alpine', 'volcanic', 'karst', 'coast', 'desert', 'saltflat', 'canyon', 'lakes', 'reef']);
const SIZE = {stadium:[15,12],arena:[10,8],court:[8,6],circuit:[24,15],golf:[16,14],airport:[34,16],building:[8,6],big:[10,7],bank:[9,7],capitol:[11,8],
  hospital:[11,9],milbase:[18,14],
  mall:[14,11],park:[12,11],zoo:[14,12],market:[11,9],complex:[15,12],fort:[13,12],palace:[14,11],cathedral:[10,8],pyramid:[11,10],amphi:[12,10],mosque:[10,9],
  rockcut:[10,9],temple:[9,7],mausoleum:[11,9],aqueduct:[18,2],terrace:[13,10],stepwell:[8,8],estate:[13,10],monastery:[10,9],silo:[11,8],dam:[16,11],green:[10,9],
  windmill:[11,8],busterminal:[12,9],waterfront:[15,10],aquarium:[11,8],
  mountain:[24,24],glacier:[14,12],subglacial:[11,10],pass:[14,9],canyon:[24,9],plateau:[14,14],desert:[16,14],volcano:[16,15],geyser:[9,9],karst:[13,12],
  cenote:[8,8],delta:[16,15],lagoon:[16,13],lake:[15,12],cliff:[16,6],fjord:[22,7],saltflat:[17,15],saltlake:[11,10],waterfall:[12,11],reef:[15,14],strait:[28,10]};
const ROT = new Set(['aqueduct', 'canyon', 'cliff', 'fjord', 'strait', 'pass']);
const BUILD_STYLE = {'Police HQ':'police','Fire Station':'fire','High Court':'court','Art Museum':'museum','Science Centre':'science','National Archive':'archive',
  'Post Office':'post','International HQ':'intl','State Secretariat':'gov','Municipal Office':'civic','Revenue Authority':'gov','Electoral Commission':'civic',
  'Land Registry':'civic','Audit Office':'gov','Central Bank':'bank','Parliament':'capitol'};

function generateMap(seed) {
  const rng = mulberry32(seed);
  const R = (a, b) => a + rng() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1)), pick = (a) => a[Math.floor(rng() * a.length)];
  const tiles = new Uint8Array(W * H), region = new Uint8Array(W * H), occ = new Uint8Array(W * H), road = new Uint8Array(W * H);
  const rects = [], styles = [], styleIdx = {}, landmarks = [], loot = [], vspawns = [], zones = [], entrances = [];
  const entCounts = {air: 0, univ: 0, hosp: 0, mall: 0, mil: 0, hist: 0, mus: 0, hub: 0, ind: 0};
  const ent = (prefix, type, name, x, y) => entrances.push({id: prefix + '_' + (++entCounts[prefix]), type, name, x: Math.round(x), y: Math.round(y)});
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

  // ── regions (smooth, organically curved geographic borders) ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + (fbm(x * 0.016, y * 0.016, seed + 11, 3) - 0.5) * 11, wy = y + (fbm(x * 0.016, y * 0.016, seed + 23, 3) - 0.5) * 11;
    region[idx(x, y)] = clamp(Math.floor(wy / RS), 0, 4) * 5 + clamp(Math.floor(wx / RS), 0, 4);
  }
  // ── base terrain (cohesive macro topography without tile confetti) ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), th = themeOf(region[i]);
    const n = fbm(x * 0.026, y * 0.026, seed + 1, 4);
    const m = fbm(x * 0.048, y * 0.048, seed + 2, 3);
    const elev = fbm(x * 0.016, y * 0.016, seed + 37, 4);
    const ridge = 1 - Math.abs(fbm(x * 0.022, y * 0.022, seed + 61, 3) * 2 - 1);
    let t;
    switch (th) {
      case 'alpine':
        t = (elev > 0.65 || ridge > 0.90) ? (elev > 0.72 ? T.SNOW : T.ROCK)
          : n > 0.56 ? (m > 0.66 ? T.ICE : T.SNOW)
          : (m > 0.53 ? T.FOREST : (elev < 0.30 && m > 0.45 ? T.SHALLOW : T.GRASS));
        break;
      case 'volcanic':
        t = (ridge > 0.89 && elev > 0.54) ? T.LAVA
          : (n > 0.62 || elev > 0.67) ? T.ROCK
          : m > 0.80 ? T.LAVA : m < 0.26 ? T.GRASS : T.DIRT;
        break;
      case 'karst':
        t = ((m > 0.67 && n > 0.44) || ridge > 0.91) ? T.ROCK
          : n < 0.29 ? T.SHALLOW
          : m < 0.44 ? T.FOREST : (elev < 0.28 ? T.SWAMP : T.GRASS);
        break;
      case 'coast':
        t = (n > 0.66 || ridge > 0.90) ? T.ROCK
          : elev < 0.28 ? T.SAND
          : m > 0.55 ? T.FOREST : T.GRASS;
        break;
      case 'desert': {
        const oasis = elev < 0.21 && m > 0.65;
        t = oasis ? (elev < 0.16 ? T.SHALLOW : T.GRASS)
          : (n > 0.72 || ridge > 0.92) ? T.ROCK
          : (m > 0.54 && elev > 0.38) ? T.DUNE : T.SAND;
        break;
      }
      case 'saltflat':
        t = ridge > 0.92 ? T.ROCK : n > 0.36 ? T.SALT : T.SAND;
        break;
      case 'canyon':
        t = (n > 0.62 || ridge > 0.86) ? T.ROCK
          : elev < 0.26 ? T.SAND : (m > 0.68 ? T.GRASS : T.DIRT);
        break;
      case 'lakes':
        t = (n < 0.31 || elev < 0.26) ? T.DEEP
          : n < 0.38 ? T.SHALLOW
          : m > 0.60 ? T.SWAMP
          : m > 0.47 ? T.FOREST : T.GRASS;
        break;
      case 'reef':
        t = n > 0.64 ? (m > 0.55 ? T.FOREST : T.SAND) : n > 0.54 ? T.SHALLOW : T.DEEP;
        break;
      case 'rural':
        t = (ridge > 0.93 && elev > 0.66) ? T.ROCK
          : elev < 0.23 && m > 0.62 ? T.SHALLOW
          : (n > 0.52 && m > 0.44) ? T.FARM : m < 0.29 ? T.FOREST : T.GRASS;
        break;
      case 'historic':
        t = ridge > 0.92 ? T.ROCK : m > 0.66 ? T.FOREST : m > 0.54 ? T.DIRT : T.GRASS;
        break;
      case 'sports':
        t = m > 0.58 ? T.GRASS : T.CONCRETE;
        break;
      default:
        t = m > 0.66 ? T.GRASS : T.CONCRETE;
    }
    // meandering rivers with sandy/gravel banks
    const rv = Math.abs(fbm(x * 0.011, y * 0.011, seed + 99, 3) - 0.5);
    if (th !== 'reef') {
      if (rv < 0.0105) t = (th === 'desert' || th === 'saltflat') ? T.DIRT : (rv < 0.0050 ? T.DEEP : T.SHALLOW);
      else if (rv < 0.018 && t !== T.ROCK && t !== T.CONCRETE && t !== T.LAVA) t = (th === 'lakes' || m > 0.62) ? T.SWAMP : T.SAND;
    }
    // ocean border
    const e = Math.min(x, y, W - 1 - x, H - 1 - y) + (vnoise(x * 0.06, y * 0.06, seed + 5) - 0.5) * 6;
    if (e < 6) t = T.DEEP; else if (e < 8.5) t = T.SHALLOW; else if (e < 11) t = (th === 'coast' && n > 0.5) ? T.ROCK : T.SAND;
    tiles[i] = t;
  }

  // ── terrain coherence pass (despeckle + smooth shorelines & volcanic collars) ──
  const tmpTiles = new Uint8Array(tiles);
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const i = idx(x, y), t = tmpTiles[i];
      const u = tmpTiles[i - W], d = tmpTiles[i + W], l = tmpTiles[i - 1], r = tmpTiles[i + 1];
      if (u === d && u === l && u === r && u !== t) {
        tiles[i] = u;
        continue;
      }
      if (t === T.DEEP && ((u !== T.DEEP && u !== T.SHALLOW) || (d !== T.DEEP && d !== T.SHALLOW) || (l !== T.DEEP && l !== T.SHALLOW) || (r !== T.DEEP && r !== T.SHALLOW))) {
        tiles[i] = T.SHALLOW;
      } else if (t !== T.LAVA && t !== T.ROCK && t !== T.DEEP && t !== T.SHALLOW && (u === T.LAVA || d === T.LAVA || l === T.LAVA || r === T.LAVA)) {
        tiles[i] = T.ROCK;
      }
    }
  }

  // ── organized highway, avenue & rural/historic lane network ──
  const HW = [40, 120, 200, 280, 360];
  for (const c of HW) for (let k = 12; k < W - 12; k++) for (let d = -1; d <= 1; d++) { road[idx(k, c + d)] = 1; road[idx(c + d, k)] = 1; }
  for (let r = 0; r < 25; r++) {
    const th = themeOf(r);
    const rx0 = (r % 5) * RS, ry0 = Math.floor(r / 5) * RS;
    if (th === 'city' || th === 'gov' || th === 'culture') {
      for (const g of [8, 24, 56, 72]) {
        for (let j = 0; j < RS; j++) for (let d = 0; d < 2; d++) {
          const x1 = rx0 + g + d, y1 = ry0 + j, x2 = rx0 + j, y2 = ry0 + g + d;
          if (x1 >= 12 && x1 < W - 12 && y1 >= 12 && y1 < H - 12 && !road[idx(x1, y1)]) road[idx(x1, y1)] = 2;
          if (x2 >= 12 && x2 < W - 12 && y2 >= 12 && y2 < H - 12 && !road[idx(x2, y2)]) road[idx(x2, y2)] = 2;
        }
      }
    } else if (th === 'sports') {
      for (const g of [16, 64]) {
        for (let j = 0; j < RS; j++) for (let d = 0; d < 2; d++) {
          const x1 = rx0 + g + d, y1 = ry0 + j, x2 = rx0 + j, y2 = ry0 + g + d;
          if (x1 >= 12 && x1 < W - 12 && y1 >= 12 && y1 < H - 12 && !road[idx(x1, y1)]) road[idx(x1, y1)] = 2;
          if (x2 >= 12 && x2 < W - 12 && y2 >= 12 && y2 < H - 12 && !road[idx(x2, y2)]) road[idx(x2, y2)] = 2;
        }
      }
    } else if (th === 'rural' || th === 'historic') {
      for (const g of [12, 26, 54, 68]) {
        for (let j = 0; j < RS; j++) {
          const x1 = rx0 + g, y1 = ry0 + j, x2 = rx0 + j, y2 = ry0 + g;
          if (x1 >= 12 && x1 < W - 12 && y1 >= 12 && y1 < H - 12 && !road[idx(x1, y1)]) road[idx(x1, y1)] = th === 'historic' ? 2 : 3;
          if (x2 >= 12 && x2 < W - 12 && y2 >= 12 && y2 < H - 12 && !road[idx(x2, y2)]) road[idx(x2, y2)] = th === 'historic' ? 2 : 3;
        }
      }
    }
  }
  // Highways (road=1) are strictly protected from ALL landmark/building overlap
  for (let i = 0; i < W * H; i++) if (road[i] === 1) occ[i] = 3;
  for (const pl of PLOTS) {
    const px = Math.floor(pl.x / TS), py = Math.floor(pl.y / TS);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (inb(px + dx, py + dy)) occ[idx(px + dx, py + dy)] = 3;
  }
  for (const rb of RAID_BUNKERS) {
    const rx = Math.floor(rb.x / TS), ry = Math.floor(rb.y / TS);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (inb(rx + dx, ry + dy)) occ[idx(rx + dx, ry + dy)] = 3;
  }

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
      if (!o.noEnt && w >= 8 && h >= 7) {
        // Perimeter stadium floodlight pylons at outer corners
        for (const [fx, fy] of [[tx + 0.55, ty + 0.55], [tx + w - 0.55, ty + 0.55], [tx + 0.55, ty + h - 0.55], [tx + w - 0.55, ty + h - 0.55]]) {
          rect(P(fx) - 22, P(fy) - 22, 44, 44, 'tower');
        }
      }
      const tag = it.pc.loot;
      lp(x0 + 110, y0 + 110, tag); lp(x1 - 110, y0 + 110, tag); lp(x0 + 110, y1 - 110, tag); lp(x1 - 110, y1 - 110, tag); lp((x0 + x1) / 2, (y0 + y1) / 2, tag);
      lp(P(tx) + 40, P(ty + h / 2), tag); lp(P(tx + w) - 40, P(ty + h / 2), tag);
      vs(P(tx + 1.5), P(ty + h) - 40, 0, ['sedan', 'suv', 'pickup', 'bus']); vs(P(tx + w - 1.5), P(ty + 0.5), Math.PI, ['sedan', 'sportscar', 'motorcycle']);
      if (o.noEnt) {
        ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 1));
      } else {
        fill(tx + Math.floor(w / 2) - 1, ty + h - 1, 2, 1, T.ROAD);
        ent('hub', 'transit', it.name, P(tx + w / 2), P(ty + h - 0.85));
      }
      lm(it, tx, ty, w, h);
    },
    arena(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 34, inner: /Hockey/.test(it.pc.cat) ? T.ICE : T.TURF}); },
    court(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 30, gates: {t: 1, b: 1}}); },
    amphi(tx, ty, w, h, it) { BUILD.stadium(tx, ty, w, h, it, {th: 48, base: T.DIRT, inner: T.SAND, style: 'stone', gates: {t: 1, b: 1, l: 1, r: 1}, noEnt: true}); },
    circuit(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      const L = tx + 2, Rr = tx + w - 3, Tt = ty + 2, B = ty + h - 3;
      for (let i = L; i <= Rr; i++) { set(i, Tt, T.TRACK); set(i, Tt + 1, T.TRACK); set(i, B, T.TRACK); set(i, B - 1, T.TRACK); }
      for (let j = Tt; j <= B; j++) { set(L, j, T.TRACK); set(L + 1, j, T.TRACK); set(Rr, j, T.TRACK); set(Rr - 1, j, T.TRACK); }
      const mx = Math.floor((L + Rr) / 2), midY = Math.floor((Tt + B) / 2);
      for (let j = Tt; j <= B; j++) set(mx, j, T.TRACK);
      for (let i = mx; i <= Rr; i++) set(i, midY, T.TRACK);
      // Grandstands flanking main straight + pit lane paddock bays
      rect(P(L + 3), P(ty + 0.55), P(7), P(1.0), 'stand');
      rect(P(mx + 2), P(ty + 0.55), P(6), P(1.0), 'stand');
      rect(P(L + 3), P(Tt + 2) + 12, P(Math.min(5, mx - L - 3)), P(1) - 18, 'pit');
      rect(P(L + 3), P(B - 2.2), P(3.5), P(1.1), 'club');
      vs(P(L + 3), P(Tt) + 80, 0, ['f1']); vs(P(L + 5.5), P(Tt) + 80, 0, ['f1']); vs(P(L + 8), P(Tt) + 80, 0, ['sportscar', 'f1']); vs(P(Rr - 2), P(B), Math.PI, ['sportscar', 'f1']);
      lp(P(L + 3), P(Tt + 3) + 40, 'circuit'); lp(P(L + 6), P(Tt + 3) + 40, 'circuit'); lp(P(mx + 2), P(Tt + 4), 'circuit'); lp(P(L + 4), P(B - 1.5), 'circuit');
      ent('hub', 'transit', it.name, P(L + 4.75), P(B - 1.1));
      lm(it, tx, ty, w, h);
    },
    golf(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      fill(tx, ty, w, 1, T.FOREST); fill(tx, ty + h - 1, w, 1, T.FOREST);
      fill(tx, ty + 1, 1, h - 2, T.FOREST); fill(tx + w - 1, ty + 1, 1, h - 2, T.FOREST);
      for (let k = 0; k < 4; k++) ell(tx + 3.5 + (k % 2) * (w - 7) + R(-0.5, 0.5), ty + 3.5 + Math.floor(k / 2) * (h - 7) + R(-0.4, 0.4), 2.2, 1.6, T.GREEN);
      for (let k = 0; k < 4; k++) ell(tx + 3.5 + k * 2.8, ty + 4 + (k % 2) * 3.5, 1.1, 0.85, T.SAND);
      ell(tx + w * 0.62, ty + h * 0.5, 2.0, 1.5, T.SHALLOW);
      fill(tx + 1, ty + 1, 4, 3, T.CONCRETE);
      rect(P(tx + 1.2), P(ty + 1.2), P(2.4), P(1.6), 'club');
      vs(P(tx + 4.0), P(ty + 1.6), 0, ['golfcart']); vs(P(tx + 4.0), P(ty + 2.6), 0, ['golfcart']);
      lp(P(tx + 1.8), P(ty + 3.5), 'golf'); lp(P(tx + 3.2), P(ty + 3.2), 'golf'); scatter(tx + 1, ty + 1, w - 2, h - 2, 'golf', 3);
      ent('hub', 'transit', it.name, P(tx + 2.4), P(ty + 2.85));
      lm(it, tx, ty, w, h);
    },
    airport(tx, ty, w, h, it) {
      // Huge Fenced International Airport Complex: Dual Parallel Runways, Cross-Taxiways, Grand Terminal + 3 Piers, ATC Tower, 3 Hangars, Fuel Farm & Helipads
      fill(tx, ty, w, h, T.CONCRETE);
      // Grass infield safety strips between runways and perimeter
      fill(tx + 1, ty + 3, w - 2, 2, T.GRASS);
      fill(tx + 1, ty + 7, w - 2, 1, T.GRASS);
      // Dual parallel wide Runways (North Runway 09L/27R & South Runway 09R/27L)
      fill(tx + 1, ty + 1, w - 2, 2, T.RUNWAY);
      fill(tx + 1, ty + 5, w - 2, 2, T.RUNWAY);
      // Cross-taxiways connecting both runways cleanly down to main apron & southern arrival road
      for (const txOff of [4, Math.floor(w * 0.36), Math.floor(w * 0.64), w - 6]) {
        fill(tx + txOff, ty + 3, 2, 7, T.ROAD);
      }
      fill(tx + 1, ty + 8, w - 2, 2, T.ROAD);
      // Southern departure/arrivals boulevard & concrete curbside
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      // Perimeter security fence (openings at West cargo gate and South main arrivals)
      walls(P(tx + 0.12), P(ty + 0.12), P(tx + w - 0.12), P(ty + h - 0.12), 14, { b: 1 }, 'milfence');
      rect(P(tx + w / 2 - 2.3), P(ty + h - 0.88), 72, 42, 'checkpoint');
      rect(P(tx + w / 2 + 1.4), P(ty + h - 0.88), 72, 42, 'checkpoint');

      // Grand International Terminal + 3 Boarding Gate Pier Wings projecting onto apron
      const termX = tx + 7, termW = 14, termY = ty + h - 4.4;
      rect(P(termX), P(termY), P(termW), P(2.9), 'terminal');
      rect(P(termX + 1.4), P(termY - 1.3), P(2.2), P(1.35), 'terminal');
      rect(P(termX + termW / 2 - 1.1), P(termY - 1.3), P(2.2), P(1.35), 'terminal');
      rect(P(termX + termW - 3.6), P(termY - 1.3), P(2.2), P(1.35), 'terminal');

      // Air Traffic Control Tower (East of Terminal)
      rect(P(termX + termW + 0.8), P(termY - 0.5), 84, 84, 'tower');

      // 3 Huge Aircraft Maintenance Hangars (East Apron)
      rect(P(tx + w - 11.4), P(ty + h - 5.2), P(3.3), P(3.5), 'hangar');
      rect(P(tx + w - 7.7), P(ty + h - 5.2), P(3.3), P(3.5), 'hangar');
      rect(P(tx + w - 4.0), P(ty + h - 5.2), P(3.1), P(3.5), 'hangar');

      // West Cargo Logistics Hall & Aviation Fuel Farm Canopy
      rect(P(tx + 1.1), P(ty + h - 5.1), P(3.4), P(2.2), 'hall');
      rect(P(tx + 1.3), P(ty + h - 2.5), P(3.0), P(1.2), 'gasstation');

      // Aircraft, Helipad & Curbside Fleets
      vs(P(tx + 5.8), P(ty + h - 4.6), 0, ['heli']);
      vs(P(tx + w - 11.8), P(ty + h - 6.2), 0, ['heli']);
      vs(P(tx + w - 6.0), P(ty + h - 6.2), Math.PI, ['heli']);
      vs(P(termX + 2.5), P(ty + h - 0.55), 0, ['bus']);
      vs(P(termX + 6.5), P(ty + h - 0.55), 0, ['bus']);
      vs(P(termX + 10.5), P(ty + h - 0.55), 0, ['suv', 'sedan', 'sportscar']);
      vs(P(tx + 3.0), P(ty + h - 1.0), 0, ['pickup', 'humvee']);

      // Multi-zone Airport & Hangar Loot
      for (let k = 0; k < 6; k++) lp(P(termX + 1.5 + k * 2.2), P(termY + 3.2), 'airport');
      lp(P(tx + 2.8), P(ty + h - 2.7), 'gas');
      lp(P(tx + w - 9.7), P(ty + h - 5.6), 'airport');
      lp(P(tx + w - 6.0), P(ty + h - 5.6), 'airport');
      lp(P(tx + w - 2.5), P(ty + h - 5.6), 'military');

      // Dedicated Huge Enterable Airport Sub-Map Portal at Grand Terminal Entrance
      ent('air', 'airport', it.name, P(termX + termW / 2), P(termY + 2.95));
      lm(it, tx, ty, w, h);
    },
    building(tx, ty, w, h, it, style) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, 1, h, T.GRASS); fill(tx + w - 1, ty, 1, h, T.GRASS);
      set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      rect(P(tx + 1.3), P(ty + 0.9), P(w - 2.6), P(h - 2.2), style || BUILD_STYLE[it.pc.cat] || 'b');
      around(tx + 0.5, ty + 0.3, w - 1, h - 1, it.pc.loot, 5);
      if (/Parliament|Central Bank/.test(it.pc.cat) || /NATO|Pentagon|Federal Reserve|Bank of England/.test(it.name)) lp(P(tx + w) - 55, P(ty) + 55, 'vault', 1);
      if (it.pc.cat === 'Science Centre' && rng() < 0.5) zones.push(['toxic', Math.round(P(tx + w / 2)), Math.round(P(ty + h)), 260]);
      vehFor(it.pc.loot, tx, ty, w, h);
      const isMus = /Art Museum|Science Centre|National Archive|International HQ|High Court|Central Bank|Parliament/.test(it.pc.cat) || style === 'bank' || style === 'capitol';
      ent(isMus ? 'mus' : 'hub', isMus ? 'museum' : 'transit', it.name, P(tx + w / 2), P(ty + h - 1.25));
      lm(it, tx, ty, w, h);
    },
    big(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, 1, h, T.GRASS); fill(tx + w - 1, ty, 1, h, T.GRASS);
      set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      set(tx, ty + h - 1, T.FOREST); set(tx + w - 1, ty + h - 1, T.FOREST);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      const s = BUILD_STYLE[it.pc.cat] || 'b';
      rect(P(tx + 1.6), P(ty + 0.9), P(w - 3.2), P(h - 2.5), s);
      // Flanking civic wings / forecourt pavilions
      rect(P(tx + 0.9), P(ty + 2.2), P(0.9), P(h - 3.8), s);
      rect(P(tx + w - 1.8), P(ty + 2.2), P(0.9), P(h - 3.8), s);
      ell(tx + w / 2, ty + h - 1.2, 0.75, 0.45, T.SHALLOW);
      around(tx + 0.5, ty + 0.3, w - 1, h - 1, it.pc.loot, 6);
      if (/Parliament|Central Bank/.test(it.pc.cat) || /NATO|Federal Reserve/.test(it.name)) lp(P(tx + w) - 60, P(ty) + 60, 'vault', 1);
      if (it.pc.cat === 'Science Centre' && rng() < 0.5) zones.push(['toxic', Math.round(P(tx + w / 2)), Math.round(P(ty + h)), 260]);
      vehFor(it.pc.loot, tx, ty, w, h);
      ent('mus', 'museum', it.name, P(tx + w / 2), P(ty + h - 1.5));
      lm(it, tx, ty, w, h);
    },
    bank(tx, ty, w, h, it) { BUILD.big(tx, ty, w, h, it); lp(P(tx + 1.5), P(ty + 1.5), 'vault', 1); },
    capitol(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, w, 1, T.GRASS); fill(tx + 1, ty + h - 2, w - 2, 1, T.GRASS);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      // Grand central Capitol dome hall + symmetric legislative wings + reflecting pool
      rect(P(tx + 2.5), P(ty + 1.1), P(w - 5), P(h - 3.4), 'capitol');
      rect(P(tx + 0.9), P(ty + 1.6), P(1.5), P(h - 3.9), 'gov');
      rect(P(tx + w - 2.4), P(ty + 1.6), P(1.5), P(h - 3.9), 'gov');
      ell(tx + w / 2, ty + h - 1.5, 1.3, 0.55, T.SHALLOW);
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, it.pc.loot, 6);
      lp(P(tx + w) - 60, P(ty) + 60, 'vault', 1);
      vehFor('gov', tx, ty, w, h);
      ent('mus', 'museum', it.name, P(tx + w / 2), P(ty + h - 2.2));
      lm(it, tx, ty, w, h);
    },
    hospital(tx, ty, w, h, it) {
      // Multi-Wing Medical Center with East/West Ward Towers, Central ER Atrium, Ambulance Bay & Ground Helipad
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, 1, h - 1, T.GRASS); set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      rect(P(tx + 2.8), P(ty + 1.4), P(w - 5.6), P(h - 3.3), 'hospital');
      rect(P(tx + 1.1), P(ty + 0.9), P(1.8), P(h - 2.8), 'hospital');
      rect(P(tx + w - 2.9), P(ty + 0.9), P(1.8), P(h - 2.8), 'hospital');
      around(tx + 0.6, ty + 0.4, w - 1.2, h - 1.2, 'hospital', 6);
      vs(P(tx + 1.6), P(ty + h - 0.55), 0, ['ambulance']);
      vs(P(tx + w - 1.6), P(ty + h - 0.55), Math.PI, ['ambulance', 'sedan']);
      vs(P(tx + w - 1.6), P(ty + 1.8), 0, ['heli']);
      ent('hosp', 'hospital', it.name, P(tx + w / 2), P(ty + h - 1.85));
      lm(it, tx, ty, w, h);
    },
    milbase(tx, ty, w, h, it) {
      // Expansive Fortified Military Compound: Perimeter Patrol Loop, Tactical Air Strip, 3 Hangars, Barracks & Pentagon HQ
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx + 1, ty + 1, w - 2, h - 2, T.DIRT);
      // North Tactical Airstrip for rapid military airlift + cross-axis base roads
      fill(tx + 2, ty + 1, w - 4, 2, T.RUNWAY);
      fill(tx + Math.floor(w / 2) - 1, ty + 3, 2, h - 3, T.ROAD);
      fill(tx + 1, ty + Math.floor(h * 0.54), w - 2, 1, T.ROAD);
      // Outer razor-wire security fence around the entire base (North & South guarded gates)
      walls(P(tx + 0.14), P(ty + 0.14), P(tx + w - 0.14), P(ty + h - 0.14), 14, { t: 1, b: 1 }, 'milfence');
      rect(P(tx + w / 2 - 2.25), P(ty + h - 0.9), 76, 44, 'checkpoint');
      rect(P(tx + w / 2 + 1.3), P(ty + h - 0.9), 76, 44, 'checkpoint');
      rect(P(tx + w / 2 - 2.25), P(ty + 0.32), 76, 44, 'checkpoint');
      for (const [cx, cy] of [[tx + 0.45, ty + 0.45], [tx + w - 0.45, ty + 0.45], [tx + 0.45, ty + h - 0.45], [tx + w - 0.45, ty + h - 0.45]]) rect(P(cx) - 38, P(cy) - 38, 76, 76, 'tower');
      // Central Command HQ Bunker
      rect(P(tx + w / 2 - 2.3), P(ty + h * 0.54 - 2.4), P(4.6), P(2.4), 'checkpoint');
      // 3 Aircraft & Armor Hangars + East Barracks Complex
      rect(P(tx + 1.1), P(ty + 3.4), P(2.8), P(2.1), 'hangar');
      rect(P(tx + 4.3), P(ty + 3.4), P(2.8), P(2.1), 'hangar');
      rect(P(tx + w - 4.0), P(ty + 3.4), P(2.8), P(2.1), 'hangar');
      rect(P(tx + 1.2), P(ty + h - 4.6), P(3.4), P(1.8), 'gov');
      fill(tx + w - 5, ty + h - 5, 4, 4, T.CONCRETE);
      // Armored Motorpool & Helipad Fleet
      lp(P(tx + 2.5), P(ty + 5.8), 'military'); lp(P(tx + w - 2.5), P(ty + 5.8), 'military');
      lp(P(tx + 2.5), P(ty + h - 2.0), 'military'); lp(P(tx + w - 2.5), P(ty + h - 2.0), 'military');
      lp(P(tx + w / 2), P(ty + 3.8), 'vault', 1);
      vs(P(tx + 2.5), P(ty + h * 0.54 + 1.5), 0, ['humvee', 'apc']);
      vs(P(tx + 5.6), P(ty + h * 0.54 + 1.5), 0, ['tank', 'apc']);
      vs(P(tx + w - 3.0), P(ty + h * 0.54 + 1.5), Math.PI, ['tank', 'himars', 'apc']);
      vs(P(tx + w - 3.0), P(ty + h - 3.0), 0, ['heli']);
      vs(P(tx + w - 5.5), P(ty + h - 3.0), 0, ['heli']);
      ent('mil', 'military', it.name, P(tx + w / 2), P(ty + h * 0.54 + 0.08));
      lm(it, tx, ty, w, h);
    },
    mall(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx + 1, ty + h - 2, w - 2, 1, T.ROAD);
      fill(tx + 1, ty + h - 3, 2, 1, T.GRASS); fill(tx + w - 3, ty + h - 3, 2, 1, T.GRASS);
      const ms = it.pc.cat === 'Convention Centre' ? 'hall' : 'mall';
      rect(P(tx + 2.5), P(ty + 0.9), P(w - 5), P(h - 4.0), ms);
      // Flanking anchor department wings
      rect(P(tx + 0.8), P(ty + 1.4), P(1.6), P(h - 4.8), 'shop');
      rect(P(tx + w - 2.4), P(ty + 1.4), P(1.6), P(h - 4.8), 'shop');
      for (let k = 0; k < 5; k++) vs(P(tx + 2 + k * 2.4), P(ty + h - 1.4), Math.PI / 2, ['sedan', 'suv', 'pickup', 'sportscar']);
      for (let k = 0; k < 5; k++) lp(P(tx + 2 + k * 2.4), P(ty + h - 3) + 32, it.pc.loot);
      lp(P(tx + 1.2), P(ty + 2.5), it.pc.loot); lp(P(tx + w - 1.2), P(ty + 2.5), it.pc.loot);
      ent('mall', 'mall', it.name, P(tx + w / 2), P(ty + h - 3.05));
      lm(it, tx, ty, w, h);
    },
    park(tx, ty, w, h, it, zoo) {
      fill(tx, ty, w, h, T.GRASS);
      for (const [fx, fy] of [[tx + 2.2, ty + 2.2], [tx + w - 2.2, ty + 2.2], [tx + 2.2, ty + h - 2.2], [tx + w - 2.2, ty + h - 2.2]]) ell(fx, fy, 1.8, 1.6, T.FOREST);
      fill(tx, ty + Math.floor(h / 2), w, 1, T.DIRT); fill(tx + Math.floor(w / 2), ty, 1, h, T.DIRT);
      ell(tx + w / 2, ty + h / 2, 1.3, 1.1, T.SHALLOW);
      if (zoo) {
        for (const [ex, ey] of [[tx + 1, ty + 1], [tx + w / 2 + 1, ty + 1], [tx + 1, ty + h / 2 + 1]]) walls(P(ex), P(ey), P(ex + w / 2 - 2), P(ey + h / 2 - 2), 8, { b: 1 }, 'fence');
        rect(P(tx + w / 2 + 1.2), P(ty + h / 2 + 1.2), P(2.6), P(1.7), 'glass');
        ent('hub', 'transit', it.name, P(tx + w / 2 + 2.5), P(ty + h / 2 + 2.9));
      } else {
        rect(P(tx + 1.2), P(ty + 1.2), P(2.8), P(1.8), 'glass');
        rect(P(tx + w - 4.0), P(ty + h - 3.0), P(2.8), P(1.8), 'glass');
        ent('mus', 'museum', it.name, P(tx + 2.6), P(ty + 3.0));
      }
      scatter(tx, ty, w, h, it.pc.loot, 6); lm(it, tx, ty, w, h);
    },
    zoo(tx, ty, w, h, it) { BUILD.park(tx, ty, w, h, it, true); },
    market(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx + Math.floor(w / 2) - 1, ty + 2, 2, h - 2, T.ROAD);
      rect(P(tx + w / 2 - 1.8), P(ty + 0.6), P(3.6), P(1.6), 'hall');
      ent('mall', 'mall', it.name, P(tx + w / 2), P(ty + 2.3));
      for (let i = tx + 0.8; i < tx + w - 1.3; i += 1.45) {
        if (Math.abs((i + 0.35) - (tx + w / 2)) < 1.3) continue;
        for (let j = ty + 2.8; j < ty + h - 1.3; j += 1.55) {
          rect(P(i), P(j), 56, 44, 'stall');
        }
      }
      scatter(tx, ty + 2, w, h - 2.5, it.pc.loot, 10);
      vs(P(tx + 1), P(ty + h) - 40, 0, ['pickup', 'motorcycle', 'quad']);
      lm(it, tx, ty, w, h);
    },
    complex(tx, ty, w, h, it) {
      // Grand 15x12 University / Olympic / Diplomatic Quad with 6 Campus Buildings, Cross Walks & Reflection Pond
      fill(tx, ty, w, h, T.CONCRETE); fill(tx + 1, ty + 1, w - 2, h - 2, T.GRASS);
      fill(tx + Math.floor(w / 2) - 1, ty + 1, 2, h - 1, T.CONCRETE);
      fill(tx + 1, ty + Math.floor(h / 2), w - 2, 1, T.CONCRETE);
      ell(tx + w / 2, ty + h / 2, 1.35, 1.15, T.SHALLOW);
      const bw = (w - 2) / 3, bh = (h - 2) / 2;
      const st = it.pc.cat === 'University Campus' ? 'campus' : it.pc.cat === 'Olympic Park' ? 'hall' : 'embassy';
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
        const rx = P(tx + 1 + c * bw) + 28, ry = P(ty + 1 + r * bh) + 28, rw = P(bw) - 56, rh = P(bh) - 56;
        rect(rx, ry, rw, rh, st);
        if (c === 1 && r === 1) {
          if (st === 'campus') ent('univ', 'university', it.name, rx + rw / 2, ry + rh);
          else if (st === 'hall') ent('hub', 'transit', it.name, rx + rw / 2, ry + rh);
          else ent('mus', 'museum', it.name, rx + rw / 2, ry + rh);
        }
      }
      for (let c = 0; c < 3; c++) lp(P(tx + 1 + c * bw + bw / 2), P(ty + 1 + bh), it.pc.loot);
      around(tx, ty, w, h, it.pc.loot, 5); vehFor(it.pc.loot, tx, ty, w, h); lm(it, tx, ty, w, h);
    },
    fort(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.DIRT);
      fill(tx + Math.floor(w / 2) - 1, ty + Math.floor(h / 2), 2, Math.ceil(h / 2), T.CONCRETE);
      walls(P(tx + 0.5), P(ty + 0.5), P(tx + w - 0.5), P(ty + h - 0.5), 50, { b: 1 }, 'fortwall');
      for (const [cx, cy] of [[tx + 0.5, ty + 0.5], [tx + w - 0.5, ty + 0.5], [tx + 0.5, ty + h - 0.5], [tx + w - 0.5, ty + h - 0.5]]) rect(P(cx) - 54, P(cy) - 54, 108, 108, 'tower');
      rect(P(tx + w / 2 - 2.0), P(ty + h / 2 - 2.4), P(4.0), P(3.4), 'keep');
      rect(P(tx + 1.6), P(ty + 1.6), P(2.0), P(1.4), 'stone');
      rect(P(tx + w - 3.6), P(ty + 1.6), P(2.0), P(1.4), 'stone');
      lp(P(tx + 2.5), P(ty + 3.4), 'military'); lp(P(tx + w - 2.5), P(ty + 3.4), 'military'); lp(P(tx + 2.5), P(ty + h - 2), 'historic'); lp(P(tx + w - 2.5), P(ty + h - 2), 'museum');
      vs(P(tx + 2.5), P(ty + h / 2 + 1.5), Math.PI / 2, ['humvee', 'pickup']);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h / 2 + 1.05));
      lm(it, tx, ty, w, h);
    },
    palace(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      fill(tx + 1, ty + 1, w - 2, h - 2, T.CONCRETE);
      fill(tx + 2, ty + h - 4, w - 4, 3, T.GRASS);
      fill(tx + Math.floor(w / 2) - 1, ty + h - 4, 2, 4, T.CONCRETE);
      for (let i = tx; i < tx + w; i++) { if (i % 3) { set(i, ty, T.FOREST); set(i, ty + h - 1, T.FOREST); } }
      const ps = it.name === 'The Forbidden City' ? 'pagoda' : 'palace';
      rect(P(tx + 3.2), P(ty + 1.4), P(w - 6.4), P(h - 5.4), ps);
      rect(P(tx + 1.3), P(ty + 2.0), P(1.7), P(h - 5.2), ps);
      rect(P(tx + w - 3.0), P(ty + 2.0), P(1.7), P(h - 5.2), ps);
      ell(tx + w / 2, ty + h - 2.1, 1.3, 0.8, T.SHALLOW);
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, it.pc.loot, 6); lp(P(tx + w / 2) - 170, P(ty + h - 2.2), it.pc.loot);
      vs(P(tx + 1.8), P(ty + h - 1.4), 0, ['sportscar', 'suv']);
      ent('mus', 'museum', it.name, P(tx + w / 2), P(ty + h - 3.95));
      lm(it, tx, ty, w, h);
    },
    cathedral(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, 1, h, T.GRASS); fill(tx + w - 1, ty, 1, h, T.GRASS);
      set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      rect(P(tx + 1.4), P(ty + 1.0), P(w - 2.8), P(h - 2.4), 'church');
      rect(P(tx + 1.2), P(ty + 0.9), 52, 52, 'tower');
      rect(P(tx + w - 1.2) - 52, P(ty + 0.9), 52, 52, 'tower');
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, it.pc.loot, 5);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 1.4));
      lm(it, tx, ty, w, h);
    },
    temple(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      fill(tx, ty, 1, h, T.GRASS); fill(tx + w - 1, ty, 1, h, T.GRASS);
      set(tx, ty, T.FOREST); set(tx + w - 1, ty, T.FOREST);
      rect(P(tx + 1.4), P(ty + 1.0), P(w - 2.8), P(h - 2.2), 'temple');
      around(tx + 0.5, ty + 0.4, w - 1, h - 1, it.pc.loot, 5);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 1.2));
      lm(it, tx, ty, w, h);
    },
    pyramid(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.SAND);
      fill(tx + Math.floor(w / 2) - 1, ty + h - 2, 2, 2, T.CONCRETE);
      rect(P(tx + 2.2), P(ty + 1.4), P(w - 4.4), P(h - 3.8), 'pyramid');
      // Twin companion queen pyramids framing sacred complex
      rect(P(tx + 0.5), P(ty + h - 2.7), P(1.6), P(1.6), 'pyramid');
      rect(P(tx + w - 2.1), P(ty + h - 2.7), P(1.6), P(1.6), 'pyramid');
      around(tx + 0.6, ty + 0.6, w - 1.2, h - 1.2, 'museum', 6); lp(P(tx + w / 2) - 100, P(ty + h) - 40, 'vault', 1);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 2.3));
      lm(it, tx, ty, w, h);
    },
    mosque(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE);
      ell(tx + w / 2, ty + h - 1.4, 1.1, 0.55, T.SHALLOW);
      rect(P(tx + 1.8), P(ty + 1.5), P(w - 3.6), P(h - 3.4), 'mosque');
      for (const [cx, cy] of [[tx + 0.85, ty + 0.85], [tx + w - 0.85, ty + 0.85], [tx + 0.85, ty + h - 0.85], [tx + w - 0.85, ty + h - 0.85]]) rect(P(cx) - 22, P(cy) - 22, 44, 44, 'minaret');
      lp(P(tx + w / 2), P(ty) + 45, it.pc.loot); lp(P(tx + w / 2), P(ty + h) - 45, it.pc.loot); lp(P(tx) + 45, P(ty + h / 2), it.pc.loot);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 1.9));
      lm(it, tx, ty, w, h);
    },
    rockcut(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.ROCK); fill(tx + 2, ty + 2, w - 4, h - 4, T.DIRT); fill(tx + Math.floor(w / 2) - 1, ty + h - 2, 2, 2, T.DIRT);
      rect(P(tx + 2.5), P(ty + 2.0), P(w - 5), P(1.6), 'temple');
      lp(P(tx + 2.5), P(ty + h - 3), 'museum'); lp(P(tx + w - 2.5), P(ty + h - 3), 'museum'); lp(P(tx + w / 2), P(ty + 4.8), 'museum');
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + 3.65));
      lm(it, tx, ty, w, h);
    },
    mausoleum(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS);
      fill(tx + 1, ty + 1, w - 2, h - 2, T.GRASS);
      fill(tx + 1, ty + Math.floor(h / 2), w - 2, 1, T.CONCRETE);
      fill(tx + Math.floor(w / 2) - 1, ty + 2, 2, h - 2, T.CONCRETE);
      fill(tx + Math.floor(w / 2), ty + h - 4, 1, 3, T.SHALLOW);
      rect(P(tx + 2.4), P(ty + 1.0), P(w - 4.8), P(h - 4.6), 'dome');
      for (const [cx, cy] of [[tx + 1.6, ty + 1.0], [tx + w - 1.6, ty + 1.0], [tx + 1.6, ty + h - 3.6], [tx + w - 1.6, ty + h - 3.6]]) rect(P(cx) - 18, P(cy) - 18, 36, 36, 'minaret');
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, it.pc.loot, 5);
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 3.6));
      lm(it, tx, ty, w, h);
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
      lp(P(tx) + 30, P(ty) + 30, 'historic'); lp(P(tx + w) - 30, P(ty + h) - 30, 'rural');
      ent('hist', 'historic', it.name, P(tx + w / 2), P(ty + h - 0.7));
      lm(it, tx, ty, w, h);
    },
    estate(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); for (let i = tx + 1; i < tx + w - 1; i++) { set(i, ty + 1, T.FOREST); }
      fill(tx + Math.floor(w / 2) - 1, ty + h - 3, 2, 3, T.CONCRETE);
      rect(P(tx + 2), P(ty + 2), P(w - 4), P(h - 5), 'manor'); ell(tx + w / 2, ty + h - 1.5, 0.9, 0.5, T.SHALLOW);
      walls(P(tx) + 10, P(ty) + 10, P(tx + w) - 10, P(ty + h) - 10, 12, {b: 1}, 'fence');
      around(tx + 0.5, ty + 0.5, w - 1, h - 1, 'house', 6); vs(P(tx + 2), P(ty + h - 1.5), 0, ['sportscar', 'suv', 'pickup']);
      ent('hub', 'transit', it.name, P(tx + w / 2), P(ty + h - 3));
      lm(it, tx, ty, w, h);
    },
    monastery(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2;
      ell(cx, cy, w / 2, h / 2, T.ROCK, 0.2, 7); ell(cx, cy, w / 2 - 2, h / 2 - 2, T.DIRT); fill(Math.floor(cx) - 1, Math.floor(cy), 2, h / 2 + 1, T.DIRT);
      rect(P(cx - 1.5), P(cy - 1.5), P(3), P(2), 'church');
      lp(P(cx - 2), P(cy + 1), 'historic'); lp(P(cx + 2), P(cy + 1), 'hospital'); lp(P(cx), P(cy + 2.4), 'historic');
      ent('hist', 'historic', it.name, P(cx), P(cy + 0.5));
      lm(it, tx, ty, w, h);
    },
    silo(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.FARM); fill(tx, ty + h - 3, w, 3, T.DIRT);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      for (let k = 0; k < 5; k++) rect(P(tx + 1.1 + k * 1.85), P(ty + 1.2), 74, 74, 'silo');
      rect(P(tx + 1.2), P(ty + h - 3.0), P(3.2), P(1.8), 'barn');
      vs(P(tx + w - 2.2), P(ty + h - 1.5), 0, ['pickup', 'tractor']); scatter(tx, ty + h / 2, w, h / 2, 'rural', 4);
      ent('ind', 'industrial', it.name, P(tx + 2.8), P(ty + h - 1.2));
      lm(it, tx, ty, w, h);
    },
    dam(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); const mid = ty + Math.floor(h / 2);
      ell(tx + w / 2, ty + h / 4, w / 2, h / 4 + 0.5, T.SHALLOW); ell(tx + w / 2, ty + h / 4, w / 2 - 1.2, h / 4 - 0.6, T.DEEP);
      for (let i = tx; i < tx + w; i++) { set(i, mid, T.CONCRETE); set(i, mid + 1, T.ROAD); }
      rect(P(tx), P(mid) + 10, P(w), 64, 'dam'); fill(tx + Math.floor(w / 2) - 1, mid + 2, 2, h - (mid - ty) - 2, T.SHALLOW);
      rect(P(tx + 1.4), P(mid + 2.5), P(3.2), P(1.8), 'civic');
      rect(P(tx + w - 4.6), P(mid + 2.5), P(3.2), P(1.8), 'intl');
      vs(P(tx + w / 2), P(ty + 1.6), 0, ['boat', 'jetski']); lp(P(tx + 2.5), P(mid + 4.5), 'rural'); lp(P(tx + 5), P(mid + 4.5), 'gov');
      ent('ind', 'industrial', it.name, P(tx + 3.0), P(mid + 4.3));
      lm(it, tx, ty, w, h);
    },
    green(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.GRASS); ell(tx + w / 2, ty + h / 2, 1.4, 1.1, T.SHALLOW);
      for (const [cx, cy] of [[tx + 0.6, ty + 0.6], [tx + w - 2.3, ty + 0.6], [tx + 0.6, ty + h - 2.2], [tx + w - 2.3, ty + h - 2.2], [tx + w / 2 - 0.9, ty + 0.4]]) rect(P(cx), P(cy), P(1.7), P(1.4), 'cottage');
      scatter(tx + 1, ty + 1, w - 2, h - 2, 'house', 5); lm(it, tx, ty, w, h);
    },
    windmill(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.FARM); const water = /Watermill|Mill at/.test(it.name);
      if (water) fill(tx + 2, ty, 1, h, T.SHALLOW);
      for (let k = 0; k < 4; k++) rect(P(tx + (water ? 3.4 : 1) + k * 2), P(ty + 1.5 + (k % 2)), 72, 72, water ? 'watermill' : 'windmill');
      rect(P(tx + 1.2), P(ty + h - 2.5), P(2.8), P(1.6), 'farmhouse');
      scatter(tx, ty, w, h, 'rural', 4); vs(P(tx + w - 1.5), P(ty + h - 1), 0, ['tractor', 'pickup']);
      ent('ind', 'industrial', it.name, P(tx + 2.6), P(ty + h - 0.9));
      lm(it, tx, ty, w, h);
    },
    busterminal(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); fill(tx + 1, ty + 3, w - 2, h - 4, T.ROAD);
      rect(P(tx + 1), P(ty + 0.7), P(w - 2), P(2.2), 'terminal');
      for (let k = 0; k < 4; k++) vs(P(tx + 2 + k * 2.5), P(ty + 5.8), Math.PI / 2, ['bus']);
      for (let k = 0; k < 4; k++) lp(P(tx + 1.5 + k * 2.5), P(ty + 3.2), it.pc.loot);
      ent('hub', 'transit', it.name, P(tx + w / 2), P(ty + 2.9));
      lm(it, tx, ty, w, h);
    },
    waterfront(tx, ty, w, h, it) {
      const hh = Math.floor(h / 2); fill(tx, ty, w, hh, T.DEEP); fill(tx, ty + hh - 1, w, 1, T.SHALLOW); fill(tx, ty + hh, w, h - hh, T.CONCRETE);
      fill(tx + 2, ty + 1, 2, hh, T.CONCRETE);
      fill(tx + Math.floor(w / 2) - 1, ty + 1, 2, hh, T.CONCRETE);
      fill(tx + w - 4, ty + 1, 2, hh, T.CONCRETE);
      fill(tx + 1, ty + h - 1, w - 2, 1, T.ROAD);
      rect(P(tx + w / 2 - 2.0), P(ty + hh + 0.5), P(4.0), P(1.8), 'hall');
      for (let k = 0; k < 4; k++) if (k !== 1 && k !== 2) rect(P(tx + 1 + k * 3.4), P(ty + h - 2.4), 72, 56, 'stall');
      vs(P(tx + 3), P(ty + 1.5), 0, ['boat']); vs(P(tx + w / 2 + 2.5), P(ty + 1.5), 0, ['jetski', 'hovercraft']);
      for (let k = 0; k < 5; k++) lp(P(tx + 1.5 + k * 3), P(ty + hh + 1.2), it.pc.loot);
      ent('hub', 'transit', it.name, P(tx + w / 2), P(ty + hh + 2.3));
      lm(it, tx, ty, w, h);
    },
    aquarium(tx, ty, w, h, it) {
      fill(tx, ty, w, h, T.CONCRETE); rect(P(tx + 0.8), P(ty + 0.8), P(w * 0.56), P(h - 1.6), 'aquarium'); fill(tx + Math.ceil(w * 0.66), ty + 1, Math.floor(w * 0.28), h - 2, T.SHALLOW);
      around(tx, ty, w, h, it.pc.loot, 4);
      ent('mus', 'museum', it.name, P(tx + 0.8 + w * 0.56 / 2), P(ty + h - 0.8));
      lm(it, tx, ty, w, h);
    },
    // ── natural (sculpted multi-ridge alpine massif for K2 / Everest / Fuji etc.) ──
    mountain(tx, ty, w, h, it) {
      const cx = tx + w / 2, cy = ty + h / 2, rx = w / 2, ry = h / 2;
      const ph = (tx * 0.37 + ty * 0.71) % 6.28;
      for (let j = ty; j < ty + h; j++) for (let i = tx; i < tx + w; i++) {
        if (!inb(i, j)) continue;
        const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
        const r = Math.hypot(dx, dy);
        if (r > 0.98) continue;
        const ang = Math.atan2(dy, dx);
        // 5 radial tectonic spurs + secondary ridge harmonic for organic massif silhouette
        const spur = Math.max(0, Math.cos(ang * 5 + ph)) * 0.16 + Math.cos(ang * 3 - ph * 0.7) * 0.08;
        const nz = (vnoise(i * 0.28, j * 0.28, seed + 41) - 0.5) * 0.12;
        const hVal = 1 - r + spur + nz;
        let t;
        if (hVal > 0.64) t = T.SNOW;
        else if (hVal > 0.52) t = (Math.sin(ang * 5 + ph) > 0.35 ? T.ICE : T.ROCK);
        else if (hVal > 0.24) t = T.ROCK;
        else if (hVal > 0.08) t = T.FOREST;
        else continue;
        tiles[idx(i, j)] = t;
      }
      // Solid central glacier peak + southern base-camp approach ridge trail
      for (let k = Math.floor(cy + 2); k < ty + h; k++) {
        const bend = Math.round(Math.sin((k - cy) * 0.38) * 1.1);
        set(Math.floor(cx) + bend, k, k < cy + ry * 0.55 ? T.SNOW : T.DIRT);
      }
      rect(P(cx - 0.8), P(ty + h - 1.8), 64, 50, 'stall');
      vs(P(cx + 1.4), P(ty + h - 1.2), 0, ['snowmobile', 'quad']);
      lp(P(cx - rx * 0.75), P(cy), 'nature'); lp(P(cx + rx * 0.75), P(cy), 'nature'); lp(P(cx), P(ty + h - 1.0), 'military');
      lm(it, tx, ty, w, h);
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
  const fits = (tx, ty, w, h, wild, kind, keepAvenues = false) => {
    if (tx < 12 || ty < 12 || tx + w > W - 12 || ty + h > H - 12) return false;
    let over = 0;
    for (let j = ty; j < ty + h; j++) for (let i = tx; i < tx + w; i++) {
      const idx2 = idx(i, j);
      const o = occ[idx2];
      if (o >= 3) return false;
      if (wild) {
        if (road[idx2] === 1) return false;
        if (o === 2) over++;
      } else {
        if (o) return false;
        if (keepAvenues && road[idx2]) return false;
        const t = tiles[idx2]; if (t === T.DEEP || t === T.ROCK || t === T.SHALLOW || t === T.LAVA) return false;
      }
    }
    if (wild && over > w * h * 0.12) return false;
    if (wild && !['reef', 'strait', 'lagoon', 'fjord'].includes(kind) && tiles[idx(Math.floor(tx + w / 2), Math.floor(ty + h / 2))] === T.DEEP) return false;
    return true;
  };
  const CORE_KINDS = new Set(['capitol', 'bank', 'palace', 'hospital', 'mall', 'complex', 'big', 'building', 'busterminal']);
  const URBAN_QUADS = [10, 26, 42, 58];
  const SPORTS_QUADS = [2, 18, 42, 66];
  const HIST_QUADS = [13, 27, 42, 55];
  const items = []; const seen = new Set();
  for (const pc of PLACES) for (const name of pc.names) { if (seen.has(name)) continue; seen.add(name); items.push({name, pc}); }
  items.sort((a, b) => { const A = SIZE[a.pc.kind], B = SIZE[b.pc.kind]; return B[0] * B[1] - A[0] * A[1]; });
  let skipped = 0; const skippedK = {};
  for (const it of items) {
    const kind = it.pc.kind; let [w, h] = SIZE[kind]; if (ROT.has(kind) && rng() < 0.5) [w, h] = [h, w];
    const wild = WILD.has(it.pc.theme);
    const isCore = CORE_KINDS.has(kind);
    const tryR = (list, tries) => {
      const largeAnchor = w >= 18 || h >= 14;
      for (let t = 0; t < tries; t++) {
        const r = pick(list), rx0 = (r % 5) * RS, ry0 = Math.floor(r / 5) * RS;
        const rth = themeOf(r);
        let tx, ty;
        // Large compounds (Airports, Military Bases, Circuits) try clean quadrant-anchored positions first so they never straddle highways
        if (largeAnchor && t < tries * 0.6) {
          tx = rx0 + (w >= 28 ? pick([2, 43]) : pick([2, 18, 43, 58]));
          ty = ry0 + pick([2, 20, 43, 60]);
          if (tx + w <= rx0 + RS - 2 && ty + h <= ry0 + RS - 2 && fits(tx, ty, w, h, wild, kind, t < tries * 0.22)) return [tx, ty];
        }
        // District-zoned snapped grid placement for structured urban, civic, historic & sports quarters
        if (!wild && !largeAnchor && t < tries * 0.72) {
          const slots = (rth === 'city' || rth === 'gov' || rth === 'culture') ? URBAN_QUADS
            : rth === 'sports' ? SPORTS_QUADS
            : (rth === 'historic' || rth === 'rural') ? HIST_QUADS : null;
          if (slots) {
            const pref = isCore && slots === URBAN_QUADS && t < tries * 0.45 ? [26, 42] : slots;
            tx = rx0 + pick(pref);
            ty = ry0 + pick(pref);
            if (fits(tx, ty, w, h, wild, kind, t < tries * 0.48)) return [tx, ty];
          }
        }
        tx = RI(rx0 + 2, rx0 + RS - 2 - w); ty = RI(ry0 + 2, ry0 + RS - 2 - h);
        if (fits(tx, ty, w, h, wild, kind, !wild && !largeAnchor && t < tries * 0.35)) return [tx, ty];
      }
      return null;
    };
    const pos = tryR(regionsOf(it.pc.theme), 450) || tryR(wild ? WILD_R : DEV_R, 900) || (wild ? null : tryR(WILD_R, 600)) || tryR([...DEV_R, ...WILD_R], 1500);
    if (!pos) { skipped++; skippedK[kind] = (skippedK[kind] || 0) + 1; continue; }
    for (let j = pos[1] - 1; j <= pos[1] + h; j++) for (let i = pos[0] - 1; i <= pos[0] + w; i++) if (inb(i, j)) {
      if (occ[idx(i, j)] < 2) occ[idx(i, j)] = wild ? 2 : 3;
      if (!wild && road[idx(i, j)] >= 2 && i >= pos[0] && j >= pos[1] && i < pos[0] + w && j < pos[1] + h) road[idx(i, j)] = 0;
    }
    BUILD[kind](pos[0], pos[1], w, h, it);
  }

  // ── organized quadrant-based neighborhoods, pocket parks, historic squares & rural farmsteads ──
  const buildUrbanLot = (gx, gy, th, role) => {
    for (let j = gy; j < gy + 6; j++) for (let i = gx; i < gx + 6; i++) {
      const t = tiles[idx(i, j)];
      if (occ[idx(i, j)] || road[idx(i, j)] || t === T.DEEP || t === T.SHALLOW || t === T.ROCK || t === T.LAVA) return;
    }
    for (let j = gy; j < gy + 6; j++) for (let i = gx; i < gx + 6; i++) occ[idx(i, j)] = 3;
    if (role === 'park') {
      fill(gx, gy, 6, 6, T.GRASS);
      fill(gx, gy + 2.5, 6, 1, T.CONCRETE); fill(gx + 2.5, gy, 1, 6, T.CONCRETE);
      ell(gx + 3, gy + 3, 1.0, 1.0, T.SHALLOW);
      set(gx, gy, T.FOREST); set(gx + 5, gy, T.FOREST); set(gx, gy + 5, T.FOREST); set(gx + 5, gy + 5, T.FOREST);
      lp(P(gx + 1.2), P(gy + 1.2), 'house');
      return;
    }
    fill(gx, gy, 6, 6, th === 'historic' ? T.DIRT : T.CONCRETE);
    const roll = rng();
    if (role === 'civic') {
      if (roll < 0.38) {
        fill(gx + 2, gy + 5, 2, 1, T.ROAD); rect(P(gx + 1), P(gy + 1), P(4), P(4), 'hospital');
        for (const [a, b] of [[0.5, 3], [5.5, 3], [3, 0.5], [3, 5.5]]) lp(P(gx + a), P(gy + b), 'hospital');
        vs(P(gx + 0.5), P(gy + 5.5), 0, ['ambulance']); ent('hosp', 'hospital', 'City General Hospital', P(gx + 3), P(gy + 5));
      } else if (roll < 0.7) {
        fill(gx + 2, gy + 4, 2, 2, T.ROAD); rect(P(gx + 1), P(gy + 1), P(4), P(3), 'police');
        lp(P(gx + 3), P(gy + 4.6), 'police'); lp(P(gx + 0.5), P(gy + 2), 'police');
        vs(P(gx + 1.5), P(gy + 5.3), 0, ['police']); ent('hub', 'transit', 'Sector Police Precinct', P(gx + 3), P(gy + 4));
      } else {
        rect(P(gx + 1), P(gy + 1), P(2.5), P(1.6), 'gasstation'); rect(P(gx + 1), P(gy + 3.4), P(3.4), P(0.6), 'canopy');
        lp(P(gx + 4.2), P(gy + 1.5), 'gas'); lp(P(gx + 1.5), P(gy + 4.8), 'gas'); vs(P(gx + 4.5), P(gy + 4.6), 0, ['sedan', 'pickup', 'motorcycle']);
      }
      return;
    }
    if (role === 'commercial') {
      const s = pick(['office', 'shop', 'apartment']);
      rect(P(gx + 0.8), P(gy + 0.8), P(4.4), P(4.4), s);
      lp(P(gx + 0.4), P(gy + 3), s === 'shop' ? 'mall' : 'house');
      lp(P(gx + 5.6), P(gy + 3), 'house'); lp(P(gx + 3), P(gy + 5.6), 'house');
    } else {
      const lotStyle = th === 'historic' ? ['cottage', 'house', 'shop'] : ['house', 'house', 'apartment', 'shop'];
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if (rng() < 0.88) {
        rect(P(gx + 0.6 + a * 2.6), P(gy + 0.6 + b * 2.6), P(2), P(2), pick(lotStyle));
        lp(P(gx + 0.3 + a * 2.6), P(gy + 2.85 + b * 2.6), 'house');
      }
    }
    if (rng() < 0.35) vs(P(gx + 5.5), P(gy + 0.6), Math.PI / 2, ['sedan', 'suv', 'sportscar', 'motorcycle', 'pickup']);
  };

  for (let r = 0; r < 25; r++) {
    const th = themeOf(r);
    if (WILD.has(th)) continue;
    const rx0 = (r % 5) * RS, ry0 = Math.floor(r / 5) * RS;
    if (th === 'rural') {
      // Neat rural farmsteads along the 12/26/40/54/68 country lane grid
      const spans = [[1, 11], [13, 25], [27, 38], [42, 53], [55, 67], [69, 78]];
      for (const [sy0, sy1] of spans) for (const [sx0, sx1] of spans) {
        if (sx1 - sx0 < 6 || sy1 - sy0 < 6 || rng() > 0.34) continue;
        const gx = rx0 + sx0 + 1, gy = ry0 + sy0 + 1;
        if (gx < 13 || gy < 13 || gx + 6 > W - 13 || gy + 6 > H - 13) continue;
        let ok = true;
        for (let j = gy; j < gy + 6 && ok; j++) for (let i = gx; i < gx + 6; i++) {
          const t = tiles[idx(i, j)];
          if (occ[idx(i, j)] || road[idx(i, j)] || t === T.DEEP || t === T.SHALLOW || t === T.ROCK) ok = false;
        }
        if (!ok) continue;
        for (let j = gy; j < gy + 6; j++) for (let i = gx; i < gx + 6; i++) occ[idx(i, j)] = 3;
        fill(gx, gy, 6, 6, T.FARM); fill(gx, gy, 3, 3, T.GRASS);
        set(gx + 5, gy, T.FOREST); set(gx + 5, gy + 1, T.FOREST);
        rect(P(gx + 0.6), P(gy + 0.6), P(1.8), P(1.2), rng() < 0.35 ? 'barn' : 'farmhouse');
        lp(P(gx + 0.6), P(gy + 2.4), 'rural'); lp(P(gx + 2.6), P(gy + 1.2), 'rural');
        if (rng() < 0.42) vs(P(gx + 2.8), P(gy + 2.6), 0, ['pickup', 'tractor', 'quad', 'sedan']);
      }
      continue;
    }
    const spans = (th === 'city' || th === 'gov' || th === 'culture')
      ? [[10, 23], [26, 38], [42, 55], [58, 71]]
      : th === 'sports'
        ? [[2, 15], [18, 38], [42, 63], [66, 77]]
        : [[13, 25], [27, 38], [42, 53], [55, 67]];
    const blockDens = th === 'city' ? 0.72 : th === 'culture' ? 0.62 : th === 'gov' ? 0.58 : th === 'historic' ? 0.56 : 0.44;
    for (const [sy0, sy1] of spans) for (const [sx0, sx1] of spans) {
      const bw = sx1 - sx0 + 1, bh = sy1 - sy0 + 1;
      if (bw < 6 || bh < 6 || rng() > blockDens) continue;
      // Assign cohesive block zoning per street-bounded block
      const bRoll = rng();
      const blockRole = bRoll < 0.16 ? 'park' : bRoll < 0.32 ? 'civic' : bRoll < 0.62 ? 'commercial' : 'residential';
      if (bw >= 13 && bh >= 13) {
        // Subdivide large city quadrant cleanly into 4 aligned 6x6 corner lots with greenway alleys
        const xs = [rx0 + sx0, rx0 + sx1 - 5], ys = [ry0 + sy0, ry0 + sy1 - 5];
        for (const ly of ys) for (const lx of xs) {
          if (lx < 12 || ly < 12 || lx + 6 > W - 12 || ly + 6 > H - 12) continue;
          const lotRole = (blockRole === 'civic' && (lx !== xs[0] || ly !== ys[0])) ? (rng() < 0.5 ? 'park' : 'commercial') : blockRole;
          if (rng() < 0.85) buildUrbanLot(lx, ly, th, lotRole);
        }
      } else {
        const lx = rx0 + sx0, ly = ry0 + sy0;
        if (lx >= 12 && ly >= 12 && lx + 6 <= W - 12 && ly + 6 <= H - 12) buildUrbanLot(lx, ly, th, blockRole);
      }
    }
  }
  // parked cars along highways
  for (const c of HW) for (let k = 16; k < W - 16; k += 7) {
    if (rng() < 0.1) vs(P(k) + 40, P(c + 1) + 40, 0, ['sedan', 'suv', 'pickup', 'motorcycle', 'sportscar', 'bus']);
    if (rng() < 0.1) vs(P(c - 1) + 40, P(k) + 40, Math.PI / 2, ['sedan', 'suv', 'pickup', 'motorcycle', 'police']);
  }
  // roads (highways always painted; secondary avenues over water/land unless occupied by landmark; country lanes dirt)
  for (let i = 0; i < W * H; i++) {
    if (road[i] === 1 || (road[i] === 2 && occ[i] < 3)) tiles[i] = T.ROAD;
    else if (road[i] === 3 && occ[i] < 3 && tiles[i] !== T.DEEP && tiles[i] !== T.SHALLOW && tiles[i] !== T.LAVA) tiles[i] = T.DIRT;
  }
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
    for (let i = entrances.length - 1; i >= 0; i--) {
      if (Math.abs(entrances[i].x - cx) < padRadiusPx + 80 && Math.abs(entrances[i].y - cy) < padRadiusPx + 80) {
        entrances.splice(i, 1);
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

  // ensure natural deep water never abuts soft dry terrain (bridges, piers, cliffs & ice preserved)
  const isSoftDry = t => t === T.GRASS || t === T.FOREST || t === T.SAND || t === T.DIRT || t === T.SNOW || t === T.SWAMP || t === T.TOXIC || t === T.DUNE || t === T.SALT || t === T.FARM;
  const shoreCopy = new Uint8Array(tiles);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y);
      if (shoreCopy[i] !== T.DEEP) continue;
      if (isSoftDry(shoreCopy[i - W]) || isSoftDry(shoreCopy[i + W]) || isSoftDry(shoreCopy[i - 1]) || isSoftDry(shoreCopy[i + 1])) {
        tiles[i] = T.SHALLOW;
      }
    }
  }

  // spawn points
  const roadPts = (regs, n) => { const out = []; for (let t = 0; t < 8000 && out.length < n; t++) { const r = pick(regs); const x = (r % 5) * RS + RI(4, RS - 5), y = Math.floor(r / 5) * RS + RI(4, RS - 5); if (tiles[idx(x, y)] === T.ROAD) out.push([P(x) + 40, P(y) + 40]); } return out; };
  const spawns = roadPts([12, 13, 17, 7, 11], 80);
  const teamSpawns = [roadPts([6], 30), roadPts([8], 30), roadPts([16], 30), roadPts([18], 30)];

  return {W, H, TS, tiles, region, rects, styles, landmarks, loot, vspawns, zones, entrances, spawns, teamSpawns, skipped, skippedK,
    themes: THEMES.flat(), rnames: RNAMES.flat()};
}
module.exports = {generateMap};
