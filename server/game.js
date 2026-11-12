'use strict';
const {clamp, angDiff, pickW, circleRect, Hash, Index, RectGrid} = require('./util');
const {generateMap} = require('./map');
const {PROPS} = require('./data/tiles');
const {WEAPONS, WLIST, BYCAT, AMMO, CATS, wkey} = require('./data/weapons');
const {ITEMS, STRUCTS, RECIPES, ITEM_CATS} = require('./data/items');
const VEH = require('./data/vehicles'); const VLIST = Object.keys(VEH);
const ZD = require('./data/zombies'); const ZLIST = Object.keys(ZD);
const {SKY, COSMIC, FXD} = require('./data/sky');
const LOOT = require('./data/loot');

const accounts = require('./accounts');
const {PLOTS, UPGRADES, REBORN_PERKS, computePlotLevel, computePlotSize, getUpgradeCost} = require('./data/shelter');

const THEME_DENS = {city:16,gov:14,culture:14,sports:14,historic:12,rural:10,alpine:8,volcanic:8,karst:8,coast:8,desert:8,saltflat:6,canyon:8,lakes:8,reef:5};
const MAXZ = 280;
const TEAM_NAMES = ['None', 'Red', 'Blue', 'Green', 'Gold'];
const MELEE = ['sword', 'polearm', 'blunt', 'dagger'];
const rnd = Math.random, R = (a, b) => a + rnd() * (b - a);
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const HIT_TILE = {t: 'tile'}, HIT_RECT = {t: 'rect'}, HIT_OOB = {t: 'oob'};
const tmpA = [], tmpB = [];
const KNIFE = wkey('Fairbairn–Sykes Fighting Knife'), GLOCK = wkey('Glock 17 / 19');

function circleBuildingCollide(x, y, r, q) {
  const bx = q[0], by = q[1], bw = q[2], bh = q[3];
  if (!circleRect(x, y, r, bx, by, bw, bh)) return false;
  if (bw < 64 || bh < 64) return true; // solid small structure
  const th = 16;
  const isLarge = bw > 180 || bh > 180;
  const gw = Math.min(bw * 0.55, isLarge ? 104 : 72);
  const cx = bx + bw / 2;
  const halfDoor = gw / 2;
  const leftW = Math.max(0, (bw - gw) / 2);
  if (circleRect(x, y, r, bx, by, bw, th)) return true; // Top wall
  if (circleRect(x, y, r, bx, by + th, th, bh - th)) return true; // Left wall
  if (circleRect(x, y, r, bx + bw - th, by + th, th, bh - th)) return true; // Right wall
  if (leftW > 0 && circleRect(x, y, r, bx, by + bh - th, leftW, th)) return true; // Bottom-left wall
  if (leftW > 0 && circleRect(x, y, r, cx + halfDoor, by + bh - th, leftW, th)) return true; // Bottom-right wall
  return false; // Interior and doorway are open and enterable
}

function circleShelterCollide(x, y, r, plot, isAuth) {
  const S = computePlotSize(plot);
  const x0 = plot.x - S / 2, y0 = plot.y - S / 2;
  const T = 20;
  if (x + r < x0 || x - r > x0 + S || y + r < y0 || y - r > y0 + S) return false;
  const gateW = 100;
  const gateX0 = plot.x - gateW / 2;
  const gateX1 = plot.x + gateW / 2;
  // 1. Solid perimeter walls
  if (circleRect(x, y, r, x0, y0, S, T)) return true; // Top wall
  if (circleRect(x, y, r, x0, y0, T, S)) return true; // Left wall
  if (circleRect(x, y, r, x0 + S - T, y0, T, S)) return true; // Right wall
  if (circleRect(x, y, r, x0, y0 + S - T, gateX0 - x0, T)) return true; // Bottom left wing
  if (circleRect(x, y, r, gateX1, y0 + S - T, (x0 + S) - gateX1, T)) return true; // Bottom right wing
  // 2. Airlock blast gate (opens only for authorized survivors approaching doorway)
  const nearAirlock = Math.abs(x - plot.x) <= gateW / 2 + 30 && Math.abs(y - (y0 + S)) <= 120;
  const gateOpen = (isAuth || !plot.owner) && nearAirlock;
  if (!gateOpen && circleRect(x, y, r, gateX0, y0 + S - T, gateW, T)) return true;
  // 3. Central command console / core
  if (circleRect(x, y, r, plot.x - 28, plot.y - 28, 56, 56)) return true;
  return false;
}

class Game {
  constructor(seed) {
    const t0 = Date.now();
    const M = this.M = generateMap(seed);
    this.TS = M.TS; this.W = M.W; this.WP = M.W * M.TS; this.HP = M.H * M.TS; this.tiles = M.tiles;
    console.log(`[map] seed ${seed}: ${M.landmarks.length} landmarks (${M.skipped} skipped), ${M.rects.length} buildings, ${M.loot.length} loot spots, ${M.vspawns.length} vehicle spawns — ${Date.now() - t0}ms`);
    this.rgrid = new RectGrid(M.rects, 320);
    this.players = new Map(); this.zombies = new Map(); this.vehicles = new Map(); this.items = new Map(); this.structs = new Map(); this.effects = new Map();
    this.proj = []; this.strikes = []; this.noises = []; this.ev = []; this.vspawns = [];
    this.zh = new Hash(160); this.vh = new Hash(256); this.ih = new Index(200); this.sh = new Index(200);
    this.nid = 1; this.now = 0; this.tickN = 0; this.time = 0.3; this.light = 1; this.bloodN = 0;
    this.settings = {mode: 'coop', ff: false, density: 1, dayLen: 1200};
    this.sky = null; this.cosmic = null; this.nextSky = 90000; this.wasNight = false; this.empUntil = 0; this.nextDrop = 300000;
    this.geysers = M.zones.filter(z => z[0] === 'geyser').map(z => ({x: z[1], y: z[2], next: 0}));
    for (const z of M.zones) if (z[0] === 'toxic') this.effects.set(this.nid, {id: this.nid++, type: 'toxic', x: z[1], y: z[2], r: z[3], until: Infinity, dps: 6, fixed: 1});

    // 16 Designated Shelter Tycoon Plots
    this.plots = new Map();
    for (const pl of PLOTS) {
      this.plots.set(pl.id, {
        id: pl.id,
        name: pl.name,
        x: pl.x,
        y: pl.y,
        region: pl.region,
        theme: pl.theme,
        radius: pl.radius,
        owner: null,
        ownerName: '',
        team: 0,
        scrap: 0,
        upgrades: {},
        level: 1,
        lastTurretFire: 0,
        evacActive: false,
        evacTimer: 0
      });
    }

    this.mapJSON = JSON.stringify({W: M.W, H: M.H, TS: M.TS, tiles: Buffer.from(M.tiles).toString('base64'), region: Buffer.from(M.region).toString('base64'),
      rects: M.rects, styles: M.styles, landmarks: M.landmarks, zones: M.zones, themes: M.themes, rnames: M.rnames});
    this.defsJSON = JSON.stringify({W: WLIST.map(k => WEAPONS[k]), AMMO, ITEMS, STRUCTS, RECIPES, VEH, VLIST, ZD, ZLIST, TILES: PROPS, TEAMS: TEAM_NAMES, PLOTS, UPGRADES, REBORN_PERKS});
    this.initLoot(); this.initVehicles();
    console.log(`[game] ${this.items.size} ground items, ${this.vehicles.size} vehicles, ${this.plots.size} shelter plots. Init payload ${(this.mapJSON.length / 1024).toFixed(0)} KB`);
  }
  id() { return this.nid++; }
  tileAt(x, y) { const tx = Math.floor(x / this.TS), ty = Math.floor(y / this.TS); if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.W) return 0; return this.tiles[ty * this.W + tx]; }
  themeAt(x, y) { const tx = clamp(Math.floor(x / this.TS), 0, this.W - 1), ty = clamp(Math.floor(y / this.TS), 0, this.W - 1); return this.M.themes[this.M.region[ty * this.W + tx]]; }
  gridName(x, y) { return String.fromCharCode(65 + clamp(Math.floor(x / 1600), 0, 19)) + (clamp(Math.floor(y / 1600), 0, 19) + 1); }
  playerNear(x, y, r) { for (const p of this.players.values()) if (!p.dead && d2(p.x, p.y, x, y) < r * r) return true; return false; }
  randomPlayer() { const a = [...this.players.values()].filter(p => !p.dead); return a.length ? a[Math.floor(rnd() * a.length)] : null; }

  // ───────── collision ─────────
  blockedAt(x, y, r, kind, entity) {
    if (x < r || y < r || x > this.WP - r || y > this.HP - r) return HIT_OOB;
    if (kind === 'fly') return null;
    const TS = this.TS, W = this.W, tl = this.tiles;
    const tx0 = Math.floor((x - r) / TS), tx1 = Math.floor((x + r) / TS), ty0 = Math.floor((y - r) / TS), ty1 = Math.floor((y + r) / TS);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const P = PROPS[tl[ty * W + tx]]; let s = P.solid;
      if (!s) { if (kind === 'car') s = P.vsolid; else if (kind === 'boat') s = !P.water; }
      if (s && circleRect(x, y, r, tx * TS, ty * TS, TS, TS)) return HIT_TILE;
    }
    tmpA.length = 0; this.rgrid.query(x - r, y - r, x + r, y + r, tmpA);
    for (const q of tmpA) if (circleBuildingCollide(x, y, r, q)) return HIT_RECT;
    tmpB.length = 0; this.sh.query(x, y, r + 100, tmpB);
    for (const s of tmpB) { if (s.def.block === 0 || (s.def.door && s.open)) continue; if (circleRect(x, y, r, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)) return s; }
    // 16 Designated Shelter Tycoon Plots (walls and airlock gates)
    for (const plot of this.plots.values()) {
      if (Math.abs(plot.x - x) > 550 || Math.abs(plot.y - y) > 550) continue;
      const isAuth = entity && (entity.id === plot.owner || (plot.team > 0 && entity.team === plot.team) || !plot.owner);
      if (circleShelterCollide(x, y, r, plot, isAuth)) return HIT_RECT;
    }
    return null;
  }
  moveCircle(e, dx, dy, r, kind) {
    const dist = Math.abs(dx) + Math.abs(dy); if (dist < 0.01) return null;
    if (this.blockedAt(e.x, e.y, r, kind, e)) { e.x = clamp(e.x + dx, r, this.WP - r); e.y = clamp(e.y + dy, r, this.HP - r); return null; }
    const steps = Math.max(1, Math.ceil(dist / (r * 0.6))), sx = dx / steps, sy = dy / steps; let hit = null;
    for (let i = 0; i < steps; i++) {
      let h = this.blockedAt(e.x + sx, e.y, r, kind, e); if (!h) e.x += sx; else if (!hit || h.def) hit = h;
      h = this.blockedAt(e.x, e.y + sy, r, kind, e); if (!h) e.y += sy; else if (!hit || h.def) hit = h;
    }
    return hit;
  }
  findFree(x, y, r, kind) {
    for (let rad = 0; rad < 600; rad += 30) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (!this.blockedAt(px, py, r, kind)) return [px, py]; }
    return [x, y];
  }
  rectAtPoint(px, py) { tmpA.length = 0; this.rgrid.query(px, py, px, py, tmpA); for (const r of tmpA) if (px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]) return true; return false; }
  structAtPoint(px, py) { tmpB.length = 0; this.sh.query(px, py, 100, tmpB); for (const s of tmpB) if (Math.abs(px - s.x) <= s.w / 2 && Math.abs(py - s.y) <= s.h / 2) return s; return null; }
  rectFree(cx, cy, w, h, checkEnt) {
    const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2, TS = this.TS;
    if (x0 < 0 || y0 < 0 || x1 >= this.WP || y1 >= this.HP) return false;
    for (let ty = Math.floor(y0 / TS); ty <= Math.floor(y1 / TS); ty++) for (let tx = Math.floor(x0 / TS); tx <= Math.floor(x1 / TS); tx++) if (PROPS[this.tiles[ty * this.W + tx]].solid) return false;
    for (const r of this.rgrid.query(x0, y0, x1, y1, [])) if (x0 < r[0] + r[2] && x1 > r[0] && y0 < r[1] + r[3] && y1 > r[1]) return false;
    for (const s of this.sh.query(cx, cy, 200, [])) if (x0 < s.x + s.w / 2 && x1 > s.x - s.w / 2 && y0 < s.y + s.h / 2 && y1 > s.y - s.h / 2) return false;
    if (checkEnt) {
      for (const p of this.players.values()) if (!p.dead && !p.veh && circleRect(p.x, p.y, p.r, x0, y0, w, h)) return false;
      for (const z of this.zh.query(cx, cy, 140, [])) if (circleRect(z.x, z.y, ZD[z.type].r, x0, y0, w, h)) return false;
      for (const v of this.vh.query(cx, cy, 180, [])) if (!v.dead && circleRect(v.x, v.y, VEH[v.type].r, x0, y0, w, h)) return false;
    }
    return true;
  }
  canHurt(a, b) { if (!a || !b || a === b) return true; const m = this.settings.mode; if (m === 'ffa') return true; if (m === 'teams') return a.team !== b.team || this.settings.ff; return this.settings.ff; }
  canHurtStruct(o, s) { if (!o || !o.name) return true; if (s.owner === o.id) return true; const m = this.settings.mode; if (m === 'coop') return false; if (m === 'teams') return s.team !== o.team; return true; }
  noise(x, y, r) {
    if (!(r > 0)) return; const last = this.noises[this.noises.length - 1];
    if (last && this.now - last.t < 300 && d2(last.x, last.y, x, y) < 40000) { last.r = Math.max(last.r, r); last.t = this.now; return; }
    this.noises.push({x, y, r, t: this.now}); if (this.noises.length > 150) this.noises.shift();
  }

  // ───────── players ─────────
  addPlayer(ws, name, account, teamChoice, modeChoice) {
    name = String(name || '').replace(/[<>&"'`\\]/g, '').trim().slice(0, 16) || ('Survivor' + (this.nid % 100));
    if (modeChoice && (modeChoice === 'coop' || modeChoice === 'teams' || modeChoice === 'ffa')) {
      this.settings.mode = modeChoice;
    }
    let team = 0;
    if (this.settings.mode === 'teams') {
      team = teamChoice !== undefined && teamChoice > 0 ? clamp(+teamChoice, 1, 4) : this.smallestTeam();
    } else if (teamChoice !== undefined) {
      team = clamp(+teamChoice, 0, 4);
    }
    const p = {id: this.id(), ws, name, team, x: 0, y: 0, r: 16, hp: 100, st: 100, hu: 100, th: 100, inf: 0, bleed: false, frac: false, buf: {}, dead: false, rspAt: 0,
      input: {mx: 0, my: 0, ax: 0, ay: 0, fire: false, alt: false, sprint: false}, prevFire: false, prevAlt: false, hotbar: [null, null, null, null, null], sel: 0, inv: [], ammo: {}, wear: {}, wfx: {}, pfx: {},
      veh: null, seat: -1, reloadUntil: 0, reloadT: 1, kills: 0, pk: 0, deaths: 0, ps: 1, lastPosT: this.now, mb: 0, light: false, nvg: false, dirty: true, lastAtk: -1e9, spawnProt: 0,
      pull: [0, 0], hurt: -1e9, scope: false, ping: 0, lastHorn: 0, rev: -1e9, msgT: {}, spd: 210, swim: false,
      scrap: account ? (account.scrap || 150) : 120,
      accountName: account ? account.username : null,
      rebirths: account ? (account.rebirths || 0) : 0,
      prestigeTokens: account ? (account.prestigeTokens || 0) : 0,
      rebornPerks: account ? (account.rebornPerks || {}) : {},
      hardlightShield: (account && account.rebornPerks && account.rebornPerks.hardlight_shield) ? 150 : 0,
      plotId: account ? account.plotId : null,
      upgrades: account ? (account.upgrades || {}) : {}};

    if (p.plotId && this.plots.has(p.plotId)) {
      const plot = this.plots.get(p.plotId);
      plot.owner = p.id; plot.ownerName = p.name; plot.team = p.team;
      plot.upgrades = p.upgrades; plot.level = computePlotLevel(plot.upgrades);
      p.plot = plot;
    }

    this.players.set(p.id, p);
    this.respawnPlayer(p);
    ws.send(JSON.stringify({t: 'init', id: p.id, map: JSON.parse(this.mapJSON), defs: JSON.parse(this.defsJSON), settings: this.settings, plots: this.getPlotsSummary()}));
    this.sendSky(p);
    this.send(p, this.invMsg(p));
    p.dirty = false;
    this.feed(`${p.name} joined the wasteland${p.team ? ' [' + TEAM_NAMES[p.team] + ']' : ''}`);
    this.sendBoard();
    this.broadcastPlots();
    return p;
  }
  removePlayer(p) {
    if (p.veh) this.exitVehicle(p, true);
    if (p.accountName) accounts.savePlotProgress(p.accountName, p.plotId, p.plot ? p.plot.upgrades : p.upgrades, p.scrap);
    this.players.delete(p.id); this.feed(`${p.name} left`); this.sendBoard();
  }
  smallestTeam() { const c = [0, 0, 0, 0, 0]; for (const p of this.players.values()) if (p.team) c[p.team]++; return c[1] <= c[2] ? 1 : 2; }
  giveKit(p) {
    p.hotbar = [{w: KNIFE}, {w: GLOCK, mag: 17}, null, null, null]; p.sel = 1; p.ammo = {pistol: 34};
    p.inv = [{k: 'bandage', n: 2}, {k: 'waterbottle', n: 1}, {k: 'beans', n: 1}, {k: 'flashlight', n: 1}]; p.wear = {};
    if (p.rebornPerks && p.rebornPerks.exotic_cache) {
      p.hotbar[2] = {w: wkey('DragonFire Laser'), mag: 60};
      p.ammo.cell = 120;
    }
    this.recalcWear(p); this.invChanged(p);
  }
  respawnPlayer(p) {
    Object.assign(p, {hp: 100, st: 100, hu: 100, th: 100, inf: 0, bleed: false, frac: false, buf: {}, dead: false, veh: null, seat: -1, spawnProt: this.now + 4000, reloadUntil: 0, light: false});
    const [x, y] = this.spawnPos(p); p.x = x; p.y = y; this.forcePos(p); this.giveKit(p); p.dirty = true;
  }
  spawnPos(p) {
    if (p.plot && !this.blockedAt(p.plot.x, p.plot.y, 18, 'walk')) return [p.plot.x + R(-30, 30), p.plot.y + R(-30, 30)];
    let list = this.M.spawns; if (this.settings.mode === 'teams' && p.team > 0 && this.M.teamSpawns[p.team - 1].length) list = this.M.teamSpawns[p.team - 1];
    for (let t = 0; t < 40; t++) { const s = list[Math.floor(rnd() * list.length)]; const x = s[0] + R(-60, 60), y = s[1] + R(-60, 60); if (!this.blockedAt(x, y, 18, 'walk')) return [x, y]; }
    return this.findFree(list[0][0], list[0][1], 18, 'walk');
  }
  forcePos(p) { p.ps++; p.mb = 0; }
  knockPlayer(p, kx, ky) { if (p.veh || p.dead) return; this.moveCircle(p, kx, ky, p.r, 'walk'); this.forcePos(p); }
  send(p, o) { if (p.ws && p.ws.readyState === 1) p.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); }
  broadcast(o) { const s = JSON.stringify(o); for (const p of this.players.values()) this.send(p, s); }
  msg(p, text) { if (this.now - (p.msgT[text] || -1e9) < 1500) return; p.msgT[text] = this.now; this.send(p, {t: 'msg', m: text}); }
  feed(text) { this.broadcast({t: 'feed', m: text}); }

  getPlotsSummary() {
    const list = [];
    for (const pl of this.plots.values()) {
      list.push({
        id: pl.id,
        name: pl.name,
        x: pl.x,
        y: pl.y,
        region: pl.region,
        theme: pl.theme,
        radius: pl.radius || 180,
        owner: pl.owner,
        ownerName: pl.ownerName || '',
        team: pl.team || 0,
        level: pl.level || 1,
        scrap: pl.scrap || 0,
        beacon: pl.upgrades ? (pl.upgrades.evac_beacon || 0) : 0,
        upgrades: pl.upgrades || {}
      });
    }
    return list;
  }
  broadcastPlots() { this.broadcast({t: 'plots', plots: this.getPlotsSummary()}); }
  sendPlotDetail(p, plotId) {
    const pl = this.plots.get(plotId);
    if (!pl) return;
    this.send(p, {t: 'plot_detail', plot: {
      id: pl.id, name: pl.name, region: pl.region, x: pl.x, y: pl.y,
      owner: pl.owner, ownerName: pl.ownerName, team: pl.team,
      scrap: pl.scrap || 0, level: pl.level, upgrades: pl.upgrades || {},
      isOwner: pl.owner === p.id || pl.ownerName === p.name
    }});
  }
  claimPlot(p, plotId) {
    const pl = this.plots.get(plotId);
    if (!pl) return;
    if (pl.owner && pl.owner !== p.id && pl.ownerName !== p.name) {
      this.msg(p, 'This shelter is claimed by ' + pl.ownerName);
      return;
    }
    pl.owner = p.id; pl.ownerName = p.name; pl.team = p.team;
    p.plotId = pl.id; p.plot = pl;
    if (p.upgrades && Object.keys(p.upgrades).length > 0) pl.upgrades = Object.assign({}, p.upgrades, pl.upgrades);
    pl.level = computePlotLevel(pl.upgrades);
    this.msg(p, `🏰 Claimed ${pl.name}! Press [T] to build shelter upgrades.`);
    this.feed(`🏰 ${p.name} established a shelter at ${pl.name}!`);
    if (p.accountName) accounts.savePlotProgress(p.accountName, pl.id, pl.upgrades, p.scrap);
    this.broadcastPlots();
    this.sendPlotDetail(p, pl.id);
  }
  upgradePlot(p, plotId, key) {
    const pl = this.plots.get(plotId);
    if (!pl) return;
    if (pl.owner !== p.id && pl.ownerName !== p.name && (pl.team === 0 || pl.team !== p.team)) {
      this.msg(p, 'Only the owner or teammates can upgrade this shelter.');
      return;
    }
    const upg = UPGRADES.find(u => u.key === key);
    if (!upg) return;
    pl.upgrades = pl.upgrades || {};
    const curLv = pl.upgrades[key] || 0;
    if (curLv >= upg.maxLv) { this.msg(p, `${upg.name} is already at MAX level!`); return; }
    const cost = getUpgradeCost(upg, curLv);
    if ((p.scrap || 0) < cost) { this.msg(p, `Need ${cost} Scrap for ${upg.name} (you have ${p.scrap || 0})`); return; }
    p.scrap -= cost;
    pl.upgrades[key] = curLv + 1;
    pl.level = computePlotLevel(pl.upgrades);
    p.upgrades = pl.upgrades;
    this.msg(p, `⚙️ Upgraded ${upg.name} to Level ${pl.upgrades[key]}!`);
    this.ev.push({x: pl.x, y: pl.y, d: ['upg', Math.round(pl.x), Math.round(pl.y)]});
    if (key === 'evac_beacon' && pl.upgrades[key] === 5) {
      pl.evacActive = true;
      pl.evacTimer = this.now + 180000;
      this.broadcast({t: 'msg', m: `🚨 OPERATION EXODUS SIGNAL ACTIVATED at Plot #${pl.id}! Evac carrier arrives in 3 minutes!`});
      this.feed(`🚨 OPERATION EXODUS EXTRACTION SIGNAL ACTIVATED! 3:00 REMAINING`);
    }
    if (p.accountName) accounts.savePlotProgress(p.accountName, pl.id, pl.upgrades, p.scrap);
    this.broadcastPlots();
    this.sendPlotDetail(p, pl.id);
  }
  awardScrap(p, amount, x, y) {
    if (!p) return;
    let mult = 1 + (p.rebirths || 0) * 0.25;
    if (p.rebornPerks && p.rebornPerks.quantum_scavenger) mult += p.rebornPerks.quantum_scavenger * 0.3;
    if (p.plot && p.plot.upgrades && p.plot.upgrades.scrap_smelter) mult += p.plot.upgrades.scrap_smelter * 0.25;
    const finalAmt = Math.max(1, Math.round(amount * mult));
    p.scrap = (p.scrap || 0) + finalAmt;
    this.ev.push({x, y, d: ['sc_add', finalAmt, Math.round(x), Math.round(y)]});
    if (p.accountName && this.tickN % 15 === 0) accounts.savePlotProgress(p.accountName, p.plotId, p.plot ? p.plot.upgrades : p.upgrades, p.scrap);
  }

  onMessage(p, m) {
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case 'in': {
        const i = p.input; i.mx = clamp(+m.mx || 0, -1, 1); i.my = clamp(+m.my || 0, -1, 1); i.ax = +m.ax || 0; i.ay = +m.ay || 0; i.fire = !!m.f; i.alt = !!m.al; i.sprint = !!m.sp; i.brake = !!m.brk;
        if (!p.dead && !p.veh && m.ps === p.ps && Number.isFinite(m.x) && Number.isFinite(m.y)) this.validatePos(p, m.x, m.y);
        break;
      }
      case 'slot': { const v = m.v | 0; if (v >= 0 && v < 5 && v !== p.sel) { p.sel = v; p.reloadUntil = 0; } break; }
      case 'reload': this.startReload(p); break;
      case 'act': this.interact(p); break;
      case 'use': this.useItem(p, m.i | 0, Number.isFinite(m.x) ? m.x : p.x, Number.isFinite(m.y) ? m.y : p.y, m.r ? 1 : 0); break;
      case 'drop': this.dropItem(p, m.i | 0, !!m.all); break;
      case 'dropw': this.dropWeapon(p, m.s | 0); break;
      case 'unwear': this.unwear(p, String(m.s)); break;
      case 'craft': this.craft(p, m.r | 0); break;
      case 'chat': this.chat(p, String(m.m || '')); break;
      case 'light': if (this.hasFx(p, 'light')) p.light = !p.light; else this.msg(p, 'You need a flashlight, headlamp, lantern or torch.'); break;
      case 'nvg': if (this.hasFx(p, 'nvg')) p.nvg = !p.nvg; else this.msg(p, 'You need Night Vision Goggles.'); break;
      case 'horn': this.horn(p); break;
      case 'seat': this.switchSeat(p); break;
      case 'settings': this.setSettings(p, m.s || {}); break;
      case 'team': if (this.settings.mode === 'teams') { const t = m.v | 0; if (t >= 1 && t <= 4 && t !== p.team) { p.team = t; if (p.plot) p.plot.team = t; this.feed(`${p.name} joined team ${TEAM_NAMES[t]}`); this.sendBoard(); this.broadcastPlots(); } } break;
      case 'respawn': if (p.dead && this.now >= p.rspAt) this.respawnPlayer(p); break;
      case 'ping': this.send(p, {t: 'pong', c: m.c}); if (typeof m.l === 'number') p.ping = m.l | 0; break;
      case 'claim_plot': this.claimPlot(p, +m.plotId); break;
      case 'upgrade_plot': this.upgradePlot(p, +m.plotId, String(m.key)); break;
      case 'get_plot': this.sendPlotDetail(p, +m.plotId); break;
      case 'set_team': { const t = clamp(+m.team || 0, 0, 4); p.team = t; if (p.plot) p.plot.team = t; this.msg(p, `Joined team: ${TEAM_NAMES[t]}`); this.sendBoard(); this.broadcastPlots(); break; }
      case 'set_mode': { if (m.mode === 'coop' || m.mode === 'teams' || m.mode === 'ffa') { this.settings.mode = m.mode; this.feed(`Game mode set to ${m.mode.toUpperCase()}`); this.sendBoard(); } break; }
      case 'reborn_ascend': {
        const bonusCores = 10 + Math.floor((p.scrap || 0) / 400) + (p.plot ? p.plot.level * 2 : 0);
        const acc = accounts.performReborn(p.accountName || p.name, bonusCores);
        if (acc) {
          p.rebirths = acc.rebirths;
          p.prestigeTokens = acc.prestigeTokens;
          p.rebornPerks = acc.rebornPerks;
          p.scrap = acc.scrap;
          if (p.plot) { p.plot.owner = null; p.plot.ownerName = ''; p.plot.upgrades = {}; p.plot.level = 1; }
          p.plotId = null; p.plot = null;
          this.feed(`🌟 ${p.name} has ASCENDED to Reborn Tier ${p.rebirths}! Earned ${bonusCores} Quantum Cores ⚛️!`);
          this.broadcast({t: 'msg', m: `🌟 ${p.name} ASCENDED to Reborn Tier ${p.rebirths}! Exotic Prototypes Unlocked!`});
          this.respawnPlayer(p);
          this.broadcastPlots();
          this.send(p, {t: 'reborn_success', rebirths: p.rebirths, tokens: p.prestigeTokens, cores: bonusCores});
        }
        break;
      }
      case 'buy_reborn_perk': {
        const perkKey = String(m.perk);
        const perkDef = REBORN_PERKS[perkKey];
        if (!perkDef) return;
        const curRank = (p.rebornPerks && p.rebornPerks[perkKey]) || 0;
        if (curRank >= perkDef.max) { this.msg(p, `${perkDef.name} is already at MAX rank!`); return; }
        const cost = perkDef.cost[curRank] || 5;
        const res = accounts.buyRebornPerk(p.accountName || p.name, perkKey, cost);
        if (!res.ok) { this.msg(p, res.error); return; }
        p.rebornPerks = res.account.rebornPerks;
        p.prestigeTokens = res.account.prestigeTokens;
        if (perkKey === 'hardlight_shield') p.hardlightShield = 150;
        this.msg(p, `⚡ Acquired ${perkDef.name} Rank ${p.rebornPerks[perkKey]}!`);
        this.send(p, {t: 'reborn_updated', perks: p.rebornPerks, tokens: p.prestigeTokens});
        break;
      }
      case 'quantum_recall': {
        if ((p.rebornPerks && p.rebornPerks.quantum_recall) || (p.plot && p.plot.upgrades && p.plot.upgrades.teleport_pad)) {
          if (!p.plot) { this.msg(p, 'You must claim a Shelter Plot to recall!'); return; }
          p.x = p.plot.x; p.y = p.plot.y;
          this.forcePos(p);
          this.ev.push({x: p.x, y: p.y, d: ['ring', Math.round(p.x), Math.round(p.y), 240, '#00e5ff']});
          this.msg(p, '🌀 Quantum Recall: Warped to Shelter!');
        } else {
          this.msg(p, 'Quantum Recall requires Quantum Recall Perk or Teleport Pad upgrade.');
        }
        break;
      }
      case 'orbital_strike': {
        if ((p.rebornPerks && p.rebornPerks.orbital_beam) || (p.plot && p.plot.upgrades && p.plot.upgrades.orbital_strike_array)) {
          const targetX = +m.x || p.x, targetY = +m.y || p.y;
          if (this.now - (p.lastOrbital || 0) < 60000) {
            this.msg(p, `Orbital Lance cooling down (${Math.ceil((60000 - (this.now - p.lastOrbital)) / 1000)}s)`);
            return;
          }
          p.lastOrbital = this.now;
          this.explode(targetX, targetY, 260, 800, p, {fx: 'flash'});
          this.ev.push({x: targetX, y: targetY, d: ['lt', Math.round(targetX), Math.round(targetY)]});
          this.broadcast({t: 'msg', m: `🛰️ Orbital Particle Strike deployed at (${Math.round(targetX)}, ${Math.round(targetY)})!`});
        }
        break;
      }
    }
  }
  validatePos(p, x, y) {
    const dt = Math.min(0.7, (this.now - p.lastPosT) / 1000); p.lastPosT = this.now;
    const stunned = p.buf.stun > this.now;
    p.mb = Math.min(360, p.mb + (stunned ? 0 : 620) * dt + Math.hypot(p.pull[0], p.pull[1]) * dt);
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist < 0.01) return;
    if (dist > p.mb + 50) { this.forcePos(p); return; }
    if (this.blockedAt(x, y, p.r - 5, 'walk', p) && !this.blockedAt(p.x, p.y, p.r - 5, 'walk', p)) { this.forcePos(p); return; }
    p.mb = Math.max(0, p.mb - dist); p.x = x; p.y = y;
  }
  chat(p, t) {
    t = t.replace(/[<>]/g, '').trim().slice(0, 200); if (!t) return;
    if (t.startsWith('/') && !t.startsWith('/t ')) { this.command(p, t.slice(1).split(/\s+/)); return; }
    let team = false; if (t.startsWith('/t ')) { team = true; t = t.slice(3); if (!this.hasFx(p, 'walkie')) { this.msg(p, '📻 Team chat needs a Walkie-Talkie.'); return; } }
    const o = JSON.stringify({t: 'chat', n: p.name, m: t, tm: team ? 1 : 0, c: p.team});
    for (const q of this.players.values()) { if (team && q !== p && !(q.team === p.team && this.hasFx(q, 'walkie'))) continue; this.send(q, o); }
  }
  command(p, a) {
    const c = (a[0] || '').toLowerCase();
    if (c === 'time') {
      const T = {dawn: 0.26, morning: 0.32, day: 0.4, noon: 0.5, dusk: 0.72, night: 0.85, midnight: 0};
      if (T[a[1]] === undefined) { this.msg(p, 'Usage: /time dawn|morning|day|noon|dusk|night|midnight'); return; }
      this.time = T[a[1]]; this.feed(`⏰ ${p.name} set the time to ${a[1]}`); return;
    }
    if (c === 'help') { this.msg(p, 'Commands: /t <msg> team chat · /time <dawn|day|dusk|night>'); return; }
    if (process.env.DEBUG_CMDS === '1') {
      if (c === 'veh' && VEH[a[1]]) { const d = VEH[a[1]]; const f = this.findFree(p.x + d.r + 30, p.y, d.r, d.kind === 'heli' ? 'car' : d.kind); const v = this.createVehicle(a[1], f[0], f[1], 0, null); v.broken = false; v.fuel = d.fuel; v.hp = d.hp; return; }
      if (c === 'give') { if (p.dead) return; const key = a[1]; if (WEAPONS[key]) this.giveObj(p, {k: 'w:' + key, mag: WEAPONS[key].mag || 0, n: WEAPONS[key].count || 0}, true); else if (ITEMS[key]) this.addItem(p, key, +a[2] || 1); if (WEAPONS[key] && WEAPONS[key].ammo) p.ammo[WEAPONS[key].ammo] = (p.ammo[WEAPONS[key].ammo] || 0) + 200; p.dirty = true; return; }
      if (c === 'god') { p.god = !p.god; this.msg(p, 'God mode ' + (p.god ? 'ON' : 'OFF')); return; }
      if (c === 'tp') { p.x = +a[1] || p.x; p.y = +a[2] || p.y; this.forcePos(p); return; }
    }
    this.msg(p, 'Unknown command — try /help');
  }
  setSettings(p, s) {
    const st = this.settings, ch = [];
    if (['coop', 'teams', 'ffa'].includes(s.mode) && s.mode !== st.mode) {
      st.mode = s.mode; ch.push('mode → ' + {coop: 'CO-OP', teams: 'TEAMS', ffa: 'FREE-FOR-ALL'}[s.mode]);
      if (st.mode === 'teams') { for (const q of this.players.values()) q.team = 0; for (const q of this.players.values()) q.team = this.smallestTeam(); } else for (const q of this.players.values()) q.team = 0;
    }
    if (typeof s.ff === 'boolean' && s.ff !== st.ff) { st.ff = s.ff; ch.push('friendly fire ' + (s.ff ? 'ON' : 'OFF')); }
    if (Number.isFinite(s.density)) { const v = clamp(Math.round(s.density * 4) / 4, 0.25, 3); if (v !== st.density) { st.density = v; ch.push('zombie density ×' + v); } }
    if (Number.isFinite(s.dayLen)) { const v = clamp(s.dayLen | 0, 300, 3600); if (v !== st.dayLen) { st.dayLen = v; ch.push('day length ' + Math.round(v / 60) + ' min'); } }
    if (ch.length) { this.feed(`⚙ ${p.name} changed ${ch.join(', ')}`); this.broadcast({t: 'settings', s: st}); this.sendBoard(); }
  }
  hasFx(p, f) { return !!(p.pfx[f] || p.wfx[f]); }
  recalcWear(p) {
    const f = {speed: 1, infect: 1, bleed: 1};
    for (const k of Object.values(p.wear)) { const d = ITEMS[k]; if (!d || !d.fx) continue; for (const [a, b] of Object.entries(d.fx)) { if (a === 'speed' || a === 'infect' || a === 'bleed') f[a] *= b; else if (typeof b === 'number') f[a] = (f[a] || 0) + b; else f[a] = b; } }
    p.wfx = f;
  }
  invChanged(p) {
    p.dirty = true; const f = {};
    for (const it of p.inv) { const d = ITEMS[it.k]; if (d && d.u === 'passive' && d.fx) for (const [a, b] of Object.entries(d.fx)) if (!f[a] || b === 'cone') f[a] = b; }
    p.pfx = f; if (p.light && !this.hasFx(p, 'light')) p.light = false; if (p.nvg && !this.hasFx(p, 'nvg')) p.nvg = false;
  }
  cap(p) { return 10 + (p.wfx.slots || 0); }
  addItem(p, k, n) {
    const d = ITEMS[k]; if (!d) return n; const st = d.st || 5;
    for (const it of p.inv) { if (n <= 0) break; if (it.k === k && it.n < st) { const a = Math.min(st - it.n, n); it.n += a; n -= a; } }
    while (n > 0 && p.inv.length < this.cap(p)) { const a = Math.min(st, n); p.inv.push({k, n: a}); n -= a; }
    this.invChanged(p); return n;
  }
  countItem(p, k) { let c = 0; for (const it of p.inv) if (it.k === k) c += it.n; return c; }
  takeItem(p, k, n) { for (let i = p.inv.length - 1; i >= 0 && n > 0; i--) { const it = p.inv[i]; if (it.k !== k) continue; const a = Math.min(it.n, n); it.n -= a; n -= a; if (it.n <= 0) p.inv.splice(i, 1); } this.invChanged(p); }
  takeAt(p, i, n = 1) { const it = p.inv[i]; if (!it) return; it.n -= n; if (it.n <= 0) p.inv.splice(i, 1); this.invChanged(p); }
  overflow(p) { while (p.inv.length > this.cap(p)) { const it = p.inv.pop(); this.createItem(p.x + R(-30, 30), p.y + R(-30, 30), {k: it.k, n: it.n}); } this.invChanged(p); }

  // ───────── weapons ─────────
  tryFire(p) {
    const now = this.now;
    if (p.buf.stun > now) return;
    if (p.veh) {
      const v = p.veh, vd = VEH[v.type];
      if (vd.guns) for (let gi = 0; gi < vd.guns.length; gi++) {
        const g = vd.guns[gi]; if (!(g.alt ? p.input.alt : p.input.fire)) continue;
        if (g.seat === p.seat || (p.seat === 0 && !v.seats[g.seat])) this.fireVehGun(p, v, gi, g);
      }
      if (!(vd.shoot && vd.shoot.includes(p.seat))) return;
    }
    if (!p.input.fire) return;
    const sl = p.hotbar[p.sel]; if (!sl) return; const w = WEAPONS[sl.w]; if (!w) return;
    if (now < (sl.next || 0) || now < p.reloadUntil) return;
    if (!w.auto && p.prevFire) return;
    if (w.mag) { if ((sl.mag || 0) <= 0) { this.startReload(p); return; } sl.mag--; }
    if (w.count) sl.n = (sl.n || 1) - 1;
    sl.next = now + 1000 / w.rof;
    const a = Math.atan2(p.input.ay - p.y, p.input.ax - p.x);
    this.fire(p, w, p.x, p.y, a, p.input.ax, p.input.ay, p.veh);
    p.lastAtk = now; p.spawnProt = 0;
    if (w.count && sl.n <= 0) { p.hotbar[p.sel] = null; p.dirty = true; }
  }
  fireVehGun(p, v, gi, g) {
    const w = g.w, now = this.now; v.gn = v.gn || []; v.gm = v.gm || []; v.gr = v.gr || [];
    if (v.gm[gi] === undefined) v.gm[gi] = w.mag || 0;
    if (now < (v.gn[gi] || 0) || now < (v.gr[gi] || 0)) return;
    if (!w.auto && (g.alt ? p.prevAlt : p.prevFire)) return;
    if (w.mag) { if (v.gm[gi] <= 0) { v.gm[gi] = w.mag; v.gr[gi] = now + w.reload * 1000; this.ev.push({x: v.x, y: v.y, d: ['rl', p.id]}); return; } v.gm[gi]--; }
    v.gn[gi] = now + 1000 / w.rof;
    const a = Math.atan2(p.input.ay - v.y, p.input.ax - v.x), off = VEH[v.type].r * 0.6;
    v.ta = a; this.fire(p, w, v.x + Math.cos(a) * off, v.y + Math.sin(a) * off, a, p.input.ax, p.input.ay, v);
    p.lastAtk = now; p.spawnProt = 0;
  }
  startReload(p) {
    const sl = p.hotbar[p.sel]; if (!sl) return; const w = WEAPONS[sl.w]; if (!w || !w.mag || sl.mag >= w.mag || this.now < p.reloadUntil) return;
    if (w.ammo) {
      let have = p.ammo[w.ammo] || 0;
      if (have <= 0) { const fr = AMMO[w.ammo].from; if (fr && this.countItem(p, fr[0]) > 0) { this.takeItem(p, fr[0], 1); have = p.ammo[w.ammo] = (p.ammo[w.ammo] || 0) + fr[1]; } }
      if (have <= 0) { this.msg(p, 'Out of ' + AMMO[w.ammo].n + '!'); return; }
      const take = Math.min(w.mag - sl.mag, have); p.ammo[w.ammo] -= take; sl.mag += take;
    } else sl.mag = w.mag;
    p.reloadUntil = this.now + w.reload * 1000; p.reloadT = w.reload * 1000; p.dirty = true;
    this.ev.push({x: p.x, y: p.y, d: ['rl', p.id]});
  }
  fire(o, w, x, y, a, ax, ay, ignoreVeh) {
    const pain = o && o.hp < 35 && !(o.buf.painkill > this.now) ? 1.6 : 1;
    if (w.noise) this.noise(x, y, w.noise);
    switch (w.mode) {
      case 'hitscan': { const n = w.pellets || 1; for (let i = 0; i < n; i++) this.ray(o, w, x, y, a + (rnd() - 0.5) * 2 * (w.spread || 0) * pain, ignoreVeh); break; }
      case 'melee': this.melee(o, w, x, y, a); break;
      case 'projectile': { const n = w.pellets || 1; for (let i = 0; i < n; i++) this.spawnProj(o, w, x, y, a + (rnd() - 0.5) * 2 * (w.spread || 0) * pain, ax, ay, ignoreVeh, false); break; }
      case 'grenade': this.spawnProj(o, w, x, y, a, ax, ay, ignoreVeh, true); break;
      case 'flame': for (let i = 0; i < 2; i++) this.spawnProj(o, w, x, y, a + (rnd() - 0.5) * 2 * (w.spread || 0.2), ax, ay, ignoreVeh, false); break;
      case 'mine': this.addEffect('mine', x, y, 40, 3600, {o, w, armed: this.now + 1500, trig: w.trig || 'any'}); this.msg(o, 'Mine armed in 1.5s — step away!'); break;
      case 'strike': this.addStrike(o, w, x, y, ax, ay, 0, false, true); break;
      case 'barrage': {
        let dx = ax - x, dy = ay - y, d = Math.hypot(dx, dy) || 1; const dc = clamp(d, w.minRange || 0, w.range || 3000); const cx = x + dx / d * dc, cy = y + dy / d * dc;
        this.ev.push({x: cx, y: cy, all: true, d: ['wa', Math.round(cx), Math.round(cy), Math.round((w.spreadR || 300) + w.radius), Math.round((w.delay || 3) * 1000 + (w.salvo || 8) * 160)]});
        for (let i = 0; i < (w.salvo || 8); i++) { const rr = Math.sqrt(rnd()) * (w.spreadR || 300), aa = rnd() * Math.PI * 2; this.addStrike(o, w, x, y, cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, i * 160, true, false); }
        break;
      }
      case 'cone': this.cone(o, w, x, y, a); break;
    }
  }
  ray(o, w, x, y, a, ignoreVeh) {
    const c = Math.cos(a), s = Math.sin(a), TS = this.TS, W = this.W, range = w.range || 800;
    let pierce = w.pierce || 1; const hit = new Set(); let ex = x, ey = y; const q = [];
    for (let d = 18; d <= range; d += 14) {
      const px = x + c * d, py = y + s * d; ex = px; ey = py;
      if (px < 0 || py < 0 || px >= this.WP || py >= this.HP) break;
      if (PROPS[this.tiles[Math.floor(py / TS) * W + Math.floor(px / TS)]].solid) break;
      if (this.rectAtPoint(px, py)) break;
      const st = this.structAtPoint(px, py);
      if (st && !st.def.bp && st.def.block !== 0 && !(st.def.door && st.open)) { this.damageStruct(st, w.dmg * (w.svd || 1) * 0.5, o); break; }
      const dmg = w.dmg * (d > range * 0.65 ? 0.75 : 1);
      q.length = 0; this.zh.query(px, py, 64, q);
      for (const z of q) { if (hit.has(z) || z.hp <= 0) continue; const zr = ZD[z.type].r + 4; if (d2(z.x, z.y, px, py) < zr * zr) { hit.add(z); this.hitZombie(z, dmg, o, w, a); if (--pierce <= 0) break; } }
      if (pierce <= 0) break;
      q.length = 0; this.vh.query(px, py, 90, q); let stop = false;
      for (const v of q) {
        if (v === ignoreVeh || v.dead || hit.has(v)) continue; const vd = VEH[v.type];
        if (d2(v.x, v.y, px, py) < vd.r * vd.r) {
          hit.add(v); this.damageVehicle(v, dmg * (w.vdmg || 1) * 0.6, o);
          if (vd.exposed) for (const pid of v.seats) { const pp = pid && this.players.get(pid); if (pp && pp !== o && this.canHurt(o, pp) && rnd() < 0.5) this.damagePlayer(pp, dmg * 0.8, 'bullet', o, null, w); }
          stop = true; break;
        }
      }
      if (stop) break;
      for (const p of this.players.values()) {
        if (p === o || p.dead || p.veh || hit.has(p)) continue;
        if (d2(p.x, p.y, px, py) < 400) { if (!this.canHurt(o, p)) continue; hit.add(p); this.damagePlayer(p, dmg, 'bullet', o, null, w); if (--pierce <= 0) break; }
      }
      if (pierce <= 0) break;
    }
    this.ev.push({x, y, d: ['tr', Math.round(x), Math.round(y), Math.round(ex), Math.round(ey), w.beam ? 2 : (w.pellets ? 1 : (w.dmg >= 80 ? 3 : 0))]});
  }
  melee(o, w, x, y, a) {
    const Rr = w.range || 70, arc = w.arc || 1.4; const max = w.pierce || (arc > 1.5 ? 3 : 1); let n = 0;
    const q = this.zh.query(x, y, Rr + 50, []); q.sort((A, B) => d2(A.x, A.y, x, y) - d2(B.x, B.y, x, y));
    for (const z of q) {
      if (n >= max) break; const zr = ZD[z.type].r, d = Math.hypot(z.x - x, z.y - y); if (d > Rr + zr || z.hp <= 0) continue;
      if (Math.abs(angDiff(a, Math.atan2(z.y - y, z.x - x))) > arc / 2 && d > zr + 10) continue;
      let dmg = w.dmg; if (w.backstab && Math.abs(angDiff(z.a, a)) < 0.9) dmg *= w.backstab;
      this.hitZombie(z, dmg, o, w, a); n++;
    }
    if (n < max) for (const p of this.players.values()) {
      if (n >= max) break; if (p === o || p.dead || (p.veh && !VEH[p.veh.type].exposed)) continue;
      const d = Math.hypot(p.x - x, p.y - y); if (d > Rr + p.r) continue; if (Math.abs(angDiff(a, Math.atan2(p.y - y, p.x - x))) > arc / 2) continue;
      if (!this.canHurt(o, p)) continue; this.damagePlayer(p, w.dmg, 'melee', o, null, w);
      if (w.knock && !p.veh) this.knockPlayer(p, Math.cos(a) * w.knock * 0.15, Math.sin(a) * w.knock * 0.15); n++;
    }
    if (n < max) for (const v of this.vh.query(x, y, Rr + 60, [])) { if (v.dead || (o && v === o.veh)) continue; if (Math.hypot(v.x - x, v.y - y) < Rr + VEH[v.type].r) { this.damageVehicle(v, w.dmg * 0.3 * (w.svd || 1), o); n++; break; } }
    if (n === 0) { const st = this.structAtPoint(x + Math.cos(a) * Rr * 0.8, y + Math.sin(a) * Rr * 0.8); if (st) this.damageStruct(st, w.dmg * (w.svd || 1), o); }
    this.ev.push({x, y, d: ['sw', o ? o.id : 0, +a.toFixed(2), Math.round(Rr), +arc.toFixed(2)]});
  }
  spawnProj(o, w, x, y, a, ax, ay, ignoreVeh, grenade) {
    const sp = w.proj || 650, c = Math.cos(a), s = Math.sin(a);
    const pr = {id: this.id(), x: x + c * 20, y: y + s * 20, a, vx: c * sp, vy: s * sp, w, o, iv: ignoreVeh, born: this.now, die: this.now + ((w.range || 800) / sp) * 1000, hit: null, pierce: w.pierce || 1, z: 0};
    if (w.mode === 'flame') pr.flame = true;
    if (w.lob || grenade) {
      let d = Math.hypot(ax - x, ay - y); d = clamp(d, w.minRange || 0, w.range || 700);
      const T = Math.max(250, d / sp * 1000); pr.lob = {sx: pr.x, sy: pr.y, tx: x + c * d, ty: y + s * d, t0: this.now, T}; pr.die = this.now + T;
      if (grenade && w.fuse) pr.fuse = this.now + w.fuse * 1000;
    }
    if (w.homing || w.guided) { pr.turn = w.guided ? 3.2 : 2.6; pr.seek = 0; }
    if (w.returns) pr.ret = true;
    this.proj.push(pr); return pr;
  }
  updateProjectiles(dt) {
    const now = this.now, out = [];
    for (const pr of this.proj) {
      if (pr.dead) continue; const w = pr.w;
      if (pr.lob) {
        const u = (now - pr.lob.t0) / pr.lob.T;
        if (u >= 1) { pr.x = pr.lob.tx; pr.y = pr.lob.ty; pr.z = 0; if (pr.fuse && now < pr.fuse) { out.push(pr); continue; } this.projImpact(pr, pr.x, pr.y); continue; }
        pr.x = pr.lob.sx + (pr.lob.tx - pr.lob.sx) * u; pr.y = pr.lob.sy + (pr.lob.ty - pr.lob.sy) * u; pr.z = Math.sin(u * Math.PI);
        if (pr.fuse && now >= pr.fuse) { this.projImpact(pr, pr.x, pr.y); continue; }
        out.push(pr); continue;
      }
      if (pr.turn) {
        let tx, ty;
        if (w.guided && pr.o && !pr.o.dead) { tx = pr.o.input.ax; ty = pr.o.input.ay; }
        else { if ((!pr.tgt || pr.tgt.dead || pr.tgt.hp <= 0) && now >= pr.seek) { pr.seek = now + 250; pr.tgt = this.findHomingTarget(pr); } if (pr.tgt) { tx = pr.tgt.x; ty = pr.tgt.y; } }
        if (tx !== undefined) { const da = angDiff(pr.a, Math.atan2(ty - pr.y, tx - pr.x)); pr.a += clamp(da, -pr.turn * dt, pr.turn * dt); const sp = w.proj || 650; pr.vx = Math.cos(pr.a) * sp; pr.vy = Math.sin(pr.a) * sp; }
      }
      if (pr.ret && !pr.back && now > pr.born + (pr.die - pr.born) * 0.5) { pr.back = true; pr.vx = -pr.vx; pr.vy = -pr.vy; pr.a += Math.PI; pr.hit = null; }
      const dist = Math.hypot(pr.vx, pr.vy) * dt, steps = Math.max(1, Math.ceil(dist / 12)), sx = pr.vx * dt / steps, sy = pr.vy * dt / steps;
      let done = false;
      for (let i = 0; i < steps && !done; i++) { pr.x += sx; pr.y += sy; done = this.projStep(pr); }
      if (done) continue;
      if (now >= pr.die) { if (w.radius) this.projImpact(pr, pr.x, pr.y); continue; }
      out.push(pr);
    }
    this.proj = out;
  }
  projStep(pr) {
    const w = pr.w, x = pr.x, y = pr.y;
    if (x < 0 || y < 0 || x >= this.WP || y >= this.HP) return true;
    if (PROPS[this.tiles[Math.floor(y / this.TS) * this.W + Math.floor(x / this.TS)]].solid || this.rectAtPoint(x, y)) { if (w.radius) this.projImpact(pr, x, y); return true; }
    const st = this.structAtPoint(x, y);
    if (st && st.def.block !== 0 && !(st.def.door && st.open) && !(st.def.bp && !w.radius)) { if (w.radius) this.projImpact(pr, x, y); else this.damageStruct(st, w.dmg * (w.svd || 1) * 0.6, pr.o); return true; }
    if (pr.zom) {
      for (const p of this.players.values()) {
        if (p.dead) continue;
        if (d2(p.x, p.y, x, y) < (p.r + 6) ** 2) { if (p.veh && !VEH[p.veh.type].exposed) this.damageVehicle(p.veh, w.dmg, null); else this.damagePlayer(p, w.dmg, 'acid', null); this.addEffect('acid', x, y, 40, 4, {dps: 10}); return true; }
      }
      return false;
    }
    for (const z of this.zh.query(x, y, 60, [])) {
      if (z.hp <= 0 || (pr.hit && pr.hit.has(z))) continue; const zr = ZD[z.type].r + (pr.flame ? 10 : 3);
      if (d2(z.x, z.y, x, y) < zr * zr) {
        if (w.radius) { this.projImpact(pr, x, y); return true; }
        (pr.hit || (pr.hit = new Set())).add(z); this.hitZombie(z, w.dmg, pr.o, w, pr.a); if (--pr.pierce <= 0 && !pr.flame) return true;
      }
    }
    for (const v of this.vh.query(x, y, 90, [])) {
      if (v === pr.iv || v.dead) continue; const vr = VEH[v.type].r;
      if (d2(v.x, v.y, x, y) < vr * vr) {
        if (w.radius) { this.projImpact(pr, x, y); return true; }
        if (pr.flame) { if (pr.hit && pr.hit.has(v)) continue; (pr.hit || (pr.hit = new Set())).add(v); }
        this.damageVehicle(v, w.dmg * (w.vdmg || 1) * 0.5, pr.o); if (!pr.flame) return true;
      }
    }
    for (const p of this.players.values()) {
      if (p === pr.o || p.dead || (p.veh && (p.veh === pr.iv || !VEH[p.veh.type].exposed))) continue;
      if (pr.hit && pr.hit.has(p)) continue;
      if (d2(p.x, p.y, x, y) < (p.r + 4) ** 2) {
        if (!this.canHurt(pr.o, p)) continue;
        if (w.radius) { this.projImpact(pr, x, y); return true; }
        (pr.hit || (pr.hit = new Set())).add(p); this.damagePlayer(p, w.dmg, pr.flame ? 'fire' : 'bullet', pr.o, null, w);
        if (w.stun) p.buf.stun = this.now + w.stun * 1000;
        if (--pr.pierce <= 0 && !pr.flame) return true;
      }
    }
    return false;
  }
  projImpact(pr, x, y) {
    pr.dead = true;
    if (pr.itemFx) { this.applyThrowFx(pr.o, pr.itemFx, x, y); return; }
    if (pr.w.radius || pr.w.fx === 'smoke' || pr.w.fx === 'flash') this.explode(x, y, pr.w.radius || 200, pr.w.dmg || 0, pr.o, pr.w);
  }
  findHomingTarget(pr) {
    const air = pr.w.homing === 'air'; let best = null, bs = Infinity;
    const consider = (e, bonus) => { const dx = e.x - pr.x, dy = e.y - pr.y, d = Math.hypot(dx, dy); if (d > 1800) return; const da = Math.abs(angDiff(pr.a, Math.atan2(dy, dx))); if (da > 0.75) return; const sc = d * (1 + da * 2) / bonus; if (sc < bs) { bs = sc; best = e; } };
    for (const v of this.vh.query(pr.x, pr.y, 1800, [])) {
      if (v.dead || v === pr.iv) continue; const occ = v.seats.find(s => s); if (!occ) continue; if (air && !(v.alt > 0.5)) continue;
      const drv = this.players.get(occ); if (drv && !this.canHurt(pr.o, drv)) continue; consider(v, VEH[v.type].kind === 'heli' ? 3 : 2);
    }
    if (!air) {
      for (const z of this.zh.query(pr.x, pr.y, 1200, [])) if (z.hp > 0) consider(z, ZD[z.type].boss ? 4 : z.type === 'brute' ? 2 : 1);
      for (const p of this.players.values()) { if (p === pr.o || p.dead || !this.canHurt(pr.o, p)) continue; consider(p, 1.5); }
    }
    return best;
  }
  explode(x, y, Rr, dmg, o, w = {}) {
    const fx = w.fx || 'frag', now = this.now;
    this.ev.push({x, y, all: Rr >= 400, d: ['ex', Math.round(x), Math.round(y), Math.round(Rr), fx]});
    this.noise(x, y, Math.min(4500, Rr * 9));
    if (dmg > 0) {
      const zw = {...w, mode: 'explosion'};
      for (const z of this.zh.query(x, y, Rr + 50, [])) {
        if (z.hp <= 0) continue; const d = Math.hypot(z.x - x, z.y - y); if (d > Rr + ZD[z.type].r) continue;
        const f = 1 - 0.6 * Math.min(1, d / Rr); zw.knock = (w.knock || 0) + 220 * f; this.hitZombie(z, dmg * f, o, zw, Math.atan2(z.y - y, z.x - x));
      }
      for (const p of this.players.values()) {
        if (p.dead) continue; const d = Math.hypot(p.x - x, p.y - y); if (d > Rr + p.r) continue; if (o && p !== o && !this.canHurt(o, p)) continue;
        let f = 1 - 0.6 * Math.min(1, d / Rr); if (p === o) f *= 0.5; if (p.veh && !VEH[p.veh.type].exposed) f *= 0.25;
        this.damagePlayer(p, dmg * f, 'explosion', o, null, w);
        if (!p.veh && !p.dead && d > 1) { const k = 160 * f; this.knockPlayer(p, (p.x - x) / d * k, (p.y - y) / d * k); }
      }
      for (const v of this.vh.query(x, y, Rr + 80, [])) { if (v.dead) continue; const d = Math.hypot(v.x - x, v.y - y); if (d > Rr + VEH[v.type].r) continue; this.damageVehicle(v, dmg * (1 - 0.6 * Math.min(1, d / Rr)) * (w.vdmg || 1), o); }
      for (const s of this.sh.query(x, y, Rr + 100, [])) { const d = Math.hypot(s.x - x, s.y - y); if (d > Rr + 40) continue; this.damageStruct(s, dmg * (1 - 0.5 * Math.min(1, d / Rr)) * (w.svd || 1), o); }
    }
    if (fx === 'fire' || fx === 'thermo') this.addEffect('fire', x, y, Rr * 0.6, 9, {dps: 16, o});
    if (fx === 'smoke') this.addEffect('smoke', x, y, Rr, 22);
    if (fx === 'toxic') this.addEffect('toxic', x, y, Rr * 1.2, 14, {dps: 9});
    if (fx === 'nuke') { this.addEffect('fire', x, y, Rr * 0.5, 25, {dps: 30, o}); this.addEffect('toxic', x, y, Rr * 0.8, 90, {dps: 12}); }
    if (fx === 'flash' || fx === 'stun') {
      for (const p of this.players.values()) { if (p.dead || d2(p.x, p.y, x, y) > Rr * Rr) continue; if (o && p !== o && !this.canHurt(o, p)) continue; if (fx === 'flash') p.buf.blind = now + (w.blind || 4) * 1000; p.buf.stun = now + Math.min(2, w.stun || 1) * 1000; }
      for (const z of this.zh.query(x, y, Rr, [])) if (!ZD[z.type].boss) z.stun = now + (w.stun || 3) * 1000;
    }
  }
  addStrike(o, w, ox, oy, tx, ty, extra, quiet, clampIt) {
    if (clampIt) { let dx = tx - ox, dy = ty - oy, d = Math.hypot(dx, dy) || 1; const dc = clamp(d, w.minRange || 0, w.range || 3000); tx = ox + dx / d * dc; ty = oy + dy / d * dc; }
    const t = this.now + (w.delay || 2) * 1000 + (extra || 0);
    this.strikes.push({x: tx, y: ty, t, w, o});
    if (!quiet) this.ev.push({x: tx, y: ty, all: true, d: ['wa', Math.round(tx), Math.round(ty), Math.round(w.radius), Math.round(t - this.now)]});
    if (w.cat === 'missile') this.feed(`☢ ${o && o.name ? o.name : 'Someone'} launched ${w.name}! Impact at ${this.gridName(tx, ty)} in ${w.delay}s`);
  }
  updateStrikes() {
    if (!this.strikes.length) return; const now = this.now, keep = [];
    for (const s of this.strikes) {
      if (now < s.t) { keep.push(s); continue; }
      this.explode(s.x, s.y, s.w.radius, s.w.dmg, s.o, s.w);
      if (s.w.meteor) { this.createItem(s.x, s.y, {k: 'crate', contents: this.rollMany('crater', s.w.big ? 6 : 3)}); this.addEffect('crater', s.x, s.y, s.w.radius * 0.7, 180, {dps: 5}); }
    }
    this.strikes = keep;
  }
  cone(o, w, x, y, a) {
    const Rr = w.range, arc = w.arc || 0.6, now = this.now;
    const inCone = (ex, ey) => { const d = Math.hypot(ex - x, ey - y); return d < Rr && Math.abs(angDiff(a, Math.atan2(ey - y, ex - x))) < arc / 2 ? d : -1; };
    for (const z of this.zh.query(x, y, Rr, [])) {
      const d = inCone(z.x, z.y); if (d < 0 || z.hp <= 0) continue; const zd = ZD[z.type];
      if (w.dmg) this.hitZombie(z, w.dmg, o, null, a); if (z.hp <= 0) continue;
      if (w.stun && !zd.boss) z.stun = now + w.stun * 1000;
      if (w.knock && !zd.boss) { const k = w.knock * (1 - d / Rr) * 0.35; this.moveCircle(z, Math.cos(a) * k, Math.sin(a) * k, zd.r, 'walk'); }
      if (w.water) z.burn = 0;
    }
    for (const p of this.players.values()) {
      if (p === o || p.dead) continue; const d = inCone(p.x, p.y); if (d < 0) continue;
      if (w.water) p.buf.burn = 0; if (!this.canHurt(o, p)) continue;
      if (w.dmg) this.damagePlayer(p, w.dmg, 'melee', o); if (w.blind) p.buf.blind = now + w.blind * 1000; if (w.stun) p.buf.stun = now + Math.min(2, w.stun) * 1000;
      if (w.knock && !p.veh) { const k = w.knock * (1 - d / Rr) * 0.3; this.knockPlayer(p, Math.cos(a) * k, Math.sin(a) * k); }
    }
    if (w.emp) for (const v of this.vh.query(x, y, Rr, [])) { if (o && v === o.veh) continue; if (inCone(v.x, v.y) >= 0) v.emp = now + w.emp * 1000; }
    if (w.water) for (const e of this.effects.values()) if (e.type === 'fire' && inCone(e.x, e.y) >= 0) e.until = now;
    this.ev.push({x, y, d: ['cn', Math.round(x), Math.round(y), +a.toFixed(2), Rr, +arc.toFixed(2), w.water ? 1 : w.emp ? 2 : w.blind ? 3 : 4]});
  }

  // ───────── damage ─────────
  hitZombie(z, dmg, o, w, a) {
    if (z.hp <= 0) return; const d = ZD[z.type], now = this.now; let m = 1;
    if (d.armor && w && w.mode !== 'melee') m *= 1 - d.armor;
    if (d.shield && a !== undefined && Math.abs(angDiff(z.a, a + Math.PI)) < 1.0) m *= 1 - d.shield;
    if (d.fireWeak && w && (w.burn || w.fx === 'fire' || w.fx === 'thermo' || w.mode === 'flame')) m *= 2;
    if (z.burrowed) m *= 0.6;
    z.hp -= dmg * m;
    if (o && o.name && !z.tp && this.players.get(o.id) === o) z.tp = o.id;
    if (w) {
      if (w.knock && a !== undefined && !d.boss) { const k = clamp(w.knock, -300, 400) * 0.22; this.moveCircle(z, Math.cos(a) * k, Math.sin(a) * k, d.r, 'walk'); }
      if (w.stunc && rnd() < w.stunc && !d.boss) z.stun = now + 700;
      if (w.stun && w.mode !== 'cone' && !d.boss) z.stun = now + w.stun * 1000;
      if (w.burn && !d.fireImmune) { z.burn = now + w.burn * 1000; z.burnBy = o; }
      if (w.poison) { z.poison = now + w.poison * 1000; z.burnBy = o; }
    }
    if (dmg >= 8 && this.bloodN++ < 40) this.ev.push({x: z.x, y: z.y, d: ['bl', Math.round(z.x), Math.round(z.y)]});
    if (z.hp <= 0) this.killZombie(z, o);
  }
  killZombie(z, o) {
    if (!this.zombies.has(z.id)) return; this.zombies.delete(z.id); const d = ZD[z.type];
    if (o && o.name && this.players.get(o.id) === o) {
      o.kills++;
      const scrap = d.scrap || 12;
      this.awardScrap(o, scrap, z.x, z.y);
      if (d.boss) this.feed(`🏆 ${o.name} slew the ${d.n}! (+${scrap} Scrap)`);
    }
    this.ev.push({x: z.x, y: z.y, d: ['zd', Math.round(z.x), Math.round(z.y), z.ti]});
    if (d.explode) this.explode(z.x, z.y, d.explode.r, d.explode.dmg, null, {fx: 'toxic'});
    if (d.boss) this.createItem(z.x, z.y, {k: 'crate', contents: this.rollMany('drop', 6)});
    else if (d.drop && rnd() < 0.5) this.createItem(z.x, z.y, this.rollLoot(d.drop));
    else if (rnd() < 0.06) this.createItem(z.x + R(-10, 10), z.y + R(-10, 10), this.rollLoot('zdrop'));
  }
  damagePlayer(p, dmg, kind, o, zsrc, w) {
    if (p.dead || !(dmg > 0) || p.god) return; const now = this.now;
    if (o && o !== p && now < p.spawnProt) return;
    const f = p.wfx; let m = 1;
    if (kind === 'bullet') m *= 1 - Math.min(0.7, f.bullet || 0); else if (kind === 'explosion') m *= 1 - (f.blast || 0); else if (kind === 'zombie' || kind === 'melee') m *= 1 - Math.min(0.6, f.melee || 0);
    if (kind === 'fire' && f.fireRes) m *= 1 - f.fireRes;
    m *= 1 - (f.armor || 0);
    if (p.rebornPerks && p.rebornPerks.exoskeleton) {
      m *= Math.max(0.4, 1 - p.rebornPerks.exoskeleton * 0.1);
    }
    let effectiveDmg = dmg * m;
    if (p.hardlightShield > 0) {
      const absorbed = Math.min(p.hardlightShield, effectiveDmg);
      p.hardlightShield -= absorbed;
      effectiveDmg -= absorbed;
      this.ev.push({x: p.x, y: p.y, d: ['ring', Math.round(p.x), Math.round(p.y), 45, '#00e5ff']});
    }
    p.hp -= effectiveDmg; p.hurt = now;
    if (kind === 'zombie' && zsrc) {
      const zd = ZD[zsrc.type];
      if (!p.inf && !(p.buf.disinf > now) && rnd() < 0.1 * (f.infect || 1)) { p.inf = 1; this.msg(p, '🧟 You were bitten — INFECTED! Find Antibiotics or Antizyme.'); }
      if (rnd() < 0.2 * (f.bleed || 1)) p.bleed = true;
      if (zd.knock) { const a = Math.atan2(p.y - zsrc.y, p.x - zsrc.x); this.knockPlayer(p, Math.cos(a) * zd.knock * 0.25, Math.sin(a) * zd.knock * 0.25); if (rnd() < 0.3) p.frac = true; }
      if (zd.slow) p.buf.slow = now + zd.slow * 1000; if (zd.grab) p.buf.slow = now + 1000; if (zd.burn) p.buf.burn = now + zd.burn * 1000;
    } else if (kind === 'bullet' || kind === 'melee') {
      if (rnd() < ((w && w.bleed) || 0.12) * (f.bleed || 1)) p.bleed = true;
      if (w && w.stun && kind === 'bullet') p.buf.stun = now + Math.min(3, w.stun) * 1000;
      if (w && w.burn) p.buf.burn = now + w.burn * 1000;
    } else if (kind === 'explosion' && dmg > 70 && rnd() < 0.25) p.frac = true;
    if (kind === 'fire') p.buf.burn = Math.max(p.buf.burn || 0, now + 1500);
    if (o && o !== p && o.name) { p.lastBy = o.id; p.lastByT = now; }
    if (p.hp <= 0) this.killPlayer(p, o, kind, zsrc, w);
  }
  killPlayer(p, o, kind, zsrc, w) {
    if (p.dead) return; p.dead = true; p.hp = 0; p.deaths++; p.rspAt = this.now + 5000;
    if (p.veh) this.exitVehicle(p, true);
    const contents = [];
    for (const s of p.hotbar) if (s) contents.push({k: 'w:' + s.w, mag: s.mag || 0, n: s.n || 0});
    for (const it of p.inv) contents.push({k: it.k, n: it.n});
    for (const [k, n] of Object.entries(p.ammo)) if (n > 0) contents.push({k: 'ammo_' + k, n});
    for (const k of Object.values(p.wear)) if (k) contents.push({k, n: 1});
    if (contents.length) this.createItem(p.x, p.y, {k: 'bag', contents, label: p.name});
    p.hotbar = [null, null, null, null, null]; p.inv = []; p.ammo = {}; p.wear = {}; this.recalcWear(p); this.invChanged(p);
    let killer = o && o !== p && o.name && this.players.get(o.id) === o ? o : null;
    if (!killer && p.lastBy && this.now - p.lastByT < 8000) killer = this.players.get(p.lastBy) || null;
    let txt;
    if (killer && killer !== p) { killer.pk++; txt = `${killer.name} ☠ ${p.name}${w && w.name ? ' [' + w.name + ']' : ''}`; }
    else if (kind === 'infection') txt = `${p.name} succumbed to the infection and TURNED`;
    else if (zsrc) txt = `${p.name} was killed by a ${ZD[zsrc.type].n}`;
    else txt = `${p.name} died (${kind})`;
    this.feed(txt);
    if (kind === 'infection') { const z = this.spawnZombie('turned', p.x, p.y); if (z) z.name = 'Turned ' + p.name; }
    p.dirty = true;
  }
  damageVehicle(v, dmg, o) {
    if (v.dead || !(dmg > 0)) return;
    if (o && o.name) { for (const pid of v.seats) { const pp = pid && this.players.get(pid); if (pp && pp !== o && !this.canHurt(o, pp)) return; } }
    const d = VEH[v.type]; v.hp -= dmg * (1 - (d.armor || 0)) * (1 - (v.plate || 0));
    if (v.hp <= 0) this.destroyVehicle(v, o);
  }
  destroyVehicle(v, o) {
    v.dead = true; v.hp = 0; v.deadAt = this.now; v.sp = 0; v.vx = v.vy = 0; v.siren = false;
    for (const pid of v.seats) { if (!pid) continue; const p = this.players.get(pid); if (p) { this.exitVehicle(p, true); this.damagePlayer(p, 40, 'explosion', o && this.canHurt(o, p) ? o : null); } }
    this.explode(v.x, v.y, 150, 85, o, {fx: 'frag'});
    if (v.spawn) v.spawn.next = this.now + 150000;
  }
  damageStruct(s, dmg, o) {
    if (!this.structs.has(s.id) || !(dmg > 0)) return; if (o && !this.canHurtStruct(o, s)) return;
    s.hp -= dmg; if (s.hp <= 0) this.removeStruct(s, true);
  }
  removeStruct(s, destroyed) { if (!this.structs.has(s.id)) return; this.structs.delete(s.id); this.sh.remove(s); if (destroyed) this.ev.push({x: s.x, y: s.y, d: ['sd', Math.round(s.x), Math.round(s.y)]}); }
  addEffect(type, x, y, r, dur, extra) { const e = Object.assign({id: this.id(), type, x, y, r, until: this.now + dur * 1000, born: this.now}, extra || {}); this.effects.set(e.id, e); return e; }

  // ───────── items & inventory ─────────
  createItem(x, y, o) {
    if (!o || !o.k) return null;
    const it = {id: this.id(), x: clamp(x, 40, this.WP - 40), y: clamp(y, 40, this.HP - 40), k: o.k, n: o.n || 1, mag: o.mag || 0, contents: o.contents || null, label: o.label || null, born: this.now, pt: null};
    this.items.set(it.id, it); this.ih.add(it); return it;
  }
  removeItem(it) { if (!this.items.has(it.id)) return; this.items.delete(it.id); this.ih.remove(it); if (it.pt) { it.pt.item = null; it.pt.next = this.now + R(240, 480) * 1000; } }
  initLoot() {
    this.lootPts = [];
    for (const [x, y, tag, locked] of this.M.loot) {
      if (this.blockedAt(x, y, 14, 'walk') || PROPS[this.tileAt(x, y)].water === 2) continue;
      const pt = {x, y, tag, locked, item: null, next: 0}; this.lootPts.push(pt);
      if (locked || rnd() < 0.65) this.spawnLootPt(pt);
    }
    this.lootIdx = 0;
  }
  spawnLootPt(pt) {
    const o = pt.locked ? {k: 'vault', contents: this.rollMany('vault', 4)} : this.rollLoot(pt.tag); if (!o) return;
    const it = this.createItem(pt.x + R(-8, 8), pt.y + R(-8, 8), o); it.pt = pt; pt.item = it;
    if (o.k.startsWith('w:')) { const w = WEAPONS[o.k.slice(2)]; if (w && w.ammo && rnd() < 0.6) this.createItem(pt.x + R(-30, 30), pt.y + R(-30, 30), {k: 'ammo_' + w.ammo, n: AMMO[w.ammo].pick}); }
  }
  rollLoot(tag) { const tbl = LOOT[tag] || LOOT.house; return this.rollEntry(pickW(rnd, tbl)); }
  rollMany(tag, n) { const out = []; for (let i = 0; i < n; i++) { const o = this.rollLoot(tag); if (o) out.push(o); } return out; }
  rollEntry(e) {
    if (e === 'melee') e = MELEE[Math.floor(rnd() * 4)];
    if (CATS[e]) { const list = BYCAT[e], key = list[Math.floor(rnd() * list.length)], w = WEAPONS[key]; return {k: 'w:' + key, mag: w.mag ? Math.ceil(w.mag * R(0.3, 1)) : 0, n: w.count || 0}; }
    if (e.startsWith('ammo:')) { const a = e.slice(5); return {k: 'ammo_' + a, n: Math.ceil(AMMO[a].pick * R(0.6, 1.3))}; }
    if (e.startsWith('w:')) { const w = WEAPONS[e.slice(2)]; return w ? {k: e, mag: w.mag || 0, n: w.count || 0} : null; }
    if (e.startsWith('i:')) return ITEMS[e.slice(2)] ? {k: e.slice(2), n: 1} : null;
    if (ITEM_CATS[e]) { const k = pickW(rnd, ITEM_CATS[e]), d = ITEMS[k]; return {k, n: (d.c === 'craft' || d.c === 'build') ? Math.ceil(R(1, 3)) : 1}; }
    return null;
  }
  lootTick() {
    const n = Math.min(500, this.lootPts.length);
    for (let i = 0; i < n; i++) {
      this.lootIdx = (this.lootIdx + 1) % this.lootPts.length; const pt = this.lootPts[this.lootIdx];
      if (pt.item || this.now < pt.next || this.playerNear(pt.x, pt.y, 700)) continue;
      if (rnd() < 0.6) this.spawnLootPt(pt); else pt.next = this.now + R(120, 300) * 1000;
    }
    if (this.tickN % 300 === 0) for (const it of this.items.values()) { if (it.pt || it.k === 'vault') continue; if (this.now - it.born > ((it.k === 'bag' || it.k === 'crate') ? 1200000 : 600000)) this.removeItem(it); }
  }
  interact(p) {
    if (p.dead) return;
    if (p.veh) { this.exitVehicle(p); return; }
    let bv = null, bvd = Infinity; for (const v of this.vh.query(p.x, p.y, 280, [])) { if (v.dead) continue; const r = VEH[v.type].r + 80, dd = d2(v.x, v.y, p.x, p.y); if (dd < r * r && dd < bvd) { bvd = dd; bv = v; } }
    let bi = null, bid = 80 * 80; for (const it of this.ih.query(p.x, p.y, 90, [])) { const dd = d2(it.x, it.y, p.x, p.y); if (dd < bid) { bid = dd; bi = it; } }
    let bs = null, bsd = 95 * 95; for (const s of this.sh.query(p.x, p.y, 200, [])) { if (!(s.def.door || s.def.water)) continue; const dd = d2(s.x, s.y, p.x, p.y); if (dd < bsd) { bsd = dd; bs = s; } }
    if (bv && (!bi || bvd < 70 * 70 || bvd <= bid)) { this.enterVehicle(p, bv); return; }
    if (bi) { this.pickup(p, bi); return; }
    if (bv) { this.enterVehicle(p, bv); return; }
    for (const pl of this.plots.values()) {
      if (d2(p.x, p.y, pl.x, pl.y) < 180 * 180) {
        if (!pl.owner || pl.owner === p.id) { this.claimPlot(p, pl.id); return; }
      }
    }
    if (bs) {
      if (bs.def.door) {
        if (this.settings.mode !== 'coop' && bs.team !== p.team && bs.owner !== p.id) { this.msg(p, '🔒 Not your door.'); return; }
        if (bs.open && !this.rectFree(bs.x, bs.y, bs.w, bs.h, true)) { bs.open = false; if (!this.rectFree(bs.x, bs.y, bs.w, bs.h, true)) { bs.open = true; this.msg(p, 'Something is in the doorway.'); return; } bs.open = true; }
        bs.open = !bs.open; this.ev.push({x: bs.x, y: bs.y, d: ['door', bs.id]}); return;
      }
      if (bs.water >= 1) { bs.water -= 1; p.th = Math.min(100, p.th + 35); this.msg(p, '💧 You drink clean water.'); } else this.msg(p, 'Empty — wait for it to collect water.');
      return;
    }
    if (this.nearWater(p.x, p.y)) this.drinkWild(p);
  }
  nearWater(x, y) { for (const [dx, dy] of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]]) if (PROPS[this.tileAt(x + dx, y + dy)].water) return true; return false; }
  drinkWild(p) {
    p.th = Math.min(100, p.th + 30); let safe = !!p.pfx.purify;
    if (!safe && this.countItem(p, 'purifytabs')) { this.takeItem(p, 'purifytabs', 1); safe = true; }
    if (!safe && rnd() < 0.3) { p.hp -= 10; this.msg(p, '🤢 The dirty water made you sick (-10 HP). Purify it next time!'); if (p.hp <= 0) this.killPlayer(p, null, 'dirty water'); }
    else this.msg(p, '💧 You drink from the water.');
  }
  pickup(p, it) {
    const k = it.k;
    if (k === 'vault') {
      if (this.countItem(p, 'keycard') < 1) { this.msg(p, '🔒 Locked vault — you need a Keycard.'); return; }
      this.takeItem(p, 'keycard', 1); for (const c of it.contents || []) this.createItem(it.x + R(-50, 50), it.y + R(-50, 50), c);
      this.feed(`🔓 ${p.name} cracked a vault!`); this.removeItem(it); return;
    }
    if (k === 'bag' || k === 'crate') {
      const rest = []; for (const c of it.contents || []) if (!this.giveObj(p, c, false)) rest.push(c);
      it.contents = rest; if (!rest.length) this.removeItem(it); else this.msg(p, 'Inventory full — some loot left behind.');
      this.msg(p, k === 'bag' ? `🎒 Looted ${it.label || 'a'} bag` : '📦 Opened the crate'); p.dirty = true; return;
    }
    if (this.giveObj(p, it, true)) this.removeItem(it);
  }
  giveObj(p, o, announce) {
    const k = o.k;
    if (k.startsWith('w:')) {
      const key = k.slice(2), w = WEAPONS[key]; if (!w) return true;
      if (w.count) { const same = p.hotbar.findIndex(s => s && s.w === key); if (same >= 0) { p.hotbar[same].n = (p.hotbar[same].n || 0) + (o.n || w.count); p.dirty = true; if (announce) this.msg(p, `+${o.n || w.count} ${w.name}`); return true; } }
      let i = p.hotbar.indexOf(null);
      if (i < 0) { if (!announce) return false; i = p.sel; const cur = p.hotbar[i]; this.createItem(p.x + R(-20, 20), p.y + R(-20, 20), {k: 'w:' + cur.w, mag: cur.mag, n: cur.n}); }
      p.hotbar[i] = {w: key, mag: o.mag || 0, n: o.n || w.count || 0}; p.dirty = true;
      if (announce) this.msg(p, `Picked up ${w.name} (${CATS[w.cat].label})`); return true;
    }
    if (k.startsWith('ammo_')) { const a = k.slice(5); if (!AMMO[a]) return true; p.ammo[a] = (p.ammo[a] || 0) + (o.n || 1); p.dirty = true; if (announce) this.msg(p, `+${o.n} ${AMMO[a].n}`); return true; }
    const d = ITEMS[k]; if (!d) return true;
    const n0 = o.n || 1, left = this.addItem(p, k, n0);
    if (left === n0) { if (announce) this.msg(p, 'Inventory full! (drop something or find a backpack)'); return false; }
    if (left > 0) { o.n = left; return false; }
    if (announce) this.msg(p, 'Picked up ' + d.n + (n0 > 1 ? ' ×' + n0 : '')); return true;
  }
  dropItem(p, i, all) { const it = p.inv[i]; if (!it || p.dead) return; const n = all ? it.n : 1; this.createItem(p.x + R(-25, 25), p.y + R(-25, 25), {k: it.k, n}); this.takeAt(p, i, n); }
  dropWeapon(p, s) { const sl = p.hotbar[s]; if (!sl || p.dead) return; this.createItem(p.x + R(-25, 25), p.y + R(-25, 25), {k: 'w:' + sl.w, mag: sl.mag, n: sl.n}); p.hotbar[s] = null; p.dirty = true; }
  useItem(p, i, x, y, rot) {
    if (p.dead) return; const it = p.inv[i]; if (!it) return; const d = ITEMS[it.k]; if (!d) return;
    switch (d.u) {
      case 'consume': if (this.consume(p, d) && !d.keep) this.takeAt(p, i, 1); break;
      case 'place': {
        if (it.k === 'scrapmetal') { for (const v of this.vh.query(x, y, 120, [])) if (!v.dead && Math.hypot(v.x - x, v.y - y) < VEH[v.type].r + 30 && Math.hypot(v.x - p.x, v.y - p.y) < 220) { v.plate = Math.min(0.45, (v.plate || 0) + 0.1); this.takeAt(p, i, 1); this.msg(p, `🛡 Welded armour onto the ${VEH[v.type].n} (${Math.round(v.plate * 100)}%)`); return; } }
        if (this.placeStruct(p, d.s, x, y, rot)) this.takeAt(p, i, 1); break;
      }
      case 'throw': this.throwItem(p, d, x, y); this.takeAt(p, i, 1); break;
      case 'target': if (this.targetItem(p, it.k, x, y) && !d.keep) this.takeAt(p, i, 1); break;
      case 'wear': this.wearItem(p, i); break;
      case 'vehicle': this.vehicleItem(p, i, d); break;
      case 'reinforce': {
        let best = null, bd = 170 * 170; for (const s of this.sh.query(x, y, 220, [])) { const dd = d2(s.x, s.y, x, y); if (dd < bd && s.def.block !== 0) { bd = dd; best = s; } }
        if (best && Math.hypot(best.x - p.x, best.y - p.y) < 260) { best.maxhp = Math.round(best.maxhp * 1.5); best.hp = Math.min(best.maxhp, best.hp + best.maxhp * 0.4); this.takeAt(p, i, 1); this.msg(p, `Reinforced ${best.def.n} (+50% HP)`); }
        else this.msg(p, 'Aim at one of your structures to reinforce it.'); break;
      }
      case 'passive': if (d.fx && d.fx.light) p.light = !p.light; else if (d.fx && d.fx.nvg) p.nvg = !p.nvg; else this.msg(p, d.n + ' works automatically while you carry it.'); break;
      case 'key': this.msg(p, 'Press E on a locked vault to use the Keycard.'); break;
      default: this.msg(p, d.n + ' is a crafting material — press C to craft.');
    }
  }
  consume(p, d) {
    const f = d.fx || {}, now = this.now;
    if (f.reveal) {
      if (now < p.rev + 8000) { this.msg(p, '📷 Camera recharging…'); return false; } p.rev = now; const marks = [];
      for (const q of this.players.values()) if (q !== p && !q.dead && d2(q.x, q.y, p.x, p.y) < 1600 * 1600) marks.push([Math.round(q.x), Math.round(q.y), q.team, q.id]);
      for (const z of this.zh.query(p.x, p.y, 1300, [])) if (ZD[z.type].boss || z.type === 'brute' || z.type === 'screamer') marks.push([Math.round(z.x), Math.round(z.y), -1, 0]);
      for (const q of this.players.values()) if (q === p || (this.settings.mode !== 'ffa' && q.team === p.team)) this.send(q, {t: 'reveal', m: marks, by: p.name});
      this.ev.push({x: p.x, y: p.y, d: ['ph', p.id]}); return false;
    }
    if (f.heal) p.hp = Math.min(100, p.hp + f.heal);
    if (f.bleed) p.bleed = false;
    if (f.painkill) p.buf.painkill = now + f.painkill * 1000;
    if (f.cure) { if (p.inf) { p.inf = Math.max(0, p.inf - f.cure); if (p.inf <= 0) { p.inf = 0; this.msg(p, '💉 Infection cured!'); } } else this.msg(p, 'You are not infected (antibiotics still help wounds).'); }
    if (f.splint) p.frac = false;
    if (f.antizyme) p.buf.antizyme = now + f.antizyme * 1000;
    if (f.disinf) p.buf.disinf = now + f.disinf * 1000;
    if (f.adren) p.buf.adren = now + f.adren * 1000;
    if (f.stam) p.st = Math.min(100, p.st + f.stam);
    if (f.hu) p.hu = clamp(p.hu + f.hu, 0, 100);
    if (f.th) p.th = clamp(p.th + f.th, 0, 100);
    if (f.poison && rnd() < f.poison) { p.hp -= 12; p.th = Math.max(0, p.th - 15); this.msg(p, '🤢 Those were poisonous! (-12 HP)'); if (p.hp <= 0) this.killPlayer(p, null, 'poison'); }
    if (f.scent) { p.buf.scent = now + f.scent * 1000; this.msg(p, '🧟 You reek of the dead — zombies ignore you until you attack.'); }
    if (f.whistle) { this.noise(p.x, p.y, 1500); this.ev.push({x: p.x, y: p.y, d: ['wh', p.id]}); this.msg(p, '📣 Every zombie nearby heard that…'); }
    p.dirty = true; return true;
  }
  throwItem(p, d, x, y) {
    const a = Math.atan2(y - p.y, x - p.x), th = d.th;
    const pr = this.spawnProj(p, {proj: 650, range: 620, lob: 1, kind: 'item', fuse: th.fuse || 0}, p.x, p.y, a, x, y, p.veh, !!th.fuse);
    pr.itemFx = th;
  }
  applyThrowFx(o, th, x, y) {
    switch (th.t) {
      case 'light': this.addEffect('light', x, y, th.r, th.dur); break;
      case 'flare': this.addEffect('flare', x, y, th.r, th.dur, {lure: th.lure}); this.noise(x, y, th.lure); break;
      case 'lure': this.addEffect('lure', x, y, 60, th.dur, {lure: th.lure}); this.noise(x, y, th.lure); this.ev.push({x, y, d: ['lu', Math.round(x), Math.round(y), th.pop ? 1 : 0]}); break;
      case 'smoke': this.addEffect('smoke', x, y, th.r, th.dur); break;
      case 'fire': this.addEffect('fire', x, y, th.r, th.dur, {dps: th.dps, o}); this.ev.push({x, y, d: ['ex', Math.round(x), Math.round(y), 70, 'fire']}); this.noise(x, y, 700); break;
      case 'frag': this.explode(x, y, th.r, th.dmg, o, {fx: 'frag', svd: 2}); break;
    }
  }
  targetItem(p, k, x, y) {
    if (k === 'drone') { this.addEffect('drone', p.x, p.y, 40, 25, {tx: x, ty: y, o: p}); this.msg(p, '🛸 Drone deployed'); return true; }
    if (k === 'laserpointer') { if (Math.hypot(x - p.x, y - p.y) > 1400) { this.msg(p, 'Too far for the laser.'); return false; } this.addEffect('lure', x, y, 30, 3, {lure: 650, laser: 1}); this.noise(x, y, 650); return false; }
    return false;
  }
  wearItem(p, i) {
    const it = p.inv[i], d = ITEMS[it.k], old = p.wear[d.slot];
    p.wear[d.slot] = it.k; this.takeAt(p, i, 1); this.recalcWear(p);
    if (old && this.addItem(p, old, 1) > 0) this.createItem(p.x, p.y, {k: old, n: 1});
    this.overflow(p); this.msg(p, 'Equipped ' + d.n);
  }
  unwear(p, slot) {
    const k = p.wear[slot]; if (!k) return; delete p.wear[slot]; this.recalcWear(p);
    this.overflow(p); if (this.addItem(p, k, 1) > 0) this.createItem(p.x, p.y, {k, n: 1}); p.dirty = true;
  }
  vehicleItem(p, i, d) {
    let best = null, bd = Infinity;
    for (const v of this.vh.query(p.x, p.y, 220, [])) { if (v.dead) continue; const r = VEH[v.type].r + 90, dd = d2(v.x, v.y, p.x, p.y); if (dd < r * r && dd < bd) { bd = dd; best = v; } }
    if (!best && p.veh) best = p.veh;
    if (!best) { this.msg(p, 'Stand next to a vehicle to use ' + d.n + '.'); return; }
    const f = d.vfx, vd = VEH[best.type];
    if (f.siphon) { if (best.fuel >= 20) { if (this.addItem(p, 'gasoline', 1) > 0) this.msg(p, 'Inventory full.'); else { best.fuel -= 20; this.msg(p, '⛽ Siphoned fuel into a jerrycan.'); } } else this.msg(p, 'Not enough fuel to siphon.'); return; }
    const parts = [];
    if (f.fuel) { if (best.fuel >= vd.fuel - 1) { this.msg(p, 'Tank already full.'); return; } best.fuel = Math.min(vd.fuel, best.fuel + vd.fuel * f.fuel); parts.push('refuelled'); }
    if (f.fix && best.broken) { best.broken = false; parts.push('engine fixed'); }
    if (f.repair) { if (best.hp >= best.maxhp && !parts.length && !f.plate) { this.msg(p, 'Already fully repaired.'); return; } best.hp = Math.min(best.maxhp, best.hp + best.maxhp * f.repair); parts.push('repaired'); }
    if (f.plate) { best.plate = Math.min(0.45, (best.plate || 0) + f.plate); parts.push('armour ' + Math.round(best.plate * 100) + '%'); }
    this.takeAt(p, i, 1); this.msg(p, `🔧 ${vd.n}: ${parts.join(', ')}`);
  }
  craft(p, ri) {
    const r = RECIPES[ri]; if (!r || p.dead) return;
    for (const [k, n] of Object.entries(r.in)) if (this.countItem(p, k) < n) { this.msg(p, 'Missing materials.'); return; }
    for (const [k, n] of Object.entries(r.in)) this.takeItem(p, k, n);
    if (r.out.startsWith('ammo_')) { const a = r.out.slice(5); p.ammo[a] = (p.ammo[a] || 0) + AMMO[a].pick * r.n; p.dirty = true; this.msg(p, `🔨 Crafted ${AMMO[a].pick * r.n} ${AMMO[a].n}`); return; }
    const left = this.addItem(p, r.out, r.n); if (left > 0) this.createItem(p.x, p.y, {k: r.out, n: left});
    this.msg(p, '🔨 Crafted ' + ITEMS[r.out].n + (r.n > 1 ? ' ×' + r.n : ''));
  }
  placeStruct(p, kind, x, y, rot) {
    const d = STRUCTS[kind]; if (!d) return false;
    if (Math.hypot(x - p.x, y - p.y) > 240) { this.msg(p, 'Too far — place it closer to you.'); return false; }
    const w = rot ? d.h : d.w, h = rot ? d.w : d.h;
    if (!this.rectFree(x, y, w, h, d.block !== 0)) { this.msg(p, "Can't build there."); return false; }
    if (this.structs.size > 3000) { this.msg(p, 'Server structure limit reached.'); return false; }
    const s = {id: this.id(), kind, def: d, x, y, w, h, hp: d.hp, maxhp: d.hp, team: p.team, owner: p.id, open: false, born: this.now, charge: d.charge || 0, water: d.inf ? 99 : 0};
    this.structs.set(s.id, s); this.sh.add(s); this.ev.push({x, y, d: ['pl', Math.round(x), Math.round(y)]}); return true;
  }

  // ───────── vehicles ─────────
  createVehicle(type, x, y, a, sp) {
    const d = VEH[type];
    const v = {id: this.id(), type, ti: VLIST.indexOf(type), x, y, a: a || 0, vx: 0, vy: 0, sp: 0, hp: d.hp, maxhp: d.hp, fuel: d.fuel,
      seats: new Array(d.seats).fill(0), spawn: sp || null, broken: false, emp: 0, siren: false, alt: 0, plate: 0, dead: false, ta: a || 0, lastUsed: 0};
    v.broken = false;
    this.vehicles.set(v.id, v); return v;
  }
  initVehicles() {
    for (const [x, y, a, pool] of this.M.vspawns) {
      const sp = {x, y, a, pool, vid: 0, next: 0}; const type = pool[Math.floor(rnd() * pool.length)], d = VEH[type]; if (!d) continue;
      this.vspawns.push(sp); if (this.blockedAt(x, y, d.r, d.kind === 'heli' ? 'car' : d.kind)) { sp.next = 1e12; continue; }
      sp.vid = this.createVehicle(type, x, y, a, sp).id;
    }
  }
  vehicleTick() {
    const now = this.now;
    for (const v of this.vehicles.values()) {
      if (v.dead) { if (now - v.deadAt > 45000) this.vehicles.delete(v.id); continue; }
      if (v.seats.some(s => s)) { v.lastUsed = now; continue; }
      if (v.spawn && v.lastUsed && now - v.lastUsed > 600000 && d2(v.x, v.y, v.spawn.x, v.spawn.y) > 4e6 && !this.playerNear(v.x, v.y, 1600)) { this.vehicles.delete(v.id); v.spawn.next = now; }
    }
    for (const sp of this.vspawns) {
      if (this.vehicles.has(sp.vid) || now < sp.next || this.playerNear(sp.x, sp.y, 900)) continue;
      const type = sp.pool[Math.floor(rnd() * sp.pool.length)], d = VEH[type];
      if (this.blockedAt(sp.x, sp.y, d.r, d.kind === 'heli' ? 'car' : d.kind)) { sp.next = now + 60000; continue; }
      sp.vid = this.createVehicle(type, sp.x, sp.y, sp.a, sp).id;
    }
  }
  enterVehicle(p, v) {
    const d = VEH[v.type]; let seat = v.seats[0] ? v.seats.indexOf(0) : 0;
    if (seat < 0) { this.msg(p, 'Vehicle is full.'); return; }
    const drv = v.seats[0] && this.players.get(v.seats[0]); if (drv && this.settings.mode !== 'coop' && this.canHurt(drv, p)) { this.msg(p, '⚠ Enemy vehicle!'); return; }
    v.seats[seat] = p.id; p.veh = v; p.seat = seat; p.x = v.x; p.y = v.y; p.reloadUntil = 0; p.dirty = true; v.lastUsed = this.now;
    if (seat === 0 && v.broken) this.msg(p, `🔧 This ${d.n} won't start — use Spark Plugs on it.`);
    else if (seat === 0 && v.fuel <= 1) this.msg(p, '⛽ Out of fuel — use a Gasoline Jerrycan.');
    else this.msg(p, `${d.n} — ${seat === 0 ? 'driver' : 'seat ' + (seat + 1)}`);
    this.ev.push({x: v.x, y: v.y, d: ['door', v.id]});
  }
  exitVehicle(p, force) {
    const v = p.veh; if (!v) return; const d = VEH[v.type];
    v.seats[p.seat] = 0; let placed = false;
    for (const s of [v.a + Math.PI / 2, v.a - Math.PI / 2, v.a + Math.PI, v.a]) { const x = v.x + Math.cos(s) * (d.r + p.r + 8), y = v.y + Math.sin(s) * (d.r + p.r + 8); if (!this.blockedAt(x, y, p.r, 'walk')) { p.x = x; p.y = y; placed = true; break; } }
    if (!placed) { const f = this.findFree(v.x, v.y, p.r, 'walk'); p.x = f[0]; p.y = f[1]; }
    const fast = Math.hypot(v.vx, v.vy);
    p.veh = null; p.seat = -1; this.forcePos(p); p.dirty = true;
    if (!force && d.kind === 'heli' && v.alt > 0.5 && fast > 120) this.damagePlayer(p, 35, 'fall', null);
    else if (!force && fast > 500) this.damagePlayer(p, (fast - 400) * 0.05, 'fall', null);
  }
  switchSeat(p) { const v = p.veh; if (!v) return; for (let k = 1; k <= v.seats.length; k++) { const s = (p.seat + k) % v.seats.length; if (!v.seats[s]) { v.seats[p.seat] = 0; v.seats[s] = p.id; p.seat = s; p.dirty = true; this.msg(p, s === 0 ? 'Driver seat' : 'Seat ' + (s + 1)); return; } } }
  horn(p) {
    const v = p.veh; if (!v || this.now < p.lastHorn + 600) return; p.lastHorn = this.now;
    if (VEH[v.type].siren) { v.siren = !v.siren; this.msg(p, v.siren ? '🚨 Siren ON (draws zombies)' : 'Siren off'); }
    else { this.noise(v.x, v.y, 1100); this.ev.push({x: v.x, y: v.y, d: ['hn', v.id]}); }
  }
  updateVehicles(dt) {
    const now = this.now, empAll = now < this.empUntil;
    for (const v of this.vehicles.values()) {
      if (v.dead) continue; const d = VEH[v.type];
      const occ = v.seats.some(s => s);
      if (!occ && Math.abs(v.sp) < 1 && Math.abs(v.vx) + Math.abs(v.vy) < 2 && v.alt <= 0) { v.sp = 0; v.vx = 0; v.vy = 0; continue; }
      const drv = v.seats[0] ? this.players.get(v.seats[0]) : null;
      let thr = 0, steer = 0, boost = false, braking = false;
      if (drv && !drv.dead) { thr = -drv.input.my; steer = drv.input.mx; boost = drv.input.sprint; braking = !!drv.input.brake; }
      const disabled = v.broken || v.fuel <= 0 || v.emp > now || empAll; if (disabled) { thr = 0; boost = false; }
      const heli = d.kind === 'heli';
      if (heli) v.alt = (drv && !disabled) ? Math.min(1, v.alt + dt * 0.8) : Math.max(0, v.alt - dt * 0.4);
      const tile = this.tileAt(v.x, v.y), P = PROPS[tile];
      let tm;
      if (heli) tm = v.alt > 0.6 ? 1 : 0.25;
      else if (d.kind === 'boat') tm = P.water ? 1 : 0.05;
      else if (d.kind === 'hover') tm = P.water ? 1 : Math.max(0.5, P.veh);
      else {
        // Road surface gives significant speed and traction boost
        const isRoad = tile === 5 || tile === 20 || tile === 24 || tile === 6;
        tm = isRoad ? 1.35 : (d.terrain && d.terrain[tile] !== undefined ? d.terrain[tile] : P.veh);
      }
      const maxS = d.speed * tm * (boost && !disabled ? 1.3 : 1);
      
      // Acceleration, smart braking, and reverse handling
      if (thr > 0) {
        v.sp += d.accel * thr * dt * (v.sp < 0 ? 3.6 : 1.15);
      } else if (thr < 0) {
        if (v.sp > 15) {
          // Pressing S while moving forward applies high-friction disc brakes!
          v.sp -= Math.min(v.sp, d.accel * 4.2 * dt);
        } else {
          // Reverse gear acceleration
          v.sp += d.accel * thr * dt * 1.5;
        }
      } else {
        // Terrain-aware rolling drag
        const rollingDrag = (P.drag || 1.0) * (heli ? 1.0 : 1.8);
        v.sp -= v.sp * Math.min(1, rollingDrag * dt);
      }

      if (braking && d.kind === 'car') {
        v.sp *= Math.pow(0.12, dt);
      }
      if (v.sp > maxS) v.sp -= (v.sp - maxS) * Math.min(1, 4 * dt);
      if (v.sp < -maxS * 0.6) v.sp = -maxS * 0.6;

      // High-authority responsive steering at all speeds with natural reverse inversion
      const tf = heli ? 1 : Math.max(0.68, Math.min(1.25, 0.45 + Math.abs(v.sp) / 100));
      v.a += steer * d.turn * tf * dt * (v.sp < -5 && !heli ? -1 : 1);

      // Tire grip, handbrake drift, and slide physics
      let effectiveGrip = (d.kind === 'car' ? (P.grip || 1) : 1) * (d.grip || 1);
      if (braking) effectiveGrip *= 0.32; // Power slide
      const g = Math.min(1, effectiveGrip * 10 * dt);
      v.vx += (Math.cos(v.a) * v.sp - v.vx) * g;
      v.vy += (Math.sin(v.a) * v.sp - v.vy) * g;

      if (!disabled && drv) v.fuel = Math.max(0, v.fuel - d.burn * (Math.abs(thr) + (heli && v.alt > 0 ? 0.35 : 0)) * (boost ? 1.6 : 1) * dt);
      const ck = heli ? (v.alt > 0.6 ? 'fly' : 'car') : d.kind;
      const spd = Math.hypot(v.vx, v.vy);
      if (spd > 0.5) {
        const hit = this.moveCircle(v, v.vx * dt, v.vy * dt, d.r, ck);
        if (hit) {
          if (hit.def && d.crush) this.damageStruct(hit, 5000, drv);
          else {
            if (spd > 260) {
              this.damageVehicle(v, (spd - 200) * 0.05 * (d.tough ? 0.25 : 1), null); if (hit.def) this.damageStruct(hit, spd * 0.4 * (d.mass || 1), drv);
              if (spd > 650 && !d.tough) for (const pid of v.seats) { const pp = pid && this.players.get(pid); if (pp) this.damagePlayer(pp, (spd - 600) * 0.04, 'crash', null); }
              this.ev.push({x: v.x, y: v.y, d: ['cr', Math.round(v.x), Math.round(v.y)]});
            }
            v.sp *= 0.35; v.vx *= 0.4; v.vy *= 0.4;
          }
        }
        if (spd > 130 && ck !== 'fly' && !v.dead) this.ram(v, d, drv, spd);
      }
      if (v.dead) continue;
      for (const pid of v.seats) { if (!pid) continue; const p = this.players.get(pid); if (p) { p.x = v.x; p.y = v.y; if (d.heal) { p.hp = Math.min(100, p.hp + d.heal * dt); p.bleed = false; } } }
      if (v.siren && this.tickN % 30 === 0) this.noise(v.x, v.y, 1500);
      if (d.kind === 'car' && !heli && P.water === 2) this.damageVehicle(v, 60 * dt, null);
    }
  }
  ram(v, d, drv, spd) {
    const ux = v.vx / spd, uy = v.vy / spd;
    for (const z of this.zh.query(v.x, v.y, d.r + 60, [])) {
      if (z.hp <= 0 || z.burrowed) continue; const zd = ZD[z.type]; if (d2(z.x, z.y, v.x, v.y) > (d.r + zd.r) ** 2) continue;
      const dmg = spd * 0.14 * (d.mass || 1); this.hitZombie(z, dmg, drv, null, v.a);
      if (drv && z.hp <= 0) this.awardScrap(drv, 15, z.x, z.y);
      if (z.hp > 0) { this.moveCircle(z, ux * 35, uy * 35, zd.r, 'walk'); z.stun = this.now + 500; }
      const slow = zd.boss ? 0.35 : z.type === 'brute' ? 0.7 : 0.95; v.sp *= slow; v.vx *= slow; v.vy *= slow;
      if (!d.tough) this.damageVehicle(v, dmg * 0.012 * (zd.boss ? 6 : 1), null);
      if (v.dead) return;
    }
    for (const p of this.players.values()) {
      if (p.dead || p.veh || d2(p.x, p.y, v.x, v.y) > (d.r + p.r) ** 2) continue;
      if (drv && drv !== p && this.canHurt(drv, p)) this.damagePlayer(p, spd * 0.09 * (d.mass || 1), 'melee', drv);
      this.knockPlayer(p, ux * 60 + (p.x - v.x) * 0.3, uy * 60 + (p.y - v.y) * 0.3);
    }
  }

  // ───────── zombies ─────────
  spawnZombie(type, x, y) {
    const d = ZD[type]; if (!d) return null;
    const z = {id: this.id(), type, ti: ZLIST.indexOf(type), x, y, a: rnd() * 6.28, hp: d.hp, maxhp: d.hp, tp: 0, gx: x, gy: y, think: 0, nextAtk: 0, stun: 0, burn: 0, poison: 0,
      prog: 500, detour: 0, detourUntil: 0, nextSpit: 0, nextSlam: 0, nextScream: this.now + 4000, burrowed: !!d.burrow, inv: false, atk: -1e9};
    this.zombies.set(z.id, z); return z;
  }
  pickZType(theme, night, water) {
    if (water) return 'drowned';
    const arr = []; for (const k of ZLIST) { const d = ZD[k]; if (d.boss || k === 'turned' || k === 'drowned') continue; if (d.nightOnly && !night) continue; let w = (d.w.all || 0) + (d.w[theme] || 0); if (night && d.night) w *= d.night; if (w > 0) arr.push([k, w]); }
    return pickW(rnd, arr);
  }
  spawnNear(p, night, force) {
    for (let t = 0; t < 8; t++) {
      const a = rnd() * Math.PI * 2, dist = R(1050, 1750), x = p.x + Math.cos(a) * dist, y = p.y + Math.sin(a) * dist;
      if (x < 100 || y < 100 || x > this.WP - 100 || y > this.HP - 100) continue;
      let near = false; for (const q of this.players.values()) if (!q.dead && d2(q.x, q.y, x, y) < 810000) { near = true; break; } if (near) continue;
      const water = PROPS[this.tileAt(x, y)].water > 0, type = force || this.pickZType(this.themeAt(x, y), night, water);
      if (this.blockedAt(x, y, ZD[type].r, 'walk')) continue;
      return this.spawnZombie(type, x, y);
    }
    return null;
  }
  spawnTick() {
    if (!this.players.size) { if (this.zombies.size) this.zombies.clear(); return; }
    const night = this.light < 0.35, bm = this.fxActive('bloodmoon') ? 2 : 1, ecl = this.fxActive('eclipse') ? 1.5 : 1;
    for (const p of this.players.values()) {
      if (p.dead || this.zombies.size >= MAXZ) continue;
      const target = Math.round((THEME_DENS[this.themeAt(p.x, p.y)] || 20) * this.settings.density * (night ? 1.5 : 1) * bm * ecl);
      let c = 0; for (const z of this.zh.query(p.x, p.y, 1800, [])) if (d2(z.x, z.y, p.x, p.y) < 3240000) c++;
      const need = Math.min(6, target - c); for (let k = 0; k < need; k++) this.spawnNear(p, night);
      if ((bm > 1 && rnd() < 0.01) || rnd() < 0.0006) {
        let boss = false; for (const z of this.zombies.values()) if (ZD[z.type].boss) { boss = true; break; }
        if (!boss) { const z = this.spawnNear(p, night, 'behemoth'); if (z) this.feed('⚠️ A BEHEMOTH has been sighted near ' + this.gridName(z.x, z.y) + '!'); }
      }
    }
  }
  despawnTick() {
    for (const z of this.zombies.values()) {
      if (ZD[z.type].boss && rnd() > 0.02) continue;
      let near = false; for (const p of this.players.values()) if (d2(p.x, p.y, z.x, z.y) < 7290000) { near = true; break; }
      if (!near) this.zombies.delete(z.id);
    }
  }
  zThink(z, d, night) {
    const smoke = []; for (const e of this.effects.values()) if (e.type === 'smoke' && d2(e.x, e.y, z.x, z.y) < 4e6) smoke.push(e);
    const base = d.sense * (night ? 1.25 : 1) * (this.fxActive('dust') || this.fxActive('whiteout') ? 0.6 : 1);
    let best = null, bd = Infinity;
    for (const p of this.players.values()) {
      if (p.dead) continue; let s = base;
      if (p.veh) { if (p.veh.alt > 0.5) continue; s *= 1.35; }
      if (p.input.sprint) s *= 1.25; if (p.wfx.gillie) s *= 0.5;
      if (p.buf.scent > this.now && this.now - p.lastAtk > 3000) s *= 0.12;
      for (const e of smoke) if (d2(e.x, e.y, p.x, p.y) < e.r * e.r || d2(e.x, e.y, z.x, z.y) < e.r * e.r) { s = Math.min(s, 110); break; }
      const dd = Math.hypot(p.x - z.x, p.y - z.y); if (dd < s && dd < bd) { bd = dd; best = p; }
    }
    if (best) { z.tp = best.id; z.inv = false; return; }
    if (z.tp) { const p = this.players.get(z.tp); if (p && !p.dead && d2(p.x, p.y, z.x, z.y) < (base * 1.6) ** 2) return; z.tp = 0; }
    for (let i = this.noises.length - 1; i >= 0; i--) { const n = this.noises[i]; if (this.now - n.t > 4000) break; if (d2(n.x, n.y, z.x, z.y) < n.r * n.r) { z.gx = n.x + R(-60, 60); z.gy = n.y + R(-60, 60); z.inv = true; return; } }
    if (z.inv && d2(z.gx, z.gy, z.x, z.y) > 900) return;
    z.inv = false; if (d2(z.gx, z.gy, z.x, z.y) < 900 || rnd() < 0.03) { z.gx = z.x + R(-260, 260); z.gy = z.y + R(-260, 260); }
  }
  updateZombies(dt) {
    const now = this.now, night = this.light < 0.35, frenzy = (this.fxActive('bloodmoon') ? 1.3 : 1) * (this.fxActive('eclipse') ? 1.2 : 1);
    const odd = this.tickN & 1, zdt = dt * 2;
    for (const z of this.zombies.values()) {
      if ((z.id & 1) !== odd) continue; const d = ZD[z.type];
      if (z.burn > now) { this.hitZombie(z, 7 * zdt, z.burnBy, null); if (z.hp <= 0) continue; }
      if (z.poison > now) { this.hitZombie(z, 5 * zdt, z.burnBy, null); if (z.hp <= 0) continue; }
      if (z.stun > now) continue;
      if (now >= z.think) { z.think = now + 250 + rnd() * 200; this.zThink(z, d, night); }
      let target = null; if (z.tp) { const p = this.players.get(z.tp); if (p && !p.dead) { target = p; z.gx = p.x; z.gy = p.y; } else z.tp = 0; }
      const dx = z.gx - z.x, dy = z.gy - z.y, dist = Math.hypot(dx, dy);
      if (d.burrow) z.burrowed = !(target && dist < 230);
      if (d.aura && this.tickN % 6 < 2) for (const p of this.players.values()) { if (p.dead || (p.veh && !VEH[p.veh.type].exposed) || p.wfx.toxic) continue; if (d2(p.x, p.y, z.x, z.y) < d.aura.r ** 2) this.damagePlayer(p, d.aura.dps * 0.2, 'toxic', null); }
      const P = PROPS[this.tileAt(z.x, z.y)];
      let spd = d.spd * (night ? 1.2 : 1) * frenzy;
      if (d.swim) spd *= P.water ? 2.1 : 0.7; else spd *= P.water === 2 ? 0.45 : (P.walk || 1);
      if (!target && !z.inv) spd *= 0.45;
      if (d.spit && target && dist < d.spit.range * 0.75 && dist > 150) spd = 0;
      let ang = Math.atan2(dy, dx);
      if (d.scream && target && dist < 330) ang += Math.PI;
      const reach = target ? d.r + (target.veh ? VEH[target.veh.type].r : target.r) + 6 : 24;
      if (spd > 0 && dist > reach) {
        if (now < z.detourUntil) ang += z.detour;
        z.a = ang; const ox = z.x, oy = z.y;
        const hit = this.moveCircle(z, Math.cos(ang) * spd * zdt, Math.sin(ang) * spd * zdt, d.r, 'walk');
        if (hit && hit.def && now >= z.nextAtk) { z.nextAtk = now + d.atk * 1000; z.atk = now; this.damageStruct(hit, d.dmg * (d.svd || 1) * 1.5, null); }
        const moved = Math.hypot(z.x - ox, z.y - oy), exp = spd * zdt; z.prog = z.prog * 0.85 + moved;
        if (z.prog < exp * 1.6 && !(hit && hit.def) && now > z.detourUntil) { z.detour = (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd() * 0.9); z.detourUntil = now + 500 + rnd() * 900; z.prog = exp * 8; }
      } else if (target) z.a = ang;
      if (target) {
        const tx = target.veh ? target.veh.x : target.x, ty = target.veh ? target.veh.y : target.y, td = Math.hypot(tx - z.x, ty - z.y);
        if (td < reach + 4 && now >= z.nextAtk && !(target.veh && target.veh.alt > 0.5)) { z.nextAtk = now + d.atk * 1000; z.atk = now; this.zombieAttack(z, d, target, night); }
        if (d.spit && now >= z.nextSpit && td < d.spit.range && td > 90) { z.nextSpit = now + d.spit.cd * 1000; this.spawnSpit(z, d, tx, ty); }
        if (d.slam && now >= z.nextSlam && td < d.slam.r) { z.nextSlam = now + d.slam.cd * 1000; this.slam(z, d); }
        if (d.scream && now >= z.nextScream && td < 650) { z.nextScream = now + 14000; this.scream(z); }
      }
    }
    if (this.tickN % 3 === 0) {
      const q = [];
      for (const z of this.zombies.values()) {
        const r = ZD[z.type].r; q.length = 0; this.zh.query(z.x, z.y, 60, q);
        for (const o of q) {
          if (o === z) continue; const rr = r + ZD[o.type].r, dx = z.x - o.x, dy = z.y - o.y, dd = dx * dx + dy * dy;
          if (dd > 0.01 && dd < rr * rr) { const dl = Math.sqrt(dd), push = (rr - dl) * 0.25, nx = z.x + dx / dl * push, ny = z.y + dy / dl * push; if (!this.blockedAt(nx, ny, r, 'walk')) { z.x = nx; z.y = ny; } }
        }
      }
    }
  }
  zombieAttack(z, d, target, night) {
    const dmg = d.dmg * (night ? 1.15 : 1);
    if (target.veh) { const v = target.veh; if (VEH[v.type].exposed && rnd() < 0.5) this.damagePlayer(target, dmg, 'zombie', null, z); else this.damageVehicle(v, dmg * 1.4 * (d.svd ? 2 : 1), null); }
    else this.damagePlayer(target, dmg, 'zombie', null, z);
    this.ev.push({x: z.x, y: z.y, d: ['za', z.id]});
  }
  spawnSpit(z, d, tx, ty) {
    const a = Math.atan2(ty - z.y, tx - z.x), sp = 520;
    this.proj.push({id: this.id(), x: z.x + Math.cos(a) * 20, y: z.y + Math.sin(a) * 20, a, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: {dmg: d.spit.dmg, proj: sp, range: d.spit.range, kind: 'spit'}, o: null, zom: true, born: this.now, die: this.now + d.spit.range / sp * 1000, pierce: 1, z: 0});
  }
  slam(z, d) {
    this.ev.push({x: z.x, y: z.y, d: ['sl', Math.round(z.x), Math.round(z.y), d.slam.r]});
    for (const p of this.players.values()) {
      if (p.dead) continue; const dd = Math.hypot(p.x - z.x, p.y - z.y); if (dd > d.slam.r) continue;
      if (p.veh) this.damageVehicle(p.veh, d.slam.dmg * 3, null); else { this.damagePlayer(p, d.slam.dmg, 'zombie', null, z); const a = Math.atan2(p.y - z.y, p.x - z.x); this.knockPlayer(p, Math.cos(a) * 120, Math.sin(a) * 120); }
    }
    for (const s of this.sh.query(z.x, z.y, d.slam.r + 60, [])) this.damageStruct(s, 300, null);
  }
  scream(z) {
    this.ev.push({x: z.x, y: z.y, d: ['sc', Math.round(z.x), Math.round(z.y)]}); this.noise(z.x, z.y, 1600);
    if (this.zombies.size < MAXZ) for (let k = 0; k < 3; k++) { const a = rnd() * 6.28, x = z.x + Math.cos(a) * R(300, 600), y = z.y + Math.sin(a) * R(300, 600); if (!this.blockedAt(x, y, 15, 'walk')) { const n = this.spawnZombie('runner', x, y); n.tp = z.tp; } }
  }

  // ───────── world effects ─────────
  updateEffects(dt) {
    const now = this.now, sec = this.tickN % 30 === 0;
    for (const e of this.effects.values()) {
      if (now >= e.until) { this.effects.delete(e.id); continue; }
      switch (e.type) {
        case 'fire': case 'toxic': case 'acid': case 'crater': {
          if (this.tickN % 5) break; const f = 5 / 30;
          for (const p of this.players.values()) {
            if (p.dead || (p.veh && !VEH[p.veh.type].exposed) || d2(p.x, p.y, e.x, e.y) > e.r * e.r) continue;
            if (e.type === 'toxic' || e.type === 'crater') { if (!p.wfx.toxic) this.damagePlayer(p, (e.dps || 8) * f, 'toxic', null); }
            else { if (e.o && e.o !== p && !this.canHurt(e.o, p)) continue; this.damagePlayer(p, (e.dps || 12) * f, e.type === 'fire' ? 'fire' : 'acid', e.o && e.o !== p ? e.o : null); }
          }
          if (e.type === 'fire') for (const z of this.zh.query(e.x, e.y, e.r, [])) if (d2(z.x, z.y, e.x, e.y) < e.r * e.r && !ZD[z.type].fireImmune) { z.burn = now + 3000; z.burnBy = e.o; }
          break;
        }
        case 'flare': case 'lure': if (sec) this.noise(e.x, e.y, e.lure || 900); break;
        case 'drone': { const dx = e.tx - e.x, dy = e.ty - e.y, dd = Math.hypot(dx, dy); if (dd > 5) { const s = Math.min(dd, 320 * dt); e.x += dx / dd * s; e.y += dy / dd * s; } if (sec) this.noise(e.x, e.y, 1000); break; }
        case 'vortex': this.vortexTick(e, dt); break;
        case 'mine': this.mineTick(e); break;
        case 'drop': if (now >= e.land) { this.createItem(e.x, e.y, {k: 'crate', contents: this.rollMany('drop', 6)}); this.ev.push({x: e.x, y: e.y, all: true, d: ['dl', Math.round(e.x), Math.round(e.y)]}); this.noise(e.x, e.y, 2200); this.effects.delete(e.id); } break;
      }
    }
  }
  vortexTick(e, dt) {
    if (rnd() < dt * 0.3) { const p = this.randomPlayer(); const a = p && rnd() < 0.6 ? Math.atan2(p.y - e.y, p.x - e.x) : rnd() * 6.28; e.vx = Math.cos(a) * e.spd; e.vy = Math.sin(a) * e.spd; }
    e.x = clamp(e.x + e.vx * dt, 300, this.WP - 300); e.y = clamp(e.y + e.vy * dt, 300, this.HP - 300);
    const pull = e.pull || 220, dmgTick = this.tickN % 5 === 0;
    for (const p of this.players.values()) {
      if (p.dead) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > e.r || d < 1) continue; const f = pull * (1 - d / e.r);
      if (p.veh) { const v = p.veh; if (VEH[v.type].kind !== 'heli' || v.alt > 0) { v.vx += dx / d * f * dt * 2; v.vy += dy / d * f * dt * 2; } }
      else p.pull = [p.pull[0] + dx / d * f, p.pull[1] + dy / d * f];
      if (d < e.r * 0.18 && dmgTick) this.damagePlayer(p, (e.dps || 20) / 6, 'vortex', null);
    }
    for (const z of this.zh.query(e.x, e.y, e.r, [])) { const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy); if (d > e.r || d < 1 || z.hp <= 0) continue; const f = pull * 1.3 * (1 - d / e.r) * dt; this.moveCircle(z, dx / d * f, dy / d * f, ZD[z.type].r, 'walk'); if (d < e.r * 0.18 && dmgTick) this.hitZombie(z, (e.dps || 20) / 6, null, null); }
    for (const v of this.vh.query(e.x, e.y, e.r, [])) { if (v.dead || v.seats.some(s => s)) continue; const dx = e.x - v.x, dy = e.y - v.y, d = Math.hypot(dx, dy); if (d > e.r || d < 1) continue; const f = pull * (1 - d / e.r); v.vx += dx / d * f * dt; v.vy += dy / d * f * dt; }
  }
  mineTick(e) {
    if (this.now < e.armed || this.tickN % 3) return; let trig = false; const R2 = e.r * e.r + 400;
    if (e.trig === 'heavy') { for (const z of this.zh.query(e.x, e.y, 90, [])) if ((ZD[z.type].boss || z.type === 'brute') && d2(z.x, z.y, e.x, e.y) < (e.r + 30) ** 2) { trig = true; break; } }
    else for (const z of this.zh.query(e.x, e.y, 60, [])) if (d2(z.x, z.y, e.x, e.y) < R2) { trig = true; break; }
    if (!trig) for (const v of this.vh.query(e.x, e.y, 100, [])) {
      if (v.dead || v.alt > 0.5 || d2(v.x, v.y, e.x, e.y) > (VEH[v.type].r + e.r) ** 2) continue; const occ = v.seats.find(s => s); if (!occ) continue;
      const drv = this.players.get(occ); if (!drv || (drv !== e.o && this.canHurt(e.o, drv))) { trig = true; break; }
    }
    if (!trig && e.trig !== 'heavy') for (const p of this.players.values()) if (!p.dead && !p.veh && p !== e.o && this.canHurt(e.o, p) && d2(p.x, p.y, e.x, e.y) < R2) { trig = true; break; }
    if (trig) { this.effects.delete(e.id); this.explode(e.x, e.y, e.w.radius, e.w.dmg, e.o, e.w); }
  }
  updateStructs() {
    if (this.tickN % 8) return; const now = this.now, dt = 8 / 30;
    for (const s of this.structs.values()) {
      const d = s.def, own = this.players.get(s.owner) || null;
      if (d.trap === 'spike') { for (const z of this.zh.query(s.x, s.y, 80, [])) if (z.hp > 0 && Math.abs(z.x - s.x) < s.w / 2 + 8 && Math.abs(z.y - s.y) < s.h / 2 + 8) { this.hitZombie(z, 22, own, null); s.hp -= 3; } if (s.hp <= 0) this.removeStruct(s, true); }
      else if (d.trap === 'tesla' && s.charge > 0 && now >= (s.next || 0)) {
        let best = null, bd = 160 * 160; for (const z of this.zh.query(s.x, s.y, 160, [])) { const dd = d2(z.x, z.y, s.x, s.y); if (dd < bd && z.hp > 0) { bd = dd; best = z; } }
        if (best) { s.next = now + 450; s.charge--; this.ev.push({x: s.x, y: s.y, d: ['zp', Math.round(s.x), Math.round(s.y), Math.round(best.x), Math.round(best.y)]}); this.hitZombie(best, 40, own, {stun: 0.6, mode: 'trap'}); }
      }
      if (d.lure) { if (!(d.delay && now < s.born + d.delay * 1000) && now >= (s.nl || 0)) { s.nl = now + 1000; this.noise(s.x, s.y, d.lure); } if (d.life && now > s.born + d.life * 1000) this.removeStruct(s, false); }
      if (d.noise && now >= (s.nn || 0)) { s.nn = now + 2000; this.noise(s.x, s.y, d.noise); }
      if (d.water && !d.inf) s.water = Math.min(3, (s.water || 0) + dt / 60 * (this.fxActive('storm') || this.fxActive('tornado') || this.fxActive('hail') ? 4 : 1));
    }
  }
  geyserTick() {
    for (const g of this.geysers) {
      if (this.now < g.next || !this.playerNear(g.x, g.y, 1600)) continue; g.next = this.now + R(10, 18) * 1000;
      this.ev.push({x: g.x, y: g.y, d: ['gy', g.x, g.y]});
      for (const p of this.players.values()) if (!p.dead && !p.veh && d2(p.x, p.y, g.x, g.y) < 8100) { this.damagePlayer(p, 25, 'geyser', null); const a = Math.atan2(p.y - g.y, p.x - g.x); this.knockPlayer(p, Math.cos(a) * 140, Math.sin(a) * 140); }
      for (const z of this.zh.query(g.x, g.y, 90, [])) this.hitZombie(z, 40, null, null);
    }
  }

  // ───────── sky ─────────
  fxActive(f) { return (this.sky && this.sky.fx === f) || (this.cosmic && this.cosmic.fx === f); }
  skyObj(s) { return s ? {n: s.n, c: s.cat, fx: s.fx, d: FXD[s.fx] || '', left: Math.max(0, Math.round(s.until - this.now))} : null; }
  sendSky(p, nw) { this.send(p, {t: 'sky', sky: this.skyObj(this.sky), cos: this.skyObj(this.cosmic), nw: nw || 0}); }
  broadcastSky(nw) { for (const p of this.players.values()) this.sendSky(p, nw); }
  skyTick() {
    const now = this.now, night = this.light < 0.35;
    if (this.sky && now >= this.sky.until) { this.sky = null; this.nextSky = now + R(100, 220) * 1000; this.broadcastSky(); }
    if (!this.sky && now >= this.nextSky && this.players.size) this.startSky(night);
    if (night && !this.wasNight && this.players.size) this.startCosmic();
    if (!night && this.wasNight && this.cosmic) { this.cosmic = null; this.broadcastSky(); }
    this.wasNight = night;
    if (this.cosmic && now >= this.cosmic.until) { this.cosmic = null; this.broadcastSky(); }
    if (this.fxActive('meteors') && rnd() < 0.12) this.meteor(false);
    if ((this.fxActive('lightning') && rnd() < 0.35) || ((this.fxActive('storm') || this.fxActive('tornado')) && rnd() < 0.08)) this.lightning();
    if (now >= this.nextDrop && this.players.size) { this.nextDrop = now + R(480, 720) * 1000; this.supplyDrop('Operation ' + COSMIC[Math.floor(rnd() * 10)].n); }
  }
  startSky(night) {
    const c = SKY.filter(s => s.when === 'any' || (s.when === 'night') === night); if (!c.length) return;
    const e = pickW(rnd, c.map(s => [s, s.w])), dur = R(70, 160);
    this.sky = Object.assign({}, e, {until: this.now + dur * 1000});
    if (e.fx === 'tornado') { const p = this.randomPlayer(); if (p) { const a = rnd() * 6.28; this.addEffect('vortex', p.x + Math.cos(a) * 1400, p.y + Math.sin(a) * 1400, 420, dur, {vx: 0, vy: 0, spd: 150, pull: 240, dps: 25, kind: 'tornado'}); } }
    if (['bloodmoon', 'eclipse', 'tornado', 'lightning', 'meteors', 'hail', 'ash', 'whiteout', 'dust'].includes(e.fx)) this.feed(`🌩 ${e.n} — ${FXD[e.fx]}`);
    this.broadcastSky(1);
  }
  startCosmic() {
    const e = COSMIC[Math.floor(rnd() * COSMIC.length)], dur = e.fx === 'blackhole' ? 90 : e.fx === 'emp' ? 15 : 160;
    this.cosmic = Object.assign({}, e, {until: this.now + dur * 1000});
    if (e.fx === 'supply') this.supplyDrop(e.n);
    if (e.fx === 'blackhole') { const p = this.randomPlayer(); if (p) { const a = rnd() * 6.28; this.addEffect('vortex', p.x + Math.cos(a) * 1600, p.y + Math.sin(a) * 1600, 650, dur, {vx: 0, vy: 0, spd: 70, pull: 380, dps: 45, kind: 'blackhole'}); } }
    if (e.fx === 'emp') this.empUntil = this.now + 15000;
    if (e.fx === 'meteor') this.meteor(true, e.n);
    this.feed(`✦ Tonight's sky: ${e.n} (${e.cat}) — ${FXD[e.fx]}`);
    this.broadcastSky(1);
  }
  supplyDrop(name) {
    const p = this.randomPlayer(); if (!p) return;
    for (let t = 0; t < 20; t++) {
      const a = rnd() * 6.28, d = R(700, 2200), x = clamp(p.x + Math.cos(a) * d, 600, this.WP - 600), y = clamp(p.y + Math.sin(a) * d, 600, this.HP - 600);
      if (this.blockedAt(x, y, 30, 'walk') || PROPS[this.tileAt(x, y)].water === 2) continue;
      this.addEffect('drop', x, y, 60, 12, {land: this.now + 10000});
      this.ev.push({x, y, all: true, d: ['dr', Math.round(x), Math.round(y)]});
      this.feed(`📦 Supply drop "${name}" inbound at ${this.gridName(x, y)}!`); return;
    }
  }
  meteor(big, name) {
    const p = this.randomPlayer(); if (!p) return; const a = rnd() * 6.28, d = R(500, 1800);
    const x = clamp(p.x + Math.cos(a) * d, 400, this.WP - 400), y = clamp(p.y + Math.sin(a) * d, 400, this.HP - 400);
    const w = {radius: big ? 260 : 170, dmg: big ? 420 : 220, fx: 'frag', svd: 4, vdmg: 2, meteor: 1, big, delay: 6};
    this.strikes.push({x, y, t: this.now + 6000, w, o: null});
    this.ev.push({x, y, all: true, d: ['wa', Math.round(x), Math.round(y), w.radius, 6000, 1]});
    if (big) this.feed(`☄ ${name || 'A meteor'} fragment is falling at ${this.gridName(x, y)}! Rare loot in the crater.`);
  }
  lightning() {
    const p = this.randomPlayer(); if (!p || (p.veh && !VEH[p.veh.type].exposed)) return;
    const direct = rnd() < 0.15, x = p.x + (direct ? R(-40, 40) : R(-700, 700)), y = p.y + (direct ? R(-40, 40) : R(-700, 700));
    this.ev.push({x, y, d: ['lt', Math.round(x), Math.round(y)]}); this.noise(x, y, 1500);
    for (const q of this.players.values()) if (!q.dead && !(q.veh && !VEH[q.veh.type].exposed) && d2(q.x, q.y, x, y) < 4900) this.damagePlayer(q, 55, 'lightning', null);
    for (const z of this.zh.query(x, y, 70, [])) this.hitZombie(z, 120, null, {burn: 3});
  }

  // ───────── main loop ─────────
  computeLight() {
    const d = Math.cos((this.time - 0.5) * Math.PI * 2); let l = clamp((d + 0.15) / 0.45, 0, 1);
    if (this.fxActive('midnightsun')) l = Math.max(l, 0.8); if (this.fxActive('polarnight') || this.fxActive('eclipse')) l = Math.min(l, 0.15);
    return l;
  }
  updatePlayers(dt) {
    const now = this.now, rainbow = this.fxActive('rainbow'), cold = this.fxActive('cold'), dust = this.fxActive('dust'), ash = this.fxActive('ash'), hail = this.fxActive('hail');
    for (const p of this.players.values()) {
      p.pull = [0, 0];
      if (p.dead) { if (now > p.rspAt + 25000) this.respawnPlayer(p); continue; }
      if (p.veh) { p.x = p.veh.x; p.y = p.veh.y; }
      const b = p.buf, sprinting = p.input.sprint && !p.veh && (p.input.mx || p.input.my);
      p.hu = Math.max(0, p.hu - dt * 100 / 1800 * (sprinting ? 1.4 : 1));
      p.th = Math.max(0, p.th - dt * 100 / 1200 * (p.pfx.thirstSlow || 1) * (dust ? 1.3 : 1));
      if (sprinting && !(b.adren > now)) p.st = Math.max(0, p.st - 20 * dt); else if (!sprinting) p.st = Math.min(100, p.st + 14 * dt * (rainbow ? 1.6 : 1) * (cold ? 0.6 : 1));
      let dmg = 0;
      if (p.hu <= 0 || p.th <= 0) dmg += 0.8 * dt;
      if (p.bleed) dmg += 1.3 * dt;
      if (p.inf > 0 && !(b.antizyme > now)) { p.inf += dt * 100 / 480; if (p.inf >= 100) { this.killPlayer(p, null, 'infection'); continue; } }
      if (b.burn > now) dmg += 6 * dt;
      p.swim = false;
      if (!p.veh) {
        const P = PROPS[this.tileAt(p.x, p.y)];
        if (P.dmg) { dmg += P.dmg * dt; b.burn = now + 1500; }
        if (P.toxic && !p.wfx.toxic) dmg += P.toxic * dt;
        if (P.water === 2) { p.swim = true; p.st = Math.max(0, p.st - 7 * dt); if (p.st <= 0) dmg += 9 * dt; b.burn = 0; }
        if (P.water === 1) b.burn = 0;
        if (ash && !p.wfx.toxic) dmg += 1.5 * dt;
        if (hail && !p.wfx.hail) dmg += 1.2 * dt;
      }
      if (dmg > 0) { p.hp -= dmg; if (p.hp <= 0) { this.killPlayer(p, null, p.swim ? 'drowned' : p.inf > 0 ? 'infection' : 'the elements'); continue; } }
      else if (p.hu > 50 && p.th > 50 && !p.bleed && !p.inf) p.hp = Math.min(100, p.hp + 0.35 * dt);
      if (p.rebornPerks && p.rebornPerks.nanite_regen) {
        p.hp = Math.min(100, p.hp + p.rebornPerks.nanite_regen * 2.5 * dt);
        p.bleed = false; p.frac = false;
      }
      if (p.rebornPerks && p.rebornPerks.hardlight_shield) {
        if (!p.hardlightShield) p.hardlightShield = 0;
        if (now - p.hurt > 7000 && p.hardlightShield < 150) {
          p.hardlightShield = Math.min(150, p.hardlightShield + 25 * dt);
        }
      }
      const sl = p.hotbar[p.sel], w = sl && WEAPONS[sl.w]; let s = 210;
      if (w && w.spd) s *= w.spd; if (p.frac) s *= 0.6; s *= p.wfx.speed || 1; if (b.adren > now) s *= 1.3; if (p.hu < 10 || p.th < 10) s *= 0.85; if (b.slow > now) s *= 0.55; if (b.stun > now) s = 0;
      if (p.rebornPerks && p.rebornPerks.cybernetic_legs) s *= (1 + p.rebornPerks.cybernetic_legs * 0.15);
      p.spd = s; p.scope = !!(p.input.alt && w && w.scope && !p.veh);
      this.tryFire(p);
      if (p.reloadUntil && now >= p.reloadUntil) p.reloadUntil = 0;
      p.prevFire = p.input.fire; p.prevAlt = p.input.alt;
    }
  }
  plotTick(dt) {
    const now = this.now;
    for (const plot of this.plots.values()) {
      if (!plot.owner) continue;
      const up = plot.upgrades || {};
      let scrapPerSec = 1;
      if (up.scrap_compactor) scrapPerSec += [0, 3, 6, 10, 16, 24, 35, 50, 70, 100, 150][up.scrap_compactor] || 0;
      if (up.scavenger_drones) scrapPerSec += up.scavenger_drones * 6;
      if (up.nuclear_rtg) scrapPerSec += [0, 18, 36, 60, 100][up.nuclear_rtg] || 0;
      if (up.crypto_terminal) scrapPerSec += [0, 12, 25, 45, 75][up.crypto_terminal] || 0;
      if (up.antimatter_reactor) scrapPerSec += [0, 40, 90, 200][up.antimatter_reactor] || 0;
      if (up.solar_array) scrapPerSec *= (1 + up.solar_array * 0.15);
      if (up.scrap_smelter) scrapPerSec *= (1 + up.scrap_smelter * 0.25);
      const earned = Math.round(scrapPerSec * dt);
      if (earned > 0) {
        plot.scrap = (plot.scrap || 0) + earned;
        const ownerPlayer = this.players.get(plot.owner);
        if (ownerPlayer) ownerPlayer.scrap = (ownerPlayer.scrap || 0) + earned;
      }

      // Hardlight shield dome pushes away and repels approaching zombies
      if (up.hardlight_dome) {
        for (const z of this.zh.query(plot.x, plot.y, plot.radius, [])) {
          if (z.hp <= 0) continue;
          const dd = Math.hypot(z.x - plot.x, z.y - plot.y);
          if (dd < plot.radius && dd > 1) {
            const pushA = Math.atan2(z.y - plot.y, z.x - plot.x);
            z.x = plot.x + Math.cos(pushA) * (plot.radius + 15);
            z.y = plot.y + Math.sin(pushA) * (plot.radius + 15);
            this.hitZombie(z, 20 * up.hardlight_dome * dt, null, {knock: 60});
          }
        }
      }

      // Dynamic compound size and corner tower calculation
      const S = computePlotSize(plot);
      plot.radius = S * 0.55;
      const x0 = plot.x - S / 2, y0 = plot.y - S / 2;
      const corners = [
        [x0 + 28, y0 + 28],
        [x0 + S - 28, y0 + 28],
        [x0 + 28, y0 + S - 28],
        [x0 + S - 28, y0 + S - 28]
      ];

      // Perimeter spikes damage infected touching the boundary
      if (up.spikes) {
        const spikeDmg = [0, 20, 40, 70, 110, 180][up.spikes] || 20;
        for (const z of this.zh.query(plot.x, plot.y, plot.radius + 30, [])) {
          if (z.hp <= 0) continue;
          const zd = Math.hypot(z.x - plot.x, z.y - plot.y);
          if (zd >= plot.radius - 25 && zd <= plot.radius + 30) {
            this.hitZombie(z, spikeDmg * dt, null, {knock: 50});
          }
        }
      }

      // Automated Defensive Turrets & Tesla Spire (active baseline for all claimed shelters!)
      const turretCooldown = up.turret_mg ? 180 : up.turret_laser ? 220 : up.turret_sniper ? 900 : 340;
      if (now - (plot.lastTurretFire || 0) > turretCooldown) {
        let targetZ = null, minD = (850 + (up.radar_spire || 0) * 150) ** 2;
        for (const z of this.zh.query(plot.x, plot.y, 900, [])) {
          if (z.hp <= 0) continue;
          const dd = d2(z.x, z.y, plot.x, plot.y);
          if (dd < minD) { minD = dd; targetZ = z; }
        }
        if (targetZ) {
          plot.lastTurretFire = now;
          let turretDmg = 40;
          if (up.turret_pistol) turretDmg += up.turret_pistol * 22;
          if (up.turret_mg) turretDmg += up.turret_mg * 35;
          if (up.turret_sniper) turretDmg += up.turret_sniper * 85;
          if (up.turret_laser) turretDmg += up.turret_laser * 75;
          if (up.turret_cryo) { targetZ.stun = now + 1400; turretDmg += up.turret_cryo * 25; }
          if (up.turret_flame) { targetZ.burn = now + 4500; turretDmg += up.turret_flame * 30; }
          const ownerPlayer = this.players.get(plot.owner) || null;
          
          // Select nearest corner turret tower
          let bestCorner = corners[0], bestCD = Infinity;
          for (const [cx, cy] of corners) {
            const cd = d2(cx, cy, targetZ.x, targetZ.y);
            if (cd < bestCD) { bestCD = cd; bestCorner = [cx, cy]; }
          }

          this.hitZombie(targetZ, turretDmg, ownerPlayer, {knock: 140});
          this.ev.push({x: bestCorner[0], y: bestCorner[1], d: ['tr', Math.round(bestCorner[0]), Math.round(bestCorner[1]), Math.round(targetZ.x), Math.round(targetZ.y), up.turret_laser ? 2 : up.turret_mg ? 3 : 1]});
          if (up.turret_rocket) {
            this.explode(targetZ.x, targetZ.y, 110 + up.turret_rocket * 30, 160, ownerPlayer, {fx: 'frag'});
          }
          if (up.tesla_spire) {
            let hitCount = 0;
            for (const otherZ of this.zh.query(targetZ.x, targetZ.y, 300, [])) {
              if (otherZ !== targetZ && otherZ.hp > 0 && hitCount < 2 + up.tesla_spire) {
                hitCount++;
                this.hitZombie(otherZ, 70 * up.tesla_spire, ownerPlayer, {knock: 90});
                this.ev.push({x: targetZ.x, y: targetZ.y, d: ['zp', Math.round(targetZ.x), Math.round(targetZ.y), Math.round(otherZ.x), Math.round(otherZ.y)]});
              }
            }
          }
        }
      }

      // Survival, food, water, and ammo replenishment inside shelter
      for (const p of this.players.values()) {
        if (p.dead) continue;
        if (p.id === plot.owner || (plot.team > 0 && p.team === plot.team) || plot.owner === null) {
          if (d2(p.x, p.y, plot.x, plot.y) < plot.radius * plot.radius) {
            if (up.medbay) {
              const healRate = [0, 5, 12, 20, 35, 60][up.medbay] || 5;
              p.hp = Math.min(100, p.hp + healRate * dt);
              if (up.medbay >= 2) p.bleed = false;
              if (up.medbay >= 3) p.frac = false;
            }
            if (up.decontamination_chamber) p.inf = 0;
            if (up.hydroponic_greenhouse) p.hu = Math.min(100, p.hu + 20 * dt);
            if (up.water_vaporator) p.th = Math.min(100, p.th + 25 * dt);
            if (up.ammo_press && this.tickN % 30 === 0) {
              for (const [k] of Object.entries(AMMO)) p.ammo[k] = Math.max(p.ammo[k] || 0, 40 * up.ammo_press);
              p.dirty = true;
            }
          }
        }
      }

      // Vehicle repair and refuel inside shelter
      if (up.repair_lift || up.fuel_synthesizer) {
        for (const v of this.vh.query(plot.x, plot.y, plot.radius, [])) {
          if (v.dead) continue;
          const vd = VEH[v.type];
          if (up.repair_lift) v.hp = Math.min(v.maxhp, v.hp + (40 * up.repair_lift) * dt);
          if (up.fuel_synthesizer) v.fuel = Math.min(vd.fuel, v.fuel + (20 * up.fuel_synthesizer) * dt);
          v.broken = false;
        }
      }

      // Evacuation and Reborn trigger
      if (plot.evacActive && plot.evacTimer > 0) {
        const rem = Math.max(0, Math.round((plot.evacTimer - now) / 1000));
        if (rem <= 0) {
          plot.evacTimer = -1;
          plot.evacActive = false;
          this.broadcast({t: 'msg', m: `🏆 VICTORY! Military Gunship extracted survivors from Plot #${plot.id}!`});
          this.feed('🏆 OPERATION EXODUS COMPLETE! REBIRTH ASCENSION UNLOCKED!');
          for (const p of this.players.values()) {
            this.awardScrap(p, 5000, plot.x, plot.y);
            if (p.id === plot.owner || (plot.team > 0 && p.team === plot.team)) {
              p.prestigeTokens = (p.prestigeTokens || 0) + 20;
              if (p.accountName) accounts.updateStats(p.accountName, { timePlayed: 1 });
              this.send(p, {t: 'exodus_ready_reborn', plotId: plot.id, bonusCores: 20});
            }
          }
        }
      }
    }
  }
  tick(dt) {
    this.now += dt * 1000; this.tickN++;
    this.time = (this.time + dt / this.settings.dayLen) % 1; this.light = this.computeLight();
    this.zh.clear(); for (const z of this.zombies.values()) this.zh.add(z);
    this.vh.clear(); for (const v of this.vehicles.values()) this.vh.add(v);
    this.updatePlayers(dt); this.updateVehicles(dt); this.updateZombies(dt); this.updateProjectiles(dt); this.updateStrikes(); this.updateEffects(dt); this.updateStructs(); this.plotTick(dt);
    if (this.tickN % 30 === 0) { this.spawnTick(); this.lootTick(); this.skyTick(); this.vehicleTick(); this.geyserTick(); }
    if (this.tickN % 60 === 0) { this.despawnTick(); this.noises = this.noises.filter(n => this.now - n.t < 4000); }
    if (this.tickN % 2 === 0) this.sendSnapshots();
    if (this.tickN % 90 === 0) this.sendBoard();
  }
  sendBoard() { this.broadcast({t: 'board', L: [...this.players.values()].map(p => [p.id, p.name, p.team, p.kills, p.pk, p.deaths, p.ping, p.dead ? 1 : 0]), s: this.settings}); }
  invMsg(p) { return {t: 'inv', hb: p.hotbar.map(s => s ? [s.w, s.mag || 0, s.n || 0] : null), inv: p.inv.map(i => [i.k, i.n]), ammo: p.ammo, wear: p.wear, cap: this.cap(p), pfx: p.pfx}; }
  sendSnapshots() {
    const now = this.now, full = this.tickN % 4 === 0, P = [];
    for (const p of this.players.values()) {
      const sl = p.hotbar[p.sel], w = sl ? WEAPONS[sl.w] : null; let f = 0;
      if (p.dead) f |= 1; if (p.light) f |= (p.pfx.light === 'cone' ? 2 : 512); if (now < p.reloadUntil) f |= 4; if (p.swim) f |= 8; if (p.input.sprint && p.st > 1) f |= 16;
      if (p.buf.burn > now) f |= 32; if (p.buf.stun > now) f |= 64; if (p.nvg) f |= 128; if (p.scope) f |= 256; if (now < p.spawnProt) f |= 1024; if (p.bleed) f |= 2048;
      P.push([p.id, Math.round(p.x), Math.round(p.y), Math.round(Math.atan2(p.input.ay - p.y, p.input.ax - p.x) * 100), Math.round(p.hp), p.team, w ? w.i : -1, p.veh ? p.veh.id : 0, f, p.rebirths || 0]);
    }
    for (const p of this.players.values()) {
      if (!p.ws || p.ws.readyState !== 1 || p.ws.bufferedAmount > 2e6) continue;
      const cx = p.x, cy = p.y, Rr = p.scope ? 2200 : 1500, R2 = Rr * Rr;
      const Z = [];
      for (const z of this.zh.query(cx, cy, Rr, [])) {
        if (z.hp <= 0) continue; const dd = d2(z.x, z.y, cx, cy); if (dd > R2) continue; const d = ZD[z.type];
        if (d.stealth && dd > 72900 && !(p.light && dd < 270400) && !p.nvg) continue;
        let f = 0; if (z.burrowed) f |= 1; if (z.burn > now) f |= 2; if (z.stun > now) f |= 4; if (now - z.atk < 300) f |= 8;
        Z.push([z.id, z.ti, Math.round(z.x), Math.round(z.y), Math.round(z.a * 10), Math.round(100 * z.hp / z.maxhp), f]); if (Z.length >= 320) break;
      }
      const V = [];
      for (const v of this.vh.query(cx, cy, Rr + 200, [])) {
        let f = 0; if (v.siren) f |= 1; if (v.emp > now || now < this.empUntil) f |= 2; if (v.seats[0]) f |= 4; if (v.alt > 0.5) f |= 8; if (v.broken) f |= 16; if (v.dead) f |= 32;
        V.push([v.id, v.ti, Math.round(v.x), Math.round(v.y), Math.round(v.a * 100), Math.round(100 * v.hp / v.maxhp), v.seats[0] || 0, f, Math.round(Math.hypot(v.vx, v.vy)), Math.round((v.ta || v.a) * 100), Math.round(v.vx || 0), Math.round(v.vy || 0)]);
      }
      const Rp = []; for (const pr of this.proj) if (d2(pr.x, pr.y, cx, cy) < R2) Rp.push([pr.id, pr.itemFx ? (pr.itemFx.t === 'fire' ? 'molotov' : 'item') : (pr.w.kind || 'bullet'), Math.round(pr.x), Math.round(pr.y), Math.round(pr.a * 100), Math.round(pr.z * 100)]);
      const E = [];
      for (const e of this.effects.values()) {
        if (e.type === 'mine' && e.o !== p && !(this.settings.mode !== 'ffa' && e.o && e.o.team === p.team)) continue;
        if (e.type !== 'vortex' && e.type !== 'drop' && d2(e.x, e.y, cx, cy) > 5.76e6) continue;
        E.push([e.id, e.type === 'vortex' ? (e.kind || 'tornado') : e.type, Math.round(e.x), Math.round(e.y), Math.round(e.r), e.until === Infinity ? -1 : Math.round((e.until - now) / 100)]);
      }
      const ev = []; for (const e of this.ev) if (e.all || d2(e.x, e.y, cx, cy) < 7.84e6) ev.push(e.d);
      const sl = p.hotbar[p.sel], w = sl && WEAPONS[sl.w];
      let bits = 0; const b = p.buf; if (b.painkill > now) bits |= 1; if (b.adren > now) bits |= 2; if (b.scent > now) bits |= 4; if (b.stun > now) bits |= 8; if (b.blind > now) bits |= 16; if (b.burn > now) bits |= 32; if (b.slow > now) bits |= 64; if (b.disinf > now) bits |= 128; if (b.antizyme > now) bits |= 256;
      const me = {x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, ps: p.ps, hp: Math.round(p.hp), st: Math.round(p.st), hu: Math.round(p.hu), th: Math.round(p.th), inf: Math.round(p.inf),
        bl: p.bleed ? 1 : 0, fr: p.frac ? 1 : 0, spd: Math.round(p.spd), pl: [Math.round(p.pull[0]), Math.round(p.pull[1])], sel: p.sel, mag: sl ? (sl.mag || 0) : 0, n: sl ? (sl.n || 0) : 0,
        res: w && w.ammo ? (p.ammo[w.ammo] || 0) : -1, rl: p.reloadUntil > now ? Math.round(p.reloadUntil - now) : 0, rlT: p.reloadT, veh: p.veh ? p.veh.id : 0, seat: p.seat, dead: p.dead ? 1 : 0,
        rsp: p.dead ? Math.max(0, Math.round(p.rspAt - now)) : 0, b: bits, hurt: Math.min(99999, Math.round(now - p.hurt)), emp: now < this.empUntil ? 1 : 0, nvg: p.nvg ? 1 : 0, lt: p.light ? (p.pfx.light || 'cone') : 0,
        scrap: p.scrap || 0, plotId: p.plotId || 0, plotLv: p.plot ? p.plot.level : 0, team: p.team || 0,
        rebirths: p.rebirths || 0, prestigeTokens: p.prestigeTokens || 0, rebornPerks: p.rebornPerks || {}, hardlightShield: Math.round(p.hardlightShield || 0),
        beacon: p.plot ? (p.plot.upgrades.evac_beacon || 0) : 0, evacTimer: p.plot && p.plot.evacActive ? Math.max(0, Math.round((p.plot.evacTimer - now) / 1000)) : 0};
      if (p.veh) {
        const v = p.veh, vd = VEH[v.type]; me.vf = Math.round(100 * v.fuel / vd.fuel); me.vh = Math.round(100 * v.hp / v.maxhp); me.vb = v.broken ? 1 : 0; me.va = v.alt > 0.5 ? 1 : 0; me.vp = Math.round((v.plate || 0) * 100);
        if (vd.guns) me.vg = vd.guns.map((g, i) => [v.gm && v.gm[i] !== undefined ? v.gm[i] : (g.w.mag || 0), v.gr && v.gr[i] > now ? 1 : 0]);
      }
      const o = {t: 's', tm: +this.time.toFixed(4), P, Z, V, R: Rp, E, ev, me};
      if (full) {
        o.G = this.ih.query(cx, cy, 1200, []).map(it => [it.id, it.k, Math.round(it.x), Math.round(it.y), it.n, it.label || 0]);
        o.S = this.sh.query(cx, cy, 1600, []).map(s => [s.id, s.kind, Math.round(s.x), Math.round(s.y), s.w, s.h, Math.round(100 * s.hp / s.maxhp), s.open ? 1 : 0, s.team, s.water >= 1 ? 1 : 0, s.owner]);
      }
      p.ws.send(JSON.stringify(o));
      if (p.dirty) { p.dirty = false; this.send(p, this.invMsg(p)); }
    }
    this.ev.length = 0; this.bloodN = 0;
  }
}
module.exports = {Game};
