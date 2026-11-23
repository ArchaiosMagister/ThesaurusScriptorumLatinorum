/** Modelo persistido. No se introduce aún ninguna operación de edición. */
import type { VocabularyEntryV1 } from './edition-model.js';
import type {ParsedTeacherDocx} from './docx-import.js';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export interface TextSource {
  author: string | null;
  work: string | null;
  reference: string | null;
}

export interface LatinText {
  id: string;
  title: string;
  latin: string;
  source: TextSource;
  tagIds: string[];
  notes?: string;
  reviewed?: boolean;
  vocabulary?: VocabularyEntryV1[];
  createdAt: string;
  updatedAt: string;
  /** Datos OOXML normalizados: permiten reutilizar marcas, vocabulario y léxico docente.
   * Ausentes en las fuentes de texto simple y en todos los corpus anteriores. */
  teacherDocx?: ParsedTeacherDocx;
}

/** Una etiqueta del catálogo y una personalizada son entidades distintas. */
export interface GrammarTag {
  id: string;
  label: string;
  kind: 'catalogue' | 'custom';
  parentId: string | null;
}

/** El orden de textIds determina el orden de los textos en el cuaderno. */
export interface Notebook {
  id: string;
  title: string;
  textIds: string[];
  retainedTexts?: { textId: string; revisionId: string }[];
}

export interface CorpusV1 {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  texts: LatinText[];
  textRevisions?: { id: string; text: LatinText }[];
  tags: GrammarTag[];
  notebooks: Notebook[];
}

export function emptyCorpus(): CorpusV1 {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, texts: [], tags: [], notebooks: [] };
}
