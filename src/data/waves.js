// Waves. Each wave lists groups per entry (S = north, V = east, Z = west, D1/D2 = holes).
// A group is a list of segments that come one after another:
//   { type, count, gap, delay, parallel, hpMul, golden }
//   gap      = seconds between two enemies (tight ~0.3, loose ~1.5)
//   delay    = pause before this segment starts (default 5 s after the previous segment, 0 for the first)
//   parallel = true -> starts together with the previous segment (delay counts from its start)
//   gold     = gold of a golden enemy (instead of the usual golden reward)
//   resist   = learners: 0 none, 1 the type that killed most last wave, 2 the two top types, 'all' all but Knot
//   shift    = learners: their resistance changes in the middle of the wave
//   armor, invisible = extra armour / invisibility for this segment
//   ret      = a returning boss (chapter 10): less life, misty look
// Groups at different entries start at the same time.

export const TIGHT = 0.3;
export const LOOSE = 1.5;
export const DEFAULT_GAP = 1.0;
export const DEFAULT_PAUSE = 5;

// Highest wave that exists in this version of the game.
export const CONTENT_MAX_WAVE = 100;
export const TOTAL_WAVES = 100;

// "Mixed" = two segments interleaved: the second starts half a gap later and has a wider gap.
const mix = (a, b) => [a, { ...b, parallel: true, delay: b.delay ?? (a.gap ?? DEFAULT_GAP) / 2 }];
// Siege formation: armoured in front, healers in the middle, a ballista at the back.
const formation = (keys) => Object.fromEntries(keys.map((k, i) => [k, [
  { type: 'plechac', count: 5, gap: 0.8, delay: i * 1.5 },
  { type: 'felcar', count: 2, gap: 1.2, delay: 0.8 },
  { type: 'balista', count: 1, delay: 1.2 },
]]));
// Wave 95: one golden enemy of every kind.
const GOLDEN_ALL = ['sliz', 'smejdil', 'tlustoch', 'plechac', 'dron', 'sberac', 'felcar', 'bahnak', 'bourac', 'mlzak', 'rojik', 'rusicka', 'balista', 'tunelar', 'ucen'];

export const WAVES = [
  // Chapter 1: Zvědavci
  { n: 1, groups: { S: [{ type: 'sliz', count: 6, gap: LOOSE }] } },
  { n: 2, groups: { S: [{ type: 'sliz', count: 10, gap: LOOSE }] } },
  { n: 3, groups: { S: [{ type: 'sliz', count: 8, gap: 1.2 }, { type: 'smejdil', count: 4, gap: 1.0 }] } },
  { n: 4, groups: { S: [{ type: 'sliz', count: 14, gap: TIGHT }] } },
  { n: 5, groups: { S: [{ type: 'sliz', count: 3, gap: 2.0, golden: true }] } },
  { n: 6, groups: { S: [{ type: 'sliz', count: 12, gap: 1.0 }, { type: 'smejdil', count: 8, gap: 0.8 }] } },
  { n: 7, groups: { S: [{ type: 'sliz', count: 24, gap: TIGHT, hpMul: 0.5 }] } },
  { n: 8, groups: { S: [{ type: 'tlustoch', count: 6, gap: LOOSE }] } },
  { n: 9, groups: { S: [{ type: 'tlustoch', count: 4, gap: 1.2 }, { type: 'smejdil', count: 10, gap: TIGHT, delay: 0.4 }] } },
  { n: 10, boss: 'velky_sliz', groups: { S: [{ type: 'velky_sliz', count: 1, gap: 1 }, { type: 'sliz', count: 8, gap: LOOSE, delay: 2, parallel: true }] } },

  // Chapter 2: Šrot
  { n: 11, groups: { S: [{ type: 'plechac', count: 6, gap: LOOSE }] } },
  { n: 12, groups: { S: mix({ type: 'sliz', count: 10, gap: 1.2 }, { type: 'plechac', count: 5, gap: 2.4 }) } },
  { n: 13, groups: { S: [{ type: 'dron', count: 6, gap: LOOSE }] } },
  { n: 14, groups: { S: [{ type: 'plechac', count: 8, gap: 1.4 }, { type: 'dron', count: 6, gap: 1.8, parallel: true, delay: 3 }] } },
  { n: 15, groups: { S: [{ type: 'sberac', count: 5, gap: 1.8 }] } },
  { n: 16, groups: { S: [{ type: 'smejdil', count: 20, gap: 0.5 }, { type: 'sberac', count: 4, gap: 1.2 }] } },
  { n: 17, groups: { S: [{ type: 'dron', count: 6, gap: 0.5 }, { type: 'dron', count: 6, gap: 0.5, delay: 6 }] } },
  { n: 18, groups: { S: [{ type: 'tlustoch', count: 3, gap: 2.2 }, { type: 'plechac', count: 10, gap: 1.0, parallel: true, delay: 1.1 }, { type: 'smejdil', count: 6, gap: 0.6 }] } },
  { n: 19, groups: { S: [{ type: 'maly_valec', count: 2, gap: 7 }] } },
  { n: 20, boss: 'valec', groups: { S: [{ type: 'valec', count: 1 }, { type: 'dron', count: 8, gap: 0.8, parallel: true, delay: 45 }] } },

  // Chapter 3: Bažina se budí
  { n: 21, groups: { V: [{ type: 'sliz', count: 10, gap: LOOSE }] } },
  { n: 22, groups: { S: [{ type: 'plechac', count: 8, gap: 1.4 }], V: [{ type: 'sliz', count: 8, gap: 1.2 }] } },
  { n: 23, groups: { V: mix({ type: 'sliz', count: 6, gap: 1.4 }, { type: 'felcar', count: 2, gap: 4.2 }) } },
  { n: 24, groups: { S: [{ type: 'smejdil', count: 10, gap: 0.8 }], V: mix({ type: 'tlustoch', count: 4, gap: 1.8 }, { type: 'felcar', count: 2, gap: 3.6 }) } },
  { n: 25, groups: { V: [{ type: 'pulec', count: 8, gap: 1.2, golden: true }] } },
  { n: 26, groups: { V: [{ type: 'bahnak', count: 8, gap: 1.4 }] } },
  { n: 27, groups: { S: [{ type: 'dron', count: 8, gap: 1.2 }], V: mix({ type: 'sliz', count: 12, gap: 1.0 }, { type: 'felcar', count: 3, gap: 3.5 }) } },
  { n: 28, groups: { V: [{ type: 'smejdil', count: 20, gap: TIGHT }], S: [{ type: 'plechac', count: 6, gap: 1.4 }] } },
  { n: 29, groups: { V: [{ type: 'bahenni_dcera', count: 3, gap: 6 }] } },
  { n: 30, boss: 'bahenni_matka', groups: { V: [{ type: 'bahenni_matka', count: 1 }] } },

  // Chapter 4: Bourači
  { n: 31, groups: { S: mix({ type: 'sliz', count: 12, gap: 1.1 }, { type: 'plechac', count: 6, gap: 2.2 }) } },
  { n: 32, groups: { S: [{ type: 'bourac', count: 4, gap: LOOSE * 1.6 }] } },
  { n: 33, groups: { S: [{ type: 'bourac', count: 6, gap: 1.8 }, { type: 'smejdil', count: 10, gap: 0.6 }] } },
  { n: 34, groups: { S: [{ type: 'bourac', count: 4, gap: 2 }], V: [{ type: 'bahnak', count: 10, gap: 1.2 }] } },
  { n: 35, groups: { S: [{ type: 'plechac', count: 6, gap: 1.6, golden: true }] } },
  { n: 36, groups: { S: mix({ type: 'bourac', count: 8, gap: 1.6 }, { type: 'felcar', count: 3, gap: 4 }) } },
  { n: 37, groups: { S: [{ type: 'dron', count: 10, gap: 1.0 }, { type: 'bourac', count: 6, gap: 1.8, parallel: true, delay: 2 }], V: [{ type: 'plechac', count: 8, gap: 1.3 }] } },
  { n: 38, groups: { S: [{ type: 'demolicni_koule', count: 2, gap: 5 }, { type: 'sliz', count: 12, gap: 1.0, parallel: true, delay: 2 }] } },
  { n: 39, groups: { S: [{ type: 'beranek', count: 3, gap: 7 }] } },
  { n: 40, boss: 'beranidlo', groups: { S: [{ type: 'beranidlo', count: 1 }, { type: 'smejdil', count: 10, gap: 0.7, parallel: true, delay: 6 }] } },

  // Chapter 5: Mlžná brána
  { n: 41, groups: { S: mix({ type: 'sliz', count: 15, gap: 1.0 }, { type: 'plechac', count: 8, gap: 1.9 }) } },
  { n: 42, groups: { S: [{ type: 'mlzak', count: 8, gap: LOOSE }] } },
  { n: 43, groups: { S: mix({ type: 'mlzak', count: 10, gap: 1.2 }, { type: 'sliz', count: 10, gap: 1.2 }) } },
  { n: 44, groups: { S: [{ type: 'mlzak', count: 6, gap: 1.4 }], V: mix({ type: 'mlzak', count: 6, gap: 1.4 }, { type: 'felcar', count: 2, gap: 4 }) } },
  { n: 45, groups: { S: [{ type: 'mlzak', count: 6, gap: 1.6, golden: true }] } },
  { n: 46, groups: { Z: [{ type: 'sliz', count: 10, gap: 1.2 }, { type: 'smejdil', count: 5, gap: 0.8 }] } },
  { n: 47, groups: { Z: mix({ type: 'plechac', count: 8, gap: 1.4 }, { type: 'sberac', count: 4, gap: 2.8 }), S: [{ type: 'mlzak', count: 10, gap: 1.2 }] } },
  { n: 48, groups: { S: [{ type: 'sliz', count: 8, gap: 1.1 }], V: [{ type: 'bahnak', count: 8, gap: 1.3 }], Z: [{ type: 'smejdil', count: 8, gap: 0.8 }] } },
  { n: 49, groups: { S: [{ type: 'straznik', count: 2, gap: 8 }] } },
  { n: 50, boss: 'strazce_brany', groups: { S: [{ type: 'strazce_brany', count: 1 }] } },

  // Chapter 6: Roj
  { n: 51, groups: { S: [{ type: 'rojik', count: 60, gap: TIGHT }] } },
  { n: 52, groups: { S: [{ type: 'rojik', count: 40, gap: 0.35 }], V: [{ type: 'rojik', count: 40, gap: 0.35 }] } },
  { n: 53, groups: { S: [{ type: 'nosic', count: 4, gap: 3.5 }] } },
  { n: 54, groups: { Z: mix({ type: 'rojik', count: 50, gap: 0.35 }, { type: 'nosic', count: 3, gap: 5 }), S: [{ type: 'plechac', count: 10, gap: 1.2 }] } },
  { n: 55, groups: { S: [{ type: 'rojik', count: 100, gap: 0.25, golden: true, gold: 3 }] } },
  { n: 56, groups: { S: mix({ type: 'rojik', count: 80, gap: 0.3 }, { type: 'felcar', count: 4, gap: 6 }) } },
  { n: 57, groups: { S: [{ type: 'dron', count: 12, gap: 1.0 }], V: [{ type: 'rojik', count: 60, gap: 0.3 }], Z: [{ type: 'bourac', count: 6, gap: 2 }] } },
  { n: 58, groups: { S: [{ type: 'rojik', count: 60, gap: 0.3 }], V: [{ type: 'rojik', count: 60, gap: 0.3 }], Z: [{ type: 'rojik', count: 60, gap: 0.3 }] } },
  { n: 59, groups: { S: [{ type: 'princezna', count: 3, gap: 9 }] } },
  { n: 60, boss: 'kralovna_roje', groups: { S: [{ type: 'kralovna_roje', count: 1 }] } },

  // Chapter 7: Obléhání
  { n: 61, groups: { S: mix({ type: 'plechac', count: 10, gap: 1.3 }, { type: 'rusicka', count: 2, gap: 6 }) } },
  { n: 62, groups: { V: [{ type: 'sliz', count: 12, gap: 1.0 }, { type: 'smejdil', count: 8, gap: 0.7 }] } },
  { n: 63, groups: { S: mix({ type: 'plechac', count: 10, gap: 1.3 }, { type: 'balista', count: 4, gap: 3.4 }) } },
  { n: 64, groups: { S: mix({ type: 'rojik', count: 20, gap: 0.4 }, { type: 'rusicka', count: 3, gap: 3 }), V: mix({ type: 'bahnak', count: 8, gap: 1.3 }, { type: 'balista', count: 2, gap: 5 }) } },
  { n: 65, groups: { S: [{ type: 'vuz', count: 6, gap: 2, golden: true }, { type: 'rusicka', count: 2, gap: 6, parallel: true, delay: 1 }] } },
  { n: 66, groups: { Z: mix({ type: 'bourac', count: 6, gap: 2 }, { type: 'rusicka', count: 4, gap: 3 }) } },
  { n: 67, groups: { S: mix({ type: 'dron', count: 16, gap: 0.8 }, { type: 'balista', count: 4, gap: 3.2 }), V: [{ type: 'mlzak', count: 10, gap: 1.2 }] } },
  { n: 68, groups: formation(['S', 'V', 'Z']) },
  { n: 69, groups: { S: [{ type: 'mala_oblehaci_vez', count: 2, gap: 12 }] } },
  { n: 70, boss: 'oblehaci_vez', groups: { S: [{ type: 'oblehaci_vez', count: 1 }] } },

  // Chapter 8: Podzemí
  { n: 71, groups: { S: mix({ type: 'sliz', count: 20, gap: 0.9 }, { type: 'plechac', count: 10, gap: 1.8 }) } },
  { n: 72, groups: { D1: [{ type: 'tunelar', count: 8, gap: LOOSE }] } },
  { n: 73, groups: { D2: [{ type: 'tunelar', count: 10, gap: 1.3 }], S: [{ type: 'smejdil', count: 12, gap: 0.7 }] } },
  { n: 74, groups: { D1: [{ type: 'tunelar', count: 8, gap: 1.4 }], D2: [{ type: 'tunelar', count: 8, gap: 1.4, delay: 0.7 }], V: mix({ type: 'bahnak', count: 6, gap: 1.4 }, { type: 'felcar', count: 2, gap: 4 }) } },
  { n: 75, groups: { D1: [{ type: 'krtek', count: 6, gap: 4, golden: true }], D2: [{ type: 'krtek', count: 6, gap: 4, golden: true, delay: 2 }] } },
  { n: 76, groups: { D1: [{ type: 'bourac', count: 4, gap: 2.5 }], S: [{ type: 'rojik', count: 40, gap: 0.35 }] } },
  { n: 77, groups: { D2: [{ type: 'rusicka', count: 3, gap: 3 }], D1: [{ type: 'tunelar', count: 12, gap: 1.0 }], Z: [{ type: 'plechac', count: 8, gap: 1.3 }] } },
  { n: 78, groups: {
    S: mix({ type: 'sliz', count: 6, gap: 1.0 }, { type: 'plechac', count: 4, gap: 2 }), V: [{ type: 'bahnak', count: 6, gap: 1.2 }],
    Z: [{ type: 'smejdil', count: 8, gap: 0.7 }], D1: [{ type: 'tunelar', count: 4, gap: 1.6, delay: 4 }], D2: [{ type: 'tunelar', count: 4, gap: 1.6, delay: 6 }],
  } },
  { n: 79, groups: { D1: [{ type: 'cervik', count: 2, gap: 12 }] } },
  { n: 80, boss: 'hlubinny_cerv', groups: { D1: [{ type: 'hlubinny_cerv', count: 1 }] } },

  // Chapter 9: Učni
  { n: 81, groups: { S: [{ type: 'ucen', count: 20, gap: 1.0, resist: 0 }] } },
  { n: 82, groups: { S: [{ type: 'ucen', count: 20, gap: 1.0, resist: 1 }] } },
  { n: 83, groups: { V: mix({ type: 'ucen', count: 16, gap: 1.0, resist: 1 }, { type: 'felcar', count: 4, gap: 4 }) } },
  { n: 84, groups: { S: [{ type: 'ucen', count: 12, gap: 1.1, resist: 1, armor: true }, { type: 'ucen_dron', count: 10, gap: 1.2, resist: 1, parallel: true, delay: 3 }] } },
  { n: 85, groups: { S: [{ type: 'ucen', count: 8, gap: 2, golden: true, resist: 'all' }] } },
  { n: 86, groups: { Z: [{ type: 'ucen', count: 12, gap: 1.0, resist: 2 }], V: [{ type: 'ucen', count: 12, gap: 1.0, resist: 2 }] } },
  { n: 87, groups: { S: [{ type: 'ucen', count: 16, gap: 1.1, resist: 1, invisible: true }] } },
  { n: 88, groups: { S: [{ type: 'ucen', count: 12, gap: 1.0, resist: 1, shift: true }], V: [{ type: 'ucen', count: 12, gap: 1.0, resist: 1, shift: true }], Z: [{ type: 'ucen', count: 12, gap: 1.0, resist: 1, shift: true }] } },
  { n: 89, groups: { S: [{ type: 'tovarys', count: 2, gap: 12 }] } },
  { n: 90, boss: 'mistr', groups: { S: [{ type: 'mistr', count: 1 }] } },

  // Chapter 10: Srdce mlhy
  { n: 91, groups: { S: mix({ type: 'sliz', count: 30, gap: 0.7 }, { type: 'smejdil', count: 10, gap: 2.1 }) } },
  { n: 92, boss: 'velky_sliz', groups: { S: [{ type: 'velky_sliz', count: 1, ret: true }], V: [{ type: 'valec', count: 1, ret: true, delay: 8 }] } },
  { n: 93, boss: 'bahenni_matka', groups: { V: [{ type: 'bahenni_matka', count: 1, ret: true }], Z: [{ type: 'rojik', count: 80, gap: 0.4, delay: 6 }] } },
  { n: 94, boss: 'beranidlo', groups: { S: [{ type: 'beranidlo', count: 1, ret: true }], V: [{ type: 'mlzak', count: 12, gap: 1.2, delay: 3 }] } },
  { n: 95, groups: { S: GOLDEN_ALL.map((type) => ({ type, count: 1, gap: 1, golden: true, gold: 25, delay: 1.2 })) } },
  { n: 96, boss: 'strazce_brany', groups: { S: [{ type: 'strazce_brany', count: 1, ret: true }], Z: [{ type: 'kralovna_roje', count: 1, ret: true, delay: 10 }] } },
  { n: 97, boss: 'oblehaci_vez', groups: { S: [{ type: 'oblehaci_vez', count: 1, ret: true }], D1: [{ type: 'tunelar', count: 8, gap: 1.5, delay: 10 }], D2: [{ type: 'tunelar', count: 8, gap: 1.5, delay: 18 }] } },
  { n: 98, boss: 'mistr', groups: { D1: [{ type: 'hlubinny_cerv', count: 1, ret: true }], S: [{ type: 'mistr', count: 1, ret: true, delay: 6 }] } },
  { n: 99, quiet: true, groups: { S: [{ type: 'posel', count: 1 }] } },
  { n: 100, boss: 'srdce_mlhy', final: true, groups: { S: [{ type: 'srdce_mlhy', count: 1 }] } },
];

// Balance (Etapa 5): life multiplier of every wave on top of the growth and the chapter multiplier.
// Found with tools/tune.mjs (how much life a wave can have before the balance bot starts to lose light)
// and tools/balance.mjs. It multiplies hpMul of every segment of the wave; enemies born during the wave
// (broods, eggs, reinforcements) are not touched.
export const WAVE_HP = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1.4, 7: 2.6, 8: 1.2, 9: 1.7, 10: 1.1,
  11: 2.1, 12: 1.8, 13: 1.7, 14: 2, 15: 6, 16: 3.7, 17: 1.8, 18: 1.7, 19: 3.9, 20: 1.3,
  21: 6, 22: 2.5, 23: 2.7, 24: 2.1, 25: 6, 26: 9.8, 27: 5.1, 28: 9, 29: 3.8, 30: 1.5,
  31: 2.3, 32: 3.9, 33: 2.8, 34: 2.6, 35: 4, 36: 4.7, 37: 12, 38: 12, 39: 2.8, 40: 3,
  41: 6, 42: 9, 43: 6, 44: 3.3, 45: 4.1, 46: 12, 47: 14, 48: 9, 49: 6, 50: 3.5,
  51: 9, 52: 9, 53: 3.6, 54: 2.2, 55: 6, 56: 9.5, 57: 6.1, 58: 12, 59: 4.9, 60: 2.2,
  61: 6, 62: 9, 63: 9, 64: 2.2, 65: 6, 66: 9, 67: 2.4, 68: 2, 69: 6, 70: 1.35,
  71: 9, 72: 9, 73: 6, 74: 2.2, 75: 1, 76: 9, 77: 9, 78: 2.7, 79: 5.7, 80: 1.7,
  81: 9, 82: 9, 83: 3, 84: 1.1, 85: 6, 86: 6, 87: 9, 88: 9, 89: 6, 90: 3.6,
  91: 9, 92: 9, 93: 9, 94: 3.5, 95: 1.6, 96: 3.8, 97: 3.8, 98: 2.25,
};
// Waves of the endless mode (101+) are copies of story waves: they get this multiplier instead of WAVE_HP.
export const ENDLESS_WAVE_HP = 3;
for (const w of WAVES) {
  const m = WAVE_HP[w.n];
  if (m && m !== 1) for (const segs of Object.values(w.groups)) for (const s of segs) s.hpMul = Math.round((s.hpMul || 1) * m * 1000) / 1000;
}

// Card after waves ending with 5, relic after boss waves.
export const CARD_WAVES = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
export const BOSS_WAVES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
// Relics after these bosses only (the last boss ends the story).
export const RELIC_WAVES = [10, 20, 30, 40, 50, 60, 70, 80, 90];

// Chapters 1..10; endless waves (101+) count as chapter 10 for looks and numbers.
export function chapterOf(n) {
  return Math.max(1, Math.min(10, Math.ceil(n / 10)));
}

const BY_N = new Map();
export function getWave(n) {
  if (!BY_N.size) for (const w of WAVES) BY_N.set(w.n, w);
  if (n > TOTAL_WAVES) return endlessWave(n);
  return BY_N.get(n) || null;
}

// ---------- endless mode (after the end) ----------
// Waves 101+ are put together from the patterns of chapters 6–10 (no story waves),
// every wave has one mutation; every tenth wave brings a returning boss.
const ENDLESS_BOSSES = ['kralovna_roje', 'oblehaci_vez', 'hlubinny_cerv', 'mistr', 'strazce_brany', 'valec', 'bahenni_matka', 'velky_sliz'];
const ENDLESS_MUT = ['fast', 'armor', 'split', 'invisible', 'regen'];
const endlessCache = new Map();
function hash32(n) { let h = Math.imul(n ^ 0x5bd1e995, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; return (h ^ (h >>> 12)) >>> 0; }
export function endlessWave(n) {
  if (endlessCache.has(n)) return endlessCache.get(n);
  const h = hash32(n);
  const mutation = ENDLESS_MUT[(n + (h % 3)) % ENDLESS_MUT.length];
  let w;
  if (n % 10 === 0) {
    const boss = ENDLESS_BOSSES[(n / 10 + h) % ENDLESS_BOSSES.length];
    const entry = boss === 'hlubinny_cerv' ? 'D1' : boss === 'bahenni_matka' ? 'V' : 'S';
    w = { n, boss, endless: true, mutation, groups: { [entry]: [{ type: boss, count: 1, ret: true }], Z: [{ type: 'rojik', count: 30, gap: 0.4, delay: 8 }] } };
  } else {
    const pool = WAVES.filter((x) => x.n >= 51 && x.n <= 98 && !x.boss && x.n % 10 !== 9 && x.n % 10 !== 5);
    const src = pool[h % pool.length];
    w = { n, endless: true, mutation, from: src.n, groups: JSON.parse(JSON.stringify(src.groups)) };
    // the endless mode does not take over the wave multipliers of the story (WAVE_HP), it has one of its own
    const back = WAVE_HP[src.n] || 1;
    for (const segs of Object.values(w.groups)) for (const s of segs) { delete s.golden; delete s.gold; s.hpMul = Math.round((s.hpMul || 1) / back * ENDLESS_WAVE_HP * 1000) / 1000; }
  }
  endlessCache.set(n, w);
  return w;
}
