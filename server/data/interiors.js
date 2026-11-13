'use strict';

// Shared Huge Underground Interior Blueprints (1800 x 1200)
// Used identically by both server collision/interaction logic and client high-detail renderer.

const RAID_BUNKERS = [
  { id: 1, name: 'Site-A Bio-Containment Vault', x: 8800, y: 8800, region: 'Northern Exclusion Zone' },
  { id: 2, name: 'Site-B Black-Ops Armory Bunker', x: 23200, y: 8800, region: 'Eastern Ridge Sector' },
  { id: 3, name: 'Site-C Subterranean Reactor Hub', x: 8800, y: 23200, region: 'Southern Basin Complex' },
  { id: 4, name: 'Site-D Exodus Command Vault', x: 23200, y: 23200, region: 'Harbour Deep Facility' }
];

function buildStandardWalls() {
  // 1800 x 1200 layout divided into 6 huge interconnected wings (3 cols x 2 rows)
  // Cols: 0..600 | 600..1200 | 1200..1800
  // Rows: 0..590 | 610..1200
  const walls = [
    // Outer thick bunker hull
    [0, 0, 1800, 28],
    [0, 1172, 1800, 28],
    [0, 28, 28, 1144],
    [1772, 28, 28, 1144],

    // Vertical divider x=590 (Armory <-> Command | Workshop <-> Reactor)
    // Doorways at y=240..360 (top) and y=840..960 (bottom)
    [590, 28, 20, 212],
    [590, 360, 20, 480],
    [590, 960, 20, 212],

    // Vertical divider x=1190 (Command <-> MedBay | Reactor <-> Vault)
    // Doorways at y=240..360 (top) and y=840..960 (bottom)
    [1190, 28, 20, 212],
    [1190, 360, 20, 480],
    [1190, 960, 20, 212],

    // Horizontal divider y=590 (Top row <-> Bottom row)
    // Doorways in all 3 wings: x=240..360, x=840..960, x=1440..1560
    [28, 590, 212, 20],
    [360, 590, 480, 20],
    [960, 590, 480, 20],
    [1560, 590, 212, 20],

    // Solid interior fixtures / cover pillars
    [820, 250, 160, 80],   // Command Atrium Hologram Table
    [840, 840, 120, 120],  // Reactor Core Pedestal
    [240, 130, 140, 46],   // Armory Counter
    [1430, 130, 140, 46],  // Med-Bay Surgical Console
    [240, 1020, 140, 46],  // Workshop Bench
    [1440, 960, 120, 60]   // Containment Vault Security Desk
  ];
  return walls;
}

const BUNKER_WALLS = buildStandardWalls();

const BUNKER_ROOMS = [
  { id: 'armory', name: 'ARMORY & BALLISTICS BAY', x: 28, y: 28, w: 562, h: 562, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'command', name: 'CENTRAL COMMAND ATRIUM', x: 610, y: 28, w: 580, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
  { id: 'medbay', name: 'BIO-MED & SURGERY WING', x: 1210, y: 28, w: 562, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'workshop', name: 'ENGINEERING & ARMOR BAY', x: 28, y: 610, w: 562, h: 562, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'reactor', name: 'REACTOR & HYDROPONICS LAB', x: 610, y: 610, w: 580, h: 562, tint: 'rgba(168, 85, 247, 0.06)', accent: '#a855f7' },
  { id: 'vault', name: 'CONTAINMENT & VAULT SECTOR', x: 1210, y: 610, w: 562, h: 562, tint: 'rgba(239, 68, 68, 0.06)', accent: '#ef4444' }
];

const BUNKER_STATIONS = [
  { id: 'exit_lift', kind: 'exit_lift', name: 'Surface Elevator Lift', icon: '🛗', x: 900, y: 120, r: 85, cost: 0, desc: 'Return to Surface' },
  { id: 'tycoon_console', kind: 'tycoon_console', name: 'Command Holo-Table', icon: '🖥️', x: 900, y: 370, r: 95, cost: 0, desc: 'Open Shelter Tycoon' },
  { id: 'mission_board', kind: 'mission_board', name: 'Exodus Ops Terminal', icon: '📡', x: 720, y: 160, r: 85, cost: 0, desc: 'Check / Cycle Contract' },

  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Munitions Replicator', icon: '🎯', x: 160, y: 180, r: 85, cost: 25, desc: 'Refill All Weapon Ammo (Free w/ Ammo Press)' },
  { id: 'weapon_forge', kind: 'weapon_forge', name: 'Tactical Weapon Printer', icon: '🔫', x: 420, y: 210, r: 85, cost: 110, desc: 'Print Tiered Military Firearm' },

  { id: 'med_pod', kind: 'med_pod', name: 'Auto-Doc Cryo-Pod', icon: '🩺', x: 1500, y: 220, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection (Free w/ Medbay)' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Bio-Chem Synthesizer', icon: '💉', x: 1650, y: 420, r: 85, cost: 40, desc: 'Synthesize Medkit + Bandages' },

  { id: 'gear_fab', kind: 'gear_fab', name: 'Tactical Armor Wardrobe', icon: '🦺', x: 170, y: 820, r: 85, cost: 90, desc: 'Fabricate Kevlar Vest & Backpack' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Scrap Material Bench', icon: '🔧', x: 430, y: 980, r: 85, cost: 35, desc: 'Fabricate Building & Vehicle Parts' },

  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Hydroponics Ration Synth', icon: '🌱', x: 710, y: 960, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina (Free in Owned Shelter)' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Zero-Point Reactor Core', icon: '⚛️', x: 900, y: 790, r: 95, cost: 0, desc: 'Harvest Core Scrap Surge (60s CD)' },

  { id: 'vault_locker', kind: 'vault_locker', name: 'Classified Supply Vault', icon: '🔐', x: 1500, y: 880, r: 95, cost: 0, desc: 'Crack Security Locker for Rare Loot & Scrap' }
];

const INTERIORS = {
  bunker: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 185,
    walls: BUNKER_WALLS,
    rooms: BUNKER_ROOMS,
    stations: BUNKER_STATIONS
  },
  raid: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 185,
    walls: BUNKER_WALLS,
    rooms: BUNKER_ROOMS,
    stations: BUNKER_STATIONS
  }
};

module.exports = {
  INTERIORS,
  RAID_BUNKERS
};
