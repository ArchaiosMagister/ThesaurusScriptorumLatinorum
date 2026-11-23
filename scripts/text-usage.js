import { IndexedDbCorpusRepository } from '../cuaderno-integrado/storage/indexeddb-corpus-repository.js';
import { WorkspaceRepository } from '../cuaderno-integrado/storage/workspace-repository.js';
import { findPossibleDuplicates, normalizedLatinKey } from '../cuaderno-integrado/core/text-duplicates.js';
import { notebookTexts } from '../cuaderno-integrado/core/editor-operations.js';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function examArchive(mode, operation) {
  const request = indexedDB.open('atl-v1:exam-archive', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('exams', { keyPath: 'id' });
  const database = await requestResult(request);
  try {
    const tx = database.transaction('exams', mode);
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    const result = requestResult(operation(tx.objectStore('exams')));
    const [value] = await Promise.all([result, completion]);
    return value;
  } finally {
    database.close();
  }
}

export function recordExam(id, title, snapshot) {
  return examArchive('readwrite', store => store.put({ id, title, snapshot }));
}

export async function savedExam(id) {
  const record = await examArchive('readonly', store => store.get(id));
  return record?.usageOnly ? undefined : record?.snapshot;
}

export async function loadUsageIndex() {
  const [editions, historical, exams] = await Promise.all([
    new WorkspaceRepository().listEditions(),
    new IndexedDbCorpusRepository().load(),
    examArchive('readonly', store => store.getAll())
  ]);
  const entries = [];
  function push(document, latin, sourceId, position, placementId, sourceVersion) {
    if (!latin?.trim()) return;
    entries.push({ document, sourceId, position, placementId, latin, sourceVersion });
  }
  for (const { edition } of editions) {
    if (edition.id === 'ed.seleccion-textos') continue;
    for (const [index, placement] of edition.placements.entries()) {
      push({ type: 'cuaderno', id: edition.id, title: edition.title }, placement.text.latin,
        placement.source.sourceId, index + 1, placement.id);
    }
  }
  const converted = new Set(editions.map(item => item.edition.legacyNotebookId));
  for (const book of historical.corpus.notebooks) {
    if (converted.has(book.id)) continue;
    for (const [index, text] of notebookTexts(historical.corpus, book).entries()) {
      push({ type: 'histórico', id: book.id, title: book.title }, text?.latin, text?.id, index + 1, null, text?.updatedAt);
    }
  }
  for (const { id, title, snapshot: saved, usage, usageOnly } of exams) {
    const snapshot = usage ?? saved;
    const document = { type: 'examen', id, title, usageOnly };
    push(document, snapshot.texto, snapshot.atlBankSource?.id, null, null,
      snapshot.atlBankSource?.updatedAt);
    if (snapshot.literatura?.texto) {
      push(document, snapshot.literatura.texto, null, 'Literatura', null);
    }
  }
  return entries;
}

export function findTextUses(entries, text, excludeExam) {
  const candidates = entries.filter(entry => entry.document.type !== 'examen' || entry.document.id !== excludeExam);
  const input = { latin: text.latin, author: null, work: null, reference: null };
  // No bibliographic fields are passed to the detector: a citation alone is not evidence of use.
  const hits = findPossibleDuplicates(candidates.map((entry, index) => ({
    id: String(index), title: entry.document.title, latin: entry.latin,
    source: { author: null, work: null, reference: null }
  })), input, undefined, candidates.length);
  const byIndex = new Map(hits.map(hit => [Number(hit.textId), hit]));
  return candidates.flatMap((entry, index) => {
    const hit = byIndex.get(index);
    const linked = Boolean(text.id && text.id === entry.sourceId);
    if (!linked && !hit) return [];
    const kind = hit?.kind === 'identical' ? 'Coincidencia exacta'
      : hit?.kind === 'overlap' ? 'Coincidencia parcial' : 'Misma ficha · versión distinta';
    const differentRevision = linked && Boolean(entry.sourceVersion && text.updatedAt && entry.sourceVersion !== text.updatedAt);
    return [{ ...entry, kind, linked, differentRevision }];
  }).sort((a, b) => Number(b.linked) - Number(a.linked) ||
    Number(b.kind === 'Coincidencia exacta') - Number(a.kind === 'Coincidencia exacta'));
}

export function recordedSourceIds(texts, entries) {
  const linked = new Set(entries.map(entry => entry.sourceId).filter(Boolean));
  const exact = new Set(entries.map(entry => normalizedLatinKey(entry.latin)).filter(Boolean));
  return new Set(texts.filter(text => linked.has(text.id) ||
    (exact.size && exact.has(normalizedLatinKey(text.latin)))).map(text => text.id));
}

export function usageList(matches, onOpen) {
  const body = document.createElement('div');
  if (!matches.length) {
    body.textContent = 'No se han encontrado coincidencias en los documentos guardados en esta aplicación.';
    return body;
  }
  const list = document.createElement('ul');
  for (const match of matches) {
    const row = document.createElement('li');
    const { document: doc, position } = match;
    const version = match.differentRevision && match.kind !== 'Misma ficha · versión distinta' ? ' · revisión anterior de la ficha' : '';
    const label = match.kind + ' · ' + doc.type + ' «' + doc.title + '»' + version +
      (typeof position === 'number' ? ' · texto ' + position : position ? ' · ' + position : '');
    row.append(label);
    if (doc.usageOnly) {
      list.append(row);
      continue;
    }
    const button = document.createElement('button');
    button.className = 'tbtn';
    button.type = 'button';
    button.textContent = doc.type === 'histórico' ? 'Leer cuaderno histórico' : 'Abrir ' + doc.type;
    button.addEventListener('click', () => onOpen(doc, doc.type === 'histórico' ? position : match.placementId));
    row.append(' ', button);
    list.append(row);
  }
  body.append(list);
  return body;
}
