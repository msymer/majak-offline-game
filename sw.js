// Service worker: caches every file of the game at install, then serves cache first.
// The file list and version are written by tools/build.mjs – do not edit them by hand.

// BUILD-START
const VERSION = '1.0.0-22dcb29b23';
const FILES = [
  "./",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./src/audio/audio.js",
  "./src/data/buildings.js",
  "./src/data/cards.js",
  "./src/data/enemies.js",
  "./src/data/map.js",
  "./src/data/rules.js",
  "./src/data/texts.cs.js",
  "./src/data/waves.js",
  "./src/main.js",
  "./src/render/fx.js",
  "./src/render/geo.js",
  "./src/render/island.js",
  "./src/render/late.js",
  "./src/render/models.js",
  "./src/render/models2.js",
  "./src/render/palette.js",
  "./src/render/post.js",
  "./src/render/scene.js",
  "./src/save-format.js",
  "./src/secrets/finale.js",
  "./src/secrets/index.js",
  "./src/secrets/journal.js",
  "./src/secrets/sim.js",
  "./src/secrets/texts.js",
  "./src/secrets/texts2.js",
  "./src/secrets/ui.js",
  "./src/secrets/view.js",
  "./src/secrets/world.js",
  "./src/sim/combat.js",
  "./src/sim/game.js",
  "./src/sim/grid.js",
  "./src/sim/late.js",
  "./src/sim/progress.js",
  "./src/sim/rng.js",
  "./src/storage.js",
  "./src/ui/debug.js",
  "./src/ui/dom.js",
  "./src/ui/hud.js",
  "./src/ui/icons-late.js",
  "./src/ui/icons-more.js",
  "./src/ui/icons.js",
  "./src/ui/input.js",
  "./src/ui/layout.js",
  "./src/ui/screens.js",
  "./src/ui/style.css",
  "./src/ui/tutorial.js",
  "./vendor/three.LICENSE.txt",
  "./vendor/three.module.min.js",
  "./src/version.js"
];
// BUILD-END

const CACHE = 'posledni-majak-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
  // No skipWaiting here: a new version waits until the player taps "Aktualizovat".
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('posledni-majak-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      const hit = await cache.match('./index.html');
      if (hit) return hit;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch (e) { return new Response('', { status: 504 }); }
  })());
});
