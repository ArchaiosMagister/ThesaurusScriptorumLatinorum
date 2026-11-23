export function selectEditor(localHash, remoteHash, checkpoint, localIsEmpty) {
  if (localHash === remoteHash) return 'same';
  if (localHash === checkpoint || (!checkpoint && localIsEmpty)) return 'download';
  if (remoteHash === checkpoint) return 'upload';
  throw new Error('El banco o los cuadernos difieren entre este dispositivo y Dropbox. Ambos se han conservado. Revisa las dos copias antes de sincronizar.');
}

export function mergeUsages(local, remote, checkpoints, fingerprints) {
  const merged = new Map(remote);
  for (const entry of local) {
    const [id, row] = entry;
    const other = merged.get(id);
    if (!other || fingerprints(row) === fingerprints(other) || fingerprints(other) === checkpoints.get(id)) {
      merged.set(id, row);
    } else if (fingerprints(row) !== checkpoints.get(id)) {
      throw new Error('El uso del examen «' + row.title + '» cambió en ambos dispositivos. Se han conservado ambos registros.');
    }
  }
  return [...merged].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}
