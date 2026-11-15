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

// ───────── MEGA SHOPPING MALL INTERIOR (2400 x 1500) ─────────
const MALL_WALLS = [
  [0, 0, 2400, 28],
  [0, 1472, 2400, 28],
  [0, 28, 28, 1444],
  [2372, 28, 28, 1444],

  // West storefront wall x=600 (grand wing entrances y=260..420, y=980..1160)
  [600, 28, 20, 232],
  [600, 420, 20, 560],
  [600, 1160, 20, 312],

  // East storefront wall x=1780 (grand wing entrances y=260..420, y=980..1160)
  [1780, 28, 20, 232],
  [1780, 420, 20, 560],
  [1780, 1160, 20, 312],

  // West horizontal divider y=700 (doorway x=240..380)
  [28, 700, 212, 20],
  [380, 700, 220, 20],

  // East horizontal divider y=700 (doorway x=2000..2140)
  [1800, 700, 200, 20],
  [2140, 700, 232, 20],

  // North Tech Plaza divider y=430 (grand concourse arch x=1080..1320)
  [620, 430, 460, 20],
  [1320, 430, 460, 20],

  // Grand Atrium Octagonal Water Fountain & Kiosks
  [1090, 770, 220, 140],
  [760, 620, 110, 56],
  [1530, 620, 110, 56],
  [760, 1020, 100, 44],
  [1540, 1020, 100, 44],

  // Twin Escalator Balustrade Islands
  [790, 480, 64, 100],
  [1546, 480, 64, 100],

  // Tech Emporium Demo Tables & Arcade Cabinets (North-Center)
  [740, 185, 160, 44],
  [1500, 185, 160, 44],
  [1080, 240, 240, 46],

  // Sporting Goods & Outfitters Displays (West-North)
  [120, 180, 160, 58],
  [120, 430, 160, 46],
  [380, 310, 110, 46],

  // Department Store Cosmetics & Boutique Racks (East-North)
  [1960, 200, 160, 54],
  [1960, 430, 160, 44],

  // Mega Food Court Kitchen Strip & Dining Clusters (West-South)
  [48, 820, 72, 460],
  [240, 860, 90, 48],
  [420, 860, 90, 48],
  [240, 1080, 90, 48],
  [420, 1080, 90, 48],

  // Jewelry Salon & Mall Security Partition (East-South)
  [1920, 830, 150, 44],
  [1940, 1080, 140, 54]
];

const MALL_ROOMS = [
  { id: 'sporting', name: 'TACTICAL SPORTING GOODS & OUTDOOR GEAR', x: 28, y: 28, w: 572, h: 672, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'tech', name: 'TECH EMPORIUM, OLED PLAZA & RETRO ARCADE', x: 620, y: 28, w: 1160, h: 402, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'dept', name: 'LUXURY DEPARTMENT STORE & PHARMACY', x: 1800, y: 28, w: 572, h: 672, tint: 'rgba(236, 72, 153, 0.06)', accent: '#f472b6' },
  { id: 'foodcourt', name: 'MEGA FOOD COURT & GOURMET PAVILION', x: 28, y: 720, w: 572, h: 752, tint: 'rgba(251, 146, 60, 0.07)', accent: '#fb923c' },
  { id: 'concourse', name: 'GRAND SKY-LIT ATRIUM & FOUNTAIN PLAZA', x: 620, y: 450, w: 1160, h: 1022, tint: 'rgba(45, 212, 191, 0.05)', accent: '#2dd4bf' },
  { id: 'security', name: 'ARMORED JEWELRY SALON & SECURITY VAULT', x: 1800, y: 720, w: 572, h: 752, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
];

const MALL_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Main Atrium Glass Doors', icon: '🚪', x: 1200, y: 1390, r: 95, cost: 0, desc: 'Exit to Mall Parking Lot' },
  { id: 'mission_board', kind: 'mission_board', name: 'Mall Touch-Directory Kiosk', icon: '🗺️', x: 960, y: 1230, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'Tech Plaza ATM & Server Vault', icon: '🏧', x: 1200, y: 135, r: 95, cost: 0, desc: 'Crack ATMs for Scrap Surge (60s CD)' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Tactical Outfitters Counter', icon: '🎒', x: 470, y: 145, r: 85, cost: 80, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'weapon_forge', kind: 'weapon_forge', name: 'Outdoor Arms & Hunting Rack', icon: '🏹', x: 140, y: 585, r: 85, cost: 100, desc: 'Print Tiered Tactical Weapon' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Food Court Gourmet Counter', icon: '🍔', x: 350, y: 1330, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'chem_synth', kind: 'chem_synth', name: '24/7 Mall Pharmacy Counter', icon: '💊', x: 2230, y: 155, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
  { id: 'med_pod', kind: 'med_pod', name: 'Optometry & First-Aid Clinic', icon: '🩺', x: 2230, y: 550, r: 85, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Mall Security Armory Locker', icon: '🎯', x: 1920, y: 1330, r: 85, cost: 25, desc: 'Refill All Weapon Ammo' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Armored Diamond & Cash Vault', icon: '💎', x: 2230, y: 1330, r: 95, cost: 0, desc: 'Crack Mall Vault for Rare Loot & Scrap' }
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

// ───────── INTERNATIONAL AIRPORT INTERIOR (2800 x 1650) ─────────
const AIRPORT_WALLS = [
  [0, 0, 2800, 28],
  [0, 1622, 2800, 28],
  [0, 28, 28, 1594],
  [2772, 28, 28, 1594],

  // West wing wall x=640 (doorways y=200..320, y=740..880, y=1280..1420)
  [640, 28, 20, 172],
  [640, 320, 20, 420],
  [640, 880, 20, 400],
  [640, 1420, 20, 202],

  // East terminal wall x=1740 (doorways y=200..320, y=740..880, y=1280..1420)
  [1740, 28, 20, 172],
  [1740, 320, 20, 420],
  [1740, 880, 20, 400],
  [1740, 1420, 20, 202],

  // Aircraft Maintenance Hangar Divider x=2260 (wide hangar doors y=340..620, y=1020..1300)
  [2260, 28, 20, 312],
  [2260, 620, 20, 400],
  [2260, 1300, 20, 322],

  // Center Gate A/B divider x=1190 in North concourse (doorway y=210..330)
  [1190, 28, 20, 182],
  [1190, 330, 20, 160],

  // West horizontal dividers y=520 and y=1060 (doorways x=270..410)
  [28, 520, 242, 20],
  [410, 520, 230, 20],
  [28, 1060, 242, 20],
  [410, 1060, 230, 20],

  // Mid-East horizontal dividers y=520 and y=1060 (doorways x=1940..2080)
  [1760, 520, 180, 20],
  [2080, 520, 180, 20],
  [1760, 1060, 180, 20],
  [2080, 1060, 180, 20],

  // Boarding Gate Concourse wall y=490 (Gate A arch x=870..1010, Gate B arch x=1390..1530)
  [660, 490, 210, 20],
  [1010, 490, 380, 20],
  [1530, 490, 210, 20],

  // Security Checkpoint Concourse wall y=1060 (grand screening arch x=1100..1300)
  [660, 1060, 440, 20],
  [1300, 1060, 440, 20],

  // Dual Baggage Carousels (West-North)
  [140, 165, 260, 76],
  [140, 335, 260, 76],

  // Duty-Free & Sky Diner Counters (West-Mid)
  [120, 660, 160, 40],
  [120, 880, 160, 40],

  // Cargo Dispatch Racks (West-South)
  [140, 1220, 160, 44],

  // Check-In Ticketing Islands (Center-South)
  [780, 1220, 240, 44],
  [1380, 1220, 240, 44],

  // TSA Security X-Ray Lanes (Center-Mid)
  [830, 720, 160, 46],
  [1410, 720, 160, 46],

  // Boarding Gate Seating & Podiums (North Gates A & B)
  [760, 175, 160, 28],
  [760, 295, 160, 28],
  [1460, 175, 160, 28],
  [1460, 295, 160, 28],

  // ATC Radar Consoles (Mid-East North)
  [1890, 165, 220, 44],

  // VIP Lounge Counter (Mid-East Center)
  [1890, 720, 160, 42],

  // Customs Security Partition (Mid-East South)
  [1890, 1220, 150, 50],

  // Hangar Maintenance Gantry Benches (East Hangar)
  [2685, 140, 65, 200],
  [2685, 1300, 65, 200]
];

const AIRPORT_ROOMS = [
  { id: 'baggage', name: 'BAGGAGE CLAIM & LOST LUGGAGE', x: 28, y: 28, w: 612, h: 492, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
  { id: 'gates_w', name: 'INT\'L DEPARTURES — GATES A1-A3', x: 660, y: 28, w: 530, h: 462, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
  { id: 'gates_e', name: 'INT\'L DEPARTURES — GATES B1-B3', x: 1210, y: 28, w: 530, h: 462, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
  { id: 'atc', name: 'AIR TRAFFIC CONTROL & RADAR OPS', x: 1760, y: 28, w: 500, h: 492, tint: 'rgba(14, 165, 233, 0.08)', accent: '#0ea5e9' },
  { id: 'dutyfree', name: 'DUTY-FREE PLAZA & SKY DINER', x: 28, y: 540, w: 612, h: 520, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
  { id: 'security', name: 'SECURITY SCREENING CONCOURSE', x: 660, y: 510, w: 1080, h: 550, tint: 'rgba(45, 212, 191, 0.05)', accent: '#2dd4bf' },
  { id: 'lounge', name: 'VIP LOUNGE & AIR MARSHAL HQ', x: 1760, y: 540, w: 500, h: 520, tint: 'rgba(168, 85, 247, 0.06)', accent: '#a855f7' },
  { id: 'cargo_bay', name: 'CARGO DISPATCH & GROUND OPS', x: 28, y: 1080, w: 612, h: 542, tint: 'rgba(234, 179, 8, 0.06)', accent: '#eab308' },
  { id: 'check_in', name: 'MAIN CHECK-IN & ARRIVALS HALL', x: 660, y: 1080, w: 1080, h: 542, tint: 'rgba(148, 163, 184, 0.05)', accent: '#cbd5e1' },
  { id: 'customs_vault', name: 'CUSTOMS SECURITY & BULLION VAULT', x: 1760, y: 1080, w: 500, h: 542, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' },
  { id: 'hangar_bay', name: 'AIRCRAFT MAINTENANCE HANGAR BAY', x: 2280, y: 28, w: 492, h: 1594, tint: 'rgba(59, 130, 246, 0.07)', accent: '#60a5fa' }
];

const AIRPORT_STATIONS = [
  { id: 'exit_door', kind: 'exit_lift', name: 'Terminal Departures Doors', icon: '✈️', x: 1200, y: 1530, r: 95, cost: 0, desc: 'Exit to Airport Apron' },
  { id: 'hangar_exit', kind: 'exit_lift', name: 'East Hangar Roll-Up Gate', icon: '🛫', x: 2530, y: 1530, r: 95, cost: 0, desc: 'Exit onto East Runway Apron' },
  { id: 'mission_board', kind: 'mission_board', name: 'Flight Dispatch & Ops Board', icon: '📋', x: 960, y: 1380, r: 85, cost: 0, desc: 'Inspect Active Missions' },
  { id: 'craft_bench', kind: 'craft_bench', name: 'Baggage Maintenance Bench', icon: '🔧', x: 520, y: 260, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Fuel' },
  { id: 'hydro_bar', kind: 'hydro_bar', name: 'Sky Lounge Café & Bar', icon: '☕', x: 340, y: 780, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
  { id: 'med_pod', kind: 'med_pod', name: 'Airport Quarantine & Trauma Clinic', icon: '🩺', x: 1620, y: 150, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds & Infection' },
  { id: 'reactor_core', kind: 'reactor_core', name: 'ATC Flight Control Mainframe', icon: '📡', x: 2060, y: 340, r: 95, cost: 0, desc: 'Access Dispatch Telemetry & Scrap (60s CD)' },
  { id: 'gear_fab', kind: 'gear_fab', name: 'Flight Crew & Marshal Lockers', icon: '🦺', x: 2110, y: 740, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
  { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Air Marshal Armory Rack', icon: '🎯', x: 2110, y: 920, r: 85, cost: 20, desc: 'Refill All Weapon Ammo' },
  { id: 'weapon_forge', kind: 'weapon_forge', name: 'Customs Tactical Armament Bench', icon: '🔫', x: 420, y: 1360, r: 85, cost: 100, desc: 'Print Tiered Tactical Firearm' },
  { id: 'hangar_fuel', kind: 'craft_bench', name: 'Aviation Fuel & Repair Rig', icon: '⛽', x: 2530, y: 160, r: 95, cost: 35, desc: 'Refine Aviation Scrap & Fuel' },
  { id: 'vault_locker', kind: 'vault_locker', name: 'Armored Customs & Bullion Vault', icon: '🔐', x: 2100, y: 1440, r: 95, cost: 0, desc: 'Breach Customs Vault for Rare Loot & Gold' }
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
    w: 2800,
    h: 1650,
    spawnX: 1200,
    spawnY: 1410,
    walls: AIRPORT_WALLS,
    rooms: AIRPORT_ROOMS,
    stations: AIRPORT_STATIONS,
    hangarPlane: { x: 2520, y: 825 },
    doorThresholds: [
      [640, 200, 20, 120, false], [640, 740, 20, 140, false], [640, 1280, 20, 140, false],
      [1740, 200, 20, 120, false], [1740, 740, 20, 140, false], [1740, 1280, 20, 140, false],
      [2260, 340, 20, 280, false], [2260, 1020, 20, 280, false],
      [1190, 210, 20, 120, false],
      [270, 520, 140, 20, true], [270, 1060, 140, 20, true],
      [1940, 520, 140, 20, true], [1940, 1060, 140, 20, true],
      [870, 490, 140, 20, true], [1390, 490, 140, 20, true],
      [1100, 1060, 200, 20, true]
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
    w: 2400,
    h: 1500,
    spawnX: 1200,
    spawnY: 1255,
    walls: MALL_WALLS,
    rooms: MALL_ROOMS,
    stations: MALL_STATIONS,
    doorThresholds: [
      [600, 260, 20, 160, false], [600, 980, 20, 180, false],
      [1780, 260, 20, 160, false], [1780, 980, 20, 180, false],
      [240, 700, 140, 20, true], [2000, 700, 140, 20, true], [1080, 430, 240, 20, true]
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

// ───────── 13 DEDICATED SPECIALTY SUB-MAP BLUEPRINTS ─────────
function makeSixWingInterior({ w = 1800, h = 1200, wx1 = 560, wx2 = 1220, wy = 590, cy = 690, props = [], rooms, stations }) {
  const walls = [
    [0, 0, w, 28], [0, h - 28, w, 28], [0, 28, 28, h - 56], [w - 28, 28, 28, h - 56],
    [wx1, 28, 20, 212], [wx1, 360, 20, wy - 360 + 250], [wx1, wy + 370, 20, h - 28 - (wy + 370)],
    [wx2, 28, 20, 212], [wx2, 360, 20, wy - 360 + 250], [wx2, wy + 370, 20, h - 28 - (wy + 370)],
    [28, wy, 192, 20], [340, wy, wx1 - 340, 20],
    [wx2 + 20, wy, w - wx2 - 360, 20], [w - 220, wy, 192, 20],
    [wx1 + 20, cy, Math.floor((wx2 - wx1 - 180) / 2), 20],
    [wx2 - Math.floor((wx2 - wx1 - 180) / 2), cy, Math.floor((wx2 - wx1 - 180) / 2), 20],
    ...props
  ];
  const doorW = 160;
  const doorX = Math.floor((wx1 + 20 + wx2 - doorW) / 2);
  const doorThresholds = [
    [wx1, 240, 20, 120, false], [wx1, wy + 250, 20, 120, false],
    [wx2, 240, 20, 120, false], [wx2, wy + 250, 20, 120, false],
    [220, wy, 120, 20, true], [w - 340, wy, 120, 20, true], [doorX, cy, doorW, 20, true]
  ];
  return { w, h, spawnX: Math.round(w / 2), spawnY: h - 180, walls, rooms, stations, doorThresholds };
}

INTERIORS.police = makeSixWingInterior({
  props: [
    [160, 200, 150, 44], [160, 380, 150, 44], // SWAT armory racks
    [820, 310, 160, 46], // Dispatch console island
    [1420, 160, 150, 20], [1420, 340, 150, 20], // Detention cell bars
    [150, 810, 140, 44], [360, 810, 120, 44], // Forensics benches
    [1450, 870, 130, 46] // Evidence vault counter
  ],
  rooms: [
    { id: 'armory', name: 'SWAT ARMORY & TACTICAL', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(59, 130, 246, 0.07)', accent: '#3b82f6' },
    { id: 'dispatch', name: 'PRECINCT DISPATCH & BRIEFING', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(14, 165, 233, 0.06)', accent: '#38bdf8' },
    { id: 'cells', name: 'DETENTION & HOLDING CELLS', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(148, 163, 184, 0.07)', accent: '#94a3b8' },
    { id: 'forensics', name: 'CRIME LAB & INTERROGATION', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'foyer', name: 'PRECINCT LOBBY & INTAKE', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(30, 58, 138, 0.08)', accent: '#60a5fa' },
    { id: 'vault', name: 'EVIDENCE & IMPOUND VAULT', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Precinct Main Doors', icon: '🚓', x: 900, y: 1100, r: 90, cost: 0, desc: 'Exit to Street' },
    { id: 'mission_board', kind: 'mission_board', name: 'Crime Bulletin & Dispatch Board', icon: '📋', x: 700, y: 940, r: 85, cost: 0, desc: 'Check Active Contracts' },
    { id: 'reactor_core', kind: 'reactor_core', name: '911 Mainframe & Radio Server', icon: '📡', x: 900, y: 150, r: 95, cost: 0, desc: 'Extract Police Intel & Scrap (60s CD)' },
    { id: 'ammo_dispenser', kind: 'ammo_dispenser', name: 'Precinct Munitions Locker', icon: '🎯', x: 150, y: 120, r: 85, cost: 20, desc: 'Refill All Weapon Ammo' },
    { id: 'weapon_forge', kind: 'weapon_forge', name: 'SWAT Armory Requisition', icon: '🔫', x: 420, y: 290, r: 85, cost: 100, desc: 'Print Tiered Police Firearm' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Riot Gear & Vest Locker', icon: '🦺', x: 420, y: 1040, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Forensics Bio-Lab Synth', icon: '🧪', x: 160, y: 1040, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'med_pod', kind: 'med_pod', name: 'Custody First-Aid Station', icon: '🩺', x: 1640, y: 450, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Seized Contraband Vault', icon: '🔐', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Crack Evidence Safe for Rare Loot' }
  ]
});

INTERIORS.fire = makeSixWingInterior({
  props: [
    [150, 210, 260, 90], // Fire engine 1 chassis block in apparatus bay
    [760, 320, 280, 44], // Dispatch desk
    [1400, 180, 120, 44], [1400, 360, 120, 44], // Bunkhouse partitions
    [160, 820, 160, 48], // Workshop lathe bench
    [1460, 870, 130, 44] // Supply cage desk
  ],
  rooms: [
    { id: 'apparatus', name: 'ENGINE APPARATUS BAY 01', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' },
    { id: 'dispatch', name: 'ALARM DISPATCH & BRASS POLE', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(245, 158, 11, 0.07)', accent: '#fbbf24' },
    { id: 'bunkhouse', name: 'CREW BUNKHOUSE & KITCHEN', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
    { id: 'workshop', name: 'HYDRAULIC HOSE & HAZMAT BAY', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
    { id: 'foyer', name: 'FIREHOUSE MEMORIAL LOBBY', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(148, 163, 184, 0.06)', accent: '#cbd5e1' },
    { id: 'vault', name: 'EMERGENCY RESCUE RESERVE', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(220, 38, 38, 0.08)', accent: '#f87171' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Apparatus Roll-Up Doors', icon: '🚒', x: 900, y: 1100, r: 90, cost: 0, desc: 'Exit to Firehouse Apron' },
    { id: 'mission_board', kind: 'mission_board', name: 'Emergency Alert Teletype', icon: '🚨', x: 700, y: 940, r: 85, cost: 0, desc: 'Check Active Contracts' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Backup Diesel Generator', icon: '⚡', x: 900, y: 150, r: 95, cost: 0, desc: 'Harvest Emergency Fuel & Scrap (60s CD)' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Jaws-of-Life Repair Bench', icon: '🔧', x: 280, y: 1030, r: 85, cost: 30, desc: 'Fabricate Metal & Fuel' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Turnout Coat & SCBA Lockers', icon: '🦺', x: 430, y: 450, r: 85, cost: 80, desc: 'Equip Kevlar, Gas Mask & Pack' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Firehouse Chili Kitchen', icon: '🍲', x: 1640, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'med_pod', kind: 'med_pod', name: 'Paramedic Trauma Cot', icon: '🚑', x: 1640, y: 160, r: 90, cost: 15, desc: 'Full Heal + Cure Wounds' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Burn & Antidote Kit Bench', icon: '💊', x: 150, y: 740, r: 85, cost: 30, desc: 'Synthesize Medkit + Bandages' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Hazard Response Locker', icon: '🔐', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Unlock Rescue Cache' }
  ]
});

INTERIORS.bank = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [130, 180, 130, 42], [130, 380, 130, 42], // Safety deposit box islands
    [720, 290, 160, 42], [980, 290, 160, 42], // Armored teller counters
    [1460, 250, 200, 66], // Boardroom mahogany table
    [160, 810, 160, 46], // Currency counting machines
    [1490, 880, 130, 46] // Vault gate desk
  ],
  rooms: [
    { id: 'deposit', name: 'SAFETY DEPOSIT GALLERY', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(234, 179, 8, 0.06)', accent: '#eab308' },
    { id: 'tellers', name: 'GRAND MARBLE TELLER HALL', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(251, 191, 36, 0.07)', accent: '#fbbf24' },
    { id: 'boardroom', name: 'GOVERNORS BOARDROOM', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(245, 158, 11, 0.06)', accent: '#f59e0b' },
    { id: 'mint', name: 'CURRENCY SORTING & MINT', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'foyer', name: 'BANK SECURITY ROTUNDA', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(248, 250, 252, 0.05)', accent: '#cbd5e1' },
    { id: 'bullion', name: 'GOLD BULLION RESERVE VAULT', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Bronze Revolving Doors', icon: '🏦', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Financial District' },
    { id: 'mission_board', kind: 'mission_board', name: 'Reserve Wire Terminal', icon: '💹', x: 700, y: 960, r: 85, cost: 0, desc: 'Check Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Federal ATM & Wire Mainframe', icon: '🏧', x: 930, y: 165, r: 95, cost: 0, desc: 'Siphon Reserve Scrap Surge (60s CD)' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Armored Courier Locker', icon: '🦺', x: 400, y: 200, r: 85, cost: 85, desc: 'Equip Kevlar & Backpack' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Mint Press & Tool Bench', icon: '🔧', x: 260, y: 1060, r: 85, cost: 35, desc: 'Fabricate Metal & Fuel' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Executive Espresso Bar', icon: '☕', x: 1680, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'med_pod', kind: 'med_pod', name: 'Executive First-Aid Suite', icon: '🩺', x: 1160, y: 960, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Central Gold Bullion Vault', icon: '🪙', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Breach Gold Reserve Vault' }
  ]
});

INTERIORS.stadium = makeSixWingInterior({
  w: 1920, h: 1260, wx1: 560, wx2: 1340, wy: 620, cy: 740,
  props: [
    [160, 210, 140, 36], [160, 390, 140, 36], // Locker benches
    [810, 320, 300, 64], // Center trophy & turf display island
    [1490, 180, 160, 40], [1490, 360, 160, 40], // Broadcast consoles
    [160, 840, 160, 44], // Concession counter
    [1510, 920, 130, 48] // Championship vault counter
  ],
  rooms: [
    { id: 'locker', name: 'HOME TEAM LOCKER ROOM', x: 28, y: 28, w: 532, h: 592, tint: 'rgba(34, 197, 94, 0.06)', accent: '#22c55e' },
    { id: 'vip', name: 'VIP SKYBOX & TROPHY GALLERY', x: 580, y: 28, w: 760, h: 712, tint: 'rgba(251, 191, 36, 0.07)', accent: '#fbbf24' },
    { id: 'press', name: 'BROADCAST PRESS & AV BOX', x: 1360, y: 28, w: 532, h: 592, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
    { id: 'concessions', name: 'FAN MERCH & CONCESSIONS', x: 28, y: 640, w: 532, h: 592, tint: 'rgba(249, 115, 22, 0.07)', accent: '#fb923c' },
    { id: 'concourse', name: 'GRAND STADIUM CONCOURSE', x: 580, y: 760, w: 760, h: 472, tint: 'rgba(16, 185, 129, 0.05)', accent: '#34d399' },
    { id: 'vault', name: 'CHAMPIONSHIP TROPHY VAULT', x: 1360, y: 640, w: 532, h: 592, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Stadium Tunnel Gates', icon: '🏟️', x: 960, y: 1160, r: 95, cost: 0, desc: 'Exit to Stadium Grounds' },
    { id: 'mission_board', kind: 'mission_board', name: 'Scoreboard Control Desk', icon: '📋', x: 700, y: 1060, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Broadcast & Floodlight Grid', icon: '📺', x: 1730, y: 240, r: 95, cost: 0, desc: 'Siphon Arena Power & Scrap (60s CD)' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Athlete Padding & Helm Lockers', icon: '🦺', x: 420, y: 180, r: 85, cost: 80, desc: 'Equip Tactical Vest & Pack' },
    { id: 'med_pod', kind: 'med_pod', name: 'Sports Medicine Cryo-Tub', icon: '🩺', x: 420, y: 440, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Stadium Hot-Dog & Shake Bar', icon: '🌭', x: 350, y: 1070, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Pit Crew & Field Maintenance', icon: '🔧', x: 160, y: 1070, r: 85, cost: 30, desc: 'Fabricate Metal & Fuel' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Championship Gate Receipts Safe', icon: '🏆', x: 1740, y: 1070, r: 95, cost: 0, desc: 'Crack Stadium Vault for Rare Loot' }
  ]
});

INTERIORS.aquarium = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [120, 170, 260, 72], // Coral Reef Tunnel glass tank
    [760, 240, 340, 120], // Abyssal Megalodon Ocean Tank
    [1460, 180, 160, 44], [1460, 360, 160, 44], // Marine Bio Lab benches
    [140, 780, 220, 90], // Penguin Ice Habitat Pool
    [1490, 880, 130, 46] // Specimen Vault desk
  ],
  rooms: [
    { id: 'reef', name: 'CORAL REEF TUNNEL', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(6, 182, 212, 0.09)', accent: '#22d3ee' },
    { id: 'abyss', name: 'DEEP OCEAN & SHARK ROTUNDA', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(14, 116, 144, 0.11)', accent: '#38bdf8' },
    { id: 'marinelab', name: 'MARINE BIO-RESEARCH LAB', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'penguin', name: 'ARCTIC PENGUIN COVE', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(186, 230, 253, 0.08)', accent: '#7dd3fc' },
    { id: 'foyer', name: 'OCEANARIUM GLASS ATRIUM', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(2, 132, 199, 0.06)', accent: '#38bdf8' },
    { id: 'vault', name: 'PEARL & SPECIMEN VAULT', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Oceanarium Glass Entrance', icon: '🐠', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Waterfront' },
    { id: 'mission_board', kind: 'mission_board', name: 'Marine Dive Dispatch', icon: '📋', x: 700, y: 960, r: 85, cost: 0, desc: 'Check Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Life-Support Hydro Filtration', icon: '🌊', x: 930, y: 145, r: 95, cost: 0, desc: 'Harvest Hydro Power & Scrap (60s CD)' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Marine Biotoxin Synth', icon: '🧪', x: 1690, y: 270, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'med_pod', kind: 'med_pod', name: 'Hyperbaric Dive Chamber', icon: '🩺', x: 1690, y: 470, r: 90, cost: 20, desc: 'Full Heal + Cure Infection' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Dive Suit & Gear Lockers', icon: '🤿', x: 420, y: 450, r: 85, cost: 85, desc: 'Equip Kevlar, Mask & Pack' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Seafront Gelato & Café', icon: '🍧', x: 350, y: 1070, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Sunken Treasure Vault', icon: '💎', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Crack Marine Vault for Rare Gear' }
  ]
});

INTERIORS.science = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [150, 210, 140, 44], [150, 390, 140, 44], // Robotics assembly bays
    [870, 310, 120, 80], // Planetarium Star Projector Core
    [1480, 200, 140, 44], [1480, 390, 140, 44], // Rocketry / cryo benches
    [160, 820, 150, 46], // Accelerator console
    [1490, 880, 130, 46] // Prototype security desk
  ],
  rooms: [
    { id: 'robotics', name: 'ROBOTICS & AI LABORATORY', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(56, 189, 248, 0.08)', accent: '#38bdf8' },
    { id: 'planetarium', name: 'GRAND STAR PLANETARIUM DOME', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(139, 92, 246, 0.09)', accent: '#a78bfa' },
    { id: 'space', name: 'AEROSPACE & ROCKETRY HALL', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(14, 165, 233, 0.07)', accent: '#22d3ee' },
    { id: 'physics', name: 'CRYO-PARTICLE ACCELERATOR', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'foyer', name: 'DISCOVERY ATRIUM & FOYER', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(148, 163, 184, 0.05)', accent: '#94a3b8' },
    { id: 'vault', name: 'PROTOTYPE RESEARCH VAULT', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Science Atrium Doors', icon: '🔭', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Museum Plaza' },
    { id: 'mission_board', kind: 'mission_board', name: 'Telemetry Research Kiosk', icon: '💻', x: 700, y: 960, r: 85, cost: 0, desc: 'Check Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Quantum Planetarium Core', icon: '⚛️', x: 930, y: 170, r: 95, cost: 0, desc: 'Harvest Quantum Research Scrap (60s CD)' },
    { id: 'craft_bench', kind: 'craft_bench', name: '3D Robotics Fabricator', icon: '🔧', x: 420, y: 290, r: 85, cost: 30, desc: 'Fabricate Metal & Fuel' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Cryo-Medical Synthesizer', icon: '🧪', x: 160, y: 1060, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'med_pod', kind: 'med_pod', name: 'Space Bio-Med Pod', icon: '🩺', x: 1680, y: 310, r: 90, cost: 20, desc: 'Full Heal + Cure Infection' },
    { id: 'weapon_forge', kind: 'weapon_forge', name: 'Experimental Arms Bench', icon: '🔫', x: 410, y: 1060, r: 85, cost: 110, desc: 'Print Tiered Tactical Weapon' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Black-Project Prototype Safe', icon: '🔐', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Crack Science Vault for Rare Gear' }
  ]
});

INTERIORS.bazaar = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [130, 170, 130, 44], [330, 170, 130, 44], [130, 380, 130, 44], // Spice & Silk stalls
    [760, 290, 340, 80], // Central Grand Fountain & Brass Lantern Island
    [1460, 190, 150, 44], [1460, 380, 150, 44], // Carpet & Brassware racks
    [130, 810, 160, 48], [340, 810, 130, 48], // Chai & Street Food stalls
    [1490, 880, 130, 44] // Guild merchant table
  ],
  rooms: [
    { id: 'spices', name: 'SAFFRON SPICE & SILK SOUK', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(245, 158, 11, 0.08)', accent: '#f59e0b' },
    { id: 'lanterns', name: 'GRAND LANTERN DOME COURT', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(234, 179, 8, 0.08)', accent: '#fbbf24' },
    { id: 'carpets', name: 'CARPET & BRASS EMPORIUM', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(220, 38, 38, 0.07)', accent: '#f87171' },
    { id: 'chai', name: 'CHAI PAVILION & KEBAB STALLS', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(251, 146, 60, 0.07)', accent: '#fb923c' },
    { id: 'archway', name: 'CARAVANSERAI ARCHWAY', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(16, 185, 129, 0.06)', accent: '#34d399' },
    { id: 'guild', name: 'MERCHANT GUILD TREASURY', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Bazaar Gatehouse Arch', icon: '🕌', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Market Square' },
    { id: 'mission_board', kind: 'mission_board', name: 'Caravan Trade Ledger', icon: '📜', x: 700, y: 960, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Guild Bullion Ledger', icon: '🪙', x: 930, y: 165, r: 95, cost: 0, desc: 'Collect Merchant Trade Scrap (60s CD)' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Saffron Chai & Feast Stall', icon: '🫖', x: 260, y: 1060, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Herbal Apothecary Stall', icon: '⚗️', x: 260, y: 280, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Silk & Nomad Armor Merchant', icon: '🎒', x: 1680, y: 280, r: 85, cost: 80, desc: 'Equip Kevlar, Pack & Gas Mask' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Coppersmith Brazier Bench', icon: '⚒️', x: 1680, y: 470, r: 85, cost: 35, desc: 'Fabricate Metal & Fuel' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Silk Road Guild Strongbox', icon: '👑', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Crack Guild Coffer for Rare Loot' }
  ]
});

INTERIORS.pyramid = makeSixWingInterior({
  props: [
    [680, 190, 44, 44], [1076, 190, 44, 44], [680, 430, 44, 44], [1076, 430, 44, 44], // Sandstone obelisks
    [830, 290, 140, 64], // Central Golden Sarcophagus Pedestal
    [160, 230, 44, 44], [360, 230, 44, 44], // Antechamber pillars
    [1420, 230, 120, 44], [1420, 390, 120, 44], // Star-chart stone altars
    [150, 800, 120, 48], [330, 800, 120, 48], // Canopic chests
    [1460, 880, 120, 46] // Treasury guardian altar
  ],
  rooms: [
    { id: 'antechamber', name: 'HIEROGLYPHIC ANTECHAMBER', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(217, 119, 6, 0.08)', accent: '#f59e0b' },
    { id: 'burial', name: 'GRAND SARCOPHAGUS CHAMBER', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(234, 179, 8, 0.09)', accent: '#fbbf24' },
    { id: 'stars', name: 'ASTRONOMICAL STAR SANCTUARY', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(14, 165, 233, 0.06)', accent: '#38bdf8' },
    { id: 'canopic', name: 'CANOPIC RELIQUARY WING', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(168, 85, 247, 0.06)', accent: '#a855f7' },
    { id: 'vestibule', name: 'TORCHED LIMESTONE VESTIBULE', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(180, 83, 9, 0.06)', accent: '#d97706' },
    { id: 'treasury', name: 'PHARAOH\'S GOLDEN TREASURY', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Carved Tomb Portal', icon: '🏛️', x: 900, y: 1105, r: 90, cost: 0, desc: 'Exit to Desert / Monument' },
    { id: 'mission_board', kind: 'mission_board', name: 'Rosetta Hieroglyph Stele', icon: '📜', x: 700, y: 940, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'med_pod', kind: 'med_pod', name: 'Sacred Lotus Basin', icon: '⛲', x: 900, y: 170, r: 90, cost: 15, desc: 'Full Heal + Cure Wounds' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Alchemical Myrrh Altar', icon: '⚗️', x: 1640, y: 180, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Oases Provision Table', icon: '🍞', x: 1620, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Ancient Bronze Forge', icon: '⚒️', x: 160, y: 440, r: 85, cost: 35, desc: 'Fabricate Scrap Metal & Fuel' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Guardian Armor Pedestal', icon: '🛡️', x: 180, y: 1040, r: 85, cost: 85, desc: 'Equip Kevlar, Mask & Pack' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Royal Golden Sarcophagus Safe', icon: '👑', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Claim Ancient Relics & Gold' }
  ]
});

INTERIORS.mosque = makeSixWingInterior({
  props: [
    [680, 190, 44, 44], [1076, 190, 44, 44], [680, 430, 44, 44], [1076, 430, 44, 44], // Iznik tiled marble columns
    [830, 130, 140, 36], // Mihrab Niche & Minbar
    [220, 260, 110, 110], // Fountain of Ablutions basin
    [1420, 230, 120, 40], [1420, 400, 120, 40], // Manuscript reading desks
    [1450, 880, 120, 44]
  ],
  rooms: [
    { id: 'ablutions', name: 'COURTYARD FOUNTAIN OF ABLUTIONS', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(6, 182, 212, 0.08)', accent: '#22d3ee' },
    { id: 'prayerhall', name: 'GRAND DOME PRAYER HALL', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(16, 185, 129, 0.08)', accent: '#34d399' },
    { id: 'manuscripts', name: 'HOUSE OF WISDOM MANUSCRIPTS', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(234, 179, 8, 0.07)', accent: '#fbbf24' },
    { id: 'cloister', name: 'IZNIK TILE COLONNADE', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
    { id: 'vestibule', name: 'GRAND MUQARNAS ARCHWAY', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(148, 163, 184, 0.05)', accent: '#cbd5e1' },
    { id: 'treasury', name: 'CALLIGRAPHY & RELIC TREASURY', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Courtyard Arch Doors', icon: '🕌', x: 900, y: 1105, r: 90, cost: 0, desc: 'Exit to Courtyard' },
    { id: 'mission_board', kind: 'mission_board', name: 'Scholarly Chronicle Desk', icon: '📜', x: 700, y: 940, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'med_pod', kind: 'med_pod', name: 'Fountain Healing Waters', icon: '⛲', x: 275, y: 450, r: 90, cost: 15, desc: 'Full Heal + Cure Wounds' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Avicenna Apothecary Synth', icon: '⚗️', x: 1640, y: 180, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Hospitality Dates & Tea Hall', icon: '🫖', x: 1620, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Artisan Tile & Brass Bench', icon: '⚒️', x: 160, y: 860, r: 85, cost: 35, desc: 'Fabricate Metal & Fuel' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Vault Guardian Lockers', icon: '🛡️', x: 380, y: 1040, r: 85, cost: 85, desc: 'Equip Kevlar, Mask & Pack' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Illuminated Relic Treasury', icon: '👑', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Claim Ancient Relics & Rare Gear' }
  ]
});

INTERIORS.capitol = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [170, 210, 140, 44], [170, 390, 140, 44], // Judge's bench / Law bookshelves
    [760, 290, 340, 56], // Curved legislative rostrum / gavel bench
    [1460, 230, 180, 58], // Press briefing podium & table
    [150, 810, 26, 220], [360, 810, 26, 220], // Federal Statute Archives
    [1490, 890, 130, 44] // State vault desk
  ],
  rooms: [
    { id: 'court', name: 'SUPREME HEARING CHAMBER', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(180, 83, 9, 0.07)', accent: '#f59e0b' },
    { id: 'chamber', name: 'PARLIAMENTARY & CAPITOL ROTUNDA', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(56, 189, 248, 0.07)', accent: '#38bdf8' },
    { id: 'press', name: 'PRESS BRIEFING & DIPLOMACY', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(234, 179, 8, 0.06)', accent: '#fbbf24' },
    { id: 'archives', name: 'NATIONAL STATUTES & ARCHIVES', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'foyer', name: 'GRAND MARBLE COLONNADE', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(248, 250, 252, 0.05)', accent: '#e2e8f0' },
    { id: 'vault', name: 'CLASSIFIED STATE ARCHIVE VAULT', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Capitol Portico Doors', icon: '🏛️', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Civic Plaza' },
    { id: 'mission_board', kind: 'mission_board', name: 'Executive Directive Desk', icon: '📋', x: 700, y: 960, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'National Comms & Record Server', icon: '📡', x: 930, y: 155, r: 95, cost: 0, desc: 'Extract State Data & Scrap (60s CD)' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Capitol Security Lockers', icon: '🦺', x: 410, y: 200, r: 85, cost: 85, desc: 'Equip Kevlar, Backpack & Gas Mask' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Document Binding & Tool Bench', icon: '🔧', x: 260, y: 1080, r: 85, cost: 35, desc: 'Fabricate Metal & Fuel' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Senators Dining Room', icon: '🥂', x: 1680, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'med_pod', kind: 'med_pod', name: 'Attending Physician Suite', icon: '🩺', x: 1160, y: 960, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Classified State Safe', icon: '🔐', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Breach Vault for Rare Gear' }
  ]
});

INTERIORS.palace = makeSixWingInterior({
  w: 1860, h: 1220, wx1: 540, wx2: 1300, wy: 600, cy: 710,
  props: [
    [170, 220, 150, 44], [170, 390, 150, 44], // Royal Ballroom piano & tables
    [830, 155, 200, 56], // Gilded Throne Dais
    [1460, 240, 180, 68], // State Banquet Table
    [160, 820, 140, 44], // Royal Guard Armory
    [1490, 890, 130, 44]
  ],
  rooms: [
    { id: 'ballroom', name: 'CHANDELIER GRAND BALLROOM', x: 28, y: 28, w: 512, h: 572, tint: 'rgba(236, 72, 153, 0.06)', accent: '#f472b6' },
    { id: 'throne', name: 'SOVEREIGN THRONE & STATE HALL', x: 560, y: 28, w: 740, h: 682, tint: 'rgba(234, 179, 8, 0.08)', accent: '#fbbf24' },
    { id: 'banquet', name: 'ROYAL BANQUET HALL', x: 1320, y: 28, w: 512, h: 572, tint: 'rgba(245, 158, 11, 0.07)', accent: '#f59e0b' },
    { id: 'guards', name: 'ROYAL GUARD BARRACKS', x: 28, y: 620, w: 512, h: 572, tint: 'rgba(16, 185, 129, 0.06)', accent: '#10b981' },
    { id: 'foyer', name: 'GRAND STAIRCASE FOYER', x: 560, y: 730, w: 740, h: 462, tint: 'rgba(248, 250, 252, 0.05)', accent: '#e2e8f0' },
    { id: 'vault', name: 'CROWN JEWELS TREASURY', x: 1320, y: 620, w: 512, h: 572, tint: 'rgba(239, 68, 68, 0.08)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Palace Courtyard Doors', icon: '👑', x: 930, y: 1125, r: 95, cost: 0, desc: 'Exit to Palace Gardens' },
    { id: 'mission_board', kind: 'mission_board', name: 'Steward Dispatch Desk', icon: '📜', x: 700, y: 960, r: 85, cost: 0, desc: 'Check Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Palace Security Control', icon: '💎', x: 930, y: 360, r: 95, cost: 0, desc: 'Collect Treasury Scrap (60s CD)' },
    { id: 'weapon_forge', kind: 'weapon_forge', name: 'Palace Guard Armory', icon: '🔫', x: 350, y: 1060, r: 85, cost: 100, desc: 'Print Tiered Royal Guard Armament' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Guard Armor Wardrobe', icon: '🦺', x: 160, y: 1060, r: 85, cost: 85, desc: 'Equip Kevlar & Pack' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Royal Banquet Kitchen', icon: '🥂', x: 1680, y: 460, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'med_pod', kind: 'med_pod', name: 'Court Physician Chamber', icon: '🩺', x: 1160, y: 960, r: 90, cost: 20, desc: 'Full Heal + Cure Wounds' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Crown Jewels Vault', icon: '🔐', x: 1690, y: 1060, r: 95, cost: 0, desc: 'Unlock Crown Vault for Gold & Rare Gear' }
  ]
});

INTERIORS.greenhouse = makeSixWingInterior({
  props: [
    [130, 180, 140, 44], [320, 180, 140, 44], [130, 380, 140, 44], // Tropical raised planters
    [830, 300, 200, 90], // Central Koi & Lily Pond
    [1460, 220, 150, 44], [1460, 400, 150, 44], // Seed & Herbarium benches
    [150, 810, 150, 48], // Nursery tool rack
    [1490, 880, 130, 44]
  ],
  rooms: [
    { id: 'orchids', name: 'ORCHID & FERN CONSERVATORY', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(236, 72, 153, 0.06)', accent: '#f472b6' },
    { id: 'palmhouse', name: 'CRYSTAL PALM DOME & KOI POND', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(16, 185, 129, 0.08)', accent: '#34d399' },
    { id: 'herbarium', name: 'SEED VAULT & BOTANICAL LAB', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(56, 189, 248, 0.06)', accent: '#38bdf8' },
    { id: 'aviary', name: 'CITRUS GROVE & NURSERY', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
    { id: 'foyer', name: 'SUNLIT GLASSHOUSE ENTRANCE', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(34, 197, 94, 0.06)', accent: '#4ade80' },
    { id: 'vault', name: 'MEDICINAL FLORA RESERVE', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Wrought-Iron Glass Doors', icon: '🌿', x: 900, y: 1105, r: 90, cost: 0, desc: 'Exit to Botanical Park' },
    { id: 'mission_board', kind: 'mission_board', name: 'Curator Field Journal', icon: '📋', x: 700, y: 940, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Fresh Harvest & Tea Pavilion', icon: '🍏', x: 900, y: 165, r: 95, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Botanical Medicine Synth', icon: '🧪', x: 1640, y: 310, r: 85, cost: 30, desc: 'Synthesize Medkit + Bandages' },
    { id: 'med_pod', kind: 'med_pod', name: 'Park Ranger First-Aid Cot', icon: '🩺', x: 1640, y: 470, r: 90, cost: 15, desc: 'Full Heal + Cure Wounds' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Greenhouse Biofuel Bench', icon: '🔧', x: 260, y: 1040, r: 85, cost: 30, desc: 'Fabricate Metal & Fuel' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Ranger Field Lockers', icon: '🦺', x: 420, y: 450, r: 85, cost: 85, desc: 'Equip Kevlar, Mask & Pack' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Cryo-Seed & Botanical Vault', icon: '🔐', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Crack Seed Vault for Rare Loot' }
  ]
});

INTERIORS.mill = makeSixWingInterior({
  props: [
    [160, 210, 150, 56], [160, 390, 150, 56], // Grain hoppers
    [820, 280, 160, 90], // Central Millstone Gear Mechanism
    [1440, 210, 160, 54], // Flour bagging belt
    [160, 820, 160, 50], // Tractor repair bench
    [1460, 880, 120, 46]
  ],
  rooms: [
    { id: 'hoppers', name: 'GRAIN HOPPER & SILO LOFT', x: 28, y: 28, w: 532, h: 562, tint: 'rgba(217, 119, 6, 0.08)', accent: '#f59e0b' },
    { id: 'millstones', name: 'GREAT MILLSTONE & WIND SHAFT', x: 580, y: 28, w: 640, h: 662, tint: 'rgba(180, 83, 9, 0.08)', accent: '#fbbf24' },
    { id: 'bagging', name: 'FLOUR MILLING & BAGGING FLOOR', x: 1240, y: 28, w: 532, h: 562, tint: 'rgba(251, 146, 60, 0.06)', accent: '#fb923c' },
    { id: 'tractor', name: 'TRACTOR & FARM MACHINE BAY', x: 28, y: 610, w: 532, h: 562, tint: 'rgba(132, 204, 22, 0.06)', accent: '#84cc16' },
    { id: 'foyer', name: 'MILLHOUSE LOADING DOCK', x: 580, y: 710, w: 640, h: 462, tint: 'rgba(148, 163, 184, 0.06)', accent: '#cbd5e1' },
    { id: 'vault', name: 'HOMESTEAD RESERVE VAULT', x: 1240, y: 610, w: 532, h: 562, tint: 'rgba(239, 68, 68, 0.07)', accent: '#ef4444' }
  ],
  stations: [
    { id: 'exit_door', kind: 'exit_lift', name: 'Barn Loading Doors', icon: '🌾', x: 900, y: 1105, r: 90, cost: 0, desc: 'Exit to Farmland' },
    { id: 'mission_board', kind: 'mission_board', name: 'Co-op Harvest Ledger', icon: '📋', x: 700, y: 940, r: 85, cost: 0, desc: 'Inspect Active Missions' },
    { id: 'reactor_core', kind: 'reactor_core', name: 'Wind Dynamo & Battery Bank', icon: '⚡', x: 900, y: 155, r: 95, cost: 0, desc: 'Harvest Mill Dynamo Scrap (60s CD)' },
    { id: 'craft_bench', kind: 'craft_bench', name: 'Tractor & Farm Welder Bench', icon: '🔧', x: 260, y: 1040, r: 85, cost: 30, desc: 'Fabricate Metal & Fuel' },
    { id: 'hydro_bar', kind: 'hydro_bar', name: 'Bakery & Homestead Pantry', icon: '🥖', x: 1630, y: 450, r: 85, cost: 10, desc: '100% Hunger, Thirst & Stamina' },
    { id: 'chem_synth', kind: 'chem_synth', name: 'Farm Veterinary First-Aid', icon: '💊', x: 1630, y: 200, r: 85, cost: 35, desc: 'Synthesize Medkit + Bandages' },
    { id: 'gear_fab', kind: 'gear_fab', name: 'Workwear & Mask Locker', icon: '🦺', x: 420, y: 450, r: 85, cost: 80, desc: 'Equip Kevlar, Mask & Pack' },
    { id: 'vault_locker', kind: 'vault_locker', name: 'Granary Paymaster Strongbox', icon: '🔐', x: 1640, y: 1050, r: 95, cost: 0, desc: 'Crack Mill Safe for Rare Loot' }
  ]
});

module.exports = {
  INTERIORS,
  RAID_BUNKERS
};

