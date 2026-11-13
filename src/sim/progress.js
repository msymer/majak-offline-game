// Cards, relics, Knot's levels, repairs and journal pages. Mixed into the Game class (this = Game).
import { idx, inBounds, DIRS } from './grid.js';
import { rnd } from './rng.js';
import { BUILDINGS, WRECK } from '../data/buildings.js';
import { CARDS, RELICS, MAX_SPELLS, HERO_UP_ORDER, xpForLevel, cardById } from '../data/cards.js';
import { HERO, AUTO_START_DELAY } from '../data/rules.js';
import { secretSim } from '../secrets/sim.js';

export const progress = {
  // ---------- cards and relics ----------

  owns(id) { return this.has(id) || this.s.spells.some((sp) => sp.id === id); },

  rollOptions(kind) {
    const n = this.s.completedCount;
    const pool = (kind === 'card' ? CARDS : RELICS).filter((c) => !c.secret && !this.owns(c.id) && (c.minWave || 0) <= n);
    const out = [];
    const list = pool.slice();
    while (out.length < 3 && list.length) {
      const i = Math.floor(rnd(this.s.rng) * list.length);
      out.push(list.splice(i, 1)[0]);
    }
    // Cards: if all three are of one kind and another kind is available, swap the last one.
    if (kind === 'card' && out.length === 3 && out.every((c) => c.kind === out[0].kind)) {
      const other = list.filter((c) => c.kind !== out[0].kind);
      if (other.length) out[2] = other[Math.floor(rnd(this.s.rng) * other.length)];
    }
    return secretSim.cardOffer(this, kind, out.map((c) => c.id), list);
  },

  nextPick() {
    const s = this.s;
    if (s.pick) return;
    while (s.picks.length) {
      const p = s.picks.shift();
      const options = this.rollOptions(p.kind);
      if (!options.length) continue;
      s.pick = { kind: p.kind, wave: p.wave, options };
      this.emit({ k: 'pick', kind: p.kind });
      return;
    }
  },

  // id = chosen card or relic; replace = which spell slot a fourth spell replaces (-1 = throw the new one away).
  choosePick(id, replace) {
    const s = this.s;
    const p = s.pick;
    if (!p || !p.options.includes(id)) return { ok: false };
    if (p.kind === 'relic') {
      s.relics.push(id);
      if (id === 'hope') { s.maxLight += 25; s.light += 25; }
      if (id === 'gear') s.free = { archer: 1, cannon: 1, frost: 1, lightning: 1 };
    } else {
      const c = cardById(id);
      if (c.kind === 'spell') {
        if (s.spells.length >= MAX_SPELLS) {
          if (replace === undefined) return { ok: false, reason: 'needReplace' };
          if (replace >= 0 && replace < s.spells.length) s.spells[replace] = { id, used: false };
        } else s.spells.push({ id, used: false });
      } else if (c.kind === 'rule') s.rules.push(id);
      else s.knotCards.push(id);
    }
    s.pick = null;
    this.rebuild();
    this.emit({ k: 'picked', kind: p.kind, id });
    this.nextPick();
    if (!s.pick && s.auto && this.phase() === 'build' && this.canStartWave() && s.autoT <= 0) s.autoT = AUTO_START_DELAY;
    return { ok: true };
  },

  // ---------- Knot's levels ----------

  heroXp(n) {
    const h = this.s.hero;
    h.xp += n;
    while (h.lvl < HERO.maxLevel && h.xp >= xpForLevel(h.lvl)) {
      h.xp -= xpForLevel(h.lvl);
      h.lvl++;
      h.upPending++;
      this.emit({ k: 'levelUp', lvl: h.lvl });
    }
    if (h.upPending > 0 && !h.upOffer) h.upOffer = this.rollUps();
  },

  rollUps() {
    const list = HERO_UP_ORDER.slice();
    const a = list.splice(Math.floor(rnd(this.s.rng) * list.length), 1)[0];
    const b = list.splice(Math.floor(rnd(this.s.rng) * list.length), 1)[0];
    return [a, b];
  },

  chooseUp(id) {
    const h = this.s.hero;
    if (!h.upOffer || !h.upOffer.includes(id)) return { ok: false };
    h.ups[id] = (h.ups[id] || 0) + 1;
    h.upPending--;
    h.upOffer = h.upPending > 0 ? this.rollUps() : null;
    if (id === 'stamina') { h.mhp = this.heroMaxHp(); h.hp = Math.min(h.mhp, h.hp + 25); }
    this.emit({ k: 'heroUp2', id });
    return { ok: true };
  },

  // ---------- repairs ----------

  // A wrecked building can stand up again only if the way stays open and nobody stands on it.
  canRepair(b) {
    if (!b || !b.wreck) return false;
    if (!BUILDINGS[b.type].blocks) return true;
    const i = idx(b.x, b.y);
    if (this.enemyCells().has(i)) return false;
    return this.pathStaysOpen(i);
  },

  repairCost(b) { return Math.ceil(b.paid * WRECK.repairShare); },

  repair(b) {
    b.wreck = false;
    b.cd = 0;
    this.s.bver++;
    this.rebuild();
    // Knot might stand on the cell: step aside.
    const h = this.s.hero;
    if (BUILDINGS[b.type].blocks && Math.floor(h.x) === b.x && Math.floor(h.y) === b.y) {
      for (const [dx, dy] of DIRS) {
        const nx = b.x + dx, ny = b.y + dy;
        if (inBounds(nx, ny) && this.heroWalkable(idx(nx, ny))) { h.x = h.px = nx + 0.5; h.y = h.py = ny + 0.5; h.path = []; break; }
      }
    }
    this.emit({ k: 'repair', id: b.id, x: b.x, y: b.y });
  },

  heroRepair(dt) {
    const h = this.s.hero;
    if (h.path.length || h.down > 0) { h.repT = 0; h.repId = 0; return; }
    let best = null, bd = WRECK.knotRange;
    for (const b of this.s.buildings) {
      if (!b.wreck) continue;
      const d = Math.hypot(b.x + 0.5 - h.x, b.y + 0.5 - h.y);
      if (d <= bd) { bd = d; best = b; }
    }
    if (!best) { h.repT = 0; h.repId = 0; return; }
    if (h.repId !== best.id) { h.repId = best.id; h.repT = 0; }
    h.repT += dt;
    h.face = Math.atan2(best.y + 0.5 - h.y, best.x + 0.5 - h.x);
    if (h.repT >= WRECK.knotTime || this.has('handyman')) {
      if (this.canRepair(best)) { this.repair(best); h.repT = 0; h.repId = 0; }
      else h.repT = WRECK.knotTime;
    }
  },

  wrecks() { return this.s.buildings.filter((b) => b.wreck); },
  repairAllCost() { let c = 0; for (const b of this.wrecks()) c += this.repairCost(b); return c; },

  // Build phase: "Opravit vše" for a quarter of the price.
  repairAll() {
    if (this.phase() !== 'build') return { ok: false };
    const list = this.wrecks();
    if (!list.length) return { ok: false };
    const cost = this.repairAllCost();
    if (this.s.gold < cost) return { ok: false, reason: 'noGold' };
    let n = 0, paid = 0;
    this.snapshotForUndo();
    for (const b of list) {
      if (!this.canRepair(b)) continue;
      const c = this.repairCost(b);
      this.s.gold -= c; paid += c;
      this.repair(b);
      n++;
    }
    if (!n) return { ok: false, reason: 'blocked' };
    return { ok: true, n, paid, all: n === list.length };
  },

  // ---------- journal ----------

  readPage() {
    const n = this.s.pages.shift();
    if (n === undefined) return { ok: false };
    this.emit({ k: 'pageRead', n });
    return { ok: true, n };
  },
};
