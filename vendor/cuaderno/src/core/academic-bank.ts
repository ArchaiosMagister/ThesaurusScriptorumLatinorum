import type { ChoiceOptionV1, EvidenceV1 } from './edition-model.js';

export type AcademicSlotKindV1 = ChoiceOptionV1['kind'];
export type AcademicKindV1 = AcademicSlotKindV1 | 'morphology';
export const LATIN_II = 'latin-ii' as const;

/**
 * Un banco externo debe aportar la evidencia académica de cada registro.
 * La etiqueta «verified» es una afirmación del banco, no una verificación
 * filológica que este adaptador pueda realizar por sí mismo.
 */
export interface AcademicBankRecordV1 {
  id: string;
  kind: AcademicKindV1;
  value: string;
  lemmaId: string | null;
  analysis: string | null;
  /** Forma EXACTA del texto analizada, si kind=morphology. */
  surface: string | null;
  /** Forma de partida de un derivado preverbial, si kind=preverb. */
  sourceForm: string | null;
  courses: readonly (typeof LATIN_II)[];
  /** `verified` implica elegible según el banco docente; no certifica una etimología completa. */
  status: 'verified' | 'needs-review' | 'rejected';
  /** Leyes fonéticas seleccionables N01–N20, nunca incluye FIX_M. */
  phoneticRules?: readonly string[];
  evidence: EvidenceV1;
}

export interface AcademicBankManifestV1 {
  id: string;
  revision: string;
  sourceName: string;
  verifiedBy: string;
}

export class AcademicBankError extends Error {
  constructor(message: string) { super(message); this.name = 'AcademicBankError'; }
}

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
function nonblank(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AcademicBankError(`${field}: vacío o inválido`);
  return value;
}
function validId(value: unknown, field: string): string {
  const str = nonblank(value, field);
  if (str.length > 120 || !idPattern.test(str)) throw new AcademicBankError(`${field}: identificador inválido`);
  return str;
}
function optional(value: unknown, field: string): string | null {
  return value === null ? null : nonblank(value, field);
}
function copyRecord(input: AcademicBankRecordV1, revision: string, ids: Set<string>, evidenceKeys: Set<string>): AcademicBankRecordV1 {
  if (!input || typeof input !== 'object') throw new AcademicBankError('Registro inválido');
  const id = validId(input.id, 'record.id');
  if (ids.has(id)) throw new AcademicBankError('ID académico duplicado: ' + id);
  ids.add(id);
  if (!(['preverb','phonetics','prefix','latinism','morphology'] as string[]).includes(input.kind)) {
    throw new AcademicBankError(`Tipo académico no permitido: ${String(input.kind)}`);
  }
  if (!(['verified','needs-review','rejected'] as string[]).includes(input.status)) {
    throw new AcademicBankError('Estado de verificación desconocido');
  }
  const evidence = input.evidence;
  if (!evidence || typeof evidence !== 'object') throw new AcademicBankError('Falta evidencia académica');
  const provider = nonblank(evidence.provider, 'evidence.provider');
  const recordId = nonblank(evidence.recordId, 'evidence.recordId');
  const bankRevision = nonblank(evidence.bankRevision, 'evidence.bankRevision');
  if (bankRevision !== revision) throw new AcademicBankError('El registro no coincide con la revisión del banco');
  const evidenceKey = `${provider}\0${bankRevision}\0${recordId}`;
  if (evidenceKeys.has(evidenceKey)) throw new AcademicBankError('Registro académico de procedencia repetido');
  evidenceKeys.add(evidenceKey);
  if (evidence.decisionId !== null) nonblank(evidence.decisionId, 'evidence.decisionId');
  if (!Array.isArray(input.courses) || !input.courses.length || input.courses.some(c => c !== LATIN_II)) {
    throw new AcademicBankError('El registro debe declarar curso Latin II explícitamente');
  }
  const value = nonblank(input.value, 'record.value');
  const lemmaId = optional(input.lemmaId, 'record.lemmaId');
  const analysis = optional(input.analysis, 'record.analysis');
  const surface = optional(input.surface, 'record.surface');
  const sourceForm = optional(input.sourceForm, 'record.sourceForm');
  if (input.kind === 'morphology') {
    if (surface === null || lemmaId === null || analysis === null || sourceForm !== null) {
      throw new AcademicBankError('Morfología exige forma exacta, lema y análisis; no admite fuente preverbial');
    }
  } else if (surface !== null || analysis !== null) {
    throw new AcademicBankError('Los apartados de léxico no admiten análisis ni forma morfológica');
  }
  if (input.kind === 'preverb' && sourceForm === null) throw new AcademicBankError('El derivado preverbial necesita forma de partida');
  if (input.kind !== 'preverb' && sourceForm !== null) throw new AcademicBankError('Fuente preverbial fuera de su apartado');
  const phoneticRules = input.phoneticRules;
  if (phoneticRules !== undefined && (input.kind !== 'phonetics' || !Array.isArray(phoneticRules)
    || !phoneticRules.length || new Set(phoneticRules).size !== phoneticRules.length
    || phoneticRules.some(rule=>typeof rule !== 'string' || !/^N(?:0[1-9]|1[0-9]|20)$/.test(rule)))) {
    throw new AcademicBankError('Las normas de cada étimo deben ser únicas y pertenecer a N01–N20');
  }
  return Object.freeze({id,kind:input.kind,value,lemmaId,analysis,surface,sourceForm,
    ...(phoneticRules === undefined ? {} : {phoneticRules:Object.freeze([...phoneticRules])}),
    courses:Object.freeze([...input.courses]),status:input.status,
    evidence:Object.freeze({provider,recordId,bankRevision,decisionId:evidence.decisionId})});
}

export class VerifiedAcademicBankV1 {
  readonly manifest: Readonly<AcademicBankManifestV1>;
  readonly count: number;
  private readonly byId: ReadonlyMap<string, AcademicBankRecordV1>;

  constructor(manifest: AcademicBankManifestV1, entries: readonly AcademicBankRecordV1[]) {
    this.manifest = Object.freeze({
      id: validId(manifest.id, 'manifest.id'),
      revision: nonblank(manifest.revision, 'manifest.revision'),
      sourceName: nonblank(manifest.sourceName, 'manifest.sourceName'),
      verifiedBy: nonblank(manifest.verifiedBy, 'manifest.verifiedBy'),
    });
    const ids = new Set<string>(), evidenceKeys = new Set<string>();
    const rows = entries.map(row => copyRecord(row,this.manifest.revision,ids,evidenceKeys));
    this.byId = new Map(rows.map(x => [x.id,x]));
    this.count = rows.length;
  }
  /** Selecciona solo fichas elegibles por la fuente. En fonética aplica también el filtro curricular.
   * Si no se seleccionan leyes en Latín II, se consideran disponibles las N01–N20 (sin FIX_M).
   * Un filtro explícito vacío no produce candidatos.
   */
  verified(kind: AcademicKindV1, surfaceOrSource: string | null = null,
    selectedPhoneticRules?: readonly string[]): readonly AcademicBankRecordV1[] {
    if(selectedPhoneticRules !== undefined && (kind !== 'phonetics'
      || !Array.isArray(selectedPhoneticRules)
      || new Set(selectedPhoneticRules).size !== selectedPhoneticRules.length
      || selectedPhoneticRules.some(rule=>!/^N(?:0[1-9]|1[0-9]|20)$/.test(rule)))) {
      throw new AcademicBankError('Filtro de leyes fonéticas inválido o aplicado a otro apartado');
    }
    const allowed=selectedPhoneticRules===undefined?null:new Set(selectedPhoneticRules);
    return [...this.byId.values()].filter(row => row.status === 'verified' && row.kind === kind
      && row.courses.includes(LATIN_II)
      && (kind === 'morphology' ? row.surface === surfaceOrSource
        : kind === 'preverb' ? row.sourceForm === surfaceOrSource : true)
      && (allowed===null || (row.phoneticRules !== undefined
        && row.phoneticRules.every(rule=>allowed.has(rule)))))
      .sort((a,b) => a.id.localeCompare(b.id,'en'));
  }
  findVerified(id: string): AcademicBankRecordV1 | null {
    const row = this.byId.get(id);
    return row?.status === 'verified' && row.courses.includes(LATIN_II) ? row : null;
  }
  statusCounts(kind: AcademicKindV1): Readonly<{verified:number;needsReview:number;rejected:number}> {
    const rows = [...this.byId.values()].filter(x=>x.kind===kind);
    return {verified:rows.filter(x=>x.status==='verified').length,
      needsReview:rows.filter(x=>x.status==='needs-review').length,
      rejected:rows.filter(x=>x.status==='rejected').length};
  }
}
