import { InvalidCorpusError } from './errors.js';
import { CURRENT_SCHEMA_VERSION, type CorpusV1 } from './model.js';
import { deserializeCorpus, serializeCorpus } from './archive.js';

export const BACKUP_FORMAT = 'cuaderno-textos-latinos';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARACTERS = 32 * 1024 * 1024;

export class BackupIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupIntegrityError';
  }
}

export class UnsupportedBackupVersionError extends Error {
  constructor(version: unknown) {
    super('Versión de copia de seguridad no admitida: ' + String(version));
    this.name = 'UnsupportedBackupVersionError';
  }
}

export interface BackupMetadata {
  exportedAt: string;
  textCount: number;
  tagCount: number;
  notebookCount: number;
}

async function digestText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isCanonicalUtc(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

/** Prepara un archivo portable. El hash detecta corrupción, no demuestra autoría. */
export async function createBackup(corpus: CorpusV1, at = new Date()): Promise<string> {
  const normalized = deserializeCorpus(serializeCorpus(corpus));
  const exportedAt = at.toISOString();
  const sha256 = await digestText(serializeCorpus(normalized));
  const payload = JSON.stringify({
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    exportedAt,
    sha256,
    corpus: normalized,
  }, null, 2);
  if (payload.length > MAX_BACKUP_CHARACTERS) {
    throw new BackupIntegrityError('La copia supera el tamaño máximo admitido (32 MiB).');
  }
  return payload;
}

/** Verifica formato, revisión, hash y relaciones antes de devolver datos restaurables. */
export async function readBackup(json: string): Promise<{ corpus: CorpusV1; metadata: BackupMetadata }> {
  if (json.length > MAX_BACKUP_CHARACTERS) {
    throw new BackupIntegrityError('El archivo supera el tamaño máximo admitido (32 MiB).');
  }
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
  } catch {
    throw new InvalidCorpusError('La copia no contiene JSON válido.');
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidCorpusError('La copia debe contener un objeto JSON.');
  }
  const payload = input as Record<string, unknown>;
  if (payload.format !== BACKUP_FORMAT) {
    throw new InvalidCorpusError('No es una copia de CuadernoTextosLatinos.');
  }
  if (payload.backupVersion !== BACKUP_VERSION) {
    throw new UnsupportedBackupVersionError(payload.backupVersion);
  }
  if (Object.keys(payload).sort().join('|') !==
    ['backupVersion', 'corpus', 'exportedAt', 'format', 'sha256'].sort().join('|')) {
    throw new InvalidCorpusError('La copia contiene campos desconocidos o incompletos.');
  }
  if (!isCanonicalUtc(payload.exportedAt)) {
    throw new InvalidCorpusError('La fecha de la copia no es válida.');
  }
  if (typeof payload.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.sha256)) {
    throw new InvalidCorpusError('La huella SHA-256 no es válida.');
  }
  // No hay conversiones tácitas entre esquemas: la copia se rechaza si es incompatible.
  const corpus = deserializeCorpus(JSON.stringify(payload.corpus));
  if (corpus.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new InvalidCorpusError('Esquema de corpus no compatible.');
  }
  const computed = await digestText(serializeCorpus(corpus));
  if (computed !== payload.sha256) {
    throw new BackupIntegrityError('La copia está alterada o dañada (SHA-256 distinto).');
  }
  return {
    corpus,
    metadata: {
      exportedAt: payload.exportedAt,
      textCount: corpus.texts.length,
      tagCount: corpus.tags.length,
      notebookCount: corpus.notebooks.length,
    },
  };
}
