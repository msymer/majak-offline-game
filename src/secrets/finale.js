// The finale, wave 100 (05_TAJNE.md, section 5). Pure logic; the view and the interface read s.fin.
//   phase 1  the heart of the mist walks from the north and calls enemies of chapters 1–3 every 12 s
//   phase 2  it falls apart into three small hearts (north, east, west) that call enemies of chapters 4–8
//   phase 3  no fight: it comes together again and walks to the lighthouse; the player gives the signal
//   phase 4  after the signal: golden beam, the mist falls apart, Hugo walks home
import { idx, entriesForWave, entryPos, findPath, GOAL } from '../sim/grid.js';
import { rnd } from '../sim/rng.js';
import { THRESHOLD } from '../data/map.js';

const CALL_EVERY = 12;
const CALL_HP = 0.55; // the called enemies are weaker than a normal wave 100 would make them
const GROUPS_EARLY = [[['sliz', 4]], [['smejdil', 4]], [['tlustoch', 1], ['sliz', 2]], [['plechac', 2]], [['dron', 2]], [['sberac', 2]], [['felcar', 1], ['sliz', 2]], [['bahnak', 2]]];
const GROUPS_LATE = [[['bourac', 1], ['sliz', 2]], [['mlzak', 3]], [['rojik', 10]], [['nosic', 1]], [['rusicka', 1], ['plechac', 1]], [['balista', 1]], [['tunelar', 2]], [['bahnak', 2]]];
// Signal: three long presses and one short. Long = at least LONG s; anything shorter is short (generous).
export const SIGNAL = { long: 0.42, hints: [15, 30, 45], hugoAt: 4 };

function heartPos(game) {
  return entryPos('S', 100) || { x: 9, y: 5 };
}

export const finale = {
  start(game, w) {
    game.s.fin = { phase: 1, t: 0, callT: 4, heart: 0, parts: [], presses: [], p3t: 0, hint: 0, byKnot: false, done: false, hugo: null, after: 0, prog: 0, morse: false, wave: w.n };
    game.emit({ k: 'secret', code: 'FIN', what: 'start' });
  },

  onSpawn(game, e) {
    const f = game.s.fin;
    if (!f) return;
    e.fam = 0;
    if (e.type === 'srdce_mlhy' && f.phase === 1 && !f.heart) { f.heart = e.id; f.mhp = e.mhp; }
  },

  // Calls a group of enemies from every active entry (or from one entry).
  call(game, w, groups, only) {
    const s = game.s;
    for (const p of entriesForWave(w.n)) {
      if (only ? p.key !== only : p.key.startsWith('D')) continue;
      if (!game.isOpen(p.x, p.y) || game.dist[idx(p.x, p.y)] <= 0) continue;
      let list = groups[Math.floor(rnd(s.rng) * groups.length)];
      if (list[0][0] === 'tunelar' && !p.key.startsWith('D')) list = [['plechac', 2]];
      let t = 0;
      for (const [type, n] of list) for (let k = 0; k < n; k++) { game.queueSpawn(w, p.key, type, t, CALL_HP); t += type === 'rojik' ? 0.3 : 0.8; }
    }
  },

  step(game, dt) {
    const s = game.s, f = s.fin;
    if (f.done) return;
    const w = game.waveOf(f.wave);
    f.t += dt;
    if (f.phase === 1 || f.phase === 2) {
      f.callT -= dt;
      if (f.callT <= 0 && w) {
        f.callT = CALL_EVERY;
        if (f.phase === 1) this.call(game, w, GROUPS_EARLY);
        else for (const id of f.parts) { const e = game.findEnemy(id); if (e) this.call(game, w, GROUPS_LATE, e.ent); }
      }
      if (f.phase === 2 && f.parts.length && f.parts.every((id) => !game.findEnemy(id))) this.calm(game, w);
      return;
    }
    if (f.phase === 3) {
      f.p3t += dt;
      const e = game.findEnemy(f.heart);
      if (e) {
        const d0 = f.d0 || 1, d = game.dist[idx(e.cx, e.cy)];
        f.prog = Math.max(0, Math.min(1, 1 - Math.max(0, d) / d0));
      }
      if (!f.said && f.p3t >= SIGNAL.hugoAt) { f.said = 1; game.emit({ k: 'secret', code: 'FIN', what: 'hugo' }); }
      const ht = f.p3t - SIGNAL.hugoAt;
      if (f.hint < SIGNAL.hints.length && ht >= SIGNAL.hints[f.hint]) {
        f.hint++;
        if (f.hint === 3) f.morse = true;
        game.emit({ k: 'secret', code: 'FIN', what: 'hint', n: f.hint });
      }
      return;
    }
    if (f.phase === 4) {
      f.after += dt;
      const H = f.hugo;
      if (f.after > 3.2 && H.path.length) {
        let m = 1.5 * dt;
        H.px = H.x; H.py = H.y;
        while (m > 0 && H.path.length) {
          const [cx, cy] = H.path[0];
          const tx = cx + 0.5, ty = cy + 0.5, dx = tx - H.x, dy = ty - H.y, d = Math.hypot(dx, dy);
          if (d > 1e-6) H.face = Math.atan2(dy, dx);
          if (d > m) { H.x += dx / d * m; H.y += dy / d * m; m = 0; } else { H.x = tx; H.y = ty; m -= d; H.path.shift(); }
        }
      } else { H.px = H.x; H.py = H.y; }
      // Knot runs to meet him
      const h = s.hero;
      if (f.after > 3.2 && !h.path.length && h.down <= 0 && Math.hypot(h.x - H.x, h.y - H.y) > 1.2 && !f.metAsked) {
        f.metAsked = 1;
        game.heroMove(Math.floor(H.x), Math.floor(H.y));
      }
      if (!H.path.length || f.after > 16) {
        if (!f.met) { f.met = 1; f.metT = f.after; game.emit({ k: 'secret', code: 'FIN', what: 'met', x: H.x, y: H.y }); }
        if (f.after - f.metT > 3.5) { f.done = true; if (w) { w.q.length = w.qi; } }
      }
    }
  },

  // Phase 1 -> 2: the heart falls apart into three, one at each of the big entries.
  onHurt(game, e) {
    const s = game.s, f = s.fin;
    if (!f || f.phase !== 1 || e.id !== f.heart) return;
    if (e.hp / e.mhp > 0.66) return;
    this.split(game, e);
  },

  split(game, e) {
    const s = game.s, f = s.fin;
    const w = game.waveOf(e.w);
    const rem = Math.max(e.mhp * 0.33, e.hp);
    e.dead = true;
    if (w) w.alive--;
    f.phase = 2;
    f.callT = 6;
    f.parts = [];
    for (const key of ['S', 'V', 'Z']) {
      const p = entryPos(key, e.w);
      if (!p || !w) continue;
      const c = game.spawnEnemy('srdicko', w, key, p.x, p.y, { hp: rem / 3, deferred: true, quiet: true, stun: 0.8 });
      c.fam = 0;
      f.parts.push(c.id);
    }
    game.emit({ k: 'secret', code: 'FIN', what: 'split', x: e.x, y: e.y });
  },

  // Phase 2 -> 3: nobody fights any more.
  calm(game, w) {
    const s = game.s, f = s.fin;
    f.phase = 3;
    f.p3t = 0;
    if (w) w.q.length = w.qi;
    const p = heartPos(game);
    for (const e of s.enemies) { if (e.dead) continue; e.frozen = true; e.lookX = p.x + 0.5; e.lookY = p.y + 0.5; }
    s.projectiles = [];
    s.fires = [];
    const e = w ? game.spawnEnemy('srdce_mlhy', w, 'S', p.x, p.y, { hp: (f.mhp || 6000) * 0.33, quiet: true, deferred: true, stun: 2.5 }) : null;
    if (e) { e.immune = true; e.calm = true; f.heart = e.id; f.d0 = Math.max(1, game.dist[idx(p.x, p.y)]); e.spd = 0.36; }
    game.emit({ k: 'secret', code: 'FIN', what: 'calm', x: p.x + 0.5, y: p.y + 0.5, star: 999 });
  },

  // A press on the lighthouse while the figure walks: three long and one short is the signal.
  press(game, dur) {
    const f = game.s.fin;
    if (!f || f.phase !== 3 || f.p3t < 1) return { ok: false };
    f.presses.push(dur >= SIGNAL.long ? 'L' : 'S');
    if (f.presses.length > 8) f.presses.shift();
    game.emit({ k: 'signalBlink', long: dur >= SIGNAL.long });
    const last = f.presses.slice(-4).join('');
    if (last === 'LLLS') this.signal(game, false);
    return { ok: true };
  },

  // The signal was given (by the player, or by Knot himself when the figure reached the lighthouse).
  signal(game, byKnot) {
    const s = game.s, f = s.fin;
    if (f.phase !== 3) return;
    f.phase = 4;
    f.byKnot = byKnot;
    f.after = 0;
    const e = game.findEnemy(f.heart);
    const hx = e ? e.x : THRESHOLD.x + 0.5, hy = e ? e.y : THRESHOLD.y - 2.5;
    const lights = [];
    for (const o of s.enemies) {
      if (o.dead) continue;
      lights.push([o.x, o.y]);
      o.dead = true;
      const w = game.waveOf(o.w);
      if (w) w.alive--;
    }
    // Hugo stands where the heart was and walks to the lighthouse.
    const cx = Math.floor(hx), cy = Math.floor(hy);
    const path = findPath((i) => game.walkable(i), cx, cy, THRESHOLD.x, THRESHOLD.y) || [];
    f.hugo = { x: cx + 0.5, y: cy + 0.5, px: cx + 0.5, py: cy + 0.5, face: Math.PI / 2, path };
    game.emit({ k: 'secret', code: 'FIN', what: 'signal', byKnot, x: hx, y: hy, lights, star: 999 });
  },

  onLeak(game, e) {
    const f = game.s.fin;
    if (!f) return false;
    if (e.type === 'srdce_mlhy' && f.phase === 3) {
      // The figure reached the lighthouse and no signal came: Knot climbs up and gives it himself.
      e.x = e.px = THRESHOLD.x + 0.5; e.y = e.py = THRESHOLD.y + 0.5;
      e.cx = THRESHOLD.x; e.cy = THRESHOLD.y;
      e.frozen = true;
      game.emit({ k: 'secret', code: 'FIN', what: 'knotSignals' });
      this.signal(game, true);
      return true;
    }
    if (e.type === 'srdce_mlhy' && f.phase === 1) {
      // The heart got to the lighthouse while still in one piece: it takes light and falls apart.
      game.s.light = Math.max(0, game.s.light - 30);
      game.emit({ k: 'leak', type: e.type, light: 30, x: e.x, y: e.y });
      e.x = e.px = GOAL.x + 0.5; e.y = e.py = GOAL.y - 1.5;
      this.split(game, e);
      return true;
    }
    return false;
  },

  // The big heart never just dies: in phase 1 it splits, in phase 3 it cannot be hurt.
  onDeath(game, e) {
    const f = game.s.fin;
    if (!f) return false;
    if (f.phase === 1 && e.id === f.heart) {
      e.dead = false;
      e.hp = Math.max(1, e.mhp * 0.3);
      this.split(game, e);
      return true;
    }
    if (e.calm) { e.dead = false; e.hp = 1; return true; }
    return false;
  },
};
