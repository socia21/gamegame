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

// Single-currency Tycoon upgrades (Currency: Scrap ⚙️)
const UPGRADES = [
  // ── DEFENSE & STRUCTURE ──
  {
    key: 'walls',
    name: 'Reinforced Perimeter Walls',
    cat: 'Defense',
    icon: '🧱',
    desc: 'Upgrades plot walls from wooden barricades to military-grade steel plates.',
    maxLv: 5,
    baseCost: 75,
    costMult: 2.2,
    stat: ['+250 Wall HP', '+600 Wall HP', '+1,200 Steel Walls', '+2,500 Armored Walls', '+5,000 Blast-Proof Walls']
  },
  {
    key: 'gate',
    name: 'Automated Airlock Gate',
    cat: 'Defense',
    icon: '🚪',
    desc: 'Heavy security blast door that opens for you and allies while repelling zombies.',
    maxLv: 4,
    baseCost: 100,
    costMult: 2.3,
    stat: ['Auto-sliding Gate', '+500 Gate HP', 'Electric Shock on Contact', 'Hardened Blast Door (2500 HP)']
  },
  {
    key: 'spikes',
    name: 'Perimeter Spikes & Razor Wire',
    cat: 'Defense',
    icon: '⛓️',
    desc: 'Damages and impales infected walking near the shelter boundaries.',
    maxLv: 5,
    baseCost: 60,
    costMult: 2.0,
    stat: ['15 Dmg to Touching Zombies', '30 Dmg + Bleed', '55 Dmg + Slow Effect', '85 Dmg Spikes', '130 Heavy Impalement Dmg']
  },
  {
    key: 'spotlights',
    name: 'Floodlight Security Towers',
    cat: 'Defense',
    icon: '💡',
    desc: 'High-intensity perimeter searchlights that reveal night stalkers and illuminate the yard.',
    maxLv: 4,
    baseCost: 80,
    costMult: 2.0,
    stat: ['360° Night Floodlights', '+30% Light Radius', 'Strobe Effect (Slows nearby night zombies)', 'UV Light Grid (Damages Night Stalkers)']
  },
  {
    key: 'sandbags',
    name: 'Sandbag Bunkers & Firing Slits',
    cat: 'Defense',
    icon: '🛡️',
    desc: 'Fortified shooting positions that grant +35% incoming bullet and hit resistance inside.',
    maxLv: 3,
    baseCost: 120,
    costMult: 2.4,
    stat: ['+20% Shelter Damage Protection', '+35% Shelter Damage Protection', '+50% Shelter Damage Protection']
  },
  {
    key: 'tesla_barrier',
    name: 'Tesla Electric Barrier Grid',
    cat: 'Defense',
    icon: '⚡',
    desc: 'Discharges arcs of electricity that stun and incinerate swarming hordes.',
    maxLv: 4,
    baseCost: 350,
    costMult: 2.5,
    stat: ['Periodic 40 Dmg Chain Shock', 'Chain Shock 85 Dmg (3 Targets)', 'Chain Shock 160 Dmg (5 Targets)', 'High Voltage EMP Nova (300 Dmg + 3s Stun)']
  },

  // ── AUTOMATED TURRETS ──
  {
    key: 'turret_pistol',
    name: '9mm Automated Sentry',
    cat: 'Turrets',
    icon: '🔫',
    desc: 'Rotary turret tracking and firing at any hostile zombies within 450 range.',
    maxLv: 5,
    baseCost: 150,
    costMult: 2.2,
    stat: ['25 Dmg / 0.5s (Range 450)', '35 Dmg / 0.4s', '48 Dmg / 0.35s', '65 Dmg / 0.3s (Range 550)', '85 Dmg / 0.25s (Dual Barrels)']
  },
  {
    key: 'turret_mg',
    name: 'Heavy .50 Cal Minigun Sentry',
    cat: 'Turrets',
    icon: '💥',
    desc: 'Heavy anti-material automated gun capable of shredding brutes and runners.',
    maxLv: 5,
    baseCost: 400,
    costMult: 2.3,
    stat: ['60 Dmg / 0.2s (Range 600)', '85 Dmg / 0.18s', '110 Dmg / 0.15s', '140 Dmg / 0.12s + Armor Pierce', '180 Dmg Rapid Fire Shredder']
  },
  {
    key: 'turret_shotgun',
    name: 'Point-Defense Scatter Turret',
    cat: 'Turrets',
    icon: '🎯',
    desc: 'Blasts 8 heavy buckshot pellets in a wide cone when zombies get close.',
    maxLv: 4,
    baseCost: 220,
    costMult: 2.1,
    stat: ['8x20 Dmg Cone Blast', '8x32 Dmg + Heavy Knockback', '8x48 Dmg Scatter', '10x65 Dmg Devastator Blast']
  },
  {
    key: 'turret_flame',
    name: 'Pyroclastic Flame Jet',
    cat: 'Turrets',
    icon: '🔥',
    desc: 'Spews pressurized napalm fire across approaching hordes, igniting them.',
    maxLv: 4,
    baseCost: 300,
    costMult: 2.2,
    stat: ['Continuous Fire Cone (45 DPS)', '75 DPS + Lingering Fire Ground', '120 DPS + Increased Arc', '180 DPS Blue Fire Inferno']
  },
  {
    key: 'turret_rocket',
    name: 'Missile Defense Pod',
    cat: 'Turrets',
    icon: '🚀',
    desc: 'Fires tracking micro-rockets at high-threat targets like Brutes and Behemoths.',
    maxLv: 3,
    baseCost: 650,
    costMult: 2.5,
    stat: ['2x180 Splash Dmg Rockets', '3x240 Splash Dmg Rockets', '4x350 High-Explosive Salvo']
  },
  {
    key: 'turret_laser',
    name: 'Orbital Guidance Beam Sentry',
    cat: 'Turrets',
    icon: '✨',
    desc: 'Precision laser focusing high-temperature light to melt boss armor.',
    maxLv: 3,
    baseCost: 850,
    costMult: 2.6,
    stat: ['Continuous 140 DPS Laser', '240 DPS Piercing Beam', '380 DPS Superheated Ray']
  },

  // ── PRODUCTION & TYCOON ECONOMY ──
  {
    key: 'scrap_compactor',
    name: 'Scrap Metal Compactor',
    cat: 'Production',
    icon: '⚙️',
    desc: 'Tycoon passive scrap generator that compresses field salvage into usable scrap constantly.',
    maxLv: 5,
    baseCost: 100,
    costMult: 2.0,
    stat: ['+2 Passive Scrap / sec', '+5 Passive Scrap / sec', '+12 Passive Scrap / sec', '+25 Passive Scrap / sec', '+50 Passive Scrap / sec']
  },
  {
    key: 'salvage_drone',
    name: 'Automated Scavenger Drone',
    cat: 'Production',
    icon: '🛸',
    desc: 'Deploys an autonomous drone to scout nearby ruins and bring back extra scrap.',
    maxLv: 4,
    baseCost: 200,
    costMult: 2.2,
    stat: ['Drone brings +5 Scrap / 10s', 'Drone brings +15 Scrap / 10s', 'Drone brings +35 Scrap / 10s', 'Dual Drones (+75 Scrap / 10s)']
  },
  {
    key: 'magnet_collector',
    name: 'Magnetic Scrap Collector',
    cat: 'Production',
    icon: '🧲',
    desc: 'Pulls dropped scrap directly toward you and awards bonus scrap per zombie kill.',
    maxLv: 4,
    baseCost: 140,
    costMult: 2.1,
    stat: ['+25% Scrap Pickup Radius', '+50% Radius & +20% Bonus Scrap', '+100% Radius & +40% Bonus Scrap', 'Global Scrap Magnet (+75% Bonus)']
  },
  {
    key: 'solar_array',
    name: 'Solar Panel & Battery Array',
    cat: 'Production',
    icon: '☀️',
    desc: 'Supplies unlimited green electrical power, accelerating all shelter production.',
    maxLv: 4,
    baseCost: 180,
    costMult: 2.2,
    stat: ['+15% Faster Tycoon Production', '+30% Faster Production', '+50% Faster Production', '+80% Overclocked Power Grid']
  },
  {
    key: 'industrial_forge',
    name: 'Industrial Smelting Forge',
    cat: 'Production',
    icon: '🏭',
    desc: 'Melts junk into high-density scrap bars, increasing passive income rates.',
    maxLv: 3,
    baseCost: 450,
    costMult: 2.4,
    stat: ['+15 Passive Scrap / sec', '+35 Passive Scrap / sec', '+75 Passive Scrap / sec']
  },

  // ── SURVIVAL & HEALTH ──
  {
    key: 'med_bay',
    name: 'Emergency Medical Bay',
    cat: 'Survival',
    icon: '🏥',
    desc: 'Field medical cots that rapidly heal health and stop bleeding when standing in your shelter.',
    maxLv: 5,
    baseCost: 120,
    costMult: 2.1,
    stat: ['Heals +3 HP/s inside plot', 'Heals +6 HP/s + Stops Bleed', 'Heals +12 HP/s + Heals Fractures', 'Heals +20 HP/s', 'Regenerative Bacta Tank (+35 HP/s)']
  },
  {
    key: 'decon_shower',
    name: 'Decontamination Chamber',
    cat: 'Survival',
    icon: '🧪',
    desc: 'Sterilizes virus pathogens, steadily reversing infection progression.',
    maxLv: 4,
    baseCost: 160,
    costMult: 2.2,
    stat: ['Cures -2% Infection / s', 'Cures -5% Infection / s', 'Cures -10% Infection / s', 'Instant Viral Neutralization']
  },
  {
    key: 'rain_collector',
    name: 'Purified Water Well & Reservoir',
    cat: 'Survival',
    icon: '💧',
    desc: 'Provides free unlimited clean water bottles and keeps thirst quenched at home.',
    maxLv: 4,
    baseCost: 90,
    costMult: 2.0,
    stat: ['Hydrates while at shelter', 'Produces 2 Clean Water / min', 'Produces 4 Mineral Water / min', 'Automated Hydration Dispenser']
  },
  {
    key: 'hydroponics',
    name: 'Hydroponic Greenhouse Garden',
    cat: 'Survival',
    icon: '🌱',
    desc: 'Grows vitamin-rich survival crops, providing fresh food and eliminating hunger.',
    maxLv: 4,
    baseCost: 110,
    costMult: 2.1,
    stat: ['Restores Hunger inside shelter', 'Generates 2 Fresh Food / min', 'Generates 5 MRE Rations / min', 'Hydroponic Feast (+25 Max Stamina)']
  },
  {
    key: 'comfort_bunks',
    name: 'Reinforced Survivor Bunks',
    cat: 'Survival',
    icon: '🛏️',
    desc: 'Gives comfortable resting quarters, boosting maximum player stamina and run speed.',
    maxLv: 3,
    baseCost: 150,
    costMult: 2.3,
    stat: ['+25 Max Stamina', '+50 Max Stamina + 10% Sprint Speed', '+100 Max Stamina + 20% Sprint Speed']
  },

  // ── ARMORY & COMBAT ──
  {
    key: 'ammo_press',
    name: 'Automated Ammo Press',
    cat: 'Armory',
    icon: '📦',
    desc: 'Manufactures free ammunition directly into your storage every 30 seconds.',
    maxLv: 5,
    baseCost: 180,
    costMult: 2.2,
    stat: ['+30 Pistol/Shotgun Ammo / 30s', '+50 Rifle/SMG Ammo / 30s', '+80 Ammo + Heavy Shells / 30s', '+120 High-Velocity Rounds', '+200 All Ammo + Rockets / 30s']
  },
  {
    key: 'weapon_workbench',
    name: 'Advanced Weapons Workbench',
    cat: 'Armory',
    icon: '🛠️',
    desc: 'Grants damage, reload speed, and accuracy buffs to all firearms while operating.',
    maxLv: 4,
    baseCost: 240,
    costMult: 2.3,
    stat: ['+15% Weapon Damage', '+25% Dmg + 20% Faster Reload', '+40% Dmg + Laser Sights', '+60% Mastercrafted Weapon Damage']
  },
  {
    key: 'armor_locker',
    name: 'Tactical Armor Locker',
    cat: 'Armory',
    icon: '🦺',
    desc: 'Equips you with reinforced ballistic plates and hazmat insulation on exit.',
    maxLv: 4,
    baseCost: 210,
    costMult: 2.2,
    stat: ['Free Kevlar Vest on Spawn', 'Hardened Tactical Armor (40% Res)', 'Hazmat Military Exosuit (60% Res)', 'Juggernaut Combat Armor (80% Res)']
  },
  {
    key: 'grenade_foundry',
    name: 'Explosives Foundry',
    cat: 'Armory',
    icon: '💣',
    desc: 'Refines chemical compounds into pipe bombs, frag grenades, and landmines.',
    maxLv: 3,
    baseCost: 320,
    costMult: 2.4,
    stat: ['Dispenses 2 Pipe Bombs on visit', 'Dispenses 3 Frag Grenades + Mines', 'Dispenses 4 C4 Charges + Rockets']
  },

  // ── LOGISTICS & VEHICLES ──
  {
    key: 'garage_bay',
    name: 'Shelter Vehicle Garage',
    cat: 'Logistics',
    icon: '🚗',
    desc: 'Designated parking pad that protects parked vehicles from zombie attacks and decay.',
    maxLv: 3,
    baseCost: 200,
    costMult: 2.2,
    stat: ['Protected Parking Space', 'Vehicles immune to zombie damage on plot', 'Dual Vehicle Protective Bays']
  },
  {
    key: 'auto_repair',
    name: 'Automated Vehicle Repair Bay',
    cat: 'Logistics',
    icon: '🔧',
    desc: 'Hydraulic lift that automatically repairs damaged vehicles parked on the plot.',
    maxLv: 4,
    baseCost: 260,
    costMult: 2.3,
    stat: ['Repairs +20 Veh HP / s', 'Repairs +50 Veh HP / s', 'Repairs +100 Veh HP / s', 'Instant Vehicle Overhaul & Armor Plating']
  },
  {
    key: 'fuel_synthesizer',
    name: 'Fuel Refinery & Tank',
    cat: 'Logistics',
    icon: '⛽',
    desc: 'Synthesizes gasoline directly into parked vehicles and provides free fuel cans.',
    maxLv: 3,
    baseCost: 220,
    costMult: 2.1,
    stat: ['Refuels +5 Fuel / s', 'Refuels +15 Fuel / s + 2 Jerrycans', 'Instant Full Fuel + Supercharger (+25% Speed)']
  },
  {
    key: 'radar_tower',
    name: 'Long-Range Radar Station',
    cat: 'Logistics',
    icon: '📡',
    desc: 'Sweeps the regional map, revealing all zombies, supply drops, vehicles, and players.',
    maxLv: 4,
    baseCost: 280,
    costMult: 2.2,
    stat: ['Reveals 1,200m area on radar', 'Reveals 2,400m area + Supply Drops', 'Reveals 4,000m area + Boss Zombies', 'Global Region Radar & Threat Warning']
  },
  {
    key: 'helipad',
    name: 'Reinforced Helipad',
    cat: 'Logistics',
    icon: '🚁',
    desc: 'Constructs an elevated helicopter landing pad and spawns a transport chopper.',
    maxLv: 3,
    baseCost: 800,
    costMult: 2.5,
    stat: ['Helipad Foundation', 'Spawns Patrol Helicopter', 'Upgraded Armed Combat Helicopter']
  },

  // ── COMMUNICATIONS & ENDGAME EXODUS GOAL ──
  {
    key: 'radio_station',
    name: 'Ham Radio Broadcast Array',
    cat: 'Endgame',
    icon: '📻',
    desc: 'Broadcasts survivor signals across the wasteland to coordinate defense with other players.',
    maxLv: 3,
    baseCost: 350,
    costMult: 2.3,
    stat: ['Broadcasts Shelter Status to Server', 'Global Team Comms Booster', 'Allies gain +20% Scrap near shelter']
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
    stat: ['Sky Event & Storm Predictor', 'Allows Calling 1 Supply Drop / 10m', 'Allows Calling 1 Orbital Laser Strike / 5m']
  },
  {
    key: 'evac_beacon',
    name: 'OPERATION EXODUS: Evacuation Beacon',
    cat: 'Endgame',
    icon: '🚨',
    desc: 'THE CONSTANT GAME OBJECTIVE. Construct and power the military transponder to signal the final extraction carrier!',
    maxLv: 5,
    baseCost: 1000,
    costMult: 2.5,
    stat: [
      'Stage 1: Transponder Core Built (1/5)',
      'Stage 2: High-Gain Antenna Erected (2/5)',
      'Stage 3: Subspace Frequencies Calibrated (3/5)',
      'Stage 4: Military Evacuation Carrier Signaled (4/5)',
      'Stage 5: EXTRACTION READY! Survive the Final 3-Minute Extinction Swarm for Complete Victory!'
    ]
  }
];

// Helper to get total plot level
function computePlotLevel(upgrades) {
  if (!upgrades) return 1;
  let total = 0;
  for (const lv of Object.values(upgrades)) total += (lv || 0);
  return Math.max(1, Math.floor(total / 4) + 1);
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
  computePlotLevel,
  getUpgradeCost
};
