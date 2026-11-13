// Persistent storage: IndexedDB with localStorage as a mirror / fallback.
// The current game is written to both; on load the newer copy wins.
import { wrapSave, migrate } from './save-format.js';

const DB_NAME = 'posledni-majak';
const STORE = 'kv';
const LS_PREFIX = 'pm:';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (!('indexedDB' in self)) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch (e) { resolve(undefined); }
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

function lsGet(key) {
  try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; }
}
function lsSet(key, value) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

export async function requestPersist() {
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
}

function newest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
}

// ----- current game -----

export function saveGame(state, sync = false) {
  const save = wrapSave(state);
  lsSet('current', save);
  if (!sync) idbSet('current', save);
  else idbSet('current', save); // best effort; localStorage already has it
  return save;
}

export async function loadGame() {
  const a = await idbGet('current');
  const b = lsGet('current');
  const s = newest(a, b);
  if (!s) return null;
  try { return migrate(s); } catch (e) { console.warn('save unreadable', e); return null; }
}

export async function clearGame() {
  try { localStorage.removeItem(LS_PREFIX + 'current'); } catch (e) { /* ignore */ }
  await idbSet('current', null);
}

// ----- checkpoints -----

export async function loadCheckpoints() {
  const a = await idbGet('checkpoints');
  const b = lsGet('checkpoints');
  const list = (a && b) ? ((b.savedAt || 0) > (a.savedAt || 0) ? b : a) : (a || b);
  if (!list || !Array.isArray(list.items)) return [];
  const out = [];
  for (const it of list.items) { try { out.push(migrate(it)); } catch (e) { /* skip */ } }
  return out;
}

export async function saveCheckpoints(items) {
  const list = { savedAt: Date.now(), items: items.slice(-12) };
  idbSet('checkpoints', list);
  // localStorage may be small: keep only the newest few there.
  lsSet('checkpoints', { savedAt: list.savedAt, items: items.slice(-4) });
}

export function makeCheckpoint(state, label) {
  return wrapSave(JSON.parse(JSON.stringify(state)), { label });
}

// ----- settings (outside of a play-through) -----

const DEFAULT_SETTINGS = {
  speed: 1, quality: 'medium', saver: false, shake: true,
  music: 60, sfx: 80, mute: true, soundAsked: false,
  orient: 'auto', tips: true, tutorial: true,
};

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(lsGet('settings') || {}) };
}

export function saveSettings(s) {
  lsSet('settings', s);
  idbSet('settings', s);
}

// ----- things that stay across play-throughs: codex discoveries, tutorial progress -----

const DEFAULT_META = { seenE: {}, seenB: {}, tut: {} };

export function loadMeta() {
  const m = lsGet('meta') || {};
  return { ...DEFAULT_META, ...m, seenE: { ...(m.seenE || {}) }, seenB: { ...(m.seenB || {}) }, tut: { ...(m.tut || {}) } };
}

export function saveMeta(m) {
  lsSet('meta', m);
  idbSet('meta', m);
}

// ----- backup as text -----

export function exportBackup(state, checkpoints, meta) {
  const data = { app: 'posledni-majak', current: wrapSave(state), checkpoints, meta: meta || null };
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importBackup(text) {
  const json = decodeURIComponent(escape(atob(text.trim())));
  const data = JSON.parse(json);
  if (data.app !== 'posledni-majak' || !data.current) throw new Error('bad backup');
  return { current: migrate(data.current), checkpoints: (data.checkpoints || []).map(migrate), meta: data.meta && typeof data.meta === 'object' ? data.meta : null };
}
