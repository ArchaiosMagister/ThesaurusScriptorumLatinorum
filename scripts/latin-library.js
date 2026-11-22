import { convertTei } from './perseus-tei.js';
import { parseExaminatorCatalogue, originalWorkUrl, convertPerseusXml } from '../cuaderno-integrado/core/examinator-library.js';
import { DownloadedWorksRepository } from '../cuaderno-integrado/storage/downloaded-works.js';

const root = new URL('../cuaderno-integrado/library/', import.meta.url);
const downloads = new DownloadedWorksRepository('atl-v1:cuaderno-original-examinator2-obras');
const events = new EventTarget();
let metadata;
let busy = false;

async function json(file) {
  const response = await fetch(new URL(file, root));
  if (!response.ok) throw new Error('No se pudo leer el archivo de biblioteca ' + file);
  return response.json();
}

function loadMetadata() {
  metadata ??= Promise.all([json('examinator-catalog.json'), json('catalog.json')])
    .then(([full, local]) => {
      const catalogue = parseExaminatorCatalogue(full);
      const entries = new Map(catalogue.entries.map(work => [work.urn, work]));
      for (const work of local.works) {
        const original = entries.get(work.urn);
        entries.set(work.urn, { ...(original ?? work), file: work.file });
      }
      return { catalogue, entries: [...entries.values()] };
    }).catch(error => { metadata = undefined; throw error; });
  return metadata;
}

// Examinator guardaba sus descargas como archivos JSON en su propia base.
async function legacy(operation, mode = 'readonly') {
  if (!indexedDB) return;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('atl-v1:examinator');
    request.onupgradeneeded = () => request.result.createObjectStore('fs');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('fs', mode);
      const request = operation(tx.objectStore('fs'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
const legacyKey = urn => '/datos/textos/' + urn.replace(/[^\w.-]/g, '_') + '.json';

async function catalog() {
  const [{ entries }, cached, oldKeys] = await Promise.all([
    loadMetadata(), downloads.list(), legacy(store => store.getAllKeys())
  ]);
  const local = new Set(cached);
  const old = new Set(oldKeys);
  return entries.map((entry, i) => ({
    ...entry, i, builtin: Boolean(entry.file),
    have: Boolean(entry.file || local.has(entry.urn) || old.has(legacyKey(entry.urn)))
  }));
}

function emit(event, detail) {
  events.dispatchEvent(new CustomEvent(event, { detail }));
}

async function download(chosen) {
  const { catalogue } = await loadMetadata();
  const errors = [];
  let done = 0;
  for (const entry of chosen) {
    try {
      const source = originalWorkUrl(catalogue, entry);
      const response = await fetch(source, { signal: AbortSignal.timeout(180_000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const xml = await response.text();
      let work;
      try {
        work = convertPerseusXml(xml, entry, source);
      } catch (error) {
        // Algunas ediciones de Perseus P4 dependen de un DTD externo.
        // El conversor original de Examinator interpreta esas ediciones sin cargarlo.
        if (xml.length > 12_000_000 || !/<!DOCTYPE\s+TEI(?:\.2)?\s+PUBLIC\s+["']-\/\/TEI P4/i.test(xml)) throw error;
        const { levels, lines } = convertTei(xml, { lang: 'l' });
        if (!lines.length || lines.length > 300_000) throw error;
        const { urn, author, title, latin, genre, description: editorial } = entry;
        work = { urn, author, title, latin, genre, levels, lines, source, editorial,
          license: 'Consulta la licencia declarada en la edición de Perseus.', provenance: 'Perseus / Examinator2' };
      }
      await downloads.save(work);
    } catch (error) {
      errors.push({ author: entry.author, title: entry.title, error: String(error) });
    }
    emit('dl-progress', { done: ++done, total: chosen.length, current: entry.author + ' · ' + entry.title });
  }
  return errors;
}

export const latinLibrary = {
  on(event, callback) {
    events.addEventListener(event, event => callback(event.detail));
  },
  async call(method, args = {}) {
    if (method === 'catalog') return catalog();
    if (method === 'work') {
      const { entries } = await loadMetadata();
      const entry = entries.find(work => work.urn === args.urn);
      if (entry?.file) return json(entry.file);
      const downloaded = entry && await downloads.get(entry.urn);
      if (downloaded) return downloaded;
      const saved = entry && await legacy(store => store.get(legacyKey(entry.urn)));
      if (saved) return JSON.parse(saved);
      throw new Error('Primero descarga esta obra desde la biblioteca.');
    }
    const entries = await catalog();
    const chosen = [...new Set(args.ids ?? [])].map(id => entries[id]).filter(Boolean);
    if (method === 'deleteTexts') {
      for (const entry of chosen.filter(work => !work.builtin)) {
        await downloads.remove(entry.urn);
        await legacy(store => store.delete(legacyKey(entry.urn)), 'readwrite');
      }
      return;
    }
    if (method !== 'download') throw new Error('Operación desconocida de la biblioteca.');
    if (busy) return { started: false, total: 0, busy: true };
    const missing = chosen.filter(entry => !entry.have && entry.path);
    if (!missing.length) return { started: false, total: 0 };
    busy = true;
    void download(missing).then(errors => {
      busy = false;
      emit('dl-done', { total: missing.length, errors, error: errors.length ? 'Algunas obras no se han descargado.' : '' });
    });
    return { started: true, total: missing.length };
  }
};
