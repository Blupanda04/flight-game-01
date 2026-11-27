// Ridge Runner — screenshot presets. A ?shot= value in the page URL
// puts the game into one fixed, deterministic state so its maker can
// capture it: the title screen, mid-flight with a ring ahead, the moment
// of flying through a ring, and a landing on the far runway. These are
// the game's own states, reached through the same startMission and flight
// code a pilot uses; nothing here draws anything the game cannot do.

import { WORLD } from './config.js';
import { nextRing } from './rings.js';

// Place the next ring dead ahead of the plane, at a chosen distance.
function aimAtNextRing(game, distanceAhead) {
  const ring = nextRing(game.rings, game.plane.z);
  if (!ring) return;
  ring.x = game.plane.x + 8;
  ring.y = game.plane.y + 4;
  ring.z = game.plane.z + distanceAhead;
}

export function applyShot(game, shot, startMission) {
  if (shot === 'title') {
    game.state = 'title';
    game.missionIndex = 0;
    return;
  }
  if (shot === 'fly') {
    startMission(0);
    game.plane.z = 1400;
    game.plane.y = 150;
    game.plane.x = 0;
    game.plane.speed = 62;
    game.plane.throttle = 60;
    game.plane.heading = 0;
    aimAtNextRing(game, 320);
    return;
  }
  if (shot === 'ring') {
    // Storm Courier at dusk: the same ring moment, in the third mission's
    // light, so the set shows more than one sky.
    startMission(2);
    game.plane.z = 900;
    game.plane.y = 140;
    game.plane.x = 0;
    game.plane.speed = 66;
    game.plane.throttle = 68;
    aimAtNextRing(game, 55);
    return;
  }
  if (shot === 'landed') {
    startMission(1);
    game.plane.z = WORLD.farRunwayZ;
    game.plane.y = 0;
    game.plane.x = 0;
    game.plane.speed = 30;
    game.plane.throttle = 20;
    game.plane.landed = true;
    game.rings.forEach((r) => {
      if (r.z < game.plane.z) r.passed = true;
    });
    game.score = 480;
    game.elapsed = 108;
    game.state = 'complete';
    return;
  }
  game.state = 'title';
}
