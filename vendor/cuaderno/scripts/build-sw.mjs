import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

async function list(dir) {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.posix.join(dir, item.name);
    if (item.isDirectory()) result.push(...await list(file));
    else if (!file.endsWith('service-worker.js')) result.push('./' + file.slice('dist/'.length));
  }
  return result;
}

const collatinus = 'dist/examinator-cuadernos/collatinus/';
const engineHash = createHash('sha256');
for (const asset of ['datos.js', 'incluidos.js', 'shim.js', 'motor.js']) {
  engineHash.update(await readFile(collatinus + asset));
}
const worker = await readFile(collatinus + 'worker.js', 'utf8');
await writeFile(collatinus + 'worker.js', worker.replace('__COLLATINUS_VERSION__',
  engineHash.digest('hex').slice(0, 24)));

const paths = (await list('dist')).sort();
if (!paths.some(p => p.includes('library/catalog.json'))
  || !paths.some(p => p.includes('library/works/'))) {
  throw new Error('No se puede preparar el acceso offline: la biblioteca está incompleta.');
}
// Fingerprint del contenido real, no solo de la lista de rutas.
const hash = createHash('sha256');
for (const filename of paths) {
  hash.update(filename);
  hash.update(await readFile('dist/' + filename.slice(2)));
}
const version = hash.digest('hex').slice(0, 16);
function source(files, cacheName, cachePrefix, optionalFiles = [], manualUpdates = false) {
  return [
  'const CACHE_NAME = ' + cacheName + ';',
  'const FILES = ' + JSON.stringify(files) + ';',
  'const MANUAL_UPDATES = ' + JSON.stringify(manualUpdates) + ';',
  `
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES);
${optionalFiles.length ? '    await Promise.allSettled(' + JSON.stringify(optionalFiles) + '.map(file => cache.add(file)));\n' : ''}    if (!MANUAL_UPDATES) await self.skipWaiting();
  })());
});
// El usuario decide cuándo aplicar la nueva versión: un worker en espera
// no sustituye la aplicación abierta ni pierde formularios sin confirmar.
self.addEventListener('message', (event) => {
  if (MANUAL_UPDATES && event.data && event.data.type === 'APPLY_UPDATE')
    event.waitUntil(self.skipWaiting());
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0])
    event.ports[0].postMessage({version: CACHE_NAME});
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(${cachePrefix}) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const found = await cache.match(event.request, { ignoreSearch: true });
    if (found) return found;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});`
].join('\n');
}
await writeFile('dist/service-worker.js',
  source(paths, JSON.stringify('cuaderno-textos-' + version), JSON.stringify('cuaderno-textos-')));

const examinatorPrefix = '"cuaderno-examinator:" + self.registration.scope + ":"';
const examinatorFiles = paths
  .filter(file => /^(?:\.\/(?:core|data|ports|storage|export|ui|library|examinator-cuadernos)\/|\.\/styles\.css$)/u.test(file))
  .map(file => '../' + file.slice(2));
examinatorFiles.push('./');
// El workflow de Pages sirve las fuentes y el icono desde la referencia compartida.
const referenceFonts = await readFile('reference/examinator2/fonts.css', 'utf8');
const optionalFiles = ['fonts.css', 'icon.png', ...[...referenceFonts.matchAll(/url\((fonts\/[^)]+)\)/gu)].map(match => match[1])]
  .map(file => '../../examinator2-original/' + file);
await writeFile('dist/examinator-cuadernos/service-worker.js',
  source(examinatorFiles, examinatorPrefix + ' + ' + JSON.stringify(version), examinatorPrefix, optionalFiles, true));
console.log('SW offline: ' + paths.length + ' archivos en caché, ' + paths.filter(p=>p.startsWith('./library/works/')).length + ' obras.');
