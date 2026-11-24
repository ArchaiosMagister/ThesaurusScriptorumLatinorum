import { isTemplateKey, localTemplates, validateTemplate } from './curriculum-templates.js';
import { applyBankReviewDecision } from './dropbox-plan.js';
import { isPristineSeed } from './modulos/cuaderno-integrado/ui/atl-pau-cv-seed.js';
import { validateCorpus } from './modulos/cuaderno-integrado/core/validation.js';
import { validateWorkspaceSnapshot } from './modulos/cuaderno-integrado/storage/workspace-repository.js';
import { readBackup } from './modulos/cuaderno-integrado/core/backup.js';
import { allGrammarTags, attachGrammarTags } from './modulos/cuaderno-integrado/core/grammar-tags.js';
import { emptyCorpus } from './modulos/cuaderno-integrado/core/model.js';
import { bankReviewKey } from './modulos/cuaderno-integrado/ui/atl-bank-review.js';
import { partialFormat, partialTypes, subsetCorpus, mergeBank, parseProposals, tagChanges, validateTemplateRows } from './partial-backup.js';
import { combineNotebookCorpora, createNotebookBackup, readWorkspaceBackup } from './modulos/cuaderno-integrado/storage/workspace-backup.js';

const format = 'administrator-textorum-latinorum';
export const maxBackupSize = 128 * 1024 * 1024;
const schemas = {
  'atl-v1:cuaderno-textos-latinos': { corpus: 'key' },
  'atl-v1:cuaderno-textos-latinos-workspace': { corpus: 'key', editions: 'key', history: 'key', meta: 'key' },
  'atl-v1:cuaderno-original-examinator2-obras': { works: 'urn' },
  'atl-v1:cuaderno-textos-latinos-biblioteca-examinator2': { works: 'urn' },
  'atl-v1:examinator': { fs: null },
  'atl-v1:cuaderno-collatinus-examinator-v1': { fs: null },
  'atl-v1:exam-archive': { exams: 'id' }
};
const workspaceName = 'atl-v1:cuaderno-textos-latinos-workspace';
const corpusName = 'atl-v1:cuaderno-textos-latinos';
const examKeys = new Set(['asig', 'current', 'config', 'espacioPreguntas', 'espacioVocabularioPuntos',
  'fuente', 'hueco', 'interlineado', 'interlineadoPuntos', 'qty', 'tamano', 'theme', 'trimestre', 'vocabulario']);
const scopedLocal = /^(?:atl-v1:examinator\.fs:\/datos\/listas\/(?:preverbios|evolucion|prefijos|latinismos)\.json|atl-v1:cuaderno-(?:ui-theme-v1|examinator-ultimo-v1|examinator\.vocabulario\.v1|banco-review-v1:.+|collatinus-revision-v1:.+))$/u;
function safeLocal(key) {
  const prefix = 'atl-v1:examinator.';
  return isTemplateKey(key) || scopedLocal.test(key) || (key.startsWith(prefix) && examKeys.has(key.slice(prefix.length)));
}

const request = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const transactionDone = transaction => new Promise((resolve, reject) => {
  transaction.oncomplete = resolve;
  transaction.onabort = () => reject(transaction.error ?? new Error('La transacción se canceló.'));
});
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validRevision = value => Number.isSafeInteger(value) && value > 0;

async function database(name) {
  const open = indexedDB.open(name, 1);
  open.onupgradeneeded = () => {
    for (const [store, keyPath] of Object.entries(schemas[name])) {
      open.result.createObjectStore(store, keyPath ? { keyPath } : undefined);
    }
  };
  const db = await request(open);
  db.onversionchange = () => db.close();
  return db;
}

async function readDatabase(name) {
  const db = await database(name);
  try {
    const stores = Object.keys(schemas[name]);
    const tx = db.transaction(stores, 'readonly');
    const done = transactionDone(tx);
    const results = stores.map(async store => {
      const values = tx.objectStore(store);
      const [keys, rows] = await Promise.all([request(values.getAllKeys()), request(values.getAll())]);
      return [store, rows.map((row, index) => [keys[index], row])];
    });
    return Object.fromEntries((await Promise.all([Promise.all(results), done]))[0]);
  } finally { db.close(); }
}

async function sha256(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function desktopExam(value) {
  if (!value || typeof value.texto !== 'string') throw new Error('Examen inválido en la copia.');
  for (const key of ['tokens', 'vocabItems', 'subr', 'prev', 'evol', 'pref', 'latin']) {
    if (value[key] !== undefined && !Array.isArray(value[key])) throw new Error('Apartado de examen inválido: ' + key);
  }
}

function validateData(data) {
  if (!data || typeof data !== 'object' || !data.databases || !data.preferences) throw new Error('La copia no contiene un espacio de trabajo.');
  for (const [name, stores] of Object.entries(data.databases)) {
    if (!Object.hasOwn(schemas, name) || !stores || typeof stores !== 'object') throw new Error('Almacén ajeno a Administrator.');
    for (const [store, rows] of Object.entries(stores)) {
      if (!Object.hasOwn(schemas[name], store) || !Array.isArray(rows)) throw new Error('Colección inválida en la copia.');
      const keyPath = schemas[name][store];
      const seen = new Set();
      for (const entry of rows) {
        if (!Array.isArray(entry) || entry.length !== 2) throw new Error('Registro inválido.');
        const [key, row] = entry;
        if (typeof key !== 'string' && !(store === 'history' && Array.isArray(key) &&
            typeof key[0] === 'string' && validRevision(key[1]) && key.length === 2)) throw new Error('Identificador inválido.');
        const identifier = JSON.stringify(key);
        if (seen.has(identifier) || (keyPath && !equal(row?.[keyPath], key))) throw new Error('Identificador duplicado o incoherente.');
        seen.add(identifier);
        if (store === 'works' && (!Array.isArray(row.lines) || !row.lines.length)) throw new Error('Obra descargada inválida.');
        if (store === 'fs' && (typeof row !== 'string' || !key.startsWith('/datos/textos/'))) throw new Error('Archivo local inválido.');
        if (store === 'exams') {
          if (typeof row.title !== 'string') throw new Error('Título de examen inválido.');
          desktopExam(row.snapshot);
          if (row.usage !== undefined) desktopExam(row.usage);
        }
      }
    }
  }
  const corpus = data.databases[corpusName]?.corpus ?? [];
  if (corpus.length > 1 || corpus.some(([key, row]) => key !== 'current' || !validRevision(row.revision))) {
    throw new Error('Revisión del banco inválida.');
  }
  if (corpus.length) validateCorpus(corpus[0][1].corpus);
  const workspace = data.databases[workspaceName];
  if (workspace) {
    const meta = Object.fromEntries(workspace.meta ?? []);
    const row = workspace.corpus?.[0]?.[1];
    if (Object.keys(meta).some(key => !['workspace-revision', 'migration-legacy-v1'].includes(key)) ||
        (workspace.corpus?.length ?? 0) > 1 || (row && row.key !== 'current')) throw new Error('Metadatos editoriales inválidos.');
    validateWorkspaceSnapshot({
      workspaceRevision: meta['workspace-revision']?.value ?? 0,
      migration: meta['migration-legacy-v1']?.value ?? null,
      corpus: row ? { revision: row.revision, corpus: row.corpus } : null,
      editions: (workspace.editions ?? []).map(([key, edition]) => {
        if (key !== edition.edition?.id) throw new Error('Identificador de cuaderno incoherente.');
        return { revision: edition.revision, edition: edition.edition };
      }),
      history: (workspace.history ?? []).map(([key, row]) => {
        if (!equal(key, [row.event?.editionId, row.event?.sequence])) throw new Error('Historial incoherente.');
        return row.event;
      })
    });
  }
  for (const [key, val] of Object.entries(data.preferences)) {
    if (!safeLocal(key) || typeof val !== 'string') throw new Error('Preferencia ajena a esta copia.');
    if (isTemplateKey(key)) validateTemplate(JSON.parse(val));
    if (key === 'atl-v1:examinator.current') desktopExam(JSON.parse(val));
  }
  return data;
}

const ancestryKey = 'atl-v1:backup-ancestry';
const metadata = new WeakMap();
const hashPattern = /^[a-f0-9]{64}$/u;
function ancestry() {
  try {
    const values = JSON.parse(localStorage.getItem(ancestryKey));
    return Array.isArray(values) ? values.filter(value => hashPattern.test(value)).slice(-128) : [];
  } catch { return []; }
}
function remember(hashes) {
  localStorage.setItem(ancestryKey, JSON.stringify([...new Set(hashes)].slice(-128)));
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const fingerprint = data => sha256(canonical(data));

async function readLocal() {
  const databases = Object.fromEntries(await Promise.all(Object.keys(schemas).map(async name => [name, await readDatabase(name)])));
  const preferences = Object.fromEntries(Object.keys(localStorage).filter(safeLocal).map(key => [key, localStorage.getItem(key)]));
  return validateData({ databases, preferences });
}

export async function captureBackup() {
  const payload = await readLocal();
  const exportedAt = new Date().toISOString();
  const ancestors = ancestry();
  const contentHash = await fingerprint(payload);
  const signed = { exportedAt, ancestors, contentHash, payload };
  const backup = { format, version: 2, ...signed, sha256: await sha256(signed) };
  remember([...ancestors, contentHash]);
  return backup;
}

function workspaceRows(snapshot) {
  return {
    corpus: snapshot.corpus ? [['current', { key: 'current', ...snapshot.corpus }]] : [],
    editions: snapshot.editions.map(row => [row.edition.id, { key: row.edition.id, ...row }]),
    history: snapshot.history.map(event => {
      const key = [event.editionId, event.sequence];
      return [key, { key, event }];
    }),
    meta: [
      ...(snapshot.workspaceRevision ? [['workspace-revision', { key: 'workspace-revision', value: snapshot.workspaceRevision }]] : []),
      ...(snapshot.migration ? [['migration-legacy-v1', { key: 'migration-legacy-v1', value: snapshot.migration }]] : [])
    ]
  };
}

export async function readBackupFile(contents) {
  const data = JSON.parse(contents);
  if (data.format === format) {
    const { exportedAt, ancestors, contentHash, payload } = data;
    const validTime = typeof exportedAt === 'string' && Number.isFinite(Date.parse(exportedAt));
    const validAncestors = Array.isArray(ancestors) && ancestors.length <= 128 &&
      ancestors.every(hash => typeof hash === 'string' && hashPattern.test(hash));
    const signed = data.version === 2 && validAncestors ? { exportedAt, ancestors, contentHash, payload }
      : data.version === 1 ? { exportedAt, payload } : null;
    if (!validTime || !signed || data.sha256 !== await sha256(signed) ||
        (data.version === 2 && contentHash !== await fingerprint(payload))) {
      throw new Error('La versión o la huella SHA-256 de la copia es incorrecta.');
    }
    validateData(payload);
    if (data.version === 2 && Object.entries(schemas).some(([name, stores]) =>
      Object.keys(stores).some(store => !Object.hasOwn(payload.databases[name] ?? {}, store)))) {
      throw new Error('La copia integral está incompleta.');
    }
    metadata.set(payload, { exportedAt, ancestors: data.version === 2 ? ancestors : [], contentHash: await fingerprint(payload) });
    return payload;
  }
  const payload = { databases: {}, preferences: {} };
  if (['cuaderno-textos-latinos-workspace', 'atl-v1:cuaderno-textos-latinos-workspace'].includes(data.format)) {
    const restored = await readWorkspaceBackup(JSON.stringify({ ...data, format: workspaceName }));
    payload.databases[workspaceName] = workspaceRows(restored.snapshot);
  } else if (['cuaderno-textos-latinos', 'atl-v1:cuaderno-textos-latinos'].includes(data.format)) {
    const { corpus } = await readBackup(JSON.stringify({ ...data, format: corpusName }));
    payload.databases[corpusName] = { corpus: [['current', { key: 'current', revision: 1, corpus }]] };
  } else {
    throw new Error('Formato desconocido. Para archivos .examen o copias de un solo cuaderno, usa Abrir o Importar en su sección.');
  }
  return validateData(payload);
}

export async function planRestore(payload) {
  validateData(payload);
  const version = metadata.get(payload);
  let comparison = 'legacy';
  let baseline;
  if (version) {
    baseline = await fingerprint(await readLocal());
    comparison = baseline === version.contentHash ? 'same' :
      ancestry().includes(version.contentHash) ? 'older' :
      version.ancestors.includes(baseline) ? 'newer' : 'unknown';
    if (['same', 'older', 'newer'].includes(comparison))
      return { comparison, baseline, databases: {}, preferences: {}, conflicts: [] };
  }
  const databases = {};
  const preferences = {};
  const conflicts = [];
  let pristineReplacement;
  for (const [name, stores] of Object.entries(payload.databases)) {
    const existing = await readDatabase(name);
    // On a fresh installation only, the bundled corpus is a default, not
    // teacher data. A verified backup may replace it, with a guarded rollback.
    if (name === corpusName && stores.corpus?.length === 1 && existing.corpus.length === 1 &&
        isPristineSeed(existing.corpus[0][1].corpus) && !equal(existing.corpus, stores.corpus)) {
      pristineReplacement = { before: existing, after: { corpus: stores.corpus } };
      continue;
    }
    const additions = {};
    for (const [store, rows] of Object.entries(stores)) {
      const byKey = new Map(existing[store].map(([key, row]) => [JSON.stringify(key), row]));
      for (const [key, value] of rows) {
        const signature = JSON.stringify(key);
        if (!byKey.has(signature)) (additions[store] ??= []).push([key, value]);
        else if (!equal(byKey.get(signature), value)) conflicts.push(name + ' · ' + store + ' · ' + key);
      }
    }
    if (name === workspaceName && Object.keys(additions).length &&
        Object.values(existing).some(rows => rows.length)) {
      conflicts.push('Espacio editorial existente con un historial distinto');
    }
    if (Object.keys(additions).length) databases[name] = additions;
  }
  for (const [key, value] of Object.entries(payload.preferences)) {
    const existing = localStorage.getItem(key);
    if (existing === null) preferences[key] = value;
    else if (existing !== value) conflicts.push(key);
  }
  return { comparison, baseline, databases, preferences, conflicts, ...(pristineReplacement && { pristineReplacement }) };
}

async function applyRows(name, stores, undo = false) {
  const db = await database(name);
  try {
    const tx = db.transaction(Object.keys(stores), 'readwrite');
    const done = transactionDone(tx);
    const actions = Object.entries(stores).flatMap(([store, rows]) => rows.map(([key, row]) => {
      const collection = tx.objectStore(store);
      if (!undo) return request(collection.keyPath ? collection.add(row) : collection.add(row, key));
      const get = collection.get(key);
      get.onsuccess = () => { if (equal(get.result, row)) collection.delete(key); };
      return Promise.resolve();
    }));
    await Promise.all([...actions, done]);
  } finally { db.close(); }
}

async function replaceDatabase(name, before, after) {
  const db = await database(name);
  try {
    const tx = db.transaction(Object.keys(before), 'readwrite');
    const done = transactionDone(tx);
    const checks = Object.entries(before).map(async ([store, rows]) => {
      const collection = tx.objectStore(store);
      const [keys, values] = await Promise.all([request(collection.getAllKeys()), request(collection.getAll())]);
      if (!equal(keys.map((key, i) => [key, values[i]]), rows)) {
        tx.abort();
        throw new Error('Hay cambios locales en otra pestaña. Vuelve a comparar la copia.');
      }
      collection.clear();
      for (const [key, row] of after[store])
        if (collection.keyPath) collection.add(row); else collection.add(row, key);
    });
    await Promise.all([...checks, done]);
  } finally { db.close(); }
}

async function installNewer(payload, baseline) {
  const local = await readLocal();
  if (await fingerprint(local) !== baseline) throw new Error('La versión local cambió. Vuelve a comparar la copia.');
  const committed = [];
  const changed = [];
  try {
    for (const [name, stores] of Object.entries(payload.databases)) {
      await replaceDatabase(name, local.databases[name], stores);
      committed.push(name);
    }
    for (const key of new Set([...Object.keys(local.preferences), ...Object.keys(payload.preferences)])) {
      const before = local.preferences[key] ?? null, after = payload.preferences[key] ?? null;
      if (localStorage.getItem(key) !== before) throw new Error('Una preferencia local cambió durante la importación.');
      if (before === after) continue;
      if (after === null) localStorage.removeItem(key); else localStorage.setItem(key, after);
      changed.push([key, before, after]);
    }
    const version = metadata.get(payload);
    if (await fingerprint(await readLocal()) !== version.contentHash)
      throw new Error('La verificación posterior detectó diferencias.');
    remember([...version.ancestors, version.contentHash]);
  } catch (error) {
    const reverted = await Promise.allSettled(committed.reverse().map(name =>
      replaceDatabase(name, payload.databases[name], local.databases[name])));
    for (const [key, before, after] of changed) if (localStorage.getItem(key) === after) {
      if (before === null) localStorage.removeItem(key); else localStorage.setItem(key, before);
    }
    if (reverted.some(result => result.status === 'rejected')) throw new Error('La reversión no se pudo verificar. Conserva la copia de seguridad.');
    throw error;
  }
}

export async function restoreBackup(payload, preview) {
  const plan = await planRestore(payload);
  if (plan.conflicts.length || !equal(plan, preview)) throw new Error('El estado local ha cambiado. Vuelve a revisar la copia.');
  if (plan.comparison === 'same' || plan.comparison === 'older')
    throw new Error('Esta copia no actualiza la versión local.');
  if (plan.comparison === 'newer') return installNewer(payload, plan.baseline);
  const committed = [];
  const preferences = [];
  let replaced = false;
  try {
    if (plan.pristineReplacement) {
      await replaceDatabase(corpusName, plan.pristineReplacement.before, plan.pristineReplacement.after);
      replaced = true;
    }
    for (const [name, stores] of Object.entries(plan.databases)) {
      await applyRows(name, stores);
      committed.push([name, stores]);
    }
    for (const [key, value] of Object.entries(plan.preferences)) {
      if (localStorage.getItem(key) !== null) throw new Error('Una preferencia cambió durante la restauración.');
      localStorage.setItem(key, value);
      preferences.push([key, value]);
    }
    const verified = await planRestore(payload);
    if (verified.conflicts.length || verified.pristineReplacement || Object.keys(verified.databases).length || Object.keys(verified.preferences).length) {
      throw new Error('La verificación posterior detectó diferencias.');
    }
    const version = metadata.get(payload);
    if (version && verified.comparison === 'same') remember([...version.ancestors, version.contentHash]);
  } catch (error) {
    const reverted = await Promise.allSettled([
      ...committed.map(([name, stores]) => applyRows(name, stores, true)),
      ...(replaced ? [replaceDatabase(corpusName, plan.pristineReplacement.after, plan.pristineReplacement.before)] : [])
    ]);
    for (const [key, value] of preferences) if (localStorage.getItem(key) === value) localStorage.removeItem(key);
    if (reverted.some(result => result.status === 'rejected')) throw new Error('La reversión no se pudo verificar. Conserva la copia de seguridad.');
    throw error;
  }
}

const archiveName = 'atl-v1:exam-archive';
const syncNames = [corpusName, workspaceName, archiveName];

function examUsage(row) {
  const { texto, atlBankSource, literatura } = row.usage ?? row.snapshot;
  return {
    texto,
    ...(typeof atlBankSource?.id === 'string' && { atlBankSource: {
      id: atlBankSource.id,
      ...(typeof atlBankSource.updatedAt === 'string' && { updatedAt: atlBankSource.updatedAt })
    } }),
    ...(typeof literatura?.texto === 'string' && { literatura: { texto: literatura.texto } })
  };
}

function scopedSync(rows) {
  return {
    editor: Object.fromEntries(syncNames.slice(0, 2).map(name => [name, rows[name]])),
    usages: rows[archiveName].exams.filter(([, row]) => !row.syncSuppressed)
      .map(([id, row]) => [id, { id, title: row.title, snapshot: examUsage(row) }])
  };
}

const bankReviewPattern = /^atl-v1:cuaderno-banco-review-v1:.+:[a-f0-9]{64}$/u;
const decisionKey = proposal => [proposal.start, proposal.end, proposal.tagId].join(':');

function bankDecisions(record) {
  const rejected = [...new Set((record?.rejected ?? []).filter(key => typeof key === 'string'))].sort();
  const corrected = (record?.corrected ?? []).filter(row =>
    Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string'))
    .sort(([a], [b]) => a.localeCompare(b));
  const keys = new Set([...rejected, ...corrected.map(([key]) => key)]);
  // Sincronizar la clasificación automática además de las decisiones humanas.
  // Las explicaciones del motor son recuperables y se omiten para ahorrar espacio.
  const version = Number.isSafeInteger(record?.version) && record.version >= 0
    ? record.version : undefined;
  const pending = (record?.pending ?? []).filter(row =>
    row && Number.isSafeInteger(row.start) && Number.isSafeInteger(row.end) &&
    row.end > row.start && typeof row.tagId === 'string' &&
    (version || keys.has(decisionKey(row))))
    .map(({ start, end, tagId, state, syntaxReview }) => ({
      start, end, tagId, state: state === 'automatic' ? 'automatic' : 'pending',
      ...(syntaxReview && { syntaxReview: true }), evidence: [], alternatives: []
    })).sort((a, b) => decisionKey(a).localeCompare(decisionKey(b)));
  return { rejected, corrected, pending, ...(version !== undefined && { version }) };
}

function localBankDecisions() {
  return Object.keys(localStorage).filter(key => bankReviewPattern.test(key)).sort().flatMap(key => {
    try {
      const decision = bankDecisions(JSON.parse(localStorage.getItem(key)));
      return decision.rejected.length || decision.corrected.length || decision.version !== undefined
        ? [[key, decision]] : [];
    } catch {
      return [];
    }
  });
}

export async function readSyncData() {
  const rows = Object.fromEntries(await Promise.all(syncNames.map(async name => [name, await readDatabase(name)])));
  rows.bankReviews = localBankDecisions();
  rows.templates = localTemplates();
  return { data: { ...scopedSync(rows), ...(rows.bankReviews.length && { bankReviews: rows.bankReviews }),
    ...(rows.templates.length && { templates: rows.templates }) }, rows };
}

export function validateSyncData(data) {
  if (!data?.editor || !Array.isArray(data.usages) ||
      Object.keys(data.editor).length !== 2 || syncNames.slice(0, 2).some(name =>
        !data.editor[name] || Object.keys(data.editor[name]).length !== Object.keys(schemas[name]).length ||
        Object.keys(schemas[name]).some(store => !Object.hasOwn(data.editor[name], store)))) {
    throw new Error('El archivo de Dropbox no contiene un espacio de Thesaurus válido.');
  }
  const rows = { ...data.editor, [archiveName]: { exams: data.usages } };
  validateData({ databases: rows, preferences: {} });
  // Reconstruye los registros de uso con los únicos campos admitidos.
  const reviews = data.bankReviews ?? [];
  if (!Array.isArray(reviews) || new Set(reviews.map(row => row?.[0])).size !== reviews.length ||
      reviews.some(row => !Array.isArray(row) || !bankReviewPattern.test(row[0]) ||
        !Array.isArray(row[1]?.rejected) || !Array.isArray(row[1]?.corrected) || !Array.isArray(row[1]?.pending))) {
    throw new Error('El historial de etiquetas de Dropbox no es válido.');
  }
  const templates = data.templates ?? [];
  if (!Array.isArray(templates) || new Set(templates.map(row => row?.[0])).size !== templates.length ||
      templates.some(row => !Array.isArray(row) || row.length !== 2 || !isTemplateKey(row[0])))
    throw Error('Las plantillas de Dropbox no son válidas.');
  return { ...scopedSync(rows), ...(reviews.length && { bankReviews: reviews.map(([key, review]) => [key, bankDecisions(review)]) }),
    ...(templates.length && { templates: templates.map(([key, value]) => [key, validateTemplate(value)]) }) };
}

export function isEmptySyncEditor(editor) {
  return syncNames.slice(0, 2).every(name => {
    const stores = editor[name];
    return !stores.editions?.length && !stores.history?.length && stores.corpus.every(([, { corpus }]) =>
      (isPristineSeed(corpus) || (!corpus.pauCvSeedVersion && !corpus.texts.length && !corpus.tags.length && !corpus.notebooks.length)));
  });
}

export const syncFingerprint = fingerprint;

export function syncTargetRows(data, before) {
  data = validateSyncData(data);
  const exams = new Map(before[archiveName].exams);
  const combined = new Map(data.usages.map(([id, row]) => {
    const local = exams.get(id);
    return [id, local && !local.usageOnly
      ? [id, { ...local, title: row.title, usage: row.snapshot, syncSuppressed: false }]
      : [id, { ...row, usageOnly: true }]];
  }));
  // Borrar una referencia compartida nunca debe borrar el examen completo de este dispositivo.
  // Su contenido local se conserva, pero deja de publicarse hasta que el docente lo guarde de nuevo.
  for (const [id, local] of exams) {
    if (!combined.has(id) && !local.usageOnly)
      combined.set(id, [id, { ...local, syncSuppressed: true }]);
  }
  return { ...data.editor, bankReviews: data.bankReviews ?? [], templates: data.templates ?? [], [archiveName]: {
    exams: [...combined.values()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  } };
}

export async function applySyncData(data, before) {
  const after = syncTargetRows(data, before);
  const committed = [];
  const savedPreferences = [];
  try {
    for (const name of syncNames) {
      // Comprueba toda revisión local en la misma transacción que aplica el cambio.
      await replaceDatabase(name, before[name], after[name]);
      committed.push(name);
    }
    if (!equal(localBankDecisions(), before.bankReviews))
      throw new Error('Las decisiones de etiquetas cambiaron durante la sincronización.');
    if (!equal(localTemplates(), before.templates ?? []))
      throw new Error('Las plantillas cambiaron durante la sincronización.');
    const beforeTemplates = new Map(before.templates ?? []);
    const afterTemplates = new Map(after.templates);
    for (const key of new Set([...beforeTemplates.keys(), ...afterTemplates.keys()])) {
      if (equal(beforeTemplates.get(key), afterTemplates.get(key))) continue;
      const original = localStorage.getItem(key);
      const value = afterTemplates.has(key) ? JSON.stringify(afterTemplates.get(key)) : null;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      savedPreferences.push([key, original, value]);
    }
    const previous = new Map(before.bankReviews);
    const next = new Map(after.bankReviews);
    for (const key of new Set([...previous.keys(), ...next.keys()])) {
      if (equal(previous.get(key), next.get(key))) continue;
      const original = localStorage.getItem(key);
      let cached = {};
      try { cached = JSON.parse(original ?? '{}') ?? {}; } catch { /* Replace a damaged cache with the verified remote decision. */ }
      const decision = applyBankReviewDecision(cached, next.get(key));
      const value = decision === null ? null : JSON.stringify(decision);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      savedPreferences.push([key, original, value]);
    }
  } catch (error) {
    const reverted = await Promise.allSettled([
      ...committed.reverse().map(name => replaceDatabase(name, after[name], before[name])),
      ...savedPreferences.reverse().map(async ([key, original, value]) => {
        if (localStorage.getItem(key) !== value) throw Error('Cambió una preferencia durante la reversión.');
        if (original === null) localStorage.removeItem(key);
        else localStorage.setItem(key, original);
      })
    ]);
    if (reverted.some(result => result.status === 'rejected'))
      throw new Error('Otra pestaña modificó los datos durante la sincronización. Revisa el estado local antes de repetirla.');
    throw error;
  }
}

function corpora(data) {
  const historical = data.databases[corpusName].corpus[0]?.[1]?.corpus ?? emptyCorpus();
  const editorial = data.databases[workspaceName].corpus[0]?.[1]?.corpus ?? emptyCorpus();
  return { historical, editorial, combined: combineNotebookCorpora(editorial, historical) };
}

export async function describeBackup() {
  const data = await readLocal();
  return {
    texts: corpora(data).combined.texts.length,
    editions: data.databases[workspaceName].editions.map(([id, row]) => [id, row.edition.title]),
    templates: Object.entries(data.preferences).filter(([key]) => isTemplateKey(key))
      .map(([key, value]) => [key, validateTemplate(JSON.parse(value)).name]),
    exams: data.databases[archiveName].exams.length,
    preferences: Object.keys(data.preferences).length
  };
}

export async function capturePartial(type, scope = 'all', ids = null) {
  if (!partialTypes.includes(type) || !['all', 'selected', 'filtered'].includes(scope)) throw Error('Tipo o alcance no válido.');
  const data = await readLocal();
  const { combined } = corpora(data);
  const selected = new Set(ids ?? []);
  const take = id => scope === 'all' || selected.has(id);
  let payload;
  if (type === 'templates') {
    payload = { templates: localTemplates().filter(([key]) => take(key)) };
  } else if (type === 'bank' || type === 'tag-exchange') {
    const texts = combined.texts.filter(text => take(text.id));
    const keys = await Promise.all(texts.map(bankReviewKey));
    const reviews = Object.fromEntries(keys.flatMap(key => Object.hasOwn(data.preferences, key) ? [[key, data.preferences[key]]] : []));
    payload = { corpus: subsetCorpus(combined, texts, type === 'tag-exchange' ? allGrammarTags(combined).map(tag => tag.id) : []),
      reviews, latinHashes: Object.fromEntries(texts.map((text, index) => [text.id, keys[index].split(':').at(-1)])) };
  } else {
    const source = data.databases[workspaceName];
    const editions = source.editions.filter(([id]) => take(id));
    const history = source.history.filter(([[id]]) => take(id));
    const neededTexts = new Map();
    const neededTags = new Set();
    const versions = [...editions.map(([, row]) => row.edition),
      ...history.flatMap(([, { event }]) => [event.before, event.after].filter(Boolean))];
    for (const edition of versions) {
      const { payload: { dependencies } } = JSON.parse(await createNotebookBackup(edition, combined));
      for (const text of dependencies.texts) neededTexts.set(text.id, text);
      for (const tag of dependencies.tags) neededTags.add(tag.id);
    }
    const meta = source.meta.map(([key, row]) => {
      if (key !== 'migration-legacy-v1') return [key, row];
      const notebookIdMap = Object.fromEntries(Object.entries(row.value.notebookIdMap).filter(([, id]) => take(id)));
      return [key, { ...row, value: { ...row.value, notebookIdMap, notebookCount: Object.keys(notebookIdMap).length } }];
    }).filter(([key, row]) => key !== 'migration-legacy-v1' || Object.keys(row.value.notebookIdMap).length);
    const dependencies = subsetCorpus(combined, [...neededTexts.values()], [...neededTags]);
    const corpus = dependencies.texts.length || dependencies.tags.length || meta.some(([key]) => key === 'migration-legacy-v1')
      ? [['current', { key: 'current', revision: 1, corpus: dependencies }]] : [];
    payload = { workspace: { editions, history, meta, corpus } };
  }
  const size = payload.corpus?.texts.length ?? payload.workspace?.editions.length ?? payload.templates?.length;
  if (!size) throw Error('No hay elementos para exportar.');
  if (scope !== 'all' && size !== selected.size) throw Error('La selección cambió. Vuelve a comprobar los elementos.');
  const signed = { format: partialFormat, version: 1, type, scope, exportedAt: new Date().toISOString(), payload };
  return { ...signed, sha256: await fingerprint(signed),
    ...(type === 'tag-exchange' && { proposals: payload.corpus.texts.map(({ id, tagIds }) => ({ id, tagIds })) }) };
}

export async function readPartial(contents) {
  const envelope = JSON.parse(contents);
  if (envelope?.format !== partialFormat) return null;
  const { format, version, type, scope, exportedAt, payload, sha256: hash } = envelope;
  const signed = { format, version, type, scope, exportedAt, payload };
  if (version !== 1 || !partialTypes.includes(type) || !['all', 'selected', 'filtered'].includes(scope) ||
      typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt)) || hash !== await fingerprint(signed))
    throw Error('La versión o la huella SHA-256 de la copia parcial es incorrecta.');
  if (type === 'templates') validateTemplateRows(payload.templates);
  if (type === 'notebooks') {
    if (Object.keys(payload.workspace ?? {}).length !== 4 ||
        Object.keys(schemas[workspaceName]).some(key => !Array.isArray(payload.workspace[key])))
      throw Error('La copia de cuadernos está incompleta.');
    validateData({ databases: { [workspaceName]: payload.workspace }, preferences: {} });
  }
  if (type === 'bank' || type === 'tag-exchange') {
    const corpus = validateCorpus(payload.corpus);
    if (corpus.notebooks.length || corpus.textRevisions?.length) throw Error('El archivo del banco contiene otros datos.');
    const keys = await Promise.all(corpus.texts.map(bankReviewKey));
    const keySet = new Set(keys);
    if (!payload.latinHashes || Object.keys(payload.latinHashes).length !== corpus.texts.length ||
        !corpus.texts.every((text, index) => payload.latinHashes[text.id] === keys[index].split(':').at(-1)) ||
        !payload.reviews || Object.entries(payload.reviews).some(([key, value]) => !keySet.has(key) || typeof value !== 'string'))
      throw Error('La huella del latín o las revisiones de la copia son incoherentes.');
    if (type === 'tag-exchange') parseProposals(envelope.proposals, corpus.texts);
  }
  return envelope;
}

function withCorpus(stores, corpus, editorial = false) {
  const actual = stores.corpus[0]?.[1]?.revision ?? 0;
  const next = { ...stores, corpus: [['current', { key: 'current', revision: actual + 1, corpus }]] };
  if (editorial) {
    const meta = new Map(stores.meta);
    const key = 'workspace-revision';
    meta.set(key, { key, value: (meta.get(key)?.value ?? 0) + 1 });
    next.meta = [...meta].sort(([a], [b]) => a.localeCompare(b, 'en'));
  }
  return next;
}

function notebookImport(stores, incoming, historical, editorial) {
  const conflicts = [];
  const localEditions = new Map(stores.editions);
  const history = new Map(stores.history.map(([key, row]) => [JSON.stringify(key), row]));
  let changed = 0;
  for (const [id, row] of incoming.editions) {
    const previous = localEditions.get(id);
    if (previous && equal(previous, row)) continue;
    const events = incoming.history.filter(([[edition]]) => edition === id);
    const extension = events.find(([[, sequence]]) => sequence === (previous?.revision ?? 0) + 1)?.[1];
    if (previous && (!extension || !equal(extension.event.before, previous.edition) ||
        events.some(([key, item]) => history.has(JSON.stringify(key)) && !equal(history.get(JSON.stringify(key)), item)))) {
      conflicts.push(row.edition.title + ' · historial distinto o más antiguo');
      continue;
    }
    localEditions.set(id, row);
    for (const [key, item] of events) history.set(JSON.stringify(key), item);
    changed++;
  }
  const incomingCorpus = incoming.corpus[0]?.[1]?.corpus ?? emptyCorpus();
  const combined = combineNotebookCorpora(editorial, historical);
  const catalogue = allGrammarTags(combined);
  const deps = mergeBank(editorial, combined.texts, incomingCorpus, equal, catalogue);
  conflicts.push(...deps.conflicts);
  const tags = new Map(deps.corpus.tags.map(tag => [tag.id, tag]));
  const all = new Map(catalogue.map(tag => [tag.id, tag]));
  for (const tag of incomingCorpus.tags) {
    if (all.has(tag.id) && !equal(all.get(tag.id), tag)) conflicts.push(tag.label + ' · definición incompatible');
    else tags.set(tag.id, tag);
  }
  const meta = new Map(stores.meta);
  const migrationKey = 'migration-legacy-v1';
  const imported = incoming.meta.find(([key]) => key === migrationKey)?.[1]?.value;
  const current = meta.get(migrationKey)?.value;
  if (imported) {
    const notebookIdMap = { ...current?.notebookIdMap };
    for (const [old, id] of Object.entries(imported.notebookIdMap)) {
      if (Object.hasOwn(notebookIdMap, old) && notebookIdMap[old] !== id) conflicts.push('Referencia histórica ocupada: ' + old);
      else notebookIdMap[old] = id;
    }
    meta.set(migrationKey, { key: migrationKey, value: { ...(current ?? imported), notebookIdMap,
      notebookCount: Object.keys(notebookIdMap).length } });
  }
  const next = withCorpus({ ...stores, meta: [...meta], editions: [...localEditions],
    history: [...history.values()].map(row => [row.key, row]) }, { ...deps.corpus, tags: [...tags.values()] }, true);
  const epoch = next.meta.find(([key]) => key === 'workspace-revision')[1];
  epoch.value = Math.max(epoch.value, ...incoming.editions.map(([, row]) => row.revision));
  return { conflicts, changed, next };
}

export async function planPartial(envelope, { removeCustom = false, selected = null } = {}) {
  const { type, payload } = envelope;
  const data = await readLocal();
  const { combined, historical, editorial } = corpora(data);
  const banks = {};
  const preferences = {};
  let changes = 0, conflicts = [], items = [];
  const replace = (name, after, stores = Object.keys(after)) => {
    const pick = database => Object.fromEntries(stores.map(store => [store, database[store]]));
    banks[name] = { before: pick(data.databases[name]), after: pick(after) };
  };
  const preference = (key, value) => {
    const current = data.preferences[key] ?? null;
    if (current === value) return;
    if (current !== null) conflicts.push('Datos locales distintos: ' + key);
    else preferences[key] = { before: current, after: value };
  };
  if (type === 'templates') {
    for (const [key, value] of validateTemplateRows(payload.templates)) {
      const existing = data.preferences[key];
      if (existing && equal(validateTemplate(JSON.parse(existing)), value)) continue;
      preference(key, JSON.stringify(value));
    }
    changes = Object.keys(preferences).length;
  } else if (type === 'bank') {
    const result = mergeBank(historical, combined.texts, payload.corpus, equal, allGrammarTags(combined));
    conflicts = result.conflicts;
    changes = result.added.length;
    if (changes) replace(corpusName, withCorpus(data.databases[corpusName], result.corpus));
    const addedKeys = new Set(await Promise.all(result.added.map(bankReviewKey)));
    for (const [key, value] of Object.entries(payload.reviews)) if (addedKeys.has(key)) preference(key, value);
  } else if (type === 'notebooks') {
    const result = notebookImport(data.databases[workspaceName], payload.workspace, historical, editorial);
    conflicts = result.conflicts;
    changes = result.changed;
    if (changes) replace(workspaceName, result.next);
  } else if (type === 'tag-exchange') {
    const proposals = parseProposals(envelope.proposals, payload.corpus.texts);
    items = await tagChanges(payload.corpus, combined, proposals, localStorage, removeCustom);
    const addressed = items.filter(row => !row.issue && (row.added.length || row.removed.length));
    const currentById = new Map(combined.texts.map(text => [text.id, text]));
    for (const row of addressed) {
      const copies = [historical, editorial].flatMap(corpus => corpus.texts.filter(text => text.id === row.id));
      const current = currentById.get(row.id);
      if (copies.some(text => text.latin !== current.latin || !equal(text.tagIds, current.tagIds)))
        row.issue = 'Hay dos versiones locales de la ficha';
    }
    const compatible = addressed.filter(row => !row.issue && (!selected || selected.includes(row.id)));
    changes = compatible.length;
    const catalogue = allGrammarTags(combined);
    for (const [name, corpus] of [[corpusName, historical], [workspaceName, editorial]]) {
      let next = corpus;
      for (const row of compatible) {
        if (next.texts.some(text => text.id === row.id)) next = attachGrammarTags(next, row.id, row.next, catalogue);
      }
      if (next !== corpus) {
        const editorial = name === workspaceName;
        replace(name, withCorpus(data.databases[name], next, editorial), editorial ? ['corpus', 'meta'] : ['corpus']);
      }
    }
  }
  if (!conflicts.length) {
    const databases = { ...data.databases };
    for (const [name, { after }] of Object.entries(banks)) databases[name] = { ...databases[name], ...after };
    validateData({ databases, preferences: { ...data.preferences,
      ...Object.fromEntries(Object.entries(preferences).map(([key, value]) => [key, value.after])) } });
  }
  return { type, changes, conflicts, items, banks, preferences };
}

export async function restorePartial(envelope, expected, options) {
  const next = await planPartial(envelope, options);
  const comparison = plan => ({ ...plan, banks: Object.fromEntries(
    Object.entries(plan.banks).map(([name, { before }]) => [name, before])) });
  if (!next.changes || next.conflicts.length || !equal(comparison(next), comparison(expected)))
    throw Error('La copia no tiene cambios aplicables o los datos locales cambiaron. Repite la comparación.');
  const committed = [], saved = [];
  try {
    for (const [name, { before, after }] of Object.entries(next.banks)) {
      await replaceDatabase(name, before, after);
      committed.push(name);
    }
    for (const row of next.items) {
      if (row.reviewKey && localStorage.getItem(row.reviewKey) !== row.localReview)
        throw Error('Cambió una decisión docente durante la importación.');
    }
    for (const [key, { before, after }] of Object.entries(next.preferences)) {
      if (localStorage.getItem(key) !== before) throw Error('Los datos locales cambiaron durante la importación.');
      localStorage.setItem(key, after);
      saved.push(key);
    }
  } catch (error) {
    for (const key of saved.reverse()) {
      const { before, after } = next.preferences[key];
      if (localStorage.getItem(key) !== after) continue;
      if (before === null) localStorage.removeItem(key);
      else localStorage.setItem(key, before);
    }
    const reverted = await Promise.allSettled(committed.reverse().map(name =>
      replaceDatabase(name, next.banks[name].after, next.banks[name].before)));
    if (reverted.some(result => result.status === 'rejected'))
      throw Error('Otra pestaña modificó los datos durante la importación. No se pudo verificar la reversión.');
    throw error;
  }
}
