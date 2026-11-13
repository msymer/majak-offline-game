// Cards (after waves 5, 15, 25 ...), relics (after every boss) and Knot's upgrades.
// minWave = the card is offered only from this completed wave on (it needs something that comes later).
// The numbers are default values and may be tuned.

export const CARDS_ENABLED = true;
export const MAX_SPELLS = 3;

export const CARDS = [
  // Spells: used once per wave; damage grows with the wave like enemy life.
  { id: 'meteor', kind: 'spell', target: true, dmg: 150, radius: 1.5 },
  { id: 'breath', kind: 'spell', time: 3, bossTime: 1 },
  { id: 'goldRush', kind: 'spell', time: 10, mul: 2 },
  { id: 'reverse', kind: 'spell', back: 6 },
  { id: 'shield', kind: 'spell', time: 8 },
  { id: 'thunder', kind: 'spell', dmg: 260, stun: 2 },
  { id: 'fastHands', kind: 'spell', time: 10, mul: 2 },
  { id: 'draft', kind: 'spell', time: 10, slow: 0.3, minWave: 35 },

  // Rules: last until the end of the play-through.
  { id: 'neighbors', kind: 'rule', range: 0.5 },
  { id: 'recycle', kind: 'rule' },
  { id: 'compound', kind: 'rule', rate: 0.02 },
  { id: 'barbed', kind: 'rule', dps: 4 },
  { id: 'longTrack', kind: 'rule', per: 5, max: 0.4 },
  { id: 'collector', kind: 'rule', every: 25, gold: 15 },
  { id: 'thrifty', kind: 'rule', share: 0.15 },
  { id: 'justice', kind: 'rule', dmg: 20 },
  { id: 'heights', kind: 'rule', minWave: 30 },
  { id: 'deepMud', kind: 'rule', slow: 0.5, minWave: 20 },
  { id: 'overtime', kind: 'rule', per: 10, max: 5 },
  { id: 'hardSchool', kind: 'rule', hp: 1.1, gold: 1.25 },
  { id: 'foundations', kind: 'rule', minWave: 25 },
  { id: 'secondLine', kind: 'rule', range: 3, dmg: 0.3 },

  // Cards for Knot.
  { id: 'boots', kind: 'knot', speed: 0.4 },
  { id: 'thermos', kind: 'knot', heal: 10 },
  { id: 'heavyWrench', kind: 'knot', radius: 1.5, stun: 1 },
  { id: 'leader', kind: 'knot', range: 1, rate: 0.1 },
  { id: 'handyman', kind: 'knot', minWave: 25 },
  { id: 'magnet', kind: 'knot', gold: 1 },
  { id: 'battery', kind: 'knot', down: 5 },
  { id: 'sunny', kind: 'knot', reveal: 4, minWave: 35 },
];

export const RELICS = [
  { id: 'slimeHeart', time: 2, slow: 0.3, r: 0.6 },
  { id: 'oldMap', ahead: 3 },
  { id: 'gear' },
  { id: 'secondBreath', light: 20 },
  { id: 'mirror', speed: 1.5 },
  { id: 'pocketStorm', targets: 2 },
  { id: 'mason' },
  { id: 'doubleShift', mul: 1.5 },
  { id: 'eternalIce', mul: 2 },
  { id: 'telescope', range: 0.5 },
  { id: 'anvil', perLevel: 0.15 },
  { id: 'whistle', mul: 2 },
  { id: 'tide', mul: 2 },
  { id: 'fifth', range: 2, minWave: 20 },
  { id: 'hope', light: 25, perWave: 5 },
  { id: 'rustyCrown', hp: 0.85, gold: 2 },
];

export function cardById(id) { return CARDS.find((c) => c.id === id) || null; }
export function relicById(id) { return RELICS.find((c) => c.id === id) || null; }

// Knot's level-up choices (two of these are offered at random on every level).
export const HERO_UPS = {
  power: { dmg: 0.2 },        // Síla
  agility: { speed: 0.15 },   // Hbitost
  command: { aura: 0.05 },    // Velitel
  stamina: { hp: 25 },        // Výdrž
  reach: { range: 0.5 },      // Dosah
  handy: { cd: 0.1 },         // Šikula
};
export const HERO_UP_ORDER = ['power', 'agility', 'command', 'stamina', 'reach', 'handy'];

// Experience needed to go from level L to L + 1.
export function xpForLevel(L) { return 10 + 5 * L; }
