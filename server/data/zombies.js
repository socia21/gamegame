'use strict';
// Rebalanced zombie speeds and attributes so survival feels fair, intense, and satisfying.
// Zombies drop Scrap (⚙️) for tycoon shelter building.
module.exports = {
  walker:{n:'Walker',hp:80,spd:46,dmg:9,atk:1.0,r:15,sense:420,c:'#6b8f5a',scrap:10,w:{all:30}},
  runner:{n:'Runner',hp:55,spd:125,dmg:7,atk:0.8,r:14,sense:520,c:'#a3b86c',scrap:15,night:1.8,w:{all:10,city:6}},
  crawler:{n:'Crawler',hp:45,spd:34,dmg:11,atk:1.1,r:13,sense:300,c:'#4f6b45',scrap:8,grab:1,w:{all:6}},
  bloater:{n:'Bloater',hp:180,spd:38,dmg:15,atk:1.4,r:24,sense:380,c:'#8f9a4a',scrap:25,explode:{r:120,dmg:35},w:{all:3,lakes:5}},
  spitter:{n:'Spitter',hp:85,spd:60,dmg:7,atk:1.2,r:15,sense:500,c:'#9acd32',scrap:20,spit:{range:400,dmg:10,cd:3.0},w:{all:4}},
  screamer:{n:'Screamer',hp:70,spd:85,dmg:5,atk:1,r:15,sense:550,c:'#d8c2e8',scrap:18,scream:1,w:{all:3}},
  brute:{n:'Brute',hp:750,spd:62,dmg:28,atk:1.6,r:28,sense:480,c:'#7a3b3b',scrap:75,knock:260,svd:4,armor:0.1,w:{all:2,sports:3}},
  riot:{n:'Riot Zombie',hp:200,spd:52,dmg:11,atk:1,r:17,sense:420,c:'#2f3f6b',scrap:25,shield:0.55,w:{gov:8,city:5}},
  soldier:{n:'Soldier Zombie',hp:230,spd:65,dmg:13,atk:0.9,r:16,sense:480,c:'#4b5320',scrap:30,armor:0.3,drop:'soldier',w:{gov:6,culture:2}},
  hazmat:{n:'Hazmat Zombie',hp:140,spd:48,dmg:10,atk:1,r:17,sense:400,c:'#e6d23a',scrap:22,aura:{r:85,dps:5},w:{culture:6,gov:3,volcanic:5}},
  mummy:{n:'Mummy',hp:140,spd:44,dmg:12,atk:1.1,r:16,sense:380,c:'#d9cba3',scrap:25,fireWeak:1,w:{historic:18}},
  burning:{n:'Burning Zombie',hp:95,spd:95,dmg:9,atk:1,r:15,sense:450,c:'#ff6a1a',scrap:25,burn:2,fireImmune:1,w:{volcanic:24}},
  frozen:{n:'Frozen Zombie',hp:170,spd:42,dmg:13,atk:1.2,r:17,sense:380,c:'#9fd8ef',scrap:25,slow:2,w:{alpine:28}},
  dune:{n:'Dune Lurker',hp:105,spd:110,dmg:12,atk:1,r:15,sense:420,c:'#d2b48c',scrap:22,burrow:1,w:{desert:24,saltflat:16,canyon:12}},
  drowned:{n:'Drowned',hp:110,spd:55,dmg:10,atk:1,r:15,sense:420,c:'#3e7a7a',scrap:18,swim:1,w:{lakes:20,reef:30,coast:16,karst:8}},
  farmer:{n:'Farmhand',hp:100,spd:54,dmg:13,atk:1.2,r:16,sense:420,c:'#9c6644',scrap:15,w:{rural:18}},
  athlete:{n:'Athlete Zombie',hp:85,spd:135,dmg:8,atk:0.8,r:15,sense:540,c:'#e63946',scrap:25,w:{sports:14}},
  stalker:{n:'Stalker',hp:120,spd:115,dmg:14,atk:0.9,r:14,sense:480,c:'#1b1b1b',scrap:35,stealth:1,nightOnly:1,w:{all:4}},
  behemoth:{n:'Behemoth',hp:4500,spd:58,dmg:50,atk:2,r:46,sense:750,c:'#5a1010',scrap:250,slam:{r:150,dmg:40,cd:5},knock:400,svd:8,armor:0.18,boss:1,w:{}},
  turned:{n:'Turned',hp:125,spd:110,dmg:11,atk:0.9,r:16,sense:520,c:'#c97c5d',scrap:30,w:{}},
};
