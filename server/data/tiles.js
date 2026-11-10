'use strict';
// Terrain tile types with realistic topography and ground physics.
// walk = on-foot speed multiplier, veh = land-vehicle speed multiplier,
// grip = tyre grip & steering traction, solid = blocks everything on the ground, vsolid = blocks land vehicles,
// water: 0 none / 1 shallow / 2 deep, dmg = fire damage per second, toxic = poison damage per second.
const T = {DEEP:0,SHALLOW:1,SAND:2,GRASS:3,FOREST:4,ROAD:5,CONCRETE:6,FARM:7,ROCK:8,SNOW:9,ICE:10,LAVA:11,SALT:12,DIRT:13,SWAMP:14,TURF:15,TRACK:16,GREEN:17,DUNE:18,TOXIC:19,RUNWAY:20};
const PROPS = [
  {n:'Deep Water',walk:0.38,veh:0,grip:0.4,solid:0,vsolid:1,water:2,drag:1.8},
  {n:'Shallow Water',walk:0.62,veh:0.45,grip:0.7,solid:0,vsolid:0,water:1,drag:1.3},
  {n:'Sand',walk:0.85,veh:0.65,grip:0.75,drag:1.15},
  {n:'Grass',walk:1.0,veh:0.88,grip:0.95,drag:1.0},
  {n:'Forest',walk:0.80,veh:0.55,grip:0.85,drag:1.2},
  {n:'Paved Road',walk:1.25,veh:1.25,grip:1.25,drag:0.85},
  {n:'Concrete Slab',walk:1.18,veh:1.18,grip:1.15,drag:0.9},
  {n:'Farmland Soil',walk:0.85,veh:0.68,grip:0.85,drag:1.15},
  {n:'Solid Rock',walk:0,veh:0,grip:1.0,solid:1,vsolid:1},
  {n:'Deep Snow',walk:0.65,veh:0.52,grip:0.55,drag:1.35},
  {n:'Slick Ice',walk:0.95,veh:0.95,grip:0.12,drag:0.7},
  {n:'Volcanic Lava',walk:0.65,veh:0.50,grip:0.9,dmg:30,drag:1.2},
  {n:'Salt Flat',walk:1.15,veh:1.20,grip:0.95,drag:0.9},
  {n:'Gravel Dirt',walk:0.95,veh:0.82,grip:0.88,drag:1.05},
  {n:'Muddy Swamp',walk:0.48,veh:0.32,grip:0.60,water:1,drag:1.6},
  {n:'Sports Pitch',walk:1.08,veh:0.92,grip:1.05,drag:0.95},
  {n:'Race Circuit',walk:1.25,veh:1.38,grip:1.35,drag:0.8},
  {n:'Golf Fairway',walk:1.05,veh:0.90,grip:1.0,drag:0.95},
  {n:'Desert Dunes',walk:0.72,veh:0.58,grip:0.7,drag:1.25},
  {n:'Toxic Waste Ground',walk:0.90,veh:0.78,grip:0.95,toxic:8,drag:1.1},
  {n:'Airport Runway',walk:1.25,veh:1.40,grip:1.30,drag:0.78},
];
for (const p of PROPS) {
  p.solid = p.solid || 0;
  p.vsolid = p.vsolid || 0;
  p.water = p.water || 0;
  p.dmg = p.dmg || 0;
  p.toxic = p.toxic || 0;
  p.drag = p.drag || 1.0;
}
module.exports = {T, PROPS};
