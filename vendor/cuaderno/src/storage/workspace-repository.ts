import { emptyCorpus, type CorpusV1 } from '../core/model.js';
import { validateCorpus } from '../core/validation.js';
import type { CorpusSnapshot } from '../ports/corpus-repository.js';
import type { NotebookEditionV1, OperationEventV1 } from '../core/edition-model.js';
import { validateEdition } from '../core/edition-validation.js';

/** Base independiente: jamás se abre/actualiza la IndexedDB de la aplicación histórica. */
export const WORKSPACE_DATABASE_NAME = 'cuaderno-textos-latinos-workspace';
export const WORKSPACE_DATABASE_VERSION = 1;
export const WORKSPACE_STORES = ['corpus', 'editions', 'history', 'meta'] as const;
const EPOCH_KEY = 'workspace-revision';
const LEGACY_KEY = 'migration-legacy-v1';
const MAX_REVISION = Number.MAX_SAFE_INTEGER - 1;

export class WorkspaceStorageError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceStorageError'; }
}
export class WorkspaceConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Conflicto de revisión: se esperaba ${expected} y existe ${actual}. Recarga antes de guardar.`);
    this.name = 'WorkspaceConflictError';
  }
}
export class WorkspaceMigrationConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceMigrationConflictError'; }
}
export class WorkspaceHistoryError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceHistoryError'; }
}

export interface EditionSnapshotV1 { revision: number; edition: NotebookEditionV1 }
export interface MigrationRecordV1 {
  schemaVersion: 1;
  sourceKind: 'database' | 'backup';
  sourceRevision: number;
  sourceSha256: string;
  migratedAt: string;
  notebookIdMap: Record<string, string>;
  textCount: number;
  notebookCount: number;
}
export interface WorkspaceSnapshotV1 {
  workspaceRevision: number;
  corpus: CorpusSnapshot | null;
  editions: EditionSnapshotV1[];
  history: OperationEventV1[];
  migration: MigrationRecordV1 | null;
}
export interface EditionMutationV1 {
  command: string;
  targetId: string;
  timestamp: string;
}

type WorkspaceStore = (typeof WORKSPACE_STORES)[number];
interface CorpusRow { key: 'current'; revision: number; corpus: CorpusV1 }
interface EditionRow { key: string; revision: number; edition: NotebookEditionV1 }
interface HistoryRow { key: [string, number]; event: OperationEventV1 }
interface MetaRow { key: string; value: unknown }

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length <= 120 && idPattern.test(id);
}
function validIso(value: unknown): value is string {
  return typeof value === 'string' && isoPattern.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}
function rev(value: unknown, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new WorkspaceStorageError('Revisión persistida inválida; no se sustituye el documento.');
  }
  return value;
}
function rowObject(value: unknown, keys: string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkspaceStorageError(`${name}: se esperaba un registro.`);
  }
  const object = value as Record<string, unknown>;
  if (Object.keys(object).sort().join('|') !== keys.slice().sort().join('|')) {
    throw new WorkspaceStorageError(`${name}: estructura del registro incompatible.`);
  }
  return object;
}
function corpusRow(value: unknown): CorpusRow {
  const d = rowObject(value, ['key', 'revision', 'corpus'], 'corpus');
  if (d.key !== 'current') throw new WorkspaceStorageError('Clave de corpus inesperada.');
  return { key: 'current', revision: rev(d.revision), corpus: validateCorpus(d.corpus) };
}
function editionRow(value: unknown): EditionRow {
  const d = rowObject(value, ['key', 'revision', 'edition'], 'edition');
  if (!validId(d.key)) throw new WorkspaceStorageError('Clave de edición inválida.');
  const edition = validateEdition(d.edition);
  if (d.key !== edition.id) throw new WorkspaceStorageError('ID del cuaderno distinto de la clave.');
  return { key: d.key, revision: rev(d.revision), edition };
}
function migrationRecord(value: unknown): MigrationRecordV1 {
  const d = rowObject(value, [
    'schemaVersion', 'sourceKind', 'sourceRevision', 'sourceSha256', 'migratedAt',
    'notebookIdMap', 'textCount', 'notebookCount',
  ], 'migration');
  if (d.schemaVersion !== 1 || (d.sourceKind !== 'database' && d.sourceKind !== 'backup')
    || !validIso(d.migratedAt) || typeof d.sourceSha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(d.sourceSha256)) {
    throw new WorkspaceStorageError('Marca de migración inválida.');
  }
  const map = d.notebookIdMap;
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    throw new WorkspaceStorageError('Mapa de migración inválido.');
  }
  const notebookIdMap = Object.fromEntries(Object.entries(map).map(([key, value]) => {
    if (!validId(key) || !validId(value)) throw new WorkspaceStorageError('Mapeo de IDs inválido.');
    return [key, value];
  }));
  return {
    schemaVersion: 1, sourceKind: d.sourceKind, sourceRevision: rev(d.sourceRevision, true),
    sourceSha256: d.sourceSha256, migratedAt: d.migratedAt,
    notebookIdMap, textCount: rev(d.textCount, true), notebookCount: rev(d.notebookCount, true),
  };
}
function historyRow(value: unknown): HistoryRow {
  const d = rowObject(value, ['key', 'event'], 'history');
  if (!Array.isArray(d.key) || d.key.length !== 2 || !validId(d.key[0])) {
    throw new WorkspaceStorageError('Clave de historial inválida.');
  }
  const seq = rev(d.key[1]);
  const e = rowObject(d.event, [
    'id', 'editionId', 'sequence', 'command', 'targetId', 'timestamp',
    'revisionBefore', 'revisionAfter', 'before', 'after',
  ], 'history.event');
  const revisionBefore = rev(e.revisionBefore, true);
  const revisionAfter = rev(e.revisionAfter);
  if (!validId(e.id) || !validId(e.editionId) || !validId(e.targetId)
    || typeof e.command !== 'string' || !e.command.trim() || e.command.length > 120
    || !validIso(e.timestamp) || e.editionId !== d.key[0] || rev(e.sequence) !== seq
    || revisionBefore + 1 !== revisionAfter
    || revisionAfter !== seq) {
    throw new WorkspaceStorageError('Evento de historial corrupto o incompatible.');
  }
  const before = e.before === null ? null : validateEdition(e.before);
  const after = validateEdition(e.after);
  if ((before && before.id !== e.editionId) || after.id !== e.editionId) {
    throw new WorkspaceStorageError('Evento referido a otro cuaderno.');
  }
  return {key: [e.editionId, seq], event: {
    id: e.id, editionId: e.editionId, sequence: seq, command: e.command,
    targetId: e.targetId, timestamp: e.timestamp,
    revisionBefore, revisionAfter,
    before, after,
  }};
}
function metaRow(value: unknown): MetaRow {
  const d = rowObject(value, ['key', 'value'], 'meta');
  if (d.key !== EPOCH_KEY && d.key !== LEGACY_KEY) {
    throw new WorkspaceStorageError('Metadato desconocido en versión workspace 1.');
  }
  return {key: d.key, value: d.value};
}
function epoch(value: unknown): number {
  if (value === undefined) return 0;
  const record = metaRow(value);
  if (record.key !== EPOCH_KEY) throw new WorkspaceStorageError('Revisión global inválida.');
  return rev(record.value, true);
}
function recordMigration(value: unknown): MigrationRecordV1 | null {
  if (value === undefined) return null;
  const record = metaRow(value);
  if (record.key !== LEGACY_KEY) throw new WorkspaceStorageError('Marca de migración inesperada.');
  return migrationRecord(record.value);
}
function checkExpected(expected: number): void {
  if (!Number.isSafeInteger(expected) || expected < 0 || expected > MAX_REVISION) {
    throw new WorkspaceStorageError('Revisión esperada inválida.');
  }
}
function checkMutation(m: EditionMutationV1): void {
  if (!validId(m.targetId) || typeof m.command !== 'string' || !m.command.trim()
    || m.command.length > 120 || m.command === 'undo' || !validIso(m.timestamp)) {
    throw new WorkspaceStorageError('Metadatos del cambio inválidos.');
  }
}
function eventFor(editionId: string, revisionBefore: number,
  before: NotebookEditionV1 | null, after: NotebookEditionV1,
  mutation: EditionMutationV1, id: string): OperationEventV1 {
  return {
    id, editionId, sequence: revisionBefore + 1,
    command: mutation.command, targetId: mutation.targetId,
    timestamp: mutation.timestamp, revisionBefore,
    revisionAfter: revisionBefore + 1, before, after,
  };
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Signal<T> = (value: T) => void;
type Abort = (error: unknown) => void;

/** Primitiva atómica: nunca espera a una Promise dentro de una transacción IDB. */
export class WorkspaceRepository {
  constructor(
    readonly databaseName: string = WORKSPACE_DATABASE_NAME,
    private readonly factory: IDBFactory | undefined = globalThis.indexedDB,
  ) {}

  private async open(): Promise<IDBDatabase> {
    if (!this.factory) throw new WorkspaceStorageError('IndexedDB no disponible.');
    return new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try { request = this.factory!.open(this.databaseName, WORKSPACE_DATABASE_VERSION); }
      catch (error) { reject(new WorkspaceStorageError('No se pudo abrir workspace: ' + message(error))); return; }
      let blocked = false;
      request.onblocked = () => { blocked = true; reject(new WorkspaceStorageError('Otra pestaña bloquea workspace.')); };
      request.onerror = () => reject(new WorkspaceStorageError('Error al abrir workspace: ' + message(request.error)));
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of WORKSPACE_STORES) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, {keyPath: 'key'});
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        if (blocked) db.close(); else resolve(db);
      };
    });
  }

  private async transact<T>(stores: readonly WorkspaceStore[], mode: IDBTransactionMode,
    work: (tx: IDBTransaction, finish: Signal<T>, abort: Abort) => void): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = db.transaction([...stores], mode); }
      catch (error) {
        db.close(); reject(new WorkspaceStorageError('No se pudo abrir una transacción: ' + message(error))); return;
      }
      let value: T | undefined;
      let finished = false;
      let reason: Error | null = null;
      const abort: Abort = (error) => {
        reason = error instanceof Error ? error : new WorkspaceStorageError(message(error));
        try { tx.abort(); } catch { /* la transacción puede estar ya abortada */ }
      };
      tx.oncomplete = () => {
        db.close();
        if (finished) resolve(value as T);
        else reject(new WorkspaceStorageError('Transacción completada sin confirmación.'));
      };
      tx.onabort = () => {
        db.close();
        reject(reason ?? new WorkspaceStorageError('Transacción revertida: ' + message(tx.error)));
      };
      tx.onerror = () => { /* onabort proporciona el diagnóstico y conserva atomicidad */ };
      try { work(tx, result => { value = result; finished = true; }, abort); }
      catch (error) { abort(error); }
    });
  }

  /** Lectura coherente de los cuatro stores (incluido el historial de hasta 20 cambios). */
  async snapshot(): Promise<WorkspaceSnapshotV1> {
    return this.transact(WORKSPACE_STORES, 'readonly', (tx, finish, abort) => {
      const requests = WORKSPACE_STORES.map(name => tx.objectStore(name).getAll());
      let pending = requests.length;
      requests.forEach(request => {
        request.onsuccess = () => {
          if (--pending !== 0) return;
          try {
            const [c, e, h, m] = requests.map(x => x.result as unknown[]);
            const cr = c!.length ? corpusRow(c![0]) : null;
            if (c!.length > 1) throw new WorkspaceStorageError('Más de un corpus en workspace.');
            const er = e!.map(editionRow);
            const hr = h!.map(historyRow);
            const mr = m!.map(metaRow);
            if (mr.length > 2 || new Set(mr.map(x => x.key)).size !== mr.length) {
              throw new WorkspaceStorageError('Metadatos de workspace duplicados.');
            }
            const currentEpoch = epoch(mr.find(x => x.key === EPOCH_KEY));
            const migration = recordMigration(mr.find(x => x.key === LEGACY_KEY));
            if (!currentEpoch && (cr || er.length || hr.length || migration)) {
              throw new WorkspaceStorageError('Workspace con datos pero sin revisión global.');
            }
            const known = new Map(er.map(x => [x.key, x.revision]));
            if (known.size !== er.length) throw new WorkspaceStorageError('IDs de edición repetidos.');
            for (const entry of hr) {
              const editionRevision = known.get(entry.event.editionId);
              if (!editionRevision || entry.event.revisionAfter > editionRevision) {
                throw new WorkspaceStorageError('Historial referido a una revisión inexistente.');
              }
            }
            finish(validateWorkspaceSnapshot({
              workspaceRevision: currentEpoch,
              corpus: cr ? {corpus: cr.corpus, revision: cr.revision} : null,
              editions: er.map(x => ({revision: x.revision, edition: x.edition})),
              history: hr.map(x => x.event).sort((a, b) =>
                a.editionId.localeCompare(b.editionId) || a.sequence - b.sequence),
              migration,
            }));
          } catch (error) { abort(error); }
        };
      });
    });
  }

  async loadCorpus(): Promise<CorpusSnapshot> {
    return this.transact(['corpus'], 'readonly', (tx, finish, abort) => {
      const q = tx.objectStore('corpus').get('current');
      q.onsuccess = () => {
        try {
          const c = q.result === undefined ? null : corpusRow(q.result);
          finish(c ? { corpus: c.corpus, revision: c.revision } : { corpus: emptyCorpus(), revision: 0 });
        } catch (err) { abort(err); }
      };
    });
  }

  async loadEdition(id: string): Promise<EditionSnapshotV1 | null> {
    if (!validId(id)) throw new WorkspaceStorageError('ID de edición inválido.');
    return this.transact(['editions'], 'readonly', (tx, finish, abort) => {
      const q = tx.objectStore('editions').get(id);
      q.onsuccess = () => {
        try {
          const row = q.result === undefined ? null : editionRow(q.result);
          finish(row ? {revision: row.revision, edition: row.edition} : null);
        } catch (error) { abort(error); }
      };
    });
  }

  async listEditions(): Promise<EditionSnapshotV1[]> {
    return this.transact(['editions'], 'readonly', (tx, finish, abort) => {
      const q = tx.objectStore('editions').getAll();
      q.onsuccess = () => {
        try { finish((q.result as unknown[]).map(editionRow).map(row => ({revision: row.revision, edition: row.edition}))); }
        catch (error) { abort(error); }
      };
    });
  }

  async history(id: string): Promise<OperationEventV1[]> {
    if (!validId(id)) throw new WorkspaceStorageError('ID de historial inválido.');
    return this.transact(['history'], 'readonly', (tx, finish, abort) => {
      const q = tx.objectStore('history').getAll();
      q.onsuccess = () => {
        try { finish((q.result as unknown[]).map(historyRow).map(x => x.event)
          .filter(e => e.editionId === id).sort((a,b) => a.sequence - b.sequence)); }
        catch (error) { abort(error); }
      };
    });
  }

  /** CAS sobre el banco de textos copiado, nunca sobre el CorpusV1 de producción. */
  async saveCorpus(corpus: CorpusV1, expectedRevision: number): Promise<CorpusSnapshot> {
    const valid = validateCorpus(corpus);
    checkExpected(expectedRevision);
    return this.transact(['corpus','meta'], 'readwrite', (tx, finish, abort) => {
      const cr = tx.objectStore('corpus').get('current');
      const er = tx.objectStore('meta').get(EPOCH_KEY);
      let pending = 2;
      const ready = () => {
        if (--pending) return;
        try {
          const current = cr.result === undefined ? null : corpusRow(cr.result);
          const previous = current?.revision ?? 0;
          const ep = epoch(er.result);
          if (previous !== expectedRevision) throw new WorkspaceConflictError(expectedRevision, previous);
          if (previous > 0 && ep === 0) throw new WorkspaceStorageError('Falta la revisión global del workspace.');
          if (previous >= MAX_REVISION || ep >= MAX_REVISION) throw new WorkspaceStorageError('Límite de revisiones alcanzado.');
          const next: CorpusRow = {key:'current',revision:previous+1,corpus:valid};
          tx.objectStore('corpus').put(next);
          tx.objectStore('meta').put({key:EPOCH_KEY,value:ep+1});
          finish({corpus:valid,revision:next.revision});
        } catch (error) { abort(error); }
      };
      cr.onsuccess = ready; er.onsuccess = ready;
    });
  }

  /**
   * El cambio de edición y su evento (before/after) se graban en UNA transacción.
   * La función de mutación es pura/síncrona; nunca espera candidatos dentro de IDB.
   */
  async commitEdition(id: string, expectedRevision: number, mutation: EditionMutationV1,
    update: (previous: NotebookEditionV1 | null) => NotebookEditionV1,
    importDependencies?: (corpus: CorpusV1) => {edition: NotebookEditionV1; corpus: CorpusV1}): Promise<EditionSnapshotV1> {
    if (!validId(id)) throw new WorkspaceStorageError('ID de edición inválido.');
    checkExpected(expectedRevision);
    checkMutation(mutation);
    const eventId = 'evt.' + globalThis.crypto.randomUUID();
    return this.transact(importDependencies?['editions','history','meta','corpus']:['editions','history','meta'], 'readwrite', (tx, finish, abort) => {
      const prior = tx.objectStore('editions').get(id);
      const epQuery = tx.objectStore('meta').get(EPOCH_KEY);
      const lastEvent = expectedRevision > 0
        ? tx.objectStore('history').get([id, expectedRevision]) : null;
      const dependencyQuery = importDependencies ? tx.objectStore('corpus').get('current') : null;
      let pending = 2 + Number(lastEvent !== null) + Number(dependencyQuery !== null);
      const ready = () => {
        if (--pending) return;
        try {
          const old = prior.result === undefined ? null : editionRow(prior.result);
          const before = old?.edition ?? null;
          const previous = old?.revision ?? 0;
          const ep = epoch(epQuery.result);
          if (previous !== expectedRevision) throw new WorkspaceConflictError(expectedRevision, previous);
          if (previous > 0 && ep === 0) throw new WorkspaceStorageError('Falta la revisión global del workspace.');
          if (previous >= MAX_REVISION || ep >= MAX_REVISION) throw new WorkspaceStorageError('Revisiones agotadas.');
          // Si la última escritura del cuaderno se ha corrompido, no apilar
          // otra operación encima de una cadena de historial incoherente.
          const last = lastEvent?.result === undefined ? null : historyRow(lastEvent.result).event;
          if (previous > 1 && !last) throw new WorkspaceHistoryError('Falta el último evento de este cuaderno.');
          if (last && JSON.stringify(validateEdition(last.after)) !== JSON.stringify(before)) {
            throw new WorkspaceHistoryError('La última revisión no coincide con su historial.');
          }
          const priorCorpus = dependencyQuery?.result === undefined ? null : corpusRow(dependencyQuery.result);
          const imported = importDependencies?.(priorCorpus?.corpus ?? emptyCorpus());
          const after = validateEdition(imported?.edition ?? update(before ? structuredClone(before) : null));
          if (imported) {
            const updatedCorpus = validateCorpus(imported.corpus);
            tx.objectStore('corpus').put({key:'current',revision:(priorCorpus?.revision ?? 0)+1,corpus:updatedCorpus});
          }
          if (after.id !== id) throw new WorkspaceStorageError('Una mutación no puede cambiar el ID de edición.');
          if (before !== null && after.createdAt !== before.createdAt) {
            throw new WorkspaceStorageError('Una mutación no puede cambiar la fecha de creación.');
          }
          const next = {revision: previous+1, edition: after};
          const event = eventFor(id,previous,before,after,mutation,eventId);
          tx.objectStore('editions').put({key:id,...next});
          tx.objectStore('history').add({key:[id,next.revision],event});
          tx.objectStore('meta').put({key:EPOCH_KEY,value:ep+1});
          finish(next);
        } catch (error) { abort(error); }
      };
      prior.onsuccess = ready; epQuery.onsuccess = ready;
      if (lastEvent) lastEvent.onsuccess = ready;
      if (dependencyQuery) dependencyQuery.onsuccess = ready;
    });
  }

  /** Eliminación atómica de la edición y su historial con control de revisión.
   * El corpus histórico y los demás cuadernos no se modifican.
   */
  async deleteEdition(id:string,expectedRevision:number):Promise<void>{
    if(!validId(id))throw new WorkspaceStorageError('ID de edición inválido.');
    checkExpected(expectedRevision);
    return this.transact(['editions','history','meta'],'readwrite',(tx,finish,abort)=>{
      const oldQuery=tx.objectStore('editions').get(id);
      const historyQuery=tx.objectStore('history').getAll();
      const epochQuery=tx.objectStore('meta').get(EPOCH_KEY);
      let pending=3;
      const ready=()=>{
        if(--pending)return;
        try{
          const old=oldQuery.result===undefined?null:editionRow(oldQuery.result);
          const previous=old?.revision??0;
          const ep=epoch(epochQuery.result);
          if(previous!==expectedRevision)throw new WorkspaceConflictError(expectedRevision,previous);
          if(!old)throw new WorkspaceStorageError('El cuaderno ya no existe.');
          if(old.edition.legacyNotebookId!==null)
            throw new WorkspaceStorageError('Cuaderno histórico protegido: eliminarlo rompería la trazabilidad de la migración.');
          if(!ep||ep>=MAX_REVISION)throw new WorkspaceStorageError('Revisión global inválida.');
          const own=(historyQuery.result as unknown[]).map(historyRow)
            .filter(row=>row.event.editionId===id);
          if(!own.some(row=>row.event.revisionAfter===previous))
            throw new WorkspaceHistoryError('Falta el historial de la revisión actual.');
          for(const row of own)tx.objectStore('history').delete(row.key);
          tx.objectStore('editions').delete(id);
          tx.objectStore('meta').put({key:EPOCH_KEY,value:ep+1});
          finish(undefined);
        }catch(e){abort(e);}
      };
      oldQuery.onsuccess=ready;historyQuery.onsuccess=ready;epochQuery.onsuccess=ready;
    });
  }

  /** Deshace la última acción pendiente, incluso después de recargar la página. */
  async undoLast(id: string, expectedRevision: number, at: string): Promise<EditionSnapshotV1> {
    if (!validId(id) || !validIso(at)) throw new WorkspaceHistoryError('Solicitud de deshacer inválida.');
    checkExpected(expectedRevision);
    const eventId = 'evt.' + globalThis.crypto.randomUUID();
    return this.transact(['editions','history','meta'], 'readwrite', (tx, finish, abort) => {
      const prior = tx.objectStore('editions').get(id);
      const events = tx.objectStore('history').getAll();
      const epQuery = tx.objectStore('meta').get(EPOCH_KEY);
      let pending = 3;
      const ready = () => {
        if (--pending) return;
        try {
          const old = prior.result === undefined ? null : editionRow(prior.result);
          const previous = old?.revision ?? 0;
          const ep = epoch(epQuery.result);
          if (previous !== expectedRevision) throw new WorkspaceConflictError(expectedRevision, previous);
          if (!old) throw new WorkspaceHistoryError('No existe el cuaderno que quieres deshacer.');
          if (ep === 0) throw new WorkspaceStorageError('Falta la revisión global del workspace.');
          if (previous >= MAX_REVISION || ep >= MAX_REVISION) throw new WorkspaceStorageError('Revisiones agotadas.');
          const items = (events.result as unknown[]).map(historyRow).map(x => x.event)
            .filter(e => e.editionId === id).sort((a,b) => a.sequence - b.sequence);
          const undone = new Set(items.filter(e => e.command === 'undo').map(e => e.targetId));
          const eligible = items.filter(e => e.command !== 'undo' && e.before !== null && !undone.has(e.id));
          const last = eligible.at(-1);
          if (!last) throw new WorkspaceHistoryError('No hay más operaciones reversibles.');
          const afterSnapshot = validateEdition(last.after);
          if (JSON.stringify(afterSnapshot) !== JSON.stringify(old.edition)) {
            throw new WorkspaceHistoryError('El historial no corresponde al estado actual. No se aplica el deshacer.');
          }
          const restored = validateEdition(last.before);
          const next = {revision: previous+1, edition: restored};
          const undoEvent = eventFor(id, previous, old.edition, restored,
            {command:'undo',targetId:last.id,timestamp:at}, eventId);
          tx.objectStore('editions').put({key:id,...next});
          tx.objectStore('history').add({key:[id,next.revision],event:undoEvent});
          tx.objectStore('meta').put({key:EPOCH_KEY,value:ep+1});
          finish(next);
        } catch (error) { abort(error); }
      };
      prior.onsuccess = ready; events.onsuccess = ready; epQuery.onsuccess = ready;
    });
  }

  /** Solo se invoca tras validar por completo el plan y su copia previa. */
  async installLegacy(corpus: CorpusV1, editions: NotebookEditionV1[], marker: MigrationRecordV1):
    Promise<'created'|'already-present'> {
    const validCorpus = validateCorpus(corpus);
    const validEditions = editions.map(validateEdition);
    const meta = migrationRecord(marker);
    const ids = new Set(validEditions.map(e => e.id));
    if (ids.size !== validEditions.length) throw new WorkspaceMigrationConflictError('Ediciones migradas con IDs duplicados.');
    if (meta.notebookCount !== validEditions.length || meta.textCount !== validCorpus.texts.length) {
      throw new WorkspaceMigrationConflictError('Recuento de migración incoherente.');
    }
    return this.transact(WORKSPACE_STORES, 'readwrite', (tx, finish, abort) => {
      const corpusQ = tx.objectStore('corpus').count();
      const editionsQ = tx.objectStore('editions').count();
      const historyQ = tx.objectStore('history').count();
      const markerQ = tx.objectStore('meta').get(LEGACY_KEY);
      const epochQ = tx.objectStore('meta').get(EPOCH_KEY);
      let pending = 5;
      const ready = () => {
        if (--pending) return;
        try {
          const existing = recordMigration(markerQ.result);
          if (existing) {
            if (existing.sourceSha256 === meta.sourceSha256
              && existing.sourceRevision === meta.sourceRevision
              && existing.sourceKind === meta.sourceKind) {
              finish('already-present'); return;
            }
            throw new WorkspaceMigrationConflictError('Workspace ya migrado desde otro estado. Reconciliación manual necesaria.');
          }
          if (corpusQ.result !== 0 || editionsQ.result !== 0 || historyQ.result !== 0
            || epoch(epochQ.result) !== 0) {
            throw new WorkspaceMigrationConflictError('Workspace no está vacío: migración bloqueada para no sustituir trabajos.');
          }
          tx.objectStore('corpus').add({key:'current',revision:1,corpus:validCorpus});
          for (const e of validEditions) tx.objectStore('editions').add({key:e.id,revision:1,edition:e});
          tx.objectStore('meta').add({key:LEGACY_KEY,value:meta});
          tx.objectStore('meta').put({key:EPOCH_KEY,value:1});
          finish('created');
        } catch (error) { abort(error); }
      };
      corpusQ.onsuccess = ready; editionsQ.onsuccess = ready;
      historyQ.onsuccess = ready; markerQ.onsuccess = ready; epochQ.onsuccess = ready;
    });
  }

  /**
   * Reemplazo completo SOLO después de verificar el backup externo de workspace.
   * expectedWorkspaceRevision protege el estado de las otras pestañas.
   */
  async replaceFromVerifiedSnapshot(snapshot: WorkspaceSnapshotV1, expectedWorkspaceRevision: number,
    confirmed: boolean): Promise<void> {
    if (!confirmed) throw new WorkspaceStorageError('Restauración sin confirmación explícita.');
    checkExpected(expectedWorkspaceRevision);
    const data = validateWorkspaceSnapshot(snapshot);
    return this.transact(WORKSPACE_STORES, 'readwrite', (tx, finish, abort) => {
      const epochQ = tx.objectStore('meta').get(EPOCH_KEY);
      epochQ.onsuccess = () => {
        try {
          const current = epoch(epochQ.result);
          if (current !== expectedWorkspaceRevision) throw new WorkspaceConflictError(expectedWorkspaceRevision,current);
          const nextEpoch = Math.max(current, data.workspaceRevision) + 1;
          if (nextEpoch > MAX_REVISION) throw new WorkspaceStorageError('Revisiones agotadas.');
          for (const store of WORKSPACE_STORES) tx.objectStore(store).clear();
          if (data.corpus) tx.objectStore('corpus').add({key:'current',...data.corpus});
          for (const row of data.editions) tx.objectStore('editions').add({key:row.edition.id,...row});
          for (const event of data.history) {
            tx.objectStore('history').add({key:[event.editionId,event.sequence],event});
          }
          if (data.migration) tx.objectStore('meta').add({key:LEGACY_KEY,value:data.migration});
          tx.objectStore('meta').put({key:EPOCH_KEY,value:nextEpoch});
          finish(undefined);
        } catch (error) { abort(error); }
      };
    });
  }
}

/** Reutilizado por backup v2 para rechazar datos corruptos ANTES de abrir readwrite. */
export function validateWorkspaceSnapshot(input: unknown): WorkspaceSnapshotV1 {
  const d = rowObject(input,['workspaceRevision','corpus','editions','history','migration'],'snapshot');
  const workspaceRevision = rev(d.workspaceRevision,true);
  const cr = d.corpus === null ? null : (() => {
    const c = rowObject(d.corpus,['corpus','revision'],'snapshot.corpus');
    return {corpus:validateCorpus(c.corpus),revision:rev(c.revision)};
  })();
  if (!Array.isArray(d.editions) || !Array.isArray(d.history)) throw new WorkspaceStorageError('Listas del snapshot inválidas.');
  const editions = d.editions.map(raw => {
    const e = rowObject(raw,['revision','edition'],'snapshot.edition');
    return {revision:rev(e.revision),edition:validateEdition(e.edition)};
  });
  const history = d.history.map(raw => {
    // Validar sin permitir que el contenido suministre una clave distinta.
    if (!raw || typeof raw !== 'object') throw new WorkspaceStorageError('Evento de respaldo inválido.');
    const event = raw as OperationEventV1;
    return historyRow({key:[event.editionId,event.sequence],event}).event;
  });
  const migration = d.migration === null ? null : migrationRecord(d.migration);
  if (cr && cr.revision > workspaceRevision) {
    throw new WorkspaceStorageError('Revisión del corpus superior a la revisión global.');
  }
  if (editions.some(x => x.revision > workspaceRevision)) {
    throw new WorkspaceStorageError('Revisión de cuaderno superior a la revisión global.');
  }
  const byId = new Map(editions.map(x => [x.edition.id,x.revision]));
  if (byId.size !== editions.length) throw new WorkspaceStorageError('IDs de edición duplicados.');
  const seenEvents = new Set<string>();
  const seenIds = new Set<string>();
  const grouped = new Map<string, OperationEventV1[]>();
  for (const event of history) {
    const key = `${event.editionId}\u0000${event.sequence}`;
    if (seenEvents.has(key) || seenIds.has(event.id)) {
      throw new WorkspaceStorageError('Evento o secuencia histórica duplicada.');
    }
    seenEvents.add(key);
    seenIds.add(event.id);
    const revision = byId.get(event.editionId);
    if (revision === undefined || event.revisionAfter > revision) {
      throw new WorkspaceStorageError('Historial con cuaderno o revisión inexistente.');
    }
    const group = grouped.get(event.editionId) ?? [];
    group.push(event);
    grouped.set(event.editionId, group);
  }
  const importedEditionIds = new Set(Object.values(migration?.notebookIdMap ?? {}));
  for (const item of editions) {
    const items = (grouped.get(item.edition.id) ?? []).sort((a,b)=>a.sequence-b.sequence);
    const last = items.at(-1);
    // La revisión inicial 1 de un cuaderno importado no tiene evento propio.
    if (!last) {
      if (item.revision !== 1 || !importedEditionIds.has(item.edition.id)) {
        throw new WorkspaceStorageError('Edición sin historial verificable.');
      }
    } else {
      if (last.revisionAfter !== item.revision
        || JSON.stringify(validateEdition(last.after)) !== JSON.stringify(item.edition)) {
        throw new WorkspaceStorageError('El último evento no coincide con la edición guardada.');
      }
      for(let i=1;i<items.length;i++) {
        const previous=items[i-1]!;
        const current=items[i]!;
        if(current.sequence !== previous.sequence+1
          || JSON.stringify(current.before)!==JSON.stringify(previous.after)) {
          throw new WorkspaceStorageError('La cadena de eventos del cuaderno está rota.');
        }
      }
      if(items[0]!.sequence!==1
        && !(items[0]!.sequence===2 && importedEditionIds.has(item.edition.id))) {
        throw new WorkspaceStorageError('Inicio de historial sin origen verificable.');
      }
      if(items[0]!.sequence===1 && items[0]!.before!==null) {
        throw new WorkspaceStorageError('Creación del cuaderno sin estado inicial nulo.');
      }
    }
  }
  if (migration && !cr) throw new WorkspaceStorageError('Migración sin copia de CorpusV1.');
  if (migration) {
    const editionMap = new Map(editions.map(x=>[x.edition.id,x.edition.legacyNotebookId]));
    for (const [legacyId,editionId] of Object.entries(migration.notebookIdMap)) {
      if (editionMap.get(editionId) !== legacyId) {
        throw new WorkspaceStorageError('Mapa histórico de migración sin edición correspondiente.');
      }
    }
  }
  if (!workspaceRevision && (cr || editions.length || history.length || migration)) {
    throw new WorkspaceStorageError('Datos de workspace sin revisión global.');
  }
  return {workspaceRevision,corpus:cr,editions,history,migration};
}
