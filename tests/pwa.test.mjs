import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { buildRootWorker } from '../scripts/root-pwa.mjs';

const shell = ['index.html', 'manifest.webmanifest', 'navigation.js', 'styles.css', 'pwa.js',
  'backup-ui.js', 'recovery-history.js', 'backup-store.js', 'dropbox-sync.js', 'dropbox-plan.js', 'curriculum-templates.js', 'partial-backup.js'];

function memoryCaches(network) {
  const databases = new Map();
  const asUrl = value => typeof value === 'string' ? value : value.url;
  return {
    async keys() { return [...databases.keys()]; },
    async delete(name) { return databases.delete(name); },
    async open(name) {
      if (!databases.has(name)) {
        const entries = new Map();
        databases.set(name, {
          async match(key) { return entries.get(asUrl(key))?.clone(); },
          async put(key, response) { entries.set(asUrl(key), response.clone()); },
          async addAll(requests) {
            // Cache.addAll is atomic for each batch.
            const results = await Promise.all(requests.map(async request => {
              const response = await network(request);
              if (!response.ok) throw Error('HTTP ' + response.status);
              return [request.url, response];
            }));
            for (const [url, response] of results) entries.set(url, response.clone());
          }
        });
      }
      return databases.get(name);
    }
  };
}

function simulatedWorker(source, caches, scope) {
  const handlers = new Map();
  const self = {
    registration: { scope },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(name, listener) { handlers.set(name, listener); }
  };
  runInNewContext(source, { self, caches, Response, Request, URL });
  return async (type, data = null) => {
    const tasks = [], messages = [];
    const event = {
      data,
      ports: [{ postMessage(message) { messages.push(message); } }],
      waitUntil(task) { tasks.push(task); }
    };
    handlers.get(type)(event);
    await Promise.all(tasks);
    return messages[0];
  };
}

test('la PWA reanuda un paquete incompleto y migra solo recursos con igual SHA-256', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tsl-pwa-cache-'));
  const scope = 'https://example.test/ThesaurusScriptorumLatinorum/';
  const assets = Array.from({ length: 10 }, (_, index) =>
    'modulos/examinator/asset-' + String(index).padStart(2, '0') + '.js');
  try {
    for (const path of [...shell, ...assets, 'modulos/examinator/sw.js']) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'contenido de ' + path);
    }
    let deny = 'modulos/examinator/asset-09.js';
    const requests = [];
    const network = async request => {
      const path = new URL(request.url).pathname.slice(new URL(scope).pathname.length);
      requests.push(path);
      if (path === deny) return new Response('bloqueado', { status: 503 });
      return new Response(await readFile(join(root, path || 'index.html')));
    };
    const caches = memoryCaches(network);
    await buildRootWorker(root);
    const oldSource = await readFile(join(root, 'sw.js'), 'utf8');
    const digestMatch = oldSource.match(/const digests = (\{[^\n;]+\});/);
    assert.ok(digestMatch, 'el Service Worker incluye huellas individuales');
    const hashes = JSON.parse(digestMatch[1]);
    assert.equal(hashes['./' + assets[0]],
      createHash('sha256').update('contenido de ' + assets[0]).digest('hex'));
    assert.equal(hashes['./modulos/examinator/sw.js'], undefined,
      'no se añade un segundo Service Worker al paquete');

    const first = simulatedWorker(oldSource, caches, scope);
    await first('install');
    assert.equal((await caches.keys()).length, 1);
    const interrupted = await first('message', 'prepare-offline');
    assert.equal(interrupted.ok, false);
    const oldCache = await caches.open((await caches.keys())[0]);
    assert.equal(await oldCache.match(new URL('offline-disponible', scope).href), undefined,
      'no debe darse por completo el paquete si falla un lote');

    deny = null;
    const resumed = await first('message', 'prepare-offline');
    assert.deepEqual({ ok: resumed.ok, downloaded: resumed.downloaded, reused: resumed.reused },
      { ok: true, downloaded: 2, reused: 8 });
    const again = await first('message', 'prepare-offline');
    assert.deepEqual({ ok: again.ok, downloaded: again.downloaded, reused: again.reused },
      { ok: true, downloaded: 0, reused: 10 });
    const unchanged = assets[8];
    const originalRequests = requests.filter(path => path === unchanged).length;

    await writeFile(join(root, assets[0]), 'nueva revisión del primer fichero');
    await buildRootWorker(root);
    const newSource = await readFile(join(root, 'sw.js'), 'utf8');
    assert.notEqual(oldSource, newSource, 'cambiar un recurso cambia la revisión');
    deny = unchanged; // La migración debe funcionar sin acceder al servidor para este archivo.
    const next = simulatedWorker(newSource, caches, scope);
    await next('install');
    assert.equal(requests.filter(path => path === unchanged).length, originalRequests);
    assert.equal(requests.filter(path => path === assets[0]).length, 2,
      'solo se descarga de nuevo el archivo que ha cambiado');
    const names = await caches.keys();
    assert.equal(names.length, 2, 'el paquete viejo no se borra durante la instalación');
    const newCache = await caches.open(names[1]);
    assert.equal(await (await newCache.match(new URL(unchanged, scope).href)).text(),
      'contenido de ' + unchanged);
    await next('activate');
    assert.deepEqual(await caches.keys(), [names[1]], 'al activar se limpia solo la caché antigua');
    const ready = JSON.parse(await (await newCache.match(new URL('offline-disponible', scope).href)).text());
    assert.match(ready.digests['./' + assets[0]], /^[a-f0-9]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
