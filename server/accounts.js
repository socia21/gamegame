'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'accounts.json');

// In-memory cache synced to disk
let accounts = new Map();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function loadAccounts() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      accounts = new Map(Object.entries(data));
      console.log(`[accounts] Loaded ${accounts.size} survivor accounts from database.`);
    } else {
      accounts = new Map();
      saveAccounts();
    }
  } catch (err) {
    console.error('[accounts] Failed to read accounts file, initializing empty:', err);
    accounts = new Map();
  }
}

function saveAccounts() {
  try {
    const obj = Object.fromEntries(accounts);
    fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[accounts] Failed to save accounts to disk:', err);
  }
}

// Initialize on require
loadAccounts();

function register(username, password) {
  const user = String(username || '').trim().toLowerCase();
  if (!user || user.length < 2 || user.length > 20) {
    return { ok: false, error: 'Username must be between 2 and 20 characters.' };
  }
  if (!password || password.length < 3) {
    return { ok: false, error: 'Password / PIN must be at least 3 characters.' };
  }
  if (accounts.has(user)) {
    return { ok: false, error: 'Survivor name already registered. Please sign in.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const account = {
    username: String(username).trim(),
    salt,
    hash,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    plotId: null,
    scrap: 150, // Starting bonus scrap
    rebirths: 0, // Reborn prestige tier
    prestigeTokens: 0, // Quantum Cores (⚛️)
    rebornPerks: {}, // Permanent ascendant perks
    stats: {
      kills: 0,
      deaths: 0,
      scavenged: 0,
      timePlayed: 0
    },
    upgrades: {}
  };

  accounts.set(user, account);
  saveAccounts();
  return { ok: true, account: sanitizeAccount(account) };
}

function login(username, password) {
  const user = String(username || '').trim().toLowerCase();
  if (!accounts.has(user)) {
    return { ok: false, error: 'Survivor account not found. Click Register to create one!' };
  }
  const acc = accounts.get(user);
  const hash = hashPassword(password, acc.salt);
  if (hash !== acc.hash) {
    return { ok: false, error: 'Incorrect password or PIN.' };
  }
  acc.lastLogin = Date.now();
  saveAccounts();
  return { ok: true, account: sanitizeAccount(acc) };
}

function getAccount(username) {
  const user = String(username || '').trim().toLowerCase();
  return accounts.get(user) || null;
}

function savePlotProgress(username, plotId, upgrades, scrap) {
  const user = String(username || '').trim().toLowerCase();
  const acc = accounts.get(user);
  if (!acc) return false;
  acc.plotId = plotId;
  acc.upgrades = upgrades || acc.upgrades;
  acc.scrap = Math.max(0, scrap !== undefined ? scrap : acc.scrap);
  saveAccounts();
  return true;
}

function updateStats(username, statDeltas) {
  const user = String(username || '').trim().toLowerCase();
  const acc = accounts.get(user);
  if (!acc) return;
  acc.stats = acc.stats || { kills: 0, deaths: 0, scavenged: 0, timePlayed: 0 };
  for (const [k, v] of Object.entries(statDeltas)) {
    acc.stats[k] = (acc.stats[k] || 0) + v;
  }
  saveAccounts();
}

function performReborn(username, bonusCores = 5) {
  const user = String(username || '').trim().toLowerCase();
  const acc = accounts.get(user);
  if (!acc) return null;
  acc.rebirths = (acc.rebirths || 0) + 1;
  acc.prestigeTokens = (acc.prestigeTokens || 0) + bonusCores;
  acc.plotId = null;
  acc.upgrades = {};
  // Bonus starting scrap based on new rebirth tier
  acc.scrap = 300 * (1 + acc.rebirths);
  acc.rebornPerks = acc.rebornPerks || {};
  saveAccounts();
  return sanitizeAccount(acc);
}

function buyRebornPerk(username, perkKey, cost) {
  const user = String(username || '').trim().toLowerCase();
  const acc = accounts.get(user);
  if (!acc) return { ok: false, error: 'Account not found' };
  acc.prestigeTokens = acc.prestigeTokens || 0;
  if (acc.prestigeTokens < cost) {
    return { ok: false, error: `Need ${cost} Quantum Cores (have ${acc.prestigeTokens})` };
  }
  acc.prestigeTokens -= cost;
  acc.rebornPerks = acc.rebornPerks || {};
  acc.rebornPerks[perkKey] = (acc.rebornPerks[perkKey] || 0) + 1;
  saveAccounts();
  return { ok: true, account: sanitizeAccount(acc) };
}

function sanitizeAccount(acc) {
  const { salt, hash, ...safe } = acc;
  safe.rebirths = safe.rebirths || 0;
  safe.prestigeTokens = safe.prestigeTokens || 0;
  safe.rebornPerks = safe.rebornPerks || {};
  return safe;
}

module.exports = {
  register,
  login,
  getAccount,
  savePlotProgress,
  updateStats,
  performReborn,
  buyRebornPerk,
  sanitizeAccount
};

