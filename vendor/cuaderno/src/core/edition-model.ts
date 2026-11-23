/**
 * Contrato editorial V1. Independiente del CorpusV1 publicado.
 * Especificaciones fuente: arquitectura_datos_cuaderno_v10, §§3-4.
 * Este módulo NO persiste, genera análisis filológicos ni renderiza HTML.
 */
export const EDITION_SCHEMA_VERSION = 1 as const;
export const TEMPLATE_POINTS_HUNDREDTHS = 800 as const;
export type EntityId = string;

export interface EditableFieldV1 {
  value: string;
  origin: 'template' | 'generated' | 'manual';
  locked: boolean;
  lastEditAt: string | null;
}

export interface EvidenceV1 {
  provider: string;
  recordId: string;
  bankRevision: string;
  decisionId: string | null;
}

export interface QuestionStyleV1 {
  beforePt: number;
  afterPt: number;
  subquestionGapPt: number;
}

export interface PageFormatV1 {
  paper: 'A4';
  fontFamily: string;
  fontSizePt: number;
  marginsPt: { top: number; right: number; bottom: number; left: number };
  lineSpacingPt: number;
  questionGapPt: number;
  showPoints: boolean;
  pageFooter: 'page | total';
}

export interface TextMarkV1 {
  id: EntityId;
  kind: 'morph-underline' | 'editorial-roman';
  startUtf16: number;
  endUtf16: number;
  exact: string;
  textFingerprint: string;
  reviewRequired: boolean;
}

export interface EditableTextV1 {
  title: string;
  author: string | null;
  work: string | null;
  reference: string | null;
  latin: string;
  markup: TextMarkV1[];
}

import type {MorphType} from './morph-categories.js';
export interface MorphWordV1 {
  id: EntityId;
  markId: EntityId;
  surface: string;
  lemmaId: string | null;
  analysis: string | null;
  /** Opcional para preservar cuadernos anteriores: categoría docente sin pistas en PDF. */
  schoolCategory?: MorphType;
  provenance: EvidenceV1 | null;
  reviewState: 'verified' | 'needs-review' | 'manual';
  locked: boolean;
}

export interface QuestionWordSlotV1 {
  id: EntityId;
  value: string;
  proposedLemmaId: string | null;
  origin: 'generated' | 'manual';
  locked: boolean;
  provenance: EvidenceV1 | null;
}

export interface ChoiceOptionV1 {
  id: EntityId;
  kind: 'preverb' | 'phonetics' | 'prefix' | 'latinism';
  enabled: boolean;
  statement: EditableFieldV1;
  slots: QuestionWordSlotV1[];
  preverbBaseIds?: [string, string];
  preverbBasesProtected?: boolean;
}

export type QuestionKindV1 = 'translation' | 'syntax' | 'morphology' | 'choice';

export interface QuestionBaseV1 {
  id: EntityId;
  kind: QuestionKindV1;
  enabled: boolean;
  statement: EditableFieldV1;
  pointsHundredths: number;
  styleOverride: QuestionStyleV1 | null;
}

export type QuestionV1 =
  | (QuestionBaseV1 & { kind: 'translation' | 'syntax' })
  | (QuestionBaseV1 & { kind: 'morphology'; words: MorphWordV1[] })
  | (QuestionBaseV1 & {
    kind: 'choice';
    requiredCount: number;
    options: ChoiceOptionV1[];
  });

export interface VocabularyEntryV1 {
  id: EntityId;
  lemma: string;
  headword: string;
  meaning: string | null;
  note: string | null;
  included: boolean;
  order: number;
  provenance: EvidenceV1 | null;
  reviewState: 'verified' | 'needs-review' | 'manual';
  origin: 'generated' | 'manual';
  locked: boolean;
  /** Misma opción de glosas independientes que Examinator2; falta en V1 antiguo. */
  glossesSeparated?: boolean;
  /** Etiqueta de procedencia; no implica verificación filológica individual. */
  collatinusSource?: boolean;
  collatinusProper?: boolean;
}

export interface ReviewFlagV1 {
  id: EntityId;
  scopeId: EntityId;
  reason: string;
}

export interface SourceLinkV1 {
  kind: 'corpus' | 'library' | 'manual';
  sourceId: string | null;
  urn: string | null;
  importedAt: string;
}

/** Fragmento gramatical anclado a offsets UTF-16, con revisión tras editar el latín.
 * Campo opcional en ediciones V1: las copias históricas permanecen sin cambios. */
export interface GrammarSpanEvidenceV1 {
  tagId: string;
  engine: string;
  rule: string;
  evidence: string[];
}

export interface GrammarAnchorV1 {
  startUtf16: number;
  endUtf16: number;
  exact: string;
  textFingerprint: string;
  reviewRequired: boolean;
}

export interface GrammarSpanV1 extends GrammarAnchorV1 {
  id: EntityId;
  tagIds: string[];
  evidence?: GrammarSpanEvidenceV1[];
}

export type GrammarReviewDecisionV1 = GrammarAnchorV1 & (
  {kind:'rejected';tagId:string} | {kind:'reading';lid:number;morpho:string}
);

export interface TextPlacementV1 {
  id: EntityId;
  source: SourceLinkV1;
  text: EditableTextV1;
  questions: QuestionV1[];
  vocabulary: VocabularyEntryV1[];
  /** Las opciones antiguas se interpretan como «elegir» y «modelo». */
  vocabularySelectionMode?: 'elegir' | 'todo';
  vocabularyQuantityMode?: 'modelo' | 'todas' | 'largas' | 'ninguna';
  grammaticalTagIds: string[];
  /** Omisión deliberada en documentos anteriores a las etiquetas de fragmento. */
  grammaticalSpans?: GrammarSpanV1[];
  grammarReview?: GrammarReviewDecisionV1[];
  reviewFlags: ReviewFlagV1[];
}

/** Portada opcional; no se modifica el esquema ni los cuadernos existentes. */
export interface NotebookCoverV1 {
  title: string;
  subtitle: string;
  course: string;
  studentLabel: string;
  groupLabel: string;
  imageDataUrl: string;
  imageCredit: string;
  colorMode: 'color' | 'gray' | 'mono';
  reflection: boolean;
}

export interface NotebookEditionV1 {
  editionSchemaVersion: typeof EDITION_SCHEMA_VERSION;
  id: EntityId;
  legacyNotebookId: string | null;
  title: string;
  locale: 'es';
  createdAt: string;
  updatedAt: string;
  format: PageFormatV1;
  placements: TextPlacementV1[];
  cover?: NotebookCoverV1;
}

/** El control de sesión NO forma parte de la copia académica. */
export interface EditorSessionV1 {
  activeEditionId: EntityId;
  activePlacementId: EntityId | null;
  mode: 'text' | 'whole-notebook';
  activeMenu: string;
  previewZoom: number;
  scrollByPlacementId: Record<string, number>;
}

/** Contrato de integración para el motor futuro; no implica que ya haya bancos conectados. */
export interface RegenerationRequestV1 {
  kind: 'regenerate';
  editionId: EntityId;
  placementId: EntityId;
  target: 'word' | 'subquestion' | 'question';
  targetId: EntityId;
  expectedRevision: number;
  candidateId: string;
}

/** Contrato para la siguiente PR de almacenamiento e historial. */
export interface OperationEventV1 {
  id: EntityId;
  editionId: EntityId;
  sequence: number;
  command: string;
  targetId: EntityId;
  timestamp: string;
  revisionBefore: number;
  revisionAfter: number;
  before: unknown;
  after: unknown;
}
