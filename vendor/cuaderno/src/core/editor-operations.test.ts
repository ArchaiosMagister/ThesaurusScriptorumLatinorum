import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCorpus } from './model.js';
import { notebookTexts, upsertText, deleteText, upsertNotebook, addTextToNotebook, moveTextInNotebook, removeTextFromNotebook, removeNotebook } from './editor-operations.js';
const NOW = '2026-11-15T14:00:00.000Z';
const data = { title: 'César I 1', latin: 'Gallia est omnis divisa in partes tres.', author: 'César', work: 'De bello Gallico', reference: '1.1.1' };

test('crear y editar mantiene identificador, fecha inicial y etiquetas', () => {
  const first = upsertText(emptyCorpus(), data, 'text.1', NOW);
  const updated = upsertText(first, { ...data, id: 'text.1', latin: 'Gallia est omnis.' }, 'ignored', '2026-11-15T14:01:00.000Z');
  assert.equal(updated.texts.length, 1);
  assert.equal(updated.texts[0]?.id, 'text.1');
  assert.equal(updated.texts[0]?.createdAt, NOW);
  assert.equal(updated.texts[0]?.latin, 'Gallia est omnis.');
  assert.equal(first.texts[0]?.latin, data.latin);
});

test('rechaza texto vacío y protege el corpus original', () => {
  const first = upsertText(emptyCorpus(), data, 'text.1', NOW);
  assert.throws(() => upsertText(first, { ...data, title: '' }, 'new', NOW));
  assert.equal(first.texts.length, 1);
});

test('organizar y reordenar mantiene referencias sin duplicar textos', () => {
  let corpus = emptyCorpus();
  corpus = upsertText(corpus, data, 'text.1', NOW);
  corpus = upsertText(corpus, { ...data, title: 'Otro', latin: 'Roma erat.' }, 'text.2', NOW);
  corpus = upsertNotebook(corpus, 'Cuaderno de clase', 'notebook.1');
  corpus = addTextToNotebook(corpus, 'notebook.1', 'text.1');
  corpus = addTextToNotebook(corpus, 'notebook.1', 'text.1');
  corpus = addTextToNotebook(corpus, 'notebook.1', 'text.2');
  assert.deepEqual(corpus.notebooks[0]?.textIds, ['text.1', 'text.2']);
  corpus = moveTextInNotebook(corpus, 'notebook.1', 'text.2', -1);
  assert.deepEqual(corpus.notebooks[0]?.textIds, ['text.2', 'text.1']);
  corpus = removeTextFromNotebook(corpus, 'notebook.1', 'text.1');
  assert.equal(corpus.texts.length, 2);
  assert.deepEqual(corpus.notebooks[0]?.textIds, ['text.2']);
});

test('borrar una fuente conserva el pasaje del cuaderno y los demás textos', () => {
  let corpus = emptyCorpus();
  corpus = upsertText(corpus, data, 'text.1', NOW);
  corpus = upsertText(corpus, { ...data, title: 'Otro' }, 'text.2', NOW);
  corpus = upsertNotebook(corpus, 'Mi cuaderno', 'notebook.1');
  corpus = addTextToNotebook(corpus, 'notebook.1', 'text.1');
  corpus = addTextToNotebook(corpus, 'notebook.1', 'text.2');
  corpus = deleteText(corpus, 'text.1');
  assert.deepEqual(corpus.notebooks[0]?.textIds, ['text.1', 'text.2']);
  assert.equal(notebookTexts(corpus, corpus.notebooks[0]!)[0]?.latin, data.latin);
  assert.deepEqual(corpus.texts.map(x=>x.id), ['text.2']);
  corpus = removeNotebook(corpus, 'notebook.1');
  assert.equal(corpus.texts.length, 1);
  assert.equal(corpus.notebooks.length, 0);
});

test('no permite vincular textos inexistentes', () => {
  const corpus = upsertNotebook(emptyCorpus(), 'Mi cuaderno', 'notebook.1');
  assert.throws(() => addTextToNotebook(corpus, 'notebook.1', 'text.404'), /texto inexistente/);
});

test('dos cuadernos comparten una versión, inclusive tras restaurar la copia', async () => {
  const { createBackup, readBackup } = await import('./backup.js');
  const { attachGrammarTags } = await import('./grammar-tags.js');
  let corpus = upsertText(emptyCorpus(), data, 'text.1', NOW);
  corpus = attachGrammarTags(corpus, 'text.1', ['gram.infinitivo']);
  for (const id of ['notebook.1', 'notebook.2']) {
    corpus = upsertNotebook(corpus, id, id);
    corpus = addTextToNotebook(corpus, id, 'text.1');
  }
  corpus = attachGrammarTags(corpus, 'text.1', ['gram.agente']);
  corpus = upsertText(corpus, { ...data, id: 'text.1', latin: 'Mutatum est.' }, 'text.1', NOW);
  corpus = deleteText(corpus, 'text.1');
  const { corpus: restored } = await readBackup(await createBackup(corpus));
  assert.equal(restored.textRevisions?.length, 1);
  for (const book of restored.notebooks) {
    assert.deepEqual(book.textIds, ['text.1']);
    const [entry] = notebookTexts(restored, book);
    assert.equal(entry?.latin, data.latin);
    assert.deepEqual(entry?.tagIds, ['gram.infinitivo']);
  }
  const oneReference = removeTextFromNotebook(restored, 'notebook.1', 'text.1');
  assert.equal(oneReference.textRevisions?.length, 1);
  assert.equal(notebookTexts(oneReference, oneReference.notebooks[1]!)[0]?.latin, data.latin);

  const noReferences = removeTextFromNotebook(oneReference, 'notebook.2', 'text.1');
  assert.deepEqual(noReferences.textRevisions, []);
  assert.deepEqual(noReferences.notebooks.map(book => book.textIds), [[], []]);
});
