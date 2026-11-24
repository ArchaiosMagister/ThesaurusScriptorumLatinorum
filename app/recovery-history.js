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
