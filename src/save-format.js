// Save format with a version number and migrations, so a game update never deletes progress.
// Pure module: used by the browser and by Node tests.

export const SAVE_VERSION = 1;

// Each migration takes a save of version N and returns version N+1.
const MIGRATIONS = {
  // 1: (save) => { ...; save.version = 2; return save; },
};

export function wrapSave(state, extra = {}) {
  return { version: SAVE_VERSION, savedAt: Date.now(), ...extra, state };
}

export function migrate(save) {
  if (!save || typeof save !== 'object' || !save.state) throw new Error('bad save');
  let s = save;
  let guard = 50;
  while (s.version < SAVE_VERSION && guard-- > 0) {
    const fn = MIGRATIONS[s.version];
    if (!fn) throw new Error('no migration from ' + s.version);
    s = fn(s);
  }
  if (s.version !== SAVE_VERSION) throw new Error('unknown save version ' + s.version);
  return s;
}
