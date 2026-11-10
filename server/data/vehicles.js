'use strict';
// No vehicle list was attached, so this is a full set that fits the map's regions.
// kind: car | boat (water only) | hover (land + water) | heli (flies over everything)
// exposed: riders can be shot/bitten. shoot: seat indices that may fire their own weapons.
// guns: mounted weapons — seat that controls it (driver can use an empty gunner seat), alt = right mouse.
const OFF = {3:0.95,4:0.75,7:0.9,13:0.95,2:0.9,18:0.8,9:0.8,14:0.6,1:0.6};
const tankCannon = {name:'120mm Cannon',mode:'projectile',proj:1500,radius:180,dmg:330,rof:0.4,mag:1,reload:2.6,range:2300,vdmg:2.5,svd:6,kind:'shell',fx:'frag',noise:2800,spread:0.004};
const coax = {name:'Coax MG',mode:'hitscan',dmg:20,rof:11,mag:200,reload:5,spread:0.05,range:1300,auto:1,noise:1400};
const hmg = {name:'M2 .50 Cal',mode:'hitscan',dmg:42,rof:8,mag:200,reload:5,spread:0.05,range:1500,auto:1,pierce:2,vdmg:2,noise:1700};
const autocannon = {name:'30mm Autocannon',mode:'projectile',proj:1400,radius:75,dmg:85,rof:3,mag:40,reload:4,range:1800,auto:1,kind:'shell',fx:'frag',noise:2000,vdmg:2,spread:0.02};
const minigun = {name:'Minigun',mode:'hitscan',dmg:18,rof:28,mag:500,reload:6,spread:0.06,range:1500,auto:1,noise:1800};
const hydra = {name:'Hydra Rockets',mode:'projectile',proj:950,radius:120,dmg:150,rof:4,mag:14,reload:8,range:1800,auto:1,kind:'rocket',fx:'frag',spread:0.03,vdmg:2,noise:2000};
const gmlrs = {name:'GMLRS Rocket Pod',mode:'barrage',salvo:6,spreadR:160,delay:3,radius:150,dmg:260,rof:0.15,mag:1,reload:12,range:5000,minRange:600,fx:'frag',vdmg:2,svd:3,noise:3000};
const water = {name:'Water Cannon',mode:'cone',range:430,arc:0.35,knock:430,dmg:2,rof:10,auto:1,water:1,stun:0.25,noise:300};
const lmg = {name:'Pintle MG',mode:'hitscan',dmg:24,rof:10,mag:150,reload:4,spread:0.06,range:1300,auto:1,noise:1500};
module.exports = {
  sedan:{n:'Sedan',kind:'car',speed:900,accel:520,turn:2.6,hp:450,seats:4,r:26,len:66,wid:32,fuel:100,burn:0.55,mass:1,c:'#3a6ea5'},
  suv:{n:'SUV',kind:'car',speed:880,accel:480,turn:2.4,hp:650,seats:5,r:28,len:70,wid:36,fuel:110,burn:0.65,mass:1.3,c:'#2b2d42',terrain:OFF},
  sportscar:{n:'Sports Car',kind:'car',speed:1350,accel:820,turn:2.9,hp:340,seats:2,r:25,len:64,wid:30,fuel:80,burn:0.8,mass:0.9,c:'#d62828'},
  f1:{n:'Formula 1 Car',kind:'car',speed:1800,accel:1250,turn:3.2,hp:220,seats:1,r:24,len:68,wid:28,fuel:60,burn:1.0,mass:0.6,grip:1.4,exposed:1,c:'#e10600'},
  pickup:{n:'Pickup Truck',kind:'car',speed:850,accel:470,turn:2.4,hp:620,seats:4,r:28,len:72,wid:34,fuel:110,burn:0.6,mass:1.3,shoot:[2,3],c:'#8d6e63',terrain:OFF},
  police:{n:'Police Cruiser',kind:'car',speed:1080,accel:640,turn:2.7,hp:520,seats:4,r:26,len:68,wid:32,fuel:100,burn:0.6,mass:1.1,siren:1,c:'#f1f1f1'},
  firetruck:{n:'Fire Truck',kind:'car',speed:720,accel:340,turn:1.9,hp:1300,seats:4,r:36,len:100,wid:40,fuel:160,burn:0.8,mass:2.6,siren:1,tough:1,c:'#c1121f',guns:[{seat:1,w:water}]},
  ambulance:{n:'Ambulance',kind:'car',speed:880,accel:450,turn:2.3,hp:720,seats:4,r:30,len:80,wid:36,fuel:120,burn:0.65,mass:1.6,siren:1,heal:4,c:'#fafafa'},
  bus:{n:'City Bus',kind:'car',speed:640,accel:280,turn:1.6,hp:1500,seats:10,r:40,len:130,wid:42,fuel:200,burn:0.9,mass:3.2,tough:1,c:'#f4a261'},
  motorcycle:{n:'Motorcycle',kind:'car',speed:1250,accel:900,turn:3.4,hp:200,seats:2,r:18,len:44,wid:14,fuel:50,burn:0.4,mass:0.5,exposed:1,shoot:[1],c:'#222222'},
  quad:{n:'Quad Bike',kind:'car',speed:920,accel:700,turn:3.2,hp:280,seats:2,r:20,len:44,wid:30,fuel:50,burn:0.45,mass:0.6,exposed:1,shoot:[1],c:'#6a994e',terrain:{3:1,4:0.85,13:1,2:0.95,7:0.95,9:0.85,18:0.85,14:0.7,1:0.6}},
  golfcart:{n:'Golf Cart',kind:'car',speed:460,accel:350,turn:2.8,hp:160,seats:2,r:20,len:44,wid:26,fuel:40,burn:0.2,mass:0.5,exposed:1,shoot:[1],c:'#e9ecef'},
  tractor:{n:'Tractor',kind:'car',speed:520,accel:300,turn:2,hp:900,seats:1,r:28,len:60,wid:40,fuel:120,burn:0.5,mass:2.2,exposed:1,tough:1,c:'#2d6a4f',terrain:{3:1,7:1,4:0.9,13:1,2:0.9,14:0.8,9:0.8,18:0.85}},
  dunebuggy:{n:'Dune Buggy',kind:'car',speed:1150,accel:800,turn:3,hp:340,seats:2,r:22,len:52,wid:32,fuel:70,burn:0.6,mass:0.8,exposed:1,shoot:[1],c:'#ffb703',terrain:{2:1.05,18:1,12:1.1,13:1,3:0.95}},
  snowmobile:{n:'Snowmobile',kind:'car',speed:1000,accel:700,turn:2.9,hp:240,seats:2,r:20,len:48,wid:24,fuel:60,burn:0.5,mass:0.6,exposed:1,shoot:[1],c:'#4361ee',terrain:{9:1.1,10:1.05,3:0.7,13:0.6,5:0.5}},
  humvee:{n:'Humvee',kind:'car',speed:950,accel:560,turn:2.4,hp:1400,seats:4,r:30,len:74,wid:38,fuel:130,burn:0.75,mass:1.8,military:1,armor:0.25,c:'#6b705c',guns:[{seat:1,w:hmg}],terrain:OFF},
  apc:{n:'APC',kind:'car',speed:760,accel:400,turn:2,hp:2600,seats:8,r:36,len:92,wid:44,fuel:180,burn:0.9,mass:2.8,military:1,armor:0.4,tough:1,c:'#4f5d2f',guns:[{seat:1,w:autocannon}],terrain:OFF},
  tank:{n:'Main Battle Tank',kind:'car',speed:540,accel:260,turn:1.5,hp:4200,seats:3,r:42,len:100,wid:56,fuel:220,burn:1.1,mass:5,military:1,armor:0.6,tough:1,crush:1,c:'#5c6b3a',guns:[{seat:0,w:tankCannon},{seat:0,alt:1,w:coax}],terrain:{3:0.95,4:0.9,7:0.95,13:0.95,2:0.9,18:0.85,9:0.85,14:0.8,1:0.7}},
  himars:{n:'M142 HIMARS',kind:'car',speed:780,accel:380,turn:1.9,hp:1600,seats:2,r:34,len:96,wid:40,fuel:160,burn:0.8,mass:2.6,military:1,armor:0.2,tough:1,c:'#6c7a4b',guns:[{seat:0,w:gmlrs}]},
  heli:{n:'Helicopter',kind:'heli',speed:1150,accel:520,turn:2.4,hp:950,seats:4,r:30,len:90,wid:30,fuel:140,burn:1.2,mass:1.5,c:'#344e41',guns:[{seat:1,w:minigun},{seat:1,alt:1,w:hydra}],shoot:[2,3]},
  boat:{n:'Speedboat',kind:'boat',speed:1050,accel:600,turn:2.3,hp:420,seats:4,r:28,len:74,wid:30,fuel:100,burn:0.6,mass:1.1,exposed:1,shoot:[1,2,3],c:'#f8f9fa'},
  jetski:{n:'Jet Ski',kind:'boat',speed:1150,accel:900,turn:3.2,hp:160,seats:2,r:18,len:40,wid:16,fuel:40,burn:0.5,mass:0.5,exposed:1,shoot:[1],c:'#ef476f'},
  hovercraft:{n:'Hovercraft',kind:'hover',speed:850,accel:450,turn:2,hp:700,seats:4,r:32,len:80,wid:44,fuel:140,burn:0.8,mass:1.6,shoot:[2,3],c:'#ffd166',guns:[{seat:1,w:lmg}]},
};
