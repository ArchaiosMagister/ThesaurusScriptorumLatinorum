import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  EditorSessionV1, NotebookEditionV1, QuestionV1, QuestionWordSlotV1,
  TextPlacementV1,
} from './edition-model.js';
import { createEdition, createPlacement, placementFromCorpus } from './edition-factory.js';
import {
  checkEditionReadiness, fingerprintForMark, InvalidEditionError, validateEdition,
} from './edition-validation.js';
import {
  choiceHeading, editPlacementText, editQuestionStatement, editVocabulary,
  appendPlacement, editMorphManual, editOptionStatement, editSlotManual, toggleQuestion,
  insertManualVocabulary, listPlacementIds, movePlacement, moveSession, questionDisplayText,
  regenerateMorph, regenerateQuestion, regenerateSlot, regenerateSubquestion, scorePlacement,
  setQuestionPoints, snapshotEdition, toggleOption,
} from './edition-operations.js';

const AT='2026-11-15T15:00:00.000Z';
const AT2='2026-11-15T15:01:00.000Z';
const evidence={provider:'banco-verificado',recordId:'record.42',bankRevision:'sha256:vers-1',decisionId:null};
let seq=0;
function nextId():string{return `entity.${++seq}`;}
function basePlacement(id:string,latin='Roma antiqua erat.'):TextPlacementV1 {
  return createPlacement({id,title:'Texto de clase',latin,author:'Eutropio',work:'Breviarium',reference:'1.1',
    source:{kind:'library',sourceId:null,urn:'urn:cts:latinLit:foo',importedAt:AT}},nextId);
}
function edition():NotebookEditionV1 {
  seq=0;
  return createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno 1',timestamp:AT,
    placements:[basePlacement('place.1'),basePlacement('place.2')]});
}
function choice(p:TextPlacementV1):Extract<QuestionV1,{kind:'choice'}> {
  const found=p.questions.find(q=>q.kind==='choice');
  if(!found||found.kind!=='choice')throw Error('no choice');
  return found;
}
function morph(p:TextPlacementV1):Extract<QuestionV1,{kind:'morphology'}> {
  const found=p.questions.find(q=>q.kind==='morphology');
  if(!found||found.kind!=='morphology')throw Error('no morph');
  return found;
}
function slot(id:string,value:string,locked=false):QuestionWordSlotV1 {
  return {id,value,proposedLemmaId:'lemma.1',origin:'generated',locked,provenance:evidence};
}
function withSlots(e:NotebookEditionV1):NotebookEditionV1 {
  const cloned=structuredClone(e);
  const q=choice(cloned.placements[0]!);
  q.options[0]!.slots=[slot('slot.a1','instruxit'),slot('slot.a2','successerunt')];
  q.options[1]!.slots=[slot('slot.b1','fabam')];
  return validateEdition(cloned);
}
function withMarks(e:NotebookEditionV1):NotebookEditionV1 {
  const cloned=structuredClone(e);
  const p=cloned.placements[0]!;
  p.text.latin='arma et arma';
  const first={id:'mark.1',kind:'morph-underline' as const,startUtf16:0,endUtf16:4,
    exact:'arma',textFingerprint:fingerprintForMark(p.text.latin,0,4),reviewRequired:false};
  const second={...first,id:'mark.2',startUtf16:8,endUtf16:12,
    textFingerprint:fingerprintForMark(p.text.latin,8,12)};
  p.text.markup=[first,second];
  morph(p).words=[{id:'word.1',markId:'mark.2',surface:'arma',lemmaId:'arma',analysis:'acc. n. pl.',
    provenance:evidence,reviewState:'verified',locked:false}];
  return validateEdition(cloned);
}
function initialSession(e:NotebookEditionV1):EditorSessionV1 {
  return {activeEditionId:e.id,activePlacementId:e.placements[0]?.id??null,
    mode:'text',activeMenu:'questions',previewZoom:1,scrollByPlacementId:{}};
}

test('plantilla tiene exactamente 4 preguntas 400+100+100+200 y N=2/M=4',()=>{
  const e=edition();
  for(const p of e.placements){
    assert.deepEqual(p.questions.map(q=>[q.kind,q.pointsHundredths]),
      [['translation',400],['syntax',100],['morphology',100],['choice',200]]);
    assert.equal(scorePlacement(p),800);
    assert.equal(questionDisplayText(choice(p)),'Elige dos de estas cuatro preguntas:');
  }
  assert.equal(checkEditionReadiness(e).some(i=>i.code==='points'),false);
  assert.equal(checkEditionReadiness(e).some(i=>i.code==='content-missing'),true);
});

test('un mismo texto de origen puede entrar dos veces con IDs y preguntas separados',()=>{
  const e=edition();
  assert.equal(e.placements[0]?.source.urn,e.placements[1]?.source.urn);
  assert.notEqual(e.placements[0]?.id,e.placements[1]?.id);
  assert.notEqual(e.placements[0]?.questions[0]?.id,e.placements[1]?.questions[0]?.id);
  const changed=editPlacementText(e,'place.1','title','Aparición A',AT2);
  assert.equal(changed.placements[0]?.text.title,'Aparición A');
  assert.equal(changed.placements[1]?.text.title,'Texto de clase');
  assert.equal(e.placements[0]?.text.title,'Texto de clase');
});

test('snapshot canónico es JSON recuperable y no contiene HTML de vista previa',()=>{
  const e=edition();
  const packed=snapshotEdition(e);
  assert.deepEqual(validateEdition(JSON.parse(packed) as unknown),e);
  assert.equal(packed.includes('renderedHtml'),false);
});

test('IDs duplicados en distinto nivel se rechazan y no mutan el estado',()=>{
  const e=edition();
  const bad=structuredClone(e);
  bad.placements[1]!.questions[0]!.id=bad.placements[0]!.questions[0]!.id;
  assert.throws(()=>validateEdition(bad),InvalidEditionError);
  assert.notEqual(e.placements[1]!.questions[0]!.id,e.placements[0]!.questions[0]!.id);
});

test('campo desconocido, versión desconocida y fecha inválida son rechazados',()=>{
  const e=edition();
  assert.throws(()=>validateEdition({...e,other:true}),/campo desconocido/);
  assert.throws(()=>validateEdition({...e,editionSchemaVersion:2}),/versión incompatible/);
  assert.throws(()=>validateEdition({...e,updatedAt:'ayer'}),/fecha UTC/);
});

test('referencias a marca y ámbito de revisión inexistentes son rechazadas',()=>{
  const e=edition();
  const bad=structuredClone(e);
  morph(bad.placements[0]!).words=[{id:'word.77',markId:'mark.absent',surface:'arma',lemmaId:null,
    analysis:null,provenance:null,reviewState:'needs-review',locked:false}];
  assert.throws(()=>validateEdition(bad),/markId inexistente/);
  const other=structuredClone(e);
  other.placements[0]!.reviewFlags=[{id:'review.1',scopeId:'unknown.3',reason:'Duda'}];
  assert.throws(()=>validateEdition(other),/referencia a entidad inexistente/);
});

test('no se crea un análisis o entrada certificada sin procedencia',()=>{
  const e=withMarks(edition());
  const bad=structuredClone(e);
  morph(bad.placements[0]!).words[0]!.provenance=null;
  assert.throws(()=>validateEdition(bad),/sin evidencia/);
  const v=structuredClone(e);
  v.placements[0]!.vocabulary=[{id:'vocab.1',lemma:'rosa',headword:'rosa, -ae',meaning:null,note:null,
    included:true,order:0,origin:'generated',locked:false,provenance:null,reviewState:'verified'}];
  assert.throws(()=>validateEdition(v),/sin evidencia/);
});

test('desactivar 4d actualiza el enunciado a 2 de 3 sin borrar su contenido',()=>{
  let e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const d=q.options[3]!;
  const previous=JSON.stringify(d);
  e=toggleOption(e,'place.1',q.id,d.id,false,AT2);
  assert.equal(choiceHeading(choice(e.placements[0]!)),'Elige dos de estas tres preguntas:');
  assert.equal(choice(e.placements[0]!).options[3]!.enabled,false);
  e=toggleOption(e,'place.1',q.id,d.id,true,AT2);
  assert.equal(JSON.stringify(choice(e.placements[0]!).options[3]),previous);
  assert.equal(choiceHeading(choice(e.placements[0]!)),'Elige dos de estas cuatro preguntas:');
});

test('menos apartados que requiredCount: borrador guardable, no listo',()=>{
  let e=edition();
  const q=choice(e.placements[0]!);
  for(const opt of q.options.slice(1))e=toggleOption(e,'place.1',q.id,opt.id,false,AT2);
  assert.equal(checkEditionReadiness(e).some(issue=>issue.code==='choice'),true);
  assert.doesNotThrow(()=>validateEdition(e));
});

test('7 puntos se mantienen, sin reajustar a 8 ni permitir estado listo',()=>{
  const e=edition();
  const id=e.placements[0]!.questions[1]!.id;
  const result=setQuestionPoints(e,'place.1',id,0,AT2);
  assert.equal(scorePlacement(result.placements[0]!),700);
  assert.equal(scorePlacement(result.placements[1]!),800);
  assert.equal(checkEditionReadiness(result).filter(i=>i.code==='points').length,1);
  assert.equal(e.placements[0]!.questions[1]!.pointsHundredths,100);
});

test('editar enunciado no regenera palabras ni afecta el cuaderno vecino',()=>{
  const e=withSlots(edition());
  const before=JSON.stringify(choice(e.placements[0]!).options);
  const id=e.placements[0]!.questions[0]!.id;
  const result=editQuestionStatement(e,'place.1',id,'Nueva pregunta docente',AT2);
  assert.equal(result.placements[0]!.questions[0]!.statement.locked,true);
  assert.equal(result.placements[0]!.questions[0]!.statement.lastEditAt,AT2);
  assert.equal(JSON.stringify(choice(result.placements[0]!).options),before);
  assert.deepEqual(result.placements[1],e.placements[1]);
});

test('regeneración de 4a.1 conserva 4a.2, todo 4b y otra aparición byte a byte',()=>{
  const e=withSlots(edition());
  const beforeFirst=structuredClone(e.placements[0]);
  const beforeSecond=JSON.stringify(e.placements[1]);
  const q=choice(beforeFirst!);
  const result=regenerateSlot(e,'place.1',q.id,q.options[0]!.id,'slot.a1',
    {value:'audivit',proposedLemmaId:'audio',provenance:evidence},AT2);
  const after=choice(result.placements[0]!);
  assert.equal(after.options[0]!.slots[0]!.value,'audivit');
  assert.equal(after.options[0]!.slots[0]!.id,'slot.a1');
  assert.deepEqual(after.options[0]!.slots[1],q.options[0]!.slots[1]);
  assert.deepEqual(after.options[1],q.options[1]);
  assert.deepEqual(after.options[2],q.options[2]);
  assert.deepEqual(after.options[3],q.options[3]);
  assert.equal(result.placements[0]!.text.latin,beforeFirst!.text.latin);
  assert.equal(JSON.stringify(result.placements[1]),beforeSecond);
  assert.equal(scorePlacement(result.placements[0]!),800);
  assert.equal(e.placements[0]&&choice(e.placements[0]).options[0]!.slots[0]!.value,'instruxit');
});

test('candidatura sin evidencia y palabra bloqueada no se alteran',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  assert.throws(()=>regenerateSlot(e,'place.1',q.id,q.options[0]!.id,'slot.a1',
    {value:'arbitrium',proposedLemmaId:null,provenance:null},AT2),/fuente verificada/);
  const locked=structuredClone(e);
  choice(locked.placements[0]!).options[0]!.slots[0]!.locked=true;
  assert.throws(()=>regenerateSlot(locked,'place.1',q.id,q.options[0]!.id,'slot.a1',
    {value:'audivit',proposedLemmaId:null,provenance:evidence},AT2),/bloqueada/);
  const approved=regenerateSlot(locked,'place.1',q.id,q.options[0]!.id,'slot.a1',
    {value:'audivit',proposedLemmaId:null,provenance:evidence},AT2,true);
  assert.equal(choice(approved.placements[0]!).options[0]!.slots[0]!.value,'audivit');
  assert.equal(choice(locked.placements[0]!).options[0]!.slots[0]!.value,'instruxit');
});

test('regenerar solo 4a mantiene 4b, preguntas 1-3 y puntuaciones',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const next=regenerateSubquestion(e,'place.1',q.id,q.options[0]!.id,[slot('slot.a1','surrexit'),slot('slot.a2','conspexit')],AT2);
  assert.deepEqual(choice(next.placements[0]!).options[1],q.options[1]);
  assert.deepEqual(next.placements[0]!.questions.slice(0,3),e.placements[0]!.questions.slice(0,3));
  assert.equal(scorePlacement(next.placements[0]!),800);
  assert.deepEqual(next.placements[1],e.placements[1]);
});

test('regenerar apartado no puede eliminar un slot bloqueado sin autorización',()=>{
  const e=withSlots(edition());
  const locked=structuredClone(e);
  const q=choice(locked.placements[0]!);
  q.options[0]!.slots[0]!.locked=true;
  assert.throws(()=>regenerateSubquestion(locked,'place.1',q.id,q.options[0]!.id,
    [slot('slot.new','vicit')],AT2),/bloqueada/);
  const approved=regenerateSubquestion(locked,'place.1',q.id,q.options[0]!.id,
    [slot('slot.new','vicit')],AT2,'replace-confirmed');
  assert.equal(choice(approved.placements[0]!).options[0]!.slots.length,1);
  assert.equal(choice(locked.placements[0]!).options[0]!.slots.length,2);
});

test('regenerar una pregunta nunca modifica puntos, identidad, estilo ni otra pregunta',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const replacement=structuredClone(q);
  replacement.options[1]!.slots=[slot('slot.b2','molem')];
  replacement.pointsHundredths=900;
  const after=regenerateQuestion(e,'place.1',q.id,replacement,AT2);
  assert.equal(choice(after.placements[0]!).pointsHundredths,200);
  assert.equal(scorePlacement(after.placements[0]!),800);
  assert.equal(choice(after.placements[0]!).options[1]!.slots[0]!.value,'molem');
  assert.deepEqual(after.placements[0]!.questions.slice(0,3),e.placements[0]!.questions.slice(0,3));
  assert.deepEqual(after.placements[1],e.placements[1]);
});

test('regenerar pregunta completa no pisa enunciados manuales protegidos',()=>{
  const e=edition();
  const id=e.placements[0]!.questions[0]!.id;
  const edited=editQuestionStatement(e,'place.1',id,'Enunciado docente',AT2);
  const proposed={...edited.placements[0]!.questions[0]!,statement:{...edited.placements[0]!.questions[0]!.statement,value:'Reescribir'}};
  assert.throws(()=>regenerateQuestion(edited,'place.1',id,proposed,AT2),/protegido/);
  const forced=regenerateQuestion(edited,'place.1',id,proposed,AT2,'replace-confirmed');
  assert.equal(forced.placements[0]!.questions[0]!.statement.value,'Reescribir');
  assert.equal(edited.placements[0]!.questions[0]!.statement.value,'Enunciado docente');
});

test('dos homógrafos solo subrayan la aparición anclada con UTF-16',()=>{
  const e=withMarks(edition());
  const p=e.placements[0]!;
  assert.equal(p.text.markup.length,2);
  assert.equal(morph(p).words[0]!.markId,'mark.2');
  assert.equal(p.text.latin.slice(p.text.markup[1]!.startUtf16,p.text.markup[1]!.endUtf16),'arma');
  assert.equal(p.text.markup[0]!.reviewRequired,false);
  assert.equal(p.text.markup[1]!.reviewRequired,false);
});

test('editar texto invalida anclaje antes de desplazar un homógrafo',()=>{
  const e=withMarks(edition());
  const after=editPlacementText(e,'place.1','latin','arma antiqua et arma',AT2);
  assert.equal(after.placements[0]!.text.markup.some(mark=>mark.reviewRequired),true);
  assert.equal(morph(after.placements[0]!).words[0]!.reviewState,'needs-review');
  assert.equal(checkEditionReadiness(after).some(issue=>issue.code==='morph-anchors'),true);
  assert.deepEqual(after.placements[1],e.placements[1]);
});

test('no es posible marcar como vigente un anclaje con texto/huella incoherente',()=>{
  const e=withMarks(edition());
  const bad=structuredClone(e);
  bad.placements[0]!.text.markup[1]!.startUtf16=0;
  assert.throws(()=>validateEdition(bad),/anclaje no coincide/);
});

test('regeneración morfológica mantiene superficie y marca',()=>{
  const e=withMarks(edition());
  const q=morph(e.placements[0]!);
  const after=regenerateMorph(e,'place.1',q.id,'word.1',
    {lemmaId:'arma.verified',analysis:'accusativus pluralis',reviewState:'verified',provenance:evidence},AT2);
  assert.equal(morph(after.placements[0]!).words[0]!.analysis,'accusativus pluralis');
  assert.deepEqual(after.placements[0]!.text.markup,e.placements[0]!.text.markup);
  assert.equal(morph(after.placements[0]!).words[0]!.surface,'arma');
});

test('banco de vocabulario editable con una sola fuente y sin inventar acepciones',()=>{
  let e=edition();
  e=insertManualVocabulary(e,'place.1',{id:'vocab.1',lemma:'ager',headword:'ager, agri',
    meaning:null,note:null,included:true,order:0,provenance:null,reviewState:'manual',origin:'manual',locked:true},AT2);
  const before=structuredClone(e.placements[1]);
  const changed=editVocabulary(e,'place.1','vocab.1','meaning','campo',AT2);
  assert.equal(changed.placements[0]!.vocabulary[0]!.meaning,'campo');
  assert.deepEqual(changed.placements[1],before);
  assert.equal(e.placements[0]!.vocabulary[0]!.meaning,null);
  assert.throws(()=>insertManualVocabulary(e,'place.1',e.placements[0]!.vocabulary[0]!,AT2),/ID duplicado/);
});

test('sesión Anterior/Siguiente/selector/completo no muta edición ni preguntas',()=>{
  const e=edition();
  const baseline=snapshotEdition(e);
  let s=initialSession(e);
  s=moveSession(e,s,'next');
  assert.equal(s.activePlacementId,'place.2');
  s=moveSession(e,s,'next');
  assert.equal(s.activePlacementId,'place.2');
  s=moveSession(e,s,'whole');
  assert.equal(s.mode,'whole-notebook');
  assert.equal(s.activePlacementId,'place.2');
  s=moveSession(e,s,'previous');
  assert.equal(s.activePlacementId,'place.1');
  s=moveSession(e,s,{placementId:'place.2'});
  assert.equal(s.activePlacementId,'place.2');
  assert.equal(snapshotEdition(e),baseline);
});

test('reordenar cambios únicamente la secuencia editorial de apariciones',()=>{
  const e=edition();
  const a=e.placements[0]!,b=e.placements[1]!;
  const after=movePlacement(e,a.id,1,AT2);
  assert.deepEqual(listPlacementIds(after),[b.id,a.id]);
  assert.deepEqual(after.placements[0],b);
  assert.deepEqual(after.placements[1],a);
  assert.deepEqual(listPlacementIds(e),[a.id,b.id]);
});

test('creación a partir de CorpusV1 conserva instantánea e ID de procedencia sin editar la fuente',()=>{
  seq=0;
  const source={id:'corpus.7',title:'Texto del banco',latin:'aērum et arma',tagIds:['tag.1'],
    source:{author:'César',work:'De bello Gallico',reference:'1.1'},createdAt:AT,updatedAt:AT};
  const place=placementFromCorpus(source,'place.7',AT,nextId);
  const e=createEdition({id:'ed.5',legacyNotebookId:'legacy.3',title:'Copia docente',timestamp:AT,placements:[place]});
  const edited=editPlacementText(e,'place.7','latin','Texto modificado',AT2);
  assert.equal(e.legacyNotebookId,'legacy.3');
  assert.equal(edited.placements[0]!.source.sourceId,'corpus.7');
  assert.equal(source.latin,'aērum et arma');
  assert.equal(edited.placements[0]!.text.latin,'Texto modificado');
  assert.deepEqual(edited.placements[0]!.grammaticalTagIds,['tag.1']);
});

test('pregunta de elección no acepta una plantilla manual sin los marcadores N/M',()=>{
  const e=edition();
  const q=choice(e.placements[0]!);
  assert.throws(()=>editQuestionStatement(e,'place.1',q.id,'Elige dos de cuatro',AT2),/\{required\}/);
});

test('una plantilla sin cuatro preguntas queda en borrador, no se inventan preguntas automáticamente',()=>{
  const e=edition();
  const draft=structuredClone(e);
  draft.placements[0]!.questions.pop();
  assert.doesNotThrow(()=>validateEdition(draft));
  assert.equal(checkEditionReadiness(draft).some(i=>i.code==='wrong-template'),true);
});

test('ediciones de 50 textos mantienen navegación, IDs y aislamiento',()=>{
  seq=0;
  const placed=Array.from({length:50},(_,i)=>basePlacement('place.'+i,'texto '+i));
  const e=createEdition({id:'ed.many',legacyNotebookId:null,title:'Cuaderno largo',timestamp:AT,placements:placed});
  assert.equal(e.placements.length,50);
  let session:EditorSessionV1={...initialSession(e),activeEditionId:'ed.many',activePlacementId:'place.0'};
  for(let i=1;i<50;i++)session=moveSession(e,session,'next');
  assert.equal(session.activePlacementId,'place.49');
  const changed=editPlacementText(e,'place.25','title','Solo este texto',AT2);
  assert.equal(changed.placements.filter((p,i)=>p.text.title!==e.placements[i]?.text.title).length,1);
});


test('un cuaderno vacío es un borrador válido, no un documento exportable',()=>{
  const e=createEdition({id:'ed.empty',legacyNotebookId:null,title:'Vacío',timestamp:AT,placements:[]});
  assert.equal(checkEditionReadiness(e)[0]?.code,'empty-notebook');
});

test('editar una palabra de 4a la bloquea sin cambiar sus vecinas',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const changed=editSlotManual(e,'place.1',q.id,q.options[0]!.id,'slot.a1','palabra docente',AT2);
  const after=choice(changed.placements[0]!);
  assert.equal(after.options[0]!.slots[0]!.origin,'manual');
  assert.equal(after.options[0]!.slots[0]!.locked,true);
  assert.deepEqual(after.options[0]!.slots[1],q.options[0]!.slots[1]);
  assert.deepEqual(after.options[1],q.options[1]);
  assert.throws(()=>regenerateSlot(changed,'place.1',q.id,q.options[0]!.id,'slot.a1',
    {value:'vicit',proposedLemmaId:null,provenance:evidence},AT2),/bloqueada/);
});

test('edición del enunciado de 4c no modifica 4a, 4b, 4d',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const opt=q.options[2]!;
  const after=editOptionStatement(e,'place.1',q.id,opt.id,'Marca prefijos y significados',AT2);
  const now=choice(after.placements[0]!);
  assert.equal(now.options[2]!.statement.origin,'manual');
  assert.equal(now.options[2]!.statement.locked,true);
  assert.deepEqual(now.options[0],q.options[0]);
  assert.deepEqual(now.options[1],q.options[1]);
  assert.deepEqual(now.options[3],q.options[3]);
});

test('desactivar una pregunta conserva los cuatro registros y no recalcula los puntos',()=>{
  const e=edition();
  const id=e.placements[0]!.questions[2]!.id;
  const after=toggleQuestion(e,'place.1',id,false,AT2);
  assert.equal(after.placements[0]!.questions.length,4);
  assert.equal(after.placements[0]!.questions[2]!.pointsHundredths,100);
  assert.equal(scorePlacement(after.placements[0]!),700);
  assert.equal(checkEditionReadiness(after).some(i=>i.code==='points'),true);
});

test('análisis docente protege su marca y obliga a confirmar futura regeneración',()=>{
  const e=withMarks(edition());
  const id=morph(e.placements[0]!).id;
  const after=editMorphManual(e,'place.1',id,'word.1','Corrección del profesor',AT2);
  assert.equal(morph(after.placements[0]!).words[0]!.locked,true);
  assert.equal(morph(after.placements[0]!).words[0]!.reviewState,'manual');
  assert.throws(()=>regenerateMorph(after,'place.1',id,'word.1',
    {lemmaId:'arma',analysis:'otra',provenance:evidence,reviewState:'verified'},AT2),/bloqueado/);
});

test('añadir aparición no modifica el contenido de las anteriores ni acepta IDs duplicados',()=>{
  const e=edition();
  const third=basePlacement('place.3','Gallia est omnis.');
  const after=appendPlacement(e,third,AT2);
  assert.equal(after.placements.length,3);
  assert.deepEqual(after.placements.slice(0,2),e.placements);
  assert.equal(e.placements.length,2);
  assert.throws(()=>appendPlacement(e,{...third,id:'place.2'},AT2),/ID duplicado/);
});

test('la regeneración de pregunta rechaza falsos candidatos manuales',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const proposal=structuredClone(q);
  proposal.options[0]!.slots[0]={...proposal.options[0]!.slots[0]!,value:'ficticio',origin:'manual',provenance:null};
  assert.throws(()=>regenerateQuestion(e,'place.1',q.id,proposal,AT2),/no puede crear o modificar una palabra manual/);
});


test('marca de revisión no puede apuntar a una entidad de otra aparición',()=>{
  const e=edition();
  const bad=structuredClone(e);
  const foreignQuestionId=bad.placements[1]!.questions[0]!.id;
  bad.placements[0]!.reviewFlags=[{id:'review.cross',scopeId:foreignQuestionId,reason:'Revisión ajena'}];
  assert.throws(()=>validateEdition(bad),/ámbito no pertenece a esta aparición/);
  bad.placements[0]!.reviewFlags[0]!.scopeId=bad.placements[0]!.questions[0]!.id;
  assert.doesNotThrow(()=>validateEdition(bad));
});

test('editar el texto sin espacio para sus anclajes aborta sin perder marcas ni análisis',()=>{
  const e=withMarks(edition());
  const before=snapshotEdition(e);
  assert.throws(()=>editPlacementText(e,'place.1','latin','x',AT2),/recorta un subrayado/);
  assert.equal(snapshotEdition(e),before);
  assert.equal(morph(e.placements[0]!).words[0]!.surface,'arma');
  // Una sustitución del mismo tamaño conserva la marca como pendiente de revisión.
  const altered=editPlacementText(e,'place.1','latin','anno et arma',AT2);
  assert.equal(altered.placements[0]!.text.markup[0]!.reviewRequired,true);
  assert.equal(checkEditionReadiness(altered).some(v=>v.code==='morph-anchors'),true);
});

test('ni con confirmación una regeneración puede fingir una palabra manual nueva',()=>{
  const e=withSlots(edition());
  const q=choice(e.placements[0]!);
  const proposal=structuredClone(q);
  proposal.options[0]!.slots[0]={...proposal.options[0]!.slots[0]!,
    value:'palabra inventada',origin:'manual',provenance:null};
  assert.throws(()=>regenerateQuestion(e,'place.1',q.id,proposal,AT2,'replace-confirmed'),
    /no puede crear o modificar una palabra manual/);
  assert.equal(choice(e.placements[0]!).options[0]!.slots[0]!.value,'instruxit');
});
