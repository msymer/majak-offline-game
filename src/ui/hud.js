// HTML interface over the canvas. Reads the controller/game, sends player actions to the controller.
import { ICONS, enemyIcon } from './icons.js';
import { T, bName, eName, fill } from '../data/texts.cs.js';
import { BUILDINGS, BUILD_ORDER } from '../data/buildings.js';
import { CONTENT_MAX_WAVE, TOTAL_WAVES, chapterOf, getWave } from '../data/waves.js';
import { tileAt } from '../sim/grid.js';
import { HERO } from '../data/rules.js';
import { layout, localRect } from './layout.js';
import { screens } from './screens.js';
import { $, el, fmt, num } from './dom.js';

const U = T.ui;

export class Hud {
  constructor(root, ctrl) {
    this.root = root;
    this.c = ctrl;
    this.cache = {};
    this.build();
  }

  build() {
    const r = this.root;
    r.innerHTML = `
      <div id="vignette"></div>
      <div id="top">
        <button class="pill" id="pLight"><div class="ic">${ICONS.light}</div><div class="num" id="nLight">100</div><div class="barwrap"><div class="bar"></div></div></button>
        <button class="pill" id="pGold"><div class="ic">${ICONS.gold}</div><div class="txt"><div class="num" id="nGold">0</div><div class="sub" id="nInt"></div></div></button>
        <button class="pill" id="pWave"><div class="num" id="nWave"></div><div class="sub" id="nChapter"></div></button>
        <button class="pill" id="btnMenu" aria-label="${U.menu}">${ICONS.menu}</button>
      </div>
      <div id="bossBar" class="hidden"><div class="bn"></div><div class="bw"><i></i></div></div>
      <div id="floaters"></div>
      <div id="toast"></div>
      <div id="banner" class="panel"><div class="bt"></div><div class="bs"></div></div>
      <div id="intro"><div class="in"></div><div class="it"></div></div>
      <button id="updateBtn" class="btn primary hidden">${U.update}</button>
      <div id="quip" class="bubble"></div>
      <div id="tut" class="bubble hidden"><div class="face">${ICONS.knot}</div><div class="body"><div class="tx"></div><div class="row"><button class="link" id="tutSkip">${T.tutorial.skip}</button><button class="btn primary small" id="tutNext"></button></div></div></div>
      <div id="heroBox" class="panel">
        <button id="btnOver" class="ability hidden" aria-label="${T.hero.overload}">${ICONS.overload}<div class="cd"></div><div class="cdt"></div></button>
        <button id="btnPlug" class="ability hidden" aria-label="${T.hero.plug}">${ICONS.plug}<div class="cd"></div><div class="cdt"></div></button>
        <button id="btnStrike" class="ability" aria-label="${T.hero.strike}">${ICONS.strike}<div class="cd"></div><div class="cdt"></div></button>
        <button id="heroPortrait" aria-label="${T.hero.name}">${ICONS.knot}<div class="hp"><i></i></div><div class="hlv"></div></button>
      </div>
      <div id="spells" class="panel hidden"></div>
      <button id="pageBtn" class="pill hidden" aria-label="${T.journal.title}">${ICONS.page}</button>
      <div id="dock">
        <div id="sel" class="panel hidden"></div>
        <div id="preview" class="panel"></div>
        <div id="waveBox">
          <button id="btnHold" class="btn small hidden"></button>
          <div id="speedRow" class="panel">
            <button data-sp="0" aria-label="${U.paused}">${ICONS.pause}</button>
            <button data-sp="1">1×</button><button data-sp="2">2×</button><button data-sp="4">4×</button><button data-sp="8">8×</button>
            <div class="sep"></div>
            <button id="btnAuto" aria-label="${U.auto}">${ICONS.auto}</button>
          </div>
          <button id="btnWave"></button>
        </div>
        <div id="bar" class="panel scrollx"></div>
      </div>
      <div id="prompt" class="panel hidden"><div class="tx"></div><div class="row"><button class="btn small" id="prNo">${U.no}</button><button class="btn primary small" id="prYes">${U.yes}</button></div></div>
      <div id="inside" class="panel hidden"><div class="ins-ring"></div><div class="ins-knot">${ICONS.knot}</div><div class="ins-tx"></div><div class="ins-bar"><i></i></div></div>
      <div id="overlay" class="hidden"></div>
    `;
    const c = this.c;
    $('#btnMenu', r).onclick = () => c.openMenu();
    $('#pLight', r).onclick = () => this.toast(`${U.light}: ${Math.ceil(c.game.s.light)} / ${c.game.s.maxLight}`);
    $('#pGold', r).onclick = () => this.toast(`${U.interestHint}: +${c.game.interestPreview()} ${U.interest}, +${c.game.minesPreview()} ${U.mines}`);
    $('#pWave', r).onclick = () => this.toast(`${U.wave} ${c.game.currentWaveNumber()} / ${TOTAL_WAVES} · ${T.chapters[chapterOf(c.game.currentWaveNumber())]}`);
    for (const b of r.querySelectorAll('#speedRow [data-sp]')) b.onclick = () => c.setSpeed(+b.dataset.sp);
    $('#btnAuto', r).onclick = () => c.toggleAuto();
    $('#btnWave', r).onclick = () => c.startWave();
    $('#heroPortrait', r).onclick = () => c.heroButton();
    $('#btnStrike', r).onclick = () => c.strike();
    $('#btnPlug', r).onclick = () => c.plug();
    $('#btnOver', r).onclick = () => c.overload();
    $('#btnHold', r).onclick = () => c.toggleHoldFire();
    $('#inside', r).addEventListener('pointerdown', (ev) => { ev.stopPropagation(); c.wormTap(); });
    $('#pageBtn', r).onclick = () => c.openPage();
    $('#updateBtn', r).onclick = () => c.applyUpdate();
    this.toastEl = $('#toast', r);
    this.bannerEl = $('#banner', r);
    this.introEl = $('#intro', r);
    this.overlay = $('#overlay', r);
    this.selEl = $('#sel', r);
    this.barEl = $('#bar', r);
    this.tutEl = $('#tut', r);
    this.quipEl = $('#quip', r);
    this.promptEl = $('#prompt', r);
    this.floaters = $('#floaters', r);
    this.vignette = $('#vignette', r);
    // pools of floating elements
    this.coins = []; this.texts = [];
    for (let i = 0; i < 10; i++) { const e = el('div', { class: 'fcoin' }, ICONS.gold); this.floaters.appendChild(e); this.coins.push(e); }
    for (let i = 0; i < 12; i++) { const e = el('div', { class: 'ftext' }); this.floaters.appendChild(e); this.texts.push(e); }
    this.coinI = 0; this.textI = 0;
    // keep the panels from passing touches to the canvas
    for (const id of ['#top', '#dock', '#heroBox', '#overlay', '#updateBtn', '#tut', '#prompt', '#spells', '#pageBtn', '#inside']) {
      $(id, r).addEventListener('pointerdown', (ev) => ev.stopPropagation());
    }
    r.addEventListener('click', (ev) => { if (ev.target.closest('button')) c.uiClick(); });
  }

  setVisible(v) {
    for (const id of ['#top', '#dock', '#heroBox']) $(id, this.root).classList.toggle('hidden', !v);
    if (!v) { $('#spells', this.root).classList.add('hidden'); $('#pageBtn', this.root).classList.add('hidden'); }
    this.cache = {};
    if (!v) { this.tutEl.classList.add('hidden'); this.quipEl.classList.remove('show'); $('#bossBar', this.root).classList.add('hidden'); this.promptEl.classList.add('hidden'); $('#inside', this.root).classList.add('hidden'); }
  }

  bump(id) {
    const e = typeof id === 'string' ? $(id, this.root) : id;
    if (!e) return;
    e.classList.remove('bump');
    void e.offsetWidth;
    e.classList.add('bump');
  }

  // Free part of the screen (for the camera) and the place of the tutorial bubble.
  measure() {
    const W = layout.w, H = layout.h;
    const q = (s) => localRect($(s, this.root));
    const top = q('#top'), dock = q('#dock'), hero = q('#heroBox'), prev = q('#preview'), sel = this.selEl.classList.contains('hidden') ? null : q('#sel');
    const sb = Math.round(H - hero.top + 6) + 'px';
    if (sb !== this.spellKey) { this.spellKey = sb; $('#spells', this.root).style.bottom = sb; }
    let ins;
    if (layout.land) ins = { t: Math.round(top.bottom), b: 0, l: 0, r: Math.round(W - dock.left) };
    else {
      const pt = prev.height > 0 ? prev.top : q('#waveBox').top;
      ins = { t: Math.round(top.bottom), b: Math.round(H - Math.min(pt, hero.top)), l: 0, r: 0 };
    }
    // tutorial bubble: under the top bar when upright, above Knot's box when on the side
    const key = layout.land ? 'b' + Math.round(H - hero.top + 6) : 'top';
    if (key !== this.tutKey) { this.tutKey = key; this.tutEl.style.bottom = layout.land ? Math.round(H - hero.top + 6) + 'px' : ''; }
    void sel;
    // short messages: above the bottom bars when upright (the top belongs to Knot's bubble), under the top bar on the side
    const tb = layout.land ? '' : Math.round(H - Math.min(dock.top, hero.top) + 8) + 'px';
    if (tb !== this.toastKey) { this.toastKey = tb; this.toastEl.style.bottom = tb; this.toastEl.style.top = tb ? 'auto' : ''; }
    return ins;
  }

  // ---------- per-frame update ----------

  update() {
    const c = this.c, g = c.game;
    if (!g) return;
    const s = g.s;
    const k = this.cache;
    const light = Math.ceil(s.light);
    const hold = this.holdUntil > performance.now();
    if (k.light !== light && !hold) {
      if (k.light !== undefined && light !== k.light) this.bump('#nLight');
      k.light = light;
      $('#nLight').textContent = light;
      $('#pLight .bar').style.width = (100 * s.light / s.maxLight) + '%';
      $('#pLight').classList.toggle('low', s.light < 30);
    }
    const gold = Math.floor(s.gold);
    if (k.gold !== gold && !hold) {
      if (k.gold !== undefined && gold > k.gold) this.bump('#nGold');
      k.gold = gold;
      $('#nGold').textContent = fmt(gold);
    }
    const intText = `+${g.interestPreview() + g.minesPreview()} ${U.interestAfter}`;
    if (k.intText !== intText) { k.intText = intText; $('#nInt').textContent = intText; }
    const wn = g.currentWaveNumber();
    const waveText = `${wn} / ${TOTAL_WAVES}`;
    if (k.waveText !== waveText && !hold) {
      if (k.waveText !== undefined) this.bump('#nWave');
      k.waveText = waveText;
      $('#nWave').textContent = waveText;
      $('#nChapter').textContent = T.chapters[chapterOf(wn)] || '';
    }
    // speed
    const spKey = c.paused ? 0 : c.speed;
    if (k.sp !== spKey) {
      k.sp = spKey;
      for (const b of this.root.querySelectorAll('#speedRow [data-sp]')) {
        b.classList.toggle('on', +b.dataset.sp === (spKey === 16 ? 8 : spKey));
        if (+b.dataset.sp === 8) b.textContent = spKey === 16 ? '16×' : '8×';
      }
    }
    if (k.auto !== s.auto) { k.auto = s.auto; $('#btnAuto').classList.toggle('on', s.auto); }

    // hero
    const h = s.hero;
    const hk = `${Math.round(h.hp)}|${h.mhp}|${h.down > 0}|${c.mode?.k === 'hero'}|${h.lvl}|${!!h.upOffer}`;
    if (k.hero !== hk) {
      k.hero = hk;
      $('#heroPortrait .hp i').style.width = (100 * h.hp / h.mhp) + '%';
      $('#heroPortrait .hp').classList.toggle('hurt', h.hp < h.mhp * 0.4);
      $('#heroPortrait').classList.toggle('down', h.down > 0);
      $('#heroPortrait').classList.toggle('active', c.mode?.k === 'hero');
      const lv = $('#heroPortrait .hlv');
      lv.textContent = h.upOffer ? '+' : (h.lvl > 1 ? h.lvl : '');
      lv.classList.toggle('up', !!h.upOffer);
    }
    // Zátka (second ability)
    const plugOn = g.abilityUnlocked('plug');
    const cd2 = h.cd2 > 0 ? Math.ceil(h.cd2) : 0;
    const plugOff = h.down > 0 || g.phase() !== 'combat';
    const pk = `${plugOn}|${cd2}|${plugOff}|${Math.round(h.cd2 * 2)}|${h.plugT > 0}`;
    if (k.plug !== pk) {
      k.plug = pk;
      const pb = $('#btnPlug');
      pb.classList.toggle('hidden', !plugOn);
      $('.cd', pb).style.height = (100 * h.cd2 / HERO.plug.cooldown) + '%';
      $('.cdt', pb).textContent = cd2 ? cd2 : '';
      pb.classList.toggle('disabled', plugOff || cd2 > 0);
      pb.classList.toggle('on', h.plugT > 0);
    }
    // Přetížení (third ability)
    const overOn = g.abilityUnlocked('overload');
    const cd3 = h.cd3 > 0 ? Math.ceil(h.cd3) : 0;
    const ok3 = `${overOn}|${cd3}|${plugOff}|${Math.round(h.cd3 * 2)}|${h.overT > 0}`;
    if (k.over !== ok3) {
      k.over = ok3;
      const ob = $('#btnOver');
      ob.classList.toggle('hidden', !overOn);
      $('.cd', ob).style.height = (100 * h.cd3 / HERO.overload.cooldown) + '%';
      $('.cdt', ob).textContent = cd3 ? cd3 : '';
      ob.classList.toggle('disabled', plugOff || cd3 > 0);
      ob.classList.toggle('on', h.overT > 0);
    }
    // hold fire (wave 99), inside the worm
    const posel = s.enemies.find((e) => e.type === 'posel' && !e.dead && !e.home);
    const hk2 = posel ? (s.holdFire ? 2 : 1) : 0;
    if (k.hold !== hk2) {
      k.hold = hk2;
      const hb = $('#btnHold');
      hb.classList.toggle('hidden', !hk2);
      hb.classList.toggle('primary', hk2 === 2);
      hb.textContent = hk2 === 2 ? T.secret.holdFireOn : T.secret.holdFire;
    }
    const sw = h.swallowT > 0 ? Math.ceil(h.swallowT * 4) : 0;
    const ik = sw ? sw + '|' + (h.taps || 0) : '';
    if (k.inside !== ik) {
      k.inside = ik;
      const ins = $('#inside');
      ins.classList.toggle('hidden', !sw);
      if (sw) { $('.ins-tx', ins).textContent = T.secret.inside; $('.ins-bar i', ins).style.width = Math.max(0, 100 * h.swallowT / 8) + '%'; ins.classList.remove('bang'); void ins.offsetWidth; if (h.taps) ins.classList.add('bang'); }
    }
    // spells
    const spk = s.spells.map((sp) => sp.id + (sp.used ? 1 : 0)).join(',') + '|' + g.phase() + '|' + (c.mode?.k === 'spell' ? c.mode.i : -1);
    if (k.spells !== spk) { k.spells = spk; this.renderSpells(); }
    // journal page waiting on the island
    const pg = s.pages.length ? s.pages[0] : 0;
    if (k.page !== pg) { k.page = pg; $('#pageBtn').classList.toggle('hidden', !pg); }
    const cd = h.cd > 0 ? Math.ceil(h.cd) : 0;
    const strikeOff = h.down > 0 || g.phase() !== 'combat';
    const sk = `${cd}|${strikeOff}|${Math.round(h.cd * 4)}`;
    if (k.strike !== sk) {
      if (k.strikeCd > 0 && cd === 0 && !strikeOff) this.bump('#btnStrike');
      k.strike = sk; k.strikeCd = cd;
      $('#btnStrike .cd').style.height = (100 * h.cd / HERO.strike.cooldown) + '%';
      $('#btnStrike .cdt').textContent = cd ? cd : '';
      $('#btnStrike').classList.toggle('disabled', strikeOff || cd > 0);
    }

    // wave button + preview
    const phase = g.phase();
    const canStart = g.canStartWave();
    const wk = `${phase}|${s.nextWave}|${canStart}|${s.waves.length}|${s.autoT > 0 ? Math.ceil(s.autoT) : 0}|${c.settings.tips}|${!!s.pick}|${g.has('oldMap')}|${s.finished}|${s.endless}|${(s.lastKillTypes || []).join()}`;
    if (k.wave !== wk) {
      k.wave = wk;
      const btn = $('#btnWave');
      const endlessReady = s.finished && !s.endless && phase === 'build' && !s.pick;
      btn.disabled = !canStart && !s.pick && !endlessReady;
      btn.classList.toggle('call', canStart && phase === 'combat');
      if (s.pick && !s.lost) btn.innerHTML = `${U.pickWave}<small>${s.pick.kind === 'relic' ? T.cardKinds.relic : U.wave + ' ' + s.nextWave}</small>`;
      else if (endlessReady) btn.innerHTML = `${U.endless}<small>${U.wave} ${TOTAL_WAVES + 1}</small>`;
      else if (!canStart) btn.innerHTML = s.nextWave > g.lastWave() ? `${U.wave} ${CONTENT_MAX_WAVE} ✓` : U.nextWave;
      else if (phase === 'combat') btn.innerHTML = `${U.callWave}<small>${U.callBonus}</small>`;
      else if (s.autoT > 0) btn.innerHTML = `${U.nextWave}<small>${Math.ceil(s.autoT)} s</small>`;
      else btn.innerHTML = `${U.nextWave}<small>${U.wave} ${s.nextWave}</small>`;
      this.renderPreview();
    }

    // build bar
    const bk = `${gold}|${s.completedCount}|${c.mode?.k === 'build' ? c.mode.type : ''}|${g.canUndo()}|${g.mineUnits()}|${s.buildings.length}|${g.wrecks().length}|${phase}|${Object.keys(s.free).join()}|${s.relics.length}`;
    if (k.bar !== bk) { k.bar = bk; this.renderBar(); }

    // selection panel
    const sk2 = this.selKey();
    if (k.sel !== sk2) { k.sel = sk2; this.renderSel(); }

    // boss bar
    let boss = null;
    for (const e of s.enemies) if ((e.boss || e.type === 'srdicko') && !e.dead && !e.calm) { boss = e; break; }
    const bkey = boss ? `${boss.type}|${Math.ceil(100 * boss.hp / boss.mhp)}` : '';
    if (k.boss !== bkey) {
      k.boss = bkey;
      const bb = $('#bossBar');
      bb.classList.toggle('hidden', !boss);
      if (boss) { $('.bn', bb).textContent = T.bosses[boss.type]?.name || eName(boss.type); $('i', bb).style.width = Math.max(0, 100 * boss.hp / boss.mhp) + '%'; }
    }
  }

  renderPreview() {
    const g = this.c.game, s = g.s;
    const box = $('#preview');
    const n = s.nextWave;
    if (n > g.lastWave()) {
      box.innerHTML = s.finished ? `<div class="title">${U.endless}</div><div class="tip">${T.secret.afterEnd}</div>` : `<div class="title">${U.contentEndShort}</div><div class="tip">${U.contentEnd}</div>`;
      return;
    }
    const p = g.wavePreview(n);
    if (!p) { box.innerHTML = ''; return; }
    let html = `<div class="title">${U.wave} ${n}${p.boss ? ` <span class="tag">${U.boss}</span>` : ''}${p.endless && s.best ? ` <span class="tag">${fill(U.endlessBest, { n: s.best })}</span>` : ''}</div><div class="ents">`;
    for (const [key, list] of Object.entries(p.entries)) {
      html += `<span class="k">${T.entryNames[key] || key}</span>`;
      for (const it of list) html += `<span class="ent"><span class="e">${enemyIcon(it.type, it.golden)}</span>${it.count}</span>`;
    }
    html += '</div>';
    if (p.learn) {
      const names = U.dtypeNames;
      html += `<div class="warn learn">${p.learn === 'all' ? U.learnedAll : p.learn.length ? fill(U.learned, { typ: p.learn.map((t) => names[t]).join(' a ') }) : U.learnedNone}</div>`;
    }
    if (p.mutation) html += `<div class="warn">${fill(U.endlessMutation, { m: U.endlessMut[p.mutation] })}</div>`;
    if (T.waveWarnings[n]) html += `<div class="warn">${T.waveWarnings[n]}</div>`;
    if (this.c.settings.tips && T.waveTips[n]) html += `<div class="tip">${T.waveTips[n]}</div>`;
    if (g.has('oldMap')) {
      const more = [];
      for (let m = n + 1; m <= Math.min(n + 2, g.lastWave()); m++) {
        const q = g.wavePreview(m);
        if (!q || q.quiet) continue;
        const icons = Object.values(q.entries).flat().map((it) => `<span class="ent"><span class="e">${enemyIcon(it.type, it.golden)}</span>${it.count}</span>`).join('');
        more.push(`<div class="ahead"><b>${m}</b>${icons}</div>`);
      }
      if (more.length) html += `<div class="aheadBox">${more.join('')}</div>`;
    }
    box.innerHTML = html;
  }

  renderBar() {
    const c = this.c, g = c.game;
    const bar = this.barEl;
    const scroll = bar.scrollLeft;
    bar.innerHTML = '';
    if (c.mode?.k === 'build') {
      bar.appendChild(el('button', { class: 'bItem tool', 'aria-label': U.cancel, onclick: () => c.cancelMode() }, `<div class="ic">${ICONS.close}</div><div class="lab">${U.cancel}</div>`));
    }
    if (g.canUndo()) {
      bar.appendChild(el('button', { class: 'bItem tool', 'aria-label': U.undo, onclick: () => c.undo() }, `<div class="ic">${ICONS.undo}</div><div class="lab">${U.undo}</div>`));
    }
    const wrecks = g.wrecks().length;
    if (wrecks && g.phase() === 'build') {
      const cost = g.repairAllCost();
      bar.appendChild(el('button', { class: 'bItem tool repair' + (g.s.gold < cost ? ' poor' : ''), 'aria-label': U.repairAll, onclick: () => c.repairAll() },
        `<div class="ic">${ICONS.repair}</div><div class="cost"><i>${ICONS.gold}</i>${cost}</div>`));
    }
    let shownLocked = 0;
    for (const type of BUILD_ORDER) {
      const d = BUILDINGS[type];
      const unlocked = g.isUnlocked(type);
      if (!unlocked) {
        // Show only the next building that will be unlocked in this version.
        if (!d.implemented || shownLocked >= 1) continue;
        shownLocked++;
        bar.appendChild(el('button', { class: 'bItem locked', 'data-b': type, onclick: () => c.toast(`${bName(type)}: ${fill(U.lockedUntil, { n: d.unlockAfter })}`) },
          `<div class="ic">${ICONS[type]}</div><div class="lab">${U.afterWave} ${d.unlockAfter}</div><div class="lock">${ICONS.lock}</div>`));
        continue;
      }
      const cost = g.buildCost(type);
      const lim = g.limitOf(type), cnt = lim < Infinity ? g.countOf(type) : 0;
      const cls = ['bItem'];
      if (cnt >= lim) cls.push('poor');
      if (c.mode?.k === 'build' && c.mode.type === type) cls.push('sel');
      if (g.s.gold < cost) cls.push('poor');
      if (this.hlSel === `[data-b="${type}"]`) cls.push('hl');
      bar.appendChild(el('button', { class: cls.join(' '), 'data-b': type, 'aria-label': bName(type), onclick: () => c.selectBuildType(type) },
        `<div class="ic">${ICONS[type]}</div><div class="cost">${cost === 0 ? U.free : `<i>${ICONS.gold}</i>${cost}`}</div>${lim < Infinity ? `<div class="lim">${fill(U.limitShort, { n: cnt, max: lim })}</div>` : ''}`));
    }
    bar.scrollLeft = scroll;
  }

  renderSpells() {
    const c = this.c, g = c.game, s = g.s;
    const box = $('#spells', this.root);
    box.classList.toggle('hidden', !s.spells.length);
    box.innerHTML = '';
    s.spells.forEach((sp, i) => {
      const off = sp.used || g.phase() !== 'combat';
      const cls = 'spell' + (off ? ' disabled' : '') + (sp.used ? ' used' : '') + (c.mode?.k === 'spell' && c.mode.i === i ? ' active' : '');
      box.appendChild(el('button', { class: cls, 'aria-label': T.cards[sp.id].name, onclick: () => c.spellButton(i) }, ICONS[sp.id]));
    });
  }

  selKey() {
    const c = this.c, g = c.game, sel = c.selected;
    if (!sel) return '';
    if (sel.k === 'b') {
      const b = g.byId.get(sel.id);
      if (!b) return 'gone';
      return `b|${b.id}|${b.type}|${b.level}|${b.mode}|${g.sellValue(b)}|${c.mode?.k || ''}|${c.sellArm || ''}|${g.mergePartners(b).length}|${g.maxLevel()}|${g.rateMult(b).toFixed(2)}|${b.wreck}|${b.spec}|${g.amp[b.y * 19 + b.x]}|${b.cd > 0}|${g.isOff(b)}|${b.nm || 0}|${b.k || 0}|${b.md || 0}`;
    }
    if (sel.k === 'e') {
      const e = g.findEnemy(sel.id);
      return e ? `e|${e.id}|${Math.ceil(e.hp)}|${(e.res || []).join()}|${e.hat || 0}` : 'egone';
    }
    return `cell|${sel.x}|${sel.y}|${g.isOpen(sel.x, sel.y)}`;
  }

  renderSel() {
    const c = this.c, g = c.game, sel = c.selected;
    const p = this.selEl;
    if (!sel) { p.classList.add('hidden'); return; }
    let html = '';
    const close = `<button class="close" id="selClose" aria-label="${U.close}">${ICONS.close}</button>`;
    if (sel.k === 'b') {
      const b = g.byId.get(sel.id);
      if (!b) { c.selected = null; p.classList.add('hidden'); return; }
      const d = BUILDINGS[b.type];
      const st = b.wreck ? null : g.towerStats(b);
      const spec = st && st.spec ? T.specs[st.spec] : null;
      const name = spec ? spec.name : bName(b.type);
      html += `<div class="head"><div class="ic">${b.wreck ? ICONS.wreck : spec ? ICONS[st.spec] : ICONS[b.type]}</div><div class="grow"><div class="name">${name}${d.mergeable ? ` <span class="lvl">${U.level} ${b.level}</span>` : ''}${b.wreck ? ` <span class="lvl wr">${U.wrecked}</span>` : ''}</div><div class="desc">${b.wreck ? U.wreckHint : spec ? spec.desc : T.buildings[b.type].desc}</div>${c.sx.nickHtml(b)}</div>${close}</div>`;
      if (b.type === 'trap' && !b.wreck) html += `<div class="stats"><span>${U.statDmg} <b>${num(g.trapDmg(b), 0)}</b></span><span>${U.statHits} <b>${d.hits}</b></span><span>${U.statRecharge} <b>${d.recharge} s</b></span></div>`;
      if (st) {
        const rate = st.rate * g.rateMult(b);
        html += `<div class="stats"><span>${U.statDmg} <b>${num(st.dmg, st.dmg < 10 ? 1 : 0)}</b></span><span>${U.statRange} <b>${num(st.range, 2)}</b></span><span>${U.statRate} <b>${num(rate, 2)}</b></span>${st.slow ? `<span>${U.statSlow} <b>${Math.round(st.slow * 100)} %</b></span>` : ''}${st.targets ? `<span>${U.statTargets} <b>${st.targets}</b></span>` : ''}</div>`;
        const notes = [];
        if (b._beacon) notes.push(U.beaconBonus);
        if (g.heroAura(b)) notes.push(U.knotBonus);
        if (g.amp[b.y * 19 + b.x]) notes.push(U.ampBonus);
        const t = tileAt(b.x, b.y);
        if (t.plateau) notes.push(T.tiles.plateau.desc);
        if (t.crystal) notes.push(T.tiles.crystal.desc);
        if (g.jammed && g.jammed.has(b.id)) notes.push(U.jammed);
        if (b.stunT > 0) notes.push(U.stunnedTower);
        if (notes.length) html += `<div class="note">${notes.join(' ')}</div>`;
      }
      if (b.type === 'bank' && !b.wreck) html += `<div class="note">${fill(U.bankBonus, { rate: Math.round(g.interestRate() * 100) })}</div>`;
      if (b.type === 'mine') html += `<div class="stats"><span>${U.statYield} <b>${g.mineYield(b)}</b></span></div>${tileAt(b.x, b.y).ore ? `<div class="note">${T.tiles.ore.desc}</div>` : ''}`;
      html += '<div class="btns">';
      if (d.tower && !b.wreck) html += `<button class="btn" id="selTarget">${ICONS.target}<span>${U.targeting}: <b>${T.targetModes[b.mode]}</b></span></button>`;
      if (d.mergeable && !b.wreck) {
        const partners = g.mergePartners(b).length;
        html += `<button class="btn ${c.mode?.k === 'merge' ? 'primary' : ''}" id="selMerge" ${partners ? '' : 'disabled'}>${ICONS.merge}${U.merge}</button>`;
      }
      html += `<button class="btn ${c.sellArm === b.id ? 'warn' : ''}" id="selSell">${ICONS.sell}<span>${c.sellArm === b.id ? U.sellConfirm : U.sell} <b>+${g.sellValue(b)}</b></span></button>`;
      html += '</div>';
      if (c.mode?.k === 'merge') html += `<div class="note">${U.mergeHint}</div>`;
    } else if (sel.k === 'e') {
      const e = g.findEnemy(sel.id);
      if (!e) { c.selected = null; p.classList.add('hidden'); return; }
      const name = (e.golden ? T.enemies.golden + ' ' + eName(e.type).toLowerCase() : eName(e.type));
      html += `<div class="head"><div class="ic">${enemyIcon(e.type, e.golden)}</div><div class="grow"><div class="name">${name}</div><div class="desc">${e.golden ? T.enemies.goldenDesc : (T.enemies[e.type]?.desc || '')}</div></div>${close}</div>`;
      html += `<div class="stats"><span>${U.lifeOf} <b>${fmt(Math.ceil(e.hp))} / ${fmt(Math.ceil(e.mhp))}</b></span><span>${U.speedOf} <b>${num(e.spd, 1)}</b></span><span>${U.takesLight} <b>${e.light}</b></span><span>${U.carriesGold} <b>${e.gold}</b></span>${e.res && e.res.length ? `<span>${U.resists} <b>${e.res.map((t) => U.dtypeNames[t]).join(', ')}</b></span>` : ''}</div>${c.sx.enemyNote(e)}`;
    } else {
      const t = tileAt(sel.x, sel.y);
      const open = g.isOpen(sel.x, sel.y);
      let info = open ? T.tiles[t.kind] : T.tiles.locked;
      if (open && t.kind === 'water' && sel.y === 20) info = T.tiles.cliff;
      if (open && t.kind === 'entryN' && !g.isActiveEntryCell(sel.x, sel.y)) info = T.tiles.grass;
      info = info || T.tiles.grass;
      html += `<div class="head"><div class="ic">${ICONS.tile}</div><div class="grow"><div class="name">${info.name}</div><div class="desc">${info.desc}</div></div>${close}</div>`;
    }
    p.innerHTML = html;
    p.classList.remove('hidden');
    $('#selClose', p).onclick = () => c.clearSelection();
    const tg = $('#selTarget', p); if (tg) tg.onclick = () => c.cycleTargeting();
    const mg = $('#selMerge', p); if (mg) mg.onclick = () => c.mergeButton();
    const sl = $('#selSell', p); if (sl) sl.onclick = () => c.sellButton();
  }

  // ---------- messages ----------

  toast(msg, ms = 2400) {
    const t = this.toastEl;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  banner(title, sub, ms = 2600, boss = false) {
    const b = this.bannerEl;
    $('.bt', b).textContent = title;
    $('.bs', b).textContent = sub || '';
    b.classList.toggle('boss', boss);
    b.classList.add('show');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('show'), ms);
  }

  // Chapter intro: a line of text across the screen.
  intro(ch, ms = 5200) {
    const e = this.introEl;
    $('.in', e).textContent = `${ch}. ${T.chapters[ch] || ''}`;
    $('.it', e).textContent = T.chapterIntros[ch] || '';
    e.classList.add('show');
    clearTimeout(this.introT);
    this.introT = setTimeout(() => e.classList.remove('show'), ms);
  }

  flashEdge() {
    const v = this.vignette;
    v.classList.remove('on');
    void v.offsetWidth;
    v.classList.add('on');
  }

  // "+12" that floats up from a place on screen.
  floatText(x, y, text, cls = '') {
    const e = this.texts[this.textI = (this.textI + 1) % this.texts.length];
    e.className = 'ftext ' + cls;
    e.textContent = text;
    e.style.left = Math.round(x) + 'px'; e.style.top = Math.round(y) + 'px';
    void e.offsetWidth;
    e.classList.add('go');
  }

  // A coin that flies from a place on screen to the gold counter.
  flyCoin(x, y, delay = 0) {
    const e = this.coins[this.coinI = (this.coinI + 1) % this.coins.length];
    const to = localRect($('#pGold .ic', this.root));
    e.className = 'fcoin';
    e.style.transition = 'none';
    e.style.transform = `translate(${Math.round(x - 9)}px, ${Math.round(y - 9)}px) scale(1)`;
    e.style.opacity = '1';
    void e.offsetWidth;
    e.style.transition = `transform .55s cubic-bezier(.5,-0.3,.7,1) ${delay}ms, opacity .1s linear ${delay + 500}ms`;
    e.style.transform = `translate(${Math.round(to.left + 6)}px, ${Math.round(to.top + 6)}px) scale(.7)`;
    e.style.opacity = '0';
    clearTimeout(e._t);
    e._t = setTimeout(() => this.bump('#pGold .ic'), delay + 520);
  }

  goldAnchor() { const r = localRect($('#pGold', this.root)); return { x: (r.left + r.right) / 2, y: r.bottom + 4 }; }

  showUpdate(v) { $('#updateBtn').classList.toggle('hidden', !v); }

  // Question with Yes / No that does not stop the game.
  prompt(text, yes, no) {
    const p = this.promptEl;
    $('.tx', p).textContent = text;
    p.classList.remove('hidden');
    $('#prYes', p).onclick = () => { p.classList.add('hidden'); yes && yes(); };
    $('#prNo', p).onclick = () => { p.classList.add('hidden'); no && no(); };
  }

  // ---------- Knot's bubbles ----------

  setHighlight(selector) {
    if (this.hlSel === selector) return;
    for (const e of this.root.querySelectorAll('.hl')) e.classList.remove('hl');
    this.hlSel = selector || null;
    if (selector) for (const e of this.root.querySelectorAll(selector)) e.classList.add('hl');
  }

  showTut(text, btn, onNext, onSkip, highlight) {
    const t = this.tutEl;
    $('.tx', t).textContent = text;
    const nb = $('#tutNext', t);
    nb.classList.toggle('hidden', !btn);
    nb.textContent = btn || '';
    nb.onclick = onNext || null;
    $('#tutSkip', t).onclick = onSkip || null;
    t.classList.remove('hidden');
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    this.setHighlight(highlight);
    this.quipEl.classList.remove('show');
  }

  hideTut() { this.tutEl.classList.add('hidden'); this.setHighlight(null); }
  get tutVisible() { return !this.tutEl.classList.contains('hidden'); }

  showQuip(text, ms = 4200) {
    const q = this.quipEl;
    q.textContent = text;
    q.classList.add('show');
    this.quipUntil = performance.now() + ms;
    clearTimeout(this.quipT);
    this.quipT = setTimeout(() => q.classList.remove('show'), ms);
  }

  // Keeps the small bubble above Knot's head.
  placeQuip(pos) {
    const q = this.quipEl;
    if (!q.classList.contains('show') || !pos) return;
    const w = q.offsetWidth, h = q.offsetHeight;
    const x = Math.max(8, Math.min(layout.w - w - 8, pos.x - w / 2));
    const y = Math.max(70, Math.min(layout.h - h - 90, pos.y - h - 10));
    q.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ---------- overlays (the screens themselves are in screens.js) ----------

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    this.overlayKind = null;
  }

  showCard(kind, html, { clear = false, wide = false, cls = '' } = {}) {
    this.overlayKind = kind;
    this.overlay.innerHTML = `<div class="card scroll ${wide ? 'wide' : ''} ${cls}">${html}</div>`;
    this.overlay.className = clear ? 'clear' : '';
    return this.overlay.querySelector('.card');
  }
}

Object.assign(Hud.prototype, screens);
