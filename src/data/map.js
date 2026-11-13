// Map of the island. 19 columns (x 0..18, west -> east), 21 rows (y 0..20, north -> south).
export const MAP_W = 19;
export const MAP_H = 21;

export const MAP_ROWS = [
  '~~###....N....###~~', // y00
  '~..K...........K..~', // y01
  '....##..~~~..##....', // y02
  '.K......~~~......K.', // y03
  '####...........####', // y04
  '####.....N.....####', // y05
  '#P.....#...#.....P#', // y06
  '...##..P...P..##...', // y07
  '.#......###......#.', // y08
  '....P.........P....', // y09
  '###.#####.#####.###', // y10
  '##.......N......~~#', // y11
  '#RR#...........BB~#', // y12
  '...#..~~.......B...', // y13
  '.#....~~....#.#BB..', // y14
  'W#R#..~~.....T#.B.E', // y15
  '.#R#..........#BB..', // y16
  '........#......B...', // y17
  '#R#............BB~#', // y18
  '#R#..RR..o......~~#', // y19
  '~~~~~~~~~MS~~~~~~~~', // y20
];

// pass = enemies/hero can walk, build = player can build on it.
// kind is used by the renderer.
export const TILES = {
  '.': { kind: 'grass', pass: true, build: true },
  '#': { kind: 'rock', pass: false, build: false },
  '~': { kind: 'water', pass: false, build: false },
  'B': { kind: 'mud', pass: true, build: true, mud: true },
  'R': { kind: 'ore', pass: true, build: true, ore: true },
  'P': { kind: 'plateau', pass: true, build: true, plateau: true },
  'K': { kind: 'crystal', pass: true, build: true, crystal: true },
  'T': { kind: 'beacon', pass: false, build: false, beacon: true },
  'N': { kind: 'entryN', pass: true, build: true }, // build only when not the active entry
  'E': { kind: 'entryE', pass: true, build: false },
  'W': { kind: 'crack', pass: true, build: false },
  'o': { kind: 'threshold', pass: true, build: false },
  'M': { kind: 'lighthouse', pass: true, build: false, goal: true },
  'S': { kind: 'spring', pass: false, build: false, spring: true },
  'D': { kind: 'hole', pass: true, build: false }, // a hole in the ground (chapter 8 on)
};

// Sectors: rectangles that are hidden in mist until unlocked.
// Row 20 (cliff with the lighthouse) is always open.
export const SECTORS = [
  { id: 'louka', x0: 5, x1: 13, y0: 11, y1: 19, unlockAfter: 0 },
  { id: 'lom', x0: 0, x1: 4, y0: 11, y1: 19, unlockAfter: 10 },
  { id: 'bazina', x0: 14, x1: 18, y0: 11, y1: 19, unlockAfter: 20 },
  { id: 'ruiny', x0: 0, x1: 18, y0: 5, y1: 10, unlockAfter: 30 },
  { id: 'brana', x0: 0, x1: 18, y0: 0, y1: 4, unlockAfter: 40, closeAfter: 90 },
];

// Entries and the waves in which they are active.
export const ENTRIES = {
  S: [
    { from: 1, to: 30, x: 9, y: 11 },
    { from: 31, to: 40, x: 9, y: 5 },
    { from: 41, to: 90, x: 9, y: 0 },
    { from: 91, to: 100000, x: 9, y: 5 },
  ],
  V: [{ from: 21, to: 100000, x: 18, y: 15 }],
  Z: [{ from: 46, to: 100000, x: 0, y: 15 }],
  D1: [{ from: 72, to: 100000, x: 4, y: 18 }],
  D2: [{ from: 72, to: 100000, x: 13, y: 17 }],
};

// Rock that a boss can break for good (it becomes grass).
export const BREAKABLE_ROCKS = [{ x: 9, y: 8 }];

// Things on the map that happen with a wave (they are announced in the wave preview a wave before).
export const UNLOCKS = [
  { after: 10, kind: 'sector', id: 'lom' },
  { after: 20, kind: 'sector', id: 'bazina' },
  { after: 25, kind: 'ability', id: 'plug' },
  { after: 30, kind: 'sector', id: 'ruiny' },
  { after: 30, kind: 'level', id: 'level3' },
  { after: 40, kind: 'sector', id: 'brana' },
  { after: 50, kind: 'limit', id: 'amp3' },
  { after: 60, kind: 'hybrid', id: 'hybrids' },
  { after: 70, kind: 'ability', id: 'overload' },
  { after: 70, kind: 'limit', id: 'teleport2' },
  { after: 80, kind: 'level', id: 'level4' },
  { after: 80, kind: 'limit', id: 'amp4' },
];

// Lasting changes of the map after a wave. They are announced in the wave preview a wave before
// and happen when the wave 'after' is over, so the player meets them in the build phase.
//   collapse = rock turns to grass, holes = new holes in the ground (entries D1, D2), mist = a sector is lost again
export const MAP_EVENTS = [
  { after: 60, kind: 'collapse', cells: [[14, 14], [14, 15], [14, 16]], to: '.' },
  { after: 71, kind: 'holes', cells: [[4, 18], [13, 17]], to: 'D' },
  { after: 90, kind: 'mist', sector: 'brana' },
];

export const LIGHTHOUSE = { x: 9, y: 20 };
export const THRESHOLD = { x: 9, y: 19 };
export const SPRING = { x: 10, y: 20 };
