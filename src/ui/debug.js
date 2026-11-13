// Debug panel, only with ?debug=1 in the address.
// ?debug=1&scena=galerie opens the gallery: every object next to each other, with chapter moods to switch.
import { triggerSecret } from '../secrets/index.js';
import { CONTENT_MAX_WAVE } from '../data/waves.js';

export function installDebug(app) {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:calc(env(safe-area-inset-left) + 6px);top:calc(env(safe-area-inset-top) + 112px);z-index:50;font:12px system-ui;';
  box.innerHTML = `
    <button id="dbgT" style="background:#3B2F2F;color:#fff;border-radius:8px;padding:6px 9px;font-weight:700">DBG</button>
    <div id="dbgP" style="display:none;margin-top:4px;background:#FBF3E4;border-radius:10px;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);width:200px">
      <div id="dbgF" style="margin-bottom:6px;color:#8a776a"></div>
      <div style="display:flex;gap:4px;margin-bottom:6px"><input id="dbgW" type="number" min="1" max="${CONTENT_MAX_WAVE}" value="10" style="width:56px"><button data-a="wave">Skok na vlnu</button></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px"><button data-a="gold">+500 zlata</button><button data-a="light">+50 světla</button><button data-a="dark">−30 světla</button><button data-a="kill">Zabít vše</button><button data-a="card">Karta</button><button data-a="relic">Relikvie</button><button data-a="xp">+XP Knot</button><button data-a="end">Konec hry</button></div>
      <div style="display:flex;gap:4px;margin-bottom:6px"><input id="dbgM" type="number" min="0" max="10" value="0" style="width:56px"><button data-a="mood">Nálada (0 = podle vlny)</button></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px"><button data-a="hud">Skrýt rozhraní</button><button data-a="gallery">Galerie</button></div>
      <div style="display:flex;gap:4px"><input id="dbgE" placeholder="kód" style="width:70px"><button data-a="event">Událost</button></div>
    </div>`;
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.getElementById('app').appendChild(box);
  for (const b of box.querySelectorAll('button')) Object.assign(b.style, { padding: b.style.padding || '5px 7px', borderRadius: b.style.borderRadius || '7px', background: b.style.background || '#F4E9D8' });
  const panel = box.querySelector('#dbgP');
  let hudHidden = false;
  box.querySelector('#dbgT').onclick = () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
  box.querySelector('#dbgP').addEventListener('click', (e) => {
    const a = e.target.dataset?.a;
    if (!a) return;
    const g = app.game;
    if (a === 'gold') g.s.gold += 500;
    if (a === 'light') g.s.light = Math.min(g.s.maxLight, g.s.light + 50);
    if (a === 'dark') g.s.light = Math.max(1, g.s.light - 30);
    if (a === 'kill') for (const en of g.s.enemies) g.damage(en, 1e9, 'strela', null);
    if (a === 'card' || a === 'relic') { g.s.picks.push({ kind: a, wave: g.s.completedCount }); g.nextPick(); }
    if (a === 'xp') g.heroXp(60);
    if (a === 'end') { g.s.finished = true; app.meta.finished = 1; app.saveMeta(); app.gameWon({ byKnot: false }); return; }
    if (a === 'mood') app.moodOverride = +box.querySelector('#dbgM').value || 0;
    if (a === 'hud') { hudHidden = !hudHidden; document.getElementById('hud').style.visibility = hudHidden ? 'hidden' : ''; }
    if (a === 'gallery') { location.search = '?debug=1&nosw=1&scena=galerie'; return; }
    if (a === 'wave') {
      const n = Math.max(1, Math.min(CONTENT_MAX_WAVE, +box.querySelector('#dbgW').value || 1));
      g.s.waves = []; g.s.enemies = []; g.s.projectiles = []; g.s.fams = {};
      g.s.nextWave = n; g.s.completedCount = n - 1; g.s.completedChapters = Math.floor((n - 1) / 10);
      g.s.lost = false; if (g.s.light <= 0) g.s.light = g.s.maxLight;
      g.s.pick = null; g.s.picks = []; g.s.fin = null; g.s.dark = null;
      g.rebuild(); g.applyMapEvents(false); g.ensureEntriesOpen(); app.hud.cache = {}; app.hud.hideOverlay();
    }
    if (a === 'event') {
      const code = box.querySelector('#dbgE').value.trim();
      if (!triggerSecret(code, { app, game: g })) app.toast('Neznámý kód události.');
    }
    app.save();
  });
  let frames = 0, t0 = performance.now();
  const fps = box.querySelector('#dbgF');
  const tick = (t) => {
    frames++;
    if (t - t0 > 1000) {
      const info = app.view.renderer.info.render;
      fps.textContent = `${Math.round(frames * 1000 / (t - t0))} fps · ${info.calls} volání · ${Math.round(info.triangles / 1000)}k troj. · vlna ${app.game?.currentWaveNumber()} · nepřátel ${app.game?.s.enemies.length}`;
      frames = 0; t0 = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
