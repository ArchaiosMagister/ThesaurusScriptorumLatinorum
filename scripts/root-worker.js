const shell = ATL_SHELL;
const files = ATL_FILES;
const digests = ATL_DIGESTS;
const prefix = 'atl-app:' + self.registration.scope + ':';
const cacheName = prefix + ATL_REVISION;
const marker = new URL('./offline-disponible', self.registration.scope).href;
const urls = new Set([...shell, ...files].map(path => new URL(path, self.registration.scope).href));
const assetUrl = path => new URL(path, self.registration.scope).href;
let preparing;
const paths = new Map([...shell, ...files].map(path => [assetUrl(path), path]));
const digestFor = path => digests[path === './' ? './index.html' : path];

async function matchesDigest(response, path) {
  if (!response?.ok || !digestFor(path)) return false;
  const bytes = await response.clone().arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('') === digestFor(path);
}

async function verifiedFetch(path) {
  const response = await fetch(new Request(assetUrl(path), { cache: 'reload' }));
  if (!await matchesDigest(response, path))
    throw new Error('Recurso no válido para esta versión: ' + path);
  return response;
}

// Verify the entire batch before writing: an interrupted batch is retried.
async function addVerified(cache, paths) {
  const responses = await Promise.all(paths.map(path => verifiedFetch(path)));
  for (let index = 0; index < paths.length; index++)
    await cache.put(assetUrl(paths[index]), responses[index]);
}

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
          if (retained && await matchesDigest(retained, path)) {
            await cache.put(url, retained);
            reused++;
            continue;
          }
        }
        missing.push(path);
      }
      if (missing.length) {
        await addVerified(cache, missing);
        downloaded += missing.length;
      }
    }
    // Never mark a partial download as complete. A retry uses cached progress.
    await cache.put(marker, new Response(JSON.stringify({ digests, verified: true }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    return { reused, downloaded, total: files.length };
  })().finally(() => { preparing = null; });
  return preparing;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await addVerified(cache, shell);
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
    event.waitUntil((async () => {
      // An explicit activation changes the controller of all clients. Do not
      // switch another editing window to a new runtime behind its back.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const otherWindow = windows.some(client => client.id !== event.source?.id &&
        client.url.startsWith(self.registration.scope) && client.frameType !== 'nested' &&
        client.frameType !== 'none');
      if (otherWindow) {
        event.ports[0]?.postMessage({ ok: false, message: 'Cierra las otras ventanas de Thesaurus antes de actualizar.' });
        return;
      }
      await self.skipWaiting();
      event.ports[0]?.postMessage({ ok: true });
    })().catch(error => event.ports[0]?.postMessage({ ok: false, message: error.message })));
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
  if (event.request.method !== 'GET') return;
  // OAuth and other root navigations with parameters retain their original path.
  if (url.search && (url.pathname === new URL('./', self.registration.scope).pathname ||
      url.pathname === new URL('./index.html', self.registration.scope).pathname)) return;
  url.search = '';
  if (!urls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const saved = await cache.match(url.href);
    if (saved) return saved;
    // Never mix an old application with a newer deployment's uncached files.
    // Online loading is still available as long as the bytes match this worker.
    return verifiedFetch(paths.get(url.href));
  })());
});
