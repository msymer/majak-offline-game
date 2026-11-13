// Game-logic side of the secret moments (05_TAJNE.md). Pure: no DOM, no Three.js.
// The game calls these hooks; everything they change lives in the game state (s.sec, s.items, s.dark, s.fin).
import { idx, inBounds, DIRS, GOAL, W, entriesForWave, findPath, followField } from '../sim/grid.js';
import { rnd } from '../sim/rng.js';
import { HERO } from '../data/rules.js';
import { THRESHOLD } from '../data/map.js';
import { finale } from './finale.js';
import { world } from './world.js';

const growth = (w) => Math.pow(1.055, Math.max(0, w - 1));

// Journal pages that come on their own after a boss (the others are found: 7 in a wreck, 9 a chip, 10 a letter).
const BOSS_PAGES = { 10: 1, 20: 2, 30: 3, 40: 4, 50: 5, 60: 6, 80: 8 };

function nearFree(game, x, y) {
  let best = null, bd = 1e9;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = Math.floor(x) + dx, cy = Math.floor(y) + dy;
    if (!inBounds(cx, cy) || !game.heroWalkable(idx(cx, cy))) continue;
    const d = Math.hypot(cx + 0.5 - x, cy + 0.5 - y);
    if (d < bd) { bd = d; best = [cx, cy]; }
  }
  return best;
}

function addItem(game, kind, x, y, extra = {}) {
  const s = game.s;
  const it = { id: s.nextId++, kind, x, y, ...extra };
  s.items.push(it);
  game.emit({ k: 'item', kind, id: it.id, x, y });
  return it;
}

export const secretSim = {
  // ---------- P-59: the gate guardian drags Knot along ----------
  onBossRelocate(game, e) {
    if (e.type !== 'strazce_brany') return;
    const h = game.s.hero;
    if (h.down > 0 || h.swallowT > 0) return;
    let best = null, bd = 1e9;
    for (const [dx, dy] of DIRS) {
      const x = e.cx + dx, y = e.cy + dy;
      if (!inBounds(x, y) || !game.heroWalkable(idx(x, y))) continue;
      const d = Math.hypot(x - GOAL.x, y - GOAL.y);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) return;
    const fx = h.x, fy = h.y;
    h.x = h.px = best[0] + 0.5; h.y = h.py = best[1] + 0.5;
    h.path = []; h.plugT = 0; h.repT = 0;
    h.tx = best[0]; h.ty = best[1];
    h.face = Math.atan2(e.y - h.y, e.x - h.x);
    h.confusedT = 2.5;
    game.emit({ k: 'secret', code: 'P-59', fx, fy, x: h.x, y: h.y });
  },

  // ---------- hooks ----------

  onWaveStart(game, w) {
    const s = game.s;
    if (w.n === 99) s.holdFire = false;
    if (w.n === 100) finale.start(game, w);
    world.onWaveStart(game, w);
  },

  onSpawn(game, e, opts = {}) {
    const s = game.s;
    world.onSpawn(game, e, opts);
    if (e.type === 'posel') game.emit({ k: 'secret', code: 'P-63', what: 'spawn', id: e.id });
    // P-60 (and P-31): the first deep worm comes up from the pond of the meadow, not from a hole.
    if (e.type === 'hlubinny_cerv' && !e.ret && !s.sec.pond) {
      s.sec.pond = 1;
      for (const [x, y] of [[8, 14], [5, 14], [8, 13], [8, 15]]) {
        if (!game.isOpen(x, y) || game.dist[idx(x, y)] <= 0) continue;
        e.cx = e.nx = x; e.cy = e.ny = y; e.x = e.px = x + 0.5; e.y = e.py = y + 0.5; e.dir = -1; e.hist = [];
        game.pickNext(e);
        break;
      }
      game.emit({ k: 'secret', code: 'P-60', what: 'pond', x: 7, y: 14.5, id: e.id });
    }
    if (e.type === 'srdce_mlhy' || e.type === 'srdicko') finale.onSpawn(game, e);
  },

  // A worm comes up: the second time the first deep worm swallows Knot (P-60).
  onEmerge(game, e) {
    const s = game.s, h = s.hero;
    if (e.type !== 'hlubinny_cerv' || e.ret || e.bur.n !== 1 || s.sec.swallowed) return;
    if (h.down > 0) return;
    s.sec.swallowed = 1;
    h.swallowT = 8; h.swallowId = e.id; h.taps = 0;
    h.path = []; h.plugT = 0; h.repT = 0;
    // the worm stays up a little longer, so the whole moment happens above ground
    e.bur.t = Math.max(e.bur.t, 9.5);
    game.emit({ k: 'secret', code: 'P-60', what: 'swallow', id: e.id, x: e.x, y: e.y, star: 8 });
  },

  // Tapping inside the worm: Knot bangs the walls with the wrench.
  wormTap(game) {
    const s = game.s, h = s.hero;
    if (!(h.swallowT > 0)) return { ok: false };
    const e = game.findEnemy(h.swallowId);
    if (!e || h.taps >= 40) return { ok: false };
    h.taps++;
    e.hp -= e.mhp * 0.007;
    if (e.hp <= 1) e.hp = 1;
    game.emit({ k: 'wormHit', n: h.taps });
    return { ok: true };
  },

  // Returns true when the hook took care of the enemy reaching the lighthouse.
  onLeak(game, e) {
    if (e.messenger || e.type === 'posel') { this.messengerArrived(game, e); return true; }
    if (e.type === 'srdce_mlhy' || e.type === 'srdicko') return finale.onLeak(game, e);
    return world.onLeak(game, e);
  },

  onHurt(game, e) {
    const s = game.s;
    if (e.type === 'mistr' && !e.ret && !s.sec.dark && e.hp / e.mhp < 0.5) this.spawnDark(game, e);
    if (e.type === 'srdce_mlhy') finale.onHurt(game, e);
  },

  // Returns true when the hook took over the death completely.
  onDeath(game, e) {
    const s = game.s;
    if (e.type === 'srdce_mlhy') return finale.onDeath(game, e);
    world.onDeath(game, e);
    if (e.type === 'posel') {
      // P-63: the letter stays on the path and Knot goes for it.
      const it = addItem(game, 'letter', e.x, e.y);
      s.sec.letterKilled = 1;
      const h = s.hero;
      if (h.down <= 0) { const c = nearFree(game, e.x, e.y); if (c) game.heroMove(c[0], c[1]); }
      game.emit({ k: 'secret', code: 'P-63', what: 'killed', id: it.id });
      return false;
    }
    // P-46: the swarm queen falls and all her little ones turn into butterflies.
    if (e.type === 'kralovna_roje' && e.w <= 100) {
      const pts = [];
      for (const o of s.enemies) {
        if (o.dead || (o.type !== 'rojik' && o.type !== 'vejce')) continue;
        pts.push([o.x, o.y]);
        o.dead = true;
        const w = game.waveOf(o.w);
        if (w) w.alive--;
      }
      game.emit({ k: 'secret', code: 'P-46', x: e.x, y: e.y, pts, star: pts.length ? 4 : 2.5 });
      return false;
    }
    // P-62: the siege tower leaves a wreck with a lantern in it.
    if (e.type === 'oblehaci_vez' && !e.ret && !s.sec.wreck) {
      s.sec.wreck = 1;
      addItem(game, 'wreck', e.x, e.y, { until: e.w + 1 });
      return false;
    }
    return false;
  },

  // ---------- P-61: the dark Knot ----------
  spawnDark(game, m) {
    const s = game.s;
    s.sec.dark = 1;
    const mhp = game.heroMaxHp();
    s.dark = { x: m.x + 0.6, y: m.y, px: m.x + 0.6, py: m.y, hp: mhp, mhp, t: 0, atk: 1, face: 0, swing: 0 };
    game.emit({ k: 'secret', code: 'P-61', what: 'spawn', x: m.x, y: m.y, star: 2 });
  },

  hitDark(game, dmg) {
    const d = game.s.dark;
    if (!d) return;
    d.hp -= dmg;
    if (d.hp <= 0) this.darkGone(game, true);
  },

  darkGone(game, beaten) {
    const s = game.s, d = s.dark;
    if (!d) return;
    s.dark = null;
    addItem(game, 'chip', d.x, d.y);
    game.emit({ k: 'secret', code: 'P-61', what: beaten ? 'beaten' : 'gone', x: d.x, y: d.y });
  },

  darkStep(game, dt) {
    const s = game.s, d = s.dark, h = s.hero;
    d.px = d.x; d.py = d.y;
    d.t += dt;
    if (d.swing > 0) d.swing -= dt;
    if (d.t >= 30) { this.darkGone(game, false); return; }
    if (h.down > 0 || h.swallowT > 0) return;
    const dx = h.x - d.x, dy = h.y - d.y, dist = Math.hypot(dx, dy);
    d.face = Math.atan2(dy, dx);
    if (dist > 0.85) {
      const m = Math.min(dist - 0.8, game.heroSpeed() * 0.85 * dt);
      d.x += dx / dist * m; d.y += dy / dist * m;
    }
    d.atk -= dt;
    if (dist <= HERO.attackRange && d.atk <= 0) {
      d.atk = 1 / HERO.attackRate;
      d.swing = 0.25;
      h.hp -= game.heroDmg();
      game.emit({ k: 'darkHit', x: h.x, y: h.y });
    }
  },

  // ---------- P-63: the messenger ----------
  messengerArrived(game, e) {
    const s = game.s;
    e.home = 1;
    e.homeT = 2.5;
    e.x = e.px = THRESHOLD.x + 0.5; e.y = e.py = THRESHOLD.y + 0.5;
    e.cx = THRESHOLD.x; e.cy = THRESHOLD.y;
    // way back to the north entry
    const n = entriesForWave(e.w).find((p) => p.key === 'S');
    const path = n ? findPath((i) => game.walkable(i), THRESHOLD.x, THRESHOLD.y, n.x, n.y) : null;
    e.homePath = path || [];
    s.pages.push(10);
    if (!s.relics.includes('letter')) s.relics.push('letter');
    s.sec.letter = 1;
    game.emit({ k: 'secret', code: 'P-63', what: 'arrived', x: e.x, y: e.y, star: 4 });
    game.emit({ k: 'page', n: 10 });
  },

  messengerStep(game, e, dt) {
    if (e.homeT > 0) { e.homeT -= dt; e.vx = 0; e.vy = 0; return; }
    e.px = e.x; e.py = e.y;
    let m = 0.6 * dt;
    while (m > 0 && e.homePath.length) {
      const [cx, cy] = e.homePath[0];
      const tx = cx + 0.5, ty = cy + 0.5, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d > m) { e.x += dx / d * m; e.y += dy / d * m; m = 0; } else { e.x = tx; e.y = ty; m -= d; e.homePath.shift(); }
    }
    e.vx = (e.x - e.px) / dt; e.vy = (e.y - e.py) / dt;
    e.homeLeft = (e.homeLeft ?? 40) - dt;
    if (!e.homePath.length || e.homeLeft <= 0) game.vanish(e);
  },

  // ---------- items lying on the map ----------

  pickItem(game, id) {
    const s = game.s;
    const it = s.items.find((x) => x.id === id);
    if (!it) return { ok: false };
    s.items = s.items.filter((x) => x.id !== id);
    let page = 0;
    if (it.kind === 'wreck') { page = 7; s.sec.wreckRead = 1; }
    if (it.kind === 'chip') { page = 9; s.sec.chipRead = 1; }
    if (it.kind === 'letter') { page = 10; s.sec.torn = 1; }
    if (page) s.pages.unshift(page);
    game.emit({ k: 'pickItem', kind: it.kind, x: it.x, y: it.y, page });
    if (it.kind === 'letter') game.emit({ k: 'secret', code: 'P-63', what: 'torn' });
    return { ok: true, page };
  },

  // ---------- every step ----------
  step(game, dt) {
    const s = game.s, h = s.hero;
    // P-60: inside the worm
    if (h.swallowT > 0) {
      const e = game.findEnemy(h.swallowId);
      h.swallowT = e ? h.swallowT - dt : 0;
      if (e) { h.x = h.px = e.x; h.y = h.py = e.y; }
      if (h.swallowT <= 0) {
        h.swallowT = 0;
        const c = nearFree(game, h.x, h.y) || [THRESHOLD.x, THRESHOLD.y];
        h.x = h.px = c[0] + 0.5; h.y = h.py = c[1] + 0.5; h.path = [];
        h.confusedT = 1.6;
        game.emit({ k: 'secret', code: 'P-60', what: 'spat', x: h.x, y: h.y, taps: h.taps || 0 });
      }
    }
    if (s.dark) this.darkStep(game, dt);
    for (const e of s.enemies) if (e.home && !e.dead) this.messengerStep(game, e, dt);
    // Knot picks up the letter when he gets to it
    if (s.items.length && h.down <= 0) {
      for (const it of s.items) if (it.kind === 'letter' && Math.hypot(it.x - h.x, it.y - h.y) < 0.8) { this.pickItem(game, it.id); break; }
    }
    if (s.fin) finale.step(game, dt);
    world.step(game, dt);
    // P-57: after the end Hugo sits by the lighthouse and now and then throws a wrench at the strongest enemy.
    if (s.finished && s.endless && s.waves.length) {
      s.hugoT = (s.hugoT || 0) + dt;
      if (s.hugoT >= 25) {
        let best = null;
        for (const e of s.enemies) if (!e.dead && e.vis && !e.under && (!best || e.hp > best.hp)) best = e;
        if (best) {
          s.hugoT = 0;
          const bx = best.x, by = best.y;
          game.damage(best, 300 * growth(Math.min(best.w, 100)), 'knot', null);
          game.emit({ k: 'secret', code: 'P-57', what: 'throw', x: bx, y: by });
        }
      }
    }
  },

  waveCanEnd(game, w) {
    const s = game.s;
    if (w.n === 100 && s.fin && !s.fin.done) return false;
    return true;
  },

  // Page that lies on the island after wave n (0 = none).
  pageAfter(game, n) {
    const s = game.s;
    if (n > 100) return 0;
    if (BOSS_PAGES[n]) return BOSS_PAGES[n];
    // The siege tower got away: the page comes anyway.
    if (n === 70 && !s.items.some((it) => it.kind === 'wreck') && !s.sec.wreckRead) return 7;
    if (n === 90 && !s.dark && !s.items.some((it) => it.kind === 'chip') && !s.sec.chipRead) { s.sec.chipRead = 1; return 9; }
    return 0;
  },

  onWaveEnd(game, w) {
    const s = game.s;
    if (w.n === 99) s.holdFire = false;
    // the wreck stays until the end of the next wave; then the page comes anyway
    for (const it of [...s.items]) {
      if (it.kind !== 'wreck' || it.until > w.n) continue;
      s.items = s.items.filter((x) => x !== it);
      s.pages.push(7);
      s.sec.wreckRead = 1;
      game.emit({ k: 'page', n: 7 });
    }
    world.onWaveEnd(game, w);
  },

  // ---------- stage 5: the rest of the surprises (world.js) ----------
  onRebuild(game) { world.onRebuild(game); },
  gold(game, e, gold, src) { return world.gold(game, e, gold, src); },
  dmgMod(game, b) { return world.dmgMod(game, b); },
  rangeMod(game, b) { return world.rangeMod(game, b); },
  rateMod(game, b) { return world.rateMod(game, b); },
  heroSpeedMod(game) { return world.heroSpeedMod(game); },
  secretRecipe(game, src, dst) { return world.secretRecipe(game, src, dst); },
  vault(game, e) { return world.vault(game, e); },
  cardOffer(game, kind, ids, rest) { return world.cardOffer(game, kind, ids, rest); },
  command(game, cmd, a, b) { return world.command(game, cmd, a, b); },
};

// Debug helpers (only used by ?debug=1).
export function debugSpawnDark(game) {
  const h = game.s.hero;
  secretSim.spawnDark(game, { x: h.x + 1.2, y: h.y });
}

void W; void rnd; void followField;
