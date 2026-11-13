// Towers, traps, teleports, projectiles, damage, death and spells. Mixed into the Game class (this = Game).
import { W, DIRS, idx, tileAt, GOAL } from './grid.js';
import { rnd } from './rng.js';
import { BUILDINGS, LEVEL_POWER, RANGE_PER_LEVEL, TERRAIN, SPECS } from '../data/buildings.js';
import { ENEMIES } from '../data/enemies.js';
import { HERO } from '../data/rules.js';
import { cardById } from '../data/cards.js';
import { LIGHTHOUSE } from '../data/map.js';
import { secretSim } from '../secrets/sim.js';

const growth = (w) => Math.pow(1.055, Math.max(0, w - 1));

export const combat = {
  // Numbers of a tower with everything that changes them (level, terrain, specialisation, cards, relics).
  towerStats(b) {
    const d = BUILDINGS[b.type];
    if (!d.tower) return null;
    const t = tileAt(b.x, b.y);
    const lv = b.level;
    const sp = b.spec && SPECS[b.type] ? SPECS[b.type][b.spec] : null;
    const heights = this.has('heights');
    let dmg = d.dmg * Math.pow(LEVEL_POWER, lv - 1);
    if (t.crystal) dmg *= heights ? 2 : TERRAIN.crystalDmg;
    let range = d.range + RANGE_PER_LEVEL * (lv - 1);
    if (t.plateau) range += TERRAIN.plateauRange * (heights ? 2 : 1);
    if (this.has('telescope')) range += 0.5;
    if (this.has('neighbors') && b._nearMine) range += 0.5;
    let rate = d.rate;
    if (sp) { if (sp.dmg) dmg *= sp.dmg; if (sp.rate) rate *= sp.rate; if (sp.range) range += sp.range; }
    if (this.amp[idx(b.x, b.y)]) dmg *= 1 + BUILDINGS.amplifier.boost;
    if (this.has('anvil')) dmg *= 1 + 0.15 * (lv - 1);
    if (this.has('secondLine') && Math.hypot(b.x - LIGHTHOUSE.x, b.y + 0.5 - (LIGHTHOUSE.y + 0.5)) <= 3) dmg *= 1.3;
    if (this.has('longTrack')) dmg *= 1 + Math.min(0.4, Math.floor(this.pathLen / 5) * 0.01);
    dmg *= secretSim.dmgMod(this, b);
    range += secretSim.rangeMod(this, b);
    const st = { dmg, range, rate, ground: d.ground, air: d.air, dtype: d.dtype, spec: sp ? sp.id : null };
    if (d.attack === 'pulse') {
      st.slow = sp && sp.slow ? Math.max(sp.slow, d.slow[lv]) : d.slow[lv];
      st.slowDur = d.slowDur[lv];
      if (sp && sp.freezeChance) { st.freezeChance = sp.freezeChance; st.freeze = sp.freeze; }
      if (sp && sp.brittle) st.brittle = sp.brittle;
    }
    if (d.splash) st.splash = d.splash * (sp && sp.splash ? sp.splash : 1);
    if (sp && sp.burn) { st.burn = sp.burn; st.burnShare = sp.burnShare; }
    if (sp && sp.shred) st.shred = sp.shred;
    if (d.chill) st.chill = d.chill;
    if (d.freeze) st.freeze = d.freeze;
    if (d.storm) st.storm = d.storm;
    if (d.width) st.width = d.width;
    if (d.attack === 'chain') {
      st.targets = (sp && sp.targets ? sp.targets : d.targets) + (this.has('pocketStorm') ? 2 : 0);
      st.falloff = d.falloff; st.jump = d.jump;
      if (sp && sp.stunMachines) st.stunMachines = sp.stunMachines;
    }
    return st;
  },

  trapDmg(b) { return BUILDINGS.trap.dmg * Math.pow(LEVEL_POWER, b.level - 1); },

  rateMult(b) {
    let m = 1;
    if (b._beacon) m *= TERRAIN.beaconRate;
    if (this.heroAura(b)) m *= 1 + this.auraBonus();
    if (this.s.fx.fastHands > 0) m *= 2;
    if (this.s.hero.overT > 0 && this.heroAura(b)) m *= 2;
    return m * secretSim.rateMod(this, b);
  },

  progress(e) {
    if (e.fly) return Math.hypot(GOAL.x + 0.5 - e.x, GOAL.y + 0.5 - e.y);
    if (e.ram) return Math.abs(GOAL.y - e.y) + Math.abs(GOAL.x + 0.5 - e.x);
    const dn = this.dist[idx(e.nx, e.ny)];
    return (dn < 0 ? 999 : dn) + Math.hypot(e.nx + 0.5 - e.x, e.ny + 0.5 - e.y);
  },

  pickTarget(b, st) {
    const bx = b.x + 0.5, by = b.y + 0.5;
    let best = null, bestV = 0;
    const hold = this.s.holdFire;
    for (const e of this.s.enemies) {
      if (e.dead || !e.vis || e.under || e.immune || e.truce || (hold && e.messenger)) continue;
      if (e.fly ? !st.air : !st.ground) continue;
      if (Math.hypot(e.x - bx, e.y - by) > st.range) continue;
      let v;
      switch (b.mode) {
        case 'last': v = this.progress(e); break;
        case 'strong': v = e.hp * 1000 - this.progress(e); break;
        case 'weak': v = -e.hp * 1000 - this.progress(e); break;
        default: v = -this.progress(e);
      }
      if (!best || v > bestV) { best = e; bestV = v; }
    }
    return best;
  },

  updateTowers(dt) {
    const s = this.s;
    if (s.fin && s.fin.phase >= 3) return;
    const hold = s.holdFire;
    for (const b of s.buildings) {
      if (b.wreck || this.isOff(b)) continue;
      const d = BUILDINGS[b.type];
      if (b.type === 'trap') { this.trapTick(b, dt); continue; }
      if (b.type === 'teleport') { this.teleportTick(b, dt); continue; }
      if (!d.tower) continue;
      if (b.cd > 0) b.cd -= dt * this.rateMult(b);
      if (b.cd > 0) continue;
      const st = this.towerStats(b);
      const bx = b.x + 0.5, by = b.y + 0.5;
      if (d.attack === 'pulse') {
        let hit = false;
        for (const e of s.enemies) {
          if (e.dead || e.under || e.immune || e.truce || (hold && e.messenger)) continue;
          if (e.fly ? !st.air : !st.ground) continue;
          if (Math.hypot(e.x - bx, e.y - by) > st.range) continue;
          hit = true;
          if (this.applySlow(e, st.slow, st.slowDur)) {
            if (st.brittle) e.brittleT = Math.max(e.brittleT || 0, st.slowDur);
            if (st.freezeChance && rnd(s.rng) < st.freezeChance) { e.stunT = Math.max(e.stunT, e.boss ? st.freeze * 0.3 : st.freeze); this.emit({ k: 'freeze', x: e.x, y: e.y }); }
          }
          this.damage(e, st.dmg, st.dtype, b.id);
        }
        if (!hit) { b.cd = 0; continue; }
        this.emit({ k: 'pulse', id: b.id, x: bx, y: by, r: st.range });
        b.cd += 1 / st.rate;
        continue;
      }
      const target = this.pickTarget(b, st);
      if (!target) { b.cd = 0; continue; }
      b.aim = Math.atan2(target.y - by, target.x - bx);
      if (d.attack === 'arrow') {
        const pr = { id: s.nextId++, k: 'arrow', x: bx, y: by, px: bx, py: by, sx: bx, sy: by, tid: target.id, tx: target.x, ty: target.y, dmg: st.dmg, dt: st.dtype, spd: d.projSpeed * (st.spec === 'sniper' ? 1.8 : 1), src: b.id, shred: st.shred || 0, t: 0, T: 0, dead: false };
        if (st.chill) pr.chill = 1;
        s.projectiles.push(pr);
      } else if (d.attack === 'shell') {
        const T = d.flightTime;
        const tx = target.x + target.vx * T, ty = target.y + target.vy * T;
        const pr = { id: s.nextId++, k: 'shell', x: bx, y: by, px: bx, py: by, sx: bx, sy: by, tid: target.id, tx, ty, dmg: st.dmg, dt: st.dtype, splash: st.splash, burn: st.burn || 0, burnShare: st.burnShare || 0, src: b.id, t: 0, T, dead: false };
        if (st.freeze) pr.freeze = st.freeze;
        if (st.storm) pr.storm = 1;
        if (b.type === 'mortar') pr.hi = 1;
        s.projectiles.push(pr);
      } else if (d.attack === 'chain') {
        this.chainLightning(b, st, target);
      } else if (d.attack === 'rail') {
        this.rail(b, st, target);
      }
      this.emit({ k: 'shot', id: b.id, type: b.type, x: bx, y: by, spec: st.spec });
      b.cd += 1 / st.rate;
    }
  },

  // Lightning: hits the target, then jumps to the nearest enemies; every jump is weaker.
  chainLightning(b, st, first) {
    const pts = [[b.x + 0.5, b.y + 0.5]];
    const hit = new Set();
    let cur = first, dmg = st.dmg;
    for (let k = 0; k < st.targets && cur; k++) {
      hit.add(cur.id);
      pts.push([cur.x, cur.y]);
      if (st.stunMachines && ENEMIES[cur.type].machine) cur.stunT = Math.max(cur.stunT, st.stunMachines);
      const from = cur;
      this.damage(cur, dmg, 'blesk', b.id);
      dmg *= 1 - st.falloff;
      cur = null;
      let bd = st.jump;
      for (const e of this.s.enemies) {
        if (e.dead || !e.vis || hit.has(e.id)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d <= bd) { bd = d; cur = e; }
      }
    }
    this.emit({ k: 'zap', id: b.id, pts, big: st.spec === 'overload' });
  },

  // Gauss gun: one shot through the whole line of enemies behind the target.
  rail(b, st, target) {
    const bx = b.x + 0.5, by = b.y + 0.5;
    const dx = target.x - bx, dy = target.y - by, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, len = st.range + 0.5;
    for (const e of this.s.enemies) {
      if (e.dead || !e.vis || e.under || e.immune) continue;
      const rx = e.x - bx, ry = e.y - by;
      const along = rx * ux + ry * uy;
      if (along < 0 || along > len) continue;
      if (Math.abs(rx * uy - ry * ux) > st.width) continue;
      this.damage(e, st.dmg, st.dtype, b.id);
    }
    this.emit({ k: 'rail', id: b.id, x: bx, y: by, x2: bx + ux * len, y2: by + uy * len });
  },

  // Trap: bites up to N enemies standing on it, then recharges.
  trapTick(b, dt) {
    if (b.cd > 0) { b.cd -= dt; return; }
    if (this.s.holdFire && this.s.enemies.some((e) => e.messenger && !e.dead)) return;
    const d = BUILDINGS.trap;
    let n = 0;
    for (const e of this.s.enemies) {
      if (e.dead || e.fly || e.under || e.immune || n >= d.hits) continue;
      if (Math.floor(e.x) !== b.x || Math.floor(e.y) !== b.y) continue;
      this.damage(e, this.trapDmg(b), d.dtype, b.id);
      n++;
    }
    if (n) { b.cd = d.recharge; this.emit({ k: 'trap', id: b.id, x: b.x + 0.5, y: b.y + 0.5 }); }
  },

  // Teleport: now and then sends a few enemies on it back along their way.
  teleportTick(b, dt) {
    if (b.cd > 0) { b.cd -= dt; return; }
    const d = BUILDINGS.teleport;
    let n = 0;
    for (const e of this.s.enemies) {
      if (e.dead || e.fly || e.boss || e.part || e.mini || e.under || e.frozen || e.messenger || ENEMIES[e.type].egg || n >= d.count) continue;
      if (Math.floor(e.x) !== b.x || Math.floor(e.y) !== b.y) continue;
      if (d.perEnemy && (e.tp || 0) >= d.perEnemy) continue;   // nobody is sent back for ever
      if (this.sendBack(e, d.back)) { n++; e.tp = (e.tp || 0) + 1; }
    }
    if (n) { b.cd = d.every; this.emit({ k: 'teleport', id: b.id, x: b.x + 0.5, y: b.y + 0.5 }); }
  },

  updateProjectiles(dt) {
    const s = this.s;
    for (const p of s.projectiles) {
      p.px = p.x; p.py = p.y;
      if (p.dead) continue;
      if (p.k === 'arrow') {
        const t = this.findEnemy(p.tid);
        if (t) { p.tx = t.x; p.ty = t.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        const m = p.spd * dt;
        if (d <= m + 0.15) {
          p.x = p.tx; p.y = p.ty; p.dead = true;
          if (t) {
            if (p.shred) t.shred = Math.min(t.armor, (t.shred || 0) + p.shred);
            if (p.chill) { const c = BUILDINGS.icebow.chill; this.applySlow(t, c.slow, c.dur); t.markT = Math.max(t.markT || 0, c.mark); }
            this.damage(t, p.dmg, p.dt, p.src);
            this.emit({ k: 'hit', x: p.x, y: p.y });
          }
        } else { p.x += dx / d * m; p.y += dy / d * m; }
      } else {
        p.t += dt;
        const f = Math.min(1, p.t / p.T);
        p.x = p.sx + (p.tx - p.sx) * f;
        p.y = p.sy + (p.ty - p.sy) * f;
        if (f >= 1) {
          p.dead = true;
          let hitN = 0;
          for (const e of s.enemies) {
            if (e.dead || e.fly) continue;
            if (Math.hypot(e.x - p.x, e.y - p.y) > p.splash) continue;
            if (p.freeze && !e.under && !ENEMIES[e.type].noSlow) { e.stunT = Math.max(e.stunT, e.boss || e.part ? p.freeze * 0.3 : p.freeze); hitN++; }
            this.damage(e, p.dmg, p.dt, p.src);
          }
          if (p.burn) s.fires.push({ x: p.x, y: p.y, r: p.splash, t: p.burn, dps: p.dmg * p.burnShare, src: p.src });
          if (p.storm) this.stormBolts(p);
          this.emit({ k: 'explode', x: p.x, y: p.y, r: p.splash, burn: !!p.burn, freeze: !!p.freeze && hitN > 0, storm: !!p.storm });
        }
      }
    }
  },

  // Storm cannon: lightning jumps from the blast to enemies around it.
  stormBolts(p) {
    const sd = BUILDINGS.stormcannon.storm;
    const pts = [[p.x, p.y]];
    const list = [];
    for (const e of this.s.enemies) {
      if (e.dead || !e.vis || e.under || e.immune) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > p.splash && d <= sd.jump) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, e] of list.slice(0, sd.targets)) {
      pts.push([e.x, e.y]);
      this.damage(e, p.dmg * sd.share, 'blesk', p.src);
      pts.push([p.x, p.y]);
    }
    if (pts.length > 1) this.emit({ k: 'zap', id: p.src, pts, big: false });
  },

  // Burning ground, slime puddles and barbed walls.
  updateGround(dt) {
    const s = this.s;
    if (s.fires.length) {
      for (const f of s.fires) {
        f.t -= dt;
        for (const e of s.enemies) {
          if (e.dead || e.fly) continue;
          if (Math.hypot(e.x - f.x, e.y - f.y) <= f.r) this.damage(e, f.dps * dt, 'vybuch', f.src, true);
        }
      }
      s.fires = s.fires.filter((f) => f.t > 0);
    }
    if (s.puddles.length) {
      for (const p of s.puddles) {
        p.t -= dt;
        for (const e of s.enemies) {
          if (e.dead || e.fly) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= 0.6) this.applySlow(e, 0.3, 0.25);
        }
      }
      s.puddles = s.puddles.filter((p) => p.t > 0);
    }
    if (this.has('barbed')) {
      const wn = this.currentWaveNumber();
      for (const e of s.enemies) {
        if (e.dead || e.fly) continue;
        const n = this.wallAdj[idx(Math.floor(e.x), Math.floor(e.y))];
        if (n) this.damage(e, 4 * growth(wn) * n * dt, 'strela', null, true);
      }
    }
  },

  findEnemy(id) {
    for (const e of this.s.enemies) if (e.id === id && !e.dead) return e;
    return null;
  },

  // Position of whatever caused the damage (for the Válec, who is hard from the front).
  sourcePos(src) {
    if (src === 'hero') return { x: this.s.hero.x, y: this.s.hero.y };
    if (typeof src === 'number') { const b = this.byId.get(src); if (b && b.type !== 'trap') return { x: b.x + 0.5, y: b.y + 0.5 }; }
    return null;
  },

  // pierce = small ticks (fire, wire, beam) go through armour.
  damage(e, amount, dtype, src, pierce = false) {
    if (e.dead || e.under || e.immune) return 0;
    // an enemy under a truce (a white flag...) cannot be hurt by buildings
    if (e.truce && typeof src === 'number') return 0;
    // with fire held nothing hurts the messenger (wire, beam, burning ground, spells)
    if (e.messenger && this.s.holdFire) return 0;
    const ed = ENEMIES[e.type];
    let d = amount;
    if (e.res) d *= this.resistMul(e, dtype);
    if (e.markT > 0) d *= BUILDINGS.icebow.chill.markMul;
    if (ed.front) {
      const p = this.sourcePos(src);
      if (p) {
        let fx, fy;
        if (e.dir >= 0) { fx = DIRS[e.dir][0]; fy = DIRS[e.dir][1]; } else { fx = GOAL.x + 0.5 - e.x; fy = GOAL.y + 0.5 - e.y; }
        const vx = p.x - e.x, vy = p.y - e.y;
        if (fx * vx + fy * vy > 0.15 * Math.hypot(vx, vy) * Math.hypot(fx, fy)) d *= ed.front;
      }
    }
    if (e.brittleT > 0 && e.slowT > 0) d *= 1.3;
    const armor = Math.max(0, e.armor - (e.shred || 0));
    if (armor > 0 && dtype !== 'blesk' && !pierce) d = Math.max(1, d - armor);
    const dealt = Math.min(d, e.hp);
    e.hp -= d;
    if (e.dmgBy) e.dmgBy[dtype] = (e.dmgBy[dtype] || 0) + dealt;
    if (typeof src === 'number') {
      const b = this.byId.get(src);
      if (b) b.dmg += dealt;
    }
    if (e.hp <= 0) this.kill(e, src, dtype);
    else {
      if (ed.relocate) this.checkRelocate(e);
      if (ed.heart || ed.adapt) secretSim.onHurt(this, e);
    }
    return dealt;
  },

  kill(e, src, dtype) {
    const s = this.s;
    e.dead = true;
    e.hp = 0;
    const d = ENEMIES[e.type];
    let gold = e.gold;
    if (secretSim.onDeath(this, e, src, dtype)) return;
    if (s.fx.goldRush > 0) gold *= 2;
    if (this.has('hardSchool')) gold = Math.round(gold * 1.25);
    if ((e.boss || e.mini) && this.has('rustyCrown')) gold *= 2;
    const h = s.hero;
    if (this.has('magnet') && h.down <= 0 && Math.hypot(e.x - h.x, e.y - h.y) <= this.auraRange()) gold += 1;
    s.killCount = (s.killCount || 0) + 1;
    if (this.has('collector') && s.killCount % 25 === 0) gold += 15;
    if (e.stolen) gold += e.stolen * 2;
    gold = secretSim.gold(this, e, gold, src);
    s.gold += gold;
    s.stats.kills++;
    this.heroXp(src === 'hero' ? 2 : 1);
    if (src === 'hero') h.kills++;
    const w = this.waveOf(e.w);
    if (w) { w.alive--; w.kills = (w.kills || 0) + 1; if (dtype) w.kt[dtype] = (w.kt[dtype] || 0) + 1; }
    if (d.burst && w) {
      for (let k = 0; k < d.burst.count; k++) {
        const a = k * 2.399, r = 0.15 + 0.25 * Math.sqrt(k / d.burst.count);
        this.spawnEnemy(d.burst.type, w, e.ent, e.cx, e.cy, {
          deferred: true, cx: e.cx, cy: e.cy, nx: e.nx, ny: e.ny, dir: e.dir,
          x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, stun: 0.25 + k * 0.05, hist: e.hist,
        });
      }
      this.emit({ k: 'burst', x: e.x, y: e.y });
    }
    if (e.splitM && w && !e.root) {
      for (let k = 0; k < 2; k++) {
        const c = this.spawnEnemy(e.type, w, e.ent, e.cx, e.cy, {
          deferred: true, cx: e.cx, cy: e.cy, nx: e.nx, ny: e.ny, dir: e.dir, hp: e.mhp * 0.35,
          x: e.x + (k ? 0.15 : -0.15), y: e.y, stun: 0.2 + k * 0.3, hist: e.hist,
        });
        c.root = 1; c.splitM = 0; c.gold = Math.max(1, Math.round(e.gold / 3));
      }
    }
    if (d.split && w) {
      const sp = d.split;
      for (let k = 0; k < sp.count; k++) {
        const c = this.spawnEnemy(sp.into, w, e.ent, e.cx, e.cy, {
          rootHp: e.root, hpFrac: sp.hpFrac, fam: e.fam, deferred: true,
          cx: e.cx, cy: e.cy, nx: e.nx, ny: e.ny, dir: e.dir, x: e.x, y: e.y, stun: 0.15 + k * 0.45, hist: e.hist,
        });
        if (e.fam && s.fams[e.fam]) s.fams[e.fam].alive++;
        c.root = e.root;
      }
    }
    if (this.has('slimeHeart') && !e.fly) s.puddles.push({ x: e.x, y: e.y, t: 2 });
    if (e.fam) this.famDec(e.fam, e);
    this.emit({ k: 'death', type: e.type, x: e.x, y: e.y, gold, golden: e.golden, boss: e.boss, fly: e.fly, stolen: e.stolen || 0, ret: !!e.ret });
  },

  // ---------- spells ----------

  // index = spell slot; x, y = target (only for spells that need one).
  castSpell(i, x, y) {
    const s = this.s;
    const sp = s.spells[i];
    if (!sp || sp.used || this.phase() !== 'combat') return { ok: false, reason: sp && sp.used ? 'spellUsed' : 'spellCombat' };
    if (s.fin && s.fin.phase >= 3) return { ok: false, reason: 'spellNoTarget' };
    const c = cardById(sp.id);
    const g = growth(this.currentWaveNumber());
    switch (sp.id) {
      case 'meteor': {
        if (x === undefined) return { ok: false, reason: 'needTarget' };
        for (const e of s.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) <= c.radius) this.damage(e, c.dmg * g, 'vybuch', null);
        this.emit({ k: 'spell', id: sp.id, x, y, r: c.radius });
        break;
      }
      case 'breath':
        for (const e of s.enemies) if (!e.dead) e.stunT = Math.max(e.stunT, e.boss || e.part ? c.bossTime : c.time);
        this.emit({ k: 'spell', id: sp.id });
        break;
      case 'reverse':
        for (const e of s.enemies) if (!e.dead && !e.boss && !e.part && !e.under && !ENEMIES[e.type].egg) this.sendBack(e, c.back);
        this.emit({ k: 'spell', id: sp.id });
        break;
      case 'thunder': {
        let best = null;
        for (const e of s.enemies) if (!e.dead && !e.under && !e.immune && !e.messenger && (!best || e.hp > best.hp)) best = e;
        if (!best) return { ok: false, reason: 'noTarget' };
        best.stunT = Math.max(best.stunT, c.stun);
        const bx = best.x, by = best.y;
        this.damage(best, c.dmg * g, 'blesk', null);
        this.emit({ k: 'spell', id: sp.id, x: bx, y: by });
        break;
      }
      case 'goldRush': case 'shield': case 'fastHands': case 'draft':
        s.fx[sp.id] = c.time;
        this.emit({ k: 'spell', id: sp.id });
        break;
      default: return { ok: false };
    }
    sp.used = true;
    this.flushPending();
    return { ok: true };
  },
};

void W; void HERO;
