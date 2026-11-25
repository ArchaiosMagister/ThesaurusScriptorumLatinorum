const name = 'atl-v1:recovery-history';

async function access(mode, work) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('copies', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('copies', mode);
      const request = work(tx.objectStore('copies'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? Error('No se pudo guardar el historial.'));
    });
  } finally {
    db.close();
  }
}

export async function saveRecoveryCopy(copy, reason) {
  const record = { id: copy.contentHash, date: copy.exportedAt, reason, copy };
  await access('readwrite', store => store.put(record));
  return (await readRecoveryCopy(record.id)).copy;
}

export function readRecoveryCopy(id) {
  return access('readonly', store => store.get(id));
}

export async function listRecoveryCopies() {
  const entries = [];
  await access('readonly', store => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const { id, date, reason } = cursor.value;
      entries.push({ id, date, reason });
      cursor.continue();
    };
    return store.count();
  });
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}


// Separate database: the sync journal is potentially much larger than the
// browser's localStorage quota. Credentials remain in their original store.
async function syncStateAccess(mode, work) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('atl-v1:dropbox-state', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('Otra pestaña bloquea el estado de Dropbox.'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('state', mode);
      const request = work(tx.objectStore('state'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? Error('No se pudo guardar el estado de Dropbox.'));
    });
  } finally { db.close(); }
}

const legacyStateKey = name => 'atl-v1:dropbox:' + name;

export async function readSyncState(name) {
  const existing = await syncStateAccess('readonly', store => store.get(name));
  const legacy = localStorage.getItem(legacyStateKey(name));
  if (legacy === null) return existing ?? null;
  const previous = JSON.parse(legacy);
  if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(previous))
    throw Error('El estado de Dropbox cambió desde una versión anterior. Cierra las otras pestañas antes de continuar.');
  if (existing === undefined) await syncStateAccess('readwrite', store => store.put(previous, name));
  // Only retire the old copy after the new transaction has committed.
  if (localStorage.getItem(legacyStateKey(name)) !== legacy)
    throw Error('Otra pestaña modificó el estado de Dropbox durante la migración.');
  localStorage.removeItem(legacyStateKey(name));
  return previous;
}

export async function saveSyncState(name, value) {
  if (localStorage.getItem(legacyStateKey(name)) !== null)
    throw Error('Otra versión de la aplicación modificó el estado de Dropbox.');
  await syncStateAccess('readwrite', store => store.put(value, name));
}

export async function removeSyncState(name) {
  if (localStorage.getItem(legacyStateKey(name)) !== null)
    throw Error('Otra versión de la aplicación modificó el estado de Dropbox.');
  await syncStateAccess('readwrite', store => store.delete(name));
}
