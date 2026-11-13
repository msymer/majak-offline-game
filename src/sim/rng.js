// Seeded random generator (mulberry32). The state lives inside the game state,
// so a saved game continues with exactly the same random numbers.

export function makeRng(seed) {
  return { s: (seed >>> 0) || 1 };
}

export function rnd(r) {
  let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rndInt(r, n) {
  return Math.floor(rnd(r) * n);
}
