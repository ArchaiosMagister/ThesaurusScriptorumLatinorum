/** Adaptador de datos docentes de GeneradorExamenes.
 * Conecta únicamente la evidencia documental; no inventa nuevas verificaciones.
 * El snapshot fuente se prepara fuera del navegador y queda congelado por SHA git.
 */
import {
  LATIN_II, VerifiedAcademicBankV1, type AcademicBankRecordV1,
  type AcademicBankManifestV1,
} from './academic-bank.js';

export interface AcademicSourceRefV1 { path: string; sha: string }
export interface TeacherAcademicSourceSnapshotV1 {
  schemaVersion: 1;
  repo: 'ArchaiosMagister/GeneradorExamenes';
  sources: {
    preverb: AcademicSourceRefV1;
    prefix: AcademicSourceRefV1;
    latinism: AcademicSourceRefV1;
    phonetics: AcademicSourceRefV1;
    morphology: AcademicSourceRefV1;
  };
  preverbs: readonly {
    id: number; prompt: string; enunciado: string;
    derivatives: readonly string[]; ambiguousPrompt: boolean;
  }[];
  prefixes: readonly {
    prompt: string; prefix: string; meaningHint: string; meaningStatus: string;
  }[];
  latinisms: readonly {number: number; prompt: string; answer: string}[];
  phonetics: readonly {
    id: string; latin: string; castellano: string; normas: readonly string[];
    estado: string; tipoTransmision: string | null; fuente: string;
  }[];
  morphology: readonly {
    lemma: string; form: string; tags: string; reference: string; note: string | null;
  }[];
}
export type TeacherAcademicKind = AcademicBankRecordV1['kind'];
export interface TeacherAcademicAuditV1 {
  id: string;
  kind: TeacherAcademicKind;
  status: AcademicBankRecordV1['status'];
  /** Elegibilidad docente heredada; no significa validación lexicográfica externa. */
  teacherEligible: boolean;
  /** Solo true para las formas contrastadas individualmente en verified-overrides. */
  individuallyExternallyVerified: boolean;
  sourcePath: string;
  originalRecord: string;
  /** Enunciado / dato de origen, no una solución generada por este adaptador. */
  note: string;
  sourceReference: string | null;
  semanticReviewRequired: boolean;
  phoneticRules: readonly string[];
  transmission: string | null;
  meaning: string | null;
}
export interface TeacherAcademicImportResultV1 {
  bank: VerifiedAcademicBankV1;
  audit: ReadonlyMap<string, TeacherAcademicAuditV1>;
  readonly sourceReferences: TeacherAcademicSourceSnapshotV1['sources'];
  readonly pendingByKind: Readonly<Record<TeacherAcademicKind, number>>;
}
export class TeacherAcademicImportError extends Error {
  constructor(message: string) { super(message); this.name='TeacherAcademicImportError'; }
}
function bad(message:string):never {throw new TeacherAcademicImportError(message);}
function same(value:string):string{return value.normalize('NFC').toLocaleLowerCase('es').trim();}
/** Exclusiones docentes vinculantes de decisiones-docentes.json y criterios-docentes.mjs de GeneradorExamenes.
 * Se documentan de forma independiente del banco apto para impedir una reactivación accidental.
 */
const PHONETIC_EXCLUSIONS = new Set([
  'adpodiare','adripare','brochum','stuppaculum','refectum',
  'inde','pirum','scrinium','quinionem','chœrilum','œagrum','œnomaum','œtam',
].map(v=>v.toLocaleLowerCase('es').replaceAll('æ','ae').replaceAll('œ','oe')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
function phoneticKey(v:string):string {
  return v.toLocaleLowerCase('es').replaceAll('æ','ae').replaceAll('œ','oe')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function text(value:unknown,label:string):string {
  if(typeof value!=='string'||!value.trim())bad(label+': vacío o inválido');
  return value;
}
function sourceRef(value:AcademicSourceRefV1,path:string):void {
  if(!value||typeof value!=='object'||value.path!==path||!(/^[a-f0-9]{40}$/).test(value.sha)){
    bad('Referencia Git SHA no válida para '+path);
  }
}
function uniqueKey(seen:Set<string>,key:string,label:string):void {
  if(seen.has(key))bad('Duplicado en '+label+': '+key);
  seen.add(key);
}
function nonnegativeId(n:number,label:string):void {
  if(!Number.isSafeInteger(n)||n<1)bad('Número de fila inválido: '+label);
}
/** IMPORTANTE: elegibilidad como *enunciado docente* no equivale a certificar
 * una etimología ni una acepción que la fuente marca como orientativa.
 * - Latínismos: repertorio docente cerrado, términos textuales, no soluciones auto.
 * - Preverbios: todas las asociaciones docentes son elegibles; si la base es homónima,
 *   solo se consulta mediante el enunciado completo de su ficha (sero/volo).
 * - Prefijos: las 286 voces son utilizables; el significado orientativo conserva su aviso.
 * - Fonética: APTO_PROPUESTO autoriza el sorteo docente bajo N01–N20. NO certifica
 *   una etimología externa individual ni habilita entradas excluidas.
 * - Morfología: SOLO singleForms con forma, lema, etiquetas y enlace individuales.
 */
export function importTeacherAcademicSources(snapshot:TeacherAcademicSourceSnapshotV1):TeacherAcademicImportResultV1 {
  if(!snapshot||snapshot.schemaVersion!==1||snapshot.repo!=='ArchaiosMagister/GeneradorExamenes'){
    bad('Snapshot docente ajeno o de versión incompatible');
  }
  const paths={
    preverb:'data/modificacion-preverbial-docente.json',
    prefix:'data/prefijos-docente.json',
    latinism:'data/latinismos-docente.json',
    phonetics:'data/fonetica/banco_examenes.json',
    morphology:'data/lemmas/verified-overrides.json',
  } as const;
  if(!snapshot.sources||typeof snapshot.sources!=='object')bad('Faltan referencias de los ficheros fuente');
  for(const [k,v] of Object.entries(paths))sourceRef(snapshot.sources[k as keyof typeof paths],v);
  const revision='ge.'+Object.values(snapshot.sources).map(s=>s.sha.slice(0,12)).join('.');
  const manifest:AcademicBankManifestV1={
    id:'generadorexamenes.latin.ii.teacher.v1',revision,
    sourceName:'ArchaiosMagister/GeneradorExamenes · repertorios docentes (snapshot git)',
    verifiedBy:'Estados por ficha y política conservadora: listado docente o evidencia individual de la fuente',
  };
  const entries:AcademicBankRecordV1[]=[];
  const audit=new Map<string,TeacherAcademicAuditV1>();
  const seenAcademic=new Set<string>();
  function put(kind:TeacherAcademicKind,id:string,value:string,status:AcademicBankRecordV1['status'],
    sourceKey:keyof typeof paths,sourceRow:string,note:string,
    params:{lemmaId?:string|null;surface?:string|null;analysis?:string|null;sourceForm?:string|null;
      decisionId?:string|null;sourceReference?:string|null;semanticReviewRequired?:boolean;
      individuallyExternallyVerified?:boolean;
      rules?:readonly string[];transmission?:string|null;meaning?:string|null}={}):void{
    uniqueKey(seenAcademic,id,'candidatos académicos');
    const path=paths[sourceKey];
    const rec:AcademicBankRecordV1={
      id,kind,value:text(value,id+'.value'),lemmaId:params.lemmaId??null,
      surface:params.surface??null,analysis:params.analysis??null,
      sourceForm:params.sourceForm??null,courses:[LATIN_II],status,
      ...(kind==='phonetics'&&params.rules?{phoneticRules:params.rules}:{}),
      evidence:{provider:'github:ArchaiosMagister/GeneradorExamenes/'+path,
        recordId:sourceRow,bankRevision:revision,decisionId:params.decisionId??null},
    };
    entries.push(rec);
    audit.set(id,Object.freeze({id,kind,status,teacherEligible:status==='verified',
      individuallyExternallyVerified:params.individuallyExternallyVerified??false,
      sourcePath:path,originalRecord:sourceRow,
      note,sourceReference:params.sourceReference??null,
      semanticReviewRequired:params.semanticReviewRequired??false,
      phoneticRules:Object.freeze([...(params.rules??[])]),
      transmission:params.transmission??null,meaning:params.meaning??null}));
  }
  const seenPreverbs=new Set<string>();
  for(const p of snapshot.preverbs){
    nonnegativeId(p.id,'preverbios');
    const prompt=text(p.prompt,'preverbios.prompt');
    const head=text(p.enunciado,'preverbios.enunciado');
    if(!head.toLocaleLowerCase('es').includes(prompt.toLocaleLowerCase('es')))bad('Enunciado preverbial incongruente: '+p.id);
    const relatives=new Set<string>();
    if(!Array.isArray(p.derivatives)||!p.derivatives.length||typeof p.ambiguousPrompt!=='boolean')bad('Ficha de compuestos incompleta: '+p.id);
    for(const [ix,derivative] of p.derivatives.entries()){
      const term=text(derivative,'preverbios.derivatives');
      uniqueKey(relatives,same(term),'derivados de '+prompt);
      const id='ge.preverb.'+p.id+'.'+(ix+1);
      put('preverb',id,term,'verified',
        'preverb',`items[id=${p.id}].derivatives[${ix}]`,
        `Base docente: ${head}; compuesto atestiguado en la lista. ${p.ambiguousPrompt
          ? 'Para distinguir homónimos se exige seleccionar el enunciado completo.' : ''}`,
        {sourceForm:p.ambiguousPrompt?head:prompt,
          decisionId:p.ambiguousPrompt?'teacher-attested-qualified-base':'teacher-attested-unambiguous'});
    }
    if(seenPreverbs.has(same(prompt))&&!p.ambiguousPrompt)bad('Base repetida sin aviso de ambigüedad: '+prompt);
    seenPreverbs.add(same(prompt));
  }
  const seenPrefixes=new Set<string>();
  for(const [ix,p] of snapshot.prefixes.entries()){
    const v=text(p.prompt,'prefijos.prompt');
    uniqueKey(seenPrefixes,same(v),'prefijos');
    const status=text(p.meaningStatus,'prefijos.meaningStatus');
    if(!status.startsWith('orientativo;')&&!status.startsWith('revisado:'))bad('Estado semántico de prefijos no reconocido: '+status);
    const reviewed=status.startsWith('revisado:');
    put('prefix','ge.prefix.'+(ix+1),v,'verified',
      'prefix',`items[${ix}]`,
      `Prefijo de la lista: ${text(p.prefix,'prefijo')}. ${status}`,
      {decisionId:reviewed?'semantic-reviewed':'teacher-approved-semantic-hint',
        semanticReviewRequired:!reviewed,meaning:text(p.meaningHint,'pista de significado')});
  }
  const seenLatinisms=new Set<string>();
  for(const l of snapshot.latinisms){
    nonnegativeId(l.number,'latinismos');
    const v=text(l.prompt,'latinismos.prompt');
    uniqueKey(seenLatinisms,same(v),'latinismos');
    put('latinism','ge.latinism.'+l.number,v,'verified',
      'latinism',`items[number=${l.number}]`,
      'Latinismo del repertorio docente numerado; definición condensada textual, no solución automática.',
      {decisionId:'teacher-fixed-list',meaning:text(l.answer,'latinismos.answer')});
  }
  const seenPhonetics=new Set<string>();
  for(const p of snapshot.phonetics){
    const id=text(p.id,'fonetica.id');
    uniqueKey(seenPhonetics,id,'fonética');
    const status=text(p.estado,'fonetica.estado');
    if(!Array.isArray(p.normas)||!p.normas.length
      ||new Set(p.normas).size!==p.normas.length
      ||p.normas.some(n=>!/^N(?:0[1-9]|1[0-9]|20)$/.test(n)))bad('Normas fuera de N01-N20 o repetidas: '+id);
    const source=p.fuente?.trim()||null;
    if(!['APTO_PROPUESTO','REVISAR','EXCLUIDA'].includes(status))bad('Estado fonético desconocido: '+status);
    const excluded=PHONETIC_EXCLUSIONS.has(phoneticKey(p.latin));
    const state:AcademicBankRecordV1['status']=excluded||status==='EXCLUIDA'?'rejected'
      :status==='APTO_PROPUESTO'?'verified':'needs-review';
    put('phonetics','ge.phonetics.'+id,text(p.latin,'fonetica.latin'),state,
      'phonetics',`items[id=${id}]`,
      `Estado docente: ${status}; resultado de la fuente: ${text(p.castellano,'fonetica.castellano')}.
      ${excluded?'Exclusión docente expresa: no sortear.':
        'Elegibilidad para sorteo docente, NO certificación lexicográfica de toda la cadena.'}`,
      {sourceReference:source,decisionId:excluded?'teacher-explicit-exclusion':
        status==='APTO_PROPUESTO'?'teacher-apt-for-selection':'teacher-review-pending',
        rules:p.normas,transmission:p.tipoTransmision,meaning:p.castellano});
  }
  const seenMorphology=new Set<string>();
  for(const [ix,m] of snapshot.morphology.entries()){
    const lemma=text(m.lemma,'morfologia.lemma'),form=text(m.form,'morfologia.form');
    const tags=text(m.tags,'morfologia.tags'),url=text(m.reference,'morfologia.reference');
    if(!/^https:\/\//.test(url))bad('Una forma morfológica individual carece de fuente HTTPs: '+form);
    uniqueKey(seenMorphology,`${same(lemma)}\0${same(form)}\0${tags}`,'análisis morfológicos');
    put('morphology','ge.morphology.'+(ix+1),form,'verified',
      'morphology',`singleForms[lang=lat][${ix}]`,
      'Solo esta forma y análisis explícitos de verified-overrides; no se extiende la evidencia al paradigma. '+(m.note??''),
      {lemmaId:lemma,surface:form,analysis:tags,sourceReference:url,
        individuallyExternallyVerified:true,decisionId:'individually-verified-single-form'});
  }
  const bank=new VerifiedAcademicBankV1(manifest,entries);
  const pendingByKind={preverb:0,phonetics:0,prefix:0,latinism:0,morphology:0};
  for(const item of audit.values())if(item.status==='needs-review')pendingByKind[item.kind]++;
  return Object.freeze({bank,audit,sourceReferences:snapshot.sources,pendingByKind});
}

/** Convertir una forma conjugada del texto a lema exige análisis contrastado, no quitar un prefijo. */
export function teacherPreverbBases(snapshot:TeacherAcademicSourceSnapshotV1):readonly {
  lemma:string;enunciado:string;selectionKey:string;requiresDisambiguation:boolean
}[]{
  return snapshot.preverbs.map(p=>({lemma:p.prompt,enunciado:p.enunciado,
    selectionKey:p.ambiguousPrompt?p.enunciado:p.prompt,requiresDisambiguation:p.ambiguousPrompt}));
}
/** Buscar candidato por ID, mostrar trazabilidad docente y avisos de semántica sin generar respuestas. */
export function teacherAuditRecord(report:TeacherAcademicImportResultV1,recordId:string):TeacherAcademicAuditV1|null {
  return report.audit.get(recordId)??null;
}
