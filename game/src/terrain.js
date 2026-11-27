// Ridge Runner — the valley itself: its height at any point, the river,
// the roads, the fields, and the two runways. Everything the plane can
// hit or land on comes from this file.

import { WORLD } from './config.js';
import { makeNoise1D } from './random.js';

// Two noise fields: one rolling along the valley, one rippling across it.
const alongNoise = makeNoise1D(101, 420, 18);
const acrossNoise = makeNoise1D(202, 160, 9);
const wallNoise = makeNoise1D(303, 240, WORLD.wallRoughness);

// The ground height in metres at lateral x and forward z.
// The floor is gentle near the centre line and climbs steeply into walls
// past the valley half-width; the river carves a shallow channel.
export function terrainHeight(x, z) {
  const ax = Math.abs(x);
  const floor = alongNoise(z) * 0.6 + acrossNoise(x) * 0.5;
  if (ax <= WORLD.valleyHalfWidth) return floor;
  const beyond = ax - WORLD.valleyHalfWidth;
  return floor + beyond * WORLD.wallSlope + wallNoise(z + x * 0.7);
}

// The river wanders down the valley floor: its centre x at forward z.
export function riverX(z) {
  return Math.sin(z * 0.0011) * 90 + Math.sin(z * 0.00043 + 2.1) * 46;
}

// A road follows the east wall: its centre x at forward z.
export function roadX(z) {
  return 190 + Math.sin(z * 0.0009 + 0.6) * 34;
}

// Field patchwork on the valley floor: for a strip of ground, which of
// three close greens it is, from a hash of its strip index. Deterministic.
// The shades stay close to the base ground colour so the floor reads as
// fields, not boards.
export function fieldShade(stripIndex) {
  let h = (stripIndex * 2654435761) >>> 0;
  h ^= h >>> 13;
  return h % 3;
}

// The start runway: a flat strip on the valley floor at z = 0.
export const START_RUNWAY = { z: -40, length: 260, width: WORLD.runwayWidth };
// The destination runway for the Valley Dash, far down the valley.
export const FAR_RUNWAY = { z: WORLD.farRunwayZ, length: 300, width: WORLD.runwayWidth };

// Is the point (x, z) on a runway strip, and which one?
export function runwayAt(x, z) {
  for (const r of [START_RUNWAY, FAR_RUNWAY]) {
    if (Math.abs(x) <= r.width / 2 && z >= r.z - r.length / 2 && z <= r.z + r.length / 2) {
      return r;
    }
  }
  return null;
}

// Height of the ground directly under the plane, including the flat
// runway strips (runways are graded flat at y = 0).
export function groundUnder(x, z) {
  return runwayAt(x, z) ? 0 : terrainHeight(x, z);
}
