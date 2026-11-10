# DEAD WORLD 🧟 — private multiplayer zombie survival

A top-down, browser-based multiplayer zombie game for you and your friends. Nobody can join without the **64-bit access key**.

- **Huge map**: 32,000 × 32,000 px (≈2.5 min to cross on foot), with 25 themed regions and **all 790 real-world places from your lists** built as landmarks: stadiums you can walk into, F1 circuits, golf courses, airports, police HQs, malls, parliaments, cathedrals, pyramids, forts, rice terraces, dams, mountains, canyons, volcanoes, glaciers, lakes, reefs, straits and more.
- **All 400 weapons** across 20 categories, each with its own behaviour: hitscan guns, shotguns, snipers with a scope, melee arcs, arrows, lobbed grenades, lock-on and wire-guided missiles, artillery strikes, MLRS barrages, naval CIWS, strategic missiles, flamethrowers, lasers, microwave/dazzler/jammer cones, mines, flashbangs, smoke, siege engines.
- **All 100 survival items**: medical (bleeding, fractures, infection), food and water, base building (barricades, doors, traps, rain catchers, generators), crafting (21 recipes), lights, electronics (GPS, motion detector, NVG, walkie-talkie team chat…), distractions and wearables.
- **23 vehicles**: cars, F1 cars, police cars with sirens, fire trucks with water cannons, ambulances that heal, buses, motorbikes, tanks, APCs, Humvees, HIMARS, helicopters, boats, jet skis, hovercraft. Each has fuel, damage and repairs.
- **18 zombie types** matched to regions (frozen in the mountains, dune lurkers in the desert, drowned in the water, mummies in the old world, riot/soldier zombies in the capital…), plus a Behemoth boss, and friends who die of infection come back as "Turned" zombies.
- **Sky events**: every phenomenon in your sky list is a dynamic weather event (blood moon hordes, tornadoes, lightning, dust storms, whiteouts, auroras). Your astronomy list sets "tonight's sky": black holes pull you in, pulsars EMP your vehicles, comets drop meteor craters with rare loot, planets trigger supply drops.
- **Modes** (anyone can switch from the Esc menu): Co-op vs zombies · Teams (up to 4) · Free-for-all, with a friendly-fire toggle, zombie density and day length.

## Deploy on Railway (about 5 minutes)

1. **Make your key**: `npm run genkey` prints a key like `9F2C-41AB-77E0-D3C5`. Or invent any 16 hex characters yourself.
2. **Push this folder to a GitHub repo** (private is fine).
3. In Railway: **New Project → Deploy from GitHub repo** → pick the repo. Railway detects Node and runs `npm start`.
4. Open the service → **Variables** → add `GAME_KEY` = your 16 hex characters (dashes are optional).
5. **Settings → Networking → Generate Domain**. Open the URL, type a name and the key, and play.
6. Send your friends the URL **and** the key. To lock someone out later, change `GAME_KEY` and Railway redeploys.

Optional variables:

| Variable | Default | What it does |
|---|---|---|
| `GAME_KEY` | random each start | The 64-bit access key (16 hex chars). **Set this**, or the key changes on every restart (it's printed in the deploy logs). |
| `MAP_SEED` | `42` | Different number = different world layout. 42 places all 790 landmarks. |
| `MAX_PLAYERS` | `16` | Server cap. |
| `DEBUG_CMDS` | off | Set to `1` to enable `/god`, `/give <item or weapon key>`, `/veh <vehicle>` and `/tp x y` chat commands (for testing). |

Run locally: `npm install`, then `GAME_KEY=0123456789abcdef npm start`, then open http://localhost:3000.

## How to play

| Key | Action |
|---|---|
| WASD | move / drive (W/S throttle, A/D steer) |
| Mouse · LMB | aim · fire (vehicle main gun when driving an armed vehicle) |
| RMB | sniper scope / vehicle secondary gun |
| Shift | sprint / vehicle boost |
| 1-5 · wheel | switch weapon · R reload · G drop weapon |
| E | pick up · enter/exit vehicle · open doors · drink from rivers/collectors · open vaults |
| I · C | inventory (click to use/equip/place, right-click to drop) · crafting |
| M | world map (click to set a waypoint) |
| F · V | quick heal · quick eat/drink |
| L · N | flashlight/lantern · night vision |
| H · X | horn/siren · switch seat |
| Enter | chat (`/t msg` = team chat, needs a walkie-talkie; `/time night` etc.) |
| Tab · Esc | scoreboard · menu (mode, friendly fire, density, day length, teams, volume) |

Survival tips: bites can infect you. Antibiotics cure it, Antizyme pauses it, and if it reaches 100% you turn into a zombie. Bleeding needs bandages and fractures need a splint. Drinking from rivers is risky unless you carry purification tablets, a filter straw or a cooking pot. Police HQs and forts have guns. Locked vaults in banks, parliaments and pyramids need a Keycard and hold heavy weapons. Nights are dark and faster, so bring a light.

## Files

```
server/index.js        HTTP + WebSocket server, 64-bit key auth, rate limiting
server/game.js         Simulation: players, zombies, vehicles, weapons, items, sky events
server/map.js          World generator (regions, terrain, landmarks, roads, loot, vehicle spawns)
server/data/*.js       Places, weapons, items, vehicles, zombies, sky/space events, loot tables
public/                Browser client (canvas renderer, HUD, inventory, map, audio)
tools/genkey.js        Key generator
```

Notes: the world lives in server memory, so a redeploy or restart resets it (loot, structures, vehicles). The vehicle and zombie rosters were designed for this game because those lists weren't attached. Edit `server/data/vehicles.js` and `server/data/zombies.js` to change them.
