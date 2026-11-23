import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { createBackup, readBackup } from '../core/backup.js';
import { emptyCorpus, type CorpusV1 } from '../core/model.js';
import { IndexedDbCorpusRepository } from '../storage/indexeddb-corpus-repository.js';
import {
  getStoredVerificationText,
  syncVerificationEditor,
  VERIFICATION_TEXT_ID,
} from './verification-editor.js';

function withTestText(latin: string): CorpusV1 {
  return {
    ...emptyCorpus(),
    texts: [{
      id: VERIFICATION_TEXT_ID,
      title: 'Texto de comprobación',
      latin,
      source: { author: null, work: null, reference: null },
      tagIds: [],
      createdAt: '2026-11-15T12:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    }],
  };
}

test('al abrir de nuevo se muestra el valor real de IndexedDB, no el ejemplo del HTML', async () => {
  const factory = new IDBFactory();
  const repo = new IndexedDbCorpusRepository('test-ui-reload', factory);
  await repo.save(withTestText('Helvētiī prīmō impetū'), 0);
  const editor = { value: 'Texto de ejemplo sin guardar' };
  const snapshot = await new IndexedDbCorpusRepository('test-ui-reload', factory).load();
  assert.equal(syncVerificationEditor(snapshot.corpus, editor), true);
  assert.equal(editor.value, 'Helvētiī prīmō impetū');
});

test('restaurar una copia reescribe el campo editable con el texto anterior', async () => {
  const factory = new IDBFactory();
  const repo = new IndexedDbCorpusRepository('test-ui-restore', factory);
  const original = withTestText('Ōrātiō Helvētiōrum');
  const newer = withTestText('Versión modificada');
  await repo.save(original, 0);
  const backup = await createBackup((await repo.load()).corpus);
  await repo.save(newer, 1);
  const editor = { value: newer.texts[0]!.latin };

  const decoded = await readBackup(backup);
  const restored = await repo.save(decoded.corpus, 2);
  assert.equal(syncVerificationEditor(restored.corpus, editor), true);
  assert.equal(editor.value, 'Ōrātiō Helvētiōrum');
  assert.equal((await repo.load()).corpus.texts[0]?.latin, 'Ōrātiō Helvētiōrum');
  assert.equal(restored.revision, 3);
});

test('restaurar un corpus vacío no deja visible texto obsoleto', () => {
  const editor = { value: 'Versión que ya no existe' };
  assert.equal(syncVerificationEditor(emptyCorpus(), editor), false);
  assert.equal(editor.value, '');
  assert.equal(getStoredVerificationText(emptyCorpus()), null);
});

test('en un dispositivo sin registros se conserva el ejemplo inicial', () => {
  const editor = { value: 'Ejemplo inicial' };
  assert.equal(syncVerificationEditor(emptyCorpus(), editor, { keepExampleIfMissing: true }), false);
  assert.equal(editor.value, 'Ejemplo inicial');
});

test('una importación inválida no requiere sincronizar ni alterar un borrador', async () => {
  const backup = JSON.parse(await createBackup(emptyCorpus())) as Record<string, unknown>;
  backup.sha256 = '0'.repeat(64);
  const editor = { value: 'Mi texto sin guardar' };
  await assert.rejects(readBackup(JSON.stringify(backup)));
  assert.equal(editor.value, 'Mi texto sin guardar');
});
