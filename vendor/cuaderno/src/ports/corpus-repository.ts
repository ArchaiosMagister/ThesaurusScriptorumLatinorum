import type { CorpusV1 } from '../core/model.js';

/** Una revisión representa un estado coherente del corpus local. */
export interface CorpusSnapshot {
  corpus: CorpusV1;
  revision: number;
}

/**
 * La implementación debe ofrecer lecturas coherentes y escrituras atómicas.
 * La revisión esperada evita perder cambios entre pestañas o dispositivos
 * que compartan un mismo almacenamiento.
 */
export interface CorpusRepository {
  load(): Promise<CorpusSnapshot>;
  save(corpus: CorpusV1, expectedRevision: number): Promise<CorpusSnapshot>;
}
