// Ridge Runner — the ring courses: where the hoops hang, which one is
// next, and whether the plane just flew through it.

import { RINGS, WORLD } from './config.js';
import { makeRng } from './random.js';
import { terrainHeight } from './terrain.js';

// Build a course of n rings down the valley for a mission seed. Rings
// weave gently side to side and sit 55-120 m above the ground, so the
// pilot climbs and descends through the course instead of flying flat.
export function buildCourse(n, seed) {
  const rng = makeRng(seed);
  const rings = [];
  const spacing = (WORLD.courseLength - 600) / n;
  for (let i = 0; i < n; i++) {
    const z = 500 + i * spacing + rng() * 120;
    const x = (rng() * 2 - 1) * 130;
    const ground = Math.max(0, terrainHeight(x, z));
    rings.push({
      x,
      y: ground + 55 + rng() * 65,
      z,
      radius: RINGS.radius,
      passed: false,
      missed: false,
    });
  }
  return rings;
}

// The next ring the pilot should aim for: the first unpassed, unmissed
// ring ahead of the plane.
export function nextRing(rings, planeZ) {
  for (const r of rings) {
    if (!r.passed && !r.missed && r.z > planeZ - 10) return r;
  }
  return null;
}

// Check the plane against the next ring. Returns 'passed', 'missed' or
// null. A ring is passed when the plane crosses its z inside the hoop;
// missed when the plane flies 60 m past it without going through.
export function checkRing(rings, plane, prevZ) {
  const ring = nextRing(rings, prevZ);
  if (!ring) return null;
  if (prevZ < ring.z && plane.z >= ring.z) {
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    if (Math.hypot(dx, dy) <= ring.radius) {
      ring.passed = true;
      return 'passed';
    }
  }
  if (plane.z > ring.z + 60 && !ring.passed) {
    ring.missed = true;
    return 'missed';
  }
  return null;
}

export function ringsPassed(rings) {
  return rings.filter((r) => r.passed).length;
}
