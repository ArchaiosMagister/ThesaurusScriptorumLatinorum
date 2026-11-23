import { notebookTexts } from '../core/editor-operations.js';
import { createBackup, readBackup } from '../core/backup.js';
import { serializeCorpus } from '../core/archive.js';
import { validateCorpus } from '../core/validation.js';
import type { CorpusSnapshot, CorpusRepository } from '../ports/corpus-repository.js';
import type { CorpusV1 } from '../core/model.js';
import type { NotebookEditionV1 } from '../core/edition-model.js';
import { createEdition, placementFromCorpus } from '../core/edition-factory.js';
import { WorkspaceMigrationConflictError, type MigrationRecordV1, WorkspaceRepository } from './workspace-repository.js';

export interface LegacyMigrationPlanV1 {
  sourceKind: 'database' | 'backup';
  sourceRevision: number;
  sourceSha256: string;
  preparedAt: string;
  /** Archivo íntegro de v1 para exportar ANTES de aprobar la migración. */
  legacyBackupJson: string;
  textCount: number;
  notebookCount: number;
  placementCount: number;
  preview: {legacyNotebookId: string; title: string; textCount: number}[];
}
export interface MigrationApprovalV1 {
  /** Confirmación explícita del usuario: descargó y conserva el JSON anterior. */
  legacyBackupExported: boolean;
  confirmCreateWorkspace: boolean;
}
export interface MigrationOutcomeV1 {
  status: 'created' | 'already-present';
  migration: MigrationRecordV1;
  /** Si el usuario editó el corpus histórico concurrentemente, pedir conciliación. */
  sourceChangedAfterCommit: boolean;
}

function parseHash(json: string): string {
  const candidate: unknown = JSON.parse(json) as unknown;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new WorkspaceMigrationConflictError('Copia histórica sin cabecera.');
  }
  const sha = (candidate as Record<string, unknown>).sha256;
  if (typeof sha !== 'string' || !/^[0-9a-f]{64}$/.test(sha)) {
    throw new WorkspaceMigrationConflictError('Copia histórica sin huella SHA-256 válida.');
  }
  return sha;
}
async function stableHash(input: string): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function toPlan(snapshot: CorpusSnapshot, kind: LegacyMigrationPlanV1['sourceKind'], at: Date,
  providedJson?: string): Promise<LegacyMigrationPlanV1> {
  const corpus = validateCorpus(snapshot.corpus);
  const json = providedJson ?? await createBackup(corpus, at);
  const verified = await readBackup(json);
  if (serializeCorpus(verified.corpus) !== serializeCorpus(corpus)) {
    throw new WorkspaceMigrationConflictError('La copia no coincide exactamente con el corpus de origen.');
  }
  return {
    sourceKind: kind, sourceRevision: snapshot.revision, sourceSha256: parseHash(json),
    preparedAt: at.toISOString(), legacyBackupJson: json,
    textCount: corpus.texts.length, notebookCount: corpus.notebooks.length,
    placementCount: corpus.notebooks.reduce((sum, n) => sum + n.textIds.length, 0),
    preview: corpus.notebooks.map(n => ({legacyNotebookId: n.id,title:n.title,textCount:n.textIds.length})),
  };
}

/** Preflight sin efectos sobre el espacio editorial. Nunca inicia una migración. */
export async function prepareLegacyMigration(source: CorpusRepository, at = new Date()):
  Promise<LegacyMigrationPlanV1> {
  const snapshot = await source.load();
  return toPlan(snapshot, 'database', at);
}

/** Un JSON backupVersion=1 se importa de forma explícita, nunca como restauración destructiva de v2. */
export async function prepareLegacyBackupImport(json: string, at = new Date()):
  Promise<LegacyMigrationPlanV1> {
  const {corpus} = await readBackup(json);
  return toPlan({corpus,revision:0}, 'backup', at, json);
}

async function convert(corpus: CorpusV1, plan: LegacyMigrationPlanV1):
  Promise<{editions: NotebookEditionV1[]; marker: MigrationRecordV1}> {
  const idMap: Record<string,string> = Object.create(null) as Record<string,string>;
  const editions: NotebookEditionV1[] = [];
  for (const notebook of corpus.notebooks) {
    const notebookHash = await stableHash('legacy-notebook-v1:' + notebook.id);
    const newId = 'ed.' + notebookHash;
    idMap[notebook.id] = newId;
    let localId = 0;
    const nextId = () => 'item.' + notebookHash + '.' + (++localId);
    const placements = notebookTexts(corpus, notebook).map((item,index) =>
      placementFromCorpus(item, 'place.' + notebookHash + '.' + (index+1),plan.preparedAt,nextId));
    editions.push(createEdition({
      id:newId,legacyNotebookId:notebook.id,title:notebook.title,
      timestamp:plan.preparedAt,placements,
    }));
  }
  const marker: MigrationRecordV1 = {
    schemaVersion:1, sourceKind:plan.sourceKind, sourceRevision:plan.sourceRevision,
    sourceSha256:plan.sourceSha256, migratedAt:plan.preparedAt,
    notebookIdMap:idMap, textCount:corpus.texts.length,notebookCount:corpus.notebooks.length,
  };
  return {editions,marker};
}

/**
 * Requiere una copia v1 verificada y aceptación explícita. Releer el legado evita
 * importar silenciosamente un plan obsoleto; repetir exactamente el mismo plan
 * es idempotente y no duplica textos ni historial.
 */
export async function executeLegacyMigration(
  workspace: WorkspaceRepository,
  plan: LegacyMigrationPlanV1,
  approval: MigrationApprovalV1,
  legacySource?: CorpusRepository,
): Promise<MigrationOutcomeV1> {
  if (!approval.legacyBackupExported || !approval.confirmCreateWorkspace) {
    throw new WorkspaceMigrationConflictError('Primero exporta la copia JSON v1 y confirma la migración.');
  }
  if (plan.sourceKind === 'database' && !legacySource) {
    throw new WorkspaceMigrationConflictError('La migración desde IndexedDB requiere la fuente histórica.');
  }
  const {corpus} = await readBackup(plan.legacyBackupJson);
  if (parseHash(plan.legacyBackupJson) !== plan.sourceSha256
    || corpus.texts.length !== plan.textCount
    || corpus.notebooks.length !== plan.notebookCount
    || corpus.notebooks.reduce((n,b) => n+b.textIds.length,0) !== plan.placementCount) {
    throw new WorkspaceMigrationConflictError('El plan y su copia no coinciden. Prepara una migración nueva.');
  }
  if (plan.sourceKind === 'database') {
    const latest = await legacySource!.load();
    if (latest.revision !== plan.sourceRevision
      || serializeCorpus(latest.corpus) !== serializeCorpus(corpus)) {
      throw new WorkspaceMigrationConflictError('El banco original cambió después del preflight. No se migra.');
    }
  }
  // No modifica la base histórica: las cuatro escrituras se realizan solo en workspace.
  const {editions, marker} = await convert(corpus,plan);
  const status = await workspace.installLegacy(corpus,editions,marker);
  const finalLegacy = plan.sourceKind === 'database' ? await legacySource!.load() : null;
  const sourceChangedAfterCommit = finalLegacy !== null && (
    finalLegacy.revision !== plan.sourceRevision ||
    serializeCorpus(finalLegacy.corpus) !== serializeCorpus(corpus)
  );
  return {status,migration:marker,sourceChangedAfterCommit};
}
