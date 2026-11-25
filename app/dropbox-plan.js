export class SyncConflict extends Error {}

export function selectEditor(localHash, remoteHash, checkpoint, localIsEmpty, preference) {
  if (localHash === remoteHash) return 'same';
  if (localHash === checkpoint || (!checkpoint && localIsEmpty)) return 'download';
  if (remoteHash === checkpoint) return 'upload';
  if (preference === 'local') return 'upload';
  if (preference === 'remote') return 'download';
  throw new SyncConflict('El banco o los cuadernos difieren entre este dispositivo y Dropbox.');
}

/** Reconciliación de tres vías: ausencia + huella anterior equivale a una baja, no a un alta. */
export function mergeUsages(local, remote, checkpoints, fingerprint, conflict = null, preference) {
  const localRows = new Map(local), remoteRows = new Map(remote);
  const merged = new Map();
  const ids = new Set([...localRows.keys(), ...remoteRows.keys(), ...checkpoints.keys()]);
  for (const id of ids) {
    const localHash = localRows.has(id) ? fingerprint(localRows.get(id)) : null;
    const remoteHash = remoteRows.has(id) ? fingerprint(remoteRows.get(id)) : null;
    if (localHash === remoteHash) {
      if (localRows.has(id)) merged.set(id, localRows.get(id));
      continue;
    }
    const oldHash = checkpoints.get(id);
    const changedLocally = oldHash === undefined ? localHash !== null : localHash !== oldHash;
    const changedRemotely = oldHash === undefined ? remoteHash !== null : remoteHash !== oldHash;
    const choice = typeof preference === 'function' ? preference(id) : preference;
    if (changedLocally && changedRemotely && !choice) {
      const title = localRows.get(id)?.title ?? remoteRows.get(id)?.title ?? id;
      if (typeof conflict === 'function') {
        const error = new SyncConflict(conflict(id));
        error.item = id;
        throw error;
      }
      if (conflict) throw new SyncConflict(conflict);
      throw new SyncConflict('El uso del examen «' + title + '» cambió o se eliminó en ambos dispositivos. Se han conservado las dos versiones.');
    }
    const useLocal = changedLocally && (!changedRemotely || choice === 'local');
    const winner = useLocal ? localRows : remoteRows;
    if (winner.has(id)) merged.set(id, winner.get(id));
  }
  return [...merged].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}

/** Una sincronización interrumpida solo puede reanudarse sobre estados conocidos. */
export function isRecoverableSync(current, before, after) {
  return Object.keys(before).length > 0 && Object.keys(before).length === Object.keys(after).length &&
    Object.keys(current).length === Object.keys(before).length &&
    Object.keys(before).every(name => typeof before[name] === 'string' &&
      typeof after[name] === 'string' && (current[name] === before[name] || current[name] === after[name]));
}

const reviewKey = row => [row.start, row.end, row.tagId].join(':');
export function applyBankReviewDecision(cached, decision) {
  if (!decision) return null;
  const existing = new Map((Array.isArray(cached?.pending) ? cached.pending : []).map(row => [reviewKey(row), row]));
  const pending = decision.pending.map(row => {
    const old = cached?.version === decision.version ? existing.get(reviewKey(row)) : null;
    return old && old.state === row.state ? { ...row, evidence: old.evidence ?? [], alternatives: old.alternatives ?? [] } : row;
  });
  // Do not inherit stale versions or old, deleted pending rows.
  return { ...decision, pending };
}

// Keep each editorial notebook together with the history that validates its revision.
function editorParts(editor) {
  const remainder = structuredClone(editor);
  const parts = [];
  for (const [name, stores] of Object.entries(remainder)) {
    if (stores.editions) {
      const histories = new Map();
      for (const entry of stores.history) {
        const id = entry[0][0];
        if (!histories.has(id)) histories.set(id, []);
        histories.get(id).push(entry);
      }
      for (const [id, row] of stores.editions)
        parts.push([JSON.stringify([name, 'edition', id]), { row, history: histories.get(id) ?? [] }]);
      stores.editions = [];
      stores.history = [];
    }
    const corpus = stores.corpus[0]?.[1]?.corpus;
    if (!corpus) continue;
    for (const field of ['texts', 'notebooks', 'tags', 'textRevisions']) {
      if (!corpus[field]) continue;
      for (const row of corpus[field]) parts.push([JSON.stringify([name, field, row.id]), row]);
      corpus[field] = [];
    }
  }
  return { remainder, parts };
}

export async function fingerprintEditorParts(editor, fingerprint) {
  const { parts } = editorParts(editor);
  return Promise.all(parts.map(async ([key, row]) => [key, await fingerprint(row)]));
}

export async function mergeEditorParts(local, remote, baseline, fingerprint, preference) {
  const left = editorParts(local), right = editorParts(remote);
  // Revision counters only constrain the merged records, so retain the higher counter.
  const revisionKeys = new Map();
  for (const side of [left, right]) {
    for (const [name, stores] of Object.entries(side.remainder)) {
      const corpus = stores.corpus[0]?.[1];
      if (corpus) {
        revisionKeys.set(name, Math.max(revisionKeys.get(name) ?? 0, corpus.revision));
        corpus.revision = 1;
      }
      const revision = stores.meta?.find(([key]) => key === 'workspace-revision')?.[1];
      if (revision) {
        const key = name + ':workspace';
        revisionKeys.set(key, Math.max(revisionKeys.get(key) ?? 0, revision.value));
        revision.value = 0;
      }
    }
  }
  if (await fingerprint(left.remainder) !== await fingerprint(right.remainder)) return null;
  const hashes = new Map(await Promise.all([...left.parts, ...right.parts]
    .map(async ([, row]) => [row, await fingerprint(row)])));
  const merged = mergeUsages(left.parts, right.parts, new Map(baseline), row => hashes.get(row),
    key => 'Cambió o se eliminó en ambos dispositivos: ' + keyTitle(key, left.parts, right.parts), preference);
  for (const [key, value] of merged) {
    const [name, field, id] = JSON.parse(key);
    const stores = left.remainder[name];
    if (field === 'edition') {
      stores.editions.push([id, value.row]);
      stores.history.push(...value.history);
    } else {
      stores.corpus[0][1].corpus[field].push(value);
    }
  }
  for (const [name, stores] of Object.entries(left.remainder)) {
    const corpus = stores.corpus[0]?.[1];
    if (corpus) corpus.revision = revisionKeys.get(name);
    const revision = stores.meta?.find(([key]) => key === 'workspace-revision')?.[1];
    if (revision) revision.value = revisionKeys.get(name + ':workspace');
  }
  for (const stores of Object.values(left.remainder))
    stores.history?.sort(([a], [b]) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]);
  return left.remainder;
}

function keyTitle(key, local, remote) {
  const row = local.find(([id]) => id === key)?.[1] ?? remote.find(([id]) => id === key)?.[1];
  return row?.row?.edition?.title ?? row?.title ?? row?.label ?? JSON.parse(key)[2];
}

/** Solo se omite la descarga sobre una revisión y huella previamente verificadas. */
export function unchangedCheckpoint(checkpoint, localHash, remoteRevision, pending) {
  return !pending && typeof remoteRevision === 'string' && remoteRevision.length > 0 &&
    checkpoint?.revision === remoteRevision && checkpoint?.hash === localHash;
}

/** Todas las restauraciones y sincronizaciones comparten este bloqueo del origen. */
let workspaceQueue = Promise.resolve();
export function withWorkspaceLock(work, locks = globalThis.navigator?.locks) {
  if (locks) return locks.request('atl-v1:dropbox', work);
  // Sin Web Locks, al menos serializa las operaciones del mismo documento.
  const next = workspaceQueue.then(work);
  workspaceQueue = next.catch(() => {});
  return next;
}
