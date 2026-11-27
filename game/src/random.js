// Ridge Runner — a small seeded random source and 1D value noise.
// The terrain, the clouds and the ring courses all draw from here, so the
// same seed always builds the same valley: screenshots are reproducible,
// and a run never changes under the pilot.

// mulberry32: a tiny deterministic generator with a good spread.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise: random heights at fixed knots, blended with a
// cosine curve so ridges roll instead of stepping.
export function makeNoise1D(seed, knotSpacing, amplitude) {
  const rng = makeRng(seed);
  const knots = new Map();
  function knot(i) {
    if (!knots.has(i)) knots.set(i, rng() * 2 - 1);
    return knots.get(i);
  }
  return function noise(x) {
    const t = x / knotSpacing;
    const i = Math.floor(t);
    const f = t - i;
    const blend = (1 - Math.cos(f * Math.PI)) / 2;
    return (knot(i) * (1 - blend) + knot(i + 1) * blend) * amplitude;
  };
}

// A deterministic pick from an array, by index: no Math.random anywhere
// in the game, so replays and screenshots never drift.
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}
