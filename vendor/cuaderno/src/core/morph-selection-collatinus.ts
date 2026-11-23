/** Inserción atómica de hasta cuatro tipos sin respuestas inventadas ni sobrescribir aportaciones. */
import type {NotebookEditionV1,MorphWordV1} from './edition-model.js';
import type {CollatinusGrammarToken} from './collatinus-grammar.js';
import {fingerprintForMark,validateEdition} from './edition-validation.js';
import {morphChoiceFromToken,morphTypeFromAnalysis,selectDiverseMorphology,
  type MorphChoice,type MorphType} from './morph-categories.js';
const key=(value:string)=>value.normalize('NFC').toLocaleLowerCase('es');
const category=(w:MorphWordV1):MorphType|null=>w.schoolCategory??morphTypeFromAnalysis(w.analysis);
function morphData(e:NotebookEditionV1,placementId:string){
  const placement=e.placements.find(p=>p.id===placementId);
  if(!placement)throw new Error('Texto latino inexistente.');
  const question=placement.questions.find(q=>q.kind==='morphology');
  if(!question||question.kind!=='morphology')throw new Error('La pregunta de morfología no existe.');
  return {placement,question};
}
export function selectMorphologyForPlacement(
  e:NotebookEditionV1,placementId:string,tokens:readonly CollatinusGrammarToken[],
  replaceWordId:string|null=null,verifiedChoices:readonly MorphChoice[]=[],
):MorphChoice[]{
  const {placement,question}=morphData(e,placementId);
  const replace=question.words.find(w=>w.id===replaceWordId);
  if(replaceWordId&&!replace)throw new Error('La aparición que se desea sustituir no existe.');
  if(replace?.locked)throw new Error('La aparición está protegida por una decisión docente.');
  const others=question.words.filter(w=>w.id!==replaceWordId);
  if(others.length>=4)return [];
  const covered=placement.text.markup.filter(m=>m.id!==replace?.markId);
  const usedForms=new Set(e.placements.flatMap(p=>p.questions.flatMap(q=>
    q.kind==='morphology'?q.words.filter(w=>w.id!==replaceWordId).map(w=>key(w.surface)):[])));
  const counts=new Map<MorphType,number>();
  for(const p of e.placements)for(const q of p.questions){
    if(q.kind!=='morphology')continue;
    for(const w of q.words){
      if(w.id===replaceWordId)continue;
      const c=category(w);
      if(c)counts.set(c,(counts.get(c)??0)+1);
    }
  }
  const reserved=new Set(others.map(category).filter((x):x is MorphType=>x!==null));
  const verifiedPositions=new Set(verifiedChoices.map(c=>c.start));
  const candidates=[...tokens.map(t=>morphChoiceFromToken(t,placement.text.latin))
    .filter((c):c is MorphChoice=>c!==null&&!verifiedPositions.has(c.start)),...verifiedChoices]
    .filter(c=>!covered.some(m=>c.start<m.endUtf16&&m.startUtf16<c.end));
  const cap=(replace?others.length+1:4)-(others.length-reserved.size);
  const options=replace?candidates.filter(c=>c.key!==key(replace.surface)):candidates;
  return selectDiverseMorphology(options,usedForms,reserved,counts,cap);
}
export function applyMorphologyChoices(
  edition:NotebookEditionV1,placementId:string,choices:readonly MorphChoice[],at:string,
  replaceWordId:string|null=null,
):NotebookEditionV1{
  const e=validateEdition(edition);
  const {placement,question}=morphData(e,placementId);
  const removed=question.words.find(w=>w.id===replaceWordId);
  if(replaceWordId&&!removed)throw new Error('No se encontró la aparición que se desea reemplazar.');
  if(removed?.locked)throw new Error('La aparición manual está protegida.');
  const existing=question.words.filter(w=>w.id!==replaceWordId);
  if(existing.length+choices.length>4)throw new Error('La pregunta admite como máximo cuatro apariciones.');
  const categories=new Set(existing.map(category).filter((x):x is MorphType=>x!==null));
  const usedText=new Set(existing.map(w=>key(w.surface)));
  const marks=placement.text.markup.filter(m=>m.id!==removed?.markId);
  const newWords:MorphWordV1[]=[];
  const newMarks=marks.slice();
  for(const choice of choices){
    if(categories.has(choice.category))throw new Error('Ya hay una aparición de la categoría '+choice.category);
    if(usedText.has(choice.key))throw new Error('La forma ya figura en esta pregunta.');
    if(!Number.isSafeInteger(choice.start)||!Number.isSafeInteger(choice.end)||
      placement.text.latin.slice(choice.start,choice.end)!==choice.surface ||
      choice.end<=choice.start)throw new Error('La propuesta no coincide con el texto actual.');
    const letter=/[\p{L}\p{M}]/u;
    if((choice.start>0&&letter.test(placement.text.latin[choice.start-1]!))||
      (choice.end<placement.text.latin.length&&letter.test(placement.text.latin[choice.end]!)))
      throw new Error('La propuesta no abarca una palabra latina completa.');
    if(newMarks.some(m=>choice.start<m.endUtf16&&m.startUtf16<choice.end))
      throw new Error('La propuesta coincide con otra marca del texto.');
    const markId='mark.'+crypto.randomUUID();
    const wordId='morph.'+crypto.randomUUID();
    newMarks.push({id:markId,kind:'morph-underline',startUtf16:choice.start,endUtf16:choice.end,
      exact:choice.surface,textFingerprint:fingerprintForMark(placement.text.latin,choice.start,choice.end),
      reviewRequired:false});
    newWords.push({id:wordId,markId,surface:choice.surface,
      lemmaId:choice.lemmaId,analysis:choice.analysis,schoolCategory:choice.category,
      provenance:choice.source==='verified'&&choice.evidence?choice.evidence:
        {provider:'Collatinus (propuesta contextual)',recordId:choice.candidateId??choice.lemmaId,
          bankRevision:'motor-offline',decisionId:null},
      reviewState:choice.source==='verified'&&choice.evidence?'verified':'needs-review',locked:false});
    categories.add(choice.category);usedText.add(choice.key);
  }
  const changed={...placement,text:{...placement.text,markup:newMarks.sort((a,b)=>a.startUtf16-b.startUtf16)},
    questions:placement.questions.map(q=>q.id===question.id?{...question,words:[...existing,...newWords]}:q)};
  return validateEdition({...e,updatedAt:at,placements:e.placements.map(p=>p.id===placementId?changed:p)});
}
/** Quitar afecta solo a esta aparición y su subrayado, nunca al texto ni al banco. */
export function removeMorphologyWord(
  edition:NotebookEditionV1,placementId:string,wordId:string,at:string,allowLocked=false,
):NotebookEditionV1 {
  const e=validateEdition(edition),{placement,question}=morphData(e,placementId);
  const word=question.words.find(w=>w.id===wordId);
  if(!word)throw new Error('Aparición inexistente.');
  if(word.locked&&!allowLocked)throw new Error('La aparición está protegida.');
  const changed={...placement,text:{...placement.text,markup:placement.text.markup.filter(m=>m.id!==word.markId)},
    questions:placement.questions.map(q=>q.id===question.id?{...question,words:question.words.filter(w=>w.id!==wordId)}:q)};
  return validateEdition({...e,updatedAt:at,placements:e.placements.map(p=>p.id===placementId?changed:p)});
}
