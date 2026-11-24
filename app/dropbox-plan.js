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
    if (changedLocally && changedRemotely && !preference) {
      const title = localRows.get(id)?.title ?? remoteRows.get(id)?.title ?? id;
      if (conflict) throw new SyncConflict(conflict);
      throw new SyncConflict('El uso del examen «' + title + '» cambió o se eliminó en ambos dispositivos. Se han conservado las dos versiones.');
    }
    const useLocal = changedLocally && (!changedRemotely || preference === 'local');
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
