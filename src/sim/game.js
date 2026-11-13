// Pure game logic. No DOM, no Three.js. Runs the same in the browser and in Node.
// The whole state (this.s) is a plain object that can be turned into JSON at any moment.
// Towers, damage and spells are in combat.js; cards, relics, Knot's levels and repairs in progress.js.

import { W, H, N, DIRS, idx, inBounds, tileAt, sectorAt, entriesForWave, entryPos, distanceField, findPath, nextDir, followField, GOAL, useMapMods, mapModsInUse } from './grid.js';
import { makeRng, rnd } from './rng.js';
import { BUILDINGS, LEVEL_POWER, RANGE_PER_LEVEL, MAX_LEVEL_STEPS, TARGET_MODES, TERRAIN, SPECS, WRECK } from '../data/buildings.js';
import { ENEMIES, GOLDEN, CHAPTER_HP, HP_GROWTH, GOLD_GROWTH, ARMOR_BASE, ARMOR_PER_WAVE, LIGHT_BY_SIZE, DIFFICULTY, RETURN_HP, ENDLESS, DTYPES } from '../data/enemies.js';
import { WAVES, getWave, CONTENT_MAX_WAVE, TOTAL_WAVES, DEFAULT_GAP, DEFAULT_PAUSE, BOSS_WAVES, CARD_WAVES, RELIC_WAVES, chapterOf } from '../data/waves.js';
import { THRESHOLD, SPRING, LIGHTHOUSE, UNLOCKS } from '../data/map.js';
import { STEP, ECONOMY, LIGHT, HERO, AUTO_START_DELAY, ABILITY_UNLOCK, BEAM } from '../data/rules.js';
import { combat } from './combat.js';
import { progress } from './progress.js';
import { late } from './late.js';
import { secretSim } from '../secrets/sim.js';

export const STATE_VERSION = 3;

// Extra life per chapter; bosses get only half of the extra (they are tuned by their own base life).
function chapterHp(w, d) { const m = CHAPTER_HP[chapterOf(w)] || 1; return d.boss || d.mini ? 1 + (m - 1) * 0.5 : m; }

// Life grows with the wave; after the end (endless mode) 6 % a wave on top of wave 100.
export function hpGrowth(w) {
  if (w > TOTAL_WAVES) return Math.pow(HP_GROWTH, TOTAL_WAVES - 1) * Math.pow(ENDLESS.growth, w - TOTAL_WAVES);
  return Math.pow(HP_GROWTH, Math.max(0, w - 1));
}

function heroState() {
  return {
    x: THRESHOLD.x + 0.5, y: THRESHOLD.y + 0.5, px: THRESHOLD.x + 0.5, py: THRESHOLD.y + 0.5,
    path: [], tx: THRESHOLD.x, ty: THRESHOLD.y, face: Math.PI,
    hp: HERO.hp, mhp: HERO.hp, down: 0, atk: 0, cd: 0, xp: 0, kills: 0, swing: 0,
    lvl: 1, ups: {}, upPending: 0, upOffer: null, plugT: 0, plugX: 0, plugY: 0, cd2: 0, repT: 0, repId: 0, confusedT: 0,
    cd3: 0, overT: 0, swallowT: 0,
  };
}

export function createState(seed = 12345, opts = {}) {
  return {
    v: STATE_VERSION,
    seed,
    rng: makeRng(seed),
    tick: 0,
    playTime: 0,
    difficulty: opts.difficulty || 'normal',
    gold: ECONOMY.startGold,
    light: LIGHT.max,
    maxLight: LIGHT.max,
    nextWave: 1,
    completedCount: 0,
    completedChapters: 0,
    waves: [],
    enemies: [],
    buildings: [],
    projectiles: [],
    fams: {},
    hero: heroState(),
    beam: 0,
    auto: false,
    autoT: 0,
    lost: false,
    cpPending: 0,
    stats: { kills: 0, leaks: {}, interest: 0 },
    ch: { start: 0, lightLost: 0, interest: 0 },
    nextId: 1,
    bver: 1,
    // stage 3
    mapMods: {},
    spells: [],
    rules: [],
    knotCards: [],
    relics: [],
    pick: null,
    picks: [],
    fx: { goldRush: 0, shield: 0, fastHands: 0, draft: 0 },
    fires: [],
    puddles: [],
    free: {},
    breathCh: 0,
    pages: [],
    killCount: 0,
    // stage 4
    lastKillTypes: [],
    holdFire: false,
    finished: false,
    endless: false,
    best: 0,
    items: [],
    dark: null,
    fin: null,
    sec: {},
    mapDone: {},
    hugoT: 0,
  };
}

// Fills in everything that older saves do not have yet. Old saves also get the cards, relics and
// journal pages they would have received by now.
export function upgradeState(s) {
  const d = createState(s.seed || 1);
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  const hd = heroState();
  for (const k of Object.keys(hd)) if (s.hero[k] === undefined) s.hero[k] = hd[k];
  for (const k of Object.keys(d.fx)) if (s.fx[k] === undefined) s.fx[k] = 0;
  if ((s.v || 1) < 2) {
    for (const n of CARD_WAVES) if (n <= s.completedCount && n <= 10) s.picks.push({ kind: 'card', wave: n });
    for (const n of BOSS_WAVES) if (n <= s.completedCount && n <= 10) { s.picks.push({ kind: 'relic', wave: n }); s.pages.push(n / 10); }
    for (const e of s.enemies) if (!e.hist) e.hist = [];
    s.v = 2;
  }
  if (s.v < 3) s.v = 3;
  return s;
}

export class Game {
  constructor(state) {
    this.s = upgradeState(state);
    this.events = [];
    this.undoSnap = null;
    this.open = new Uint8Array(N);
    this.occ = new Int32Array(N);   // building id per cell (0 = none)
    this.dist = new Int16Array(N);
    this.tmpDist = new Int16Array(N);
    this.amp = new Uint8Array(N);   // 1 = towers on this cell are boosted by an amplifier
    this.wallAdj = new Uint8Array(N);
    this.pending = [];
    this.pathLen = 0;
    this.jammed = new Set();
    this.bankAdj = new Int32Array(N);
    this.rebuild();
    this.applyMapEvents(false);
    if (this.s.picks.length && !this.s.pick) this.nextPick();
  }

  static newGame(seed, opts) { return new Game(createState(seed, opts)); }

  toJSON() { return this.s; }
  serialize() { return JSON.stringify(this.s); }
  static fromJSON(obj) { return new Game(typeof obj === 'string' ? JSON.parse(obj) : obj); }

  emit(ev) {
    if (this.events.length > 4000) this.events.splice(0, 2000);
    this.events.push(ev);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }

  // ---------- owned cards ----------
  has(id) { const s = this.s; return s.rules.includes(id) || s.knotCards.includes(id) || s.relics.includes(id); }

  // ---------- derived data ----------

  rebuild() {
    const s = this.s;
    useMapMods(s.mapMods);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sec = sectorAt(x, y);
      this.open[idx(x, y)] = !sec || this.sectorOpen(sec) ? 1 : 0;
    }
    this.occ.fill(0);
    this.amp.fill(0);
    this.wallAdj.fill(0);
    this.byId = new Map();
    const ampR = this.has('fifth') ? 2 : 1;
    for (const b of s.buildings) {
      this.occ[idx(b.x, b.y)] = b.id;
      this.byId.set(b.id, b);
      b._beacon = this.nextToBeacon(b.x, b.y);
      if (b.wreck) continue;
      if (b.type === 'amplifier') {
        for (let dy = -ampR; dy <= ampR; dy++) for (let dx = -ampR; dx <= ampR; dx++) {
          if ((dx || dy) && inBounds(b.x + dx, b.y + dy)) this.amp[idx(b.x + dx, b.y + dy)] = 1;
        }
      }
      if (b.type === 'wall') for (const [dx, dy] of DIRS) if (inBounds(b.x + dx, b.y + dy)) this.wallAdj[idx(b.x + dx, b.y + dy)]++;
    }
    for (const b of s.buildings) b._nearMine = this.nearType(b.x, b.y, 'mine');
    this.bankAdj.fill(0);
    for (const b of s.buildings) {
      if ((b.type !== 'bank' && b.type !== 'vault') || b.wreck) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inBounds(b.x + dx, b.y + dy)) this.bankAdj[idx(b.x + dx, b.y + dy)] = b.id;
    }
    this.recomputeDist();
    secretSim.onRebuild(this);
  }

  sectorOpen(sec) {
    // Only unlock what exists in this version of the game.
    const n = this.s.completedCount;
    if (sec.closeAfter && n >= sec.closeAfter) return false;
    return n >= sec.unlockAfter && sec.unlockAfter < CONTENT_MAX_WAVE;
  }

  // Highest wave that can be played now (endless mode has no end).
  lastWave() { return this.s.endless ? Infinity : CONTENT_MAX_WAVE; }

  isOpen(x, y) { return inBounds(x, y) && this.open[idx(x, y)] === 1; }

  blocksAt(i) {
    const id = this.occ[i];
    if (!id) return false;
    const b = this.byId.get(id);
    return !!(b && !b.wreck && BUILDINGS[b.type].blocks);
  }

  walkable(i, extraBlock = -1, extraFree = -1) {
    if (!this.open[i]) return false;
    const x = i % W, y = (i / W) | 0;
    if (!tileAt(x, y).pass) return false;
    if (i === extraBlock) return false;
    if (i === extraFree) return true;
    return !this.blocksAt(i);
  }

  recomputeDist() {
    distanceField((i) => this.walkable(i), this.dist);
    let len = 0;
    for (const e of this.activeEntries()) { const d = this.dist[idx(e.x, e.y)]; if (d > 0 && (!len || d < len)) len = d; }
    this.pathLen = len;
  }

  // Entries that matter right now: the running waves and the next one.
  activeEntries() {
    const s = this.s;
    const seen = new Map();
    const waves = s.waves.map((w) => w.n);
    if (s.nextWave <= this.lastWave()) waves.push(s.nextWave);
    if (waves.length === 0) waves.push(Math.min(s.nextWave, this.lastWave()));
    for (const n of waves) {
      for (const e of entriesForWave(n)) {
        if (!this.isOpen(e.x, e.y)) continue;
        seen.set(e.key + ':' + e.x + ':' + e.y, e);
      }
    }
    return [...seen.values()];
  }

  // Entries that the next wave actually uses (for the preview highlight).
  waveEntries(n) {
    const w = getWave(n);
    if (!w) return [];
    const out = [];
    for (const key of Object.keys(w.groups)) {
      const p = entryPos(key, n);
      if (p) out.push({ key, x: p.x, y: p.y });
    }
    return out;
  }

  isActiveEntryCell(x, y) {
    return this.activeEntries().some((e) => e.x === x && e.y === y);
  }

  // Paths from all active entries to the lighthouse, optionally with a hypothetical change.
  paths(extraBlock = -1, extraFree = -1) {
    let dist = this.dist;
    if (extraBlock >= 0 || extraFree >= 0) {
      dist = distanceField((i) => this.walkable(i, extraBlock, extraFree), this.tmpDist);
    }
    return this.activeEntries().map((e) => ({ key: e.key, cells: dist[idx(e.x, e.y)] >= 0 ? followField(dist, e.x, e.y) : [] }));
  }

  // When the map changes (a new entry opens), no entry may be left without a way to the lighthouse.
  // Buildings in the way are given back for their full price.
  ensureEntriesOpen() {
    let changed = false;
    for (const e of this.activeEntries()) {
      if (this.dist[idx(e.x, e.y)] >= 0) continue;
      // 0-1 search: walking through a blocking building costs 1, through a free cell 0.
      const cost = new Int32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1);
      const dq = [idx(GOAL.x, GOAL.y)];
      cost[dq[0]] = 0;
      let head = 0;
      const ok = (i) => { const x = i % W, y = (i / W) | 0; return this.open[i] && tileAt(x, y).pass; };
      while (head < dq.length) {
        const c = dq[head++];
        const cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (!inBounds(nx, ny)) continue;
          const ni = idx(nx, ny);
          if (!ok(ni)) continue;
          const nc = cost[c] + (this.blocksAt(ni) ? 1 : 0);
          if (nc < cost[ni]) { cost[ni] = nc; prev[ni] = c; dq.push(ni); }
        }
      }
      let c = idx(e.x, e.y);
      if (cost[c] >= 1e9) continue;
      while (c >= 0) {
        if (this.blocksAt(c)) {
          const b = this.byId.get(this.occ[c]);
          this.s.gold += b.paid;
          this.s.buildings = this.s.buildings.filter((o) => o.id !== b.id);
          this.emit({ k: 'refund', id: b.id, x: b.x, y: b.y, gold: b.paid });
          this.occ[c] = 0; this.byId.delete(b.id);
          changed = true;
        }
        c = prev[c];
      }
    }
    if (changed) { this.s.bver++; this.rebuild(); }
    return changed;
  }

  // ---------- queries ----------

  phase() { return this.s.waves.length > 0 ? 'combat' : 'build'; }

  maxLevel() {
    let m = 1;
    for (const st of MAX_LEVEL_STEPS) if (this.s.completedCount >= st.after) m = st.max;
    return m;
  }

  isUnlocked(type) {
    const d = BUILDINGS[type];
    return !!d && d.implemented && this.s.completedCount >= d.unlockAfter;
  }

  abilityUnlocked(id) { return this.s.completedCount >= (ABILITY_UNLOCK[id] ?? 999); }

  limitOf(type) {
    const d = BUILDINGS[type];
    if (!d.limit) return Infinity;
    let m = 0;
    for (const st of d.limit) if (this.s.completedCount >= st.after) m = st.max;
    return m;
  }
  countOf(type) { let n = 0; for (const b of this.s.buildings) if (b.type === type) n++; return n; }

  mineUnits() {
    let n = 0;
    for (const b of this.s.buildings) if (b.type === 'mine') n += 1 << (b.level - 1);
    return n;
  }

  buildCost(type) {
    const d = BUILDINGS[type];
    if (type === 'wall' && this.has('mason')) return 0;
    if (d.tower && this.s.free[type]) return 0;
    if (type === 'mine') return d.cost + d.costStep * this.mineUnits();
    return d.cost;
  }

  sellValue(b) {
    const f = this.phase() === 'build' || this.has('recycle') ? ECONOMY.sellBuild : ECONOMY.sellCombat;
    return Math.floor(b.paid * f * (b.wreck ? WRECK.sellShare : 1));
  }

  interestRate() { return (this.hasBank() ? BUILDINGS.bank.rate : ECONOMY.interestRate) + (this.has('compound') ? 0.02 : 0); }
  interestCap() { return (ECONOMY.interestCapBase + ECONOMY.interestCapPerChapter * this.s.completedChapters) * (this.has('tide') ? 2 : 1) * (this.hasBank() ? BUILDINGS.bank.capMul : 1); }
  interestPreview() { return Math.min(this.interestCap(), Math.floor(this.s.gold * this.interestRate())); }

  mineYield(b, kills = 0) {
    if (b.wreck) return 0;
    const d = BUILDINGS.mine;
    let y = d.yield[b.level] || 0;
    if (tileAt(b.x, b.y).ore) y *= TERRAIN.oreMine;
    if (this.has('doubleShift')) y = Math.round(y * 1.5);
    if (this.has('overtime')) y += Math.min(5, Math.floor(kills / 10));
    return y;
  }
  minesPreview(kills = 0) {
    let sum = 0;
    for (const b of this.s.buildings) if (b.type === 'mine') sum += this.mineYield(b, kills);
    return sum;
  }

  nextToBeacon(x, y) {
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (inBounds(nx, ny) && tileAt(nx, ny).beacon) return true;
    }
    return false;
  }
  nearType(x, y, type) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const b = this.buildingAt(x + dx, y + dy);
      if (b && b.type === type && !b.wreck) return true;
    }
    return false;
  }

  heroActive() { return this.s.hero.down <= 0; }

  // ---------- Knot's numbers (with level-ups and cards) ----------
  heroSpeed() { const u = this.s.hero.ups; return HERO.speed * (1 + 0.15 * (u.agility || 0) + (this.has('boots') ? 0.4 : 0)) * secretSim.heroSpeedMod(this); }
  heroDmg() { return HERO.attackDmg * (1 + 0.2 * (this.s.hero.ups.power || 0)) * (this.has('mys4') ? 3 : 1); }
  heroMaxHp() { return HERO.hp + 25 * (this.s.hero.ups.stamina || 0); }
  auraRange() { return HERO.auraRange + 0.5 * (this.s.hero.ups.reach || 0) + (this.has('leader') ? 1 : 0) + (this.has('letter') ? 1 : 0) + (this.has('hugoCap') ? 1 : 0) - (this.has('mys5') ? 0.5 : 0); }
  auraBonus() { return HERO.auraBonus + 0.05 * (this.s.hero.ups.command || 0) + (this.has('leader') ? 0.1 : 0) + (this.has('letter') ? 0.1 : 0); }
  abilityRate() { return (1 + 0.1 * (this.s.hero.ups.handy || 0)) * (this.has('whistle') ? 2 : 1); }
  revealRange() { return this.has('sunny') ? 4 : HERO.revealRange; }
  strikeRadius() { return HERO.strike.radius * (this.has('heavyWrench') ? 1.5 : 1); }

  heroAura(b) {
    const h = this.s.hero;
    if (h.down > 0 || h.swallowT > 0) return false;
    return Math.hypot(b.x + 0.5 - h.x, b.y + 0.5 - h.y) <= this.auraRange();
  }

  buildingAt(x, y) {
    if (!inBounds(x, y)) return null;
    const id = this.occ[idx(x, y)];
    return id ? this.byId.get(id) : null;
  }

  enemyCells() {
    const set = new Set();
    for (const e of this.s.enemies) {
      if (e.dead || e.fly) continue;
      set.add(idx(e.cx, e.cy));
      set.add(idx(e.nx, e.ny));
      set.add(idx(Math.floor(e.x), Math.floor(e.y)));
    }
    return set;
  }

  heroCells() {
    const h = this.s.hero;
    const set = new Set([idx(Math.floor(h.x), Math.floor(h.y))]);
    if (h.path.length) set.add(idx(h.path[0][0], h.path[0][1]));
    return set;
  }

  // Check whether a building can be placed. Returns { ok, reason }.
  canBuild(type, x, y, ignoreGold = false) {
    const d = BUILDINGS[type];
    if (!d) return { ok: false, reason: 'cantBuildHere' };
    if (!this.isUnlocked(type)) return { ok: false, reason: 'locked' };
    if (!inBounds(x, y) || !this.isOpen(x, y)) return { ok: false, reason: 'cantBuildHere' };
    const t = tileAt(x, y);
    if (!t.build) return { ok: false, reason: 'cantBuildHere' };
    if (this.isActiveEntryCell(x, y)) return { ok: false, reason: 'cantBuildHere' };
    if (this.occ[idx(x, y)]) return { ok: false, reason: 'cantBuildHere' };
    const i = idx(x, y);
    if (d.blocks && this.enemyCells().has(i)) return { ok: false, reason: 'enemyHere' };
    if (d.blocks && this.heroCells().has(i)) return { ok: false, reason: 'heroHere' };
    if (this.countOf(type) >= this.limitOf(type)) return { ok: false, reason: 'limit' };
    if (!ignoreGold && this.s.gold < this.buildCost(type)) return { ok: false, reason: 'noGold' };
    if (d.blocks && !this.pathStaysOpen(i)) return { ok: false, reason: 'blocked' };
    return { ok: true };
  }

  // True when blocking cell i still leaves a way to the lighthouse for every entry and every enemy.
  pathStaysOpen(i) {
    const dist = distanceField((c) => this.walkable(c, i), this.tmpDist);
    for (const e of this.activeEntries()) if (dist[idx(e.x, e.y)] < 0) return false;
    for (const e of this.s.enemies) {
      if (e.dead || e.fly || e.ram) continue;
      if (dist[idx(e.nx, e.ny)] < 0 && !(e.nx === GOAL.x && e.ny === GOAL.y)) return false;
    }
    return true;
  }

  canMerge(src, dst) {
    if (!src || !dst || src.id === dst.id) return { ok: false, reason: 'cantMerge' };
    const d = BUILDINGS[src.type];
    if (src.wreck || dst.wreck) return { ok: false, reason: 'wrecked' };
    const hy = src.type !== dst.type ? this.hybridResult(src, dst) : null;
    if (hy) return { ok: true, hybrid: hy };
    if (src.type !== dst.type || src.level !== dst.level || !d.mergeable) return { ok: false, reason: 'cantMerge' };
    if (dst.level + 1 > this.maxLevel()) return { ok: false, reason: 'maxLevel' };
    return { ok: true };
  }

  // Merging into this level asks the player for a specialisation.
  needsSpec(dst, src) { return (!src || src.type === dst.type) && dst.level + 1 === 3 && !!SPECS[dst.type]; }

  mergePartners(b) {
    return this.s.buildings.filter((o) => this.canMerge(b, o).ok);
  }

  wavePreview(n) {
    const w = getWave(n);
    if (!w) return null;
    const entries = {};
    let learn = null;
    for (const segs of Object.values(w.groups)) for (const seg of segs) if (ENEMIES[seg.type].learn && seg.resist !== undefined) learn = seg.resist === 'all' ? 'all' : seg.resist ? this.resistFor(seg.resist) : [];
    if (w.quiet) return { n, entries, boss: null, quiet: true };
    for (const [key, segs] of Object.entries(w.groups)) {
      const list = [];
      for (const seg of segs) {
        const k = seg.type + (seg.golden ? '*' : '');
        const found = list.find((l) => l.k === k);
        if (found) found.count += seg.count;
        else list.push({ k, type: seg.type, golden: !!seg.golden, count: seg.count });
      }
      entries[key] = list;
    }
    return { n, entries, boss: w.boss || null, learn, mutation: w.mutation || null, endless: !!w.endless };
  }

  currentWaveNumber() {
    const s = this.s;
    if (s.waves.length) return Math.max(...s.waves.map((w) => w.n));
    return Math.min(s.nextWave, this.lastWave());
  }

  canStartWave() {
    const s = this.s;
    if (s.fin && !s.fin.done) return false;
    // the finale cannot be called early, it must start on its own
    if (s.waves.length && s.nextWave >= TOTAL_WAVES - 1 && s.nextWave <= TOTAL_WAVES) return false;
    return !s.lost && s.nextWave <= this.lastWave() && !s.pick;
  }

  // ---------- commands (player actions) ----------

  snapshotForUndo() {
    if (this.phase() !== 'build') { this.undoSnap = null; return; }
    this.undoSnap = JSON.stringify({ b: this.s.buildings, g: this.s.gold, id: this.s.nextId, f: this.s.free });
  }

  canUndo() { return !!this.undoSnap && this.phase() === 'build'; }

  undo() {
    if (!this.canUndo()) return { ok: false };
    const u = JSON.parse(this.undoSnap);
    // Do not undo onto a cell where Knot stands now.
    const hc = this.heroCells();
    for (const b of u.b) if (hc.has(idx(b.x, b.y)) && !this.buildingAt(b.x, b.y) && BUILDINGS[b.type].blocks && !b.wreck) return { ok: false, reason: 'heroHere' };
    this.s.buildings = u.b;
    this.s.gold = u.g;
    this.s.nextId = u.id;
    this.s.free = u.f || {};
    this.undoSnap = null;
    this.s.bver++;
    this.rebuild();
    this.emit({ k: 'undo' });
    return { ok: true };
  }

  build(type, x, y) {
    const c = this.canBuild(type, x, y);
    if (!c.ok) return c;
    this.snapshotForUndo();
    const cost = this.buildCost(type);
    const s = this.s;
    s.gold -= cost;
    if (BUILDINGS[type].tower && s.free[type]) delete s.free[type];
    const b = { id: s.nextId++, type, x, y, level: 1, paid: cost, cd: 0, mode: 'first', dmg: 0, aim: 0 };
    b._beacon = this.nextToBeacon(x, y);
    s.buildings.push(b);
    s.bver++;
    this.rebuild();
    this.emit({ k: 'build', id: b.id, type, x, y });
    return { ok: true, id: b.id };
  }

  sell(id) {
    const s = this.s;
    const b = this.byId.get(id);
    if (!b) return { ok: false };
    this.snapshotForUndo();
    const v = this.sellValue(b);
    s.gold += v;
    s.buildings = s.buildings.filter((o) => o.id !== id);
    s.bver++;
    this.rebuild();
    this.emit({ k: 'sell', id, x: b.x, y: b.y, gold: v, type: b.type, level: b.level, nm: b.nm || 0 });
    return { ok: true, gold: v };
  }

  merge(srcId, dstId, spec) {
    const src = this.byId.get(srcId), dst = this.byId.get(dstId);
    const c = this.canMerge(src, dst);
    if (!c.ok) return c;
    if (c.hybrid) {
      this.snapshotForUndo();
      const from = dst.type;
      dst.type = c.hybrid;
      delete dst.spec;
      if (dst.mode === 'strong' && from === 'archer') dst.mode = 'first';
      dst.paid += src.paid;
      dst.cd = 0;
      let refund = 0;
      if (this.has('thrifty')) { refund = Math.floor(dst.paid * 0.15); dst.paid -= refund; this.s.gold += refund; }
      this.s.buildings = this.s.buildings.filter((o) => o.id !== srcId);
      this.s.bver++;
      this.rebuild();
      this.emit({ k: 'merge', id: dst.id, x: dst.x, y: dst.y, fx: src.x, fy: src.y, level: dst.level, spec: null, refund, hybrid: c.hybrid, from, from2: src.type });
      return { ok: true, hybrid: c.hybrid };
    }
    const needSpec = this.needsSpec(dst, src);
    if (needSpec && spec !== 'A' && spec !== 'B') return { ok: false, reason: 'needSpec' };
    this.snapshotForUndo();
    dst.level += 1;
    dst.paid += src.paid;
    if (needSpec) {
      dst.spec = spec;
      if (SPECS[dst.type][spec].mode) dst.mode = SPECS[dst.type][spec].mode;
    }
    let refund = 0;
    if (this.has('thrifty')) { refund = Math.floor(dst.paid * 0.15); dst.paid -= refund; this.s.gold += refund; }
    this.s.buildings = this.s.buildings.filter((o) => o.id !== srcId);
    this.s.bver++;
    this.rebuild();
    this.emit({ k: 'merge', id: dst.id, x: dst.x, y: dst.y, fx: src.x, fy: src.y, level: dst.level, spec: dst.spec || null, refund });
    return { ok: true };
  }

  setTargeting(id, mode) {
    const b = this.byId.get(id);
    if (!b || !BUILDINGS[b.type].tower) return { ok: false };
    if (!TARGET_MODES.includes(mode)) mode = TARGET_MODES[(TARGET_MODES.indexOf(b.mode) + 1) % TARGET_MODES.length];
    b.mode = mode;
    return { ok: true, mode };
  }

  setDifficulty(d) {
    if (DIFFICULTY[d] === undefined) return { ok: false };
    this.s.difficulty = d;
    return { ok: true };
  }

  setAuto(on) {
    this.s.auto = !!on;
    if (on && this.phase() === 'build' && this.s.autoT <= 0 && this.s.completedCount > 0 && this.canStartWave()) this.s.autoT = AUTO_START_DELAY;
    if (!on) this.s.autoT = 0;
    return { ok: true };
  }

  heroWalkable(i) {
    if (!this.open[i]) return false;
    const x = i % W, y = (i / W) | 0;
    const t = tileAt(x, y);
    if (!t.pass || t.goal) return false;
    return !this.blocksAt(i);
  }

  heroMove(x, y) {
    const h = this.s.hero;
    if (h.down > 0) return { ok: false, reason: 'heroDown' };
    if (h.swallowT > 0) return { ok: false, reason: 'heroCantGo' };
    if (!inBounds(x, y) || !this.heroWalkable(idx(x, y))) return { ok: false, reason: 'heroCantGo' };
    let sx = Math.floor(h.x), sy = Math.floor(h.y);
    if (!this.heroWalkable(idx(sx, sy)) && h.path.length) { sx = h.path[0][0]; sy = h.path[0][1]; }
    const p = findPath((i) => this.heroWalkable(i), sx, sy, x, y);
    if (!p) return { ok: false, reason: 'heroCantGo' };
    // Start by walking to the centre of the current cell.
    h.path = [[sx, sy], ...p];
    h.tx = x; h.ty = y;
    h.plugT = 0;
    h.repT = 0;
    this.emit({ k: 'heroMove', x, y });
    return { ok: true };
  }

  heroStrike() {
    const s = this.s, h = s.hero;
    if (h.down > 0 || h.cd > 0 || this.phase() !== 'combat' || h.swallowT > 0) return { ok: false };
    const st = HERO.strike;
    const dmg = st.dmg * hpGrowth(this.currentWaveNumber()) * (1 + 0.2 * (h.ups.power || 0));
    const r = this.strikeRadius(), extra = this.has('heavyWrench') ? 1 : 0;
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - h.x, e.y - h.y) > r) continue;
      e.stunT = Math.max(e.stunT, (e.boss || e.part ? st.bossStun : st.stun) + extra);
      this.damage(e, dmg, 'knot', 'hero');
    }
    this.flushPending();
    h.cd = st.cooldown * (this.has('mys2') ? 1.5 : 1);
    h.swing = 0.5;
    this.emit({ k: 'strike', x: h.x, y: h.y, r });
    return { ok: true };
  }

  // Zátka: Knot stands still and blocks his cell for a while.
  heroPlug() {
    const s = this.s, h = s.hero;
    if (!this.abilityUnlocked('plug') || h.down > 0 || h.cd2 > 0 || this.phase() !== 'combat' || h.swallowT > 0) return { ok: false };
    h.path = [];
    h.plugX = Math.floor(h.x); h.plugY = Math.floor(h.y);
    h.x = h.plugX + 0.5; h.y = h.plugY + 0.5;
    h.plugT = HERO.plug.time;
    h.cd2 = HERO.plug.cooldown;
    this.emit({ k: 'plug', x: h.x, y: h.y });
    return { ok: true };
  }

  startWave() {
    const s = this.s;
    if (!this.canStartWave()) return { ok: false };
    const n = s.nextWave;
    const def = getWave(n);
    if (!def) return { ok: false };
    const called = s.waves.length > 0;
    const q = [];
    for (const [entry, segs] of Object.entries(def.groups)) {
      let prevStart = 0, prevEnd = 0;
      segs.forEach((seg, i) => {
        const gap = seg.gap ?? DEFAULT_GAP;
        let start;
        if (i === 0) start = seg.delay ?? 0;
        else if (seg.parallel) start = prevStart + (seg.delay ?? 0);
        else start = prevEnd + (seg.delay ?? DEFAULT_PAUSE);
        for (let k = 0; k < seg.count; k++) {
          const it = { t: start + k * gap, e: entry, type: seg.type, hpMul: seg.hpMul || 1, golden: !!seg.golden };
          for (const key of ['gold', 'resist', 'shift', 'armor', 'invisible', 'ret']) if (seg[key] !== undefined) it[key] = seg[key];
          q.push(it);
        }
        prevStart = start;
        prevEnd = start + (seg.count - 1) * gap;
      });
    }
    q.forEach((it, i) => { it.o = i; });
    q.sort((a, b) => a.t - b.t || a.o - b.o);
    const w = { n, t: 0, q, qi: 0, alive: 0, called, boss: def.boss || null, kills: 0, leaked: false, kt: {} };
    if (def.mutation) w.mut = def.mutation;
    if (q.some((it) => it.shift)) w.mid = q[q.length - 1].t / 2 + 2;
    s.waves.push(w);
    s.nextWave += 1;
    s.autoT = 0;
    for (const sp of s.spells) sp.used = false;
    this.undoSnap = null;
    this.emit({ k: 'waveStart', n, called, boss: def.boss || null, chapterStart: n % 10 === 1 && n <= TOTAL_WAVES, mutation: def.mutation || null });
    secretSim.onWaveStart(this, w);
    return { ok: true, n };
  }

  // ---------- simulation ----------

  step() {
    const s = this.s;
    if (s.lost) return;
    if (mapModsInUse() !== s.mapMods) useMapMods(s.mapMods);
    const dt = STEP;
    s.tick++;
    if (!(s.sec.beamT > 0)) s.beam = (s.beam + dt * Math.PI * 2 / BEAM.period * (this.has('mirror') ? 1.5 : 1)) % (Math.PI * 2);
    for (const k in s.fx) if (s.fx[k] > 0) s.fx[k] = Math.max(0, s.fx[k] - dt);

    if (s.waves.length === 0 && s.auto && s.autoT > 0) {
      s.autoT -= dt;
      if (s.autoT <= 0) { s.autoT = 0; this.startWave(); }
    }

    this.updateSpawns(dt);
    this.updateEnemies(dt);
    this.updateHero(dt);
    secretSim.step(this, dt);
    this.updateVisibility(dt);
    this.updateJam(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateGround(dt);
    this.flushPending();
    if (s.enemies.some((e) => e.dead)) s.enemies = s.enemies.filter((e) => !e.dead);
    if (s.projectiles.some((p) => p.dead)) s.projectiles = s.projectiles.filter((p) => !p.dead);

    if (s.light <= 0 && !s.lost) {
      // Lost: the wave does not count and no checkpoint is made.
      s.light = 0;
      s.lost = true;
      s.cpPending = 0;
      this.emit({ k: 'lost' });
      return;
    }

    this.checkWaves();
  }

  flushPending() {
    if (!this.pending.length) return;
    for (const e of this.pending) this.s.enemies.push(e);
    this.pending = [];
  }

  waveOf(n) { return this.s.waves.find((x) => x.n === n) || null; }

  updateSpawns(dt) {
    const s = this.s;
    for (const w of s.waves) {
      w.t += dt;
      while (w.qi < w.q.length && w.q[w.qi].t <= w.t) {
        const it = w.q[w.qi++];
        const p = entryPos(it.e, w.n);
        if (!p) continue;
        this.spawnEnemy(it.type, w, it.e, p.x, p.y, it);
      }
      if (w.mid) this.waveShift(w);
    }
  }

  // Adds enemies to a running wave's queue (reinforcements).
  queueSpawn(w, entry, type, delay, hpMul = 1) {
    const it = { t: w.t + delay, e: entry, type, hpMul, golden: false, o: 0 };
    let i = w.qi;
    while (i < w.q.length && w.q[i].t <= it.t) i++;
    w.q.splice(i, 0, it);
  }

  spawnEnemy(type, wave, entry, x, y, opts = {}) {
    const s = this.s;
    const d = ENEMIES[type];
    const wn = wave.n;
    const diff = DIFFICULTY[s.difficulty] ?? 1;
    let hp;
    if (opts.rootHp) hp = opts.rootHp * opts.hpFrac;
    else if (opts.hp) hp = opts.hp;
    else hp = d.hp * hpGrowth(wn) * diff * (opts.hpMul || 1) * chapterHp(wn, d);
    if (opts.ret && !opts.rootHp) hp *= RETURN_HP;
    if (this.has('hardSchool')) hp *= 1.1;
    if ((d.boss || d.mini) && this.has('rustyCrown') && !opts.rootHp) hp *= 0.85;
    let speed = d.speed, gold = d.gold, light = LIGHT_BY_SIZE[d.size] ?? 5;
    if (opts.golden) { hp *= GOLDEN.hpMul; speed = d.speed > 0 ? Math.max(GOLDEN.speed, d.speed) : 0; gold = opts.gold || GOLDEN.gold; light = GOLDEN.light; }
    gold = Math.round(gold * (1 + GOLD_GROWTH * wn));
    const e = {
      id: s.nextId++, type, w: wn, ent: entry,
      x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5, vx: 0, vy: 0, sx: x + 0.5, sy: y + 0.5,
      cx: x, cy: y, nx: x, ny: y, dir: -1,
      hp, mhp: hp, spd: speed, armor: d.armor ? ARMOR_BASE + ARMOR_PER_WAVE * wn : 0, shred: 0,
      gold, light, slowT: 0, slowF: 0, stunT: opts.stun || 0,
      fly: !!d.fly, boss: !!d.boss, part: !!d.bossPart, mini: !!d.mini, golden: !!opts.golden,
      ram: !!d.ram, inv: !!d.invisible, vis: !d.invisible, revT: 0,
      fam: opts.fam || 0, root: opts.rootHp || 0, dead: false,
      seed: rnd(s.rng), hist: [],
    };
    if (opts.ret) e.ret = 1;
    if (d.steal) { e.stolen = 0; e.robbed = []; }
    if (opts.armor && !e.armor) e.armor = ARMOR_BASE + ARMOR_PER_WAVE * wn;
    if (opts.invisible) { e.inv = true; e.vis = false; }
    if (d.learn) { e.res = this.resistFor(opts.resist ?? 1, wave.shiftKt); if (opts.shift) e.shiftRes = opts.resist ?? 1; }
    if (d.adapt || d.shift) { e.res = []; e.adT = 0; e.dmgBy = {}; }
    if (d.burrow) e.bur = { n: 0, t: d.burrow.up, under: false };
    if (d.egg) e.hatchT = d.egg.hatch;
    if (d.popup) e.popT = d.popup;
    if (d.sling) e.slingT = 2;
    if (d.messenger) e.messenger = true;
    if (wave.mut && !opts.rootHp) this.mutate(e, wave.mut);
    if (d.demolish) { e.demT = 0; e.demId = 0; e.demN = 0; }
    if (d.brood) e.broodT = 0;
    if (d.reinforce) e.reinT = 0;
    if (d.relocate) e.rel = 0;
    if (opts.cx !== undefined) {
      e.cx = opts.cx; e.cy = opts.cy; e.nx = opts.nx; e.ny = opts.ny; e.dir = opts.dir;
      e.x = opts.x; e.y = opts.y; e.px = e.x; e.py = e.y;
      if (opts.hist) e.hist = opts.hist.slice();
    } else if (e.ram) {
      this.ramNext(e);
    } else if (!e.fly) {
      this.pickNext(e);
    }
    if (d.boss && !d.heart) {
      e.fam = e.id;
      e.root = hp;
      s.fams[e.fam] = { alive: 1, leaked: false, type };
    }
    if (d.boss && !opts.quiet) this.emit({ k: 'bossSpawn', type, id: e.id, x: e.x, y: e.y, ret: !!opts.ret });
    wave.alive++;
    if (opts.deferred) this.pending.push(e); else s.enemies.push(e);
    secretSim.onSpawn(this, e, opts);
    return e;
  }

  pickNext(e) {
    const d = nextDir(this.dist, e.cx, e.cy, e.dir);
    if (d < 0) { e.nx = e.cx; e.ny = e.cy; return false; }
    e.dir = d;
    e.nx = e.cx + DIRS[d][0];
    e.ny = e.cy + DIRS[d][1];
    return true;
  }

  // Straight line to the lighthouse: first along the column, then sideways.
  ramNext(e) {
    if (e.cy < GOAL.y) { e.dir = 2; e.nx = e.cx; e.ny = e.cy + 1; }
    else if (e.cx !== GOAL.x) { e.dir = e.cx < GOAL.x ? 1 : 3; e.nx = e.cx + (e.cx < GOAL.x ? 1 : -1); e.ny = e.cy; }
    else { e.nx = e.cx; e.ny = e.cy; return false; }
    return true;
  }

  // Speed after slowing, mud and spells.
  speedOf(e) {
    const d = ENEMIES[e.type];
    let sp = e.spd;
    if (d.noSlow) return sp;
    if (e.slowT > 0) sp *= 1 - e.slowF;
    if (this.s.fx.draft > 0) sp *= 0.7;
    if (!e.fly && !e.ram && !d.mudFree) {
      const t = tileAt(Math.floor(e.x), Math.floor(e.y));
      if (t.mud) sp *= this.has('deepMud') ? 0.5 : TERRAIN.mudEnemy;
    }
    return sp;
  }

  applySlow(e, f, dur) {
    if (ENEMIES[e.type].noSlow) return false;
    if (this.has('eternalIce')) dur *= 2;
    e.slowF = Math.max(e.slowT > 0 ? e.slowF : 0, f);
    e.slowT = Math.max(e.slowT, dur);
    return true;
  }

  updateEnemies(dt) {
    const s = this.s, h = s.hero;
    const plug = h.plugT > 0 && h.down <= 0;
    for (const e of s.enemies) {
      e.px = e.x; e.py = e.y;
      if (e.dead) continue;
      const d = ENEMIES[e.type];
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) { e.slowT = 0; e.slowF = 0; } }
      if (e.revT > 0) e.revT -= dt;
      if (e.brittleT > 0) e.brittleT -= dt;
      if (e.markT > 0) e.markT -= dt;
      if (e.home || e.frozen) { e.vx = 0; e.vy = 0; continue; }
      if (d.egg) { e.hatchT -= dt; if (e.hatchT <= 0) this.hatch(e, d.egg); continue; }
      if (d.burrow && this.burrowTick(e, d.burrow, dt)) { e.vx = 0; e.vy = 0; continue; }
      if (d.popup) { e.popT -= dt; if (e.popT <= 0) { this.vanish(e); continue; } }
      if (e.regen && e.hp < e.mhp) e.hp = Math.min(e.mhp, e.hp + e.mhp * e.regen * dt);
      if (d.adapt) this.adaptTick(e, d.adapt, dt);
      if (d.shift) this.shiftTick(e, d.shift, dt);
      if (d.heal) this.healAround(e, d.heal, dt);
      if (d.brood) this.brood(e, d.brood, dt);
      if (d.reinforce) this.reinforce(e, d.reinforce, dt);
      if (d.sling) this.sling(e, d.sling, dt);
      if (e.stunT > 0) { e.stunT -= dt; e.vx = 0; e.vy = 0; continue; }
      if (e.waitT > 0) { e.waitT -= dt; e.vx = 0; e.vy = 0; continue; }
      if (e.demT > 0) { this.demolishTick(e, dt); e.vx = 0; e.vy = 0; continue; }
      e.blocked = false;
      const sp = this.speedOf(e);
      if (e.fly) {
        const tx = GOAL.x + 0.5, ty = GOAL.y + 0.5;
        const dx = tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy);
        const m = sp * dt;
        if (dd <= m) { this.leak(e); continue; }
        e.x += dx / dd * m; e.y += dy / dd * m;
      } else {
        // Knot's Plug: an enemy whose next cell is Knot's waits in front of him.
        if (plug && !e.ram && e.nx === h.plugX && e.ny === h.plugY && !(e.cx === h.plugX && e.cy === h.plugY) &&
            Math.hypot(e.x - (h.plugX + 0.5), e.y - (h.plugY + 0.5)) <= HERO.plug.hold) {
          e.blocked = true; e.vx = 0; e.vy = 0;
          continue;
        }
        let m = sp * dt;
        for (let guard = 0; guard < 4 && m > 0; guard++) {
          const tx = e.nx + 0.5, ty = e.ny + 0.5;
          const dx = tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy);
          if (dd > m) { e.x += dx / dd * m; e.y += dy / dd * m; m = 0; break; }
          e.x = tx; e.y = ty; m -= dd;
          if (e.nx !== e.cx || e.ny !== e.cy) {
            e.hist.push(idx(e.cx, e.cy));
            if (e.hist.length > 12) e.hist.shift();
          }
          e.cx = e.nx; e.cy = e.ny;
          if (e.cx === GOAL.x && e.cy === GOAL.y) { this.leak(e); break; }
          if (e.ram) { if (this.ramEnter(e)) break; if (!this.ramNext(e)) break; continue; }
          if (d.steal) this.stealNear(e, d.steal);
          if (this.bankAdj[idx(e.cx, e.cy)]) this.bankSteal(e);
          if (d.demolish && this.demolishStart(e, d.demolish)) break;
          if (!this.pickNext(e)) break;
        }
      }
      e.vx = (e.x - e.px) / dt; e.vy = (e.y - e.py) / dt;
    }
  }

  // ---------- special enemies ----------

  healAround(e, heal, dt) {
    // a stunned or frozen healer does not heal (otherwise frozen healers keep each other alive for ever)
    if (e.stunT > 0 || e.frozen) return;
    let any = false;
    for (const o of this.s.enemies) {
      if (o === e || o.dead || o.hp >= o.mhp) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) > heal.r) continue;
      o.hp = Math.min(o.mhp, o.hp + o.mhp * heal.pct * dt);
      any = true;
    }
    e.healFx = (e.healFx || 0) + dt;
    if (any && e.healFx > 0.6) { e.healFx = 0; this.emit({ k: 'heal', id: e.id, x: e.x, y: e.y }); }
  }

  brood(e, b, dt) {
    if (e.stunT > 0 || e.frozen) return;
    e.broodT += dt;
    const every = b.fastBelow && e.hp / e.mhp < b.fastBelow ? b.every / 2 : b.every;
    if (e.broodT < every) return;
    e.broodT = 0;
    const w = this.waveOf(e.w);
    if (!w) return;
    for (let k = 0; k < b.count; k++) {
      this.spawnEnemy(b.type, w, e.ent, e.cx, e.cy, {
        deferred: true, cx: e.cx, cy: e.cy, nx: e.nx, ny: e.ny, dir: e.dir,
        x: e.x + (k - (b.count - 1) / 2) * 0.12, y: e.y, stun: 0.3 + k * 0.35, hist: e.hist,
      });
    }
    this.emit({ k: 'brood', x: e.x, y: e.y, n: b.count });
  }

  reinforce(e, r, dt) {
    e.reinT += dt;
    if (e.reinT < r.every) return;
    e.reinT = 0;
    const w = this.waveOf(e.w);
    if (!w || !entryPos(r.entry, w.n)) return;
    let t = 0;
    for (const [type, count] of r.list) for (let k = 0; k < count; k++) { this.queueSpawn(w, r.entry, type, t); t += 0.9; }
    this.emit({ k: 'reinforce', entry: r.entry });
  }

  // Sběrač: takes gold from every mine next to the cell it walks into.
  stealNear(e, amount) {
    if (secretSim.vault(this, e)) return;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const b = this.buildingAt(e.cx + dx, e.cy + dy);
      if (!b || b.type !== 'mine' || b.wreck || e.robbed.includes(b.id)) continue;
      e.robbed.push(b.id);
      const g = Math.min(amount, Math.floor(this.s.gold));
      if (g <= 0) continue;
      this.s.gold -= g;
      e.stolen += g;
      this.emit({ k: 'steal', id: e.id, x: e.x, y: e.y, mx: b.x, my: b.y, gold: g });
    }
  }

  canDemolish(b, level) {
    return b && !b.wreck && b.level <= level && b.type !== 'teleport';
  }

  // Bourač: stops next to a weak building, swings and wrecks it.
  demolishStart(e, dem) {
    if (e.demN >= dem.max) return false;
    for (const [dx, dy] of DIRS) {
      const b = this.buildingAt(e.cx + dx, e.cy + dy);
      if (!this.canDemolish(b, dem.level)) continue;
      if (b.resistWave === this.currentWaveNumber()) continue;
      e.demT = dem.time; e.demId = b.id;
      e.vx = 0; e.vy = 0;
      this.emit({ k: 'demolishStart', id: e.id, bid: b.id, x: e.x, y: e.y, bx: b.x, by: b.y });
      return true;
    }
    return false;
  }

  demolishTick(e, dt) {
    e.demT -= dt;
    if (e.demT > 0) return;
    e.demT = 0;
    const b = this.byId.get(e.demId);
    e.demId = 0;
    e.demN++;
    if (b && this.canDemolish(b, ENEMIES[e.type].demolish.level)) {
      if (this.has('foundations') && b.resistWave !== this.currentWaveNumber()) {
        b.resistWave = this.currentWaveNumber();
        this.emit({ k: 'resist', id: b.id, x: b.x, y: b.y });
      } else this.wreck(b);
    }
    this.pickNext(e);
  }

  wreck(b) {
    b.wreck = true;
    b.cd = 0;
    this.s.bver++;
    this.rebuild();
    // enemies that were heading somewhere now take the new shortest way
    this.emit({ k: 'wreck', id: b.id, x: b.x, y: b.y, type: b.type, level: b.level });
  }

  // A ram enters a new cell: wrecks the building there, breaks (or jumps over) a rock.
  // Returns true when it has to stop for a moment.
  ramEnter(e) {
    const d = ENEMIES[e.type];
    const b = this.buildingAt(e.cx, e.cy);
    let stop = false;
    if (b && !b.wreck) { this.wreck(b); e.stunT = Math.max(e.stunT, 0.35); stop = true; }
    const t = tileAt(e.cx, e.cy);
    if (t.kind === 'rock') {
      if (d.ram.breakRock) {
        this.s.mapMods[idx(e.cx, e.cy)] = '.';
        useMapMods(this.s.mapMods);
        this.s.bver++;
        this.rebuild();
        e.stunT = Math.max(e.stunT, 0.8);
        this.emit({ k: 'rockBreak', x: e.cx, y: e.cy });
        stop = true;
      } else this.emit({ k: 'ramJump', id: e.id, x: e.cx, y: e.cy });
    }
    if (stop) this.ramNext(e);
    return stop;
  }

  // Strážce: after losing a share of life it jumps to another entry and walks again.
  checkRelocate(e) {
    const d = ENEMIES[e.type];
    if (!d.relocate || e.dead || e.rel >= d.relocate.length) return;
    if (e.hp / e.mhp > d.relocate[e.rel]) return;
    e.rel++;
    const list = entriesForWave(e.w).filter((p) => p.key !== e.ent && this.isOpen(p.x, p.y) && this.dist[idx(p.x, p.y)] > 0);
    if (!list.length) return;
    const to = list[Math.floor(rnd(this.s.rng) * list.length)];
    const from = { x: e.x, y: e.y };
    e.ent = to.key;
    e.cx = to.x; e.cy = to.y; e.x = e.px = to.x + 0.5; e.y = e.py = to.y + 0.5;
    e.dir = -1; e.hist = [];
    e.stunT = Math.max(e.stunT, 0.8);
    e.slowT = 0; e.slowF = 0;
    this.pickNext(e);
    this.emit({ k: 'relocate', id: e.id, type: e.type, fx: from.x, fy: from.y, x: e.x, y: e.y, boss: e.boss });
    if (e.boss) secretSim.onBossRelocate(this, e);
  }

  // Sends an enemy back along the way it came (teleport, spell).
  sendBack(e, n) {
    if (e.dead) return false;
    const fx = e.x, fy = e.y;
    if (e.fly) {
      const gx = GOAL.x + 0.5, gy = GOAL.y + 0.5;
      const dx = e.sx - gx, dy = e.sy - gy, L = Math.hypot(dx, dy) || 1;
      const cur = Math.hypot(e.x - gx, e.y - gy);
      const nd = Math.min(L, cur + n);
      e.x = e.px = gx + dx / L * nd; e.y = e.py = gy + dy / L * nd;
    } else {
      if (!e.hist.length) return false;
      let k = Math.max(0, e.hist.length - n);
      while (k < e.hist.length && !(this.walkable(e.hist[k]) || e.ram)) k++;
      if (k >= e.hist.length) return false;
      const c = e.hist[k];
      e.hist.length = k;
      e.cx = c % W; e.cy = (c / W) | 0;
      e.x = e.px = e.cx + 0.5; e.y = e.py = e.cy + 0.5;
      e.dir = -1;
      e.demT = 0; e.demId = 0;
      if (e.ram) this.ramNext(e); else this.pickNext(e);
    }
    this.emit({ k: 'blink', id: e.id, fx, fy, x: e.x, y: e.y });
    return true;
  }

  // ---------- light ----------

  leak(e) {
    const s = this.s;
    if (e.dead) return;
    if (secretSim.onLeak(this, e)) return;
    e.dead = true;
    const w = this.waveOf(e.w);
    if (w) w.alive--;
    let light = e.light;
    if (s.fx.shield > 0 || (s.fin && s.fin.phase >= 3)) light = 0;
    if (light > 0) {
      s.light = Math.max(0, s.light - light);
      const key = e.ent + '|' + e.type;
      s.stats.leaks[key] = (s.stats.leaks[key] || 0) + light;
      s.ch.lightLost += light;
      if (w) w.leaked = true;
      // Druhý dech: once per chapter the lighthouse stays on 20 instead of going out.
      const ch = chapterOf(this.currentWaveNumber());
      if (s.light <= 0 && this.has('secondBreath') && s.breathCh !== ch) {
        s.breathCh = ch;
        s.light = 20;
        this.emit({ k: 'secondBreath' });
      }
    }
    if (e.fam && s.fams[e.fam]) { s.fams[e.fam].leaked = true; this.famDec(e.fam, e); }
    this.emit({ k: 'leak', type: e.type, light, golden: e.golden, x: e.x, y: e.y, shield: e.light > 0 && light === 0 });
  }

  famDec(fam, e, gone = false) {
    const s = this.s;
    const f = s.fams[fam];
    if (!f) return;
    if (gone) f.leaked = true;
    f.alive--;
    if (f.alive <= 0) {
      if (!f.leaked) {
        s.light = Math.min(s.maxLight, s.light + LIGHT.bossDefeatBonus);
        this.emit({ k: 'bossDefeated', type: f.type, x: e ? e.x : GOAL.x, y: e ? e.y : GOAL.y });
      }
      delete s.fams[fam];
    }
  }

  // ---------- Knot ----------

  updateHero(dt) {
    const s = this.s, h = s.hero;
    h.px = h.x; h.py = h.y;
    const ar = this.abilityRate();
    if (h.cd > 0) h.cd = Math.max(0, h.cd - dt * ar);
    if (h.cd2 > 0) h.cd2 = Math.max(0, h.cd2 - dt * ar);
    if (h.cd3 > 0) h.cd3 = Math.max(0, h.cd3 - dt * ar);
    if (h.overT > 0) h.overT = Math.max(0, h.overT - dt);
    if (h.swallowT > 0) return;
    if (h.swing > 0) h.swing = Math.max(0, h.swing - dt);
    if (h.confusedT > 0) h.confusedT = Math.max(0, h.confusedT - dt);
    const mhp = this.heroMaxHp();
    if (h.mhp !== mhp) { h.hp += Math.max(0, mhp - h.mhp); h.mhp = mhp; }
    if (h.down > 0) {
      h.down -= dt;
      h.plugT = 0;
      if (h.down <= 0) {
        h.down = 0;
        h.hp = h.mhp;
        h.x = h.px = THRESHOLD.x + 0.5; h.y = h.py = THRESHOLD.y + 0.5;
        h.path = [];
        this.emit({ k: 'heroUp' });
      }
      return;
    }
    if (h.plugT > 0) { h.plugT = Math.max(0, h.plugT - dt); if (h.plugT === 0) this.emit({ k: 'plugEnd' }); }
    // Movement along the path.
    if (h.path.length) {
      let sp = this.heroSpeed();
      if (tileAt(Math.floor(h.x), Math.floor(h.y)).mud && !this.has('boots')) sp *= TERRAIN.mudHero;
      let m = sp * dt;
      for (let guard = 0; guard < 4 && m > 0 && h.path.length; guard++) {
        const [cx, cy] = h.path[0];
        if (!this.heroWalkable(idx(cx, cy))) {
          // Something was built in the way: find a new route.
          const fx = Math.floor(h.x), fy = Math.floor(h.y);
          const p = this.heroWalkable(idx(fx, fy)) ? findPath((i) => this.heroWalkable(i), fx, fy, h.tx, h.ty) : null;
          h.path = p ? [[fx, fy], ...p] : [];
          if (!p) break;
          continue;
        }
        const tx = cx + 0.5, ty = cy + 0.5;
        const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
        if (d > 1e-6) h.face = Math.atan2(dy, dx);
        if (d > m) { h.x += dx / d * m; h.y += dy / d * m; m = 0; }
        else { h.x = tx; h.y = ty; m -= d; h.path.shift(); }
      }
    }
    // Healing at the spring, and out of combat with the thermos.
    if (Math.hypot(h.x - (SPRING.x + 0.5), h.y - (SPRING.y + 0.5)) <= HERO.springRange) h.hp = Math.min(h.mhp, h.hp + HERO.springHeal * dt);
    if (this.phase() === 'build' && this.has('thermos')) h.hp = Math.min(h.mhp, h.hp + HERO.thermosHeal * dt);
    // Repairs: standing next to a wrecked building.
    this.heroRepair(dt);
    // Attack.
    if (h.atk > 0) h.atk -= dt;
    if (h.atk <= 0) {
      let best = null, bd = HERO.attackRange;
      const hold = s.holdFire;
      for (const e of s.enemies) {
        if (e.dead || !e.vis || e.under || e.immune || (e.messenger && hold)) continue;
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d <= bd) { bd = d; best = e; }
      }
      if (s.dark && Math.hypot(s.dark.x - h.x, s.dark.y - h.y) <= HERO.attackRange + 0.2) {
        const dx = s.dark.x, dy = s.dark.y;
        h.face = Math.atan2(dy - h.y, dx - h.x);
        secretSim.hitDark(this, this.heroDmg());
        h.atk += 1 / HERO.attackRate;
        h.swing = 0.25;
        this.emit({ k: 'heroHit', x: dx, y: dy });
      } else if (best) {
        h.face = Math.atan2(best.y - h.y, best.x - h.x);
        this.damage(best, this.heroDmg(), 'knot', 'hero');
        h.atk += 1 / HERO.attackRate;
        h.swing = 0.25;
        this.emit({ k: 'heroHit', x: best.x, y: best.y });
      } else h.atk = 0;
    }
    // Bosses hurt Knot when close, and so do the enemies he blocks.
    for (const e of s.enemies) {
      if (e.dead || e.under || e.frozen || e.home) continue;
      if (e.blocked) { h.hp -= (e.boss || e.part || e.mini ? ENEMIES[e.type].heroDps || 10 : HERO.blockDps) * dt; continue; }
      if (!(e.boss || e.part || e.mini)) continue;
      if (Math.hypot(e.x - h.x, e.y - h.y) > HERO.bossTouch) continue;
      h.hp -= (ENEMIES[e.type].heroDps || 10) * dt;
    }
    if (h.hp <= 0) {
      h.hp = 0;
      h.down = this.has('battery') ? 5 : HERO.downTime;
      h.path = [];
      h.plugT = 0;
      this.emit({ k: 'heroDown', x: h.x, y: h.y });
    }
  }

  // Who can be seen: invisible enemies are revealed by the beam, Knot, lightning towers, slowing and spells.
  updateVisibility(dt) {
    const s = this.s, h = s.hero;
    // The beam (and its twin with the mirror relic) reveals and, with the card, hurts.
    const lx = LIGHTHOUSE.x + 0.5, ly = LIGHTHOUSE.y + 0.5;
    const beams = this.has('mirror') ? [s.beam, s.beam + Math.PI] : [s.beam];
    const justice = this.has('justice');
    const wn = this.currentWaveNumber();
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.beamCd > 0) e.beamCd -= dt;
      const dx = e.x - lx, dy = e.y - ly, dist = Math.hypot(dx, dy);
      if (dist > BEAM.reach || dist < 0.3) continue;
      const a = Math.atan2(dy, dx);
      for (const b of beams) {
        let da = (a - b) % (Math.PI * 2);
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > BEAM.halfWidth + 0.3 / dist) continue;
        if (e.inv) e.revT = Math.max(e.revT, BEAM.reveal);
        if (justice && !(e.beamCd > 0)) { e.beamCd = BEAM.hitCooldown; this.damage(e, 20 * hpGrowth(wn), 'svetlo', null, true); }
      }
    }
    let lights = null;
    const hr = this.revealRange();
    for (const e of s.enemies) {
      if (e.under) { e.vis = false; continue; }
      if (e.dead || !e.inv) { if (!e.dead) e.vis = true; continue; }
      let v = e.revT > 0 || e.slowT > 0 || e.stunT > 0 || s.fx.draft > 0;
      if (!v && h.down <= 0 && Math.hypot(e.x - h.x, e.y - h.y) <= hr) v = true;
      if (!v) {
        if (!lights) lights = s.buildings.filter((b) => (b.type === 'lightning' || b.type === 'aurora') && !b.wreck);
        for (const b of lights) if (Math.hypot(e.x - b.x - 0.5, e.y - b.y - 0.5) <= (b.type === 'aurora' ? this.towerStats(b).range : BUILDINGS.lightning.reveal)) { v = true; break; }
      }
      e.vis = v;
    }
  }

  checkWaves() {
    const s = this.s;
    if (!s.waves.length) return;
    const done = s.waves.filter((w) => w.qi >= w.q.length && w.alive <= 0 && secretSim.waveCanEnd(this, w));
    if (!done.length) return;
    for (const w of done) this.completeWave(w);
    s.waves = s.waves.filter((w) => !done.includes(w));
    if (s.waves.length === 0) {
      s.fires = []; s.puddles = [];
      if (s.cpPending) { s.stats.leaks = {}; this.emit({ k: 'checkpoint', n: s.cpPending }); s.cpPending = 0; }
      if (s.auto && this.canStartWave()) s.autoT = AUTO_START_DELAY;
      this.emit({ k: 'buildPhase' });
    }
  }

  completeWave(w) {
    const s = this.s;
    const interest = this.interestPreview();
    const reward = Math.round((ECONOMY.waveRewardBase + ECONOMY.waveRewardPerWave * w.n) * (w.called ? ECONOMY.calledBonus : 1));
    const mines = this.minesPreview(w.kills);
    s.gold += interest + reward + mines;
    s.stats.interest += interest;
    s.ch.interest += interest;
    s.completedCount += 1;
    // what killed most in this wave (learners remember it)
    const kt = Object.entries(w.kt || {}).filter(([k]) => DTYPES.includes(k)).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    if (kt.length) s.lastKillTypes = kt;
    if (w.n > TOTAL_WAVES && w.n > s.best) { s.best = w.n; this.emit({ k: 'record', n: w.n }); }
    let hope = 0;
    if (this.has('hope') && !w.leaked && s.light < s.maxLight) { hope = Math.min(5, s.maxLight - s.light); s.light += hope; }
    const ev = { k: 'waveEnd', n: w.n, reward, mines, interest, called: w.called, hope };
    ev.unlocks = this.unlocksAfter(s.completedCount);
    this.emit(ev);
    const endless = w.n > TOTAL_WAVES;
    if (CARD_WAVES.includes(w.n) || (endless && w.n % 10 === 5)) s.picks.push({ kind: 'card', wave: w.n });
    if (BOSS_WAVES.includes(w.n) || (endless && w.n % 10 === 0)) {
      if (w.n !== TOTAL_WAVES) s.cpPending = w.n;
      if (RELIC_WAVES.includes(w.n) || endless) s.picks.push({ kind: 'relic', wave: w.n });
      if (this.has('gear')) s.free = { archer: 1, cannon: 1, frost: 1, lightning: 1 };
    }
    const page = secretSim.pageAfter(this, w.n);
    if (page) { s.pages.push(page); this.emit({ k: 'page', n: page }); }
    if (w.n === TOTAL_WAVES - 1) s.cpPending = w.n;
    if (w.n % 10 === 0 && !endless && w.n < TOTAL_WAVES) {
      s.completedChapters += 1;
      let best = null;
      for (const b of s.buildings) if (BUILDINGS[b.type].tower && (!best || b.dmg > best.dmg)) best = b;
      this.emit({
        k: 'chapterDone', chapter: chapterOf(w.n),
        time: s.playTime - s.ch.start, lightLost: s.ch.lightLost, interest: s.ch.interest,
        best: best ? { type: best.type, level: best.level, spec: best.spec || null, x: best.x, y: best.y, dmg: Math.round(best.dmg) } : null,
        contentEnd: w.n >= CONTENT_MAX_WAVE,
      });
      s.ch = { start: s.playTime, lightLost: 0, interest: 0 };
    }
    if (w.n === TOTAL_WAVES) {
      s.completedChapters += 1;
      s.finished = true;
      this.emit({ k: 'gameWon', byKnot: !!(s.fin && s.fin.byKnot), time: s.playTime });
    }
    secretSim.onWaveEnd(this, w);
    for (const b of s.buildings) b.resistWave = 0;
    // Sectors could open (or close) now, the map can change, and a new entry must have a way to the lighthouse.
    this.rebuild();
    this.applyMapEvents(true);
    this.ensureEntriesOpen();
    if (!s.pick) this.nextPick();
  }

  // What opens after a wave: buildings, sectors, abilities, levels.
  unlocksAfter(n) {
    const out = [];
    for (const [type, d] of Object.entries(BUILDINGS)) if (d.implemented && !d.hybrid && d.unlockAfter === n && d.unlockAfter > 0) out.push({ kind: 'building', id: type });
    for (const u of UNLOCKS) if (u.after === n && u.after < CONTENT_MAX_WAVE) out.push({ kind: u.kind, id: u.id });
    return out;
  }

  // After the end: carry on with waves 101+.
  startEndless() {
    const s = this.s;
    if (!s.finished) return { ok: false };
    s.endless = true;
    if (s.nextWave <= TOTAL_WAVES) s.nextWave = TOTAL_WAVES + 1;
    s.fin = null;
    this.rebuild();
    this.ensureEntriesOpen();
    this.emit({ k: 'endless' });
    return { ok: true };
  }

  // Called by the checkpoint restore: new seed so card offers differ.
  reseed(extra) {
    this.s.seed = (Math.imul(this.s.seed ^ 0x9e3779b9, 2654435761) + extra) >>> 0;
    this.s.rng = makeRng(this.s.seed);
    if (this.s.pick) this.s.pick.options = this.rollOptions(this.s.pick.kind);
    if (this.s.hero.upOffer) this.s.hero.upOffer = this.rollUps();
  }

  // Commands of the surprises (taps on things of the world, the pedlar...). The logic is in secrets/.
  secret(cmd, a, b) { return secretSim.command(this, cmd, a, b); }

  // Simple hash of the state for determinism tests.
  hash() {
    const str = this.serialize();
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
}

Object.assign(Game.prototype, combat, progress, late);

export { WAVES, CONTENT_MAX_WAVE, LEVEL_POWER, RANGE_PER_LEVEL };
