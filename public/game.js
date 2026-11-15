(() => {
'use strict';
// ═════════════════════════ DEAD WORLD client ═════════════════════════
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
const lightCv = document.createElement('canvas'), lx = lightCv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(1.5, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  lightCv.width = Math.max(160, Math.ceil(VW * 0.38));
  lightCv.height = Math.max(120, Math.ceil(VH * 0.38));
  if (!$('bigmap').hidden) sizeBigmap();
}
addEventListener('resize', resize); resize();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
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
let tiles, region, TS = 80, MW = 0, MH = 0, WP = 0, HP = 0, WBY = {}, KNIFE = null, GLOCK = null;
const snaps = []; let latest = null; const items = new Map(), structs = new Map(); let effects = [];
const pred = {x: 0, y: 0, ps: -1, a: 0};
const vehPred = {id: 0, x: 0, y: 0, a: 0, sp: 0, vx: 0, vy: 0, alt: 0, steerAngle: 0, sa: 0, lastSkidAt: 0, active: false};
let zoom = 1, userZoom = 1, camX = 0, camY = 0, shake = 0, frameN = 0, gameTime = 0.3, lastSend = 0;
const keys = {}; const mouse = {x: 0, y: 0, l: false, r: false};
let mode = null, waypoint = null, chatOpen = false, masterVol = +(localStorage.getItem('dw_vol') || 0.6);
const reveals = [], fxs = [], decals = [], warns = [], drops = [], particles = [], floaters = [];
const TEAMCOL = ['#4cc9f0', '#ff4d4d', '#4d8bff', '#4dff88', '#ffd24d'];
const TEAM_PAL = {};
const VEH_PAL = {};
const boardNames = new Map();
const SPIKE_TRIG = Array.from({length: 8}, (_, k) => [Math.cos(k * 0.78539816), Math.sin(k * 0.78539816)]);
let lastSnapZone = 'world';
const bunkerStaticCache = { bunker: null, raid: null, airport: null, university: null, hospital: null, mall: null, military: null, historic: null, museum: null, transit: null, industrial: null };
let lastMmDraw = 0, _mmCv = null, _mmCtx = null;
const hudCache = {};

// Pre-baked offscreen radial glow sprites & cached text metrics (zero per-frame gradient/measure allocations)
const TXT_W = new Map();
function txtW(font, s) {
  const k = font + '|' + s;
  let w = TXT_W.get(k);
  if (w !== undefined) return w;
  if (TXT_W.size > 450) TXT_W.clear();
  ctx.font = font;
  w = ctx.measureText(s).width;
  TXT_W.set(k, w);
  return w;
}
function makeGlowSprite(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [pos, col] of stops) gr.addColorStop(pos, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}
const GLOW_SPR = {
  warm: makeGlowSprite([[0, 'rgba(254,240,138,0.28)'], [0.55, 'rgba(254,240,138,0.07)'], [1, 'rgba(0,0,0,0)']]),
  scorch: makeGlowSprite([[0, 'rgba(10,8,6,0.72)'], [0.65, 'rgba(10,8,6,0.25)'], [1, 'rgba(10,8,6,0)']]),
  crater: makeGlowSprite([[0, 'rgba(20,15,10,0.85)'], [0.7, 'rgba(60,120,20,0.35)'], [1, 'rgba(60,120,20,0)']]),
  smoke: makeGlowSprite([[0, 'rgba(170,170,170,0.52)'], [0.55, 'rgba(170,170,170,0.2)'], [1, 'rgba(170,170,170,0)']]),
  toxic: makeGlowSprite([[0, 'rgba(140,200,40,0.34)'], [0.55, 'rgba(140,200,40,0.12)'], [1, 'rgba(140,200,40,0)']]),
  purple: makeGlowSprite([[0, '#f3e8ff'], [0.35, 'rgba(168,85,247,0.78)'], [1, 'rgba(168,85,247,0)']]),
  gold: makeGlowSprite([[0, 'rgba(251,191,36,0.38)'], [0.6, 'rgba(168,85,247,0.2)'], [1, 'rgba(56,189,248,0)']]),
  green: makeGlowSprite([[0, 'rgba(77,255,136,0.16)'], [0.85, 'rgba(77,255,136,0.04)'], [1, 'rgba(77,255,136,0)']]),
  flame: makeGlowSprite([[0, 'rgba(255,240,150,0.92)'], [0.5, 'rgba(255,120,20,0.6)'], [1, 'rgba(255,60,0,0)']]),
  boom: makeGlowSprite([[0, 'rgba(255,255,220,0.95)'], [0.42, 'rgba(255,190,70,0.78)'], [1, 'rgba(80,40,20,0)']]),
  hurt: makeGlowSprite([[0, 'rgba(160,0,0,0)'], [0.55, 'rgba(160,0,0,0.28)'], [1, 'rgba(160,0,0,0.88)']])
};
const LIGHT_MASK_CIRCLE = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(0.58, 'rgba(0,0,0,0.62)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
})();
const LIGHT_MASK_CONE = (() => {
  const c = document.createElement('canvas'); c.width = 192; c.height = 192;
  const g = c.getContext('2d'), gr = g.createRadialGradient(0, 96, 0, 0, 96, 192);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(0.68, 'rgba(0,0,0,0.68)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 96); g.arc(0, 96, 192, -0.46, 0.46); g.closePath(); g.fill();
  return c;
})();
function vehPal(hex) {
  let p = VEH_PAL[hex];
  if (!p) {
    const rgb = hex2(hex);
    p = VEH_PAL[hex] = { top: shade(rgb, 1.18), mid: hex, bot: shade(rgb, 0.74), turret: shade(rgb, 0.8) };
  }
  return p;
}

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
      boardNames.clear();
      for (let i = 0; i < board.length; i++) boardNames.set(board[i][0], board[i][1]);
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
        me.prestigeTokens = m.tokens !== undefined ? m.tokens : (m.prestigeTokens || 0);
        me.rebornPerks = m.perks || m.rebornPerks || {};
      }
      showBanner('✨ ASCENSION TRANSCENDENCE COMPLETE! ✨', `Tier ${m.rebirths} Ascendant · +${m.rebirths * 25}% Permanent Scrap Yield`, '#a855f7', 8000);
      sfx('event');
      burst(pred.x, pred.y, 80, '#00e5ff', 300, 1500, 8);
      renderRebornModal();
      break;
    case 'reborn_updated':
      if (me) {
        me.prestigeTokens = m.tokens !== undefined ? m.tokens : (m.prestigeTokens || 0);
        me.rebornPerks = m.perks || m.rebornPerks || {};
      }
      toast('🧬 Ascendant Perk Mutated!');
      sfx('pick');
      renderRebornModal();
      break;
    case 'mission_done':
      showBanner(`🏆 ${m.title} COMPLETE!`, `Reward: +${m.scrap} ⚙️ Scrap · +${m.cores} ⚛️ Cores`, '#ffd166', 6500);
      sfx('event');
      burst(pred.x, pred.y, 45, '#ffd166', 240, 1100, 6);
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
  D.W.forEach(w => WBY[w.key] = w);
  if (D.ZLIST && D.ZD) {
    for (const k of D.ZLIST) {
      const zd = D.ZD[k];
      if (!zd) continue;
      const rgb = hex2(zd.c);
      zd._shC = shade(rgb, 0.78);
      zd._armC = shade(rgb, 0.65);
      zd._hiC = shade(rgb, 1.2);
    }
  }
  const kf = D.W.find(w => w.cat === 'dagger') || D.W[0];
  const gl = D.W.find(w => w.cat === 'pistol') || D.W[1];
  KNIFE = kf ? kf.key : null;
  GLOCK = gl ? gl.key : null;
  tiles = b64(M.tiles); region = b64(M.region);
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
const RG = new Map(), ENT_GRID = new Map(), PORTAL_RECTS = new Set();
let _rgSeen = null, _rgStamp = 1;
const _rgOut = [], _egOut = [];
function buildRectGrid() {
  RG.clear(); ENT_GRID.clear(); PORTAL_RECTS.clear();
  _rgSeen = new Int32Array(M.rects.length);
  _rgStamp = 1;
  M.rects.forEach((r, i) => {
    for (let cx = Math.floor(r[0] / 320); cx <= Math.floor((r[0] + r[2]) / 320); cx++) {
      for (let cy = Math.floor(r[1] / 320); cy <= Math.floor((r[1] + r[3]) / 320); cy++) {
        const k = cx * 65536 + cy;
        let a = RG.get(k); if (!a) { a = []; RG.set(k, a); }
        a.push(i);
      }
    }
  });
  if (M.entrances) {
    for (const ent of M.entrances) {
      const k = Math.floor(ent.x / 640) * 65536 + Math.floor(ent.y / 640);
      let a = ENT_GRID.get(k); if (!a) { a = []; ENT_GRID.set(k, a); }
      a.push(ent);
      for (const idx of rectsIn(ent.x - 40, ent.y - 40, ent.x + 40, ent.y + 40)) {
        const q = M.rects[idx];
        if (Math.abs(ent.x - (q[0] + q[2] / 2)) < 28 && Math.abs(ent.y - (q[1] + q[3])) < 28) {
          PORTAL_RECTS.add(idx);
        }
      }
    }
  }
}
function rectsIn(x0, y0, x1, y1) {
  _rgOut.length = 0;
  if (!_rgSeen) return _rgOut;
  if (++_rgStamp > 1000000000) { _rgSeen.fill(0); _rgStamp = 1; }
  const st = _rgStamp;
  for (let cx = Math.floor(x0 / 320); cx <= Math.floor(x1 / 320); cx++) {
    for (let cy = Math.floor(y0 / 320); cy <= Math.floor(y1 / 320); cy++) {
      const a = RG.get(cx * 65536 + cy);
      if (a) for (let j = 0; j < a.length; j++) {
        const i = a[j];
        if (_rgSeen[i] !== st) { _rgSeen[i] = st; _rgOut.push(i); }
      }
    }
  }
  return _rgOut;
}
function entrancesIn(x0, y0, x1, y1) {
  _egOut.length = 0;
  for (let cx = Math.floor(x0 / 640); cx <= Math.floor(x1 / 640); cx++) {
    for (let cy = Math.floor(y0 / 640); cy <= Math.floor(y1 / 640); cy++) {
      const a = ENT_GRID.get(cx * 65536 + cy);
      if (a) for (let j = 0; j < a.length; j++) _egOut.push(a[j]);
    }
  }
  return _egOut;
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

function interiorTypeOf(zone) {
  if (!zone || zone === 'world') return null;
  if (zone.startsWith('raid_')) return 'raid';
  if (zone.startsWith('air_')) return 'airport';
  if (zone.startsWith('univ_')) return 'university';
  if (zone.startsWith('hosp_')) return 'hospital';
  if (zone.startsWith('mall_')) return 'mall';
  if (zone.startsWith('mil_')) return 'military';
  if (zone.startsWith('hist_')) return 'historic';
  if (zone.startsWith('mus_')) return 'museum';
  if (zone.startsWith('hub_')) return 'transit';
  if (zone.startsWith('ind_')) return 'industrial';
  if (zone.startsWith('pol_')) return 'police';
  if (zone.startsWith('fire_')) return 'fire';
  if (zone.startsWith('bank_')) return 'bank';
  if (zone.startsWith('stad_')) return 'stadium';
  if (zone.startsWith('aqua_')) return 'aquarium';
  if (zone.startsWith('sci_')) return 'science';
  if (zone.startsWith('baz_')) return 'bazaar';
  if (zone.startsWith('pyr_')) return 'pyramid';
  if (zone.startsWith('mosq_')) return 'mosque';
  if (zone.startsWith('cap_')) return 'capitol';
  if (zone.startsWith('pal_')) return 'palace';
  if (zone.startsWith('grn_')) return 'greenhouse';
  if (zone.startsWith('mill_')) return 'mill';
  return 'bunker';
}

function getEntranceInfo(zone) {
  if (!M || !M.entrances || !zone) return null;
  if (!M._entMap) {
    M._entMap = new Map();
    for (const e of M.entrances) M._entMap.set(e.id, e);
  }
  return M._entMap.get(zone) || null;
}

function currentInteriorDef() {
  if (!D || !D.INTERIORS || !me || !me.zone || me.zone === 'world') return null;
  return D.INTERIORS[interiorTypeOf(me.zone)] || null;
}

function blockedAt(x, y, r, kind = 'walk') {
  const idef = currentInteriorDef();
  if (idef) {
    if (x < 28 + r || y < 28 + r || x > idef.w - 28 - r || y > idef.h - 28 - r) return true;
    for (const w of idef.walls) {
      if (circRect(x, y, r, w[0], w[1], w[2], w[3])) return true;
    }
    for (const s of structs.values()) {
      if (Math.abs(s.x - x) > 160 || Math.abs(s.y - y) > 160) continue;
      const d = D.STRUCTS[s.k];
      if (!d || d.block === 0 || (d.door && s.open)) continue;
      if (circRect(x, y, r, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)) return true;
    }
    return false;
  }

  if (x < r || y < r || x > WP - r || y > HP - r) return true;
  if (kind !== 'fly') {
    for (let ty = Math.floor((y - r) / TS); ty <= Math.floor((y + r) / TS); ty++) {
      for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) {
        if (ty < 0 || tx < 0 || tx >= MW || ty >= MH) return true;
        const tp = D.TILES[tiles[ty * MW + tx]];
        if (!tp) continue;
        let s = tp.solid;
        if (!s) {
          if (kind === 'car') s = tp.vsolid;
          else if (kind === 'boat') s = !tp.water;
          else if (kind === 'amphib') s = tp.vsolid && !tp.water;
        }
        if (s && circRect(x, y, r, tx * TS, ty * TS, TS, TS)) return true;
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
      if (!d || d.block === 0 || (d.door && s.open)) continue;
      if (circRect(x, y, r, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)) return true;
    }
    // 16 Designated Shelter Tycoon Plots
    for (const plot of shelterPlots) {
      if (Math.abs(plot.x - x) > 550 || Math.abs(plot.y - y) > 550) continue;
      const isAuth = me && (me.id === plot.owner || (plot.team > 0 && me.team === plot.team) || !plot.owner || settings.mode === 'coop');
      if (circleShelterCollide(x, y, r, plot, isAuth)) return true;
    }
  }
  return false;
}
function moveCircle(e, dx, dy, r, kind = 'walk') {
  if (blockedAt(e.x, e.y, r, kind)) { e.x += dx; e.y += dy; return; }
  const steps = Math.max(1, Math.ceil((Math.abs(dx) + Math.abs(dy)) / (r * 0.6)));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (!blockedAt(e.x + sx, e.y, r, kind)) e.x += sx;
    if (!blockedAt(e.x, e.y + sy, r, kind)) e.y += sy;
  }
}
function moveVehiclePred(e, dx, dy, r, kind) {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.01) return {hit: false, nx: 0, ny: 0};
  if (blockedAt(e.x, e.y, r, kind)) {
    let rescued = false;
    for (const rad of [6, 14, 24, 38, 56, 78]) {
      for (let k = 0; k < 8 && !rescued; k++) {
        const ang = k * Math.PI * 0.25, px = e.x + Math.cos(ang) * rad, py = e.y + Math.sin(ang) * rad;
        if (!blockedAt(px, py, r, kind)) { e.x = px; e.y = py; rescued = true; }
      }
      if (rescued) break;
    }
    if (!rescued) return {hit: true, nx: 1, ny: 0};
  }
  const steps = clamp(Math.ceil(dist / Math.max(5, r * 0.4)), 1, 16);
  const sx = dx / steps, sy = dy / steps;
  let hit = false, hnx = 0, hny = 0;
  for (let i = 0; i < steps; i++) {
    const nxPos = e.x + sx, nyPos = e.y + sy;
    if (!blockedAt(nxPos, nyPos, r, kind)) {
      e.x = nxPos; e.y = nyPos;
    } else {
      hit = true;
      let gx = 0, gy = 0;
      for (let k = 0; k < 8; k++) {
        const ang = k * (Math.PI * 0.25);
        const ox = Math.cos(ang), oy = Math.sin(ang);
        if (blockedAt(nxPos + ox * 4, nyPos + oy * 4, r, kind)) {
          gx -= ox; gy -= oy;
        }
      }
      const gl = Math.hypot(gx, gy);
      if (gl > 0.01) {
        gx /= gl; gy /= gl;
        const stepDotN = sx * gx + sy * gy;
        if (stepDotN < 0) {
          const tx = sx - gx * stepDotN, ty = sy - gy * stepDotN;
          if (!blockedAt(e.x + tx, e.y + ty, r, kind)) { e.x += tx; e.y += ty; }
          else if (!blockedAt(e.x + sx, e.y, r, kind)) { e.x += sx; gx = 0; gy = sy < 0 ? 1 : -1; }
          else if (!blockedAt(e.x, e.y + sy, r, kind)) { e.y += sy; gx = sx < 0 ? 1 : -1; gy = 0; }
        }
        hnx = gx; hny = gy;
      } else {
        if (!blockedAt(e.x + sx, e.y, r, kind)) { e.x += sx; hnx = 0; hny = sy > 0 ? -1 : 1; }
        else if (!blockedAt(e.x, e.y + sy, r, kind)) { e.y += sy; hnx = sx > 0 ? -1 : 1; hny = 0; }
        else { hnx = sx !== 0 ? -Math.sign(sx) : 0; hny = sy !== 0 ? -Math.sign(sy) : 0; }
      }
    }
  }
  return {hit, nx: hnx, ny: hny};
}
const themeAt = (x, y) => M.themes[region[clamp(Math.floor(y / TS), 0, MH - 1) * MW + clamp(Math.floor(x / TS), 0, MW - 1)]];
const regionName = (x, y) => M.rnames[region[clamp(Math.floor(y / TS), 0, MH - 1) * MW + clamp(Math.floor(x / TS), 0, MW - 1)]];
const gridName = (x, y) => String.fromCharCode(65 + clamp(Math.floor(x / 1600), 0, 19)) + (clamp(Math.floor(y / 1600), 0, 19) + 1);

// ───────── colours & styles ─────────
const TCOL = ['#1d4e89', '#3a86c8', '#e2cf8f', '#5d9b4c', '#3b6e34', '#3d3d42', '#9a9a94', '#a88a4e', '#6e6660', '#eef3f7', '#bfe6f5', '#e2541b', '#f2f0e6', '#9b7a55', '#4f6b3f', '#3f9a3f', '#2e2e33', '#6cc35a', '#d8b46a', '#7fa33a', '#4a4a50'];
const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TRGB = TCOL.map(hex2);
const shade = (rgb, f) => `rgb(${clamp(rgb[0] * f, 0, 255) | 0},${clamp(rgb[1] * f, 0, 255) | 0},${clamp(rgb[2] * f, 0, 255) | 0})`;
const TRGB_SHADE = TRGB.map(rgb => [0.92, 0.96, 1.01, 1.06].map(f => shade(rgb, f)));
const STY = {
  b: ['#6f6a64', '#4c4843'], stand: ['#6b6f78', '#3f434a'], stone: ['#b9a68a', '#7d6c55'], pit: ['#c8c8c8', '#777'], club: ['#e8dcc2', '#9c8c6e'], terminal: ['#b5c4cf', '#6b7c88'], hangar: ['#8c949c', '#596068'],
  police: ['#2c4e8a', '#152a52'], fire: ['#a8322d', '#5c1714'], court: ['#d8d0bd', '#8f8672'], museum: ['#ece6d8', '#a59c86'], science: ['#9fc7d8', '#4d7f94'], archive: ['#a39278', '#6b5c45'], bank: ['#cbb26a', '#7d6a2f'],
  post: ['#c0392b', '#6e1f17'], capitol: ['#efe9dc', '#a8a08a'], intl: ['#5d9cd6', '#2c5a85'], gov: ['#c9bea3', '#857a60'], civic: ['#a9a197', '#6b6358'], church: ['#7d7468', '#4a433a'], temple: ['#efe8d8', '#b0a68e'],
  hall: ['#8fa3ad', '#53656e'], mall: ['#7fb8b0', '#3f6f68'], glass: ['#b7e3e0', '#5f9a97'], fence: ['#b9c2c9', '#7d868d'], milfence: ['#64748b', '#334155'], stall: ['#d9534f', '#8a2b28'], fortwall: ['#8a7c68', '#544a3c'], tower: ['#7a6c58', '#463c2e'],
  keep: ['#6e624f', '#3e3628'], palace: ['#efe0b8', '#b29a5a'], pagoda: ['#b8322a', '#6c1a14'], pyramid: ['#d8bf7a', '#9a8040'], mosque: ['#e8dcc0', '#a6967a'], minaret: ['#f0e6cc', '#a6967a'], dome: ['#f4f1ea', '#b5ae9e'],
  aqueduct: ['#c3ad8a', '#81704f'], farmhouse: ['#a5553a', '#5c2c1c'], manor: ['#c7b79b', '#7d6e55'], silo: ['#c9ccd1', '#80858c'], barn: ['#8c2f23', '#4f1811'], dam: ['#a7a7a2', '#62625e'], cottage: ['#bb6b3f', '#6b3a20'],
  house: ['#9b4a32', '#5a2a1c'], shop: ['#46607a', '#273647'], office: ['#5b6a78', '#343e47'], apartment: ['#7d6a5a', '#4a3e33'], hospital: ['#f2f2f2', '#9aa0a6'], gasstation: ['#e8b923', '#8a6c0e'], canopy: ['#e04b3a', '#7a261c'],
  windmill: ['#e8e2d2', '#8a8270'], watermill: ['#9a7350', '#5c432c'], aquarium: ['#3c7fb5', '#1f4766'], checkpoint: ['#556b2f', '#2f3b1a'], campus: ['#a35a3e', '#5f3322'], embassy: ['#c8c0ae', '#7d7563'],
};

// ───────── chunked terrain renderer ─────────
const CH = 12, CS = 0.72, CHPX = Math.round(CH * TS * CS), chunkCache = new Map(); let chunkBuilds = 0;
function getChunk(cx, cy) {
  const k = cx * 1000 + cy; const c = chunkCache.get(k);
  if (c) { c.u = frameN; return c.cv; }
  if (chunkBuilds >= 3) return null; chunkBuilds++;
  if (chunkCache.size > 160) {
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
  const tileElev = t => t === 8 ? 3 : (t === 9 || t === 18) ? 2 : (t === 0 ? -2 : (t === 1 || t === 14) ? -1 : 0);
  for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) {
    if (tx >= MW || ty >= MH) continue;
    const t = tiles[ty * MW + tx], x = tx * TS, y = ty * TS, h = hsh(tx, ty);
    g.fillStyle = TRGB_SHADE[t][(h * 4) | 0]; g.fillRect(x, y, TS + 1, TS + 1);
    const nb = (dx, dy) => { const xx = tx + dx, yy = ty + dy; return (xx < 0 || yy < 0 || xx >= MW || yy >= MH) ? -1 : tiles[yy * MW + xx]; };
    const nU = nb(0, -1), nD = nb(0, 1), nL = nb(-1, 0), nR = nb(1, 0);
    // Subtle terrain drop-shadow along southern/eastern ridge edges for natural 3D relief
    if (t !== 8 && (nU === 8 || nL === 8)) {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      if (nU === 8) g.fillRect(x, y, TS, 12);
      if (nL === 8) g.fillRect(x, y, 10, TS);
    }
    switch (t) {
      case 4: { // Multi-tier Woodlands (mixed oaks, pines, undergrowth & fallen logs)
        g.fillStyle = 'rgba(16,42,14,0.24)';
        for (let b = 0; b < 3; b++) {
          g.beginPath(); g.arc(x + 14 + hsh(tx + b, ty * 2) * 52, y + 14 + hsh(tx * 2, ty + b) * 52, 8, 0, 7); g.fill();
        }
        if (h < 0.16) {
          g.fillStyle = '#4a301e'; g.fillRect(x + 14, y + 36, 32, 6);
          g.fillStyle = '#3f6212'; g.fillRect(x + 20, y + 36, 12, 3);
        }
        for (let k = 0; k < 4; k++) {
          const px = x + 10 + hsh(tx * 3 + k, ty) * (TS - 20);
          const py = y + 10 + hsh(tx, ty * 3 + k) * (TS - 20);
          const r = 15 + hsh(tx + k, ty + k) * 14;
          const pine = hsh(k + 5, tx + ty) > 0.6;
          g.fillStyle = 'rgba(8,20,10,.52)'; g.beginPath(); g.arc(px + 6, py + 7, r, 0, 7); g.fill();
          g.fillStyle = '#3f2a1d'; g.beginPath(); g.arc(px, py + 2, r * 0.24, 0, 7); g.fill();
          g.fillStyle = shade(TRGB[4], (pine ? 0.68 : 0.8) + hsh(k, tx) * 0.2);
          g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
          g.fillStyle = shade(TRGB[4], (pine ? 0.95 : 1.12) + hsh(tx, k) * 0.24);
          g.beginPath(); g.arc(px - 2, py - 2, r * 0.7, 0, 7); g.fill();
          g.fillStyle = 'rgba(210,255,190,.13)'; g.beginPath(); g.arc(px - 4, py - 4, r * 0.34, 0, 7); g.fill();
        }
        break;
      }
      case 3: case 15: case 17: { // Grassland, Turf, & Meadows with wildflowers & contour tufts
        g.fillStyle = 'rgba(22,55,18,.28)';
        for (let k = 0; k < 7; k++) {
          const gx = x + hsh(k, tx + ty) * (TS - 8), gy = y + hsh(tx, k + ty) * (TS - 8);
          g.fillRect(gx, gy, 2.5, 7); g.fillRect(gx + 3, gy + 2, 2, 5);
        }
        if (h > 0.56) {
          g.fillStyle = h > 0.82 ? '#f87171' : h > 0.7 ? '#c084fc' : '#fef08a';
          g.fillRect(x + h * TS * 0.68, y + (1 - h) * TS * 0.68, 3.5, 3.5);
        }
        if (h < 0.22) {
          g.fillStyle = 'rgba(105,112,118,.48)';
          g.beginPath(); g.ellipse(x + 25 + h * 110, y + 32, 7, 4.5, h * 3, 0, 7); g.fill();
        }
        break;
      }
      case 7: { // Cohesive Farmland Parcels (Wheat, Row Crops, Hay Bales & Wooden Rail Borders)
        const cropKind = (Math.floor(tx / 3) * 7 + Math.floor(ty / 3) * 13) % 3;
        g.strokeStyle = cropKind === 0 ? 'rgba(92,66,24,0.45)' : 'rgba(65,40,18,.5)'; g.lineWidth = 4;
        for (let k = 6; k < TS; k += 13) {
          g.beginPath(); g.moveTo(x, y + k); g.lineTo(x + TS, y + k); g.stroke();
          g.fillStyle = cropKind === 0 ? 'rgba(234,179,8,0.58)' : cropKind === 1 ? 'rgba(101,163,13,0.62)' : 'rgba(77,124,15,0.48)';
          g.fillRect(x + ((k + tx * 5) % 9), y + k - 3, cropKind === 0 ? 14 : 9, 4);
          g.fillRect(x + 28 + ((k * 3) % 11), y + k - 3, cropKind === 0 ? 16 : 10, 4);
          g.fillRect(x + 56, y + k - 3, 14, 4);
        }
        if (cropKind === 0 && h > 0.84) {
          g.fillStyle = '#ca8a04'; g.beginPath(); g.arc(x + 40, y + 40, 8, 0, 7); g.fill();
          g.strokeStyle = '#78350f'; g.lineWidth = 1.5; g.stroke();
        } else if (h > 0.78) {
          g.fillStyle = 'rgba(42,108,164,0.48)'; g.fillRect(x, y + TS - 7, TS, 4);
        }
        g.strokeStyle = '#78350f'; g.lineWidth = 2.2;
        if (nU === 5 || nU === 13 || nU === 3) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + TS, y + 2); g.stroke(); }
        if (nL === 5 || nL === 13 || nL === 3) { g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 2, y + TS); g.stroke(); }
        break;
      }
      case 0: case 1: { // Deep & Shallow Water with Bathymetry, Reef Shimmer & Shoreline Surf
        g.fillStyle = t === 0 ? 'rgba(8,28,60,.42)' : 'rgba(28,136,198,.26)';
        g.fillRect(x, y, TS, TS);
        if (t === 1 && h > 0.65 && (nU === 1 && nD === 1)) {
          g.fillStyle = 'rgba(45,212,191,0.16)';
          g.beginPath(); g.ellipse(x + 40, y + 40, 22, 13, h * 3, 0, 7); g.fill();
        }
        if (t === 1 && (nU === 0 || nD === 0 || nL === 0 || nR === 0)) {
          g.fillStyle = 'rgba(18,75,135,0.28)';
          if (nU === 0) g.fillRect(x, y, TS, 10);
          if (nD === 0) g.fillRect(x, y + TS - 10, TS, 10);
          if (nL === 0) g.fillRect(x, y, 10, TS);
          if (nR === 0) g.fillRect(x + TS - 10, y, 10, TS);
        }
        g.strokeStyle = t ? 'rgba(255,255,255,.3)' : 'rgba(180,225,255,.15)'; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          const yy = y + 12 + k * 25 + h * 8;
          g.beginPath(); g.moveTo(x + 6, yy); g.quadraticCurveTo(x + 30, yy - 5, x + 58, yy); g.stroke();
        }
        // Wet shore rim + whitewater foam along land edges
        if (nU > 1) { g.fillStyle = 'rgba(224,244,255,.6)'; g.fillRect(x, y, TS, 6); }
        if (nD > 1) { g.fillStyle = 'rgba(224,244,255,.6)'; g.fillRect(x, y + TS - 6, TS, 6); }
        if (nL > 1) { g.fillStyle = 'rgba(224,244,255,.6)'; g.fillRect(x, y, 6, TS); }
        if (nR > 1) { g.fillStyle = 'rgba(224,244,255,.6)'; g.fillRect(x + TS - 6, y, 6, TS); }
        break;
      }
      case 8: { // Natural Sculpted Alpine Massif / Mountain Cliff (Chamfered Ridges, Granite Crags, Scree & Snow Ledges)
        const baseFallback = [nU, nD, nL, nR].find(n => n > 0 && n !== 8 && n !== 0 && n !== 1);
        const underRgb = baseFallback !== undefined ? TRGB[baseFallback] : TRGB[9];
        const nearSnow = nU === 9 || nD === 9 || nL === 9 || nR === 9 || nU === 10 || nD === 10;
        const cUL = nU !== 8 && nL !== 8 ? 22 : 0;
        const cUR = nU !== 8 && nR !== 8 ? 22 : 0;
        const cDR = nD !== 8 && nR !== 8 ? 22 : 0;
        const cDL = nD !== 8 && nL !== 8 ? 22 : 0;
        if (cUL || cUR || cDR || cDL) {
          g.fillStyle = shade(underRgb, 0.94 + h * 0.1);
          g.fillRect(x, y, TS + 1, TS + 1);
        }
        g.save();
        g.beginPath();
        g.moveTo(x + cUL, y);
        g.lineTo(x + TS - cUR, y);
        if (cUR) g.lineTo(x + TS, y + cUR);
        g.lineTo(x + TS, y + TS - cDR);
        if (cDR) g.lineTo(x + TS - cDR, y + TS);
        g.lineTo(x + cDL, y + TS);
        if (cDL) g.lineTo(x, y + TS - cDL);
        g.lineTo(x, y + cUL);
        g.closePath();
        g.clip();

        g.fillStyle = shade(TRGB[8], 0.7 + h * 0.18); g.fillRect(x, y, TS, TS);
        const ridgeX = x + 22 + h * 36, ridgeY = y + 14 + hsh(ty, tx) * 28;
        // NW sunlit granite slope & SE deep shadow cliff face
        g.fillStyle = 'rgba(255,255,255,0.13)';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + TS, y); g.lineTo(ridgeX, ridgeY); g.lineTo(x, y + TS); g.closePath(); g.fill();
        g.fillStyle = 'rgba(12,14,18,0.34)';
        g.beginPath(); g.moveTo(ridgeX, ridgeY); g.lineTo(x + TS, y); g.lineTo(x + TS, y + TS); g.lineTo(x, y + TS); g.closePath(); g.fill();
        // Snow dusting & frost veins when adjacent to alpine snow or glacier
        if (nearSnow || h > 0.62) {
          g.fillStyle = nearSnow ? 'rgba(241,245,249,0.52)' : 'rgba(241,245,249,0.22)';
          g.beginPath(); g.moveTo(x + 8, y + 6); g.lineTo(ridgeX + 12, ridgeY - 4); g.lineTo(x + 32, y + 44); g.closePath(); g.fill();
        }
        // Crest highlight line & rock strata fractures
        g.strokeStyle = 'rgba(255,255,255,0.24)'; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(x + 8, y + TS - 14); g.lineTo(ridgeX, ridgeY); g.lineTo(x + TS - 8, y + 12); g.stroke();
        g.strokeStyle = 'rgba(15,23,42,0.45)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(ridgeX, ridgeY); g.lineTo(x + TS - 16, y + TS - 10); g.stroke();
        if (nU !== 8) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, TS, 5); }
        if (nL !== 8) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x, y, 5, TS); }
        if (nD !== 8) { g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(x, y + TS - 7, TS, 7); }
        if (nR !== 8) { g.fillStyle = 'rgba(0,0,0,0.36)'; g.fillRect(x + TS - 7, y, 7, TS); }
        g.restore();
        break;
      }
      case 5: case 20: { // Paved Asphalt Road / Bridge Span / Runway, Curb & Markings
        g.fillStyle = '#202329'; g.fillRect(x, y, TS, TS);
        const L = nL === t, Rr = nR === t, U = nU === t, Dn = nD === t;
        const wU = nU === 0 || nU === 1, wD = nD === 0 || nD === 1, wL = nL === 0 || nL === 1, wR = nR === 0 || nR === 1;
        const bridgeH = t === 5 && (wU || wD), bridgeV = t === 5 && (wL || wR);
        if (bridgeH || bridgeV) {
          // Concrete bridge deck & truss girders over water crossings
          g.fillStyle = '#2d333d'; g.fillRect(x, y, TS, TS);
          g.fillStyle = '#64748b';
          if (bridgeH) {
            g.fillRect(x, y, TS, 7); g.fillRect(x, y + TS - 7, TS, 7);
            g.fillStyle = '#94a3b8';
            for (let gx = x + 6; gx < x + TS; gx += 20) {
              g.fillRect(gx, y, 5, 9); g.fillRect(gx, y + TS - 9, 5, 9);
            }
            g.fillStyle = '#0f172a'; g.fillRect(x, y + 7, 2, TS - 14);
          } else {
            g.fillRect(x, y, 7, TS); g.fillRect(x + TS - 7, y, 7, TS);
            g.fillStyle = '#94a3b8';
            for (let gy = y + 6; gy < y + TS; gy += 20) {
              g.fillRect(x, gy, 9, 5); g.fillRect(x + TS - 9, gy, 9, 5);
            }
            g.fillStyle = '#0f172a'; g.fillRect(x + 7, y, TS - 14, 2);
          }
        } else {
          g.fillStyle = 'rgba(255,255,255,.035)';
          for (let k = 0; k < 4; k++) g.fillRect(x + hsh(k, tx) * 70, y + hsh(ty, k) * 70, 3, 3);
          if (h < 0.14) {
            g.strokeStyle = 'rgba(10,12,16,.55)'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(x + 14, y + 18); g.lineTo(x + 32, y + 34); g.lineTo(x + 46, y + 29); g.stroke();
          }
          g.fillStyle = 'rgba(240,242,248,.62)';
          if (!U && (L || Rr)) g.fillRect(x, y, TS, 3.5);
          if (!Dn && (L || Rr)) g.fillRect(x, y + TS - 3.5, TS, 3.5);
          if (!L && (U || Dn)) g.fillRect(x, y, 3.5, TS);
          if (!Rr && (U || Dn)) g.fillRect(x + TS - 3.5, y, 3.5, TS);
          if (h > 0.86 && L && Rr) {
            g.fillStyle = '#334155'; g.beginPath(); g.arc(x + TS * 0.5, y + TS * 0.25, 5, 0, 7); g.fill();
            g.strokeStyle = '#64748b'; g.lineWidth = 1; g.stroke();
          }
        }
        g.fillStyle = t === 20 ? '#f8fafc' : '#ffd166';
        if (t === 20) {
          // Runway markings: edge stripes, bold white centerline dashes, piano-key thresholds & touchdown blocks
          if (!U) { g.fillStyle = '#e2e8f0'; g.fillRect(x, y + 3, TS, 3); }
          if (!Dn) { g.fillStyle = '#e2e8f0'; g.fillRect(x, y + TS - 6, TS, 3); }
          g.fillStyle = '#f8fafc';
          if (L || Rr) {
            if (!U || !Dn) {
              const cyRun = !Dn ? y + 1 : y + TS - 5;
              g.fillRect(x + 12, cyRun - 2, 34, 4);
              g.fillRect(x + 54, cyRun - 2, 22, 4);
            } else {
              g.fillRect(x + 10, y + TS / 2 - 2.5, 28, 5);
              g.fillRect(x + 48, y + TS / 2 - 2.5, 24, 5);
            }
            if (!L || !Rr) {
              const kx = !L ? x + 6 : x + TS - 24;
              for (let ry = y + 8; ry < y + TS - 8; ry += 12) g.fillRect(kx, ry, 18, 6);
            }
            if ((tx % 5 === 0) && (!U || !Dn)) {
              g.fillRect(x + 18, !U ? y + 14 : y + TS - 26, 44, 10);
            }
          }
        } else if ((L || Rr) && (U || Dn)) {
          g.fillStyle = 'rgba(255,255,255,.24)';
          if (U) for (let cw = 12; cw < TS - 12; cw += 14) g.fillRect(x + cw, y + 4, 7, 10);
          if (Dn) for (let cw = 12; cw < TS - 12; cw += 14) g.fillRect(x + cw, y + TS - 14, 7, 10);
          if (L) for (let cw = 12; cw < TS - 12; cw += 14) g.fillRect(x + 4, y + cw, 10, 7);
          if (Rr) for (let cw = 12; cw < TS - 12; cw += 14) g.fillRect(x + TS - 14, y + cw, 10, 7);
        } else if (L || Rr) {
          g.fillRect(x + 8, y + TS / 2 - 3, 22, 2.5); g.fillRect(x + 40, y + TS / 2 - 3, 22, 2.5);
          g.fillRect(x + 8, y + TS / 2 + 1, 22, 2.5); g.fillRect(x + 40, y + TS / 2 + 1, 22, 2.5);
        } else if (U || Dn) {
          g.fillRect(x + TS / 2 - 3, y + 8, 2.5, 22); g.fillRect(x + TS / 2 - 3, y + 40, 2.5, 22);
          g.fillRect(x + TS / 2 + 1, y + 8, 2.5, 22); g.fillRect(x + TS / 2 + 1, y + 40, 2.5, 22);
        }
        break;
      }
      case 6: // Concrete Plaza Slab with Expansion Joints
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
        g.strokeRect(x + 1, y + 1, TS / 2, TS / 2);
        g.strokeRect(x + TS / 2, y + TS / 2, TS / 2 - 1, TS / 2 - 1);
        g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x + 4, y + 4, TS / 2 - 8, TS / 2 - 8);
        if (h > 0.78) { g.fillStyle = 'rgba(51,65,85,.5)'; g.fillRect(x + TS * 0.6, y + TS * 0.14, 14, 7); }
        break;
      case 11: // Volcanic Lava Fissures & Cooled Basalt Crust Plates
        g.fillStyle = 'rgba(255,140,20,0.5)';
        g.fillRect(x + 8, y + 12 + h * 18, TS - 16, 12);
        g.strokeStyle = 'rgba(255,220,90,0.72)'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x + 6, y + 40 + h * 14); g.lineTo(x + 40, y + 26); g.lineTo(x + TS - 8, y + 48 - h * 12); g.stroke();
        g.fillStyle = 'rgba(255,235,120,0.75)';
        g.beginPath(); g.arc(x + 26 + h * 26, y + 24 + hsh(ty, tx) * 32, 6, 0, 7); g.fill();
        g.fillStyle = 'rgba(38,24,20,0.78)';
        g.beginPath(); g.moveTo(x + 4, y + 6); g.lineTo(x + 36, y + 16); g.lineTo(x + 18, y + 42); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(x + 46, y + 44); g.lineTo(x + 76, y + 52); g.lineTo(x + 56, y + 74); g.closePath(); g.fill();
        break;
      case 12: // Salt Flat Polygonal Crust Veins
        g.strokeStyle = 'rgba(180,175,160,0.45)'; g.lineWidth = 1.5;
        g.strokeRect(x + 6, y + 6, 32, 32); g.strokeRect(x + 38, y + 36, 34, 34);
        break;
      case 13: // Gravel Dirt, Historic Cobblestone & Country Lane Ruts
        if (nU === 6 || nD === 6 || nL === 6 || nR === 6) {
          g.fillStyle = 'rgba(148,140,126,0.34)';
          for (let cy = y + 4; cy < y + TS - 8; cy += 16) for (let cx2 = x + 4; cx2 < x + TS - 8; cx2 += 16) {
            g.fillRect(cx2 + ((cy / 16) & 1 ? 3 : 0), cy, 12, 11);
          }
        }
        g.fillStyle = 'rgba(70,52,32,0.34)';
        for (let k = 0; k < 6; k++) g.fillRect(x + hsh(k, tx) * 68, y + hsh(ty, k) * 68, 4, 3);
        if (nL === 13 || nR === 13) {
          g.fillStyle = 'rgba(65,45,25,0.28)'; g.fillRect(x, y + 24, TS, 6); g.fillRect(x, y + 48, TS, 6);
        }
        break;
      case 14: // Muddy Swamp & Murky Bog with Lily Pads & Reeds
        g.fillStyle = 'rgba(25,45,28,.65)'; g.beginPath(); g.ellipse(x + 24 + h * 24, y + 38, 28, 17, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(10,25,15,.42)'; g.beginPath(); g.arc(x + 20 + h * 20, y + 35, 13, 0, 7); g.fill();
        if (h > 0.35) {
          g.fillStyle = 'rgba(74,140,68,.7)'; g.beginPath(); g.arc(x + 18 + h * 30, y + 22, 6, 0.4, 5.9); g.lineTo(x + 18 + h * 30, y + 22); g.fill();
          g.fillStyle = '#78350f'; g.fillRect(x + 52, y + 48, 2, 10);
        }
        break;
      case 16: // Race Circuit Asphalt & Apex Curbs
        g.fillStyle = '#1f2228'; g.fillRect(x, y, TS, TS);
        if (nU !== 16) {
          for (let cx2 = x; cx2 < x + TS; cx2 += 20) {
            g.fillStyle = ((cx2 - x) % 40 < 20) ? '#ef4444' : '#f8fafc';
            g.fillRect(cx2, y, 20, 6);
          }
        }
        break;
      case 19: // Toxic Acid Hazard Ground
        g.fillStyle = 'rgba(132,204,22,0.38)';
        g.beginPath(); g.ellipse(x + 40, y + 40, 22, 14, h * 3, 0, 7); g.fill();
        g.fillStyle = '#bef264'; g.beginPath(); g.arc(x + 34 + h * 16, y + 38, 3.5, 0, 7); g.fill();
        break;
      case 10: // Slick Ice with Glacier Fissures
        g.fillStyle = 'rgba(200,235,255,.32)'; g.fillRect(x, y, TS, TS);
        g.strokeStyle = 'rgba(255,255,255,.78)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 10, y + 14 + h * 25); g.lineTo(x + 64, y + 10 + h * 35); g.stroke();
        g.strokeStyle = 'rgba(56,189,248,0.45)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x + 18, y + 54); g.lineTo(x + 56, y + 22); g.stroke();
        break;
      case 9: // Deep Snow with Wind Drift Ridges
        g.fillStyle = 'rgba(240,248,255,.48)'; g.fillRect(x, y, TS, TS);
        g.strokeStyle = 'rgba(165,195,225,0.45)'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x + 4, y + 24); g.quadraticCurveTo(x + 40, y + 14, x + TS - 4, y + 26); g.stroke();
        g.fillStyle = 'rgba(180,210,235,.4)';
        for (let k = 0; k < 4; k++) g.fillRect(x + hsh(k, tx) * TS, y + hsh(ty, k) * TS, 6, 6);
        break;
      case 18: case 2: { // Sculpted Desert Dunes, Lit Crests & Shrubs/Rocks
        const isDune = t === 18;
        g.fillStyle = isDune ? 'rgba(155,112,48,0.22)' : 'rgba(190,150,82,0.16)';
        for (let k = 0; k < 2; k++) {
          const yy = y + 22 + k * 34;
          g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + 40, yy - (isDune ? 14 : 7), x + TS, yy);
          g.lineTo(x + TS, yy + 10); g.quadraticCurveTo(x + 40, yy - (isDune ? 4 : 1), x, yy + 10); g.closePath(); g.fill();
        }
        g.strokeStyle = isDune ? 'rgba(255,235,180,0.42)' : 'rgba(180,140,70,.35)'; g.lineWidth = 2.5;
        for (let k = 0; k < 2; k++) {
          const yy = y + 22 + k * 34;
          g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + 40, yy - (isDune ? 14 : 7), x + TS, yy); g.stroke();
        }
        if (isDune && h > 0.8) {
          g.fillStyle = '#3f6212'; g.beginPath(); g.arc(x + 42, y + 40, 4.5, 0, 7); g.fill();
          g.fillStyle = '#84cc16'; g.fillRect(x + 41, y + 36, 2, 2);
        }
        break;
      }
      default:
        break;
    }
    // Subtle contour edge line where elevation drops
    const el = tileElev(t);
    if (el > tileElev(nD) && nD !== -1 && t !== 8) { g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x, y + TS - 4, TS, 4); }
    if (el > tileElev(nR) && nR !== -1 && t !== 8) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + TS - 4, y, 4, TS); }
  }
  for (const i of rectsIn(tx0 * TS, ty0 * TS, (tx0 + CH) * TS, (ty0 + CH) * TS)) drawRect(g, M.rects[i]);
  g.restore();
}

// ───────── architectural place details ─────────
function drawPitchedRoof(g, x, y, w, h, mainHex, darkHex, ridgeDir) {
  const rgb = hex2(mainHex);
  const horiz = ridgeDir ? ridgeDir === 'h' : w >= h;
  const pad = Math.min(8, Math.min(w, h) * 0.08);
  const rx = x + pad, ry = y + pad, rw = w - pad * 2, rh = h - pad * 2;
  const cx = x + w / 2, cy = y + h / 2;

  // Roof eaves shadow + overhang lip
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.fillRect(x + 4, y + 4, w - 4, h - 4);
  g.fillStyle = shade(rgb, 0.72);
  g.fillRect(x, y, w, h);

  if (horiz) {
    // North lit slope, South shaded slope, West/East gable hips
    g.fillStyle = shade(rgb, 1.18);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - rw * 0.16, cy); g.lineTo(x + rw * 0.16, cy); g.closePath(); g.fill();
    g.fillStyle = shade(rgb, 0.76);
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w - rw * 0.16, cy); g.lineTo(x + rw * 0.16, cy); g.closePath(); g.fill();
    g.fillStyle = shade(rgb, 0.94);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rw * 0.16, cy); g.lineTo(x, y + h); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w - rw * 0.16, cy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    // Shingle courses
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1;
    for (let sy = ry + 8; sy < y + h - 8; sy += 10) {
      g.beginPath(); g.moveTo(rx + 4, sy); g.lineTo(x + w - pad - 4, sy); g.stroke();
    }
    // Ridge beam cap
    g.strokeStyle = shade(rgb, 1.38); g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(x + rw * 0.16, cy); g.lineTo(x + w - rw * 0.16, cy); g.stroke();
  } else {
    g.fillStyle = shade(rgb, 1.15);
    g.beginPath(); g.moveTo(x, y); g.lineTo(cx, y + rh * 0.16); g.lineTo(cx, y + h - rh * 0.16); g.lineTo(x, y + h); g.closePath(); g.fill();
    g.fillStyle = shade(rgb, 0.74);
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(cx, y + rh * 0.16); g.lineTo(cx, y + h - rh * 0.16); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    g.fillStyle = shade(rgb, 0.94);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(cx, y + rh * 0.16); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(cx, y + h - rh * 0.16); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1;
    for (let sx = rx + 8; sx < x + w - 8; sx += 10) {
      g.beginPath(); g.moveTo(sx, ry + 4); g.lineTo(sx, y + h - pad - 4); g.stroke();
    }
    g.strokeStyle = shade(rgb, 1.38); g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(cx, y + rh * 0.16); g.lineTo(cx, y + h - rh * 0.16); g.stroke();
  }

  g.strokeStyle = darkHex; g.lineWidth = 2.5; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawRooftopHVAC(g, rx, ry, rw, rh) {
  g.fillStyle = '#334155'; g.fillRect(rx, ry, rw, rh);
  g.strokeStyle = '#64748b'; g.lineWidth = 1.5; g.strokeRect(rx, ry, rw, rh);
  const cx = rx + rw / 2, cy = ry + rh / 2, fr = Math.min(rw, rh) * 0.34;
  g.fillStyle = '#0f172a'; g.beginPath(); g.arc(cx, cy, fr, 0, 7); g.fill();
  g.strokeStyle = '#94a3b8'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx - fr, cy); g.lineTo(cx + fr, cy); g.moveTo(cx, cy - fr); g.lineTo(cx, cy + fr); g.stroke();
}

function drawRect(g, r, skipRoofOverlay) {
  const s = M.styles[r[4]], st = STY[s] || STY.b, [x, y, w, h] = r;
  const cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);
  const rgb = hex2(st[0]);

  // Soft multi-layered architectural drop shadow
  g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(x + 9, y + 9, w, h);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 14, y + 14, w, h);

  // Cylindrical / Octagonal freestanding towers, silos, windmills, watermills, minarets
  if (s === 'silo' || s === 'windmill' || s === 'watermill' || s === 'minaret' || (s === 'tower' && w < 85)) {
    const rad = m / 2;
    g.fillStyle = shade(rgb, 0.7); g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill();
    g.strokeStyle = st[1]; g.lineWidth = 3.5; g.stroke();
    // Conical shading rings
    const cg = g.createRadialGradient(cx - rad * 0.25, cy - rad * 0.25, 2, cx, cy, rad);
    cg.addColorStop(0, shade(rgb, 1.35)); cg.addColorStop(0.6, st[0]); cg.addColorStop(1, st[1]);
    g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, rad - 3, 0, 7); g.fill();
    if (s === 'silo') {
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy, rad * 0.62, 0, 7); g.stroke();
      g.fillStyle = '#475569'; g.beginPath(); g.arc(cx, cy, rad * 0.2, 0, 7); g.fill();
    } else if (s === 'tower') {
      g.strokeStyle = '#1e1b18'; g.lineWidth = 3;
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        g.beginPath(); g.moveTo(cx + Math.cos(ang) * (rad - 8), cy + Math.sin(ang) * (rad - 8));
        g.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad); g.stroke();
      }
    } else if (s === 'minaret') {
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
    }
    return;
  }

  // Open sports stands, pits, and fences
  if (s === 'stand' || s === 'pit') {
    g.fillStyle = '#3f434a'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#1e293b'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    // Bleacher seating tiers
    const tiers = Math.max(3, Math.floor(Math.min(w, h) / 9));
    for (let t = 0; t < tiers; t++) {
      g.fillStyle = t % 2 === 0 ? '#64748b' : '#475569';
      g.fillRect(x + 3 + t * 3, y + 3 + t * 3, Math.max(4, w - 6 - t * 6), Math.max(4, h - 6 - t * 6));
    }
    if (w > 60 && h > 60) {
      g.fillStyle = '#2d6a36'; g.fillRect(x + 14, y + 14, w - 28, h - 28);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5;
      g.strokeRect(x + 16, y + 16, w - 32, h - 32);
    }
    return;
  }

  if (s === 'fence') {
    g.fillStyle = '#475569'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#cbd5e1'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    return;
  }

  if (s === 'milfence') {
    // High-security military compound perimeter fence: concrete footing + chain-link diamond mesh + barbed posts
    g.fillStyle = '#334155'; g.fillRect(x, y, w, h);
    g.fillStyle = '#1e293b'; g.fillRect(x + 2, y + 2, Math.max(2, w - 4), Math.max(2, h - 4));
    g.strokeStyle = '#94a3b8'; g.lineWidth = 1.2;
    if (w >= h) {
      for (let fx = x + 6; fx < x + w - 4; fx += 12) {
        g.beginPath(); g.moveTo(fx, y); g.lineTo(fx + 6, y + h); g.moveTo(fx + 6, y); g.lineTo(fx, y + h); g.stroke();
      }
      g.fillStyle = '#cbd5e1';
      for (let px = x + 4; px <= x + w - 4; px += 48) g.fillRect(px - 2, y - 2, 5, h + 4);
      g.fillStyle = '#ef4444'; g.fillRect(x + w * 0.5 - 3, y + h * 0.5 - 3, 6, 6);
    } else {
      for (let fy = y + 6; fy < y + h - 4; fy += 12) {
        g.beginPath(); g.moveTo(x, fy); g.lineTo(x + w, fy + 6); g.moveTo(x + w, fy); g.lineTo(x, fy + 6); g.stroke();
      }
      g.fillStyle = '#cbd5e1';
      for (let py = y + 4; py <= y + h - 4; py += 48) g.fillRect(x - 2, py - 2, w + 4, 5);
    }
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return;
  }

  // Ground-level sidewalk apron, curbing, corner shrubs & parking bay stripes around buildings
  if (w >= 64 && h >= 64) {
    g.fillStyle = 'rgba(130,138,148,0.34)';
    g.fillRect(x - 10, y - 8, w + 20, h + 20);
    g.strokeStyle = 'rgba(30,41,59,0.5)'; g.lineWidth = 1.5;
    g.strokeRect(x - 10, y - 8, w + 20, h + 20);
    // Corner landscaped bushes
    if (s !== 'pyramid' && s !== 'hangar' && s !== 'fortwall' && s !== 'checkpoint') {
      g.fillStyle = '#2d5a27';
      g.beginPath(); g.arc(x - 5, y + h + 4, 5, 0, 7); g.arc(x + w + 5, y + h + 4, 5, 0, 7); g.fill();
      g.fillStyle = '#4d7c0f';
      g.beginPath(); g.arc(x - 6, y + h + 3, 2.6, 0, 7); g.arc(x + w + 4, y + h + 3, 2.6, 0, 7); g.fill();
    }
    // Front parking / ambulance bay stripes for commercial & emergency structures
    if (w > 110 && (s === 'shop' || s === 'mall' || s === 'hospital' || s === 'police' || s === 'fire' || s === 'office' || s === 'bank')) {
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.2;
      for (let px = x + 10; px < x + w - 16; px += 20) {
        g.beginPath(); g.moveTo(px, y + h + 2); g.lineTo(px, y + h + 11); g.stroke();
      }
    }
  } else {
    g.fillStyle = 'rgba(18, 22, 28, 0.45)';
    g.fillRect(x - 4, y - 4, w + 8, h + 8);
  }

  if (skipRoofOverlay) return;

  // Architectural roof geometry by style
  switch (s) {
    case 'house': case 'cottage': case 'farmhouse': case 'manor': {
      // Wooden patio deck behind or in front
      if (w > 85) {
        g.fillStyle = '#78472a'; g.fillRect(x + 12, y - 8, Math.min(48, w * 0.4), 9);
        g.strokeStyle = '#451a03'; g.lineWidth = 1; g.strokeRect(x + 12, y - 8, Math.min(48, w * 0.4), 9);
      }
      drawPitchedRoof(g, x, y, w, h, st[0], st[1]);
      // Brick chimney
      g.fillStyle = '#7c2d12'; g.fillRect(x + w * 0.2, y + h * 0.18, 12, 12);
      g.strokeStyle = '#451a03'; g.lineWidth = 1.5; g.strokeRect(x + w * 0.2, y + h * 0.18, 12, 12);
      g.fillStyle = '#18181b'; g.fillRect(x + w * 0.2 + 3, y + h * 0.18 + 3, 6, 6);
      // Skylight or dormer window
      if (w > 90 && h > 90) {
        g.fillStyle = '#93c5fd'; g.fillRect(cx - 10, cy - 22, 20, 10);
        g.strokeStyle = st[1]; g.lineWidth = 1.5; g.strokeRect(cx - 10, cy - 22, 20, 10);
      }
      break;
    }
    case 'barn': {
      drawPitchedRoof(g, x, y, w, h, st[0], st[1], w >= h ? 'h' : 'v');
      // White cupola vent at center ridge
      g.fillStyle = '#f1f5f9'; g.fillRect(cx - 12, cy - 12, 24, 24);
      g.strokeStyle = '#991b1b'; g.lineWidth = 2; g.strokeRect(cx - 12, cy - 12, 24, 24);
      g.fillStyle = '#334155'; g.fillRect(cx - 6, cy - 6, 12, 12);
      break;
    }
    case 'pyramid': {
      g.fillStyle = '#c2a458'; g.fillRect(x, y, w, h);
      g.fillStyle = '#e5cb84';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(cx, cy); g.closePath(); g.fill();
      g.fillStyle = '#d4b86a';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.lineTo(cx, cy); g.closePath(); g.fill();
      g.fillStyle = '#a88c42';
      g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(cx, cy); g.closePath(); g.fill();
      g.fillStyle = '#856b28';
      g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(cx, cy); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,40,10,0.28)'; g.lineWidth = 1.5;
      for (let t = 0.16; t < 0.9; t += 0.16) g.strokeRect(cx - w * t / 2, cy - h * t / 2, w * t, h * t);
      g.fillStyle = '#fde047'; g.beginPath(); g.arc(cx, cy, Math.max(4, m * 0.05), 0, 7); g.fill();
      break;
    }
    case 'pagoda': {
      const tiers = [1, 0.72, 0.44];
      for (let t = 0; t < tiers.length; t++) {
        const tw = w * tiers[t], th = h * tiers[t], tx = cx - tw / 2, ty = cy - th / 2;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(tx + 4, ty + 4, tw, th);
        drawPitchedRoof(g, tx, ty, tw, th, t === 2 ? '#dc2626' : st[0], '#450a0a');
      }
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
      break;
    }
    case 'church': {
      g.fillStyle = '#334155'; g.fillRect(x, y, w, h);
      drawPitchedRoof(g, x + w * 0.22, y, w * 0.56, h, st[0], st[1], 'v');
      drawPitchedRoof(g, x, y + h * 0.24, w, h * 0.52, shade(rgb, 0.92), st[1], 'h');
      g.fillStyle = st[1];
      for (let by = y + 18; by < y + h - 18; by += 28) {
        g.fillRect(x - 4, by, 6, 8); g.fillRect(x + w - 2, by, 6, 8);
      }
      g.fillStyle = '#1e293b'; g.beginPath(); g.arc(cx, cy, m * 0.16, 0, 7); g.fill();
      g.strokeStyle = '#f59e0b'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(cx, cy, m * 0.09, 0, 7); g.fill();
      g.fillStyle = '#fde047';
      g.fillRect(cx - 2, y + 10, 4, 16); g.fillRect(cx - 6, y + 14, 12, 4);
      break;
    }
    case 'mosque': case 'dome': case 'capitol': case 'palace': case 'temple': case 'court': case 'museum': {
      g.fillStyle = shade(rgb, 0.85); g.fillRect(x, y, w, h);
      g.fillStyle = st[0]; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.strokeStyle = st[1]; g.lineWidth = 3; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // Granite entrance steps + classical portico columns & pediment
      g.fillStyle = 'rgba(241,245,249,0.6)'; g.fillRect(cx - 34, y + h, 68, 9);
      g.fillStyle = shade(rgb, 1.32);
      for (let px = x + 10; px < x + w - 10; px += 20) {
        g.beginPath(); g.arc(px, y + 5, 3.5, 0, 7); g.arc(px, y + h - 5, 3.5, 0, 7); g.fill();
      }
      if (s === 'mosque' || s === 'dome' || s === 'capitol') {
        const dr = m * 0.34;
        const dg = g.createRadialGradient(cx - dr * 0.25, cy - dr * 0.25, 4, cx, cy, dr);
        dg.addColorStop(0, '#fffbeb'); dg.addColorStop(0.65, st[0]); dg.addColorStop(1, st[1]);
        g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, dr, 0, 7); g.fill();
        g.strokeStyle = st[1]; g.lineWidth = 2.5; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1.2;
        for (let a = 0; a < 8; a++) {
          const ang = a * Math.PI / 4;
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * dr, cy + Math.sin(ang) * dr); g.stroke();
        }
        g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(cx, cy, dr * 0.22, 0, 7); g.fill();
      } else {
        drawPitchedRoof(g, x + 16, y + 16, w - 32, h - 32, st[0], st[1]);
        g.fillStyle = 'rgba(125,211,252,0.55)'; g.fillRect(cx - w * 0.15, cy - h * 0.15, w * 0.3, h * 0.3);
        g.strokeStyle = '#64748b'; g.lineWidth = 2; g.strokeRect(cx - w * 0.15, cy - h * 0.15, w * 0.3, h * 0.3);
      }
      break;
    }
    case 'hospital': {
      g.fillStyle = '#cbd5e1'; g.fillRect(x, y, w, h);
      g.fillStyle = '#e2e8f0'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.strokeStyle = '#64748b'; g.lineWidth = 3; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // Ambulance port canopy strip & emergency drop bay
      g.fillStyle = '#ef4444'; g.fillRect(x + 10, y + h - 8, 38, 8);
      // Helipad circle + crisp landing bracket & perimeter warning lights
      const hr = Math.min(m * 0.38, 64);
      g.fillStyle = '#1e293b'; g.beginPath(); g.arc(cx, cy, hr, 0, 7); g.fill();
      g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ef4444';
      g.fillRect(cx - hr * 0.16, cy - hr * 0.55, hr * 0.32, hr * 1.1);
      g.fillRect(cx - hr * 0.55, cy - hr * 0.16, hr * 1.1, hr * 0.32);
      g.strokeStyle = '#f8fafc'; g.lineWidth = 2;
      g.strokeRect(cx - hr * 0.72, cy - hr * 0.72, 8, 8);
      g.strokeRect(cx + hr * 0.72 - 8, cy + hr * 0.72 - 8, 8, 8);
      if (w > 110) drawRooftopHVAC(g, x + 12, y + 12, 26, 22);
      if (w > 140) drawRooftopHVAC(g, x + w - 38, y + 12, 26, 22);
      break;
    }
    case 'police': case 'fire': {
      const baseC = s === 'police' ? '#1e3a8a' : '#7f1d1d';
      const trimC = s === 'police' ? '#60a5fa' : '#f87171';
      g.fillStyle = '#1e293b'; g.fillRect(x, y, w, h);
      g.fillStyle = baseC; g.fillRect(x + 6, y + 6, w - 12, h - 12);
      g.strokeStyle = trimC; g.lineWidth = 2.5; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      // Apparatus bay stripes on apron + rooftop dish
      g.fillStyle = trimC; g.fillRect(x + 10, y + 10, 12, 12);
      g.fillStyle = 'rgba(255,255,255,0.88)';
      g.font = `bold ${Math.max(11, Math.min(26, m * 0.22))}px system-ui,sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(s === 'police' ? 'POLICE HQ' : 'FIRE DEPT', cx, cy);
      if (w > 100) drawRooftopHVAC(g, x + 14, y + h - 38, 28, 22);
      break;
    }
    case 'bank': {
      g.fillStyle = '#927e43'; g.fillRect(x, y, w, h);
      g.fillStyle = '#d4c28f'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.strokeStyle = '#5c4c1f'; g.lineWidth = 3; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // Marble pillars along South facade
      g.fillStyle = '#fef3c7';
      for (let px = x + 12; px < x + w - 12; px += 20) g.fillRect(px - 3, y + h - 9, 6, 8);
      g.fillStyle = '#334155'; g.beginPath(); g.arc(cx, cy, m * 0.28, 0, 7); g.fill();
      g.strokeStyle = '#ffd700'; g.lineWidth = 3.5; g.stroke();
      g.fillStyle = '#ffd700'; g.font = `bold ${Math.min(36, m * 0.3)}px Georgia,serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', cx, cy + 1);
      break;
    }
    case 'hangar': case 'terminal': {
      if (s === 'hangar') {
        g.fillStyle = '#334155'; g.fillRect(x, y, w, h);
        const bg = g.createLinearGradient(x, y, x + w, y);
        bg.addColorStop(0, '#475569'); bg.addColorStop(0.5, '#cbd5e1'); bg.addColorStop(1, '#475569');
        g.fillStyle = bg; g.fillRect(x + 5, y + 5, w - 10, h - 10);
        g.strokeStyle = 'rgba(15,23,42,0.4)'; g.lineWidth = 2;
        for (let rx = x + 16; rx < x + w - 10; rx += 18) {
          g.beginPath(); g.moveTo(rx, y + 5); g.lineTo(rx, y + h - 5); g.stroke();
        }
        // Heavy blast bay doors along north apron + safety chevron bar
        g.fillStyle = '#f59e0b'; g.fillRect(x + 12, y + 2, w - 24, 5);
        g.fillStyle = '#0f172a';
        for (let bx = x + 16; bx < x + w - 22; bx += 20) g.fillRect(bx, y + 2, 10, 5);
        g.fillStyle = '#1e293b'; g.fillRect(x + 18, y + h * 0.42, w - 36, 12);
      } else {
        g.fillStyle = '#1e293b'; g.fillRect(x, y, w, h);
        g.fillStyle = '#64748b'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
        g.fillStyle = '#94a3b8'; g.fillRect(x + 12, y + 12, w - 24, h - 24);
        // Illuminated skylight atrium glass spine
        const glassH = Math.min(34, h * 0.28);
        g.fillStyle = 'rgba(56,189,248,0.5)'; g.fillRect(x + 18, cy - glassH / 2, w - 36, glassH);
        g.strokeStyle = '#bae6fd'; g.lineWidth = 1.6; g.strokeRect(x + 18, cy - glassH / 2, w - 36, glassH);
        for (let sx = x + 36; sx < x + w - 24; sx += 36) {
          g.beginPath(); g.moveTo(sx, cy - glassH / 2); g.lineTo(sx, cy + glassH / 2); g.stroke();
        }
        // Jetbridge docking arms projecting toward apron for large terminals/piers
        if (w > 120) {
          g.fillStyle = '#cbd5e1';
          const stepJ = w > 500 ? 84 : 48;
          for (let jx = x + 36; jx < x + w - 28; jx += stepJ) {
            g.fillRect(jx, y - 22, 12, 24);
            g.fillStyle = '#38bdf8'; g.fillRect(jx - 3, y - 26, 18, 5);
            g.fillStyle = '#cbd5e1';
          }
        }
      }
      break;
    }
    case 'gasstation': case 'canopy': {
      // Concrete pump apron + fuel islands & safety bollards
      g.fillStyle = '#475569'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
      g.fillStyle = '#b91c1c'; g.fillRect(x, y, w, h);
      g.fillStyle = '#f8fafc'; g.fillRect(x + 5, y + 5, w - 10, h - 10);
      g.fillStyle = '#dc2626'; g.fillRect(x + 8, y + 8, w - 16, 10);
      g.fillStyle = '#fbbf24'; g.fillRect(x + 8, y + h - 14, w - 16, 6);
      for (let px = x + 22; px < x + w - 22; px += 34) {
        g.fillStyle = '#fbbf24'; g.fillRect(px - 8, cy - 7, 16, 14);
        g.fillStyle = '#334155'; g.fillRect(px - 5, cy - 5, 10, 10);
      }
      break;
    }
    case 'shop': case 'mall': case 'hall': case 'club': case 'glass': case 'aquarium': {
      g.fillStyle = shade(rgb, 0.72); g.fillRect(x, y, w, h);
      g.fillStyle = st[0]; g.fillRect(x + 6, y + 6, w - 12, h - 12);
      for (let ax = x + 4; ax < x + w - 8; ax += 16) {
        g.fillStyle = ((ax - x) % 32 < 16) ? '#ef4444' : '#f8fafc';
        g.fillRect(ax, y + h - 10, Math.min(16, x + w - 4 - ax), 10);
      }
      const skW = Math.max(24, w * 0.56), skH = Math.max(20, h * 0.44);
      g.fillStyle = s === 'aquarium' ? 'rgba(6,182,212,0.7)' : 'rgba(125,211,252,0.48)';
      g.fillRect(cx - skW / 2, cy - skH / 2 - 4, skW, skH);
      g.strokeStyle = '#334155'; g.lineWidth = 2;
      g.strokeRect(cx - skW / 2, cy - skH / 2 - 4, skW, skH);
      // Atrium skylight mullions
      g.beginPath(); g.moveTo(cx, cy - skH / 2 - 4); g.lineTo(cx, cy + skH / 2 - 4);
      g.moveTo(cx - skW / 2, cy - 4); g.lineTo(cx + skW / 2, cy - 4); g.stroke();
      if (w > 110) drawRooftopHVAC(g, x + 12, y + 12, 22, 18);
      break;
    }
    case 'fortwall': case 'keep': case 'checkpoint': {
      g.fillStyle = st[0]; g.fillRect(x, y, w, h);
      g.strokeStyle = st[1]; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      g.fillStyle = shade(rgb, 1.2);
      for (let kx = x + 6; kx < x + w - 12; kx += 20) {
        g.fillRect(kx, y + 2, 11, 7); g.fillRect(kx, y + h - 9, 11, 7);
      }
      if (s === 'keep' && w > 80) {
        g.fillStyle = shade(rgb, 0.78); g.fillRect(x + 18, y + 18, w - 36, h - 36);
        g.strokeStyle = '#1e1b18'; g.lineWidth = 2; g.strokeRect(x + 18, y + 18, w - 36, h - 36);
      }
      break;
    }
    case 'stall': {
      for (let kx = x; kx < x + w; kx += 12) {
        g.fillStyle = ((kx - x) % 24 < 12) ? '#dc2626' : '#fef3c7';
        g.fillRect(kx, y, Math.min(12, x + w - kx), h);
      }
      g.strokeStyle = '#78350f'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      break;
    }
    default: {
      // Stepped skyscraper / apartment / science / office with solar arrays & water tower
      g.fillStyle = shade(rgb, 0.68); g.fillRect(x, y, w, h);
      g.fillStyle = st[0]; g.fillRect(x + 5, y + 5, w - 10, h - 10);
      if (w > 95 && h > 95) {
        g.fillStyle = shade(rgb, 0.85); g.fillRect(x + 16, y + 16, w - 32, h - 32);
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5;
        g.strokeRect(x + 16, y + 16, w - 32, h - 32);
        drawRooftopHVAC(g, x + 22, y + 22, 24, 20);
        if (w > 150) drawRooftopHVAC(g, x + w - 48, y + 22, 24, 20);
        // Rooftop solar panel bank
        g.fillStyle = '#1e3a8a'; g.fillRect(x + 22, y + h - 34, 28, 12);
        g.strokeStyle = '#60a5fa'; g.lineWidth = 1; g.strokeRect(x + 22, y + h - 34, 28, 12);
        // Cylindrical water tower on tall residential/apartment roofs
        if (s === 'apartment' || s === 'office') {
          g.fillStyle = '#78472a'; g.beginPath(); g.arc(x + w - 32, y + h - 32, 10, 0, 7); g.fill();
          g.strokeStyle = '#451a03'; g.lineWidth = 1.5; g.stroke();
        }
      }
      if (w > 120 && h > 120) {
        g.fillStyle = s === 'science' ? 'rgba(56,189,248,0.45)' : 'rgba(148,163,184,0.28)';
        g.fillRect(cx - 20, cy - 14, 40, 28);
        g.strokeStyle = '#1e293b'; g.lineWidth = 1.5; g.strokeRect(cx - 20, cy - 14, 40, 28);
      }
      g.strokeStyle = st[1]; g.lineWidth = 3; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      break;
    }
  }

  // Open doorway cutout indicator on bottom facade for enterable buildings
  if (w >= 64 && h >= 64) {
    const isLarge = w > 180 || h > 180;
    const doorW = Math.min(w * 0.55, isLarge ? 104 : 72);
    const doorX0 = cx - doorW / 2;
    g.fillStyle = '#11161d'; g.fillRect(doorX0, y + h - 10, doorW, 11);
    g.fillStyle = '#fbbf24'; g.fillRect(doorX0 - 3, y + h - 9, 4, 9); g.fillRect(doorX0 + doorW - 1, y + h - 9, 4, 9);
  }
}

// ───────── minimap ─────────
let mini = null;
function buildMinimap() {
  mini = document.createElement('canvas'); mini.width = MW; mini.height = MH;
  const g = mini.getContext('2d'); const img = g.createImageData(MW, MH);
  const elev = t => t === 8 ? 3 : (t === 9 || t === 18) ? 2 : (t === 0 ? -2 : (t === 1 || t === 14) ? -1 : 0);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, t = tiles[i], c = TRGB[t];
    const eC = elev(t);
    const eN = y > 0 ? elev(tiles[(y - 1) * MW + x]) : eC;
    const eW = x > 0 ? elev(tiles[y * MW + x - 1]) : eC;
    const f = clamp(1 + (eC - eN) * 0.08 + (eC - eW) * 0.06, 0.72, 1.25);
    img.data[i * 4] = clamp(c[0] * f, 0, 255) | 0;
    img.data[i * 4 + 1] = clamp(c[1] * f, 0, 255) | 0;
    img.data[i * 4 + 2] = clamp(c[2] * f, 0, 255) | 0;
    img.data[i * 4 + 3] = 255;
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

  const curZone = (me && me.zone) || 'world';
  if (curZone !== lastSnapZone) {
    lastSnapZone = curZone;
    decals.length = 0; particles.length = 0; fxs.length = 0; warns.length = 0; reveals.length = 0;
    snaps.length = 0; snaps.push(s);
    if (!m.G) items.clear();
    if (!m.S) structs.clear();
  }
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
  const rt = performance.now() - 85;
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
function flushInputNow() {
  if (!D || !me || !ws || ws.readyState !== 1) return;
  const now = performance.now();
  if (now - lastSend < 12) return;
  lastSend = now;
  let mx = 0, my = 0;
  if (!uiBlock()) {
    mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  }
  const w = worldMouse(), block = uiBlock() || !!mode;
  send({
    t: 'in', mx, my, ax: Math.round(w.x), ay: Math.round(w.y),
    f: mouse.l && !block ? 1 : 0, al: mouse.r && !block ? 1 : 0,
    sp: (keys.ShiftLeft || keys.ShiftRight) ? 1 : 0,
    brk: keys.Space ? 1 : 0,
    x: Math.round(pred.x * 10) / 10, y: Math.round(pred.y * 10) / 10,
    ps: pred.ps
  });
}

addEventListener('keydown', e => {
  if (!D) return;
  if (chatOpen) { if (e.key === 'Enter') sendChat(); else if (e.key === 'Escape') closeChat(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Tab') { e.preventDefault(); $('board').hidden = false; renderBoard(); return; }
  if (e.code === 'Space') { e.preventDefault(); }
  if (keys[e.code]) return; keys[e.code] = true;
  if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
      e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    flushInputNow();
  }
  ac();
  switch (e.code) {
    case 'Enter': e.preventDefault(); openChat(); break;
    case 'KeyE': send({t: 'act'}); break;
    case 'KeyT': toggleShelterTycoon(); break;
    case 'KeyY': case 'KeyU': toggleRebornModal(); break;
    case 'KeyP':
      if (me && me.rebornPerks && (Array.isArray(me.rebornPerks) ? me.rebornPerks.includes('quantum_recall') : me.rebornPerks.quantum_recall > 0)) {
        send({t: 'quantum_recall'});
        toast('🌀 Engaging Quantum Recall Matrix…');
      } else {
        toast('Unlock "Quantum Recall Transponder" in Reborn menu [Y] to warp to your shelter!');
      }
      break;
    case 'KeyO':
      if (me && me.rebornPerks && (Array.isArray(me.rebornPerks) ? me.rebornPerks.includes('orbital_beam') : me.rebornPerks.orbital_beam > 0)) {
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
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Tab') $('board').hidden = true;
  if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
      e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    flushInputNow();
  }
});
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
  if (me && me.zone && me.zone.startsWith('bunker_')) {
    send({t: 'get_plot', plotId: +me.zone.slice(7)});
    return;
  }
  // Check if near any plot first when on surface
  const nearPlot = (!me || me.zone === 'world') ? findNearestPlot(pred.x, pred.y, 400) : null;
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
  const up = plot.upgrades || {};
  $('sh-scrap-counter').textContent = myScrap;
  $('sh-level').textContent = plot.level || 1;

  // Passive income calculation matching server plotTick
  let sps = plot.ownerName ? 1 : 0;
  if (up.scrap_compactor) sps += [0, 3, 6, 10, 16, 24, 35, 50, 70, 100, 150][up.scrap_compactor] || 0;
  if (up.scavenger_drones) sps += up.scavenger_drones * 6;
  if (up.nuclear_rtg) sps += [0, 18, 36, 60, 100][up.nuclear_rtg] || 0;
  if (up.crypto_terminal) sps += [0, 12, 25, 45, 75][up.crypto_terminal] || 0;
  if (up.antimatter_reactor) sps += [0, 40, 90, 200][up.antimatter_reactor] || 0;
  if (up.solar_array) sps *= (1 + up.solar_array * 0.15);
  if (up.scrap_smelter) sps *= (1 + up.scrap_smelter * 0.25);
  $('sh-income').textContent = sps > 0 ? `+${Math.round(sps)} Scrap/s` : 'Claim to Earn Scrap';

  // Defense status
  const turretSum = (up.turret_pistol || 0) + (up.turret_mg || 0) + (up.turret_sniper || 0) + (up.turret_laser || 0) + (up.turret_rocket || 0) + (up.turret_cryo || 0) + (up.turret_flame || 0);
  $('sh-defense').textContent = turretSum > 0 ? `Sentries Tier ${turretSum}` : (plot.ownerName ? 'Baseline Defense' : 'Unarmed');

  // Beacon
  const beaconLv = up.evac_beacon || 0;
  $('sh-beacon-stat').textContent = beaconLv > 0 ? `Stage ${beaconLv}/5 ACTIVE` : 'Offline (0/5)';

  // Grid of upgrades
  const grid = $('sh-upgrades-grid');
  let cardsHtml = '';

  const isNear = Math.hypot(plot.x - pred.x, plot.y - pred.y) < 360;
  if (!plot.ownerName) {
    cardsHtml += `<div class="upg-card beacon-card">
      <div class="upg-top">
        <span class="upg-icon">🚩</span>
        <span class="upg-name">Claim This Outpost</span>
        <span class="upg-lv active">FREE</span>
      </div>
      <div class="upg-desc">Establish ownership of Plot #${plot.id} to unlock passive Scrap income, automated turrets & your 6-Wing Underground Bunker!</div>
      <div class="upg-stat">✦ ${isNear ? 'In Range — Ready to Claim' : 'Walk near plot or click below to claim'}</div>
      <button class="upg-btn" id="btn-claim-plot">CLAIM OUTPOST NOW</button>
    </div>`;
  }

  const upgList = Object.values(D.UPGRADES);
  for (const u of upgList) {
    if (currentTycoonCat !== 'all' && u.cat !== currentTycoonCat) continue;
    const currentLv = up[u.key] || 0;
    const maxLv = u.maxLv || 1;
    const maxed = currentLv >= maxLv;
    const cost = maxed ? 0 : Math.round(u.baseCost * Math.pow(u.costMult, currentLv));
    const canAfford = myScrap >= cost;
    const statIdx = Math.min((u.stat ? u.stat.length - 1 : 0), currentLv);
    const statText = u.stat && u.stat[statIdx] ? u.stat[statIdx] : u.desc;

    cardsHtml += `<div class="upg-card ${maxed ? 'maxed' : ''} ${u.key === 'evac_beacon' ? 'beacon-card' : ''}">
      <div class="upg-top">
        <span class="upg-icon">${u.icon}</span>
        <span class="upg-name">${esc(u.name)}</span>
        <span class="upg-lv ${currentLv > 0 ? 'active' : ''}">Lv.${currentLv}/${maxLv}</span>
      </div>
      <div class="upg-desc">${esc(u.desc)}</div>
      <div class="upg-stat">✦ ${esc(statText)}</div>
      <div>
        ${maxed ? `<button class="upg-btn maxed-btn" disabled>✓ MAX LEVEL</button>` :
          `<button class="upg-btn" data-upg="${u.key}" ${canAfford ? '' : 'disabled'}>
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
  const perks = (me && me.rebornPerks && !Array.isArray(me.rebornPerks)) ? me.rebornPerks : {};
  const unlockedCount = Object.values(perks).filter(v => v > 0).length;

  $('rb-token-counter').textContent = cores;
  $('rb-tier-display').textContent = rebirths > 0 ? `ASCENDANT (TIER ${rebirths})` : 'MORTAL SURVIVOR (TIER 0)';
  $('rb-scrap-mult').textContent = `+${rebirths * 25}% Permanent Scrap Boost`;
  $('rb-perks-count').textContent = `${unlockedCount} / ${Object.keys(D.REBORN_PERKS).length} Unlocked`;

  const ascendBtn = $('btn-do-ascend');
  if (ascendBtn) {
    const canAscend = !!(me && ((me.plotLv && me.plotLv >= 4) || (me.beacon && me.beacon >= 5) || (activePlot && activePlot.upgrades && activePlot.upgrades.evac_beacon >= 5) || rebirths > 0));
    const tokenReward = 10 + Math.floor(((me && me.scrap) || 0) / 400) + ((me && me.plotLv ? me.plotLv : 0) * 2);
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
    const curRank = perks[key] || 0;
    const maxRank = p.max || 1;
    const maxed = curRank >= maxRank;
    const nextCost = Array.isArray(p.cost) ? (p.cost[curRank] || p.cost[p.cost.length - 1]) : (p.cost || 5);
    const canAfford = cores >= nextCost;

    cardsHtml += `<div class="reborn-card ${curRank > 0 ? 'unlocked' : ''}">
      <div class="rb-top">
        <span class="rb-icon">${p.icon}</span>
        <div class="rb-title-wrap">
          <div class="rb-name">${esc(p.name)}</div>
          <div class="rb-cat">RANK ${curRank} / ${maxRank}</div>
        </div>
        <span class="rb-badge ${curRank > 0 ? 'active' : ''}">${maxed ? 'MAX' : nextCost + ' ⚛️'}</span>
      </div>
      <div class="rb-desc">${esc(p.desc)}</div>
      <div class="rb-effect">✦ ${esc(p.effect)}</div>
      <div class="rb-action">
        ${maxed
          ? `<button class="rb-btn unlocked-btn" disabled>✓ MAX RANK UNLOCKED</button>`
          : `<button class="rb-btn ${canAfford ? 'can-buy' : 'need-cores'}" data-perk="${key}" ${canAfford ? '' : 'disabled'}>
              ${curRank > 0 ? 'UPGRADE' : 'UNLOCK'} · ${nextCost} ⚛️ CORES
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
      addFx({k: 'flash', x: d[1], y: d[2], r: heavy ? 140 : 80, life: 65});
      sfx(d[5] === 2 ? 'beam' : heavy ? 'heavy' : 'shot', d[1], d[2]);
      const sAng = Math.atan2(d[4] - d[2], d[3] - d[1]);
      if (d[5] !== 2) {
        const eAng = sAng - Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        particles.push({
          x: d[1] + Math.cos(sAng) * 14,
          y: d[2] + Math.sin(sAng) * 14,
          vx: Math.cos(eAng) * (70 + Math.random() * 45),
          vy: Math.sin(eAng) * (70 + Math.random() * 45),
          life: 450, t: 450, col: '#facc15', size: 2.2
        });
      }
      burst(d[1] + Math.cos(sAng) * 18, d[2] + Math.sin(sAng) * 18, 2, 'rgba(210,215,225,0.65)', 35, 220, 3.5);
      burst(d[3], d[4], 3, '#ffd166', 75, 200, 2.5);
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
      burst(d[1], d[2], 6, '#dc2626', 150, 450, 3.5);
      addDecal(d[1] + (Math.random() - 0.5) * 14, d[2] + (Math.random() - 0.5) * 14, 'blood', 10 + Math.random() * 12);
      sfx('hit', d[1], d[2], 0.6);
      break;
    case 'zd':
      addDecal(d[1], d[2], 'corpse', D.ZD[D.ZLIST[d[3]]].r);
      addDecal(d[1], d[2], 'blood', 18 + Math.random() * 12);
      burst(d[1], d[2], 12, '#991b1b', 180, 550, 4.5);
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
      const inVeh = me.veh ? myVehicle(now) : null;
      updateDomHUD(now, inVeh);
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
    vehPred.active = false; vehPred.id = 0;
    const l = Math.hypot(mx, my), nx = l ? mx / l : 0, ny = l ? my / l : 0;
    const tileProp = D.TILES[tileAt(pred.x, pred.y)];
    const walk = (tileProp && tileProp.walk) || 1;
    const spd = me.spd * walk * (sprint && me.st > 1 && l ? 1.45 : 1);
    moveCircle(pred, nx * spd * dt + me.pl[0] * dt, ny * spd * dt + me.pl[1] * dt, 16);
    if (D && M) {
      const wm = worldMouse();
      pred.a = Math.atan2(wm.y - pred.y, wm.x - pred.x);
    }
  } else if (me.veh && latest && latest.V) {
    const sv = latest.V.get(me.veh);
    if (sv) {
      const isDriver = sv[6] === myId;
      const t = D.VLIST[sv[1]], d = D.VEH[t];
      if (isDriver && d) {
        if (!vehPred.active || vehPred.id !== me.veh) {
          vehPred.id = me.veh;
          vehPred.x = sv[2];
          vehPred.y = sv[3];
          vehPred.a = sv[4] / 100;
          vehPred.sp = sv[8];
          vehPred.vx = sv[10] !== undefined ? sv[10] : Math.cos(vehPred.a) * vehPred.sp;
          vehPred.vy = sv[11] !== undefined ? sv[11] : Math.sin(vehPred.a) * vehPred.sp;
          vehPred.alt = (sv[7] & 8) ? 1 : 0;
          vehPred.steerAngle = 0;
          vehPred.sa = 0;
          vehPred.lastSkidAt = 0;
          vehPred.active = true;
        }

        // ── 0ms Drive/Flight Lag: Server-matched Forward/Lateral & Aviation Physics ──
        const disabled = !!(me.vb || (me.vf !== undefined && me.vf <= 0) || (sv[7] & 2));
        const thr = disabled ? 0 : -my, steer = mx, boost = sprint && !disabled, braking = brake;
        const isAir = !!d.air;
        const liftMode = d.liftMode || (d.kind === 'heli' ? 'vtol' : null);
        const prevFwd = Math.abs(vehPred.sp || 0);
        if (isAir) {
          if (liftMode === 'vtol') {
            vehPred.alt = !disabled ? Math.min(1, vehPred.alt + dt * 0.85) : Math.max(0, vehPred.alt - dt * 0.45);
          } else {
            const takeoff = d.takeoffSpd || 280, stall = d.stallSpd || 200;
            if (!disabled && prevFwd >= takeoff) vehPred.alt = Math.min(1, vehPred.alt + dt * 0.9);
            else if (disabled || prevFwd < stall) vehPred.alt = Math.max(0, vehPred.alt - dt * 0.45);
          }
          if ((sv[7] & 8) && vehPred.alt < 0.52) vehPred.alt = lerp(vehPred.alt, 1, Math.min(1, dt * 4));
          else if (!(sv[7] & 8) && vehPred.alt > 0.65 && prevFwd < (d.stallSpd || 180)) vehPred.alt = lerp(vehPred.alt, 0, Math.min(1, dt * 4));
        } else {
          vehPred.alt = 0;
        }

        const tile = tileAt(vehPred.x, vehPred.y);
        const P = D.TILES[tile] || {};
        let tm;
        const isRoad = tile === 5 || tile === 20 || tile === 16 || tile === 6;
        if (isAir) {
          if (vehPred.alt > 0.5) tm = 1;
          else if (d.floatWater && P.water) tm = 0.95;
          else if (isRoad) tm = 1.15;
          else tm = liftMode === 'vtol' ? 0.3 : 0.65;
        } else if (d.kind === 'boat') tm = P.water ? 1 : 0.05;
        else if (d.kind === 'hover') tm = P.water ? 1 : Math.max(0.55, P.veh || 1);
        else {
          tm = isRoad ? 1.35 : (d.terrain && d.terrain[tile] !== undefined ? d.terrain[tile] : (P.veh || 1));
        }
        const maxS = d.speed * tm * (boost ? 1.32 : 1);

        const cosA = Math.cos(vehPred.a), sinA = Math.sin(vehPred.a);
        let fwd = vehPred.vx * cosA + vehPred.vy * sinA;
        let lat = -vehPred.vx * sinA + vehPred.vy * cosA;

        if (thr > 0) {
          const launchBoost = Math.abs(fwd) < 90 ? 1.35 : 1.18;
          fwd += d.accel * thr * dt * (fwd < -10 ? 4.2 : launchBoost);
        } else if (thr < 0) {
          if (fwd > 20) fwd -= Math.min(fwd, d.accel * 4.8 * dt);
          else fwd += d.accel * thr * dt * (isAir && vehPred.alt > 0.5 ? 0.4 : 1.65);
        } else {
          const rollingDrag = (P.drag || 1.0) * (isAir ? (vehPred.alt > 0.5 && liftMode !== 'vtol' ? 0.35 : 0.9) : 1.55);
          fwd -= fwd * Math.min(1, rollingDrag * dt);
        }

        if (braking && !isAir) fwd *= Math.exp(-2.8 * dt);
        if (braking && isAir && vehPred.alt <= 0.5) fwd *= Math.exp(-3.4 * dt);
        if (fwd > maxS) fwd -= (fwd - maxS) * Math.min(1, 5.2 * dt);
        if (fwd < -maxS * (isAir ? 0.25 : 0.58)) fwd = -maxS * (isAir ? 0.25 : 0.58);

        vehPred.sa += (steer - vehPred.sa) * Math.min(1, 18 * dt);
        const absFwd = Math.abs(fwd);
        const vtol = liftMode === 'vtol';
        const steerCurve = isAir
          ? (vtol ? 1 : (vehPred.alt > 0.5 ? 0.85 : clamp(0.45 + absFwd / 260, 0.35, 1.0)))
          : clamp(0.42 + (absFwd / 120) * 0.72 - Math.max(0, (absFwd - 480) / 1400) * 0.28, 0.35, 1.12);
        const driftTurn = braking && d.kind === 'car' && absFwd > 140 ? 1.24 : 1;
        if (absFwd > 5 || (isAir && vtol)) {
          vehPred.a += vehPred.sa * d.turn * steerCurve * driftTurn * dt * (fwd < -5 && !vtol ? -1 : 1);
        }
        vehPred.steerAngle = lerp(vehPred.steerAngle, vehPred.sa * 0.48, Math.min(1, dt * 18));

        const nCos = Math.cos(vehPred.a), nSin = Math.sin(vehPred.a);
        const latGrip = (d.kind === 'car' ? (P.grip || 1) : (isAir ? 1.4 : 1)) * (d.grip || 1) * (braking && !isAir ? 2.1 : 10.5);
        lat *= Math.exp(-latGrip * dt);

        vehPred.vx = nCos * fwd - nSin * lat;
        vehPred.vy = nSin * fwd + nCos * lat;
        vehPred.sp = fwd;

        const ck = isAir ? (vehPred.alt > 0.5 ? 'fly' : (d.floatWater ? 'amphib' : 'car')) : d.kind;
        const colR = Math.max(14, Math.round(d.r * 0.72));
        const spdNow = Math.hypot(vehPred.vx, vehPred.vy);
        if (spdNow > 0.5) {
          const res = moveVehiclePred(vehPred, vehPred.vx * dt, vehPred.vy * dt, colR, ck);
          if (res.hit) {
            const vDotN = vehPred.vx * res.nx + vehPred.vy * res.ny;
            if (vDotN < 0) {
              vehPred.vx -= (1.06 * vDotN) * res.nx;
              vehPred.vy -= (1.06 * vDotN) * res.ny;
              vehPred.vx *= 0.94; vehPred.vy *= 0.94;
            }
            if (spdNow > 80 && Math.abs(res.nx) + Math.abs(res.ny) > 0.1) {
              const tangAng = Math.atan2(vehPred.vy, vehPred.vx);
              let diff = tangAng - vehPred.a;
              while (diff > Math.PI) diff -= 2 * Math.PI;
              while (diff < -Math.PI) diff += 2 * Math.PI;
              if (Math.abs(diff) < 0.72) vehPred.a += diff * 0.35;
            }
          }
          vehPred.sp = vehPred.vx * Math.cos(vehPred.a) + vehPred.vy * Math.sin(vehPred.a);
        }

        // Latency-compensated reconciliation with server (speed-adaptive deadband + forward extrapolation)
        const sX = sv[2], sY = sv[3], sA = sv[4] / 100, sSp = sv[8];
        const sVx = sv[10] !== undefined ? sv[10] : Math.cos(sA) * sSp;
        const sVy = sv[11] !== undefined ? sv[11] : Math.sin(sA) * sSp;
        const lag = clamp((now - latest.t) / 1000 + ping / 2000, 0, 0.14);
        const targetX = sX + sVx * lag, targetY = sY + sVy * lag;
        const distErr = Math.hypot(vehPred.x - targetX, vehPred.y - targetY);
        const deadband = Math.max(20, spdNow * 0.045);
        if (distErr > Math.max(280, spdNow * 0.45)) {
          vehPred.x = sX; vehPred.y = sY; vehPred.a = sA; vehPred.sp = sSp;
          vehPred.vx = sVx; vehPred.vy = sVy;
        } else if (distErr > deadband) {
          const blend = Math.min(1, dt * (distErr > 75 ? 6.5 : 3.5));
          vehPred.x = lerp(vehPred.x, targetX, blend);
          vehPred.y = lerp(vehPred.y, targetY, blend);
          vehPred.a = angLerp(vehPred.a, sA, Math.min(1, dt * 6));
          if (distErr > deadband * 1.8) {
            vehPred.vx = lerp(vehPred.vx, sVx, Math.min(1, dt * 4));
            vehPred.vy = lerp(vehPred.vy, sVy, Math.min(1, dt * 4));
          }
        }

        pred.x = vehPred.x; pred.y = vehPred.y;

        if ((d.kind === 'car' || (isAir && vehPred.alt <= 0.5 && !P.water)) && (Math.abs(lat) > 75 || (Math.abs(vehPred.sp) > 155 && (braking || Math.abs(steer) > 0.25))) && now - vehPred.lastSkidAt > 55) {
          vehPred.lastSkidAt = now;
          addDecal(vehPred.x - nCos * 18, vehPred.y - nSin * 18, 'skid', 15, vehPred.a);
          const dustCol = (tile === 9 || tile === 10) ? 'rgba(241,245,249,0.55)' : (tile === 2 || tile === 18) ? 'rgba(226,207,143,0.48)' : 'rgba(165,165,165,0.45)';
          if (Math.random() < 0.65) burst(vehPred.x - nCos * 22, vehPred.y - nSin * 22, 1, dustCol, 42, 270, 3.6);
        }
      } else {
        const iv = myVehicle(now);
        if (iv) { pred.x = iv.x; pred.y = iv.y; }
      }
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

// Client vehicle state with 0ms prediction & steering angle
function myVehicle(now) {
  const v = latest && latest.V ? latest.V.get(me.veh) : null;
  if (!v) return null;
  if (vehPred.active && vehPred.id === me.veh && v[6] === myId) {
    const spd = Math.hypot(vehPred.vx, vehPred.vy);
    return {
      x: vehPred.x,
      y: vehPred.y,
      a: vehPred.a,
      alt: vehPred.alt,
      steerAngle: vehPred.steerAngle,
      v,
      vx: vehPred.vx,
      vy: vehPred.vy,
      speed: spd,
      sp: vehPred.sp
    };
  }
  const age = Math.min(0.12, (now - latest.t) / 1000);
  const a = v[4] / 100;
  const vx = v[10] !== undefined ? v[10] : Math.cos(a) * v[8];
  const vy = v[11] !== undefined ? v[11] : Math.sin(a) * v[8];
  return {
    x: v[2] + vx * age,
    y: v[3] + vy * age,
    a,
    alt: (v[7] & 8) ? 1 : 0,
    steerAngle: 0,
    v, vx, vy,
    speed: Math.hypot(vx, vy),
    sp: v[8]
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
let _fxKey = '', _fxSet = new Set();
function fxNow() {
  const k = (sky ? sky.fx : '') + '|' + (cosmic ? cosmic.fx : '');
  if (k !== _fxKey) {
    _fxKey = k;
    _fxSet.clear();
    if (sky && sky.fx) _fxSet.add(sky.fx);
    if (cosmic && cosmic.fx) _fxSet.add(cosmic.fx);
  }
  return _fxSet;
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
  if (inVeh) zt *= clamp(0.9 - Math.abs(inVeh.v[8]) / 5000, 0.62, 0.9);
  if (inVeh && (inVeh.v[7] & 8)) zt *= 0.75;
  if (scoped) zt *= 0.68;
  zoom = lerp(zoom, zt, Math.min(1, dt * 4));
  let tx = selfX, ty = selfY;
  if (scoped) {
    tx += (mouse.x - VW / 2) / zoom * 0.7; ty += (mouse.y - VH / 2) / zoom * 0.7;
  } else if (inVeh && inVeh.speed > 30) {
    const lead = Math.min(220, inVeh.speed * 0.28);
    tx += Math.cos(inVeh.a) * lead;
    ty += Math.sin(inVeh.a) * lead;
  }
  camX = lerp(camX || tx, tx, Math.min(1, dt * (scoped ? 6 : inVeh ? 10 : 14)));
  camY = lerp(camY || ty, ty, Math.min(1, dt * (scoped ? 6 : inVeh ? 10 : 14)));
  if (Math.hypot(camX - tx, camY - ty) > 1500) { camX = tx; camY = ty; }

  shake *= Math.pow(0.02, dt);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (VW / 2 - camX * zoom + sx), DPR * (VH / 2 - camY * zoom + sy));
  const vx0 = camX - VW / 2 / zoom - 120, vy0 = camY - VH / 2 / zoom - 120, vx1 = camX + VW / 2 / zoom + 120, vy1 = camY + VH / 2 / zoom + 120;
  const inView = (x, y, r = 0) => x > vx0 - r && x < vx1 + r && y > vy0 - r && y < vy1 + r;

  const zone = (me && me.zone) || 'world';
  const isInterior = zone !== 'world';

  if (isInterior) {
    drawActiveInterior(zone, now, selfX, selfY);
  } else {
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

    // Draw 4 Wasteland Military Raid Bunker Hatches
    drawRaidBunkers(now, inView, selfX, selfY);

    // Draw enterable building interiors, animated roofs, and doorway portals
    drawBuildingInteriors(now, inView, selfX, selfY, vx0, vy0, vx1, vy1);

    // Draw sub-map entrance portals (Universities, Hospitals, Malls, Military Bases)
    drawBuildingEntrances(now, inView, selfX, selfY, vx0, vy0, vx1, vy1);
  }

  // Decals (tire skids, blood, scorch, corpses)
  for (const d of decals) {
    if (!inView(d.x, d.y, 60)) continue;
    const age = (now - d.t0) / 1000;
    const maxLife = d.kind === 'corpse' ? 45 : d.kind === 'skid' ? 30 : 90;
    const al = clamp(1 - age / maxLife, 0, 1);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    if (d.kind === 'skid') {
      const ca = Math.cos(d.a), sa = Math.sin(d.a), hl = d.r * 0.5;
      ctx.strokeStyle = 'rgba(15,15,15,.46)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(d.x - ca * 4 - sa * hl, d.y - sa * 4 + ca * hl);
      ctx.lineTo(d.x + ca * 4 - sa * hl, d.y + sa * 4 + ca * hl);
      ctx.moveTo(d.x - ca * 4 + sa * hl, d.y - sa * 4 - ca * hl);
      ctx.lineTo(d.x + ca * 4 + sa * hl, d.y + sa * 4 - ca * hl);
      ctx.stroke();
    } else if (d.kind === 'blood') {
      ctx.fillStyle = '#5c0a0a'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, d.a, 0, 7); ctx.fill();
    } else if (d.kind === 'scorch') {
      ctx.drawImage(GLOW_SPR.scorch, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
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
      ctx.drawImage(GLOW_SPR.crater, x - r, y - r, r * 2, r * 2);
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

  // Items, Bunker Chests, Armored Vaults & Loot Bags
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of items.values()) {
    if (!inView(it.x, it.y, 40)) continue;
    const ix = it.x, iy = it.y;
    if (it.k === 'vault') {
      // Heavy Armored Vault Chest with dial wheel & rarity aura
      const pulse = 0.5 + 0.5 * Math.sin(now / 260 + it.id);
      ctx.fillStyle = `rgba(251, 191, 36, ${0.12 + pulse * 0.1})`;
      ctx.beginPath(); ctx.arc(ix, iy, 30, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.48)'; ctx.fillRect(ix - 18, iy - 13, 40, 32);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(ix - 21, iy - 16, 42, 32);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.2; ctx.strokeRect(ix - 21, iy - 16, 42, 32);
      // Corner steel brackets & lid seam
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ix - 22, iy - 17, 7, 5); ctx.fillRect(ix + 15, iy - 17, 7, 5);
      ctx.fillRect(ix - 22, iy + 12, 7, 5); ctx.fillRect(ix + 15, iy + 12, 7, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(ix - 18, iy - 13, 36, 12);
      // Combination lock dial + red security LED
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(ix, iy + 2, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = (now % 700 < 350) ? '#ef4444' : '#7f1d1d';
      ctx.beginPath(); ctx.arc(ix + 13, iy - 9, 2.5, 0, 7); ctx.fill();
      if (it.label && Math.hypot(ix - selfX, iy - selfY) < 180) {
        ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#fde68a';
        ctx.fillText(`🔐 ${it.label}`, ix, iy - 25);
      }
      continue;
    }
    if (it.k === 'crate') {
      // Tactical Military / Bunker Supply Chest with slatted lid & brass latches
      const lbl = it.label ? String(it.label) : '';
      const trim = lbl.includes('Bio') ? '#10b981' : lbl.includes('Reactor') ? '#a855f7' : lbl.includes('Command') ? '#38bdf8' : lbl.includes('Engineering') ? '#fb923c' : '#f59e0b';
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(ix - 17, iy - 11, 38, 28);
      ctx.fillStyle = '#364526'; ctx.fillRect(ix - 19, iy - 14, 38, 28);
      ctx.fillStyle = '#4a5d34'; ctx.fillRect(ix - 16, iy - 11, 32, 10);
      ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.strokeRect(ix - 19, iy - 14, 38, 28);
      // Cross ribs & brass latches
      ctx.fillStyle = '#1e293b'; ctx.fillRect(ix - 19, iy - 1, 38, 3);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(ix - 11, iy - 3, 5, 6); ctx.fillRect(ix + 6, iy - 3, 5, 6);
      if (lbl && Math.hypot(ix - selfX, iy - selfY) < 180) {
        ctx.font = 'bold 10px system-ui'; ctx.fillStyle = trim;
        ctx.fillText(`📦 ${lbl}`, ix, iy - 23);
      }
      continue;
    }
    if (it.k === 'bag') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(ix + 3, iy + 4, 15, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5c4328'; ctx.beginPath(); ctx.ellipse(ix, iy, 15, 11, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#92400e'; ctx.fillRect(ix - 8, iy - 9, 4, 18); ctx.fillRect(ix + 4, iy - 9, 4, 18);
      continue;
    }
    const bob = Math.sin(now / 400 + it.id) * 1.8;
    ctx.fillStyle = it.k.startsWith('w:') ? 'rgba(60,20,20,.88)' : 'rgba(15,20,25,.82)';
    ctx.strokeStyle = it.k.startsWith('w:') ? '#ff6b6b' : '#5aa9e6';
    ctx.lineWidth = 1.8;
    const s = 13;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(ix - s, iy - s + bob, s * 2, s * 2, 5) : ctx.rect(ix - s, iy - s + bob, s * 2, s * 2);
    ctx.fill(); ctx.stroke();
    ctx.font = '15px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(itemIcon(it.k), ix, iy + bob + 1);
  }

  // Placed Structures (detailed props, barricades, traps & utilities)
  for (const s of structs.values()) {
    if (!inView(s.x, s.y, 90)) continue;
    const d = D.STRUCTS[s.k];
    const x0 = s.x - s.w / 2, y0 = s.y - s.h / 2;
    const teamBorder = settings.mode === 'teams' && s.team ? TEAMCOL[s.team] : null;
    ctx.save();
    // Ground drop shadow
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.fillRect(x0 + 4, y0 + 5, s.w, s.h);

    switch (s.k) {
      case 'wood': case 'plywood': {
        ctx.fillStyle = s.k === 'wood' ? '#7c4d24' : '#b88c4a';
        ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#3e230e'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x0, y0, s.w, s.h);
        // Individual planks & cross-braces
        ctx.strokeStyle = 'rgba(38,20,8,0.55)'; ctx.lineWidth = 1;
        for (let py = y0 + 5; py < y0 + s.h - 2; py += 5) {
          ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0 + s.w, py); ctx.stroke();
        }
        ctx.fillStyle = '#4a2b13';
        for (let px = x0 + 12; px < x0 + s.w - 8; px += 26) {
          ctx.fillRect(px - 2, y0 - 1, 4, s.h + 2);
          ctx.fillStyle = '#cbd5e1'; ctx.fillRect(px - 1, y0 + 2, 2, 2); ctx.fillRect(px - 1, y0 + s.h - 4, 2, 2);
          ctx.fillStyle = '#4a2b13';
        }
        break;
      }
      case 'sandbag': {
        // Staggered plump sandbags
        const bagW = 18, bagH = 12;
        for (let row = 0; row < 2; row++) {
          const off = row * 9;
          for (let bx = x0 + off; bx < x0 + s.w - 4; bx += bagW) {
            const bw = Math.min(bagW - 1, x0 + s.w - bx);
            const by = y0 + row * 13 + 1;
            ctx.fillStyle = row === 0 ? '#a89368' : '#c2ae82';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bx, by, bw, bagH, 4) : ctx.rect(bx, by, bw, bagH);
            ctx.fill();
            ctx.strokeStyle = '#5c4d30'; ctx.lineWidth = 1; ctx.stroke();
          }
        }
        break;
      }
      case 'cinder': {
        ctx.fillStyle = '#73767a'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#474a4f'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, s.w, s.h);
        for (let bx = x0 + 3; bx < x0 + s.w - 8; bx += 18) {
          ctx.fillStyle = '#9ca3af'; ctx.fillRect(bx, y0 + 3, 14, s.h - 6);
          ctx.fillStyle = '#374151'; ctx.fillRect(bx + 2, y0 + 6, 4, s.h - 12); ctx.fillRect(bx + 8, y0 + 6, 4, s.h - 12);
        }
        break;
      }
      case 'metal': case 'corrugated': case 'reinforced': {
        const isReinf = s.k === 'reinforced';
        ctx.fillStyle = isReinf ? '#334155' : '#64748b';
        ctx.fillRect(x0, y0, s.w, s.h);
        // Metallic beveled highlight & rivets
        ctx.fillStyle = isReinf ? '#475569' : '#94a3b8';
        ctx.fillRect(x0 + 2, y0 + 2, s.w - 4, 4);
        if (s.k === 'corrugated') {
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
          for (let kx = x0 + 6; kx < x0 + s.w - 4; kx += 8) {
            ctx.beginPath(); ctx.moveTo(kx, y0 + 1); ctx.lineTo(kx, y0 + s.h - 1); ctx.stroke();
          }
        } else {
          ctx.fillStyle = '#cbd5e1';
          for (let kx = x0 + 8; kx < x0 + s.w - 6; kx += 20) {
            ctx.fillRect(kx, y0 + 3, 2, 2); ctx.fillRect(kx, y0 + s.h - 5, 2, 2);
          }
        }
        if (isReinf) {
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + s.h / 2); ctx.lineTo(x0 + s.w - 4, y0 + s.h / 2); ctx.stroke();
        }
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, s.w, s.h);
        break;
      }
      case 'door': {
        // Jambs
        ctx.fillStyle = '#334155';
        ctx.fillRect(x0, y0 - 2, 8, s.h + 4); ctx.fillRect(x0 + s.w - 8, y0 - 2, 8, s.h + 4);
        ctx.save();
        ctx.translate(x0 + 6, y0 + s.h / 2);
        if (s.open) ctx.rotate(-Math.PI * 0.48);
        ctx.fillStyle = '#6b4226'; ctx.fillRect(0, -s.h / 2 + 1, s.w - 12, s.h - 2);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.strokeRect(0, -s.h / 2 + 1, s.w - 12, s.h - 2);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(s.w - 22, -2, 6, 4);
        ctx.restore();
        break;
      }
      case 'raincatcher': {
        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.fillStyle = s.wat ? '#0ea5e9' : '#2563eb';
        ctx.fillRect(x0 + 4, y0 + 4, s.w - 8, s.h - 8);
        ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 4, y0 + 4, s.w - 8, s.h - 8);
        // Corner support posts
        ctx.fillStyle = '#78350f';
        for (const [px, py] of [[x0, y0], [x0 + s.w - 5, y0], [x0, y0 + s.h - 5], [x0 + s.w - 5, y0 + s.h - 5]]) ctx.fillRect(px, py, 5, 5);
        break;
      }
      case 'barrel': case 'charcoal': {
        ctx.fillStyle = s.k === 'barrel' ? '#1d4ed8' : '#334155';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.w / 2, 0, 7); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = s.wat ? '#38bdf8' : '#1e293b';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.w * 0.34, 0, 7); ctx.fill();
        break;
      }
      case 'generator': {
        ctx.fillStyle = '#eab308'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#422006'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, s.w, s.h);
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(x0 + 4, y0 + 4, s.w * 0.45, s.h - 8);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x0 + s.w * 0.55, y0 + 5, s.w * 0.35, s.h - 10);
        ctx.fillStyle = (now % 500 < 250) ? '#4ade80' : '#166534';
        ctx.beginPath(); ctx.arc(x0 + s.w - 6, y0 + 6, 3, 0, 7); ctx.fill();
        break;
      }
      case 'solar': {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.fillStyle = '#1e40af'; ctx.fillRect(x0 + 3, y0 + 3, s.w - 6, s.h - 6);
        ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1;
        for (let gx = x0 + 10; gx < x0 + s.w - 4; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, y0 + 3); ctx.lineTo(gx, y0 + s.h - 3); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x0 + 3, s.y); ctx.lineTo(x0 + s.w - 3, s.y); ctx.stroke();
        break;
      }
      case 'spike': {
        ctx.fillStyle = '#452b16'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#29180a'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, s.w, s.h);
        for (let a2 = 0; a2 < 9; a2++) {
          const px = x0 + 11 + (a2 % 3) * 24, py = y0 + 11 + Math.floor(a2 / 3) * 24;
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px + 6, py + 6); ctx.lineTo(px - 6, py + 6); ctx.fill();
          ctx.fillStyle = '#ef4444'; ctx.fillRect(px - 1, py - 9, 2, 4);
        }
        break;
      }
      case 'tesla': {
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(s.x, s.y, s.w / 2, 0, 7); ctx.fill();
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, s.w * 0.34, 0, 7); ctx.stroke();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(now / 80) * 2, 0, 7); ctx.fill();
        if (Math.random() < 0.35) {
          ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1.5;
          const a = Math.random() * 6.28;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * 18, s.y + Math.sin(a) * 18); ctx.stroke();
        }
        break;
      }
      case 'chainlink': {
        ctx.fillStyle = 'rgba(148,163,184,0.22)'; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2;
        for (let k = -s.w / 2; k < s.w / 2; k += 8) {
          ctx.beginPath(); ctx.moveTo(s.x + k, y0); ctx.lineTo(s.x + k + 8, y0 + s.h); ctx.stroke();
        }
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(x0, s.y, 4, 0, 7); ctx.arc(x0 + s.w, s.y, 4, 0, 7); ctx.fill();
        break;
      }
      default: {
        ctx.fillStyle = d.c; ctx.fillRect(x0, y0, s.w, s.h);
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, s.w, s.h);
        ctx.fillStyle = (now % 600 < 300) ? '#fbbf24' : '#ef4444';
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
        break;
      }
    }
    if (teamBorder) {
      ctx.strokeStyle = teamBorder; ctx.lineWidth = 2; ctx.strokeRect(x0 - 1, y0 - 1, s.w + 2, s.h + 2);
    }
    if (s.hp < 100) {
      ctx.fillStyle = '#000'; ctx.fillRect(s.x - 20, y0 - 10, 40, 4);
      ctx.fillStyle = s.hp > 50 ? '#7bd389' : s.hp > 25 ? '#ffd166' : '#ff6b6b';
      ctx.fillRect(s.x - 20, y0 - 10, 40 * s.hp / 100, 4);
    }
    ctx.restore();
  }

  // Vehicles (ground)
  const isNightNow = daylight() < 0.65;
  const vlist = [];
  for (const [id, v] of b.V) {
    let x, y, an;
    if (id === me.veh && inVeh) {
      x = inVeh.x; y = inVeh.y; an = inVeh.a;
    } else {
      [x, y, an] = lerpArr(a.V.get(id), v, u, 2, 3, 4, 100);
    }
    if (!inView(x, y, 120)) continue;
    vlist.push([v, x, y, an]);
  }
  for (const [v, x, y, an] of vlist) {
    const iv = v[0] === me.veh ? inVeh : null;
    const isFly = iv ? iv.alt > 0.5 : !!(v[7] & 8);
    if (!isFly) drawVehicle(v, x, y, an, now, selfX, selfY, iv, isNightNow);
  }

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
      x = pred.x; y = pred.y; const w = worldMouse(); an = Math.atan2(w.y - y, w.x - x); pred.a = an;
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

  // Flying aircraft (helicopters, planes, seaplanes)
  for (const [v, x, y, an] of vlist) {
    const iv = v[0] === me.veh ? inVeh : null;
    const isFly = iv ? iv.alt > 0.5 : !!(v[7] & 8);
    if (isFly) drawVehicle(v, x, y, an, now, selfX, selfY, iv, isNightNow);
  }

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

  // Weather clouds & warnings (surface only)
  if (!isInterior) {
    for (const e of effects) {
      const [id, type, x, y, r, left] = e; if (!inView(x, y, r + 200)) continue;
      if (type === 'smoke' || type === 'toxic') {
        const spr = type === 'smoke' ? GLOW_SPR.smoke : GLOW_SPR.toxic;
        for (let k = 0; k < 6; k++) {
          const a2 = id + k * 0.95 + now / 4000, rr = r * 0.55 * hsh(id, k);
          const cx2 = x + Math.cos(a2) * rr, cy2 = y + Math.sin(a2) * rr, cr = r * (0.38 + 0.24 * hsh(k, id));
          ctx.drawImage(spr, cx2 - cr, cy2 - cr, cr * 2, cr * 2);
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
  }

  // Lighting & weather (screen space)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawLighting(b, a, u, now, selfX, selfY, inVeh, vlist);
  if (!isInterior) drawWeather(now, dt);
  drawHUD(now, selfX, selfY, inVeh, b);
}

// ───────── enterable building interiors and doorway rendering ─────────
function archGroup(s) {
  switch (s) {
    case 'house': case 'cottage': case 'manor': case 'apartment': case 'farmhouse': return 'residential';
    case 'hospital': return 'hospital';
    case 'police': return 'police';
    case 'fire': return 'fire';
    case 'bank': return 'bank';
    case 'shop': case 'mall': case 'hall': case 'gasstation': case 'club': case 'stall': return 'commercial';
    case 'science': case 'museum': case 'archive': case 'aquarium': case 'glass': return 'science_museum';
    case 'terminal': case 'hangar': return 'transit';
    case 'church': return 'church';
    case 'temple': case 'pyramid': case 'pagoda': return 'ancient_sacred';
    case 'mosque': case 'dome': return 'mosque';
    case 'palace': return 'palace';
    case 'capitol': case 'gov': case 'civic': case 'embassy': case 'intl': return 'government';
    case 'court': return 'courtroom';
    case 'campus': return 'campus';
    case 'post': return 'post';
    case 'keep': case 'fortwall': case 'tower': case 'checkpoint': case 'barn':
    case 'windmill': case 'watermill': case 'silo': case 'dam': return 'fort_rural';
    default: return 'office';
  }
}

function drawInteriorPropDesk(x, y, w, h, monitorCol) {
  ctx.fillStyle = '#452b1e'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#78472a'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
  if (monitorCol) {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(x + w * 0.25, y + 3, w * 0.5, 5);
    ctx.fillStyle = monitorCol; ctx.fillRect(x + w * 0.28, y + 4, w * 0.44, 3);
  }
}

function drawInteriorBed(x, y, w, h, sheetCol, pillowCol, isMed) {
  ctx.fillStyle = isMed ? '#cbd5e1' : '#5c3a21'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = isMed ? '#64748b' : '#3b2312'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = sheetCol; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = pillowCol; ctx.fillRect(x + 4, y + 4, Math.min(10, w * 0.35), h - 8);
  if (isMed) {
    ctx.fillStyle = '#ef4444'; ctx.fillRect(x + w * 0.55, y + h / 2 - 3, 6, 6);
  }
}

function drawStyledBuildingInterior(r, s, st, now) {
  const [x, y, w, h] = r;
  const grp = archGroup(s);
  const cx = x + w / 2, cy = y + h / 2;
  const th = 14;
  const isLarge = w > 180 || h > 180;
  const doorW = Math.min(w * 0.55, isLarge ? 104 : 72);
  const doorX0 = cx - doorW / 2, doorX1 = doorX0 + doorW;

  ctx.save();
  // 1. Style-matched interior floor base & rich surface materials
  if (grp === 'residential' || grp === 'office' || grp === 'post' || grp === 'campus' || grp === 'courtroom') {
    const floorBg = grp === 'residential' ? (s === 'manor' ? '#4a2b18' : '#422c1f')
      : grp === 'campus' ? '#362619'
      : grp === 'courtroom' ? '#3a281c'
      : grp === 'post' ? '#242b38'
      : '#1e2533';
    ctx.fillStyle = floorBg;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = (grp === 'residential' || grp === 'campus' || grp === 'courtroom') ? 'rgba(20,10,4,0.42)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fy = y + 14; fy < y + h - 8; fy += 10) { ctx.moveTo(x + 6, fy); ctx.lineTo(x + w - 6, fy); }
    ctx.stroke();
    if (grp === 'residential' && w > 110 && h > 100) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + w - 66, y + th, 66 - th, 44);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let ty = y + th; ty < y + th + 40; ty += 12) for (let tx2 = x + w - 64; tx2 < x + w - th - 6; tx2 += 12) {
        if (((tx2 + ty) % 24) < 12) ctx.fillRect(tx2, ty, 6, 6);
      }
      ctx.fillStyle = s === 'manor' ? 'rgba(127,29,29,0.72)' : 'rgba(153, 27, 27, 0.55)';
      ctx.fillRect(x + w * 0.14, y + h * 0.45, w * 0.38, h * 0.30);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x + w * 0.14 + 3, y + h * 0.45 + 3, w * 0.38 - 6, h * 0.30 - 6);
    }
    if (grp === 'office' && w > 110) {
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      ctx.fillRect(x + th + 4, y + th + 4, w - th * 2 - 8, h - th * 2 - 8);
      ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(x + 24, y + h - 26, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(x + 24, y + h - 26, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x + 23, y + h - 27, 3, 0, 7); ctx.fill();
    }
    if (grp === 'courtroom') {
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(cx - Math.min(20, w * 0.12), y + 48, Math.min(40, w * 0.24), h - 62);
    }
  } else if (grp === 'hospital' || grp === 'science_museum') {
    const smBg = s === 'aquarium' ? '#0b2236'
      : s === 'glass' ? '#133126'
      : s === 'archive' ? '#32251b'
      : s === 'museum' ? '#ded5c5'
      : grp === 'hospital' ? '#dce8ee'
      : '#1b2635';
    ctx.fillStyle = smBg;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = grp === 'hospital' ? 'rgba(15,118,110,0.16)'
      : s === 'glass' ? 'rgba(74,222,128,0.14)'
      : s === 'museum' ? 'rgba(15,23,42,0.1)'
      : s === 'archive' ? 'rgba(217,119,6,0.12)'
      : 'rgba(56,189,248,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fx = x + 20; fx < x + w - 10; fx += 18) { ctx.moveTo(fx, y + 6); ctx.lineTo(fx, y + h - 6); }
    for (let fy = y + 20; fy < y + h - 10; fy += 18) { ctx.moveTo(x + 6, fy); ctx.lineTo(x + w - 6, fy); }
    ctx.stroke();
    if (grp === 'hospital') {
      ctx.fillStyle = 'rgba(239,68,68,0.24)'; ctx.fillRect(cx - 5, y + 16, 10, h - 30);
      ctx.fillStyle = 'rgba(13,148,136,0.12)'; ctx.fillRect(x + th, cy - 4, w - th * 2, 8);
    }
  } else if (grp === 'bank' || grp === 'church' || grp === 'ancient_sacred' || grp === 'mosque' || grp === 'palace' || grp === 'government') {
    const stoneBg = grp === 'ancient_sacred' ? (s === 'pagoda' ? '#3d1c17' : '#5c4b2b')
      : grp === 'church' ? '#2c2926'
      : grp === 'mosque' ? '#e5dec9'
      : '#d6ccb6';
    ctx.fillStyle = stoneBg;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = (grp === 'ancient_sacred' || grp === 'church') ? 'rgba(0,0,0,0.15)' : 'rgba(15,23,42,0.09)';
    for (let fy = y + 12; fy < y + h - 16; fy += 20) {
      for (let fx = x + 12; fx < x + w - 16; fx += 20) {
        if (((fx + fy) % 40) < 20) ctx.fillRect(fx, fy, 10, 10);
      }
    }
    if (grp === 'mosque') {
      ctx.fillStyle = '#065f46';
      ctx.fillRect(x + th + 6, y + th + 8, w - th * 2 - 12, h - th * 2 - 16);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.6;
      ctx.strokeRect(x + th + 9, y + th + 11, w - th * 2 - 18, h - th * 2 - 22);
    } else if (grp === 'government') {
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(28, Math.min(w, h) * 0.24), 0, 7); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
    } else if (grp !== 'ancient_sacred') {
      ctx.fillStyle = grp === 'bank' ? '#7f1d1d' : grp === 'palace' ? '#991b1b' : '#7f1d1d';
      ctx.fillRect(cx - Math.min(22, w * 0.14), y + 22, Math.min(44, w * 0.28), h - 36);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - Math.min(22, w * 0.14) + 2, y + 24, Math.min(44, w * 0.28) - 4, h - 40);
    }
  } else if (grp === 'fire') {
    ctx.fillStyle = '#242930'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(220,38,38,0.22)'; ctx.fillRect(x + 18, y + 18, w - 36, h - 36);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.strokeRect(x + 22, y + 22, w - 44, h - 44); ctx.setLineDash([]);
  } else if (grp === 'police') {
    ctx.fillStyle = '#182232'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(59,130,246,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fx = x + 20; fx < x + w - 10; fx += 20) { ctx.moveTo(fx, y + 6); ctx.lineTo(fx, y + h - 6); }
    for (let fy = y + 20; fy < y + h - 10; fy += 20) { ctx.moveTo(x + 6, fy); ctx.lineTo(x + w - 6, fy); }
    ctx.stroke();
  } else if (grp === 'transit') {
    ctx.fillStyle = s === 'hangar' ? '#232830' : '#172333';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    if (s === 'hangar') {
      ctx.strokeStyle = 'rgba(250,204,21,0.48)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.strokeRect(x + 20, y + 20, w - 40, h - 40); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = 'rgba(56,189,248,0.09)';
      for (let fy = y + 16; fy < y + h - 16; fy += 22) ctx.fillRect(x + 12, fy, w - 24, 9);
      ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(cx, y + 18); ctx.lineTo(cx, y + h - 18); ctx.stroke();
      ctx.setLineDash([]);
    }
  } else {
    ctx.fillStyle = (s === 'barn' || s === 'watermill' || s === 'windmill') ? '#3b281a'
      : s === 'club' ? '#160d24'
      : s === 'stall' ? '#342419'
      : s === 'gasstation' ? '#202631'
      : '#1b2029';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = s === 'club' ? 'rgba(236,72,153,0.09)' : s === 'gasstation' ? 'rgba(250,204,21,0.1)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fx = x + 20; fx < x + w - 10; fx += 20) { ctx.moveTo(fx, y + 6); ctx.lineTo(fx, y + h - 6); }
    for (let fy = y + 20; fy < y + h - 10; fy += 20) { ctx.moveTo(x + 6, fy); ctx.lineTo(x + w - 6, fy); }
    ctx.stroke();
  }

  // 2. Interior architectural half-partitions, cast wall shadows & doorway arches
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(x + th, y + th, w - th * 2, 7);
  ctx.fillRect(x + th, y + th + 7, 7, h - th * 2 - 7);
  const midX = x + Math.floor(w * 0.5), midY = y + Math.floor(h * 0.48);
  if (w > 135 && h > 120) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    const nStub = Math.max(18, Math.floor(h * 0.24));
    ctx.fillRect(midX - 3, y + th, 6, nStub);
    ctx.fillRect(x + th, midY - 3, Math.floor(w * 0.26), 6);
    ctx.fillRect(x + w - th - Math.floor(w * 0.26), midY - 3, Math.floor(w * 0.26), 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(midX - 5, y + th + nStub - 3, 10, 4);
    ctx.fillRect(x + th + Math.floor(w * 0.26) - 2, midY - 5, 4, 10);
    ctx.fillRect(x + w - th - Math.floor(w * 0.26) - 2, midY - 5, 4, 10);
  }

  // 3. Bespoke Furnishing & Props per Building Archetype
  switch (grp) {
    case 'residential': {
      // Bedroom (NW): bed + nightstand + glowing bedside lamp + wardrobe
      drawInteriorBed(x + 18, y + 18, 32, 21, '#3b82f6', '#f8fafc', false);
      ctx.fillStyle = '#78350f'; ctx.fillRect(x + 53, y + 18, 10, 10);
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(x + 58, y + 23, 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#451a03'; ctx.fillRect(x + 18, y + 43, 22, 7);
      // Kitchen (NE): marble counter, 4-burner stove, twin steel sink, fridge
      if (w > 105) {
        ctx.fillStyle = '#64748b'; ctx.fillRect(x + w - 64, y + 16, 46, 15);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + w - 61, y + 18, 13, 11);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(x + w - 59, y + 20, 3, 3); ctx.fillRect(x + w - 53, y + 20, 3, 3);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(x + w - 45, y + 19, 13, 9);
        ctx.fillStyle = '#475569'; ctx.fillRect(x + w - 41, y + 21, 5, 5);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x + w - 29, y + 16, 12, 15);
      }
      // Living Area (SW): plush sofa + throw pillows + coffee table + TV console
      if (h > 105) {
        ctx.fillStyle = '#7c2d12'; ctx.fillRect(x + 18, y + h - 58, 42, 14);
        ctx.fillStyle = '#ea580c'; ctx.fillRect(x + 21, y + h - 54, 15, 8); ctx.fillRect(x + 41, y + h - 54, 15, 8);
        ctx.fillStyle = '#451a03'; ctx.fillRect(x + 24, y + h - 40, 26, 9);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(x + 33, y + h - 38, 8, 5);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 22, y + h - 26, 30, 5);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 24, y + h - 25, 26, 2);
      }
      // Dining Table, Plates & Chairs (SE)
      if (w > 120 && h > 110) {
        ctx.fillStyle = '#78350f'; ctx.fillRect(x + w - 60, y + h - 56, 32, 20);
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.strokeRect(x + w - 60, y + h - 56, 32, 20);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(x + w - 50, y + h - 46, 3, 0, 7); ctx.arc(x + w - 38, y + h - 46, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#a16207';
        ctx.fillRect(x + w - 54, y + h - 61, 7, 4); ctx.fillRect(x + w - 41, y + h - 61, 7, 4);
        ctx.fillRect(x + w - 54, y + h - 35, 7, 4); ctx.fillRect(x + w - 41, y + h - 35, 7, 4);
      }
      if (isLarge) {
        ctx.fillStyle = 'rgba(180, 83, 9, 0.38)';
        ctx.fillRect(cx - 34, cy - 22, 68, 44);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 30, cy - 18, 60, 36);
        ctx.fillStyle = '#451a03'; ctx.fillRect(cx - 18, cy - 9, 36, 18);
        ctx.fillStyle = '#fde68a'; ctx.fillRect(cx - 6, cy - 4, 12, 8);
        // Corner Potted Fern
        ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(x + 24, cy, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x + 24, cy, 3, 0, 7); ctx.fill();
      }
      break;
    }
    case 'hospital': {
      drawInteriorBed(x + 18, y + 18, 34, 18, '#bae6fd', '#ffffff', true);
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(x + 56, y + 22, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 53, y + 28, 12, 9);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(x + 55, y + 31, 8, 2);
      if (w > 130) {
        drawInteriorBed(x + w - 54, y + 18, 34, 18, '#bae6fd', '#ffffff', true);
        ctx.strokeStyle = 'rgba(14,165,233,0.5)'; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(x + w - 62, y + 16); ctx.lineTo(x + w - 62, y + 48); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (h > 120) drawInteriorBed(x + 18, y + h - 56, 34, 18, '#d1fae5', '#ffffff', true);
      drawInteriorPropDesk(x + w - 64, y + h - 48, 44, 14, '#10b981');
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(x + 18, y + 44, 22, 9);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 27, y + 45, 4, 7);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(cx - 4, y + 20, 8, 20); ctx.fillRect(cx - 10, y + 26, 20, 8);
      if (isLarge) {
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(cx - 30, cy - 18, 60, 36);
        ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 30, cy - 18, 60, 36);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(cx - 22, cy - 12, 16, 8); ctx.fillRect(cx + 6, cy - 12, 16, 8);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(cx - 20, cy - 10, 12, 4); ctx.fillRect(cx + 8, cy - 10, 12, 4);
        if (w > 220) {
          drawInteriorBed(cx - 76, cy - 12, 34, 18, '#bae6fd', '#ffffff', true);
          drawInteriorBed(cx + 42, cy - 12, 34, 18, '#bae6fd', '#ffffff', true);
        }
      }
      break;
    }
    case 'police': {
      drawInteriorPropDesk(x + 18, y + 18, 46, 14, '#38bdf8');
      if (w > 120) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + w - 64, y + 16, 46, 36);
        ctx.fillStyle = '#475569'; ctx.fillRect(x + w - 60, y + 20, 22, 10);
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x + w - 26, y + 26, 3.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.strokeRect(x + w - 64, y + 16, 46, 36);
        for (let bx = x + w - 56; bx < x + w - 20; bx += 8) {
          ctx.beginPath(); ctx.moveTo(bx, y + 16); ctx.lineTo(bx, y + 52); ctx.stroke();
        }
      }
      if (h > 110) {
        ctx.fillStyle = '#475569'; ctx.fillRect(x + 20, y + h - 48, 34, 15);
        ctx.fillStyle = '#fde047'; ctx.fillRect(x + 24, y + h - 45, 9, 6);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 37, y + h - 45, 11, 6);
      }
      ctx.fillStyle = '#334155'; ctx.fillRect(x + w - 56, y + h - 48, 38, 16);
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1; ctx.strokeRect(x + w - 56, y + h - 48, 38, 16);
      ctx.fillStyle = '#94a3b8';
      for (let rx = x + w - 51; rx < x + w - 22; rx += 7) ctx.fillRect(rx, y + h - 45, 3, 10);
      if (isLarge) {
        drawInteriorPropDesk(cx - 28, cy - 12, 56, 24, '#38bdf8');
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath(); ctx.arc(cx - 34, cy, 4.5, 0, 7); ctx.arc(cx + 34, cy, 4.5, 0, 7); ctx.fill();
      }
      break;
    }
    case 'fire': {
      ctx.fillStyle = '#991b1b'; ctx.fillRect(x + 18, y + 18, 50, 12);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 22, y + 21, 8, 6); ctx.fillRect(x + 36, y + 21, 8, 6); ctx.fillRect(x + 50, y + 21, 8, 6);
      // Fireman brass pole with yellow safety collar
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(x + w - 34, y + 32, 7.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.stroke();
      // Coiled hose drum + workbench
      ctx.fillStyle = '#334155'; ctx.fillRect(x + 18, y + h - 48, 36, 12);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + w - 34, y + h - 40, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1.5; ctx.stroke();
      if (isLarge) {
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(cx - 30, cy - 16, 60, 32);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 30, cy - 16, 60, 32);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(cx - 22, cy - 10, 16, 20);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(cx + 4, cy - 8, 18, 14);
      }
      break;
    }
    case 'bank': {
      // Steel spoked circular vault door
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cx, y + 32, 19, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 10, y + 32); ctx.lineTo(cx + 10, y + 32); ctx.moveTo(cx, y + 22); ctx.lineTo(cx, y + 42); ctx.stroke();
      // Gold bullion bars
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(x + 20, y + 20, 22, 12); ctx.fillRect(x + w - 42, y + 20, 22, 12);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x + 22, y + 22, 8, 8); ctx.fillRect(x + 32, y + 22, 8, 8);
      ctx.fillRect(x + w - 40, y + 22, 8, 8); ctx.fillRect(x + w - 30, y + 22, 8, 8);
      drawInteriorPropDesk(x + 20, y + h - 52, Math.min(54, w * 0.25), 12, '#fbbf24');
      drawInteriorPropDesk(x + w - 74, y + h - 52, Math.min(54, w * 0.25), 12, '#fbbf24');
      ctx.fillStyle = 'rgba(125,211,252,0.6)';
      ctx.fillRect(x + 20, y + h - 55, Math.min(54, w * 0.25), 2.5);
      ctx.fillRect(x + w - 74, y + h - 55, Math.min(54, w * 0.25), 2.5);
      if (isLarge) {
        for (const px of [cx - 48, cx + 48]) {
          ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(px, cy, 8, 0, 7); ctx.fill();
          ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 32, cy + 20); ctx.lineTo(cx + 32, cy + 20); ctx.stroke();
      }
      break;
    }
    case 'commercial': {
      if (s === 'club') {
        // Bottle-lined Bar + Stools + Pool Table + DJ Deck + Disco Dance Floor
        ctx.fillStyle = '#451a03'; ctx.fillRect(x + 20, y + 20, 62, 14);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 26, y + 23, 14, 7);
        ctx.fillStyle = '#f472b6'; ctx.fillRect(x + 44, y + 23, 12, 7);
        ctx.fillStyle = '#a16207';
        for (let sx2 = x + 26; sx2 < x + 76; sx2 += 14) { ctx.beginPath(); ctx.arc(sx2, y + 39, 3.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#7e22ce'; ctx.beginPath(); ctx.arc(x + w - 36, y + 36, 17, 0, 7); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x + w - 41, y + 36, 4.5, 0, 7); ctx.arc(x + w - 31, y + 36, 4.5, 0, 7); ctx.fill();
        // Green felt pool table
        ctx.fillStyle = '#15803d'; ctx.fillRect(x + 22, y + h - 56, 40, 22);
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 22, y + h - 56, 40, 22);
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(x + 34, y + h - 45, 2, 0, 7); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + 48, y + h - 45, 2, 0, 7); ctx.fill();
        if (isLarge) {
          ctx.fillStyle = `rgba(168,85,247,${0.25 + 0.16 * Math.sin(now / 180)})`;
          ctx.fillRect(cx - 38, cy - 26, 76, 52);
          ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.strokeRect(cx - 38, cy - 26, 76, 52);
          ctx.fillStyle = `rgba(56,189,248,${0.25 + 0.16 * Math.cos(now / 160)})`;
          ctx.fillRect(cx - 24, cy - 16, 20, 16); ctx.fillRect(cx + 4, cy, 20, 16);
        }
      } else if (s === 'gasstation') {
        // Fuel-Mart Counter, Glowing Beverage Coolers, Motor Oil & Snack Displays
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 18, y + 18, w - 36, 18);
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 18, y + 18, w - 36, 18);
        for (let cx2 = x + 24; cx2 < x + w - 28; cx2 += 20) {
          ctx.fillStyle = cx2 % 40 === 0 ? '#38bdf8' : '#4ade80'; ctx.fillRect(cx2, y + 21, 14, 12);
        }
        drawInteriorPropDesk(x + 18, y + h - 46, Math.min(54, w * 0.35), 14, '#fbbf24');
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + w - 28, y + h - 38, 6.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x + w - 43, y + h - 38, 6.5, 0, 7); ctx.fill();
        if (isLarge) {
          ctx.fillStyle = '#334155'; ctx.fillRect(cx - 28, cy - 12, 56, 24);
          ctx.fillStyle = '#facc15'; ctx.fillRect(cx - 22, cy - 7, 18, 14);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 4, cy - 7, 18, 14);
        }
      } else if (s === 'stall') {
        // Colorful Bazaar Spice Bowls, Woven Rugs & Lantern Stalls
        const spCols = ['#dc2626', '#f59e0b', '#22c55e', '#c084fc'];
        for (let i = 0, sx = x + 20; sx < x + w - 28; sx += 26, i++) {
          ctx.fillStyle = '#78350f'; ctx.fillRect(sx, y + 20, 20, 32);
          ctx.fillStyle = spCols[i % spCols.length];
          ctx.beginPath(); ctx.arc(sx + 10, y + 30, 5.5, 0, 7); ctx.fill();
          ctx.fillStyle = spCols[(i + 2) % spCols.length];
          ctx.beginPath(); ctx.arc(sx + 10, y + 43, 5.5, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#991b1b'; ctx.fillRect(cx - 22, cy - 12, 44, 24);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.4; ctx.strokeRect(cx - 22, cy - 12, 44, 24);
      } else if (s === 'hall') {
        // Exhibition & Convention Hall Stage, Podium & Seating Rows
        ctx.fillStyle = '#78350f'; ctx.fillRect(cx - Math.min(48, w * 0.28), y + 18, Math.min(96, w * 0.56), 20);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 7, y + 23, 14, 10);
        for (let py = y + 56; py < y + h - 42; py += 18) {
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(x + 22, py, Math.max(20, w * 0.25), 7);
          ctx.fillRect(x + w - 22 - Math.max(20, w * 0.25), py, Math.max(20, w * 0.25), 7);
        }
      } else {
        // Supermarket/Shop color-coded shelving + Checkout Conveyor Belts
        for (let sx = x + 20; sx < x + w - 32; sx += 34) {
          ctx.fillStyle = '#334155'; ctx.fillRect(sx, y + 20, 22, 36);
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(sx + 3, y + 24, 7, 9);
          ctx.fillStyle = '#38bdf8'; ctx.fillRect(sx + 12, y + 24, 7, 9);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(sx + 3, y + 36, 7, 9);
          ctx.fillStyle = '#4ade80'; ctx.fillRect(sx + 12, y + 36, 7, 9);
        }
        drawInteriorPropDesk(x + 18, y + h - 44, 42, 13, '#4ade80');
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 22, y + h - 41, 18, 6);
        if (w > 130) {
          drawInteriorPropDesk(x + w - 60, y + h - 44, 42, 13, '#4ade80');
          ctx.fillStyle = '#0f172a'; ctx.fillRect(x + w - 56, y + h - 41, 18, 6);
        }
        if (isLarge) {
          for (let rx = cx - 48; rx <= cx + 28; rx += 38) {
            ctx.fillStyle = '#334155'; ctx.fillRect(rx, cy - 18, 22, 40);
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(rx + 3, cy - 14, 16, 10);
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(rx + 3, cy + 4, 16, 10);
          }
        }
      }
      break;
    }
    case 'science_museum': {
      if (s === 'aquarium') {
        ctx.fillStyle = '#0284c7'; ctx.fillRect(x + 20, y + 20, w - 40, 34);
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(x + 20, y + 20, w - 40, 34);
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(x + 34, y + 48, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.fillRect(x + w - 42, y + 32, 4, 20); ctx.fillRect(x + w - 34, y + 36, 4, 16);
        for (let f = 0; f < 5; f++) {
          const fx = x + 30 + ((now * 0.04 + f * 35) % Math.max(20, w - 65));
          ctx.fillStyle = f % 2 === 0 ? '#fde047' : '#f472b6';
          ctx.beginPath(); ctx.ellipse(fx, y + 28 + (f % 3) * 8, 5, 2.5, 0, 0, 7); ctx.fill();
        }
        if (isLarge) {
          ctx.fillStyle = '#0369a1'; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 7); ctx.fill();
          ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.stroke();
        }
      } else if (s === 'glass') {
        // Botanical Conservatory: Raised Orchid & Fern Planter Beds + Koi Pond
        for (const [bx, by] of [[x + 20, y + 20], [x + w - 60, y + 20], [x + 20, y + h - 54]]) {
          ctx.fillStyle = '#78350f'; ctx.fillRect(bx, by, 40, 22);
          ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(bx + 12, by + 11, 7, 0, 7); ctx.arc(bx + 28, by + 11, 7, 0, 7); ctx.fill();
          ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(bx + 12, by + 11, 2.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(bx + 28, by + 11, 2.5, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.ellipse(cx, cy, 24, 15, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(cx - 6, cy, 3, 0, 7); ctx.fill();
      } else if (s === 'archive') {
        // National Archive: Mahogany Bookstacks + Green Bankers Lamp Reading Tables
        const bCols = ['#dc2626', '#2563eb', '#16a34a', '#d97706'];
        for (let sx = x + 22, bi = 0; sx < x + w - 34; sx += 30, bi++) {
          ctx.fillStyle = '#5c2d0c'; ctx.fillRect(sx, y + 20, 14, 38);
          ctx.fillStyle = bCols[bi % bCols.length]; ctx.fillRect(sx + 2, y + 23, 10, 14);
          ctx.fillStyle = bCols[(bi + 1) % bCols.length]; ctx.fillRect(sx + 2, y + 40, 10, 14);
        }
        drawInteriorPropDesk(cx - 24, cy - 8, 48, 16, '#22c55e');
      } else if (s === 'museum') {
        // Fine Art Gallery: Gilded Paintings + Fossil/Sculpture Plinth
        ctx.fillStyle = '#854d0e'; ctx.fillRect(x + 22, y + 20, 26, 10); ctx.fillRect(x + w - 48, y + 20, 26, 10);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 25, y + 22, 20, 6);
        ctx.fillStyle = '#f472b6'; ctx.fillRect(x + w - 45, y + 22, 20, 6);
        ctx.fillStyle = '#e7e5e4'; ctx.fillRect(cx - 22, cy - 14, 44, 28);
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 26, cy - 18, 52, 36);
        ctx.fillStyle = '#78716c'; ctx.fillRect(cx - 12, cy - 4, 24, 8);
      } else {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 22, y + 22, 28, 28);
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 22, y + 22, 28, 28);
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(x + 36, y + 36, 7.5, 0, 7); ctx.fill();
        if (w > 120) {
          ctx.fillStyle = '#0f172a'; ctx.fillRect(x + w - 50, y + 22, 28, 28);
          ctx.strokeStyle = '#4ade80'; ctx.strokeRect(x + w - 50, y + 22, 28, 28);
          ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x + w - 36, y + 36, 7.5, 0, 7); ctx.fill();
        }
        if (isLarge) {
          ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill();
          ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx, cy, 9 + Math.sin(now / 300) * 2.5, 0, 7); ctx.fill();
        }
      }
      break;
    }
    case 'transit': {
      if (s === 'hangar') {
        // Aircraft Hangar: Tool chests, fuel drums & parked plane silhouette
        ctx.fillStyle = '#dc2626'; ctx.fillRect(x + 20, y + 20, 28, 12);
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x + w - 30, y + 28, 7, 0, 7); ctx.arc(x + w - 48, y + 28, 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22); ctx.lineTo(cx + 34, cy + 8); ctx.lineTo(cx + 34, cy + 16);
        ctx.lineTo(cx + 6, cy + 8); ctx.lineTo(cx + 6, cy + 22); ctx.lineTo(cx - 6, cy + 22);
        ctx.lineTo(cx - 6, cy + 8); ctx.lineTo(cx - 34, cy + 16); ctx.lineTo(cx - 34, cy + 8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx, cy - 10, 4, 0, 7); ctx.fill();
      } else {
        drawInteriorPropDesk(x + 20, y + 20, Math.min(64, w * 0.3), 14, '#38bdf8');
        if (w > 140) {
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 8; ctx.strokeRect(x + w - 76, y + 24, 52, 24);
          ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + w - 72, y + 22, 10, 6);
          ctx.fillStyle = '#0284c7'; ctx.fillRect(x + w - 42, y + 42, 10, 6);
        }
        for (let gy = y + 66; gy < y + h - 46; gy += 22) {
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(x + 22, gy, Math.min(48, w * 0.24), 9);
          ctx.fillRect(x + w - 22 - Math.min(48, w * 0.24), gy, Math.min(48, w * 0.24), 9);
        }
        if (isLarge) {
          ctx.fillStyle = '#020617'; ctx.fillRect(cx - 34, y + 18, 68, 15);
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 34, y + 18, 68, 15);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(cx - 28, y + 23, 18, 4);
          ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 4, y + 23, 28, 4);
        }
      }
      break;
    }
    case 'church': {
      ctx.fillStyle = '#78350f';
      for (let py = y + 54; py < y + h - 42; py += 19) {
        ctx.fillRect(x + 20, py, Math.max(18, w * 0.24), 7);
        ctx.fillRect(x + w - 20 - Math.max(18, w * 0.24), py, Math.max(18, w * 0.24), 7);
      }
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(cx - 18, y + 18, 36, 14);
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 18, y + 18, 36, 14);
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(cx - 12, y + 25, 2.5, 0, 7); ctx.arc(cx + 12, y + 25, 2.5, 0, 7); ctx.fill();
      if (isLarge) {
        for (const [px, py] of [[cx - 42, cy - 20], [cx + 42, cy - 20], [cx - 42, cy + 28], [cx + 42, cy + 28]]) {
          ctx.fillStyle = '#e7e5e4'; ctx.beginPath(); ctx.arc(px, py, 6.5, 0, 7); ctx.fill();
          ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      break;
    }
    case 'ancient_sacred': {
      // Sandstone Pillars, Glowing Braziers & Golden Sarcophagus / Relic Altar
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(cx - 20, cy - 10, 40, 20);
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.6; ctx.strokeRect(cx - 20, cy - 10, 40, 20);
      for (const [bx, by] of [[x + 26, y + 26], [x + w - 26, y + 26], [x + 26, y + h - 40], [x + w - 26, y + h - 40]]) {
        ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(bx, by, 4 + Math.sin(now / 120 + bx), 0, 7); ctx.fill();
      }
      break;
    }
    case 'mosque': {
      // Mihrab Niche (North), Geometric Carpet Border & Ablution Fountain
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 16, y + 18, 32, 10);
      ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
      for (const [px, py] of [[x + 28, y + 28], [x + w - 28, y + 28], [x + 28, y + h - 42], [x + w - 28, y + h - 42]]) {
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
      }
      break;
    }
    case 'palace': {
      // Sovereign Throne Dais, Banquet Table & Gilded Columns
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(cx - 22, y + 18, 44, 16);
      ctx.fillStyle = '#991b1b'; ctx.fillRect(cx - 10, y + 20, 20, 12);
      ctx.fillStyle = '#5c2d0c'; ctx.fillRect(cx - 28, cy - 10, 56, 20);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(cx - 14, cy, 3, 0, 7); ctx.arc(cx, cy, 3, 0, 7); ctx.arc(cx + 14, cy, 3, 0, 7); ctx.fill();
      break;
    }
    case 'government': {
      // Legislative Rostrum + Curved Assembly Desks + Flags
      ctx.fillStyle = '#5c2d0c'; ctx.fillRect(cx - 26, y + 18, 52, 14);
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x + 24, y + 24, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x + w - 24, y + 24, 5, 0, 7); ctx.fill();
      for (let gy = y + 54; gy < y + h - 40; gy += 22) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 20, gy, Math.max(18, w * 0.25), 9);
        ctx.fillRect(x + w - 20 - Math.max(18, w * 0.25), gy, Math.max(18, w * 0.25), 9);
      }
      break;
    }
    case 'courtroom': {
      // Elevated Judge Bench + Witness Stand + Jury & Counsel Tables
      ctx.fillStyle = '#5c2d0c'; ctx.fillRect(cx - 32, y + 18, 64, 16);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 6, y + 24, 12, 5);
      ctx.fillStyle = '#451a03'; ctx.fillRect(x + 20, y + 48, 30, 14);
      ctx.fillRect(x + w - 50, y + 48, 30, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 18, y + 22, 14, 22);
      break;
    }
    case 'campus': {
      // Green Chalkboard, Professor Podium & Student Desks
      ctx.fillStyle = '#064e3b'; ctx.fillRect(cx - Math.min(40, w * 0.28), y + 16, Math.min(80, w * 0.56), 9);
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - Math.min(40, w * 0.28), y + 16, Math.min(80, w * 0.56), 9);
      ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 12, y + 29, 24, 10);
      for (let sy = y + 52; sy < y + h - 40; sy += 22) {
        for (let sx = x + 22; sx < x + w - 38; sx += 30) {
          ctx.fillStyle = '#5c2d0c'; ctx.fillRect(sx, sy, 20, 11);
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(sx + 5, sy + 3, 8, 5);
        }
      }
      break;
    }
    case 'post': {
      // P.O. Box Wall, Parcel Conveyor Belt & Sorting Bins
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(x + 20, y + 18, w - 40, 12);
      ctx.fillStyle = '#fbbf24';
      for (let px = x + 24; px < x + w - 26; px += 10) ctx.fillRect(px, y + 21, 6, 6);
      drawInteriorPropDesk(x + 20, y + h - 46, Math.min(54, w * 0.34), 13, '#fbbf24');
      ctx.fillStyle = '#2563eb'; ctx.fillRect(x + w - 46, y + 46, 26, 20);
      ctx.fillStyle = '#d97706'; ctx.fillRect(cx - 18, cy - 8, 36, 16);
      break;
    }
    case 'fort_rural': {
      ctx.fillStyle = (s === 'barn' || s === 'windmill' || s === 'watermill' || s === 'silo') ? '#ca8a04' : '#365314';
      ctx.fillRect(x + 18, y + 18, 30, 18); ctx.fillRect(x + w - 48, y + 18, 30, 18);
      ctx.strokeStyle = (s === 'barn' || s === 'windmill' || s === 'watermill' || s === 'silo') ? '#a16207' : '#84cc16'; ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 18, y + 18, 30, 18); ctx.strokeRect(x + w - 48, y + 18, 30, 18);
      if (h > 105) {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x + 18, y + h - 48, 38, 14);
        ctx.fillStyle = '#fb923c'; ctx.fillRect(x + 22, y + h - 45, 10, 6);
      }
      if (isLarge) {
        ctx.fillStyle = (s === 'barn' || s === 'windmill' || s === 'watermill' || s === 'silo') ? '#eab308' : '#334155';
        ctx.fillRect(cx - 24, cy - 14, 48, 28);
        ctx.strokeStyle = (s === 'barn' || s === 'windmill' || s === 'watermill' || s === 'silo') ? '#854d0e' : '#38bdf8'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 24, cy - 14, 48, 28);
      }
      break;
    }
    default: {
      drawInteriorPropDesk(x + 18, y + 18, 38, 12, '#38bdf8');
      if (w > 120) drawInteriorPropDesk(x + w - 56, y + 18, 38, 12, '#38bdf8');
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(x + w - 44, y + h - 46, 22, 16);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(x + 28, y + 48, 5, 0, 7); ctx.fill();
      if (isLarge) {
        ctx.fillStyle = '#334155'; ctx.fillRect(cx - 34, cy - 14, 68, 28);
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.strokeRect(cx - 34, cy - 14, 68, 28);
        ctx.fillStyle = '#0f172a';
        for (let cx2 = cx - 24; cx2 <= cx + 20; cx2 += 20) {
          ctx.fillRect(cx2, cy - 20, 8, 5); ctx.fillRect(cx2, cy + 15, 8, 5);
          ctx.fillStyle = '#38bdf8'; ctx.fillRect(cx2 + 1, cy - 9, 6, 4);
          ctx.fillStyle = '#0f172a';
        }
      }
      break;
    }
  }

  // 4. Solid 14px architectural perimeter walls with beveled trim & window glass insets
  ctx.fillStyle = st[1];
  ctx.fillRect(x, y, w, th);
  ctx.fillRect(x, y + th, th, h - th);
  ctx.fillRect(x + w - th, y + th, th, h - th);
  const leftW = Math.max(0, doorX0 - x);
  if (leftW > 0) {
    ctx.fillRect(x, y + h - th, leftW, th);
    ctx.fillRect(doorX1, y + h - th, leftW, th);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + th, y + th, w - th * 2, h - th * 2);
  ctx.fillStyle = '#7dd3fc';
  if (w > 96) {
    ctx.fillRect(x + w * 0.25, y + 4, 24, 5);
    ctx.fillRect(x + w * 0.75 - 24, y + 4, 24, 5);
  }
  if (h > 96) {
    ctx.fillRect(x + 4, cy - 12, 5, 24);
    ctx.fillRect(x + w - 9, cy - 12, 5, 24);
  }

  // Hinged open entrance double doors swung inward
  ctx.fillStyle = '#78350f';
  ctx.fillRect(doorX0, y + h - th - 16, 5, 18);
  ctx.fillRect(doorX1 - 5, y + h - th - 16, 5, 18);

  // 5. Warm ceiling light pool (pre-baked sprite, zero per-frame gradient)
  const lr = Math.max(w, h) * 0.62;
  ctx.beginPath(); ctx.rect(x + th, y + th, w - th * 2, h - th * 2); ctx.clip();
  ctx.drawImage(GLOW_SPR.warm, cx - lr, cy - lr, lr * 2, lr * 2);

  ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function drawBuildingInteriors(now, inView, selfX, selfY, vx0, vy0, vx1, vy1) {
  if (!M || !M.rects) return;
  const x0b = vx0 !== undefined ? vx0 : selfX - 950;
  const y0b = vy0 !== undefined ? vy0 : selfY - 950;
  const x1b = vx1 !== undefined ? vx1 : selfX + 950;
  const y1b = vy1 !== undefined ? vy1 : selfY + 950;
  const nearby = rectsIn(x0b, y0b, x1b, y1b);

  for (const idx of nearby) {
    const r = M.rects[idx];
    const [x, y, w, h, sIdx] = r;
    const s = M.styles[sIdx] || 'b';
    const st = STY[s] || STY.b;
    const cx = x + w / 2, cy = y + h / 2;

    // Animated exterior details for cylindrical / specialty structures even outside
    if (s === 'windmill' || s === 'watermill') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((now / (s === 'windmill' ? 950 : 600)) + idx);
      const bladeL = Math.min(w, h) * 0.68;
      ctx.strokeStyle = s === 'windmill' ? '#fef3c7' : '#78350f';
      ctx.lineWidth = s === 'windmill' ? 4 : 6;
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bladeL, 0); ctx.stroke();
        if (s === 'windmill') {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillRect(bladeL * 0.25, 1, bladeL * 0.72, 6);
        }
      }
      ctx.restore();
      continue;
    }

    if (w < 64 || h < 64) continue;
    const isInside = selfX >= x && selfX <= x + w && selfY >= y && selfY <= y + h;
    const distToCenter = Math.hypot(selfX - cx, selfY - cy);
    const isLarge = w > 180 || h > 180;
    const doorW = Math.min(w * 0.55, isLarge ? 104 : 72);
    const doorX0 = cx - doorW / 2;
    const distToDoor = Math.hypot(selfX - cx, selfY - (y + h));

    if (isInside || distToDoor < 95 || distToCenter < Math.max(w, h) * 0.62) {
      // Reveal rich architectural furnished interior
      drawStyledBuildingInterior(r, s, st, now);
    } else {
      // Keep the detailed architectural roof from drawRect visible and layer live animated details!
      if (s === 'police' || s === 'fire' || s === 'hospital') {
        const blink = (now % 500) < 250;
        ctx.save();
        ctx.fillStyle = s === 'police' ? (blink ? '#3b82f6' : '#ef4444') : (blink ? '#ef4444' : '#ffffff');
        ctx.beginPath(); ctx.arc(cx - 12, y + 10, 4, 0, 7); ctx.fill();
        ctx.fillStyle = s === 'police' ? (blink ? '#ef4444' : '#3b82f6') : (blink ? '#ffffff' : '#ef4444');
        ctx.beginPath(); ctx.arc(cx + 12, y + 10, 4, 0, 7); ctx.fill();
        ctx.restore();
      }
      if (w > 105 && h > 105 && (s === 'office' || s === 'apartment' || s === 'hospital' || s === 'shop' || s === 'mall')) {
        // Spinning rooftop HVAC fan blades
        ctx.save();
        ctx.translate(x + 34, y + 32);
        ctx.rotate(now / 140 + idx);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
        ctx.restore();
      }
    }

    const hasPortal = PORTAL_RECTS.has(idx);

    // Doorway threshold & prompt when near entrance
    if (!hasPortal && (distToDoor < 260 || isInside)) {
      ctx.save();
      ctx.fillStyle = '#14171d';
      ctx.fillRect(doorX0, y + h - 16, doorW, 20);

      const exitPhase = (now % 800) / 800;
      ctx.fillStyle = isInside ? 'rgba(77, 255, 136, 0.25)' : 'rgba(0, 229, 255, 0.25)';
      ctx.fillRect(doorX0 + 4, y + h - 5, doorW - 8, 9);
      ctx.strokeStyle = isInside ? '#4dff88' : '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(doorX0 + 4, y + h - 5, doorW - 8, 9);

      if (distToDoor < 140) {
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        const label = isInside ? '🚪 [EXIT TO WASTELAND]' : '🚪 [ENTER BUILDING]';
        const tw = txtW('bold 11px system-ui', label) + 18;
        ctx.fillStyle = 'rgba(8, 12, 18, 0.9)';
        ctx.fillRect(cx - tw / 2, y + h + 8, tw, 22);
        ctx.strokeStyle = isInside ? '#4dff88' : '#00e5ff'; ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - tw / 2, y + h + 8, tw, 22);
        ctx.fillStyle = isInside ? '#4dff88' : '#00e5ff';
        ctx.fillText(label, cx, y + h + 22);

        const arrowY = y + h - (isInside ? 4 : 12) + (isInside ? exitPhase * 8 : -exitPhase * 8);
        ctx.strokeStyle = isInside ? `rgba(77, 255, 136, ${1 - exitPhase})` : `rgba(0, 229, 255, ${1 - exitPhase})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (isInside) {
          ctx.moveTo(cx - 8, arrowY - 4); ctx.lineTo(cx, arrowY + 4); ctx.lineTo(cx + 8, arrowY - 4);
        } else {
          ctx.moveTo(cx - 8, arrowY + 4); ctx.lineTo(cx, arrowY - 4); ctx.lineTo(cx + 8, arrowY + 4);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ───────── draw 16 shelter plots in the world ─────────
function traceChamferRect(g, x, y, w, h, c) {
  g.beginPath();
  g.moveTo(x + c, y); g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c); g.lineTo(x, y + c);
  g.closePath();
}

function drawShelterPlots(now, inView, selfX, selfY) {
  for (const plot of shelterPlots) {
    const isOwner = me && me.plotId === plot.id;
    const teamColor = plot.team > 0 ? TEAMCOL[plot.team] : isOwner ? '#ffd166' : '#00e5ff';
    const upg = plot.upgrades || {};
    const lv = plot.level || 1;
    const S = computePlotSize(plot);
    const x0 = plot.x - S / 2, y0 = plot.y - S / 2;

    // ───────── 1. TOWERING SKY BEACON LIGHT BEAM ─────────
    if (Math.abs(plot.x - camX) < 1800 && Math.abs(plot.y - camY) < 2200) {
      ctx.fillStyle = isOwner ? 'rgba(255, 209, 102, 0.14)' : 'rgba(0, 229, 255, 0.12)';
      ctx.fillRect(plot.x - 28, plot.y - 2800, 56, 2800);
      ctx.fillStyle = isOwner ? 'rgba(255, 209, 102, 0.24)' : 'rgba(0, 229, 255, 0.2)';
      ctx.fillRect(plot.x - 10, plot.y - 2800, 20, 2800);

      for (let r = 0; r < 3; r++) {
        const rProg = ((now / 1400 + r * 0.33) % 1);
        const ringY = plot.y - rProg * 720;
        const ringW = 28 + rProg * 50;
        ctx.strokeStyle = isOwner ? `rgba(255, 209, 102, ${1 - rProg})` : `rgba(0, 229, 255, ${1 - rProg})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(plot.x, ringY, ringW, ringW * 0.32, 0, 0, 7);
        ctx.stroke();
      }
    }

    if (!inView(plot.x, plot.y, S * 1.4 + 280)) continue;

    // ───────── 2. EXPANDED SAFE HAVEN ZONE AURA ─────────
    const shRadius = S * 0.55;
    ctx.drawImage(GLOW_SPR.green, plot.x - shRadius - 15, plot.y - shRadius - 15, (shRadius + 15) * 2, (shRadius + 15) * 2);

    ctx.strokeStyle = `rgba(77, 255, 136, ${0.35 + 0.15 * Math.sin(now / 300)})`;
    ctx.lineWidth = 2; ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.arc(plot.x, plot.y, shRadius + 15, 0, 7); ctx.stroke();
    ctx.setLineDash([]);

    // ───────── 3. CHAMFERED OCTAGONAL REINFORCED FOUNDATION ─────────
    const cham = 28;
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    traceChamferRect(ctx, x0 + 10, y0 + 10, S, S, cham); ctx.fill();
    ctx.fillStyle = '#1b2029';
    traceChamferRect(ctx, x0 - 6, y0 - 6, S + 12, S + 12, cham + 4); ctx.fill();
    ctx.fillStyle = '#242b36';
    traceChamferRect(ctx, x0, y0, S, S, cham); ctx.fill();

    // Courtyard slab paving, drainage grates & tactical pathway lines
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1.5;
    for (let k = 40; k < S - 30; k += 40) {
      ctx.beginPath(); ctx.moveTo(x0 + k, y0 + 24); ctx.lineTo(x0 + k, y0 + S - 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + 24, y0 + k); ctx.lineTo(x0 + S - 24, y0 + k); ctx.stroke();
    }
    // Central tarmac driveway & helipad cross-aisle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(plot.x - 38, plot.y, 76, S / 2 - 14);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(plot.x, plot.y + 42); ctx.lineTo(plot.x, y0 + S - 22); ctx.stroke();
    ctx.setLineDash([]);

    // Glowing power conduits connecting stations to Core
    ctx.strokeStyle = lv >= 4 ? 'rgba(56,189,248,0.4)' : 'rgba(251,191,36,0.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + 68, y0 + 88); ctx.lineTo(plot.x, plot.y);
    ctx.moveTo(x0 + S - 68, y0 + 88); ctx.lineTo(plot.x, plot.y);
    ctx.moveTo(x0 + 76, y0 + S - 92); ctx.lineTo(plot.x, plot.y);
    ctx.moveTo(plot.x, plot.y - S * 0.28); ctx.lineTo(plot.x, plot.y);
    ctx.stroke();

    // ───────── 4. FORTIFIED SEGMENTED BASTION WALLS & AIRLOCK ─────────
    const T = 20;
    const gateW = 100;
    const gateX0 = plot.x - gateW / 2;
    const gateX1 = plot.x + gateW / 2;

    const isAuthorized = me && (me.id === plot.owner || (plot.team > 0 && me.team === plot.team) || settings.mode === 'coop' || !plot.owner);
    const distToGate = Math.hypot(selfX - plot.x, selfY - (y0 + S));
    const gateOpen = isAuthorized && distToGate < 140;

    const wallFill = lv >= 4 ? '#0f172a' : '#2d3748';
    const wallTrim = lv >= 4 ? '#38bdf8' : '#64748b';
    const drawWallSeg = (wx, wy, ww, wh, horiz) => {
      if (ww <= 0 || wh <= 0) return;
      ctx.fillStyle = wallFill; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(wx + 2, wy + 2, ww - 4, horiz ? 5 : wh - 4);
      ctx.strokeStyle = wallTrim; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, ww, wh);
      // Structural armor buttress ribs
      ctx.fillStyle = '#475569';
      if (horiz) {
        for (let rx = wx + 28; rx < wx + ww - 24; rx += 44) ctx.fillRect(rx - 3, wy - 2, 6, wh + 4);
      } else {
        for (let ry = wy + 28; ry < wy + wh - 24; ry += 44) ctx.fillRect(wx - 2, ry - 3, ww + 4, 6);
      }
    };

    drawWallSeg(x0, y0, S, T, true); // Top
    drawWallSeg(x0, y0, T, S, false); // Left
    drawWallSeg(x0 + S - T, y0, T, S, false); // Right
    drawWallSeg(x0, y0 + S - T, gateX0 - x0, T, true); // Bottom left
    drawWallSeg(gateX1, y0 + S - T, (x0 + S) - gateX1, T, true); // Bottom right

    if (upg.spikes) {
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      for (let px = x0 + 18; px < x0 + S - 18; px += 16) {
        ctx.beginPath(); ctx.moveTo(px, y0 - 7); ctx.lineTo(px + 6, y0 + 2); ctx.moveTo(px + 6, y0 - 7); ctx.lineTo(px, y0 + 2); ctx.stroke();
      }
    }

    // ───────── AIRLOCK BLAST GATE ─────────
    ctx.save();
    ctx.fillStyle = '#111827'; ctx.fillRect(gateX0 - 10, y0 + S - T - 8, 10, T + 16);
    ctx.fillStyle = '#111827'; ctx.fillRect(gateX1, y0 + S - T - 8, 10, T + 16);

    if (gateOpen) {
      const doorSlide = 38;
      ctx.fillStyle = '#475569';
      ctx.fillRect(gateX0 - doorSlide, y0 + S - T + 2, doorSlide, T - 4);
      ctx.fillRect(gateX1, y0 + S - T + 2, doorSlide, T - 4);

      const stepProg = (now % 600) / 600;
      ctx.fillStyle = 'rgba(77, 255, 136, 0.25)';
      ctx.fillRect(gateX0 + 4, y0 + S - T - 4, gateW - 8, T + 8);
      ctx.strokeStyle = '#4dff88'; ctx.lineWidth = 2;
      ctx.strokeRect(gateX0 + 4, y0 + S - T - 4, gateW - 8, T + 8);

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
      ctx.fillStyle = '#1e293b'; ctx.fillRect(gateX0, y0 + S - T, gateW, T);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.strokeRect(gateX0, y0 + S - T, gateW, T);

      for (let sx = gateX0 + 4; sx < gateX1 - 8; sx += 14) {
        ctx.fillStyle = sx % 28 === 4 ? '#ef4444' : '#0f172a';
        ctx.beginPath(); ctx.moveTo(sx, y0 + S - T); ctx.lineTo(sx + 8, y0 + S - T); ctx.lineTo(sx + 3, y0 + S); ctx.lineTo(sx - 5, y0 + S); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gateX0, y0 + S - T / 2); ctx.lineTo(gateX1, y0 + S - T / 2); ctx.stroke();

      ctx.fillStyle = (now % 600 < 300) ? '#ef4444' : '#7f1d1d';
      ctx.beginPath(); ctx.arc(gateX0 - 5, y0 + S - T / 2, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(gateX1 + 5, y0 + S - T / 2, 4, 0, 7); ctx.fill();

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

    // ───────── 5. FOUR OCTAGONAL CORNER BASTIONS & TURRETS ─────────
    const corners = [
      [x0 + 26, y0 + 26], [x0 + S - 26, y0 + 26],
      [x0 + 26, y0 + S - 26], [x0 + S - 26, y0 + S - 26]
    ];
    // Acquire nearest zombie targets for all 4 corner turrets in ONE single scan
    const cornerTargets = [null, null, null, null];
    const maxR = 750 * 750;
    if (latest && latest.Z && latest.Z.size > 0) {
      const plotMaxD2 = (S * 0.6 + 760) * (S * 0.6 + 760);
      const bestD = [maxR, maxR, maxR, maxR];
      for (const z of latest.Z.values()) {
        if (d2(plot.x, plot.y, z[2], z[3]) > plotMaxD2) continue;
        for (let i = 0; i < 4; i++) {
          const zd = d2(corners[i][0], corners[i][1], z[2], z[3]);
          if (zd < bestD[i]) { bestD[i] = zd; cornerTargets[i] = z; }
        }
      }
    }

    // Hardlight Kinetic Shield Dome (exterior aura)
    if (upg.hardlight_dome) {
      const shR = S * 0.56 + 18;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.06 + 0.03 * Math.sin(now / 260)})`;
      ctx.beginPath(); ctx.arc(plot.x, plot.y, shR, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(125, 211, 252, ${0.5 + 0.25 * Math.sin(now / 220)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(plot.x, plot.y, shR, 0, 7); ctx.stroke();
    }

    // Autonomous Proximity Minefield Perimeter Pips
    if (upg.minefield) {
      const nMines = Math.min(24, 6 + upg.minefield * 4);
      for (let m = 0; m < nMines; m++) {
        const ma = (m / nMines) * Math.PI * 2;
        const mx2 = plot.x + Math.cos(ma) * (S * 0.54 + 6);
        const my2 = plot.y + Math.sin(ma) * (S * 0.54 + 6);
        ctx.fillStyle = ((now + m * 140) % 900 < 220) ? '#ef4444' : '#475569';
        ctx.beginPath(); ctx.arc(mx2, my2, 3.2, 0, 7); ctx.fill();
      }
    }

    for (let i = 0; i < 4; i++) {
      const [cx, cy] = corners[i];
      // Elevated Armored Watchtower Grid deck & spotlight sweep
      if (upg.watchtower_grid) {
        ctx.fillStyle = '#0f172a';
        traceChamferRect(ctx, cx - 34, cy - 34, 68, 68, 10); ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
        if (upg.watchtower_grid >= 2) {
          const swAng = now / 950 + i * 1.57;
          ctx.fillStyle = 'rgba(253, 224, 71, 0.1)';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(swAng - 0.2) * 185, cy + Math.sin(swAng - 0.2) * 185);
          ctx.lineTo(cx + Math.cos(swAng + 0.2) * 185, cy + Math.sin(swAng + 0.2) * 185);
          ctx.closePath(); ctx.fill();
        }
      }

      // Octagonal turret plinth
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4 + Math.PI / 8;
        const px = cx + Math.cos(ang) * 28, py = cy + Math.sin(ang) * 28;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = teamColor; ctx.lineWidth = 2.5; ctx.stroke();

      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke();

      const nearestZ = cornerTargets[i];
      const aimAngle = nearestZ ? Math.atan2(nearestZ[3] - cy, nearestZ[2] - cx) : ((now / 1500 + i * 1.57) % 6.28);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(aimAngle);
      ctx.strokeStyle = upg.turret_laser ? 'rgba(56, 189, 248, 0.65)' : upg.turret_cryo ? 'rgba(186, 230, 253, 0.55)' : upg.turret_flame ? 'rgba(251, 146, 60, 0.55)' : 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(180, 0); ctx.stroke();

      ctx.fillStyle = '#334155'; ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(-10, -10, 20, 20);

      if (upg.turret_rocket) {
        ctx.fillStyle = '#166534'; ctx.fillRect(-8, -12, 18, 24);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(10, -8, 6, 4); ctx.fillRect(10, -2, 6, 4);
        ctx.fillRect(10, 4, 6, 4); ctx.fillRect(10, 10, 6, 4);
      } else if (upg.turret_laser) {
        ctx.fillStyle = '#0284c7'; ctx.fillRect(-4, -7, 28, 14);
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(24, 0, 5, 0, 7); ctx.fill();
      } else if (upg.turret_cryo) {
        ctx.fillStyle = '#0369a1'; ctx.fillRect(-8, -10, 16, 20);
        ctx.fillStyle = '#bae6fd'; ctx.fillRect(6, -5, 18, 10);
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(24, 0, 4, 0, 7); ctx.fill();
      } else if (upg.turret_flame) {
        ctx.fillStyle = '#991b1b'; ctx.fillRect(-10, -9, 14, 18);
        ctx.fillStyle = '#d97706'; ctx.fillRect(4, -4, 20, 8);
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(24, 0, 3.5, 0, 7); ctx.fill();
      } else if (upg.turret_sniper) {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-6, -6, 18, 12);
        ctx.fillStyle = '#64748b'; ctx.fillRect(10, -2, 26, 4);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(4, -8, 8, 3);
      } else if (upg.turret_mg) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, -6, 28, 5); ctx.fillRect(0, 1, 28, 5);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-8, -10, 6, 20);
      } else {
        ctx.fillStyle = '#475569'; ctx.fillRect(0, -4, 22, 3); ctx.fillRect(0, 1, 22, 3);
      }
      ctx.restore();
    }

    // ───────── 6. DETAILED COMPOUND SURFACE FACILITIES ─────────
    // Medical Triage Geodesic Dome (NW)
    const medCx = x0 + 66, medCy = y0 + 82;
    ctx.fillStyle = '#064e3b'; ctx.beginPath(); ctx.arc(medCx, medCy, 27, 0, 7); ctx.fill();
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(52,211,153,0.22)'; ctx.beginPath(); ctx.arc(medCx, medCy, 20, 0, 7); ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.fillRect(medCx - 4, medCy - 13, 8, 26); ctx.fillRect(medCx - 13, medCy - 4, 26, 8);

    // Armory Munitions Bunker (NE)
    const armX = x0 + S - 96, armY = y0 + 56;
    ctx.fillStyle = '#1e293b';
    traceChamferRect(ctx, armX, armY, 58, 52, 8); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.fillRect(armX + 6, armY + 6, 46, 16);
    ctx.fillStyle = '#365314'; ctx.fillRect(armX + 8, armY + 28, 16, 12); ctx.fillRect(armX + 28, armY + 28, 20, 12);
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 8.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ARMORY', armX + 29, armY + 15);

    // Vehicle Repair Lift Bay (SW)
    const vehPadX = x0 + 38, vehPadY = y0 + S - 122;
    ctx.fillStyle = '#11161f'; ctx.fillRect(vehPadX, vehPadY, 74, 58);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.8; ctx.setLineDash([7, 5]);
    ctx.strokeRect(vehPadX, vehPadY, 74, 58); ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(vehPadX + 10, vehPadY + 18, 6, 22); ctx.fillRect(vehPadX + 58, vehPadY + 18, 6, 22);
    ctx.fillStyle = '#475569'; ctx.fillRect(vehPadX + 16, vehPadY + 26, 42, 6);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(vehPadX + 6, vehPadY + 4, 18, 9);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 8.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('REPAIR LIFT', vehPadX + 37, vehPadY + 50);

    // ───────── 6.2 VISUAL TYCOON UPGRADE INSTALLATIONS ─────────
    // Photovoltaic Solar Array (East-Mid)
    if (upg.solar_array) {
      const sx = x0 + S - 102, sy = plot.y - 26;
      const rows = Math.min(3, Math.ceil(upg.solar_array / 2));
      for (let r = 0; r < rows; r++) {
        const py = sy + r * 20;
        ctx.fillStyle = '#0f172a'; ctx.fillRect(sx, py, 64, 15);
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(sx + 2, py + 2, 60, 11);
        ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, py + 2, 60, 11);
        for (let gx = sx + 14; gx < sx + 60; gx += 12) {
          ctx.beginPath(); ctx.moveTo(gx, py + 2); ctx.lineTo(gx, py + 13); ctx.stroke();
        }
      }
    }

    // Twin Aero-Wind Generator Turbines (West-Mid & North-West)
    if (upg.wind_turbines) {
      const turbPts = upg.wind_turbines >= 3
        ? [[x0 + 48, plot.y - 12], [x0 + 48, plot.y + 38], [plot.x - 86, y0 + 54]]
        : upg.wind_turbines >= 2
          ? [[x0 + 48, plot.y - 10], [x0 + 48, plot.y + 34]]
          : [[x0 + 48, plot.y + 8]];
      for (let t = 0; t < turbPts.length; t++) {
        const [wx, wy] = turbPts[t];
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(wx, wy, 7, 0, 7); ctx.fill();
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save(); ctx.translate(wx, wy); ctx.rotate(now / 280 + t * 1.1);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3;
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, 0); ctx.stroke();
        }
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 7); ctx.fill();
        ctx.restore();
      }
    }

    // Pressurized Hydroponic Greenhouse (South-East)
    if (upg.hydroponic_greenhouse) {
      const gx = x0 + S - 108, gy = y0 + S - 116;
      ctx.fillStyle = '#064e3b'; ctx.fillRect(gx, gy, 72, 46);
      ctx.fillStyle = '#22c55e';
      for (let ry = gy + 8; ry <= gy + 34; ry += 12) ctx.fillRect(gx + 8, ry, 56, 6);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.25)'; ctx.fillRect(gx + 2, gy + 2, 68, 42);
      ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, 72, 46);
      ctx.fillStyle = '#bbf7d0'; ctx.font = 'bold 7.5px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('HYDRO LAB', gx + 36, gy + 41);
    }

    // Atmospheric Water Vaporator & Nuclear RTG (mid-corridor wings)
    if (upg.water_vaporator) {
      const vx = plot.x - 95, vy = plot.y + 42;
      ctx.fillStyle = '#0c4a6e'; ctx.beginPath(); ctx.arc(vx - 11, vy, 10, 0, 7); ctx.arc(vx + 11, vy, 10, 0, 7); ctx.fill();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(vx - 11, vy, 10, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(vx + 11, vy, 10, 0, 7); ctx.stroke();
      ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.arc(vx - 11, vy, 4, 0, 7); ctx.arc(vx + 11, vy, 4, 0, 7); ctx.fill();
    }
    if (upg.nuclear_rtg) {
      const rx = plot.x - 96, ry = plot.y - 42;
      ctx.drawImage(GLOW_SPR.green, rx - 28, ry - 28, 56, 56);
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(rx, ry, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(rx, ry, 5 + Math.sin(now / 220) * 1.5, 0, 7); ctx.fill();
    }

    // Reinforced Helipad & Windsock (South-East outer wing or East apron)
    if (upg.helipad) {
      const hx = x0 + S - 82, hy = plot.y + 58;
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(hx, hy, 40, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(hx, hy, 36, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy - 14); ctx.lineTo(hx - 10, hy + 14);
      ctx.moveTo(hx + 10, hy - 14); ctx.lineTo(hx + 10, hy + 14);
      ctx.moveTo(hx - 10, hy); ctx.lineTo(hx + 10, hy);
      ctx.stroke();
      // Perimeter approach lights
      for (let p2 = 0; p2 < 8; p2++) {
        const pa = p2 * Math.PI / 4;
        ctx.fillStyle = ((now + p2 * 100) % 800 < 350) ? '#38bdf8' : '#0284c7';
        ctx.beginPath(); ctx.arc(hx + Math.cos(pa) * 39, hy + Math.sin(pa) * 39, 2.5, 0, 7); ctx.fill();
      }
      // Animated windsock cone
      const wsx = hx + 36, wsy = hy - 32;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wsx, wsy); ctx.lineTo(wsx + 14 + Math.sin(now / 220) * 3, wsy - 4); ctx.stroke();
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(wsx + 12, wsy - 3, 3.5, 0, 7); ctx.fill();
    }

    // Early-Warning Phased-Array Radar Spire
    if (upg.radar_spire) {
      const rdx = plot.x + 88, rdy = y0 + 58;
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(rdx, rdy, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(rdx, rdy); ctx.rotate(now / 380);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 12, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(56,189,248,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.restore();
    }

    // Quantum Teleport Matrix Pad
    if (upg.teleport_pad) {
      const tpx = plot.x + 88, tpy = plot.y - 54;
      ctx.drawImage(GLOW_SPR.purple, tpx - 28, tpy - 28, 56, 56);
      ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.arc(tpx, tpy, 18, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tpx, tpy, 14, now / 260, now / 260 + 4.5); ctx.stroke();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tpx, tpy, 8, -now / 220, -now / 220 + 4.2); ctx.stroke();
    }

    // ───────── 6.5 NORTH COURTYARD ARMORED BUNKER LIFT VESTIBULE ─────────
    const liftX = plot.x, liftY = plot.y - S * 0.28;
    const liftPulse = 0.5 + 0.5 * Math.sin(now / 260);
    const canEnterBunker = !!(plot.ownerName && me && (me.plotId === plot.id || (plot.team > 0 && me.team === plot.team) || settings.mode === 'coop'));
    ctx.save();
    ctx.fillStyle = '#0b111c';
    traceChamferRect(ctx, liftX - 42, liftY - 32, 84, 64, 10); ctx.fill();
    ctx.strokeStyle = canEnterBunker ? '#38bdf8' : '#475569';
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = canEnterBunker ? `rgba(56,189,248,${0.18 + liftPulse * 0.16})` : 'rgba(100,116,139,0.12)';
    ctx.fillRect(liftX - 32, liftY - 22, 64, 44);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(liftX, liftY - 22); ctx.lineTo(liftX, liftY + 22); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(liftX - 40, liftY - 6, 8, 12); ctx.fillRect(liftX + 32, liftY - 6, 8, 12);
    ctx.fillStyle = canEnterBunker ? '#38bdf8' : '#94a3b8';
    ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🛗 BUNKER LIFT', liftX, liftY - 8);
    ctx.font = '9px system-ui'; ctx.fillStyle = canEnterBunker ? '#bae6fd' : '#64748b';
    ctx.fillText(canEnterBunker ? '[E] DESCEND' : 'CLAIM FIRST', liftX, liftY + 9);
    ctx.restore();

    // ───────── 7. OCTAGONAL CENTRAL COMMAND CORE ─────────
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4 + Math.PI / 8;
      const px = plot.x + Math.cos(ang) * 40, py = plot.y + Math.sin(ang) * 40;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = teamColor; ctx.lineWidth = 3; ctx.stroke();

    ctx.strokeStyle = 'rgba(56,189,248,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(plot.x, plot.y, 26, now / 500, now / 500 + 4.4); ctx.stroke();

    if (upg.tesla_spire) {
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(plot.x, plot.y, 33, -now / 260, -now / 260 + 3.8); ctx.stroke();
      if (Math.random() < 0.25) {
        const ta = Math.random() * 6.28;
        ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(plot.x, plot.y); ctx.lineTo(plot.x + Math.cos(ta) * 44, plot.y + Math.sin(ta) * 44); ctx.stroke();
      }
    }
    if (upg.antimatter_reactor) {
      ctx.drawImage(GLOW_SPR.purple, plot.x - 32, plot.y - 32, 64, 64);
    }
    if (upg.evac_beacon) {
      const eb = upg.evac_beacon;
      const ebPulse = 0.5 + 0.5 * Math.sin(now / 220);
      ctx.strokeStyle = eb >= 5 ? `rgba(239,68,68,${0.5 + ebPulse * 0.45})` : `rgba(250,204,21,${0.45 + ebPulse * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(plot.x, plot.y, 44 + eb * 3, 0, 7); ctx.stroke();
      if (eb >= 5) {
        ctx.fillStyle = `rgba(239,68,68,${0.14 + ebPulse * 0.14})`;
        ctx.fillRect(plot.x - 16, plot.y - 1600, 32, 1600);
      }
    }

    ctx.fillStyle = teamColor; ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${lv}`, plot.x, plot.y);

    // ───────── 8. FLOATING IN-WORLD NAMEPLATE & PROMPTS ─────────
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.95)';
    ctx.strokeText(`🏰 ${plot.name}`, plot.x, y0 - 24);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`🏰 ${plot.name}`, plot.x, y0 - 24);

    const evacTag = upg.evac_beacon >= 5 ? (me && me.plotId === plot.id && me.evacTimer > 0 ? ` · 🚨 EXODUS ${me.evacTimer}s` : ' · 🚨 EXODUS ACTIVE') : (upg.evac_beacon ? ` · 📡 Beacon ${upg.evac_beacon}/5` : '');
    const sub = plot.ownerName ? `[Owner: ${plot.ownerName} · Lv.${lv}${evacTag}]` : `[UNCLAIMED PLOT · +${plot.income || lv} Scrap/s]`;
    ctx.font = 'bold 12px system-ui';
    ctx.strokeText(sub, plot.x, y0 - 8);
    ctx.fillStyle = plot.ownerName ? teamColor : '#4dff88';
    ctx.fillText(sub, plot.x, y0 - 8);

    const distToLift = Math.hypot(liftX - selfX, liftY - selfY);
    const distToMe = Math.hypot(plot.x - selfX, plot.y - selfY);
    if (canEnterBunker && distToLift < 105) {
      const lhint = '🛗 Press [E] to Descend into Huge 6-Wing Underground Bunker';
      ctx.font = 'bold 12.5px system-ui';
      const lhw = txtW('bold 12.5px system-ui', lhint) + 24;
      ctx.fillStyle = 'rgba(8, 16, 28, 0.94)';
      ctx.fillRect(liftX - lhw / 2, liftY + 36, lhw, 26);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.8;
      ctx.strokeRect(liftX - lhw / 2, liftY + 36, lhw, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(lhint, liftX, liftY + 50);
    } else if (distToMe < S * 0.58) {
      const hint = plot.ownerName ? '⚙️ Press [T] for Shelter Tycoon Upgrades' : '🏰 Press [E] to Claim This Shelter Outpost';
      ctx.font = 'bold 12.5px system-ui';
      const hw = txtW('bold 12.5px system-ui', hint) + 24;
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

function drawRaidBunkers(now, inView, selfX, selfY) {
  if (!D || !D.RAID_BUNKERS) return;
  for (const rb of D.RAID_BUNKERS) {
    if (!inView(rb.x, rb.y, 260)) continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 280 + rb.id);
    ctx.save();

    // Chamfered octagonal blast concrete apron
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    traceChamferRect(ctx, rb.x - 108, rb.y - 86, 224, 180, 26); ctx.fill();
    ctx.fillStyle = '#1e2631';
    traceChamferRect(ctx, rb.x - 114, rb.y - 92, 228, 184, 28); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();

    // Inner concrete blast deck & sandbag deflectors
    ctx.fillStyle = '#293240';
    traceChamferRect(ctx, rb.x - 98, rb.y - 76, 196, 152, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(239,68,68,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Side concrete Jersey barriers
    ctx.fillStyle = '#475569';
    ctx.fillRect(rb.x - 90, rb.y - 44, 16, 88); ctx.fillRect(rb.x + 74, rb.y - 44, 16, 88);
    ctx.fillStyle = '#a89368';
    ctx.fillRect(rb.x - 56, rb.y - 68, 112, 12);

    // Hydraulic blast pit & heavy split steel vault doors
    ctx.fillStyle = '#090d14';
    traceChamferRect(ctx, rb.x - 56, rb.y - 42, 112, 84, 10); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.fillRect(rb.x - 50, rb.y - 36, 48, 72);
    ctx.fillRect(rb.x + 2, rb.y - 36, 48, 72);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    ctx.strokeRect(rb.x - 50, rb.y - 36, 48, 72);
    ctx.strokeRect(rb.x + 2, rb.y - 36, 48, 72);

    // Locking steel pistons & vault wheel
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rb.x - 58, rb.y - 18, 12, 8); ctx.fillRect(rb.x - 58, rb.y + 10, 12, 8);
    ctx.fillRect(rb.x + 46, rb.y - 18, 12, 8); ctx.fillRect(rb.x + 46, rb.y + 10, 12, 8);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(rb.x, rb.y, 12, 0, 7); ctx.stroke();

    // Rotating tactical radar dish (top-right corner)
    ctx.save();
    ctx.translate(rb.x + 84, rb.y - 58);
    ctx.rotate(now / 650 + rb.id);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 10, -1, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, 0); ctx.stroke();
    ctx.restore();

    // Strobe beacons
    ctx.fillStyle = `rgba(239,68,68,${0.4 + pulse * 0.6})`;
    ctx.beginPath(); ctx.arc(rb.x - 86, rb.y - 66, 7, 0, 7); ctx.arc(rb.x + 86, rb.y + 66, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(rb.x - 86, rb.y + 66, 7, 0, 7); ctx.fill();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(`☢️ ${rb.name}`, rb.x, rb.y - 108);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`☢️ ${rb.name}`, rb.x, rb.y - 108);

    const dist = Math.hypot(selfX - rb.x, selfY - rb.y);
    if (dist < 140) {
      const txt = '☢️ Press [E] to Breach Military Raid Bunker (High Risk · Rare Loot)';
      ctx.font = 'bold 12px system-ui';
      const tw = txtW('bold 12px system-ui', txt) + 22;
      ctx.fillStyle = 'rgba(15,10,16,0.92)';
      ctx.fillRect(rb.x - tw / 2, rb.y + 102, tw, 25);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
      ctx.strokeRect(rb.x - tw / 2, rb.y + 102, tw, 25);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(txt, rb.x, rb.y + 115);
    }
    ctx.restore();
  }
}

const ENT_META = {
  airport: { icon: '✈️', label: 'AIRPORT', accent: '#38bdf8', glow: 'rgba(56,189,248,0.38)', verb: 'Enter' },
  university: { icon: '🎓', label: 'UNIVERSITY', accent: '#f59e0b', glow: 'rgba(245,158,11,0.34)', verb: 'Enter' },
  hospital: { icon: '🏥', label: 'HOSPITAL', accent: '#10b981', glow: 'rgba(16,185,129,0.34)', verb: 'Enter' },
  mall: { icon: '🛍️', label: 'SHOPPING MALL', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.34)', verb: 'Enter' },
  military: { icon: '🪖', label: 'MILITARY BASE', accent: '#ef4444', glow: 'rgba(239,68,68,0.34)', verb: 'Breach' },
  historic: { icon: '⛪', label: 'CATHEDRAL', accent: '#eab308', glow: 'rgba(234,179,8,0.34)', verb: 'Enter' },
  museum: { icon: '🖼️', label: 'ART MUSEUM', accent: '#f472b6', glow: 'rgba(244,114,182,0.34)', verb: 'Enter' },
  transit: { icon: '🚌', label: 'TRANSIT HUB', accent: '#38bdf8', glow: 'rgba(56,189,248,0.34)', verb: 'Enter' },
  industrial: { icon: '🏭', label: 'POWER WORKS', accent: '#fb923c', glow: 'rgba(251,146,60,0.34)', verb: 'Breach' },
  police: { icon: '🚓', label: 'POLICE HQ', accent: '#3b82f6', glow: 'rgba(59,130,246,0.36)', verb: 'Enter' },
  fire: { icon: '🚒', label: 'FIRE STATION', accent: '#ef4444', glow: 'rgba(239,68,68,0.36)', verb: 'Enter' },
  bank: { icon: '🏦', label: 'CENTRAL BANK', accent: '#eab308', glow: 'rgba(234,179,8,0.38)', verb: 'Heist' },
  stadium: { icon: '🏟️', label: 'STADIUM', accent: '#22c55e', glow: 'rgba(34,197,94,0.34)', verb: 'Enter' },
  aquarium: { icon: '🐠', label: 'AQUARIUM', accent: '#22d3ee', glow: 'rgba(34,211,238,0.36)', verb: 'Enter' },
  science: { icon: '🔭', label: 'SCIENCE CENTRE', accent: '#a78bfa', glow: 'rgba(167,139,250,0.36)', verb: 'Enter' },
  bazaar: { icon: '🕌', label: 'GRAND BAZAAR', accent: '#f59e0b', glow: 'rgba(245,158,11,0.36)', verb: 'Enter' },
  pyramid: { icon: '🔺', label: 'ANCIENT TOMB', accent: '#fbbf24', glow: 'rgba(251,191,36,0.38)', verb: 'Explore' },
  mosque: { icon: '🕌', label: 'GRAND MOSQUE', accent: '#34d399', glow: 'rgba(52,211,153,0.36)', verb: 'Enter' },
  capitol: { icon: '⚖️', label: 'CAPITOL & COURT', accent: '#60a5fa', glow: 'rgba(96,165,250,0.36)', verb: 'Enter' },
  palace: { icon: '👑', label: 'ROYAL PALACE', accent: '#fbbf24', glow: 'rgba(251,191,36,0.38)', verb: 'Enter' },
  greenhouse: { icon: '🌿', label: 'CONSERVATORY', accent: '#4ade80', glow: 'rgba(74,222,128,0.36)', verb: 'Enter' },
  mill: { icon: '🌾', label: 'GRANARY & MILL', accent: '#d97706', glow: 'rgba(217,119,6,0.36)', verb: 'Enter' }
};

function drawBuildingEntrances(now, inView, selfX, selfY, vx0, vy0, vx1, vy1) {
  if (!M || !M.entrances) return;
  const list = vx0 !== undefined ? entrancesIn(vx0 - 200, vy0 - 200, vx1 + 200, vy1 + 200) : M.entrances;
  for (const ent of list) {
    if (!inView(ent.x, ent.y, 200)) continue;
    const meta = ENT_META[ent.type] || ENT_META.university;
    const pulse = 0.5 + 0.5 * Math.sin(now / 260 + ent.x * 0.01);
    const dist = Math.hypot(selfX - ent.x, selfY - ent.y);
    const isNear = dist < 120;

    ctx.save();
    // Glowing entrance pad right in front of building doorway
    ctx.fillStyle = meta.glow;
    ctx.beginPath();
    ctx.ellipse(ent.x, ent.y + 4, 46 + pulse * 4, 24 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(10,16,26,0.92)';
    traceChamferRect(ctx, ent.x - 42, ent.y - 16, 84, 34, 8);
    ctx.fill();
    ctx.strokeStyle = isNear ? '#ffd700' : meta.accent;
    ctx.lineWidth = isNear ? 2.5 : 1.8;
    ctx.stroke();

    // Animated chevron arrows pointing into doorway
    const hop = ((now % 900) / 900) * 6;
    ctx.strokeStyle = isNear ? '#ffd700' : meta.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ent.x - 10, ent.y + 4 - hop); ctx.lineTo(ent.x, ent.y - 4 - hop); ctx.lineTo(ent.x + 10, ent.y + 4 - hop);
    ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px system-ui';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    const badge = `${meta.icon} ${meta.label}`;
    ctx.strokeText(badge, ent.x, ent.y - 28);
    ctx.fillStyle = meta.accent;
    ctx.fillText(badge, ent.x, ent.y - 28);

    if (dist < 175) {
      const prompt = `${meta.icon} Press [E] to ${meta.verb} ${ent.name}`;
      ctx.font = 'bold 12px system-ui';
      const tw = txtW('bold 12px system-ui', prompt) + 22;
      ctx.fillStyle = 'rgba(8,14,24,0.94)';
      ctx.fillRect(ent.x - tw / 2, ent.y + 26, tw, 24);
      ctx.strokeStyle = isNear ? '#ffd700' : meta.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ent.x - tw / 2, ent.y + 26, tw, 24);
      ctx.fillStyle = isNear ? '#ffd700' : '#f8fafc';
      ctx.fillText(prompt, ent.x, ent.y + 38);
    }
    ctx.restore();
  }
}

function buildBunkerStaticCanvas(idef, mode) {
  const W = idef.w, H = idef.h;
  const cv2 = document.createElement('canvas');
  cv2.width = W; cv2.height = H;
  const g = cv2.getContext('2d');
  const isRaid = mode === 'raid';
  const isBunkerOrRaid = mode === 'bunker' || mode === 'raid';

  // Outer hull & bespoke rich floor base matched to building theme
  const floorCols = {
    airport: '#182230',
    hospital: '#dce7ee',
    university: '#2c2219',
    mall: '#1e293b',
    military: '#171d18',
    historic: '#3b3227',
    museum: '#e4ddd0',
    transit: '#1a2433',
    industrial: '#1a1e24',
    police: '#131d2d',
    fire: '#241b1b',
    bank: '#ded6c3',
    stadium: '#182420',
    aquarium: '#091f31',
    science: '#111a2c',
    bazaar: '#37291c',
    pyramid: '#4d3b20',
    mosque: '#142d26',
    capitol: '#e2dacc',
    palace: '#38191e',
    greenhouse: '#152e22',
    mill: '#322316'
  };
  g.fillStyle = '#0b1017';
  g.fillRect(0, 0, W, H);
  g.fillStyle = floorCols[mode] || '#121822';
  g.fillRect(0, 0, W, H);

  // Room-specific floor materials, subtle checkerboard/parquet, ambient shadow & architectural trim
  for (const rm of idef.rooms) {
    g.fillStyle = rm.tint || 'rgba(255,255,255,0.03)';
    g.fillRect(rm.x, rm.y, rm.w, rm.h);

    if (mode === 'airport') {
      g.strokeStyle = rm.id === 'hangar_vault' ? 'rgba(239,68,68,0.16)' : (rm.id === 'atc' || rm.id === 'gates_w') ? 'rgba(56,189,248,0.16)' : rm.id === 'gates_e' ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.11)';
    } else if (mode === 'university') {
      g.strokeStyle = rm.id === 'biolab' ? 'rgba(56,189,248,0.14)' : rm.id === 'infirmary' ? 'rgba(16,185,129,0.12)' : 'rgba(217,119,6,0.12)';
    } else if (mode === 'hospital') {
      g.strokeStyle = rm.id === 'quarantine' ? 'rgba(239,68,68,0.18)' : 'rgba(15,118,110,0.16)';
    } else if (mode === 'mall') {
      g.strokeStyle = rm.id === 'concourse' ? 'rgba(45,212,191,0.14)' : 'rgba(148,163,184,0.12)';
    } else if (mode === 'military') {
      g.strokeStyle = rm.id === 'vault' ? 'rgba(239,68,68,0.14)' : 'rgba(132,204,22,0.11)';
    } else if (mode === 'historic' || mode === 'pyramid') {
      g.strokeStyle = rm.id === 'sanctum' || rm.id === 'burial' ? 'rgba(251,191,36,0.18)' : 'rgba(214,195,165,0.14)';
    } else if (mode === 'museum' || mode === 'bank' || mode === 'capitol') {
      g.strokeStyle = 'rgba(15,23,42,0.11)';
    } else if (mode === 'aquarium') {
      g.strokeStyle = 'rgba(56,189,248,0.16)';
    } else if (mode === 'science') {
      g.strokeStyle = 'rgba(167,139,250,0.15)';
    } else if (mode === 'greenhouse') {
      g.strokeStyle = 'rgba(74,222,128,0.14)';
    } else if (mode === 'mosque') {
      g.strokeStyle = 'rgba(251,191,36,0.14)';
    } else if (mode === 'palace') {
      g.strokeStyle = 'rgba(251,191,36,0.15)';
    } else if (mode === 'police') {
      g.strokeStyle = 'rgba(59,130,246,0.14)';
    } else if (mode === 'fire') {
      g.strokeStyle = 'rgba(239,68,68,0.14)';
    } else if (mode === 'stadium') {
      g.strokeStyle = 'rgba(34,197,94,0.14)';
    } else if (mode === 'bazaar' || mode === 'mill') {
      g.strokeStyle = 'rgba(245,158,11,0.14)';
    } else if (mode === 'transit') {
      g.strokeStyle = rm.id === 'ops' ? 'rgba(56,189,248,0.16)' : 'rgba(148,163,184,0.11)';
    } else if (mode === 'industrial') {
      g.strokeStyle = rm.id === 'turbine' ? 'rgba(245,158,11,0.14)' : 'rgba(100,116,139,0.14)';
    } else {
      g.strokeStyle = rm.id === 'medbay' ? 'rgba(16,185,129,0.09)' : rm.id === 'vault' ? 'rgba(239,68,68,0.09)' : 'rgba(148,163,184,0.065)';
    }
    g.lineWidth = 1;
    const step = (mode === 'hospital' || rm.id === 'medbay' || mode === 'museum' || mode === 'bank' || mode === 'capitol') ? 32 : 40;
    g.beginPath();
    for (let gx = rm.x + step; gx < rm.x + rm.w; gx += step) { g.moveTo(gx, rm.y); g.lineTo(gx, rm.y + rm.h); }
    for (let gy = rm.y + step; gy < rm.y + rm.h; gy += step) { g.moveTo(rm.x, gy); g.lineTo(rm.x + rm.w, gy); }
    g.stroke();

    // Inner ambient occlusion perimeter fade for depth
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(rm.x, rm.y, rm.w, 10);
    g.fillRect(rm.x, rm.y, 10, rm.h);

    g.strokeStyle = rm.accent || '#475569';
    g.globalAlpha = 0.36; g.lineWidth = 2;
    traceChamferRect(g, rm.x + 8, rm.y + 8, rm.w - 16, rm.h - 16, 16);
    g.stroke();

    const lightFloor = mode === 'hospital' || mode === 'museum' || mode === 'bank' || mode === 'capitol';
    g.fillStyle = lightFloor ? '#0f172a' : (rm.accent || '#94a3b8');
    g.globalAlpha = lightFloor ? 0.65 : 0.48;
    g.font = 'bold 17px system-ui';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(rm.name, rm.x + rm.w / 2, rm.y + 34);
    g.globalAlpha = 1;
  }

  if (isBunkerOrRaid) {
    const conduitCol = isRaid ? 'rgba(248,113,113,0.45)' : 'rgba(168,85,247,0.48)';
    g.lineWidth = 8; g.strokeStyle = '#090d14';
    g.beginPath();
    g.moveTo(300, 300); g.lineTo(1500, 300);
    g.moveTo(300, 900); g.lineTo(1500, 900);
    g.moveTo(300, 300); g.lineTo(300, 900);
    g.moveTo(900, 300); g.lineTo(900, 900);
    g.moveTo(1500, 300); g.lineTo(1500, 900);
    g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = conduitCol; g.stroke();

    g.fillStyle = '#291f14'; g.fillRect(52, 260, 36, 220);
    g.strokeStyle = '#f59e0b'; g.lineWidth = 1.8; g.strokeRect(52, 260, 36, 220);
    for (let wy = 278; wy < 468; wy += 24) {
      g.fillStyle = '#94a3b8'; g.fillRect(58, wy, 24, 5);
      g.fillStyle = '#fbbf24'; g.fillRect(74, wy + 1, 6, 3);
    }
    for (let lx2 = 220; lx2 <= 360; lx2 += 70) {
      g.strokeStyle = 'rgba(245,158,11,0.18)'; g.lineWidth = 1;
      g.strokeRect(lx2 - 22, 66, 44, 56);
      g.fillStyle = '#7f1d1d'; g.beginPath(); g.arc(lx2, 84, 9, 0, 7); g.fill();
      g.strokeStyle = '#fca5a5'; g.lineWidth = 1; g.stroke();
    }
    g.fillStyle = '#365314'; g.fillRect(420, 92, 46, 26); g.fillRect(474, 92, 34, 26);
    g.strokeStyle = '#84cc16'; g.lineWidth = 1.2; g.strokeRect(420, 92, 46, 26); g.strokeRect(474, 92, 34, 26);

    g.fillStyle = '#0f172a'; g.fillRect(680, 250, 74, 26); g.fillRect(1046, 250, 74, 26);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(680, 250, 74, 26); g.strokeRect(1046, 250, 74, 26);
    g.fillStyle = '#38bdf8'; g.fillRect(692, 255, 22, 6); g.fillRect(720, 255, 22, 6);
    g.fillRect(1058, 255, 22, 6); g.fillRect(1086, 255, 22, 6);
    g.strokeStyle = 'rgba(251,191,36,0.28)'; g.lineWidth = 2; g.strokeRect(844, 72, 112, 92);

    for (let i = 0; i < 3; i++) {
      const by = 320 + i * 68;
      g.fillStyle = '#0f2922'; g.fillRect(1370, by, 76, 40);
      g.strokeStyle = '#10b981'; g.lineWidth = 1.5; g.strokeRect(1370, by, 76, 40);
      g.fillStyle = '#cbd5e1'; g.fillRect(1376, by + 6, 16, 28);
      g.fillStyle = '#0d9488'; g.fillRect(1394, by + 6, 46, 28);
      g.fillStyle = '#020617'; g.fillRect(1454, by + 8, 20, 16);
    }
    for (let cx2 = 1660; cx2 <= 1720; cx2 += 56) {
      g.fillStyle = '#042f2e'; g.beginPath(); g.arc(cx2, 190, 20, 0, 7); g.fill();
      g.strokeStyle = '#2dd4bf'; g.lineWidth = 2.5; g.stroke();
    }

    g.strokeStyle = 'rgba(251,146,60,0.38)'; g.lineWidth = 4; g.strokeRect(70, 660, 470, 120);
    for (let ax = 120; ax <= 240; ax += 60) {
      g.fillStyle = '#1e293b'; g.fillRect(ax - 14, 678, 28, 28);
      g.strokeStyle = '#fb923c'; g.lineWidth = 1.5; g.strokeRect(ax - 14, 678, 28, 28);
      g.fillStyle = '#94a3b8'; g.beginPath(); g.arc(ax, 692, 8, 0, 7); g.fill();
    }
    g.fillStyle = '#b91c1c'; g.fillRect(62, 990, 56, 36);
    g.strokeStyle = '#fca5a5'; g.lineWidth = 1.2; g.strokeRect(62, 990, 56, 36);

    for (const py of [720, 790, 860]) {
      g.fillStyle = '#064e3b'; g.fillRect(640, py, 140, 40);
      g.strokeStyle = '#34d399'; g.lineWidth = 1.5; g.strokeRect(640, py, 140, 40);
      for (let hx = 656; hx < 770; hx += 22) {
        g.fillStyle = '#4ade80'; g.beginPath(); g.arc(hx, py + 20, 7, 0, 7); g.fill();
        g.fillStyle = '#bbf7d0'; g.beginPath(); g.arc(hx - 2, py + 18, 2.5, 0, 7); g.fill();
      }
    }
    g.fillStyle = '#475569';
    g.fillRect(894, 800, 12, 42); g.fillRect(894, 958, 12, 42);
    g.fillRect(800, 894, 42, 12); g.fillRect(958, 894, 42, 12);

    g.fillStyle = '#78350f'; g.fillRect(1630, 840, 80, 44); g.fillRect(1630, 904, 80, 44);
    g.fillStyle = '#fbbf24'; g.fillRect(1642, 850, 22, 10); g.fillRect(1672, 850, 22, 10);
    g.fillStyle = '#38bdf8'; g.fillRect(1642, 914, 22, 10); g.fillRect(1672, 914, 22, 10);

    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(226,232,240,0.28)'; g.textAlign = 'center';
    g.fillText('← ARMORY', 555, 300); g.fillText('BIO-MED →', 1245, 300);
    g.fillText('REACTOR ↓', 900, 575); g.fillText('VAULT ↓', 1500, 575);
  } else if (mode === 'university') {
    // Oak Library Shelves with colored book spines, Persian Reading Rug & Lamps (NW)
    g.fillStyle = 'rgba(153,27,27,0.34)'; g.fillRect(58, 430, 320, 125);
    g.strokeStyle = 'rgba(251,191,36,0.4)'; g.lineWidth = 2; g.strokeRect(64, 436, 308, 113);
    g.fillStyle = '#5c2d0c'; g.fillRect(92, 462, 120, 38); g.fillRect(236, 462, 120, 38);
    g.fillStyle = '#22c55e'; g.fillRect(114, 472, 18, 16); g.fillRect(258, 472, 18, 16);
    g.fillStyle = '#fde047'; g.beginPath(); g.arc(123, 480, 3, 0, 7); g.arc(267, 480, 3, 0, 7); g.fill();
    const bookCols = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];
    for (const bx of [130, 270, 410]) {
      g.fillStyle = '#78350f'; g.fillRect(bx - 4, 148, 30, 236);
      for (let sy = 158, bi = 0; sy < 372; sy += 16, bi++) {
        g.fillStyle = bookCols[bi % bookCols.length]; g.fillRect(bx + 1, sy, 20, 11);
      }
    }
    // Grand Lecture Hall Chalkboard with diagrams, Tiered Benches & Podium (N-Center)
    g.fillStyle = '#064e3b'; g.fillRect(720, 44, 360, 22);
    g.strokeStyle = '#a16207'; g.lineWidth = 2.5; g.strokeRect(720, 44, 360, 22);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.fillRect(745, 52, 85, 3); g.fillRect(860, 50, 62, 3); g.fillRect(960, 55, 95, 3);
    g.fillStyle = '#78350f'; g.fillRect(820, 155, 160, 44);
    for (const [tx, ty] of [[690, 310], [960, 310], [690, 420], [960, 420]]) {
      g.fillStyle = '#451a03'; g.fillRect(tx, ty, 150, 28);
      g.strokeStyle = '#d97706'; g.lineWidth = 1.2; g.strokeRect(tx, ty, 150, 28);
      for (let sx = tx + 14; sx < tx + 140; sx += 26) { g.fillStyle = '#f8fafc'; g.fillRect(sx, ty + 8, 12, 8); }
    }
    // Bio-Chem & Robotics Lab Fume Hood, Microscopes & Flasks (NE)
    g.fillStyle = '#0f172a'; g.fillRect(1260, 86, 440, 42);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(1260, 86, 440, 42);
    for (const bx of [1320, 1540]) {
      g.fillStyle = '#1e293b'; g.fillRect(bx, 190, 150, 42);
      g.strokeStyle = '#2dd4bf'; g.lineWidth = 1.5; g.strokeRect(bx, 190, 150, 42);
      g.fillStyle = '#e2e8f0'; g.fillRect(bx + 20, 200, 16, 18); g.fillRect(bx + 108, 200, 18, 18);
      g.fillStyle = '#4ade80'; g.beginPath(); g.arc(bx + 68, 211, 8, 0, 7); g.fill();
      g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(bx + 90, 211, 6, 0, 7); g.fill();
    }
    // Student Union Cafeteria Tables, Trays & Chairs (SW)
    for (let fy = 620; fy < 1160; fy += 40) for (let fx = 40; fx < 570; fx += 40) {
      if (((fx + fy) / 40) % 2 === 0) { g.fillStyle = 'rgba(251,146,60,0.06)'; g.fillRect(fx, fy, 40, 40); }
    }
    for (const [cx2, cy2] of [[130, 770], [340, 770], [130, 970]]) {
      g.fillStyle = '#9a3412'; g.fillRect(cx2, cy2, 110, 42);
      g.fillStyle = '#f8fafc'; g.fillRect(cx2 + 16, cy2 + 10, 26, 18); g.fillRect(cx2 + 66, cy2 + 12, 24, 16);
      g.fillStyle = '#fbbf24'; g.fillRect(cx2 + 22, cy2 + 14, 10, 8);
    }
    // Campus Foyer Carpet & Seal + East Infirmary Gym Court (S-Center & SE)
    g.fillStyle = '#451a03'; g.fillRect(855, 680, 90, 460);
    g.strokeStyle = '#d97706'; g.lineWidth = 2; g.strokeRect(855, 680, 90, 460);
    g.fillStyle = 'rgba(217,119,6,0.12)'; g.fillRect(1260, 660, 460, 460);
    g.strokeStyle = 'rgba(245,158,11,0.4)'; g.lineWidth = 2.5;
    g.strokeRect(1260, 660, 460, 460);
    g.beginPath(); g.arc(1490, 890, 58, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(1260, 890); g.lineTo(1720, 890); g.stroke();
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(254,243,199,0.5)'; g.textAlign = 'center';
    g.fillText('← LIBRARY', 540, 300); g.fillText('BIO-LAB →', 1250, 300);
    g.fillText('← CAFETERIA', 540, 900); g.fillText('LECTURE HALL ↑', 900, 645);
  } else if (mode === 'hospital') {
    // Emergency Triage Red Corridor Cross & Waiting Seating
    g.fillStyle = 'rgba(13,148,136,0.18)'; g.fillRect(855, 680, 90, 460);
    g.fillStyle = 'rgba(239,68,68,0.28)'; g.fillRect(894, 680, 12, 460);
    g.fillRect(884, 955, 32, 92); g.fillRect(854, 985, 92, 32);
    for (const wy of [790, 850]) {
      g.fillStyle = '#0284c7'; g.fillRect(1020, wy, 140, 18); g.fillRect(600, wy, 140, 18);
    }
    // Operating Theatre: MRI Scanner Magnet Ring + Sterile Blue Surgical Drape + Instrument Tray (NW)
    g.fillStyle = '#cbd5e1'; g.beginPath(); g.arc(280, 155, 58, 0, 7); g.fill();
    g.fillStyle = '#334155'; g.beginPath(); g.arc(280, 155, 30, 0, 7); g.fill();
    g.strokeStyle = '#0d9488'; g.lineWidth = 3; g.beginPath(); g.arc(280, 287, 94, 0, 7); g.stroke();
    g.fillStyle = '#0284c7'; g.fillRect(224, 264, 112, 46);
    g.fillStyle = '#bae6fd'; g.fillRect(250, 272, 60, 30);
    g.fillStyle = '#e2e8f0'; g.beginPath(); g.arc(280, 287, 18, 0, 7); g.fill();
    // 4 ICU Beds with Pillows, Privacy Curtain Tracks & Monitor Stands (N-Center)
    for (const [bx, by] of [[660, 220], [1045, 220], [660, 410], [1045, 410]]) {
      g.fillStyle = '#0f766e'; g.fillRect(bx + 4, by + 4, 87, 36);
      g.fillStyle = '#f8fafc'; g.fillRect(bx + 6, by + 8, 20, 28);
      g.fillStyle = '#38bdf8'; g.fillRect(bx + 30, by + 7, 56, 30);
      g.fillStyle = '#020617'; g.fillRect(bx + 98, by + 10, 24, 18);
      g.strokeStyle = 'rgba(14,165,233,0.45)'; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(bx - 12, by - 14); g.lineTo(bx + 125, by - 14); g.stroke();
      g.setLineDash([]);
    }
    // Central Pharmacy Medicine Racks & Stainless Morgue Drawers (SW)
    g.fillStyle = '#64748b'; g.fillRect(54, 680, 40, 280);
    g.strokeStyle = '#0f172a'; g.lineWidth = 1.5;
    for (let my = 695; my < 950; my += 36) {
      g.strokeRect(58, my, 32, 28);
      g.fillStyle = '#cbd5e1'; g.fillRect(72, my + 12, 10, 4);
    }
    for (const py of [760, 960]) {
      g.fillStyle = '#334155'; g.fillRect(120, py, 145, 36);
      for (let px = 128; px < 256; px += 18) {
        g.fillStyle = px % 36 === 0 ? '#38bdf8' : '#4ade80'; g.fillRect(px, py + 8, 10, 20);
      }
    }
    // Quarantine Bio-Lab Hazard Striping, Cryo-Racks & Bio-Safety Hoods (NE)
    g.strokeStyle = 'rgba(239,68,68,0.45)'; g.lineWidth = 3;
    g.strokeRect(1290, 80, 450, 470);
    g.fillStyle = 'rgba(250,204,21,0.12)'; g.fillRect(1310, 100, 140, 70);
    g.fillStyle = '#0f172a'; g.fillRect(1440, 270, 130, 40);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(1440, 270, 130, 40);
    g.fillStyle = '#22d3ee'; g.fillRect(1455, 282, 26, 14); g.fillRect(1505, 282, 26, 14);
    // Cafeteria & Staff Lounge Booths (SE)
    for (const [lx, ly] of [[1360, 800], [1540, 950]]) {
      g.fillStyle = '#f59e0b'; g.fillRect(lx, ly, 105, 42);
      g.fillStyle = '#f8fafc'; g.fillRect(lx + 18, ly + 10, 24, 18); g.fillRect(lx + 62, ly + 12, 24, 16);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(15,23,42,0.58)'; g.textAlign = 'center';
    g.fillText('← SURGERY', 500, 300); g.fillText('QUARANTINE →', 1290, 300);
    g.fillText('← PHARMACY', 500, 900); g.fillText('ICU WARD ↑', 900, 665);
  } else if (mode === 'mall') {
    // 1. GRAND SKY-LIT ATRIUM & FOUNTAIN PLAZA (x: 620..1780, y: 450..1472)
    // Terrazzo Promenade Brass Diamond & Compass Medallions along x=1200
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let py = 460; py < 1450; py += 60) for (let px = 640; px < 1760; px += 60) {
      if (((px + py) / 60) % 2 === 0) g.fillRect(px, py, 60, 60);
    }
    g.strokeStyle = 'rgba(45,212,191,0.26)'; g.lineWidth = 2;
    for (const cy of [560, 1140, 1300]) {
      g.beginPath(); g.moveTo(1200, cy - 48); g.lineTo(1248, cy); g.lineTo(1200, cy + 48); g.lineTo(1152, cy); g.closePath(); g.stroke();
    }
    // Skylight Diagonal Sunbeams across Atrium
    g.fillStyle = 'rgba(254,249,195,0.045)';
    g.beginPath(); g.moveTo(860, 480); g.lineTo(1540, 480); g.lineTo(1420, 1280); g.lineTo(980, 1280); g.closePath(); g.fill();
    // Octagonal Tiered Marble Water Fountain (1090, 770, 220, 140)
    g.fillStyle = '#0f766e'; g.fillRect(1084, 764, 232, 152);
    g.fillStyle = '#14b8a6'; g.fillRect(1096, 776, 208, 128);
    g.fillStyle = '#0284c7'; g.fillRect(1108, 788, 184, 104);
    g.fillStyle = '#38bdf8'; g.beginPath(); g.ellipse(1200, 840, 64, 38, 0, 0, 7); g.fill();
    g.fillStyle = '#cbd5e1'; g.beginPath(); g.arc(1200, 840, 18, 0, 7); g.fill();
    g.fillStyle = '#fbbf24'; // Lucky coins in fountain basin
    for (const [cx2, cy2] of [[1135, 810], [1265, 825], [1160, 875], [1245, 868]]) { g.beginPath(); g.arc(cx2, cy2, 2.5, 0, 7); g.fill(); }
    // Twin Escalator Bays (790, 480, 64, 100 & 1546, 480, 64, 100)
    for (const ex of [790, 1546]) {
      g.fillStyle = '#1e293b'; g.fillRect(ex, 480, 64, 100);
      g.fillStyle = '#facc15'; g.fillRect(ex + 6, 482, 52, 6); g.fillRect(ex + 6, 572, 52, 6);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(ex, 480, 64, 100);
    }
    // Atrium Kiosks: Espresso Cafe (760,620) & Sunglasses/Tech (1530,620)
    g.fillStyle = '#78350f'; g.fillRect(760, 620, 110, 56);
    g.fillStyle = '#ef4444'; g.fillRect(760, 620, 110, 12);
    g.fillStyle = '#f8fafc'; g.fillRect(774, 640, 32, 16); g.fillStyle = '#92400e'; g.fillRect(820, 642, 18, 12);
    g.fillStyle = '#0f172a'; g.fillRect(1530, 620, 110, 56);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(1530, 620, 110, 56);
    g.fillStyle = '#38bdf8'; g.fillRect(1545, 636, 28, 22); g.fillStyle = '#fbbf24'; g.fillRect(1588, 636, 36, 22);
    // Terracotta Palm Planters & Oak Benches (760,1020 & 1540,1020)
    for (const px of [760, 1540]) {
      g.fillStyle = '#7c2d12'; g.fillRect(px, 1020, 100, 44);
      g.fillStyle = '#b45309'; g.fillRect(px + 28, 1030, 44, 24);
      for (const lx2 of [px + 14, px + 86]) {
        g.fillStyle = '#15803d'; g.beginPath(); g.arc(lx2, 1042, 15, 0, 7); g.fill();
        g.fillStyle = '#4ade80'; g.beginPath(); g.arc(lx2 - 3, 1039, 8, 0, 7); g.fill();
      }
    }

    // 2. TECH EMPORIUM, OLED PLAZA & RETRO ARCADE (x: 620..1780, y: 28..430)
    g.strokeStyle = 'rgba(56,189,248,0.32)'; g.lineWidth = 3; g.strokeRect(634, 42, 1132, 374);
    // Giant OLED Demo Walls along North Wall
    g.fillStyle = '#020617'; g.fillRect(670, 42, 340, 22); g.fillRect(1390, 42, 340, 22);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(670, 42, 340, 22); g.strokeRect(1390, 42, 340, 22);
    // 2 Sleek Oak Demo Tables with Laptops, Tablets & Phones (740,185 & 1500,185)
    for (const tx of [740, 1500]) {
      g.fillStyle = '#92400e'; g.fillRect(tx, 185, 160, 44);
      g.strokeStyle = '#fbbf24'; g.lineWidth = 1.5; g.strokeRect(tx, 185, 160, 44);
      for (let lx = tx + 16; lx < tx + 146; lx += 34) {
        g.fillStyle = '#e2e8f0'; g.fillRect(lx, 195, 22, 15);
        g.fillStyle = '#38bdf8'; g.fillRect(lx + 3, 198, 16, 9);
      }
    }
    // Row of 5 Retro Arcade Cabinets (1080, 240, 240, 46)
    g.fillStyle = '#0f172a'; g.fillRect(1080, 240, 240, 46);
    const arcCols = ['#ef4444', '#f59e0b', '#22c55e', '#38bdf8', '#c084fc'];
    for (let ai = 0; ai < 5; ai++) {
      const ax = 1090 + ai * 46;
      g.fillStyle = arcCols[ai]; g.fillRect(ax, 244, 36, 38);
      g.fillStyle = '#020617'; g.fillRect(ax + 5, 249, 26, 16);
      g.fillStyle = '#f8fafc'; g.beginPath(); g.arc(ax + 12, 274, 3, 0, 7); g.fill();
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(ax + 24, 274, 2.5, 0, 7); g.fill();
    }

    // 3. TACTICAL SPORTING GOODS & OUTDOOR GEAR (x: 28..600, y: 28..700)
    // Hardwood Basketball Demo Court Floor (top right)
    g.fillStyle = 'rgba(180,83,9,0.22)'; g.fillRect(320, 56, 252, 210);
    g.strokeStyle = 'rgba(253,224,71,0.45)'; g.lineWidth = 2;
    g.strokeRect(320, 56, 252, 210);
    g.beginPath(); g.arc(446, 161, 34, 0, 7); g.stroke();
    // Pitched Orange Dome Camping Tent & Blue Kayak Display (120, 180, 160, 58)
    g.fillStyle = '#334155'; g.fillRect(120, 180, 160, 58);
    g.fillStyle = '#ea580c'; g.beginPath(); g.moveTo(132, 232); g.lineTo(175, 184); g.lineTo(218, 232); g.closePath(); g.fill();
    g.fillStyle = '#0284c7'; g.beginPath(); g.ellipse(246, 209, 26, 10, 0.25, 0, 7); g.fill();
    // Tactical Armor & Rifle Display Cases (120, 430, 160, 46)
    g.fillStyle = '#1e293b'; g.fillRect(120, 430, 160, 46);
    g.strokeStyle = '#f59e0b'; g.lineWidth = 1.8; g.strokeRect(120, 430, 160, 46);
    g.fillStyle = '#94a3b8';
    g.fillRect(134, 444, 42, 6); g.fillRect(190, 444, 46, 6);
    g.fillStyle = '#166534'; g.fillRect(248, 438, 22, 28);
    // Circular Outdoor Apparel & Dumbbell Rack (380, 310, 110, 46)
    g.fillStyle = '#334155'; g.fillRect(380, 310, 110, 46);
    for (let rx = 392; rx < 482; rx += 22) {
      g.fillStyle = rx % 44 === 0 ? '#ef4444' : '#38bdf8'; g.beginPath(); g.arc(rx, 333, 8, 0, 7); g.fill();
    }

    // 4. LUXURY DEPARTMENT STORE & 24/7 PHARMACY (x: 1800..2372, y: 28..700)
    // Marble boutique walkways
    g.fillStyle = 'rgba(244,114,182,0.06)';
    for (let dy = 60; dy < 680; dy += 50) for (let dx = 1820; dx < 2350; dx += 50) {
      if (((dx + dy) / 50) % 2 === 0) g.fillRect(dx, dy, 50, 50);
    }
    // Mirrored Cosmetics & Perfume Island (1960, 200, 160, 54)
    g.fillStyle = '#831843'; g.fillRect(1960, 200, 160, 54);
    g.strokeStyle = '#f472b6'; g.lineWidth = 2; g.strokeRect(1960, 200, 160, 54);
    for (let px = 1978; px < 2108; px += 26) {
      g.fillStyle = px % 52 === 0 ? '#fde047' : '#e879f9';
      g.beginPath(); g.arc(px, 227, 6, 0, 7); g.fill();
    }
    // Boutique Fashion Racks (1960, 430, 160, 44) & Shoe Wall
    g.fillStyle = '#4c0519'; g.fillRect(1960, 430, 160, 44);
    for (let fx = 1975; fx < 2110; fx += 24) {
      g.fillStyle = fx % 48 === 0 ? '#fb7185' : '#38bdf8'; g.fillRect(fx, 438, 12, 28);
    }
    // 24/7 Pharmacy Green Cross & Shelves (NE corner)
    g.fillStyle = '#10b981';
    g.fillRect(2316, 95, 14, 38); g.fillRect(2304, 107, 38, 14);

    // 5. MEGA FOOD COURT & GOURMET PAVILION (x: 28..600, y: 720..1472)
    for (let fy = 740; fy < 1450; fy += 40) for (let fx = 40; fx < 580; fx += 40) {
      if (((fx + fy) / 40) % 2 === 0) { g.fillStyle = 'rgba(251,146,60,0.09)'; g.fillRect(fx, fy, 40, 40); }
    }
    // 4 Colorful Gourmet Kitchen Stalls along West Strip (48, 820, 72, 460)
    const stallThemes = [
      ['BURGER', '#dc2626', '#fbbf24'],
      ['SUSHI', '#0284c7', '#f8fafc'],
      ['TACO', '#d97706', '#4ade80'],
      ['BOBA', '#db2777', '#fde047']
    ];
    for (let si = 0; si < 4; si++) {
      const sy = 824 + si * 114;
      g.fillStyle = '#1e293b'; g.fillRect(48, sy, 72, 108);
      g.fillStyle = stallThemes[si][1]; g.fillRect(50, sy + 2, 18, 104);
      g.fillStyle = stallThemes[si][2]; g.fillRect(74, sy + 14, 34, 24);
      g.fillStyle = '#f8fafc'; g.fillRect(96, sy + 52, 22, 40);
      g.font = 'bold 9px system-ui'; g.fillStyle = '#ffffff'; g.textAlign = 'center';
      g.fillText(stallThemes[si][0], 84, sy + 98);
    }
    // 4 Diner Table Islands with Chairs, Trays & Soda Cups (240/420, 860/1080)
    for (const [tx, ty] of [[240, 860], [420, 860], [240, 1080], [420, 1080]]) {
      g.fillStyle = '#78350f'; g.fillRect(tx, ty, 90, 48);
      g.strokeStyle = '#fb923c'; g.lineWidth = 1.5; g.strokeRect(tx, ty, 90, 48);
      g.fillStyle = '#f8fafc'; g.fillRect(tx + 14, ty + 12, 24, 18); g.fillRect(tx + 52, ty + 16, 24, 18);
      g.fillStyle = '#ef4444'; g.beginPath(); g.arc(tx + 26, ty + 21, 4, 0, 7); g.fill();
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(tx + 64, ty + 25, 4, 0, 7); g.fill();
      g.fillStyle = '#ea580c';
      g.fillRect(tx + 18, ty - 10, 18, 8); g.fillRect(tx + 54, ty - 10, 18, 8);
      g.fillRect(tx + 18, ty + 50, 18, 8); g.fillRect(tx + 54, ty + 50, 18, 8);
    }

    // 6. ARMORED JEWELRY SALON & SECURITY VAULT (x: 1800..2372, y: 720..1472)
    // Crimson VIP Carpet & CCTV Desk (1920, 830, 150, 44)
    g.fillStyle = '#7f1d1d'; g.fillRect(2165, 760, 120, 620);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(2165, 760, 120, 620);
    g.fillStyle = '#0f172a'; g.fillRect(1920, 830, 150, 44);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(1920, 830, 150, 44);
    for (let mx = 1934; mx < 2056; mx += 32) {
      g.fillStyle = '#22c55e'; g.fillRect(mx, 838, 22, 14);
    }
    // Diamond Display Vitrines (1940, 1080, 140, 54) + Stacked Gold Bullion
    g.fillStyle = '#1e293b'; g.fillRect(1940, 1080, 140, 54);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(1940, 1080, 140, 54);
    for (const dx of [1970, 2010, 2050]) {
      g.fillStyle = '#7dd3fc';
      g.beginPath(); g.moveTo(dx, 1096); g.lineTo(dx + 10, 1107); g.lineTo(dx, 1118); g.lineTo(dx - 10, 1107); g.closePath(); g.fill();
    }
    // Gold Bullion Pallets near Vault
    for (const bx of [2240, 2295]) {
      g.fillStyle = '#f59e0b'; g.fillRect(bx, 1160, 38, 26);
      g.fillStyle = '#fde047'; g.fillRect(bx + 4, 1164, 12, 18); g.fillRect(bx + 20, 1164, 12, 18);
    }

    g.font = 'bold 11px system-ui'; g.fillStyle = 'rgba(226,232,240,0.45)'; g.textAlign = 'center';
    g.fillText('← SPORTING GOODS', 530, 340); g.fillText('DEPT STORE →', 1850, 340);
    g.fillText('← FOOD COURT', 530, 1070); g.fillText('JEWELRY VAULT →', 1850, 1070);
    g.fillText('TECH EMPORIUM & ARCADE ↑', 1200, 412);
  } else if (mode === 'military') {
    // Motorpool Bay with Armored APC Under Overhead Crane Gantry (SW)
    g.strokeStyle = 'rgba(245,158,11,0.38)'; g.lineWidth = 3;
    g.strokeRect(54, 670, 470, 260);
    g.fillStyle = '#365314'; g.fillRect(210, 745, 160, 84);
    g.strokeStyle = '#84cc16'; g.lineWidth = 2; g.strokeRect(210, 745, 160, 84);
    g.fillStyle = '#1e293b'; g.beginPath(); g.arc(290, 787, 24, 0, 7); g.fill();
    g.fillStyle = '#4d7c0f'; g.fillRect(290, 782, 92, 10);
    g.fillStyle = '#dc2626'; g.fillRect(74, 710, 32, 68);
    g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(88, 860, 14, 0, 7); g.arc(124, 860, 14, 0, 7); g.fill();
    g.font = 'bold 16px system-ui'; g.fillStyle = 'rgba(245,158,11,0.28)'; g.textAlign = 'center';
    g.fillText('MOTORPOOL BAY 01 — APC OVERHAUL', 288, 700);
    // Armory Rifle & Heavy Launcher Racks (NW)
    g.fillStyle = '#291f14'; g.fillRect(52, 180, 36, 240);
    g.strokeStyle = '#f59e0b'; g.lineWidth = 1.6; g.strokeRect(52, 180, 36, 240);
    for (let wy = 198; wy < 408; wy += 24) {
      g.fillStyle = '#94a3b8'; g.fillRect(58, wy, 24, 5);
      g.fillStyle = '#fbbf24'; g.fillRect(74, wy + 1, 6, 3);
    }
    g.fillStyle = '#365314'; g.fillRect(180, 180, 160, 44);
    g.strokeStyle = '#a3e635'; g.lineWidth = 1.5; g.strokeRect(180, 180, 160, 44);
    // Barracks Double-Bunks & Footlockers (NE)
    for (const by of [90, 175, 290, 375, 480]) {
      g.fillStyle = '#1e293b'; g.fillRect(1390, by, 76, 36);
      g.fillStyle = '#f8fafc'; g.fillRect(1394, by + 6, 16, 24);
      g.fillStyle = '#365314'; g.fillRect(1412, by + 4, 48, 28);
      g.fillStyle = '#78350f'; g.fillRect(1472, by + 8, 18, 20);
    }
    // Sandbag Bunkers & Guardhouse Hazard Stripes (S-Center)
    for (const gx of [690, 1090]) {
      g.fillStyle = '#854d0e'; g.fillRect(gx, 940, 140, 36);
      g.strokeStyle = '#ca8a04'; g.lineWidth = 1.5; g.strokeRect(gx, 940, 140, 36);
    }
    // Heavy Missile & Ordnance Pallets in Vault (SE)
    for (const oy of [850, 910]) {
      g.fillStyle = '#365314'; g.fillRect(1690, oy, 110, 32);
      g.fillStyle = '#ef4444'; g.fillRect(1780, oy + 6, 18, 20);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(226,232,240,0.38)'; g.textAlign = 'center';
    g.fillText('← ARMORY', 520, 305); g.fillText('BARRACKS →', 1390, 305);
    g.fillText('← MOTORPOOL', 520, 925); g.fillText('ORDNANCE VAULT →', 1410, 925);
    g.fillText('WAR ROOM ↑', 960, 720);
  } else if (mode === 'historic') {
    g.fillStyle = '#7f1d1d'; g.fillRect(855, 220, 90, 840);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.strokeRect(855, 220, 90, 840);
    g.strokeStyle = 'rgba(251,191,36,0.36)'; g.lineWidth = 3;
    g.beginPath(); g.arc(900, 340, 122, 0, 7); g.stroke();
    g.beginPath(); g.arc(900, 340, 84, 0, 7); g.stroke();
    const glassCols = ['rgba(56,189,248,0.14)', 'rgba(244,114,182,0.14)', 'rgba(251,191,36,0.16)'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = glassCols[i];
      g.fillRect(600, 160 + i * 160, 120, 64);
      g.fillRect(1080, 160 + i * 160, 120, 64);
    }
    g.fillStyle = '#5c3317';
    for (let py = 490; py <= 610; py += 38) {
      g.fillRect(720, py, 100, 16); g.fillRect(980, py, 100, 16);
      g.fillStyle = '#991b1b'; g.fillRect(724, py + 3, 92, 6); g.fillRect(984, py + 3, 92, 6);
      g.fillStyle = '#5c3317';
    }
    g.fillStyle = '#ca8a04'; g.fillRect(185, 780, 40, 26); g.fillRect(365, 780, 40, 26);
    g.fillStyle = '#fef3c7';
    g.fillRect(1430, 250, 22, 16); g.fillRect(1480, 250, 22, 16); g.fillRect(1430, 410, 24, 16);
    g.fillStyle = '#f59e0b'; g.fillRect(1490, 1020, 60, 38);
    g.fillStyle = '#fde047'; g.beginPath(); g.arc(1520, 1039, 9, 0, 7); g.fill();
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,230,138,0.48)'; g.textAlign = 'center';
    g.fillText('← RELIQUARY', 515, 300); g.fillText('SCRIPTORIUM →', 1275, 300);
    g.fillText('← CATACOMBS', 515, 900); g.fillText('TREASURY →', 1275, 900);
    g.fillText('SANCTUM ↑', 900, 685);
  } else if (mode === 'museum') {
    for (let ry = 40; ry < 1180; ry += 50) for (let rx = 570; rx < 1290; rx += 50) {
      if (((rx + ry) / 50) % 2 === 0) { g.fillStyle = 'rgba(15,23,42,0.06)'; g.fillRect(rx, ry, 50, 50); }
    }
    g.fillStyle = '#881337'; g.fillRect(880, 420, 100, 640);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(880, 420, 100, 640);
    // Fossil Dinosaur Skeleton mounted on Central Rotunda Pedestal (870,320,120,80)
    g.strokeStyle = '#fef3c7'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(892, 360); g.lineTo(968, 360); g.stroke();
    for (let rx2 = 906; rx2 <= 952; rx2 += 11) {
      g.beginPath(); g.moveTo(rx2, 344); g.lineTo(rx2, 376); g.stroke();
    }
    g.fillStyle = '#fef3c7'; g.fillRect(962, 350, 18, 20);
    g.strokeStyle = '#dc2626'; g.lineWidth = 2.5; g.strokeRect(840, 295, 180, 130);
    g.fillStyle = '#eab308';
    for (const [vx, vy] of [[840, 295], [1020, 295], [840, 425], [1020, 425]]) {
      g.beginPath(); g.arc(vx, vy, 5, 0, 7); g.fill();
    }
    for (let gy = 140; gy <= 460; gy += 80) {
      g.fillStyle = '#854d0e'; g.fillRect(42, gy, 14, 52);
      g.fillStyle = gy % 160 === 140 ? '#38bdf8' : '#f472b6'; g.fillRect(46, gy + 6, 7, 40);
    }
    // Banquet platters in State Council Hall
    g.fillStyle = '#e2e8f0';
    for (let px = 1500; px <= 1620; px += 40) { g.beginPath(); g.arc(px, 282, 8, 0, 7); g.fill(); }
    for (let bx = 1620; bx <= 1720; bx += 48) {
      g.fillStyle = '#f59e0b'; g.fillRect(bx, 850, 34, 24);
      g.fillStyle = '#fde047'; g.fillRect(bx + 4, 854, 10, 16); g.fillRect(bx + 18, 854, 10, 16);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(15,23,42,0.58)'; g.textAlign = 'center';
    g.fillText('← GALLERY', 495, 305); g.fillText('COUNCIL HALL →', 1355, 305);
    g.fillText('← ARCHIVES', 495, 915); g.fillText('BULLION VAULT →', 1355, 915);
    g.fillText('ROTUNDA ↑', 930, 695);
  } else if (mode === 'transit') {
    g.fillStyle = 'rgba(56,189,248,0.14)'; g.fillRect(885, 420, 90, 640);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.setLineDash([12, 8]);
    g.beginPath(); g.moveTo(930, 440); g.lineTo(930, 1050); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#475569'; g.lineWidth = 14; g.strokeRect(140, 215, 220, 106);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1.5; g.strokeRect(140, 215, 220, 106);
    g.fillStyle = '#020617'; g.fillRect(720, 56, 420, 22);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(720, 56, 420, 22);
    g.fillStyle = '#22c55e'; g.fillRect(736, 63, 46, 8); g.fillStyle = '#fbbf24'; g.fillRect(800, 63, 56, 8); g.fillStyle = '#38bdf8'; g.fillRect(880, 63, 72, 8);
    g.fillStyle = '#334155'; g.fillRect(845, 645, 170, 56);
    g.fillStyle = '#1e3a8a'; g.fillRect(640, 860, 100, 40); g.fillRect(1120, 860, 100, 40);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(226,232,240,0.42)'; g.textAlign = 'center';
    g.fillText('← BAGGAGE', 475, 305); g.fillText('VIP LOUNGE →', 1375, 305);
    g.fillText('← BISTRO', 475, 915); g.fillText('CUSTOMS VAULT →', 1380, 915);
    g.fillText('CONTROL TOWER ↑', 930, 395);
  } else if (mode === 'airport') {
    g.fillStyle = 'rgba(56,189,248,0.12)'; g.fillRect(1140, 490, 120, 910);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.setLineDash([16, 10]);
    g.beginPath(); g.moveTo(1200, 510); g.lineTo(1200, 1380); g.stroke(); g.setLineDash([]);
    for (const [bx, by, bw, bh] of [[140, 165, 260, 76], [140, 335, 260, 76]]) {
      g.strokeStyle = '#475569'; g.lineWidth = 14; g.strokeRect(bx, by, bw, bh);
      g.strokeStyle = '#fbbf24'; g.lineWidth = 1.6; g.strokeRect(bx, by, bw, bh);
    }
    // Check-In Ticketing Desks (780/1380, 1220)
    for (const cx of [780, 1380]) {
      g.fillStyle = '#0f172a'; g.fillRect(cx, 1220, 240, 44);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.6; g.strokeRect(cx, 1220, 240, 44);
      for (let kx = cx + 24; kx < cx + 224; kx += 48) {
        g.fillStyle = '#38bdf8'; g.fillRect(kx, 1228, 22, 10);
      }
    }
    // TSA Screening Conveyors & X-Ray Monitor Screens (830/1410, 720)
    for (const sx of [830, 1410]) {
      g.fillStyle = '#1e293b'; g.fillRect(sx, 720, 160, 46);
      g.strokeStyle = '#2dd4bf'; g.lineWidth = 1.8; g.strokeRect(sx, 720, 160, 46);
      g.fillStyle = 'rgba(250,204,21,0.18)'; g.fillRect(sx - 18, 702, 196, 82);
      g.fillStyle = '#020617'; g.fillRect(sx + 56, 728, 48, 30);
      g.fillStyle = '#22d3ee'; g.fillRect(sx + 64, 736, 18, 12);
    }
    // North Concourse Jetway Boarding Bridges & Display Wall
    g.fillStyle = 'rgba(56,189,248,0.22)'; g.fillRect(676, 30, 1048, 20);
    for (const jx of [810, 1020, 1360, 1570]) {
      g.fillStyle = '#334155'; g.fillRect(jx, 28, 42, 46);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(jx, 28, 42, 46);
    }
    g.fillStyle = '#020617'; g.fillRect(1040, 56, 320, 22);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(1040, 56, 320, 22);
    for (const [gx, gy] of [[760, 175], [760, 295], [1460, 175], [1460, 295]]) {
      g.fillStyle = '#1e3a8a'; g.fillRect(gx, gy, 160, 28);
      g.strokeStyle = '#60a5fa'; g.lineWidth = 1.2; g.strokeRect(gx, gy, 160, 28);
    }
    // Duty-Free Shelves & Diner Tables (West-Mid 120, 660 / 880)
    g.fillStyle = '#7c2d12'; g.fillRect(120, 660, 160, 40);
    g.fillStyle = '#0f172a'; g.fillRect(120, 880, 160, 40);
    g.fillStyle = '#f472b6'; g.fillRect(138, 892, 26, 16); g.fillStyle = '#fde047'; g.fillRect(184, 892, 26, 16);
    // ATC Radar Console & Plot (1890, 165)
    g.fillStyle = '#020617'; g.fillRect(1890, 165, 220, 44);
    g.strokeStyle = '#0ea5e9'; g.lineWidth = 1.6; g.strokeRect(1890, 165, 220, 44);
    g.strokeStyle = 'rgba(14,165,233,0.32)'; g.lineWidth = 2;
    g.beginPath(); g.arc(2000, 110, 44, 0, 7); g.stroke();
    // Customs Hangar Vault Hazard Perimeter & Gold Bullion Pallets
    g.strokeStyle = 'rgba(239,68,68,0.38)'; g.lineWidth = 3;
    g.strokeRect(1785, 1100, 455, 415);
    for (let bx = 1980; bx <= 2080; bx += 48) {
      g.fillStyle = '#f59e0b'; g.fillRect(bx, 1320, 34, 24);
      g.fillStyle = '#fde047'; g.fillRect(bx + 4, 1324, 10, 16); g.fillRect(bx + 18, 1324, 10, 16);
    }
    // East Aircraft Maintenance Hangar Bay (x: 2280..2772)
    g.fillStyle = 'rgba(30,41,59,0.55)'; g.fillRect(2295, 42, 464, 1564);
    g.strokeStyle = 'rgba(250,204,21,0.55)'; g.lineWidth = 3; g.setLineDash([18, 12]);
    g.strokeRect(2330, 240, 385, 1170); g.setLineDash([]);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(2520, 440); g.lineTo(2520, 1480); g.moveTo(2460, 620); g.lineTo(2580, 620); g.stroke();
    g.fillStyle = '#dc2626'; g.fillRect(2310, 460, 24, 90); g.fillRect(2310, 960, 24, 90);
    g.fillStyle = '#334155'; g.fillRect(2685, 140, 65, 200); g.fillRect(2685, 1300, 65, 200);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
    g.strokeRect(2685, 140, 65, 200); g.strokeRect(2685, 1300, 65, 200);
    g.font = 'bold 12px system-ui'; g.fillStyle = 'rgba(250,204,21,0.65)'; g.textAlign = 'center';
    g.fillText('HANGAR 01 — STRIKE FIGHTER MAINTENANCE BAY', 2526, 210);
    g.font = 'bold 11px system-ui'; g.fillStyle = 'rgba(226,232,240,0.44)'; g.textAlign = 'center';
    g.fillText('← BAGGAGE CLAIM', 560, 260); g.fillText('ATC TOWER →', 1840, 260);
    g.fillText('← DUTY-FREE DINER', 560, 795); g.fillText('VIP LOUNGE →', 1840, 795);
    g.fillText('← CARGO OPS', 560, 1345); g.fillText('CUSTOMS VAULT →', 1840, 1345);
    g.fillText('GATES A1-A3 ↑', 940, 460); g.fillText('GATES B1-B3 ↑', 1460, 460);
  } else if (mode === 'industrial') {
    g.strokeStyle = 'rgba(245,158,11,0.34)'; g.lineWidth = 3;
    g.strokeRect(620, 230, 560, 220);
    g.strokeStyle = '#0ea5e9'; g.lineWidth = 6;
    g.beginPath();
    g.moveTo(240, 255); g.lineTo(780, 255);
    g.moveTo(240, 425); g.lineTo(780, 425);
    g.moveTo(1020, 325); g.lineTo(1430, 325);
    g.stroke();
    g.strokeStyle = '#bae6fd'; g.lineWidth = 1.5; g.stroke();
    // Glowing Coolant Tank Basins (180, 220/390, 120, 70)
    for (const cy of [220, 390]) {
      g.fillStyle = '#0c4a6e'; g.fillRect(184, cy + 4, 112, 62);
      g.fillStyle = '#0ea5e9'; g.fillRect(194, cy + 12, 92, 46);
    }
    for (const ty of [220, 400]) {
      g.fillStyle = '#9a3412'; g.fillRect(1440, ty + 6, 110, 48);
      g.fillStyle = '#ea580c'; g.fillRect(1450, ty + 14, 90, 32);
    }
    g.strokeStyle = '#fb923c'; g.lineWidth = 2.5;
    g.strokeRect(70, 680, 420, 280);
    // CNC Machine & Tool Racks (180, 820)
    g.fillStyle = '#334155'; g.fillRect(180, 820, 140, 50);
    g.fillStyle = '#f59e0b'; g.fillRect(192, 830, 40, 28);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,186,116,0.45)'; g.textAlign = 'center';
    g.fillText('← COOLANT PUMP', 515, 300); g.fillText('SUBSTATION →', 1275, 300);
    g.fillText('← MACHINE SHOP', 515, 900); g.fillText('BREAKER VAULT →', 1275, 900);
    g.fillText('TURBINE HALL ↑', 900, 675);
  } else if (mode === 'police') {
    g.fillStyle = 'rgba(59,130,246,0.12)'; g.fillRect(855, 720, 90, 420);
    g.fillStyle = '#0f172a'; g.fillRect(820, 310, 160, 46);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.6; g.strokeRect(820, 310, 160, 46);
    for (let sx = 836; sx < 970; sx += 30) { g.fillStyle = '#38bdf8'; g.fillRect(sx, 320, 20, 12); }
    for (const ry of [200, 380]) {
      g.fillStyle = '#1e293b'; g.fillRect(160, ry, 150, 44);
      g.strokeStyle = '#60a5fa'; g.lineWidth = 1.5; g.strokeRect(160, ry, 150, 44);
      for (let gx = 172; gx < 298; gx += 20) { g.fillStyle = '#94a3b8'; g.fillRect(gx, ry + 8, 6, 28); }
    }
    for (const cy of [160, 340]) {
      g.fillStyle = '#020617'; g.fillRect(1420, cy - 80, 150, 80);
      g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.strokeRect(1420, cy, 150, 20);
      for (let bx = 1430; bx < 1565; bx += 16) { g.fillStyle = '#cbd5e1'; g.fillRect(bx, cy, 4, 20); }
    }
    g.fillStyle = '#78350f'; g.fillRect(46, 700, 20, 140);
    g.fillStyle = '#f8fafc'; g.fillRect(48, 712, 14, 26); g.fillStyle = '#ef4444'; g.fillRect(48, 750, 14, 24);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(147,197,253,0.48)'; g.textAlign = 'center';
    g.fillText('← SWAT ARMORY', 520, 300); g.fillText('CELLS →', 1270, 300);
    g.fillText('← CRIME LAB', 520, 900); g.fillText('EVIDENCE VAULT →', 1270, 900);
    g.fillText('DISPATCH ↑', 900, 670);
  } else if (mode === 'fire') {
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.setLineDash([12, 8]);
    g.strokeRect(80, 150, 420, 210); g.setLineDash([]);
    g.fillStyle = '#b91c1c'; g.fillRect(150, 210, 260, 90);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(150, 210, 260, 90);
    g.fillStyle = '#e2e8f0'; g.fillRect(166, 224, 52, 62);
    g.fillStyle = '#38bdf8'; g.fillRect(365, 224, 34, 62);
    g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(900, 260, 18, 0, 7); g.fill(); g.strokeStyle = '#78350f'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#0f172a'; g.fillRect(760, 320, 280, 44);
    for (const [bx, by] of [[1400, 100], [1560, 100], [1400, 280], [1560, 280]]) {
      g.fillStyle = '#991b1b'; g.fillRect(bx, by, 76, 36);
      g.fillStyle = '#f8fafc'; g.fillRect(bx + 6, by + 6, 16, 24);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(254,202,202,0.5)'; g.textAlign = 'center';
    g.fillText('← ENGINE BAY', 520, 300); g.fillText('BUNKHOUSE →', 1270, 300);
    g.fillText('← HAZMAT BAY', 520, 900); g.fillText('RESCUE VAULT →', 1270, 900);
    g.fillText('ALARM DISPATCH ↑', 900, 670);
  } else if (mode === 'bank') {
    g.fillStyle = '#7f1d1d'; g.fillRect(880, 420, 100, 640);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(880, 420, 100, 640);
    for (const tx of [720, 980]) {
      g.fillStyle = '#5c2d0c'; g.fillRect(tx, 290, 160, 42);
      g.fillStyle = 'rgba(125,211,252,0.55)'; g.fillRect(tx, 285, 160, 5);
    }
    for (const dy of [180, 380]) {
      g.fillStyle = '#334155'; g.fillRect(130, dy, 130, 42);
      g.strokeStyle = '#fbbf24'; g.lineWidth = 1.5; g.strokeRect(130, dy, 130, 42);
    }
    g.fillStyle = '#451a03'; g.fillRect(1460, 250, 200, 66);
    g.fillStyle = '#334155'; g.beginPath(); g.arc(1570, 640, 28, 0, 7); g.fill();
    g.strokeStyle = '#fbbf24'; g.lineWidth = 3; g.stroke();
    for (let bx = 1520; bx <= 1690; bx += 44) {
      g.fillStyle = '#f59e0b'; g.fillRect(bx, 980, 34, 24);
      g.fillStyle = '#fde047'; g.fillRect(bx + 4, 984, 10, 16); g.fillRect(bx + 18, 984, 10, 16);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(15,23,42,0.6)'; g.textAlign = 'center';
    g.fillText('← SAFE DEPOSIT', 495, 305); g.fillText('BOARDROOM →', 1355, 305);
    g.fillText('← CURRENCY MINT', 495, 915); g.fillText('BULLION VAULT →', 1355, 915);
    g.fillText('TELLER HALL ↑', 930, 695);
  } else if (mode === 'stadium') {
    g.fillStyle = 'rgba(22,163,74,0.22)'; g.fillRect(620, 60, 680, 640);
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2.5; g.strokeRect(640, 80, 640, 600);
    g.beginPath(); g.arc(960, 352, 76, 0, 7); g.stroke();
    g.fillStyle = '#1e293b'; g.fillRect(810, 320, 300, 64);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(810, 320, 300, 64);
    for (const [tx, ty] of [[870, 352], [960, 352], [1050, 352]]) {
      g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(tx, ty, 12, 0, 7); g.fill();
    }
    for (const ly of [210, 390]) {
      g.fillStyle = '#78350f'; g.fillRect(160, ly, 140, 36);
      g.fillStyle = '#22c55e'; g.fillRect(172, ly + 8, 20, 20); g.fillStyle = '#38bdf8'; g.fillRect(268, ly + 8, 20, 20);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(134,239,172,0.5)'; g.textAlign = 'center';
    g.fillText('← LOCKER ROOM', 520, 305); g.fillText('PRESS BOX →', 1390, 305);
    g.fillText('← CONCESSIONS', 520, 925); g.fillText('TROPHY VAULT →', 1410, 925);
    g.fillText('VIP SKYBOX ↑', 960, 720);
  } else if (mode === 'aquarium') {
    g.fillStyle = '#0369a1'; g.fillRect(120, 170, 260, 72);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2.5; g.strokeRect(120, 170, 260, 72);
    g.fillStyle = '#f43f5e'; g.beginPath(); g.arc(165, 224, 9, 0, 7); g.fill();
    g.fillStyle = '#10b981'; g.fillRect(320, 184, 8, 46); g.fillRect(340, 192, 8, 38);
    g.fillStyle = '#075985'; g.fillRect(760, 240, 340, 120);
    g.strokeStyle = '#7dd3fc'; g.lineWidth = 3; g.strokeRect(760, 240, 340, 120);
    g.fillStyle = '#bae6fd'; g.fillRect(140, 780, 220, 90);
    g.fillStyle = '#0284c7'; g.fillRect(165, 796, 170, 58);
    g.fillStyle = '#0f172a'; g.fillRect(1460, 180, 160, 44); g.fillRect(1460, 360, 160, 44);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(125,211,252,0.52)'; g.textAlign = 'center';
    g.fillText('← CORAL TUNNEL', 495, 305); g.fillText('MARINE LAB →', 1355, 305);
    g.fillText('← PENGUIN COVE', 495, 915); g.fillText('PEARL VAULT →', 1355, 915);
    g.fillText('SHARK ROTUNDA ↑', 930, 695);
  } else if (mode === 'science') {
    g.strokeStyle = 'rgba(167,139,250,0.34)'; g.lineWidth = 2;
    g.beginPath(); g.arc(930, 350, 140, 0, 7); g.stroke();
    g.beginPath(); g.arc(930, 350, 95, 0, 7); g.stroke();
    g.fillStyle = '#0f172a'; g.fillRect(870, 310, 120, 80);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(870, 310, 120, 80);
    for (const ry of [210, 390]) {
      g.fillStyle = '#1e293b'; g.fillRect(150, ry, 140, 44);
      g.fillStyle = '#38bdf8'; g.fillRect(165, ry + 10, 36, 20);
      g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(255, ry + 22, 10, 0, 7); g.fill();
    }
    g.fillStyle = '#e2e8f0'; g.fillRect(1510, 110, 80, 26);
    g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(1590, 110); g.lineTo(1620, 123); g.lineTo(1590, 136); g.closePath(); g.fill();
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(196,181,253,0.52)'; g.textAlign = 'center';
    g.fillText('← ROBOTICS LAB', 495, 305); g.fillText('ROCKETRY →', 1355, 305);
    g.fillText('← ACCELERATOR', 495, 915); g.fillText('PROTOTYPE VAULT →', 1355, 915);
    g.fillText('PLANETARIUM ↑', 930, 695);
  } else if (mode === 'bazaar') {
    g.fillStyle = 'rgba(153,27,27,0.45)'; g.fillRect(720, 180, 420, 320);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.strokeRect(726, 186, 408, 308);
    g.fillStyle = '#78350f'; g.fillRect(760, 290, 340, 80);
    g.fillStyle = '#0284c7'; g.beginPath(); g.ellipse(930, 330, 86, 26, 0, 0, 7); g.fill();
    const bCols = ['#dc2626', '#f59e0b', '#22c55e', '#c084fc'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = bCols[i]; g.beginPath(); g.arc(160 + i * 28, 192, 9, 0, 7); g.fill();
      g.fillStyle = bCols[(i + 1) % 4]; g.beginPath(); g.arc(360 + i * 28, 192, 9, 0, 7); g.fill();
    }
    for (const cy of [190, 380]) {
      g.fillStyle = '#991b1b'; g.fillRect(1460, cy, 150, 44);
      g.strokeStyle = '#fbbf24'; g.lineWidth = 1.6; g.strokeRect(1466, cy + 5, 138, 34);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,230,138,0.52)'; g.textAlign = 'center';
    g.fillText('← SPICE SOUK', 495, 305); g.fillText('CARPETS →', 1355, 305);
    g.fillText('← CHAI PAVILION', 495, 915); g.fillText('GUILD TREASURY →', 1355, 915);
    g.fillText('LANTERN COURT ↑', 930, 695);
  } else if (mode === 'pyramid') {
    g.fillStyle = 'rgba(251,191,36,0.14)'; g.fillRect(855, 290, 90, 800);
    g.fillStyle = '#d97706'; g.fillRect(830, 290, 140, 64);
    g.strokeStyle = '#fef08a'; g.lineWidth = 3; g.strokeRect(830, 290, 140, 64);
    g.fillStyle = '#fbbf24'; g.beginPath(); g.ellipse(900, 322, 46, 18, 0, 0, 7); g.fill();
    for (const [ox, oy] of [[680, 190], [1076, 190], [680, 430], [1076, 430]]) {
      g.fillStyle = '#78350f'; g.fillRect(ox, oy, 44, 44);
      g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(ox, oy, 44, 44);
    }
    for (const cx of [150, 330]) {
      g.fillStyle = '#451a03'; g.fillRect(cx, 800, 120, 48);
      g.fillStyle = '#fbbf24';
      for (let jx = cx + 20; jx < cx + 108; jx += 26) { g.beginPath(); g.arc(jx, 824, 6, 0, 7); g.fill(); }
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,230,138,0.55)'; g.textAlign = 'center';
    g.fillText('← ANTECHAMBER', 520, 300); g.fillText('STAR SANCTUARY →', 1270, 300);
    g.fillText('← CANOPIC WING', 520, 900); g.fillText('PHARAOH VAULT →', 1270, 900);
    g.fillText('SARCOPHAGUS ↑', 900, 675);
  } else if (mode === 'mosque') {
    g.fillStyle = '#065f46'; g.fillRect(610, 80, 580, 580);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.strokeRect(618, 88, 564, 564);
    g.strokeStyle = 'rgba(251,191,36,0.34)'; g.lineWidth = 2;
    g.beginPath(); g.arc(900, 350, 118, 0, 7); g.stroke();
    g.beginPath(); g.arc(900, 350, 76, 0, 7); g.stroke();
    g.fillStyle = '#fbbf24'; g.fillRect(830, 130, 140, 36);
    g.fillStyle = '#0284c7'; g.fillRect(220, 260, 110, 110);
    g.strokeStyle = '#bae6fd'; g.lineWidth = 2.5; g.strokeRect(220, 260, 110, 110);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(167,243,208,0.55)'; g.textAlign = 'center';
    g.fillText('← ABLUTIONS', 520, 300); g.fillText('MANUSCRIPTS →', 1270, 300);
    g.fillText('← TILE CLOISTER', 520, 900); g.fillText('RELIC TREASURY →', 1270, 900);
    g.fillText('PRAYER HALL ↑', 900, 675);
  } else if (mode === 'capitol') {
    g.fillStyle = '#1e3a8a'; g.beginPath(); g.arc(930, 440, 96, 0, 7); g.fill();
    g.strokeStyle = '#fbbf24'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#5c2d0c'; g.fillRect(760, 290, 340, 56);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.strokeRect(760, 290, 340, 56);
    g.fillStyle = '#451a03'; g.fillRect(1460, 230, 180, 58);
    for (const sx of [150, 360]) {
      g.fillStyle = '#78350f'; g.fillRect(sx, 810, 26, 220);
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(15,23,42,0.62)'; g.textAlign = 'center';
    g.fillText('← SUPREME COURT', 495, 305); g.fillText('DIPLOMACY →', 1355, 305);
    g.fillText('← STATUTE ARCHIVE', 495, 915); g.fillText('STATE VAULT →', 1355, 915);
    g.fillText('CAPITOL ROTUNDA ↑', 930, 695);
  } else if (mode === 'palace') {
    g.fillStyle = '#991b1b'; g.fillRect(880, 220, 100, 860);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5; g.strokeRect(880, 220, 100, 860);
    g.fillStyle = '#f59e0b'; g.fillRect(830, 155, 200, 56);
    g.fillStyle = '#7f1d1d'; g.fillRect(896, 164, 68, 38);
    g.fillStyle = '#5c2d0c'; g.fillRect(1460, 240, 180, 68);
    g.fillStyle = '#f8fafc';
    for (let px = 1485; px <= 1615; px += 32) { g.beginPath(); g.arc(px, 274, 7, 0, 7); g.fill(); }
    g.fillStyle = '#0f172a'; g.fillRect(170, 220, 150, 44);
    g.fillStyle = '#f8fafc'; g.fillRect(184, 232, 110, 12);
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,230,138,0.52)'; g.textAlign = 'center';
    g.fillText('← BALLROOM', 495, 305); g.fillText('BANQUET HALL →', 1355, 305);
    g.fillText('← GUARD BARRACKS', 495, 915); g.fillText('CROWN VAULT →', 1355, 915);
    g.fillText('THRONE HALL ↑', 930, 695);
  } else if (mode === 'greenhouse') {
    g.fillStyle = '#0284c7'; g.fillRect(830, 300, 200, 90);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 3; g.strokeRect(830, 300, 200, 90);
    g.fillStyle = '#22c55e';
    for (const [lx, ly] of [[870, 345], [930, 330], [985, 355]]) { g.beginPath(); g.arc(lx, ly, 12, 0, 7); g.fill(); }
    for (const [bx, by] of [[130, 180], [320, 180], [130, 380]]) {
      g.fillStyle = '#78350f'; g.fillRect(bx, by, 140, 44);
      for (let fx = bx + 20; fx < bx + 130; fx += 26) {
        g.fillStyle = '#15803d'; g.beginPath(); g.arc(fx, by + 22, 11, 0, 7); g.fill();
        g.fillStyle = fx % 52 === 0 ? '#f472b6' : '#fde047'; g.beginPath(); g.arc(fx, by + 22, 4, 0, 7); g.fill();
      }
    }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(134,239,172,0.55)'; g.textAlign = 'center';
    g.fillText('← ORCHID WING', 520, 300); g.fillText('SEED LAB →', 1270, 300);
    g.fillText('← CITRUS GROVE', 520, 900); g.fillText('FLORA VAULT →', 1270, 900);
    g.fillText('PALM DOME ↑', 900, 675);
  } else if (mode === 'mill') {
    for (const hy of [210, 390]) {
      g.fillStyle = '#a16207'; g.fillRect(160, hy, 150, 56);
      g.fillStyle = '#fde047'; g.fillRect(172, hy + 10, 126, 36);
    }
    g.fillStyle = '#475569'; g.fillRect(820, 280, 160, 90);
    g.fillStyle = '#94a3b8'; g.beginPath(); g.arc(900, 325, 32, 0, 7); g.fill();
    g.fillStyle = '#334155'; g.fillRect(1440, 210, 160, 54);
    for (let sx = 1456; sx < 1590; sx += 32) { g.fillStyle = '#fef3c7'; g.fillRect(sx, 224, 22, 26); }
    g.font = 'bold 10px system-ui'; g.fillStyle = 'rgba(253,230,138,0.52)'; g.textAlign = 'center';
    g.fillText('← GRAIN HOPPERS', 520, 300); g.fillText('FLOUR BAGGING →', 1270, 300);
    g.fillText('← TRACTOR BAY', 520, 900); g.fillText('PAYMASTER VAULT →', 1270, 900);
    g.fillText('MILLSTONES ↑', 900, 675);
  }

  // Door Threshold Frames
  const doorThresholds = idef.doorThresholds || [
    [590, 240, 20, 120, false], [590, 840, 20, 120, false],
    [1190, 240, 20, 120, false], [1190, 840, 20, 120, false],
    [240, 590, 120, 20, true], [840, 590, 120, 20, true], [1440, 590, 120, 20, true]
  ];
  const accentMap = {
    airport: 'rgba(56,189,248,0.68)',
    hospital: 'rgba(16,185,129,0.55)',
    university: 'rgba(245,158,11,0.55)',
    mall: 'rgba(45,212,191,0.55)',
    historic: 'rgba(234,179,8,0.65)',
    museum: 'rgba(244,114,182,0.55)',
    transit: 'rgba(56,189,248,0.58)',
    industrial: 'rgba(251,146,60,0.6)',
    raid: 'rgba(248,113,113,0.65)',
    military: 'rgba(248,113,113,0.65)',
    police: 'rgba(59,130,246,0.65)',
    fire: 'rgba(239,68,68,0.65)',
    bank: 'rgba(234,179,8,0.68)',
    stadium: 'rgba(34,197,94,0.62)',
    aquarium: 'rgba(34,211,238,0.65)',
    science: 'rgba(167,139,250,0.65)',
    bazaar: 'rgba(245,158,11,0.65)',
    pyramid: 'rgba(251,191,36,0.68)',
    mosque: 'rgba(52,211,153,0.65)',
    capitol: 'rgba(96,165,250,0.65)',
    palace: 'rgba(251,191,36,0.68)',
    greenhouse: 'rgba(74,222,128,0.65)',
    mill: 'rgba(217,119,6,0.65)'
  };
  const doorAccent = accentMap[mode] || 'rgba(56,189,248,0.6)';
  for (const [dx, dy, dw, dh, horiz] of doorThresholds) {
    g.fillStyle = 'rgba(15,23,42,0.26)';
    g.fillRect(dx, dy, dw, dh);
    g.strokeStyle = doorAccent;
    g.lineWidth = 2; g.strokeRect(dx, dy, dw, dh);
    g.fillStyle = '#475569';
    if (horiz) {
      g.fillRect(dx - 8, dy - 2, 12, dh + 4); g.fillRect(dx + dw - 4, dy - 2, 12, dh + 4);
    } else {
      g.fillRect(dx - 2, dy - 8, dw + 4, 12); g.fillRect(dx - 2, dy + dh - 4, dw + 4, 12);
    }
  }

  // Beveled Walls & Solid Fixtures
  const wallFillMap = {
    airport: '#1e293b', university: '#451a03', hospital: '#64748b', mall: '#334155', historic: '#78664e',
    museum: '#475569', transit: '#243447', industrial: '#292e36',
    police: '#172554', fire: '#450a0a', bank: '#57534e', stadium: '#14532d',
    aquarium: '#082f49', science: '#1e1b4b', bazaar: '#7c2d12', pyramid: '#713f12',
    mosque: '#064e3b', capitol: '#475569', palace: '#4c0519', greenhouse: '#14532d', mill: '#451a03'
  };
  const wallEdgeMap = {
    airport: '#38bdf8', university: '#b45309', hospital: '#94a3b8', historic: '#d97706',
    museum: '#cbd5e1', transit: '#38bdf8', industrial: '#f59e0b',
    police: '#3b82f6', fire: '#ef4444', bank: '#eab308', stadium: '#22c55e',
    aquarium: '#22d3ee', science: '#a78bfa', bazaar: '#f59e0b', pyramid: '#fbbf24',
    mosque: '#34d399', capitol: '#cbd5e1', palace: '#fbbf24', greenhouse: '#4ade80', mill: '#d97706'
  };
  const wallFill = wallFillMap[mode] || '#1f2937';
  const wallEdge = wallEdgeMap[mode] || '#64748b';
  for (const w of idef.walls) {
    const [wx, wy, ww, wh] = w;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(wx + 5, wy + 5, ww, wh);
    g.fillStyle = wallFill; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(wx + 2, wy + 2, Math.max(0, ww - 4), Math.max(0, Math.min(8, wh - 4)));
    g.strokeStyle = wallEdge; g.lineWidth = 2; g.strokeRect(wx, wy, ww, wh);
    g.fillStyle = '#475569';
    if (ww > 100 && wh <= 32) {
      for (let px = wx + 32; px < wx + ww - 20; px += 80) g.fillRect(px - 3, wy - 2, 6, wh + 4);
    } else if (wh > 100 && ww <= 32) {
      for (let py = wy + 32; py < wy + wh - 20; py += 80) g.fillRect(wx - 2, py - 3, ww + 4, 6);
    }
  }
  return cv2;
}

function drawActiveInterior(zone, now, selfX, selfY) {
  const idef = currentInteriorDef();
  if (!idef) return;
  const kind = interiorTypeOf(zone);
  const isRaid = kind === 'raid';
  const isBunkerOrRaid = kind === 'bunker' || kind === 'raid';
  const W = idef.w, H = idef.h;
  if (!bunkerStaticCache[kind]) bunkerStaticCache[kind] = buildBunkerStaticCanvas(idef, kind);

  ctx.save();
  ctx.fillStyle = '#040609';
  ctx.fillRect(-1600, -1600, W + 3200, H + 3200);
  const metaB = ENT_META[kind];
  const borderCol = metaB ? metaB.accent : isRaid ? '#ef4444' : '#38bdf8';
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(-22, -22, W + 44, H + 44);

  // Blit cached static interior architecture
  ctx.drawImage(bunkerStaticCache[kind], 0, 0);

  // ═════════ THEME-SPECIFIC ANIMATED OVERLAYS ═════════
  if (isBunkerOrRaid) {
    const flow = (now * 0.16) % 300;
    ctx.fillStyle = isRaid ? '#f87171' : '#c084fc';
    for (let fx = 300 + flow; fx < 1500; fx += 300) {
      ctx.beginPath(); ctx.arc(fx, 300, 3, 0, 7); ctx.arc(fx, 900, 3, 0, 7); ctx.fill();
    }
    const holoPulse = 0.5 + 0.5 * Math.sin(now / 320);
    ctx.strokeStyle = `rgba(56,189,248,${0.4 + holoPulse * 0.45})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(900, 290, 56, 24, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(900, 290, 26 + holoPulse * 10, 12 + holoPulse * 4, 0, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(900, 290); ctx.rotate(now / 700);
    ctx.strokeStyle = 'rgba(56,189,248,0.65)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(48, 0); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const by = 320 + i * 68;
      const ecgY = by + 16 + Math.sin(now / 90 + i) * 3;
      ctx.moveTo(1456, by + 16); ctx.lineTo(1462, ecgY); ctx.lineTo(1472, by + 16);
    }
    ctx.stroke();
    for (let cx2 = 1660; cx2 <= 1720; cx2 += 56) {
      ctx.fillStyle = `rgba(45,212,191,${0.35 + 0.25 * Math.sin(now / 240 + cx2)})`;
      ctx.beginPath(); ctx.arc(cx2, 190, 12, 0, 7); ctx.fill();
    }
    ctx.drawImage(GLOW_SPR.purple, 810, 810, 180, 180);
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(900, 900, 36 + Math.sin(now / 180) * 4, now / 350, now / 350 + 4.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(900, 900, 52, -now / 420, -now / 420 + 3.8); ctx.stroke();

    const laserAlpha = 0.35 + 0.3 * Math.sin(now / 220);
    ctx.strokeStyle = `rgba(239,68,68,${laserAlpha})`; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let ly = 720; ly <= 790; ly += 24) { ctx.moveTo(1260, ly); ctx.lineTo(1720, ly); }
    ctx.stroke();
  } else if (kind === 'university') {
    for (let fx = 1340; fx <= 1660; fx += 80) {
      ctx.fillStyle = `rgba(56,189,248,${0.4 + 0.35 * Math.sin(now / 250 + fx)})`;
      ctx.beginPath(); ctx.arc(fx, 108, 8, 0, 7); ctx.fill();
    }
    ctx.fillStyle = `rgba(74,222,128,${0.35 + 0.3 * Math.sin(now / 200)})`;
    ctx.beginPath(); ctx.arc(1388, 211, 5, 0, 7); ctx.arc(1608, 211, 5, 0, 7); ctx.fill();
  } else if (kind === 'hospital') {
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const [bx, by] of [[660, 220], [1045, 220], [660, 410], [1045, 410]]) {
      const ey = by + 18 + Math.sin(now / 85 + bx) * 4;
      ctx.moveTo(bx + 100, by + 18); ctx.lineTo(bx + 108, ey); ctx.lineTo(bx + 116, by + 18);
    }
    ctx.stroke();
    // Pulsing MRI magnet indicator + quarantine bio-alert beacons
    ctx.strokeStyle = `rgba(56,189,248,${0.35 + 0.35 * Math.sin(now / 260)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(280, 155, 36, 0, 7); ctx.stroke();
    const qAlpha = 0.28 + 0.25 * Math.sin(now / 220);
    ctx.fillStyle = `rgba(239,68,68,${qAlpha})`;
    ctx.beginPath(); ctx.arc(1310, 100, 10, 0, 7); ctx.arc(1720, 100, 10, 0, 7); ctx.fill();
  } else if (kind === 'mall') {
    // 1. Animated Atrium Water Fountain concentric ripples & central water spout (1200, 840)
    const rPulse = (now / 42) % 52;
    ctx.strokeStyle = `rgba(186,230,253,${0.72 - rPulse / 72})`; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(1200, 840, 18 + rPulse, 11 + rPulse * 0.6, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(224,242,254,0.65)';
    for (let j = 0; j < 6; j++) {
      const a = now / 320 + j * Math.PI / 3;
      ctx.beginPath(); ctx.arc(1200 + Math.cos(a) * 14, 840 + Math.sin(a) * 9, 2.2, 0, 7); ctx.fill();
    }
    // 2. Twin Moving Escalator Treads (790..854, 480..580 & 1546..1610, 480..580)
    const stepOff = (now * 0.03) % 14;
    ctx.strokeStyle = 'rgba(148,163,184,0.65)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (const ex of [790, 1546]) {
      const dir = ex < 1200 ? stepOff : 14 - stepOff;
      for (let sy = 490 + dir; sy < 572; sy += 14) {
        ctx.moveTo(ex + 8, sy); ctx.lineTo(ex + 56, sy);
      }
    }
    ctx.stroke();
    // 3. Tech Plaza OLED Screensaver & Flickering Retro Arcade CRT Screens
    const tvHue = Math.floor((now / 35) % 360);
    ctx.fillStyle = `hsla(${tvHue}, 85%, 60%, 0.72)`;
    ctx.fillRect(676, 46, 328, 14);
    ctx.fillStyle = `hsla(${(tvHue + 140) % 360}, 85%, 60%, 0.72)`;
    ctx.fillRect(1396, 46, 328, 14);
    for (let ai = 0; ai < 5; ai++) {
      const ax = 1095 + ai * 46;
      const blink = 0.4 + 0.5 * Math.sin(now / 150 + ai * 1.4);
      ctx.fillStyle = `rgba(56,189,248,${blink})`;
      ctx.fillRect(ax + 4, 253, 18, 9);
    }
    // 4. Sparkling Diamonds & Armored Vault Security Lasers (SE Vault)
    const dSpark = 0.45 + 0.55 * Math.sin(now / 190);
    ctx.fillStyle = `rgba(224,242,254,${dSpark})`;
    for (const dx of [1970, 2010, 2050]) { ctx.beginPath(); ctx.arc(dx, 1107, 3.2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = `rgba(239,68,68,${0.3 + 0.28 * Math.sin(now / 200)})`; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let ly = 930; ly <= 1010; ly += 22) { ctx.moveTo(1820, ly); ctx.lineTo(2340, ly); }
    ctx.stroke();
  } else if (kind === 'military') {
    const holoPulse = 0.5 + 0.5 * Math.sin(now / 300);
    ctx.strokeStyle = `rgba(56,189,248,${0.45 + holoPulse * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(960, 365, 68, 28, 0, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(960, 365); ctx.rotate(now / 620);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(58, 0); ctx.stroke();
    ctx.restore();
    // Motorpool welding arc flash near APC
    if ((now % 2400) < 180) {
      ctx.fillStyle = 'rgba(186,230,253,0.75)';
      ctx.beginPath(); ctx.arc(212, 785, 8, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = `rgba(239,68,68,${0.35 + 0.3 * Math.sin(now / 210)})`; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let ly = 720; ly <= 810; ly += 24) { ctx.moveTo(1400, ly); ctx.lineTo(1860, ly); }
    ctx.stroke();
  } else if (kind === 'historic') {
    for (const [cx2, cy2] of [[845, 165], [900, 165], [955, 165], [640, 260], [1160, 260]]) {
      const flk = 7 + Math.sin(now / 110 + cx2) * 2.5;
      ctx.fillStyle = 'rgba(251,191,36,0.28)';
      ctx.beginPath(); ctx.arc(cx2, cy2, flk * 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(cx2, cy2, flk * 0.55, 0, 7); ctx.fill();
    }
  } else if (kind === 'museum') {
    const spotA = now / 900;
    ctx.fillStyle = 'rgba(251,191,36,0.13)';
    ctx.beginPath(); ctx.arc(930 + Math.cos(spotA) * 55, 360 + Math.sin(spotA) * 35, 42, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(239,68,68,${0.28 + 0.25 * Math.sin(now / 210)})`; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let ly = 760; ly <= 830; ly += 22) { ctx.moveTo(1360, ly); ctx.lineTo(1790, ly); }
    ctx.stroke();
  } else if (kind === 'airport') {
    for (const [cx0, cy0] of [[140, 165], [140, 335]]) {
      const cw = 260, ch = 76, perim = (cw + ch) * 2;
      for (let b = 0; b < 4; b++) {
        const ph = ((now / 42 + b * (perim / 4) + (cy0 > 200 ? 90 : 0)) % perim);
        let bx = cx0, by = cy0;
        if (ph < cw) { bx = cx0 + ph; by = cy0; }
        else if (ph < cw + ch) { bx = cx0 + cw; by = cy0 + (ph - cw); }
        else if (ph < cw * 2 + ch) { bx = cx0 + cw - (ph - cw - ch); by = cy0 + ch; }
        else { bx = cx0; by = cy0 + ch - (ph - cw * 2 - ch); }
        ctx.fillStyle = b % 2 === 0 ? '#0284c7' : '#d97706';
        ctx.fillRect(bx - 10, by - 7, 20, 14);
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 10, by - 7, 20, 14);
      }
    }
    ctx.save(); ctx.translate(2000, 110); ctx.rotate(now / 420);
    ctx.strokeStyle = 'rgba(56,189,248,0.65)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(42, 0); ctx.stroke();
    ctx.restore();
    const gateBlink = 0.45 + 0.45 * Math.sin(now / 260);
    ctx.fillStyle = `rgba(34,197,94,${gateBlink})`;
    ctx.beginPath(); ctx.arc(1062, 67, 5, 0, 7); ctx.arc(1338, 67, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(239,68,68,${0.3 + 0.25 * Math.sin(now / 210)})`; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let ly = 1115; ly <= 1175; ly += 22) { ctx.moveTo(1790, ly); ctx.lineTo(2235, ly); }
    ctx.stroke();
    if (idef.hangarPlane) {
      const hp = idef.hangarPlane;
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(-6, 12, 95, 76, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(45, 0); ctx.lineTo(-42, -96); ctx.lineTo(-70, -96); ctx.lineTo(-42, -14);
      ctx.lineTo(-42, 14); ctx.lineTo(-70, 96); ctx.lineTo(-42, 96); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-58, 0); ctx.lineTo(-98, -42); ctx.lineTo(-110, -42); ctx.lineTo(-92, 0);
      ctx.lineTo(-110, 42); ctx.lineTo(-98, 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(115, 0); ctx.lineTo(50, -16); ctx.lineTo(-95, -14);
      ctx.lineTo(-105, 0); ctx.lineTo(-95, 14); ctx.lineTo(50, 16); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath(); ctx.ellipse(42, 0, 28, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(186,230,253,0.5)';
      ctx.beginPath(); ctx.ellipse(48, -2, 14, 4, 0, 0, 7); ctx.fill();
      if (now % 900 < 450) {
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-56, -96, 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(-56, 96, 4.5, 0, 7); ctx.fill();
      }
      ctx.restore();
      for (const [cx2, cy2] of [[hp.x - 115, hp.y - 115], [hp.x + 115, hp.y - 115], [hp.x - 115, hp.y + 115], [hp.x + 115, hp.y + 115]]) {
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(cx2, cy2, 2.5, 0, 7); ctx.fill();
      }
    }
  } else if (kind === 'transit') {
    for (let b = 0; b < 4; b++) {
      const ph = ((now / 45 + b * 145) % 580);
      let bx = 140, by = 215;
      if (ph < 220) { bx = 140 + ph; by = 215; }
      else if (ph < 326) { bx = 360; by = 215 + (ph - 220); }
      else if (ph < 546) { bx = 360 - (ph - 326); by = 321; }
      else { bx = 140; by = 321 - (ph - 546); }
      ctx.fillStyle = b % 2 === 0 ? '#0284c7' : '#d97706';
      ctx.fillRect(bx - 10, by - 7, 20, 14);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 10, by - 7, 20, 14);
    }
    ctx.save(); ctx.translate(930, 160); ctx.rotate(now / 480);
    ctx.strokeStyle = 'rgba(56,189,248,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(44, 0); ctx.stroke();
    ctx.restore();
  } else if (kind === 'industrial') {
    for (const tx of [845, 955]) {
      ctx.save(); ctx.translate(tx, 325); ctx.rotate((now / 240) * (tx < 900 ? 1 : -1));
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
      for (let b = 0; b < 4; b++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); }
      ctx.restore();
    }
    // Coolant tank bubbles
    for (const cy of [220, 390]) {
      for (let b = 0; b < 3; b++) {
        const bx = 206 + ((now * 0.03 + b * 28) % 70);
        ctx.fillStyle = 'rgba(186,230,253,0.65)';
        ctx.beginPath(); ctx.arc(bx, cy + 28 + (b % 2) * 14, 3, 0, 7); ctx.fill();
      }
    }
    if (Math.random() < 0.35) {
      ctx.strokeStyle = 'rgba(56,189,248,0.8)'; ctx.lineWidth = 2;
      const sx2 = 1445 + Math.random() * 100, sy2 = (Math.random() < 0.5 ? 250 : 430);
      ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(sx2 + (Math.random() - 0.5) * 26, sy2 + (Math.random() - 0.5) * 22); ctx.stroke();
    }
  } else if (kind === 'police') {
    const redOn = (now % 600) < 300;
    ctx.fillStyle = redOn ? 'rgba(239,68,68,0.42)' : 'rgba(59,130,246,0.42)';
    ctx.beginPath(); ctx.arc(900, 110, 14, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(239,68,68,${0.3 + 0.25 * Math.sin(now / 210)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let ly = 720; ly <= 780; ly += 24) { ctx.moveTo(1260, ly); ctx.lineTo(1750, ly); } ctx.stroke();
  } else if (kind === 'fire') {
    const fl = 0.3 + 0.35 * Math.sin(now / 150);
    ctx.fillStyle = `rgba(239,68,68,${fl})`;
    ctx.beginPath(); ctx.arc(165, 218, 9, 0, 7); ctx.arc(165, 292, 9, 0, 7); ctx.fill();
  } else if (kind === 'bank' || kind === 'capitol' || kind === 'palace') {
    ctx.strokeStyle = `rgba(239,68,68,${0.32 + 0.28 * Math.sin(now / 200)})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); for (let ly = 720; ly <= 790; ly += 24) { ctx.moveTo(1340, ly); ctx.lineTo(1810, ly); } ctx.stroke();
  } else if (kind === 'aquarium') {
    for (let f = 0; f < 5; f++) {
      const fx = 780 + ((now * 0.06 + f * 65) % 290);
      const fy = 262 + (f % 3) * 28 + Math.sin(now / 300 + f) * 6;
      ctx.fillStyle = f === 0 ? '#94a3b8' : f % 2 === 0 ? '#fde047' : '#fb7185';
      ctx.beginPath(); ctx.ellipse(fx, fy, f === 0 ? 16 : 7, f === 0 ? 6 : 3.5, 0, 0, 7); ctx.fill();
    }
    for (let f = 0; f < 4; f++) {
      const rx = 140 + ((now * 0.05 + f * 58) % 220);
      ctx.fillStyle = f % 2 === 0 ? '#38bdf8' : '#f472b6';
      ctx.beginPath(); ctx.ellipse(rx, 195 + (f % 2) * 22, 6, 3, 0, 0, 7); ctx.fill();
    }
  } else if (kind === 'science') {
    for (let p = 0; p < 3; p++) {
      const r = 42 + p * 34;
      const a = now / (500 + p * 260) * (p % 2 === 0 ? 1 : -1);
      ctx.fillStyle = ['#38bdf8', '#f59e0b', '#a78bfa'][p];
      ctx.beginPath(); ctx.arc(930 + Math.cos(a) * r, 350 + Math.sin(a) * r, 7, 0, 7); ctx.fill();
    }
  } else if (kind === 'bazaar' || kind === 'pyramid') {
    const pts = kind === 'bazaar' ? [[780, 300], [1080, 300], [880, 120], [980, 120]] : [[702, 212], [1098, 212], [702, 452], [1098, 452]];
    for (const [fx, fy] of pts) {
      const r = 6 + Math.sin(now / 110 + fx) * 2;
      ctx.fillStyle = 'rgba(251,191,36,0.32)'; ctx.beginPath(); ctx.arc(fx, fy, r * 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(fx, fy, r * 0.55, 0, 7); ctx.fill();
    }
  } else if (kind === 'mosque' || kind === 'greenhouse') {
    const cx0 = kind === 'mosque' ? 275 : 930, cy0 = kind === 'mosque' ? 315 : 345;
    const rp = (now / 40) % 36;
    ctx.strokeStyle = `rgba(186,230,253,${0.7 - rp / 52})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx0, cy0, 10 + rp, 0, 7); ctx.stroke();
  } else if (kind === 'mill') {
    ctx.save(); ctx.translate(900, 325); ctx.rotate(now / 420);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); }
    ctx.restore();
  }

  // Interactive Stations
  let nearestSt = null, nearestDist = Infinity;
  for (const st of idef.stations) {
    const d = Math.hypot(st.x - selfX, st.y - selfY);
    if (d <= st.r && d < nearestDist) { nearestDist = d; nearestSt = st; }
  }

  for (const st of idef.stations) {
    const isNear = nearestSt && nearestSt.id === st.id;
    const pulse = 0.5 + 0.5 * Math.sin(now / 260 + st.x * 0.01);
    const padColor = st.kind === 'exit_lift' ? '#38bdf8' : st.kind === 'reactor_core' ? '#c084fc' : st.kind === 'vault_locker' ? '#ef4444' : '#4ade80';

    ctx.fillStyle = isNear ? 'rgba(255,215,0,0.18)' : 'rgba(15,23,42,0.84)';
    ctx.beginPath(); ctx.arc(st.x, st.y, 35, 0, 7); ctx.fill();
    ctx.strokeStyle = isNear ? '#ffd700' : padColor;
    ctx.lineWidth = isNear ? 3 : 2;
    ctx.beginPath(); ctx.arc(st.x, st.y, 35 + (isNear ? pulse * 5 : 0), 0, 7); ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4 + Math.PI / 8;
      const px = st.x + Math.cos(ang) * 23, py = st.y + Math.sin(ang) * 23;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = padColor; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.icon, st.x, st.y + 1);

    ctx.font = 'bold 11px system-ui';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(st.name, st.x, st.y - 45);
    ctx.fillStyle = isNear ? '#ffd700' : '#e2e8f0';
    ctx.fillText(st.name, st.x, st.y - 45);

    if (st.cost > 0) {
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = '#fbbf24';
      ctx.strokeText(`${st.cost} ⚙️`, st.x, st.y + 47);
      ctx.fillText(`${st.cost} ⚙️`, st.x, st.y + 47);
    }

    if (isNear) {
      const prompt = `[E] ${st.name} · ${st.desc}`;
      ctx.font = 'bold 12px system-ui';
      const pw = txtW('bold 12px system-ui', prompt) + 20;
      ctx.fillStyle = 'rgba(8,14,24,0.94)';
      ctx.fillRect(st.x - pw / 2, st.y + 57, pw, 24);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
      ctx.strokeRect(st.x - pw / 2, st.y + 57, pw, 24);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(prompt, st.x, st.y + 69);
    }
  }

  const entInfo = getEntranceInfo(zone);
  const entName = entInfo ? entInfo.name.toUpperCase() : kind.toUpperCase();
  ctx.fillStyle = borderCol;
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  const titleMap = {
    raid: `☢️ MILITARY RAID BUNKER #${zone.slice(5)} · CLEAR GUARDIANS & CRACK VAULT`,
    airport: `✈️ ${entName} · INT'L TERMINAL, ATC TOWER & MAINTENANCE HANGAR`,
    university: `🎓 ${entName} · UNIVERSITY CAMPUS INTERIOR`,
    hospital: `🏥 ${entName} · MEDICAL & QUARANTINE COMPLEX`,
    mall: `🛍️ ${entName} · SHOPPING MALL CONCOURSE`,
    military: `🪖 ${entName} · MILITARY BASE COMMAND`,
    historic: `🏛️ ${entName} · SACRED SANCTUM & ARCHIVES`,
    museum: `🖼️ ${entName} · GRAND EXHIBITION HALL & TREASURY`,
    transit: `🚉 ${entName} · TRANSIT CONCOURSE & CONTROL DECK`,
    industrial: `⚡ ${entName} · POWER PLANT & TURBINE HALL`
  };
  const titleTxt = titleMap[kind] || `🛡️ UNDERGROUND SHELTER BUNKER (PLOT #${zone.slice(7)}) · 6-WING OPERATIONS`;
  ctx.fillText(titleTxt, W / 2, 16);

  ctx.restore();
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
    ctx.drawImage(GLOW_SPR.gold, x - auraR, y - auraR, auraR * 2, auraR * 2);

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
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(4, 6, 18, 15, 0, 0, 7); ctx.fill();
  ctx.rotate(a);
  // Tactical field backpack
  ctx.fillStyle = '#1e293b'; ctx.fillRect(-19, -9, 8, 18);
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.strokeRect(-19, -9, 8, 18);
  if (!TEAM_PAL[col]) {
    const rgb = hex2(col);
    TEAM_PAL[col] = { sh: shade(rgb, 0.72), hi: shade(rgb, 1.25) };
  }
  const tPal = TEAM_PAL[col];
  // Shoulder pauldrons
  ctx.fillStyle = tPal.sh;
  ctx.beginPath(); ctx.ellipse(0, -14, 7, 5, 0, 0, 7); ctx.ellipse(0, 14, 7, 5, 0, 0, 7); ctx.fill();
  const w = p[6] >= 0 ? D.W[p[6]] : null; drawWeapon(w);
  // Armored torso + helmet highlight
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
  ctx.fillStyle = tPal.hi; ctx.beginPath(); ctx.arc(-3, -3, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.stroke();
  // Tactical rig & helmet visor glint
  ctx.fillStyle = 'rgba(15,23,42,.38)'; ctx.beginPath(); ctx.arc(-2, 0, 8.5, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(4, 0, 9, -0.55, 0.55); ctx.stroke();
  // Gloved hands
  ctx.fillStyle = '#d4a373'; ctx.beginPath(); ctx.arc(13, -7, 4, 0, 7); ctx.arc(13, 7, 4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
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
    const name = boardNames.get(p[0]) || '?';
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
      // Slide + polymer frame + underbarrel rail + front tritium sight
      ctx.fillStyle = '#0f172a'; ctx.fillRect(8, -2, 12, 6);
      ctx.fillStyle = '#334155'; ctx.fillRect(8, -3.5, 17, 5);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(14, -3.5, 5, 2);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(23, -2, 2, 2);
      break;
    case 'smg':
      // Compact receiver + forward shroud + vertical grip + curved stick mag
      ctx.fillStyle = '#1e293b'; ctx.fillRect(4, -4, 24, 7);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(2, -3, 6, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(10, -5.5, 10, 2);
      ctx.fillStyle = '#64748b'; ctx.fillRect(28, -2, 7, 3);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(15, 3); ctx.quadraticCurveTo(18, 12, 22, 14); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.fillRect(22, 2, 3, 5);
      break;
    case 'ar':
      // Stock + upper receiver + wood/polymer handguard + banana mag + muzzle brake
      ctx.fillStyle = '#3f2a1d'; ctx.fillRect(0, -3.5, 8, 6);
      ctx.fillStyle = '#181d24'; ctx.fillRect(7, -4, 22, 7);
      ctx.fillStyle = '#7c4d34'; ctx.fillRect(18, -3.5, 12, 6);
      ctx.fillStyle = '#334155'; ctx.fillRect(30, -2, 11, 3);
      ctx.fillStyle = '#d97706'; ctx.fillRect(40, -3, 3.5, 5);
      ctx.fillStyle = '#475569'; ctx.fillRect(12, -6, 9, 2);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(16, 3); ctx.quadraticCurveTo(20, 14, 26, 17); ctx.stroke();
      break;
    case 'sniper':
      // Long chassis + fluted heavy barrel + muzzle brake + illuminated optic + bipod legs
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, -4, 30, 7);
      ctx.fillStyle = '#334155'; ctx.fillRect(32, -2, 25, 3.8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(55, -4, 7, 7.5);
      ctx.fillStyle = '#090d14'; ctx.fillRect(11, -8, 20, 4);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(29, -8, 2.5, 4);
      ctx.fillStyle = '#475569'; ctx.fillRect(12, -9, 3, 6); ctx.fillRect(26, -9, 3, 6);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(36, 2); ctx.lineTo(41, 8); ctx.stroke();
      break;
    case 'shotgun':
      // Hardwood/tactical stock + heavy receiver + ribbed pump + dual under-tube
      ctx.fillStyle = '#5c3a21'; ctx.fillRect(1, -3, 9, 6);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(9, -4, 18, 7.5);
      ctx.fillStyle = '#78350f'; ctx.fillRect(20, 1, 12, 5);
      ctx.fillStyle = '#475569'; ctx.fillRect(27, -3.8, 17, 4);
      ctx.fillStyle = '#334155'; ctx.fillRect(27, 0.5, 14, 2.5);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(13, 2, 4, 2.5);
      break;
    case 'mg':
      // Heavy cooling shroud + rotary/LMG receiver + brass ammo belt + box drum
      ctx.fillStyle = '#1e2430'; ctx.fillRect(4, -5, 32, 10);
      ctx.fillStyle = '#475569'; ctx.fillRect(34, -3.5, 18, 6.5);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(50, -4.5, 5, 8.5);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(14, 5, 9, 6);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(15, 6, 2, 4); ctx.fillRect(19, 6, 2, 4);
      ctx.fillStyle = '#365314'; ctx.fillRect(11, 10, 15, 9);
      break;
    case 'launcher':
      // Olive RPG / AT4 tube + heat shield + flared warhead cone
      ctx.fillStyle = '#365314'; ctx.fillRect(-4, -5, 40, 10);
      ctx.fillStyle = '#78350f'; ctx.fillRect(8, -5.5, 14, 11);
      ctx.fillStyle = '#4b5563';
      ctx.beginPath(); ctx.moveTo(36, -6); ctx.lineTo(50, 0); ctx.lineTo(36, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(48, 0, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(12, 4, 4, 6); ctx.fillRect(26, 4, 4, 6);
      break;
    case 'glauncher':
      // Drum-fed M32 / M79 grenade launcher with revolving 40mm cylinder
      ctx.fillStyle = '#1e293b'; ctx.fillRect(4, -4, 16, 8);
      ctx.fillStyle = '#334155'; ctx.fillRect(15, -7, 13, 14);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(18, -5, 7, 3); ctx.fillRect(18, 2, 7, 3);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(28, -3.5, 14, 7);
      break;
    case 'artillery':
      // Portable heavy recoilless / howitzer cannon tube + breech + muzzle brake
      ctx.fillStyle = '#3f6212'; ctx.fillRect(-2, -6, 24, 12);
      ctx.fillStyle = '#475569'; ctx.fillRect(22, -4, 34, 8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(54, -6, 7, 12);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, -7, 5, 14);
      break;
    case 'mlrs':
      // Multi-tube shoulder rocket pod rack
      ctx.fillStyle = '#365314'; ctx.fillRect(2, -8, 36, 16);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(2, -8, 36, 16);
      ctx.fillStyle = '#ef4444';
      for (const ry of [-5, 0, 5]) { ctx.beginPath(); ctx.arc(38, ry, 2.2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#0f172a'; ctx.fillRect(12, 7, 10, 4);
      break;
    case 'naval':
      // Rotary CIWS / high-rate naval autocannon barrel cluster + dome feed
      ctx.fillStyle = '#475569'; ctx.fillRect(2, -7, 22, 14);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(6, -5, 10, 10);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, -4.5, 28, 2.5); ctx.fillRect(24, -1, 28, 2.5); ctx.fillRect(24, 2.5, 28, 2.5);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(46, -5, 3, 10);
      break;
    case 'missile':
      // Guided tactical missile canister + white/red warhead + stabilizer fins
      ctx.fillStyle = '#334155'; ctx.fillRect(0, -6, 36, 12);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(30, -4, 14, 8);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(44, -4); ctx.lineTo(54, 0); ctx.lineTo(44, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(12, -8, 12, 2);
      break;
    case 'special':
      // Futuristic plasma/laser emitter + glowing core coil + twin focusing prongs
      ctx.fillStyle = '#0f172a'; ctx.fillRect(4, -5.5, 32, 11);
      ctx.fillStyle = '#0284c7'; ctx.fillRect(14, -3.5, 15, 7);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.strokeRect(14, -3.5, 15, 7);
      ctx.fillStyle = '#00e5ff'; ctx.fillRect(36, -4.5, 6, 3); ctx.fillRect(36, 1.5, 6, 3);
      ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(38, 0, 2.2, 0, 7); ctx.fill();
      break;
    case 'sword':
      // Curved fuller steel blade + gold tsuba handguard + wrapped hilt
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(14, 7); ctx.quadraticCurveTo(32, 6, 48, 5); ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(16, 5.5); ctx.lineTo(44, 4.5); ctx.stroke();
      ctx.fillStyle = '#ffd700'; ctx.fillRect(12, 2.5, 3, 9);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(3, 5.5, 9, 3.5);
      break;
    case 'dagger':
      // Tapered double-edged blade + brass crossguard + pommel
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(14, 5.5); ctx.lineTo(32, 7); ctx.lineTo(14, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd700'; ctx.fillRect(13, 3, 2.5, 8);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(6, 5.5, 7, 3);
      break;
    case 'polearm':
      // Long oak shaft + steel halberd spear/axe head
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, 7); ctx.lineTo(58, 7); ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(58, 1); ctx.lineTo(76, 7); ctx.lineTo(58, 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(52, 7, 8, 7);
      break;
    case 'blunt':
      // Reinforced hardwood handle + heavy iron flanged head
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(38, 7); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.fillRect(36, 1, 13, 12);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(39, -1, 7, 16);
      break;
    case 'bow':
      // Recurve limbs + taut bowstring + nocked steel-tipped arrow
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(10, 0, 22, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(10 + Math.cos(-1.25) * 22, Math.sin(-1.25) * 22); ctx.lineTo(10 + Math.cos(1.25) * 22, Math.sin(1.25) * 22); ctx.stroke();
      ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(38, 0); ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(41, 0); ctx.lineTo(35, -3); ctx.lineTo(35, 3); ctx.closePath(); ctx.fill();
      break;
    case 'throwing':
      // Metallic shuriken / tomahawk in throwing hand
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const ka = k * Math.PI / 2;
        ctx.lineTo(18 + Math.cos(ka) * 7, 7 + Math.sin(ka) * 7);
        ctx.lineTo(18 + Math.cos(ka + 0.78) * 2.5, 7 + Math.sin(ka + 0.78) * 2.5);
      }
      ctx.closePath(); ctx.fill();
      break;
    case 'siege':
      // Heavy portable ballista/scorpion frame with bow arms & bolt
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(42, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(28, 0, 18, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(48, 0); ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 1, 20, 5);
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
  ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.beginPath(); ctx.ellipse(4, 6, r + 2, r - 1, 0, 0, 7); ctx.fill();
  ctx.rotate(a);
  // Anatomical shoulders (using precomputed palette colors for zero per-frame hex parsing)
  ctx.fillStyle = d._shC || d.c;
  ctx.beginPath(); ctx.ellipse(-1, -r * 0.65, r * 0.45, r * 0.34, 0, 0, 7); ctx.ellipse(-1, r * 0.65, r * 0.45, r * 0.34, 0, 0, 7); ctx.fill();
  const reach = (f & 8) ? r + 14 : r + 7, sway = Math.sin(now / 160 + z[0]) * 3;
  ctx.strokeStyle = d._armC || d.c; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.6); ctx.lineTo(reach, -r * 0.5 + sway);
  ctx.moveTo(r * 0.3, r * 0.6); ctx.lineTo(reach, r * 0.5 - sway); ctx.stroke();
  // Bloodied claw tips
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath(); ctx.arc(reach, -r * 0.5 + sway, 2.5, 0, 7); ctx.arc(reach, r * 0.5 - sway, 2.5, 0, 7); ctx.fill();
  // Shaded cranial body (radial gradient only on bosses; crisp fast highlight on regular hordes)
  if (d.boss) {
    const zg = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 1, 0, 0, r);
    zg.addColorStop(0, d._hiC || d.c); zg.addColorStop(1, d.c);
    ctx.fillStyle = zg;
  } else {
    ctx.fillStyle = d.c;
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  if (!d.boss) {
    ctx.fillStyle = d._hiC || d.c;
    ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.22, r * 0.52, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.stroke();
  const t = D.ZLIST[z[1]];
  if (t === 'riot') { ctx.fillStyle = 'rgba(180,200,230,.85)'; ctx.fillRect(r - 2, -r, 6, r * 2); }
  if (t === 'soldier') { ctx.fillStyle = '#3b4220'; ctx.beginPath(); ctx.arc(-2, 0, r * 0.72, 0, 7); ctx.fill(); }
  if (t === 'hazmat') { ctx.fillStyle = '#222'; ctx.fillRect(r * 0.2, -r * 0.4, r * 0.6, r * 0.8); }
  if (t === 'mummy') {
    ctx.strokeStyle = 'rgba(120,100,70,.65)'; ctx.lineWidth = 2;
    for (let k = -r; k < r; k += 6) { ctx.beginPath(); ctx.moveTo(k, -r); ctx.lineTo(k + 6, r); ctx.stroke(); }
  }
  if (t === 'bloater') {
    ctx.fillStyle = '#c9d65a';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.3) * r * 0.6, Math.sin(k * 1.3) * r * 0.6, 4, 0, 7); ctx.fill(); }
  }
  if (t === 'frozen') { ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, 7); ctx.stroke(); }
  if (t === 'behemoth') {
    ctx.fillStyle = '#2a0505';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ca = SPIKE_TRIG[k][0], sa = SPIKE_TRIG[k][1];
      const bx = (r - 4) * ca, by = (r - 4) * sa, tx2 = (r + 12) * ca, ty2 = (r + 12) * sa;
      ctx.moveTo(bx + sa * 6, by - ca * 6);
      ctx.lineTo(tx2, ty2);
      ctx.lineTo(bx - sa * 6, by + ca * 6);
    }
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.45, 0, 7); ctx.fill();
  // Glowing eye halos
  ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.22, 4.5, 0, 7); ctx.arc(r * 0.6, r * 0.22, 4.5, 0, 7); ctx.fill();
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

function drawVehicle(v, x, y, a, now, selfX, selfY, currentInVeh, isNight) {
  const t = D.VLIST[v[1]], d = D.VEH[t], f = v[7], L = d.len, Wd = d.wid, dead = f & 32;
  const fly = currentInVeh ? currentInVeh.alt > 0.5 : !!(f & 8);
  const steerAng = currentInVeh ? currentInVeh.steerAngle : 0;
  const isBraking = currentInVeh && (keys.Space || (keys.KeyS && currentInVeh.sp > 15));
  const isReversing = currentInVeh && keys.KeyS && currentInVeh.sp <= 15;
  const isBoosting = currentInVeh && (keys.ShiftLeft || keys.ShiftRight);
  ctx.save(); ctx.translate(x, y);
  if (fly) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(48, 68); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.52, Wd * 0.45, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.scale(1.18, 1.18);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.save(); ctx.rotate(a); ctx.fillRect(-L / 2 + 5, -Wd / 2 + 6, L, Wd); ctx.restore();
  }
  ctx.rotate(a);

  // Dynamic suspension body roll in turns
  if (currentInVeh && Math.abs(steerAng) > 0.02) {
    const roll = -steerAng * Math.min(1, currentInVeh.speed / 380) * (d.air ? 0.14 : 0.08);
    ctx.rotate(roll);
  }

  const body = dead ? '#2a2725' : d.c;
  const spdMag = currentInVeh ? Math.abs(currentInVeh.sp) : Math.abs(v[8]);
  if (d.kind === 'boat') {
    if (!dead && spdMag > 50) {
      ctx.strokeStyle = 'rgba(220,245,255,0.45)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(L / 2, 0); ctx.lineTo(-L * 0.65, -Wd * 0.9);
      ctx.moveTo(L / 2, 0); ctx.lineTo(-L * 0.65, Wd * 0.9); ctx.stroke();
    }
    ctx.fillStyle = body; ctx.beginPath();
    ctx.moveTo(L / 2, 0); ctx.lineTo(L * 0.15, -Wd / 2); ctx.lineTo(-L / 2, -Wd / 2);
    ctx.lineTo(-L / 2, Wd / 2); ctx.lineTo(L * 0.15, Wd / 2); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-L * 0.38, -Wd * 0.36, L * 0.45, Wd * 0.72);
    ctx.fillStyle = '#2b4a6a'; ctx.fillRect(-L * 0.05, -Wd * 0.3, L * 0.2, Wd * 0.6);
    if (!dead && spdMag > 100) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-L / 2 - 22, -Wd / 3, 22, Wd * 0.66); }
  } else if (d.kind === 'plane' || d.kind === 'seaplane') {
    const isJet = t === 'jet';
    const isOsprey = t === 'osprey';
    const isSeaplane = d.kind === 'seaplane';
    const propRot = dead ? 0.3 : now / ((f & 4) ? 28 : 260);
    if (isSeaplane && !fly && !dead) {
      const tp = D.TILES[tileAt(x, y)];
      if (tp && tp.water && spdMag > 65) {
        ctx.strokeStyle = 'rgba(220,245,255,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(L * 0.35, -14); ctx.lineTo(-L * 0.65, -Wd * 0.38);
        ctx.moveTo(L * 0.35, 14); ctx.lineTo(-L * 0.65, Wd * 0.38); ctx.stroke();
      }
    }
    if (isJet) {
      // Swept delta wings + twin tail stabilizers + centerline fuselage + bubble canopy + afterburner
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(L * 0.18, 0); ctx.lineTo(-L * 0.24, -Wd * 0.5); ctx.lineTo(-L * 0.4, -Wd * 0.5);
      ctx.lineTo(-L * 0.26, -8); ctx.lineTo(-L * 0.26, 8);
      ctx.lineTo(-L * 0.4, Wd * 0.5); ctx.lineTo(-L * 0.24, Wd * 0.5); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
      // Wingtip missiles
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-L * 0.44, -Wd * 0.5 - 2, 22, 3);
      ctx.fillRect(-L * 0.44, Wd * 0.5 - 1, 22, 3);
      // Tailplanes
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(-L * 0.34, 0); ctx.lineTo(-L * 0.5, -Wd * 0.24); ctx.lineTo(-L * 0.54, -Wd * 0.24);
      ctx.lineTo(-L * 0.54, Wd * 0.24); ctx.lineTo(-L * 0.5, Wd * 0.24); ctx.closePath();
      ctx.fill();
      // Fuselage + canopy
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(L * 0.52, 0); ctx.lineTo(L * 0.2, -9); ctx.lineTo(-L * 0.48, -8);
      ctx.lineTo(-L * 0.52, 0); ctx.lineTo(-L * 0.48, 8); ctx.lineTo(L * 0.2, 9); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(L * 0.16, 0, 14, 5, 0, 0, 7); ctx.fill();
      if (!dead && (fly || isBoosting || spdMag > 140)) {
        const jLen = (isBoosting ? 28 : 16) + Math.random() * 14;
        ctx.fillStyle = isBoosting ? '#38bdf8' : '#fb923c';
        ctx.beginPath(); ctx.moveTo(-L * 0.5, -5); ctx.lineTo(-L * 0.5 - jLen, 0); ctx.lineTo(-L * 0.5, 5); ctx.closePath(); ctx.fill();
      }
    } else if (isOsprey) {
      // V-22 Osprey Tiltrotor: wide boxy fuselage, high straight wing, twin wingtip rotors
      ctx.fillStyle = body;
      ctx.fillRect(-L * 0.14, -Wd * 0.5, 22, Wd);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(-L * 0.14, -Wd * 0.5, 22, Wd);
      ctx.fillStyle = '#334155'; ctx.fillRect(-L * 0.48, -16, 10, 32);
      ctx.fillStyle = body; ctx.fillRect(-L * 0.48, -10, L * 0.92, 20); ctx.strokeRect(-L * 0.48, -10, L * 0.92, 20);
      ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.ellipse(L * 0.34, 0, 10, 7, 0, 0, 7); ctx.fill();
      // Twin wingtip proprotors
      for (const wy of [-Wd * 0.48, Wd * 0.48]) {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-L * 0.08, wy - 5, 16, 10);
        if (!dead && (f & 4)) {
          ctx.strokeStyle = 'rgba(203,213,225,0.28)'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(0, wy, 28, 0, 7); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(20,24,32,0.85)'; ctx.lineWidth = 3.5;
        for (let k = 0; k < 3; k++) {
          const ra = propRot + k * ((Math.PI * 2) / 3);
          ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(Math.cos(ra) * 28, wy + Math.sin(ra) * 28); ctx.stroke();
        }
      }
    } else {
      // Bush Plane / Catalina Seaplane
      if (isSeaplane) {
        // Twin underwing pontoons
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-L * 0.08, -Wd * 0.25, 34, 6);
        ctx.fillRect(-L * 0.08, Wd * 0.25 - 6, 34, 6);
      }
      // Straight wings + struts + tailplane
      ctx.fillStyle = body;
      ctx.fillRect(-L * 0.12, -Wd * 0.5, 22, Wd);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(-L * 0.12, -Wd * 0.5, 22, Wd);
      ctx.fillRect(-L * 0.46, -18, 12, 36); ctx.strokeRect(-L * 0.46, -18, 12, 36);
      // Fuselage
      ctx.beginPath();
      ctx.moveTo(L * 0.48, 0); ctx.lineTo(L * 0.22, -9); ctx.lineTo(-L * 0.46, -6);
      ctx.lineTo(-L * 0.46, 6); ctx.lineTo(L * 0.22, 9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.ellipse(L * 0.14, 0, 12, 6, 0, 0, 7); ctx.fill();
      if (isSeaplane) {
        // Twin wing engines & propellers
        for (const ey of [-22, 22]) {
          ctx.fillStyle = '#334155'; ctx.fillRect(4, ey - 4, 14, 8);
          ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5;
          const bladeSpan = Math.sin(propRot) * 14;
          ctx.beginPath(); ctx.moveTo(19, ey - bladeSpan); ctx.lineTo(19, ey + bladeSpan); ctx.stroke();
        }
      } else {
        // Nose propeller disc
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3;
        const bladeSpan = Math.sin(propRot) * 18;
        ctx.beginPath(); ctx.moveTo(L * 0.5, -bladeSpan); ctx.lineTo(L * 0.5, bladeSpan); ctx.stroke();
      }
    }
    if (!dead && now % 800 < 400) {
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -Wd * 0.5, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(0, Wd * 0.5, 3, 0, 7); ctx.fill();
    }
    if (dead) burst(x, y, 1, '#333', 40, 1200, 10);
  } else if (d.kind === 'heli') {
    const isChinook = t === 'transport_heli';
    const isApache = t === 'attack_heli';
    if (isChinook) {
      // Wide tandem-rotor cargo fuselage + rear ramp
      ctx.fillStyle = body; ctx.fillRect(-L * 0.46, -Wd * 0.34, L * 0.92, Wd * 0.68);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(-L * 0.46, -Wd * 0.34, L * 0.92, Wd * 0.68);
      ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.ellipse(L * 0.38, 0, 10, Wd * 0.25, 0, 0, 7); ctx.fill();
    } else if (isApache) {
      // Attack Gunship: stub wings + rocket pods + slim tandem cockpit
      ctx.fillStyle = '#1e293b'; ctx.fillRect(-8, -Wd * 0.48, 18, Wd * 0.96);
      ctx.fillStyle = '#991b1b'; ctx.fillRect(-4, -Wd * 0.45, 14, 7); ctx.fillRect(-4, Wd * 0.45 - 7, 14, 7);
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(L * 0.12, 0, L * 0.34, 11, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillRect(-L / 2, -3.5, L * 0.48, 7); ctx.fillRect(-L / 2, -11, 8, 22);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(L * 0.24, 0, L * 0.14, 7, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(L * 0.1, 0, L * 0.3, Wd / 2, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillRect(-L / 2, -4, L * 0.5, 8); ctx.fillRect(-L / 2, -12, 8, 24);
      ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.ellipse(L * 0.28, 0, L * 0.12, Wd * 0.35, 0, 0, 7); ctx.fill();
    }
    if (!dead && now % 800 < 400) {
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-L * 0.1, -Wd / 2 - 2, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(-L * 0.1, Wd / 2 + 2, 3, 0, 7); ctx.fill();
    }
    const rot = dead ? 0.3 : now / (f & 4 ? 40 : 300);
    const hubs = isChinook ? [[-L * 0.3, 0], [L * 0.3, 0]] : [[0, 0]];
    const bladeR = isChinook ? L * 0.38 : L * 0.55;
    for (const [hx, hy] of hubs) {
      if (!dead && (f & 4)) {
        ctx.strokeStyle = 'rgba(200,220,240,0.22)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hx, hy, bladeR, 0, 7); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(30,30,30,.75)'; ctx.lineWidth = 5;
      for (let k = 0; k < 2; k++) {
        const ra = rot + k * Math.PI / 2 + (hx < 0 ? 0.6 : 0);
        ctx.beginPath(); ctx.moveTo(hx + Math.cos(ra) * bladeR, hy + Math.sin(ra) * bladeR);
        ctx.lineTo(hx - Math.cos(ra) * bladeR, hy - Math.sin(ra) * bladeR); ctx.stroke();
      }
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 7); ctx.fill();
    }
    if (dead) burst(x, y, 1, '#333', 40, 1200, 10);
  } else if (d.kind === 'hover') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(0, 0, L / 2, Wd / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = body; ctx.fillRect(-L / 2 + 8, -Wd / 2 + 6, L - 16, Wd - 12);
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(-L / 2 + 14, -10, 9, 0, 7); ctx.arc(-L / 2 + 14, 10, 9, 0, 7); ctx.fill();
  } else {
    const tracked = t === 'tank' || t === 'apc';
    ctx.fillStyle = '#111';
    if (tracked) {
      ctx.fillRect(-L / 2, -Wd / 2 - 4, L, 10); ctx.fillRect(-L / 2, Wd / 2 - 6, L, 10);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
      for (let tx = -L / 2 + 5; tx < L / 2; tx += 10) {
        ctx.beginPath(); ctx.moveTo(tx, -Wd / 2 - 4); ctx.lineTo(tx, -Wd / 2 + 6);
        ctx.moveTo(tx, Wd / 2 - 6); ctx.lineTo(tx, Wd / 2 + 4); ctx.stroke();
      }
    } else if (t !== 'motorcycle') {
      const wl = 13, ww = 7;
      for (const [wx, wy] of [[-L * 0.32, -Wd / 2], [-L * 0.32, Wd / 2]]) {
        ctx.save(); ctx.translate(wx, wy);
        ctx.fillStyle = '#09090b'; ctx.fillRect(-wl / 2 - 1, -ww / 2 - 1, wl + 2, ww + 2);
        ctx.fillStyle = '#18181b'; ctx.fillRect(-wl / 2, -ww / 2, wl, ww);
        ctx.fillStyle = '#64748b'; ctx.fillRect(-wl / 4, -ww / 4, wl / 2, ww / 2);
        ctx.restore();
      }
      for (const [wx, wy] of [[L * 0.32, -Wd / 2], [L * 0.32, Wd / 2]]) {
        ctx.save(); ctx.translate(wx, wy); ctx.rotate(steerAng);
        ctx.fillStyle = '#09090b'; ctx.fillRect(-wl / 2 - 1, -ww / 2 - 1, wl + 2, ww + 2);
        ctx.fillStyle = '#18181b'; ctx.fillRect(-wl / 2, -ww / 2, wl, ww);
        ctx.fillStyle = '#64748b'; ctx.fillRect(-wl / 4, -ww / 4, wl / 2, ww / 2);
        ctx.restore();
      }
    } else {
      ctx.save(); ctx.translate(L / 2 - 8, 0); ctx.rotate(steerAng);
      ctx.fillStyle = '#111'; ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
      ctx.fillStyle = '#111'; ctx.fillRect(-L / 2 + 2, -3, 12, 6);
    }
    const vp = vehPal(body);
    ctx.fillStyle = vp.mid; ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 6) : ctx.rect(-L / 2, -Wd / 2, L, Wd);
    ctx.fill();
    ctx.fillStyle = vp.top; ctx.fillRect(-L / 2 + 4, -Wd / 2 + 2, L - 8, Math.max(3, Wd * 0.22));
    ctx.fillStyle = vp.bot; ctx.fillRect(-L / 2 + 4, Wd / 2 - Math.max(3, Wd * 0.22) - 2, L - 8, Math.max(3, Wd * 0.22));
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 6) : ctx.rect(-L / 2, -Wd / 2, L, Wd); ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L * 0.22, -Wd * 0.42); ctx.lineTo(L * 0.22, Wd * 0.42); ctx.stroke();
    if (t !== 'motorcycle' && !tracked) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(L * 0.14, -Wd / 2 - 3, 4, 3);
      ctx.fillRect(L * 0.14, Wd / 2, 4, 3);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-L / 2 - 4, Wd * 0.25, 4, 3);
    }

    if (!dead) {
      if (isNight === undefined) isNight = daylight() < 0.65;
      const isDriving = (me && v[0] === me.veh) || isNight || (spdMag > 20);
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

      if (isBraking) {
        ctx.fillStyle = '#ff1e1e';
        ctx.fillRect(-L / 2 - 3, -Wd * 0.44, 5, 8);
        ctx.fillRect(-L / 2 - 3, Wd * 0.44 - 8, 5, 8);
        ctx.fillStyle = 'rgba(255, 30, 30, 0.45)';
        ctx.beginPath();
        ctx.arc(-L / 2 - 6, -Wd * 0.4, 14, 0, 7);
        ctx.arc(-L / 2 - 6, Wd * 0.4, 14, 0, 7);
        ctx.fill();
      } else if (isReversing) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-L / 2 - 2, -Wd * 0.28, 4, 6);
        ctx.fillRect(-L / 2 - 2, Wd * 0.28 - 6, 4, 6);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-L / 2 - 1, -Wd * 0.4, 3, 5);
        ctx.fillRect(-L / 2 - 1, Wd * 0.4 - 5, 3, 5);
      }

      if (isBoosting && (spdMag > 40 || (currentInVeh && currentInVeh.speed > 40))) {
        const flen = 18 + Math.random() * 14;
        ctx.fillStyle = Math.random() < 0.5 ? '#38bdf8' : '#fb923c';
        ctx.beginPath();
        ctx.moveTo(-L / 2, -Wd * 0.22);
        ctx.lineTo(-L / 2 - flen, -Wd * 0.22);
        ctx.lineTo(-L / 2, -Wd * 0.22 + 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-L / 2, Wd * 0.22);
        ctx.lineTo(-L / 2 - flen, Wd * 0.22);
        ctx.lineTo(-L / 2, Wd * 0.22 - 5);
        ctx.fill();
      }
    }

    if (!tracked && t !== 'motorcycle' && t !== 'quad' && t !== 'golfcart' && t !== 'tractor' && t !== 'snowmobile' && t !== 'f1' && t !== 'dunebuggy') {
      ctx.fillStyle = 'rgba(30,52,78,.9)';
      ctx.fillRect(L * 0.12, -Wd / 2 + 4, L * 0.14, Wd - 8);
      ctx.fillRect(-L * 0.38, -Wd / 2 + 4, L * 0.1, Wd - 8);
      ctx.fillStyle = 'rgba(186,230,253,0.28)';
      ctx.fillRect(L * 0.15, -Wd / 2 + 6, L * 0.04, Wd - 12);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
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
      ctx.rotate(v[9] / 100 - a); ctx.fillStyle = vehPal(d.c).turret;
      if (t === 'tank') {
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, Wd * 0.38, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillRect(0, -4, L * 0.7, 8);
      }
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
    if (dist < d.r + 95) {
      ctx.save();
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      const vEmoji = (d.kind === 'plane' || d.kind === 'seaplane') ? '✈️' : d.kind === 'heli' ? '🚁' : d.kind === 'boat' ? '🚤' : '🚗';
      const vVerb = d.air ? 'FLY' : d.kind === 'boat' ? 'SAIL' : 'DRIVE';
      const prompt = `${vEmoji} [E] ${vVerb} ${d.n} · Hull ${v[5]}% · [Shift] Nitro`;
      const pw = txtW('bold 12px system-ui', prompt) + 20;
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
    case 'flame':
      ctx.drawImage(GLOW_SPR.flame, -22, -22, 44, 44);
      break;
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
      const r = f.r * (0.3 + p * 0.9);
      const spr = f.fx === 'toxic' ? GLOW_SPR.toxic : f.fx === 'smoke' ? GLOW_SPR.smoke : GLOW_SPR.boom;
      ctx.globalAlpha = clamp(1 - p, 0, 1);
      ctx.drawImage(spr, f.x - r, f.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
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
  const idef = currentInteriorDef();
  let dark = idef ? 0.32 : (1 - daylight()) * 0.9;
  if (!idef) {
    if (fx.has('aurora')) dark *= 0.72;
    if (fx.has('brightnight') || fx.has('moonlit')) dark *= 0.65;
    if (fx.has('eclipse')) dark = Math.max(dark, 0.7);
    if (now - lightningFlash < 160) dark *= 0.2;
  }
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
    if (sx < -sr || sy < -sr || sx > W2 + sr || sy > H2 + sr || sr < 1) return;
    lx.globalAlpha = clamp(i, 0, 1);
    lx.drawImage(LIGHT_MASK_CIRCLE, sx - sr, sy - sr, sr * 2, sr * 2);
  };
  const C = (x, y, ang, len, spread, i = 1) => {
    const [sx, sy] = S(x, y), sl = len * zoom * sc;
    if (sx < -sl || sy < -sl || sx > W2 + sl || sy > H2 + sl || sl < 2) return;
    lx.save();
    lx.translate(sx, sy);
    lx.rotate(ang);
    lx.scale(sl / 192, (sl * (spread / 0.46)) / 192);
    lx.globalAlpha = clamp(i, 0, 1);
    lx.drawImage(LIGHT_MASK_CONE, 0, -96);
    lx.restore();
  };
  L(selfX, selfY, 210, 0.85);
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
  if (idef) {
    for (const rm of idef.rooms) {
      L(rm.x + rm.w / 2, rm.y + rm.h / 2, Math.max(rm.w, rm.h) * 0.65, 0.85);
    }
    L(idef.spawnX || idef.w / 2, idef.spawnY || idef.h * 0.8, 280, 0.95);
    L(idef.w / 2, idef.h / 2, 260, 0.9);
  } else {
    for (const plot of shelterPlots) {
      L(plot.x, plot.y, 220, 0.75);
      if (plot.beacon) L(plot.x, plot.y, 450, 0.95);
    }
  }
  for (const e of effects) {
    const [id, type, x, y, r] = e;
    if (type === 'light') L(x, y, r, 0.9);
    else if (type === 'flare') L(x, y, r * (0.95 + Math.random() * 0.1));
    else if (type === 'fire') L(x, y, r * 2.2, 0.9);
    else if (type === 'drop') L(x, y, 200, 0.6);
  }
  lx.globalAlpha = 1;
  ctx.drawImage(lightCv, 0, 0, VW, VH);
  if (!idef && fx.has('bloodmoon')) { ctx.fillStyle = 'rgba(120,0,0,.16)'; ctx.fillRect(0, 0, VW, VH); }
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
    const al = me.hurt < 350 ? 0.55 * (1 - me.hurt / 350) : 0.3 + 0.16 * Math.sin(now / 200);
    ctx.globalAlpha = clamp(al, 0, 1);
    ctx.drawImage(GLOW_SPR.hurt, 0, 0, VW, VH);
    ctx.globalAlpha = 1;
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
    const mw = Math.min(400, VW - 540);
    const mx = VW / 2 - mw / 2, my = compY + compH + 4;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 16, 0.74)';
    ctx.fillRect(mx, my, mw, 20);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, 19);

    let stageText = me.mission ? `${me.mission.title} (${me.mission.prog}/${me.mission.target})` : 'Stage 1/5 · Scavenge & Claim Shelter [T]';
    if (me.beacon) {
      stageText = me.beacon >= 5
        ? (me.evacTimer > 0 ? `OPERATION EXODUS: HOLD THE SHELTER (${me.evacTimer}s)` : 'EXODUS SIGNAL COMPLETE · ASCEND VIA REBORN [Y]!')
        : `OPERATION EXODUS: Beacon Stage ${me.beacon}/5`;
    }
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`🎯 ${stageText}`, mx + mw / 2, my + 10);
    ctx.restore();
  }

  // Top-left status bar & mission tracker, bottom-left biometrics, bottom-right weapon deck, and top-right radar minimap are managed by crisp DOM HUD.

  // ───────── 3. BOTTOM-LEFT BIOMETRICS, HOTBAR & VEHICLE COCKPIT ARE MANAGED BY DOM HUD ─────────
  // updateDomHUD(now, inVeh) dynamically renders high-DPI health bar, shield, stamina, selected gun, ammo, and vehicle gauges.


  // ───────── 9. TACTICAL RADAR MINIMAP (TOP-RIGHT) ─────────
  // Now managed crisply by renderMinimapDOM in the top-right high-tech HUD dock.


  // ───────── 10. INTERACTION HINT ─────────
  const hint = interactionHint(selfX, selfY);
  if (hint) {
    ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
    const w = txtW('bold 13px system-ui', hint) + 28;
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

  const idef = currentInteriorDef();
  if (idef) {
    let bestSt = null, bestD = Infinity;
    for (const st of idef.stations) {
      const d = Math.hypot(st.x - x, st.y - y);
      if (d <= st.r && d < bestD) { bestD = d; bestSt = st; }
    }
    if (bestSt) {
      return `E — ${bestSt.name}${bestSt.cost ? ` (${bestSt.cost}⚙️)` : ''} · ${bestSt.desc}`;
    }
    let bi = null, bd = 80;
    for (const it of items.values()) {
      const d = Math.hypot(it.x - x, it.y - y);
      if (d < bd) { bd = d; bi = it; }
    }
    if (bi) return `E — ${bi.k === 'vault' ? 'open' : 'pick up'} ${itemName(bi.k, bi.n)}${bi.label ? ' (' + bi.label + ')' : ''}`;
    return '';
  }

  // Check Wasteland Raid Bunkers
  if (D && D.RAID_BUNKERS) {
    for (const rb of D.RAID_BUNKERS) {
      if (Math.hypot(rb.x - x, rb.y - y) < 110) {
        return `E — Breach ${rb.name} (Underground Raid)`;
      }
    }
  }

  // Check Enterable Building Sub-Map Portals (Universities, Hospitals, Malls, Military Bases, etc.)
  if (M && M.entrances) {
    for (const ent of entrancesIn(x - 140, y - 140, x + 140, y + 140)) {
      if (Math.hypot(ent.x - x, ent.y - y) < 110) {
        const meta = ENT_META[ent.type] || ENT_META.university;
        return `E — ${meta.verb} ${ent.name} (${meta.label} Interior)`;
      }
    }
  }

  // Check near shelter plot lift or terminal
  const np = findNearestPlot(x, y, 260);
  if (np) {
    const S = computePlotSize(np);
    if (np.ownerName && Math.hypot(np.x - x, (np.y - S * 0.28) - y) < 95) {
      return `E — Enter Underground Bunker (${np.name})`;
    }
    if (Math.hypot(np.x - x, np.y - y) < 190) {
      return np.ownerName ? `T — Open ${np.name} (Shelter Tycoon)` : `E — Claim ${np.name}`;
    }
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

// ───────── VECTOR WEAPON SILHOUETTES LIBRARY ─────────
function getWeaponSvg(cat, isBig = false) {
  const w = isBig ? 54 : 26;
  const h = isBig ? 28 : 14;
  switch (cat) {
    case 'ar':
      return `<svg viewBox="0 0 64 24" width="${w}" height="${h}" fill="currentColor"><path d="M2 13h10v-2h8V9h4v2h22l2-3h8v6l-4 4h-8v-3h-6l-2 5h-4l1-5h-10v2l-4 2H8l-6-4z"/></svg>`;
    case 'smg':
      return `<svg viewBox="0 0 54 24" width="${w}" height="${h}" fill="currentColor"><path d="M4 14h8v-3h16v-2h8v5h6v4l-4 3h-6v-3h-4l-2 5h-4l1-5h-8v2l-4 1H6z"/></svg>`;
    case 'sniper':
      return `<svg viewBox="0 0 70 20" width="${w}" height="${h}" fill="currentColor"><path d="M2 11h24V8h12v3h26v2H46v2l-2 3h-4l1-3h-14v2h-10l-9-4zM26 6h16v2H26z"/></svg>`;
    case 'pistol':
      return `<svg viewBox="0 0 40 24" width="${w}" height="${h}" fill="currentColor"><path d="M6 8h24v7h-6l-4 7h-6l2-7H8l-2-3z"/></svg>`;
    case 'shotgun':
      return `<svg viewBox="0 0 64 20" width="${w}" height="${h}" fill="currentColor"><path d="M2 11h34v-2h22v4H46v2l-4 2h-6l-2-2H14l-12-4zM24 13h12v2H24z"/></svg>`;
    case 'mg':
      return `<svg viewBox="0 0 64 24" width="${w}" height="${h}" fill="currentColor"><path d="M2 12h14v-3h20v2h22v3H48v2h-4v4h-6v-4h-8v2h-14l-14-6zM38 7h4v2h-4z"/></svg>`;
    case 'dagger':
    case 'knife':
      return `<svg viewBox="0 0 44 20" width="${w}" height="${h}" fill="currentColor"><path d="M4 11l6-3 20-1 10 3-8 4-22 1-6-2v-2zM4 9h6v4H4z"/></svg>`;
    case 'sword':
      return `<svg viewBox="0 0 54 18" width="${w}" height="${h}" fill="currentColor"><path d="M2 9l8-2 34-1 6 3-8 2-32 1-8-1v-2zM4 6h3v8H4z"/></svg>`;
    case 'polearm':
      return `<svg viewBox="0 0 56 16" width="${w}" height="${h}" fill="currentColor"><path d="M2 8h42l4-4 8 4-8 4-4-4H2z"/></svg>`;
    case 'bow':
      return `<svg viewBox="0 0 40 24" width="${w}" height="${h}" fill="currentColor"><path d="M12 2c8 6 12 12 12 20-3-7-7-13-12-20zM6 11h26v2H6z"/></svg>`;
    case 'blunt':
      return `<svg viewBox="0 0 44 24" width="${w}" height="${h}" fill="currentColor"><path d="M4 10h24v-6h12v16H28v-6H4z"/></svg>`;
    case 'launcher':
      return `<svg viewBox="0 0 64 24" width="${w}" height="${h}" fill="currentColor"><path d="M2 10h12l4-3h26l4 3h12v4H46l-4 3H18l-4-3H2zM28 17h4v5h-4z"/></svg>`;
    case 'glauncher':
      return `<svg viewBox="0 0 56 24" width="${w}" height="${h}" fill="currentColor"><path d="M4 10h14v-3h14v3h18v5H32v3l-4 3h-5l1-3h-6v3H8l-4-5z"/></svg>`;
    case 'artillery':
      return `<svg viewBox="0 0 68 24" width="${w}" height="${h}" fill="currentColor"><path d="M2 12h18V7h14v4h28l3-2v6l-3-2H34v3H20l-6 4H6z"/></svg>`;
    case 'mlrs':
      return `<svg viewBox="0 0 60 24" width="${w}" height="${h}" fill="currentColor"><path d="M6 6h40v4H6zM10 11h38v4H10zM16 16h12v5h-4v-2h-8z"/></svg>`;
    case 'naval':
      return `<svg viewBox="0 0 60 24" width="${w}" height="${h}" fill="currentColor"><path d="M4 10h18V6h12v4h22v2H34v2h22v2H34v3H16l-6-4H4z"/></svg>`;
    case 'missile':
      return `<svg viewBox="0 0 64 20" width="${w}" height="${h}" fill="currentColor"><path d="M4 7l6 3-6 3h10l4-2h28l12 3-12-7H18l-4-2z"/></svg>`;
    case 'siege':
      return `<svg viewBox="0 0 56 24" width="${w}" height="${h}" fill="currentColor"><path d="M6 17h40v3H6zM26 4h4v13h-4zM14 9c10-4 20-4 30 0l-3 3c-8-3-16-3-24 0z"/></svg>`;
    case 'special':
      return `<svg viewBox="0 0 60 24" width="${w}" height="${h}" fill="currentColor"><path d="M4 10h14l4-3h22l4 3h8v4h-8l-4 3H22l-4-3H4zm20 0h12v4H24z"/></svg>`;
    case 'throwing':
      return `<svg viewBox="0 0 32 32" width="${w}" height="${h}" fill="currentColor"><path d="M16 2l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></svg>`;
    default:
      return `<svg viewBox="0 0 32 24" width="${w}" height="${h}" fill="currentColor"><path d="M6 6h16a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H10l-4-4V6z"/></svg>`;
  }
}

// ───────── TOP-RIGHT TACTICAL RADAR MINIMAP CONTROLLER ─────────
let minimapRange = 3600;
function getObjectiveTarget(selfX, selfY) {
  if (!me || !me.mission) return null;
  const evt = me.mission.evt;
  if (evt === 'drive' && latest && latest.V.size) {
    let best = null, bd = Infinity;
    for (const v of latest.V.values()) {
      if (v[7] & 32) continue;
      const d = Math.hypot(v[2] - selfX, v[3] - selfY);
      if (d < bd) { bd = d; best = {x: v[2], y: v[3], label: 'Vehicle'}; }
    }
    if (best) return best;
  }
  if (evt === 'claim_plot' && shelterPlots.length) {
    let best = null, bd = Infinity;
    for (const pl of shelterPlots) {
      if (pl.ownerName) continue;
      const d = Math.hypot(pl.x - selfX, pl.y - selfY);
      if (d < bd) { bd = d; best = {x: pl.x, y: pl.y, label: pl.name}; }
    }
    if (best) return best;
  }
  if ((evt === 'upgrade' || evt === 'bunker_op' || evt === 'beacon') && me.plotId) {
    const pl = shelterPlots.find(p => p.id === me.plotId);
    if (pl) return {x: pl.x, y: pl.y, label: pl.name};
  }
  if (D && D.RAID_BUNKERS && D.RAID_BUNKERS.length) {
    let best = null, bd = Infinity;
    for (const rb of D.RAID_BUNKERS) {
      const d = Math.hypot(rb.x - selfX, rb.y - selfY);
      if (d < bd) { bd = d; best = {x: rb.x, y: rb.y, label: rb.name}; }
    }
    return best;
  }
  return null;
}

function renderMinimapDOM(now, inVehRef) {
  if (!_mmCv) {
    _mmCv = $('minimap-canvas');
    _mmCtx = _mmCv ? _mmCv.getContext('2d') : null;
  }
  const mmCv = _mmCv, mmCtx = _mmCtx;
  if (!mmCv || !mmCtx || !latest || !me) return;
  const w = mmCv.width, h = mmCv.height;
  const cx = w / 2, cy = h / 2, r = w / 2;
  const selfX = pred.x, selfY = pred.y;
  const idef = currentInteriorDef();
  const range = idef ? 1350 : minimapRange;
  const scale = w / range;

  mmCtx.save();
  mmCtx.clearRect(0, 0, w, h);

  // Circular clip
  mmCtx.beginPath();
  mmCtx.arc(cx, cy, r, 0, Math.PI * 2);
  mmCtx.clip();

  // Background radar dark grid
  mmCtx.fillStyle = '#060a12';
  mmCtx.fillRect(0, 0, w, h);

  const worldToMm = (x, y) => [cx + (x - selfX) * scale, cy + (y - selfY) * scale];

  if (idef) {
    // Render 6-Wing Underground Blueprint
    const [bx, by] = worldToMm(0, 0);
    mmCtx.fillStyle = '#121822';
    mmCtx.fillRect(bx, by, idef.w * scale, idef.h * scale);
    for (const rm of idef.rooms) {
      const [rx, ry] = worldToMm(rm.x, rm.y);
      mmCtx.fillStyle = rm.tint || 'rgba(56,189,248,0.08)';
      mmCtx.fillRect(rx, ry, rm.w * scale, rm.h * scale);
    }
    mmCtx.fillStyle = '#475569';
    for (const wl of idef.walls) {
      const [wx, wy] = worldToMm(wl[0], wl[1]);
      mmCtx.fillRect(wx, wy, Math.max(1.5, wl[2] * scale), Math.max(1.5, wl[3] * scale));
    }
    for (const st of idef.stations) {
      const [sx2, sy2] = worldToMm(st.x, st.y);
      mmCtx.fillStyle = st.kind === 'exit_lift' ? '#38bdf8' : st.kind === 'vault_locker' ? '#ef4444' : '#4ade80';
      mmCtx.beginPath(); mmCtx.arc(sx2, sy2, 3.2, 0, Math.PI * 2); mmCtx.fill();
    }
    // Render Bunker Chests & Vaults directly on radar minimap
    for (const it of items.values()) {
      if (it.k !== 'crate' && it.k !== 'vault') continue;
      const [ix, iy] = worldToMm(it.x, it.y);
      mmCtx.fillStyle = it.k === 'vault' ? '#fbbf24' : '#f97316';
      mmCtx.fillRect(ix - 2.5, iy - 2.5, 5, 5);
    }
  } else {
    // Render terrain texture from procedural world minimap
    if (mini) {
      mmCtx.imageSmoothingEnabled = false;
      mmCtx.drawImage(
        mini,
        (selfX - range / 2) / TS,
        (selfY - range / 2) / TS,
        range / TS,
        range / TS,
        0,
        0,
        w,
        h
      );
      mmCtx.imageSmoothingEnabled = true;
    }

    // Tactical dark contrast glaze
    mmCtx.fillStyle = 'rgba(6, 10, 18, 0.45)';
    mmCtx.fillRect(0, 0, w, h);
  }

  // Concentric radar distance rings (25%, 50%, 75%)
  mmCtx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
  mmCtx.lineWidth = 1;
  for (const f of [0.25, 0.5, 0.75]) {
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, r * f, 0, Math.PI * 2);
    mmCtx.stroke();
  }

  // Crosshairs
  mmCtx.beginPath();
  mmCtx.moveTo(cx, 0); mmCtx.lineTo(cx, h);
  mmCtx.moveTo(0, cy); mmCtx.lineTo(w, cy);
  mmCtx.stroke();

  // Rotating radar sweep cone (cached gradient per canvas size)
  const sweepAngle = (now / 700) % (Math.PI * 2);
  if (!mmCv._sweepGrad || mmCv._sgW !== w || mmCv._sgH !== h) {
    mmCv._sgW = w; mmCv._sgH = h;
    const g = mmCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    g.addColorStop(1, 'rgba(0, 229, 255, 0)');
    mmCv._sweepGrad = g;
  }
  mmCtx.fillStyle = mmCv._sweepGrad;
  mmCtx.beginPath();
  mmCtx.moveTo(cx, cy);
  mmCtx.arc(cx, cy, r, sweepAngle - 0.5, sweepAngle);
  mmCtx.closePath();
  mmCtx.fill();

  // Red Zombie blips
  mmCtx.fillStyle = '#ff3b3b';
  for (const z of latest.Z.values()) {
    const [zx, zy] = worldToMm(z[2], z[3]);
    if (Math.hypot(zx - cx, zy - cy) < r - 4) {
      mmCtx.beginPath();
      mmCtx.arc(zx, zy, 2.8, 0, Math.PI * 2);
      mmCtx.fill();
    }
  }

  if (!idef) {
    // Cyan Vehicle blips
    mmCtx.fillStyle = '#00e5ff';
    for (const v of latest.V.values()) {
      const [vx, vy] = worldToMm(v[2], v[3]);
      if (Math.hypot(vx - cx, vy - cy) < r - 4) {
        mmCtx.beginPath();
        mmCtx.arc(vx, vy, 3.8, 0, Math.PI * 2);
        mmCtx.fill();
      }
    }

    // Crimson Raid Bunkers
    if (D && D.RAID_BUNKERS) {
      for (const rb of D.RAID_BUNKERS) {
        let [rx, ry] = worldToMm(rb.x, rb.y);
        const dC = Math.hypot(rx - cx, ry - cy);
        if (dC > r - 8) {
          const ang = Math.atan2(ry - cy, rx - cx);
          rx = cx + Math.cos(ang) * (r - 9);
          ry = cy + Math.sin(ang) * (r - 9);
        }
        mmCtx.fillStyle = '#ef4444';
        mmCtx.fillRect(rx - 3.5, ry - 3.5, 7, 7);
        mmCtx.strokeStyle = '#fff'; mmCtx.lineWidth = 1;
        mmCtx.strokeRect(rx - 3.5, ry - 3.5, 7, 7);
      }
    }

    // Enterable Building Sub-Map Portals
    if (M && M.entrances) {
      const halfR = range * 0.6;
      for (const ent of entrancesIn(selfX - halfR, selfY - halfR, selfX + halfR, selfY + halfR)) {
        const [ex, ey] = worldToMm(ent.x, ent.y);
        if (Math.hypot(ex - cx, ey - cy) < r - 4) {
          const meta = ENT_META[ent.type] || ENT_META.university;
          mmCtx.fillStyle = meta.accent;
          mmCtx.fillRect(ex - 2.5, ey - 2.5, 5, 5);
        }
      }
    }

    // Golden Shelter Plots
    for (const plot of shelterPlots) {
      let [px, py] = worldToMm(plot.x, plot.y);
      const dCenter = Math.hypot(px - cx, py - cy);
      if (dCenter > r - 8) {
        const ang = Math.atan2(py - cy, px - cx);
        px = cx + Math.cos(ang) * (r - 9);
        py = cy + Math.sin(ang) * (r - 9);
      }
      mmCtx.fillStyle = '#ffd700';
      mmCtx.beginPath();
      mmCtx.arc(px, py, 4.5, 0, Math.PI * 2);
      mmCtx.fill();
      mmCtx.strokeStyle = '#000';
      mmCtx.lineWidth = 1.5;
      mmCtx.stroke();
    }

    // Active Campaign Objective ring
    const obj = getObjectiveTarget(selfX, selfY);
    if (obj) {
      let [ox, oy] = worldToMm(obj.x, obj.y);
      const dObj = Math.hypot(ox - cx, oy - cy);
      if (dObj > r - 10) {
        const ang = Math.atan2(oy - cy, ox - cx);
        ox = cx + Math.cos(ang) * (r - 10);
        oy = cy + Math.sin(ang) * (r - 10);
      }
      mmCtx.strokeStyle = '#c084fc';
      mmCtx.lineWidth = 2;
      mmCtx.beginPath();
      mmCtx.arc(ox, oy, 6 + Math.sin(now / 180) * 2, 0, Math.PI * 2);
      mmCtx.stroke();
    }
  }

  // Waypoint blip
  if (waypoint && !idef) {
    const [wx, wy] = worldToMm(waypoint.x, waypoint.y);
    mmCtx.fillStyle = '#ff00ff';
    mmCtx.beginPath();
    mmCtx.arc(wx, wy, 5, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#fff';
    mmCtx.lineWidth = 1;
    mmCtx.stroke();
  }

  // Center player survivor arrowhead rotated to aim heading
  const aimA = inVehRef ? inVehRef.a : (me.veh && vehPred.active ? vehPred.a : (pred.a || 0));
  mmCtx.save();
  mmCtx.translate(cx, cy);
  mmCtx.rotate(aimA);
  mmCtx.fillStyle = '#ffd166';
  mmCtx.beginPath();
  mmCtx.moveTo(11, 0);
  mmCtx.lineTo(-7, -6);
  mmCtx.lineTo(-3, 0);
  mmCtx.lineTo(-7, 6);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.strokeStyle = '#000';
  mmCtx.lineWidth = 1.5;
  mmCtx.stroke();
  mmCtx.restore();

  mmCtx.restore();

  // Compass Bearing & Coordinates in DOM (0° = North, 90° = East matching top compass tape)
  const bearingEl = $('mm-bearing');
  if (bearingEl) {
    let deg = Math.round(((aimA * 180 / Math.PI + 90) % 360 + 360) % 360);
    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const card = cardinals[Math.round(deg / 45) % 8];
    bearingEl.textContent = `${String(deg).padStart(3, '0')}° ${card}`;
  }

  const coordsEl = $('mm-coords');
  if (coordsEl) {
    coordsEl.textContent = idef ? `INT ${Math.round(selfX)},${Math.round(selfY)}` : `${Math.round(selfX)},${Math.round(selfY)}`;
  }

  const rangeEl = $('mm-range-text');
  if (rangeEl) {
    const itype = interiorTypeOf(me && me.zone);
    const shortTag = {
      airport: 'AIR', university: 'UNIV', hospital: 'HOSP', mall: 'MALL', military: 'MIL', historic: 'CATH', museum: 'MUS',
      transit: 'HUB', industrial: 'IND', raid: 'RAID', police: 'PD', fire: 'FD', bank: 'BANK', stadium: 'STAD',
      aquarium: 'AQUA', science: 'SCI', bazaar: 'BAZ', pyramid: 'TOMB', mosque: 'MOSQ', capitol: 'CAP',
      palace: 'PAL', greenhouse: 'PARK', mill: 'MILL'
    };
    rangeEl.textContent = (itype && shortTag[itype]) || (idef ? 'BNK' : `${Math.round(minimapRange / 36)}M`);
  }
}

// ───────── TACTICAL DOM HUD CONTROLLER ─────────
let domHudInited = false;
function initDomHUDButtons() {
  if (domHudInited) return;
  domHudInited = true;
  const btnShelter = $('hud-btn-shelter');
  if (btnShelter) btnShelter.onclick = () => { if (typeof toggleShelterTycoon === 'function') toggleShelterTycoon(); };
  const btnReborn = $('hud-btn-reborn');
  if (btnReborn) btnReborn.onclick = () => { if (typeof toggleRebornModal === 'function') toggleRebornModal(); };
  const btnMap = $('hud-btn-map');
  if (btnMap) btnMap.onclick = () => toggleMap();

  // Minimap controls
  const mmZoomIn = $('mm-zoom-in');
  if (mmZoomIn) mmZoomIn.onclick = () => {
    minimapRange = Math.max(1800, minimapRange - 800);
  };
  const mmZoomOut = $('mm-zoom-out');
  if (mmZoomOut) mmZoomOut.onclick = () => {
    minimapRange = Math.min(6400, minimapRange + 800);
  };
  const mmBtnMap = $('mm-btn-map');
  if (mmBtnMap) mmBtnMap.onclick = () => toggleMap();
}

function setTextCached(key, el, val) {
  if (!el || hudCache[key] === val) return;
  hudCache[key] = val; el.textContent = val;
}
function setWidthCached(key, el, val) {
  if (!el || hudCache[key] === val) return;
  hudCache[key] = val; el.style.width = val;
}

function updateDomHUD(now, inVeh) {
  if (!me) return;
  initDomHUDButtons();

  const hudEl = $('hud');
  if (!hudEl || hudEl.hidden) return;

  // Throttle Top-Right Minimap Canvas to ~15fps to save CPU/GPU without losing smoothness
  if (now - lastMmDraw >= 66) {
    lastMmDraw = now;
    renderMinimapDOM(now, inVeh);
  }

  // 1. Top bar resources & sector (cached DOM writes)
  setTextCached('scrap', $('hud-scrap'), `${me.scrap || 0}`);
  setTextCached('cores', $('hud-cores'), `${me.prestigeTokens || 0}`);
  setTextCached('clock', $('hud-clock'), clockStr());
  const z = me.zone || 'world';
  const itype = interiorTypeOf(z);
  const entInfo = getEntranceInfo(z);
  const sectorStr = z.startsWith('bunker_')
    ? `BUNKER #${z.slice(7)}`
    : z.startsWith('raid_')
      ? `RAID #${z.slice(5)}`
      : entInfo
        ? entInfo.name.toUpperCase()
        : `${gridName(pred.x, pred.y)} · ${regionName(pred.x, pred.y)}`;
  setTextCached('sector', $('hud-sector'), sectorStr);

  // 1b. Campaign Mission & Rotating Contract Box
  const zPill = $('hud-zone-pill');
  if (zPill && hudCache.zone !== z) {
    hudCache.zone = z;
    zPill.className = 'zone-pill' + (itype ? ' ' + itype : '');
    const pillLabels = {
      bunker: '🛡️ BUNKER', raid: '☢️ RAID', airport: '✈️ AIRPORT', university: '🎓 UNIVERSITY', hospital: '🏥 HOSPITAL',
      mall: '🛍️ MALL', military: '🪖 MILITARY', historic: '⛪ CATHEDRAL', museum: '🖼️ ART MUSEUM',
      transit: '🚌 TRANSIT', industrial: '🏭 POWER WORKS', police: '🚓 POLICE HQ', fire: '🚒 FIRE STATION',
      bank: '🏦 CENTRAL BANK', stadium: '🏟️ STADIUM', aquarium: '🐠 AQUARIUM', science: '🔭 SCIENCE LAB',
      bazaar: '🕌 BAZAAR', pyramid: '🔺 ANCIENT TOMB', mosque: '🕌 MOSQUE', capitol: '⚖️ CAPITOL',
      palace: '👑 PALACE', greenhouse: '🌿 CONSERVATORY', mill: '🌾 GRANARY'
    };
    zPill.textContent = (itype && pillLabels[itype]) || '🌍 SURFACE';
  }
  if (me.mission) {
    setTextCached('mTitle', $('hud-mis-title'), me.mission.title || '');
    setTextCached('mDesc', $('hud-mis-desc'), me.mission.desc || '');
    const pct = me.mission.target > 0 ? clamp((me.mission.prog / me.mission.target) * 100, 0, 100) : 100;
    setWidthCached('mFill', $('hud-mis-fill'), `${pct}%`);
    setTextCached('mProg', $('hud-mis-prog'), `${me.mission.prog}/${me.mission.target}`);
    const mRewStr = String(me.mission.reward || '0');
    setTextCached('mRew', $('hud-mis-rew'), mRewStr.includes('⚙️') ? `+${mRewStr}` : `+${mRewStr}⚙️`);
  }
  if (me.contract) {
    setTextCached('cTitle', $('hud-ct-title'), me.contract.title || '');
    setTextCached('cProg', $('hud-ct-prog'), `${me.contract.prog}/${me.contract.target}`);
    const cRewStr = String(me.contract.reward || '0');
    setTextCached('cRew', $('hud-ct-rew'), cRewStr.includes('⚙️') ? `+${cRewStr}` : `+${cRewStr}⚙️`);
  }

  // 2. Biometrics: Health, Shield, Stamina, Vitals, Badges
  const shieldWrap = $('hud-shield-wrap');
  if (shieldWrap) {
    const hasSh = me.hardlightShield > 0;
    if (hudCache.hasSh !== hasSh) { hudCache.hasSh = hasSh; shieldWrap.hidden = !hasSh; }
    if (hasSh) {
      setTextCached('shVal', $('hud-shield-val'), `${Math.round(me.hardlightShield)}`);
      setWidthCached('shFill', $('hud-shield-fill'), `${clamp((me.hardlightShield / 150) * 100, 0, 100)}%`);
    }
  }

  const hpRounded = Math.max(0, Math.round(me.hp));
  setTextCached('hpVal', $('hud-hp-val'), `${hpRounded}`);
  const hpFill = $('hud-hp-fill');
  if (hpFill) {
    const hpPct = clamp(me.hp, 0, 100);
    setWidthCached('hpFill', hpFill, `${hpPct}%`);
    const crit = me.hp < 30;
    if (hudCache.crit !== crit) { hudCache.crit = crit; hpFill.classList.toggle('critical', crit); }
  }

  const stRounded = Math.round(me.st);
  setTextCached('stVal', $('hud-st-val'), `${stRounded}%`);
  setWidthCached('stFill', $('hud-st-fill'), `${clamp(me.st, 0, 100)}%`);
  setTextCached('foodVal', $('hud-food-val'), `${Math.round(me.hu || 0)}%`);
  setTextCached('waterVal', $('hud-water-val'), `${Math.round(me.th || 0)}%`);

  const infectMini = $('hud-infect-mini');
  if (infectMini) {
    const hasInf = me.inf > 0;
    if (hudCache.hasInf !== hasInf) { hudCache.hasInf = hasInf; infectMini.hidden = !hasInf; }
    if (hasInf) setTextCached('infVal', $('hud-infect-val'), `${Math.round(me.inf)}%`);
  }

  // Status Badges (only update DOM when badge mask changes)
  const badgesBox = $('hud-status-badges');
  if (badgesBox) {
    const bSig = `${me.dead?1:0}:${me.bl?1:0}:${me.fr?1:0}:${me.b & 163}`;
    if (hudCache.bSig !== bSig) {
      hudCache.bSig = bSig;
      let bHtml = '';
      if (me.dead) bHtml += '<span class="status-badge dead">KIA</span>';
      if (me.bl) bHtml += '<span class="status-badge bleed">BLEED</span>';
      if (me.fr) bHtml += '<span class="status-badge fracture">FRACTURE</span>';
      if (me.b & 32) bHtml += '<span class="status-badge burn">BURNING</span>';
      if (me.b & 1) bHtml += '<span class="status-badge buff">MEDS</span>';
      if (me.b & 2) bHtml += '<span class="status-badge buff">STIM</span>';
      if (me.b & 128) bHtml += '<span class="status-badge buff">NVG</span>';
      badgesBox.innerHTML = bHtml;
    }
  }

  // Screen Damage Vignette
  const vignette = $('hud-vignette');
  if (vignette) {
    const lowHp = me.hp < 30 && !me.dead;
    const bleed = !!me.bl;
    const vSig = `${lowHp ? 1 : 0}:${bleed ? 1 : 0}`;
    if (hudCache.vSig !== vSig) {
      hudCache.vSig = vSig;
      vignette.hidden = !(lowHp || bleed);
      vignette.classList.toggle('low-hp', lowHp);
      vignette.classList.toggle('bleeding', bleed);
    }
  }

  // 3. Vehicle Cockpit Telemetry vs Foot Weapon Deck
  const vehDock = $('hud-vehicle-dock');
  const wpnDeck = $('hud-weapon-deck');

  if (me.veh && inVeh && D && D.VEH && D.VLIST) {
    if (hudCache.inVehMode !== 1) {
      hudCache.inVehMode = 1;
      if (wpnDeck) wpnDeck.hidden = true;
      if (vehDock) vehDock.hidden = false;
    }
    const d = D.VEH[D.VLIST[inVeh.v[1]]];
    if (d) {
      const vIcon = (d.kind === 'plane' || d.kind === 'seaplane') ? '✈️' : d.kind === 'heli' ? '🚁' : (d.kind === 'boat' || d.kind === 'hover') ? '🚤' : '🚗';
      setTextCached('vIcon', $('veh-hud-icon'), vIcon);
      setTextCached('vName', $('veh-hud-name'), d.n ? d.n.toUpperCase() : 'VEHICLE');
      const altEl = $('veh-hud-alt');
      if (altEl) {
        if (d.air) {
          altEl.hidden = false;
          const isAirborne = (inVeh.alt > 0.5) || !!(inVeh.v[7] & 8);
          setTextCached('vAlt', altEl, isAirborne ? 'AIRBORNE' : 'TAXI');
          if (hudCache.vAir !== isAirborne) { hudCache.vAir = isAirborne; altEl.classList.toggle('air', isAirborne); }
        } else {
          altEl.hidden = true;
        }
      }
      const rawSp = inVeh.sp !== undefined ? inVeh.sp : inVeh.v[8];
      setTextCached('vSpd', $('veh-hud-speed'), `${Math.abs(Math.round(rawSp / 10))}`);
      setTextCached('vGear', $('veh-hud-gear'), keys.Space ? 'P' : rawSp < -15 ? 'R' : rawSp > 15 ? 'D' : 'N');
      setTextCached('vHull', $('veh-hull-val'), `${Math.round(me.vh || 0)}%`);
      setWidthCached('vHullF', $('veh-hull-fill'), `${clamp(me.vh || 0, 0, 100)}%`);
      setTextCached('vFuel', $('veh-fuel-val'), `${Math.round(me.vf || 0)}%`);
      setWidthCached('vFuelF', $('veh-fuel-fill'), `${clamp(me.vf || 0, 0, 100)}%`);
      const nitroChip = $('veh-nitro-chip');
      if (nitroChip) {
        const isBoosting = !!(keys.ShiftLeft || keys.ShiftRight);
        if (hudCache.vBoost !== isBoosting) { hudCache.vBoost = isBoosting; nitroChip.classList.toggle('active', isBoosting); }
      }
    }
  } else {
    if (hudCache.inVehMode !== 0) {
      hudCache.inVehMode = 0;
      if (vehDock) vehDock.hidden = true;
      if (wpnDeck) wpnDeck.hidden = false;
    }
    if (wpnDeck) {
      let curW = null, curSlot = null;
      if (inv && inv.hb) {
        if (inv.hb[me.sel]) {
          curSlot = inv.hb[me.sel];
          curW = WBY[curSlot[0]];
        }
      } else {
        curW = me.sel === 0 ? WBY[KNIFE] : (me.sel === 1 ? WBY[GLOCK] : null);
      }

      const gunIcon = $('hud-gun-icon');
      const ammoDisp = $('hud-ammo-display');
      const ammoCur = $('hud-ammo-cur');
      const magFill = $('hud-mag-fill');
      const reloadWrap = $('hud-reload-bar-wrap');
      const modeSemi = $('mode-semi'), modeBurst = $('mode-burst'), modeAuto = $('mode-auto');

      if (curW) {
        setTextCached('gCat', $('hud-gun-cat'), curW.cat.toUpperCase());
        if (gunIcon && hudCache.gSvgCat !== curW.cat) {
          hudCache.gSvgCat = curW.cat;
          gunIcon.innerHTML = getWeaponSvg(curW.cat, true);
        }
        setTextCached('gName', $('hud-gun-name'), curW.name.toUpperCase());
        setTextCached('gMeta', $('hud-gun-meta'), curW.mag ? `${curW.ammo ? curW.ammo.toUpperCase() : 'STD'}` : curW.count ? 'ORDNANCE' : 'MELEE');

        const fMode = curW.auto ? 'a' : curW.burst ? 'b' : 's';
        if (modeSemi && modeBurst && modeAuto && hudCache.fMode !== fMode) {
          hudCache.fMode = fMode;
          modeSemi.classList.toggle('active', fMode === 's');
          modeBurst.classList.toggle('active', fMode === 'b');
          modeAuto.classList.toggle('active', fMode === 'a');
        }
        if (ammoDisp && hudCache.ammoVis !== true) { hudCache.ammoVis = true; ammoDisp.hidden = false; }

        if (curW.mag) {
          const maxMag = curW.mag || 1;
          const mag = me.mag !== undefined ? me.mag : (curSlot ? curSlot[1] : curW.mag);
          const res = me.res >= 0 ? me.res : 0;
          setTextCached('aCur', ammoCur, String(mag));
          if (ammoCur && hudCache.aEmpty !== (mag === 0)) { hudCache.aEmpty = (mag === 0); ammoCur.classList.toggle('empty', mag === 0); }
          setTextCached('aRes', $('hud-ammo-res'), String(res));
          setTextCached('aLbl', $('hud-ammo-label'), mag === 0 ? 'EMPTY [R]' : 'RDY');
          setWidthCached('mFillW', magFill, `${clamp((mag / maxMag) * 100, 0, 100)}%`);
          if (magFill) {
            const lowA = mag <= Math.ceil(maxMag * 0.25);
            if (hudCache.lowA !== lowA) { hudCache.lowA = lowA; magFill.classList.toggle('low-ammo', lowA); }
          }
        } else if (curW.count) {
          const cnt = me.n !== undefined ? me.n : (curSlot ? curSlot[2] : 1);
          setTextCached('aCur', ammoCur, `×${cnt}`);
          if (ammoCur && hudCache.aEmpty !== false) { hudCache.aEmpty = false; ammoCur.classList.remove('empty'); }
          setTextCached('aRes', $('hud-ammo-res'), 'STK');
          setTextCached('aLbl', $('hud-ammo-label'), 'QTY');
          setWidthCached('mFillW', magFill, '100%');
          if (magFill && hudCache.lowA !== false) { hudCache.lowA = false; magFill.classList.remove('low-ammo'); }
        } else {
          setTextCached('aCur', ammoCur, '∞');
          if (ammoCur && hudCache.aEmpty !== false) { hudCache.aEmpty = false; ammoCur.classList.remove('empty'); }
          setTextCached('aRes', $('hud-ammo-res'), '—');
          setTextCached('aLbl', $('hud-ammo-label'), 'MELEE');
          setWidthCached('mFillW', magFill, '100%');
          if (magFill && hudCache.lowA !== false) { hudCache.lowA = false; magFill.classList.remove('low-ammo'); }
        }

        if (reloadWrap) {
          const reloading = me.rl > 0 && me.rlT > 0;
          if (hudCache.reloading !== reloading) { hudCache.reloading = reloading; reloadWrap.hidden = !reloading; }
          if (reloading) {
            const prog = clamp((1 - me.rl / me.rlT) * 100, 0, 100);
            setWidthCached('rlFill', $('hud-reload-fill'), `${prog}%`);
            setTextCached('rlTxt', $('hud-reload-text'), `RELOADING ${Math.round(prog)}%`);
          }
        }
      } else {
        setTextCached('gCat', $('hud-gun-cat'), 'UNARMED');
        if (gunIcon && hudCache.gSvgCat !== 'default') { hudCache.gSvgCat = 'default'; gunIcon.innerHTML = getWeaponSvg('default', true); }
        setTextCached('gName', $('hud-gun-name'), 'FISTS');
        setTextCached('gMeta', $('hud-gun-meta'), '[1]-[5]');
        if (ammoDisp && hudCache.ammoVis !== false) { hudCache.ammoVis = false; ammoDisp.hidden = true; }
        setTextCached('aLbl', $('hud-ammo-label'), '—');
        if (reloadWrap && hudCache.reloading !== false) { hudCache.reloading = false; reloadWrap.hidden = true; }
        setWidthCached('mFillW', magFill, '0%');
      }

      // Hotbar 5 slots: ONLY rebuild DOM when hotbar contents or selected slot change!
      const hotbarEl = $('hud-hotbar');
      if (hotbarEl) {
        const hbList = (inv && inv.hb) ? inv.hb : [
          KNIFE ? [KNIFE, 0, 0] : null,
          GLOCK ? [GLOCK, 17, 0] : null,
          null, null, null
        ];
        const hbParts = [me.sel];
        for (let i = 0; i < 5; i++) {
          const s = hbList[i];
          if (!s) { hbParts.push('-'); continue; }
          const wObj = WBY[s[0]] || (s[0] === 0 && KNIFE ? WBY[KNIFE] : (s[0] === 1 && GLOCK ? WBY[GLOCK] : null));
          const val = (i === me.sel) ? (wObj && wObj.count ? (me.n !== undefined ? me.n : s[2]) : (me.mag !== undefined ? me.mag : s[1])) : (wObj && wObj.count ? s[2] : s[1]);
          hbParts.push(`${s[0]}:${val}`);
        }
        const hbSig = hbParts.join('|');
        if (hudCache.hbSig !== hbSig) {
          hudCache.hbSig = hbSig;
          let hbHtml = '';
          for (let i = 0; i < 5; i++) {
            const s = hbList[i];
            const isSelected = me.sel === i;
            let label = 'Empty', ammoStr = '', svgIcon = getWeaponSvg('default', false);
            if (s) {
              const wObj = WBY[s[0]] || (s[0] === 0 && KNIFE ? WBY[KNIFE] : (s[0] === 1 && GLOCK ? WBY[GLOCK] : null));
              if (wObj) {
                label = wObj.name;
                svgIcon = getWeaponSvg(wObj.cat, false);
                if (wObj.count) {
                  const cnt = isSelected ? (me.n !== undefined ? me.n : s[2]) : s[2];
                  ammoStr = `×${cnt}`;
                } else if (wObj.mag) {
                  const curM = isSelected ? (me.mag !== undefined ? me.mag : s[1]) : s[1];
                  ammoStr = `${curM}/${wObj.mag}`;
                } else {
                  ammoStr = 'melee';
                }
              }
            }
            hbHtml += `<div class="hud-slot ${isSelected ? 'active-slot' : ''} ${s ? 'has-weapon' : 'empty-slot'}" data-slot="${i}" title="${esc(label)}"><div class="slot-num">${i + 1}</div><div class="slot-icon">${svgIcon}</div><div class="slot-ammo">${ammoStr}</div></div>`;
          }
          hotbarEl.innerHTML = hbHtml;
          if (!hotbarEl._delegated) {
            hotbarEl._delegated = true;
            hotbarEl.onclick = e => {
              const node = e.target.closest('.hud-slot');
              if (!node) return;
              const slotIdx = +node.dataset.slot;
              if (slotIdx >= 0 && slotIdx <= 4) send({ t: 'slot', v: slotIdx });
            };
          }
        }
      }
    }
  }
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
  // Region district labels when zoomed out enough for strategic overview
  if (s < 0.14 && M && M.rnames) {
    g.font = 'bold 11px system-ui';
    g.textAlign = 'center';
    for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 5; rx++) {
      const [cx2, cy2] = W2((rx + 0.5) * 6400, (ry + 0.5) * 6400);
      const rname = M.rnames[ry * 5 + rx];
      if (!rname) continue;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(rname.toUpperCase(), cx2 + 1, cy2 + 1);
      g.fillStyle = 'rgba(226,232,240,0.68)'; g.fillText(rname.toUpperCase(), cx2, cy2);
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

  // Draw 4 Wasteland Raid Bunkers on Big Map
  if (D && D.RAID_BUNKERS) {
    for (const rb of D.RAID_BUNKERS) {
      const [rx, ry] = W2(rb.x, rb.y);
      g.fillStyle = '#ef4444'; g.fillRect(rx - 6, ry - 6, 12, 12);
      g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(rx - 6, ry - 6, 12, 12);
      if (s > 0.04) {
        g.font = 'bold 11px system-ui'; g.fillStyle = '#fca5a5';
        g.fillText(`☢️ ${rb.name}`, rx, ry - 12);
      }
    }
  }

  // Draw Enterable Sub-Map Locations (Universities, Hospitals, Malls, Military, Historic, Museums, Transit, Industrial)
  if (M && M.entrances) {
    for (const ent of M.entrances) {
      const [ex, ey] = W2(ent.x, ent.y);
      if (ex < -40 || ey < -40 || ex > VW + 40 || ey > VH + 40) continue;
      const meta = ENT_META[ent.type] || ENT_META.university;
      g.fillStyle = meta.accent;
      g.beginPath(); g.arc(ex, ey, s > 0.08 ? 5 : 3.8, 0, 7); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 1.4; g.stroke();
      if (s > 0.085) {
        g.font = 'bold 10px system-ui'; g.lineWidth = 2.5; g.strokeStyle = '#000';
        const lbl = `${meta.icon} ${ent.name}`;
        g.strokeText(lbl, ex, ey - 9);
        g.fillStyle = meta.accent;
        g.fillText(lbl, ex, ey - 9);
      }
    }
  }

  // Draw active Campaign Objective pulsing ring
  const obj = getObjectiveTarget(pred.x, pred.y);
  if (obj) {
    const [tx, ty] = W2(obj.x, obj.y);
    g.strokeStyle = '#c084fc'; g.lineWidth = 3;
    g.beginPath(); g.arc(tx, ty, 12 + Math.sin(now / 180) * 3, 0, 7); g.stroke();
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

  g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(10, VH - 36, Math.min(VW - 20, 1080), 26);
  g.fillStyle = '#cfd6df'; g.font = '12px system-ui';
  g.fillText('Wheel zoom · drag pan · click = waypoint · M / Esc close · 🏰 Shelters · ☢️ Raids · 🎓 Univ · 🏥 Hosp · 🛍️ Mall · 🪖 Mil · 🏛️ Historic · 🖼️ Civic · 🏟️ Hubs · 🏭 Power', 18, VH - 20);

  requestAnimationFrame(drawBigmap);
}

})();
