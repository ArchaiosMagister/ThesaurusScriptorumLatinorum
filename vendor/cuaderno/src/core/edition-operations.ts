import {
  type EditorSessionV1, type EditableTextV1, type GrammarAnchorV1,
  type MorphWordV1, type NotebookEditionV1, type QuestionV1,
  type QuestionWordSlotV1, type TextPlacementV1, type VocabularyEntryV1,
} from './edition-model.js';
import { fingerprintForMark, validateEdition } from './edition-validation.js';
import {morphTypeFromAnalysis} from './morph-categories.js';

/** Operaciones puras: no escriben IndexedDB, no actualizan HTML ni consumen bancos. */
export class EditionOperationError extends Error {
  constructor(message:string){super(message);this.name='EditionOperationError';}
}
function fail(message:string):never{throw new EditionOperationError(message);}
function placement(e:NotebookEditionV1,id:string):TextPlacementV1 {
  const p=e.placements.find(x=>x.id===id);
  return p??fail('Aparición inexistente: '+id);
}
function question(p:TextPlacementV1,id:string):QuestionV1 {
  return p.questions.find(q=>q.id===id)??fail('Pregunta inexistente: '+id);
}
function choiceQuestion(p:TextPlacementV1,id:string):Extract<QuestionV1,{kind:'choice'}> {
  const q=question(p,id);
  if(q.kind!=='choice')fail('La pregunta no es de elección: '+id);
  return q as Extract<QuestionV1,{kind:'choice'}>;
}
function replacePlacement(e:NotebookEditionV1,id:string,edit:(p:TextPlacementV1)=>TextPlacementV1, at:string):NotebookEditionV1 {
  // Primero se comprueba que el destino exista. No se crea por error.
  placement(e,id);
  return validateEdition({...e,updatedAt:at,placements:e.placements.map(p=>p.id===id?edit(p):p)});
}
export function appendPlacement(e:NotebookEditionV1,p:TextPlacementV1,at:string):NotebookEditionV1 {
  return validateEdition({...e,updatedAt:at,placements:[...e.placements,p]});
}
export function scorePlacement(p:TextPlacementV1):number {
  return p.questions.reduce((sum,q)=>sum+(q.enabled?q.pointsHundredths:0),0);
}
const cardinal=['cero','una','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez'];
function word(n:number):string{return cardinal[n]??String(n);}
/** Nunca se almacena la frase «dos de cuatro» como una constante desincronizable. */
export function choiceHeading(q:Extract<QuestionV1,{kind:'choice'}>):string {
  const rendered=q.statement.value || 'Elige {required} de estas {offered} preguntas:';
  return rendered.replaceAll('{required}',word(q.requiredCount)).replaceAll('{offered}',word(q.options.filter(o=>o.enabled).length));
}

/** Una sesión de vista previa es efímera y no altera la edición. */
export function moveSession(e:NotebookEditionV1,s:EditorSessionV1,command:'previous'|'next'|'whole'|{placementId:string}):EditorSessionV1 {
  if(e.id!==s.activeEditionId)fail('La sesión pertenece a otro cuaderno');
  if(command==='whole')return {...s,mode:'whole-notebook'};
  if(typeof command==='object'){
    placement(e,command.placementId);
    return {...s,mode:'text',activePlacementId:command.placementId};
  }
  const current=e.placements.findIndex(p=>p.id===s.activePlacementId);
  if(current<0){
    const first=e.placements[0];
    return {...s,mode:'text',activePlacementId:first?.id??null};
  }
  const next=Math.max(0,Math.min(e.placements.length-1,current+(command==='next'?1:-1)));
  return {...s,mode:'text',activePlacementId:e.placements[next]?.id??null};
}
export function movePlacement(e:NotebookEditionV1,id:string,toIndex:number,at:string):NotebookEditionV1 {
  const index=e.placements.findIndex(x=>x.id===id);
  if(index<0)fail('Aparición inexistente');
  if(!Number.isInteger(toIndex)||toIndex<0||toIndex>=e.placements.length)fail('Posición fuera de rango');
  const next=[...e.placements];
  next.splice(index,1);
  next.splice(toIndex,0,e.placements[index]!);
  return validateEdition({...e,updatedAt:at,placements:next});
}

function reanchorGrammarSpan<T extends GrammarAnchorV1>(span:T,previous:string,latin:string):T{
  if(span.reviewRequired)return span;
  if(latin.slice(span.startUtf16,span.endUtf16)===span.exact
    &&fingerprintForMark(latin,span.startUtf16,span.endUtf16)===span.textFingerprint)return span;
  const start=latin.indexOf(span.exact);
  if(start<0||previous.indexOf(span.exact)!==span.startUtf16
    ||previous.indexOf(span.exact,span.startUtf16+1)!==-1||latin.indexOf(span.exact,start+1)!==-1)
    return {...span,reviewRequired:true};
  const end=start+span.exact.length;
  const wordChar=/[\p{L}\p{M}]/u;
  const joinsWord=(text:string,position:number)=>wordChar.test(text[position-1]??'')
    &&wordChar.test(text[position]??'');
  if(joinsWord(latin,start)!==joinsWord(previous,span.startUtf16)
    ||joinsWord(latin,end)!==joinsWord(previous,span.endUtf16))
    return {...span,reviewRequired:true};
  return {...span,startUtf16:start,endUtf16:end,textFingerprint:fingerprintForMark(latin,start,end)};
}

/** El título, autor, cita y latín de esta aparición son independientes del Corpus original. */
export function editPlacementText(e:NotebookEditionV1, placementId:string,
  key:'title'|'author'|'work'|'reference'|'latin',value:string|null,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const editedText:EditableTextV1={...p.text,[key]:value};
    if(key==='latin'){
      if(typeof value!=='string')fail('El texto latino no puede ser nulo');
      const newLatin=value;
      // El contrato V1 exige offsets dentro de la longitud UTF-16 del texto.
      // No podemos recortar un anclaje y mantener sus coordenadas inválidas.
      // Nunca se descarta silenciosamente la marca ni el análisis docente:
      // primero debe retirarse/reanclarse de forma explícita (operación futura).
      if(p.text.markup.some(mark=>mark.endUtf16>newLatin.length)){
        fail('La edición recorta un subrayado fuera del texto. Revisa o retira primero las marcas afectadas.');
      }
      const spans=(p.grammaticalSpans??[]).map(span=>reanchorGrammarSpan(span,p.text.latin,newLatin));
      editedText.markup=p.text.markup.map(m=>({...m,
        reviewRequired:m.reviewRequired
          || newLatin.slice(m.startUtf16,m.endUtf16)!==m.exact
          || fingerprintForMark(newLatin,m.startUtf16,m.endUtf16)!==m.textFingerprint,
      }));
      const marksInReview=new Set(editedText.markup.filter(m=>m.reviewRequired).map(m=>m.id));
      return {...p,text:editedText,
        ...(p.grammaticalSpans?{grammaticalSpans:spans}:{}),
        ...(p.grammarReview?{grammarReview:p.grammarReview.map(item=>reanchorGrammarSpan(item,p.text.latin,newLatin))}:{}),
        questions:p.questions.map(q=>q.kind==='morphology'
        ? {...q,words:q.words.map(w=>marksInReview.has(w.markId)&&w.reviewState==='verified'
          ? {...w,reviewState:'needs-review' as const}:w)} : q)};
    }
    return {...p,text:editedText};
  },at);
}
export function toggleOption(e:NotebookEditionV1,placementId:string,questionId:string,
  optionId:string,enabled:boolean,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const q=choiceQuestion(p,questionId);
    if(!q.options.some(x=>x.id===optionId))fail('Apartado inexistente');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:
      {...q,options:q.options.map(opt=>opt.id===optionId?{...opt,enabled}:opt)})};
  },at);
}
export function toggleQuestion(e:NotebookEditionV1,placementId:string,questionId:string,
  enabled:boolean,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    question(p,questionId);
    return {...p,questions:p.questions.map(q=>q.id===questionId?{...q,enabled}:q)};
  },at);
}
export function editOptionStatement(e:NotebookEditionV1,placementId:string,questionId:string,
  optionId:string,value:string,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const q=choiceQuestion(p,questionId);
    if(!q.options.some(o=>o.id===optionId))fail('Apartado inexistente');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      options:q.options.map(o=>o.id===optionId?{...o,statement:{value,origin:'manual' as const,locked:true,lastEditAt:at}}:o)})};
  },at);
}
export function editSlotManual(e:NotebookEditionV1,placementId:string,questionId:string,
  optionId:string,slotId:string,value:string,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const q=choiceQuestion(p,questionId);
    const opt=q.options.find(o=>o.id===optionId)??fail('Apartado inexistente');
    if(!opt.slots.some(w=>w.id===slotId))fail('Palabra inexistente');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      options:q.options.map(o=>o.id!==optionId?o:{...o,
        slots:o.slots.map(w=>w.id===slotId?{...w,value,origin:'manual' as const,locked:true}:w)})})};
  },at);
}
export function editMorphManual(e:NotebookEditionV1,placementId:string,questionId:string,
  morphWordId:string,analysis:string,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const q=question(p,questionId);
    if(q.kind!=='morphology')fail('No es pregunta de morfología');
    if(!q.words.some(w=>w.id===morphWordId))fail('Palabra morfológica inexistente');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      words:q.words.map(w=>w.id===morphWordId?{...w,analysis,reviewState:'manual' as const,locked:true}:w)})};
  },at);
}

export function setQuestionPoints(e:NotebookEditionV1,placementId:string,questionId:string,
  pointsHundredths:number,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    question(p,questionId);
    return {...p,questions:p.questions.map(q=>q.id===questionId?{...q,pointsHundredths}:q)};
  },at);
}
export function editQuestionStatement(e:NotebookEditionV1,placementId:string,questionId:string,
  value:string,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    question(p,questionId);
    return {...p,questions:p.questions.map(q=>q.id===questionId?{...q,statement:{value,origin:'manual',locked:true,lastEditAt:at}}:q)};
  },at);
}
export function editVocabulary(e:NotebookEditionV1,placementId:string,vocabularyId:string,
  field:'lemma'|'headword'|'meaning'|'note'|'included'|'glossesSeparated',
  value:string|boolean|null,at:string):NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    if(!p.vocabulary.some(w=>w.id===vocabularyId))fail('Entrada de vocabulario inexistente');
    return {...p,vocabulary:p.vocabulary.map(w=>w.id===vocabularyId
      ? field==='included'?{...w,included:Boolean(value)}
      : {...w,[field]:value,origin:'manual' as const,locked:true,reviewState:'manual' as const}:w)};
  },at);
}

/** Candidato prevalidado; la integración con proveedor/candidatoId será responsabilidad del motor. */
export type SlotCandidateV1=Pick<QuestionWordSlotV1,'value'|'proposedLemmaId'|'provenance'>;
function assertCandidate(c:SlotCandidateV1):void {
  if(!c.provenance)fail('No se sustituye una palabra con una propuesta sin fuente verificada');
  if(!c.value.trim())fail('La palabra propuesta está vacía');
}
/** Regeneración con aislamiento de una única palabra y preservación de ID y posición. */
export function regenerateSlot(e:NotebookEditionV1,placementId:string,questionId:string,
  optionId:string,slotId:string,candidate:SlotCandidateV1,at:string,replaceLocked=false):NotebookEditionV1 {
  assertCandidate(candidate);
  return replacePlacement(e,placementId,p=>{
    const q=choiceQuestion(p,questionId);
    const opt=q.options.find(o=>o.id===optionId)??fail('Apartado inexistente');
    const slot=opt.slots.find(w=>w.id===slotId)??fail('Palabra inexistente');
    if(slot.locked&&!replaceLocked)fail('Palabra bloqueada manualmente: solicitar confirmación');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      options:q.options.map(o=>o.id!==optionId?o:{...o,
        slots:o.slots.map(w=>w.id!==slotId?w:{...w,...candidate,origin:'generated' as const,locked:false})})})};
  },at);
}
export type MorphCandidateV1=Pick<MorphWordV1,'lemmaId'|'analysis'|'provenance'|'reviewState'>;
/** No mueve el subrayado: cambia solo el análisis de una aparición ya anclada. */
export function regenerateMorph(e:NotebookEditionV1,placementId:string,questionId:string,
  morphWordId:string,candidate:MorphCandidateV1,at:string,replaceLocked=false):NotebookEditionV1 {
  if(candidate.reviewState==='verified'&&!candidate.provenance)fail('Análisis sin evidencia verificable');
  if(candidate.reviewState==='manual')fail('Una regeneración automática no puede producir una decisión manual');
  return replacePlacement(e,placementId,p=>{
    const q=question(p,questionId);
    if(q.kind!=='morphology')fail('No es pregunta de morfología');
    const existing=q.words.find(w=>w.id===morphWordId)??fail('Palabra morfológica inexistente');
    if(existing.locked&&!replaceLocked)fail('Análisis bloqueado manualmente');
    const mark=p.text.markup.find(m=>m.id===existing.markId)!;
    if(mark.reviewRequired)fail('La marca necesita revisión antes de regenerar');
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      words:q.words.map(w=>{
        if(w.id!==morphWordId)return w;
        const {schoolCategory:previousCategory,...rest}=w;
        void previousCategory;
        const nextCategory=morphTypeFromAnalysis(candidate.analysis);
        return {...rest,...candidate,...(nextCategory?{schoolCategory:nextCategory}:{}),locked:false};
      })})};
  },at);
}

/** Subapartado: candidato completo sin modificar otro subapartado ni puntuaciones. */
export function regenerateSubquestion(e:NotebookEditionV1,placementId:string,questionId:string,
  optionId:string,candidates:readonly QuestionWordSlotV1[],at:string,lockedPolicy:'preserve'|'replace-confirmed'='preserve'):
  NotebookEditionV1 {
  for(const c of candidates){
    if(c.origin!=='generated')fail('Una regeneración no puede crear candidatos manuales');
    assertCandidate(c);
  }
  return replacePlacement(e,placementId,p=>{
    const q=choiceQuestion(p,questionId);
    const opt=q.options.find(o=>o.id===optionId)??fail('Apartado inexistente');
    const proposedIds=new Set(candidates.map(s=>s.id));
    if(proposedIds.size!==candidates.length)fail('Palabras con IDs repetidos');
    if(lockedPolicy==='preserve' && opt.slots.some(w=>w.locked&&!proposedIds.has(w.id))) {
      fail('La regeneración eliminaría una palabra manual bloqueada');
    }
    const existingById=new Map(opt.slots.map(w=>[w.id,w]));
    const slots=candidates.map(c=>{
      const old=existingById.get(c.id);
      return lockedPolicy==='preserve'&&old?.locked?old:c;
    });
    return {...p,questions:p.questions.map(item=>item.id!==questionId?item:{...q,
      options:q.options.map(o=>o.id!==optionId?o:{...o,slots})})};
  },at);
}

/** Pregunta completa: no se recalculan puntos, estilo, ID ni preguntas vecinas. */
export function regenerateQuestion(e:NotebookEditionV1,placementId:string,questionId:string,
  replacement:QuestionV1,at:string,lockedPolicy:'preserve'|'replace-confirmed'='preserve'):
  NotebookEditionV1 {
  return replacePlacement(e,placementId,p=>{
    const old=question(p,questionId);
    if(replacement.id!==old.id||replacement.kind!==old.kind)fail('No puede sustituirse la identidad/tipo de pregunta');
    if(old.statement.locked&&lockedPolicy==='preserve' && old.statement.value!==replacement.statement.value){
      fail('Enunciado protegido por edición manual');
    }
    if(old.kind==='morphology'&&replacement.kind==='morphology'&&lockedPolicy==='preserve'){
      const oldWords=new Map(old.words.map(w=>[w.id,w]));
      if(old.words.some(w=>w.locked&&!replacement.words.some(n=>n.id===w.id)))fail('La propuesta elimina análisis manual protegido');
      if(replacement.words.some(w=>oldWords.get(w.id)?.locked && JSON.stringify(w)!==JSON.stringify(oldWords.get(w.id)))){
        fail('La propuesta cambia análisis manual protegido');
      }
    }
    if(old.kind==='choice'&&replacement.kind==='choice'){
      const existingSlots=new Map(old.options.flatMap(o=>o.slots).map(w=>[w.id,w]));
      for(const proposed of replacement.options.flatMap(o=>o.slots)){
        if(proposed.origin==='generated')assertCandidate(proposed);
        else if(JSON.stringify(existingSlots.get(proposed.id))!==JSON.stringify(proposed)){
          fail('Una regeneración no puede crear o modificar una palabra manual');
        }
      }
    }
    if(old.kind==='choice'&&replacement.kind==='choice'&&lockedPolicy==='preserve'){
      if(old.options.some(o=>o.statement.locked&&!replacement.options.some(n=>n.id===o.id&&JSON.stringify(n.statement)===JSON.stringify(o.statement)))){
        fail('La propuesta cambia un enunciado protegido');
      }
      const beforeSlots=old.options.flatMap(o=>o.slots).filter(w=>w.locked);
      const nextSlots=replacement.options.flatMap(o=>o.slots);
      if(beforeSlots.some(w=>!nextSlots.some(n=>n.id===w.id&&JSON.stringify(n)===JSON.stringify(w)))){
        fail('La propuesta cambia o elimina una palabra protegida');
      }
    }
    const safe:QuestionV1={...replacement,id:old.id,kind:old.kind,
      pointsHundredths:old.pointsHundredths,styleOverride:old.styleOverride,enabled:old.enabled,
      statement:old.statement.locked&&lockedPolicy==='preserve'?old.statement:replacement.statement} as QuestionV1;
    return {...p,questions:p.questions.map(q=>q.id===questionId?safe:q)};
  },at);
}

/** La vista previa y el menú escribirán exactamente este mismo agregado. */
export function snapshotEdition(e:NotebookEditionV1):string {
  return JSON.stringify(validateEdition(e));
}

/** Valor persistente que no depende de la posición en el cuaderno. */
export function listPlacementIds(e:NotebookEditionV1):string[] {return e.placements.map(p=>p.id);}

/** Actualización de vocabulario manual sin fuente inventada. */
export function insertManualVocabulary(e:NotebookEditionV1,placementId:string,entry:VocabularyEntryV1,at:string):NotebookEditionV1 {
  if(entry.origin!=='manual'||entry.reviewState!=='manual')fail('La nueva entrada manual debe declararse como tal');
  return replacePlacement(e,placementId,p=>({...p,vocabulary:[...p.vocabulary,entry]}),at);
}

/** Cabecera editorial sin duplicar la cadena de preguntas del modelo. */
export function questionDisplayText(q:QuestionV1):string {
  return q.kind==='choice'?choiceHeading(q):q.statement.value;
}
