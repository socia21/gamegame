'use strict';
// DEAD WORLD — private multiplayer zombie server. Only people with the 64-bit GAME_KEY can join.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const {WebSocketServer} = require('ws');
const {Game} = require('./game');

const PORT = +process.env.PORT || 3000;
const fmt = k => k.toUpperCase().match(/.{4}/g).join('-');
let KEY = (process.env.GAME_KEY || 'deadbeefdeadbeef').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
if (KEY.length !== 16) {
  KEY = crypto.randomBytes(8).toString('hex');
  console.log('\n⚠  No valid GAME_KEY env var (must be 16 hex chars = 64 bits).');
  console.log('   Generated a temporary key for this run: ' + fmt(KEY));
  console.log('   Set GAME_KEY in environment variables so it stays the same across restarts.\n');
} else console.log('[auth] GAME_KEY loaded (' + fmt(KEY).slice(0, 4) + '-****-****-****)');
const KEYBUF = Buffer.from(KEY);
const MAX_PLAYERS = +process.env.MAX_PLAYERS || 16;
const game = new Game(+process.env.MAP_SEED || 42);

const accounts = require('./accounts');

// ── static files ──
const PUB = path.join(__dirname, '..', 'public');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};
const server = http.createServer((req, res) => {
  let url = '/';
  try {
    url = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    url = (req.url || '/').split('?')[0];
  }
  if (url === '/health') { res.writeHead(200, {'Content-Type': 'text/plain'}); res.end('ok'); return; }
  if (url === '/key' || url === '/api/key') {
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
    res.end(JSON.stringify({key: fmt(KEY)}));
    return;
  }
  if (req.method === 'POST' && (url === '/api/register' || url === '/api/login')) {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const r = url === '/api/register' ? accounts.register(username, password) : accounts.login(username, password);
        res.writeHead(r.ok ? 200 : 400, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: false, error: 'Invalid JSON'}));
      }
    });
    return;
  }
  const file = path.normalize(path.join(PUB, url === '/' ? 'index.html' : url));
  if (file !== PUB && !file.startsWith(PUB + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'});
    res.end(data);
  });
});

// ── auth rate limiting ──
const fails = new Map(); // ip -> {n, until}
const blocked = ip => { const f = fails.get(ip); return f && f.n >= 6 && Date.now() < f.until; };
const fail = ip => { const f = fails.get(ip) || {n: 0, until: 0}; f.n++; f.until = Date.now() + 10 * 60 * 1000; fails.set(ip, f); };
setInterval(() => { const n = Date.now(); for (const [ip, f] of fails) if (n > f.until) fails.delete(ip); }, 60000);

const wss = new WebSocketServer({server, path: '/ws', maxPayload: 32 * 1024, perMessageDeflate: {threshold: 1024, zlibDeflateOptions: {level: 3}}});
wss.on('connection', (ws, req) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (blocked(ip)) { ws.send(JSON.stringify({t: 'denied', why: 'Too many wrong keys — try again in 10 minutes.'})); ws.close(); return; }
  let player = null;
  const timer = setTimeout(() => { if (!player) ws.close(); }, 15000);
  let msgs = 0, win = Date.now();
  ws.on('message', data => {
    const n = Date.now(); if (n - win > 1000) { win = n; msgs = 0; } if (++msgs > 120) return; // flood guard
    let m; try { m = JSON.parse(data); } catch { return; }
    if (!player) {
      if (!m || m.t !== 'auth') return;
      const k = String(m.key || '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
      const ok = k.length === 16 && crypto.timingSafeEqual(Buffer.from(k), KEYBUF);
      if (!ok) { fail(ip); console.log('[auth] rejected key from ' + ip); ws.send(JSON.stringify({t: 'denied', why: 'Invalid key.'})); ws.close(); return; }
      if (game.players.size >= MAX_PLAYERS) { ws.send(JSON.stringify({t: 'denied', why: 'Server full.'})); ws.close(); return; }
      let acc = null;
      if (m.username && m.password) {
        const authRes = m.isRegister ? accounts.register(m.username, m.password) : accounts.login(m.username, m.password);
        if (!authRes.ok) { ws.send(JSON.stringify({t: 'denied', why: authRes.error})); ws.close(); return; }
        acc = accounts.getAccount(m.username);
      }
      clearTimeout(timer); fails.delete(ip);
      player = game.addPlayer(ws, m.name || (acc ? acc.username : ''), acc, m.team, m.mode);
      console.log(`[join] ${player.name} (${acc ? 'Account' : 'Guest'}, ${ip}) — ${game.players.size} online`);
      return;
    }
    try { game.onMessage(player, m); } catch (e) { console.error('[msg error]', e); }
  });
  ws.on('close', () => { clearTimeout(timer); if (player) { game.removePlayer(player); console.log(`[leave] ${player.name} — ${game.players.size} online`); } });
  ws.on('error', () => {});
});

let last = Date.now();
setInterval(() => {
  const n = Date.now(); const dt = Math.min(0.1, (n - last) / 1000); last = n;
  try { game.tick(dt); } catch (e) { console.error('[tick error]', e); }
}, 1000 / 30);

server.on('error', err => console.error('[http server error]', err));
wss.on('error', err => console.error('[wss error]', err));

process.on('uncaughtException', err => console.error('[uncaughtException]', err));
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason));

server.listen(PORT, '0.0.0.0', () => console.log(`[http] DEAD WORLD listening on 0.0.0.0:${PORT}`));
