// Secret content (from 05_TAJNE.md) lives in this folder.
// Each event has a code (e.g. 'P-59') and a trigger function used by debug mode (?debug=1).
// The game-logic side is in sim.js and finale.js, journal pages in journal.js, texts in texts.js.
import { secretSim, debugSpawnDark } from './sim.js';
import { finale } from './finale.js';

// Puts the game right before a wave (for the debug triggers).
function jump(app, game, n) {
  const s = game.s;
  s.waves = []; s.enemies = []; s.projectiles = []; s.fams = {};
  s.nextWave = n; s.completedCount = n - 1; s.completedChapters = Math.floor((n - 1) / 10);
  s.lost = false; if (s.light <= 0) s.light = s.maxLight;
  s.pick = null; s.picks = []; s.fin = null; s.dark = null;
  game.rebuild(); game.applyMapEvents(false); game.ensureEntriesOpen();
  app.hud.cache = {}; app.hud.hideOverlay();
}

export const SECRET_EVENTS = {
  // Gate guardian drags Knot along when it jumps to another entry.
  'P-59': {
    trigger({ game }) {
      const e = game.s.enemies.find((x) => x.type === 'strazce_brany' && !x.dead);
      if (e) { secretSim.onBossRelocate(game, e); return; }
      const h = game.s.hero;
      h.confusedT = 2.5;
      game.emit({ k: 'secret', code: 'P-59', fx: h.x, fy: h.y, x: h.x, y: h.y });
    },
  },
  // Swarm queen: her little ones become butterflies (starts wave 60, the queen has little life).
  'P-46': {
    trigger({ app, game }) {
      jump(app, game, 60); game.startWave(); app.paused = false;
      for (let i = 0; i < 30 * 12; i++) game.step();
      const q = game.s.enemies.find((e) => e.type === 'kralovna_roje');
      if (q) game.damage(q, q.hp + 1, 'strela', null);
    },
  },
  // The deep worm: comes up from the pond, swallows Knot at the second coming up.
  'P-60': { trigger({ app, game }) { game.s.sec.pond = 0; game.s.sec.swallowed = 0; jump(app, game, 80); game.startWave(); app.paused = false; } },
  // The dark Knot.
  'P-61': { trigger({ game }) { if (game.phase() === 'combat') debugSpawnDark(game); else game.s.sec.dark = 0; } },
  // The siege tower's wreck with the lantern.
  'P-62': { trigger({ game }) { const h = game.s.hero; game.s.items.push({ id: game.s.nextId++, kind: 'wreck', x: h.x + 1, y: h.y - 1, until: game.s.completedCount + 2 }); } },
  // Wave 99, the messenger.
  'P-63': { trigger({ app, game }) { jump(app, game, 99); } },
  // The finale: jumps before wave 100; FIN3 straight into the quiet part.
  FIN: { trigger({ app, game }) { jump(app, game, 100); } },
  FIN3: {
    trigger({ app, game }) {
      jump(app, game, 100); game.startWave(); app.paused = false;
      game.step();
      const f = game.s.fin, w = game.waveOf(100);
      const e = game.s.enemies.find((x) => x.type === 'srdce_mlhy');
      if (e) finale.split(game, e);
      game.flushPending();
      for (const id of f.parts) { const p = game.findEnemy(id); if (p) game.damage(p, p.hp + 1, 'strela', null); }
      finale.calm(game, w);
      game.flushPending();
    },
  },
  // After the end: Hugo on the bench (and endless mode right away).
  'P-57': { trigger({ app, game }) { game.s.finished = true; app.meta.finished = 1; app.saveMeta(); app.hud.cache = {}; } },
};

// Stage 5 added the rest (see README.md in this folder); their debug triggers are in ui.js (SecretUi.debug).
export const SECRET_CODES_DONE = ['P-46', 'P-57', 'P-58', 'P-59', 'P-60', 'P-61', 'P-62', 'P-63'];

export function triggerSecret(code, ctx) {
  const ev = SECRET_EVENTS[code];
  if (!ev) return !!(ctx.app.sx && ctx.app.sx.debug(code));
  ev.trigger(ctx);
  return true;
}
