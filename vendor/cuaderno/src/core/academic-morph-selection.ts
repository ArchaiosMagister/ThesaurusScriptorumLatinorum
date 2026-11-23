/** Selección explícita de una OCURRENCIA morfológica en texto latino.
 * No invoca lematización heurística: solo consulta formas individualmente verificadas.
 * El subrayado, el análisis y el historial se añaden en un único CAS del workspace.
 */
import type { NotebookEditionV1, QuestionV1, TextPlacementV1 } from './edition-model.js';
import { fingerprintForMark, validateEdition } from './edition-validation.js';
import {morphTypeFromAnalysis} from './morph-categories.js';
import { type AcademicBankRecordV1, VerifiedAcademicBankV1 } from './academic-bank.js';
import type { WorkspaceRepository, EditionSnapshotV1 } from '../storage/workspace-repository.js';

export class MorphTokenSelectionError extends Error {
  constructor(msg:string){super(msg);this.name='MorphTokenSelectionError';}
}
function fail(msg:string):never { throw new MorphTokenSelectionError(msg); }
const letters=/[\p{L}\p{M}]/u;
export interface MorphTokenTargetV1 {
  editionId:string;
  placementId:string;
  questionId:string;
  expectedRevision:number;
  startUtf16:number;
  endUtf16:number;
  /** IDs inyectados por el editor (jamás inferidos de la posición o del texto). */
  markId:string;
  wordId:string;
}
export interface MorphTokenPreviewV1 {
  status:'ready'|'ambiguous'|'no-candidates';
  surface:string;
  candidates:ReadonlyArray<{id:string; lemmaId:string; analysis:string; reference:string}>;
}
export interface MorphTokenPlanV1 {
  readonly kind:'academic.select-token';
  readonly target:MorphTokenTargetV1;
  readonly candidateId:string;
  readonly bankId:string;
  readonly bankRevision:string;
  readonly baseline:string;
}
function getTarget(e:NotebookEditionV1,t:MorphTokenTargetV1):{
  placement:TextPlacementV1;question:Extract<QuestionV1,{kind:'morphology'}>;surface:string
} {
  if(t.editionId!==e.id)fail('El objetivo pertenece a otro cuaderno');
  if(!Number.isSafeInteger(t.expectedRevision)||t.expectedRevision<0)fail('Revisión esperada inválida');
  const placement=e.placements.find(p=>p.id===t.placementId)??fail('Texto inexistente');
  const question=placement.questions.find(q=>q.id===t.questionId);
  if(!question||question.kind!=='morphology')fail('Se requiere la pregunta de morfología');
  const latin=placement.text.latin;
  const start=t.startUtf16,end=t.endUtf16;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>latin.length)fail('Intervalo UTF-16 inválido');
  const surface=latin.slice(start,end);
  if(!surface.trim()||!Array.from(surface).every(c=>letters.test(c)))fail('Seleccione exactamente un token latino');
  if((start>0&&letters.test(latin[start-1]!)) || (end<latin.length&&letters.test(latin[end]!))){
    fail('No se permite seleccionar solo parte de una palabra');
  }
  if(placement.text.markup.some(m=>start<m.endUtf16&&m.startUtf16<end)){
    fail('La ocurrencia ya está marcada o solapa otro subrayado');
  }
  if(!t.markId||!t.wordId||t.markId===t.wordId)fail('IDs de marca y análisis inválidos');
  return {placement,question,surface};
}
function candidates(bank:VerifiedAcademicBankV1,surface:string):readonly AcademicBankRecordV1[]{
  return bank.verified('morphology',surface);
}
export class AcademicMorphTokenSelectorV1 {
  constructor(readonly bank:VerifiedAcademicBankV1){}
  preview(edition:NotebookEditionV1,target:MorphTokenTargetV1):MorphTokenPreviewV1 {
    const e=validateEdition(edition);
    const {surface}=getTarget(e,target);
    const rows=candidates(this.bank,surface);
    const ambiguous=new Set(rows.map(r=>r.lemmaId+'\0'+r.analysis)).size>1;
    return {surface,status:rows.length===0?'no-candidates':ambiguous?'ambiguous':'ready',
      candidates:rows.map(r=>({id:r.id,lemmaId:r.lemmaId!,analysis:r.analysis!,reference:r.evidence.provider+'#'+r.evidence.recordId}))};
  }
  prepare(edition:NotebookEditionV1,target:MorphTokenTargetV1,selectedId:string|null=null):MorphTokenPlanV1 {
    const e=validateEdition(edition),view=this.preview(e,target);
    if(!view.candidates.length)fail('No hay análisis individuales verificados para este token');
    if(view.status==='ambiguous'&&!selectedId)fail('La forma tiene varios análisis: el docente debe elegir');
    const chosen=selectedId?view.candidates.find(c=>c.id===selectedId):view.candidates[0];
    if(!chosen)fail('La candidatura no pertenece a esta forma o no está verificada');
    return {kind:'academic.select-token',target:{...target},candidateId:chosen.id,
      bankId:this.bank.manifest.id,bankRevision:this.bank.manifest.revision,
      baseline:JSON.stringify(e)};
  }
  async commit(repo:WorkspaceRepository,plan:MorphTokenPlanV1,at:string):Promise<EditionSnapshotV1>{
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)
       || Number.isNaN(Date.parse(at))||new Date(at).toISOString()!==at)fail('Fecha no canónica');
    if(plan.kind!=='academic.select-token'||plan.bankId!==this.bank.manifest.id
       ||plan.bankRevision!==this.bank.manifest.revision)fail('Plan incompatible con la versión del banco');
    return repo.commitEdition(plan.target.editionId,plan.target.expectedRevision,
      {command:plan.kind,targetId:plan.target.markId,timestamp:at},previous=>{
        if(!previous)fail('El cuaderno original ya no existe');
        const current=validateEdition(previous);
        if(JSON.stringify(current)!==plan.baseline)fail('El texto cambió desde la selección');
        const {placement,question,surface}=getTarget(current,plan.target);
        const row=this.bank.findVerified(plan.candidateId);
        if(!row||row.kind!=='morphology'||row.surface!==surface||!row.lemmaId||!row.analysis){
          fail('Análisis incompatible con la ocurrencia o sin verificación individual');
        }
        const {startUtf16:start,endUtf16:end,markId,wordId}=plan.target;
        const mark={id:markId,kind:'morph-underline' as const,startUtf16:start,endUtf16:end,
          exact:surface,textFingerprint:fingerprintForMark(placement.text.latin,start,end),reviewRequired:false};
        const schoolCategory=morphTypeFromAnalysis(row.analysis);
        const word={id:wordId,markId:mark.id,surface,lemmaId:row.lemmaId,analysis:row.analysis,
          ...(schoolCategory?{schoolCategory}:{}),
          provenance:row.evidence,reviewState:'verified' as const,locked:false};
        const changed={...placement,text:{...placement.text,markup:[...placement.text.markup,mark]},
          questions:placement.questions.map(q=>q.id===question.id?{...question,words:[...question.words,word]}:q)};
        return validateEdition({...current,updatedAt:at,
          placements:current.placements.map(p=>p.id===placement.id?changed:p)});
      });
  }
}
