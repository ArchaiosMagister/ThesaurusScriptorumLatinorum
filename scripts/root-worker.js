const shell = ATL_SHELL;
const files = ATL_FILES;
const digests = ATL_DIGESTS;
const prefix = 'atl-app:' + self.registration.scope + ':';
const cacheName = prefix + ATL_REVISION;
const marker = new URL('./offline-disponible', self.registration.scope).href;
const urls = new Set([...shell, ...files].map(path => new URL(path, self.registration.scope).href));
const assetUrl = path => new URL(path, self.registration.scope).href;
let preparing;

/**
 * A completed pack from the previous worker can donate unchanged responses.
 * Old packs marked merely "ready" have no per-file fingerprints: for those,
 * redownload instead of assuming that a URL still refers to identical bytes.
 */
async function previousPack() {
  const names = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== cacheName).reverse();
  for (const name of names) {
    const cache = await caches.open(name);
    const ready = await cache.match(marker);
    if (!ready) continue;
    let hashes = null;
    try {
      const stored = await ready.json();
      if (stored && stored.digests && typeof stored.digests === 'object' &&
          !Array.isArray(stored.digests)) hashes = stored.digests;
    } catch { /* Las versiones anteriores guardaban 'ready' sin huellas. */ }
    return { cache, hashes };
  }
  return null;
}

async function downloadPack(previous = null) {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(cacheName);
    let reused = 0, downloaded = 0;
    for (let offset = 0; offset < files.length; offset += 8) {
      const missing = [];
      for (const path of files.slice(offset, offset + 8)) {
        const url = assetUrl(path);
        if (await cache.match(url)) { reused++; continue; }
        if (previous?.hashes?.[path] === digests[path]) {
          const retained = await previous.cache.match(url);
          if (retained) {
            await cache.put(url, retained);
            reused++;
            continue;
          }
        }
        missing.push(new Request(url, { cache: 'reload' }));
      }
      if (missing.length) {
        await cache.addAll(missing);
        downloaded += missing.length;
      }
    }
    // Never mark a partial download as complete. A retry uses cached progress.
    await cache.put(marker, new Response(JSON.stringify({ digests }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    return { reused, downloaded, total: files.length };
  })().finally(() => { preparing = null; });
  return preparing;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shell.map(path => new Request(assetUrl(path), { cache: 'reload' })));
    const previous = await previousPack();
    if (previous) await downloadPack(previous);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'activate') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data === 'prepare-offline') {
    event.waitUntil(downloadPack().then(
      result => event.ports[0]?.postMessage({ ok: true, ...result }),
      error => event.ports[0]?.postMessage({ ok: false, message: error.message })
    ));
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.hash = '';
  if (event.request.method !== 'GET' || url.search || !urls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(url.href) || fetch(event.request);
  })());
});
