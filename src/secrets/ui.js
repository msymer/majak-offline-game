// Interface side of the surprises of stage 5: taps on things of the world, collections (oddities,
// bottles, achievements), the pedlar, the engine room, things that depend on the clock of the device.
// The logic is in world.js, the 3D props in view.js.
import { T, bName, fill } from '../data/texts.cs.js';
import { ICONS } from '../ui/icons.js';
import { $, fmt } from '../ui/dom.js';
import { BUILDINGS, HYBRID_TYPES } from '../data/buildings.js';
import { chapterOf, TOTAL_WAVES } from '../data/waves.js';
import { tileAt, sectorAt } from '../sim/grid.js';
import { audio } from '../audio/audio.js';
import { SX, ODD, ACHIEVEMENTS, BOTTLES, BOTTLE_ORDER } from './texts2.js';
import { POND, MYSTERY, BASIC_TOWERS, world } from './world.js';

const svg = (body) => `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
const SX_ICONS = {
  bottle: svg('<path d="M13 3h6v5l3 4v15a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V12l3-4z" fill="#8FD9B0" stroke="#3B7A5A" stroke-width="1.6" stroke-linejoin="round"/><rect x="13" y="2" width="6" height="3" rx="1" fill="#8F6449"/><rect x="12.5" y="15" width="7" height="9" rx="1" fill="#FFFDF2" stroke="#8F6449" stroke-width="1"/>'),
  boat: svg('<path d="M3 20h26l-4 7H7z" fill="#6B4A3A"/><path d="M15 4v15" stroke="#6B4A3A" stroke-width="2.4" stroke-linecap="round"/><path d="M17 5l9 12H17z" fill="#F4E9D8" stroke="#8F6449" stroke-width="1.2" stroke-linejoin="round"/><path d="M13 8L6 17h7z" fill="#F28C38"/>'),
  odd: svg('<circle cx="16" cy="16" r="12" fill="#FBF3E4" stroke="#7A4FA0" stroke-width="2"/><path d="M12 12.5c0-5 8-5 8 0 0 3-4 3-4 6.5" fill="none" stroke="#7A4FA0" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="23.5" r="1.7" fill="#7A4FA0"/>'),
  medal: svg('<path d="M10 3h5l1 8h-4zM17 3h5l-2 8h-4z" fill="#D9513C"/><circle cx="16" cy="20" r="9" fill="#FFD86B" stroke="#C9A227" stroke-width="2"/><path d="M16 14.5l1.7 3.5 3.8.4-2.8 2.6.8 3.8-3.5-2-3.5 2 .8-3.8-2.8-2.6 3.8-.4z" fill="#C9A227"/>'),
  icecream: svg('<path d="M10 15l6 14 6-14z" fill="#D9A066" stroke="#8F6449" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12.5" cy="12" r="5" fill="#FFB6C9"/><circle cx="19.5" cy="12" r="5" fill="#FFFDF2"/><circle cx="16" cy="7.5" r="5" fill="#B6E04A"/><circle cx="16" cy="3.5" r="1.8" fill="#D9513C"/>'),
  vault: svg('<rect x="4" y="5" width="24" height="22" rx="3" fill="#4B4652"/><rect x="7" y="8" width="18" height="16" rx="2" fill="#6C6878"/><circle cx="16" cy="16" r="5" fill="none" stroke="#FFD86B" stroke-width="2.2"/><path d="M16 9.5v13M9.5 16h13" stroke="#FFD86B" stroke-width="2"/><rect x="6" y="27" width="5" height="3" fill="#4B4652"/><rect x="21" y="27" width="5" height="3" fill="#4B4652"/>'),
  blur: svg('<rect x="7" y="4" width="18" height="24" rx="3" fill="#C9B8D4" stroke="#7A4FA0" stroke-width="1.6"/><path d="M12 12c0-5 8-5 8 0 0 3-4 3-4 6" fill="none" stroke="#7A4FA0" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="22.5" r="1.6" fill="#7A4FA0"/>'),
  hat: svg('<ellipse cx="16" cy="23" rx="13" ry="3.5" fill="#1D1826"/><rect x="9" y="7" width="14" height="16" rx="2" fill="#1D1826"/><rect x="9" y="18" width="14" height="3.5" fill="#D9513C"/>'),
  engine: svg('<circle cx="16" cy="16" r="6" fill="none" stroke="#C9A227" stroke-width="4"/><g stroke="#C9A227" stroke-width="4" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g>'),
};
for (const id of MYSTERY) SX_ICONS[id] = SX_ICONS.blur;

const CSS = `
#sxDock { position: absolute; left: calc(var(--sal) + var(--g)); top: calc(var(--sat) + 120px); display: flex; flex-direction: column; gap: 6px; z-index: 3; }
#sxDock button { width: 52px; height: 52px; padding: 8px; pointer-events: auto; animation: hl 1.4s ease-in-out infinite; }
.land #sxDock { top: calc(var(--sat) + 62px); left: calc(var(--sal) + var(--g) + 58px); flex-direction: row; }
#sxDark { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 9; transition: opacity .22s linear; }
#sxDark.on { opacity: 1; }
#sxNoise { position: absolute; inset: 0; pointer-events: none; z-index: 9; opacity: 0; background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.14) 0 1px, rgba(0,0,0,.18) 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.1) 0 2px, rgba(255,255,255,.07) 2px 5px); mix-blend-mode: overlay; }
#sxNoise.on { opacity: 1; animation: sxn .12s steps(3) infinite; }
@keyframes sxn { 0% { background-position: 0 0, 0 0; } 50% { background-position: 7px 13px, -9px 4px; } 100% { background-position: -5px 3px, 6px -8px; } }
.pill.sxg .num { color: #B4472F; font-size: 13px; }
.pick.blur h3, .pick.blur p { filter: blur(5px); user-select: none; }
.pick.blur .pic { filter: blur(2px); }
.pick.blur { border-color: #C9B8D4; background: #F7F1FA; }
#sel .nick { font-size: 12px; color: #7A5A3A; font-weight: 700; margin-top: 2px; }
.sxl { display: flex; flex-direction: column; gap: 6px; }
.sxl .it { display: flex; gap: 10px; align-items: center; padding: 8px 10px; background: #fff; border: 1px solid var(--line); border-radius: 12px; font-size: 15px; }
.sxl .it.no { opacity: .45; }
.sxl .it b { display: block; }
.sxl .it small { color: var(--muted); display: block; font-size: 12px; }
.sxl .it .ic { width: 28px; height: 28px; flex: none; }
.sxl .msg { font-family: "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive; color: #3B2F5A; background: #FFFDF5; }
.sxtags { display: flex; flex-wrap: wrap; gap: 6px; }
.sxtags span { background: #fff; border: 1px solid #D9C7E4; color: #5A3F78; border-radius: 12px; padding: 6px 10px; font-weight: 700; font-size: 14px; }
.card.bottle { background: #FFFDF5; border-radius: 8px 20px 8px 20px; transform: rotate(1deg); }
.card.bottle .ptext { font-family: "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive; font-size: 19px; line-height: 1.5; color: #3B2F5A; }
.card.engine { background: #3B2F2F; color: #F4E9D8; }
.card.engine h2, .card.engine h3 { color: #FFD86B; }
.card.engine .muted { color: #C9B8A0; }
.card.engine .btn { color: #3B2F2F; }
.card.engine .box { background: rgba(255, 255, 255, .07); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.card.engine .hats { display: flex; flex-wrap: wrap; gap: 6px; }
.card.engine .hats button { background: #F4E9D8; color: #3B2F2F; border-radius: 10px; padding: 8px 10px; font-weight: 700; font-size: 13px; }
.card.engine .hats button.on { background: var(--accent); color: #fff; }
.card.engine .hats button.no { opacity: .3; }
.card.engine .gram { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
.card.engine .gram button { background: #1D1826; color: #FFD86B; border-radius: 50%; aspect-ratio: 1; font-weight: 800; }
.card.engine .gram button.on { background: var(--accent); color: #fff; }
.card.engine .plan { display: flex; gap: 3px; align-items: center; }
.card.engine .plan i { flex: 1; height: 10px; border-radius: 5px; background: #6B4A3A; }
.card.engine .plan i.done { background: #FFD86B; }
.card.engine .plan i.now { background: var(--accent); box-shadow: 0 0 0 2px #fff; }
.card.engine .note { background: #FFFDF5; color: #3B2F5A; border-radius: 4px 12px 4px 12px; padding: 12px; font-family: "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive; font-size: 17px; line-height: 1.4; transform: rotate(-1.2deg); }
.sxshop .greet { font-style: italic; color: #7A5A3A; }
.sxshop .pick small { display: block; font-weight: 800; color: var(--accent-d); margin-top: 2px; }
.sxshop .pick.used { opacity: .4; }
.crmaze { position: absolute; inset: 0; overflow: hidden; }
.crmaze .trk { position: absolute; background: rgba(255, 255, 255, .22); border-radius: 12px; }
.crmaze .crw { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: auto; padding: 6px 8px; margin: -30px 0 0 -60px; width: 120px; will-change: transform; }
.crmaze .crw i { width: 26px; height: 21px; border-radius: 50% 50% 46% 46%; background: #3EC9A7; box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .12); display: block; position: relative; animation: crh .5s ease-in-out infinite alternate; }
.crmaze .crw i::before, .crmaze .crw i::after { content: ""; position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: inset -2px 1px 0 #1D2A3A; }
.crmaze .crw i::before { left: 5px; } .crmaze .crw i::after { right: 5px; }
.crmaze .crw span { font-weight: 800; font-size: 13px; color: #3B2F2F; background: rgba(255, 253, 245, .85); padding: 1px 7px; border-radius: 8px; white-space: nowrap; }
.crmaze .crw small { font-size: 10px; color: #7A5A3A; background: rgba(255, 253, 245, .7); padding: 0 6px; border-radius: 6px; white-space: nowrap; }
.crmaze .crw.hit { pointer-events: none; transition: opacity .35s, filter .35s; opacity: 0; filter: brightness(2); }
.crmaze .crw.hit i { animation: none; transform: scale(1.8, .3); transition: transform .2s; }
@keyframes crh { from { transform: scaleY(1); } to { transform: scale(.94, 1.1) translateY(-3px); } }
.crmaze .crtop { position: absolute; left: 0; right: 0; top: calc(var(--sat) + 10px); text-align: center; font-weight: 800; color: #3B2F2F; text-shadow: 0 1px 0 rgba(255, 255, 255, .6); pointer-events: none; }
.crmaze .crtop small { display: block; font-weight: 600; opacity: .8; }
.crmaze .crend { position: absolute; left: 8%; right: 8%; top: 38%; text-align: center; font-size: 22px; font-weight: 900; color: #3B2F2F; text-shadow: 0 1px 0 rgba(255, 255, 255, .7); opacity: 0; transition: opacity 1.2s; pointer-events: none; }
.crmaze .crend.on { opacity: 1; }
.crmaze #crSkip { position: absolute; right: calc(var(--sar) + 12px); bottom: calc(var(--sab) + 12px); pointer-events: auto; }
#pGold.sort .ic { animation: none; }
.sxcoins { position: absolute; display: flex; align-items: flex-end; gap: 2px; pointer-events: none; z-index: 4; }
.sxcoins i { display: block; border-radius: 50%; background: #FFD86B; border: 2px solid #C9A227; animation: pop .3s ease-out both; }
`;

const HOUR = () => new Date().getHours();

export class SecretUi {
  constructor(app) {
    this.app = app;
    const m = app.meta;
    for (const k of ['odd', 'bottles', 'hats', 'ach', 'stat', 'loss', 'aid']) m[k] = m[k] || {};
    Object.assign(ICONS, SX_ICONS);
    this.t = { fast: 0, pause: 0, build: 0, star: 50 + Math.random() * 60, plane: 240 + Math.random() * 500, save: 0, check: 0 };
    this.ses = { moon: 0, notes: 0, knot: [], lh: [], sp8: [], ver: [], mist: [], beacon: 0, crystals: [], book: 0 };
    this.freezeT = 0;
    this.dirty = false;
    this.waveHits = 0;
    this.offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const q = new URLSearchParams(location.search);
    this.fakeDate = q.get('debug') === '1' ? q.get('datum') : null;   // ?debug=1&datum=12-24
    this.fakeHour = q.get('debug') === '1' && q.get('hodina') !== null ? +q.get('hodina') : null;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = app.hud.root;
    const mk = (id, html = '') => { const e = document.createElement('div'); e.id = id; e.innerHTML = html; root.insertBefore(e, app.hud.overlay); return e; };
    this.dock = mk('sxDock', `<button class="pill hidden" id="sxBottle" aria-label="${SX.bottleOne}">${ICONS.bottle}</button><button class="pill hidden" id="sxBoat" aria-label="${SX.merchant.name}">${ICONS.boat}</button>`);
    this.dark = mk('sxDark');
    this.noise = mk('sxNoise');
    this.dock.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.btnBottle = $('#sxBottle', this.dock); this.btnBoat = $('#sxBoat', this.dock);
    this.btnBottle.onclick = () => this.openBottle();
    this.btnBoat.onclick = () => this.showMerchant();
    app.view.sxNote = (code) => this.found(code);
    this.day = this.dayKind();
  }

  get game() { return this.app.game; }
  get view() { return this.app.view; }
  get hud() { return this.app.hud; }
  get meta() { return this.app.meta; }

  // ---------- the clock of the device ----------
  hour() { return this.fakeHour !== null ? this.fakeHour : HOUR(); }
  dayKey() { if (this.fakeDate) return this.fakeDate; const d = new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  dayKind() {
    const k = this.dayKey();
    if (k === '12-24' || k === '12-25' || k === '12-26') return 'xmas';
    if (k === '12-31' || k === '01-01') return 'nye';
    if (k === '10-31') return 'pumpkin';
    if (k === '04-01') return 'april';
    return '';
  }

  // ---------- collections ----------
  found(code) {
    if (!ODD[code] || this.meta.odd[code]) return false;
    this.meta.odd[code] = 1;
    this.app.saveMeta();
    if (Object.keys(this.meta.odd).length === 1) setTimeout(() => this.app.toast(SX.first, 4200), 2600);
    return true;
  }
  ach(id) {
    if (this.meta.ach[id]) return;
    const a = ACHIEVEMENTS.find((x) => x[0] === id);
    if (!a) return;
    this.meta.ach[id] = 1;
    this.app.saveMeta();
    this.hud.banner(fill(SX.achToast, { 'název': a[1] }), a[2], 3600);
    this.app.sound('unlock');
  }
  stat(k, n = 1) { const s = this.meta.stat; s[k] = (s[k] || 0) + n; this.dirty = true; return s[k]; }
  count(obj) { return Object.keys(obj || {}).length; }
  quip(text, ms = 4600) { this.hud.showQuip(text, ms); this.app.sound('bubble'); }
  recent(list, ms) { const now = performance.now(); list.push(now); while (list.length && now - list[0] > ms) list.shift(); return list.length; }
  floatAt(x, y, h, text, cls = 'big') { const p = this.view.toScreen(x, y, h); if (p.visible) this.hud.floatText(p.x, p.y, text, cls); }

  // ---------- every frame ----------
  update(dt) {
    const app = this.app, g = this.game, view = this.view, t = this.t;
    if (!g || app.gallery) return;
    const s = g.s, x = s.sec || {}, F = view.sx;
    const build = g.phase() === 'build', overlay = !!this.hud.overlayKind;
    const cc = s.completedCount, ch = chapterOf(g.currentWaveNumber());
    if (this.freezeT > 0) this.freezeT -= dt;
    // flags for the view
    F.knotHat = this.meta.knotHat || 0;
    F.xmas = this.day === 'xmas'; F.pumpkin = this.day === 'pumpkin';
    const hr = this.hour();
    F.owl = app.playing && hr >= 0 && hr < 4;
    F.cheese = this.ses.moon >= 3;
    const idle = performance.now() - app.lastInput;
    const sleep = app.playing && build && !overlay && idle > 120000 && !s.lost;
    if (sleep && !F.sleep) this.found('P-03');
    if (!sleep && F.sleep && app.playing) this.quip(SX.knot.sleepWake, 3000);
    F.sleep = sleep;
    const db = app.playing && x.bottle ? 1 : 0, dm = app.playing && x.merchant && build ? 1 : 0;
    if (db !== this.dockB) { this.dockB = db; this.btnBottle.classList.toggle('hidden', !db); }
    if (dm !== this.dockM) { this.dockM = dm; this.btnBoat.classList.toggle('hidden', !dm); }
    if (!app.playing) { audio.thin = 0; return; }
    if (this.day && !this.dayTold) { this.dayTold = 1; this.found('P-48'); }
    if (F.owl && !this.owlTold) { this.owlTold = 1; setTimeout(() => this.quip(SX.knot.owl, 6000), 5000); this.found('P-43'); this.ach('night'); }
    t.build = build ? t.build + dt : 0;
    // P-09: five minutes in a row at 8× and more
    if (!app.paused && app.speed >= 8) { if (!build && !overlay) t.fast += dt; } else if (app.speed < 8) t.fast = 0;
    if (t.fast >= 300) { t.fast = 0; view.sxGo('dizzy'); this.quip(SX.knot.dizzy); this.found('P-09'); }
    // P-34: a long pause in the middle of a fight
    if (app.paused && !build && !overlay) {
      t.pause += dt;
      if (t.pause > 30 && !this.stare) {
        const list = s.enemies.filter((e) => !e.dead && e.vis && !e.under && !e.fly);
        if (list.length) { this.stare = list[Math.floor(Math.random() * list.length)].id; view.sxGo('stare', this.stare); this.found('P-34'); }
      }
    } else { t.pause = 0; if (this.stare) { this.stare = 0; view.sxGo('stare', 0); } }
    // P-32: Knot at the crack before wave 46
    if (build && s.nextWave >= 44 && s.nextWave <= 46 && !x.p32 && !s.hero.path.length && Math.hypot(s.hero.x - 0.5, s.hero.y - 15.5) < 1.8 && g.isOpen(0, 15)) {
      if (g.secret('shiver').ok) { this.quip(SX.knot.heard, 5200); this.found('P-32'); app.save(); }
    }
    const night = ch === 6 || ch === 8 || ch === 10;
    if (!overlay && !s.lost && !(s.fin && s.fin.phase >= 3)) {
      // P-45: now and then a star falls in the night chapters
      if (night) { t.star -= dt; if (t.star <= 0) { t.star = 170 + Math.random() * 220; view.sxGo('star'); } }
      // P-47: very rarely a little plane (and nobody should miss it for the whole game)
      t.plane -= dt;
      if (!this.meta.plane && cc >= 30 && t.plane > 45) t.plane = 20 + Math.random() * 25;
      if (t.plane <= 0 && cc >= 6) { t.plane = 900 + Math.random() * 900; view.sxGo('plane'); }
      if (build && t.build > 7) {
        // P-38: fireflies write a word (once); P-70: the path runs backwards for a moment (once); P-71: footprints (once a chapter)
        if (night && !x.mdomu && cc >= 51) { if (g.secret('mark', 'domu').ok) { view.sxGo('domu'); this.found('P-38'); } }
        else if (ch >= 5 && !x.mback && cc >= 42 && t.build > 10) { if (g.secret('mark', 'back').ok) { view.sxGo('back'); this.found('P-70'); } }
        else if (ch >= 7 && !x['msteps' + ch] && t.build > 12 && cc % 10 >= 2) {
          const p = g.paths().find((q) => q.key === 'S') || g.paths()[0];
          if (p && p.cells.length > 4 && g.secret('mark', 'steps' + ch).ok) { view.sxGo('steps', p.cells); this.found('P-71'); }
        }
        // the aurora returns on some nights
        if (night && ch === 6 && cc > 50 && cc % 3 === 1 && this.auroraAt !== cc && t.build > 3) { this.auroraAt = cc; view.sxGo('aurora', 40); }
      }
    }
    // P-42: in the last chapter the music between waves loses its instruments
    const thin = ch === 10 && build && s.nextWave > 91 && s.nextWave <= 100 ? Math.min(3, Math.floor((s.nextWave - 90) / 3)) : 0;
    if (audio.thin !== thin) { audio.thin = thin; if (thin >= 2) this.found('P-42'); }
    // achievements that are simply a state of the game
    t.check += dt;
    if (t.check > 1.5) {
      t.check = 0;
      if (s.gold >= 5000) this.ach('rich');
      if (s.hero.lvl >= 10) this.ach('knot10');
      if (s.stats.interest >= 1000) this.ach('interest');
      if (g.paths().some((p) => p.cells.length >= 61)) this.ach('maze');
      if (this.count(this.meta.hats) >= 5) this.ach('hats');
      if (this.count(this.meta.bottles) >= 10) this.ach('post');
      if (HYBRID_TYPES.every((h) => (this.meta.seenH || {})[h])) this.ach('hybrids');
    }
    t.save += dt;
    if (this.dirty && t.save > 6) { t.save = 0; this.dirty = false; app.saveMeta(); }
  }

  // ---------- taps on the world. Returns true when the tap is used up. ----------
  tapWorld(cell, p) {
    const app = this.app, g = this.game, view = this.view, s = g.s;
    if (this.swapI !== undefined && this.swapI !== null) return this.swapTap(cell);
    if (app.mode) return false;
    const k = p ? view.sxHit(p.x, p.y) : null;
    if (k === 'pet') { g.secret('pet'); app.sound('bubble', 1.2); app.save(); return true; }
    if (k === 'bottle') { this.openBottle(); return true; }
    if (k === 'boat') { this.showMerchant(); return true; }
    if (k === 'cat') {
      const named = (this.meta.journal || {})[3];
      this.floatAt(9.5 - 0.42, 20.5 + 0.86, 0.7, named ? 'Micka: ' + SX.purr : SX.purr, '');
      view.sxGo('hearts', view.lhX - 0.42, 0.5, view.lhZ + 0.86);
      if (this.stat('cat') >= 10) this.ach('cat');
      if (named && !this.ses.catNamed) { this.ses.catNamed = 1; this.quip(SX.knot.catName); }
      return true;
    }
    if (k === 'moon') {
      this.ses.moon++;
      if (this.ses.moon === 3) view.sxGo('mouse'); else view.sxGo('wink');
      if (this.ses.moon > 3) view.sxGo('mouse');
      this.found('P-13');
      return true;
    }
    if (k === 'whale') { if (g.secret('whale').ok) app.save(); return true; }
    if (k === 'plane') { if (!this.planeHit) { this.planeHit = 1; g.secret('plane'); app.save(); setTimeout(() => { this.planeHit = 0; }, 14000); } return true; }
    if (k === 'star') { if (!(performance.now() - (this.starAt || 0) < 3000)) { this.starAt = performance.now(); g.secret('star'); app.save(); } return true; }
    // P-64: poking Knot
    if (p) {
      const q = view.toScreen(s.hero.x, s.hero.y, 0.45);
      if (q.visible && Math.hypot(p.x - q.x, p.y - q.y) < 26 && this.recent(this.ses.knot, 4000) >= 5) {
        this.ses.knot.length = 0;
        g.secret('poke');
        this.ses.pokeI = ((this.ses.pokeI ?? -1) + 1) % SX.knot.poke.length;
        this.quip(SX.knot.poke[this.ses.pokeI], 3200);
        this.found('P-64');
      }
      // P-02: ten quick taps on the lighthouse
      if (view.lighthouseHit(p.x, p.y) && this.recent(this.ses.lh, 3500) >= 10) {
        this.ses.lh.length = 0;
        if (g.secret('disco').ok) { this.ach('disco'); app.sound('chapter'); }
      }
    }
    if (!cell) return false;
    // P-14, P-31: the pond
    if (cell.x >= POND.x0 && cell.x <= POND.x1 && cell.y >= POND.y0 && cell.y <= POND.y1 && g.isOpen(cell.x, cell.y)) {
      g.secret('pond', cell.fx, cell.fy);
      app.sound('click', 0.8);
      return true;
    }
    const b = g.buildingAt(cell.x, cell.y);
    const tile = tileAt(cell.x, cell.y);
    // P-15: lightning towers play notes
    if (b && b.type === 'lightning' && !b.wreck) {
      const i = (b.x + (20 - b.y) * 2) % 15, note = 60 + [0, 2, 4, 7, 9][i % 5] + 12 * Math.floor(i / 5);
      audio.ping(440 * Math.pow(2, (note - 69) / 12));
      view.sxGo('note', b.x, b.y);
      this.floatAt(b.x + 0.5, b.y + 0.5, 1.6, '♪', '');
      this.found('P-15');
      if (++this.ses.notes >= 8) this.ach('tune');
    }
    // P-72: the transmitter picks up a station now and then
    if (tile.beacon && g.isOpen(cell.x, cell.y) && ++this.ses.beacon % 3 === 0) {
      app.toast(SX.radio[(this.ses.beacon / 3 - 1) % SX.radio.length], 4200);
      view.sxGo('radio', cell.x, cell.y);
      app.sound('zap', 0.4);
      this.found('P-72');
    }
    // P-69: the crystals chime; all four of the gate within a moment answer together
    if (tile.crystal && !b && g.isOpen(cell.x, cell.y)) {
      const key = cell.x + ',' + cell.y, now = performance.now();
      audio.ping(880 * Math.pow(2, ((cell.x * 3 + cell.y) % 8) / 12), 'sine', 0.6);
      view.sxGo('chime', cell.x, cell.y);
      this.ses.crystals = this.ses.crystals.filter((c) => now - c.t < 12000 && c.k !== key);
      this.ses.crystals.push({ k: key, t: now, x: cell.x, y: cell.y });
      if (this.ses.crystals.length >= 4) { view.sxGo('chimeAll', this.ses.crystals.map((c) => [c.x, c.y])); this.ses.crystals = []; this.found('P-69'); app.sound('chapter', 0.6); }
    }
    // P-76: the mist over a closed sector looks back
    if (!g.isOpen(cell.x, cell.y) && sectorAt(cell.x, cell.y) && this.recent(this.ses.mist, 6000) >= 7 && !this.mistOld) {
      this.ses.mist.length = 0;
      this.mistOld = T.tiles.locked;
      T.tiles.locked = SX.mist;
      this.hud.cache.sel = null;
      view.sxGo('mistEyes', cell.x, cell.y);
      this.found('P-76');
      setTimeout(() => { T.tiles.locked = this.mistOld; this.mistOld = null; this.hud.cache.sel = null; }, 5000);
    }
    return false;
  }

  // P-27: a long press on the lighthouse hands the beam to the player.
  holdStart(onLighthouse) {
    const g = this.game;
    if (!onLighthouse || !this.app.playing || (g.s.fin && g.s.fin.phase >= 3)) return false;
    const r = g.secret('beam');
    if (r.ok) { if (!r.on) { this.app.toast(SX.beamStart, 2600); this.app.sound('unlock', 0.7); this.found('P-27'); } } else this.app.toast(fill(SX.beamCd, { n: r.cd }), 2000);
    return true;
  }
  holdMove(l) {
    const g = this.game, view = this.view;
    if (!g || !(g.s.sec && g.s.sec.beamT > 0)) return;
    const p = view.groundAt(l.x, l.y, 0.05);
    if (p) g.secret('aim', Math.atan2(p.z - view.lhZ, p.x - view.lhX));
  }

  // P-10: eight quick taps on 8× unlock 16×. Returns the speed to use.
  speedTap(n) {
    const app = this.app;
    if (n !== 8) return n;
    if (!this.meta.s16) {
      if (this.recent(this.ses.sp8, 3000) >= 8) {
        this.meta.s16 = 1; app.saveMeta();
        this.quip(SX.knot.fast16);
        this.found('P-10'); this.ach('fast');
        return 16;
      }
      return 8;
    }
    return !app.paused && app.speed === 8 ? 16 : 8;
  }

  // ---------- events of the game ----------
  onEvent(e) {
    const app = this.app, g = this.game, s = g.s, hud = this.hud, view = this.view;
    switch (e.k) {
      case 'build': if (e.type === 'wall' && this.stat('walls') >= 50) this.ach('walls'); break;
      case 'merge': {
        const b = g.byId.get(e.id);
        if (e.level >= 4) this.ach('lvl4');
        if (b && b.nm) this.found('P-08');
        if (e.hybrid === 'icecream') { this.found('P-17'); this.ach('ice'); }
        if (e.hybrid === 'vault') this.found('P-17');
        break;
      }
      case 'sell': if (e.nm) app.toast(fill(SX.farewells[(e.id + e.nm) % SX.farewells.length], { 'jméno': this.nickOf(e.type, e.level, e.nm) }), 3600); break;
      case 'repair': if (this.stat('repair') >= 20) this.ach('repair'); break;
      case 'heroHit': case 'strike': this.waveHits++; break;
      case 'waveStart':
        this.waveHits = 0;
        this.leakAtStart = s.light;
        if (this.day === 'april' && this.meta.april !== this.dayKey() + new Date().getFullYear()) this.aprilOn();
        break;
      case 'waveEnd':
        if (this.waveHits === 0 && e.n >= 3) this.ach('pacifist');
        if (s.light <= 5) this.ach('edge');
        if (e.n >= 110) this.ach('endless');
        if (this.day === 'nye') view.sxGo('fireworks');
        if (this.aprilNames) this.aprilOff();
        break;
      case 'bossDefeated': if (s.light >= (this.leakAtStart ?? 0)) this.ach('clean'); break;
      case 'chapterDone': {
        if (e.chapter >= 1) this.ach('ch1');
        if (e.chapter >= 5) this.ach('ch5');
        delete this.meta.loss[e.chapter]; delete this.meta.aid[e.chapter];
        const n = Math.round(s.stats.kills * (0.4 + e.chapter * 0.13) + e.chapter * 17);
        e.sxStat = fill(SX.absurd[(e.chapter * 3 + (s.seed % 7)) % SX.absurd.length], { n: fmt(n) }).split(': ');
        this.found('P-12');
        app.saveMeta();
        break;
      }
      case 'page': if (e.n === 7) this.found('P-62'); break;
      case 'pickItem': if (e.kind === 'wreck') this.found('P-62'); break;
      case 'gameWon': this.ach('end'); if (!e.byKnot) { this.ach('signal'); this.found('FIN'); } this.found('P-51'); this.found('P-58'); break;
      case 'lost': { const ch = chapterOf(g.currentWaveNumber()); this.meta.loss[ch] = (this.meta.loss[ch] || 0) + 1; app.saveMeta(); break; }
      case 'secret': this.onSecret(e); break;
    }
  }

  onSecret(e) {
    const app = this.app, g = this.game, s = g.s, hud = this.hud, view = this.view, K = SX.knot;
    const code = e.code === 'P-45' ? (e.what === 'aurora' ? 'P-45a' : e.what === 'rainbow' ? 'P-45b' : 'P-45c') : e.code;
    if (!(e.code === 'P-18' && e.what !== 'come') && !(e.code === 'FIN')) this.found(code);
    switch (e.code) {
      case 'BOTTLE': app.toast(SX.bottleCome, 3200); app.sound('bubble'); break;
      case 'P-01': if (e.what === 'pet') { this.quip(K.pet); this.ach('pet'); } break;
      case 'P-04':
        if (e.what === 'steal') this.floatAt(e.x, e.y, 0.9, '−1', 'bad');
        else { app.toast(fill(SX.gullGift, { gold: e.gold }), 4200); app.sound('gold'); }
        break;
      case 'P-05': this.meta.hats[e.hat] = 1; app.saveMeta(); this.floatAt(e.x, e.y, 1.1, SX.hats[e.hat] + ' +5'); break;
      case 'P-11':
        if (e.what === '404') this.goldText(SX.gold404, 1100);
        if (e.what === '777') { this.goldText(SX.gold777, 1600); app.sound('gold'); }
        if (e.what === '1234') this.coinRow();
        break;
      case 'P-33': this.quip(K.notToday); break;
      case 'P-65': this.goldText(SX.gold42 + ': 42', 1500); this.quip(K.answer, 5600); break;
      case 'P-67': if (e.what === 'start') this.quip(K.bold); else { const a = hud.goldAnchor(); hud.floatText(a.x + 50, a.y + 14, fill(SX.boldBonus, { gold: e.gold }), ''); } break;
      case 'P-14': if (e.what === 'gull') this.ach('fish'); break;
      case 'P-16': app.toast(SX.garden, 4200); this.ach('garden'); break;
      case 'P-18':
        if (e.what === 'come') { app.toast(SX.merchant.come, 4200); app.sound('bubble'); }
        if (e.what === 'leave') { if (hud.overlayKind === 'sxshop') app.closeOverlay(); this.swapI = null; }
        break;
      case 'P-20': if (e.what === 'passed') { app.toast('„' + SX.blackThanks + '“ +150', 4600); app.sound('gold'); } break;
      case 'P-21':
        if (e.what === 'arrived') this.quip(K.flag);
        if (e.what === 'killed') { this.quip(K.flagKilled); this.meta.flagKilled = 1; app.saveMeta(); }
        if (e.what === 'repair') app.toast(SX.mechanic, 2600);
        break;
      case 'P-22': this.quip(K.wreck); break;
      case 'P-23': if (e.what === 'egg') this.quip(K.egg); if (e.what === 'hatch') this.quip(K.pepa); break;
      case 'P-24': if (e.what === 'arrived') this.quip(K.cat); break;
      case 'P-25': this.quip(K.meteor); app.sound('explode'); break;
      case 'P-26': this.floatAt(e.x, e.y, 0.9, '+' + (e.gold || '')); app.sound('gold'); if (e.what === 'cap') { this.quip(K.cap); this.ach('dig'); hud.toast(T.cardKinds.relic + ': ' + T.relics.hugoCap.name, 3600); } else if (e.n === 1) this.quip(K.dig); break;
      case 'P-28': this.floatAt(e.x, e.y, 0.9, '+200'); this.quip(K.chest); app.sound('gold'); break;
      case 'P-29': app.toast(SX.mine[e.what], 3600); break;
      case 'P-35': this.blackout(); break;
      case 'P-40': this.glitch(); break;
      case 'P-44': if (e.what === 'come') this.quip(K.whale, 5000); else { app.toast(SX.whaleSing, 4600); app.sound('chapter', 0.6); } break;
      case 'P-45': if (e.what === 'star') { app.toast(e.card ? SX.starCard : fill(SX.starGold, { gold: e.gold }), 3600); app.sound('gold'); } break;
      case 'P-47':
        this.meta.plane = 1; app.saveMeta();
        app.toast(SX.plane, 3600);
        setTimeout(() => { if (!this.meta.bottles[13]) { this.meta.bottles[13] = this.count(this.meta.bottles) + 1; app.saveMeta(); } if (app.playing) { app.paused = true; app.queueOverlay(() => this.showBottle(13, () => app.closeOverlay())); } }, 3300);
        break;
      case 'P-50': app.toast(SX.flowers, 3200); break;
      case 'P-56': app.toast(fill(SX.aidDone, { light: e.lvl >= 2 ? 40 : 20, gold: e.lvl >= 2 ? 30 : 15 }), 4600); break;
      case 'P-63': if (e.what === 'arrived') this.ach('letter'); break;
      case 'P-66': app.toast(SX.quartet, 4200); app.sound('merge'); break;
      case 'P-73': { const b = g.byId.get(e.id); if (b) app.toast(fill(SX.medal, { 'jméno': this.nick(b), n: b.k }), 4200); break; }
    }
    void s; void view;
  }

  // ---------- small effects in the interface ----------
  goldText(text, ms) {
    const hud = this.hud, pill = $('#pGold', hud.root);
    hud.holdUntil = performance.now() + ms;
    $('#nGold', hud.root).textContent = text;
    pill.classList.add('sxg');
    setTimeout(() => { pill.classList.remove('sxg'); hud.holdUntil = 0; hud.cache.gold = undefined; }, ms);
  }
  coinRow() {
    const hud = this.hud, a = hud.goldAnchor();
    const row = document.createElement('div');
    row.className = 'sxcoins';
    row.style.left = Math.round(a.x - 50) + 'px'; row.style.top = Math.round(a.y + 4) + 'px';
    row.innerHTML = [8, 12, 16, 20].map((d, i) => `<i style="width:${d}px;height:${d}px;animation-delay:${i * 0.18}s"></i>`).join('');
    hud.floaters.appendChild(row);
    this.app.sound('gold');
    setTimeout(() => row.remove(), 2600);
  }
  // P-35: two seconds of dark; when the light is back, everybody looks at the player.
  blackout() {
    this.freezeT = 3.5;
    this.dark.classList.add('on');
    this.view.sxGo('stareAll', 3.7);
    setTimeout(() => this.dark.classList.remove('on'), 2000);
  }
  // P-40: the picture grains and three labels change for a moment.
  glitch() {
    const hud = this.hud;
    hud.holdUntil = performance.now() + 1800;
    this.noise.classList.add('on');
    $('#nLight', hud.root).textContent = SX.help[0]; $('#nGold', hud.root).textContent = SX.help[1]; $('#nWave', hud.root).textContent = SX.help[2];
    setTimeout(() => { this.noise.classList.remove('on'); hud.holdUntil = 0; hud.cache = {}; }, 1800);
  }
  aprilOn() {
    this.aprilNames = BASIC_TOWERS.map((t) => T.buildings[t].name);
    BASIC_TOWERS.forEach((t, i) => { T.buildings[t].name = this.aprilNames[(i + 1) % 4]; });
    this.meta.april = this.dayKey() + new Date().getFullYear(); this.app.saveMeta();
    this.hud.cache = {};
  }
  aprilOff() { BASIC_TOWERS.forEach((t, i) => { T.buildings[t].name = this.aprilNames[i]; }); this.aprilNames = null; this.hud.cache = {}; }

  // ---------- names of towers (P-08), notes about enemies ----------
  nickOf(type, level, nm) {
    const word = SX.towerWords[type] || bName(type);
    return `${word} ${level >= 4 ? SX.ing + ' ' : ''}${SX.towerNames[nm] || ''}`;
  }
  nick(b) { return b && b.nm && BUILDINGS[b.type].tower ? this.nickOf(b.type, b.level, b.nm) : ''; }
  nickHtml(b) {
    const n = this.nick(b);
    if (!n) return '';
    return `<div class="nick">${n} · ${SX.kills}: ${b.k || 0}${b.md ? ' · ' + '★'.repeat(b.md) : ''}</div>`;
  }
  enemyNote(e) {
    const out = [];
    if (e.sign) out.push(`Nese cedulku: „${SX.signs[e.sign]}“`);
    if (e.banner) out.push(`Táhne transparent: „${SX.banner}“`);
    if (e.hat) out.push(`Na hlavě má: ${SX.hats[e.hat]}.`);
    if (e.flag) out.push('Nese bílou vlajku. Věže na něj nestřílí.');
    if (e.black) out.push('Černý mezi zlatými. Věže ho nechávají být.');
    return out.length ? `<div class="note">${out.join(' ')}</div>` : '';
  }
  codexLine(type) { return type === 'plechac' && this.meta.flagKilled ? '<p class="second">Jeden z nich nesl bílou vlajku.</p>' : ''; }
  codexHybrids() {
    const seen = this.meta.seenH || {};
    return ['icecream', 'vault'].filter((id) => seen[id]).map((id) => { const [a, b] = BUILDINGS[id].hybrid; return `<div class="cx"><div class="cxic">${ICONS[id]}</div><div><h3>${bName(id)}</h3><p>${T.buildings[id].desc}</p><div class="stats"><span class="tag">${bName(a)} + ${bName(b)}</span></div></div></div>`; }).join('');
  }
  // P-19: a blurred card shows nothing until it is taken
  pickHtml(id) { return `<button class="pick blur" data-id="${id}"><div class="pic">${ICONS.blur}</div><div><div class="kind">???</div><h3>${SX.blurName}</h3><p>${SX.blurDesc}</p></div></button>`; }
  isBlur(id) { return MYSTERY.includes(id); }
  picked(id) { if (!this.isBlur(id)) return; this.found('P-19'); this.hud.banner(T.cards[id].name, T.cards[id].desc, 8000); }

  // ---------- bottles ----------
  nextBottle() {
    const have = this.meta.bottles, cc = this.game.s.completedCount, hr = this.hour();
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (this.offline && !have[9]) return 9;
    for (const id of BOTTLE_ORDER) {
      if (have[id]) continue;
      if (id === 9 && online) continue;
      if (id === 13 && cc < 70) continue;
      if (id === 14 && cc < 60) continue;
      if (id === 16 && !(hr >= 22 || hr < 5)) continue;
      if (id === 19 && cc < 40) continue;
      if (id === 20 && !this.meta.finished) continue;
      if (id === 33 && cc < 55) continue;
      if ((id === 4 && !have[3]) || (id === 5 && !have[4]) || (id === 6 && !have[5])) continue;
      return id;
    }
    return 0;
  }
  takeBottle() {
    const id = this.nextBottle();
    if (!id) return 0;
    this.meta.bottles[id] = this.count(this.meta.bottles) + 1;
    if (id === 9) this.found('P-53');
    this.app.saveMeta();
    return id;
  }
  openBottle() {
    const app = this.app;
    if (!app.playing || this.hud.overlayKind) return;
    if (!this.game.secret('bottle').ok) return;
    const id = this.takeBottle();
    app.sound('paper');
    app.paused = true;
    app.save();
    if (!id) { app.toast('Lahev je prázdná. Někdo si to rozmyslel.', 3000); return; }
    this.showBottle(id, () => app.closeOverlay());
  }
  showBottle(id, done) {
    const hud = this.hud;
    const card = hud.showCard('sxbottle', `<div class="pnum" style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">${SX.bottleOne}</div><div class="ptext">${BOTTLES[id]}</div><button class="btn primary" id="sxOk">${T.journal.close}</button>`, { cls: 'bottle' });
    $('#sxOk', card).onclick = () => done && done();
  }

  // ---------- menu: achievements, bottles, oddities ----------
  menuHtml() {
    const g = this.game, n = g ? g.currentWaveNumber() : 1;
    const odd = this.count(this.meta.odd) > 0, bot = this.count(this.meta.bottles) > 0;
    const last = g && n === 94 && this.app.playing;
    const line = fill(SX.saveLine, { hra: last ? SX.last : T.gameTitle, 'název': last ? SX.lastSave : fill(SX.saveWave, { n }) });
    return `<div class="row"><button class="btn" id="mAch">${ICONS.medal}${SX.achTitle}</button>${bot ? `<button class="btn" id="mBot">${ICONS.bottle}${SX.bottleTitle.split(' ')[0]}</button>` : ''}</div>
      ${odd ? `<button class="btn" id="mOdd">${ICONS.odd}${SX.oddTitle}</button>` : ''}<div class="tver" id="mSave">${line}</div>`;
  }
  menuBind(card, back) {
    const b1 = $('#mAch', card), b2 = $('#mBot', card), b3 = $('#mOdd', card);
    if (b1) b1.onclick = () => this.showAch(back);
    if (b2) b2.onclick = () => this.showBottles(back);
    if (b3) b3.onclick = () => this.showOdd(back);
    const g = this.game;
    if (g && g.currentWaveNumber() === 94 && this.app.playing) {
      this.found('P-41');
      setTimeout(() => { const e = $('#mSave'); if (e) e.textContent = fill(SX.saveLine, { hra: T.gameTitle, 'název': fill(SX.saveWave, { n: 94 }) }); }, 3800);
    }
  }
  head(title, icon) { return `<div class="chead">${icon ? `<div class="hic">${icon}</div>` : ''}<h2>${title}</h2><button class="close" data-close aria-label="${T.ui.close}">${ICONS.close}</button></div>`; }
  showOdd(back) {
    const have = this.meta.odd, all = Object.keys(ODD);
    const n = all.filter((k) => have[k]).length;
    const tags = all.filter((k) => have[k]).map((k) => `<span>${ODD[k]}</span>`).join('');
    const card = this.hud.showCard('sxodd', `${this.head(SX.oddTitle, ICONS.odd)}<p class="muted">${SX.oddHelp}</p><p><b>${fill(SX.oddCount, { n, max: this.meta.finished ? all.length : '?' })}</b></p><div class="sxtags">${tags}</div>`, { wide: true });
    $('[data-close]', card).onclick = back;
  }
  showBottles(back) {
    const have = this.meta.bottles;
    const ids = Object.keys(have).map(Number).sort((a, b) => have[a] - have[b]);
    const items = ids.map((id) => `<div class="it msg">${BOTTLES[id]}</div>`).join('');
    const card = this.hud.showCard('sxbottles', `${this.head(SX.bottleTitle, ICONS.bottle)}<p><b>${fill(SX.bottleCount, { n: ids.length, max: this.meta.finished ? Object.keys(BOTTLES).length : '?' })}</b></p><div class="sxl">${items || `<p class="muted center pad">${SX.bottleEmpty}</p>`}</div>`, { wide: true });
    $('[data-close]', card).onclick = back;
  }
  showAch(back) {
    const have = this.meta.ach;
    const items = ACHIEVEMENTS.map(([id, name, desc, hidden]) => {
      const ok = !!have[id];
      if (hidden && !ok) return `<div class="it no"><div class="ic">${ICONS.lock || ICONS.medal}</div><div><b>${SX.achHidden}</b><small>${SX.achHiddenDesc}</small></div></div>`;
      return `<div class="it ${ok ? '' : 'no'}"><div class="ic">${ICONS.medal}</div><div><b>${name}</b><small>${desc}</small></div></div>`;
    }).join('');
    const card = this.hud.showCard('sxach', `${this.head(SX.achTitle, ICONS.medal)}<p><b>${fill(SX.achCount, { n: this.count(have), max: ACHIEVEMENTS.length })}</b></p><div class="sxl">${items}</div>`, { wide: true });
    $('[data-close]', card).onclick = back;
  }

  // ---------- P-18: the pedlar ----------
  showMerchant(msg) {
    const app = this.app, g = this.game, m = g.s.sec && g.s.sec.merchant, M = SX.merchant;
    if (!m || !app.playing || g.phase() !== 'build') return;
    if (this.hud.overlayKind && this.hud.overlayKind !== 'sxshop') return;
    app.paused = true;
    this.found('P-18');
    const greet = msg || M.greet[(m.wave + (g.s.seed % 5)) % M.greet.length];
    const items = m.offers.map((k, i) => {
      const cost = world.tradeCost(g, k), used = m.used[i];
      const price = used ? M.taken : k === 'relic' ? M.light10 : cost ? `${cost} zlata` : M.free;
      return `<button class="pick ${used ? 'used' : ''}" data-i="${i}" ${used ? 'disabled' : ''}><div class="pic">${ICONS[k === 'box' ? 'card' : k === 'relic' ? 'star' : k === 'swap' ? 'merge' : 'blur']}</div><div><h3>${M[k].name}</h3><p>${M[k].desc}</p><small>${price}</small></div></button>`;
    }).join('');
    const card = this.hud.showCard('sxshop', `${this.head(M.name, ICONS.boat)}<p class="greet">„${greet}“</p><div class="picks">${items}</div><button class="btn" id="sxBye">${M.bye}</button>`, { cls: 'sxshop' });
    const close = () => app.closeOverlay();
    $('[data-close]', card).onclick = close;
    $('#sxBye', card).onclick = close;
    for (const b of card.querySelectorAll('[data-i]')) b.onclick = () => this.trade(+b.dataset.i);
  }
  trade(i, arg) {
    const app = this.app, g = this.game, m = g.s.sec.merchant, M = SX.merchant;
    if (!m) return;
    const kind = m.offers[i];
    if (kind === 'swap' && arg === undefined) {
      if (!g.s.buildings.some((b) => BASIC_TOWERS.includes(b.type) && !b.wreck)) { this.showMerchant(M.pickBad); return; }
      app.closeOverlay(); this.swapI = i; app.toast(M.pick, 5200);
      return;
    }
    const r = g.secret('trade', i, arg);
    if (!r.ok) { app.sound('deny'); this.showMerchant(M[r.reason] || M.noGold); return; }
    app.sound('coin');
    let text = M.res[r.what] || '';
    if (r.what === 'hat') {
      const free = [1, 2, 3, 4, 5, 6, 7].filter((h) => !this.meta.hats[h]);
      const h = free.length ? free[Math.floor(Math.random() * free.length)] : 1 + Math.floor(Math.random() * 7);
      this.meta.hats[h] = 1;
      text = fill(M.res.hat, { 'název': SX.hats[h] });
    }
    if (r.what === 'sock') this.meta.sock = 1;
    if (kind === 'swap') { const b = g.byId.get(arg); text = fill(M.res.swap, { 'název': bName(b.type), n: b.level }); }
    app.saveMeta(); app.save();
    this.hud.cache = {};
    if (r.what === 'msg') { const id = this.takeBottle(); if (id) { this.showBottle(id, () => this.showMerchant(M.res.msg)); return; } }
    if (g.s.pick) { app.closeOverlay(); app.toast(text, 3600); return; }
    if (kind === 'swap') { app.toast(text, 4600); return; }
    this.showMerchant(text);
  }
  swapTap(cell) {
    const app = this.app, g = this.game, i = this.swapI;
    this.swapI = null;
    const b = cell ? g.buildingAt(cell.x, cell.y) : null;
    if (!b || b.wreck || !BASIC_TOWERS.includes(b.type)) { app.toast(SX.merchant.pickBad, 3200); app.sound('deny'); return true; }
    this.trade(i, b.id);
    return true;
  }

  // ---------- P-30: the shortest service ----------
  shortLoss() {
    const app = this.app, g = this.game, s = g.s;
    if (!(s.completedCount === 0 && s.buildings.length === 0 && g.currentWaveNumber() === 1)) return false;
    this.found('P-30'); this.ach('short');
    const first = !this.meta.hats[6];
    this.meta.hats[6] = 1;
    if (!this.meta.knotHat) this.meta.knotHat = 6;
    app.saveMeta();
    this.view.sx.dance = true;
    const card = this.hud.showCard('loss', `<div class="title-ic">${ICONS.hat}</div><h2 class="center">${SX.shortTitle}</h2><p class="center">${SX.shortText}</p>${first ? `<p class="center muted">${SX.shortHat}</p>` : ''}<button class="btn primary big" id="sxAgain">${SX.shortAgain}</button>`, { clear: true });
    $('#sxAgain', card).onclick = () => { this.view.sx.dance = false; app.restoreCheckpoint(app.checkpoints[0]); };
    return true;
  }

  // ---------- P-56: the parcel from a stranger ----------
  afterRestore() {
    const app = this.app, g = this.game;
    const ch = chapterOf(Math.min(g.s.nextWave, TOTAL_WAVES));
    const n = this.meta.loss[ch] || 0, got = this.meta.aid[ch] || 0;
    if (got > 0) g.secret('aid', got);
    const lvl = n >= 5 ? 2 : n >= 3 ? 1 : 0;
    if (lvl <= Math.abs(got)) return;   // a negative number = this offer was turned down
    setTimeout(() => {
      if (!app.playing || this.hud.overlayKind) return;
      app.paused = true;
      this.hud.confirm(fill(SX.aidText, { light: lvl >= 2 ? 40 : 20, gold: lvl >= 2 ? 30 : 15 }), () => {
        this.meta.aid[ch] = lvl; app.saveMeta();
        g.secret('aid', lvl); app.save(); this.hud.cache = {};
      }, () => { this.meta.aid[ch] = -lvl; app.saveMeta(); }, SX.aidYes, SX.aidNo);
    }, 1200);
  }
  newGame() { this.meta.loss = {}; this.meta.aid = {}; this.app.saveMeta(); }

  // ---------- P-52: the engine room ----------
  versionTap(back) { if (this.recent(this.ses.ver, 4000) >= 7) { this.ses.ver.length = 0; this.showEngine(back); } }
  showEngine(back) {
    const app = this.app, E = SX.engine, m = this.meta;
    this.found('P-52'); this.ach('engine');
    const g = this.game, wave = g ? Math.min(100, g.s.completedCount) : 0;
    const hats = [1, 2, 3, 4, 5, 6, 7].map((h) => `<button data-h="${h}" class="${m.hats[h] ? (m.knotHat === h ? 'on' : '') : 'no'}" ${m.hats[h] ? '' : 'disabled'}>${m.hats[h] ? SX.hats[h] : '?'}</button>`).join('');
    const any = this.count(m.hats) > 0;
    const plan = Array.from({ length: 10 }, (_, i) => `<i class="${wave >= (i + 1) * 10 ? 'done' : wave >= i * 10 ? 'now' : ''}"></i>`).join('');
    const card = this.hud.showCard('sxengine', `${this.head(E.title, ICONS.engine)}<p class="muted">${E.intro}</p>
      <div class="box"><h3>${E.shelf}</h3>${any ? `<div class="hats">${hats}<button data-h="0" class="${m.knotHat ? '' : 'on'}">${E.none}</button></div>` : `<p class="muted">${E.shelfEmpty}</p>`}${m.sock ? `<p class="muted">${E.sock}</p>` : ''}</div>
      <div class="box"><h3>${E.board}</h3><button class="btn small" id="sxBoard">${ICONS.bottle}${fill(SX.bottleCount, { n: this.count(m.bottles), max: m.finished ? Object.keys(BOTTLES).length : '?' })}</button></div>
      <div class="box"><h3>${E.gram}</h3><p class="muted">${E.gramHelp}</p><div class="gram">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button data-m="${n}">${n}</button>`).join('')}</div></div>
      <div class="box"><h3>${E.table}</h3><p class="muted">${E.tableHelp}</p><div class="plan">${plan}</div><div class="note">${E.note}</div></div>`, { wide: true, cls: 'engine' });
    const again = () => this.showEngine(back);
    const leave = () => { app.musicOverride = 0; back(); };
    $('[data-close]', card).onclick = leave;
    for (const b of card.querySelectorAll('[data-h]')) b.onclick = () => { m.knotHat = +b.dataset.h; app.saveMeta(); again(); };
    for (const b of card.querySelectorAll('[data-m]')) { b.classList.toggle('on', app.musicOverride === +b.dataset.m); b.onclick = () => { app.musicOverride = app.musicOverride === +b.dataset.m ? 0 : +b.dataset.m; audio.unlock(); again(); }; }
    $('#sxBoard', card).onclick = () => this.showBottles(again);
  }

  note(what) {
    if (what === 'handbook' && ++this.ses.book === 5) { this.found('P-74'); setTimeout(() => { if (this.app.playing) this.quip(SX.knot.reader, 5200); else this.app.toast(SX.knot.reader, 4200); }, 600); }
    if (what === 'hugo') this.found('P-57');
  }

  // ---------- P-54: credits where the names walk a maze and can be shot ----------
  showCredits(done) {
    const app = this.app, hud = this.hud, S = T.secret, C2 = SX.credits;
    hud.overlayKind = 'credits';
    hud.overlay.className = 'clear epi';
    const names = [...S.credits.map(([a, b]) => [b || a, b ? a : '']), [C2.cast, ''], ...['sliz', 'smejdil', 'tlustoch', 'plechac', 'dron', 'sberac', 'felcar', 'bahnak', 'bourac', 'mlzak', 'rojik', 'nosic', 'rusicka', 'balista', 'tunelar', 'ucen'].map((k) => [T.enemies[k].name, ''])];
    hud.overlay.innerHTML = `<div class="crmaze"><div class="crtop"><span id="crGold"></span><small>${C2.hint}</small></div><div class="crend">${S.creditsEnd}</div><button class="btn small" id="crSkip">${S.skip}</button></div>`;
    const box = $('.crmaze', hud.overlay);
    // a serpentine path in shares of the screen
    const P = [[-0.2, 0.2], [0.84, 0.2], [0.84, 0.4], [0.16, 0.4], [0.16, 0.6], [0.84, 0.6], [0.84, 0.8], [1.2, 0.8]];
    const W2 = () => box.clientWidth || 360, H2 = () => box.clientHeight || 640;
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], tr = document.createElement('div');
      tr.className = 'trk';
      const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
      tr.style.cssText = `left:calc(${x0 * 100}% - 12px);top:calc(${y0 * 100}% - 12px);width:calc(${Math.abs(a[0] - b[0]) * 100}% + 24px);height:calc(${Math.abs(a[1] - b[1]) * 100}% + 24px)`;
      box.insertBefore(tr, box.firstChild);
    }
    const seg = [];
    let total = 0;
    for (let i = 0; i + 1 < P.length; i++) { const L = Math.hypot(P[i + 1][0] - P[i][0], (P[i + 1][1] - P[i][1]) * 1.6); seg.push(L); total += L; }
    const at = (d) => { for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const f = d / seg[i]; return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; } d -= seg[i]; } return P[P.length - 1]; };
    let gold = 0, hits = 0, alive = true, last = performance.now(), spawned = 0, clock = 0;
    const walkers = [];
    const goldEl = $('#crGold', box);
    const show = () => { goldEl.textContent = fill(C2.gold, { n: gold }); };
    show();
    const finish = () => {
      if (!alive) return;
      alive = false;
      if (gold > (this.meta.creditGold || 0)) { this.meta.creditGold = gold; app.saveMeta(); }
      done && done();
    };
    $('#crSkip', box).onclick = finish;
    const colors = ['#3EC9A7', '#B6E04A', '#2A9C86', '#6C8BA8', '#8A5FB0', '#7A5A62', '#FFD23F'];
    const tick = (now) => {
      if (!alive || hud.overlayKind !== 'credits') { alive = false; return; }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now; clock += dt;
      if (spawned < names.length && clock > spawned * 1.7) {
        const [a, b] = names[spawned];
        const e = document.createElement('button');
        e.className = 'crw';
        e.innerHTML = `<i style="background:${colors[spawned % colors.length]}"></i><span>${a}</span>${b ? `<small>${b}</small>` : ''}`;
        const w = { e, d: 0, hit: false };
        e.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
          if (w.hit) return;
          w.hit = true; e.classList.add('hit');
          gold += 8 + Math.floor(Math.random() * 8); hits++;
          show(); app.sound('death'); app.sound('coin');
          this.found('P-54');
          if (hits >= 5) this.ach('credits');
        });
        box.appendChild(e);
        walkers.push(w);
        spawned++;
      }
      let left = 0;
      for (const w of walkers) {
        if (w.hit) continue;
        w.d += dt * 0.115;
        if (w.d >= total) { w.hit = true; w.e.remove(); continue; }
        left++;
        const p = at(w.d);
        w.e.style.transform = `translate(${Math.round(p[0] * W2())}px, ${Math.round(p[1] * H2())}px)`;
      }
      if (spawned >= names.length && left === 0 && !this.crEnd) {
        this.crEnd = true;
        $('.crend', box).classList.add('on');
        const b = $('#crSkip', box); b.textContent = T.ui.continue; b.classList.add('primary');
      }
      requestAnimationFrame(tick);
    };
    this.crEnd = false;
    requestAnimationFrame(tick);
  }
  // The gold shot out of the credits is the starting bonus of the endless mode.
  endlessBonus() {
    const n = this.meta.creditGold || 0;
    if (n > 0 && this.game.secret('endlessBonus', n).ok) setTimeout(() => this.app.toast(fill(SX.credits.bonus, { n: Math.min(600, n) }), 4200), 4200);
  }

  // ---------- debug (?debug=1): trigger a surprise by its code ----------
  debug(code) {
    const app = this.app, g = this.game, s = g.s, x = s.sec, view = this.view;
    const ev = (c, extra) => g.emit({ k: 'secret', code: c, ...extra });
    switch (code) {
      case 'P-01': x.wander = 1; break;
      case 'P-02': x.discoW = 0; g.secret('disco'); break;
      case 'P-03': app.lastInput = performance.now() - 121000; break;
      case 'P-04': ev('P-04', { what: 'steal', x: s.hero.x + 1, y: s.hero.y - 2 }); x.gull = 2; x.gullW = -20; break;
      case 'P-05': for (const e of s.enemies) if (!e.hat) e.hat = 1 + (e.id % 7); break;
      case 'P-06': for (const e of s.enemies) if (e.type === 'dron') { e.banner = 1; break; } break;
      case 'P-07': s.enemies.filter((e) => e.type === 'sliz').slice(0, 4).forEach((e, i) => { e.sign = i + 1; }); break;
      case 'P-08': for (const b of s.buildings) if (BUILDINGS[b.type].tower && b.level < 3) { b.level = 3; if (!b.spec) b.spec = 'A'; } g.rebuild(); break;
      case 'P-09': this.t.fast = 299; break;
      case 'P-11': s.gold = 777; break;
      case 'P-11b': s.gold = 404; break;
      case 'P-11c': s.gold = 1234; break;
      case 'P-13': this.ses.moon = 2; break;
      case 'P-18': x.merchant = { wave: 17, offers: ['box', 'relic', 'swap', 'bag'].filter((_, i) => i !== (s.tick % 4)), used: {} }; ev('P-18', { what: 'come' }); break;
      case 'P-19': s.completedCount = Math.max(15, s.completedCount); x.mys = 0; x.offers = 9; s.picks.push({ kind: 'card', wave: 15 }); g.nextPick(); break;
      case 'P-22': x.valecAt = [Math.floor(s.hero.x), Math.floor(s.hero.y) - 2]; break;
      case 'P-23': x.egg = s.completedCount - 4; break;
      case 'P-23b': x.egg = 1; x.pepa = { n: 12 }; break;
      case 'P-24': { const e = g.activeEntries()[0]; x.cat = 1; x.walk = [{ k: 'cat', x: e.x + 0.5, y: e.y + 0.5, px: e.x + 0.5, py: e.y + 0.5, cx: e.x, cy: e.y, nx: e.x, ny: e.y, dir: -1, t: 0.5, sp: 1.25 }]; break; }
      case 'P-24b': x.cat = 2; break;
      case 'P-21': x.mech = 1; break;
      case 'P-25': x.meteor = 0; world.meteor(g); g.rebuild(); break;
      case 'P-29': { const b = s.buildings.find((o) => o.type === 'mine'); if (b) ev('P-29', { what: ['boot', 'fossil', 'chest', 'slime'][s.tick % 4], x: b.x, y: b.y }); break; }
      case 'P-30': this.shortLoss0 = 1; view.sx.dance = !view.sx.dance; break;
      case 'P-31': x.pond = 19; x.eye = 0; break;
      case 'P-33': s.gold = 666; break;
      case 'P-34': this.t.pause = 29; break;
      case 'P-35': ev('P-35', { star: 3.6 }); break;
      case 'P-36': s.light = 15; break;
      case 'P-38': view.sxGo('domu'); break;
      case 'P-40': ev('P-40'); break;
      case 'P-43': this.fakeHour = 2; this.owlTold = 0; break;
      case 'P-44': x.whale = (x.whale || 0) + 1; x.whaleUp = s.tick + 16 * 30; x.song = 0; ev('P-44', { what: 'come', star: 12 }); break;
      case 'P-45': view.sxGo('aurora', 30); view.sxGo('rainbow', 30); view.sxGo('star'); break;
      case 'P-47': view.sxGo('plane'); break;
      case 'P-48': this.day = this.day === 'xmas' ? 'pumpkin' : this.day === 'pumpkin' ? 'nye' : this.day === 'nye' ? '' : 'xmas'; app.toast('den: ' + (this.day || 'běžný')); break;
      case 'P-49': s.completedCount = Math.max(s.completedCount, 90); ev('P-49', { n: 9 }); break;
      case 'P-50': for (const b of s.buildings) b.w0 = s.completedCount - 31; break;
      case 'P-52': this.showEngine(() => app.closeOverlay()); break;
      case 'P-54': this.showCredits(() => app.closeOverlay()); break;
      case 'P-56': this.meta.loss[chapterOf(s.nextWave)] = 3; this.meta.aid = {}; this.afterRestore(); break;
      case 'P-66': break;
      case 'P-70': view.sxGo('back'); break;
      case 'P-71': { const p = g.paths()[0]; if (p) view.sxGo('steps', p.cells); break; }
      case 'BOTTLE': x.bottle = 1; break;
      default: return false;
    }
    app.hud.cache = {};
    return true;
  }
}
