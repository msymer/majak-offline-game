// Chapters 6–10: jammers, ballistas, eggs, moles, worms, learners, the bank, map changes and the endless mode.
// Mixed into the Game class (this = Game). Pure logic, no DOM, no Three.js.
import { W, N, DIRS, idx, inBounds, tileAt, entryPos, GOAL, sectorAt, useMapMods } from './grid.js';
import { rnd } from './rng.js';
import { BUILDINGS, HYBRID_AFTER, hybridOf } from '../data/buildings.js';
import { ENEMIES, DTYPES, RESIST_PASS, ENDLESS } from '../data/enemies.js';
import { MAP_EVENTS, SECTORS, THRESHOLD } from '../data/map.js';
import { getWave, TOTAL_WAVES } from '../data/waves.js';
import { HERO } from '../data/rules.js';
import { secretSim } from '../secrets/sim.js';
import { finale } from '../secrets/finale.js';

export const late = {
  // ---------- map changes after wave 50 ----------

  // Applies every map change whose wave is over. Safe to call many times; returns true when something changed.
  // Buildings on cells that disappear are given back for their full price.
  applyMapEvents(announce = true) {
    const s = this.s;
    let changed = false;
    for (const ev of MAP_EVENTS) {
      if (s.completedCount < ev.after) continue;
      if (ev.kind === 'mist') {
        const sec = SECTORS.find((x) => x.id === ev.sector);
        let gold = 0;
        for (const b of [...s.buildings]) {
          if (sectorAt(b.x, b.y) !== sec) continue;
          gold += b.paid;
          s.buildings = s.buildings.filter((o) => o.id !== b.id);
          this.emit({ k: 'refund', id: b.id, x: b.x, y: b.y, gold: b.paid, quiet: true });
        }
        if (gold) { s.gold += gold; changed = true; }
        const h = s.hero;
        if (sectorAt(Math.floor(h.x), Math.floor(h.y)) === sec) { h.x = h.px = THRESHOLD.x + 0.5; h.y = h.py = THRESHOLD.y + 0.5; h.path = []; changed = true; }
        const ne = entryPos('S', Math.max(s.nextWave, 91));
        for (const e of s.enemies) {
          if (e.fly || sectorAt(Math.floor(e.x), Math.floor(e.y)) !== sec || !ne) continue;
          e.cx = e.nx = ne.x; e.cy = e.ny = ne.y; e.x = e.px = ne.x + 0.5; e.y = e.py = ne.y + 0.5; e.dir = -1; e.hist = [];
        }
        if (!s.mapDone[ev.after]) { s.mapDone[ev.after] = 1; changed = true; if (announce) this.emit({ k: 'mapEvent', kind: 'mist', gold }); }
        continue;
      }
      let any = false;
      for (const [x, y] of ev.cells) {
        const i = idx(x, y);
        if (s.mapMods[i] === ev.to) continue;
        s.mapMods[i] = ev.to;
        any = true;
        const b = this.buildingAt(x, y);
        if (b) {
          s.gold += b.paid;
          s.buildings = s.buildings.filter((o) => o.id !== b.id);
          this.emit({ k: 'refund', id: b.id, x: b.x, y: b.y, gold: b.paid });
        }
      }
      if (any) {
        useMapMods(s.mapMods);
        changed = true;
        s.mapDone[ev.after] = 1;
        if (announce) this.emit({ k: 'mapEvent', kind: ev.kind, cells: ev.cells });
      }
    }
    if (changed) { s.bver++; this.rebuild(); }
    return changed;
  },

  // ---------- the bank ----------

  hasBank() { for (const b of this.s.buildings) if ((b.type === 'bank' || b.type === 'vault') && !b.wreck) return true; return false; },

  // A ground enemy that steps next to the bank takes a few coins (each bank once).
  bankSteal(e) {
    const bid = this.bankAdj[idx(e.cx, e.cy)];
    if (!bid || e.golden || ENEMIES[e.type].messenger) return;
    if (secretSim.vault(this, e)) return;
    e.banked = e.banked || [];
    if (e.banked.includes(bid)) return;
    e.banked.push(bid);
    const b = this.byId.get(bid);
    const g = Math.min(BUILDINGS.bank.steal, Math.floor(this.s.gold));
    if (g <= 0 || !b) return;
    this.s.gold -= g;
    this.emit({ k: 'steal', id: e.id, x: e.x, y: e.y, mx: b.x, my: b.y, gold: g, bank: true });
  },

  // ---------- hybrids ----------

  // Two different towers of the same level (2+) become a hybrid of that level (after wave 60).
  hybridResult(src, dst) {
    const sr = secretSim.secretRecipe(this, src, dst);
    if (sr) return sr;
    if (this.s.completedCount < HYBRID_AFTER) return null;
    if (!src || !dst || src.level !== dst.level || src.level < 2) return null;
    if (BUILDINGS[src.type].hybrid || BUILDINGS[dst.type].hybrid) return null;
    return hybridOf(src.type, dst.type);
  },

  // ---------- jammers, ballistas ----------

  // Buildings that a jammer switches off right now (derived every step from the enemies).
  updateJam(dt) {
    const s = this.s;
    this.jammed.clear();
    for (const e of s.enemies) {
      if (e.dead || e.under) continue;
      const d = ENEMIES[e.type];
      if (!d.jam || (d.jam.above && e.hp / e.mhp <= d.jam.above)) continue;
      for (const b of s.buildings) if (Math.hypot(b.x + 0.5 - e.x, b.y + 0.5 - e.y) <= d.jam.r + 0.25) this.jammed.add(b.id);
    }
    for (const b of s.buildings) if (b.stunT > 0) b.stunT = Math.max(0, b.stunT - dt);
  },

  isOff(b) { return this.jammed.has(b.id) || b.stunT > 0; },

  // Balista: every few seconds puts the strongest tower in reach to sleep.
  sling(e, sl, dt) {
    e.slingT = (e.slingT || 0) + dt;
    if (e.slingT < sl.every || e.stunT > 0) return;
    let best = null, bv = 0;
    for (const b of this.s.buildings) {
      if (!BUILDINGS[b.type].tower || b.wreck || b.stunT > 0) continue;
      if (Math.hypot(b.x + 0.5 - e.x, b.y + 0.5 - e.y) > sl.r) continue;
      const st = this.towerStats(b);
      const v = st.dmg * st.rate * (st.splash ? 1.5 : 1);
      if (v > bv) { bv = v; best = b; }
    }
    if (!best) { e.slingT = sl.every; return; }
    e.slingT = 0;
    best.stunT = sl.stun;
    e.waitT = 0.7;
    this.emit({ k: 'sling', id: e.id, x: e.x, y: e.y, bx: best.x, by: best.y, bid: best.id });
  },

  // ---------- eggs, moles, worms ----------

  hatch(e, eg) {
    const w = this.waveOf(e.w);
    e.dead = true;
    if (w) w.alive--;
    if (!w) return;
    for (let k = 0; k < eg.count; k++) {
      this.spawnEnemy(eg.type, w, e.ent, e.cx, e.cy, {
        deferred: true, cx: e.cx, cy: e.cy, nx: e.nx, ny: e.ny, dir: e.dir,
        x: e.x + (rnd(this.s.rng) - 0.5) * 0.5, y: e.y + (rnd(this.s.rng) - 0.5) * 0.5, stun: 0.2 + k * 0.15, hist: e.hist,
      });
    }
    this.emit({ k: 'hatch', x: e.x, y: e.y });
  },

  // An enemy leaves without taking light (a mole that hides again, a worm that is gone...).
  vanish(e) {
    if (e.dead) return;
    e.dead = true;
    const w = this.waveOf(e.w);
    if (w) w.alive--;
    if (e.fam) this.famDec(e.fam, null, true);
    this.emit({ k: 'vanish', type: e.type, x: e.x, y: e.y, golden: e.golden });
  },

  // Worms: come up from holes one after another; under the ground nobody can hurt them.
  burrowTick(e, bur, dt) {
    const B = e.bur;
    B.t -= dt;
    if (!B.under) {
      if (B.t > 0 || B.n >= bur.times - 1) return false;
      B.under = true; e.under = true; e.vis = false;
      B.t = bur.down;
      e.blocked = false;
      this.emit({ k: 'dive', id: e.id, type: e.type, x: e.x, y: e.y });
      return true;
    }
    if (B.t > 0) return true;
    // come up at the next hole
    B.n++;
    const key = bur.holes[B.n % bur.holes.length];
    const p = entryPos(key, e.w > TOTAL_WAVES ? e.w : Math.max(e.w, 72)) || entryPos(e.ent, e.w);
    if (p && this.dist[idx(p.x, p.y)] > 0) {
      e.ent = key;
      e.cx = e.nx = p.x; e.cy = e.ny = p.y; e.x = e.px = p.x + 0.5; e.y = e.py = p.y + 0.5;
      e.dir = -1; e.hist = [];
    }
    B.under = false; e.under = false; e.vis = true;
    B.t = bur.up;
    e.stunT = Math.max(e.stunT, 0.6);
    this.pickNext(e);
    this.emit({ k: 'emerge', id: e.id, type: e.type, x: e.x, y: e.y });
    secretSim.onEmerge(this, e);
    return true;
  },

  // ---------- learners (resistances) ----------

  // Damage types sorted by how many kills they made in the last finished wave.
  learnedTypes() {
    const lt = this.s.lastKillTypes || [];
    return lt.length ? lt : ['strela'];
  },

  resistFor(kind, kt) {
    if (kind === 'all') return DTYPES.filter((t) => t !== 'knot');
    if (!kind) return [];
    const list = kt || this.learnedTypes();
    return list.slice(0, kind === 2 ? 2 : 1);
  },

  // Master: every few seconds becomes resistant to what hurts it most right now.
  adaptTick(e, ad, dt) {
    e.adT = (e.adT || 0) + dt;
    if (e.adT < ad.every) return;
    e.adT = 0;
    let best = null, bv = 0;
    for (const [k, v] of Object.entries(e.dmgBy || {})) if (DTYPES.includes(k) && v > bv) { bv = v; best = k; }
    e.dmgBy = {};
    if (!best) return;
    e.res = [best];
    this.emit({ k: 'adapt', id: e.id, x: e.x, y: e.y, res: best });
  },

  // Journeyman: changes its resistance every few seconds.
  shiftTick(e, sh, dt) {
    e.adT = (e.adT || 0) + dt;
    if (e.adT < sh.every) return;
    e.adT = 0;
    const list = DTYPES.filter((t) => t !== 'knot' && !(e.res || []).includes(t));
    e.res = [list[Math.floor(rnd(this.s.rng) * list.length)]];
    this.emit({ k: 'adapt', id: e.id, x: e.x, y: e.y, res: e.res[0] });
  },

  // Learners with "shift": in the middle of the wave they learn what has killed most in this wave.
  waveShift(w) {
    if (w.shifted || !w.mid || w.t < w.mid) return;
    w.shifted = true;
    const kt = Object.entries(w.kt || {}).filter(([k]) => DTYPES.includes(k)).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    if (!kt.length) return;
    w.shiftKt = kt;
    for (const e of this.s.enemies) if (!e.dead && e.w === w.n && e.shiftRes) e.res = this.resistFor(e.shiftRes, kt);
    this.emit({ k: 'learn', n: w.n, res: kt[0] });
  },

  resistMul(e, dtype) { return e.res && e.res.length && e.res.includes(dtype) ? RESIST_PASS : 1; },

  // ---------- endless mode ----------

  mutate(e, mut) {
    if (!mut || e.boss || e.part) return;
    if (mut === 'fast') e.spd *= ENDLESS.fast;
    else if (mut === 'armor' && !e.armor) e.armor = 4 + 0.2 * e.w;
    else if (mut === 'invisible' && !e.fly) { e.inv = true; e.vis = false; }
    else if (mut === 'regen') e.regen = ENDLESS.regen;
    else if (mut === 'split' && !e.mini) e.splitM = 1;
  },

  // ---------- commands of the secret moments ----------
  signalPress(dur) { return finale.press(this, dur); },
  wormTap() { return secretSim.wormTap(this); },
  pickItem(id) { return secretSim.pickItem(this, id); },
  setHoldFire(on) { this.s.holdFire = !!on; this.emit({ k: 'holdFire', on: !!on }); return { ok: true }; },

  // ---------- Knot's third ability ----------

  heroOverload() {
    const s = this.s, h = s.hero;
    if (!this.abilityUnlocked('overload') || h.down > 0 || h.cd3 > 0 || this.phase() !== 'combat' || h.swallowT > 0) return { ok: false };
    h.overT = HERO.overload.time;
    h.cd3 = HERO.overload.cooldown;
    this.emit({ k: 'overload', x: h.x, y: h.y, r: this.auraRange() });
    return { ok: true };
  },
};

void W; void N; void DIRS; void inBounds; void tileAt; void GOAL;
