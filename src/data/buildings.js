// Buildings. All numbers are default values from the spec and may be tuned.
// unlockAfter = wave after which the building becomes available (0 = from start).
// implemented = false means the building exists in the design but is not in this version yet.
// limit = how many may stand at once, as steps by completed waves.

export const LEVEL_POWER = 2.2;        // each level multiplies power
export const RANGE_PER_LEVEL = 0.25;   // range bonus per level above 1

// Max building level available after a given wave.
export const MAX_LEVEL_STEPS = [
  { after: 0, max: 2 },
  { after: 30, max: 3 },
  { after: 80, max: 4 },
];

export const BUILDINGS = {
  wall: {
    cost: 10, unlockAfter: 0, implemented: true,
    blocks: true, mergeable: false,
  },
  archer: {
    cost: 50, unlockAfter: 0, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 10, rate: 1.0, range: 3.0, ground: true, air: true,
    dtype: 'strela', attack: 'arrow', projSpeed: 12,
  },
  cannon: {
    cost: 80, unlockAfter: 0, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 25, rate: 0.4, range: 2.5, ground: true, air: false,
    dtype: 'vybuch', attack: 'shell', splash: 1.0, flightTime: 0.6,
  },
  mine: {
    cost: 60, costStep: 15, unlockAfter: 0, implemented: true,
    blocks: true, mergeable: true,
    yield: [0, 5, 12, 28, 60],
  },
  frost: {
    cost: 70, unlockAfter: 2, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 2, rate: 1.0, range: 2.0, ground: true, air: true,
    dtype: 'mraz', attack: 'pulse',
    slow: [0, 0.40, 0.50, 0.52, 0.56],
    slowDur: [0, 2.0, 2.6, 3.2, 3.8],
  },
  lightning: {
    cost: 100, unlockAfter: 10, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 14, rate: 0.7, range: 2.5, ground: true, air: true,
    dtype: 'blesk', attack: 'chain', targets: 3, falloff: 0.3, jump: 1.75, reveal: 1.5,
  },
  amplifier: {
    cost: 120, unlockAfter: 15, implemented: true,
    blocks: true, mergeable: false, boost: 0.25,
    limit: [{ after: 0, max: 2 }, { after: 50, max: 3 }, { after: 80, max: 4 }],
  },
  trap: {
    cost: 40, unlockAfter: 20, implemented: true,
    blocks: false, mergeable: true, onPath: true,
    dmg: 60, hits: 5, recharge: 8, dtype: 'vybuch',
    limit: [{ after: 0, max: 6 }],
  },
  teleport: {
    cost: 150, unlockAfter: 40, implemented: true,
    blocks: false, mergeable: false, onPath: true,
    every: 10, count: 3, back: 8, perEnemy: 2,   // perEnemy = how many times one enemy can be sent back (slow ones would loop for ever)
    limit: [{ after: 0, max: 1 }, { after: 70, max: 2 }],
  },
  bank: {
    cost: 200, unlockAfter: 50, implemented: true, blocks: true, mergeable: false,
    rate: 0.07, capMul: 2, steal: 5,
    limit: [{ after: 0, max: 1 }],
  },

  // Hybrids: two towers of different kinds and the same level (2+) make one hybrid of that level (after wave 60).
  // They are never built directly; numbers are for level 1 and grow like any tower.
  mortar: {
    hybrid: ['archer', 'cannon'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 46, rate: 0.45, range: 4.5, ground: true, air: false,
    dtype: 'vybuch', attack: 'shell', splash: 1.15, flightTime: 1.1,
  },
  icebow: {
    hybrid: ['archer', 'frost'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 18, rate: 1.2, range: 3.5, ground: true, air: true,
    dtype: 'strela', attack: 'arrow', projSpeed: 13, chill: { slow: 0.4, dur: 2, mark: 3, markMul: 1.25 },
  },
  gauss: {
    hybrid: ['archer', 'lightning'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 52, rate: 0.5, range: 4.5, ground: true, air: true,
    dtype: 'strela', attack: 'rail', width: 0.4,
  },
  snowcannon: {
    hybrid: ['cannon', 'frost'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 40, rate: 0.42, range: 3.0, ground: true, air: false,
    dtype: 'vybuch', attack: 'shell', splash: 1.1, flightTime: 0.6, freeze: 1,
  },
  stormcannon: {
    hybrid: ['cannon', 'lightning'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 42, rate: 0.42, range: 3.0, ground: true, air: false,
    dtype: 'vybuch', attack: 'shell', splash: 1.0, flightTime: 0.6, storm: { targets: 3, share: 0.6, jump: 2.2 },
  },
  aurora: {
    hybrid: ['frost', 'lightning'], cost: 0, unlockAfter: 60, implemented: true,
    blocks: true, mergeable: true, tower: true,
    dmg: 9, rate: 2, range: 2.5, ground: true, air: true,
    dtype: 'mraz', attack: 'pulse', reveal: true,
    slow: [0, 0.3, 0.35, 0.4, 0.45], slowDur: [0, 0.8, 0.9, 1.0, 1.1],
  },
};

export const HYBRID_TYPES = ['mortar', 'icebow', 'gauss', 'snowcannon', 'stormcannon', 'aurora'];
export const HYBRID_AFTER = 60;
// Which hybrid comes out of two different tower kinds (or null).
export function hybridOf(a, b) {
  for (const t of HYBRID_TYPES) {
    const [p, q] = BUILDINGS[t].hybrid;
    if ((a === p && b === q) || (a === q && b === p)) return t;
  }
  return null;
}

// Specialisations at level 3 (chosen when merging to level 3, kept for good).
export const SPECS = {
  archer: {
    A: { id: 'sniper', range: 2, dmg: 2.5, rate: 0.5, mode: 'strong' },
    B: { id: 'gatling', rate: 3, dmg: 0.5, shred: 1 },
  },
  cannon: {
    A: { id: 'shrapnel', splash: 1.6 },
    B: { id: 'incendiary', burn: 3, burnShare: 0.35 },
  },
  frost: {
    A: { id: 'deepfrost', slow: 0.6, freezeChance: 0.1, freeze: 1 },
    B: { id: 'brittle', brittle: 0.3 },
  },
  lightning: {
    A: { id: 'chain', targets: 7 },
    B: { id: 'overload', dmg: 3, targets: 1, stunMachines: 0.5 },
  },
};

// Wrecked buildings: repaired by Knot (standing next to them) or all at once in the build phase.
export const WRECK = { repairShare: 0.25, sellShare: 0.5, knotTime: 3, knotRange: 1.5 };

// Order in the build bar.
export const BUILD_ORDER = ['wall', 'archer', 'cannon', 'frost', 'mine', 'lightning', 'amplifier', 'trap', 'teleport', 'bank'];

export const TARGET_MODES = ['first', 'last', 'strong', 'weak'];

// Terrain bonuses.
export const TERRAIN = {
  plateauRange: 1,     // +1 range on plateau
  crystalDmg: 1.5,     // +50 % damage on crystal
  oreMine: 2,          // mine yield x2 on ore
  beaconRate: 1.5,     // towers next to the beacon fire 50 % faster
  mudEnemy: 0.7,       // enemies 30 % slower in mud
  mudHero: 0.5,        // hero 50 % slower in mud
};
