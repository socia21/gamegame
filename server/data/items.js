'use strict';
// Non-weapon items from your list (10 categories × 10) + crafted items.
// u = how the item is used:
//   consume  – eat/drink/inject, fx applied to you
//   place    – builds a structure (s = structure key) at the cursor
//   throw    – thrown at the cursor (th = effect on landing)
//   target   – used at the cursor (drone, laser pointer)
//   wear     – equipped into a body slot (fx = passive modifiers)
//   passive  – works automatically while carried (fx flags)
//   vehicle  – used on the nearest vehicle (vfx)
//   reinforce– strengthens the structure you aim at
//   material – crafting ingredient, key – opens vaults
const {AMMO} = require('./weapons');
const ITEMS = {};
const I = (k, n, c, u, o = {}) => { ITEMS[k] = Object.assign({n, c, u, st: 5, w: 10}, o); };

// 1. Medical
I('medkit','First Aid Kit','medical','consume',{st:3,w:5,fx:{heal:70,bleed:1},d:'Restores 70 HP and stops bleeding.'});
I('bandage','Bandages / Sterile Rags','medical','consume',{st:8,w:14,fx:{heal:8,bleed:1},d:'Stops bleeding.'});
I('painkillers','Painkillers','medical','consume',{st:6,w:10,fx:{painkill:90,heal:5},d:'Removes low-HP aim sway for 90s.'});
I('antibiotics','Antibiotics','medical','consume',{st:5,w:6,fx:{cure:45},d:'Fights the zombie infection (-45%).'});
I('splint','Splint / Cast','medical','consume',{st:3,w:7,fx:{splint:1},d:'Fixes a fracture (restores move speed).'});
I('antizyme','Antizyme','medical','consume',{st:4,w:4,fx:{antizyme:150},d:'Pauses infection progress for 150s.'});
I('sutures','Sutures / Needle & Thread','medical','consume',{st:4,w:7,fx:{heal:22,bleed:1},d:'Stitches deep wounds: +22 HP, stops bleeding.'});
I('disinfectant','Disinfectant Wipes','medical','consume',{st:6,w:9,fx:{disinf:120,heal:4},d:'Wounds can\'t get infected for 120s.'});
I('bloodbag','Blood Bag','medical','consume',{st:3,w:4,fx:{heal:50},d:'Restores 50 HP.'});
I('adrenaline','Adrenaline Injector','medical','consume',{st:4,w:4,fx:{adren:20,stam:100},d:'Infinite stamina and +30% speed for 20s.'});
// 2. Base-building
I('planks','Wooden Planks','build','place',{st:10,w:14,s:'wood',d:'Build a wooden barricade.'});
I('sandbags','Sandbags','build','place',{st:6,w:8,s:'sandbag',d:'Bullet-stopping sandbag wall.'});
I('cinder','Cinder Blocks','build','place',{st:6,w:7,s:'cinder',d:'Heavy masonry wall.'});
I('plywood','Plywood Sheets','build','place',{st:8,w:10,s:'plywood',d:'Quick, wide panel.'});
I('chainlink','Chain-Link Fencing','build','place',{st:6,w:7,s:'chainlink',d:'See-through fence — bullets pass, zombies don\'t.'});
I('scrapmetal','Metal Sheets / Scrap Metal','build','place',{st:8,w:9,s:'metal',d:'Metal wall — or use next to a vehicle to add armour plating.'});
I('hinges','Reinforced Hinges','build','material',{st:6,w:6,d:'Needed to craft fortified doors.'});
I('corrugated','Corrugated Iron Panels','build','place',{st:6,w:7,s:'corrugated',d:'Long iron wall.'});
I('rebar','Rebar','build','reinforce',{st:8,w:6,d:'Aim at a structure to give it +50% max HP.'});
I('tarp','Tarpaulin','build','place',{st:4,w:7,s:'raincatcher',d:'Build a rain catcher — collects drinkable water.'});
// 3. Crafting supplies
I('nails','Nails','craft','material',{st:20,w:12});
I('ducttape','Duct Tape','craft','material',{st:20,w:10});
I('screws','Screws & Bolts','craft','material',{st:20,w:10});
I('wires','Metal Wires','craft','material',{st:20,w:9});
I('glue','Industrial Glue / Epoxy','craft','material',{st:20,w:7});
I('gears','Gears & Cogwheels','craft','material',{st:20,w:6});
I('rags','Cloth Rags','craft','material',{st:20,w:12});
I('hose','Rubber Hose','craft','material',{st:20,w:6});
I('leather','Leather Scraps','craft','material',{st:20,w:7});
I('springs','Springs','craft','material',{st:20,w:7});
// 4. Energy & lighting
I('flashlight','Flashlight','energy','passive',{st:1,w:10,fx:{light:'cone'},d:'Press L to toggle a light cone.'});
I('headlamp','Headlamp','energy','passive',{st:1,w:6,fx:{light:'head'},d:'Press L: hands-free light around you.'});
I('glowstick','Glowsticks','energy','throw',{st:10,w:10,th:{t:'light',r:320,dur:75},d:'Silent light you can throw.'});
I('batteries','Batteries (AA/D)','energy','material',{st:10,w:12,d:'Crafting + recharges laser Energy Cells.'});
I('generator','Portable Gas Generator','energy','place',{st:1,w:3,s:'generator',d:'Lights up your base (but the noise attracts zombies).'});
I('carbattery','Car Battery','energy','material',{st:2,w:5,d:'Used to craft Tesla traps.'});
I('solar','Solar Panel','energy','place',{st:2,w:3,s:'solar',d:'Silent base light.'});
I('flare','Flares','energy','throw',{st:6,w:8,th:{t:'flare',r:440,dur:40,lure:1100},d:'Bright light — also draws zombies.'});
I('lantern','Kerosene Lantern','energy','passive',{st:1,w:5,fx:{light:'lantern'},d:'Press L: wide warm light.'});
I('fuse','Electrical Fuse','energy','material',{st:6,w:5});
// 5. Food
I('mre','MRE Ration','food','consume',{st:6,w:7,fx:{hu:65,th:5}});
I('beans','Canned Beans','food','consume',{st:6,w:14,fx:{hu:35}});
I('jerky','Dried Jerky','food','consume',{st:6,w:10,fx:{hu:28}});
I('energybar','Energy Bar','food','consume',{st:6,w:12,fx:{hu:16,stam:40}});
I('rice','Dry Rice / Pasta','food','consume',{st:6,w:9,fx:{hu:42,th:-10}});
I('peanutbutter','Peanut Butter','food','consume',{st:6,w:8,fx:{hu:48}});
I('soup','Canned Soup','food','consume',{st:6,w:10,fx:{hu:30,th:18}});
I('produce','Fresh Produce','food','consume',{st:6,w:9,fx:{hu:20,th:6}});
I('petfood','Canned Pet Food','food','consume',{st:6,w:7,fx:{hu:38}});
I('berries','Foraged Berries / Mushrooms','food','consume',{st:6,w:8,fx:{hu:16,th:4,poison:0.25},d:'25% chance they\'re poisonous.'});
// 6. Water
I('waterbottle','Water Bottle','water','consume',{st:4,w:14,fx:{th:45}});
I('canteen','Canteen','water','consume',{st:4,w:7,fx:{th:65}});
I('purifytabs','Water Purification Tablets','water','material',{st:10,w:7,d:'Auto-used when you drink from rivers/lakes (E near water).'});
I('filterstraw','Water Filter Straw','water','passive',{st:1,w:5,fx:{purify:1},d:'Drink from any natural water safely.'});
I('jerrywater','Water Jerrycan','water','consume',{st:2,w:4,fx:{th:100}});
I('raincollector','Rain Collector Barrel','water','place',{st:2,w:4,s:'barrel',d:'Collects drinkable rain water.'});
I('cookingpot','Cooking Pot','water','passive',{st:1,w:6,fx:{purify:1},d:'Boil natural water — drink it safely.'});
I('soda','Soda / Energy Drink','water','consume',{st:6,w:10,fx:{th:28,stam:30}});
I('camelbak','Hydration Bladder','water','passive',{st:1,w:4,fx:{thirstSlow:0.6},d:'You get thirsty 40% slower.'});
I('charcoalfilter','Charcoal Water Filter','water','place',{st:1,w:3,s:'charcoal',d:'Base water source that never runs dry.'});
// 7. Vehicle parts
I('gasoline','Gasoline Jerrycan','vehicle','vehicle',{st:3,w:12,vfx:{fuel:0.5},d:'Refuels the nearest vehicle by 50% (also flamethrower fuel).'});
I('tires','Car Tires','vehicle','vehicle',{st:2,w:7,vfx:{repair:0.25}});
I('oil','Engine Oil','vehicle','vehicle',{st:3,w:8,vfx:{repair:0.15}});
I('sparkplugs','Spark Plugs','vehicle','vehicle',{st:4,w:9,vfx:{fix:1,repair:0.1},d:'Fixes vehicles that won\'t start.'});
I('radiator','Vehicle Radiator','vehicle','vehicle',{st:1,w:5,vfx:{repair:0.3}});
I('alternator','Car Alternator','vehicle','vehicle',{st:1,w:5,vfx:{repair:0.25}});
I('siphon','Siphon Hose & Pump','vehicle','vehicle',{st:1,w:6,keep:1,vfx:{siphon:1},d:'Pull fuel out of a vehicle into a jerrycan.'});
I('carpanels','Hood / Door Panels','vehicle','vehicle',{st:2,w:5,vfx:{plate:0.12},d:'Adds armour plating to a vehicle.'});
I('windshield','Windshield Glass','vehicle','vehicle',{st:1,w:5,vfx:{repair:0.15,plate:0.05}});
I('repairkit','Vehicle Repair Kit','vehicle','vehicle',{st:2,w:5,vfx:{repair:0.6}});
// 8. Electronics
I('walkie','Walkie-Talkie','electronics','passive',{st:1,w:8,fx:{walkie:1},d:'Team chat (/t) + teammates on your minimap.'});
I('hamradio','HAM Radio','electronics','passive',{st:1,w:4,fx:{ham:1},d:'Shows supply drops and impact craters on your map.'});
I('gps','GPS Unit','electronics','passive',{st:1,w:6,fx:{gps:1},d:'Exact coordinates + teammates on the big map.'});
I('motion','Motion Detector','electronics','passive',{st:1,w:5,fx:{motion:1},d:'Zombies appear on your minimap.'});
I('nvg','Night Vision Goggles','electronics','passive',{st:1,w:3,fx:{nvg:1},d:'Press N to see in the dark.'});
I('camera','Digital Camera','electronics','consume',{st:1,w:5,keep:1,fx:{reveal:1},d:'Snap a photo: reveals nearby players & big zombies to your team.'});
I('geiger','Geiger Counter','electronics','passive',{st:1,w:4,fx:{geiger:1},d:'Toxic zones appear on your map.'});
I('keycard','Keycard / Access Badge','electronics','key',{st:5,w:3,d:'Opens locked vaults (press E on one).'});
I('circuit','Circuit Board','electronics','material',{st:6,w:7});
I('radio','Portable Radio','electronics','passive',{st:1,w:6,fx:{radio:1},d:'Hear emergency broadcasts: sky events are announced early.'});
// 9. Distraction & stealth
I('alarmclock','Alarm Clock / Kitchen Timer','distract','place',{st:3,w:8,s:'alarm',d:'Place it — it rings and pulls zombies to it.'});
I('firecrackers','Firecrackers','distract','throw',{st:6,w:8,th:{t:'lure',dur:8,lure:1500,pop:1}});
I('boombox','Noise Bomb / Boombox','distract','place',{st:2,w:5,s:'boombox',d:'Loud music lure for 40s.'});
I('roadflare','Road Flare','distract','throw',{st:6,w:8,th:{t:'flare',r:380,dur:50,lure:1200}});
I('drone','Distraction Drone','distract','target',{st:2,w:3,d:'Flies to the cursor and hovers there, buzzing loudly.'});
I('zombiescent','Zombie Blood Vial','distract','consume',{st:3,w:4,fx:{scent:75},d:'Zombies ignore you for 75s (until you attack).'});
I('smokecan','Smoke Canister','distract','throw',{st:4,w:7,th:{t:'smoke',r:250,dur:22}});
I('bottle','Glass Bottle / Throwing Stone','distract','throw',{st:10,w:14,th:{t:'lure',dur:3,lure:750}});
I('whistle','Whistle','distract','consume',{st:1,w:6,keep:1,fx:{whistle:1},d:'Draws all nearby zombies to YOU.'});
I('laserpointer','Laser Pointer','distract','target',{st:1,w:5,keep:1,d:'Silently lures zombies to the cursor.'});
// 10. Wearables
I('backpack','Hiking Backpack / Duffel','wear','wear',{st:1,w:7,slot:'back',fx:{slots:10},d:'+10 inventory slots.'});
I('kevlar','Kevlar Vest / Body Armor','wear','wear',{st:1,w:4,slot:'vest',fx:{bullet:0.5,blast:0.25,melee:0.3}});
I('leatherjacket','Bite-Proof Leather Jacket','wear','wear',{st:1,w:6,slot:'jacket',fx:{infect:0.35,melee:0.15},d:'Bites are far less likely to infect.'});
I('gasmask','Gas Mask / Respirator','wear','wear',{st:1,w:5,slot:'face',fx:{toxic:1},d:'Immune to toxic gas and ash.'});
I('boots','Tactical Boots','wear','wear',{st:1,w:7,slot:'feet',fx:{speed:1.08}});
I('gloves','Reinforced Gloves','wear','wear',{st:1,w:7,slot:'hands',fx:{bleed:0.4},d:'Scratches rarely cause bleeding.'});
I('gillie','Gillie Suit','wear','wear',{st:1,w:3,slot:'suit',fx:{gillie:1},d:'Zombies detect you at half range.'});
I('hazmat','HAZMAT Suit','wear','wear',{st:1,w:3,slot:'suit',fx:{toxic:1,speed:0.9,infect:0.5,fireRes:0.5}});
I('riothelmet','Riot Helmet with Visor','wear','wear',{st:1,w:5,slot:'head',fx:{armor:0.12,infect:0.7,hail:1}});
I('fannypack','Fanny Pack / Utility Belt','wear','wear',{st:1,w:8,slot:'belt',fx:{slots:4}});
// Crafted
I('molotov','Molotov Cocktail','crafted','throw',{st:4,w:0,th:{t:'fire',r:140,dur:9,dps:18}});
I('pipebomb','Pipe Bomb','crafted','throw',{st:4,w:0,th:{t:'frag',r:175,dmg:170,fuse:2.5}});
I('spiketrap','Spike Trap','crafted','place',{st:4,w:0,s:'spike'});
I('reinforcedwall','Reinforced Wall Kit','crafted','place',{st:4,w:0,s:'reinforced'});
I('door','Fortified Door','crafted','place',{st:3,w:0,s:'door',d:'Press E on it to open/close. Zombies can\'t open doors.'});
I('torch','Torch','crafted','passive',{st:1,w:0,fx:{light:'torch'}});
I('noisetrap','Noise Trap','crafted','place',{st:3,w:0,s:'noisetrap'});
I('teslatrap','Tesla Trap','crafted','place',{st:2,w:0,s:'tesla'});
for (const k of Object.keys(AMMO)) I('ammo_' + k, AMMO[k].n, 'ammo', 'ammo', {st: 9999, w: 0});

const STRUCTS = {
  wood:{n:'Wooden Barricade',w:90,h:18,hp:320,c:'#8b5a2b'},
  sandbag:{n:'Sandbag Wall',w:90,h:28,hp:750,c:'#b8a47a'},
  cinder:{n:'Cinder Block Wall',w:92,h:24,hp:1400,c:'#8d8d8d'},
  plywood:{n:'Plywood Panel',w:120,h:14,hp:220,c:'#c49a5a'},
  chainlink:{n:'Chain-Link Fence',w:120,h:8,hp:340,c:'#a9b4bd',bp:1},
  metal:{n:'Scrap Metal Wall',w:90,h:16,hp:950,c:'#6f7a84'},
  corrugated:{n:'Corrugated Iron Wall',w:140,h:14,hp:620,c:'#7d8f99'},
  reinforced:{n:'Reinforced Wall',w:100,h:28,hp:2600,c:'#4d5560'},
  door:{n:'Fortified Door',w:80,h:16,hp:900,c:'#5b3a1e',door:1},
  raincatcher:{n:'Tarp Rain Catcher',w:44,h:44,hp:150,c:'#2a6fdb',water:1},
  barrel:{n:'Rain Collector Barrel',w:36,h:36,hp:220,c:'#1f4f8f',water:1},
  charcoal:{n:'Charcoal Water Filter',w:36,h:36,hp:160,c:'#333333',water:1,inf:1},
  generator:{n:'Gas Generator',w:44,h:34,hp:300,c:'#c9a227',light:540,noise:600},
  solar:{n:'Solar Panel',w:56,h:32,hp:200,c:'#1b2a4a',light:380},
  spike:{n:'Spike Trap',w:70,h:70,hp:420,c:'#5a4a3a',block:0,trap:'spike'},
  tesla:{n:'Tesla Trap',w:30,h:30,hp:260,c:'#3fa7ff',trap:'tesla',charge:90},
  noisetrap:{n:'Noise Trap',w:24,h:24,hp:90,c:'#ff9f1c',block:0,lure:1000},
  alarm:{n:'Alarm Clock',w:20,h:20,hp:40,c:'#ffcc00',block:0,lure:1300,life:28,delay:3},
  boombox:{n:'Boombox',w:30,h:20,hp:60,c:'#ff4d6d',block:0,lure:1700,life:40},
};

const RECIPES = [
  {out:'bandage',n:2,in:{rags:2}},
  {out:'molotov',n:2,in:{bottle:1,rags:1,gasoline:1}},
  {out:'pipebomb',n:1,in:{ducttape:1,scrapmetal:1,firecrackers:1}},
  {out:'spiketrap',n:1,in:{planks:2,nails:2}},
  {out:'reinforcedwall',n:1,in:{scrapmetal:2,screws:2,rebar:1}},
  {out:'door',n:1,in:{planks:2,hinges:1,screws:1}},
  {out:'torch',n:1,in:{planks:1,rags:1}},
  {out:'noisetrap',n:1,in:{alarmclock:1,wires:1}},
  {out:'teslatrap',n:1,in:{carbattery:1,wires:2,circuit:1}},
  {out:'splint',n:1,in:{planks:1,ducttape:1}},
  {out:'sutures',n:1,in:{rags:1,wires:1,disinfectant:1}},
  {out:'repairkit',n:1,in:{screws:2,ducttape:1,gears:1}},
  {out:'leatherjacket',n:1,in:{leather:3,ducttape:1}},
  {out:'gloves',n:1,in:{leather:2,glue:1}},
  {out:'charcoalfilter',n:1,in:{tarp:1,hose:1,rags:2}},
  {out:'ammo_pistol',n:1,in:{screws:2,springs:1}},
  {out:'ammo_rifle',n:1,in:{screws:3,springs:1,glue:1}},
  {out:'ammo_buck',n:1,in:{screws:2,ducttape:1}},
  {out:'ammo_arrow',n:1,in:{planks:1,nails:2}},
  {out:'ammo_cell',n:1,in:{batteries:2,wires:1}},
  {out:'ammo_fuel',n:1,in:{gasoline:1,hose:1}},
];

// weighted item pools per category for loot rolls
const ITEM_CATS = {};
for (const [k, d] of Object.entries(ITEMS)) { if (!d.w) continue; (ITEM_CATS[d.c] = ITEM_CATS[d.c] || []).push([k, d.w]); }

module.exports = {ITEMS, STRUCTS, RECIPES, ITEM_CATS};
