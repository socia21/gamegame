'use strict';
// All 400 weapons from your list. Each category has a base behaviour ("mode"); individual weapons get
// a small deterministic stat variation plus hand-tuned overrides for the special ones.
//
// modes: hitscan (bullets/lasers), melee, projectile (rockets, arrows, bolts, lobbed shells),
//        grenade (thrown, fuse), mine (placed), strike (indirect fire at cursor after a delay),
//        barrage (salvo of strikes), flame (flamethrower), cone (microwave / dazzler / jammer / water)

const AMMO = {
  pistol: {n: 'Pistol/SMG Rounds', pick: 30},
  rifle:  {n: 'Rifle Rounds', pick: 40},
  sniper: {n: 'Sniper Rounds', pick: 10},
  buck:   {n: 'Shotgun Shells', pick: 12},
  arrow:  {n: 'Arrows & Bolts', pick: 12},
  rocket: {n: 'Rockets / Missiles', pick: 2},
  g40:    {n: '40mm Grenades', pick: 6},
  shell:  {n: 'Artillery Shells', pick: 3},
  mlrs:   {n: 'MLRS Rocket Pod', pick: 1},
  naval:  {n: 'Naval Ammo Belt', pick: 80},
  missile:{n: 'Missile Launch Codes', pick: 1},
  fuel:   {n: 'Flamer Fuel', pick: 100, from: ['gasoline', 100]},
  cell:   {n: 'Energy Cells', pick: 60, from: ['batteries', 25]},
};

const CATS = {
  ar:       {label:'Assault Rifle',mode:'hitscan',dmg:24,rof:9.5,mag:30,reload:2.2,spread:0.045,range:1150,ammo:'rifle',auto:1,tier:3,noise:1300,spd:0.95},
  sniper:   {label:'Sniper Rifle',mode:'hitscan',dmg:105,rof:0.85,mag:5,reload:3,spread:0.004,range:2600,ammo:'sniper',tier:3,noise:1800,spd:0.88,pierce:2,scope:1},
  smg:      {label:'SMG',mode:'hitscan',dmg:15,rof:13,mag:30,reload:1.8,spread:0.085,range:750,ammo:'pistol',auto:1,tier:2,noise:900,spd:1},
  pistol:   {label:'Handgun',mode:'hitscan',dmg:23,rof:4,mag:15,reload:1.4,spread:0.04,range:800,ammo:'pistol',tier:1,noise:800,spd:1.03},
  shotgun:  {label:'Shotgun',mode:'hitscan',pellets:8,dmg:12,rof:1.15,mag:6,reload:2.8,spread:0.2,range:480,ammo:'buck',tier:2,noise:1200,spd:0.96,knock:140},
  mg:       {label:'Machine Gun',mode:'hitscan',dmg:22,rof:12,mag:100,reload:4.5,spread:0.075,range:1250,ammo:'rifle',auto:1,tier:4,noise:1500,spd:0.72},
  sword:    {label:'Sword',mode:'melee',dmg:48,rof:1.6,range:80,arc:1.7,bleed:0.35,tier:1,noise:90,spd:1,knock:60},
  polearm:  {label:'Polearm',mode:'melee',dmg:44,rof:1.15,range:125,arc:0.8,pierce:3,tier:1,noise:90,spd:0.95,knock:130},
  bow:      {label:'Bow / Crossbow',mode:'projectile',proj:1150,dmg:58,rof:1.1,mag:1,reload:0.55,spread:0.015,range:1300,ammo:'arrow',tier:1,noise:60,spd:1,kind:'arrow'},
  blunt:    {label:'Blunt Weapon',mode:'melee',dmg:52,rof:1.1,range:74,arc:1.8,knock:260,stunc:0.5,svd:1.6,tier:1,noise:110,spd:0.98},
  dagger:   {label:'Dagger',mode:'melee',dmg:32,rof:3,range:54,arc:1.2,bleed:0.5,backstab:2.5,tier:1,noise:30,spd:1.06},
  launcher: {label:'Rocket Launcher',mode:'projectile',proj:760,radius:165,dmg:190,rof:0.7,mag:1,reload:2.6,spread:0.01,range:1700,ammo:'rocket',tier:4,noise:2200,spd:0.8,vdmg:2.2,svd:3,kind:'rocket',fx:'frag'},
  glauncher:{label:'Grenade Launcher',mode:'projectile',proj:640,lob:1,radius:125,dmg:120,rof:1.4,mag:1,reload:2,spread:0.02,range:1000,ammo:'g40',tier:4,noise:1200,spd:0.88,vdmg:1.5,svd:2,kind:'grenade',fx:'frag'},
  artillery:{label:'Artillery',mode:'strike',delay:2.6,radius:230,dmg:320,rof:0.25,mag:1,reload:4,range:3200,minRange:350,ammo:'shell',tier:5,noise:3200,spd:0.35,heavy:1,vdmg:2.5,svd:4,fx:'frag'},
  mlrs:     {label:'Rocket Artillery',mode:'barrage',salvo:12,spreadR:380,delay:3,radius:140,dmg:170,rof:0.2,mag:1,reload:7,range:3800,minRange:500,ammo:'mlrs',tier:5,noise:3500,spd:0.3,heavy:1,vdmg:2,svd:3,fx:'frag'},
  naval:    {label:'Naval Gun',mode:'projectile',proj:1500,radius:120,dmg:170,rof:1.2,mag:10,reload:4,spread:0.01,range:2000,ammo:'naval',tier:5,noise:2500,spd:0.35,heavy:1,auto:1,vdmg:2,svd:3,kind:'shell',fx:'frag'},
  missile:  {label:'Strategic Missile',mode:'strike',delay:5,radius:420,dmg:1100,rof:0.1,mag:1,reload:10,range:12000,minRange:700,ammo:'missile',tier:6,noise:6000,spd:0.5,heavy:1,vdmg:3,svd:6,fx:'frag'},
  throwing: {label:'Throwing Weapon',mode:'projectile',proj:950,dmg:42,rof:1.5,spread:0.02,range:700,tier:1,noise:40,spd:1.03,kind:'thrown'},
  siege:    {label:'Siege Engine',mode:'projectile',lob:1,proj:700,radius:160,dmg:230,rof:0.3,range:1700,minRange:250,tier:4,noise:900,spd:0.3,heavy:1,svd:5,vdmg:1.5,kind:'boulder',fx:'impact'},
  special:  {label:'Special Weapon',mode:'grenade',dmg:150,radius:160,fuse:2.4,range:650,count:3,rof:1,tier:3,noise:1500,spd:1,fx:'frag',proj:650,kind:'grenade'},
};

const LIST = {
  ar: 'AK-47 / AKM|M16A4|M4A1 Carbine|HK416|INSAS Rifle|FN SCAR-L / SCAR-H|Steyr AUG|IWI Tavor TAR-21|FAMAS|SIG SG 550|G36|SA80 / L85A2|QBZ-95 / QBZ-191|AK-12|CZ 805 BREN|Galil ACE|Beretta ARX160|FN F2000|Howa Type 89|RK 62 / RK 95 TP',
  sniper: 'Barrett M82A1 / M107|Dragunov SVD|Accuracy International AWM / L115A3|CheyTac M200 Intervention|M24 Sniper Weapon System|Remington 700 / M40|Sako TRG-42|PSG1|NTW-20|OSV-96|Barrett MRAD|SV-98|Steyr SSG 08|Orsis T-5000|PGM Hécate II|Vidhwansak|DSR-1|SIG Sauer SSG 3000|Walther WA 2000|Accuracy International AXSR',
  smg: 'Heckler & Koch MP5|Uzi|Thompson Submachine Gun|PP-19 Vityaz / Bizon|FN P90|CZ Scorpion EVO 3|B&T APC9|PPSh-41|MAC-10|Sterling SMG|SIG MPX|Beretta Model 38|Sten Gun|Kriss Vector|Walther MPK / MPL|Heckler & Koch UMP45|Saab Bofors CBJ-MS|Carl Gustaf m/45|KGP-9|Spectre M4',
  pistol: 'Glock 17 / 19|Colt M1911A1|Beretta 92FS / M9|SIG Sauer P226 / M17|Smith & Wesson Model 29|Desert Eagle|Browning Hi-Power|Walther PPK|CZ 75|Colt Python|Makarov PM|HK USP|FN Five-seveN|Tokarev TT-33|Luger P08|Webley Revolver|Springfield XD / Echelon|Chiappa Rhino|Ruger GP100|Nambu Type 14',
  shotgun: 'Remington 870|Mossberg 500 / 590|Benelli M4 (M1014)|Saiga-12|AA-12|Franchi SPAS-12|Winchester 1897 Trench Gun|Kel-Tec KSG|Beretta 1301|Browning Auto-5|Winchester Model 1912|IWI Tavor TS12|Benelli Super Black Eagle 3|SRM Arms Model 1216|Baikal MP-153|UTAS UTS-15|Browning Citori Over/Under|Stevens Model 320|Fabarm STF 12|CZ 612',
  mg: 'M2 Browning|FN Minimi / M249 SAW|PKM / PKP Pecheneg|M240 / FN MAG|MG42|MG3|DShK|M60|RPK-74|NSV|Kord|Mark 48|IWI Negev|Ultimax 100|Vickers Gun|Bren Gun|DP-27 / DP-28|Stoner 63|CETME Ameli|HK MG5',
  sword: 'Katana|Longsword|Shamshir|Khanda|Rapier|Claymore|Gladius|Jian|Dao|Talwar|Falchion|Wakizashi|Urumi|Kukri|Estoc|Zweihänder|Spatha|Kilij|Cutlass|Messer',
  polearm: 'Halberd|Yari|Naginata|Pike|Glaive|Trishula|Lanza|Partisan|Bardiche|Pollaxe|Qiang|Bec de Corbin|Guandao|Ranseur|Sarissa|Voulge|Assegai|English Bill|Sovnya|Lajatang',
  bow: 'English Longbow|Mongolian Composite Bow|Arbalest|Yumi|Cho-ko-nu|Scorpion Crossbow|Gastraphetes|Scythian Recurve Bow|Turkish Horse Bow|Flatbow|Hand Ballista|Hunnic Bow|Kyudo Yumi|Self Bow|Korean Gakgung|Shepherd\'s Sling|Atlatl|Blowgun|Steel Crossbow|Laminated Persian Bow',
  blunt: 'Flanged Mace|War Hammer|Gada|Morningstar|Flail|Kanabō|Quarterstaff|War Club|Tabarzin|Macuahuitl|Shillelagh|Knobkerrie|Battle Axe|Horseman\'s Pick|Taiaha|Bipennis|Shestopyor|Otsuchi|Mere|Tetsubo',
  dagger: 'Fairbairn–Sykes Fighting Knife|Katar|Kris|Tantō|Bowie Knife|Stiletto|Dirk|Pugio|Jambiya|Karambit|Bichuwa|Rondel Dagger|Cinquedea|Sica|Balisong|KA-BAR|Mercator K55K|Kindjal|Misericorde|Khanjar',
  launcher: 'RPG-7|FGM-148 Javelin|NLAW|FIM-92 Stinger|AT4|Carl Gustaf M4|BGM-71 TOW|RPG-30 / RPG-32|9K38 Igla / 9K333 Verba|Panzerfaust 3|M72 LAW|Spike Missile System|9M133 Kornet|Matador RGW 90|SMAW|Type 01 LMAT|C90-CR (M3)|Shillelagh Anti-Tank System|Skif / Stugna-P|RL-83 Blindicide',
  glauncher: 'M203|M320 GLM|Milkor M32 MGL|AGS-30 / AGS-40|Mk 19|GP-25 / GP-30|HK GMG|XM25 CDTE|Denel Y3 AGL|CZ 805 G1|Howa Type 96|China Lake Launcher|CIS 40 AGL|ARWEN 37|SAG-30|RGS-50|M79 Thumper|BS-1 Tishina|FN EGLM / Mk 13|QLZ-87 / QLZ-04',
  artillery: 'M777 Howitzer|PzH 2000|CAESAR|2S19 Msta-S|M109A7 Paladin|K9 Thunder|FH70|D-30 Howitzer|Archer Artillery System|ATAGS|2A65 Msta-B|M119 Howitzer|Zuzana 2|Type 99 SPG|PLZ-05|Nora B-52|G5 Howitzer|L118 Light Gun|Bofors 40mm|2S7 Pion',
  mlrs: 'M142 HIMARS Launcher|BM-21 Grad|BM-30 Smerch|M270 MLRS|Pinaka|TOS-1A Solntsepek|PHL-16 / PHL-03|K239 Chunmoo|ASTROS II|PULS Lynx|BM-27 Uragan|T-122 Sakarya|RM-70|LARS 2|Batailleur|Jobaria MCL|Valkiri|Type 81 MLRS|WR-40 Langusta|Teruel MLRS',
  naval: 'Phalanx CIWS|AK-630|Mark 45 5-inch Gun|OTO Melara 76mm Super Rapid|Goalkeeper CIWS|AK-130|Type 1130 CIWS|Bofors 57mm L/70|SeaRAM|Kashtan CIWS|4.5 inch Mark 8|AK-176|H/PJ-38 130mm|OTO Melara 127/64|Denel 35mm DPG|Millennium Gun|C-RAM|SM-2 / SM-6 Standard|Kortenaer 76mm|French 100mm Naval Gun',
  missile: 'BrahMos|Tomahawk TLAM|Agni-V|LGM-30G Minuteman III|RS-28 Sarmat|DF-41|DF-21D|Storm Shadow / SCALP|Kh-101 / Kh-102|Trident II D5|Avangard|Kalibr|9K720 Iskander-M|Precision Strike Missile|Jericho III|DF-17|Hwasong-17 / 18|Kinzhal|R-36M2 Voevoda|M51 SLBM',
  throwing: 'Shuriken|Throwing Tomahawk|Boomerang|Kunai|Francisca|Bolas|Chakram|Plumbata|Pilum|Javelin|Throwing Bipennis|Nzappa Zap|Surujin|Throwing Knives|Kpinga|Hurlbat|Swiss Darts|Falarica|Soliferrum|Atlatl Dart',
  siege: 'Trebuchet|Mangonel|Ballista|Battering Ram|Siege Tower|Onager|Couillard|Chu-ko-nu Siege Crossbow|Petrary|Springald|Great Siege Catapult|Traction Trebuchet|Claw of Archimedes|Sambuca|Carroballista|Bricole|Scorpio|Catapulta|Siege Hook|Dardanelles Gun',
  special: 'LaWS Laser|DragonFire Laser|M67 Frag Grenade|F-1 Limonka|RGD-5|M18A1 Claymore|POM-3 Mine|TM-62 Anti-Tank Mine|Taser X26|M84 Flashbang|Flamethrower|Iron Beam|THOR Microwave|ODIN Dazzler|HELMA-P|Drone Defender Jammer|RG-60TB Thermobaric Grenade|M18 Smoke Grenade|Active Denial System|Shmel-M',
};

const CIWS = {dmg:12,rof:40,mag:400,reload:6,spread:0.03,range:1400,auto:1,mode:'hitscan',radius:0,kind:null,fx:null};
const ICBM = {radius:900,dmg:3000,delay:9,reload:20,fx:'nuke'};
const HYPER = {radius:500,dmg:1500,delay:2.5,reload:12};
const CRUISE = {radius:420,dmg:1100,delay:5};
const SRBM = {radius:480,dmg:1300,delay:4};
const AGL = {auto:1,rof:5.5,mag:32,reload:5,spd:0.5,heavy:1};
const BOLT = {lob:0,proj:1450,radius:0,minRange:0,kind:'bolt',fx:null};
const RAM = {mode:'melee',radius:0,kind:null,fx:null,lob:0};
const LASER = {mode:'hitscan',beam:1,spread:0,auto:1,count:0,ammo:'cell',noise:200,fx:null,radius:0,kind:null,fuse:0,proj:0};
const CONE = {mode:'cone',count:0,fx:null,radius:0,kind:null,fuse:0};
const MINE = {mode:'mine',fuse:0};

const OV = {
  // snipers
  'Barrett M82A1 / M107':{dmg:190,pierce:5,vdmg:3,rof:1.6,mag:10,svd:2}, 'NTW-20':{dmg:240,pierce:6,vdmg:4,rof:0.6,mag:3,spd:0.7,svd:3},
  'OSV-96':{dmg:200,pierce:5,vdmg:3.2,rof:1.2,mag:5}, 'PGM Hécate II':{dmg:200,pierce:5,vdmg:3,mag:7}, 'Vidhwansak':{dmg:230,pierce:6,vdmg:3.5,rof:0.7,mag:5},
  'CheyTac M200 Intervention':{dmg:170,pierce:4,range:3000,mag:7}, 'Dragunov SVD':{rof:2.2,mag:10,dmg:85}, 'PSG1':{rof:2.4,mag:20,dmg:80}, 'Walther WA 2000':{rof:2,mag:6,dmg:88},
  // handguns
  'Desert Eagle':{dmg:55,mag:7,rof:2.2,knock:80}, 'Smith & Wesson Model 29':{dmg:58,mag:6,rof:1.8,reload:2.4}, 'Colt Python':{dmg:50,mag:6,rof:2,reload:2.2},
  'Chiappa Rhino':{dmg:48,mag:6,rof:2.2,reload:2.2}, 'Ruger GP100':{dmg:46,mag:6,rof:2.2,reload:2.2}, 'Webley Revolver':{dmg:42,mag:6,rof:2.2,reload:2.6},
  'FN Five-seveN':{mag:20,pierce:2}, 'Glock 17 / 19':{mag:17}, 'Colt M1911A1':{dmg:30,mag:7}, 'Walther PPK':{dmg:18,mag:7,noise:600}, 'Makarov PM':{mag:8},
  // smgs
  'FN P90':{mag:50,pierce:2}, 'Kriss Vector':{rof:18,mag:25}, 'MAC-10':{rof:18,spread:0.12}, 'PP-19 Vityaz / Bizon':{mag:64}, 'Thompson Submachine Gun':{mag:50,dmg:19,rof:11},
  'PPSh-41':{mag:71,rof:15,spread:0.11}, 'Heckler & Koch UMP45':{dmg:20,rof:10}, 'Spectre M4':{mag:50}, 'Heckler & Koch MP5':{spread:0.065},
  // rifles
  'FN SCAR-L / SCAR-H':{dmg:30,rof:8.5,mag:20}, 'AK-47 / AKM':{dmg:28,spread:0.06}, 'G36':{spread:0.035}, 'Steyr AUG':{spread:0.035}, 'FN F2000':{rof:11}, 'M16A4':{auto:0,rof:6,dmg:30,spread:0.03},
  // shotguns
  'AA-12':{auto:1,rof:5,mag:20,reload:3.5}, 'Saiga-12':{rof:3.5,mag:10}, 'Benelli M4 (M1014)':{rof:3,mag:7}, 'Franchi SPAS-12':{rof:2.5,mag:8}, 'SRM Arms Model 1216':{rof:3.5,mag:16},
  'UTAS UTS-15':{mag:15,rof:1.3}, 'Kel-Tec KSG':{mag:14}, 'IWI Tavor TS12':{mag:15,rof:3}, 'Baikal MP-153':{rof:3,mag:5}, 'Beretta 1301':{rof:3.5,mag:7}, 'Browning Auto-5':{rof:2.8,mag:5},
  'Benelli Super Black Eagle 3':{rof:3,mag:4}, 'Fabarm STF 12':{mag:7}, 'Browning Citori Over/Under':{mag:2,rof:3,dmg:15,reload:1.6}, 'Winchester 1897 Trench Gun':{rof:1.6,dmg:13},
  // machine guns
  'M2 Browning':{dmg:48,rof:8,pierce:3,vdmg:2.5,spd:0.45,range:1600}, 'DShK':{dmg:45,rof:9,pierce:3,vdmg:2.2,spd:0.45}, 'NSV':{dmg:45,rof:11,pierce:3,vdmg:2.2,spd:0.45},
  'Kord':{dmg:45,rof:11,pierce:3,vdmg:2.2,spd:0.5}, 'MG42':{rof:20,spread:0.09}, 'MG3':{rof:19,spread:0.085}, 'Vickers Gun':{mag:250,spd:0.5,rof:9}, 'Bren Gun':{mag:30,rof:8,spread:0.05,spd:0.85},
  'DP-27 / DP-28':{mag:47,rof:9}, 'RPK-74':{mag:45,spd:0.85}, 'Ultimax 100':{spd:0.88,spread:0.06},
  // swords
  'Zweihänder':{dmg:75,range:105,rof:0.9,spd:0.88,arc:1.9}, 'Claymore':{dmg:68,range:100,rof:1,spd:0.9}, 'Longsword':{dmg:56,range:92}, 'Urumi':{range:135,arc:2.6,dmg:34,rof:1.4,bleed:0.7},
  'Rapier':{arc:0.6,range:95,dmg:42,rof:2.2,pierce:2}, 'Estoc':{arc:0.5,range:100,pierce:2,dmg:50}, 'Katana':{dmg:58,rof:1.8}, 'Gladius':{range:64,rof:2.2}, 'Wakizashi':{range:60,rof:2.4}, 'Kukri':{range:58,rof:2.4,dmg:44},
  // polearms
  'Halberd':{arc:1.3,dmg:60,rof:0.95}, 'Pike':{range:165,arc:0.4,dmg:52,rof:0.9}, 'Sarissa':{range:190,arc:0.35,dmg:55,rof:0.8,spd:0.85}, 'Naginata':{arc:1.5,dmg:50}, 'Glaive':{arc:1.4},
  'Guandao':{arc:1.5,dmg:58,rof:0.9}, 'Lajatang':{arc:1.8,dmg:46}, 'Bardiche':{arc:1.3,dmg:62}, 'Pollaxe':{arc:1.0,dmg:64,stunc:0.3,knock:200}, 'Trishula':{pierce:3,dmg:50}, 'Assegai':{range:105,rof:1.6},
  // bows
  'English Longbow':{dmg:72,range:1600,proj:1300,rof:0.9}, 'Mongolian Composite Bow':{rof:1.4,dmg:60}, 'Arbalest':{dmg:110,reload:2.6,rof:0.5,pierce:2,proj:1400}, 'Steel Crossbow':{dmg:95,reload:2,rof:0.6,pierce:2},
  'Gastraphetes':{dmg:90,reload:2.4,rof:0.5}, 'Scorpion Crossbow':{dmg:120,reload:3,rof:0.4,pierce:3,spd:0.75}, 'Hand Ballista':{dmg:140,reload:3.5,rof:0.35,pierce:4,spd:0.7},
  'Cho-ko-nu':{mag:10,reload:3,rof:4,dmg:30,auto:1}, 'Shepherd\'s Sling':{ammo:null,mag:0,dmg:28,proj:800,range:800,rof:1.3,kind:'stone',knock:60}, 'Atlatl':{ammo:null,mag:0,dmg:65,proj:950,range:900,rof:0.8,kind:'dart'},
  'Blowgun':{dmg:12,poison:6,proj:900,range:700,rof:1.5,noise:10,kind:'dart'}, 'Turkish Horse Bow':{rof:1.6}, 'Hunnic Bow':{rof:1.3}, 'Laminated Persian Bow':{rof:1.3,dmg:62},
  // blunt
  'Flail':{arc:2.2,dmg:58,rof:0.9}, 'Morningstar':{dmg:60,bleed:0.3}, 'Gada':{dmg:68,rof:0.8,knock:340,spd:0.92}, 'Kanabō':{dmg:72,rof:0.75,knock:360,spd:0.9}, 'Tetsubo':{dmg:70,rof:0.8,knock:340},
  'Quarterstaff':{range:105,arc:1.6,dmg:38,rof:1.6,stunc:0.6}, 'Battle Axe':{dmg:66,bleed:0.4,svd:2.5}, 'Macuahuitl':{dmg:58,bleed:0.6}, 'Otsuchi':{dmg:62,svd:3,knock:380},
  'War Hammer':{dmg:60,svd:2.2,stunc:0.6}, 'Horseman\'s Pick':{pierce:2,dmg:55}, 'Tabarzin':{svd:2.4,dmg:56},
  // daggers
  'Katar':{dmg:36,rof:3.2}, 'Karambit':{bleed:0.8,rof:3.5,dmg:26}, 'Balisong':{rof:3.5,dmg:26}, 'Bowie Knife':{dmg:38,rof:2.6}, 'KA-BAR':{dmg:36}, 'Misericorde':{backstab:4}, 'Stiletto':{backstab:3.5,dmg:28}, 'Cinquedea':{dmg:40,range:60,rof:2.4},
  // launchers (homing = locks on to vehicles/big zombies, air = locks on to helicopters, guided = follows your cursor)
  'FGM-148 Javelin':{homing:'any',dmg:260,radius:150,vdmg:3.5,reload:3.5,proj:620}, 'NLAW':{homing:'any',dmg:230,vdmg:3}, 'FIM-92 Stinger':{homing:'air',dmg:200,proj:1100,radius:120,vdmg:4},
  '9K38 Igla / 9K333 Verba':{homing:'air',dmg:190,proj:1050,radius:120,vdmg:4}, 'BGM-71 TOW':{guided:1,dmg:280,vdmg:3.5,spd:0.5,proj:600,range:2400},
  '9M133 Kornet':{guided:1,dmg:290,vdmg:3.5,spd:0.55,proj:620,range:2400,fx:'thermo'}, 'Skif / Stugna-P':{guided:1,dmg:270,vdmg:3.3,spd:0.55}, 'Shillelagh Anti-Tank System':{guided:1,dmg:240,vdmg:3},
  'Spike Missile System':{homing:'any',dmg:260,vdmg:3.4,range:2400}, 'Type 01 LMAT':{homing:'any',dmg:220,vdmg:3}, 'Carl Gustaf M4':{reload:2,dmg:210}, 'RPG-30 / RPG-32':{dmg:240,vdmg:3},
  'AT4':{dmg:220}, 'M72 LAW':{dmg:170,radius:140}, 'SMAW':{radius:190,svd:5}, 'Panzerfaust 3':{dmg:230,vdmg:2.8},
  // grenade launchers
  'Milkor M32 MGL':{mag:6,rof:3,reload:4}, 'China Lake Launcher':{mag:4,rof:1.6,reload:3}, 'AGS-30 / AGS-40':{...AGL,rof:5,mag:30}, 'Mk 19':{...AGL,mag:48,spd:0.45}, 'HK GMG':{...AGL,spd:0.45},
  'Denel Y3 AGL':{...AGL,rof:5,mag:35}, 'CIS 40 AGL':{...AGL}, 'QLZ-87 / QLZ-04':{...AGL,rof:6,mag:30,reload:4.5,spd:0.55}, 'SAG-30':{...AGL,rof:5,mag:29}, 'Howa Type 96':{...AGL,rof:5,mag:50,spd:0.45},
  'XM25 CDTE':{mag:5,rof:2,radius:110,dmg:110}, 'ARWEN 37':{mag:5,rof:2,dmg:15,radius:100,stun:3,fx:'stun'}, 'RGS-50':{radius:150,dmg:150}, 'BS-1 Tishina':{noise:120},
  // artillery
  'Bofors 40mm':{mode:'projectile',proj:1300,radius:90,dmg:90,rof:2,mag:8,reload:4,auto:1,range:2000,minRange:0,kind:'shell'}, 'PzH 2000':{mag:3,rof:1,reload:6}, 'Archer Artillery System':{mag:3,rof:0.9,reload:6},
  'CAESAR':{mag:2,rof:0.8}, 'K9 Thunder':{mag:2,rof:0.8}, 'M109A7 Paladin':{mag:2,rof:0.7}, 'Zuzana 2':{mag:2,rof:0.7}, '2S19 Msta-S':{mag:2,rof:0.7}, '2S7 Pion':{radius:300,dmg:460,delay:3.6,reload:6},
  'M119 Howitzer':{radius:180,dmg:240,rof:0.4,spd:0.45}, 'L118 Light Gun':{radius:180,dmg:240,rof:0.4,spd:0.45}, 'D-30 Howitzer':{radius:200,dmg:270},
  // MLRS
  'M142 HIMARS Launcher':{salvo:6,spreadR:140,dmg:270,radius:150}, 'TOS-1A Solntsepek':{fx:'thermo',radius:170,dmg:200,salvo:10,spreadR:260,range:2500}, 'BM-30 Smerch':{radius:180,dmg:220,range:4500},
  'M270 MLRS':{dmg:200}, 'BM-21 Grad':{salvo:16,dmg:130,spreadR:450}, 'Pinaka':{dmg:180}, 'Type 81 MLRS':{salvo:14,dmg:120,spreadR:480},
  // naval
  'Phalanx CIWS':CIWS, 'AK-630':CIWS, 'Goalkeeper CIWS':CIWS, 'Type 1130 CIWS':{...CIWS,rof:55}, 'Kashtan CIWS':CIWS, 'Millennium Gun':{...CIWS,dmg:18,rof:30}, 'C-RAM':CIWS, 'Denel 35mm DPG':{...CIWS,dmg:20,rof:18,mag:200},
  'SeaRAM':{homing:'any',proj:1000,radius:150,dmg:250,rof:1,mag:4,reload:6,kind:'rocket'}, 'SM-2 / SM-6 Standard':{homing:'any',proj:1200,radius:170,dmg:300,rof:0.6,mag:2,reload:7,kind:'rocket',range:3000},
  'AK-130':{radius:150,dmg:220,rof:1.5}, 'OTO Melara 76mm Super Rapid':{rof:2,radius:110,dmg:140}, 'Bofors 57mm L/70':{rof:3,radius:90,dmg:110,mag:20},
  // strategic missiles
  'Agni-V':ICBM, 'LGM-30G Minuteman III':ICBM, 'RS-28 Sarmat':ICBM, 'DF-41':ICBM, 'Trident II D5':ICBM, 'Jericho III':ICBM, 'Hwasong-17 / 18':ICBM, 'R-36M2 Voevoda':ICBM, 'M51 SLBM':ICBM,
  'Avangard':HYPER, 'DF-17':HYPER, 'Kinzhal':HYPER, 'BrahMos':CRUISE, 'Tomahawk TLAM':CRUISE, 'Storm Shadow / SCALP':CRUISE, 'Kh-101 / Kh-102':CRUISE, 'Kalibr':CRUISE,
  '9K720 Iskander-M':SRBM, 'Precision Strike Missile':SRBM, 'DF-21D':SRBM,
  // throwing
  'Shuriken':{rof:4,dmg:22,proj:1100}, 'Kunai':{rof:3,dmg:28}, 'Throwing Knives':{rof:3.5,dmg:30}, 'Plumbata':{rof:3,dmg:26}, 'Swiss Darts':{rof:3,dmg:22}, 'Throwing Tomahawk':{dmg:62,rof:1.1},
  'Francisca':{dmg:65,rof:1,svd:2}, 'Throwing Bipennis':{dmg:68,rof:0.9}, 'Hurlbat':{dmg:60,rof:1}, 'Kpinga':{dmg:55,bleed:0.5}, 'Nzappa Zap':{dmg:58}, 'Pilum':{dmg:80,pierce:2,rof:0.8},
  'Javelin':{dmg:78,pierce:2,rof:0.8,range:850}, 'Soliferrum':{dmg:85,pierce:3,rof:0.7}, 'Atlatl Dart':{dmg:66,proj:1100,range:900}, 'Falarica':{dmg:60,burn:4,rof:0.7},
  'Bolas':{dmg:10,stun:2.5,rof:1.2}, 'Chakram':{dmg:42,pierce:4,rof:1.4}, 'Boomerang':{dmg:30,stunc:0.6,returns:1,rof:1.2}, 'Surujin':{mode:'melee',range:140,arc:0.6,dmg:30,stunc:0.7,rof:1.4,kind:null},
  // siege
  'Ballista':{...BOLT,dmg:150,pierce:6,rof:0.8,spd:0.55,svd:2}, 'Springald':{...BOLT,proj:1400,dmg:130,pierce:5,rof:0.9,spd:0.6}, 'Carroballista':{...BOLT,proj:1400,dmg:120,pierce:5,rof:1,spd:0.65},
  'Scorpio':{...BOLT,dmg:110,pierce:4,rof:1.2,spd:0.7}, 'Chu-ko-nu Siege Crossbow':{...BOLT,proj:1300,dmg:70,pierce:3,rof:3,auto:1,spd:0.6},
  'Battering Ram':{...RAM,dmg:130,range:115,arc:0.6,knock:650,rof:0.6,svd:10,spd:0.55}, 'Siege Tower':{...RAM,dmg:90,range:120,arc:1.6,knock:500,rof:0.5,svd:6,spd:0.4},
  'Sambuca':{...RAM,dmg:80,range:150,arc:0.8,knock:420,rof:0.7,svd:4,spd:0.5}, 'Siege Hook':{...RAM,dmg:60,range:170,arc:0.5,knock:-300,rof:1,svd:4,spd:0.7},
  'Claw of Archimedes':{...RAM,dmg:110,range:175,arc:0.9,knock:900,rof:0.5,svd:5,spd:0.45}, 'Dardanelles Gun':{lob:0,proj:1100,radius:190,dmg:280,rof:0.2,kind:'shell',fx:'frag',minRange:0},
  'Traction Trebuchet':{rof:0.45,dmg:180}, 'Trebuchet':{radius:190,dmg:280,range:2000}, 'Couillard':{radius:170}, 'Onager':{rof:0.4},
  // special
  'LaWS Laser':{...LASER,dmg:7,rof:22,mag:120,reload:3,range:1500,pierce:3,burn:2,spd:0.55,heavy:1,tier:5},
  'DragonFire Laser':{...LASER,dmg:8,rof:22,mag:120,reload:3,range:1700,pierce:3,burn:2,spd:0.5,heavy:1,tier:5},
  'Iron Beam':{...LASER,dmg:11,rof:20,mag:100,reload:3.5,range:1900,pierce:4,burn:3,spd:0.4,heavy:1,tier:6},
  'HELMA-P':{...LASER,dmg:6,rof:24,mag:150,reload:2.5,range:1300,pierce:2,burn:1.5,spd:0.75,tier:4},
  'M67 Frag Grenade':{}, 'F-1 Limonka':{radius:180,dmg:150}, 'RGD-5':{radius:150,dmg:140,count:4}, 'RG-60TB Thermobaric Grenade':{radius:200,dmg:190,fx:'thermo',count:2},
  'M84 Flashbang':{dmg:0,radius:320,fx:'flash',blind:4,stun:4,count:3,noise:2000}, 'M18 Smoke Grenade':{dmg:0,radius:260,fx:'smoke',count:4,noise:200},
  'M18A1 Claymore':{...MINE,radius:210,dmg:220,count:2,trig:'any'}, 'POM-3 Mine':{...MINE,radius:160,dmg:160,count:3,trig:'any'}, 'TM-62 Anti-Tank Mine':{...MINE,radius:230,dmg:650,vdmg:3,count:2,trig:'heavy'},
  'Taser X26':{mode:'hitscan',dmg:8,stun:3,range:320,rof:0.6,mag:1,reload:1.8,spread:0.02,count:0,noise:60,tier:2,radius:0,fx:null,fuse:0,proj:0,kind:null},
  'Flamethrower':{mode:'flame',dmg:7,rof:22,mag:200,reload:3,ammo:'fuel',range:400,burn:5,spread:0.22,auto:1,count:0,spd:0.85,noise:400,tier:4,proj:540,radius:0,fx:null,fuse:0,kind:'flame'},
  'THOR Microwave':{...CONE,range:750,arc:0.9,stun:2.5,emp:8,dmg:6,rof:0.6,spd:0.6,heavy:1,tier:5,noise:300},
  'ODIN Dazzler':{...CONE,range:950,arc:0.3,blind:3.5,stun:1.5,dmg:0,rof:1,tier:4,noise:50},
  'Drone Defender Jammer':{...CONE,range:950,arc:0.5,emp:10,dmg:0,rof:0.5,tier:4,noise:80},
  'Active Denial System':{...CONE,range:680,arc:0.6,knock:520,dmg:5,stun:1.2,rof:2,auto:1,spd:0.6,heavy:1,tier:5,noise:300},
  'Shmel-M':{mode:'projectile',proj:700,radius:230,dmg:270,fx:'thermo',rof:0.5,mag:1,reload:3,ammo:'rocket',count:0,kind:'rocket',vdmg:2,svd:4,tier:4,fuse:0},
};

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function h32(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const WEAPONS = {}, WLIST = [], BYCAT = {};
const NO_JITTER = new Set(['special', 'missile']);
for (const cat of Object.keys(CATS)) {
  BYCAT[cat] = [];
  for (const name of LIST[cat].split('|')) {
    let key = slug(name); if (WEAPONS[key]) key += '_' + cat;
    const w = Object.assign({}, CATS[cat]);
    if (!NO_JITTER.has(cat)) {
      const h = h32(name);
      const j = (n) => 0.9 + ((h >>> n) % 21) / 100;
      w.dmg = +(w.dmg * j(0)).toFixed(1); w.rof = +(w.rof * j(5)).toFixed(2);
      if (w.spread) w.spread = +(w.spread * j(10)).toFixed(4);
      if (w.range) w.range = Math.round(w.range * j(15));
    }
    Object.assign(w, OV[name] || {});
    w.key = key; w.name = name; w.cat = cat; w.i = WLIST.length;
    if (w.ammo === undefined) w.ammo = null;
    if (w.mode === 'melee' || w.mode === 'cone') { w.mag = 0; w.ammo = null; }
    if (w.count) { w.mag = 0; w.ammo = null; }
    WEAPONS[key] = w; WLIST.push(key); BYCAT[cat].push(key);
  }
}
const wkey = (name) => { const k = slug(name); if (!WEAPONS[k]) throw new Error('Unknown weapon ' + name); return k; };

module.exports = {WEAPONS, WLIST, BYCAT, AMMO, CATS, wkey, slug};
