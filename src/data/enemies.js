// Enemies. hp is the base for wave 1; real hp = hp * H(w) * difficulty.
// light = light points taken when the enemy reaches the lighthouse.
// size: tiny 1, normal 5, big 10, miniboss 25, boss 60.
//
// Special abilities (all optional):
//   armor      armour = 4 + 0.2 w, taken off every hit (lightning ignores it)
//   fly        flies straight to the lighthouse, ignores the maze
//   machine    a machine (lightning overload stuns it)
//   steal      gold taken from every mine next to its path; returns double when killed
//   heal       heals the others around it: { r, pct } = radius and share of max life per second
//   noSlow     cannot be slowed (frost, mud, spells)
//   mudFree    mud does not slow it
//   demolish   wrecks walls / weak buildings next to its path: { level, time, max }
//   invisible  towers do not see it until something reveals it
//   front      share of damage it takes from the front (the rest only from behind)
//   brood      lays little ones on the way: { every, count, type }
//   reinforce  calls a small group from another entry: { every, entry, list }
//   ram        walks a straight line to the lighthouse and wrecks what stands in it; breakRock = also rock
//   relocate   jumps to another entry after losing these shares of life
//   split      falls apart into smaller pieces (wave 10 boss)

export const HP_GROWTH = 1.055;            // H(w) = HP_GROWTH^(w-1)
export const GOLD_GROWTH = 0.02;           // gold = base * (1 + 0.02 w)
export const ARMOR_BASE = 4;               // armor = 4 + 0.2 w (only for armored enemies)
export const ARMOR_PER_WAVE = 0.2;

// Extra life multiplier per chapter (tuning knob, see ROZHODNUTI.md). Index = chapter.
export const CHAPTER_HP = [1, 1, 1.6, 2.0, 2.4, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8];

export const LIGHT_BY_SIZE = { none: 0, tiny: 1, normal: 5, big: 10, miniboss: 25, boss: 60 };

export const ENEMIES = {
  sliz: { hp: 30, speed: 1.0, gold: 4, size: 'normal', from: 1 },
  smejdil: { hp: 16, speed: 2.0, gold: 4, size: 'normal', from: 3 },
  tlustoch: { hp: 200, speed: 0.6, gold: 14, size: 'big', from: 8 },

  // Boss of wave 10 and its fragments. Fragment hp is a fraction of the boss max hp.
  velky_sliz: {
    hp: 900, speed: 0.45, gold: 60, size: 'boss', boss: true, from: 10,
    split: { into: 'stredni_sliz', count: 2, hpFrac: 0.35 },
    heroDps: 12,
  },
  stredni_sliz: {
    hp: 0, speed: 0.6, gold: 16, size: 'big', bossPart: true, from: 10,
    split: { into: 'maly_sliz', count: 2, hpFrac: 0.12 },
    heroDps: 8,
  },
  maly_sliz: { hp: 0, speed: 0.8, gold: 8, size: 'normal', bossPart: true, from: 10, heroDps: 5 },

  // Chapter 2
  plechac: { hp: 70, speed: 0.8, gold: 9, size: 'normal', from: 11, armor: true, machine: true },
  dron: { hp: 28, speed: 1.5, gold: 7, size: 'normal', from: 13, fly: true, machine: true },
  sberac: { hp: 40, speed: 1.4, gold: 6, size: 'normal', from: 15, steal: 10, machine: true },
  maly_valec: { hp: 270, speed: 0.45, gold: 30, size: 'miniboss', from: 19, front: 0.2, machine: true, mini: true, heroDps: 8 },
  valec: { hp: 1800, speed: 0.36, gold: 80, size: 'boss', boss: true, from: 20, front: 0.2, machine: true, heroDps: 14 },

  // Chapter 3
  felcar: { hp: 60, speed: 0.9, gold: 12, size: 'normal', from: 23, heal: { r: 1.5, pct: 0.06 } },
  pulec: { hp: 12, speed: 1.3, gold: 1, size: 'tiny', from: 25, mudFree: true },
  bahnak: { hp: 90, speed: 1.0, gold: 9, size: 'normal', from: 26, noSlow: true },
  bahenni_dcera: { hp: 330, speed: 0.5, gold: 30, size: 'miniboss', from: 29, brood: { every: 8, count: 2, type: 'pulec' }, mini: true, heroDps: 8 },
  bahenni_matka: {
    hp: 2200, speed: 0.4, gold: 90, size: 'boss', boss: true, from: 30, heroDps: 14,
    brood: { every: 8, count: 4, type: 'pulec' },
    reinforce: { every: 20, entry: 'S', list: [['sliz', 3], ['plechac', 1]] },
  },

  // Chapter 4
  bourac: { hp: 150, speed: 0.7, gold: 14, size: 'big', from: 32, demolish: { level: 1, time: 2, max: 2 }, machine: true },
  demolicni_koule: { hp: 230, speed: 0.6, gold: 22, size: 'big', from: 38, demolish: { level: 2, time: 2, max: 2 }, machine: true },
  beranek: { hp: 390, speed: 0.7, gold: 30, size: 'miniboss', from: 39, ram: { breakRock: false }, machine: true, mini: true, heroDps: 10 },
  beranidlo: { hp: 2600, speed: 0.42, gold: 100, size: 'boss', boss: true, from: 40, ram: { breakRock: true }, machine: true, heroDps: 16 },

  // Chapter 5
  mlzak: { hp: 50, speed: 1.1, gold: 10, size: 'normal', from: 42, invisible: true },
  straznik: { hp: 450, speed: 0.6, gold: 35, size: 'miniboss', from: 49, relocate: [0.5], mini: true, heroDps: 10 },
  strazce_brany: { hp: 3000, speed: 0.45, gold: 110, size: 'boss', boss: true, from: 50, relocate: [0.75, 0.5, 0.25], heroDps: 16 },

  // Chapter 6
  rojik: { hp: 6, speed: 1.6, gold: 1, size: 'tiny', from: 51 },
  nosic: { hp: 260, speed: 0.7, gold: 16, size: 'big', from: 53, burst: { type: 'rojik', count: 12 } },
  vejce: { hp: 40, speed: 0, gold: 2, size: 'none', from: 59, egg: { hatch: 7, type: 'rojik', count: 6 } },
  princezna: { hp: 480, speed: 0.5, gold: 35, size: 'miniboss', from: 59, mini: true, brood: { every: 5, count: 1, type: 'vejce' }, heroDps: 10 },
  kralovna_roje: { hp: 3200, speed: 0.36, gold: 120, size: 'boss', boss: true, from: 60, heroDps: 16, brood: { every: 3, count: 6, type: 'rojik', fastBelow: 0.3 } },

  // Chapter 7
  rusicka: { hp: 110, speed: 0.8, gold: 15, size: 'normal', from: 61, jam: { r: 2 }, machine: true },
  balista: { hp: 130, speed: 0.6, gold: 18, size: 'normal', from: 63, sling: { every: 6, stun: 3, r: 5 }, machine: true },
  vuz: { hp: 120, speed: 0.7, gold: 20, size: 'normal', from: 65, machine: true },
  mala_oblehaci_vez: { hp: 540, speed: 0.4, gold: 40, size: 'miniboss', from: 69, mini: true, armor: true, machine: true, jam: { r: 2, above: 0.5 }, brood: { every: 10, count: 1, type: 'plechac' }, heroDps: 10 },
  oblehaci_vez: { hp: 3600, speed: 0.3, gold: 130, size: 'boss', boss: true, from: 70, armor: true, machine: true, jam: { r: 3, above: 0.5 }, brood: { every: 8, count: 2, type: 'plechac' }, heroDps: 16 },

  // Chapter 8
  tunelar: { hp: 70, speed: 1.2, gold: 10, size: 'normal', from: 72, machine: true },
  krtek: { hp: 60, speed: 1.0, gold: 10, size: 'normal', from: 75, popup: 5 },
  cervik: { hp: 570, speed: 0.55, gold: 40, size: 'miniboss', from: 79, mini: true, heroDps: 10, burrow: { up: 7, down: 3.5, holes: ['D1', 'D2'], times: 4 } },
  hlubinny_cerv: { hp: 3800, speed: 0.45, gold: 140, size: 'boss', boss: true, from: 80, heroDps: 18, burrow: { up: 9, down: 4, holes: ['D1', 'D2'], times: 6 } },

  // Chapter 9
  ucen: { hp: 80, speed: 1.0, gold: 9, size: 'normal', from: 81, learn: true },
  ucen_dron: { hp: 60, speed: 1.4, gold: 9, size: 'normal', from: 84, learn: true, fly: true },
  tovarys: { hp: 600, speed: 0.55, gold: 40, size: 'miniboss', from: 89, mini: true, shift: { every: 10 }, heroDps: 10 },
  mistr: { hp: 4000, speed: 0.4, gold: 150, size: 'boss', boss: true, from: 90, adapt: { every: 15 }, heroDps: 18 },

  // Chapter 10 (the last two are in secrets/)
  posel: { hp: 30, speed: 0.42, gold: 0, size: 'none', from: 99, messenger: true },
  srdce_mlhy: { hp: 6000, speed: 0.3, gold: 0, size: 'boss', boss: true, from: 100, heart: true, heroDps: 14 },
  srdicko: { hp: 0, speed: 0.4, gold: 0, size: 'miniboss', bossPart: true, from: 100, heart: true, heroDps: 12 },
};

// Resistance of learners (učni) and the master: share of damage that still goes through.
export const RESIST_PASS = 0.4;
// Damage types that learners can learn.
export const DTYPES = ['strela', 'vybuch', 'mraz', 'blesk', 'knot'];

// Returning bosses in chapter 10 have this share of the life they would have.
export const RETURN_HP = 0.6;

// Endless mode (after the end): life grows 6 % a wave on top of wave 100, one mutation a wave.
export const ENDLESS = { growth: 1.06, mutations: ['fast', 'split', 'armor', 'invisible', 'regen'], fast: 1.3, regen: 0.02, splitFrac: 0.35 };

// Golden variant: any enemy can be golden. It does not take light, it just escapes.
export const GOLDEN = { hpMul: 2, speed: 1.8, gold: 40, light: 0 };

// Damage that blocked enemies (Knot's Plug) do to Knot per second.
export const BLOCK_DPS = 4;

export const DIFFICULTY = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.25,
  legend: 1.5,
};
