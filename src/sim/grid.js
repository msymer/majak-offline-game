// Grid helpers and breadth-first search. No DOM, no Three.js.
import { MAP_W, MAP_H, MAP_ROWS, TILES, SECTORS, ENTRIES, LIGHTHOUSE } from '../data/map.js';

export const W = MAP_W;
export const H = MAP_H;
export const N = W * H;

export const DIRS = [
  [0, -1], // 0 north
  [1, 0],  // 1 east
  [0, 1],  // 2 south
  [-1, 0], // 3 west
];

export function idx(x, y) { return y * W + x; }
export function inBounds(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }

// Lasting changes of the map (a broken rock...). The game state owns them as { cellIndex: char };
// the running game hands its table here, so every reader of tiles sees the same map.
let MODS = null;
export function useMapMods(mods) { MODS = mods || null; }
export function mapModsInUse() { return MODS; }
export function charAt(x, y) { return (MODS && MODS[y * W + x]) || MAP_ROWS[y][x]; }
export function tileAt(x, y) { return TILES[charAt(x, y)]; }

export function sectorAt(x, y) {
  if (y === H - 1) return null; // cliff row, always open
  for (const s of SECTORS) {
    if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) return s;
  }
  return null;
}

// Position of an entry for a given wave, or null when not active.
export function entryPos(key, wave) {
  const list = ENTRIES[key];
  if (!list) return null;
  for (const e of list) if (wave >= e.from && wave <= e.to) return { x: e.x, y: e.y };
  return null;
}

export function entriesForWave(wave) {
  const out = [];
  for (const key of Object.keys(ENTRIES)) {
    const p = entryPos(key, wave);
    if (p) out.push({ key, x: p.x, y: p.y });
  }
  return out;
}

export const GOAL = LIGHTHOUSE;

// BFS distance field from the lighthouse. walk(i) says whether cell index i is walkable.
// Result: Int16Array with -1 for unreachable cells.
export function distanceField(walk, out) {
  const dist = out || new Int16Array(N);
  dist.fill(-1);
  const q = new Int16Array(N);
  let head = 0, tail = 0;
  const g = idx(GOAL.x, GOAL.y);
  dist[g] = 0;
  q[tail++] = g;
  while (head < tail) {
    const c = q[head++];
    const cx = c % W, cy = (c / W) | 0;
    const nd = dist[c] + 1;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (dist[ni] !== -1 || !walk(ni)) continue;
      dist[ni] = nd;
      q[tail++] = ni;
    }
  }
  return dist;
}

// Generic BFS path from (sx,sy) to (tx,ty) over walkable cells. Returns list of [x,y] without the start, or null.
export function findPath(walk, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  const prev = new Int16Array(N).fill(-1);
  const seen = new Uint8Array(N);
  const q = new Int16Array(N);
  let head = 0, tail = 0;
  const s = idx(sx, sy), t = idx(tx, ty);
  seen[s] = 1;
  q[tail++] = s;
  while (head < tail) {
    const c = q[head++];
    if (c === t) break;
    const cx = c % W, cy = (c / W) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (seen[ni] || !walk(ni)) continue;
      seen[ni] = 1;
      prev[ni] = c;
      q[tail++] = ni;
    }
  }
  if (!seen[t]) return null;
  const path = [];
  let c = t;
  while (c !== s) {
    path.push([c % W, (c / W) | 0]);
    c = prev[c];
  }
  path.reverse();
  return path;
}

// Next step along a distance field. Prefers keeping the current direction, then N, E, S, W.
// Returns direction index 0..3 or -1. Enemies and the path line use the same rule.
export function nextDir(dist, x, y, curDir) {
  const d0 = dist[idx(x, y)];
  if (d0 <= 0) return -1;
  if (curDir >= 0) {
    const nx = x + DIRS[curDir][0], ny = y + DIRS[curDir][1];
    if (inBounds(nx, ny) && dist[idx(nx, ny)] === d0 - 1) return curDir;
  }
  for (let d = 0; d < 4; d++) {
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (inBounds(nx, ny) && dist[idx(nx, ny)] === d0 - 1) return d;
  }
  return -1;
}

// Follow a distance field from a cell to the goal. Returns list of [x,y] including start and goal.
export function followField(dist, sx, sy, startDir = -1) {
  const out = [[sx, sy]];
  let x = sx, y = sy, dir = startDir;
  if (dist[idx(x, y)] < 0) return out;
  let guard = N;
  while (dist[idx(x, y)] > 0 && guard-- > 0) {
    dir = nextDir(dist, x, y, dir);
    if (dir < 0) break;
    x += DIRS[dir][0];
    y += DIRS[dir][1];
    out.push([x, y]);
  }
  return out;
}
