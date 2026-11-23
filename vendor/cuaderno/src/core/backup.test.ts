import assert from 'node:assert/strict';
import test from 'node:test';
import { BackupIntegrityError, createBackup, readBackup, UnsupportedBackupVersionError } from './backup.js';
import { emptyCorpus } from './model.js';

test('copia válida con caracteres latinos preserva todos los datos', async () => {
  const corpus = emptyCorpus();
  corpus.texts.push({
    id: 'latinum.1',
    title: 'César',
    latin: 'Helvētiī sequuntur, ōrātiōnem habent.\nPars secunda.',
    source: { author: 'César', work: null, reference: null },
    tagIds: [],
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
  });
  const json = await createBackup(corpus, new Date('2026-11-15T12:00:00.000Z'));
  const result = await readBackup(json);
  assert.deepEqual(result.corpus, corpus);
  assert.equal(result.metadata.textCount, 1);
  assert.equal(result.metadata.exportedAt, '2026-11-15T12:00:00.000Z');
});

test('el hash detecta modificación del texto guardado', async () => {
  const corpus = emptyCorpus();
  const json = await createBackup(corpus);
  const changed = JSON.parse(json) as { corpus: { notebooks: unknown[] }; sha256: string };
  changed.corpus.notebooks = [{ id: 'book.1', title: 'Modificado', textIds: [] }];
  await assert.rejects(readBackup(JSON.stringify(changed)), BackupIntegrityError);
});

test('rechaza hash modificado, archivo inválido y formato ajeno', async () => {
  const json = await createBackup(emptyCorpus());
  const changed = JSON.parse(json) as Record<string, unknown>;
  changed.sha256 = '0'.repeat(64);
  await assert.rejects(readBackup(JSON.stringify(changed)), BackupIntegrityError);
  await assert.rejects(readBackup('{incompleto'));
  await assert.rejects(readBackup(JSON.stringify({ ...changed, format: 'otra-app' })));
});

test('rechaza copias futuras sin cambiar el corpus', async () => {
  const json = JSON.parse(await createBackup(emptyCorpus())) as Record<string, unknown>;
  json.backupVersion = 100;
  await assert.rejects(readBackup(JSON.stringify(json)), UnsupportedBackupVersionError);
});

test('rechaza campos inesperados y archivos demasiado grandes', async () => {
  const json = JSON.parse(await createBackup(emptyCorpus())) as Record<string, unknown>;
  json.extra = true;
  await assert.rejects(readBackup(JSON.stringify(json)));
  await assert.rejects(readBackup(' '.repeat(32 * 1024 * 1024 + 1)), BackupIntegrityError);
});
