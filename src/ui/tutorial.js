// Knot as a guide: the tutorial for the first waves (one step at a time, each step disappears when done)
// and his occasional short lines.
import { T } from '../data/texts.cs.js';
import { CARD_WAVES } from '../data/waves.js';

const X = T.tutorial;
const CARDS_EXIST = true;

const bar = (type) => `[data-b="${type}"]`;
const build = (c) => c.phase === 'build';

// when = may the step be shown now, done = the player did it, expire = too late for it (skipped silently),
// btn = the step is only information and is closed with a button.
const STEPS = [
  { id: 'blocked', text: X.blocked, btn: X.ok, when: (c) => c.f.blocked },
  { id: 'hello', text: X.hello, btn: X.next, when: (c) => c.n === 0 && build(c), expire: (c) => c.n > 0 },
  { id: 'path', need: 'hello', text: X.path, btn: X.next, when: (c) => c.n === 0 && build(c), expire: (c) => c.n > 0 },
  { id: 'firstTower', need: 'path', text: X.firstTower, hl: bar('archer'), when: (c) => c.n === 0 && build(c), done: (c) => c.cnt.archer > 0 || !build(c), expire: (c) => c.n > 0 || c.cnt.archer > 0 },
  { id: 'firstWave', text: X.firstWave, hl: '#btnWave', when: (c) => c.n === 0 && build(c) && c.cnt.archer > 0, done: (c) => !build(c) || c.n > 0, expire: (c) => c.n > 0 },
  { id: 'wall', text: X.wall, hl: bar('wall'), when: (c) => c.n === 1 && build(c), done: (c) => c.cnt.wall > 0 || !build(c) || c.n > 1, expire: (c) => c.n > 1 },
  { id: 'hero', need: 'wall', text: X.hero, when: (c) => c.n === 1 && build(c), done: (c) => c.f.heroMoved || !build(c) || c.n > 1, expire: (c) => c.n > 1 },
  { id: 'speed', text: X.speed, hl: '#speedRow', timeout: 10, when: (c) => c.n === 1 && !build(c) && c.combatT > 3 && c.speed === 1, done: (c) => c.f.speed || build(c), expire: (c) => c.n > 3 || c.f.speed },
  { id: 'frost', text: X.frost, hl: bar('frost'), when: (c) => c.n === 2 && build(c), done: (c) => c.cnt.frost > 0 || !build(c) || c.n > 2, expire: (c) => c.n > 2 },
  { id: 'cannon', text: X.cannon, hl: bar('cannon'), when: (c) => c.n === 3 && build(c), done: (c) => c.cnt.cannon > 0 || !build(c) || c.n > 3, expire: (c) => c.n > 3 },
  { id: 'mine', text: CARDS_EXIST ? X.mineCard : X.mine, hl: bar('mine'), when: (c) => c.n === CARD_WAVES[0] && build(c), done: (c) => c.cnt.mine > 0 || !build(c) || c.n > 5, expire: (c) => c.n > 5 },
  { id: 'interest', need: 'mine', text: X.interest, btn: X.ok, hl: '#pGold', when: (c) => c.n === 5 && build(c), expire: (c) => c.n > 5 },
  { id: 'merge', need: 'interest', text: X.merge, when: (c) => c.n === 5 && build(c), done: (c) => c.f.merged || !build(c) || c.n > 5, expire: (c) => c.n > 5 },
  { id: 'beacon', text: X.beacon, btn: X.ok, when: (c) => c.n === 7 && build(c), expire: (c) => c.n > 7 },
  { id: 'targeting', text: X.targeting, when: (c) => c.n === 8 && build(c), done: (c) => c.f.targeted || !build(c) || c.n > 8, expire: (c) => c.n > 8 },
  { id: 'checkpoint', text: X.checkpoint, btn: X.ok, when: (c) => c.n === 10 && build(c), expire: (c) => c.n > 10 },
  { id: 'spell', text: X.spell, btn: X.ok, hl: '#spells', when: (c) => c.spells > 0 && !c.pick },
  { id: 'levelUp', text: X.levelUp, hl: '#heroPortrait', timeout: 12, when: (c) => c.upOffer && !c.pick, done: (c) => !c.upOffer },
  { id: 'wreck', text: X.wreck, btn: X.ok, when: (c) => c.f.wreck },
];

export class Guide {
  constructor(app) {
    this.app = app;
    this.cur = null;
    this.curT = 0;
    this.wait = 0.8;
    this.f = {};
    this.combatT = 0;
    this.sinceQuip = 45;      // the first line may come after a short while
    this.lastQuip = '';
    this.richSaid = false;
    this.cnt = {};
  }

  get on() { return !!this.app.settings.tutorial; }

  restart() { this.app.meta.tut = {}; this.app.saveMeta(); this.f = {}; this.hide(); this.wait = 0.5; }

  flag(name) { this.f[name] = true; }

  hide() { if (this.cur) { this.cur = null; this.app.hud.hideTut(); } }

  ctx() {
    const app = this.app, g = app.game, s = g.s;
    const cnt = this.cnt;
    cnt.archer = cnt.wall = cnt.frost = cnt.cannon = cnt.mine = 0;
    for (const b of s.buildings) cnt[b.type] = (cnt[b.type] || 0) + 1;
    return { n: s.completedCount, phase: g.phase(), cnt, f: this.f, combatT: this.combatT, speed: app.paused ? 0 : app.speed, spells: s.spells.length, pick: !!s.pick, upOffer: !!s.hero.upOffer };
  }

  finish(step, keepFlag) {
    this.app.meta.tut[step.id] = 1;
    this.app.saveMeta();
    if (step.id === 'blocked' && !keepFlag) this.f.blocked = false;
    this.hide();
    this.wait = 0.6;
  }

  show(step) {
    const hud = this.app.hud;
    this.cur = step; this.curT = 0;
    hud.showTut(step.text, step.btn || null,
      step.btn ? () => this.finish(step) : null,
      () => hud.confirm(X.skipConfirm, () => { this.app.changeSetting('tutorial', 'off'); this.hide(); }, null),
      step.hl || null);
    this.app.sound('bubble');
  }

  update(dt) {
    const app = this.app, g = app.game;
    if (!g || !app.playing || app.gallery) return;
    if (g.phase() === 'combat') { if (!app.paused) this.combatT += dt; } else this.combatT = 0;
    this.sinceQuip += dt;
    this.ambientQuips(dt);
    if (!this.on || g.s.lost) { this.hide(); return; }
    if (app.hud.overlayKind) return;
    const c = this.ctx();
    const done = app.meta.tut;
    if (this.cur) {
      const st = this.cur;
      this.curT += dt;
      if ((st.done && st.done(c)) || (st.timeout && this.curT > st.timeout) || (st.expire && !st.btn && st.expire(c))) this.finish(st);
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 0.25;
    for (const st of STEPS) {
      if (done[st.id]) continue;
      if (st.expire && st.expire(c)) { done[st.id] = 1; continue; }
      if (st.need && !done[st.need]) continue;
      if (!st.when(c)) continue;
      this.show(st);
      break;
    }
  }

  // ---------- Knot's lines ----------

  quip(cat, chance = 1) {
    const app = this.app;
    const list = T.quips[cat];
    if (!list || !app.settings.tips || !app.playing || app.gallery) return false;
    if (!app.paused && app.speed >= 4) return false;
    if (this.sinceQuip < 60 || app.hud.tutVisible || app.hud.overlayKind) return false;
    if (app.game.s.hero.down > 0 && cat !== 'heroDown') return false;
    if (Math.random() > chance) return false;
    let line = list[Math.floor(Math.random() * list.length)];
    if (line === this.lastQuip && list.length > 1) line = list[(list.indexOf(line) + 1) % list.length];
    this.lastQuip = line;
    this.sinceQuip = 0;
    app.hud.showQuip(line);
    app.sound('bubble');
    return true;
  }

  ambientQuips() {
    const app = this.app, g = app.game;
    if (this.sinceQuip < 60) return;
    if (g.phase() !== 'build') { this.richSaid = false; return; }
    if (!this.richSaid && g.s.gold >= 300 && g.s.completedCount >= 3) { this.richSaid = this.quip('richGold'); return; }
    if (performance.now() - app.lastInput > 60000) { if (this.quip('idle')) app.lastInput = performance.now(); }
  }
}
