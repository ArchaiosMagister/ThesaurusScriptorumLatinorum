import { InvalidCorpusError } from '../core/errors.js';
import { emptyCorpus, type CorpusV1 } from '../core/model.js';
import { validateCorpus } from '../core/validation.js';
import type { CorpusRepository, CorpusSnapshot } from '../ports/corpus-repository.js';

export const DEFAULT_DATABASE_NAME = 'cuaderno-textos-latinos';
const DATABASE_VERSION = 1;
const STORE = 'corpus';
const KEY = 'current';

export class RevisionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super('Conflicto de revisión: se esperaba ' + expected + ' y existe ' + actual + '. Vuelve a cargar antes de guardar.');
    this.name = 'RevisionConflictError';
  }
}

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Desconfía también de registros existentes (p. ej. ante corrupción o un upgrade fallido). */
function decodeRecord(value: unknown): CorpusSnapshot {
  if (value === undefined) return { corpus: emptyCorpus(), revision: 0 };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidCorpusError('El registro guardado no es un objeto válido.');
  }
  const row = value as Record<string, unknown>;
  if (
    row.key !== KEY ||
    !Number.isSafeInteger(row.revision) ||
    typeof row.revision !== 'number' ||
    row.revision < 1 ||
    Object.keys(row).some((key) => !['key', 'revision', 'corpus'].includes(key))
  ) {
    throw new InvalidCorpusError('La estructura o la revisión almacenada son inválidas.');
  }
  return {
    corpus: validateCorpus(row.corpus),
    revision: row.revision,
  };
}

/**
 * Un único registro garantiza que el corpus y sus relaciones se escriben juntos.
 * Nunca borra ni recrea la base de datos existente en caso de fallo.
 */
export class IndexedDbCorpusRepository implements CorpusRepository {
  constructor(
    private readonly databaseName: string = DEFAULT_DATABASE_NAME,
    private readonly factory: IDBFactory | undefined = globalThis.indexedDB,
  ) {}

  private async open(): Promise<IDBDatabase> {
    if (!this.factory) {
      throw new StorageUnavailableError('IndexedDB no está disponible en este navegador.');
    }
    return new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.factory!.open(this.databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(new StorageUnavailableError('No se pudo abrir IndexedDB: ' + errorMessage(error)));
        return;
      }
      let blocked = false;
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      request.onblocked = () => {
        blocked = true;
        reject(new StorageUnavailableError('Otra pestaña impide abrir el almacenamiento. Cierra las demás pestañas e inténtalo de nuevo.'));
      };
      request.onerror = () => reject(
        new StorageUnavailableError('No se pudo abrir el almacenamiento: ' + (request.error?.message ?? 'error desconocido')),
      );
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        if (blocked) {
          database.close();
        } else {
          resolve(database);
        }
      };
    });
  }

  async load(): Promise<CorpusSnapshot> {
    const db = await this.open();
    return new Promise<CorpusSnapshot>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, 'readonly');
      } catch (error) {
        db.close();
        reject(new StorageUnavailableError('No se puede leer el almacenamiento: ' + errorMessage(error)));
        return;
      }
      const request = tx.objectStore(STORE).get(KEY);
      tx.oncomplete = () => {
        db.close();
        try {
          resolve(decodeRecord(request.result));
        } catch (error) {
          reject(error);
        }
      };
      tx.onabort = () => {
        db.close();
        reject(new StorageUnavailableError('La lectura se ha interrumpido: ' + (tx.error?.message ?? 'operación cancelada')));
      };
    });
  }

  async save(corpus: CorpusV1, expectedRevision: number): Promise<CorpusSnapshot> {
    // Toda la validación se hace antes de abrir una transacción de escritura.
    const valid = validateCorpus(corpus);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new InvalidCorpusError('La revisión esperada no es válida.');
    }
    const db = await this.open();
    return new Promise<CorpusSnapshot>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, 'readwrite');
      } catch (error) {
        db.close();
        reject(new StorageUnavailableError('No se puede escribir en el almacenamiento: ' + errorMessage(error)));
        return;
      }
      let writeError: Error | null = null;
      let next: CorpusSnapshot | null = null;
      const store = tx.objectStore(STORE);
      const request = store.get(KEY);
      request.onsuccess = () => {
        try {
          const previous = decodeRecord(request.result);
          if (previous.revision !== expectedRevision) {
            throw new RevisionConflictError(expectedRevision, previous.revision);
          }
          if (previous.revision === Number.MAX_SAFE_INTEGER) {
            throw new InvalidCorpusError('Se ha alcanzado el límite de revisiones.');
          }
          next = { corpus: valid, revision: previous.revision + 1 };
          store.put({ key: KEY, revision: next.revision, corpus: valid });
        } catch (error) {
          writeError = error instanceof Error ? error : new Error(String(error));
          try {
            tx.abort();
          } catch {
            // La transacción podría haberse cancelado ya.
          }
        }
      };
      tx.oncomplete = () => {
        db.close();
        if (next) resolve(next);
        else reject(new StorageUnavailableError('La escritura no llegó a realizarse.'));
      };
      tx.onabort = () => {
        db.close();
        reject(writeError ?? new StorageUnavailableError(
          'No se han guardado los cambios: ' + (tx.error?.message ?? 'transacción cancelada'),
        ));
      };
    });
  }
}
