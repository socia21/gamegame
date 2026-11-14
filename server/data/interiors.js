'use strict';

// Shared Huge Multi-Wing Interior Blueprints
// Used identically by both server collision/interaction logic and client high-detail renderer.

const RAID_BUNKERS = [
  { id: 1, name: 'Site-A Bio-Containment Vault', x: 8800, y: 8800, region: 'Northern Exclusion Zone' },
  { id: 2, name: 'Site-B Black-Ops Armory Bunker', x: 23200, y: 8800, region: 'Eastern Ridge Sector' },
  { id: 3, name: 'Site-C Subterranean Reactor Hub', x: 8800, y: 23200, region: 'Southern Basin Complex' },
  { id: 4, name: 'Site-D Exodus Command Vault', x: 23200, y: 23200, region: 'Harbour Deep Facility' }
];

function buildStandardWalls() {
  const walls = [
    [0, 0, 1800, 28],
    [0, 1172, 1800, 28],
    [0, 28, 28, 1144],
    [1772, 28, 28, 1144],

    [590, 28, 20, 212],
    [590, 360, 20, 480],
    [590, 960, 20, 212],

    [1190, 28, 20, 212],
    [1190, 360, 20, 480],
    [1190, 960, 20, 212],

    [28, 590, 212, 20],
    [360, 590, 480, 20],
    [960, 590, 480, 20],
    [1560, 590, 212, 20],

    [820, 250, 160, 80],
    [840, 840, 120, 120],
    [240, 130, 140, 46],
    [1430, 130, 140, 46],
    [240, 1020, 140, 46],
    [1440, 960, 120, 60]
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

// ───────── UNIVERSITY CAMPUS INTERIOR (1800 x 1200) ─────────
const UNIV_WALLS = [
  [0, 0, 1800, 28],
  [0, 1172, 1800, 28],
  [0, 28, 28, 1144],
  [1772, 28, 28, 1144],

  // West wing divider x=580 (doorways y=240..360, y=840..960)
  [580, 28, 20, 212],
  [580, 360, 20, 480],
  [580, 960, 20, 212],

  // East wing divider x=1200 (doorways y=240..360, y=840..960)
  [1200, 28, 20, 212],
  [1200, 360, 20, 480],
  [1200, 960, 20, 212],

  // West horizontal y=590 (doorway x=240..360)
  [28, 590, 212, 20],
  [360, 590, 220, 20],

  // East horizontal y=590 (doorway x=1440..1560)
  [1220, 590, 220, 20],
  [1560, 590, 212, 20],

  // Center horizontal y=660 (grand double doorway x=810..990)
  [600, 660, 210, 20],
  [990, 660, 210, 20],

  // Library bookshelves (West-North)
  [130, 150, 22, 230],
  [270, 150, 22, 230],
  [410, 150, 22, 230],

  // Lecture Hall podium & tiered benches (North-Center)
  [820, 155, 160, 44],
  [690, 310, 150, 28],
  [960, 310, 150, 28],
  [690, 420, 150, 28],
  [960, 420, 150, 28],

  // Main Foyer Reception Desk (South-Center)
  [820, 880, 160, 42],

  // Cafeteria Tables (West-South)
  [130, 770, 110, 42],
  [340, 770, 110, 42],
  [130, 970, 110, 42],

  // Bio-Chem Lab Benches (East-North)
  [1320, 190, 150, 42],
  [1540, 190, 150, 42],

  // Campus Infirmary Partition (East-South)
  [1430, 870, 140, 42]
];

const UNIV_ROOMS = [
  { id: 'library', name: 'MAIN LIBRARY & ARCHIVES', x: 28, y: 28, w: 552, h: 562, tint: 'rgba(217, 119, 6, 0.07)', accent: '#f59e0b' },
  { id: 'lecture', name: 'GRAND LECTURE HALL', x: 600, y: 28, w: 600, h: 632, tint: 'rgba(180, 83, 9, 0.06)', accent: '#fbbf24' },
  { id: 'biolab', name: 'BIO-CHEM & ROBOTICS LAB', x: 1220, y: 28, w: 552, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
  { id: 'cafeteria', name: 'STUDENT UNION CAFETERIA', x: 28, y: 610, w: 552, h: 562, tint: 'rgba(249, 115, 22, 0.06)', accent: '#fb923c' },
  { id: 'foyer', name: 'CAMPUS ATRIUM & FOYER', x: 600, y: 680, w: 600, h: 492, tint: 'rgba(234, 179, 8, 0.06)', accent: '#eab308' },
  { id: 'infirmary', name: 'CAMPUS INFIRMARY & GYM', x: 1220, y: 610, w: 552, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' }
];

const UNIV_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Campus Main Doors', icon: '🚪', x: 900, y: 1095, r: 90, cost: 0, desc: 'Exit to University Campus' },
  { id: 'mission_board', kind: 'mission_board', name: 'Campus Directory Board', icon: '📋', x: 700, y: 900, r: 85, cost: 0, desc: 'Check Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Research Server Mainframe', icon: '💾', x: 485, y: 475, r: 90, cost: 0, desc: 'Extract Research Data & Scrap (60s CD)' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Student Union Kitchen', icon: '☕', x: 350, y: 1040, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Bio-Chemistry Lab Synth', icon: '🧪', x: 1640, y: 390, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'med_pod', kind: 'med_pod', name: 'Infirmary Treatment Bed', icon: '🩺', x: 1630, y: 740, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Campus Security Locker', icon: '🦺', x: 1340, y: 1040, r: 85, cost: 85, desc: 'Equip Vest, Backpack & Gas Mask' },
  { id: 'vault_locker', kind: 'vault_locker', name: "Dean's Classified Vault", icon: '🔐', x: 900, y: 88, r: 90, cost: 0, desc: 'Crack Security Safe for Rare Gear & Scrap' }
];

// ───────── HOSPITAL INTERIOR (1800 x 1200) ─────────
const HOSP_WALLS = [
  [0, 0, 1800, 28],
  [0, 1172, 1800, 28],
  [0, 28, 28, 1144],
  [1772, 28, 28, 1144],

  // West wing divider x=540 (doorways y=240..360, y=840..960)
  [540, 28, 20, 212],
  [540, 360, 20, 480],
  [540, 960, 20, 212],

  // East wing divider x=1240 (doorways y=240..360, y=840..960)
  [1240, 28, 20, 212],
  [1240, 360, 20, 480],
  [1240, 960, 20, 212],

  // West horizontal y=590 (doorway x=220..340)
  [28, 590, 192, 20],
  [340, 590, 200, 20],

  // East horizontal y=590 (doorway x=1460..1580)
  [1260, 590, 200, 20],
  [1580, 590, 192, 20],

  // Center horizontal y=680 (doorway x=830..970)
  [560, 680, 270, 20],
  [970, 680, 270, 20],

  // Triage Reception Desk (South-Center)
  [810, 880, 180, 42],

  // ICU Bed Bays (North-Center)
  [660, 220, 95, 44],
  [1045, 220, 95, 44],
  [660, 410, 95, 44],
  [1045, 410, 95, 44],

  // Operating Table (West-North)
  [220, 260, 120, 54],

  // Pharmacy & Morgue Racks (West-South)
  [120, 760, 145, 36],
  [120, 960, 145, 36],

  // Quarantine Lab Partition (East-North)
  [1440, 270, 130, 40],

  // Staff Lounge Tables (East-South)
  [1360, 800, 105, 42],
  [1540, 950, 105, 42]
];

const HOSP_ROOMS = [
  { id: 'surgery', name: 'OPERATING THEATRE', x: 28, y: 28, w: 512, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'icu', name: 'INTENSIVE CARE WARD (ICU)', x: 560, y: 28, w: 680, h: 652, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
  { id: 'quarantine', name: 'QUARANTINE & BIO-LAB', x: 1260, y: 28, w: 512, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' },
  { id: 'pharmacy', name: 'CENTRAL PHARMACY & MORGUE', x: 28, y: 610, w: 512, h: 562, tint: 'rgba(168, 85, 247, 0.06)', accent: '#a855f7' },
  { id: 'triage', name: 'EMERGENCY TRIAGE LOBBY', x: 560, y: 700, w: 680, h: 472, tint: 'rgba(226, 232, 240, 0.05)', accent: '#94a3b8' },
  { id: 'lounge', name: 'CAFETERIA & STAFF LOUNGE', x: 1260, y: 610, w: 512, h: 562, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' }
];

const HOSP_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Ambulance Bay Exit', icon: '🚑', x: 900, y: 1095, r: 90, cost: 0, desc: 'Exit to Street' },
  { id: 'mission_board', kind: 'mission_board', name: 'Triage Dispatch Terminal', icon: '🩺', x: 700, y: 900, r: 85, cost: 0, desc: 'Check Active Missions' },
  { id: 'med_pod', kind: 'med_pod', name: 'ICU Auto-Doc Surgical Pod', icon: '❤️‍🩹', x: 900, y: 130, r: 95, cost: 15, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Central Pharmacy Synth', icon: '💊', x: 400, y: 860, r: 85, cost: 30, desc: 'Synthesize Medkit + Bandages' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Medical Supply Sterilizer', icon: '🧰', x: 160, y: 440, r: 85, cost: 35, desc: 'Fabricate Materials & Fuel' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Backup Hospital Generator', icon: '⚡', x: 160, y: 1075, r: 90, cost: 0, desc: 'Siphon Reserve Power & Scrap (60s CD)' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Cafeteria & Hydration Bar', icon: '🥤', x: 1630, y: 1055, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Quarantine Bio-Vault', icon: '🔐', x: 1620, y: 160, r: 95, cost: 0, desc: 'Breach Bio-Safe for Rare Gear & Scrap' }
];

// ───────── SHOPPING MALL INTERIOR (1920 x 1260) ─────────
const MALL_WALLS = [
  [0, 0, 1920, 28],
  [0, 1232, 1920, 28],
  [0, 28, 28, 1204],
  [1892, 28, 28, 1204],

  // West storefront wall x=500 (doorways y=240..370, y=860..990)
  [500, 28, 20, 212],
  [500, 370, 20, 490],
  [500, 990, 20, 242],

  // East storefront wall x=1400 (doorways y=240..370, y=860..990)
  [1400, 28, 20, 212],
  [1400, 370, 20, 490],
  [1400, 990, 20, 242],

  // West horizontal divider y=620 (doorway x=200..320)
  [28, 620, 172, 20],
  [320, 620, 180, 20],

  // East horizontal divider y=620 (doorway x=1600..1720)
  [1420, 620, 180, 20],
  [1720, 620, 172, 20],

  // North Tech Emporium wall y=350 (grand concourse arch x=870..1050)
  [520, 350, 350, 20],
  [1050, 350, 350, 20],

  // Central Atrium Fountain & Kiosks
  [870, 690, 180, 110],
  [650, 560, 80, 44],
  [1190, 560, 80, 44],

  // Tech Emporium Counters (North)
  [650, 160, 140, 40],
  [1130, 160, 140, 40],

  // Sporting Goods Racks (West-North)
  [130, 200, 140, 36],
  [130, 390, 140, 36],

  // Food Court Tables (West-South)
  [130, 780, 110, 44],
  [130, 990, 110, 44],

  // Department Store Aisles (East-North)
  [1560, 200, 150, 36],
  [1560, 400, 150, 36],

  // Mall Security Desk (East-South)
  [1560, 800, 140, 44]
];

const MALL_ROOMS = [
  { id: 'sporting', name: 'SPORTING GOODS & OUTFITTERS', x: 28, y: 28, w: 472, h: 592, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'tech', name: 'TECH & ELECTRONICS EMPORIUM', x: 520, y: 28, w: 880, h: 322, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'dept', name: 'DEPARTMENT STORE & PHARMACY', x: 1420, y: 28, w: 472, h: 592, tint: 'rgba(236, 72, 153, 0.06)', accent: '#f472b6' },
  { id: 'foodcourt', name: 'MEGA FOOD COURT', x: 28, y: 640, w: 472, h: 592, tint: 'rgba(251, 146, 60, 0.07)', accent: '#fb923c' },
  { id: 'concourse', name: 'GRAND ATRIUM CONCOURSE', x: 520, y: 370, w: 880, h: 862, tint: 'rgba(45, 212, 191, 0.05)', accent: '#2dd4bf' },
  { id: 'security', name: 'SECURITY HQ & JEWELRY VAULT', x: 1420, y: 640, w: 472, h: 592, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const MALL_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Main Atrium Glass Doors', icon: '🚪', x: 960, y: 1160, r: 95, cost: 0, desc: 'Exit to Parking Lot' },
  { id: 'mission_board', kind: 'mission_board', name: 'Mall Directory Kiosk', icon: '🗺️', x: 720, y: 1020, r: 85, cost: 0, desc: 'Check Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Arcade & ATM Bank', icon: '🏧', x: 960, y: 150, r: 95, cost: 0, desc: 'Crack ATMs for Scrap Surge (60s CD)' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Tactical Outfitters Counter', icon: '🎒', x: 350, y: 170, r: 85, cost: 80, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Food Court Kitchen', icon: '🍔', x: 350, y: 1070, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Mall Pharmacy Counter', icon: '💊', x: 1750, y: 170, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Security Gun Locker', icon: '🎯', x: 1520, y: 1070, r: 85, cost: 25, desc: 'Refill All Weapon Ammo' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Armored Jewelry & Bank Vault', icon: '💎', x: 1765, y: 1070, r: 95, cost: 0, desc: 'Crack Mall Vault for Rare Loot & Scrap' }
];

// ───────── MILITARY BASE INTERIOR (1920 x 1260) ─────────
const MIL_WALLS = [
  [0, 0, 1920, 28],
  [0, 1232, 1920, 28],
  [0, 28, 28, 1204],
  [1892, 28, 28, 1204],

  // West wing divider x=560 (doorways y=240..370, y=860..990)
  [560, 28, 20, 212],
  [560, 370, 20, 490],
  [560, 990, 20, 242],

  // East wing divider x=1340 (doorways y=240..370, y=860..990)
  [1340, 28, 20, 212],
  [1340, 370, 20, 490],
  [1340, 990, 20, 242],

  // West horizontal y=620 (doorway x=220..340)
  [28, 620, 192, 20],
  [340, 620, 220, 20],

  // East horizontal y=620 (doorway x=1580..1700)
  [1360, 620, 220, 20],
  [1700, 620, 192, 20],

  // Center horizontal y=740 (blast doorway x=880..1040)
  [580, 740, 300, 20],
  [1040, 740, 300, 20],

  // Guardhouse Sandbag Checkpoints (South-Center)
  [690, 940, 140, 36],
  [1090, 940, 140, 36],

  // Tactical War Room Holo-Map Table (North-Center)
  [860, 320, 200, 90],

  // Armory Counter (West-North)
  [180, 180, 160, 44],

  // Motorpool Workbench (West-South)
  [180, 1020, 160, 46],

  // Barracks Bunk Partitions (East-North)
  [1490, 180, 140, 34],
  [1490, 380, 140, 34],

  // Ordnance Vault Security Desk (East-South)
  [1510, 940, 120, 52]
];

const MIL_ROOMS = [
  { id: 'armory', name: 'MAIN ARMORY & BALLISTICS', x: 28, y: 28, w: 532, h: 592, tint: 'rgba(245, 158, 11, 0.07)', accent: '#f59e0b' },
  { id: 'warroom', name: 'TACTICAL WAR ROOM & COMMS', x: 580, y: 28, w: 760, h: 712, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
  { id: 'barracks', name: 'BARRACKS & FIELD TRAUMA', x: 1360, y: 28, w: 532, h: 592, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'motorpool', name: 'MOTORPOOL & ARMOR BAY', x: 28, y: 640, w: 532, h: 592, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'guardhouse', name: 'BLAST GATE & GUARDHOUSE', x: 580, y: 760, w: 760, h: 472, tint: 'rgba(132, 204, 22, 0.06)', accent: '#84cc16' },
  { id: 'vault', name: 'CLASSIFIED ORDNANCE VAULT', x: 1360, y: 640, w: 532, h: 592, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' }
];

const MIL_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Armored Base Exit Gate', icon: '🪖', x: 960, y: 1160, r: 95, cost: 0, desc: 'Exit to Military Compound' },
  { id: 'mission_board', kind: 'mission_board', name: 'Tactical Ops Terminal', icon: '📡', x: 700, y: 1090, r: 85, cost: 0, desc: 'Check Active Contracts' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Satellite Comms Core', icon: '🛰️', x: 960, y: 150, r: 95, cost: 0, desc: 'Harvest Military Comms Scrap (60s CD)' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Munitions Replicator', icon: '🎯', x: 160, y: 380, r: 85, cost: 20, desc: 'Refill All Weapon Ammo' },
  { id: 'weapon_forge', kind: 'weapon_forge', name: 'Military Weapon Printer', icon: '🔫', x: 420, y: 180, r: 85, cost: 100, desc: 'Print Tiered Military Firearm' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Tactical Armor Wardrobe', icon: '🦺', x: 160, y: 780, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Motorpool Repair Bench', icon: '🔧', x: 400, y: 840, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Gasoline' },
  { id: 'med_pod', kind: 'med_pod', name: 'Field Trauma Cryo-Pod', icon: '🩺', x: 1745, y: 210, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Field Mess Ration Synth', icon: '🥫', x: 1745, y: 470, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Classified Ordnance Vault', icon: '🔐', x: 1745, y: 1070, r: 95, cost: 0, desc: 'Breach Military Vault for Heavy Weapons' }
];

// ───────── HISTORIC & SACRED MONUMENT INTERIOR (1800 x 1200) ─────────
const HIST_WALLS = [
  [0, 0, 1800, 28],
  [0, 1172, 1800, 28],
  [0, 28, 28, 1144],
  [1772, 28, 28, 1144],

  // West nave colonnade wall x=560 (doorways y=240..360, y=840..960)
  [560, 28, 20, 212],
  [560, 360, 20, 480],
  [560, 960, 20, 212],

  // East nave colonnade wall x=1220 (doorways y=240..360, y=840..960)
  [1220, 28, 20, 212],
  [1220, 360, 20, 480],
  [1220, 960, 20, 212],

  // West horizontal y=590 (doorway x=220..340)
  [28, 590, 192, 20],
  [340, 590, 220, 20],

  // East horizontal y=590 (doorway x=1440..1560)
  [1240, 590, 200, 20],
  [1560, 590, 212, 20],

  // Center sanctum threshold y=700 (grand archway x=820..980)
  [580, 700, 240, 20],
  [980, 700, 240, 20],

  // Grand Sanctum Marble Pillars & High Altar
  [680, 180, 44, 44],
  [1076, 180, 44, 44],
  [680, 440, 44, 44],
  [1076, 440, 44, 44],
  [830, 145, 140, 46],

  // Reliquary Cloister Pillars (West-North)
  [210, 250, 44, 44],
  [360, 250, 44, 44],

  // Royal Catacomb Sarcophagi (West-South)
  [150, 770, 110, 46],
  [330, 770, 110, 46],

  // Scriptorium Tables (East-North)
  [1410, 240, 120, 40],
  [1410, 400, 120, 40],

  // Treasury Gate Altar (East-South)
  [1450, 880, 120, 44]
];

const HIST_ROOMS = [
  { id: 'reliquary', name: 'RELIQUARY CLOISTER', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(217, 119, 6, 0.07)', accent: '#f59e0b' },
  { id: 'sanctum', name: 'GRAND NAVE & SANCTUM', x: 580, y: 28, w: 640, h: 672, tint: 'rgba(234, 179, 8, 0.08)', accent: '#fbbf24' },
  { id: 'scriptorium', name: 'SCRIPTORIUM & ARCHIVE', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'catacombs', name: 'ROYAL CATACOMBS & CRYPT', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(168, 85, 247, 0.07)', accent: '#a855f7' },
  { id: 'vestibule', name: 'STONE PORTAL VESTIBULE', x: 580, y: 720, w: 640, h: 452, tint: 'rgba(148, 163, 184, 0.06)', accent: '#cbd5e1' },
  { id: 'treasury', name: 'SACRED RELIC TREASURY', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const HIST_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Ancient Portal Archway', icon: '🏛️', x: 900, y: 1110, r: 90, cost: 0, desc: 'Exit to Exterior Grounds' },
  { id: 'mission_board', kind: 'mission_board', name: 'Stone Chronicle Tablet', icon: '📜', x: 700, y: 960, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'med_pod', kind: 'med_pod', name: 'Sanctuary Healing Font', icon: '⛲', x: 900, y: 270, r: 90, cost: 15, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Monastic Apothecary', icon: '⚗️', x: 1640, y: 180, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Refectory Feast Table', icon: '🍞', x: 1620, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Ancient Stone Forge', icon: '⚒️', x: 160, y: 440, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Fuel' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Crypt Armory Stand', icon: '🛡️', x: 180, y: 1040, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Relic Treasury Vault', icon: '👑', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Claim Ancient Relics & Rare Gear' }
];

// ───────── MUSEUM, PALACE & CAPITOL INTERIOR (1860 x 1220) ─────────
const MUS_WALLS = [
  [0, 0, 1860, 28],
  [0, 1192, 1860, 28],
  [0, 28, 28, 1164],
  [1832, 28, 28, 1164],

  // West wing x=540 (doorways y=240..370, y=850..980)
  [540, 28, 20, 212],
  [540, 370, 20, 480],
  [540, 980, 20, 212],

  // East wing x=1300 (doorways y=240..370, y=850..980)
  [1300, 28, 20, 212],
  [1300, 370, 20, 480],
  [1300, 980, 20, 212],

  // West horizontal y=600 (doorway x=220..340)
  [28, 600, 192, 20],
  [340, 600, 200, 20],

  // East horizontal y=600 (doorway x=1500..1620)
  [1320, 600, 180, 20],
  [1620, 600, 212, 20],

  // Rotunda divider y=710 (grand doorway x=840..1020)
  [560, 710, 280, 20],
  [1020, 710, 280, 20],

  // Central Rotunda Artifact Pedestal
  [870, 320, 120, 80],

  // Art Gallery Display Cases (West-North)
  [180, 190, 120, 44],
  [180, 390, 120, 44],

  // National Archive Bookshelves (West-South)
  [150, 790, 26, 220],
  [360, 790, 26, 220],

  // Grand Council / Banquet Table (East-North)
  [1480, 250, 170, 64],

  // Federal Bullion Vault Desk (East-South)
  [1490, 890, 130, 44]
];

const MUS_ROOMS = [
  { id: 'gallery', name: 'FINE ART & SCULPTURE GALLERY', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(236, 72, 153, 0.06)', accent: '#f472b6' },
  { id: 'rotunda', name: 'GRAND MARBLE ROTUNDA', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'council', name: 'STATE COUNCIL & THRONE HALL', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(234, 179, 8, 0.07)', accent: '#fbbf24' },
  { id: 'archives', name: 'NATIONAL ARCHIVES & LAB', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'foyer', name: 'GRAND FOYER & COLONNADE', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(248, 250, 252, 0.05)', accent: '#e2e8f0' },
  { id: 'bullion', name: 'RESERVE & ROYAL TREASURY', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const MUS_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Grand Colonnade Doors', icon: '🚪', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Grounds' },
  { id: 'mission_board', kind: 'mission_board', name: 'Curator Directory Desk', icon: '📋', x: 700, y: 960, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Exhibit Archive Mainframe', icon: '💎', x: 930, y: 165, r: 95, cost: 0, desc: 'Extract Historical Intel & Scrap (60s CD)' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Curator Security Locker', icon: '🦺', x: 410, y: 200, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Restoration Workshop', icon: '🔧', x: 255, y: 1080, r: 85, cost: 35, desc: 'Fabricate Metal & Fuel' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Conservation Lab Synth', icon: '🧪', x: 1680, y: 140, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Gala Banquet Kitchen', icon: '🥂', x: 1680, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'med_pod', kind: 'med_pod', name: 'VIP First-Aid Suite', icon: '🩺', x: 1160, y: 960, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Federal Reserve Vault', icon: '🔐', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Breach Vault for Bullion & Rare Gear' }
];

// ───────── TRANSIT, STADIUM & CIVIC HUB INTERIOR (1860 x 1220) ─────────
const HUB_WALLS = [
  [0, 0, 1860, 28],
  [0, 1192, 1860, 28],
  [0, 28, 28, 1164],
  [1832, 28, 28, 1164],

  // West wing x=520 (doorways y=240..370, y=850..980)
  [520, 28, 20, 212],
  [520, 370, 20, 480],
  [520, 980, 20, 212],

  // East wing x=1320 (doorways y=240..370, y=850..980)
  [1320, 28, 20, 212],
  [1320, 370, 20, 480],
  [1320, 980, 20, 212],

  // West horizontal y=600 (doorway x=200..320)
  [28, 600, 172, 20],
  [320, 600, 200, 20],

  // East horizontal y=600 (doorway x=1520..1640)
  [1340, 600, 180, 20],
  [1640, 600, 192, 20],

  // North Ops Control divider y=410 (grand concourse arch x=840..1020)
  [540, 410, 300, 20],
  [1020, 410, 300, 20],

  // Center Baggage & Screening Island
  [830, 640, 200, 66],
  [640, 860, 100, 40],
  [1120, 860, 100, 40],

  // Ops Consoles (North-Center)
  [720, 155, 130, 40],
  [1010, 155, 130, 40],

  // Baggage Carousel (West-North)
  [160, 230, 180, 76],

  // Concessions Counter (West-South)
  [140, 800, 150, 42],

  // VIP Locker Bench (East-North)
  [1500, 240, 150, 44],

  // Customs Desk (East-South)
  [1500, 860, 140, 44]
];

const HUB_ROOMS = [
  { id: 'baggage', name: 'CARGO & BAGGAGE DEPOT', x: 28, y: 28, w: 492, h: 572, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'ops', name: 'CONTROL TOWER & DISPATCH', x: 540, y: 28, w: 780, h: 382, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'lounge', name: 'VIP LOUNGE & LOCKER ROOM', x: 1340, y: 28, w: 492, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'concessions', name: 'CONCOURSE CAFÉ & DINER', x: 28, y: 620, w: 492, h: 572, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'concourse', name: 'MAIN TERMINAL CONCOURSE', x: 540, y: 430, w: 780, h: 762, tint: 'rgba(45, 212, 191, 0.05)', accent: '#2dd4bf' },
  { id: 'customs', name: 'CUSTOMS SECURITY & VAULT', x: 1340, y: 620, w: 492, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const HUB_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Main Concourse Exit', icon: '🚪', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Exterior Plaza' },
  { id: 'mission_board', kind: 'mission_board', name: 'Departure & Ops Board', icon: '🛫', x: 700, y: 1020, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Terminal ATM & Dispatch', icon: '🏧', x: 930, y: 240, r: 95, cost: 0, desc: 'Access Dispatch Funds & Scrap (60s CD)' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Maintenance Cargo Bench', icon: '🔧', x: 160, y: 460, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Fuel' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Concourse Bistro', icon: '☕', x: 350, y: 1060, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Crew Gear Lockers', icon: '🦺', x: 1680, y: 160, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'med_pod', kind: 'med_pod', name: 'Terminal First-Aid Room', icon: '🩺', x: 1680, y: 460, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Security Armory Rack', icon: '🎯', x: 1460, y: 1060, r: 85, cost: 25, desc: 'Refill All Weapon Ammo' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Armored Customs Vault', icon: '🔐', x: 1700, y: 1060, r: 95, cost: 0, desc: 'Crack Customs Safe for Rare Gear' }
];

// ───────── INDUSTRIAL, DAM & POWER WORKS INTERIOR (1800 x 1200) ─────────
const IND_WALLS = [
  [0, 0, 1800, 28],
  [0, 1172, 1800, 28],
  [0, 28, 28, 1144],
  [1772, 28, 28, 1144],

  // West wing x=560 (doorways y=240..360, y=840..960)
  [560, 28, 20, 212],
  [560, 360, 20, 480],
  [560, 960, 20, 212],

  // East wing x=1220 (doorways y=240..360, y=840..960)
  [1220, 28, 20, 212],
  [1220, 360, 20, 480],
  [1220, 960, 20, 212],

  // West horizontal y=590 (doorway x=220..340)
  [28, 590, 192, 20],
  [340, 590, 220, 20],

  // East horizontal y=590 (doorway x=1440..1560)
  [1240, 590, 200, 20],
  [1560, 590, 212, 20],

  // Center turbine divider y=690 (doorway x=820..980)
  [580, 690, 240, 20],
  [980, 690, 240, 20],

  // Central Hydro-Turbine Generator Block (North-Center)
  [780, 280, 240, 90],

  // Coolant Tanks (West-North)
  [180, 220, 120, 70],
  [180, 390, 120, 70],

  // Transformers (East-North)
  [1430, 220, 130, 60],
  [1430, 400, 130, 60],

  // Machine Shop Press (West-South)
  [180, 820, 140, 50],

  // Security Cage (East-South)
  [1440, 860, 120, 46]
];

const IND_ROOMS = [
  { id: 'coolant', name: 'COOLANT & PUMP ANNEX', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
  { id: 'turbine', name: 'HIGH-VOLTAGE TURBINE HALL', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(245, 158, 11, 0.07)', accent: '#f59e0b' },
  { id: 'transformers', name: 'GRID SUBSTATION & LAB', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'fabshop', name: 'HEAVY MACHINE SHOP', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'vestibule', name: 'CONTROL INTAKE BAY', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(148, 163, 184, 0.06)', accent: '#94a3b8' },
  { id: 'breaker', name: 'HIGH-SECURITY BREAKER VAULT', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const IND_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Facility Steel Exit Door', icon: '🏭', x: 900, y: 1105, r: 90, cost: 0, desc: 'Exit to Grounds' },
  { id: 'mission_board', kind: 'mission_board', name: 'Grid Telemetry Board', icon: '⚡', x: 700, y: 940, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Main Hydro-Generator Core', icon: '⚛️', x: 900, y: 145, r: 95, cost: 0, desc: 'Siphon Reserve Power & Scrap (60s CD)' },
  { id: 'chem_synth', kind: 'chem_synth', name: 'Coolant Chemical Synth', icon: '🧪', x: 160, y: 140, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'med_pod', kind: 'med_pod', name: 'Safety Eye-Wash & Trauma Pod', icon: '🩺', x: 1640, y: 160, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Heavy Fabrication Lathe', icon: '🔧', x: 380, y: 1040, r: 85, cost: 30, desc: 'Fabricate Scrap Metal & Gasoline' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Hazmat & PPE Locker', icon: '🦺', x: 180, y: 1040, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Shift Canteen Vending', icon: '🥤', x: 1100, y: 940, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'High-Voltage Breaker Vault', icon: '🔐', x: 1640, y: 1040, r: 95, cost: 0, desc: 'Breach Facility Safe for Rare Gear' }
];

// ───────── INTERNATIONAL AIRPORT INTERIOR (2400 x 1500) ─────────
const AIRPORT_WALLS = [
  [0, 0, 2400, 28],
  [0, 1472, 2400, 28],
  [0, 28, 28, 1444],
  [2372, 28, 28, 1444],

  // West wing wall x=640 (doorways y=200..320, y=690..820, y=1180..1310)
  [640, 28, 20, 172],
  [640, 320, 20, 370],
  [640, 820, 20, 360],
  [640, 1310, 20, 162],

  // East wing wall x=1740 (doorways y=200..320, y=690..820, y=1180..1310)
  [1740, 28, 20, 172],
  [1740, 320, 20, 370],
  [1740, 820, 20, 360],
  [1740, 1310, 20, 162],

  // Center Gate A/B divider x=1190 in North concourse (doorway y=210..330)
  [1190, 28, 20, 182],
  [1190, 330, 20, 140],

  // West horizontal dividers y=500 and y=990 (doorways x=270..410)
  [28, 500, 242, 20],
  [410, 500, 230, 20],
  [28, 990, 242, 20],
  [410, 990, 230, 20],

  // East horizontal dividers y=500 and y=990 (doorways x=1990..2130)
  [1760, 500, 230, 20],
  [2130, 500, 242, 20],
  [1760, 990, 230, 20],
  [2130, 990, 242, 20],

  // Boarding Gate Concourse wall y=470 (Gate A arch x=870..1010, Gate B arch x=1390..1530)
  [660, 470, 210, 20],
  [1010, 470, 380, 20],
  [1530, 470, 210, 20],

  // Security Checkpoint Concourse wall y=990 (grand screening arch x=1100..1300)
  [660, 990, 440, 20],
  [1300, 990, 440, 20],

  // Dual Baggage Carousels (West-North)
  [140, 160, 260, 76],
  [140, 320, 260, 76],

  // Duty-Free & Sky Diner Counters (West-Mid)
  [120, 620, 160, 40],
  [120, 820, 160, 40],

  // Cargo Dispatch Racks (West-South)
  [140, 1140, 160, 44],

  // Check-In Ticketing Islands (Center-South)
  [780, 1140, 240, 44],
  [1380, 1140, 240, 44],

  // TSA Security X-Ray Lanes (Center-Mid)
  [830, 680, 160, 46],
  [1410, 680, 160, 46],

  // Boarding Gate Seating & Podiums (North Gates A & B)
  [760, 175, 160, 28],
  [760, 285, 160, 28],
  [1460, 175, 160, 28],
  [1460, 285, 160, 28],

  // ATC Radar Consoles (East-North)
  [1930, 165, 220, 44],

  // VIP Lounge Counter (East-Mid)
  [1940, 670, 160, 42],

  // Customs Cargo & Hangar Security Partition (East-South)
  [1930, 1130, 150, 50]
];

const AIRPORT_ROOMS = [
  { id: 'baggage', name: 'BAGGAGE CLAIM & LOST LUGGAGE', x: 28, y: 28, w: 612, h: 472, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'gates_w', name: 'INT\'L DEPARTURES — GATES A1-A3', x: 660, y: 28, w: 530, h: 442, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'gates_e', name: 'INT\'L DEPARTURES — GATES B1-B3', x: 1210, y: 28, w: 530, h: 442, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'atc', name: 'AIR TRAFFIC CONTROL & RADAR OPS', x: 1760, y: 28, w: 612, h: 472, tint: 'rgba(14, 165, 233, 0.08)', accent: '#0ea5e9' },
  { id: 'dutyfree', name: 'DUTY-FREE PLAZA & SKY DINER', x: 28, y: 520, w: 612, h: 470, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'security', name: 'SECURITY SCREENING CONCOURSE', x: 660, y: 490, w: 1080, h: 500, tint: 'rgba(45, 212, 191, 0.05)', accent: '#2dd4bf' },
  { id: 'lounge', name: 'VIP LOUNGE & AIR MARSHAL HQ', x: 1760, y: 520, w: 612, h: 470, tint: 'rgba(168, 85, 247, 0.06)', accent: '#a855f7' },
  { id: 'cargo_bay', name: 'CARGO DISPATCH & GROUND OPS', x: 28, y: 1010, w: 612, h: 462, tint: 'rgba(234, 179, 8, 0.06)', accent: '#eab308' },
  { id: 'check_in', name: 'MAIN CHECK-IN & ARRIVALS HALL', x: 660, y: 1010, w: 1080, h: 462, tint: 'rgba(148, 163, 184, 0.05)', accent: '#cbd5e1' },
  { id: 'hangar_vault', name: 'HANGAR BAY & CUSTOMS VAULT', x: 1760, y: 1010, w: 612, h: 462, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' }
];

const AIRPORT_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Terminal Departures Doors', icon: '✈️', x: 1200, y: 1390, r: 95, cost: 0, desc: 'Exit to Airport Apron' },
  { id: 'mission_board', kind: 'mission_board', name: 'Flight Dispatch & Ops Board', icon: '🛫', x: 960, y: 1270, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Baggage Maintenance Bench', icon: '🔧', x: 520, y: 260, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Fuel' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Sky Lounge Café & Bar', icon: '☕', x: 340, y: 720, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'med_pod', kind: 'med_pod', name: 'Airport Quarantine & Trauma Clinic', icon: '🩺', x: 1620, y: 150, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'ATC Flight Control Mainframe', icon: '📡', x: 2100, y: 320, r: 95, cost: 0, desc: 'Access Dispatch Telemetry & Scrap (60s CD)' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Flight Crew & Marshal Lockers', icon: '🦺', x: 2160, y: 690, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Air Marshal Armory Rack', icon: '🎯', x: 2160, y: 860, r: 85, cost: 20, desc: 'Refill All Weapon Ammo' },
  { id: 'weapon_forge', kind: 'weapon_forge', name: 'Customs Tactical Armament Bench', icon: '🔫', x: 420, y: 1260, r: 85, cost: 100, desc: 'Print Tiered Tactical Firearm' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Armored Customs & Bullion Vault', icon: '🔐', x: 2160, y: 1320, r: 95, cost: 0, desc: 'Breach Customs Vault for Rare Loot & Gold' }
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
  },
  airport: {
    w: 2400,
    h: 1500,
    spawnX: 1200,
    spawnY: 1295,
    walls: AIRPORT_WALLS,
    rooms: AIRPORT_ROOMS,
    stations: AIRPORT_STATIONS,
    doorThresholds: [
      [640, 200, 20, 120, false], [640, 690, 20, 130, false], [640, 1180, 20, 130, false],
      [1740, 200, 20, 120, false], [1740, 690, 20, 130, false], [1740, 1180, 20, 130, false],
      [1190, 210, 20, 120, false],
      [270, 500, 140, 20, true], [270, 990, 140, 20, true],
      [1990, 500, 140, 20, true], [1990, 990, 140, 20, true],
      [870, 470, 140, 20, true], [1390, 470, 140, 20, true],
      [1100, 990, 200, 20, true]
    ]
  },
  university: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 1010,
    walls: UNIV_WALLS,
    rooms: UNIV_ROOMS,
    stations: UNIV_STATIONS,
    doorThresholds: [
      [580, 240, 20, 120, false], [580, 840, 20, 120, false],
      [1200, 240, 20, 120, false], [1200, 840, 20, 120, false],
      [240, 590, 120, 20, true], [1440, 590, 120, 20, true], [810, 660, 180, 20, true]
    ]
  },
  hospital: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 1010,
    walls: HOSP_WALLS,
    rooms: HOSP_ROOMS,
    stations: HOSP_STATIONS,
    doorThresholds: [
      [540, 240, 20, 120, false], [540, 840, 20, 120, false],
      [1240, 240, 20, 120, false], [1240, 840, 20, 120, false],
      [220, 590, 120, 20, true], [1460, 590, 120, 20, true], [830, 680, 140, 20, true]
    ]
  },
  mall: {
    w: 1920,
    h: 1260,
    spawnX: 960,
    spawnY: 1070,
    walls: MALL_WALLS,
    rooms: MALL_ROOMS,
    stations: MALL_STATIONS,
    doorThresholds: [
      [500, 240, 20, 130, false], [500, 860, 20, 130, false],
      [1400, 240, 20, 130, false], [1400, 860, 20, 130, false],
      [200, 620, 120, 20, true], [1600, 620, 120, 20, true], [870, 350, 180, 20, true]
    ]
  },
  military: {
    w: 1920,
    h: 1260,
    spawnX: 960,
    spawnY: 1070,
    walls: MIL_WALLS,
    rooms: MIL_ROOMS,
    stations: MIL_STATIONS,
    doorThresholds: [
      [560, 240, 20, 130, false], [560, 860, 20, 130, false],
      [1340, 240, 20, 130, false], [1340, 860, 20, 130, false],
      [220, 620, 120, 20, true], [1580, 620, 120, 20, true], [880, 740, 160, 20, true]
    ]
  },
  historic: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 1030,
    walls: HIST_WALLS,
    rooms: HIST_ROOMS,
    stations: HIST_STATIONS,
    doorThresholds: [
      [560, 240, 20, 120, false], [560, 840, 20, 120, false],
      [1220, 240, 20, 120, false], [1220, 840, 20, 120, false],
      [220, 590, 120, 20, true], [1440, 590, 120, 20, true], [820, 700, 160, 20, true]
    ]
  },
  museum: {
    w: 1860,
    h: 1220,
    spawnX: 930,
    spawnY: 1045,
    walls: MUS_WALLS,
    rooms: MUS_ROOMS,
    stations: MUS_STATIONS,
    doorThresholds: [
      [540, 240, 20, 130, false], [540, 850, 20, 130, false],
      [1300, 240, 20, 130, false], [1300, 850, 20, 130, false],
      [220, 600, 120, 20, true], [1500, 600, 120, 20, true], [840, 710, 180, 20, true]
    ]
  },
  transit: {
    w: 1860,
    h: 1220,
    spawnX: 930,
    spawnY: 1045,
    walls: HUB_WALLS,
    rooms: HUB_ROOMS,
    stations: HUB_STATIONS,
    doorThresholds: [
      [520, 240, 20, 130, false], [520, 850, 20, 130, false],
      [1320, 240, 20, 130, false], [1320, 850, 20, 130, false],
      [200, 600, 120, 20, true], [1520, 600, 120, 20, true], [840, 410, 180, 20, true]
    ]
  },
  industrial: {
    w: 1800,
    h: 1200,
    spawnX: 900,
    spawnY: 1020,
    walls: IND_WALLS,
    rooms: IND_ROOMS,
    stations: IND_STATIONS,
    doorThresholds: [
      [560, 240, 20, 120, false], [560, 840, 20, 120, false],
      [1220, 240, 20, 120, false], [1220, 840, 20, 120, false],
      [220, 590, 120, 20, true], [1440, 590, 120, 20, true], [820, 690, 160, 20, true]
    ]
  }
};

module.exports = {
  INTERIORS,
  RAID_BUNKERS
};
