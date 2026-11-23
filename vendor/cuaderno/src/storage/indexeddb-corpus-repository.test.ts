import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { emptyCorpus, type CorpusV1 } from '../core/model.js';
import { IndexedDbCorpusRepository, RevisionConflictError } from './indexeddb-corpus-repository.js';

let counter = 0;
const factory = new IDBFactory();

function repository(): { name: string; repo: IndexedDbCorpusRepository } {
  const name = 'cuaderno-test-' + ++counter;
  return { name, repo: new IndexedDbCorpusRepository(name, factory) };
}

function withText(content = 'Ōrātiō de Helvētiīs'): CorpusV1 {
  const corpus = emptyCorpus();
  corpus.texts.push({
    id: 'text.1',
    title: 'Prueba',
    latin: content,
    source: { author: null, work: null, reference: null },
    tagIds: [],
    createdAt: '2026-11-15T12:00:00.000Z',
    updatedAt: '2026-11-15T12:00:00.000Z',
  });
  return corpus;
}

test('la primera lectura no crea ningún contenido docente', async () => {
  const { repo } = repository();
  assert.deepEqual(await repo.load(), { corpus: emptyCorpus(), revision: 0 });
});

test('persiste un corpus y lo recupera desde otra instancia', async () => {
  const { name, repo } = repository();
  const data = withText();
  assert.deepEqual(await repo.save(data, 0), { corpus: data, revision: 1 });
  const second = new IndexedDbCorpusRepository(name, factory);
  assert.deepEqual(await second.load(), { corpus: data, revision: 1 });
});

test('se conservan los textos y crece la revisión con cada escritura', async () => {
  const { repo } = repository();
  await repo.save(withText(), 0);
  const changed = withText('cōnsul, cōnsulis');
  await repo.save(changed, 1);
  const loaded = await repo.load();
  assert.deepEqual(loaded, { corpus: changed, revision: 2 });
});

test('una pestaña antigua no puede sobrescribir una revisión nueva', async () => {
  const { name, repo } = repository();
  await repo.save(withText('A'), 0);
  const oldTab = new IndexedDbCorpusRepository(name, factory);
  await repo.save(withText('B'), 1);
  await assert.rejects(oldTab.save(withText('C'), 1), RevisionConflictError);
  assert.equal((await repo.load()).corpus.texts[0]?.latin, 'B');
});

test('dos escrituras simultáneas del mismo origen no pisan datos', async () => {
  const { repo } = repository();
  const results = await Promise.allSettled([repo.save(withText('A'), 0), repo.save(withText('B'), 0)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  assert.equal((await repo.load()).revision, 1);
});

test('si el documento no pasa la validación no se altera el registro existente', async () => {
  const { repo } = repository();
  await repo.save(withText('Texto válido'), 0);
  const invalid = withText('Texto inválido');
  invalid.texts[0]!.tagIds = ['etiqueta.inexistente'];
  await assert.rejects(repo.save(invalid, 1), /etiqueta inexistente/);
  assert.equal((await repo.load()).corpus.texts[0]?.latin, 'Texto válido');
});

test('rechaza revisiones inválidas sin modificar la base', async () => {
  const { repo } = repository();
  await assert.rejects(repo.save(withText(), -1));
  await assert.rejects(repo.save(withText(), NaN));
  assert.equal((await repo.load()).revision, 0);
});

test('detecta registros corruptos y nunca los sustituye por un corpus vacío', async () => {
  const { name, repo } = repository();
  await repo.save(withText('Texto original'), 0);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(name, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('corpus', 'readwrite');
    tx.objectStore('corpus').put({ key: 'current', revision: 3, corpus: { schemaVersion: 1 } });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  await assert.rejects(repo.load(), /deben ser listas|campo obligatorio ausente/);
  await assert.rejects(repo.save(withText('Nuevo'), 3));
});

test('una versión futura de IndexedDB se rechaza sin borrar los registros', async () => {
  const { name, repo } = repository();
  await repo.save(withText('Original'), 0);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(name, 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  await assert.rejects(repo.load());
  await assert.rejects(repo.save(withText('No sobrescribir'), 1));
});
