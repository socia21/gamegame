'use strict';

// 16 designated shelter plots positioned across the world in clear tactical areas
const PLOTS = [
  { id: 1, name: 'Safe Haven Outpost Alpha', x: 4800, y: 4800, region: 'Alpine Foothills', theme: 'alpine', radius: 180 },
  { id: 2, name: 'Fortified Bunker Bravo', x: 11200, y: 4800, region: 'Glacier Pass', theme: 'alpine', radius: 180 },
  { id: 3, name: 'Sanctuary Valley Charlie', x: 20800, y: 5200, region: 'Ring Basin', theme: 'volcanic', radius: 180 },
  { id: 4, name: 'Delta Stronghold Delta', x: 27200, y: 5600, region: 'Fjord Bluff', theme: 'coast', radius: 180 },
  { id: 5, name: 'Colony Echo', x: 5200, y: 11200, region: 'Terrace Haven', theme: 'rural', radius: 180 },
  { id: 6, name: 'Redoubt Foxtrot', x: 12400, y: 12000, region: 'Old Quarter Bastion', theme: 'historic', radius: 180 },
  { id: 7, name: 'Camp Golf', x: 19600, y: 11600, region: 'Museum Commons', theme: 'culture', radius: 180 },
  { id: 8, name: 'Citadel Hotel', x: 26800, y: 12400, region: 'Coastal Plateau', theme: 'coast', radius: 180 },
  { id: 9, name: 'Plains Garrison India', x: 4400, y: 19600, region: 'Windmill Grounds', theme: 'rural', radius: 180 },
  { id: 10, name: 'Government Enclave Juliet', x: 11600, y: 20400, region: 'Capitol Ridge', theme: 'gov', radius: 180 },
  { id: 11, name: 'Metro Refuge Kilo', x: 20400, y: 20800, region: 'Downtown Compound', theme: 'city', radius: 180 },
  { id: 12, name: 'Arena Sanctuary Lima', x: 27600, y: 19800, region: 'Sports Complex', theme: 'sports', radius: 180 },
  { id: 13, name: 'Oasis Compound Mike', x: 5600, y: 26400, region: 'Dune Fringe', theme: 'desert', radius: 180 },
  { id: 14, name: 'Farmland Fort November', x: 12800, y: 27200, region: 'Silo Plains', theme: 'rural', radius: 180 },
  { id: 15, name: 'Harbour Base Oscar', x: 21200, y: 26800, region: 'Lakeside Anchorage', theme: 'lakes', radius: 180 },
  { id: 16, name: 'Exodus Station Papa', x: 26400, y: 26400, region: 'Archipelago Terminal', theme: 'reef', radius: 180 }
];

// 50+ Single-currency Tycoon upgrades (Currency: Scrap ⚙️) across 8 categories
const UPGRADES = [
  // ── 1. DEFENSE & FORTIFICATIONS ──
  {
    key: 'compound_expansion',
    name: 'Compound Fortress Expansion',
    cat: 'Defense',
    icon: '📐',
    desc: 'Physically expands the shelter perimeter walls and territory, creating a larger fortified fortress courtyard.',
    maxLv: 5,
    baseCost: 150,
    costMult: 2.2,
    stat: ['+80px Compound Perimeter Size', '+160px Compound Size + Reinforced Courtyard', '+240px Compound Size + Twin Sentry Racks', '+320px Compound Size + Outer Bastions', '+400px Mega Stronghold Citadel']
  },
  {
    key: 'walls',
    name: 'Reinforced Perimeter Walls',
    cat: 'Defense',
    icon: '🧱',
    desc: 'Upgrades plot walls from wooden barricades to military-grade titanium plates.',
    maxLv: 6,
    baseCost: 75,
    costMult: 2.1,
    stat: ['+250 Wall HP', '+600 Steel Plates', '+1,200 Reinforced Walls', '+2,500 Armored Concrete', '+5,000 Blast-Proof Walls', '+10,000 Adamantine Bulkheads']
  },
  {
    key: 'gate',
    name: 'Automated Airlock Gate',
    cat: 'Defense',
    icon: '🚪',
    desc: 'Heavy security blast door that opens for you and allies while repelling infected.',
    maxLv: 5,
    baseCost: 100,
    costMult: 2.2,
    stat: ['Auto-sliding Gate', '+500 Gate HP', 'Electric Shock on Contact', 'Hardened Blast Door (2500 HP)', 'Hydraulic Titan Gate (6000 HP)']
  },
  {
    key: 'spikes',
    name: 'Perimeter Spikes & Razor Barricades',
    cat: 'Defense',
    icon: '⛓️',
    desc: 'Damages and impales infected walking near the shelter boundaries.',
    maxLv: 5,
    baseCost: 60,
    costMult: 1.9,
    stat: ['15 Dmg to Touching Zombies', '30 Dmg + Bleed', '55 Dmg + Slow Effect', '90 Dmg Spikes', '150 Heavy Impalement Dmg']
  },
  {
    key: 'spotlights',
    name: 'Searchlight Floodlight Towers',
    cat: 'Defense',
    icon: '💡',
    desc: 'Perimeter searchlights that reveal night stalkers and illuminate the yard.',
    maxLv: 4,
    baseCost: 80,
    costMult: 2.0,
    stat: ['360° Night Floodlights', '+30% Light Radius', 'Strobe Effect (Slows nearby night zombies)', 'UV Light Grid (Damages Night Stalkers)']
  },
  {
    key: 'sandbags',
    name: 'Sandbag Bastions & Firing Embrasures',
    cat: 'Defense',
    icon: '🛡️',
    desc: 'Fortified shooting positions that grant +40% incoming damage resistance inside.',
    maxLv: 4,
    baseCost: 120,
    costMult: 2.2,
    stat: ['+15% Shelter Damage Protection', '+30% Shelter Damage Protection', '+45% Shelter Damage Protection', '+60% Bunker Hardening']
  },
  {
    key: 'tesla_barrier',
    name: 'Tesla Electric Barrier Grid',
    cat: 'Defense',
    icon: '⚡',
    desc: 'Discharges arcs of electricity that stun and incinerate swarming hordes.',
    maxLv: 5,
    baseCost: 300,
    costMult: 2.3,
    stat: ['Periodic 40 Dmg Chain Shock', 'Chain Shock 85 Dmg (3 Targets)', 'Chain Shock 160 Dmg (5 Targets)', 'High Voltage EMP Nova (300 Dmg + 3s Stun)', 'Overcharged Tesla Storm (600 Dmg + 5 Targets)']
  },
  {
    key: 'hardlight_dome',
    name: 'Hardlight Kinetic Shield Dome',
    cat: 'Defense',
    icon: '🌐',
    desc: 'Projects a glowing forcefield sphere over the shelter that repels zombie projectiles and swarms.',
    maxLv: 5,
    baseCost: 650,
    costMult: 2.4,
    stat: ['1,000 HP Kinetic Shield', '2,500 HP Shield + Auto-Recharge', '5,000 HP Shield + Projectile Deflection', '9,000 HP Overcharged Forcefield', '15,000 HP Invulnerable Aegis']
  },
  {
    key: 'minefield',
    name: 'Autonomous Proximity Claymore Ring',
    cat: 'Defense',
    icon: '💣',
    desc: 'Ring of self-replenishing smart claymores that detonate when hordes breach the perimeter.',
    maxLv: 4,
    baseCost: 240,
    costMult: 2.2,
    stat: ['8 Proximity Mines (120 Dmg)', '16 Mines + Shrapnel', '24 High-Explosive Mines (280 Dmg)', 'Smart Micro-Mines with 30s Auto-Regeneration']
  },

  // ── 2. AUTOMATED TURRETS ──
  {
    key: 'turret_pistol',
    name: '9mm Light Sentry Turret',
    cat: 'Turrets',
    icon: '🔫',
    desc: 'Rotary turret tracking and firing at hostile zombies within 450 range.',
    maxLv: 5,
    baseCost: 140,
    costMult: 2.1,
    stat: ['25 Dmg / 0.5s (Range 450)', '35 Dmg / 0.4s', '50 Dmg / 0.35s', '70 Dmg / 0.3s (Range 550)', '95 Dmg / 0.25s (Dual Barrels)']
  },
  {
    key: 'turret_mg',
    name: 'Heavy .50 Cal Minigun Sentry',
    cat: 'Turrets',
    icon: '💥',
    desc: 'Heavy anti-material automated gun capable of shredding brutes and runners.',
    maxLv: 5,
    baseCost: 350,
    costMult: 2.2,
    stat: ['60 Dmg / 0.2s (Range 600)', '85 Dmg / 0.18s', '110 Dmg / 0.15s', '140 Dmg / 0.12s + Armor Pierce', '180 Dmg Rapid Fire Shredder']
  },
  {
    key: 'turret_shotgun',
    name: 'Point-Defense Scatter Turret',
    cat: 'Turrets',
    icon: '🎯',
    desc: 'Fires heavy flak pellets devastating swarms at close to medium range.',
    maxLv: 4,
    baseCost: 200,
    costMult: 2.2,
    stat: ['6 Pellets × 18 Dmg (Range 320)', '8 Pellets × 24 Dmg', '10 Pellets × 32 Dmg + Knockback', 'Heavy Flak Cannon (12 × 45 Dmg)']
  },
  {
    key: 'turret_sniper',
    name: 'High-Caliber Anti-Material Sniper Turret',
    cat: 'Turrets',
    icon: '🔭',
    desc: 'Long-range thermal targeting sniper turret targeting high-threat special zombies.',
    maxLv: 4,
    baseCost: 450,
    costMult: 2.3,
    stat: ['220 Dmg / 2.0s (Range 850)', '320 Dmg / 1.8s', '450 Dmg / 1.5s (Range 1000)', '650 Dmg Armor-Piercing Railgun Shot']
  },
  {
    key: 'turret_rocket',
    name: 'Automated Stinger Missile Battery',
    cat: 'Turrets',
    icon: '🚀',
    desc: 'Fires salvoes of lock-on micro-missiles causing massive area explosions.',
    maxLv: 4,
    baseCost: 600,
    costMult: 2.4,
    stat: ['180 Area Dmg / 3.0s (Radius 120)', '260 Area Dmg / 2.5s (2 Missiles)', '360 Area Dmg / 2.0s (3 Missiles)', 'Quad Rocket Pod (500 Dmg / 1.8s)']
  },
  {
    key: 'turret_laser',
    name: 'Particle Beam Continuous Laser Sentry',
    cat: 'Turrets',
    icon: '⚡',
    desc: 'High-energy beam turret that melts flesh and armor with 100% accuracy.',
    maxLv: 4,
    baseCost: 750,
    costMult: 2.4,
    stat: ['Continuous 120 Dmg/s Beam', '220 Dmg/s + Burns Targets', '340 Dmg/s Piercing Beam', 'Orbital Laser Coupling (550 Dmg/s)']
  },
  {
    key: 'turret_cryo',
    name: 'Sub-Zero Cryo Frost Turret',
    cat: 'Turrets',
    icon: '❄️',
    desc: 'Sprays liquid nitrogen freezing fast runners solid and making zombies brittle.',
    maxLv: 4,
    baseCost: 280,
    costMult: 2.2,
    stat: ['60% Movement Slow (Range 380)', '75% Slow + 25 Dmg/s', 'Complete Flash Freeze (1.5s Immobilize)', 'Blizzard Emitter (Full 360° Freezing Ring)']
  },
  {
    key: 'turret_flame',
    name: 'Auto-Ignition Flamethrower Turret',
    cat: 'Turrets',
    icon: '🔥',
    desc: 'Ignites approaching waves in walls of fire that continue burning over time.',
    maxLv: 4,
    baseCost: 260,
    costMult: 2.2,
    stat: ['Napalm Cone (45 Dmg + Burn)', 'Wider Cone (75 Dmg + 6s Burn)', 'White Phosphorus Stream (120 Dmg)', 'Hellfire Projection (220 Dmg + Floor Fire)']
  },
  {
    key: 'tesla_spire',
    name: 'Central Tesla Arc Coil',
    cat: 'Turrets',
    icon: '🌩️',
    desc: 'Massive central pylon arcing high-voltage lightning into up to 8 zombies simultaneously.',
    maxLv: 4,
    baseCost: 800,
    costMult: 2.5,
    stat: ['120 Dmg (3 Targets, Range 500)', '200 Dmg (5 Targets, Range 600)', '320 Dmg (7 Targets + Stun)', 'Cataclysmic Discharge (500 Dmg, 10 Targets)']
  },

  // ── 3. RESOURCE PRODUCTION & AUTOMATION ──
  {
    key: 'scrap_compactor',
    name: 'Hydraulic Scrap Crusher',
    cat: 'Production',
    icon: '⚙️',
    desc: 'Crushes wasteland debris into refined Scrap every second automatically.',
    maxLv: 10,
    baseCost: 80,
    costMult: 1.85,
    stat: ['+3 Scrap / second', '+6 Scrap / second', '+10 Scrap / second', '+16 Scrap / second', '+24 Scrap / second', '+35 Scrap / second', '+50 Scrap / second', '+70 Scrap / second', '+100 Scrap / second', '+150 Scrap / second']
  },
  {
    key: 'scavenger_drones',
    name: 'Autonomous Scavenger Drone Hive',
    cat: 'Production',
    icon: '🛸',
    desc: 'Launches automated micro-drones that harvest scrap from killed zombies around the shelter.',
    maxLv: 5,
    baseCost: 220,
    costMult: 2.2,
    stat: ['1 Drone (+10 Scrap on Zombie Kills)', '2 Drones (+25 Scrap on Kills)', '3 Drones (+50 Scrap + Auto-Collect)', '4 Drones (+80 Scrap)', 'Advanced Swarm Hive (+130 Scrap on all Kills)']
  },
  {
    key: 'solar_array',
    name: 'Photovoltaic Solar Battery Grid',
    cat: 'Production',
    icon: '🔆',
    desc: 'Clean solar generators powering all shelter turret rates of fire by +25%.',
    maxLv: 5,
    baseCost: 180,
    costMult: 2.1,
    stat: ['+15% Turret Fire Rate', '+30% Turret Fire Rate', '+45% Turret Fire Rate', '+60% Turret Fire Rate', 'Overcharged Capacitor (+80% Fire Rate)']
  },
  {
    key: 'nuclear_rtg',
    name: 'Mini Nuclear RTG Core',
    cat: 'Production',
    icon: '☢️',
    desc: 'Unstoppable radioactive generator providing permanent high-voltage output and scrap.',
    maxLv: 4,
    baseCost: 850,
    costMult: 2.4,
    stat: ['+18 Scrap/s Baseline', '+36 Scrap/s Baseline', '+60 Scrap/s Baseline', '+100 Scrap/s Baseline + Free Power']
  },
  {
    key: 'scrap_smelter',
    name: 'High-Temperature Scrap Smelter',
    cat: 'Production',
    icon: '🏭',
    desc: 'Multiplies all incoming scrap drops from all sources by an additional +50%.',
    maxLv: 5,
    baseCost: 300,
    costMult: 2.3,
    stat: ['+25% Scrap Yield', '+50% Scrap Yield', '+75% Scrap Yield', '+100% Scrap Yield (2×)', '+150% Scrap Yield (2.5×)']
  },
  {
    key: 'crypto_terminal',
    name: 'Wasteland Satellite Relay Terminal',
    cat: 'Production',
    icon: '💻',
    desc: 'Taps into intact pre-war networks for automated scrap bounties.',
    maxLv: 4,
    baseCost: 400,
    costMult: 2.3,
    stat: ['+12 Scrap/s Network Stream', '+25 Scrap/s Network Stream', '+45 Scrap/s Network Stream', '+75 Scrap/s Network Stream']
  },

  // ── 4. SURVIVAL & BIOTECH ──
  {
    key: 'hydroponic_greenhouse',
    name: 'Pressurized Glass Hydroponic Greenhouse',
    cat: 'Survival',
    icon: '🌱',
    desc: 'Grows clean crops and fruit, automatically replenishing hunger when inside shelter.',
    maxLv: 4,
    baseCost: 150,
    costMult: 2.1,
    stat: ['Auto-Replenish Hunger (+15/min)', 'Fast Crop Yield (+30 Hunger/min)', 'Abundant Produce (Hunger permanently >80%)', 'Full Organic Nutrition (Grants +20 Max Stamina)']
  },
  {
    key: 'water_vaporator',
    name: 'Atmospheric Moisture Condenser Tower',
    cat: 'Survival',
    icon: '💧',
    desc: 'Condenses clean, purified drinking water from the atmosphere.',
    maxLv: 4,
    baseCost: 140,
    costMult: 2.1,
    stat: ['Auto-Replenish Thirst (+20/min)', 'Clean Water Dispenser (+40 Thirst/min)', 'Permanent Hydration (Thirst stays 100%)', 'Purified Electrolytes (+10% Movement Speed)']
  },
  {
    key: 'medbay',
    name: 'Advanced Field Triage Medical Center',
    cat: 'Survival',
    icon: '🩺',
    desc: 'Automated medical bay that treats wounds and rapidly heals players inside.',
    maxLv: 5,
    baseCost: 160,
    costMult: 2.2,
    stat: ['+5 HP / sec while in Shelter', '+12 HP / sec in Shelter', '+20 HP / sec + Cures Fractures', '+35 HP / sec + Cures Bleeding', 'Nanite Trauma Pod (+60 HP / sec)']
  },
  {
    key: 'decontamination_chamber',
    name: 'UV-C Decontamination Air-Shower',
    cat: 'Survival',
    icon: '☣️',
    desc: 'Cleanses infected survivors instantly, preventing turning into zombies.',
    maxLv: 3,
    baseCost: 250,
    costMult: 2.4,
    stat: ['Cleanses 50% Infection on Entry', 'Instant 100% Infection Cure on Entry', 'Permanent 24h Infection Immunity Aura']
  },
  {
    key: 'nanite_healing_vat',
    name: 'Nanite Bio-Regeneration Vat',
    cat: 'Survival',
    icon: '🧪',
    desc: 'Infuses survivor bloodstream with nanites, granting a protective +50 bonus overshield.',
    maxLv: 3,
    baseCost: 500,
    costMult: 2.5,
    stat: ['+30 Overshield Health', '+60 Overshield Health', '+100 Overshield Health + Auto-Defibrillator']
  },
  {
    key: 'field_kitchen',
    name: 'Automated Warm Ration Mess Hall',
    cat: 'Survival',
    icon: '🍲',
    desc: 'Prepares hot meals providing 1-hour stat boosts to damage and stamina.',
    maxLv: 3,
    baseCost: 200,
    costMult: 2.2,
    stat: ['Hot Meal Buff (+10% Dmg)', 'Feast Buff (+20% Dmg + 20 Max HP)', 'Survivor Banquet (+30% Dmg + 40 Max HP)']
  },

  // ── 5. ARMORY & WEAPONS WORKSHOP ──
  {
    key: 'ammo_press',
    name: 'Automated Bullet Stamping Press',
    cat: 'Armory',
    icon: '🎯',
    desc: 'Refills your equipped weapon ammunition continuously while inside shelter boundaries.',
    maxLv: 5,
    baseCost: 200,
    costMult: 2.2,
    stat: ['Slow Ammo Replenish', '+50% Ammo Refill Speed', '+100% Ammo Refill Speed', 'Instant Full Reload on Entry', 'Free Unlimited Heavy Artillery Munitions']
  },
  {
    key: 'gunsmith_bench',
    name: 'Precision Gunsmith Tuning Bench',
    cat: 'Armory',
    icon: '🔧',
    desc: 'Calibrates firearms for higher velocity, reduced recoil, and boosted critical damage.',
    maxLv: 4,
    baseCost: 260,
    costMult: 2.3,
    stat: ['+12% Weapon Damage', '+25% Weapon Damage', '+40% Weapon Damage + 25% Reload Speed', '+60% Weapon Damage + Armor Penetration']
  },
  {
    key: 'heavy_armory',
    name: 'Military Weapon Crate Storage',
    cat: 'Armory',
    icon: '🪖',
    desc: 'Spawns high-tier firearms and explosives directly inside your shelter lockers.',
    maxLv: 4,
    baseCost: 380,
    costMult: 2.4,
    stat: ['Assault Rifles & Shotguns in locker', 'Sniper Rifles & Heavy MGs in locker', 'Rocket Launchers & Grenades in locker', 'Exotic High-Tech Prototypes in locker']
  },
  {
    key: 'explosive_foundry',
    name: 'Autonomous Explosives Synthesizer',
    cat: 'Armory',
    icon: '🧨',
    desc: 'Produces pipebombs, molotovs, and grenades every few minutes for free.',
    maxLv: 4,
    baseCost: 250,
    costMult: 2.2,
    stat: ['Produces 2 Grenades / 5m', 'Produces 4 Grenades + Molotovs / 4m', 'Produces Rockets & C4 / 3m', 'Instant High-Explosive Resupply']
  },
  {
    key: 'armor_locker',
    name: 'Kevlar & Hazmat Suit Wardrobe',
    cat: 'Armory',
    icon: '🦺',
    desc: 'Provides free replacements of military vests, hazmat suits, and riot helmets.',
    maxLv: 3,
    baseCost: 320,
    costMult: 2.3,
    stat: ['Free Kevlar Vest Resupply', 'Free Hazmat Suit & Gasmask', 'Reinforced Titanium Juggernaut Suit (70% Dmg Resistance)']
  },

  // ── 6. LOGISTICS & GARAGE ──
  {
    key: 'repair_lift',
    name: 'Hydraulic Vehicle Maintenance Lift',
    cat: 'Logistics',
    icon: '🚗',
    desc: 'Repairs any damaged vehicle or helicopter parked on the shelter pad.',
    maxLv: 4,
    baseCost: 220,
    costMult: 2.2,
    stat: ['+10 Hull HP/s for Parked Vehicles', '+25 Hull HP/s for Vehicles', '+50 Hull HP/s + Fixes Broken Engines', 'Instant Vehicle Full Repair & Overhaul']
  },
  {
    key: 'fuel_synthesizer',
    name: 'Underground Biofuel Storage Tank',
    cat: 'Logistics',
    icon: '⛽',
    desc: 'Automatically refuels vehicles parked on the shelter pad.',
    maxLv: 4,
    baseCost: 180,
    costMult: 2.1,
    stat: ['+5 Fuel / sec in Shelter', '+15 Fuel / sec in Shelter', '+30 Fuel / sec in Shelter', 'Infinite Instant Vehicle Refuel']
  },
  {
    key: 'armor_plating',
    name: 'Vehicle Heavy Armor Plating Station',
    cat: 'Logistics',
    icon: '🛡️',
    desc: 'Welds steel armor plates onto any car driven into the shelter, increasing hull by +50%.',
    maxLv: 3,
    baseCost: 350,
    costMult: 2.3,
    stat: ['+30% Max Vehicle Hull', '+60% Max Vehicle Hull + Ram Dmg', '+100% Hull (Armored War Rig)']
  },
  {
    key: 'nitro_station',
    name: 'Supercharger Nitro Injection Bay',
    cat: 'Logistics',
    icon: '⚡',
    desc: 'Equips vehicles with rapid-recharge nitro boost and higher top speeds.',
    maxLv: 3,
    baseCost: 300,
    costMult: 2.3,
    stat: ['+25% Vehicle Boost Speed', '+50% Boost Speed + 50% Faster Recharge', 'Unlimited Continuous Nitro Boost']
  },
  {
    key: 'helipad',
    name: 'Reinforced Elevated Helipad & Windsock',
    cat: 'Logistics',
    icon: '🚁',
    desc: 'Dedicated rooftop landing circle with automated approach lights and fuel lines.',
    maxLv: 3,
    baseCost: 500,
    costMult: 2.4,
    stat: ['Illuminated Landing Pad + Windsock', 'Helicopter Rapid Auto-Refuel & Repair', 'Spawns Military Attack Helicopter on Pad']
  },

  // ── 7. ENDGAME: OPERATION EXODUS ──
  {
    key: 'radio_station',
    name: 'Emergency Ham Radio Broadcast Tower',
    cat: 'Endgame',
    icon: '📻',
    desc: 'Broadcasts survivor signals across the wasteland to coordinate defense with other players.',
    maxLv: 3,
    baseCost: 350,
    costMult: 2.3,
    stat: ['Broadcasts Shelter Status to Server', 'Global Team Comms Booster', 'Allies gain +25% Scrap near shelter']
  },
  {
    key: 'satellite_dish',
    name: 'Deep-Space Satellite Uplink',
    cat: 'Endgame',
    icon: '🛰️',
    desc: 'Connects to orbital satellites to predict sky events, weather, and call orbital strikes.',
    maxLv: 3,
    baseCost: 600,
    costMult: 2.4,
    stat: ['Sky Event & Storm Predictor', 'Allows Calling 1 Supply Drop / 8m', 'Allows Calling 1 Orbital Laser Strike / 4m']
  },
  {
    key: 'radar_spire',
    name: 'Early-Warning Extinction Swarm Radar',
    cat: 'Endgame',
    icon: '📡',
    desc: 'Scans the map for boss zombies, meteor strikes, and impending horde rushes.',
    maxLv: 3,
    baseCost: 450,
    costMult: 2.3,
    stat: ['Detects Boss Spawns 60s in Advance', 'Reveals all High-Threat Zombies on Radar', 'Pins Airdrop Locations Globally']
  },
  {
    key: 'evac_beacon',
    name: 'OPERATION EXODUS: Evacuation Beacon',
    cat: 'Endgame',
    icon: '🚨',
    desc: 'THE CONSTANT GAME OBJECTIVE. Construct and power the military transponder to signal the extraction carrier and trigger Rebirth!',
    maxLv: 5,
    baseCost: 1000,
    costMult: 2.5,
    stat: [
      'Stage 1: Transponder Core Built (1/5)',
      'Stage 2: High-Gain Antenna Erected (2/5)',
      'Stage 3: Subspace Frequencies Calibrated (3/5)',
      'Stage 4: Military Evacuation Carrier Signaled (4/5)',
      'Stage 5: EXTRACTION READY! Survive the Final 3-Minute Extinction Swarm for Complete Victory & Rebirth!'
    ]
  },

  // ── 8. REBORN / ASCENDANT TECH (Unlocked After Reborn) ──
  {
    key: 'teleport_pad',
    name: 'Quantum Teleportation Matrix Hub',
    cat: 'Reborn Tech',
    icon: '🌀',
    desc: 'Instantly warp between your shelter and major safe havens across the wasteland (Press P).',
    maxLv: 3,
    baseCost: 1200,
    costMult: 2.5,
    stat: ['Instant Warp to Shelter (60s Cooldown)', 'Warp Cooldown Reduced to 25s', 'Instant Zero-Cooldown Global Teleportation']
  },
  {
    key: 'antimatter_reactor',
    name: 'Antimatter Zero-Point Power Core',
    cat: 'Reborn Tech',
    icon: '⚛️',
    desc: 'Generates staggering amounts of energy and +40 Scrap per second permanently.',
    maxLv: 3,
    baseCost: 2000,
    costMult: 2.8,
    stat: ['+40 Scrap / sec permanently', '+90 Scrap / sec permanently', '+200 Scrap / sec permanently + Infinite Base Energy']
  },
  {
    key: 'orbital_strike_array',
    name: 'Orbital Kinetic Particle Lance',
    cat: 'Reborn Tech',
    icon: '☄️',
    desc: 'Target any coordinate to obliterate an entire zombie swarm with orbital particle beams.',
    maxLv: 3,
    baseCost: 2500,
    costMult: 3.0,
    stat: ['1,500 Dmg Orbital Blast (3m CD)', '3,000 Dmg Orbital Annihilation (2m CD)', '6,000 Dmg Cataclysmic Beam (60s CD)']
  },
  {
    key: 'nanite_forge',
    name: 'Autonomous Nanite Matter Replicator',
    cat: 'Reborn Tech',
    icon: '🧬',
    desc: 'Converts scrap directly into exotic weaponry, heavy ammo belts, and cyber-enhancements.',
    maxLv: 3,
    baseCost: 1800,
    costMult: 2.6,
    stat: ['Replicates Rare Military Ammo & Gear', 'Replicates Heavy Weaponry on Demand', 'Replicates Exotic Laser & Railgun Prototypes']
  },
  {
    key: 'genesis_beacon',
    name: 'Genesis Planetary Cleansing Array',
    cat: 'Reborn Tech',
    icon: '✨',
    desc: 'Releases a biocidal frequency that instantly disintegrates all infected within 2500 range.',
    maxLv: 3,
    baseCost: 3500,
    costMult: 3.0,
    stat: ['Purges all zombies within 1200 range', 'Purges all zombies within 2000 range', 'Mass Extinction Wave: Cleanses 3500 range']
  }
];

// Permanent Cross-Run Reborn Perks (Purchased with Quantum Cores ⚛️)
const REBORN_PERKS = {
  exoskeleton: {
    name: 'Titanium Exoskeleton Chassis',
    icon: '🦿',
    desc: 'Permanent cybernetic body armor granting +10% damage resistance per rank.',
    max: 5,
    cost: [2, 3, 5, 8, 12],
    effect: '+10% Armor / Damage Reduction per rank'
  },
  nanite_regen: {
    name: 'Nanite Bio-Regeneration Stream',
    icon: '🧬',
    desc: 'Continuously repairs tissue, regenerating +2 HP/sec and auto-healing fractures and bleeding.',
    max: 5,
    cost: [3, 4, 6, 9, 14],
    effect: '+2 HP/sec passive regen + Auto-cure fractures'
  },
  cybernetic_legs: {
    name: 'Bionic Cyber-Hydraulic Legs',
    icon: '⚡',
    desc: 'Permanent +15% sprint and movement speed, reducing sprint stamina cost by 50%.',
    max: 4,
    cost: [2, 4, 7, 10],
    effect: '+15% Move Speed + 50% Less Stamina Drain'
  },
  quantum_scavenger: {
    name: 'Quantum Scavenger Sub-Routine',
    icon: '⚙️',
    desc: 'Doubles scrap harvested from zombies, supply drops, and wrecks.',
    max: 5,
    cost: [3, 5, 8, 12, 16],
    effect: '+30% Scrap Gain Multiplier per rank'
  },
  hardlight_shield: {
    name: 'Personal Hardlight Forcefield Bubble',
    icon: '🛡️',
    desc: 'A permanent regenerating energy shield that absorbs up to 150 incoming damage.',
    max: 1,
    cost: [5],
    effect: '150 HP Personal Kinetic Shield (Auto-recharges)'
  },
  quantum_recall: {
    name: 'Quantum Recall Transponder',
    icon: '🌀',
    desc: 'Press P or click HUD button to instantly teleport back to your shelter from anywhere on the map.',
    max: 1,
    cost: [4],
    effect: 'Instant Teleport to Shelter (Press P)'
  },
  orbital_beam: {
    name: 'Orbital Particle Death Beam Uplink',
    icon: '🛰️',
    desc: 'Calls down a devastating orbital beam directly at your cursor location once every 90 seconds.',
    max: 1,
    cost: [6],
    effect: 'Cursor-Targeted Orbital Strike (90s Cooldown)'
  },
  exotic_cache: {
    name: 'Exotic Weapon Prototype Armory',
    icon: '⚡',
    desc: 'Start every single rebirth with a high-tier heavy weapon and energy ammunition.',
    max: 1,
    cost: [5],
    effect: 'Spawn with Exotic Weaponry & Heavy Ammo'
  }
};

// Helper to get total plot level
function computePlotLevel(upgrades) {
  if (!upgrades) return 1;
  let total = 0;
  for (const lv of Object.values(upgrades)) total += (lv || 0);
  return Math.max(1, Math.floor(total / 4) + 1);
}

// Helper to compute physical compound dimension (expandable by upgrades and level)
function computePlotSize(plotOrUpgrades) {
  const up = plotOrUpgrades ? (plotOrUpgrades.upgrades || plotOrUpgrades) : null;
  const exp = up ? (up.compound_expansion || 0) : 0;
  const lv = up ? computePlotLevel(up) : 1;
  return 320 + exp * 70 + Math.min(100, (lv - 1) * 15);
}

// Compute upgrade cost
function getUpgradeCost(upg, currentLevel) {
  const lv = currentLevel || 0;
  if (lv >= upg.maxLv) return null; // Maxed out
  return Math.round(upg.baseCost * Math.pow(upg.costMult, lv));
}

module.exports = {
  PLOTS,
  UPGRADES,
  REBORN_PERKS,
  computePlotLevel,
  computePlotSize,
  getUpgradeCost
};
