// Ridge Runner — the game loop and the state machine: title, flying,
// paused, crashed and complete. Missions, scoring, wind and the finish
// line all live here; the flight model lives in plane.js, the drawing in
// render.js.

import { MISSIONS, PLANE, RINGS, WORLD } from './config.js';
import { newPlane, updatePlane } from './plane.js';
import { buildCourse, checkRing, ringsPassed } from './rings.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const game = {
  state: 'title', // title | flying | paused | crashed | complete
  missions: MISSIONS,
  missionIndex: 0,
  mission: MISSIONS[0],
  plane: newPlane(),
  rings: [],
  score: 0,
  elapsed: 0,
  time: 0,
  windNow: 0,
  windDir: 1,
  missionRects: [],
  get ringsPassed() {
    return ringsPassed(this.rings);
  },
};

function startMission(index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.plane = newPlane();
  // Each mission flies its own course: same valley, different seed.
  game.rings = buildCourse(game.mission.rings, 1000 + index * 137);
  game.score = 0;
  game.elapsed = 0;
  game.windNow = 0;
  game.windDir = 1;
  game.state = 'flying';
  audio.unlock();
}

function finishFlight(won) {
  if (game.state !== 'flying') return;
  if (won) {
    // Time bonus for beating par, plus a point for every unit of fuel left.
    const timeBonus = Math.max(0, Math.round((game.mission.parSeconds - game.elapsed) * RINGS.scorePerSecondLeft));
    const fuelBonus = Math.round(game.plane.fuel);
    game.score += timeBonus + fuelBonus;
    game.state = 'complete';
    audio.land();
  } else {
    game.state = 'crashed';
    audio.crash();
  }
}

function update(dt) {
  const p = game.plane;
  if (game.state !== 'flying') return;
  game.elapsed += dt;

  // Storm Courier gusts: the wind swings side to side, changing strength.
  if (game.mission.wind > 0) {
    game.windNow = game.mission.wind * Math.sin(game.elapsed * 0.45) * (0.6 + 0.4 * Math.sin(game.elapsed * 1.7));
    game.windDir = game.windNow >= 0 ? 1 : -1;
  } else {
    game.windNow = 0;
  }

  const prevZ = p.z;
  updatePlane(p, input, game.windNow, dt);

  const ringEvent = checkRing(game.rings, p, prevZ);
  if (ringEvent === 'passed') {
    game.score += RINGS.scorePerRing;
    p.fuel = Math.min(100, p.fuel + PLANE.ringFuelBonus);
    audio.ring();
  }

  if (p.crashed) {
    finishFlight(false);
    return;
  }
  if (p.landed) {
    // Valley Dash wants the far runway; the other sorties accept any
    // runway landing as a flight completed, rings and all.
    if (game.mission.id === 'valley-dash' && p.z < WORLD.farRunwayZ - 500) {
      p.crashed = 'Landed back at the start runway';
      finishFlight(false);
    } else {
      finishFlight(true);
    }
    return;
  }

  // The finish line: crossing it ends a ring or courier sortie.
  if (game.mission.id !== 'valley-dash' && p.z >= WORLD.courseLength) {
    finishFlight(true);
    return;
  }
  // Valley Dash also ends at the far runway's far end if the pilot flies past it.
  if (game.mission.id === 'valley-dash' && p.z >= WORLD.farRunwayZ + 400) {
    p.crashed = 'Overshot the far runway';
    finishFlight(false);
  }
}

function handleMenus(events) {
  if (events.m) {
    const muted = audio.toggleMute();
    void muted;
  }
  if (game.state === 'title') {
    if (events.enter) {
      startMission(game.missionIndex);
      return;
    }
    if (events.click) {
      const hit = game.missionRects.find(
        (r) => events.click.x >= r.x && events.click.x <= r.x + r.w && events.click.y >= r.y && events.click.y <= r.y + r.h,
      );
      if (hit) {
        if (game.missionIndex === hit.index) startMission(hit.index);
        else game.missionIndex = hit.index;
      }
      return;
    }
    if (input.turnLeft && game.time - lastNav > 0.25) {
      game.missionIndex = (game.missionIndex + 2) % 3;
      lastNav = game.time;
    }
    if (input.turnRight && game.time - lastNav > 0.25) {
      game.missionIndex = (game.missionIndex + 1) % 3;
      lastNav = game.time;
    }
    return;
  }
  if (game.state === 'flying') {
    if (events.p) game.state = 'paused';
    return;
  }
  if (game.state === 'paused') {
    if (events.p || events.click) game.state = 'flying';
    return;
  }
  if (game.state === 'crashed' || game.state === 'complete') {
    if (events.enter) startMission(game.missionIndex);
    if (events.click) game.state = 'title';
  }
}

let last = performance.now();
let lastNav = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  const events = input.consume();
  handleMenus(events);
  update(dt);
  render(ctx, game, game.time);
  requestAnimationFrame(frame);
}

// A screenshot preset (?shot=title|fly|ring|landed) puts the game into a
// fixed, deterministic state for its maker to capture; the game itself
// runs the same code either way.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  applyShot(game, shot, startMission);
} else {
  game.state = 'title';
}
requestAnimationFrame(frame);
