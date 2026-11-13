// Full-screen cards: title, menu, settings, handbook, codex, loss, end of chapter...
// These functions are mixed into the Hud class (this = Hud).
import { ICONS, enemyIcon } from './icons.js';
import { T, bName, eName, fill } from '../data/texts.cs.js';
import { BUILDINGS, BUILD_ORDER, SPECS, HYBRID_TYPES } from '../data/buildings.js';
import { CARDS, RELICS, cardById } from '../data/cards.js';
import { PAGES, PAGE_COUNT } from '../secrets/journal.js';
import { ENEMIES, LIGHT_BY_SIZE } from '../data/enemies.js';
import { chapterOf } from '../data/waves.js';
import { $, fmt, fmtTime, num } from './dom.js';
import { layout, localRect, toLocal } from './layout.js';

const U = T.ui;

function seg(name, opts, cur) {
  return `<div class="seg" data-seg="${name}">${Object.entries(opts).map(([k, v]) => `<button data-v="${k}" class="${k === String(cur) ? 'on' : ''}">${v}</button>`).join('')}</div>`;
}
function slider(name, value) {
  return `<div class="slider" data-slider="${name}" data-value="${value}"><div class="track"><div class="fill" style="width:${value}%"></div><div class="knob" style="left:${value}%"></div></div><div class="val">${value}</div></div>`;
}
const head = (title, icon) => `<div class="chead">${icon ? `<div class="hic">${icon}</div>` : ''}<h2>${title}</h2><button class="close" data-close aria-label="${U.close}">${ICONS.close}</button></div>`;

export const screens = {
  showTitle(hasSave) {
    const c = this.c;
    const g = c.game;
    const where = hasSave && g ? `${U.wave} ${g.currentWaveNumber()} · ${T.chapters[chapterOf(g.currentWaveNumber())]}` : '';
    const card = this.showCard('title', `
      <div class="thead"><h1>${T.gameTitle}</h1>${where ? `<div class="twhere">${where}</div>` : ''}</div>
      <div class="tbtns">
        ${hasSave ? `<button class="btn primary big" id="tContinue">${U.continue}</button>` : ''}
        <button class="btn ${hasSave ? '' : 'primary big'}" id="tNew">${U.newGame}</button>
        <div class="row">
          <button class="btn" id="tBook">${ICONS.book}${U.handbook}</button>
          <button class="btn" id="tSettings">${ICONS.gear}${U.settings}</button>
        </div>
        <div class="tver">${c.versionText}</div>
      </div>`, { clear: true, cls: 'titlecard' });
    if (hasSave) $('#tContinue', card).onclick = () => c.continueGame();
    $('#tNew', card).onclick = () => {
      if (!hasSave) return c.newGame();
      this.confirm(U.newGameConfirm, () => c.newGame(), () => this.showTitle(hasSave));
    };
    $('#tBook', card).onclick = () => this.showHandbook(() => this.showTitle(hasSave));
    $('#tSettings', card).onclick = () => this.showSettings(() => this.showTitle(hasSave));
  },

  confirm(text, yes, no, yesLabel = U.yes, noLabel = U.no) {
    const card = this.showCard('confirm', `<p class="big">${text}</p><div class="row"><button class="btn" id="cNo">${noLabel}</button><button class="btn warn" id="cYes">${yesLabel}</button></div>`);
    $('#cYes', card).onclick = () => { this.hideOverlay(); yes(); };
    $('#cNo', card).onclick = () => { this.hideOverlay(); no && no(); };
  },

  askSound(done) {
    const card = this.showCard('sound', `<div class="title-ic">${ICONS.note}</div><h2 class="center">${U.soundAsk}</h2><p class="muted center">${U.soundAskHelp}</p><div class="row"><button class="btn" id="sNo">${U.no}</button><button class="btn primary" id="sYes">${U.yes}</button></div>`);
    $('#sYes', card).onclick = () => { this.hideOverlay(); done(true); };
    $('#sNo', card).onclick = () => { this.hideOverlay(); done(false); };
  },

  showMenu() {
    const c = this.c;
    const card = this.showCard('menu', `
      ${head(U.menu)}
      <div class="col">
        <button class="btn primary big" id="mContinue">${ICONS.play}${U.continue}</button>
        <button class="btn" id="mCheckpoints">${ICONS.flag}${U.checkpoints}</button>
        <div class="row">
          <button class="btn" id="mBook">${ICONS.book}${U.handbook}</button>
          <button class="btn" id="mCodex">${ICONS.eye}${U.codex}</button>
        </div>
        <div class="row">
          <button class="btn" id="mJournal">${ICONS.quill}${U.journal}</button>
          <button class="btn" id="mSettings">${ICONS.gear}${U.settings}</button>
        </div>
        ${c.sx.menuHtml()}
        <button class="btn" id="mTitle">${ICONS.home}${U.toTitle}</button>
      </div>`);
    const back = () => this.showMenu();
    c.sx.menuBind(card, back);
    $('[data-close]', card).onclick = () => c.closeMenu();
    $('#mContinue', card).onclick = () => c.closeMenu();
    $('#mCheckpoints', card).onclick = () => this.showCheckpoints(back);
    $('#mBook', card).onclick = () => this.showHandbook(back);
    $('#mCodex', card).onclick = () => this.showCodex(back);
    $('#mJournal', card).onclick = () => this.showJournal(back);
    $('#mSettings', card).onclick = () => this.showSettings(back);
    $('#mTitle', card).onclick = () => c.toTitle();
  },

  checkpointLabel(cp) {
    const n = cp.label;
    return n ? `${U.checkpointAfter} ${n}` : U.checkpointStart;
  },

  showCheckpoints(back) {
    const c = this.c;
    const list = [...c.checkpoints].reverse();
    const card = this.showCard('checkpoints', `
      ${head(U.checkpoints, ICONS.flag)}
      <p class="muted">${U.checkpointsHelp}</p>
      <div class="col cpList">${list.map((cp, i) => `<button class="btn" data-i="${i}"><span>${this.checkpointLabel(cp)}</span><span class="muted">${new Date(cp.savedAt).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></button>`).join('')}</div>`);
    for (const b of card.querySelectorAll('[data-i]')) {
      b.onclick = () => this.confirm(`${this.checkpointLabel(list[+b.dataset.i])}. ${U.checkpointConfirm}`, () => c.restoreCheckpoint(list[+b.dataset.i]), () => this.showCheckpoints(back));
    }
    $('[data-close]', card).onclick = back;
  },

  showSettings(back) {
    const c = this.c;
    const st = c.settings;
    const diff = c.game ? c.game.s.difficulty : c.pendingDifficulty;
    const onoff = { on: U.on, off: U.off };
    const card = this.showCard('settings', `
      ${head(U.settings, ICONS.gear)}
      <div class="set"><b>${U.music}</b>${slider('music', st.music)}</div>
      <div class="set"><b>${U.sfx}</b>${slider('sfx', st.sfx)}</div>
      <div class="set"><b>${U.mute}</b>${seg('mute', onoff, st.mute ? 'on' : 'off')}</div>
      <hr>
      <div class="set"><b>${U.difficulty}</b>${seg('difficulty', c.meta.finished ? U.diffNames : Object.fromEntries(Object.entries(U.diffNames).filter(([k]) => k !== 'legend')), diff)}<p class="muted">${U.diffHelp}${c.meta.finished ? ' ' + U.legendHelp : ''}</p></div>
      <div class="set"><b>${U.tips}</b>${seg('tips', onoff, st.tips ? 'on' : 'off')}</div>
      <div class="set"><b>${U.tutorial}</b>${seg('tutorial', onoff, st.tutorial ? 'on' : 'off')}<button class="btn small" id="sTutAgain">${U.tutorialAgain}</button></div>
      <hr>
      <div class="set"><b>${U.orientation}</b>${seg('orient', U.orientNames, st.orient)}</div>
      <div class="set"><b>${U.quality}</b>${seg('quality', U.qualityNames, st.quality)}</div>
      <div class="set"><b>${U.saver}</b>${seg('saver', onoff, st.saver ? 'on' : 'off')}<p class="muted">${U.saverHelp}</p></div>
      <div class="set"><b>${U.shake}</b>${seg('shake', onoff, st.shake ? 'on' : 'off')}</div>
      <hr>
      <div class="set"><b>${U.backup}</b><p class="muted">${U.backupHelp}</p>
        <div class="row"><button class="btn" id="sExport">${ICONS.save}${U.backupExport}</button><button class="btn" id="sImport">${U.backupImport}</button></div>
        <div class="row"><button class="btn" id="sFileOut">${T.sx.backupFile}</button><button class="btn" id="sFileIn">${T.sx.backupLoad}</button></div>
        <input type="file" id="sFile" accept=".txt,text/plain" class="hidden">
        <textarea id="sBackup" class="hidden" spellcheck="false" placeholder="${U.backupPaste}"></textarea>
        <button class="btn primary hidden" id="sImportGo">${U.backupImport}</button>
      </div>
      <p class="muted center" id="sVer">${U.version}: ${c.versionText}</p>`);
    $('#sVer', card).onclick = () => c.sx.versionTap(() => this.showSettings(back));
    for (const segEl of card.querySelectorAll('[data-seg]')) {
      for (const b of segEl.querySelectorAll('button')) {
        b.onclick = () => {
          for (const o of segEl.querySelectorAll('button')) o.classList.toggle('on', o === b);
          c.changeSetting(segEl.dataset.seg, b.dataset.v);
        };
      }
    }
    for (const sl of card.querySelectorAll('[data-slider]')) {
      const track = $('.track', sl);
      const set = (e) => {
        const r = localRect(track), p = toLocal(e.clientX, e.clientY);
        const v = Math.round(Math.max(0, Math.min(1, (p.x - r.left) / Math.max(1, r.width))) * 20) * 5;
        if (String(v) === sl.dataset.value) return;
        sl.dataset.value = v;
        $('.fill', sl).style.width = v + '%'; $('.knob', sl).style.left = v + '%'; $('.val', sl).textContent = v;
        c.changeSetting(sl.dataset.slider, v);
      };
      sl.addEventListener('pointerdown', (e) => { sl.setPointerCapture?.(e.pointerId); sl._drag = true; set(e); e.stopPropagation(); });
      sl.addEventListener('pointermove', (e) => { if (sl._drag) set(e); });
      const end = () => { if (sl._drag) { sl._drag = false; c.settingDone(sl.dataset.slider); } };
      sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end);
    }
    $('#sTutAgain', card).onclick = () => { c.restartTutorial(); for (const o of card.querySelectorAll('[data-seg="tutorial"] button')) o.classList.toggle('on', o.dataset.v === 'on'); };
    const ta = $('#sBackup', card);
    $('#sExport', card).onclick = async () => {
      const text = await c.exportBackup();
      if (!text) return;
      ta.value = text;
      ta.classList.remove('hidden');
      $('#sImportGo', card).classList.add('hidden');
      ta.select();
      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { /* the player can copy by hand */ }
      c.toast(copied ? `${U.copied} ${U.backupReady}` : U.backupReady, 3600);
    };
    $('#sImport', card).onclick = () => { ta.value = ''; ta.classList.remove('hidden'); $('#sImportGo', card).classList.remove('hidden'); ta.focus(); };
    $('#sImportGo', card).onclick = () => c.importBackup(ta.value);
    // the same backup as a file (on the iPhone it goes through the share sheet, e.g. to Files)
    $('#sFileOut', card).onclick = async () => {
      const text = await c.exportBackup();
      if (!text) return;
      const d = new Date();
      const name = `posledni-majak-zaloha-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.txt`;
      try {
        const file = new File([text], name, { type: 'text/plain' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: T.gameTitle }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      c.toast(fill(T.sx.backupSaved, { 'název': name }), 4200);
    };
    const fi = $('#sFile', card);
    $('#sFileIn', card).onclick = () => fi.click();
    fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => c.importBackup(String(r.result || '')); r.readAsText(f); };
    $('[data-close]', card).onclick = back;
  },

  showHandbook(back) {
    const items = T.handbook.map((h) => `<div class="hb"><div class="hbic">${ICONS[h.ic] || ICONS.book}</div><div><h3>${h.title}</h3><p>${h.text}</p></div></div>`).join('');
    const ctr = T.handbookControls;
    const rows = ctr.rows.map(([a, b]) => `<div class="ctl"><b>${a}</b><span>${b}</span></div>`).join('');
    const card = this.showCard('handbook', `${head(T.handbookTitle, ICONS.book)}${items}<h3 class="sec">${ctr.title}</h3>${rows}`, { wide: true });
    this.c.sx.note('handbook');
    $('[data-close]', card).onclick = back;
  },

  showJournal(back) {
    const J = T.journal, read = this.c.meta.journal || {};
    const any = Object.keys(read).length > 0;
    let list = '';
    for (let n = 1; n <= PAGE_COUNT; n++) {
      const has = read[n] && PAGES[n];
      list += `<button class="btn ${has ? '' : 'missing'}" data-p="${n}" ${has ? '' : 'disabled'}>${ICONS.page}<span>${fill(J.page, { n })}</span></button>`;
    }
    const card = this.showCard('journal', `${head(J.title, ICONS.quill)}${any ? `<div class="col jlist">${list}</div>` : `<p class="muted center pad">${J.empty}</p>`}`);
    for (const b of card.querySelectorAll('[data-p]')) b.onclick = () => this.showPage(+b.dataset.p, () => this.showJournal(back));
    $('[data-close]', card).onclick = back;
  },

  // A page of the journal, on paper.
  showPage(n, done) {
    const P = PAGES[n];
    if (!P) { done && done(); return; }
    this.overlayKind = 'page';
    const torn = n === 10 && this.c.meta.journal && this.c.meta.journal[10] === 2;
    const text = torn ? P.torn : P.text;
    const cls = (P.mono ? ' mono' : '') + (P.shaky ? ' shaky' : '') + (torn ? ' torn' : '');
    this.overlay.innerHTML = `<div class="card paper scroll${cls}"><div class="pnum">${fill(T.journal.page, { n })}</div>${P.note ? `<div class="pnote">${P.note}</div>` : ''}<div class="ptext">${text}</div>${P.sign ? `<div class="psign">${P.sign}</div>` : ''}<button class="btn primary" id="pgOk">${T.journal.close}</button></div>`;
    this.overlay.className = '';
    $('#pgOk', this.overlay).onclick = () => done && done();
  },

  // Three cards (or relics) to choose from after a wave.
  showPick() {
    const c = this.c, g = c.game, p = g.s.pick;
    if (!p) return;
    const relic = p.kind === 'relic';
    const items = p.options.map((id) => {
      if (!relic && c.sx.isBlur(id)) return c.sx.pickHtml(id);
      const d = relic ? { kind: 'relic' } : cardById(id);
      const t = relic ? T.relics[id] : T.cards[id];
      return `<button class="pick ${relic ? 'relic' : ''}" data-id="${id}"><div class="pic">${ICONS[id] || ICONS.card}</div><div><div class="kind">${T.cardKinds[d.kind]}</div><h3>${t.name}</h3><p>${t.desc}</p></div></button>`;
    }).join('');
    const card = this.showCard('pick', `<div class="title-ic pop">${relic ? ICONS.star : ICONS.card}</div><h2 class="center">${relic ? U.pickRelic : U.pickCard}</h2><div class="picks">${items}</div>`);
    for (const id of p.options) if (relic || !c.sx.isBlur(id)) c.seeCard(id, relic);
    for (const b of card.querySelectorAll('[data-id]')) b.onclick = () => c.choosePick(b.dataset.id);
  },

  // A fourth spell: which one goes away?
  showReplaceSpell(id) {
    const c = this.c, g = c.game;
    const items = g.s.spells.map((sp, i) => `<button class="pick small" data-i="${i}"><div class="pic">${ICONS[sp.id]}</div><div><h3>${T.cards[sp.id].name}</h3></div></button>`).join('');
    const card = this.showCard('pick', `<div class="title-ic">${ICONS[id]}</div><p class="big center">${U.replaceSpell}</p><div class="picks">${items}</div><button class="btn" id="rsKeep">${U.keepOld}</button>`);
    for (const b of card.querySelectorAll('[data-i]')) b.onclick = () => c.choosePick(id, +b.dataset.i);
    $('#rsKeep', card).onclick = () => c.choosePick(id, -1);
  },

  // Merging to level 3: choose a specialisation, then confirm.
  showSpec(src, dst) {
    const c = this.c;
    const sp = SPECS[dst.type];
    const items = ['A', 'B'].map((k) => { const id = sp[k].id; return `<button class="pick" data-k="${k}"><div class="pic">${ICONS[id]}</div><div><h3>${T.specs[id].name}</h3><p>${T.specs[id].desc}</p></div></button>`; }).join('');
    const card = this.showCard('spec', `${head(U.specTitle, ICONS[dst.type])}<p class="muted">${U.specHelp}</p><div class="picks">${items}</div>`);
    for (const b of card.querySelectorAll('[data-k]')) b.onclick = () => {
      const k = b.dataset.k;
      this.confirm(`${T.specs[sp[k].id].name}. ${U.specConfirm}`, () => c.doMerge(src.id, dst.id, k), () => this.showSpec(src, dst));
    };
    $('[data-close]', card).onclick = () => c.closeOverlay();
  },

  // Knot's level-up: one of two upgrades.
  showHeroUp() {
    const c = this.c, h = c.game.s.hero;
    if (!h.upOffer) return;
    const items = h.upOffer.map((id) => `<button class="pick" data-id="${id}"><div class="pic">${ICONS[id]}</div><div><h3>${T.heroUps[id].name}${h.ups[id] ? ` <span class="muted">×${h.ups[id]}</span>` : ''}</h3><p>${T.heroUps[id].desc}</p></div></button>`).join('');
    const card = this.showCard('heroUp', `${head(T.hero.upgrades, ICONS.knot)}<p>${fill(T.hero.levelUp, { n: h.lvl - h.upPending + 1 })}</p><div class="picks">${items}</div>`);
    for (const b of card.querySelectorAll('[data-id]')) b.onclick = () => c.chooseUp(b.dataset.id);
    $('[data-close]', card).onclick = () => c.closeOverlay();
  },

  showCodex(back, tab = 'enemies') {
    const c = this.c, meta = c.meta, g = c.game;
    const X = T.codex;
    let body = '';
    if (tab === 'enemies') {
      const list = [...Object.keys(ENEMIES), 'golden'];
      body = list.map((type) => {
        const seen = !!meta.seenE[type];
        const golden = type === 'golden';
        const d = golden ? null : ENEMIES[type];
        const icon = enemyIcon(golden ? 'sliz' : type, golden);
        if (!seen) return `<div class="cx unknown"><div class="cxic sil">${icon}<span>?</span></div><div><h3>${X.unknown}</h3><p>${X.unknownEnemy}</p></div></div>`;
        const name = golden ? T.enemies.golden : eName(type);
        const desc = golden ? T.enemies.goldenDesc : T.enemies[type].desc;
        let stats = '';
        if (d) {
          const sw = X.speedWords[d.speed < 0.8 ? 0 : d.speed <= 1.2 ? 1 : 2];
          stats = `<div class="stats"><span>${X.stats.speed} <b>${sw}</b></span><span>${X.stats.light} <b>${LIGHT_BY_SIZE[d.size] ?? 5}</b></span>${d.boss ? `<span class="tag">${X.boss}</span>` : ''}</div>`;
        }
        const second = (meta.finished && T.codex2 && T.codex2[type] ? `<p class="second">${T.codex2[type]}</p>` : '') + c.sx.codexLine(type);
        return `<div class="cx"><div class="cxic">${icon}</div><div><h3>${name}</h3><p>${desc}</p>${second}${stats}</div></div>`;
      }).join('');
    } else if (tab === 'buildings') {
      body = BUILD_ORDER.map((type) => {
        const d = BUILDINGS[type];
        const seen = !!meta.seenB[type] || (g && g.isUnlocked(type));
        if (!seen) return `<div class="cx unknown"><div class="cxic sil">${ICONS[type]}<span>?</span></div><div><h3>${X.unknown}</h3><p>${X.unknownBuilding}</p></div></div>`;
        const st = [];
        st.push(`<span>${X.stats.cost} <b>${d.cost}</b></span>`);
        if (d.tower && d.dmg) { st.push(`<span>${X.stats.dmg} <b>${num(d.dmg, 0)}</b></span>`, `<span>${X.stats.range} <b>${num(d.range, 1)}</b></span>`, `<span>${X.stats.rate} <b>${num(d.rate, 1)}</b></span>`); }
        if (d.slow) st.push(`<span>${X.stats.slow} <b>${Math.round(d.slow[1] * 100)} %</b></span>`);
        if (d.yield) st.push(`<span>${X.stats.yield} <b>${d.yield[1]}</b></span>`);
        return `<div class="cx"><div class="cxic">${ICONS[type]}</div><div><h3>${bName(type)}</h3><p>${T.buildings[type].desc}</p><div class="stats">${st.join('')}</div></div></div>`;
      }).join('');
      const specs = Object.values(SPECS).flatMap((sp) => [sp.A.id, sp.B.id]);
      const known = specs.filter((id) => meta.seenS && meta.seenS[id]);
      if (known.length) body += `<h3 class="sec">${X.specs}</h3>` + known.map((id) => `<div class="cx"><div class="cxic">${ICONS[id]}</div><div><h3>${T.specs[id].name}</h3><p>${T.specs[id].desc}</p></div></div>`).join('');
      const seenH = meta.seenH || {};
      if ((g && g.s.completedCount >= 60) || Object.keys(seenH).length) {
        body += `<h3 class="sec">${X.hybrids}</h3>` + HYBRID_TYPES.map((id) => {
          if (!seenH[id]) return `<div class="cx unknown"><div class="cxic sil">${ICONS[id]}<span>?</span></div><div><h3>${X.unknown}</h3><p>${X.unknownHybrid}</p></div></div>`;
          const [a, b] = BUILDINGS[id].hybrid;
          return `<div class="cx"><div class="cxic">${ICONS[id]}</div><div><h3>${bName(id)}</h3><p>${T.buildings[id].desc}</p><div class="stats"><span class="tag">${bName(a)} + ${bName(b)}</span></div></div></div>`;
        }).join('') + c.sx.codexHybrids();
      }
    } else {
      const relic = tab === 'relics';
      const list = relic ? RELICS : CARDS;
      const seen = (relic ? meta.seenR : meta.seenC) || {};
      body = list.map((d) => {
        const t = relic ? T.relics[d.id] : T.cards[d.id];
        if (!seen[d.id]) return `<div class="cx unknown"><div class="cxic sil">${ICONS[d.id] || ICONS.card}<span>?</span></div><div><h3>${X.unknown}</h3><p>${relic ? X.unknownRelic : X.unknownCard}</p></div></div>`;
        return `<div class="cx"><div class="cxic">${ICONS[d.id] || ICONS.card}</div><div><h3>${t.name}</h3><p>${t.desc}</p><div class="stats"><span class="tag">${T.cardKinds[relic ? 'relic' : d.kind]}</span></div></div></div>`;
      }).join('');
    }
    const tabs = `<div class="seg tabs">${Object.entries(X.tabs).map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${v}</button>`).join('')}</div>`;
    const card = this.showCard('codex', `${head(X.title, ICONS.eye)}${tabs}${body}`, { wide: true });
    for (const b of card.querySelectorAll('[data-tab]')) b.onclick = () => this.showCodex(back, b.dataset.tab);
    $('[data-close]', card).onclick = back;
  },

  showLoss(info) {
    const c = this.c;
    const rows = info.top.map((t) => `<div class="kv"><span class="kvic">${enemyIcon(t.type)}</span><span>${T.entryNames[t.entry] || t.entry} · ${eName(t.type)}</span><b>−${t.light}</b></div>`).join('');
    const first = info.top[0];
    const text = first ? fill(U.lostText, { vstup: T.entryNames[first.entry] || first.entry, 'nepřítel': eName(first.type) }) : U.lostTextPlain;
    const enc = T.encouragements[Math.floor(Math.random() * T.encouragements.length)];
    const last = c.checkpoints[c.checkpoints.length - 1];
    const card = this.showCard('loss', `
      <div class="title-ic dim">${ICONS.light}</div>
      <h2 class="center">${U.lostTitle}</h2>
      <p>${text}</p>
      ${rows ? `<div><p class="muted">${U.lostMost}</p>${rows}</div>` : ''}
      <p class="quote">${enc}</p>
      <div class="col">
        <button class="btn primary big" id="lBack">${U.backToCheckpoint}</button>
        ${c.checkpoints.length > 1 ? `<button class="btn" id="lOther">${U.otherCheckpoint}</button>` : ''}
      </div>`);
    $('#lBack', card).onclick = () => c.restoreCheckpoint(last);
    const o = $('#lOther', card); if (o) o.onclick = () => this.showCheckpoints(() => this.showLoss(info));
  },

  showChapterEnd(ev) {
    const c = this.c;
    const best = ev.best ? `${ev.best.spec ? T.specs[SPECS[ev.best.type][ev.best.spec].id].name : bName(ev.best.type)} (${U.level} ${ev.best.level})` : '–';
    const card = this.showCard('chapter', `
      <div class="title-ic">${ICONS.light}</div>
      <h2 class="center">${fill(U.chapterDoneTitle, { n: ev.chapter })}</h2>
      <div>
        <div class="kv"><span>${U.chapterTime}</span><b>${fmtTime(ev.time)}</b></div>
        <div class="kv"><span>${U.chapterLight}</span><b>${ev.lightLost}</b></div>
        <div class="kv"><span>${U.chapterBest}</span><b>${best}</b></div>
        <div class="kv"><span>${U.chapterInterest}</span><b>${fmt(ev.interest)}</b></div>
        ${ev.sxStat ? `<div class="kv"><span>${ev.sxStat[0]}</span><b>${ev.sxStat[1] || ''}</b></div>` : ''}
      </div>
      ${ev.contentEnd ? `<p class="muted">${U.contentEnd}</p>` : ''}
      <button class="btn primary big" id="chOk">${U.continue}</button>`);
    $('#chOk', card).onclick = () => c.closeOverlay();
  },

  showUnlock(item) {
    const c = this.c;
    if (typeof item === 'string') item = { kind: 'building', id: item };
    const id = item.id;
    const name = item.kind === 'building' ? bName(id) : T.unlockNames[id];
    const icon = item.kind === 'building' ? ICONS[id] : item.kind === 'sector' ? ICONS.tile : item.kind === 'ability' ? ICONS[id] : item.kind === 'limit' ? ICONS[id === 'teleport2' ? 'teleport' : 'amplifier'] : item.kind === 'hybrid' ? ICONS.hybrids : id === 'level4' ? ICONS.level4 : ICONS.merge;
    const card = this.showCard('unlock', `
      <div class="title-ic pop">${icon}</div>
      <h2 class="center">${fill(U.newThing, { 'název': name })}</h2>
      <p class="center">${T.unlocks[id] || T.buildings[id]?.desc || ''}</p>
      <button class="btn primary big" id="uOk">${U.understood}</button>`);
    $('#uOk', card).onclick = () => c.closeOverlay();
  },

  // Epilogue after the finale: three lines one after another over the dawn.
  showEpilogue(byKnot, done) {
    const S = T.secret;
    const lines = [S.epilogue[0], S.epilogue[1], byKnot ? S.epilogueKnot : S.epilogue[2]];
    this.overlayKind = 'epilogue';
    this.overlay.className = 'clear epi';
    this.overlay.innerHTML = `<div class="epilogue">${lines.map((l, i) => `<p style="animation-delay:${1.2 + i * 2.6}s">${l}</p>`).join('')}<button class="btn primary" id="epOk" style="animation-delay:${1.2 + 3 * 2.6}s">${U.continue}</button></div>`;
    $('#epOk', this.overlay).onclick = () => done && done();
  },

  // Credits: a slow list of names, at the end a thank you.
  showCredits(done) {
    const S = T.secret;
    const rows = S.credits.map(([a, b]) => `<div class="cr"><span>${a}</span>${b ? `<b>${b}</b>` : ''}</div>`).join('');
    this.overlayKind = 'credits';
    this.overlay.className = 'clear epi';
    this.overlay.innerHTML = `<div class="credits"><div class="roll">${rows}<p class="crEnd">${S.creditsEnd}</p></div><button class="btn small" id="crSkip">${S.skip}</button></div>`;
    const end = () => { clearTimeout(this.crT); done && done(); };
    $('#crSkip', this.overlay).onclick = end;
    this.crT = setTimeout(() => { const b = $('#crSkip', this.overlay); if (b) { b.textContent = U.continue; b.classList.add('primary'); } }, 16000);
  },

  // Gallery controls (debug only): chapter moods and quality.
  showGalleryBar(onMood, onQuality) {
    let bar = $('#galleryBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'galleryBar'; bar.className = 'panel'; this.root.appendChild(bar); bar.addEventListener('pointerdown', (e) => e.stopPropagation()); }
    bar.innerHTML = `<b>${U.galleryTitle}</b><div class="gb">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button data-m="${n}">${n}</button>`).join('')}</div><div class="gb">${Object.entries(U.qualityNames).map(([k, v]) => `<button data-q="${k}">${v}</button>`).join('')}</div>`;
    for (const b of bar.querySelectorAll('[data-m]')) b.onclick = () => onMood(+b.dataset.m);
    for (const b of bar.querySelectorAll('[data-q]')) b.onclick = () => onQuality(b.dataset.q);
    void layout;
  },
};
