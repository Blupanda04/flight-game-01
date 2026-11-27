# Ridge Runner — a flight game over the valley

[![make.fun](https://img.shields.io/badge/make.fun-bounty-7c5cff)](https://make.fun/c/best-flight-game-20261126-0057)
[![referral](https://img.shields.io/badge/make.fun-referral-dh0myx29-blue)](https://make.fun/r/dh0myx29)
[![Blupanda04](https://img.shields.io/badge/github-Blupanda04-181717?logo=github)](https://github.com/Blupanda04/flight-game-01)

A complete flight game that runs in a desktop browser from its own files — no library, no network. Chase view over a procedural valley: climb, bank, thread the rings, mind the fuel, and bring her home.

## How to play

Serve the folder and open it:

```
node serve.ts
# then open http://localhost:8080
```

- **W / ↑** climb · **S / ↓** descend · **A D / ← →** turn
- **E / Q** or **Shift / Ctrl** throttle · **P** pause · **M** mute
- Click a mission card on the title screen, or press **Enter** to fly the selected one.

## Three sorties

| Mission | Goal |
| --- | --- |
| **Ring Run** | Thread all 8 rings down the valley. Each ring pays 100 points and 6 fuel. |
| **Valley Dash** | A 6 km dash to the far runway — land on it before the fuel runs out. |
| **Storm Courier** | 6 rings in gusty dusk. The wind shoves you sideways: small corrections, steady hands. |

## What the pilot watches

Altitude and speed (feet and knots, as pilots read them), a compass tape with heading, an attitude gauge that rolls with the bank, fuel and throttle bars, and the next ring's distance. Fly too low and the ground says so: **PULL UP**. Run the tank dry and the wing stops flying.

## How it is built

- `game/src/config.js` — every tuning number and mission definition
- `game/src/random.js` — seeded random source and 1D noise, so the valley never reshuffles
- `game/src/terrain.js` — valley height, river, road, fields, the two runways
- `game/src/plane.js` — the flight model: pitch, throttle, bank, stall, fuel, landing
- `game/src/rings.js` — ring courses and pass/miss checks
- `game/src/render.js` — sky, valley, rings, aircraft, instruments, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — small Web Audio sounds, no audio files
- `game/src/main.js` — the loop, the state machine, missions, scoring, wind
- `game/src/shots.js` — deterministic screenshot presets (`?shot=title|fly|ring|landed`)

`main.ts` hands the game in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

## License

MIT — see `LICENSE`.
