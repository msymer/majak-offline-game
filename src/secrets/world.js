// Game-logic side of the surprises of stage 5 (05_TAJNE.md, section 6 and the bottles of 2.3).
// Pure: no DOM, no Three.js. Everything lives in the game state under s.sec (and a few fields on
// buildings and enemies), so it is saved, restored and stays deterministic. The surprises have their
// own random stream (s.sec.rng), so they never shift the cards or anything else of the main game.
import { idx, inBounds, GOAL, W, H, DIRS, tileAt, nextDir, useMapMods } from '../sim/grid.js';
import { rnd } from '../sim/rng.js';
import { BUILDINGS, SPECS } from '../data/buildings.js';
import { ENEMIES, HP_GROWTH } from '../data/enemies.js';
import { CARDS, RELICS } from '../data/cards.js';
import { ECONOMY } from '../data/rules.js';
import { chapterOf, getWave } from '../data/waves.js';

// ---------- data the logic needs (texts are in texts2.js) ----------

export const CROSSES = [[12, 12], [0, 13], [17, 13], [9, 7], [2, 1]];   // P-26
export const CHEST = [10, 14];                                          // P-28
export const POND = { x0: 6, x1: 7, y0: 13, y1: 15 };                   // the pond of the meadow
export const MERCHANT_WAVES = [17, 34, 52, 68, 86];                     // P-18
export const TOWER_NAMES = 28;                                          // P-08 (names are texts)
export const HAT_COUNT = 7;                                             // P-05
export const MYSTERY = ['mys1', 'mys2', 'mys3', 'mys4', 'mys5', 'mys6']; // P-19
export const BASIC_TOWERS = ['archer', 'cannon', 'frost', 'lightning'];

// Secret buildings (P-17). "hybrid" keeps them out of the unlock cards and the build bar.
BUILDINGS.icecream = { secret: true, hybrid: ['mine', 'frost'], cost: 0, unlockAfter: 60, implemented: true, blocks: true, mergeable: false, r: 1.6, stop: 1, gold: 1, max: 2 };
BUILDINGS.vault = { secret: true, hybrid: ['bank', 'trap'], cost: 0, unlockAfter: 60, implemented: true, blocks: true, mergeable: false, dmg: 60 };
// Blurred cards (P-19): never in the normal pool.
for (const id of MYSTERY) if (!CARDS.some((c) => c.id === id)) CARDS.push({ id, kind: 'rule', secret: true });

const growth = (w) => Math.pow(HP_GROWTH, Math.max(0, Math.min(w, 100) - 1));

function sec(game) { const s = game.s; if (!s.sec) s.sec = {}; return s.sec; }
function srnd(game) {
  const x = sec(game);
  if (!x.rng) x.rng = { s: ((game.s.seed ^ 0x51ec2e7) >>> 0) || 1 };
  return rnd(x.rng);
}
function ev(game, code, extra) { game.emit({ k: 'secret', code, ...extra }); }
function cur(game) { return game.currentWaveNumber(); }

export const world = {
  srnd,

  // ---------- derived data, after every change of buildings ----------
  onRebuild(game) {
    const s = game.s, x = sec(game), cc = s.completedCount;
    const ice = [];
    let vault = false;
    for (const b of s.buildings) {
      // P-50: how long a building stands without a change
      if (b.w0 === undefined || b.wl !== b.level || b.wt !== b.type) { b.w0 = cc; b.wl = b.level; b.wt = b.type; }
      if (b.wreck) continue;
      if (b.type === 'icecream') ice.push(b);
      else if (b.type === 'vault') vault = true;
      // P-08: a tower of level 3 gets a name
      if (!b.nm && b.level >= 3 && BUILDINGS[b.type].tower) b.nm = 1 + Math.floor(srnd(game) * TOWER_NAMES);
    }
    game.sxIce = ice;
    game.sxVault = vault;
    // P-16: an empty cell with walls on all eight sides becomes a garden with a beehive
    const gardens = [];
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
      const i = idx(xx, y);
      if (game.wallAdj[i] !== 4 || game.occ[i] || !game.open[i]) continue;
      const t = tileAt(xx, y);
      if (!t.build || !t.pass) continue;
      let ok = true;
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const b = game.buildingAt(xx + dx, y + dy); if (!b || b.type !== 'wall' || b.wreck) { ok = false; break; } }
      if (ok) gardens.push({ x: xx, y });
    }
    game.sxGardens = gardens;
    if (gardens.length && !x.garden) { x.garden = 1; ev(game, 'P-16', { x: gardens[0].x, y: gardens[0].y }); }
    // P-66: the four basic towers in one 2 × 2 square play together
    const quart = new Set();
    for (let y = 0; y < H - 1; y++) for (let xx = 0; xx < W - 1; xx++) {
      const a = game.buildingAt(xx, y);
      if (!a || a.wreck || !BASIC_TOWERS.includes(a.type)) continue;
      const q = [a, game.buildingAt(xx + 1, y), game.buildingAt(xx, y + 1), game.buildingAt(xx + 1, y + 1)];
      if (q.some((b) => !b || b.wreck)) continue;
      if (BASIC_TOWERS.every((t) => q.some((b) => b.type === t))) for (const b of q) quart.add(b.id);
    }
    game.sxQuart = quart;
    if (quart.size && !x.quart) { x.quart = 1; const b = game.byId.get([...quart][0]); ev(game, 'P-66', { x: b.x + 1, y: b.y + 1 }); }
  },

  // ---------- numbers ----------
  dmgMod(game, b) {
    const x = game.s.sec;
    let m = 1;
    if (game.has('mys1')) m *= 1.3;
    if (b.md) m *= 1 + 0.02 * b.md;
    if (x && x.song && game.waveOf(x.song)) m *= 1.1;
    return m;
  },
  rangeMod(game) { return game.has('mys5') ? 1 : 0; },
  rateMod(game, b) {
    let m = 1;
    if (game.has('mys2')) m *= 1.2;
    if (game.sxQuart && game.sxQuart.has(b.id)) m *= 1.08;
    return m;
  },
  heroSpeedMod(game) {
    let m = 1;
    if (game.has('mys1') && chapterOf(cur(game)) >= 6) m *= 0.7;
    if (game.has('mys4')) m *= 0.75;
    return m;
  },

  // ---------- secret recipes (P-17) ----------
  secretRecipe(game, src, dst) {
    if (game.s.completedCount < 60 || !src || !dst) return null;
    const a = src.type, b = dst.type;
    if ((a === 'mine' && b === 'frost') || (a === 'frost' && b === 'mine')) return game.countOf('icecream') < BUILDINGS.icecream.max ? 'icecream' : null;
    if (a === 'trap' && b === 'bank') return 'vault';
    return null;
  },

  // A thief next to a mine or a bank while a vault stands: it gets hit and takes nothing.
  vault(game, e) {
    if (!game.sxVault) return false;
    if (!e.vh) {
      e.vh = 1;
      const px = e.x, py = e.y;
      game.damage(e, BUILDINGS.vault.dmg * growth(e.w), 'vybuch', null, true);
      ev(game, 'P-17', { what: 'vault', x: px, y: py });
    }
    return true;
  },

  // ---------- card offers: a fourth card from a falling star (P-45), a blurred card (P-19) ----------
  cardOffer(game, kind, ids, rest) {
    if (kind !== 'card') return ids;
    const s = game.s, x = sec(game);
    if (x.extraCard && rest.length) { x.extraCard = 0; ids.push(rest[Math.floor(srnd(game) * rest.length)].id); }
    x.offers = (x.offers || 0) + 1;
    const free = MYSTERY.filter((id) => !game.has(id));
    if (free.length && s.completedCount >= 15 && ids.length >= 2 && (srnd(game) < 0.3 || (x.offers >= 4 && !x.mys))) {
      ids[ids.length - 1] = free[Math.floor(srnd(game) * free.length)];
      x.mys = 1;
    }
    return ids;
  },

  // ---------- waves ----------
  onWaveStart(game, w) {
    const s = game.s, x = sec(game), n = w.n;
    if (x.merchant) { delete x.merchant; ev(game, 'P-18', { what: 'leave' }); }
    x.wander = 0;
    // exact numbers in the gold counter
    const gold = Math.floor(s.gold);
    if (gold === 777) { s.gold += 77; ev(game, 'P-11', { what: '777', gold: 77 }); }
    else if (gold === 404) ev(game, 'P-11', { what: '404' });
    else if (gold === 1234) ev(game, 'P-11', { what: '1234' });
    else if (gold === 666) { w.hell = 1; ev(game, 'P-33'); }
    else if (gold === 42) ev(game, 'P-65');
    // P-67: three waves in a row called early
    if (w.called) {
      x.called = (x.called || 0) + 1;
      if (x.called >= 3 && x.bold !== chapterOf(n)) { x.bold = chapterOf(n); ev(game, 'P-67', { what: 'start' }); }
    } else x.called = 0;
    // P-44: the whale. Rare, but nobody should miss it for the whole game.
    if (n >= 12 && n < 99 && !w.called && !getWave(n)?.boss) {
      const p = x.whale ? 0.025 : n >= 45 ? 1 : 0.05;
      if (srnd(game) < p) w.whaleT = 6 + srnd(game) * 8;
    }
    // P-24: a cat walks through the maze (wave 23; later waves ending with 3 for those who missed it)
    if (!x.cat && n >= 23 && n % 10 === 3 && n < 99) {
      const e = game.waveEntries(n)[0] || game.activeEntries()[0];
      if (e) {
        x.cat = 1;
        x.walk = [{ k: 'cat', x: e.x + 0.5, y: e.y + 0.5, px: e.x + 0.5, py: e.y + 0.5, cx: e.x, cy: e.y, nx: e.x, ny: e.y, dir: -1, t: 2.5, sp: 1.25 }];
        ev(game, 'P-24', { what: 'come', x: e.x + 0.5, y: e.y + 0.5 });
      }
    }
  },

  onSpawn(game, e, opts) {
    const s = game.s, x = sec(game);
    const d = ENEMIES[e.type];
    const w = game.waveOf(e.w);
    if (d.messenger || d.heart) return;
    if (w && w.hell) { e.spd *= 1.06; e.gold = Math.round(e.gold * 1.06); }
    if (e.golden && game.has('mys6')) e.spd *= 1.25;
    const queued = !opts.deferred && !opts.rootHp;
    // P-20: one black among the golden (wave 55)
    if (e.w === 55 && e.golden && e.type === 'rojik' && queued && w) {
      w.g55 = (w.g55 || 0) + 1;
      if (w.g55 === 37) { e.black = 1; e.truce = 1; e.gold = 0; ev(game, 'P-20', { what: 'come', id: e.id }); }
    }
    // P-21: a tin soldier with a white flag (wave 37, or the first later one for old saves)
    if (e.type === 'plechac' && queued && !x.flag && e.w >= 37 && e.w <= 98) {
      x.flag = 1; e.flag = 1; e.truce = 1;
      ev(game, 'P-21', { what: 'come', id: e.id });
    }
    // P-06: a drone with a banner (wave 13, or the first later one)
    if (e.type === 'dron' && queued && !x.banner && e.w >= 13) { x.banner = 1; e.banner = 1; ev(game, 'P-06', { id: e.id }); }
    // P-07: slimes with little signs
    if (e.type === 'sliz' && queued && !e.golden && w && (w.signs || 0) < 2 && e.w >= 2 && srnd(game) < (x.sign ? 0.03 : 0.12)) {
      w.signs = (w.signs || 0) + 1;
      e.sign = 1 + Math.floor(srnd(game) * 4);
      if (!x.sign) { x.sign = 1; ev(game, 'P-07', { id: e.id }); }
    }
    // P-39: one of the learners of wave 82 will stop and wave
    if (e.w === 82 && e.type === 'ucen' && queued && !x.waved && !x.wv && w) {
      w.u82 = (w.u82 || 0) + 1;
      if (w.u82 === 9) { x.wv = e.id; x.wvD = Math.max(4, Math.floor(game.dist[idx(e.cx, e.cy)] * 0.5)); }
    }
    // P-05: one in 400 wears a hat
    if (!e.boss && !e.part && !e.mini && !e.black && !e.flag && d.speed > 0) {
      x.hatN = (x.hatN || 0) + 1;
      const p = x.hats ? 1 / 400 : x.hatN > 500 ? 1 / 60 : 1 / 400;
      if (srnd(game) < p) { e.hat = 1 + Math.floor(srnd(game) * HAT_COUNT); x.hatN = 0; }
    }
  },

  // Returns true when the surprise took care of the enemy at the lighthouse (no light is lost).
  onLeak(game, e) {
    const s = game.s, x = sec(game);
    if (!e.flag && !e.black) return false;
    e.dead = true;
    const w = game.waveOf(e.w);
    if (w) w.alive--;
    if (e.flag) { x.flag = 2; x.mech = 1; ev(game, 'P-21', { what: 'arrived', x: e.x, y: e.y }); }
    else { s.gold += 150; x.black = 2; ev(game, 'P-20', { what: 'passed', gold: 150, x: e.x, y: e.y }); }
    return true;
  },

  onDeath(game, e) {
    const x = sec(game);
    if (e.black) { x.black = 1; ev(game, 'P-20', { what: 'killed', x: e.x, y: e.y }); }
    if (e.flag) { x.flag = 3; ev(game, 'P-21', { what: 'killed', x: e.x, y: e.y }); }
    // P-22: the first Válec leaves its wreck as a wall
    if (e.type === 'valec' && !e.ret && e.w <= 100 && !x.valec) { x.valec = 1; x.valecAt = [Math.floor(e.x), Math.floor(e.y)]; }
    if (x.wv === e.id) x.wv = 0;
  },

  // Gold for a kill, after the usual bonuses.
  gold(game, e, gold, src) {
    const s = game.s, x = sec(game);
    if (e.black) return 0;
    if (e.hat) { gold += 5; x.hats = (x.hats || 0) + 1; ev(game, 'P-05', { hat: e.hat, x: e.x, y: e.y }); }
    if (x.aid && x.aid.ch === chapterOf(cur(game))) gold = Math.round(gold * (1 + x.aid.gold));
    if (game.has('mys3')) gold = Math.round(gold * 1.5);
    // P-04: the gull now and then takes a coin
    if (gold > 0 && !e.boss && s.completedCount >= 4) {
      const p = game.has('mys3') ? 1 / 45 : x.gullN ? 1 / 180 : s.completedCount >= 12 ? 1 / 25 : 1 / 180;
      if (srnd(game) < p) {
        gold -= 1;
        x.gull = (x.gull || 0) + 1; x.gullN = (x.gullN || 0) + 1;
        if (!x.gullW) x.gullW = s.completedCount;
        ev(game, 'P-04', { what: 'steal', x: e.x, y: e.y });
      }
    }
    // P-08 / P-73: named towers count their kills and earn medals
    if (typeof src === 'number') {
      const b = game.byId.get(src);
      if (b) {
        b.k = (b.k || 0) + 1;
        if (b.nm && b.k % 100 === 0 && (b.md || 0) < 5) { b.md = (b.md || 0) + 1; ev(game, 'P-73', { id: b.id, x: b.x, y: b.y, n: b.md }); }
      }
    }
    return gold;
  },

  onWaveEnd(game, w) {
    const s = game.s, x = sec(game), n = w.n, cc = s.completedCount;
    const story = n <= 100;
    if (x.song === n) x.song = 0;
    // bottles (2.3): one every 4–6 waves; it waits at the shore until the player opens it
    if (x.bottleAt === undefined) x.bottleAt = 3;
    if (cc >= x.bottleAt && !x.bottle && n !== 99 && n !== 100) {
      x.bottle = 1;
      x.bottleAt = cc + 4 + Math.floor(srnd(game) * 3);
      ev(game, 'BOTTLE', { what: 'come' });
    }
    // P-01: a harmless slime wanders along the shore in some build phases
    if (story && n >= 2 && n < 99 && x.pet !== chapterOf(n + 1)) {
      if (n % 10 === 0) x.petTaps = 0;
      x.wander = !x.wandered ? 1 : srnd(game) < 0.4 ? 1 : 0;
      if (x.wander) x.wandered = 1;
    } else x.wander = 0;
    // P-18: the pedlar
    if (MERCHANT_WAVES.includes(n)) {
      const all = ['box', 'relic', 'swap', 'bag'];
      all.splice(Math.floor(srnd(game) * all.length), 1);
      x.merchant = { wave: n, offers: all, used: {} };
      ev(game, 'P-18', { what: 'come' });
    }
    // P-21: the tin soldier who stayed repairs one building after every wave
    if (x.mech) {
      const b = game.wrecks().find((o) => game.canRepair(o));
      if (b) { game.repair(b); ev(game, 'P-21', { what: 'repair', x: b.x, y: b.y }); }
    }
    // P-23: the egg, and five waves later Pepa
    if (story && n >= 30 && !x.egg) { x.egg = n; ev(game, 'P-23', { what: 'egg' }); }
    if (x.egg && !x.pepa && cc >= x.egg + 5) { x.pepa = { n: 0 }; ev(game, 'P-23', { what: 'hatch' }); }
    // P-25: a meteor makes a new vein of ore
    if (story && n >= 58 && n < 90 && !x.meteor) this.meteor(game);
    // P-29: a mine digs up something extra
    const mines = s.buildings.filter((b) => b.type === 'mine' && !b.wreck);
    if (mines.length && story && srnd(game) < (x.mineFind ? 0.09 : cc >= 14 ? 0.5 : 0.09)) {
      const b = mines[Math.floor(srnd(game) * mines.length)];
      const what = ['boot', 'fossil', 'chest', 'slime'][Math.floor(srnd(game) * 4)];
      x.mineFind = 1;
      if (what === 'chest') s.gold += 40;
      ev(game, 'P-29', { what, x: b.x, y: b.y, gold: what === 'chest' ? 40 : 0 });
    }
    // P-50: a building that has stood for 30 waves
    if (!x.flowers) {
      const b = s.buildings.find((o) => cc - o.w0 >= 30);
      if (b) { x.flowers = 1; ev(game, 'P-50', { x: b.x, y: b.y }); }
    }
    // P-49: a lantern after every boss; P-45: the aurora and the rainbow
    if (story && n % 10 === 0 && n <= 90) ev(game, 'P-49', { n: n / 10 });
    if (n === 50) ev(game, 'P-45', { what: 'aurora' });
    if (n === 70) ev(game, 'P-45', { what: 'rainbow' });
    // P-04: much later the gull brings a present
    if (x.gull > 0 && cc >= x.gullW + 12) {
      const g = 25 * x.gull;
      s.gold += g; x.gull = 0; x.gullW = 0;
      ev(game, 'P-04', { what: 'gift', gold: g });
    }
    // P-67: bolder waves pay a little more until the end of the chapter
    if (x.bold === chapterOf(n)) {
      const bonus = Math.round((ECONOMY.waveRewardBase + ECONOMY.waveRewardPerWave * n) * (w.called ? ECONOMY.calledBonus : 1) * 0.1);
      s.gold += bonus;
      ev(game, 'P-67', { what: 'bonus', gold: bonus });
    }
    // blurred card "Smlouva s mlhou"
    if (game.has('mys6') && !w.leaked && s.light < s.maxLight) s.light = Math.min(s.maxLight, s.light + 3);
    // P-56: the parcel lasts until the end of the chapter
    if (x.aid && n % 10 === 0) {
      s.maxLight -= x.aid.light;
      s.light = Math.min(s.light, s.maxLight);
      delete x.aid;
    }
  },

  // P-25: the meteor falls on a free cell far from every path.
  meteor(game) {
    const s = game.s, x = sec(game);
    const path = [];
    for (const p of game.paths()) for (const c of p.cells) path.push(c);
    let best = null, bv = 0;
    for (let y = 5; y < H - 1; y++) for (let xx = 0; xx < W; xx++) {
      const i = idx(xx, y);
      if (!game.open[i] || game.occ[i] || tileAt(xx, y).kind !== 'grass' || s.mapMods[i]) continue;
      if (game.isActiveEntryCell(xx, y)) continue;
      let d = 99;
      for (const c of path) d = Math.min(d, Math.abs(c[0] - xx) + Math.abs(c[1] - y));
      const v = Math.min(d, 6) + srnd(game) * 0.9;
      if (d >= 2 && v > bv) { bv = v; best = [xx, y]; }
    }
    if (!best) return;
    x.meteor = idx(best[0], best[1]) + 1;
    s.mapMods[idx(best[0], best[1])] = 'R';
    useMapMods(s.mapMods);
    s.bver++;
    ev(game, 'P-25', { x: best[0], y: best[1], star: 3.5 });
  },

  // P-22: the wreck of the Válec becomes a wall on the nearest cell where a wall may stand.
  placeWreck(game, at) {
    const s = game.s;
    let best = null, bd = 1e9;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const d = Math.hypot(xx - at[0], y - at[1]);
      if (d >= bd || d > 7) continue;
      if (game.canBuild('wall', xx, y, true).ok) { bd = d; best = [xx, y]; }
    }
    if (!best) return;
    const b = { id: s.nextId++, type: 'wall', x: best[0], y: best[1], level: 1, paid: 80, cd: 0, mode: 'first', dmg: 0, aim: 0, skin: 'valec' };
    s.buildings.push(b);
    s.bver++;
    game.rebuild();
    ev(game, 'P-22', { x: b.x, y: b.y, id: b.id });
  },

  // ---------- every step ----------
  step(game, dt) {
    const s = game.s, x = s.sec;
    if (!x) return;
    if (x.beamT > 0) { x.beamT -= dt; if (x.beamT <= 0) { x.beamT = 0; ev(game, 'P-27', { what: 'end' }); } }
    if (x.beamCd > 0) x.beamCd = Math.max(0, x.beamCd - dt);
    if (x.valecAt) { const at = x.valecAt; delete x.valecAt; this.placeWreck(game, at); }
    if (x.walk) this.walkers(game, dt);
    this.dig(game, dt);
    if (!s.waves.length) return;
    const wn = cur(game);
    for (const w of s.waves) {
      if (w.whaleT && w.t >= w.whaleT) { w.whaleT = 0; x.whale = (x.whale || 0) + 1; x.whaleUp = s.tick + 16 * 30; ev(game, 'P-44', { what: 'come', star: 12 }); }
      if (w.n === 66 && !x.dark66 && w.t > 12 && s.enemies.length >= 3) { x.dark66 = 1; ev(game, 'P-35', { star: 3.6 }); }
      if (w.n === 87 && !x.glitch && w.t > 10) { x.glitch = 1; ev(game, 'P-40'); }
    }
    // P-17: the ice-cream stand
    if (game.sxIce && game.sxIce.length) {
      const d = BUILDINGS.icecream;
      for (const b of game.sxIce) for (const e of s.enemies) {
        if (e.dead || e.fly || e.boss || e.part || e.mini || e.under || e.immune || e.frozen || e.light <= 1) continue;
        if (Math.hypot(e.x - b.x - 0.5, e.y - b.y - 0.5) > d.r || (e.iced && e.iced.includes(b.id))) continue;
        (e.iced || (e.iced = [])).push(b.id);
        e.waitT = Math.max(e.waitT || 0, d.stop);
        s.gold += d.gold;
        ev(game, 'P-17', { what: 'serve', x: e.x, y: e.y, bx: b.x, by: b.y });
      }
    }
    // P-16: bees
    if (game.sxGardens && game.sxGardens.length) {
      const dmg = 3 * growth(wn) * dt;
      for (const g of game.sxGardens) for (const e of s.enemies) {
        if (e.dead || e.under || e.truce) continue;
        if (Math.hypot(e.x - g.x - 0.5, e.y - g.y - 0.5) <= 2) game.damage(e, dmg, 'strela', null, true);
      }
    }
    // P-23: Pepa swallows one ordinary enemy a wave; P-24: the cat catches one šmejdil a wave
    if ((x.pepa && x.pepaW !== wn) || (x.cat === 2 && x.catW !== wn)) {
      const gx = GOAL.x + 0.5, gy = GOAL.y + 0.5;
      for (const e of s.enemies) {
        if (e.dead || e.fly || e.under || e.truce || e.immune || e.golden) continue;
        const d = Math.hypot(e.x - gx, e.y - gy);
        if (x.cat === 2 && x.catW !== wn && e.type === 'smejdil' && d <= 3.2) {
          x.catW = wn;
          const px = e.x, py = e.y;
          game.damage(e, e.hp + e.armor + 1, 'knot', null, true);
          ev(game, 'P-24', { what: 'hunt', x: px, y: py });
        } else if (x.pepa && x.pepaW !== wn && e.light === 5 && !e.boss && !e.part && !e.mini && d <= 1.7) {
          x.pepaW = wn;
          x.pepa.n++;
          e.dead = true;
          const w = game.waveOf(e.w);
          if (w) w.alive--;
          ev(game, 'P-23', { what: 'gulp', x: e.x, y: e.y, n: x.pepa.n });
        }
      }
    }
    // P-39: a learner stops half-way and waves
    if (x.wv) {
      const e = game.findEnemy(x.wv);
      if (!e) x.wv = 0;
      else if (game.dist[idx(e.cx, e.cy)] <= x.wvD) { e.waitT = 2.8; e.wav = 1; x.wv = 0; x.waved = 1; ev(game, 'P-39', { id: e.id, x: e.x, y: e.y }); }
    }
  },

  // Things that walk the maze but are not enemies (the cat).
  walkers(game, dt) {
    const s = game.s, x = s.sec;
    for (const k of x.walk) {
      k.px = k.x; k.py = k.y;
      if (k.t > 0) { k.t -= dt; continue; }
      let m = k.sp * dt;
      for (let guard = 0; guard < 4 && m > 0; guard++) {
        const tx = k.nx + 0.5, ty = k.ny + 0.5, dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy);
        if (d > m) { k.x += dx / d * m; k.y += dy / d * m; break; }
        k.x = tx; k.y = ty; m -= d;
        k.cx = k.nx; k.cy = k.ny;
        if (k.cx === GOAL.x && k.cy === GOAL.y) { k.done = 1; break; }
        const dir = nextDir(game.dist, k.cx, k.cy, k.dir);
        if (dir < 0) { k.done = game.dist[idx(k.cx, k.cy)] < 0 ? 1 : 0; break; }
        k.dir = dir; k.nx = k.cx + DIRS[dir][0]; k.ny = k.cy + DIRS[dir][1];
      }
    }
    for (const k of x.walk) if (k.done && k.k === 'cat') { x.cat = 2; ev(game, 'P-24', { what: 'arrived' }); }
    x.walk = x.walk.filter((k) => !k.done);
    if (!x.walk.length) delete x.walk;
  },

  // P-26, P-28: Knot digs where he stands still for three seconds.
  dig(game, dt) {
    const s = game.s, x = s.sec, h = s.hero;
    if (h.down > 0 || h.path.length || h.swallowT > 0) { if (x.digT) x.digT = 0; return; }
    const cx = Math.floor(h.x), cy = Math.floor(h.y);
    let spot = -1;
    for (let i = 0; i < CROSSES.length; i++) if (CROSSES[i][0] === cx && CROSSES[i][1] === cy && !(x.dug && x.dug[i])) spot = i;
    if (spot < 0 && cx === CHEST[0] && cy === CHEST[1] && !x.chest) spot = 9;
    if (spot < 0) { if (x.digT) x.digT = 0; return; }
    if (x.digI !== spot) { x.digI = spot; x.digT = 0; }
    x.digT = (x.digT || 0) + dt;
    if (x.digT < 3) return;
    x.digT = 0;
    if (spot === 9) {
      x.chest = 1; s.gold += 200;
      ev(game, 'P-28', { x: h.x, y: h.y, gold: 200 });
      return;
    }
    x.dug = x.dug || {};
    x.dug[spot] = 1;
    const gold = 40 + 10 * chapterOf(cur(game));
    s.gold += gold;
    const n = Object.keys(x.dug).length;
    ev(game, 'P-26', { what: 'dig', x: h.x, y: h.y, gold, n });
    if (n >= CROSSES.length && !s.relics.includes('hugoCap')) { s.relics.push('hugoCap'); ev(game, 'P-26', { what: 'cap', x: h.x, y: h.y }); }
  },

  // ---------- commands from the interface ----------
  command(game, cmd, a, b) {
    const s = game.s, x = sec(game), h = s.hero;
    const wn = cur(game);
    switch (cmd) {
      case 'disco':
        if (x.discoW === wn) return { ok: false };
        x.discoW = wn; ev(game, 'P-02');
        return { ok: true };
      case 'pet':
        if (!x.wander) return { ok: false };
        x.petTaps = (x.petTaps || 0) + 1;
        if (x.petTaps >= 10) { x.pet = chapterOf(Math.min(s.nextWave, 100)); x.wander = 0; x.petTaps = 0; ev(game, 'P-01', { what: 'pet' }); }
        else ev(game, 'P-01', { what: 'squeak', n: x.petTaps });
        return { ok: true };
      case 'pond':
        x.pond = (x.pond || 0) + 1;
        ev(game, 'P-14', { what: x.pond % 5 === 0 ? 'gull' : 'fish', n: x.pond, x: a, y: b });
        if (x.pond >= 20 && !x.eye) { x.eye = 1; ev(game, 'P-31'); }
        return { ok: true };
      case 'beam':
        if (x.beamT > 0) return { ok: true, on: true };
        if (x.beamCd > 0) return { ok: false, cd: Math.ceil(x.beamCd) };
        x.beamT = 5; x.beamCd = 60; ev(game, 'P-27', { what: 'start' });
        return { ok: true };
      case 'aim':
        if (!(x.beamT > 0)) return { ok: false };
        s.beam = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return { ok: true };
      case 'whale':
        if (!(x.whaleUp > s.tick) || x.song || !s.waves.length) return { ok: false };
        x.song = wn; x.whaleUp = 0; ev(game, 'P-44', { what: 'sing', star: 4 });
        return { ok: true };
      case 'star': {
        x.stars = (x.stars || 0) + 1;
        if (x.stars % 2 === 0 && !x.extraCard) { x.extraCard = 1; ev(game, 'P-45', { what: 'star', card: 1 }); }
        else { const g = 20 + 2 * s.completedCount; s.gold += g; ev(game, 'P-45', { what: 'star', gold: g }); }
        return { ok: true };
      }
      case 'plane':
        x.plane = (x.plane || 0) + 1; s.gold += 30; ev(game, 'P-47', { gold: 30 });
        return { ok: true };
      case 'bottle':
        if (!x.bottle) return { ok: false };
        x.bottle = 0; x.bottles = (x.bottles || 0) + 1;
        return { ok: true, n: x.bottles };
      case 'aid': {
        const ch = chapterOf(Math.min(s.nextWave, 100));
        if (x.aid && x.aid.ch === ch && x.aid.lvl >= a) return { ok: false };
        if (x.aid) { s.maxLight -= x.aid.light; s.light = Math.min(s.light, s.maxLight); }
        x.aid = { ch, lvl: a, gold: a >= 2 ? 0.3 : 0.15, light: a >= 2 ? 40 : 20 };
        s.maxLight += x.aid.light; s.light += x.aid.light;
        ev(game, 'P-56', { lvl: a });
        return { ok: true };
      }
      case 'poke': h.confusedT = Math.max(h.confusedT, 1.4); ev(game, 'P-64'); return { ok: true };
      case 'shiver': if (x.p32) return { ok: false }; x.p32 = 1; h.confusedT = 2.2; ev(game, 'P-32'); return { ok: true };
      case 'mark': if (x['m' + a]) return { ok: false }; x['m' + a] = 1; return { ok: true };
      case 'endlessBonus': if (x.eb || !(a > 0)) return { ok: false }; x.eb = 1; s.gold += Math.min(600, Math.floor(a)); return { ok: true };
      case 'trade': return this.trade(game, a, b);
    }
    return { ok: false };
  },

  tradeCost(game, kind) {
    const m = game.s.sec && game.s.sec.merchant;
    const n = m ? m.wave : 0;
    return kind === 'box' ? 50 + 3 * n : kind === 'bag' ? 30 : 0;
  },

  // P-18: one of the pedlar's deals. i = index of the offer, arg = a building id for the swap.
  trade(game, i, arg) {
    const s = game.s, x = sec(game), m = x.merchant;
    if (!m || m.used[i] || !m.offers[i] || game.phase() !== 'build') return { ok: false };
    const kind = m.offers[i];
    const cost = this.tradeCost(game, kind);
    if (s.gold < cost) return { ok: false, reason: 'noGold' };
    let what = '';
    if (kind === 'box') {
      const r = srnd(game);
      s.gold -= cost;
      if (r < 0.3) { what = 'double'; s.gold += cost * 2; }
      else if (r < 0.5) { what = 'card'; s.picks.push({ kind: 'card', wave: m.wave }); }
      else if (r < 0.66) { what = 'light'; s.light = Math.min(s.maxLight, s.light + 15); }
      else if (r < 0.82) { what = 'tower'; const t = BASIC_TOWERS.filter((k) => game.isUnlocked(k)); s.free[t[Math.floor(srnd(game) * t.length)]] = 1; }
      else what = 'sock';
    } else if (kind === 'relic') {
      if (s.light <= 10) return { ok: false, reason: 'noLight' };
      if (!RELICS.some((c) => !game.owns(c.id) && (c.minWave || 0) <= s.completedCount)) return { ok: false, reason: 'none' };
      s.light -= 10;
      s.picks.push({ kind: 'relic', wave: m.wave });
      what = 'relic';
    } else if (kind === 'swap') {
      const t = game.byId.get(arg);
      if (!t || t.wreck || !BASIC_TOWERS.includes(t.type)) return { ok: false, reason: 'pick' };
      const types = BASIC_TOWERS.filter((k) => k !== t.type && game.isUnlocked(k));
      t.type = types[Math.floor(srnd(game) * types.length)];
      t.level = Math.min(t.level + 1, Math.max(game.maxLevel(), t.level));
      if (t.level >= 3 && SPECS[t.type]) { t.spec = srnd(game) < 0.5 ? 'A' : 'B'; t.mode = SPECS[t.type][t.spec].mode || 'first'; }
      else { delete t.spec; t.mode = 'first'; }
      t.cd = 0;
      s.bver++;
      game.rebuild();
      what = t.type;
      ev(game, 'P-18', { what: 'swap', id: t.id, x: t.x, y: t.y });
    } else if (kind === 'bag') {
      s.gold -= cost;
      const r = srnd(game);
      if (r < 0.34) what = 'hat';
      else if (r < 0.6) what = 'msg';
      else if (r < 0.8) { what = 'gold'; s.gold += 90; }
      else { what = 'coin'; s.gold += 1; }
    }
    m.used[i] = 1;
    game.undoSnap = null;
    ev(game, 'P-18', { what: 'trade', kind, res: what });
    if (!s.pick) game.nextPick();
    return { ok: true, kind, what };
  },
};

void inBounds;
