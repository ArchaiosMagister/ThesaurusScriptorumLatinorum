const shell = ATL_SHELL;
const files = ATL_FILES;
const prefix = 'atl-app:' + self.registration.scope + ':';
const cacheName = prefix + ATL_REVISION;
const marker = new URL('./offline-disponible', self.registration.scope).href;
const urls = new Set([...shell, ...files].map(path => new URL(path, self.registration.scope).href));
let preparing;

function downloadPack() {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(cacheName);
    const remaining = [...urls].filter(url => !shell.some(path => new URL(path, self.registration.scope).href === url));
    for (let offset = 0; offset < remaining.length; offset += 8) {
      await cache.addAll(remaining.slice(offset, offset + 8).map(url => new Request(url, { cache: 'reload' })));
    }
    await cache.put(marker, new Response('ready'));
  })().finally(() => { preparing = null; });
  return preparing;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shell.map(path =>
      new Request(new URL(path, self.registration.scope), { cache: 'reload' })
    ));
    const previous = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== cacheName);
    for (const name of previous) {
      if (await (await caches.open(name)).match(marker)) {
        await downloadPack();
        break;
      }
    }
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
      () => event.ports[0]?.postMessage({ ok: true }),
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
