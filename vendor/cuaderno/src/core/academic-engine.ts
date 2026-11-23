import type {
  ChoiceOptionV1, NotebookEditionV1, QuestionV1, QuestionWordSlotV1,
  TextPlacementV1,
} from './edition-model.js';
import { validateEdition } from './edition-validation.js';
import {
  regenerateMorph, regenerateQuestion, regenerateSlot, regenerateSubquestion,
} from './edition-operations.js';
import type { EditionSnapshotV1, WorkspaceRepository } from '../storage/workspace-repository.js';
import {
  type AcademicBankRecordV1, type AcademicSlotKindV1, VerifiedAcademicBankV1,
} from './academic-bank.js';

/** No existe sorteo o generación implícita al cambiar de menú, cantidad o vista. */
export class AcademicEngineError extends Error {
  constructor(message: string) { super(message); this.name = 'AcademicEngineError'; }
}
function fail(msg: string): never { throw new AcademicEngineError(msg); }
export const normalizeAcademicExercise = (value: string): string => value.normalize('NFC').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
/** Adaptación tipográfica SOLO de propuestas generadas: el banco docente
 * conserva su grafía y los términos manuales no se reescriben.
 */
export function generatedAcademicValue(kind:AcademicSlotKindV1,value:string):string {
  if(kind!=='prefix')return value;
  return value.replace(/^(\s*)(\p{L})/u,(_match,spaces:string,first:string)=>
    spaces+first.toLocaleLowerCase('es'));
}
/** Adaptar también cuadernos anteriores: la edición manual nunca pierde su grafía.
 * La misma función alimenta los campos docentes, la hoja PDF y Word.
 */
export function displayedAcademicSlotValue(kind:AcademicSlotKindV1,
  slot:Pick<QuestionWordSlotV1,'value'|'origin'>):string {
  return slot.origin==='generated'?generatedAcademicValue(kind,slot.value):slot.value;
}
const choose = <T>(items: readonly T[], seed: number): T => items[((seed % items.length) + items.length) % items.length]!;
function checkSeed(seed: number): void {
  if (!Number.isSafeInteger(seed) || seed < 0) fail('La semilla de selección debe ser un entero no negativo');
}
function checkRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) fail('Revisión esperada inválida');
}
function getPlacement(edition: NotebookEditionV1,id: string): TextPlacementV1 {
  return edition.placements.find(x=>x.id===id) ?? fail('Aparición inexistente');
}
function getQuestion(placement:TextPlacementV1,id:string):QuestionV1 {
  return placement.questions.find(x=>x.id===id)??fail('Pregunta inexistente');
}
function getChoice(placement:TextPlacementV1,id:string):Extract<QuestionV1,{kind:'choice'}> {
  const q=getQuestion(placement,id);
  if(q.kind!=='choice')fail('La pregunta seleccionada no contiene apartados');
  return q as Extract<QuestionV1,{kind:'choice'}>;
}
function getOption(q:Extract<QuestionV1,{kind:'choice'}>,id:string):ChoiceOptionV1 {
  return q.options.find(x=>x.id===id)??fail('Apartado inexistente');
}
export interface AcademicTargetV1 {
  placementId: string;
  questionId: string;
  expectedRevision: number;
  /** Filtro curricular: solo normas N01–N20; vacío equivale a cero candidatas. */
  phoneticRules?: readonly string[];
}
export interface AcademicSlotTargetV1 extends AcademicTargetV1 {
  optionId: string;
  slotId: string;
  /** Para modificación preverbial: forma concreta de partida. */
  sourceForm?: string;
}
export interface AcademicGroupTargetV1 extends AcademicTargetV1 {
  optionId: string;
  desiredCount: number;
  sourceForms?: readonly string[];
  /** IDs para nuevas casillas: los existentes conservan su ID. */
  newSlotIds?: readonly string[];
  allowManualReplacement?: boolean;
  seed: number;
}
export interface AcademicQuestionTargetV1 extends AcademicTargetV1 {
  desiredCountByKind: Partial<Record<AcademicSlotKindV1,number>>;
  sourceFormsByKind?: Partial<Record<AcademicSlotKindV1,readonly string[]>>;
  /** Los ID para nuevas casillas se inyectan; no se generan dentro de IDB. */
  newSlotIdsByKind?: Partial<Record<AcademicSlotKindV1,readonly string[]>>;
  allowManualReplacement?: boolean;
  seed: number;
}
export interface AcademicMorphTargetV1 extends AcademicTargetV1 { wordId: string }
export interface AcademicPreviewV1 {
  status: 'ready' | 'ambiguous' | 'no-candidates' | 'locked';
  candidates: readonly {id:string; value:string; lemmaId:string|null; analysis:string|null}[];
  pendingReview: number;
}
export interface AcademicAssignmentV1 {
  slotId: string;
  candidateId: string | null;
  sourceForm: string | null;
  /** Repetición interna autorizada solo cuando no hay alternativa distinta elegible. */
  unavoidableRepeat?: boolean;
}
export interface AcademicPlanV1 {
  kind: 'slot' | 'subquestion' | 'choice-question' | 'morph';
  editionId: string;
  target: AcademicTargetV1;
  optionId: string | null;
  wordId: string | null;
  assignments: readonly {optionId:string; items:readonly AcademicAssignmentV1[]}[];
  morphCandidateId: string | null;
  replaceLocked: boolean;
  /** Comprobación exacta además de CAS: protege restauraciones con igual revisión. */
  baseline: string;
  bankId: string;
  bankRevision: string;
}
function validSlotRecord(row: AcademicBankRecordV1,kind:AcademicSlotKindV1,sourceForm:string|null,
  selectedRules?:readonly string[]):boolean {
  if(row.kind!==kind || (kind==='preverb' && (sourceForm===null||row.sourceForm!==sourceForm)))return false;
  // No basta con pasar un ID de una ficha de otra norma en el momento de confirmar.
  if(kind==='phonetics'&&selectedRules!==undefined &&
    (!row.phoneticRules||!row.phoneticRules.every(rule=>selectedRules.includes(rule))))return false;
  return true;
}
function existingValues(q: Extract<QuestionV1,{kind:'choice'}>, exclusion: readonly string[]):Set<string> {
  const ids=new Set(exclusion);
  return new Set(q.options.flatMap(o=>o.slots.filter(s=>!ids.has(s.id)).map(s=>normalizeAcademicExercise(s.value))));
}
/** La unicidad del cuaderno se calcula por valor, no por ID de ficha ni por texto. */
function notebookUsage(edition:NotebookEditionV1):ReadonlySet<string> {
  // Solo las preguntas visibles consumen repertorio. Un término descartado
  // en un apartado o pregunta desactivados sigue disponible para los ejercicios.
  return new Set(edition.placements.flatMap(p=>p.questions.flatMap(q=>
    q.enabled&&q.kind==='choice'
      ?q.options.filter(o=>o.enabled).flatMap(o=>o.slots
        .map(s=>normalizeAcademicExercise(s.value)).filter(Boolean))
      :[])));
}
/** Solo se reutiliza una palabra ya usada si no queda ninguna candidata nueva y válida. */
function teacherProtected(slot:QuestionWordSlotV1):boolean {
  // El origen manual tiene prioridad aunque una importación antigua no marcara "locked".
  return slot.locked||slot.origin==='manual';
}
function preferNew<T extends {value:string}>(rows:readonly T[],used:ReadonlySet<string>):readonly T[] {
  const fresh=rows.filter(row=>!used.has(normalizeAcademicExercise(row.value)));
  return fresh.length?fresh:rows;
}
function makePlan(edition:NotebookEditionV1,target:AcademicTargetV1,kind:AcademicPlanV1['kind'],bank:VerifiedAcademicBankV1,
  values:{optionId?:string;wordId?:string;assignments?:AcademicPlanV1['assignments'];morphCandidateId?:string;replaceLocked?:boolean}):AcademicPlanV1 {
  checkRevision(target.expectedRevision);
  const normalized=validateEdition(edition);
  return {editionId:normalized.id,kind,target:structuredClone(target),optionId:values.optionId??null,
    wordId:values.wordId??null,assignments:values.assignments??[],morphCandidateId:values.morphCandidateId??null,
    replaceLocked:values.replaceLocked??false,baseline:JSON.stringify(normalized),
    bankId:bank.manifest.id,bankRevision:bank.manifest.revision};
}
export class AcademicQuestionEngineV1 {
  constructor(readonly bank: VerifiedAcademicBankV1) {}

  previewSlot(edition:NotebookEditionV1,target:AcademicSlotTargetV1,onlyUnused=false):AcademicPreviewV1 {
    const valid=validateEdition(edition);
    const p=getPlacement(valid,target.placementId);
    const q=getChoice(p,target.questionId),option=getOption(q,target.optionId);
    const slot=option.slots.find(s=>s.id===target.slotId)??fail('Palabra inexistente');
    const sourceForm=target.sourceForm??null;
    if(option.kind==='preverb'&&!sourceForm)fail('Es necesario elegir la forma de partida preverbial');
    const taken=existingValues(q,[slot.id]);
    taken.add(normalizeAcademicExercise(slot.value));
    const eligible=this.bank.verified(option.kind,sourceForm,
      option.kind==='phonetics'?target.phoneticRules:undefined).filter(row=>!taken.has(normalizeAcademicExercise(row.value)));
    const usage=notebookUsage(valid);
    const rows=onlyUnused?eligible.filter(row=>!usage.has(normalizeAcademicExercise(row.value))):preferNew(eligible,usage);
    return {status:!rows.length?'no-candidates':teacherProtected(slot)?'locked':'ready',
      candidates:rows.map(r=>({id:r.id,value:generatedAcademicValue(option.kind,r.value),
        lemmaId:r.lemmaId,analysis:r.analysis})),
      pendingReview:this.bank.statusCounts(option.kind).needsReview};
  }
  prepareSlot(edition:NotebookEditionV1,target:AcademicSlotTargetV1,
    candidateId: string | null = null,seed=0,replaceLocked=false):AcademicPlanV1 {
    checkSeed(seed);
    const q=getChoice(getPlacement(edition,target.placementId),target.questionId);
    const option=getOption(q,target.optionId);
    const slot=option.slots.find(x=>x.id===target.slotId)??fail('Palabra inexistente');
    if(teacherProtected(slot)&&!replaceLocked)fail('Palabra manual bloqueada o protegida; requiere autorización expresa');
    const preview=this.previewSlot(edition,target);
    const chosen=candidateId?preview.candidates.find(x=>x.id===candidateId):choose(preview.candidates,seed);
    if(!chosen)fail('No hay alternativas académicas verificadas para esta palabra');
    return makePlan(edition,target,'slot',this.bank,{optionId:target.optionId,replaceLocked,
      assignments:[{optionId:target.optionId,items:[{slotId:target.slotId,candidateId:chosen.id,sourceForm:target.sourceForm??null}]}]});
  }
  previewMorph(edition:NotebookEditionV1,target:AcademicMorphTargetV1):AcademicPreviewV1 {
    const p=getPlacement(validateEdition(edition),target.placementId),q=getQuestion(p,target.questionId);
    if(q.kind!=='morphology')fail('No es la pregunta de morfología');
    const word=q.words.find(w=>w.id===target.wordId)??fail('Forma morfológica inexistente');
    const mark=p.text.markup.find(x=>x.id===word.markId&&x.kind==='morph-underline')??fail('Subrayado inexistente');
    if(mark.reviewRequired)fail('El subrayado exige revisión antes de analizar');
    const rows=this.bank.verified('morphology',word.surface);
    // Distintos análisis de una misma superficie son distintos candidatos; no elegirlos al azar.
    const ambiguous=new Set(rows.map(x=>`${x.lemmaId}\0${x.analysis}`)).size>1;
    return {status:word.locked||word.reviewState==='manual'?'locked':rows.length===0?'no-candidates':ambiguous?'ambiguous':'ready',
      candidates:rows.map(r=>({id:r.id,value:r.value,lemmaId:r.lemmaId,analysis:r.analysis})),
      pendingReview:this.bank.statusCounts('morphology').needsReview};
  }
  prepareMorph(edition:NotebookEditionV1,target:AcademicMorphTargetV1,
    candidateId:string|null=null,replaceLocked=false):AcademicPlanV1 {
    const q=getQuestion(getPlacement(edition,target.placementId),target.questionId);
    if(q.kind!=='morphology')fail('La pregunta no es morfológica');
    const current=q.words.find(x=>x.id===target.wordId)??fail('Forma inexistente');
    if((current.locked||current.reviewState==='manual')&&!replaceLocked)fail('Análisis manual protegido');
    const preview=this.previewMorph(edition,target);
    if(preview.status==='ambiguous'&&!candidateId)fail('La forma es ambigua: exige elección filológica explícita');
    const candidate=candidateId?preview.candidates.find(x=>x.id===candidateId):preview.candidates[0];
    if(!candidate)fail('No hay un análisis verificado para esta forma');
    return makePlan(edition,target,'morph',this.bank,{wordId:target.wordId,morphCandidateId:candidate.id,replaceLocked});
  }

  private assignOption(q:Extract<QuestionV1,{kind:'choice'}>,option:ChoiceOptionV1,
    count:number,sourceForms:readonly string[]|undefined,newIds:readonly string[]|undefined,
    allowManualReplacement:boolean,seed:number,excluded:Set<string>,
    usedInNotebook:ReadonlySet<string>,selectedPhoneticRules?:readonly string[]):AcademicAssignmentV1[] {
    if(!Number.isSafeInteger(count)||count<0||count>30)fail('Cantidad solicitada inválida (0–30)');
    const slots=option.slots;
    if(!allowManualReplacement && slots.some((s,i)=>teacherProtected(s)&&i>=count)){
      fail('El nuevo tamaño eliminaría una palabra manual protegida');
    }
    if(option.kind==='preverb'&&(!sourceForms||sourceForms.length!==count||sourceForms.some(v=>!v.trim()))) {
      fail('Indica para cada derivado preverbial su forma de partida exacta');
    }
    const neededNew=Math.max(0,count-slots.length);
    if(neededNew && (!newIds||newIds.length!==neededNew))fail('Faltan IDs explícitos para las nuevas casillas');
    const allocated=new Set<string>(),items:AcademicAssignmentV1[]=[];
    const excludedOthers=existingValues(q,slots.map(s=>s.id));
    for(const v of excluded)excludedOthers.add(v);
    slots.filter(s=>teacherProtected(s)&&!allowManualReplacement)
      .forEach(s=>excludedOthers.add(normalizeAcademicExercise(s.value)));
    for(let i=0;i<count;i++){
      const existing=slots[i];
      const id=existing?.id??newIds?.[i-slots.length];
      if(!id||allocated.has(id))fail('ID de nueva casilla inexistente o duplicado');
      allocated.add(id);
      const sourceForm=option.kind==='preverb'?(sourceForms?.[i]??null):null;
      if(existing&&teacherProtected(existing)&&!allowManualReplacement){
        items.push({slotId:id,candidateId:null,sourceForm});
        continue;
      }
      const current=existing?normalizeAcademicExercise(existing.value):null;
      const all=this.bank.verified(option.kind,sourceForm,
        option.kind==='phonetics'?selectedPhoneticRules:undefined).filter(row=>
        normalizeAcademicExercise(row.value)!==current);
      const distinct=all.filter(row=>!excludedOthers.has(normalizeAcademicExercise(row.value)));
      // Puede agotarse el subconjunto de términos distintos aunque el banco
      // siga teniendo fichas verificadas: en ese único caso se admite repetir.
      const candidates=distinct.length?distinct:all;
      if(!candidates.length)fail(`No hay términos verificables para ${option.kind} (${i+1}/${count})`);
      const chosen=choose(preferNew(candidates,usedInNotebook),seed+i);
      excludedOthers.add(normalizeAcademicExercise(chosen.value));
      items.push({slotId:id,candidateId:chosen.id,sourceForm,
        ...(distinct.length?{}:{unavoidableRepeat:true})});
    }
    return items;
  }
  prepareSubquestion(edition:NotebookEditionV1,target:AcademicGroupTargetV1):AcademicPlanV1 {
    checkSeed(target.seed);
    const valid=validateEdition(edition);
    const q=getChoice(getPlacement(valid,target.placementId),target.questionId);
    const o=getOption(q,target.optionId);
    const items=this.assignOption(q,o,target.desiredCount,target.sourceForms,target.newSlotIds,
      target.allowManualReplacement??false,target.seed,new Set(),notebookUsage(valid),target.phoneticRules);
    return makePlan(edition,target,'subquestion',this.bank,{optionId:o.id,replaceLocked:target.allowManualReplacement??false,
      assignments:[{optionId:o.id,items}]});
  }
  /** Solo la pregunta 4 de elección es autogenerable; no se inventan traducciones ni sintaxis. */
  prepareChoiceQuestion(edition:NotebookEditionV1,target:AcademicQuestionTargetV1):AcademicPlanV1 {
    checkSeed(target.seed);
    const valid=validateEdition(edition);
    const q=getChoice(getPlacement(valid,target.placementId),target.questionId);
    const assignments:{optionId:string;items:AcademicAssignmentV1[]}[]=[];
    const excluded=new Set<string>();
    const usedInNotebook=notebookUsage(valid);
    for(const [idx,o] of q.options.entries()){
      if(!o.enabled)continue;
      const count=target.desiredCountByKind[o.kind]??o.slots.length;
      const items=this.assignOption(q,o,count,target.sourceFormsByKind?.[o.kind],
        target.newSlotIdsByKind?.[o.kind],target.allowManualReplacement??false,target.seed+idx*31,excluded,
        usedInNotebook,target.phoneticRules);
      assignments.push({optionId:o.id,items});
      for(const entry of items){
        const candidate=entry.candidateId?this.bank.findVerified(entry.candidateId):null;
        const current=o.slots.find(s=>s.id===entry.slotId);
        const value=candidate?.value??current?.value;
        if(value)excluded.add(normalizeAcademicExercise(value));
      }
    }
    if(!assignments.length)fail('La pregunta no contiene apartados activos');
    return makePlan(edition,target,'choice-question',this.bank,{replaceLocked:target.allowManualReplacement??false,assignments});
  }

  private regenerateFromPlan(edition:NotebookEditionV1,plan:AcademicPlanV1,at:string):NotebookEditionV1 {
    if(JSON.stringify(validateEdition(edition))!==plan.baseline)fail('La edición cambió desde la previsualización');
    if(this.bank.manifest.id!==plan.bankId||this.bank.manifest.revision!==plan.bankRevision){
      fail('La revisión del banco ha cambiado');
    }
    const p=getPlacement(edition,plan.target.placementId),q=getQuestion(p,plan.target.questionId);
    if(plan.kind==='morph'){
      if(q.kind!=='morphology'||!plan.wordId||!plan.morphCandidateId)fail('Plan morfológico inválido');
      const word=q.words.find(x=>x.id===plan.wordId)??fail('Forma inexistente');
      if((word.locked||word.reviewState==='manual')&&!plan.replaceLocked)
        fail('La decisión morfológica manual debe conservarse');
      const row=this.bank.findVerified(plan.morphCandidateId);
      if(!row||row.kind!=='morphology'||row.surface!==word.surface||!row.analysis||!row.lemmaId)fail('Análisis fuera del banco verificado');
      return regenerateMorph(edition,p.id,q.id,word.id,{lemmaId:row.lemmaId,analysis:row.analysis,
        provenance:row.evidence,reviewState:'verified'},at,plan.replaceLocked);
    }
    if(q.kind!=='choice')fail('El objetivo no es una pregunta de elección');
    const modified=structuredClone(q);
    const used=new Set<string>();
    for(const a of plan.assignments){
      const option=getOption(modified,a.optionId);
      if(plan.kind==='slot'&&a.items.length!==1)fail('Un botón individual no puede cambiar más de una palabra');
      const original=getOption(q,a.optionId);
      if(plan.kind==='slot'){
        const candidate=a.items[0]!;
        const slot=original.slots.find(s=>s.id===candidate.slotId)??fail('Casilla inexistente');
        if(teacherProtected(slot)&&!plan.replaceLocked)fail('Casilla protegida manualmente');
        if(candidate.candidateId===null)fail('Falta propuesta de palabra individual');
        const row=this.bank.findVerified(candidate.candidateId);
        if(!row||!validSlotRecord(row,option.kind,candidate.sourceForm,plan.target.phoneticRules))fail('Propuesta académica no válida');
        if(normalizeAcademicExercise(row.value)===normalizeAcademicExercise(slot.value))fail('La propuesta no cambia la palabra');
        const taken=existingValues(q,[slot.id]);
        if(taken.has(normalizeAcademicExercise(row.value)))fail('La palabra ya aparece en otro apartado');
        return regenerateSlot(edition,p.id,q.id,a.optionId,slot.id,
          {value:generatedAcademicValue(option.kind,row.value),
            proposedLemmaId:row.lemmaId,provenance:row.evidence},at,plan.replaceLocked);
      }
      const slots:QuestionWordSlotV1[]=[];
      for(const entry of a.items){
        const old=original.slots.find(s=>s.id===entry.slotId);
        if(entry.candidateId===null){
          if(!old||!teacherProtected(old)||plan.replaceLocked)fail('No se puede conservar una casilla no protegida sin candidato');
          slots.push(old);continue;
        }
        if(old&&teacherProtected(old)&&!plan.replaceLocked)fail('No se puede sustituir una palabra protegida');
        const row=this.bank.findVerified(entry.candidateId);
        if(!row||!validSlotRecord(row,option.kind,entry.sourceForm,plan.target.phoneticRules))fail('Propuesta fuera de banco/curso/fuente');
        const valueKey=normalizeAcademicExercise(row.value);
        if(used.has(valueKey)&&!entry.unavoidableRepeat)fail('Dos casillas recibirían la misma palabra');
        if(entry.unavoidableRepeat){
          // Un plan manipulado no debe poder declarar escasez cuando hay una
          // alternativa documentada que no aparece en el apartado.
          const otherExisting=existingValues(q,original.slots.map(slot=>slot.id));
          const hasAlternative=this.bank.verified(option.kind,entry.sourceForm,
            option.kind==='phonetics'?plan.target.phoneticRules:undefined).some(candidate=>{
            const key=normalizeAcademicExercise(candidate.value);
            return key!==normalizeAcademicExercise(old?.value??'')&&!used.has(key)&&!otherExisting.has(key);
          });
          if(hasAlternative)fail('La repetición no está justificada por agotamiento del banco');
        }
        used.add(valueKey);
        if(old && valueKey===normalizeAcademicExercise(old.value))fail('La regeneración no cambia el valor');
        slots.push({id:entry.slotId,value:generatedAcademicValue(option.kind,row.value),
          proposedLemmaId:row.lemmaId,
          origin:'generated',locked:false,provenance:row.evidence});
      }
      option.slots=slots;
    }
    if(plan.kind==='subquestion'){
      if(plan.assignments.length!==1||!plan.optionId||plan.optionId!==plan.assignments[0]?.optionId){
        fail('El plan no identifica un apartado único');
      }
      const a=plan.assignments[0]!;
      const targetOption=getOption(modified,a.optionId);
      const others=existingValues(q,getOption(q,a.optionId).slots.map(s=>s.id));
      for(const s of targetOption.slots){
        const planned=a.items.find(item=>item.slotId===s.id);
        if(others.has(normalizeAcademicExercise(s.value))&&!planned?.unavoidableRepeat)
          fail('La propuesta duplica una palabra del resto');
      }
      // La operación granular existente solo admite candidatos generados.
      // Si preservamos un término manual intacto, aplicamos la pregunta
      // construida con el único subapartado cambiado (ningún otro difiere).
      if(targetOption.slots.some(s=>s.origin==='manual')) {
        return regenerateQuestion(edition,p.id,q.id,modified,at,
          plan.replaceLocked?'replace-confirmed':'preserve');
      }
      return regenerateSubquestion(edition,p.id,q.id,a.optionId,targetOption.slots,at,
        plan.replaceLocked?'replace-confirmed':'preserve');
    }
    if(plan.kind!=='choice-question')fail('Operación académica desconocida');
    if(new Set(plan.assignments.map(a=>a.optionId)).size!==plan.assignments.length){
      fail('Un apartado aparece repetido en el plan');
    }
    for(const o of q.options){
      if(o.enabled&&!plan.assignments.some(a=>a.optionId===o.id))fail('Falta un apartado activo');
    }
    // No se admiten candidatos que dupliquen un término conservado.
    const changed=new Set(plan.assignments.flatMap(a=>a.items.filter(i=>i.candidateId!==null).map(i=>i.slotId)));
    const preserved=new Set(q.options.flatMap(o=>o.slots.filter(s=>!changed.has(s.id)).map(s=>normalizeAcademicExercise(s.value))));
    const unavoidable=new Set(plan.assignments.flatMap(a=>a.items.filter(i=>i.unavoidableRepeat).map(i=>i.slotId)));
    for(const o of modified.options)for(const slot of o.slots){
      if(changed.has(slot.id)&&preserved.has(normalizeAcademicExercise(slot.value))&&!unavoidable.has(slot.id)) {
        fail('La propuesta duplica una palabra conservada');
      }
    }
    // Una propuesta completa conserva los enunciados, apartados desactivados y la puntuación.
    return regenerateQuestion(edition,p.id,q.id,modified,at,
      plan.replaceLocked?'replace-confirmed':'preserve');
  }
  /** Revalida las propuestas dentro del CAS; no se espera al proveedor durante la transacción. */
  async commit(repo:WorkspaceRepository,plan:AcademicPlanV1,at:string):Promise<EditionSnapshotV1> {
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)
      || Number.isNaN(Date.parse(at)) || new Date(at).toISOString()!==at){
      fail('Fecha de confirmación inválida');
    }
    if(!plan||!plan.editionId||plan.editionId!==this.editionId(plan.baseline)){
      fail('El plan pertenece a otra edición');
    }
    return repo.commitEdition(plan.editionId,plan.target.expectedRevision,
      {command:`academic.${plan.kind}`,targetId:plan.wordId??plan.optionId??plan.target.questionId,timestamp:at},
      previous=>{
        if(!previous)fail('El cuaderno ya no existe');
        return this.regenerateFromPlan(previous,plan,at);
      });
  }
  private editionId(baseline:string):string {
    try {return validateEdition(JSON.parse(baseline) as unknown).id;}
    catch {return fail('Instantánea inicial corrupta');}
  }
}
