import { InvalidCorpusError, UnsupportedSchemaVersionError } from './errors.js';
import { CURRENT_SCHEMA_VERSION, type CorpusV1 } from './model.js';
import { validateCorpus } from './validation.js';

/** Pasarela versionada: futuras migraciones se añadirán aquí, nunca en silencio. */
export function migrateCorpus(input: unknown): CorpusV1 {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidCorpusError('El archivo debe contener un objeto JSON.');
  }
  const version = (input as Record<string, unknown>).schemaVersion;
  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(version);
  }
  return validateCorpus(input);
}

/** No persiste ni sustituye los datos existentes: solo decodifica y valida. */
export function deserializeCorpus(json: string): CorpusV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new InvalidCorpusError('El archivo no contiene JSON válido.');
  }
  return migrateCorpus(parsed);
}

export function serializeCorpus(data: CorpusV1): string {
  return JSON.stringify(validateCorpus(data), null, 2);
}
