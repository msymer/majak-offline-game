// Controller: game loop, player actions, saving, events -> view, interface and sound.
import { Game } from './sim/game.js';
import { View } from './render/scene.js';
import { Input } from './ui/input.js';
import { Hud } from './ui/hud.js';
import { Guide } from './ui/tutorial.js';
import { T, bName, fill } from './data/texts.cs.js';
import { BUILDINGS } from './data/buildings.js';
import { STEP } from './data/rules.js';
import { chapterOf, getWave } from './data/waves.js';
import * as store from './storage.js';
import { audio } from './audio/audio.js';
import { initLayout, applyLayout, layout, localRect } from './ui/layout.js';
import { GAME_VERSION, BUILD } from './version.js';
import { cardById } from './data/cards.js';
import { SPECS, HYBRID_TYPES } from './data/buildings.js';
import { TOTAL_WAVES } from './data/waves.js';
import { SecretUi } from './secrets/ui.js';

const U = T.ui;
const QUALITY_DOWN = { high: 'medium', medium: 'low' };

class App {
  constructor() {
    this.settings = store.loadSettings();
    this.meta = store.loadMeta();
    for (const k of ['seenC', 'seenR', 'seenS', 'journal', 'seenH']) this.meta[k] = this.meta[k] || {};
    this.starT = 0;
    this.speed = this.settings.speed || 1;
    this.paused = true;
    this.playing = false;
    this.gallery = false;
    this.mode = null;
    this.selected = null;
    this.checkpoints = [];
    this.acc = 0;
    this.saveT = 0;
    this.slowT = 0;
    this.lastInput = performance.now();
    this.overlayQueue = [];
    this.fps = { frames: 0, time: 0, sq: 0, low: 0, asked: false };
    this.wallStreak = 0;
    this.waveLeak = false;
    this.floatBudget = 0;
    this.versionText = GAME_VERSION + ' (' + BUILD + ')';
    this.pendingDifficulty = 'normal';
    this.appEl = document.getElementById('app');
    this.canvas = document.getElementById('c');
    initLayout(this.appEl);
    applyLayout(this.settings.orient);
    this.view = new View(this.canvas);
    this.view.setQuality(this.settings.quality);
    this.hud = new Hud(document.getElementById('hud'), this);
    this.guide = new Guide(this);
    this.sx = new SecretUi(this);
    audio.configure(this.settings);
    this.input = new Input(this.canvas, this.view, {
      tap: (cell, p) => this.tapCell(cell, p),
      longPress: (cell) => { if (this.signalHold) return; if (this.sx.holdStart(this.lhPress)) return; this.sendHero(cell); },
      holdMove: (l) => this.sx.holdMove(l),
      pressStart: (p) => this.pressStart(p),
      pressEnd: (p, ms) => this.pressEnd(p, ms),
      doubleTap: (cell, p) => { if (this.view.lighthouseHit(p.x, p.y) || (cell && cell.y >= 19 && Math.abs(cell.x - 9) <= 1)) this.view.resetView(); },
      canDragFrom: (cell) => { const b = this.selectedBuilding(); return !!(b && b.x === cell.x && b.y === cell.y && BUILDINGS[b.type].mergeable); },
      dragStart: () => { this.dragSrc = this.selectedBuilding(); },
      dragMove: (cell) => { this.dragCell = cell; },
      dragEnd: (cell) => { const src = this.dragSrc; this.dragSrc = null; this.dragCell = null; if (src && cell) { const dst = this.game.buildingAt(cell.x, cell.y); if (dst) this.doMerge(src.id, dst.id); } },
      dragCancel: () => { this.dragSrc = null; this.dragCell = null; },
    });
    window.addEventListener('resize', () => this.relayout());
    window.addEventListener('orientationchange', () => setTimeout(() => this.relayout(), 250));
    document.addEventListener('pointerdown', () => { this.lastInput = performance.now(); audio.unlock(); }, true);
    // iOS starts sound only from some kinds of touch events, so try on all of them.
    for (const ev of ['pointerup', 'touchend', 'click']) document.addEventListener(ev, () => audio.unlock(), true);
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      audio.setHidden(document.hidden);
      if (document.hidden) this.pauseAndSave();
      else { this.last = performance.now(); if (this.ctxLost) setTimeout(() => { if (this.ctxLost) location.reload(); }, 1500); }
    });
    window.addEventListener('pagehide', () => this.pauseAndSave());
    // iOS can take the graphics context away while the app sleeps in the background. The position is saved
    // all the time, so the safest way back is to start the page again (it opens paused, where it was).
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ctxLost = true; this.pauseAndSave(); });
    this.canvas.addEventListener('webglcontextrestored', () => { this.save(); location.reload(); });
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    this.boot();
  }

  relayout() {
    applyLayout(this.settings.orient);
    this.view.resize();
    this.hud.cache = {};
  }

  async boot() {
    store.requestPersist();
    const params = new URLSearchParams(location.search);
    const save = await store.loadGame();
    this.checkpoints = (await store.loadCheckpoints()).filter((c) => !c.state.lost);
    if (save) { this.savedState = save.state; this.setGame(Game.fromJSON(save.state)); }
    else this.setGame(Game.newGame(1));
    this.hud.setVisible(false);
    this.registerSW();
    const debug = params.get('debug') === '1';
    if (debug) import('./ui/debug.js').then((m) => m.installDebug(this));
    if (debug && params.get('scena') === 'galerie') { this.startGallery(); return; }
    this.view.setTitle(true, !!this.meta.finished);
    const title = () => this.hud.showTitle(!!this.savedState);
    if (!this.settings.soundAsked) {
      this.hud.askSound((yes) => {
        this.settings.soundAsked = true; this.settings.mute = !yes;
        store.saveSettings(this.settings);
        audio.configure(this.settings); audio.unlock();
        title();
      });
    } else title();
  }

  // Keep the screen on while a wave runs.
  async updateWakeLock() {
    const want = this.playing && !this.paused && this.game?.phase() === 'combat' && !document.hidden;
    if (!('wakeLock' in navigator) || this.wlBusy) return;
    if (want && !this.wakeLock) {
      this.wlBusy = true;
      try { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => { this.wakeLock = null; }); } catch (e) { /* not allowed */ }
      this.wlBusy = false;
    } else if (!want && this.wakeLock) {
      const w = this.wakeLock; this.wakeLock = null;
      try { await w.release(); } catch (e) { /* ignore */ }
    }
  }

  setGame(g) {
    this.game = g;
    this.view.setGame(g);
    this.mode = null; this.selected = null; this.acc = 0; this.slowT = 0;
    this.hud.cache = {};
    this.guide.hide();
  }

  newGame() {
    const g = Game.newGame((Date.now() & 0x7fffffff) || 1, { difficulty: this.pendingDifficulty });
    this.setGame(g);
    this.savedState = g.s;
    this.checkpoints = [store.makeCheckpoint(g.s, 0)];
    store.saveCheckpoints(this.checkpoints);
    if (this.settings.tutorial) this.guide.restart();
    this.sx.newGame();
    this.save();
    this.startPlaying();
    this.hud.intro(1);
  }

  continueGame() {
    this.startPlaying();
    if (this.game.s.lost) this.showLoss();
  }

  startPlaying() {
    this.playing = true;
    this.paused = true;
    this.overlayQueue.length = 0;
    this.view.setTitle(false);
    this.hud.hideOverlay();
    this.hud.setVisible(true);
    this.view.setInsets(this.hud.measure());
    this.view.cam.init = false;
    this.view.updateZoomLimits();
    if (this.game.phase() === 'combat') this.toast(U.pausedHint);
  }

  toTitle() { this.save(); this.playing = false; this.savedState = this.game.s; this.hud.setVisible(false); this.view.setTitle(true, !!this.meta.finished); this.view.epilogue = false; this.hud.showTitle(true); }
  openMenu() { this.paused = true; this.hud.showMenu(); }
  closeMenu() { this.hud.hideOverlay(); }

  // Overlays that come from game events wait for each other (unlock card, end of chapter...).
  queueOverlay(fn) {
    if (this.hud.overlayKind) this.overlayQueue.push(fn); else fn();
  }
  closeOverlay() {
    const kind = this.hud.overlayKind;
    this.hud.hideOverlay();
    if (kind === 'chapter' && this.introNext) { this.hud.intro(this.introNext); this.introNext = 0; }
    const next = this.overlayQueue.shift();
    if (next) next();
  }

  save() { if (this.game && !this.gallery) store.saveGame(this.game.s); }
  saveMeta() { store.saveMeta(this.meta); }
  pauseAndSave() { if (this.playing) this.paused = true; this.save(); }

  toast(m, ms) { this.hud.toast(m, ms); }
  sound(name, v) { audio.play(name, v); }
  uiClick() { audio.play('click'); }

  // ---------- actions ----------
  setSpeed(n) {
    if (n === 0) { this.paused = !this.paused; if (this.paused) this.toast(U.pausedHint, 1600); return; }
    n = this.sx.speedTap(n);
    this.speed = n; this.paused = false;
    if (n > 1) this.guide.flag('speed');
    this.settings.speed = n; store.saveSettings(this.settings);
  }
  toggleAuto() { this.game.setAuto(!this.game.s.auto); this.toast(this.game.s.auto ? U.autoOn : U.autoOff, 1500); this.save(); }
  startWave() {
    const g = this.game;
    if (g.s.finished && !g.s.endless && g.phase() === 'build' && !g.s.pick) { this.startEndless(); return; }
    const r = g.startWave();
    if (r.ok) { this.paused = false; this.save(); }
  }
  startEndless() {
    const r = this.game.startEndless();
    if (!r.ok) return;
    this.toast(U.endlessStart, 4000);
    this.sx.endlessBonus();
    this.hud.cache = {};
    this.save();
  }
  overload() {
    const g = this.game, h = g.s.hero;
    const r = g.heroOverload();
    if (r.ok) { this.save(); return; }
    this.sound('deny');
    if (h.down > 0) this.toast(U.heroDown);
    else if (g.phase() !== 'combat') this.toast(U.abilityCombat);
  }
  toggleHoldFire() { this.game.setHoldFire(!this.game.s.holdFire); this.hud.cache = {}; }
  wormTap() { const r = this.game.wormTap(); if (r.ok) this.sound('heroHit'); }

  // Presses on the lighthouse while the figure walks in the finale: the signal (three long, one short).
  pressStart(p) {
    const f = this.game?.s.fin;
    this.lhPress = !!(this.playing && p && !this.mode && this.view.lighthouseHit(p.x, p.y));
    this.signalHold = !!(this.lhPress && f && f.phase === 3);
    if (this.signalHold) this.view.lampFlash = 0;
  }
  pressEnd(p, ms) {
    if (!this.signalHold) return;
    this.signalHold = false;
    const r = this.game.signalPress(ms / 1000);
    if (r.ok) this.sound(ms >= 420 ? 'unlock' : 'click', 0.7);
  }
  heroButton() {
    if (this.game.s.hero.upOffer && this.mode?.k !== 'hero') { this.paused = true; this.hud.showHeroUp(); return; }
    this.mode = this.mode?.k === 'hero' ? null : { k: 'hero' }; this.selected = null; if (this.mode) this.toast(U.heroGo);
  }
  strike() { const r = this.game.heroStrike(); if (!r.ok) this.sound('deny'); }
  plug() {
    const g = this.game, h = g.s.hero;
    const r = g.heroPlug();
    if (r.ok) { this.save(); return; }
    this.sound('deny');
    if (h.down > 0) this.toast(U.heroDown);
    else if (g.phase() !== 'combat') this.toast(U.abilityCombat);
  }
  chooseUp(id) {
    const r = this.game.chooseUp(id);
    if (!r.ok) return;
    this.sound('unlock');
    this.save();
    if (this.game.s.hero.upOffer) this.hud.showHeroUp(); else this.closeOverlay();
  }
  spellButton(i) {
    const g = this.game, sp = g.s.spells[i];
    if (!sp) return;
    const c = cardById(sp.id);
    this.toast(T.cards[sp.id].name + ': ' + T.cards[sp.id].desc, 2600);
    if (sp.used) { this.toast(U.spellUsed); this.sound('deny'); return; }
    if (g.phase() !== 'combat') { this.toast(U.spellCombat); this.sound('deny'); return; }
    if (c.target) { this.mode = this.mode?.k === 'spell' && this.mode.i === i ? null : { k: 'spell', i }; this.selected = null; if (this.mode) this.toast(U.spellTarget); return; }
    this.castSpell(i);
  }
  castSpell(i, x, y) {
    const r = this.game.castSpell(i, x, y);
    if (!r.ok) { this.toast(U[r.reason] || U.spellNoTarget); this.sound('deny'); return; }
    this.mode = null;
    this.save();
  }
  repairAll() {
    const r = this.game.repairAll();
    if (!r.ok) { this.toast(r.reason === 'noGold' ? U.noGold : U.repairBlocked); this.sound('deny'); return; }
    this.toast(fill(U.repairDone, { n: r.n }) + (r.all ? '' : ' ' + U.repairBlocked), 3000);
    this.save();
  }
  choosePick(id, replace) {
    const g = this.game;
    const r = g.choosePick(id, replace);
    if (!r.ok && r.reason === 'needReplace') { this.hud.showReplaceSpell(id); return; }
    if (!r.ok) return;
    this.sound('card');
    this.seeCard(id, g.s.relics.includes(id), true);
    this.sx.picked(id);
    this.hud.cache = {};
    this.save();
    this.closeOverlay();
  }
  seeCard(id, relic, owned) {
    const m = relic ? this.meta.seenR : this.meta.seenC;
    if (m[id] && !owned) return;
    m[id] = 1;
    this.saveMeta();
  }
  openPage() {
    const g = this.game;
    const r = g.readPage();
    if (!r.ok) return;
    this.meta.journal[r.n] = r.n === 10 && g.s.sec.torn && !g.s.sec.letter ? 2 : 1; this.saveMeta();
    this.sound('paper');
    this.paused = true;
    this.save();
    this.queueOverlay(() => this.hud.showPage(r.n, () => this.closeOverlay()));
  }
  sendHero(cell) {
    if (!cell || !this.playing) return;
    if (this.game.s.hero.swallowT > 0) { this.wormTap(); return; }
    const r = this.game.heroMove(cell.x, cell.y);
    if (!r.ok) { this.toast(U[r.reason] || U.heroCantGo); this.sound('deny'); } else { this.guide.flag('heroMoved'); this.sound('click'); this.save(); }
  }

  selectBuildType(type) {
    if (this.mode?.k === 'build' && this.mode.type === type) { this.cancelMode(); return; }
    this.mode = { k: 'build', type, ghost: null };
    this.selected = null;
    this.toast(T.buildHints[type] || bName(type));
  }
  cancelMode() { this.mode = null; }
  clearSelection() { this.selected = null; this.sellArm = null; if (this.mode?.k === 'merge') this.mode = null; }
  selectedBuilding() { return this.selected?.k === 'b' ? this.game.byId.get(this.selected.id) : null; }

  buildFailed(reason, ghost) {
    this.toast(U[reason] || U.cantBuildHere);
    this.sound('deny');
    if (ghost) ghost.shakeT = 0.3;
    if (reason === 'blocked') this.guide.flag('blocked');
  }

  tapCell(cell, p) {
    const g = this.game;
    if (!this.playing) return;
    if (g.s.hero.swallowT > 0) { this.wormTap(); return; }
    if (g.s.fin && g.s.fin.phase >= 3) return;
    if (this.sx.tapWorld(cell, p)) return;
    const m = this.mode;
    // things lying on the map (a wreck, a chip, a letter)
    if (!m && cell) {
      const it = g.s.items.find((x) => Math.hypot(x.x - cell.fx, x.y - cell.fy) < 0.9);
      if (it) { const r = g.pickItem(it.id); if (r.ok && r.page) this.openPage(); this.save(); return; }
    }
    // Hugo on the bench after the end
    if (!m && p && g.s.finished && this.hugoHit(p)) { const L = T.secret.hugoLines; this.sx.note('hugo'); this.hud.showQuip(L[(this.hugoI = ((this.hugoI ?? -1) + 1) % L.length)], 4200); return; }
    // The lighthouse hides a few cells behind it. Without a tool in hand, a tap on its picture means the lighthouse.
    if (!m && p && this.view.lighthouseHit(p.x, p.y)) { this.sellArm = null; this.selected = { k: 'cell', x: 9, y: 20 }; return; }
    if (!cell) return;
    if (m?.k === 'build') {
      const gh = m.ghost;
      if (gh && gh.x === cell.x && gh.y === cell.y) {
        const r = g.build(m.type, cell.x, cell.y);
        if (r.ok) { this.save(); m.ghost = null; } else this.buildFailed(r.reason, gh);
      } else {
        m.ghost = { x: cell.x, y: cell.y, type: m.type, shakeT: 0 };
        const r = g.canBuild(m.type, cell.x, cell.y);
        if (!r.ok) this.buildFailed(r.reason, m.ghost); else { this.toast(U.tapAgain, 1200); this.sound('click'); }
      }
      return;
    }
    if (m?.k === 'hero') { this.mode = null; this.sendHero(cell); return; }
    if (m?.k === 'spell') { this.castSpell(m.i, cell.fx, cell.fy); return; }
    // the journal page lying on the island
    if (this.game.s.pages.length && Math.abs(cell.x - 10) <= 1 && cell.y >= 18 && cell.y <= 19 && !g.buildingAt(cell.x, cell.y)) { this.openPage(); return; }
    if (m?.k === 'merge') {
      const dst = g.buildingAt(cell.x, cell.y);
      const src = this.selectedBuilding();
      this.mode = null;
      if (src && dst) { this.doMerge(src.id, dst.id); return; }
    }
    this.sellArm = null;
    const b = g.buildingAt(cell.x, cell.y);
    if (b) { this.selected = { k: 'b', id: b.id }; this.sound('click'); return; }
    let best = null, bd = 0.7;
    for (const e of g.s.enemies) { const d = Math.hypot(e.x - cell.fx, e.y - cell.fy); if (d < bd) { bd = d; best = e; } }
    if (best) { this.selected = { k: 'e', id: best.id }; return; }
    if (this.selected?.k === 'cell' && this.selected.x === cell.x && this.selected.y === cell.y) { this.selected = null; return; }
    this.selected = { k: 'cell', x: cell.x, y: cell.y };
  }

  doMerge(srcId, dstId, spec) {
    if (srcId === dstId) return;
    const g = this.game;
    const r = g.merge(srcId, dstId, spec);
    if (r.ok) {
      this.selected = { k: 'b', id: dstId }; this.save();
      const b = g.byId.get(dstId);
      if (b && b.spec) { this.meta.seenS[SPECS[b.type][b.spec].id] = 1; this.saveMeta(); }
      if (r.hybrid) {
        if (!this.meta.seenH[r.hybrid]) { this.hud.banner(fill(U.hybridNew, { 'název': bName(r.hybrid) }), T.buildings[r.hybrid].desc, 3600); this.sound('unlock'); }
        this.meta.seenH[r.hybrid] = 1; this.saveMeta();
      }
      return;
    }
    if (r.reason === 'needSpec') { this.mode = null; this.hud.showSpec(g.byId.get(srcId), g.byId.get(dstId)); return; }
    this.toast(r.reason === 'maxLevel' ? U.maxLevel : r.reason === 'wrecked' ? U.wrecked2 : g.s.completedCount >= 60 ? U.cantMerge2 : U.cantMerge); this.sound('deny');
  }
  mergeButton() { this.mode = this.mode?.k === 'merge' ? null : { k: 'merge' }; }
  cycleTargeting() { const b = this.selectedBuilding(); if (b) { this.game.setTargeting(b.id); this.guide.flag('targeted'); this.save(); } }
  sellButton() {
    const b = this.selectedBuilding();
    if (!b) return;
    if (this.sellArm !== b.id) { this.sellArm = b.id; return; }
    if (b.level >= 2 && BUILDINGS[b.type].tower) this.guide.quip('sellStrong');
    this.game.sell(b.id); this.sellArm = null; this.selected = null; this.save();
  }
  undo() { const r = this.game.undo(); if (!r.ok && r.reason) this.toast(U[r.reason]); else this.save(); }

  async restoreCheckpoint(cp) {
    if (!cp) return;
    const g = Game.fromJSON(JSON.parse(JSON.stringify(cp.state)));
    g.reseed(Date.now() & 0xffff);
    this.setGame(g);
    const i = this.checkpoints.indexOf(cp);
    if (i >= 0) { this.checkpoints = this.checkpoints.slice(0, i + 1); store.saveCheckpoints(this.checkpoints); }
    this.save();
    this.startPlaying();
    this.toast(fill(U.checkpointBack, { vlna: g.s.nextWave }), 3600);
    this.sx.afterRestore();
  }

  changeSetting(key, v) {
    const st = this.settings;
    switch (key) {
      case 'difficulty': if (this.game) this.game.setDifficulty(v); this.pendingDifficulty = v; this.save(); return;
      case 'quality': st.quality = v; this.view.setQuality(v); this.fps.low = 0; break;
      case 'saver': st.saver = v === 'on'; break;
      case 'shake': st.shake = v === 'on'; break;
      case 'tips': st.tips = v === 'on'; this.hud.cache = {}; break;
      case 'tutorial': st.tutorial = v === 'on'; if (!st.tutorial) this.guide.hide(); break;
      case 'orient': st.orient = v; this.relayout(); break;
      case 'music': st.music = +v; audio.configure(st); audio.unlock(); return; // saved when the slider is released
      case 'sfx': st.sfx = +v; audio.configure(st); audio.unlock(); return;
      case 'mute': st.mute = v === 'on'; st.soundAsked = true; audio.configure(st); audio.unlock(); break;
    }
    store.saveSettings(st);
  }
  settingDone(key) { store.saveSettings(this.settings); if (key === 'sfx') this.sound('coin'); }
  restartTutorial() { this.settings.tutorial = true; store.saveSettings(this.settings); this.guide.restart(); }

  async exportBackup() { return store.exportBackup(this.game.s, this.checkpoints, this.meta); }
  importBackup(text) {
    try {
      const data = store.importBackup(text);
      this.checkpoints = data.checkpoints; store.saveCheckpoints(this.checkpoints);
      if (data.meta) { Object.assign(this.meta, data.meta); this.saveMeta(); }
      this.setGame(Game.fromJSON(data.current.state)); this.save();
      this.savedState = this.game.s;
      this.toast(U.backupDone); this.startPlaying();
    } catch (e) { this.toast(U.backupBad); this.sound('deny'); }
  }

  registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (new URLSearchParams(location.search).get('nosw') === '1') {
      // Development only: run without the offline cache.
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      self.caches?.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      return;
    }
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const check = () => { if (reg.waiting && navigator.serviceWorker.controller) { this.hud.showUpdate(true); this.toast(U.updateReady, 4000); } };
      check();
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', check));
      this.swReg = reg;
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (this.updating) location.reload(); });
  }
  applyUpdate() { this.save(); this.updating = true; this.swReg?.waiting?.postMessage('skipWaiting'); }

  showLoss() {
    const g = this.game;
    const top = Object.entries(g.s.stats.leaks).map(([k, light]) => { const [entry, type] = k.split('|'); return { entry, type, light }; }).sort((a, b) => b.light - a.light).slice(0, 3);
    this.hud.showLoss({ top });
  }

  // Upright layout: the selection panel covers the lower part of the map, so the view moves a little
  // to keep the selected thing visible, and returns when the selection is closed.
  keepSelectionVisible() {
    const sel = this.selected;
    if (!sel || layout.land) { if (this.nudgeSel) { this.nudgeSel = null; this.view.unnudge(); } return; }
    if (sel === this.nudgeSel) return;
    const panel = this.hud.selEl;
    if (panel.classList.contains('hidden')) return;
    this.nudgeSel = sel;
    let x, y;
    if (sel.k === 'b') { const b = this.game.byId.get(sel.id); if (!b) return; x = b.x + 0.5; y = b.y + 0.5; }
    else if (sel.k === 'e') { const e = this.game.findEnemy(sel.id); if (!e) return; x = e.x; y = e.y; }
    else { x = sel.x + 0.5; y = sel.y + 0.5; }
    const p = this.view.toScreen(x, y, 0), top = localRect(panel).top - 44;
    if (p.y > top) this.view.nudge(p.y - top);
  }

  // Cells that the tall lighthouse covers on screen.
  behindLighthouse(sel) {
    if (!sel) return false;
    let x = sel.x, y = sel.y;
    if (sel.k === 'b') { const b = this.game.byId.get(sel.id); if (!b) return false; x = b.x; y = b.y; }
    else if (sel.k !== 'cell') return false;
    return Math.abs(x - 9) <= 1 && y >= 16 && y <= 19;
  }

  see(kind, type) {
    const m = kind === 'e' ? this.meta.seenE : this.meta.seenB;
    if (m[type]) return;
    m[type] = 1;
    this.saveMeta();
  }

  // ---------- events ----------
  handleEvents(events) {
    if (!events.length) return;
    const g = this.game, hud = this.hud, guide = this.guide;
    const speed = this.paused ? 1 : this.speed;
    audio.setSpeed(speed);
    this.view.onEvents(events, speed);
    this.floatBudget = 3;
    for (const e of events) {
      this.sx.onEvent(e);
      switch (e.k) {
        case 'waveStart': {
          this.save();
          this.sound('waveStart');
          this.waveLeak = false;
          const w = getWave(e.n);
          if (w) for (const segs of Object.values(w.groups)) for (const s of segs) this.see('e', s.golden ? 'golden' : s.type);
          if (e.chapterStart && e.n > 1) guide.quip('chapterStart', 0.8);
          else if (chapterOf(e.n) >= 5 && !e.boss) guide.quip('night', 0.15);
          if (e.called) guide.quip('callWave');
          else if (!e.boss) { const len = g.paths().reduce((m, p) => Math.max(m, p.cells.length), 0); guide.quip(len > 38 ? 'longMaze' : 'waveStart', 0.6); }
          break;
        }
        case 'bossSpawn': {
          const b = T.bosses[e.type];
          if (b) hud.banner(b.name, b.line, 3400, true);
          this.view.focusOn(e.x, e.y);
          this.slowT = 2;
          this.sound('boss');
          this.see('e', e.type);
          guide.quip('boss');
          break;
        }
        case 'shot': if (e.type !== 'lightning') this.sound(e.type === 'cannon' ? 'cannon' : 'shot'); break;
        case 'zap': this.sound('zap', e.big ? 1.4 : 1); break;
        case 'trap': this.sound('trap'); break;
        case 'teleport': this.sound('teleport'); break;
        case 'wreck':
          this.sound('wreck');
          if (!this.meta.wreckSeen) { this.meta.wreckSeen = 1; this.saveMeta(); this.toast(U.wreckFirst, 3600); }
          guide.flag('wreck'); guide.quip('wreck', 0.5);
          break;
        case 'repair': this.sound('repair'); guide.quip('repair', 0.4); break;
        case 'resist': this.sound('plug', 0.5); break;
        case 'steal': {
          this.sound('steal');
          const p = this.view.toScreen(e.mx + 0.5, e.my + 0.5, 0.6);
          if (p.visible) hud.floatText(p.x, p.y, '−' + e.gold, 'bad');
          guide.quip('steal', 0.5);
          break;
        }
        case 'rockBreak': hud.banner(U.rockBreak, '', 2600); this.sound('wreck', 1.5); break;
        case 'refund': if (!e.quiet) this.toast(fill(U.refund, { gold: e.gold }), 4200); break;
        case 'secondBreath': hud.banner(U.secondBreath, '', 2600); this.sound('heroUp'); break;
        case 'spell': this.sound('spell'); guide.quip('spell', 0.4); break;
        case 'plug': this.sound('plug'); guide.quip('plug', 0.5); break;
        case 'levelUp': this.sound('unlock', 0.6); guide.flag('levelUp'); guide.quip('levelUp', 0.4); break;
        case 'pick': this.queueOverlay(() => { if (g.s.pick) { hud.showPick(); this.sound('card'); } else this.closeOverlay(); }); break;
        case 'page': guide.flag('page'); break;
        case 'secret': this.view.secretEvent(e); this.secretUi(e); break;
        case 'pulse': this.sound('frost'); break;
        case 'explode': this.sound('explode'); break;
        case 'hit': this.sound('hit'); break;
        case 'heroHit': this.sound('heroHit'); break;
        case 'strike': this.sound('strike'); guide.quip('strike', 0.5); break;
        case 'death': {
          this.sound('death');
          this.see('e', e.type);
          if (e.golden) { this.sound('gold'); guide.quip('goldenCaught'); }
          if (speed <= 2 && this.floatBudget > 0) {
            const p = this.view.toScreen(e.x, e.y, 0.7);
            if (p.visible) {
              this.floatBudget--;
              hud.floatText(p.x, p.y, '+' + e.gold, e.golden || e.boss ? 'big' : '');
              if (e.golden || e.boss) { for (let i = 0; i < 4; i++) hud.flyCoin(p.x, p.y, i * 70); this.sound('coin'); }
              else if (Math.random() < 0.35) { hud.flyCoin(p.x, p.y); this.sound('coin', 0.6); }
            }
          }
          break;
        }
        case 'leak':
          this.see('e', e.type);
          if (e.light > 0) { hud.flashEdge(); this.sound('leak'); this.waveLeak = true; guide.quip(g.s.light < 30 ? 'lowLight' : 'leak'); }
          else if (e.golden) guide.quip('goldenEscaped');
          break;
        case 'build': {
          this.sound('build');
          this.see('b', e.type);
          if (e.type === 'wall') { if (++this.wallStreak >= 5) { if (guide.quip('manyWalls')) this.wallStreak = 0; } } else this.wallStreak = 0;
          if (e.type === 'mine') guide.quip('mine', 0.6);
          else if (e.type === 'frost') guide.quip('frost', 0.3);
          else if (e.type === 'cannon') guide.quip('cannon', 0.3);
          else if (e.type === 'archer' && g.s.buildings.length === 1) guide.quip('firstTower');
          break;
        }
        case 'merge': {
          this.sound('merge');
          guide.flag('merged');
          guide.quip(this.meta.merged ? 'merge' : 'firstMerge', this.meta.merged ? 0.5 : 1);
          if (!this.meta.merged) { this.meta.merged = 1; this.saveMeta(); }
          break;
        }
        case 'sell': {
          this.sound('sell');
          const p = this.view.toScreen(e.x + 0.5, e.y + 0.5, 0.4);
          if (p.visible) { hud.floatText(p.x, p.y, '+' + e.gold, 'big'); for (let i = 0; i < 3; i++) hud.flyCoin(p.x, p.y, 150 + i * 80); }
          break;
        }
        case 'undo': guide.quip('undo', 0.4); break;
        case 'waveEnd': {
          hud.toast(`${fill(U.waveDone, { n: e.n })}: +${e.reward} ${U.reward}${e.mines ? `, +${e.mines} ${U.mines}` : ''}${e.interest ? `, +${e.interest} ${U.interest}` : ''}`, 3400);
          const a = hud.goldAnchor();
          hud.floatText(a.x, a.y + 14, '+' + (e.reward + e.mines + e.interest), 'big');
          this.sound('waveEnd');
          for (const t of e.unlocks) this.queueOverlay(() => { hud.showUnlock(t); this.sound('unlock'); if (t.kind === 'building') this.see('b', t.id); });
          if (e.hope) hud.floatText(a.x - 60, a.y + 14, '+' + e.hope, 'big');
          if (!this.waveLeak && e.n % 10 !== 0) guide.quip('noLeak', 0.7);
          this.save();
          break;
        }
        case 'bossDefeated': hud.banner(U.bossDefeated, U.bossDefeatedSub, 2800); this.sound('bossDown'); guide.quip('afterBoss'); break;
        case 'checkpoint':
          if (g.s.lost) break;
          this.checkpoints.push(store.makeCheckpoint(g.s, e.n)); store.saveCheckpoints(this.checkpoints);
          this.toast(U.checkpointMade); this.sound('checkpoint');
          break;
        case 'chapterDone':
          if (!e.contentEnd) this.introNext = e.chapter + 1;
          this.queueOverlay(() => { hud.showChapterEnd(e); this.sound('chapter'); });
          break;
        case 'heroDown': this.toast(T.hero.down); this.sound('heroDown'); guide.quip('heroDown'); break;
        case 'heroUp': this.sound('heroUp'); guide.quip('heroUp'); break;
        case 'lost': this.paused = true; this.save(); this.overlayQueue.length = 0; if (!this.sx.shortLoss()) this.showLoss(); this.sound('lose'); break;
        default: this.lateEvent(e, hud, guide, g);
      }
    }
  }

  // Is this point of the screen on Hugo sitting on the bench?
  hugoHit(p) {
    const v = this.view;
    const q = v.toScreen(9.5 + 1.25 + 0.08, 20.5 + 0.64, 0.5);
    const pxPerUnit = v.vh / (2 * v.cam.d * Math.tan(28 * Math.PI / 360));
    return q.visible && Math.hypot(p.x - q.x, p.y - q.y) < Math.max(26, 0.55 * pxPerUnit);
  }

  // Events of chapters 6–10 (map changes, new enemies, the end).
  lateEvent(e, hud, guide, g) {
    switch (e.k) {
      case 'overload': this.sound('heroUp'); break;
      case 'sling': this.sound('zap', 0.7); break;
      case 'hatch': this.sound('death', 0.7); break;
      case 'burst': this.sound('explode', 0.8); break;
      case 'dive': case 'emerge': this.sound('wreck', 0.6); break;
      case 'adapt': this.sound('unlock', 0.35); break;
      case 'rail': this.sound('zap', 1.2); break;
      case 'learn': hud.toast(fill(U.learned, { typ: U.dtypeNames[e.res] }), 2600); break;
      case 'mapEvent': {
        const t = e.kind === 'collapse' ? U.collapse : e.kind === 'holes' ? U.holesOpen : U.mistCloses;
        hud.banner(t, e.kind === 'mist' && e.gold ? fill(U.mistRefund, { gold: e.gold }) : '', 3400);
        this.sound('wreck', 1.4);
        break;
      }
      case 'item':
        if (e.kind === 'wreck') hud.toast(T.secret.wreckFound, 4200);
        if (e.kind === 'chip') hud.toast(T.secret.chip, 4200);
        break;
      case 'pickItem': this.sound('paper'); break;
      case 'record':
        if (!this.meta.endlessBest || e.n > this.meta.endlessBest) { this.meta.endlessBest = e.n; this.saveMeta(); }
        hud.toast(fill(U.endlessNew, { n: e.n }), 2400);
        break;
      case 'endless': this.hud.cache = {}; break;
      case 'gameWon': this.gameWon(e); break;
    }
  }

  // The interface side of the secret moments.
  secretUi(e) {
    const hud = this.hud, S = T.secret;
    if (e.star) this.starT = Math.max(this.starT, e.star);
    switch (e.code) {
      case 'P-63':
        if (e.what === 'spawn') { hud.showQuip(S.carries, 5000); this.hud.cache = {}; }
        if (e.what === 'arrived') { this.sound('chapter'); hud.toast(T.cardKinds.relic + ': ' + S.letter, 3600); }
        if (e.what === 'torn') hud.showQuip(S.shouldnt, 4200);
        break;
      case 'P-60':
        if (e.what === 'swallow') { hud.banner(S.swallowed, S.inside, 2600); this.sound('boss'); }
        if (e.what === 'spat') { hud.toast(S.spat, 2400); this.sound('explode'); this.starT = 0; }
        break;
      case 'P-61':
        if (e.what === 'spawn') { hud.banner(S.darkKnot, '', 2600); this.sound('boss', 0.7); }
        else this.sound('heroUp');
        break;
      case 'P-46': this.sound('heroUp'); break;
      case 'P-57': this.sound('strike', 0.6); break;
      case 'FIN':
        if (e.what === 'calm') { this.sound('chapter', 0.5); this.mode = null; this.selected = null; }
        if (e.what === 'hugo') hud.showQuip(S.hugo, 5000);
        if (e.what === 'hint' && e.n === 1) hud.showQuip(S.hint1, 5000);
        if (e.what === 'hint' && e.n === 2) hud.showQuip(S.hint2, 5000);
        if (e.what === 'knotSignals') hud.toast(S.knotSignals, 4200);
        if (e.what === 'signal') this.sound('chapter');
        if (e.what === 'met') this.sound('waveEnd');
        break;
    }
  }

  // The end: epilogue, credits, then back to the title in the dawn.
  gameWon(e) {
    this.paused = true;
    this.meta.finished = 1;
    this.saveMeta();
    this.save();
    this.overlayQueue.length = 0;
    this.view.epilogue = true;
    this.hud.setVisible(false);
    const byKnot = !!e.byKnot;
    this.hud.showEpilogue(byKnot, () => this.sx.showCredits(() => {
      this.hud.hideOverlay();
      this.view.epilogue = false;
      this.toTitle();
      this.toast(T.secret.afterEnd + ' ' + T.secret.codexMore, 6000);
    }));
  }

  // Notices long-lasting low frame rate and offers a lower quality.
  watchFps(rawDt) {
    const f = this.fps;
    if (!this.playing || this.paused || this.settings.saver || document.hidden || this.hud.overlayKind) { f.frames = 0; f.time = 0; f.sq = 0; return; }
    f.frames++; f.time += rawDt; f.sq += rawDt * rawDt;
    if (f.time < 4) return;
    const fps = f.frames / f.time;
    const mean = f.time / f.frames, jitter = Math.sqrt(Math.max(0, f.sq / f.frames - mean * mean));
    f.frames = 0; f.time = 0; f.sq = 0;
    // A steady 30 frames means the phone itself limits the rate (low power mode), not that the game is too heavy.
    const capped = fps > 27.5 && fps < 32 && jitter < 0.005;
    f.low = fps < 40 && !capped ? f.low + 1 : 0;
    const lower = QUALITY_DOWN[this.settings.quality];
    if (f.low >= 3 && lower && !f.asked) {
      f.asked = true;
      this.hud.prompt(U.lowFps, () => { this.changeSetting('quality', lower); this.toast(U.lowered, 3000); f.asked = false; f.low = 0; }, null);
    }
  }

  // ---------- gallery (debug): every object of the chapter next to each other ----------
  startGallery() {
    const g = Game.newGame(7);
    g.sectorOpen = () => true;
    g.rebuild();
    const s = g.s;
    let id = 1000;
    const put = (type, x, y, level) => s.buildings.push({ id: id++, type, x, y, level, paid: 0, cd: 0, mode: 'first', dmg: 0, aim: Math.PI / 2 });
    for (let l = 1; l <= 4; l++) { put('frost', 4 + l, 12, l); put('archer', 4 + l, 16, l); put('cannon', 4 + l, 18, l); }
    put('mine', 5, 19, 1); put('mine', 6, 19, 2); put('mine', 10, 18, 3); put('mine', 11, 18, 4);
    for (const [x, y] of [[10, 12], [11, 12], [12, 12], [12, 13]]) put('wall', x, y, 1);
    put('archer', 12, 15, 1); put('cannon', 13, 16, 1); put('archer', 4, 9, 1); put('archer', 3, 1, 2); put('mine', 2, 15, 1);
    g.rebuild();
    const foe = (type, x, y, o = {}) => s.enemies.push({ id: id++, type, w: 1, ent: 'S', x, y, px: x, py: y, vx: 0, vy: 0.02, cx: Math.floor(x), cy: Math.floor(y), nx: Math.floor(x), ny: Math.floor(y), dir: 2, hp: o.hp ?? 100, mhp: 100, spd: 1, armor: 0, gold: 4, light: 5, slowT: o.slow ? 9 : 0, slowF: 0.4, stunT: 0, fly: false, boss: !!o.boss, part: false, golden: !!o.golden, fam: 0, root: 0, dead: false, seed: (id * 0.37) % 1 });
    foe('sliz', 9.5, 13.5); foe('sliz', 10.5, 13.5, { hp: 55 }); foe('sliz', 11.5, 13.5, { golden: true });
    foe('smejdil', 9.5, 14.6); foe('smejdil', 10.3, 14.6, { slow: true });
    foe('tlustoch', 11.4, 14.7); foe('maly_sliz', 9.4, 15.6); foe('stredni_sliz', 12.4, 17.4);
    foe('velky_sliz', 10.7, 16.6, { boss: true, hp: 70 });
    // chapters 2–5: buildings in the ruins, enemies in the ruins and at the gate
    const b2 = (type, x, y, level = 1, spec, wreck) => { put(type, x, y, level); const b = s.buildings[s.buildings.length - 1]; if (spec) b.spec = spec; if (wreck) b.wreck = true; };
    for (let l = 1; l <= 4; l++) b2('lightning', 4 + l, 9, l);
    b2('amplifier', 10, 9); b2('trap', 11, 9); b2('teleport', 12, 9); b2('archer', 13, 9, 2, null, true); b2('wall', 15, 9, 1, null, true);
    b2('archer', 16, 9, 3, 'A'); b2('archer', 17, 9, 3, 'B');
    b2('cannon', 2, 7, 3, 'A'); b2('cannon', 5, 7, 3, 'B'); b2('frost', 8, 7, 3, 'A'); b2('frost', 9, 7, 3, 'B'); b2('lightning', 10, 7, 3, 'A'); b2('lightning', 12, 7, 3, 'B');
    g.rebuild();
    const row = ['plechac', 'sberac', 'felcar', 'pulec', 'bahnak', 'bourac', 'demolicni_koule', 'mlzak', 'maly_valec', 'bahenni_dcera', 'beranek', 'sliz'];
    row.forEach((t, i) => foe(t, 4.5 + (i % 6) * 1.7, 5.5 + Math.floor(i / 6) * 0.9 - 0.4));
    foe('dron', 15.5, 5.5); s.enemies[s.enemies.length - 1].fly = true;
    const hid = foe('mlzak', 3.5, 6.5); void hid;
    foe('valec', 3.5, 2.5, { boss: true }); foe('bahenni_matka', 7, 2.4, { boss: true }); foe('beranidlo', 12, 2.4, { boss: true });
    for (const en of s.enemies) en.vis = true;
    s.enemies[s.enemies.length - 4].vis = false;
    // ?debug=1&scena=galerie&dil=2: chapters 6–10 on the meadow (hybrids, the bank, level 4, the new enemies)
    if (location.search.includes('dil=2')) {
      s.enemies = s.enemies.filter((e) => e.y < 11);
      s.buildings = s.buildings.filter((b) => b.y < 11);
      HYBRID_TYPES.forEach((t, i) => { put(t, 5 + i, 12, 2); put(t, 5 + i, 18, 4); });
      put('bank', 12, 12, 1); put('archer', 12, 18, 4); s.buildings[s.buildings.length - 1].spec = 'A';
      g.rebuild();
      const late = ['rojik', 'nosic', 'vejce', 'princezna', 'rusicka', 'balista', 'vuz', 'tunelar', 'krtek', 'ucen', 'ucen', 'tovarys', 'posel', 'cervik'];
      const last = () => s.enemies[s.enemies.length - 1];
      late.forEach((t, i) => { foe(t, 5.5 + (i % 7) * 1.2, 13.6 + Math.floor(i / 7) * 1.1); const e = last(); if (t === 'ucen') e.res = [i % 2 ? 'blesk' : 'mraz']; if (t === 'tovarys') e.res = ['vybuch']; });
      foe('ucen_dron', 12.5, 14.5); const dr = last(); dr.fly = true; dr.res = ['strela'];
      foe('kralovna_roje', 6, 16.6, { boss: true }); foe('oblehaci_vez', 8.4, 16.6, { boss: true }); foe('hlubinny_cerv', 10.6, 16.6, { boss: true }); foe('mistr', 12.8, 16.6, { boss: true });
      s.enemies[s.enemies.length - 1].res = ['mraz'];
      for (const en of s.enemies) en.vis = true;
    }
    s.hero.x = s.hero.px = 9.5; s.hero.y = s.hero.py = 18.5; s.hero.face = Math.PI / 2;
    this.gallery = true;
    this.playing = false;
    this.setGame(g);
    this.hud.hideOverlay();
    this.hud.setVisible(false);
    this.view.setTitle(false);
    const cam = this.view.cam;
    cam.follow = false; cam.goal = null; cam.tx = 0.3; cam.tz = location.search.includes('sever') ? -4.5 : 5.6; cam.d = Math.min(cam.maxD, layout.land ? 24 : 34);
    this.hud.showGalleryBar((m) => { this.moodOverride = m; }, (q) => this.changeSetting('quality', q));
  }

  // ---------- loop ----------
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const raw = (now - this.last) / 1000;
    if (this.settings.saver && raw < 1 / 32) return;
    const dt = Math.min(0.1, raw);
    this.last = now;
    const g = this.game;
    if (!g || this.ctxLost) return;
    if (this.playing && !this.paused && !g.s.lost && !this.hud.overlayKind && !(this.sx.freezeT > 0)) {
      let sp = this.speed;
      if (this.slowT > 0) { this.slowT -= dt; sp = Math.min(sp, 0.3); }
      if (this.starT > 0) { this.starT -= dt; sp = Math.min(sp, 1); }
      if (g.s.fin && g.s.fin.phase >= 3) sp = Math.min(sp, 1);
      this.acc += dt * sp;
      let n = 0;
      const cap = sp > 8 ? 32 : 16;
      while (this.acc >= STEP && n < cap) { g.step(); this.acc -= STEP; n++; }
      if (n >= cap) this.acc = 0;
      g.s.playTime += dt;
      if (g.phase() === 'combat') { this.saveT += dt; if (this.saveT > 5) { this.saveT = 0; this.save(); } }
    }
    this.handleEvents(g.drainEvents());
    if (this.playing && !this.gallery && g.s.pick && !g.s.lost && !this.hud.overlayKind && !this.overlayQueue.length) this.hud.showPick();
    if (this.playing && g.s.fin && g.s.fin.phase >= 3 && this.mode) this.mode = null;
    const m = this.mode;
    let ghost = null, previewPaths = null, previewOk = true;
    if (m?.k === 'build' && m.ghost) {
      const r = g.canBuild(m.type, m.ghost.x, m.ghost.y);
      m.ghost.shakeT = Math.max(0, (m.ghost.shakeT || 0) - dt);
      const st = BUILDINGS[m.type].tower ? g.towerStats({ type: m.type, level: 1, x: m.ghost.x, y: m.ghost.y }) : null;
      ghost = { ...m.ghost, ok: r.ok, range: st?.range };
      previewOk = r.ok || r.reason === 'noGold';
      if (BUILDINGS[m.type].blocks && r.reason !== 'cantBuildHere') previewPaths = g.paths(m.ghost.x + m.ghost.y * 19);
    }
    const sb = this.selectedBuilding();
    const ui = {
      paths: this.gallery ? null : g.paths(), previewPaths, previewOk, ghost,
      waveEntries: g.waveEntries(g.s.nextWave),
      selected: sb ? { x: sb.x, y: sb.y, range: g.towerStats(sb)?.range } : (this.selected?.k === 'cell' ? { x: this.selected.x, y: this.selected.y } : null),
      selectedEnemy: this.selected?.k === 'e' ? this.selected.id : null,
      partners: (m?.k === 'merge' || this.dragSrc) && sb ? g.mergePartners(sb) : null,
      dragCell: this.dragCell, dragOk: !!(this.dragCell && sb && g.canMerge(sb, g.buildingAt(this.dragCell.x, this.dragCell.y)).ok),
      heroMode: m?.k === 'hero', shake: this.settings.shake, spellMode: m?.k === 'spell',
      fadeLH: !!m || this.behindLighthouse(this.selected) || !!this.dragSrc,
      speed: this.paused ? 1 : this.speed,
      chapter: this.moodOverride || chapterOf(g.currentWaveNumber()),
    };
    if (this.playing) this.view.setInsets(this.hud.measure());
    if ((this.wlT = (this.wlT || 0) + dt) > 1) { this.wlT = 0; this.updateWakeLock(); }
    const quiet = g.s.fin && g.s.fin.phase === 3 && this.playing;
    this.sx.update(dt);
    audio.setMusic(this.musicOverride ? this.musicOverride : this.gallery || quiet ? 0 : this.view.epilogue || (this.view.titleDawn && !this.playing) ? 1 : ui.chapter);
    this.view.frame(this.acc / STEP, dt, ui);
    if (this.playing) {
      this.hud.update();
      this.keepSelectionVisible();
      this.guide.update(dt);
      this.hud.placeQuip(this.view.toScreen(g.s.hero.x, g.s.hero.y, 1.15));
    }
    this.watchFps(raw);
  }
}

window.app = new App();
