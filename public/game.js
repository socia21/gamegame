(() => {
'use strict';
// ═════════════════════════ DEAD WORLD client ═════════════════════════
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
const lightCv = document.createElement('canvas'), lx = lightCv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  lightCv.width = Math.ceil(VW / 2); lightCv.height = Math.ceil(VH / 2);
  if (!$('bigmap').hidden) sizeBigmap();
}
addEventListener('resize', resize); resize();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angLerp = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};
const hsh = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// ───────── state ─────────
let ws = null, D = null, M = null, myId = 0, settings = {}, me = null, inv = null, board = [], sky = null, cosmic = null, ping = 0;
let tiles, region, TS = 80, MW = 0, MH = 0, WP = 0, HP = 0, WBY = {};
const snaps = []; let latest = null; const items = new Map(), structs = new Map(); let effects = [];
const pred = {x: 0, y: 0, ps: -1};
let zoom = 1, userZoom = 1, camX = 0, camY = 0, shake = 0, frameN = 0, gameTime = 0.3, lastSend = 0;
const keys = {}; const mouse = {x: 0, y: 0, l: false, r: false};
let mode = null, waypoint = null, chatOpen = false, masterVol = +(localStorage.getItem('dw_vol') || 0.6);
const reveals = [], fxs = [], decals = [], warns = [], drops = [], particles = [], floaters = [];
const TEAMCOL = ['#4cc9f0', '#ff4d4d', '#4d8bff', '#4dff88', '#ffd24d'];

// Shelter Tycoon client state
let shelterPlots = [];
let activePlot = null;
let currentTycoonCat = 'all';

// Main Menu client state
let activeAuthTab = localStorage.getItem('dw_auth_tab') || 'account';
let selectedGameMode = localStorage.getItem('dw_game_mode') || 'coop';
let selectedTeam = +(localStorage.getItem('dw_team') || 1);

// ───────── main menu & login setup ─────────
const tabAccount = $('tab-account'), tabGuest = $('tab-guest');
const secAccount = $('sec-account'), secGuest = $('sec-guest');
const accUser = $('acc-user'), accPass = $('acc-pass');
const accModeLogin = $('acc-mode-login'), accModeReg = $('acc-mode-reg');
const lname = $('lname'), lkey = $('lkey'), lrem = $('lrem');
const teamBox = $('team-select-box');

function switchAuthTab(tab) {
  activeAuthTab = tab;
  localStorage.setItem('dw_auth_tab', tab);
  if (tab === 'account') {
    tabAccount.classList.add('active'); tabGuest.classList.remove('active');
    secAccount.hidden = false; secGuest.hidden = true;
  } else {
    tabGuest.classList.add('active'); tabAccount.classList.remove('active');
    secGuest.hidden = false; secAccount.hidden = true;
  }
}
if (tabAccount && tabGuest) {
  tabAccount.onclick = () => switchAuthTab('account');
  tabGuest.onclick = () => switchAuthTab('guest');
  switchAuthTab(activeAuthTab);
}

// Game Mode selectors
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    selectedGameMode = btn.dataset.mode;
    localStorage.setItem('dw_game_mode', selectedGameMode);
    if (teamBox) teamBox.hidden = selectedGameMode !== 'teams';
  };
});
if (selectedGameMode) {
  const mBtn = document.querySelector(`.mode-btn[data-mode="${selectedGameMode}"]`);
  if (mBtn) mBtn.click();
}

// Team chips
document.querySelectorAll('.team-chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('.team-chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel');
    selectedTeam = +chip.dataset.team;
    localStorage.setItem('dw_team', selectedTeam);
  };
});
if (selectedTeam) {
  const tChip = document.querySelector(`.team-chip[data-team="${selectedTeam}"]`);
  if (tChip) {
    document.querySelectorAll('.team-chip').forEach(c => c.classList.remove('sel'));
    tChip.classList.add('sel');
  }
}

// Stored credentials
if (accUser) accUser.value = localStorage.getItem('dw_acc_user') || 'Survivor';
if (lname) lname.value = localStorage.getItem('dw_name') || 'Wanderer';
if (localStorage.getItem('dw_key')) {
  lkey.value = localStorage.getItem('dw_key');
  if (lrem) lrem.checked = true;
} else {
  fetch('/key').then(r => r.json()).then(d => {
    if (d && d.key && !lkey.value) lkey.value = d.key;
  }).catch(() => {});
}

lkey.addEventListener('input', () => {
  const v = lkey.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 16);
  lkey.value = (v.match(/.{1,4}/g) || []).join('-');
});

$('lgo').onclick = connect;
lkey.onkeydown = e => { if (e.key === 'Enter') connect(); };
if (accPass) accPass.onkeydown = e => { if (e.key === 'Enter') connect(); };
if (accUser) accUser.onkeydown = e => { if (e.key === 'Enter') accPass ? accPass.focus() : lkey.focus(); };
if (lname) lname.onkeydown = e => { if (e.key === 'Enter') lkey.focus(); };

function connect() {
  const key = lkey.value.replace(/-/g, '');
  if (key.length !== 16) {
    $('lerr').textContent = 'The access key must be 16 hex characters (64 bits).';
    return;
  }
  const isAcc = activeAuthTab === 'account';
  const username = isAcc ? (accUser.value.trim() || 'Survivor') : '';
  const password = isAcc ? accPass.value : '';
  const isRegister = isAcc && accModeReg && accModeReg.checked;
  const name = isAcc ? username : (lname.value.trim() || 'Guest');

  if (isAcc && !password) {
    $('lerr').textContent = 'Please enter your password / PIN to access your account.';
    return;
  }

  if (lrem.checked) {
    localStorage.setItem('dw_key', lkey.value);
    if (isAcc) localStorage.setItem('dw_acc_user', username);
    localStorage.setItem('dw_name', name);
  } else {
    localStorage.removeItem('dw_key');
  }

  $('lerr').textContent = '';
  $('lstatus').textContent = 'Connecting… (verifying key & loading world)';
  $('lgo').disabled = true;

  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onopen = () => {
    ws.send(JSON.stringify({
      t: 'auth',
      key,
      name,
      username,
      password,
      isRegister,
      mode: selectedGameMode,
      team: selectedTeam
    }));
  };
  ws.onmessage = ev => {
    try { onMsg(JSON.parse(ev.data)); } catch (e) { console.error(e); }
  };
  ws.onclose = () => {
    $('lgo').disabled = false;
    if (!D) {
      $('lstatus').textContent = '';
      if (!$('lerr').textContent) $('lerr').textContent = 'Connection closed.';
    } else {
      showBanner('Disconnected', 'Refresh page to reconnect', '#ff6b6b', 1e9);
    }
  };
  ws.onerror = () => {
    $('lgo').disabled = false;
    $('lerr').textContent = 'Could not reach server.';
  };
}
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

function onMsg(m) {
  switch (m.t) {
    case 'denied':
      $('lerr').textContent = m.why || 'Access denied.';
      $('lstatus').textContent = '';
      $('lgo').disabled = false;
      break;
    case 'init':
      init(m);
      break;
    case 's':
      onSnap(m);
      break;
    case 'inv':
      inv = m;
      if (mode) {
        const it = inv.inv[mode.i];
        if (!it || it[0] !== mode.key) {
          const j = inv.inv.findIndex(x => x[0] === mode.key);
          if (j >= 0) mode.i = j; else mode = null;
        }
      }
      renderInv(); renderCraft();
      break;
    case 'board':
      board = m.L; settings = m.s;
      if (!$('board').hidden) renderBoard();
      if (!$('menu').hidden) renderMenu();
      break;
    case 'settings':
      settings = m.s;
      if (!$('menu').hidden) renderMenu();
      break;
    case 'plots':
      shelterPlots = parsePlots(m.plots);
      if (!$('shelter-modal').hidden && activePlot) {
        const up = shelterPlots.find(p => p.id === activePlot.id);
        if (up) { activePlot.level = up.level; activePlot.ownerName = up.ownerName; activePlot.beacon = up.beacon; renderShelterModal(activePlot); }
      }
      break;
    case 'plot_detail':
      activePlot = m.plot;
      renderShelterModal(m.plot);
      break;
    case 'open_tycoon':
      activePlot = m.plot;
      $('shelter-modal').hidden = false;
      renderShelterModal(m.plot);
      break;
    case 'reborn_success':
      if (me) {
        me.rebirths = m.rebirths;
        me.prestigeTokens = m.prestigeTokens;
        me.rebornPerks = m.rebornPerks;
      }
      showBanner('✨ ASCENSION TRANSCENDENCE COMPLETE! ✨', `Tier ${m.rebirths} Ascendant · +${m.rebirths * 25}% Permanent Scrap Yield`, '#a855f7', 8000);
      sfx('event');
      burst(pred.x, pred.y, 80, '#00e5ff', 300, 1500, 8);
      renderRebornModal();
      break;
    case 'reborn_updated':
      if (me) {
        me.prestigeTokens = m.prestigeTokens;
        me.rebornPerks = m.rebornPerks;
      }
      toast('🧬 Ascendant Perk Mutated!');
      sfx('pick');
      renderRebornModal();
      break;
    case 'exodus_ready_reborn':
      showBanner('🚀 EXODUS EXTRACTION SHIP INBOUND!', `Outpost #${m.plotId} Beacon activated! Quantum Ascension (+${m.bonusTokens} ⚛️) ready!`, '#ffd700', 10000);
      sfx('event');
      toggleRebornModal(true);
      break;
    case 'chat': addChat(m); break;
    case 'feed': addFeed(m.m); break;
    case 'msg': toast(m.m); break;
    case 'sky':
      if (m.nw) {
        const s = m.cos && (!cosmic || cosmic.n !== m.cos.n) ? m.cos : m.sky;
        if (s) {
          showBanner((m.cos === s ? '✦ ' : '☁ ') + s.n, s.d, s.fx === 'bloodmoon' ? '#ff3b3b' : '#cfe8ff', 6000);
          sfx('event');
        }
      }
      sky = m.sky; cosmic = m.cos; skyT = performance.now();
      break;
    case 'reveal':
      for (const r of m.m) reveals.push({x: r[0], y: r[1], team: r[2], until: performance.now() + 15000});
      toast(`📷 ${m.by} revealed nearby threats`);
      break;
    case 'pong': ping = Math.round(performance.now() - m.c); break;
  }
}

function parsePlots(rawList) {
  if (!rawList) return [];
  return rawList.map(p => {
    if (Array.isArray(p)) {
      const def = (D && D.PLOTS) ? D.PLOTS.find(pl => pl.id === p[0]) : null;
      return {
        id: p[0],
        x: p[1],
        y: p[2],
        ownerName: p[3] || '',
        team: p[4] || 0,
        level: p[5] || 1,
        scrap: p[6] || 0,
        beacon: p[7] || 0,
        name: def ? def.name : `Safe Haven Outpost #${p[0]}`,
        region: def ? def.region : 'Wasteland',
        theme: def ? def.theme : 'alpine',
        radius: def ? def.radius : 180,
        upgrades: (p[8] && typeof p[8] === 'object') ? p[8] : {}
      };
    }
    if (typeof p === 'object' && p !== null) {
      const def = (D && D.PLOTS) ? D.PLOTS.find(pl => pl.id === p.id) : null;
      return {
        id: p.id,
        name: p.name || (def ? def.name : `Safe Haven Outpost #${p.id}`),
        x: p.x,
        y: p.y,
        region: p.region || (def ? def.region : 'Wasteland'),
        theme: p.theme || (def ? def.theme : 'alpine'),
        radius: p.radius || (def ? def.radius : 180),
        owner: p.owner,
        ownerName: p.ownerName || '',
        team: p.team || 0,
        level: p.level || 1,
        scrap: p.scrap || 0,
        beacon: p.beacon || 0,
        upgrades: p.upgrades || {}
      };
    }
    return p;
  });
}

let skyT = 0;
function init(m) {
  D = m.defs; M = m.map; myId = m.id; settings = m.settings;
  TS = M.TS; MW = M.W; MH = M.H; WP = MW * TS; HP = MH * TS;
  tiles = b64(M.tiles); region = b64(M.region);
  D.W.forEach(w => WBY[w.key] = w);
  shelterPlots = parsePlots(m.plots);
  buildRectGrid(); buildMinimap();
  $('login').hidden = true; $('hud').hidden = false;
  setInterval(() => send({t: 'ping', c: performance.now(), l: ping}), 2000);
  toast('Welcome to DEAD WORLD — Press T for Shelter · Press P for Recall · Esc for menu');
  initShelterUI();
  initRebornUI();
  requestAnimationFrame(frame);
}
function b64(s) {
  const bin = atob(s), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

// ───────── static map helpers ─────────
const RG = new Map();
function buildRectGrid() {
  M.rects.forEach((r, i) => {
    for (let cx = Math.floor(r[0] / 320); cx <= Math.floor((r[0] + r[2]) / 320); cx++) {
      for (let cy = Math.floor(r[1] / 320); cy <= Math.floor((r[1] + r[3]) / 320); cy++) {
        const k = cx * 65536 + cy;
        let a = RG.get(k); if (!a) { a = []; RG.set(k, a); }
        a.push(i);
      }
    }
  });
}
function rectsIn(x0, y0, x1, y1) {
  const out = new Set();
  for (let cx = Math.floor(x0 / 320); cx <= Math.floor(x1 / 320); cx++) {
    for (let cy = Math.floor(y0 / 320); cy <= Math.floor(y1 / 320); cy++) {
      const a = RG.get(cx * 65536 + cy);
      if (a) for (const i of a) out.add(i);
    }
  }
  return out;
}
const tileAt = (x, y) => {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  return (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? 0 : tiles[ty * MW + tx];
};
const circRect = (cx, cy, r, rx, ry, rw, rh) => {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
};
function circleBuildingCollide(x, y, r, q) {
  const bx = q[0], by = q[1], bw = q[2], bh = q[3];
  if (!circRect(x, y, r, bx, by, bw, bh)) return false;
  if (bw < 64 || bh < 64) return true; // solid small structure
  const th = 16;
  const isLarge = bw > 180 || bh > 180;
  const gw = Math.min(bw * 0.55, isLarge ? 104 : 72);
  const cx = bx + bw / 2;
  const halfDoor = gw / 2;
  const leftW = Math.max(0, (bw - gw) / 2);
  if (circRect(x, y, r, bx, by, bw, th)) return true; // Top wall
  if (circRect(x, y, r, bx, by + th, th, bh - th)) return true; // Left wall
  if (circRect(x, y, r, bx + bw - th, by + th, th, bh - th)) return true; // Right wall
  if (leftW > 0 && circRect(x, y, r, bx, by + bh - th, leftW, th)) return true; // Bottom-left wall
  if (leftW > 0 && circRect(x, y, r, cx + halfDoor, by + bh - th, leftW, th)) return true; // Bottom-right wall
  return false; // Interior and doorway are open and enterable
}

function computePlotSize(plot) {
  const up = plot ? (plot.upgrades || {}) : {};
  const exp = up.compound_expansion || 0;
  const lv = plot ? (plot.level || 1) : 1;
  return 320 + exp * 70 + Math.min(100, (lv - 1) * 15);
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
  if (circRect(x, y, r, x0, y0, S, T)) return true; // Top
  if (circRect(x, y, r, x0, y0, T, S)) return true; // Left
  if (circRect(x, y, r, x0 + S - T, y0, T, S)) return true; // Right
  if (circRect(x, y, r, x0, y0 + S - T, gateX0 - x0, T)) return true; // Bottom left wing
  if (circRect(x, y, r, gateX1, y0 + S - T, (x0 + S) - gateX1, T)) return true; // Bottom right wing
  // 2. Airlock blast gate (opens only for authorized survivors approaching doorway)
  const nearAirlock = Math.abs(x - plot.x) <= gateW / 2 + 30 && Math.abs(y - (y0 + S)) <= 120;
  const gateOpen = (isAuth || !plot.owner) && nearAirlock;
  if (!gateOpen && circRect(x, y, r, gateX0, y0 + S - T, gateW, T)) return true;
  // 3. Central command console
  if (circRect(x, y, r, plot.x - 28, plot.y - 28, 56, 56)) return true;
  return false;
}

function blockedAt(x, y, r) {
  if (x < r || y < r || x > WP - r || y > HP - r) return true;
  for (let ty = Math.floor((y - r) / TS); ty <= Math.floor((y + r) / TS); ty++) {
    for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) {
      if (D.TILES[tiles[ty * MW + tx]].solid && circRect(x, y, r, tx * TS, ty * TS, TS, TS)) return true;
    }
  }
  for (let cx = Math.floor((x - r) / 320); cx <= Math.floor((x + r) / 320); cx++) {
    for (let cy = Math.floor((y - r) / 320); cy <= Math.floor((y + r) / 320); cy++) {
      const a = RG.get(cx * 65536 + cy);
      if (a) for (const i of a) {
        const q = M.rects[i];
        if (circleBuildingCollide(x, y, r, q)) return true;
      }
    }
  }
  for (const s of structs.values()) {
    if (Math.abs(s.x - x) > 160 || Math.abs(s.y - y) > 160) continue;
    const d = D.STRUCTS[s.k];
    if (d.block === 0 || (d.door && s.open)) continue;
    if (circRect(x, y, r, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)) return true;
  }
  // 16 Designated Shelter Tycoon Plots
  for (const plot of shelterPlots) {
    if (Math.abs(plot.x - x) > 550 || Math.abs(plot.y - y) > 550) continue;
    const isAuth = me && (me.id === plot.owner || (plot.team > 0 && me.team === plot.team) || !plot.owner);
    if (circleShelterCollide(x, y, r, plot, isAuth)) return true;
  }
  return false;
}
function moveCircle(e, dx, dy, r) {
  if (blockedAt(e.x, e.y, r)) { e.x += dx; e.y += dy; return; }
  const steps = Math.max(1, Math.ceil((Math.abs(dx) + Math.abs(dy)) / (r * 0.6)));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (!blockedAt(e.x + sx, e.y, r)) e.x += sx;
    if (!blockedAt(e.x, e.y + sy, r)) e.y += sy;
  }
}
const themeAt = (x, y) => M.themes[region[clamp(Math.floor(y / TS), 0, MH - 1) * MW + clamp(Math.floor(x / TS), 0, MW - 1)]];
const regionName = (x, y) => M.rnames[region[clamp(Math.floor(y / TS), 0, MH - 1) * MW + clamp(Math.floor(x / TS), 0, MW - 1)]];
const gridName = (x, y) => String.fromCharCode(65 + clamp(Math.floor(x / 1600), 0, 19)) + (clamp(Math.floor(y / 1600), 0, 19) + 1);

// ───────── colours & styles ─────────
const TCOL = ['#1d4e89', '#3a86c8', '#e2cf8f', '#5d9b4c', '#3b6e34', '#3d3d42', '#9a9a94', '#a88a4e', '#6e6660', '#eef3f7', '#bfe6f5', '#e2541b', '#f2f0e6', '#9b7a55', '#4f6b3f', '#3f9a3f', '#2e2e33', '#6cc35a', '#d8b46a', '#7fa33a', '#4a4a50'];
const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TRGB = TCOL.map(hex2);
const shade = (rgb, f) => `rgb(${clamp(rgb[0] * f, 0, 255) | 0},${clamp(rgb[1] * f, 0, 255) | 0},${clamp(rgb[2] * f, 0, 255) | 0})`;
const STY = {
  b: ['#6f6a64', '#4c4843'], stand: ['#6b6f78', '#3f434a'], stone: ['#b9a68a', '#7d6c55'], pit: ['#c8c8c8', '#777'], club: ['#e8dcc2', '#9c8c6e'], terminal: ['#b5c4cf', '#6b7c88'], hangar: ['#8c949c', '#596068'],
  police: ['#2c4e8a', '#152a52'], fire: ['#a8322d', '#5c1714'], court: ['#d8d0bd', '#8f8672'], museum: ['#ece6d8', '#a59c86'], science: ['#9fc7d8', '#4d7f94'], archive: ['#a39278', '#6b5c45'], bank: ['#cbb26a', '#7d6a2f'],
  post: ['#c0392b', '#6e1f17'], capitol: ['#efe9dc', '#a8a08a'], intl: ['#5d9cd6', '#2c5a85'], gov: ['#c9bea3', '#857a60'], civic: ['#a9a197', '#6b6358'], church: ['#7d7468', '#4a433a'], temple: ['#efe8d8', '#b0a68e'],
  hall: ['#8fa3ad', '#53656e'], mall: ['#7fb8b0', '#3f6f68'], glass: ['#b7e3e0', '#5f9a97'], fence: ['#b9c2c9', '#7d868d'], stall: ['#d9534f', '#8a2b28'], fortwall: ['#8a7c68', '#544a3c'], tower: ['#7a6c58', '#463c2e'],
  keep: ['#6e624f', '#3e3628'], palace: ['#efe0b8', '#b29a5a'], pagoda: ['#b8322a', '#6c1a14'], pyramid: ['#d8bf7a', '#9a8040'], mosque: ['#e8dcc0', '#a6967a'], minaret: ['#f0e6cc', '#a6967a'], dome: ['#f4f1ea', '#b5ae9e'],
  aqueduct: ['#c3ad8a', '#81704f'], farmhouse: ['#a5553a', '#5c2c1c'], manor: ['#c7b79b', '#7d6e55'], silo: ['#c9ccd1', '#80858c'], barn: ['#8c2f23', '#4f1811'], dam: ['#a7a7a2', '#62625e'], cottage: ['#bb6b3f', '#6b3a20'],
  house: ['#9b4a32', '#5a2a1c'], shop: ['#46607a', '#273647'], office: ['#5b6a78', '#343e47'], apartment: ['#7d6a5a', '#4a3e33'], hospital: ['#f2f2f2', '#9aa0a6'], gasstation: ['#e8b923', '#8a6c0e'], canopy: ['#e04b3a', '#7a261c'],
  windmill: ['#e8e2d2', '#8a8270'], watermill: ['#9a7350', '#5c432c'], aquarium: ['#3c7fb5', '#1f4766'], checkpoint: ['#556b2f', '#2f3b1a'], campus: ['#a35a3e', '#5f3322'], embassy: ['#c8c0ae', '#7d7563'],
};

// ───────── chunked terrain renderer ─────────
const CH = 16, CS = 0.5, CHPX = CH * TS * CS, chunkCache = new Map(); let chunkBuilds = 0;
function getChunk(cx, cy) {
  const k = cx * 1000 + cy; const c = chunkCache.get(k);
  if (c) { c.u = frameN; return c.cv; }
  if (chunkBuilds >= 3) return null; chunkBuilds++;
  if (chunkCache.size > 60) {
    let old = null, ou = Infinity;
    for (const [kk, v] of chunkCache) if (v.u < ou) { ou = v.u; old = kk; }
    chunkCache.delete(old);
  }
  const c2 = document.createElement('canvas'); c2.width = c2.height = CHPX;
  drawChunk(c2.getContext('2d'), cx, cy);
  chunkCache.set(k, {cv: c2, u: frameN});
  return c2;
}

function drawChunk(g, cx, cy) {
  g.save(); g.scale(CS, CS); g.translate(-cx * CH * TS, -cy * CH * TS);
  const tx0 = cx * CH, ty0 = cy * CH;
  for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) {
    if (tx >= MW || ty >= MH) continue;
    const t = tiles[ty * MW + tx], x = tx * TS, y = ty * TS, h = hsh(tx, ty);
    g.fillStyle = shade(TRGB[t], 0.94 + h * 0.12); g.fillRect(x, y, TS + 1, TS + 1);
    const nb = (dx, dy) => { const xx = tx + dx, yy = ty + dy; return (xx < 0 || yy < 0 || xx >= MW || yy >= MH) ? -1 : tiles[yy * MW + xx]; };
    switch (t) {
      case 4: // Lush Forest & Dense Woodlands
        for (let k = 0; k < 4; k++) {
          const px = x + hsh(tx * 3 + k, ty) * TS, py = y + hsh(tx, ty * 3 + k) * TS, r = 16 + hsh(tx + k, ty + k) * 16;
          g.fillStyle = 'rgba(12,35,14,.65)'; g.beginPath(); g.arc(px + 5, py + 6, r, 0, 7); g.fill(); // shadow
          g.fillStyle = shade(TRGB[4], 0.95 + hsh(k, tx) * 0.35); g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); // crown
          g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(px - 3, py - 3, r * 0.5, 0, 7); g.fill(); // highlight
        }
        break;
      case 3: case 15: case 17: // Grassland, Turf, & Meadows
        g.fillStyle = 'rgba(25,60,20,.3)';
        for (let k = 0; k < 6; k++) {
          const gx = x + hsh(k, tx + ty) * TS, gy = y + hsh(tx, k + ty) * TS;
          g.fillRect(gx, gy, 3, 7);
          g.fillRect(gx + 2, gy + 1, 2, 4);
        }
        if (h > 0.6) { g.fillStyle = '#fef08a'; g.fillRect(x + h * TS * 0.7, y + (1 - h) * TS * 0.7, 3, 3); } // wildflowers
        break;
      case 7: // Farmland Soil & Crop Furrows
        g.strokeStyle = 'rgba(70,45,20,.45)'; g.lineWidth = 4;
        for (let k = 6; k < TS; k += 13) {
          g.beginPath(); g.moveTo(x, y + k); g.lineTo(x + TS, y + k); g.stroke();
          g.fillStyle = 'rgba(84,130,53,.35)'; g.fillRect(x + (k % 7) * 9, y + k - 2, 6, 3); // crop sprouts
        }
        break;
      case 0: case 1: // Deep & Shallow Water
        g.fillStyle = t === 0 ? 'rgba(10,35,70,.35)' : 'rgba(30,120,180,.25)';
        g.fillRect(x, y, TS, TS);
        g.strokeStyle = t ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)'; g.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          const yy = y + 18 + k * 36 + h * 10;
          g.beginPath(); g.moveTo(x + 4, yy); g.quadraticCurveTo(x + 28, yy - 5, x + 54, yy); g.stroke();
        }
        // Shoreline water foam edge
        if (nb(0, -1) !== 0 && nb(0, -1) !== 1) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, TS, 4); }
        if (nb(0, 1) !== 0 && nb(0, 1) !== 1) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y + TS - 4, TS, 4); }
        if (nb(-1, 0) !== 0 && nb(-1, 0) !== 1) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, 4, TS); }
        if (nb(1, 0) !== 0 && nb(1, 0) !== 1) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + TS - 4, y, 4, TS); }
        break;
      case 8: // Solid Mountain Rock
        g.fillStyle = 'rgba(0,0,0,.22)';
        g.beginPath(); g.moveTo(x + h * 30, y + 8); g.lineTo(x + 72, y + 18 + h * 30); g.lineTo(x + 32, y + 74); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 12, y + 20); g.lineTo(x + 45, y + 55); g.stroke(); // fissure
        break;
      case 5: case 20: { // Paved Asphalt Road & Highway & Runway
        g.fillStyle = '#22252a'; g.fillRect(x, y, TS, TS);
        const L = nb(-1, 0) === t, Rr = nb(1, 0) === t, U = nb(0, -1) === t, Dn = nb(0, 1) === t;
        // White shoulder edges
        g.fillStyle = 'rgba(240,240,245,.6)';
        if (!U && (L || Rr)) g.fillRect(x, y, TS, 3.5);
        if (!Dn && (L || Rr)) g.fillRect(x, y + TS - 3.5, TS, 3.5);
        if (!L && (U || Dn)) g.fillRect(x, y, 3.5, TS);
        if (!Rr && (U || Dn)) g.fillRect(x + TS - 3.5, y, 3.5, TS);
        // Double yellow center markings
        g.fillStyle = t === 20 ? '#ffffff' : '#ffd166';
        if (L || Rr) {
          g.fillRect(x + 8, y + TS / 2 - 3, 22, 2.5);
          g.fillRect(x + 40, y + TS / 2 - 3, 22, 2.5);
          g.fillRect(x + 8, y + TS / 2 + 1, 22, 2.5);
          g.fillRect(x + 40, y + TS / 2 + 1, 22, 2.5);
        } else if (U || Dn) {
          g.fillRect(x + TS / 2 - 3, y + 8, 2.5, 22);
          g.fillRect(x + TS / 2 - 3, y + 40, 2.5, 22);
          g.fillRect(x + TS / 2 + 1, y + 8, 2.5, 22);
          g.fillRect(x + TS / 2 + 1, y + 40, 2.5, 22);
        }
        break;
      }
      case 6: // Concrete Plaza Slab
        g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2;
        g.strokeRect(x + 1, y + 1, TS / 2, TS / 2);
        g.strokeRect(x + TS / 2, y + TS / 2, TS / 2 - 1, TS / 2 - 1);
        break;
      case 14: // Muddy Swamp & Murky Bog
        g.fillStyle = 'rgba(25,45,28,.65)'; g.beginPath(); g.ellipse(x + 24 + h * 24, y + 38, 26, 16, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(10,25,15,.4)'; g.beginPath(); g.arc(x + 20 + h * 20, y + 35, 12, 0, 7); g.fill();
        break;
      case 10: // Slick Ice
        g.fillStyle = 'rgba(200,235,255,.3)'; g.fillRect(x, y, TS, TS);
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 12, y + 15 + h * 25); g.lineTo(x + 62, y + 10 + h * 35); g.stroke();
        break;
      case 9: // Deep Snow
        g.fillStyle = 'rgba(240,248,255,.45)'; g.fillRect(x, y, TS, TS);
        g.fillStyle = 'rgba(180,210,235,.4)';
        for (let k = 0; k < 5; k++) g.fillRect(x + hsh(k, tx) * TS, y + hsh(ty, k) * TS, 6, 6);
        break;
      case 18: case 2: // Sand & Desert Dunes
        g.strokeStyle = 'rgba(180,140,70,.35)'; g.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          g.beginPath(); g.moveTo(x, y + 15 + k * 24); g.quadraticCurveTo(x + 38, y + 6 + k * 24, x + TS, y + 15 + k * 24); g.stroke();
        }
        break;
      default:
        break;
    }
  }
  for (const i of rectsIn(tx0 * TS, ty0 * TS, (tx0 + CH) * TS, (ty0 + CH) * TS)) drawRect(g, M.rects[i]);
  g.restore();
}

// ───────── architectural place details ─────────
function drawRect(g, r) {
  const s = M.styles[r[4]], st = STY[s] || STY.b, [x, y, w, h] = r;
  g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(x + 10, y + 10, w, h);
  if (s === 'silo' || s === 'windmill' || s === 'watermill' || s === 'minaret' || (s === 'tower' && w < 60)) {
    g.fillStyle = st[0]; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2, 0, 7); g.fill();
    g.strokeStyle = st[1]; g.lineWidth = 4; g.stroke();
    if (s === 'silo') {
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 3, 0, 7); g.stroke();
    }
    return;
  }
  const isEnterable = (w >= 64 && h >= 64);
  const doorW = isEnterable ? Math.min(104, Math.max(64, w * 0.35)) : 0;
  const doorX0 = isEnterable ? x + (w - doorW) / 2 : 0;
  const doorX1 = doorX0 + doorW;

  // Exterior building base
  g.fillStyle = st[0]; g.fillRect(x, y, w, h);

  if (isEnterable) {
    // Walkable interior floor
    g.fillStyle = '#23272f'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
    // Interior floor tiles pattern
    g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 1;
    for (let ix = x + 20; ix < x + w - 16; ix += 24) {
      g.beginPath(); g.moveTo(ix, y + 6); g.lineTo(ix, y + h - 6); g.stroke();
    }
    for (let iy = y + 20; iy < y + h - 16; iy += 24) {
      g.beginPath(); g.moveTo(x + 6, iy); g.lineTo(x + w - 6, iy); g.stroke();
    }

    // Fortified perimeter walls with open bottom entrance doorway
    g.strokeStyle = st[1]; g.lineWidth = 6;
    g.beginPath();
    // Top wall
    g.moveTo(x + 2, y + 2); g.lineTo(x + w - 2, y + 2);
    // Right wall
    g.lineTo(x + w - 2, y + h - 2);
    // Bottom wall right segment
    g.lineTo(doorX1, y + h - 2);
    g.stroke();

    g.beginPath();
    // Bottom wall left segment
    g.moveTo(doorX0, y + h - 2); g.lineTo(x + 2, y + h - 2);
    // Left wall
    g.lineTo(x + 2, y + 2);
    g.stroke();

    // Doorway entrance threshold & guidance mat
    g.fillStyle = '#1a1d24'; g.fillRect(doorX0, y + h - 8, doorW, 14);
    // Doorway side hazard bollards
    g.fillStyle = '#ffd166';
    g.fillRect(doorX0 - 4, y + h - 10, 8, 12);
    g.fillRect(doorX1 - 4, y + h - 10, 8, 12);
    // Glowing green entrance guideline
    g.fillStyle = '#4dff88';
    g.fillRect(doorX0 + 6, y + h - 4, doorW - 12, 3);
  } else {
    g.strokeStyle = st[1]; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }
  const cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);

  // Enhanced architectural rendering
  switch (s) {
    case 'terminal': case 'hangar': {
      // Airport runways, markings and tarmac
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4;
      g.setLineDash([24, 16]);
      if (w > h) { g.beginPath(); g.moveTo(x + 30, cy); g.lineTo(x + w - 30, cy); g.stroke(); }
      else { g.beginPath(); g.moveTo(cx, y + 30); g.lineTo(cx, y + h - 30); g.stroke(); }
      g.setLineDash([]);
      g.fillStyle = 'rgba(240,200,60,.85)';
      g.font = `bold ${Math.min(32, m * 0.4)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(w > h ? '09L' : '27R', cx, cy - (w > h ? 24 : 0));
      // Edge guidance lights
      for (let k = 10; k < (w > h ? w : h) - 10; k += 40) {
        g.fillStyle = '#00e5ff';
        if (w > h) { g.fillRect(x + k, y + 4, 3, 3); g.fillRect(x + k, y + h - 7, 3, 3); }
        else { g.fillRect(x + 4, y + k, 3, 3); g.fillRect(x + w - 7, y + k, 3, 3); }
      }
      break;
    }
    case 'stand': case 'pit': {
      // Stadium / Arena field stripes and yard lines
      g.fillStyle = '#2d6a36'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
      g.fillStyle = 'rgba(255,255,255,.08)';
      for (let k = 6; k < w - 12; k += 24) g.fillRect(x + k, y + 6, 12, h - 12);
      g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 2;
      g.strokeRect(x + 14, y + 14, w - 28, h - 28);
      g.beginPath(); g.arc(cx, cy, Math.min(w, h) * 0.18, 0, 7); g.stroke();
      break;
    }
    case 'hospital': {
      // High-contrast medical cross and helipad
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, m * 0.38, 0, 7); g.fill();
      g.strokeStyle = '#e53935'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#e53935';
      g.fillRect(cx - m * 0.08, cy - m * 0.28, m * 0.16, m * 0.56);
      g.fillRect(cx - m * 0.28, cy - m * 0.08, m * 0.56, m * 0.16);
      break;
    }
    case 'police': case 'fire': {
      g.fillStyle = s === 'police' ? '#1e3d7a' : '#8c1f1b';
      g.fillRect(x + 6, y + 6, w - 12, h - 12);
      g.fillStyle = '#fff'; g.font = `bold ${Math.min(36, m * 0.32)}px sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(s === 'police' ? 'POLICE HQ' : 'FIRE DEPT', cx, cy);
      // Emergency light bars
      g.fillStyle = s === 'police' ? '#2979ff' : '#ff1744';
      g.fillRect(cx - 20, y + 10, 16, 6); g.fillStyle = '#fff'; g.fillRect(cx + 4, y + 10, 16, 6);
      break;
    }
    case 'bank': {
      // Marble floor and reinforced circular vault dial
      g.fillStyle = '#d4c28f'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
      g.fillStyle = '#444'; g.beginPath(); g.arc(cx, cy, m * 0.28, 0, 7); g.fill();
      g.strokeStyle = '#ffd700'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#ffd700'; g.font = `bold ${Math.min(44, m * 0.35)}px serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', cx, cy);
      break;
    }
    case 'gasstation': {
      // Canopy and pump islands
      g.fillStyle = '#b71c1c'; g.fillRect(x + 4, y + 4, w - 8, 12);
      g.fillStyle = '#333';
      for (let k = x + 16; k < x + w - 16; k += 28) {
        g.fillRect(k, cy - 4, 14, 8);
        g.fillStyle = '#ffd700'; g.fillRect(k + 2, cy - 2, 4, 4);
        g.fillStyle = '#333';
      }
      break;
    }
    case 'fortwall': case 'keep': case 'tower': {
      // Battlements and arrow embrasures
      g.strokeStyle = '#3e3628'; g.lineWidth = 3;
      for (let k = x + 8; k < x + w - 8; k += 16) { g.beginPath(); g.moveTo(k, y + 4); g.lineTo(k, y + 12); g.stroke(); }
      break;
    }
    default: {
      if (w > 50 && h > 50) {
        // Room dividers and corridor floor grids
        g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
        for (let a = x + 16; a < x + w - 16; a += 32) { g.beginPath(); g.moveTo(a, y + 6); g.lineTo(a, y + h - 6); g.stroke(); }
        for (let b = y + 16; b < y + h - 16; b += 32) { g.beginPath(); g.moveTo(x + 6, b); g.lineTo(x + w - 6, b); g.stroke(); }
      }
    }
  }
}

// ───────── minimap ─────────
let mini = null;
function buildMinimap() {
  mini = document.createElement('canvas'); mini.width = MW; mini.height = MH;
  const g = mini.getContext('2d'); const img = g.createImageData(MW, MH);
  for (let i = 0; i < MW * MH; i++) {
    const c = TRGB[tiles[i]];
    img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0); g.fillStyle = 'rgba(30,25,20,.85)';
  for (const r of M.rects) g.fillRect(r[0] / TS, r[1] / TS, Math.max(0.6, r[2] / TS), Math.max(0.6, r[3] / TS));
}

// ───────── snapshots & interpolation ─────────
function onSnap(m) {
  const now = performance.now();
  const s = {t: now, P: new Map(), Z: new Map(), V: new Map(), R: new Map()};
  for (const p of m.P) s.P.set(p[0], p);
  for (const z of m.Z) s.Z.set(z[0], z);
  for (const v of m.V) s.V.set(v[0], v);
  for (const r of m.R) s.R.set(r[0], r);
  snaps.push(s); while (snaps.length > 40) snaps.shift();
  latest = s; me = m.me; gameTime = m.tm; effects = m.E;

  if (m.G) {
    items.clear();
    for (const g of m.G) items.set(g[0], {id: g[0], k: g[1], x: g[2], y: g[3], n: g[4], label: g[5]});
  }
  if (m.S) {
    structs.clear();
    for (const q of m.S) structs.set(q[0], {id: q[0], k: q[1], x: q[2], y: q[3], w: q[4], h: q[5], hp: q[6], open: q[7], team: q[8], wat: q[9], owner: q[10]});
  }
  if (me.ps !== pred.ps || me.veh || me.dead) {
    pred.x = me.x; pred.y = me.y; pred.ps = me.ps;
  }
  for (const e of m.ev) handleEvent(e);

  // Sync scrap and plot counter in modal
  if (activePlot && me && $('sh-scrap-counter')) {
    $('sh-scrap-counter').textContent = me.scrap || 0;
  }

  const dz = $('death'); dz.hidden = !me.dead;
  if (me.dead) {
    const b = $('drsp');
    b.disabled = me.rsp > 0;
    b.textContent = me.rsp > 0 ? `Respawn in ${Math.ceil(me.rsp / 1000)}s` : 'Respawn';
  }
}
$('drsp').onclick = () => send({t: 'respawn'});

function interpState() {
  const rt = performance.now() - 115;
  let a = snaps[0], b = snaps[0];
  for (let i = snaps.length - 1; i >= 0; i--) {
    if (snaps[i].t <= rt) { a = snaps[i]; b = snaps[i + 1] || snaps[i]; break; }
  }
  return {a, b, u: b === a ? 0 : clamp((rt - a.t) / (b.t - a.t), 0, 1)};
}
function lerpArr(A, B, u, ix, iy, ia, as) {
  if (!A) return [B[ix], B[iy], B[ia] / as];
  return [lerp(A[ix], B[ix], u), lerp(A[iy], B[iy], u), angLerp(A[ia] / as, B[ia] / as, u)];
}

// ───────── input ─────────
const worldMouse = () => ({x: camX + (mouse.x - VW / 2) / zoom, y: camY + (mouse.y - VH / 2) / zoom});
const uiBlock = () => !$('menu').hidden || !$('board').hidden || !$('bigmap').hidden || !$('shelter-modal').hidden || !$('reborn-modal').hidden || chatOpen || (me && me.dead);

addEventListener('keydown', e => {
  if (!D) return;
  if (chatOpen) { if (e.key === 'Enter') sendChat(); else if (e.key === 'Escape') closeChat(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Tab') { e.preventDefault(); $('board').hidden = false; renderBoard(); return; }
  if (e.code === 'Space') { e.preventDefault(); }
  if (keys[e.code]) return; keys[e.code] = true;
  ac();
  switch (e.code) {
    case 'Enter': e.preventDefault(); openChat(); break;
    case 'KeyE': send({t: 'act'}); break;
    case 'KeyT': toggleShelterTycoon(); break;
    case 'KeyY': case 'KeyU': toggleRebornModal(); break;
    case 'KeyP':
      if (me && me.rebornPerks && me.rebornPerks.includes('quantum_recall')) {
        send({t: 'quantum_recall'});
        toast('🌀 Engaging Quantum Recall Matrix…');
      } else {
        toast('Unlock "Quantum Recall Beacon" in Reborn menu [Y] to warp to your shelter!');
      }
      break;
    case 'KeyO':
      if (me && me.rebornPerks && me.rebornPerks.includes('orbital_beam')) {
        const wm = worldMouse();
        send({t: 'orbital_strike', x: wm.x, y: wm.y});
        toast('⚡ Orbital Kinetic Lance target designated!');
      }
      break;
    case 'KeyR': if (mode && mode.type === 'place') mode.rot ^= 1; else send({t: 'reload'}); break;
    case 'KeyQ': if (mode && mode.type === 'place') mode.rot ^= 1; break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': send({t: 'slot', v: +e.code.slice(5) - 1}); break;
    case 'KeyI': case 'KeyB': togglePanel('inv'); break;
    case 'KeyC': togglePanel('craft'); break;
    case 'KeyM': toggleMap(); break;
    case 'Escape':
      if (mode) mode = null;
      else if (!$('bigmap').hidden) toggleMap();
      else if (!$('shelter-modal').hidden) $('shelter-modal').hidden = true;
      else if (!$('reborn-modal').hidden) $('reborn-modal').hidden = true;
      else if (!$('inv').hidden || !$('craft').hidden) { $('inv').hidden = $('craft').hidden = true; }
      else { const mn = $('menu'); mn.hidden = !mn.hidden; if (!mn.hidden) renderMenu(); }
      break;
    case 'KeyL': send({t: 'light'}); break;
    case 'KeyN': send({t: 'nvg'}); break;
    case 'KeyH': send({t: 'horn'}); break;
    case 'KeyX': send({t: 'seat'}); break;
    case 'KeyF': quickUse('heal'); break;
    case 'KeyV': quickUse('eat'); break;
    case 'KeyG': if (me) send({t: 'dropw', s: me.sel}); break;
    case 'KeyZ': userZoom = userZoom === 1 ? 0.72 : userZoom === 0.72 ? 1.35 : 1; toast('Zoom ' + Math.round(userZoom * 100) + '%'); break;
  }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Tab') $('board').hidden = true; });
function updateMouse(e) {
  const r = cv.getBoundingClientRect();
  const sx = r.width ? (VW / r.width) : 1;
  const sy = r.height ? (VH / r.height) : 1;
  mouse.x = (e.clientX - r.left) * sx;
  mouse.y = (e.clientY - r.top) * sy;
}
cv.addEventListener('mousemove', updateMouse);
cv.addEventListener('mouseenter', updateMouse);
cv.addEventListener('mousedown', e => {
  updateMouse(e);
  ac(); if (!D) return;
  if (e.button === 0) {
    if (mode) {
      const w = worldMouse();
      send({t: 'use', i: mode.i, x: Math.round(w.x), y: Math.round(w.y), r: mode.rot || 0});
      if (mode.type !== 'place') mode = null;
      return;
    }
    mouse.l = true;
  }
  if (e.button === 2) {
    if (mode) { mode = null; return; }
    mouse.r = true;
  }
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  if (!me || !inv) return;
  e.preventDefault();
  const dir = e.deltaY > 0 ? 1 : -1;
  let s = me.sel;
  for (let k = 0; k < 5; k++) { s = (s + dir + 5) % 5; if (inv.hb[s]) break; }
  send({t: 'slot', v: s});
}, {passive: false});

function quickUse(kind) {
  if (!inv || !me) return;
  const order = kind === 'heal'
    ? (me.bl ? ['bandage', 'sutures', 'medkit'] : me.fr ? ['splint'] : me.inf > 0 ? ['antizyme', 'antibiotics'] : ['medkit', 'bloodbag', 'sutures', 'bandage', 'painkillers'])
    : (me.th < me.hu ? ['waterbottle', 'canteen', 'soda', 'jerrywater', 'soup'] : ['mre', 'beans', 'jerky', 'peanutbutter', 'soup', 'rice', 'petfood', 'energybar', 'produce']);
  for (const k of order) {
    const i = inv.inv.findIndex(x => x[0] === k);
    if (i >= 0) { send({t: 'use', i}); return; }
  }
  toast(kind === 'heal' ? 'No suitable medical item' : 'Nothing to eat or drink');
}
function togglePanel(id) { const el = $(id); el.hidden = !el.hidden; if (id === 'inv') renderInv(); else renderCraft(); }
function openChat() { chatOpen = true; const c = $('chatin'); c.hidden = false; c.value = ''; c.focus(); }
function closeChat() { chatOpen = false; const c = $('chatin'); c.hidden = true; c.blur(); }
function sendChat() { const v = $('chatin').value.trim(); if (v) send({t: 'chat', m: v}); closeChat(); }

// ───────── UI: chat / feed / toast / banner ─────────
function addChat(m) {
  const d = document.createElement('div');
  if (m.tm) d.className = 'tm';
  d.innerHTML = `<b style="color:${TEAMCOL[m.c] || '#ffd166'}">${esc(m.n)}</b>${m.tm ? ' [team]' : ''}: ${esc(m.m)}`;
  const log = $('chatlog'); log.appendChild(d);
  while (log.children.length > 9) log.firstChild.remove();
  setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = 0.35; }, 15000);
  sfx('pick');
}
function addFeed(t) {
  const d = document.createElement('div'); d.textContent = t;
  const f = $('feed'); f.appendChild(d);
  while (f.children.length > 6) f.firstChild.remove();
  setTimeout(() => d.remove(), 9000);
}
function toast(t) {
  const d = document.createElement('div'); d.textContent = t;
  const f = $('toasts'); f.appendChild(d);
  while (f.children.length > 4) f.firstChild.remove();
  setTimeout(() => d.remove(), 4000);
}
let bannerTO = 0;
function showBanner(title, sub, col, ms) {
  const b = $('banner');
  b.innerHTML = `<span style="color:${col || '#fff'}">${esc(title)}</span>${sub ? '<small>' + esc(sub) + '</small>' : ''}`;
  b.style.opacity = 1; clearTimeout(bannerTO);
  bannerTO = setTimeout(() => b.style.opacity = 0, ms || 5000);
}

// ───────── UI: names & icons ─────────
const CAT_IC = {medical: '💊', build: '🧱', craft: '🔩', energy: '🔦', food: '🥫', water: '💧', vehicle: '🔧', electronics: '📡', distract: '🔔', wear: '🦺', crafted: '🛠️', ammo: '🎯'};
const W_IC = {ar: '🔫', sniper: '🎯', smg: '🔫', pistol: '🔫', shotgun: '🔫', mg: '🔫', sword: '⚔️', polearm: '🔱', bow: '🏹', blunt: '🔨', dagger: '🗡️', launcher: '🚀', glauncher: '💣', artillery: '💥', mlrs: '🚀', naval: '⚓', missile: '☢️', throwing: '🪃', siege: '🏰', special: '⚡'};
const ITEM_IC = {medkit: '🩺', bandage: '🩹', painkillers: '💊', antibiotics: '💉', antizyme: '🧪', adrenaline: '💉', bloodbag: '🩸', waterbottle: '💧', canteen: '🫗', soda: '🥤', mre: '🍱', beans: '🥫', jerky: '🥓', berries: '🫐', produce: '🍎', flashlight: '🔦', lantern: '🏮', glowstick: '🟢', flare: '🧨', roadflare: '🧨', generator: '⚙️', solar: '🔆', batteries: '🔋', carbattery: '🔋', gps: '🛰️', walkie: '📻', radio: '📻', hamradio: '📡', nvg: '🥽', camera: '📷', keycard: '🪪', gasoline: '⛽', backpack: '🎒', fannypack: '👝', kevlar: '🦺', gasmask: '😷', hazmat: '☣️', riothelmet: '⛑️', boots: '🥾', gloves: '🧤', gillie: '🌿', leatherjacket: '🧥', drone: '🛸', boombox: '📢', alarmclock: '⏰', firecrackers: '🎆', whistle: '📣', laserpointer: '🔴', molotov: '🍾', pipebomb: '💣', bottle: '🍾', smokecan: '💨', zombiescent: '🩸', torch: '🔥', door: '🚪', teslatrap: '⚡', spiketrap: '📍', tarp: '⛺', planks: '🪵', sandbags: '🧱'};

function itemName(k, n) {
  if (k.startsWith('w:')) { const w = WBY[k.slice(2)]; return w ? w.name : k; }
  if (k.startsWith('ammo_')) { const a = D.AMMO[k.slice(5)]; return a ? `${a.n} ×${n}` : k; }
  if (k === 'bag') return 'Loot bag'; if (k === 'crate') return 'Supply crate'; if (k === 'vault') return 'Locked vault (needs Keycard)';
  const d = D.ITEMS[k]; return d ? d.n + (n > 1 ? ' ×' + n : '') : k;
}
function itemIcon(k) {
  if (k.startsWith('w:')) { const w = WBY[k.slice(2)]; return w ? W_IC[w.cat] : '?'; }
  if (k.startsWith('ammo_')) return '🎯'; if (k === 'bag') return '🎒'; if (k === 'crate') return '📦'; if (k === 'vault') return '🔐';
  const d = D.ITEMS[k]; return ITEM_IC[k] || (d ? CAT_IC[d.c] : '?');
}
const SLOTS = {back: 'Back', vest: 'Vest', jacket: 'Jacket', face: 'Face', feet: 'Feet', hands: 'Hands', suit: 'Suit', head: 'Head', belt: 'Belt'};

function renderInv() {
  const el = $('inv'); if (el.hidden || !inv || !D) return;
  let h = `<h2>Inventory <span class="small">${inv.inv.length}/${inv.cap} slots · click = use · right-click = drop (shift = all)</span></h2><h3>Weapons (1-5)</h3><div class="grid">`;
  inv.hb.forEach((s, i) => {
    if (!s) { h += `<div class="slot empty"><span class="ic">·</span>${i + 1}</div>`; return; }
    const w = WBY[s[0]]; const amt = w.count ? '×' + s[2] : w.mag ? s[1] + '/' + w.mag : '';
    h += `<div class="slot ${me && me.sel === i ? 'selw' : ''}" data-hb="${i}" title="${esc(w.name)} — ${esc(D.W[w.i].cat)}"><span class="ct">${amt}</span><span class="ic">${W_IC[w.cat]}</span>${esc(w.name)}</div>`;
  });
  h += `</div><h3>Backpack</h3><div class="grid">`;
  for (let i = 0; i < inv.cap; i++) {
    const it = inv.inv[i]; if (!it) { h += `<div class="slot empty"></div>`; continue; }
    const d = D.ITEMS[it[0]]; h += `<div class="slot" data-i="${i}" title="${esc(d.n)}${d.d ? ' — ' + esc(d.d) : ''}"><span class="ct">${it[1] > 1 ? it[1] : ''}</span><span class="ic">${itemIcon(it[0])}</span>${esc(d.n)}</div>`;
  }
  h += `</div><h3>Worn</h3><div>`;
  for (const [s, lab] of Object.entries(SLOTS)) {
    const k = inv.wear[s];
    h += k ? `<span class="chip click" data-uw="${s}" title="Click to take off">${lab}: ${itemIcon(k)} ${esc(D.ITEMS[k].n)}</span>` : `<span class="chip" style="opacity:.4">${lab}</span>`;
  }
  h += `</div><h3>Ammo pouch</h3><div>`;
  const am = Object.entries(inv.ammo).filter(a => a[1] > 0);
  h += am.length ? am.map(([k, n]) => `<span class="chip">${esc(D.AMMO[k].n)}: <b>${n}</b></span>`).join('') : '<span class="small">empty</span>';
  const pf = Object.keys(inv.pfx || {});
  h += `</div><h3>Carried gadgets</h3><div class="small">${pf.length ? pf.join(', ') : 'none'} — L light · N night vision</div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-i]').forEach(d => {
    const i = +d.dataset.i;
    d.onclick = () => {
      const k = inv.inv[i][0], it = D.ITEMS[k];
      if (it.u === 'place' || it.u === 'reinforce') {
        mode = {type: 'place', i, key: k, rot: 0}; el.hidden = true;
        toast('Click to place · Q/R rotate · right-click cancel');
      } else if (it.u === 'throw' || it.u === 'target') {
        mode = {type: 'throw', i, key: k}; el.hidden = true;
        toast('Click where to throw · right-click cancel');
      } else send({t: 'use', i});
    };
    d.oncontextmenu = e => { e.preventDefault(); send({t: 'drop', i, all: e.shiftKey}); };
  });
  el.querySelectorAll('[data-hb]').forEach(d => {
    const i = +d.dataset.hb;
    d.onclick = () => send({t: 'slot', v: i});
    d.oncontextmenu = e => { e.preventDefault(); send({t: 'dropw', s: i}); };
  });
  el.querySelectorAll('[data-uw]').forEach(d => d.onclick = () => send({t: 'unwear', s: d.dataset.uw}));
}

function renderCraft() {
  const el = $('craft'); if (el.hidden || !inv || !D) return;
  const have = k => inv.inv.filter(x => x[0] === k).reduce((a, x) => a + x[1], 0);
  let h = `<h2>Crafting</h2>`;
  D.RECIPES.forEach((r, i) => {
    const ok = Object.entries(r.in).every(([k, n]) => have(k) >= n);
    const out = r.out.startsWith('ammo_') ? `${D.AMMO[r.out.slice(5)].n} ×${D.AMMO[r.out.slice(5)].pick * r.n}` : D.ITEMS[r.out].n + (r.n > 1 ? ' ×' + r.n : '');
    h += `<div class="recipe"><div>${itemIcon(r.out)} <b>${esc(out)}</b><div class="need">${Object.entries(r.in).map(([k, n]) => `<span class="${have(k) >= n ? 'have' : 'miss'}">${esc(D.ITEMS[k].n)} ${have(k)}/${n}</span>`).join(' · ')}</div></div><button data-r="${i}" ${ok ? '' : 'disabled'}>Craft</button></div>`;
  });
  el.innerHTML = h;
  el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => send({t: 'craft', r: +b.dataset.r}));
}

function renderBoard() {
  const el = $('board'); if (!D) return;
  const modeName = {coop: 'Co-op vs Zombies', teams: 'Teams', ffa: 'Free-for-all'}[settings.mode];
  let h = `<h2>Survivors <span class="small">${esc(modeName)} · friendly fire ${settings.ff ? 'ON' : 'OFF'} · zombies ×${settings.density}</span></h2><table><tr><th>Name</th><th>Team</th><th>Zombie kills</th><th>Player kills</th><th>Deaths</th><th>Ping</th></tr>`;
  for (const r of [...board].sort((a, b) => (b[3] + b[4] * 10) - (a[3] + a[4] * 10))) {
    h += `<tr><td style="color:${r[0] === myId ? '#ffd166' : '#fff'}">${esc(r[1])}${r[7] ? ' ☠' : ''}</td><td style="color:${TEAMCOL[r[2]]}">${settings.mode === 'teams' ? D.TEAMS[r[2]] : '—'}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}ms</td></tr>`;
  }
  el.innerHTML = h + '</table>';
}

function renderMenu() {
  const el = $('menu'); if (!D) return; const s = settings;
  el.innerHTML = `<h2>Game menu</h2>
  <h3>Game mode (applies to everyone)</h3>
  <div>${[['coop', 'Co-op vs Zombies'], ['teams', 'Teams (PvPvE)'], ['ffa', 'Free-for-all (no teams)']].map(([k, n]) => `<button class="${s.mode === k ? 'sel' : 'alt'}" data-mode="${k}">${n}</button> `).join('')}</div>
  <label class="row"><input type="checkbox" id="mff" ${s.ff ? 'checked' : ''}> Friendly fire</label>
  <div class="row2"><label style="flex:1">Zombie density ×<b id="mdv">${s.density}</b><input type="range" id="mden" min="0.25" max="3" step="0.25" value="${s.density}"></label>
  <label style="flex:1">Day length<select id="mday">${[300, 600, 1200, 1800, 3600].map(v => `<option value="${v}" ${s.dayLen === v ? 'selected' : ''}>${v / 60} minutes</option>`).join('')}</select></label></div>
  ${s.mode === 'teams' ? `<h3>Choose your team</h3><div>${[1, 2, 3, 4].map(t => `<button class="alt" data-team="${t}" style="border:2px solid ${TEAMCOL[t]}">${D.TEAMS[t]}</button> `).join('')}</div>` : ''}
  <label>Volume <input type="range" id="mvol" min="0" max="1" step="0.05" value="${masterVol}"></label>
  <h3>Controls</h3>
  <div class="keys"><div><b>WASD</b> move / drive</div><div><b>Mouse</b> aim · <b>LMB</b> fire</div><div><b>RMB</b> scope / vehicle alt-gun</div><div><b>Shift</b> sprint / boost</div><div><b>1-5 · wheel</b> weapon</div><div><b>R</b> reload</div><div><b>E</b> pick up · enter/exit · claim plot</div><div><b>T</b> Shelter Tycoon</div><div><b>I</b> inventory · <b>C</b> craft</div><div><b>M</b> world map</div><div><b>F</b> quick heal · <b>V</b> eat/drink</div><div><b>L</b> light · <b>N</b> night vision</div><div><b>H</b> horn / siren · <b>X</b> switch seat</div><div><b>G</b> drop weapon · <b>Z</b> zoom</div><div><b>Enter</b> chat (/t team)</div><div><b>Tab</b> scoreboard</div><div><b>Esc</b> this menu</div></div>
  <p class="tip">Survive: harvest Scrap (⚙️) from zombies, supply drops, and wrecks. Upgrade your shelter plot to unlock automated sentries, passive scrap income, repair bays, and the Operation Exodus beacon!</p>
  <button id="mclose">Close</button>`;
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => send({t: 'settings', s: {mode: b.dataset.mode}}));
  el.querySelectorAll('[data-team]').forEach(b => b.onclick = () => send({t: 'team', v: +b.dataset.team}));
  $('mff').onchange = e => send({t: 'settings', s: {ff: e.target.checked}});
  $('mden').oninput = e => $('mdv').textContent = e.target.value;
  $('mden').onchange = e => send({t: 'settings', s: {density: +e.target.value}});
  $('mday').onchange = e => send({t: 'settings', s: {dayLen: +e.target.value}});
  $('mvol').oninput = e => { masterVol = +e.target.value; localStorage.setItem('dw_vol', masterVol); };
  $('mclose').onclick = () => el.hidden = true;
}

// ───────── Shelter Tycoon UI & Management ─────────
function initShelterUI() {
  const closeBtn = $('sh-close');
  if (closeBtn) closeBtn.onclick = () => $('shelter-modal').hidden = true;

  const catsContainer = $('sh-categories');
  if (catsContainer) {
    catsContainer.querySelectorAll('.cat-pill').forEach(btn => {
      btn.onclick = () => {
        catsContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTycoonCat = btn.dataset.cat;
        if (activePlot) renderShelterModal(activePlot);
      };
    });
  }
}

function toggleShelterTycoon() {
  const modal = $('shelter-modal');
  if (!modal.hidden) { modal.hidden = true; return; }
  // Check if near any plot first
  const nearPlot = findNearestPlot(pred.x, pred.y, 400);
  if (nearPlot) {
    send({t: 'get_plot', plotId: nearPlot.id});
  } else if (me && me.plotId) {
    send({t: 'get_plot', plotId: me.plotId});
  } else if (shelterPlots.length > 0) {
    // Open plot 1 as preview
    send({t: 'get_plot', plotId: shelterPlots[0].id});
  } else {
    toast('Locate a Shelter Plot (press M) to claim and upgrade your outpost!');
  }
}

function findNearestPlot(x, y, maxDist = 300) {
  let closest = null, bestD = maxDist;
  for (const p of shelterPlots) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; closest = p; }
  }
  return closest;
}

function renderShelterModal(plot) {
  if (!plot || !D || !D.UPGRADES) return;
  const modal = $('shelter-modal');
  modal.hidden = false;

  $('sh-title').textContent = `🏰 ${plot.name}`;
  const ownerLabel = plot.ownerName ? `Owned by ${esc(plot.ownerName)}` : 'UNCLAIMED — Free to claim';
  $('sh-subtitle').textContent = `Plot #${plot.id} · ${ownerLabel} · Region: ${regionName(plot.x, plot.y)}`;

  const myScrap = (me && me.scrap) || 0;
  $('sh-scrap-counter').textContent = myScrap;
  $('sh-level').textContent = plot.level || 1;

  // Passive income calculation
  const compactorLv = (plot.upgrades && plot.upgrades.scrap_compactor) || 0;
  const passive = compactorLv > 0 ? `+${compactorLv * 3} Scrap/s` : 'None (Build Compactor)';
  $('sh-income').textContent = passive;

  // Defense status
  const turretLv = (plot.upgrades && plot.upgrades.turret_1) || 0;
  $('sh-defense').textContent = turretLv > 0 ? `Active Sentries (${turretLv})` : 'Unarmed';

  // Beacon
  const beaconLv = (plot.upgrades && plot.upgrades.exodus_beacon) || 0;
  $('sh-beacon-stat').textContent = beaconLv > 0 ? `Stage ${beaconLv}/5 ACTIVATED` : 'Offline';

  // Grid of upgrades
  const grid = $('sh-upgrades-grid');
  let cardsHtml = '';

  // If plot is unclaimed and player is near it, show CLAIM button
  const isNear = Math.hypot(plot.x - pred.x, plot.y - pred.y) < 320;
  if (!plot.ownerName && isNear) {
    cardsHtml += `<div class="upgrade-card highlight-card">
      <div class="u-top"><span class="u-icon">🚩</span><span class="u-cat">Territory</span></div>
      <div class="u-name">Claim This Outpost</div>
      <div class="u-desc">Take ownership of this strategic plot and begin fortifying your persistent shelter!</div>
      <button class="upgrade-btn" id="btn-claim-plot">CLAIM OUTPOST NOW</button>
    </div>`;
  }

  const upgList = Object.values(D.UPGRADES);
  for (const u of upgList) {
    if (currentTycoonCat !== 'all' && u.cat !== currentTycoonCat) continue;
    const currentLv = (plot.upgrades && plot.upgrades[u.key]) || 0;
    const maxed = currentLv >= u.max;
    const cost = maxed ? 0 : Math.round(u.baseCost * Math.pow(u.costMult, currentLv));
    const canAfford = myScrap >= cost;

    cardsHtml += `<div class="upgrade-card ${maxed ? 'maxed' : ''}">
      <div class="u-top">
        <span class="u-icon">${u.icon}</span>
        <span class="u-cat">${esc(u.cat)}</span>
      </div>
      <div class="u-name">${esc(u.name)}</div>
      <div class="u-level">Level ${currentLv}/${u.max}</div>
      <div class="u-desc">${esc(u.desc)}</div>
      <div class="u-effect">✦ ${esc(u.effect)}</div>
      <div class="u-action">
        ${maxed ? `<button class="upgrade-btn maxed-btn" disabled>MAX LEVEL REACHED</button>` :
          `<button class="upgrade-btn ${canAfford ? 'can-buy' : 'need-scrap'}" data-upg="${u.key}" ${canAfford ? '' : 'disabled'}>
            UPGRADE · ${cost} ⚙️
          </button>`}
      </div>
    </div>`;
  }

  grid.innerHTML = cardsHtml;

  const claimBtn = $('btn-claim-plot');
  if (claimBtn) {
    claimBtn.onclick = () => {
      send({t: 'claim_plot', plotId: plot.id});
      claimBtn.disabled = true;
      claimBtn.textContent = 'Claiming…';
    };
  }

  grid.querySelectorAll('[data-upg]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.upg;
      send({t: 'upgrade_plot', plotId: plot.id, key});
      btn.disabled = true;
      btn.textContent = 'Purchasing…';
    };
  });
}

// ───────── Reborn Ascension UI & Matrix ─────────
function initRebornUI() {
  const closeBtn = $('rb-close');
  if (closeBtn) closeBtn.onclick = () => $('reborn-modal').hidden = true;

  const ascendBtn = $('btn-do-ascend');
  if (ascendBtn) {
    ascendBtn.onclick = () => {
      send({t: 'reborn_ascend'});
      ascendBtn.disabled = true;
      const txt = ascendBtn.querySelector('.btn-txt');
      if (txt) txt.textContent = 'Ascending…';
    };
  }
}

function toggleRebornModal(forceOpen = false) {
  const modal = $('reborn-modal');
  if (!modal) return;
  if (forceOpen) modal.hidden = false;
  else modal.hidden = !modal.hidden;
  if (!modal.hidden) renderRebornModal();
}

function renderRebornModal() {
  const modal = $('reborn-modal');
  if (!modal || !D || !D.REBORN_PERKS) return;

  const rebirths = (me && me.rebirths) || 0;
  const cores = (me && me.prestigeTokens) || 0;
  const perks = (me && me.rebornPerks) || [];

  $('rb-token-counter').textContent = cores;
  $('rb-tier-display').textContent = rebirths > 0 ? `ASCENDANT (TIER ${rebirths})` : 'MORTAL SURVIVOR (TIER 0)';
  $('rb-scrap-mult').textContent = `+${rebirths * 25}% Permanent Scrap Boost`;
  $('rb-perks-count').textContent = `${perks.length} / ${Object.keys(D.REBORN_PERKS).length} Unlocked`;

  const ascendBtn = $('btn-do-ascend');
  if (ascendBtn) {
    const canAscend = (me && ((me.plotLv && me.plotLv >= 4) || (activePlot && activePlot.beacon >= 5) || rebirths > 0));
    const tokenReward = 15 + rebirths * 5;
    ascendBtn.disabled = !canAscend;
    const txt = ascendBtn.querySelector('.btn-txt');
    if (txt) {
      txt.textContent = canAscend
        ? `⚡ ASCEND NOW (+${tokenReward} ⚛️ CORES)`
        : 'LOCKED (Reach Outpost Lv.4+ or Activate Exodus Beacon)';
    }
  }

  const grid = $('rb-perks-grid');
  let cardsHtml = '';
  for (const [key, p] of Object.entries(D.REBORN_PERKS)) {
    const unlocked = perks.includes(key);
    const canAfford = cores >= p.cost;

    cardsHtml += `<div class="reborn-card ${unlocked ? 'unlocked' : ''}">
      <div class="rb-top">
        <span class="rb-icon">${p.icon}</span>
        <div class="rb-title-wrap">
          <div class="rb-name">${esc(p.name)}</div>
          <div class="rb-cat">${esc(p.tier)}</div>
        </div>
        <span class="rb-badge ${unlocked ? 'active' : ''}">${unlocked ? 'ACTIVE' : p.cost + ' ⚛️'}</span>
      </div>
      <div class="rb-desc">${esc(p.desc)}</div>
      <div class="rb-effect">✦ ${esc(p.effect)}</div>
      <div class="rb-action">
        ${unlocked
          ? `<button class="rb-btn unlocked-btn" disabled>✓ PERMANENTLY UNLOCKED</button>`
          : `<button class="rb-btn ${canAfford ? 'can-buy' : 'need-cores'}" data-perk="${key}" ${canAfford ? '' : 'disabled'}>
              UNLOCK WITH ${p.cost} ⚛️ CORES
            </button>`
        }
      </div>
    </div>`;
  }

  grid.innerHTML = cardsHtml;
  grid.querySelectorAll('[data-perk]').forEach(btn => {
    btn.onclick = () => {
      const perkKey = btn.dataset.perk;
      send({t: 'buy_reborn_perk', perk: perkKey});
      btn.disabled = true;
      btn.textContent = 'Unlocking Matrix…';
    };
  });
}

// ───────── audio (synthesised) ─────────
let AC = null, NB = null; const sfxT = {};
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const len = AC.sampleRate;
      NB = AC.createBuffer(1, len, AC.sampleRate);
      const d = NB.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {}
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function sfx(type, x, y, vol = 1) {
  const a = AC; if (!a || masterVol <= 0) return;
  const now = performance.now();
  if (now - (sfxT[type] || 0) < (type === 'shot' ? 35 : 60)) return; sfxT[type] = now;
  let v = vol * masterVol;
  if (x !== undefined) {
    const d = Math.hypot(x - camX, y - camY);
    v *= Math.max(0, 1 - d / 2600);
  }
  if (v < 0.02) return;
  const t = a.currentTime, out = a.createGain(); out.connect(a.destination);
  const noise = (dur, f1, f2, q = 1, type2 = 'lowpass') => {
    const s = a.createBufferSource(); s.buffer = NB;
    const f = a.createBiquadFilter(); f.type = type2;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    f.Q.value = q; s.connect(f); f.connect(out);
    s.start(t); s.stop(t + dur);
  };
  const tone = (wave, f1, f2, dur) => {
    const o = a.createOscillator(); o.type = wave;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    o.connect(out); o.start(t); o.stop(t + dur);
  };
  const env = (peak, dur) => {
    out.gain.setValueAtTime(peak * v, t);
    out.gain.exponentialRampToValueAtTime(0.001, t + dur);
  };
  switch (type) {
    case 'shot': env(0.35, 0.12); noise(0.12, 4000, 300); break;
    case 'heavy': env(0.5, 0.35); noise(0.35, 1800, 80); tone('sine', 90, 40, 0.3); break;
    case 'beam': env(0.15, 0.15); tone('sawtooth', 1400, 900, 0.15); break;
    case 'boom': env(0.8, 1.2); noise(1.2, 900, 40); tone('sine', 70, 25, 1); break;
    case 'zap': env(0.25, 0.2); tone('square', 900, 120, 0.2); break;
    case 'groan': env(0.12, 0.5); tone('sawtooth', 110 + Math.random() * 40, 70, 0.5); break;
    case 'hit': env(0.15, 0.06); noise(0.06, 2500, 800); break;
    case 'pick': env(0.12, 0.09); tone('sine', 660, 990, 0.09); break;
    case 'reload': env(0.18, 0.18); noise(0.05, 3000, 2000, 5, 'bandpass'); setTimeout(() => sfx('click', x, y, vol), 140); break;
    case 'click': env(0.15, 0.05); noise(0.05, 3500, 2500, 6, 'bandpass'); break;
    case 'horn': env(0.3, 0.45); tone('sawtooth', 380, 370, 0.45); tone('sawtooth', 480, 470, 0.45); break;
    case 'thunder': env(0.9, 2.2); noise(2.2, 300, 30); break;
    case 'scream': env(0.3, 0.8); tone('sawtooth', 700, 1500, 0.8); break;
    case 'swing': env(0.15, 0.15); noise(0.15, 1200, 3000, 2, 'bandpass'); break;
    case 'pop': env(0.3, 0.08); noise(0.08, 5000, 1500); break;
    case 'event': env(0.2, 1.2); tone('sine', 220, 440, 1.2); tone('triangle', 330, 660, 1.2); break;
    case 'warn': env(0.25, 0.6); tone('square', 880, 880, 0.15); break;
  }
}

// ───────── events → visuals ─────────
function addFx(o) { o.t0 = performance.now(); fxs.push(o); if (fxs.length > 400) fxs.shift(); }
function addDecal(x, y, kind, r, a = Math.random() * 6.28) {
  decals.push({x, y, kind, r, t0: performance.now(), a});
  if (decals.length > 350) decals.shift();
}
function burst(x, y, n, col, spd, life, size) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = spd * (0.3 + Math.random());
    particles.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, t: life, col, size: size * (0.5 + Math.random())});
  }
  if (particles.length > 900) particles.splice(0, particles.length - 900);
}

function handleEvent(d) {
  const k = d[0];
  switch (k) {
    case 'sc_add':
      floaters.push({text: `+${d[1]} ⚙️`, x: d[2], y: d[3], col: '#ffd166', t0: performance.now(), life: 1400});
      sfx('pick', d[2], d[3], 0.7);
      break;
    case 'tr': {
      const heavy = d[5] === 3;
      addFx({k: 'tr', x1: d[1], y1: d[2], x2: d[3], y2: d[4], kind: d[5], life: d[5] === 2 ? 70 : 90});
      addFx({k: 'flash', x: d[1], y: d[2], r: heavy ? 120 : 70, life: 60});
      sfx(d[5] === 2 ? 'beam' : heavy ? 'heavy' : 'shot', d[1], d[2]);
      break;
    }
    case 'ex': {
      const r = d[3];
      addFx({k: 'ex', x: d[1], y: d[2], r, fx: d[4], life: 650 + r});
      addFx({k: 'flash', x: d[1], y: d[2], r: r * 2.4, life: 300});
      burst(d[1], d[2], Math.min(60, 10 + r / 6), d[4] === 'toxic' ? '#9acd32' : d[4] === 'smoke' ? '#999' : '#ffb347', r * 1.6, 700, 6);
      if (d[4] !== 'smoke' && d[4] !== 'flash') addDecal(d[1], d[2], 'scorch', r * 0.6);
      const dist = Math.hypot(d[1] - camX, d[2] - camY);
      shake = Math.max(shake, clamp(r / 8 * (1 - dist / 2200), 0, 30));
      sfx(r > 60 ? 'boom' : 'pop', d[1], d[2], clamp(r / 150, 0.4, 1.5));
      if (d[4] === 'flash' && dist < r) flashWhite = performance.now();
      break;
    }
    case 'bl':
      burst(d[1], d[2], 4, '#8a0f0f', 120, 400, 3);
      if (Math.random() < 0.4) addDecal(d[1] + (Math.random() - 0.5) * 20, d[2] + (Math.random() - 0.5) * 20, 'blood', 8 + Math.random() * 10);
      sfx('hit', d[1], d[2], 0.6);
      break;
    case 'zd':
      addDecal(d[1], d[2], 'corpse', D.ZD[D.ZLIST[d[3]]].r);
      burst(d[1], d[2], 8, '#5a0b0b', 160, 500, 4);
      break;
    case 'sw': {
      const p = latest && latest.P.get(d[1]);
      addFx({k: 'sw', pid: d[1], x: p ? p[1] : 0, y: p ? p[2] : 0, a: d[2], r: d[3], arc: d[4], life: 160});
      sfx('swing', p && p[1], p && p[2]);
      break;
    }
    case 'wa':
      warns.push({x: d[1], y: d[2], r: d[3], t0: performance.now(), until: performance.now() + d[4], meteor: d[5]});
      sfx('warn', d[1], d[2], 1.5);
      break;
    case 'lt':
      addFx({k: 'lt', x: d[1], y: d[2], life: 350, seed: Math.random()});
      addFx({k: 'flash', x: d[1], y: d[2], r: 900, life: 200});
      lightningFlash = performance.now();
      setTimeout(() => sfx('thunder', d[1], d[2], 1.5), 200);
      addDecal(d[1], d[2], 'scorch', 40);
      break;
    case 'sc': addFx({k: 'ring', x: d[1], y: d[2], r: 600, col: '#c77dff', life: 900}); sfx('scream', d[1], d[2]); break;
    case 'gy': burst(d[1], d[2], 50, '#e8f4ff', 260, 1400, 7); addFx({k: 'ring', x: d[1], y: d[2], r: 100, col: '#fff', life: 600}); sfx('heavy', d[1], d[2], 0.6); break;
    case 'zp': addFx({k: 'zap', x1: d[1], y1: d[2], x2: d[3], y2: d[4], life: 140}); sfx('zap', d[1], d[2]); break;
    case 'cn':
      addFx({k: 'cn', x: d[1], y: d[2], a: d[3], r: d[4], arc: d[5], kind: d[6], life: 140});
      if (d[6] === 1) burst(d[1] + Math.cos(d[3]) * 60, d[2] + Math.sin(d[3]) * 60, 6, '#9fd3ff', 500, 500, 4);
      break;
    case 'dr': drops.push({x: d[1], y: d[2], t: performance.now()}); break;
    case 'dl': burst(d[1], d[2], 30, '#d9c8a0', 200, 800, 6); break;
    case 'rl': sfx('reload', latest && latest.P.get(d[1]) ? latest.P.get(d[1])[1] : undefined, latest && latest.P.get(d[1]) ? latest.P.get(d[1])[2] : undefined, 0.8); break;
    case 'hn': { const v = latest && latest.V.get(d[1]); sfx('horn', v && v[2], v && v[3]); break; }
    case 'za': if (Math.random() < 0.35) { const z = latest && latest.Z.get(d[1]); sfx('groan', z && z[2], z && z[3]); } break;
    case 'pl': sfx('click', d[1], d[2]); burst(d[1], d[2], 8, '#bbb', 80, 300, 3); break;
    case 'sd': burst(d[1], d[2], 20, '#8b5a2b', 220, 700, 5); sfx('hit', d[1], d[2]); break;
    case 'lu': if (d[3]) { for (let i = 0; i < 6; i++) setTimeout(() => { burst(d[1], d[2], 6, '#ffeb3b', 200, 300, 3); sfx('pop', d[1], d[2]); }, i * 250); } break;
    case 'sl': addFx({k: 'ring', x: d[1], y: d[2], r: d[3], col: '#ff5a36', life: 500}); shake = Math.max(shake, 14); sfx('boom', d[1], d[2], 0.8); break;
    case 'cr': burst(d[1], d[2], 10, '#ccc', 200, 400, 3); sfx('hit', d[1], d[2], 1.2); break;
    case 'wh': addFx({k: 'ring', x: latest.P.get(d[1]) ? latest.P.get(d[1])[1] : 0, y: latest.P.get(d[1]) ? latest.P.get(d[1])[2] : 0, r: 400, col: '#ffd166', life: 800}); break;
    case 'ph': if (d[1] === myId) flashWhite = performance.now() - 250; sfx('click'); break;
  }
}
let lightningFlash = 0, flashWhite = 0;

// ───────── frame loop ─────────
let lastFrame = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now; frameN++; chunkBuilds = 0;
  try {
    if (latest && me) {
      updateLocal(dt, now);
      render(now, dt);
    }
  } catch (e) {
    console.error(e);
  }
  cv.classList.toggle('ui-active', uiBlock());
  requestAnimationFrame(frame);
}

function updateLocal(dt, now) {
  let mx = 0, my = 0;
  if (!uiBlock()) {
    mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  }
  const sprint = !!(keys.ShiftLeft || keys.ShiftRight);
  const brake = !!(keys.Space);
  if (!me.dead && !me.veh) {
    const l = Math.hypot(mx, my), nx = l ? mx / l : 0, ny = l ? my / l : 0;
    const tileProp = D.TILES[tileAt(pred.x, pred.y)];
    const walk = (tileProp && tileProp.walk) || 1;
    const spd = me.spd * walk * (sprint && me.st > 1 && l ? 1.45 : 1);
    moveCircle(pred, nx * spd * dt + me.pl[0] * dt, ny * spd * dt + me.pl[1] * dt, 16);
  } else if (me.veh && latest) {
    const iv = myVehicle(now);
    if (iv) {
      pred.x = iv.x;
      pred.y = iv.y;
    }
  }
  if (now - lastSend >= 33) {
    lastSend = now; const w = worldMouse(); const block = uiBlock() || !!mode;
    send({
      t: 'in', mx, my, ax: Math.round(w.x), ay: Math.round(w.y),
      f: mouse.l && !block ? 1 : 0, al: mouse.r && !block ? 1 : 0,
      sp: sprint ? 1 : 0,
      brk: brake ? 1 : 0,
      x: Math.round(pred.x * 10) / 10, y: Math.round(pred.y * 10) / 10,
      ps: pred.ps
    });
  }
}

// Enhanced vehicle state with velocity extrapolation
function myVehicle(now) {
  const v = latest.V.get(me.veh); if (!v) return null;
  const age = Math.min(0.12, (now - latest.t) / 1000);
  const a = v[4] / 100;
  const vx = v[10] !== undefined ? v[10] : Math.cos(a) * v[8];
  const vy = v[11] !== undefined ? v[11] : Math.sin(a) * v[8];
  return {
    x: v[2] + vx * age,
    y: v[3] + vy * age,
    a, v, vx, vy, speed: Math.hypot(vx, vy)
  };
}

// ───────── light / time helpers ─────────
function daylight() {
  const d = Math.cos((gameTime - 0.5) * Math.PI * 2);
  let l = clamp((d + 0.15) / 0.45, 0, 1);
  const f = fxNow();
  if (f.has('midnightsun')) l = Math.max(l, 0.8);
  if (f.has('polarnight') || f.has('eclipse')) l = Math.min(l, 0.15);
  return l;
}
function fxNow() {
  const s = new Set();
  if (sky) s.add(sky.fx);
  if (cosmic) s.add(cosmic.fx);
  return s;
}
function clockStr() {
  const m = Math.floor(gameTime * 24 * 60), h = Math.floor(m / 60) % 24;
  return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

// ───────── rendering ─────────
function render(now, dt) {
  const {a, b, u} = interpState();
  const myP = latest.P.get(myId);
  let selfX = pred.x, selfY = pred.y, inVeh = null;
  if (me.veh) { inVeh = myVehicle(now); if (inVeh) { selfX = inVeh.x; selfY = inVeh.y; } }

  // Camera
  const scoped = myP && (myP[8] & 256);
  const base = Math.max(VW, VH) / 1900;
  let zt = base * userZoom;
  if (inVeh) zt *= clamp(0.9 - inVeh.v[8] / 5000, 0.62, 0.9);
  if (inVeh && (inVeh.v[7] & 8)) zt *= 0.75;
  if (scoped) zt *= 0.68;
  zoom = lerp(zoom, zt, Math.min(1, dt * 4));
  let tx = selfX, ty = selfY;
  if (scoped) { tx += (mouse.x - VW / 2) / zoom * 0.7; ty += (mouse.y - VH / 2) / zoom * 0.7; }
  camX = lerp(camX || tx, tx, Math.min(1, dt * (scoped ? 6 : 14)));
  camY = lerp(camY || ty, ty, Math.min(1, dt * (scoped ? 6 : 14)));
  if (Math.hypot(camX - tx, camY - ty) > 1500) { camX = tx; camY = ty; }

  shake *= Math.pow(0.02, dt);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (VW / 2 - camX * zoom + sx), DPR * (VH / 2 - camY * zoom + sy));
  const vx0 = camX - VW / 2 / zoom - 120, vy0 = camY - VH / 2 / zoom - 120, vx1 = camX + VW / 2 / zoom + 120, vy1 = camY + VH / 2 / zoom + 120;
  const inView = (x, y, r = 0) => x > vx0 - r && x < vx1 + r && y > vy0 - r && y < vy1 + r;

  // Terrain chunks
  const CW = CH * TS;
  for (let cy = Math.floor(vy0 / CW); cy <= Math.floor(vy1 / CW); cy++) {
    for (let cx = Math.floor(vx0 / CW); cx <= Math.floor(vx1 / CW); cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= MW || cy * CH >= MH) continue;
      const c = getChunk(cx, cy);
      if (c) ctx.drawImage(c, cx * CW, cy * CW, CW, CW);
      else {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mini, cx * CH, cy * CH, CH, CH, cx * CW, cy * CW, CW, CW);
        ctx.imageSmoothingEnabled = true;
      }
    }
  }

  // Draw 16 Persistent Shelter Plots
  drawShelterPlots(now, inView, selfX, selfY);

  // Draw enterable building interiors and active doorway portals
  drawBuildingInteriors(now, inView, selfX, selfY);

  // Decals (tire skids, blood, scorch, corpses)
  for (const d of decals) {
    if (!inView(d.x, d.y, 60)) continue;
    const age = (now - d.t0) / 1000;
    const maxLife = d.kind === 'corpse' ? 45 : d.kind === 'skid' ? 30 : 90;
    const al = clamp(1 - age / maxLife, 0, 1);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    if (d.kind === 'skid') {
      ctx.fillStyle = 'rgba(15,15,15,.45)';
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
      ctx.fillRect(-6, -d.r / 2, 12, d.r);
      ctx.restore();
    } else if (d.kind === 'blood') {
      ctx.fillStyle = '#5c0a0a'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, d.a, 0, 7); ctx.fill();
    } else if (d.kind === 'scorch') {
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, 'rgba(10,8,6,.7)'); g.addColorStop(1, 'rgba(10,8,6,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = '#3d2a22'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, d.a, 0, 7); ctx.fill();
      ctx.fillStyle = '#5c0a0a'; ctx.beginPath(); ctx.arc(d.x + 4, d.y + 2, d.r * 0.6, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Ground effects
  for (const e of effects) {
    const [id, type, x, y, r] = e; if (!inView(x, y, r)) continue;
    if (type === 'acid') {
      ctx.fillStyle = 'rgba(150,220,40,.45)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    } else if (type === 'crater') {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(20,15,10,.85)'); g.addColorStop(0.7, 'rgba(60,120,20,.35)'); g.addColorStop(1, 'rgba(60,120,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    } else if (type === 'fire') {
      for (let k = 0; k < 6; k++) {
        const a2 = id * 1.7 + k, rr = r * (0.3 + 0.6 * hsh(id, k));
        const fx2 = x + Math.cos(a2) * rr * 0.7, fy2 = y + Math.sin(a2) * rr * 0.7, fl = 18 + Math.sin(now / 90 + k) * 6;
        ctx.fillStyle = `rgba(255,${120 + k * 15},20,.55)`; ctx.beginPath(); ctx.arc(fx2, fy2, fl, 0, 7); ctx.fill();
      }
      if (Math.random() < 0.3) burst(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, 1, '#ff8c1a', 40, 600, 5);
    } else if (type === 'mine') {
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = (now % 1000 < 500) ? '#ff2020' : '#400'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    } else if (type === 'light') {
      ctx.fillStyle = '#5dff6a'; ctx.fillRect(x - 3, y - 8, 6, 16);
    } else if (type === 'flare') {
      ctx.fillStyle = '#ff2b2b'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      if (Math.random() < 0.5) burst(x, y, 1, '#ff6b6b', 30, 700, 4);
    } else if (type === 'lure') {
      const ph = (now % 900) / 900;
      ctx.strokeStyle = `rgba(255,220,80,${1 - ph})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20 + ph * 90, 0, 7); ctx.stroke();
    }
  }

  // Items
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of items.values()) {
    if (!inView(it.x, it.y)) continue;
    const bob = Math.sin(now / 400 + it.id) * 2;
    const big = it.k === 'crate' || it.k === 'vault' || it.k === 'bag';
    ctx.fillStyle = it.k === 'vault' ? 'rgba(80,60,10,.9)' : it.k.startsWith('w:') ? 'rgba(60,20,20,.85)' : 'rgba(15,20,25,.8)';
    ctx.strokeStyle = it.k === 'vault' ? '#ffd166' : it.k.startsWith('w:') ? '#ff6b6b' : it.k === 'crate' ? '#ffd166' : '#5aa9e6';
    ctx.lineWidth = 2;
    const s = big ? 18 : 13;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(it.x - s, it.y - s + bob, s * 2, s * 2, 5) : ctx.rect(it.x - s, it.y - s + bob, s * 2, s * 2);
    ctx.fill(); ctx.stroke();
    ctx.font = `${big ? 20 : 15}px sans-serif`; ctx.fillStyle = '#fff';
    ctx.fillText(itemIcon(it.k), it.x, it.y + bob + 1);
  }

  // Structures
  for (const s of structs.values()) {
    if (!inView(s.x, s.y, 80)) continue;
    const d = D.STRUCTS[s.k];
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(s.x - s.w / 2 + 4, s.y - s.h / 2 + 4, s.w, s.h);
    ctx.globalAlpha = d.door && s.open ? 0.35 : 1;
    ctx.fillStyle = d.c; ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = settings.mode === 'teams' ? TEAMCOL[s.team] : 'rgba(0,0,0,.6)';
    ctx.lineWidth = 2; ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    if (s.k === 'chainlink') {
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
      for (let k = -s.w / 2; k < s.w / 2; k += 8) {
        ctx.beginPath(); ctx.moveTo(s.x + k, s.y - s.h / 2); ctx.lineTo(s.x + k + 8, s.y + s.h / 2); ctx.stroke();
      }
    }
    if (s.k === 'spike') {
      ctx.fillStyle = '#ccc';
      for (let a2 = 0; a2 < 9; a2++) {
        const px = s.x - s.w / 2 + 10 + (a2 % 3) * 25, py = s.y - s.h / 2 + 10 + Math.floor(a2 / 3) * 25;
        ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 6, py + 6); ctx.lineTo(px - 6, py + 6); ctx.fill();
      }
    }
    if (s.k === 'tesla') {
      ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.arc(s.x, s.y, 8 + Math.sin(now / 80) * 2, 0, 7); ctx.fill();
    }
    if (d.water && s.wat) {
      ctx.fillStyle = '#7fd1ff'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill();
    }
    if (s.hp < 100) {
      ctx.fillStyle = '#000'; ctx.fillRect(s.x - 20, s.y - s.h / 2 - 10, 40, 4);
      ctx.fillStyle = s.hp > 50 ? '#7bd389' : s.hp > 25 ? '#ffd166' : '#ff6b6b';
      ctx.fillRect(s.x - 20, s.y - s.h / 2 - 10, 40 * s.hp / 100, 4);
    }
  }

  // Vehicles (ground)
  const vlist = [];
  for (const [id, v] of b.V) {
    let x, y, an;
    if (id === me.veh && inVeh) {
      x = inVeh.x; y = inVeh.y; an = inVeh.a;
      // Add tire skid decals when turning or drifting at high speed
      if (inVeh.speed > 190 && (keys.KeyA || keys.KeyD || keys.KeyS)) {
        addDecal(x - Math.cos(an) * 20, y - Math.sin(an) * 20, 'skid', 18, an);
        if (Math.random() < 0.4) burst(x, y, 2, '#444', 60, 400, 3);
      }
    } else {
      [x, y, an] = lerpArr(a.V.get(id), v, u, 2, 3, 4, 100);
    }
    if (!inView(x, y, 120)) continue;
    vlist.push([v, x, y, an]);
  }
  for (const [v, x, y, an] of vlist) if (!(v[7] & 8)) drawVehicle(v, x, y, an, now, selfX, selfY);

  // Zombies
  for (const [id, z] of b.Z) {
    const [x, y, an] = lerpArr(a.Z.get(id), z, u, 2, 3, 4, 10);
    if (!inView(x, y, 60)) continue;
    drawZombie(z, x, y, an, now);
  }

  // Players
  for (const [id, p] of b.P) {
    if (p[7]) continue;
    let x, y, an;
    if (id === myId) {
      x = pred.x; y = pred.y; const w = worldMouse(); an = Math.atan2(w.y - y, w.x - x);
    } else {
      [x, y, an] = lerpArr(a.P.get(id), p, u, 1, 2, 3, 100);
    }
    if (!inView(x, y, 60)) continue;
    drawPlayer(p, x, y, an, id === myId, now);
  }

  // Projectiles
  for (const [id, r] of b.R) {
    const A = a.R.get(id);
    const x = A ? lerp(A[2], r[2], u) : r[2], y = A ? lerp(A[3], r[3], u) : r[3];
    const an = r[4] / 100, z = r[5] / 100;
    if (!inView(x, y, 40)) continue;
    drawProj(r[1], x, y, an, z, now);
  }

  // Flying helicopters
  for (const [v, x, y, an] of vlist) if (v[7] & 8) drawVehicle(v, x, y, an, now, selfX, selfY);

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.t -= dt * 1000;
    if (p.t <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    if (!inView(p.x, p.y)) continue;
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Transient fx
  for (let i = fxs.length - 1; i >= 0; i--) {
    const f = fxs[i], age = now - f.t0;
    if (age > f.life) { fxs.splice(i, 1); continue; }
    drawFx(f, age / f.life, now);
  }

  // Floating scrap & damage numbers
  for (let i = floaters.length - 1; i >= 0; i--) {
    const fl = floaters[i];
    const age = now - fl.t0;
    if (age > fl.life) { floaters.splice(i, 1); continue; }
    const p = age / fl.life;
    const fy = fl.y - p * 38;
    ctx.save();
    ctx.globalAlpha = clamp(1 - p * 0.9, 0, 1);
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(fl.text, fl.x, fy);
    ctx.fillStyle = fl.col;
    ctx.fillText(fl.text, fl.x, fy);
    ctx.restore();
  }

  // Weather clouds & warnings
  for (const e of effects) {
    const [id, type, x, y, r, left] = e; if (!inView(x, y, r + 200)) continue;
    if (type === 'smoke' || type === 'toxic') {
      const col = type === 'smoke' ? '170,170,170' : '140,200,40';
      for (let k = 0; k < 7; k++) {
        const a2 = id + k * 0.9 + now / 4000, rr = r * 0.55 * hsh(id, k);
        const cx2 = x + Math.cos(a2) * rr, cy2 = y + Math.sin(a2) * rr, cr = r * (0.35 + 0.25 * hsh(k, id));
        const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cr);
        g.addColorStop(0, `rgba(${col},${type === 'smoke' ? 0.55 : 0.3})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, 7); ctx.fill();
      }
    } else if (type === 'drop') {
      const t2 = clamp(left / 100, 0, 1); const yy = y - t2 * 400;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 30 * (1 - t2 * 0.5), 15 * (1 - t2 * 0.5), 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(x, yy - 60, 50, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 50, yy - 60); ctx.lineTo(x, yy); ctx.lineTo(x + 50, yy - 60); ctx.stroke();
      ctx.fillStyle = '#8b6a3a'; ctx.fillRect(x - 18, yy - 18, 36, 36);
    }
  }

  // Strike warnings
  for (let i = warns.length - 1; i >= 0; i--) {
    const w = warns[i]; if (now > w.until + 300) { warns.splice(i, 1); continue; }
    if (!inView(w.x, w.y, w.r)) continue;
    const left = Math.max(0, (w.until - now) / 1000);
    ctx.strokeStyle = w.meteor ? 'rgba(255,170,0,.85)' : 'rgba(255,40,40,.85)';
    ctx.lineWidth = 6; ctx.setLineDash([24, 14]);
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, now / 400, now / 400 + 6.28); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,40,40,${0.08 + 0.08 * Math.sin(now / 100)})`;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.fillText(left.toFixed(1), w.x, w.y);
  }

  // Landmark labels
  drawLabels(inView);

  // Lighting & weather (screen space)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawLighting(b, a, u, now, selfX, selfY, inVeh, vlist);
  drawWeather(now, dt);
  drawHUD(now, selfX, selfY, inVeh, b);
}

// ───────── enterable building interiors and doorway rendering ─────────
function drawBuildingInteriors(now, inView, selfX, selfY) {
  if (!M || !M.rects) return;
  const nearby = rectsIn(selfX - 850, selfY - 850, selfX + 850, selfY + 850);
  for (const idx of nearby) {
    const r = M.rects[idx];
    const [x, y, w, h] = r;
    if (w < 64 || h < 64) continue;
    const isInside = selfX >= x && selfX <= x + w && selfY >= y && selfY <= y + h;
    const distToCenter = Math.hypot(selfX - (x + w / 2), selfY - (y + h / 2));
    const isLarge = w > 180 || h > 180;
    const doorW = Math.min(w * 0.55, isLarge ? 104 : 72);
    const doorX0 = x + (w - doorW) / 2;
    const doorX1 = doorX0 + doorW;
    const distToDoor = Math.hypot(selfX - (x + w / 2), selfY - (y + h));

    if (isInside || distToCenter < Math.max(w, h) * 0.72) {
      // ═════════ 1. HIGH-DETAIL INTERIOR MAP SYSTEM ═════════
      ctx.save();

      // Ambient indoor shadow fill
      ctx.fillStyle = '#14171d';
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);

      // Floor tiles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let tx = x + 16; tx < x + w - 10; tx += 20) {
        ctx.beginPath(); ctx.moveTo(tx, y + 6); ctx.lineTo(tx, y + h - 6); ctx.stroke();
      }
      for (let ty = y + 16; ty < y + h - 10; ty += 20) {
        ctx.beginPath(); ctx.moveTo(x + 6, ty); ctx.lineTo(x + w - 6, ty); ctx.stroke();
      }

      // Interior partition walls dividing rooms
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 5;

      if (w > 120 && h > 100) {
        const midX = x + Math.floor(w * 0.52);
        const midY = y + Math.floor(h * 0.48);

        // Vertical interior wall with open doorway
        ctx.beginPath();
        ctx.moveTo(midX, y + 6);
        ctx.lineTo(midX, midY - 24);
        ctx.moveTo(midX, midY + 24);
        ctx.lineTo(midX, y + h - 6);
        ctx.stroke();

        // Horizontal interior wall with doorway
        ctx.beginPath();
        ctx.moveTo(x + 6, midY);
        ctx.lineTo(midX - 22, midY);
        ctx.stroke();

        // Room Labels painted on the floor
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('[ RECEPTION ]', (x + midX) / 2, y + h - 28);
        ctx.fillText('[ ARMORY / AMMO ]', (x + midX) / 2, (y + midY) / 2);
        ctx.fillText('[ MED BAY & SURGERY ]', (midX + x + w) / 2, (y + midY) / 2);
        ctx.fillText('[ STORAGE VAULT ]', (midX + x + w) / 2, y + h - 28);

        // Reception Counter & Office Desk
        ctx.fillStyle = '#452b1e';
        ctx.fillRect(x + 16, y + h - 42, 34, 12);
        ctx.strokeStyle = '#6b432a'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 16, y + h - 42, 34, 12);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 22, y + h - 40, 10, 3);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 23, y + h - 43, 8, 3);

        // Armory Gun Racks & Weapon Crate (Northwest Room)
        ctx.fillStyle = '#1e2430'; ctx.fillRect(x + 14, y + 14, 40, 14);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.strokeRect(x + 14, y + 14, 40, 14);
        ctx.fillStyle = '#d97706'; ctx.fillRect(x + 18, y + 18, 16, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 36, y + 18, 14, 6);

        // Medical Bay Stretcher Bed & Medkit (Northeast Room)
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(midX + 16, y + 16, 32, 16);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(midX + 16, y + 16, 32, 16);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(midX + 28, y + 20, 8, 8);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(midX + 30, y + 22, 4, 4);

        // Storage Pallets & Shelving (Southeast Room)
        ctx.fillStyle = '#78350f'; ctx.fillRect(midX + 20, y + h - 44, 28, 22);
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.strokeRect(midX + 20, y + h - 44, 28, 22);
      }

      // Ceiling Light Fixtures with glowing illumination cones
      const lightX = x + w / 2, lightY = y + h / 2;
      const lGrad = ctx.createRadialGradient(lightX, lightY, 4, lightX, lightY, Math.max(w, h) * 0.65);
      lGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      lGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
      lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lGrad;
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);

      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(lightX, lightY, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lightX, lightY, 8 + Math.sin(now / 300) * 1.5, 0, 7); ctx.stroke();

      ctx.restore();
    } else {
      // ═════════ 2. EXTERIOR ROOF (WHEN OUTSIDE) ═════════
      ctx.save();
      ctx.fillStyle = '#1c222b';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'; ctx.lineWidth = 1;
      for (let rx = x + 12; rx < x + w - 10; rx += 12) {
        ctx.beginPath(); ctx.moveTo(rx, y + 4); ctx.lineTo(rx, y + h - 8); ctx.stroke();
      }
      if (w > 80 && h > 80) {
        ctx.fillStyle = '#334155'; ctx.fillRect(x + 16, y + 16, 24, 20);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.strokeRect(x + 16, y + 16, 24, 20);
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x + 28, y + 26, 6, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // ═════════ 3. DOORWAY THRESHOLD & EXIT PORTAL ═════════
    ctx.save();
    ctx.fillStyle = '#14171d';
    ctx.fillRect(doorX0, y + h - 18, doorW, 24);

    const exitPhase = (now % 800) / 800;
    ctx.fillStyle = isInside ? 'rgba(77, 255, 136, 0.25)' : 'rgba(0, 229, 255, 0.25)';
    ctx.fillRect(doorX0 + 4, y + h - 6, doorW - 8, 10);
    ctx.strokeStyle = isInside ? '#4dff88' : '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(doorX0 + 4, y + h - 6, doorW - 8, 10);

    if (distToDoor < 140) {
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      const label = isInside ? '🚪 [EXIT TO WASTELAND]' : '🚪 [ENTER BUILDING]';
      const tw = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(8, 12, 18, 0.9)';
      ctx.fillRect(x + w / 2 - tw / 2, y + h + 8, tw, 22);
      ctx.strokeStyle = isInside ? '#4dff88' : '#00e5ff'; ctx.lineWidth = 1.2;
      ctx.strokeRect(x + w / 2 - tw / 2, y + h + 8, tw, 22);
      ctx.fillStyle = isInside ? '#4dff88' : '#00e5ff';
      ctx.fillText(label, x + w / 2, y + h + 22);

      const arrowY = y + h - (isInside ? 4 : 12) + (isInside ? exitPhase * 8 : -exitPhase * 8);
      ctx.strokeStyle = isInside ? `rgba(77, 255, 136, ${1 - exitPhase})` : `rgba(0, 229, 255, ${1 - exitPhase})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (isInside) {
        ctx.moveTo(x + w / 2 - 8, arrowY - 4); ctx.lineTo(x + w / 2, arrowY + 4); ctx.lineTo(x + w / 2 + 8, arrowY - 4);
      } else {
        ctx.moveTo(x + w / 2 - 8, arrowY + 4); ctx.lineTo(x + w / 2, arrowY - 4); ctx.lineTo(x + w / 2 + 8, arrowY + 4);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ───────── draw 16 shelter plots in the world ─────────
function drawShelterPlots(now, inView, selfX, selfY) {
  for (const plot of shelterPlots) {
    const isOwner = me && me.plotId === plot.id;
    const teamColor = plot.team > 0 ? TEAMCOL[plot.team] : isOwner ? '#ffd166' : '#00e5ff';
    const upg = plot.upgrades || {};
    const lv = plot.level || 1;
    const S = computePlotSize(plot);
    const x0 = plot.x - S / 2, y0 = plot.y - S / 2;

    // ───────── 1. TOWERING SKY BEACON LIGHT BEAM ─────────
    ctx.save();
    const beamGrad = ctx.createLinearGradient(plot.x - 32, 0, plot.x + 32, 0);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    beamGrad.addColorStop(0.5, isOwner ? 'rgba(255, 209, 102, 0.45)' : 'rgba(0, 229, 255, 0.38)');
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(plot.x - 32, plot.y - 3600, 64, 3600);

    // Vertical ascending energy pulse rings
    for (let r = 0; r < 4; r++) {
      const rProg = ((now / 1400 + r * 0.25) % 1);
      const ringY = plot.y - rProg * 800;
      const ringW = 28 + rProg * 54;
      ctx.strokeStyle = isOwner ? `rgba(255, 209, 102, ${1 - rProg})` : `rgba(0, 229, 255, ${1 - rProg})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(plot.x, ringY, ringW, ringW * 0.32, 0, 0, 7);
      ctx.stroke();
    }
    ctx.restore();

    // Skip detailed geometry if far off camera
    if (!inView(plot.x, plot.y, S * 0.8)) continue;

    // ───────── 2. EXPANDED SAFE HAVEN ZONE AURA ─────────
    const shRadius = S * 0.55;
    ctx.save();
    const shGrad = ctx.createRadialGradient(plot.x, plot.y, 40, plot.x, plot.y, shRadius + 15);
    shGrad.addColorStop(0, 'rgba(77, 255, 136, 0.14)');
    shGrad.addColorStop(0.85, 'rgba(77, 255, 136, 0.04)');
    shGrad.addColorStop(1, 'rgba(77, 255, 136, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath(); ctx.arc(plot.x, plot.y, shRadius + 15, 0, 7); ctx.fill();

    ctx.strokeStyle = `rgba(77, 255, 136, ${0.35 + 0.15 * Math.sin(now / 300)})`;
    ctx.lineWidth = 2; ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.arc(plot.x, plot.y, shRadius + 15, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ───────── 3. REINFORCED CONCRETE & STEEL FOUNDATION ─────────
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x0 + 12, y0 + 12, S, S);
    ctx.fillStyle = '#222730'; ctx.fillRect(x0, y0, S, S);
    ctx.strokeStyle = '#181b22'; ctx.lineWidth = 6; ctx.strokeRect(x0, y0, S, S);

    // Industrial floor paving pattern & vehicle lane markings
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1.5;
    for (let k = 36; k < S - 30; k += 40) {
      ctx.beginPath(); ctx.moveTo(x0 + k, y0 + 20); ctx.lineTo(x0 + k, y0 + S - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + 20, y0 + k); ctx.lineTo(x0 + S - 20, y0 + k); ctx.stroke();
    }

    // ───────── 4. FORTIFIED WALLS & AUTOMATED SOUTH AIRLOCK ─────────
    const T = 20;
    const gateW = 100;
    const gateX0 = plot.x - gateW / 2;
    const gateX1 = plot.x + gateW / 2;

    const isAuthorized = me && (me.id === plot.owner || (plot.team > 0 && me.team === plot.team) || !plot.owner);
    const distToGate = Math.hypot(selfX - plot.x, selfY - (y0 + S));
    const gateOpen = isAuthorized && distToGate < 140;

    // Perimeter Wall Slabs (Heavy concrete with steel capping)
    ctx.fillStyle = lv >= 4 ? '#0f172a' : '#334155';
    ctx.strokeStyle = lv >= 4 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 2.5;

    // Top wall
    ctx.fillRect(x0, y0, S, T); ctx.strokeRect(x0, y0, S, T);
    // Left wall
    ctx.fillRect(x0, y0, T, S); ctx.strokeRect(x0, y0, T, S);
    // Right wall
    ctx.fillRect(x0 + S - T, y0, T, S); ctx.strokeRect(x0 + S - T, y0, T, S);
    // Bottom left wing
    ctx.fillRect(x0, y0 + S - T, gateX0 - x0, T); ctx.strokeRect(x0, y0 + S - T, gateX0 - x0, T);
    // Bottom right wing
    ctx.fillRect(gateX1, y0 + S - T, (x0 + S) - gateX1, T); ctx.strokeRect(gateX1, y0 + S - T, (x0 + S) - gateX1, T);

    // Razor wire / perimeter spikes along outer walls
    if (upg.spikes) {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      for (let px = x0 + 10; px < x0 + S - 10; px += 18) {
        ctx.beginPath(); ctx.moveTo(px, y0 - 6); ctx.lineTo(px + 8, y0 + 2); ctx.stroke();
      }
    }

    // ───────── AIRLOCK BLAST GATE LOGIC & ANIMATION ─────────
    ctx.save();
    // Doorway jambs & sensor housings
    ctx.fillStyle = '#1e293b'; ctx.fillRect(gateX0 - 8, y0 + S - T - 6, 8, T + 12);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(gateX1, y0 + S - T - 6, 8, T + 12);

    if (gateOpen) {
      // BLAST DOORS SLID OPEN!
      const doorSlide = 38;
      // Retracted door leaves
      ctx.fillStyle = '#475569';
      ctx.fillRect(gateX0 - doorSlide, y0 + S - T, doorSlide, T);
      ctx.fillRect(gateX1, y0 + S - T, doorSlide, T);

      // Illuminated green entry threshold mat with animated chevrons
      const stepProg = (now % 600) / 600;
      ctx.fillStyle = 'rgba(77, 255, 136, 0.25)';
      ctx.fillRect(gateX0 + 4, y0 + S - T - 4, gateW - 8, T + 8);
      ctx.strokeStyle = '#4dff88'; ctx.lineWidth = 2;
      ctx.strokeRect(gateX0 + 4, y0 + S - T - 4, gateW - 8, T + 8);

      // Animated green chevrons pointing inside
      ctx.strokeStyle = `rgba(77, 255, 136, ${0.9 - stepProg * 0.4})`;
      ctx.lineWidth = 3;
      for (let c = 0; c < 3; c++) {
        const cy = y0 + S + 6 - (c * 12 + stepProg * 12);
        if (cy > y0 + S - T - 4) {
          ctx.beginPath();
          ctx.moveTo(plot.x - 14, cy); ctx.lineTo(plot.x, cy - 8); ctx.lineTo(plot.x + 14, cy);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#4dff88'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('▲ ACCESS GRANTED · WELCOME HOME ▲', plot.x, y0 + S + 18);
    } else {
      // AIRLOCK SEALED SHUT!
      ctx.fillStyle = '#1e293b'; ctx.fillRect(gateX0, y0 + S - T, gateW, T);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.strokeRect(gateX0, y0 + S - T, gateW, T);

      // Warning hazard stripes across blast doors
      for (let sx = gateX0 + 4; sx < gateX1 - 8; sx += 14) {
        ctx.fillStyle = sx % 28 === 4 ? '#ef4444' : '#0f172a';
        ctx.beginPath(); ctx.moveTo(sx, y0 + S - T); ctx.lineTo(sx + 8, y0 + S - T); ctx.lineTo(sx + 3, y0 + S); ctx.lineTo(sx - 5, y0 + S); ctx.fill();
      }

      // Red security laser tripwire
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gateX0, y0 + S - T / 2); ctx.lineTo(gateX1, y0 + S - T / 2); ctx.stroke();

      // Flashing alert lights on jambs
      ctx.fillStyle = (now % 600 < 300) ? '#ef4444' : '#7f1d1d';
      ctx.beginPath(); ctx.arc(gateX0 - 4, y0 + S - T / 2, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(gateX1 + 4, y0 + S - T / 2, 4, 0, 7); ctx.fill();

      // Electric shock arcs if upgraded
      if (upg.gate >= 3 && Math.random() < 0.35) {
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(gateX0 + Math.random() * gateW, y0 + S - T);
        ctx.lineTo(gateX0 + Math.random() * gateW, y0 + S);
        ctx.stroke();
      }

      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10.5px system-ui'; ctx.textAlign = 'center';
      const lockMsg = !plot.owner ? '🔒 AIRLOCK CLOSED · PRESS [E] TO CLAIM' : '🔒 AIRLOCK SEALED · UNAUTHORIZED';
      ctx.fillText(lockMsg, plot.x, y0 + S + 18);
    }
    ctx.restore();

    // ───────── 5. FOUR CORNER DEFENSIVE WATCHTOWERS & AIMING TURRETS ─────────
    const corners = [
      [x0 + 28, y0 + 28], [x0 + S - 28, y0 + 28],
      [x0 + 28, y0 + S - 28], [x0 + S - 28, y0 + S - 28]
    ];

    for (let i = 0; i < 4; i++) {
      const [cx, cy] = corners[i];
      // Tower base platform
      ctx.fillStyle = '#14171d'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill();
      ctx.strokeStyle = teamColor; ctx.lineWidth = 3; ctx.stroke();

      // Find nearest hostile zombie to aim turret at
      let targetA = null;
      if (latest && latest.Z && latest.Z.size > 0) {
        let nearestZ = null, minZD = 750 * 750;
        for (const z of latest.Z.values()) {
          const zd = d2(cx, cy, z[2], z[3]);
          if (zd < minZD) { minZD = zd; nearestZ = z; }
        }
        if (nearestZ) {
          targetA = Math.atan2(nearestZ[3] - cy, nearestZ[2] - cx);
        }
      }
      const aimAngle = targetA !== null ? targetA : ((now / 1500 + i * 1.57) % 6.28);

      // Swiveling automated turret head
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(aimAngle);

      // Targeting laser pointer
      ctx.strokeStyle = upg.turret_laser ? 'rgba(56, 189, 248, 0.65)' : 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(180, 0); ctx.stroke();

      // Gun housing & barrels
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(-10, -10, 20, 20);

      if (upg.turret_rocket) {
        // Quad micro-missile battery
        ctx.fillStyle = '#166534'; ctx.fillRect(-8, -12, 18, 24);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(10, -8, 6, 4); ctx.fillRect(10, -2, 6, 4);
        ctx.fillRect(10, 4, 6, 4); ctx.fillRect(10, 10, 6, 4);
      } else if (upg.turret_laser) {
        // Continuous laser beam cannon
        ctx.fillStyle = '#0284c7'; ctx.fillRect(-4, -7, 28, 14);
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(24, 0, 5, 0, 7); ctx.fill();
      } else if (upg.turret_mg) {
        // Heavy .50 Cal Minigun with dual heavy fluted barrels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, -6, 28, 5); ctx.fillRect(0, 1, 28, 5);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-8, -10, 6, 20); // brass ammo chute
      } else {
        // Standard 9mm light sentry
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, -4, 22, 3); ctx.fillRect(0, 1, 22, 3);
      }
      ctx.restore();
    }

    // ───────── 6. INTERIOR ADVANCED STATIONS ─────────
    // Medical Triage Pod
    const medX = x0 + 40, medY = y0 + 60;
    ctx.fillStyle = '#064e3b'; ctx.fillRect(medX, medY, 48, 48);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.strokeRect(medX, medY, 48, 48);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(medX + 20, medY + 10, 8, 28); ctx.fillRect(medX + 10, medY + 20, 28, 8);

    // Armory Munitions Storage
    const armX = x0 + S - 88, armY = y0 + 60;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(armX, armY, 48, 48);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5; ctx.strokeRect(armX, armY, 48, 48);
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ARMORY', armX + 24, armY + 26);

    // Vehicle Repair Lift & Pad
    const vehPadX = x0 + 40, vehPadY = y0 + S - 120;
    ctx.fillStyle = '#181b22'; ctx.fillRect(vehPadX, vehPadY, 68, 54);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.strokeRect(vehPadX, vehPadY, 68, 54); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('REPAIR BAY', vehPadX + 34, vehPadY + 30);

    // ───────── 7. CENTRAL COMMAND TERMINAL & QUANTUM CORE ─────────
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(plot.x, plot.y, 34, 0, 7); ctx.fill();
    ctx.strokeStyle = teamColor; ctx.lineWidth = 3.5; ctx.stroke();

    if (upg.antimatter_reactor) {
      const rGrad = ctx.createRadialGradient(plot.x, plot.y, 2, plot.x, plot.y, 28);
      rGrad.addColorStop(0, '#c084fc'); rGrad.addColorStop(0.5, '#7c3aed'); rGrad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = rGrad; ctx.beginPath(); ctx.arc(plot.x, plot.y, 28, 0, 7); ctx.fill();
    }

    ctx.fillStyle = teamColor; ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${lv}`, plot.x, plot.y);

    // ───────── 8. FLOATING 3D IN-WORLD NAMEPLATE ─────────
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.95)';
    ctx.strokeText(`🏰 ${plot.name}`, plot.x, y0 - 24);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`🏰 ${plot.name}`, plot.x, y0 - 24);

    const sub = plot.ownerName ? `[Owner: ${plot.ownerName} · Lv.${lv}]` : `[UNCLAIMED PLOT · +${plot.income || lv} Scrap/s]`;
    ctx.font = 'bold 12px system-ui';
    ctx.strokeText(sub, plot.x, y0 - 8);
    ctx.fillStyle = plot.ownerName ? teamColor : '#4dff88';
    ctx.fillText(sub, plot.x, y0 - 8);

    // Prompt if survivor is nearby
    const distToMe = Math.hypot(plot.x - selfX, plot.y - selfY);
    if (distToMe < S * 0.58) {
      const hint = plot.ownerName ? '⚙️ Press [T] for Shelter Tycoon Upgrades' : '🏰 Press [E] to Claim This Shelter Outpost';
      ctx.font = 'bold 12.5px system-ui';
      const hw = ctx.measureText(hint).width + 24;
      ctx.fillStyle = 'rgba(10, 15, 24, 0.92)';
      ctx.fillRect(plot.x - hw / 2, y0 + S + 28, hw, 26);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.8;
      ctx.strokeRect(plot.x - hw / 2, y0 + S + 28, hw, 26);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(hint, plot.x, y0 + S + 42);
    }
    ctx.restore();
  }
}

function drawLabels(inView) {
  if (zoom < 0.25) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = clamp(15 / zoom, 14, 40);
  ctx.font = `600 ${fs}px system-ui,sans-serif`; ctx.lineWidth = fs / 5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  for (const L of M.landmarks) {
    if (!inView(L[2], L[3])) continue;
    const d = Math.hypot(L[2] - camX, L[3] - camY);
    if (d > 1400 / Math.max(0.6, zoom)) continue;
    ctx.globalAlpha = clamp(1.4 - d / 1100, 0.25, 0.95);
    ctx.strokeText(L[0], L[2], L[3] - 10); ctx.fillStyle = '#fff6d8'; ctx.fillText(L[0], L[2], L[3] - 10);
    ctx.font = `${fs * 0.65}px system-ui,sans-serif`; ctx.fillStyle = '#d6cfb8';
    ctx.strokeText(L[1], L[2], L[3] + fs * 0.65); ctx.fillText(L[1], L[2], L[3] + fs * 0.65);
    ctx.font = `600 ${fs}px system-ui,sans-serif`;
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(p, x, y, a, isMe, now) {
  const f = p[8], col = isMe ? '#ffd166' : settings.mode === 'coop' ? TEAMCOL[0] : settings.mode === 'ffa' ? '#ff8f6b' : TEAMCOL[p[5]];
  const rebirths = isMe ? ((me && me.rebirths) || 0) : (p[9] || 0);

  if (f & 1) {
    ctx.strokeStyle = '#a00'; ctx.lineWidth = 5; ctx.beginPath();
    ctx.moveTo(x - 12, y - 12); ctx.lineTo(x + 12, y + 12);
    ctx.moveTo(x + 12, y - 12); ctx.lineTo(x - 12, y + 12); ctx.stroke();
    return;
  }

  // ───────── Radiant Golden Ascendant Aura for Reborn Survivors ─────────
  if (rebirths > 0) {
    const auraR = 30 + Math.min(18, rebirths * 4);
    const aPulse = (Math.sin(now / 220) + 1) * 0.5;
    const aGrad = ctx.createRadialGradient(x, y, 10, x, y, auraR);
    aGrad.addColorStop(0, 'rgba(251,191,36,0.35)');
    aGrad.addColorStop(0.6, 'rgba(168,85,247,0.2)');
    aGrad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = aGrad; ctx.beginPath(); ctx.arc(x, y, auraR, 0, 7); ctx.fill();

    // Swirling energy motes
    const motes = Math.min(5, 2 + rebirths);
    for (let m = 0; m < motes; m++) {
      const ma = now / 350 + (m * Math.PI * 2) / motes;
      const mx = x + Math.cos(ma) * (auraR * 0.8), my = y + Math.sin(ma) * (auraR * 0.8);
      ctx.fillStyle = m % 2 === 0 ? '#fbbf24' : '#c084fc';
      ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, 7); ctx.fill();
    }

    // Ethereal wings of light for high prestige
    if (rebirths >= 2) {
      ctx.strokeStyle = `rgba(251,191,36,${0.35 + aPulse * 0.3})`; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, y); ctx.quadraticCurveTo(x - 28, y - 16, x - 34, y - 6);
      ctx.moveTo(x + 12, y); ctx.quadraticCurveTo(x + 28, y - 16, x + 34, y - 6);
      ctx.stroke();
    }
  }

  // Active shield barrier
  if (f & 8 || (isMe && me.hardlightShield > 0)) {
    ctx.strokeStyle = 'rgba(56,189,248,.75)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(now / 150) * 3, 0, 7); ctx.stroke();
  }

  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(4, 5, 17, 0, 7); ctx.fill();
  ctx.rotate(a);
  const w = p[6] >= 0 ? D.W[p[6]] : null; drawWeapon(w);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(-3, 0, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0b48a'; ctx.beginPath(); ctx.arc(13, -7, 4, 0, 7); ctx.arc(13, 7, 4, 0, 7); ctx.fill();
  ctx.restore();

  if (f & 32) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = `rgba(255,${100 + k * 50},0,.7)`; ctx.beginPath();
      ctx.arc(x + Math.sin(now / 70 + k) * 8, y - 8 - k * 5, 6, 0, 7); ctx.fill();
    }
  }
  if (f & 1024) {
    ctx.strokeStyle = 'rgba(120,220,255,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke();
  }
  if (f & 64 || rebirths > 0) {
    ctx.fillStyle = rebirths > 0 ? '#38bdf8' : '#ffeb3b';
    ctx.font = '16px sans-serif'; ctx.fillText(rebirths > 0 ? '⚛️' : '★', x + Math.cos(now / 150) * 14, y - 26);
  }
  if (!isMe) {
    const row = board.find(r => r[0] === p[0]); const name = row ? row[1] : '?';
    const tag = rebirths > 0 ? `[⚛️ Ascendant ${rebirths}] ${name}` : name;
    ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(tag, x, y - 30); ctx.fillStyle = col; ctx.fillText(tag, x, y - 30);
    if (p[4] < 100) {
      ctx.fillStyle = '#000'; ctx.fillRect(x - 18, y + 22, 36, 4);
      ctx.fillStyle = '#e63946'; ctx.fillRect(x - 18, y + 22, 36 * p[4] / 100, 4);
    }
  }
}

function drawWeapon(w) {
  if (!w) return;
  const c = w.cat;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (c) {
    case 'pistol':
      // Tactical Handgun (Glock 17 / Desert Eagle)
      ctx.fillStyle = '#1e2229';
      ctx.fillRect(8, -3, 16, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, 0, 10, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(23, -2, 2, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(13, -3, 4, 2);
      break;
    case 'smg':
      // Tactical Submachine Gun (MP5 / Vector)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, -4, 24, 7);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.moveTo(14, 3); ctx.quadraticCurveTo(18, 12, 22, 14); ctx.lineWidth = 3; ctx.strokeStyle = '#0f172a'; ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.fillRect(28, -2, 6, 3);
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, -6, 8, 2);
      break;
    case 'ar':
      // Assault Rifle (AK-47 / M4A1)
      ctx.fillStyle = '#181d24';
      ctx.fillRect(6, -4, 26, 7);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(16, -3, 12, 5);
      ctx.fillStyle = '#2b2f38';
      ctx.fillRect(30, -2, 10, 3);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(39, -3, 3, 5);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(16, 3); ctx.quadraticCurveTo(20, 14, 26, 17); ctx.stroke();
      break;
    case 'sniper':
      // Heavy Sniper Rifle (Barrett .50 / AWM)
      ctx.fillStyle = '#1e232d';
      ctx.fillRect(4, -4, 30, 7);
      ctx.fillStyle = '#334155';
      ctx.fillRect(32, -2, 24, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(54, -4, 6, 8);
      ctx.fillStyle = '#090d14'; ctx.fillRect(12, -8, 18, 4);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(28, -8, 2, 4);
      ctx.fillStyle = '#475569'; ctx.fillRect(10, -9, 3, 6); ctx.fillRect(28, -9, 3, 6);
      break;
    case 'shotgun':
      // Combat Shotgun (SPAS-12 / Remington)
      ctx.fillStyle = '#242b35';
      ctx.fillRect(6, -4, 22, 8);
      ctx.fillStyle = '#452c1e';
      ctx.fillRect(18, 1, 10, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(26, -3.5, 16, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(28, -5, 14, 2);
      break;
    case 'mg':
      // Heavy Machine Gun (M249 SAW / Minigun)
      ctx.fillStyle = '#1e2430';
      ctx.fillRect(6, -5, 30, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(34, -3, 16, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(14, 5, 8, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(12, 10, 12, 8);
      break;
    case 'launcher': case 'glauncher':
      // RPG-7 Rocket Launcher
      ctx.fillStyle = '#364935';
      ctx.fillRect(-2, -5, 38, 9);
      ctx.fillStyle = '#4b5563';
      ctx.beginPath(); ctx.moveTo(36, -6); ctx.lineTo(48, 0); ctx.lineTo(36, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(46, 0, 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(6, 4, 4, 6); ctx.fillRect(22, 4, 4, 6);
      break;
    case 'special':
      // Exotic DragonFire Laser / Plasma Rifle
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, -5, 32, 9);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(14, -3, 14, 5);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
      ctx.strokeRect(14, -3, 14, 5);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(36, -4, 4, 7);
      break;
    case 'sword':
      // Masterwork Katana
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(14, 7); ctx.lineTo(46, 7); ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(16, 5.5); ctx.lineTo(44, 5.5); ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(12, 3, 3, 9);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, 5.5, 8, 3.5);
      break;
    case 'dagger':
      // Combat Fighting Knife (Fairbairn-Sykes / Tanto)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(14, 6); ctx.lineTo(30, 7); ctx.lineTo(14, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(13, 3, 2.5, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, 5.5, 7, 3);
      break;
    case 'polearm':
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, 7); ctx.lineTo(60, 7); ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(60, 2); ctx.lineTo(76, 7); ctx.lineTo(60, 12); ctx.fill();
      break;
    case 'blunt':
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(38, 7); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.fillRect(38, 2, 12, 10);
      break;
    case 'bow':
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, 0, 22, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10 + Math.cos(-1.2) * 22, Math.sin(-1.2) * 22); ctx.lineTo(10 + Math.cos(1.2) * 22, Math.sin(1.2) * 22); ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#1b1b1b'; ctx.fillRect(8, 2, 18, 5);
      break;
  }
  ctx.restore();
}

function drawZombie(z, x, y, a, now) {
  const d = D.ZD[D.ZLIST[z[1]]], f = z[6], r = d.r;
  if (f & 1) {
    ctx.strokeStyle = 'rgba(160,120,60,.6)'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.arc(x, y, r * 0.6 + k * 7 + Math.sin(now / 200 + k) * 2, 0, 7); ctx.stroke();
    }
    return;
  }
  ctx.save(); ctx.translate(x, y); if (d.stealth) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(4, 5, r + 1, 0, 7); ctx.fill();
  ctx.rotate(a);
  const reach = (f & 8) ? r + 14 : r + 7, sway = Math.sin(now / 160 + z[0]) * 3;
  ctx.strokeStyle = shade(hex2(d.c), 0.7); ctx.lineWidth = r * 0.42; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.6); ctx.lineTo(reach, -r * 0.5 + sway);
  ctx.moveTo(r * 0.3, r * 0.6); ctx.lineTo(reach, r * 0.5 - sway); ctx.stroke();
  ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();
  const t = D.ZLIST[z[1]];
  if (t === 'riot') { ctx.fillStyle = 'rgba(180,200,230,.8)'; ctx.fillRect(r - 2, -r, 6, r * 2); }
  if (t === 'soldier') { ctx.fillStyle = '#3b4220'; ctx.beginPath(); ctx.arc(-2, 0, r * 0.7, 0, 7); ctx.fill(); }
  if (t === 'hazmat') { ctx.fillStyle = '#222'; ctx.fillRect(r * 0.2, -r * 0.4, r * 0.6, r * 0.8); }
  if (t === 'mummy') {
    ctx.strokeStyle = 'rgba(120,100,70,.6)'; ctx.lineWidth = 2;
    for (let k = -r; k < r; k += 6) { ctx.beginPath(); ctx.moveTo(k, -r); ctx.lineTo(k + 6, r); ctx.stroke(); }
  }
  if (t === 'bloater') {
    ctx.fillStyle = '#c9d65a';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.3) * r * 0.6, Math.sin(k * 1.3) * r * 0.6, 4, 0, 7); ctx.fill(); }
  }
  if (t === 'frozen') { ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, 7); ctx.stroke(); }
  if (t === 'behemoth') {
    ctx.fillStyle = '#2a0505';
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.rotate(k * 0.785);
      ctx.beginPath(); ctx.moveTo(r - 4, -6); ctx.lineTo(r + 12, 0); ctx.lineTo(r - 4, 6); ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.45, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.22, 2.2, 0, 7); ctx.arc(r * 0.6, r * 0.22, 2.2, 0, 7); ctx.fill();
  ctx.restore();
  if (f & 2) {
    ctx.fillStyle = 'rgba(255,120,0,.75)'; ctx.beginPath();
    ctx.arc(x + Math.sin(now / 60) * 5, y - r * 0.6, r * 0.5, 0, 7); ctx.fill();
  }
  if (f & 4) {
    ctx.fillStyle = '#ffeb3b'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✦', x + Math.cos(now / 120) * 10, y - r - 8);
  }
  if (z[5] < 100) {
    const w = Math.max(30, r * 2);
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, y - r - 8, w, 4);
    ctx.fillStyle = d.boss ? '#ff4d4d' : '#9acd32'; ctx.fillRect(x - w / 2, y - r - 8, w * z[5] / 100, 4);
  }
  if (d.boss) {
    ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(d.n, x, y - r - 18); ctx.fillStyle = '#ff6b6b'; ctx.fillText(d.n, x, y - r - 18);
  }
}

function drawVehicle(v, x, y, a, now, selfX, selfY) {
  const t = D.VLIST[v[1]], d = D.VEH[t], f = v[7], L = d.len, Wd = d.wid, dead = f & 32, fly = f & 8;
  ctx.save(); ctx.translate(x, y);
  if (fly) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(40, 60); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, L / 2, Wd / 2, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.scale(1.15, 1.15);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.save(); ctx.rotate(a); ctx.fillRect(-L / 2 + 5, -Wd / 2 + 6, L, Wd); ctx.restore();
  }
  ctx.rotate(a);
  const body = dead ? '#2a2725' : d.c;
  if (d.kind === 'boat') {
    ctx.fillStyle = body; ctx.beginPath();
    ctx.moveTo(L / 2, 0); ctx.lineTo(L * 0.15, -Wd / 2); ctx.lineTo(-L / 2, -Wd / 2);
    ctx.lineTo(-L / 2, Wd / 2); ctx.lineTo(L * 0.15, Wd / 2); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2b4a6a'; ctx.fillRect(-L * 0.05, -Wd * 0.3, L * 0.2, Wd * 0.6);
    if (!dead && v[8] > 100) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-L / 2 - 20, -Wd / 3, 20, Wd * 0.66); }
  } else if (d.kind === 'heli') {
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(L * 0.1, 0, L * 0.3, Wd / 2, 0, 0, 7); ctx.fill();
    ctx.fillRect(-L / 2, -4, L * 0.5, 8); ctx.fillRect(-L / 2, -12, 8, 24);
    ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.ellipse(L * 0.28, 0, L * 0.12, Wd * 0.35, 0, 0, 7); ctx.fill();
    ctx.restore(); ctx.save(); ctx.translate(x, y); if (fly) ctx.scale(1.15, 1.15);
    const rot = dead ? 0.3 : now / (f & 4 ? 40 : 300);
    ctx.strokeStyle = 'rgba(30,30,30,.75)'; ctx.lineWidth = 5;
    for (let k = 0; k < 2; k++) {
      const ra = rot + k * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(ra) * L * 0.55, Math.sin(ra) * L * 0.55);
      ctx.lineTo(-Math.cos(ra) * L * 0.55, -Math.sin(ra) * L * 0.55); ctx.stroke();
    }
    ctx.restore();
    if (dead) burst(x, y, 1, '#333', 40, 1200, 10);
    return;
  } else if (d.kind === 'hover') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(0, 0, L / 2, Wd / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = body; ctx.fillRect(-L / 2 + 8, -Wd / 2 + 6, L - 16, Wd - 12);
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(-L / 2 + 14, -10, 9, 0, 7); ctx.arc(-L / 2 + 14, 10, 9, 0, 7); ctx.fill();
  } else {
    const tracked = t === 'tank' || t === 'apc';
    ctx.fillStyle = '#111';
    if (tracked) {
      ctx.fillRect(-L / 2, -Wd / 2 - 4, L, 10); ctx.fillRect(-L / 2, Wd / 2 - 6, L, 10);
    } else if (t !== 'motorcycle') {
      const wl = 12, ww = 6;
      for (const [wx, wy] of [[L * 0.3, -Wd / 2], [L * 0.3, Wd / 2], [-L * 0.3, -Wd / 2], [-L * 0.3, Wd / 2]])
        ctx.fillRect(wx - wl / 2, wy - ww / 2, wl, ww);
    } else {
      ctx.fillRect(L / 2 - 10, -3, 10, 6); ctx.fillRect(-L / 2, -3, 10, 6);
    }
    ctx.fillStyle = body; ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 6) : ctx.rect(-L / 2, -Wd / 2, L, Wd);
    ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();

    // Twin halogen headlights
    if (!dead) {
      const isNight = daylight() < 0.65;
      const isDriving = (me && v[0] === me.veh) || isNight || (v[8] > 20);
      if (isDriving) {
        ctx.fillStyle = 'rgba(255, 250, 205, 0.22)';
        ctx.beginPath();
        ctx.moveTo(L / 2, -Wd * 0.35);
        ctx.lineTo(L / 2 + 190, -Wd * 0.35 - 55);
        ctx.lineTo(L / 2 + 190, -Wd * 0.35 + 55);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(L / 2, Wd * 0.35);
        ctx.lineTo(L / 2 + 190, Wd * 0.35 - 55);
        ctx.lineTo(L / 2 + 190, Wd * 0.35 + 55);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fffbe8';
        ctx.fillRect(L / 2 - 2, -Wd * 0.38, 4, 6);
        ctx.fillRect(L / 2 - 2, Wd * 0.38 - 6, 4, 6);
      }
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-L / 2 - 1, -Wd * 0.4, 3, 5);
      ctx.fillRect(-L / 2 - 1, Wd * 0.4 - 5, 3, 5);
    }

    if (!tracked && t !== 'motorcycle' && t !== 'quad' && t !== 'golfcart' && t !== 'tractor' && t !== 'snowmobile' && t !== 'f1' && t !== 'dunebuggy') {
      ctx.fillStyle = 'rgba(40,60,80,.85)';
      ctx.fillRect(L * 0.12, -Wd / 2 + 4, L * 0.14, Wd - 8);
      ctx.fillRect(-L * 0.38, -Wd / 2 + 4, L * 0.1, Wd - 8);
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      ctx.fillRect(-L * 0.25, -Wd / 2 + 4, L * 0.36, Wd - 8);
    }
    if (t === 'police') {
      const on = (f & 1) && now % 400 < 200;
      ctx.fillStyle = on ? '#ff2a2a' : '#5a1010'; ctx.fillRect(-4, -Wd / 2 + 4, 8, Wd / 2 - 4);
      ctx.fillStyle = (f & 1) && !on ? '#2a6aff' : '#10205a'; ctx.fillRect(-4, 0, 8, Wd / 2 - 4);
      ctx.fillStyle = '#111'; ctx.fillRect(-L / 2, -Wd / 2, L * 0.2, Wd);
    }
    if (t === 'ambulance') {
      ctx.fillStyle = '#e53935'; ctx.fillRect(-L * 0.2, -3, L * 0.3, 6); ctx.fillRect(-L * 0.05 - 3, -Wd * 0.3, 6, Wd * 0.6);
      if (f & 1 && now % 400 < 200) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(L * 0.05, -Wd / 2, 8, Wd); }
    }
    if (t === 'tank' || t === 'apc' || t === 'humvee' || t === 'hovercraft') {
      ctx.rotate(v[9] / 100 - a); ctx.fillStyle = shade(hex2(d.c), 0.8);
      if (t === 'tank') { ctx.beginPath(); ctx.arc(0, 0, Wd * 0.38, 0, 7); ctx.fill(); ctx.fillRect(0, -4, L * 0.7, 8); }
      else if (t === 'apc') { ctx.fillRect(-12, -12, 24, 24); ctx.fillRect(0, -3, L * 0.45, 6); }
      else { ctx.fillStyle = '#222'; ctx.fillRect(-4, -4, 8, 8); ctx.fillRect(0, -2, 26, 4); }
    }
  }
  ctx.restore();
  if (f & 2) {
    ctx.strokeStyle = `rgba(120,180,255,${0.4 + 0.4 * Math.sin(now / 50)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, d.r + 8, 0, 7); ctx.stroke();
  }

  // Floating prompt when survivor is near on foot
  if (selfX !== undefined && selfY !== undefined && !me.veh && !dead) {
    const dist = Math.hypot(x - selfX, y - selfY);
    if (dist < d.r + 90) {
      ctx.save();
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      const prompt = `🚗 [E] DRIVE ${d.n} · Hull ${v[5]}% · Fuel ${v[6]}% · [Shift] Nitro`;
      const pw = ctx.measureText(prompt).width + 20;
      ctx.fillStyle = 'rgba(10, 15, 24, 0.9)';
      ctx.fillRect(x - pw / 2, y - d.r - 28, pw, 24);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x - pw / 2, y - d.r - 28, pw, 24);
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(prompt, x, y - d.r - 12);
      ctx.restore();
    }
  }

  if (dead) burst(x + (Math.random() - 0.5) * 20, y, 1, Math.random() < 0.5 ? '#ff7a1a' : '#444', 50, 900, 9);
  else if (v[5] < 30 && Math.random() < 0.3) burst(x, y, 1, '#555', 30, 800, 7);
}

function drawProj(kind, x, y, a, z, now) {
  ctx.save(); ctx.translate(x, y);
  if (z > 0) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(z * 20, z * 30, 6, 0, 7); ctx.fill(); ctx.scale(1 + z * 0.6, 1 + z * 0.6); }
  ctx.rotate(a);
  switch (kind) {
    case 'arrow': case 'bolt': case 'dart':
      ctx.strokeStyle = '#8b6a3a'; ctx.lineWidth = kind === 'bolt' ? 5 : 2.5;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(9, -4); ctx.lineTo(9, 4); ctx.fill(); break;
    case 'rocket':
      ctx.fillStyle = '#556b2f'; ctx.fillRect(-12, -4, 24, 8);
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-14, 0, 5 + Math.random() * 3, 0, 7); ctx.fill();
      if (Math.random() < 0.7) burst(x - Math.cos(a) * 16, y - Math.sin(a) * 16, 1, '#bbb', 20, 700, 6); break;
    case 'shell': ctx.fillStyle = '#ffd166'; ctx.fillRect(-8, -3, 16, 6); break;
    case 'grenade': case 'item': case 'molotov':
      ctx.fillStyle = kind === 'molotov' ? '#5aa02c' : '#4b5320'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      if (kind === 'molotov') { ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(6, 0, 4, 0, 7); ctx.fill(); } break;
    case 'boulder': ctx.fillStyle = '#7a6f62'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); break;
    case 'stone': ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); break;
    case 'flame': {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(0.5, 'rgba(255,120,20,.6)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill(); break;
    }
    default: ctx.fillStyle = '#ffe08a'; ctx.fillRect(-6, -1.5, 12, 3);
  }
  ctx.restore();
}

function drawFx(f, p, now) {
  switch (f.k) {
    case 'tr': {
      const col = f.kind === 2 ? `rgba(255,60,60,${1 - p})` : `rgba(255,230,150,${(1 - p) * 0.9})`;
      ctx.strokeStyle = col; ctx.lineWidth = f.kind === 2 ? 4 : f.kind === 3 ? 3 : f.kind === 1 ? 1 : 1.6;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
    }
    case 'flash': if (p < 0.6) { ctx.fillStyle = `rgba(255,220,120,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(f.x, f.y, Math.min(30, f.r * 0.2), 0, 7); ctx.fill(); } break;
    case 'ex': {
      const r = f.r * (0.3 + p * 0.9); const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      const c1 = f.fx === 'toxic' ? '170,230,60' : f.fx === 'smoke' ? '200,200,200' : f.fx === 'flash' ? '255,255,255' : '255,200,80';
      g.addColorStop(0, `rgba(255,255,220,${1 - p})`); g.addColorStop(0.4, `rgba(${c1},${0.8 * (1 - p)})`); g.addColorStop(1, 'rgba(80,40,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * p * 1.2, 0, 7); ctx.stroke(); break;
    }
    case 'sw': {
      const pl = latest.P.get(f.pid);
      const x = f.pid === myId ? pred.x : pl ? pl[1] : f.x, y = f.pid === myId ? pred.y : pl ? pl[2] : f.y;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, f.r, f.a - f.arc / 2, f.a - f.arc / 2 + f.arc * Math.min(1, p * 2)); ctx.stroke(); break;
    }
    case 'ring': ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - p; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * p, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'lt': {
      ctx.strokeStyle = `rgba(230,240,255,${1 - p})`; ctx.lineWidth = 5; ctx.beginPath();
      let x = f.x + 200, y = f.y - 900; ctx.moveTo(x, y);
      for (let k = 0; k < 9; k++) { x += (f.x - x) / (9 - k) + (hsh(k, f.seed * 1e4) - 0.5) * 120; y += (f.y - y) / (9 - k); ctx.lineTo(x, y); }
      ctx.stroke(); break;
    }
    case 'zap': {
      ctx.strokeStyle = `rgba(150,220,255,${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
      for (let k = 1; k < 6; k++) ctx.lineTo(lerp(f.x1, f.x2, k / 6) + (Math.random() - 0.5) * 20, lerp(f.y1, f.y2, k / 6) + (Math.random() - 0.5) * 20);
      ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
    }
    case 'cn': {
      const col = f.kind === 1 ? '120,190,255' : f.kind === 2 ? '120,160,255' : f.kind === 3 ? '255,80,80' : '255,200,120';
      ctx.fillStyle = `rgba(${col},${0.25 * (1 - p)})`; ctx.beginPath(); ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, f.a - f.arc / 2, f.a + f.arc / 2); ctx.closePath(); ctx.fill(); break;
    }
  }
}

// ───────── lighting ─────────
function drawLighting(b, a, u, now, selfX, selfY, inVeh, vlist) {
  const fx = fxNow(); const myP = latest.P.get(myId); const nvg = myP && (myP[8] & 128);
  let dark = (1 - daylight()) * 0.9;
  if (fx.has('aurora')) dark *= 0.72; if (fx.has('brightnight') || fx.has('moonlit')) dark *= 0.65; if (fx.has('eclipse')) dark = Math.max(dark, 0.7);
  if (now - lightningFlash < 160) dark *= 0.2;
  if (nvg) {
    ctx.fillStyle = 'rgba(20,255,60,.16)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    for (let y = (now / 20) % 4; y < VH; y += 4) ctx.fillRect(0, y, VW, 1);
    return;
  }
  if (dark < 0.03) return;
  const W2 = lightCv.width, H2 = lightCv.height, sc = W2 / VW;
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W2, H2);
  lx.fillStyle = `rgba(4,7,20,${dark})`; lx.fillRect(0, 0, W2, H2);
  lx.globalCompositeOperation = 'destination-out';
  const S = (x, y) => [((x - camX) * zoom + VW / 2) * sc, ((y - camY) * zoom + VH / 2) * sc];
  const L = (x, y, r, i = 1) => {
    const [sx, sy] = S(x, y), sr = r * zoom * sc;
    if (sx < -sr || sy < -sr || sx > W2 + sr || sy > H2 + sr) return;
    const g = lx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, `rgba(0,0,0,${i})`); g.addColorStop(0.6, `rgba(0,0,0,${i * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g; lx.beginPath(); lx.arc(sx, sy, sr, 0, 7); lx.fill();
  };
  const C = (x, y, ang, len, spread, i = 1) => {
    const [sx, sy] = S(x, y), sl = len * zoom * sc;
    const g = lx.createRadialGradient(sx, sy, 0, sx, sy, sl);
    g.addColorStop(0, `rgba(0,0,0,${i})`); g.addColorStop(0.7, `rgba(0,0,0,${i * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g; lx.beginPath(); lx.moveTo(sx, sy); lx.arc(sx, sy, sl, ang - spread, ang + spread); lx.closePath(); lx.fill();
  };
  L(selfX, selfY, 190, 0.8);
  for (const [id, p] of b.P) {
    if (p[8] & 1) continue; let x, y, an;
    if (id === myId) { x = pred.x; y = pred.y; const w = worldMouse(); an = Math.atan2(w.y - y, w.x - x); }
    else [x, y, an] = lerpArr(a.P.get(id), p, u, 1, 2, 3, 100);
    if (p[7]) continue;
    if (p[8] & 2) { C(x, y, an, 680, 0.42); L(x, y, 90, 0.6); }
    if (p[8] & 512) L(x, y, 300, 0.95);
  }
  for (const [v, x, y, an] of vlist) if ((v[7] & 4) && !(v[7] & 32)) {
    const d = D.VEH[D.VLIST[v[1]]];
    C(x + Math.cos(an) * d.len * 0.4, y + Math.sin(an) * d.len * 0.4, an, 560, 0.35, 0.95);
    if (v[7] & 1) L(x, y, 160, 0.7);
    if (v[7] & 8) L(x, y, 220, 0.6);
  }
  for (const plot of shelterPlots) {
    L(plot.x, plot.y, 220, 0.75);
    if (plot.beacon) L(plot.x, plot.y, 450, 0.95);
  }
  for (const e of effects) {
    const [id, type, x, y, r] = e;
    if (type === 'light') L(x, y, r, 0.9);
    else if (type === 'flare') L(x, y, r * (0.95 + Math.random() * 0.1));
    else if (type === 'fire') L(x, y, r * 2.2, 0.9);
    else if (type === 'drop') L(x, y, 200, 0.6);
  }
  ctx.drawImage(lightCv, 0, 0, VW, VH);
  if (fx.has('bloodmoon')) { ctx.fillStyle = 'rgba(120,0,0,.16)'; ctx.fillRect(0, 0, VW, VH); }
}

// ───────── weather overlays ─────────
const drops2 = Array.from({length: 220}, () => ({x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8}));
function drawWeather(now, dt) {
  const fx = fxNow();
  const rain = fx.has('storm') || fx.has('tornado') || fx.has('hail') || fx.has('lightning');
  if (rain) {
    ctx.strokeStyle = fx.has('hail') ? 'rgba(240,250,255,.8)' : 'rgba(170,200,255,.35)';
    ctx.lineWidth = fx.has('hail') ? 3 : 1.2;
    ctx.beginPath();
    for (const d of drops2) {
      d.y += dt * 1.4 * d.s; d.x += dt * 0.25;
      if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
      d.x %= 1;
      const x = d.x * VW, y = d.y * VH;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y - (fx.has('hail') ? 4 : 18));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,30,50,.12)'; ctx.fillRect(0, 0, VW, VH);
  }
  if (me && !me.dead && (me.hurt < 350 || me.hp < 30)) {
    const al = me.hurt < 350 ? 0.45 * (1 - me.hurt / 350) : 0.25 + 0.15 * Math.sin(now / 200);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.3, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(160,0,0,${al})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}

// ───────── HUD & RADAR MINIMAP ─────────
function bar(x, y, w, h, v, col, label) {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v / 100, 0, 1), h);
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#fff'; ctx.font = '600 11px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ${Math.round(v)}`, x + 6, y + h / 2 + 1);
}

function drawHUD(now, selfX, selfY, inVeh, b) {
  if (!latest || !me) return;
  ctx.textBaseline = 'middle';

  const wm = worldMouse();
  const playerHeading = inVeh ? inVeh.a : Math.atan2(wm.y - selfY, wm.x - selfX);

  // ───────── 1. THIN, MINIMALIST 360° COMPASS RIBBON WITH ARROWS ─────────
  const compW = Math.min(460, VW - 520);
  if (compW > 240) {
    const compX = Math.round(VW / 2 - compW / 2), compY = 8, compH = 22;
    ctx.save();
    // Sleek translucent glass background
    ctx.fillStyle = 'rgba(6, 10, 16, 0.78)';
    ctx.fillRect(compX, compY, compW, compH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(compX + 0.5, compY + 0.5, compW - 1, compH - 1);

    const viewDegRange = 90;
    let currentDeg = (playerHeading * 180 / Math.PI + 90) % 360;
    if (currentDeg < 0) currentDeg += 360;

    ctx.save();
    ctx.beginPath(); ctx.rect(compX + 1, compY + 1, compW - 2, compH - 2); ctx.clip();

    // Degree ticks
    for (let d = 0; d < 360; d += 15) {
      let diff = d - currentDeg;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      if (Math.abs(diff) <= viewDegRange / 2) {
        const tx = compX + compW / 2 + (diff / (viewDegRange / 2)) * (compW / 2 - 14);
        const isMajor = d % 45 === 0;
        ctx.strokeStyle = isMajor ? 'rgba(0, 229, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, compY + compH - (isMajor ? 8 : 4));
        ctx.lineTo(tx, compY + compH - 1);
        ctx.stroke();

        if (isMajor) {
          let label = String(d);
          if (d === 0) label = 'N';
          else if (d === 45) label = 'NE';
          else if (d === 90) label = 'E';
          else if (d === 135) label = 'SE';
          else if (d === 180) label = 'S';
          else if (d === 225) label = 'SW';
          else if (d === 270) label = 'W';
          else if (d === 315) label = 'NW';
          ctx.fillStyle = label === 'N' ? '#ff5252' : isMajor && label.length === 1 ? '#ffd700' : '#94a3b8';
          ctx.font = 'bold 9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(label, tx, compY + 8);
        }
      }
    }

    // Integrated minimalist arrow indicators directly on compass tape
    // 1. Nearest Shelter (Gold arrow ▲)
    let cPlot = null, cDist = Infinity;
    for (const plot of shelterPlots) {
      const d = Math.hypot(plot.x - selfX, plot.y - selfY);
      if (d < cDist) { cDist = d; cPlot = plot; }
    }
    if (cPlot) {
      const pAngle = Math.atan2(cPlot.y - selfY, cPlot.x - selfX);
      let pDeg = (pAngle * 180 / Math.PI + 90) % 360;
      if (pDeg < 0) pDeg += 360;
      let diff = pDeg - currentDeg;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      if (Math.abs(diff) <= viewDegRange / 2) {
        const px = compX + compW / 2 + (diff / (viewDegRange / 2)) * (compW / 2 - 14);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`▲ [${Math.round(cDist)}m] Shelter`, px, compY + 11);
      }
    }

    // 2. Player's Base (Emerald arrow ▲)
    if (me.plotId && (!cPlot || cPlot.id !== me.plotId)) {
      const myPlot = shelterPlots.find(p => p.id === me.plotId);
      if (myPlot) {
        const pAngle = Math.atan2(myPlot.y - selfY, myPlot.x - selfX);
        let pDeg = (pAngle * 180 / Math.PI + 90) % 360;
        if (pDeg < 0) pDeg += 360;
        let diff = pDeg - currentDeg;
        while (diff < -180) diff += 360;
        while (diff > 180) diff -= 360;
        if (Math.abs(diff) <= viewDegRange / 2) {
          const px = compX + compW / 2 + (diff / (viewDegRange / 2)) * (compW / 2 - 14);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(`▲ [${Math.round(Math.hypot(myPlot.x - selfX, myPlot.y - selfY))}m] Base`, px, compY + 11);
        }
      }
    }

    // 3. Waypoint (Cyan arrow ▲)
    if (waypoint) {
      const wAngle = Math.atan2(waypoint.y - selfY, waypoint.x - selfX);
      let wDeg = (wAngle * 180 / Math.PI + 90) % 360;
      if (wDeg < 0) wDeg += 360;
      let diff = wDeg - currentDeg;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      if (Math.abs(diff) <= viewDegRange / 2) {
        const wx = compX + compW / 2 + (diff / (viewDegRange / 2)) * (compW / 2 - 14);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`▲ [${Math.round(Math.hypot(waypoint.x - selfX, waypoint.y - selfY))}m] Pin`, wx, compY + 11);
      }
    }

    ctx.restore();

    // Center needle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(compX + compW / 2 - 4, compY);
    ctx.lineTo(compX + compW / 2 + 4, compY);
    ctx.lineTo(compX + compW / 2, compY + 5);
    ctx.fill();
    ctx.restore();

    // Clean, single-line mission breadcrumb underneath compass
    const mw = Math.min(380, VW - 540);
    const mx = VW / 2 - mw / 2, my = compY + compH + 4;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 16, 0.72)';
    ctx.fillRect(mx, my, mw, 20);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, 19);

    let stageText = 'Stage 1/5 · Scavenge & Claim Shelter [T]';
    if (me.beacon) {
      stageText = me.evacTimer > 0 ? `Stage 4/5 · EVAC HELI INCOMING: ${me.evacTimer}s!` : 'Stage 5/5 · BOARD EXTRACTION HELI!';
    } else if (me.plotId) {
      stageText = 'Stage 2/5 · Upgrade Turrets & Build Beacon [T]';
    }
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`🎯 ${stageText}`, mx + mw / 2, my + 10);
    ctx.restore();
  }

  // ───────── 2. TOP-LEFT SLEEK STATUS MICRO-DECK (NO CLUTTER) ─────────
  ctx.save();
  const tlx = 16, tly = 10, tlw = 270, tlh = 46;
  ctx.fillStyle = 'rgba(6, 10, 16, 0.8)';
  ctx.fillRect(tlx, tly, tlw, tlh);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; ctx.lineWidth = 1;
  ctx.strokeRect(tlx + 0.5, tly + 0.5, tlw - 1, tlh - 1);

  // Line 1: Resources & Time
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#ffd700';
  ctx.fillText(`⚙️ ${me.scrap || 0}`, tlx + 10, tly + 14);

  ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#c084fc';
  ctx.fillText(`⚛️ ${me.prestigeTokens || 0}`, tlx + 82, tly + 14);

  ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
  ctx.fillText(`⏱️ ${clockStr()}`, tlx + 140, tly + 14);

  // Line 2: Sector & Shelter Status
  ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#38bdf8';
  ctx.fillText(`${gridName(selfX, selfY)} · ${regionName(selfX, selfY)}`, tlx + 10, tly + 32);

  ctx.font = '600 10px system-ui'; ctx.fillStyle = me.plotId ? '#4ade80' : '#f59e0b';
  ctx.fillText(me.plotId ? `🏰 Base Lv.${me.plotLv || 1} [T/P]` : '🏰 Open Shelter [T]', tlx + 160, tly + 32);
  ctx.restore();

  // ───────── 3. BOTTOM-LEFT SLEEK SURVIVOR BIOMETRICS ─────────
  const bx = 18, by = VH - 108;
  const hasShield = me.hardlightShield > 0;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 16, 0.85)';
  const bioH = hasShield ? 104 : 90;
  const bioY = hasShield ? by - 14 : by;
  ctx.fillRect(bx, bioY, 230, bioH);
  ctx.strokeStyle = me.hp < 30 ? '#ef4444' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, bioY + 0.5, 229, bioH - 1);

  let curY = bioY + 6;
  if (hasShield) {
    bar(bx + 8, curY, 214, 10, (me.hardlightShield / 150) * 100, '#38bdf8', `🛡️ Shield ${Math.round(me.hardlightShield)}`);
    curY += 13;
  }
  bar(bx + 8, curY, 214, 16, me.hp, me.hp < 30 ? '#dc2626' : '#ef4444', `❤ HP ${Math.round(me.hp)}`);
  curY += 19;
  bar(bx + 8, curY, 214, 11, me.st, '#eab308', `⚡ STAMINA ${Math.round(me.st)}%`);
  curY += 14;
  bar(bx + 8, curY, 105, 10, me.hu, '#f97316', `🍖 ${Math.round(me.hu)}%`);
  bar(bx + 117, curY, 105, 10, me.th, '#06b6d4', `💧 ${Math.round(me.th)}%`);
  curY += 13;
  if (me.inf > 0) {
    bar(bx + 8, curY, 214, 10, me.inf, '#84cc16', `☣ Infection ${Math.round(me.inf)}%`);
    curY += 13;
  }

  // Status badges
  const st = [];
  if (me.bl) st.push(['BLEED', '#ef4444']);
  if (me.fr) st.push(['FRACTURE', '#f59e0b']);
  if (me.b & 32) st.push(['BURNING', '#f97316']);
  if (me.b & 1) st.push(['PAINKILLER', '#38bdf8']);
  if (me.b & 2) st.push(['ADRENALINE', '#eab308']);
  if (st.length > 0) {
    ctx.font = 'bold 9px system-ui';
    let sx = bx + 8;
    for (const [t, c] of st) {
      const w = ctx.measureText(t).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sx, curY + 2, w, 13);
      ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(sx, curY + 2, w, 13);
      ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(t, sx + 4, curY + 9);
      sx += w + 4;
    }
  }
  ctx.restore();

  // ───────── 4. BOTTOM-CENTER UNIFIED WEAPON SWITCH DOCK & AMMO COUNTER ─────────
  if (!me.veh) {
    const hbList = (inv && inv.hb) ? inv.hb : [
      [KNIFE || 0, 0, 0],
      [GLOCK || 1, 17, 0],
      null, null, null
    ];

    // Determine current active weapon
    let curW = null, curSlot = null;
    if (inv && inv.hb && inv.hb[me.sel]) {
      curSlot = inv.hb[me.sel];
      curW = WBY[curSlot[0]];
    } else {
      curW = me.sel === 0 ? WBY[KNIFE] : (me.sel === 1 ? WBY[GLOCK] : null);
    }

    const sw = 84, sh = 42, gap = 4;
    const totalW = 5 * sw + 4 * gap;
    const hx = Math.round(VW / 2 - totalW / 2);
    const hy = VH - sh - 12;

    // Munitions & Ammo Bar attached right above active weapon dock
    ctx.save();
    const ammoBarW = totalW;
    const ammoBarH = 28;
    const ammoBarY = hy - ammoBarH - 4;
    ctx.fillStyle = 'rgba(6, 10, 16, 0.88)';
    ctx.fillRect(hx, ammoBarY, ammoBarW, ammoBarH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx + 0.5, ammoBarY + 0.5, ammoBarW - 1, ammoBarH - 1);

    if (curW) {
      // Weapon icon & name on left
      ctx.textAlign = 'left';
      ctx.font = '14px sans-serif';
      ctx.fillText(W_IC[curW.cat] || '🔫', hx + 8, ammoBarY + ammoBarH / 2);
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(curW.name, hx + 28, ammoBarY + ammoBarH / 2);

      // Ammo numerals on right
      if (curW.mag) {
        const mag = me.mag !== undefined ? me.mag : (curSlot ? curSlot[1] : curW.mag);
        const res = me.res >= 0 ? me.res : 0;
        ctx.textAlign = 'right';
        ctx.font = '900 18px monospace';
        ctx.fillStyle = mag > 0 ? '#ffd700' : '#ef4444';
        ctx.fillText(String(mag), hx + ammoBarW - 90, ammoBarY + ammoBarH / 2 + 1);

        ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#94a3b8';
        ctx.fillText(`/ ${curW.mag}`, hx + ammoBarW - 65, ammoBarY + ammoBarH / 2);

        ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#38bdf8';
        ctx.fillText(`+${res}`, hx + ammoBarW - 24, ammoBarY + ammoBarH / 2);

        ctx.font = '9px system-ui'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
        ctx.fillText(`[R] Reload`, hx + ammoBarW / 2 + 20, ammoBarY + ammoBarH / 2);
      } else if (curW.count) {
        ctx.textAlign = 'right';
        ctx.font = '900 16px monospace'; ctx.fillStyle = '#ffd700';
        ctx.fillText(`×${me.n || (curSlot ? curSlot[2] : 1)}`, hx + ammoBarW - 14, ammoBarY + ammoBarH / 2);
      } else {
        ctx.textAlign = 'right';
        ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#ffd700';
        ctx.fillText('MELEE · UNLIMITED', hx + ammoBarW - 14, ammoBarY + ammoBarH / 2);
      }

      // Reloading progress overlay
      if (me.rl > 0 && me.rlT > 0) {
        const prog = clamp(1 - me.rl / me.rlT, 0, 1);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.fillRect(hx + 1, ammoBarY + 1, (ammoBarW - 2) * prog, ammoBarH - 2);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`RELOADING ${Math.round(prog * 100)}%`, hx + ammoBarW / 2, ammoBarY + ammoBarH / 2);
      }
    } else {
      ctx.textAlign = 'center'; ctx.font = 'italic 11px system-ui'; ctx.fillStyle = '#64748b';
      ctx.fillText('Unarmed (Press 1 or 2 to equip weapon)', hx + ammoBarW / 2, ammoBarY + ammoBarH / 2);
    }
    ctx.restore();

    // 5-Slot Weapon Hotbar
    for (let i = 0; i < 5; i++) {
      const s = hbList[i], x = hx + i * (sw + gap), sel = me.sel === i;
      ctx.save();
      ctx.fillStyle = sel ? 'rgba(30, 41, 59, 0.95)' : 'rgba(6, 10, 16, 0.75)';
      ctx.fillRect(x, hy, sw, sh);
      ctx.strokeStyle = sel ? '#ffd700' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = sel ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, hy + 0.5, sw - 1, sh - 1);

      // Slot digit
      ctx.fillStyle = sel ? '#ffd700' : '#64748b';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`[${i + 1}]`, x + 4, hy + 8);

      if (s) {
        const w = WBY[s[0]] || (s[0] === 0 ? WBY[KNIFE] : (s[0] === 1 ? WBY[GLOCK] : null));
        if (w) {
          ctx.font = '14px sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(W_IC[w.cat] || '🔫', x + 5, hy + 26);

          ctx.fillStyle = sel ? '#ffffff' : '#cbd5e1';
          ctx.font = 'bold 10px system-ui';
          let nm = w.name;
          if (nm.length > 8) nm = nm.slice(0, 7) + '…';
          ctx.fillText(nm, x + 24, hy + 19);

          ctx.fillStyle = sel ? '#ffd700' : '#94a3b8';
          ctx.font = 'bold 9px monospace';
          const mag = sel ? me.mag : s[1], cnt = sel ? me.n : s[2];
          ctx.fillText(w.count ? `×${cnt}` : w.mag ? `${mag}/${w.mag}` : 'melee', x + 24, hy + 32);
        }
      }
      ctx.restore();
    }
  }

  // ───────── 5. SLEEK VEHICLE TELEMETRY (WHEN DRIVING) ─────────
  if (me.veh && inVeh) {
    const d = D.VEH[D.VLIST[inVeh.v[1]]];
    const px = VW / 2 - 140, py = VH - 64;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 16, 0.88)';
    ctx.fillRect(px, py, 280, 52);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, 279, 51);

    const spd = Math.round(inVeh.v[8] / 10);
    const isBraking = !!(keys.Space || keys.KeyS || keys.ArrowDown);
    const isBoosting = !!(keys.ShiftLeft || keys.ShiftRight);

    // Speedometer text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 11px system-ui';
    ctx.fillText(`${d.n} · GEAR: ${spd < -2 ? 'R' : spd > 2 ? 'D' : 'N'}`, px + 10, py + 14);

    ctx.fillStyle = isBraking ? '#ef4444' : '#ffffff';
    ctx.font = '900 18px monospace';
    ctx.fillText(`${Math.abs(spd)} MPH ${isBraking ? '[BRAKE]' : isBoosting ? '[NITRO]' : ''}`, px + 10, py + 34);

    // Hull & Fuel mini bars
    ctx.textAlign = 'right';
    bar(px + 170, py + 8, 100, 12, me.vh, '#4ade80', 'Hull');
    bar(px + 170, py + 26, 100, 12, me.vf, '#f59e0b', 'Fuel');
    ctx.restore();
  }

  // ───────── 9. TACTICAL RADAR MINIMAP (TOP-RIGHT) ─────────
  const mmR = 104, mmcx = VW - mmR - 18, mmcy = mmR + 18;
  const range = 4200, scale = (mmR * 2) / range;

  ctx.save();
  ctx.beginPath(); ctx.arc(mmcx, mmcy, mmR, 0, 7); ctx.clip();
  ctx.fillStyle = '#080d14'; ctx.fillRect(mmcx - mmR, mmcy - mmR, mmR * 2, mmR * 2);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mini, (selfX - range / 2) / TS, (selfY - range / 2) / TS, range / TS, range / TS, mmcx - mmR, mmcy - mmR, mmR * 2, mmR * 2);
  ctx.imageSmoothingEnabled = true;

  const mm = (x, y) => [mmcx + (x - selfX) * scale, mmcy + (y - selfY) * scale];

  const sweepAngle = (now / 600) % (Math.PI * 2);
  const sweepGrad = ctx.createRadialGradient(mmcx, mmcy, 0, mmcx, mmcy, mmR);
  sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)'); sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
  ctx.fillStyle = sweepGrad;
  ctx.beginPath(); ctx.moveTo(mmcx, mmcy);
  ctx.arc(mmcx, mmcy, mmR, sweepAngle - 0.45, sweepAngle);
  ctx.closePath(); ctx.fill();

  // Red Zombie blips
  ctx.fillStyle = '#ff3b3b';
  for (const z of b.Z.values()) {
    const [zx, zy] = mm(z[2], z[3]);
    if (Math.hypot(zx - mmcx, zy - mmcy) < mmR - 2) {
      ctx.beginPath(); ctx.arc(zx, zy, 2.5, 0, 7); ctx.fill();
    }
  }

  // Cyan Vehicle blips
  ctx.fillStyle = '#00e5ff';
  for (const v of b.V.values()) {
    const [vx2, vy2] = mm(v[2], v[3]);
    if (Math.hypot(vx2 - mmcx, vy2 - mmcy) < mmR - 2) {
      ctx.beginPath(); ctx.arc(vx2, vy2, 3.5, 0, 7); ctx.fill();
    }
  }

  // Golden Shelter Plots on minimap (all 16 shelters with plot numbers)
  for (const plot of shelterPlots) {
    let [px, py] = mm(plot.x, plot.y);
    const distToCenter = Math.hypot(px - mmcx, py - mmcy);
    if (distToCenter > mmR - 6) {
      const edgeAngle = Math.atan2(py - mmcy, px - mmcx);
      px = mmcx + Math.cos(edgeAngle) * (mmR - 8);
      py = mmcy + Math.sin(edgeAngle) * (mmR - 8);
    }
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 7 + Math.sin(now / 200) * 2, 0, 7); ctx.stroke();
  }

  if (waypoint) {
    const [wx, wy] = mm(waypoint.x, waypoint.y);
    ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(wx, wy, 5, 0, 7); ctx.fill();
  }

  ctx.restore();

  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(mmcx, mmcy, mmR, 0, 7); ctx.stroke();
  ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#00e5ff'; ctx.textAlign = 'center';
  ctx.fillText('N', mmcx, mmcy - mmR + 12);
  ctx.fillText('S', mmcx, mmcy + mmR - 6);
  ctx.fillText('W', mmcx - mmR + 8, mmcy + 3);
  ctx.fillText('E', mmcx + mmR - 8, mmcy + 3);

  ctx.save(); ctx.translate(mmcx, mmcy);
  ctx.rotate(playerHeading);
  ctx.fillStyle = '#ffd166'; ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#cbd5e1'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
  ctx.fillText(`${gridName(selfX, selfY)} · (${Math.round(selfX)}, ${Math.round(selfY)}) · ${ping}ms`, VW - 18, mmcy + mmR + 14);

  // ───────── 10. INTERACTION HINT ─────────
  const hint = interactionHint(selfX, selfY);
  if (hint) {
    ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
    const w = ctx.measureText(hint).width + 28;
    ctx.fillStyle = 'rgba(10, 15, 24, 0.92)'; ctx.fillRect(VW / 2 - w / 2, VH / 2 + 56, w, 28);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5; ctx.strokeRect(VW / 2 - w / 2, VH / 2 + 56, w, 28);
    ctx.fillStyle = '#ffd700'; ctx.fillText(hint, VW / 2, VH / 2 + 70);
  }

  // ───────── 11. PRECISION TACTICAL CROSSHAIR ─────────
  if (!uiBlock()) {
    const cx = mouse.x, cy = mouse.y;
    ctx.save();
    const sp = (keys.ShiftLeft || keys.ShiftRight) ? 14 : 7;
    ctx.strokeStyle = mode ? '#ffd166' : '#ffffff';
    ctx.lineWidth = 1.8;

    // 4 Crosshair hash marks
    ctx.beginPath();
    ctx.moveTo(cx - sp - 8, cy); ctx.lineTo(cx - sp, cy);
    ctx.moveTo(cx + sp, cy); ctx.lineTo(cx + sp + 8, cy);
    ctx.moveTo(cx, cy - sp - 8); ctx.lineTo(cx, cy - sp);
    ctx.moveTo(cx, cy + sp); ctx.lineTo(cx, cy + sp + 8);
    ctx.stroke();

    // Center precision dot
    ctx.fillStyle = mode ? '#ffd166' : '#00e5ff';
    ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, 7); ctx.fill();

    // Small outer reticle ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, sp + 9, 0, 7); ctx.stroke();

    // Reload circular meter
    if (me.rl > 0 && me.rlT > 0) {
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, sp + 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - me.rl / me.rlT));
      ctx.stroke();
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center';
      ctx.fillText('RELOAD', cx, cy + sp + 22);
    }
    ctx.restore();
  }
}

function interactionHint(x, y) {
  if (me.dead) return '';
  if (me.veh) return 'E exit · H horn/siren · X switch seat · Shift boost';

  // Check near shelter plot
  const np = findNearestPlot(x, y, 220);
  if (np) {
    return np.ownerName ? `E / T — Access ${np.name} (Shelter Tycoon)` : `E — Claim ${np.name}`;
  }

  let bi = null, bd = 80;
  for (const it of items.values()) {
    const d = Math.hypot(it.x - x, it.y - y);
    if (d < bd) { bd = d; bi = it; }
  }
  if (bi) return `E — ${bi.k === 'vault' ? 'open' : 'pick up'} ${itemName(bi.k, bi.n)}${bi.label ? ' (' + bi.label + ')' : ''}`;

  if (latest) for (const v of latest.V.values()) {
    const d = D.VEH[D.VLIST[v[1]]]; if (v[7] & 32) continue;
    if (Math.hypot(v[2] - x, v[3] - y) < d.r + 80) return `E — DRIVE ${d.n} · hull ${v[5]}% · fuel ${v[6]}%`;
  }

  // Check near enterable building doorways
  if (M && M.rects) {
    for (const idx of rectsIn(x - 120, y - 120, x + 120, y + 120)) {
      const b = M.rects[idx];
      if (b[2] >= 64 && b[3] >= 64) {
        const distDoor = Math.hypot(x - (b[0] + b[2] / 2), y - (b[1] + b[3]));
        if (distDoor < 90) return 'Walk into open doorway to enter building interior';
      }
    }
  }

  for (const s of structs.values()) {
    const d = D.STRUCTS[s.k];
    if (Math.hypot(s.x - x, s.y - y) < 95) {
      if (d.door) return `E — ${s.open ? 'close' : 'open'} door`;
      if (d.water) return s.wat ? 'E — drink clean water' : `${d.n} (collecting water…)`;
    }
  }
  for (const [dx, dy] of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]]) {
    if (D.TILES[tileAt(x + dx, y + dy)].water) return 'E — drink (risky without purification)';
  }
  return '';
}

// ───────── big map ─────────
const bm = $('bigmap'), bmx = bm.getContext('2d');
const mapView = {cx: 16000, cy: 16000, s: 0.03, drag: null};
function sizeBigmap() { bm.width = VW * DPR; bm.height = VH * DPR; bm.style.width = VW + 'px'; bm.style.height = VH + 'px'; }
function toggleMap() {
  bm.hidden = !bm.hidden;
  if (!bm.hidden) {
    sizeBigmap(); mapView.cx = WP / 2; mapView.cy = HP / 2;
    mapView.s = Math.min(VW, VH) / WP * 0.95;
    requestAnimationFrame(drawBigmap);
  }
}
bm.addEventListener('wheel', e => {
  e.preventDefault();
  const f = e.deltaY > 0 ? 0.85 : 1.18;
  const wx = mapView.cx + (e.clientX - VW / 2) / mapView.s, wy = mapView.cy + (e.clientY - VH / 2) / mapView.s;
  mapView.s = clamp(mapView.s * f, Math.min(VW, VH) / WP * 0.5, 0.6);
  mapView.cx = wx - (e.clientX - VW / 2) / mapView.s;
  mapView.cy = wy - (e.clientY - VH / 2) / mapView.s;
}, {passive: false});

bm.addEventListener('mousedown', e => {
  mapView.drag = {x: e.clientX, y: e.clientY, cx: mapView.cx, cy: mapView.cy, moved: false, b: e.button};
});
bm.addEventListener('mousemove', e => {
  mapView.mx = e.clientX; mapView.my = e.clientY;
  const d = mapView.drag; if (!d) return;
  if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
  mapView.cx = d.cx - (e.clientX - d.x) / mapView.s;
  mapView.cy = d.cy - (e.clientY - d.y) / mapView.s;
});
bm.addEventListener('mouseup', e => {
  const d = mapView.drag; mapView.drag = null;
  if (d && !d.moved) {
    if (d.b === 2) { waypoint = null; return; }
    waypoint = {x: mapView.cx + (e.clientX - VW / 2) / mapView.s, y: mapView.cy + (e.clientY - VH / 2) / mapView.s};
    toast('Waypoint set');
  }
});

function drawBigmap() {
  if (bm.hidden || !D) return;
  const g = bmx, s = mapView.s, now = performance.now();
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = '#05070a'; g.fillRect(0, 0, VW, VH);
  const W2 = (x, y) => [(x - mapView.cx) * s + VW / 2, (y - mapView.cy) * s + VH / 2];
  const [ox, oy] = W2(0, 0);
  g.imageSmoothingEnabled = s * TS < 2;
  g.drawImage(mini, ox, oy, WP * s, HP * s);

  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.font = '10px system-ui';
  g.fillStyle = 'rgba(255,255,255,.5)'; g.textAlign = 'center';
  for (let i = 0; i <= 20; i++) {
    const [x] = W2(i * 1600, 0), [, y] = W2(0, i * 1600);
    g.beginPath(); g.moveTo(x, oy); g.lineTo(x, oy + HP * s); g.stroke();
    g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + WP * s, y); g.stroke();
    if (i < 20) {
      g.fillText(String.fromCharCode(65 + i), x + 800 * s, oy - 8);
      g.fillText(String(i + 1), ox - 10, y + 800 * s);
    }
  }

  // Draw 16 Shelter plots on Big Map
  for (const plot of shelterPlots) {
    const [px, py] = W2(plot.x, plot.y);
    g.fillStyle = '#ffd700'; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
    if (s > 0.05) {
      g.font = 'bold 11px system-ui'; g.fillStyle = '#ffd700';
      g.fillText(`🏰 ${plot.name}`, px, py - 10);
    }
  }

  // Draw landmarks
  for (const L of M.landmarks) {
    const [x, y] = W2(L[2], L[3]);
    if (x < -50 || y < -50 || x > VW + 50 || y > VH + 50) continue;
    g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill();
    if (s > 0.09) {
      g.font = '600 11px system-ui'; g.lineWidth = 3; g.strokeStyle = '#000';
      g.strokeText(L[0], x, y - 9); g.fillStyle = '#fff'; g.fillText(L[0], x, y - 9);
    }
  }

  if (waypoint) {
    const [wx, wy] = W2(waypoint.x, waypoint.y);
    g.strokeStyle = '#00e5ff'; g.lineWidth = 3;
    g.beginPath(); g.arc(wx, wy, 8, 0, 7); g.stroke();
  }

  const [mx, my] = W2(pred.x, pred.y);
  g.fillStyle = '#ffd166'; g.strokeStyle = '#000'; g.lineWidth = 2;
  g.beginPath(); g.arc(mx, my, 6 + Math.sin(now / 200) * 1.5, 0, 7); g.fill(); g.stroke();

  g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(10, VH - 36, 600, 26);
  g.fillStyle = '#cfd6df'; g.font = '12px system-ui';
  g.fillText('Wheel zoom · drag pan · click = waypoint · right-click = clear · M / Esc close · 🏰 = Shelter Plots', 18, VH - 20);

  requestAnimationFrame(drawBigmap);
}

})();
