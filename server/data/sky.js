'use strict';
// Sky phenomena (your atmospheric list) become dynamic weather events; the astronomical list becomes
// a "sky object of the night" with its own gameplay effect.
const SKY = [];
const add = (cat, when, names, f) => names.split('|').forEach(n => { const r = f(n); SKY.push({n, cat, when: r.when || when, fx: r.fx, w: r.w || 1}); });

add('Aurora','night','Aurora Borealis|Aurora Australis|STEVE|Stable Auroral Red Arcs|Pulsating Aurora|Coronal Aurora|Proton Aurora|Polar Cap Aurora|Black Aurora|Geomagnetic Storm Glow', () => ({fx:'aurora'}));
add('Ice Halo','day','22° Solar Halo|Sun Dogs|Sun Pillars|Circumhorizontal Arc|Circumzenithal Arc|Lunar Halo|Moon Dogs|Parhelic Circle|Subsun|Tangent Arcs', n => /Lunar|Moon/.test(n) ? {fx:'halo',when:'night'} : {fx:'halo'});
add('Rare Clouds','any','Noctilucent Clouds|Nacreous Clouds|Mammatus Clouds|Lenticular Clouds|Undulatus Asperitas|Kelvin-Helmholtz Waves|Shelf Cloud|Roll Cloud|Morning Glory Cloud|Pyrocumulonimbus', n => n === 'Pyrocumulonimbus' ? {fx:'ash'} : /Noctilucent|Nacreous/.test(n) ? {fx:'clouds',when:'night'} : {fx:'clouds'});
add('Twilight','any','Belt of Venus|Crepuscular Rays|Anticrepuscular Rays|Alpenglow|Green Flash|Golden Hour|Blue Hour|Volcanic Afterglow|Rayleigh Blue Sky|Airglow', n => n === 'Airglow' ? {fx:'brightnight',when:'night'} : n === 'Rayleigh Blue Sky' ? {fx:'tint',when:'day'} : {fx:'tint'});
add('Celestial Event','night','Total Solar Eclipse|Blood Moon|Perseid Meteor Shower|Geminid Fireballs|Comet Tail|Zodiacal Light|Gegenschein|Naked-Eye Supernova|Milky Way Core|Planetary Conjunction', n =>
  n === 'Total Solar Eclipse' ? {fx:'eclipse',when:'day',w:0.6} : n === 'Blood Moon' ? {fx:'bloodmoon',w:0.9} : /Perseid|Geminid/.test(n) ? {fx:'meteors'} : /Supernova|Milky|Zodiacal/.test(n) ? {fx:'brightnight'} : {fx:'nebula'});
add('Lightning','any','Cloud-to-Ground Lightning|Sheet Lightning|Anvil Crawlers|Red Sprites|Blue Jets|ELVES|St. Elmo\'s Fire|Volcanic Lightning|Ball Lightning|Dry Lightning', () => ({fx:'lightning'}));
add('Rainbow','day','Primary Rainbow|Secondary Rainbow|Supernumerary Rainbows|Fogbow|Moonbow|Red Rainbow|Cloud Iridescence|Dewbow|Horizontal Rainbow|Glory', n => n === 'Moonbow' ? {fx:'rainbow',when:'night'} : {fx:'rainbow'});
add('Dust Sky','any','Haboob|Saharan Dust Layer|Calima|Blood Rain|Smoke Plume Deck|Harmattan Haze|Dust Devils|Volcanic Ash Haze|Photochemical Smog|Vog', n => /Ash|Smog|Vog|Smoke/.test(n) ? {fx:'ash'} : {fx:'dust'});
add('Severe Storm','any','Green Storm Sky|Wall Cloud|Tornado|Waterspout|Landspout|Overshooting Top|Mammatus Anvil|Dust Whirl|Derecho|Hurricane Eye', n => n === 'Green Storm Sky' ? {fx:'hail'} : /Tornado|Waterspout|Landspout|Dust Whirl/.test(n) ? {fx:'tornado',w:0.7} : {fx:'storm'});
add('Polar Sky','any','Light Pillars|Ice Blink|Water Sky|Diamond Dust|46° Halo Complex|Subparhelia|Midnight Sun|Polar Night|Whiteout|Novaya Zemlya Mirage', n =>
  n === 'Midnight Sun' ? {fx:'midnightsun',when:'night',w:0.5} : n === 'Polar Night' ? {fx:'polarnight',when:'day',w:0.5} : n === 'Whiteout' ? {fx:'whiteout'} : {fx:'diamond'});

const COSMIC = [];
const addC = (cat, fx, names) => names.split('|').forEach(n => COSMIC.push({n, cat, fx}));
addC('Planet','supply','Jupiter|Saturn|Earth|Mars|Venus|Neptune|Uranus|Proxima Centauri b|WASP-76b|TRAPPIST-1e');
addC('Star','brightnight','The Sun|Betelgeuse|Sirius A|Rigel|Proxima Centauri|VY Canis Majoris|R136a1|Stephenson 2-18|Vega|Polaris');
addC('Nebula','nebula','Orion Nebula|Eagle Nebula|Crab Nebula|Carina Nebula|Ring Nebula|Horsehead Nebula|Tarantula Nebula|Helix Nebula|Veil Nebula|Cat\'s Eye Nebula');
addC('Galaxy','galaxy','Milky Way|Andromeda Galaxy|Triangulum Galaxy|Large Magellanic Cloud|Sombrero Galaxy|Whirlpool Galaxy|Centaurus A|Messier 87|Hoag\'s Object|Small Magellanic Cloud');
addC('Black Hole','blackhole','Sagittarius A*|M87*|Cygnus X-1|TON 618|Phoenix A|Gaia BH1|V404 Cygni|GW150914|GRO J1655-40|MAXI J1820+070');
addC('Neutron Star','emp','Crab Pulsar|Vela Pulsar|SGR 1806-20|PSR B1919+21|PSR B1257+12|RX J1856.5-3754|GW170817|PSR J0740+6620|1E 1048.1-5937|PSR J1748-2446ad');
addC('Moon','moonlit','The Moon|Titan|Europa|Ganymede|Io|Enceladus|Triton|Callisto|Phobos|Charon');
addC('Comet / Asteroid','meteor','Halley\'s Comet|Ceres|67P/Churyumov–Gerasimenko|4 Vesta|16 Psyche|101955 Bennu|433 Eros|Comet NEOWISE|Comet Hale-Bopp|4179 Toutatis');
addC('Dwarf Planet','cold','Pluto|Eris|Haumea|Makemake|Sedna|Quaoar|Orcus|Gonggong|Salacia|Varuna');
addC('Cosmic Structure','cosmicray','3C 273 Quasar|GRB 221009A "The BOAT"|Herbig-Haro 46/47|The Cosmic Web|Hercules–Corona Borealis Great Wall|Fermi Bubbles|Einstein Ring|Virgo Supercluster|Laniakea Supercluster|Markarian 421 Blazar');

const FXD = {
  aurora:'Auroras light up the night — better visibility.',
  halo:'A halo rings the sky.',
  clouds:'Strange clouds drift overhead.',
  ash:'Ash and smog fall — toxic outdoors without a gas mask!',
  tint:'The light turns strange.',
  eclipse:'TOTAL ECLIPSE — darkness at noon, zombies frenzy!',
  bloodmoon:'BLOOD MOON — hordes swell and run faster!',
  meteors:'Meteors are falling — impact craters hold rare loot.',
  brightnight:'A bright sky illuminates the night.',
  nebula:'A glowing nebula colours the night sky.',
  galaxy:'The galaxy arcs overhead.',
  lightning:'Lightning storm — stay off open ground!',
  rainbow:'Morale boost — stamina regenerates faster.',
  dust:'Dust storm — visibility collapses, zombies can\'t see far either.',
  storm:'Heavy storm — rain fills water collectors faster.',
  tornado:'A VORTEX is tearing across the land!',
  hail:'Hailstorm — wear a helmet or get inside a vehicle!',
  whiteout:'WHITEOUT — near-zero visibility.',
  midnightsun:'The sun refuses to set.',
  polarnight:'Unnatural darkness swallows the day.',
  diamond:'Ice crystals sparkle in the air.',
  supply:'Planetary alignment — a supply drop is inbound!',
  blackhole:'GRAVITATIONAL ANOMALY — everything is being pulled in!',
  emp:'PULSAR EMP — vehicles and electronics are disabled!',
  moonlit:'A huge moon lights the land.',
  meteor:'An impact event is incoming!',
  cold:'Bitter cold — stamina recovers slowly.',
  cosmicray:'Cosmic rays — radios crackle.',
};
module.exports = {SKY, COSMIC, FXD};
