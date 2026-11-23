import {MORPH_TYPES} from './morph-categories.js';
import {
  EDITION_SCHEMA_VERSION, TEMPLATE_POINTS_HUNDREDTHS,
  type ChoiceOptionV1, type EditableFieldV1, type EditableTextV1,
  type EvidenceV1, type MorphWordV1, type NotebookEditionV1,
  type NotebookCoverV1, type PageFormatV1, type QuestionKindV1, type QuestionStyleV1,
  type QuestionV1, type QuestionWordSlotV1, type ReviewFlagV1,
  type SourceLinkV1, type TextMarkV1, type TextPlacementV1,
  type VocabularyEntryV1, type GrammarSpanV1, type GrammarAnchorV1, type GrammarReviewDecisionV1,
} from './edition-model.js';

export class InvalidEditionError extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidEditionError'; }
}

function fail(path: string, explanation: string): never {
  throw new InvalidEditionError(`${path}: ${explanation}`);
}

function object(value: unknown, path: string, keys: readonly string[],optional: readonly string[]=[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'se esperaba un objeto');
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row))
    if (!keys.includes(key)&&!optional.includes(key)) fail(`${path}.${key}`, 'campo desconocido');
  for (const key of keys) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, 'campo obligatorio ausente');
  return row;
}
function array(value: unknown, path: string, max = 10_000): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(path, 'lista inválida o demasiado extensa');
  return value;
}
function str(value: unknown, path: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail(path, 'texto inválido');
  return value;
}
function id(value: unknown, path: string): string {
  const s = str(value, path, 120);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(s)) fail(path, 'ID inválido');
  return s;
}
function nullable(value: unknown, path: string, max = 250): string | null {
  return value === null ? null : str(value, path, max);
}
function flag(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'se esperaba booleano');
  return value;
}
function integer(value: unknown, path: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(path, 'entero fuera de rango');
  }
  return value;
}
function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path, 'número inválido');
  return value;
}
function choice<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) fail(path, 'valor no admitido');
  return value as T;
}
function utc(value: unknown, path: string): string {
  const s = str(value, path, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)
    || Number.isNaN(Date.parse(s)) || new Date(s).toISOString() !== s) fail(path, 'fecha UTC no canónica');
  return s;
}
const hashPattern = /^fnv1a:[0-9a-f]{8}$/;
/** Huella del contexto de la aparición, no firma de seguridad del documento. */
export function fingerprintForMark(latin: string, start: number, end: number): string {
  const excerpt = `${start}:${end}:` + latin.slice(Math.max(0,start-24),Math.min(latin.length,end+24));
  let hash = 2166136261;
  for (let i = 0; i < excerpt.length; i++) {
    hash ^= excerpt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'fnv1a:' + (hash >>> 0).toString(16).padStart(8,'0');
}
function editable(input: unknown, path: string): EditableFieldV1 {
  const d = object(input,path,['value','origin','locked','lastEditAt']);
  return {
    value: str(d.value,`${path}.value`,5_000,true),
    origin: choice(d.origin,`${path}.origin`,['template','generated','manual']),
    locked: flag(d.locked,`${path}.locked`),
    lastEditAt: d.lastEditAt === null ? null : utc(d.lastEditAt,`${path}.lastEditAt`),
  };
}
function evidence(input: unknown, path: string): EvidenceV1 | null {
  if (input === null) return null;
  const d = object(input,path,['provider','recordId','bankRevision','decisionId']);
  return { provider: str(d.provider,`${path}.provider`,250), recordId: str(d.recordId,`${path}.recordId`,250),
    bankRevision: str(d.bankRevision,`${path}.bankRevision`,250),
    decisionId: nullable(d.decisionId,`${path}.decisionId`) };
}
function style(input: unknown,path: string): QuestionStyleV1 | null {
  if(input===null)return null;
  const d=object(input,path,['beforePt','afterPt','subquestionGapPt']);
  return {beforePt:number(d.beforePt,`${path}.beforePt`,0,72),afterPt:number(d.afterPt,`${path}.afterPt`,0,72),
    subquestionGapPt:number(d.subquestionGapPt,`${path}.subquestionGapPt`,0,72)};
}
function format(input: unknown,path: string): PageFormatV1 {
  const d=object(input,path,['paper','fontFamily','fontSizePt','marginsPt','lineSpacingPt','questionGapPt','showPoints','pageFooter']);
  const m=object(d.marginsPt,`${path}.marginsPt`,['top','right','bottom','left']);
  return { paper:choice(d.paper,`${path}.paper`,['A4']),fontFamily:str(d.fontFamily,`${path}.fontFamily`,150),
    fontSizePt:number(d.fontSizePt,`${path}.fontSizePt`,6,32),
    marginsPt:{top:number(m.top,`${path}.marginsPt.top`,0,160),right:number(m.right,`${path}.marginsPt.right`,0,160),
      bottom:number(m.bottom,`${path}.marginsPt.bottom`,0,160),left:number(m.left,`${path}.marginsPt.left`,0,160)},
    lineSpacingPt:number(d.lineSpacingPt,`${path}.lineSpacingPt`,6,80),
    questionGapPt:number(d.questionGapPt,`${path}.questionGapPt`,0,72),
    showPoints:flag(d.showPoints,`${path}.showPoints`),pageFooter:choice(d.pageFooter,`${path}.pageFooter`,['page | total'])};
}
function mark(input: unknown,path: string,latin: string): TextMarkV1 {
  const d=object(input,path,['id','kind','startUtf16','endUtf16','exact','textFingerprint','reviewRequired']);
  const start=integer(d.startUtf16,`${path}.startUtf16`,0,latin.length);
  const end=integer(d.endUtf16,`${path}.endUtf16`,1,latin.length);
  if(start>=end)fail(path,'rango UTF-16 vacío o invertido');
  const exact=str(d.exact,`${path}.exact`,200_000);
  const fp=str(d.textFingerprint,`${path}.textFingerprint`,32);
  if(!hashPattern.test(fp))fail(path,'huella de contexto inválida');
  const reviewRequired=flag(d.reviewRequired,`${path}.reviewRequired`);
  if(!reviewRequired && (latin.slice(start,end)!==exact || fingerprintForMark(latin,start,end)!==fp)){
    fail(path,'anclaje no coincide; debe marcarse para revisión');
  }
  return {id:id(d.id,`${path}.id`),kind:choice(d.kind,`${path}.kind`,['morph-underline','editorial-roman']),
    startUtf16:start,endUtf16:end,exact,textFingerprint:fp,reviewRequired};
}
function text(input: unknown,path: string): EditableTextV1 {
  const d=object(input,path,['title','author','work','reference','latin','markup']);
  const latin=str(d.latin,`${path}.latin`,200_000);
  return {title:str(d.title,`${path}.title`,250),author:nullable(d.author,`${path}.author`),
    work:nullable(d.work,`${path}.work`),reference:nullable(d.reference,`${path}.reference`),latin,
    markup:array(d.markup,`${path}.markup`,3000).map((v,i)=>mark(v,`${path}.markup[${i}]`,latin))};
}
function morphWord(input: unknown,path: string):MorphWordV1 {
  const d=object(input,path,['id','markId','surface','lemmaId','analysis','provenance','reviewState','locked'],['schoolCategory']);
  const reviewState=choice(d.reviewState,`${path}.reviewState`,['verified','needs-review','manual']);
  const provenance=evidence(d.provenance,`${path}.provenance`);
  if(reviewState==='verified'&&!provenance)fail(path,'forma verificada sin evidencia');
  return {id:id(d.id,`${path}.id`),markId:id(d.markId,`${path}.markId`),
    surface:str(d.surface,`${path}.surface`,200_000),lemmaId:nullable(d.lemmaId,`${path}.lemmaId`),
    analysis:nullable(d.analysis,`${path}.analysis`,3000),
    ...(d.schoolCategory===undefined?{}:{schoolCategory:choice(d.schoolCategory,`${path}.schoolCategory`,MORPH_TYPES)}),
    provenance,reviewState,locked:flag(d.locked,`${path}.locked`)};
}
function slot(input: unknown,path: string):QuestionWordSlotV1 {
  const d=object(input,path,['id','value','proposedLemmaId','origin','locked','provenance']);
  const origin=choice(d.origin,`${path}.origin`,['generated','manual']);
  const provenance=evidence(d.provenance,`${path}.provenance`);
  if(origin==='generated'&&!provenance)fail(path,'propuesta generada sin evidencia');
  return {id:id(d.id,`${path}.id`),value:str(d.value,`${path}.value`,1000),
    proposedLemmaId:nullable(d.proposedLemmaId,`${path}.proposedLemmaId`),origin,
    locked:flag(d.locked,`${path}.locked`),provenance};
}
function option(input: unknown,path: string):ChoiceOptionV1 {
  const d=object(input,path,['id','kind','enabled','statement','slots'],['preverbBaseIds','preverbBasesProtected']);
  const kind=choice(d.kind,`${path}.kind`,['preverb','phonetics','prefix','latinism']);
  const result:ChoiceOptionV1={id:id(d.id,`${path}.id`),kind,
    enabled:flag(d.enabled,`${path}.enabled`),statement:editable(d.statement,`${path}.statement`),
    slots:array(d.slots,`${path}.slots`,500).map((v,i)=>slot(v,`${path}.slots[${i}]`))};
  if(d.preverbBaseIds!==undefined){
    const bases=array(d.preverbBaseIds,path+'.preverbBaseIds',2);
    if(kind!=='preverb'||bases.length!==2||bases[0]===bases[1])fail(path,'bases preverbiales inválidas');
    result.preverbBaseIds=[str(bases[0],path+'.preverbBaseIds[0]',200),
      str(bases[1],path+'.preverbBaseIds[1]',200)];
  }
  if(d.preverbBasesProtected!==undefined){
    if(!result.preverbBaseIds)fail(path,'protección de bases sin identificadores');
    result.preverbBasesProtected=flag(d.preverbBasesProtected,path+'.preverbBasesProtected');
  }
  return result;
}
function question(input: unknown,path: string):QuestionV1 {
  if(!input||typeof input!=='object')fail(path,'pregunta inválida');
  const kind=(input as Record<string,unknown>).kind;
  const k=choice(kind,`${path}.kind`,['translation','syntax','morphology','choice']);
  const keys=['id','kind','enabled','statement','pointsHundredths','styleOverride'];
  if(k==='morphology')keys.push('words');
  if(k==='choice')keys.push('requiredCount','options');
  const d=object(input,path,keys);
  const base={id:id(d.id,`${path}.id`),enabled:flag(d.enabled,`${path}.enabled`),
    statement:editable(d.statement,`${path}.statement`),
    pointsHundredths:integer(d.pointsHundredths,`${path}.pointsHundredths`,0,10_000),
    styleOverride:style(d.styleOverride,`${path}.styleOverride`)};
  if(k==='translation'||k==='syntax')return {...base,kind:k};
  if(k==='morphology')return {...base,kind:k,words:array(d.words,`${path}.words`,500).map((v,i)=>morphWord(v,`${path}.words[${i}]`))};
  return {...base,kind:'choice',requiredCount:integer(d.requiredCount,`${path}.requiredCount`,1,4),
    options:array(d.options,`${path}.options`,4).map((v,i)=>option(v,`${path}.options[${i}]`))};
}
export function validateVocabularyEntry(input: unknown,path: string):VocabularyEntryV1 {
  const d=object(input,path,['id','lemma','headword','meaning','note','included','order','provenance','reviewState','origin','locked'],['glossesSeparated','collatinusSource','collatinusProper']);
  const provenance=evidence(d.provenance,`${path}.provenance`);
  const reviewState=choice(d.reviewState,`${path}.reviewState`,['verified','needs-review','manual']);
  const origin=choice(d.origin,`${path}.origin`,['generated','manual']);
  if(reviewState==='verified'&&!provenance)fail(path,'entrada verificada sin evidencia');
  if(origin==='generated'&&!provenance && reviewState!=='needs-review')fail(path,'entrada generada sin evidencia');
  return {id:id(d.id,`${path}.id`),lemma:str(d.lemma,`${path}.lemma`,250),
    headword:str(d.headword,`${path}.headword`,500),
    meaning:nullable(d.meaning,`${path}.meaning`,1000),note:nullable(d.note,`${path}.note`,2000),
    included:flag(d.included,`${path}.included`),order:integer(d.order,`${path}.order`,0),provenance,
    reviewState,origin,locked:flag(d.locked,`${path}.locked`),
    ...(Object.hasOwn(d,'glossesSeparated')?{glossesSeparated:flag(d.glossesSeparated,`${path}.glossesSeparated`)}:{}),
    ...(Object.hasOwn(d,'collatinusSource')?{collatinusSource:flag(d.collatinusSource,`${path}.collatinusSource`)}:{}),
    ...(Object.hasOwn(d,'collatinusProper')?{collatinusProper:flag(d.collatinusProper,`${path}.collatinusProper`)}:{})};
}
function source(input:unknown,path:string):SourceLinkV1 {
  const d=object(input,path,['kind','sourceId','urn','importedAt']);
  const kind=choice(d.kind,`${path}.kind`,['corpus','library','manual']);
  const sourceId=d.sourceId===null?null:id(d.sourceId,`${path}.sourceId`);
  const urn=nullable(d.urn,`${path}.urn`,500);
  if(kind==='corpus'&&!sourceId)fail(path,'texto de Corpus sin sourceId');
  if(kind==='library'&&!urn)fail(path,'obra de Biblioteca sin urn');
  if(kind==='manual'&&(urn!==null||sourceId!==null))fail(path,'texto manual sin identificador ajeno');
  return {kind,sourceId,urn,importedAt:utc(d.importedAt,`${path}.importedAt`)};
}
function reviewFlag(input:unknown,path:string):ReviewFlagV1 {
  const d=object(input,path,['id','scopeId','reason']);
  return {id:id(d.id,`${path}.id`),scopeId:id(d.scopeId,`${path}.scopeId`),reason:str(d.reason,`${path}.reason`,1000)};
}
const grammarAnchorFields=['startUtf16','endUtf16','exact','textFingerprint','reviewRequired'] as const;
function grammarAnchor(d:Record<string,unknown>,path:string,latin:string):GrammarAnchorV1{
  const reviewRequired=flag(d.reviewRequired,`${path}.reviewRequired`);
  const limit=reviewRequired?200_000:latin.length;
  const start=integer(d.startUtf16,`${path}.startUtf16`,0,limit);
  const end=integer(d.endUtf16,`${path}.endUtf16`,1,limit);
  if(start>=end)fail(path,'fragmento vacío o invertido');
  const exact=str(d.exact,`${path}.exact`,200_000);
  const fp=str(d.textFingerprint,`${path}.textFingerprint`,32);
  if(!hashPattern.test(fp))fail(path,'huella del fragmento inválida');
  if(!reviewRequired&&(latin.slice(start,end)!==exact||fingerprintForMark(latin,start,end)!==fp))
    fail(path,'fragmento desanclado sin marca de revisión');
  return {startUtf16:start,endUtf16:end,exact,textFingerprint:fp,reviewRequired};
}
function grammarReviewDecision(input:unknown,path:string,latin:string):GrammarReviewDecisionV1{
  const d=object(input,path,['kind',...grammarAnchorFields],['tagId','lid','morpho']);
  const anchor=grammarAnchor(d,path,latin);
  const kind=choice(d.kind,path+'.kind',['rejected','reading']);
  if(kind==='rejected'&&!Object.hasOwn(d,'lid')&&!Object.hasOwn(d,'morpho'))
    return {...anchor,kind,tagId:id(d.tagId,path+'.tagId')};
  if(kind==='reading'&&!Object.hasOwn(d,'tagId'))
    return {...anchor,kind,lid:integer(d.lid,path+'.lid',0,Number.MAX_SAFE_INTEGER),
      morpho:str(d.morpho,path+'.morpho',2000,true)};
  return fail(path,'decisión de revisión inválida');
}
function grammarSpan(input:unknown,path:string,latin:string):GrammarSpanV1{
  const d=object(input,path,['id',...grammarAnchorFields,'tagIds'],['evidence']);
  const anchor=grammarAnchor(d,path,latin);
  const tagIds=array(d.tagIds,`${path}.tagIds`,200).map((v,i)=>id(v,`${path}.tagIds[${i}]`));
  if(!tagIds.length||new Set(tagIds).size!==tagIds.length)
    fail(path,'el fragmento necesita etiquetas sin repetir');
  const result:GrammarSpanV1={id:id(d.id,`${path}.id`),startUtf16:anchor.startUtf16,endUtf16:anchor.endUtf16,
    exact:anchor.exact,textFingerprint:anchor.textFingerprint,tagIds,reviewRequired:anchor.reviewRequired};
  if(d.evidence!==undefined){
    result.evidence=array(d.evidence,path+'.evidence',200).map((value,i)=>{
      const where=`${path}.evidence[${i}]`;
      const record=object(value,where,['tagId','engine','rule','evidence']);
      const tagId=id(record.tagId,where+'.tagId');
      if(!tagIds.includes(tagId))fail(where,'evidencia de una etiqueta ausente');
      return {tagId,engine:str(record.engine,where+'.engine',200),rule:str(record.rule,where+'.rule',200),
        evidence:array(record.evidence,where+'.evidence',250).map((line,j)=>str(line,`${where}.evidence[${j}]`,2000))};
    });
    if(new Set(result.evidence.map(record=>record.tagId)).size!==result.evidence.length)
      fail(path,'evidencia repetida para una etiqueta');
  }
  return result;
}
function placement(input:unknown,path:string):TextPlacementV1 {
  const d=object(input,path,['id','source','text','questions','vocabulary','grammaticalTagIds','reviewFlags'],
    ['grammaticalSpans','grammarReview','vocabularySelectionMode','vocabularyQuantityMode']);
  const sourceText=text(d.text,`${path}.text`);
  return {id:id(d.id,`${path}.id`),source:source(d.source,`${path}.source`),text:sourceText,
    questions:array(d.questions,`${path}.questions`,20).map((v,i)=>question(v,`${path}.questions[${i}]`)),
    vocabulary:array(d.vocabulary,`${path}.vocabulary`,4000).map((v,i)=>validateVocabularyEntry(v,`${path}.vocabulary[${i}]`)),
    ...(Object.hasOwn(d,'vocabularySelectionMode')?{
      vocabularySelectionMode:choice(d.vocabularySelectionMode,`${path}.vocabularySelectionMode`,['elegir','todo'])}:{}),
    ...(Object.hasOwn(d,'vocabularyQuantityMode')?{
      vocabularyQuantityMode:choice(d.vocabularyQuantityMode,`${path}.vocabularyQuantityMode`,['modelo','todas','largas','ninguna'])}:{}),
    grammaticalTagIds:array(d.grammaticalTagIds,`${path}.grammaticalTagIds`,2000).map((v,i)=>id(v,`${path}.grammaticalTagIds[${i}]`)),
    ...(Object.hasOwn(d,'grammaticalSpans')?{grammaticalSpans:array(d.grammaticalSpans,
      `${path}.grammaticalSpans`,1000).map((v,i)=>grammarSpan(v,`${path}.grammaticalSpans[${i}]`,sourceText.latin))}:{}),
    ...(Object.hasOwn(d,'grammarReview')?{grammarReview:array(d.grammarReview,path+'.grammarReview',4000)
      .map((decision,i)=>grammarReviewDecision(decision,`${path}.grammarReview[${i}]`,sourceText.latin))}:{}),
    reviewFlags:array(d.reviewFlags,`${path}.reviewFlags`,4000).map((v,i)=>reviewFlag(v,`${path}.reviewFlags[${i}]`))};
}
function coverData(input:unknown):NotebookCoverV1{
  const d=object(input,'edition.cover',[
    'title','subtitle','course','studentLabel','groupLabel','imageDataUrl',
    'imageCredit','colorMode','reflection',
  ]);
  const imageDataUrl=str(d.imageDataUrl,'edition.cover.imageDataUrl',850_000);
  if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(imageDataUrl) ||
     (imageDataUrl.length-23)%4!==0)
    fail('edition.cover.imageDataUrl','imagen JPEG incrustada inválida');
  return {
    title:str(d.title,'edition.cover.title',180),
    subtitle:str(d.subtitle,'edition.cover.subtitle',180,true),
    course:str(d.course,'edition.cover.course',120,true),
    studentLabel:str(d.studentLabel,'edition.cover.studentLabel',100),
    groupLabel:str(d.groupLabel,'edition.cover.groupLabel',100),
    imageDataUrl,imageCredit:str(d.imageCredit,'edition.cover.imageCredit',280,true),
    colorMode:choice(d.colorMode,'edition.cover.colorMode',['color','gray','mono']),
    reflection:flag(d.reflection,'edition.cover.reflection'),
  };
}
/** Rechaza campos extraños y referencias rotas; devuelve una copia normalizada independiente. */
export function validateEdition(input:unknown):NotebookEditionV1 {
  const d=object(input,'edition',['editionSchemaVersion','id','legacyNotebookId','title','locale','createdAt','updatedAt','format','placements'],['cover']);
  if(d.editionSchemaVersion!==EDITION_SCHEMA_VERSION)fail('edition.editionSchemaVersion','versión incompatible');
  const e:NotebookEditionV1={editionSchemaVersion:EDITION_SCHEMA_VERSION,id:id(d.id,'edition.id'),
    legacyNotebookId:d.legacyNotebookId===null?null:id(d.legacyNotebookId,'edition.legacyNotebookId'),
    title:str(d.title,'edition.title',250),locale:choice(d.locale,'edition.locale',['es']),
    createdAt:utc(d.createdAt,'edition.createdAt'),updatedAt:utc(d.updatedAt,'edition.updatedAt'),
    format:format(d.format,'edition.format'),
    placements:array(d.placements,'edition.placements',1000).map((v,i)=>placement(v,`edition.placements[${i}]`)),
    ...(d.cover===undefined?{}:{cover:coverData(d.cover)})};
  if(e.updatedAt<e.createdAt)fail('edition.updatedAt','anterior a createdAt');
  // Los IDs de entidades son únicos en toda la edición, no solo dentro de un arreglo.
  const ids = new Set<string>();
  function register(v:{id:string},path:string){if(ids.has(v.id))fail(path,'ID duplicado: '+v.id); ids.add(v.id);}
  register(e,'edition.id');
  e.placements.forEach((p,i)=>{
    const path=`edition.placements[${i}]`;
    register(p,path+'.id');
    for(const m of p.text.markup)register(m,path+'.text.markup');
    for(const span of p.grammaticalSpans??[])register(span,path+'.grammaticalSpans');
    for(const q of p.questions){
      register(q,path+'.questions');
      if(q.kind==='morphology'){
        const found=new Set<string>();
        for(const w of q.words){
          register(w,path+'.questions.words');
          const mark=p.text.markup.find(m=>m.id===w.markId&&m.kind==='morph-underline');
          if(!mark)fail(path+'.questions.words','markId inexistente o ajeno a morfología');
          if(w.surface!==mark.exact)fail(path+'.questions.words','la forma no coincide con la marca');
          if(mark.reviewRequired&&w.reviewState==='verified')fail(path+'.questions.words','anclaje pendiente no puede ser verificado');
          if(found.has(w.markId))fail(path+'.questions.words','dos palabras vinculadas a la misma marca');
          found.add(w.markId);
        }
      }
      if(q.kind==='choice'){
        const kinds=new Set<string>();
        for(const o of q.options){
          register(o,path+'.questions.options');
          if(kinds.has(o.kind))fail(path+'.questions.options','dos apartados con el mismo tipo');
          kinds.add(o.kind);
          for(const w of o.slots)register(w,path+'.questions.options.slots');
        }
        // La cadena no almacena valores de N/M que puedan desincronizarse.
        if(q.statement.value && (!q.statement.value.includes('{required}')||!q.statement.value.includes('{offered}'))){
          fail(path+'.questions.statement','la pregunta de elección requiere {required} y {offered}');
        }
      }
    }
    const orders=new Set<number>();
    for(const v of p.vocabulary){register(v,path+'.vocabulary');if(orders.has(v.order))fail(path+'.vocabulary','orden repetido');orders.add(v.order);}
    for(const f of p.reviewFlags)register(f,path+'.reviewFlags');
    if(new Set(p.grammaticalTagIds).size!==p.grammaticalTagIds.length)fail(path+'.grammaticalTagIds','etiqueta duplicada');
  });
  // Cada marca de revisión pertenece a la edición o a la aparición que la declara.
  // Un ID de otra aparición, aunque exista, no es un ámbito válido.
  for(const p of e.placements){
    const localIds = new Set<string>([e.id,p.id]);
    for(const m of p.text.markup)localIds.add(m.id);
    for(const q of p.questions){
      localIds.add(q.id);
      if(q.kind==='morphology')for(const w of q.words)localIds.add(w.id);
      if(q.kind==='choice')for(const o of q.options){
        localIds.add(o.id);
        for(const w of o.slots)localIds.add(w.id);
      }
    }
    for(const v of p.vocabulary)localIds.add(v.id);
    for(const f of p.reviewFlags)localIds.add(f.id);
    for(const f of p.reviewFlags){
      if(!localIds.has(f.scopeId)){
        fail('reviewFlags.scopeId',ids.has(f.scopeId)
          ? 'el ámbito no pertenece a esta aparición'
          : 'referencia a entidad inexistente');
      }
    }
  }
  return e;
}

export interface ReadinessIssueV1 {
  placementId: string;
  code: 'empty-notebook' | 'wrong-template' | 'points' | 'choice' | 'content-missing' | 'morph-anchors' | 'review-needed';
  detail: string;
}
/** Borradores incompletos son válidos; solo el estado «listo» exige la plantilla y 800 centésimas. */
export function checkEditionReadiness(edition:NotebookEditionV1):ReadinessIssueV1[] {
  const e=validateEdition(edition);
  const issues:ReadinessIssueV1[]=[];
  if(!e.placements.length)issues.push({placementId:'',code:'empty-notebook',detail:'El cuaderno no contiene textos.'});
  for(const p of e.placements){
    const kinds=new Map<QuestionKindV1,number>();
    for(const q of p.questions)kinds.set(q.kind,(kinds.get(q.kind)??0)+1);
    if(['translation','syntax','morphology','choice'].some(k=>kinds.get(k as QuestionKindV1)!==1) || p.questions.length!==4){
      issues.push({placementId:p.id,code:'wrong-template',detail:'La plantilla exige cuatro preguntas distintas.'});
    }
    const points=p.questions.filter(q=>q.enabled).reduce((sum,q)=>sum+q.pointsHundredths,0);
    if(points!==TEMPLATE_POINTS_HUNDREDTHS){
      issues.push({placementId:p.id,code:'points',detail:`Total ${points}/800: revisar la puntuación sin redistribuirla automáticamente.`});
    }
    for(const q of p.questions){
      if(q.kind==='morphology' && q.enabled && !q.words.length){
        issues.push({placementId:p.id,code:'content-missing',detail:'Faltan palabras seleccionadas para el análisis morfológico.'});
      }
      if(q.kind==='choice' && q.enabled && q.options.some(o=>o.enabled&&!o.slots.length)){
        issues.push({placementId:p.id,code:'content-missing',detail:'Faltan términos en apartados activos de la pregunta de elección.'});
      }
      if(q.kind==='choice'&&q.enabled&&q.options.filter(o=>o.enabled).length<q.requiredCount){
        issues.push({placementId:p.id,code:'choice',detail:'Hay menos apartados activos que los que deben elegirse.'});
      }
      if(q.kind==='morphology'&&q.enabled&&q.words.some(w=>p.text.markup.find(m=>m.id===w.markId)?.reviewRequired)){
        issues.push({placementId:p.id,code:'morph-anchors',detail:'Las palabras subrayadas necesitan revisar sus anclajes.'});
      }
    }
    if(p.reviewFlags.length || p.vocabulary.some(v=>v.included&&v.reviewState==='needs-review')
      || p.questions.some(q=>q.kind==='morphology'&&q.words.some(w=>w.reviewState==='needs-review'))){
      issues.push({placementId:p.id,code:'review-needed',detail:'Existen registros académicos pendientes de revisión.'});
    }
  }
  return issues;
}
