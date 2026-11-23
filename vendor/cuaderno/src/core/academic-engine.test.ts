import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { VerifiedAcademicBankV1, AcademicBankError, type AcademicBankRecordV1 } from './academic-bank.js';
import { AcademicQuestionEngineV1, AcademicEngineError, displayedAcademicSlotValue } from './academic-engine.js';
import { createEdition, createPlacement } from './edition-factory.js';
import { fingerprintForMark, validateEdition } from './edition-validation.js';
import { WorkspaceRepository, WorkspaceConflictError } from '../storage/workspace-repository.js';
import type { NotebookEditionV1, QuestionV1, QuestionWordSlotV1 } from './edition-model.js';

const NOW='2026-11-15T18:00:00.000Z';
const LATER='2026-11-15T18:01:00.000Z';
const REV='auditoria.2026.11';
const manifest={id:'banco.prueba',revision:REV,sourceName:'FICHAS SINTÉTICAS DE PRUEBA, NO FUENTE FILOLÓGICA',verifiedBy:'verificador-fixture'};
const evidence=(n:string)=>({provider:'test-fixture',recordId:n,bankRevision:REV,decisionId:null});
let created=0;
function record(kind:AcademicBankRecordV1['kind'],i:number,opts:Partial<AcademicBankRecordV1>={}):AcademicBankRecordV1 {
  const base = kind==='morphology'?'arma':`${kind}-${i}`;
  return {id:`${kind}.${i}`,kind,value:base,lemmaId:kind==='morphology'?'arma':null,
    analysis:kind==='morphology'?`análisis ${i}`:null,
    surface:kind==='morphology'?'arma':null,
    sourceForm:kind==='preverb'?'instruxit':null,
    status:'verified',courses:['latin-ii'],evidence:evidence(`${kind}.${i}`),...opts};
}
const entries:AcademicBankRecordV1[]=[
  ...Array.from({length:12},(_,i)=>record('preverb',i)),
  ...Array.from({length:12},(_,i)=>record('phonetics',i)),
  ...Array.from({length:12},(_,i)=>record('prefix',i)),
  ...Array.from({length:12},(_,i)=>record('latinism',i)),
  record('morphology',1),record('morphology',2),
  record('preverb',20,{sourceForm:'successerunt'}),
  record('phonetics',100,{status:'needs-review'}),
  record('prefix',100,{status:'rejected'}),
];
function engine(rows=entries){return new AcademicQuestionEngineV1(new VerifiedAcademicBankV1(manifest,rows));}
function corpus():NotebookEditionV1 {
  let i=0;
  const p=(id:string)=>createPlacement({id,title:'Texto latino',latin:'arma et arma',author:'César',work:'De bello Gallico',reference:'I 1',
    source:{kind:'library',sourceId:null,urn:'urn:cts:latinLit:phi0448',importedAt:NOW}},()=>`question.${++i}`);
  const ed=createEdition({id:'edition.1',legacyNotebookId:null,title:'Libro',timestamp:NOW,placements:[p('place.1'),p('place.2')]});
  const q=choice(ed);
  q.options[0]!.slots=[slot('slot.preverb.1','preverb-old'),slot('slot.preverb.2','preverb-old2')];
  q.options[1]!.slots=[slot('slot.phonetics.1','phonetics-old'),slot('slot.phonetics.2','phonetics-old2')];
  q.options[2]!.slots=[slot('slot.prefix.1','prefix-old'),slot('slot.prefix.2','prefix-old2')];
  q.options[3]!.slots=[slot('slot.latinism.1','latinism-old'),slot('slot.latinism.2','latinism-old2')];
  return validateEdition(ed);
}
function slot(id:string,value:string,locked=false):QuestionWordSlotV1 {
  return {id,value,proposedLemmaId:null,origin:locked?'manual':'generated',locked,
    provenance:locked?null:evidence(id)};
}
function choice(ed:NotebookEditionV1): Extract<QuestionV1,{kind:'choice'}> {
  const x=ed.placements[0]!.questions.find(q=>q.kind==='choice');
  if(!x||x.kind!=='choice')throw Error('Pregunta de elección no encontrada');
  return x;
}
function target(ed:NotebookEditionV1,kind:'preverb'|'phonetics'|'prefix'|'latinism') {
  const q=choice(ed),o=q.options.find(x=>x.kind===kind)!;
  return {placementId:'place.1',questionId:q.id,optionId:o.id,slotId:o.slots[0]!.id,
    expectedRevision:1,...(kind==='preverb'?{sourceForm:'instruxit'}:{})};
}
function newSlots(kind:string,n:number):string[]{return Array.from({length:n},(_,i)=>`new.${kind}.${i}`);}
function repo():WorkspaceRepository {return new WorkspaceRepository('academic-pr9-test-'+(++created),new IDBFactory());}
async function create(db:WorkspaceRepository):Promise<NotebookEditionV1> {
  const e=corpus();await db.commitEdition(e.id,0,{command:'create',targetId:e.id,timestamp:NOW},()=>e);return e;
}

test('los prefijos ya generados se muestran en minúscula incluso en cuadernos anteriores, pero no los manuales',()=>{
  assert.equal(displayedAcademicSlotValue('prefix',{origin:'generated',value:'Antifaz'}),'antifaz');
  assert.equal(displayedAcademicSlotValue('prefix',{origin:'generated',value:'Ínterdependencia'}),'ínterdependencia');
  assert.equal(displayedAcademicSlotValue('prefix',{origin:'manual',value:'Antifaz'}),'Antifaz');
  assert.equal(displayedAcademicSlotValue('phonetics',{origin:'generated',value:'Aurum'}),'Aurum');
});
test('los prefijos importados conservan su grafía, pero se proponen y generan en minúscula',async()=>{
  const originals=[
    record('prefix',200,{value:'Antifaz'}),
    record('prefix',201,{value:'Interdependencia'}),
  ];
  const e=engine(originals),ed=corpus(),t=target(ed,'prefix');
  const before=JSON.stringify(ed);
  assert.equal(e.bank.findVerified('prefix.200')?.value,'Antifaz');
  assert.equal(e.previewSlot(ed,t).candidates.find(c=>c.id==='prefix.200')?.value,'antifaz');
  assert.equal(JSON.stringify(ed),before);
  const db=repo();await db.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:NOW},()=>ed);
  const out=await e.commit(db,e.prepareSlot(ed,t,'prefix.200'),LATER);
  assert.equal(choice(out.edition).options[2]!.slots[0]!.value,'antifaz');
  assert.equal(choice(out.edition).options[2]!.slots[0]!.origin,'generated');
  assert.deepEqual(choice(out.edition).options[2]!.slots[1],choice(ed).options[2]!.slots[1]);
  assert.deepEqual(choice(out.edition).options[3],choice(ed).options[3]);
  assert.deepEqual(out.edition.placements[1],ed.placements[1]);
  assert.equal(e.bank.findVerified('prefix.200')?.value,'Antifaz');
});
test('regeneración del apartado: minúsculas sin cambiar términos manuales protegidos',async()=>{
  const ed=corpus(),q=choice(ed);
  const manual=slot('slot.prefix.1','Ámbito manual',true);
  q.options[2]!.slots[0]=manual;
  const clean=validateEdition(ed);
  const e=engine([record('prefix',200,{value:'Antifaz'}),
    record('prefix',201,{value:'Interdependencia'})]);
  const db=repo();await db.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:NOW},()=>clean);
  const plan=e.prepareSubquestion(clean,{...targeted(clean,'prefix'),desiredCount:2,seed:1});
  const out=await e.commit(db,plan,LATER);
  assert.deepEqual(choice(out.edition).options[2]!.slots[0],manual);
  assert.ok(['antifaz','interdependencia'].includes(choice(out.edition).options[2]!.slots[1]!.value));
  assert.deepEqual(choice(out.edition).options[3],choice(clean).options[3]);
});
test('regeneración de pregunta completa: prefijos en minúscula y demás categorías idénticas al banco',async()=>{
  const changed=entries.map(r=>r.kind==='prefix'?{...r,
    value:r.value[0]!.toLocaleUpperCase('es')+r.value.slice(1)}:r);
  const e=engine(changed),ed=corpus(),q=choice(ed);
  const db=repo();await db.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:NOW},()=>ed);
  const plan=e.prepareChoiceQuestion(ed,{placementId:'place.1',questionId:q.id,
    expectedRevision:1,seed:3,desiredCountByKind:{preverb:2,phonetics:2,prefix:2,latinism:2},
    sourceFormsByKind:{preverb:['instruxit','successerunt']}});
  const result=await e.commit(db,plan,LATER);
  const slots=choice(result.edition).options[2]!.slots;
  assert.equal(slots.length,2);
  for(const s of slots){
    assert.equal(s.value[0],s.value[0]!.toLocaleLowerCase('es'));
    const row=e.bank.verified('prefix').find(x=>x.id===plan.assignments
      .find(a=>a.optionId===choice(ed).options[2]!.id)?.items.find(i=>i.slotId===s.id)?.candidateId);
    assert.equal(s.value,row!.value[0]!.toLocaleLowerCase('es')+row!.value.slice(1));
  }
  assert.deepEqual(result.edition.placements[1],ed.placements[1]);
});
test('el banco rechaza registros sin evidencia, revisión o curso válido',()=>{
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('phonetics',1,{evidence:{...evidence('1'),bankRevision:'otra'}})]),AcademicBankError);
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('phonetics',1,{courses:[]})]),/curso/);
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('preverb',1,{sourceForm:null})]),/forma de partida/);
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('morphology',1,{analysis:null})]),/lema y análisis/);
});
test('repetición del ID de candidato o de evidencia se rechaza al importar',()=>{
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('phonetics',1),record('phonetics',1)]),/duplicado/);
  assert.throws(()=>new VerifiedAcademicBankV1(manifest,[record('phonetics',1),record('phonetics',2,{evidence:evidence('phonetics.1')})]),/repetido/);
});
test('ninguna candidatura pendiente o rechazada se incorpora al sorteo',()=>{
  const e=engine();
  assert.equal(e.bank.verified('phonetics').some(x=>x.id==='phonetics.100'),false);
  assert.equal(e.bank.verified('prefix').some(x=>x.id==='prefix.100'),false);
  assert.equal(e.bank.statusCounts('phonetics').needsReview,1);
});
test('no se inventan candidatos cuando falta el banco',()=>{
  const empty=engine([]),ed=corpus(),t=target(ed,'phonetics');
  assert.equal(empty.previewSlot(ed,t).status,'no-candidates');
  assert.throws(()=>empty.prepareSlot(ed,t),/No hay alternativas/);
});
test('la forma de partida es obligatoria al regenerar modificación preverbial',()=>{
  const ed=corpus(),t=target(ed,'preverb');
  assert.throws(()=>engine().previewSlot(ed,{placementId:t.placementId,questionId:t.questionId,optionId:t.optionId,slotId:t.slotId,expectedRevision:t.expectedRevision}),/forma de partida/);
});
test('el candidato no puede repetirse ni ser la misma palabra',()=>{
  const e=engine(),ed=corpus(),t=target(ed,'phonetics');
  const q=choice(ed);q.options[1]!.slots[1]!.value='phonetics-0';
  const choices=e.previewSlot(validateEdition(ed),t);
  assert.equal(choices.candidates.some(x=>x.id==='phonetics.0'),false);
  assert.throws(()=>e.prepareSlot(validateEdition(ed),t,'phonetics.0'),/No hay alternativas/);
});
test('selección de una palabra es reproducible y no modifica la edición al previsualizar',()=>{
  const ed=corpus(),before=JSON.stringify(ed),e=engine(),t=target(ed,'prefix');
  const p=e.prepareSlot(ed,t,null,5);
  const p2=e.prepareSlot(ed,t,null,5);
  assert.deepEqual(p.assignments,p2.assignments);
  assert.equal(JSON.stringify(ed),before);
  assert.equal(p.target.expectedRevision,1);
});
test('candidatos de otro apartado o curso no se admiten por ID manual',()=>{
  const e=engine(),ed=corpus(),t=target(ed,'latinism');
  assert.throws(()=>e.prepareSlot(ed,t,'phonetics.0'),/No hay alternativas/);
  assert.throws(()=>e.prepareSlot(ed,t,'prefix.100'),/No hay alternativas/);
});
test('regenerar una palabra conserva subapartados y otras apariciones byte a byte',async()=>{
  const db=repo(),ed=await create(db),e=engine();
  const p=e.prepareSlot(ed,target(ed,'prefix'),'prefix.3');
  const after=await e.commit(db,p,LATER);
  assert.equal(choice(after.edition).options[2]!.slots[0]!.value,'prefix-3');
  assert.deepEqual(choice(after.edition).options[2]!.slots[1],choice(ed).options[2]!.slots[1]);
  assert.deepEqual(after.edition.placements[1],ed.placements[1]);
  assert.deepEqual(after.edition.placements[0]!.questions.slice(0,3),ed.placements[0]!.questions.slice(0,3));
  assert.equal(after.edition.placements[0]!.questions[3]!.pointsHundredths,200);
  assert.equal((await db.history(ed.id)).length,2);
  const undo=await db.undoLast(ed.id,after.revision,'2026-11-15T18:02:00.000Z');
  assert.equal(choice(undo.edition).options[2]!.slots[0]!.value,'prefix-old');
});
test('ninguna regeneración cambia otras palabras de otra pregunta/texto',async()=>{
  const db=repo(),ed=await create(db),e=engine();
  const p=e.prepareSlot(ed,target(ed,'latinism'));
  const result=await e.commit(db,p,LATER);
  assert.deepEqual(ed.placements[1],result.edition.placements[1]);
  assert.deepEqual(choice(ed).options.slice(0,3),choice(result.edition).options.slice(0,3));
});
test('casilla manual protegida no se cambia sin confirmación',()=>{
  const ed=corpus(),q=choice(ed);q.options[2]!.slots[0]=slot('slot.prefix.1','palabra-docente',true);
  const e=engine(),t=target(ed,'prefix');
  assert.equal(e.previewSlot(validateEdition(ed),t).status,'locked');
  assert.throws(()=>e.prepareSlot(validateEdition(ed),t),/bloqueada/);
  assert.doesNotThrow(()=>e.prepareSlot(validateEdition(ed),t,'prefix.3',0,true));
});
test('regeneración del apartado mantiene los IDs de las casillas',async()=>{
  const db=repo(),ed=await create(db),e=engine(),t=target(ed,'phonetics');
  const plan=e.prepareSubquestion(ed,{placementId:t.placementId,questionId:t.questionId,optionId:t.optionId,
    desiredCount:2,seed:2,expectedRevision:1});
  const updated=await e.commit(db,plan,LATER);
  assert.deepEqual(choice(updated.edition).options[1]!.slots.map(x=>x.id),choice(ed).options[1]!.slots.map(x=>x.id));
  assert.deepEqual(choice(updated.edition).options[0],choice(ed).options[0]);
  assert.deepEqual(choice(updated.edition).options[2],choice(ed).options[2]);
});
test('apartado con casilla manual la conserva y cambia exclusivamente las restantes',async()=>{
  const db=repo(),ed=corpus(),q=choice(ed),original=slot('slot.prefix.1','término docente',true);
  q.options[2]!.slots[0]=original;
  const clean=validateEdition(ed);
  await db.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:NOW},()=>clean);
  const e=engine(),target=targeted(clean,'prefix');
  const plan=e.prepareSubquestion(clean,{...target,desiredCount:2,seed:0});
  const out=await e.commit(db,plan,LATER);
  assert.deepEqual(choice(out.edition).options[2]!.slots[0],original);
  assert.notEqual(choice(out.edition).options[2]!.slots[1]!.value,'prefix-old2');
  assert.deepEqual(out.edition.placements[1],clean.placements[1]);
});
function targeted(ed:NotebookEditionV1,kind:'preverb'|'phonetics'|'prefix'|'latinism') {
  const t=target(ed,kind);return {placementId:t.placementId,questionId:t.questionId,optionId:t.optionId,expectedRevision:t.expectedRevision};
}
test('aumentar casillas exige IDs explícitos y evidencia para cada una',()=>{
  const ed=corpus(),e=engine(),t=targeted(ed,'phonetics');
  assert.throws(()=>e.prepareSubquestion(ed,{...t,desiredCount:4,seed:0}),/IDs explícitos/);
  const p=e.prepareSubquestion(ed,{...t,desiredCount:4,seed:0,newSlotIds:newSlots('phonetics',2)});
  assert.equal(p.assignments[0]!.items.length,4);
});
test('no se permite reducir tamaño borrando palabra manual protegida',()=>{
  const ed=corpus();choice(ed).options[2]!.slots[1]!.locked=true;
  const e=engine();assert.throws(()=>e.prepareSubquestion(validateEdition(ed),{...targeted(ed,'prefix'),desiredCount:1,seed:0}),/eliminaría/);
});
test('preverbios por apartado requieren indicar una fuente para cada casilla',()=>{
  const ed=corpus(),e=engine();
  assert.throws(()=>e.prepareSubquestion(ed,{...targeted(ed,'preverb'),desiredCount:2,seed:0}),/Indica/);
  const plan=e.prepareSubquestion(ed,{...targeted(ed,'preverb'),desiredCount:2,seed:0,
    sourceForms:['instruxit','successerunt']});
  assert.equal(plan.assignments[0]!.items.length,2);
  assert.equal(plan.assignments[0]!.items[1]!.sourceForm,'successerunt');
});
test('pregunta completa solo regenera apartado de elección y mantiene los 8 puntos',async()=>{
  const db=repo(),ed=await create(db),e=engine(),q=choice(ed);
  const plan=e.prepareChoiceQuestion(ed,{
    placementId:'place.1',questionId:q.id,expectedRevision:1,seed:2,
    desiredCountByKind:{preverb:2,phonetics:2,prefix:2,latinism:2},
    sourceFormsByKind:{preverb:['instruxit','successerunt']},
  });
  const result=await e.commit(db,plan,LATER);
  assert.equal(result.revision,2);
  assert.deepEqual(result.edition.placements[0]!.questions.slice(0,3),ed.placements[0]!.questions.slice(0,3));
  assert.equal(result.edition.placements[0]!.questions.reduce((sum,q)=>sum+q.pointsHundredths,0),800);
  assert.deepEqual(result.edition.placements[1],ed.placements[1]);
  assert.equal((await db.history(ed.id)).length,2);
});
test('pregunta completa no inventa fuente de modificación preverbial',()=>{
  const ed=corpus(),e=engine(),q=choice(ed);
  assert.throws(()=>e.prepareChoiceQuestion(ed,{placementId:'place.1',questionId:q.id,expectedRevision:1,
    desiredCountByKind:{},seed:0}),/Indica/);
});
test('el motor no genera ni traducción ni análisis sintáctico ficticio',()=>{
  const ed=corpus(),e=engine();
  const q=ed.placements[0]!.questions[0]!;
  assert.throws(()=>e.prepareChoiceQuestion(ed,{placementId:'place.1',questionId:q.id,expectedRevision:1,
    desiredCountByKind:{},seed:0}),/no contiene apartados/);
});
test('las ambigüedades morfológicas exigen escoger candidato explícitamente',()=>{
  const ed=withMorph(corpus()),e=engine(),q=ed.placements[0]!.questions.find(q=>q.kind==='morphology')!;
  const target={placementId:'place.1',questionId:q.id,wordId:'morph.word',expectedRevision:1};
  assert.equal(e.previewMorph(ed,target).status,'ambiguous');
  assert.throws(()=>e.prepareMorph(ed,target),/ambigua/);
  assert.equal(e.prepareMorph(ed,target,'morphology.1').morphCandidateId,'morphology.1');
});
function withMorph(ed:NotebookEditionV1):NotebookEditionV1 {
  const p=ed.placements[0]!;
  p.text.markup=[{id:'mark.arma',kind:'morph-underline',startUtf16:0,endUtf16:4,exact:'arma',
    textFingerprint:fingerprintForMark(p.text.latin,0,4),reviewRequired:false}];
  const q=p.questions.find(x=>x.kind==='morphology')!;
  if(q.kind!=='morphology')throw Error('morfología falta');
  q.words=[{id:'morph.word',markId:'mark.arma',surface:'arma',lemmaId:null,analysis:null,
    provenance:null,reviewState:'needs-review',locked:false}];
  return validateEdition(ed);
}
test('morfología por ocurrencia: solo se actualiza el análisis seleccionado',async()=>{
  const ed=withMorph(corpus()),db=repo(),e=engine();
  await db.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:NOW},()=>ed);
  const q=ed.placements[0]!.questions.find(q=>q.kind==='morphology')!;
  const plan=e.prepareMorph(ed,{placementId:'place.1',questionId:q.id,wordId:'morph.word',expectedRevision:1},'morphology.2');
  const out=await e.commit(db,plan,LATER);
  const mw=out.edition.placements[0]!.questions.find(q=>q.kind==='morphology')!;
  if(mw.kind!=='morphology')throw Error('morfología falta');
  assert.equal(mw.words[0]!.analysis,'análisis 2');
  assert.equal(mw.words[0]!.reviewState,'verified');
  assert.deepEqual(out.edition.placements[1],ed.placements[1]);
});
test('el subrayado desplazado y marcado revisión bloquea automáticamente el análisis',()=>{
  const ed=withMorph(corpus()),m=ed.placements[0]!.text.markup[0]!;m.reviewRequired=true;
  const q=ed.placements[0]!.questions.find(q=>q.kind==='morphology')!;
  const e=engine();assert.throws(()=>e.previewMorph(validateEdition(ed),{placementId:'place.1',questionId:q.id,wordId:'morph.word',expectedRevision:1}),/revisión/);
});
test('un candidato falso no se puede inyectar en la confirmación',async()=>{
  const db=repo(),ed=await create(db),e=engine(),p=e.prepareSlot(ed,target(ed,'prefix'),'prefix.2');
  const fake={...p,assignments:[{optionId:p.optionId!,items:[{slotId:'slot.prefix.1',candidateId:'inventado.1',sourceForm:null}]}]};
  await assert.rejects(e.commit(db,fake,LATER),/fuera de banco|no válida/);
  assert.equal((await db.loadEdition(ed.id))!.revision,1);
});
test('preview antigua no puede sobrescribir una edición guardada en segunda pestaña',async()=>{
  const db=repo(),ed=await create(db),e=engine(),t=target(ed,'prefix');
  const a=e.prepareSlot(ed,t,'prefix.1'),b=e.prepareSlot(ed,t,'prefix.2');
  await e.commit(db,b,LATER);
  await assert.rejects(e.commit(db,a,LATER),WorkspaceConflictError);
  assert.equal((await db.loadEdition(ed.id))!.revision,2);
});
test('la prueba de instantánea aborta si el plan cambia de cuaderno',async()=>{
  const db=repo(),ed=await create(db),e=engine(),p=e.prepareSlot(ed,target(ed,'prefix'));
  await assert.rejects(e.commit(db,{...p,editionId:'ed.otro'},LATER),AcademicEngineError);
});
test('los planes no ejecutan efectos si la fecha es inválida',async()=>{
  const db=repo(),ed=await create(db),e=engine(),p=e.prepareSlot(ed,target(ed,'prefix'));
  await assert.rejects(e.commit(db,p,'ayer'),/Fecha/);
  assert.equal((await db.history(ed.id)).length,1);
});
test('las propuestas y candidatos de fixture no alteran el banco histórico',()=>{
  const e=engine(),ed=corpus(),f=JSON.stringify(entries);
  e.prepareSlot(ed,target(ed,'prefix'),'prefix.4');
  assert.equal(JSON.stringify(entries),f);
});
test('no se oculta una ambigüedad si un candidato está pendiente de revisión',()=>{
  const rows=[record('morphology',1),record('morphology',2,{status:'needs-review'})];
  const ed=withMorph(corpus()),e=engine(rows),q=ed.placements[0]!.questions.find(q=>q.kind==='morphology')!;
  const p=e.previewMorph(ed,{placementId:'place.1',questionId:q.id,wordId:'morph.word',expectedRevision:1});
  assert.equal(p.status,'ready');
  assert.equal(p.pendingReview,1);
});


test('filtrar fonética por leyes impartidas conserva la opción de usar el banco completo',()=>{
  const ed=corpus();
  const e=engine([
    record('phonetics',0,{phoneticRules:['N05']}),
    record('phonetics',1,{phoneticRules:['N07']}),
    record('phonetics',2,{phoneticRules:['N05','N07']}),
  ]);
  const t=target(ed,'phonetics');
  assert.equal(e.previewSlot(ed,{...t,phoneticRules:['N05']}).candidates.length,1);
  assert.equal(e.previewSlot(ed,{...t,phoneticRules:['N07']}).candidates.length,1);
  assert.equal(e.previewSlot(ed,{...t,phoneticRules:[]}).status,'no-candidates');
  assert.equal(e.previewSlot(ed,t).candidates.length,3);
  assert.throws(()=>e.previewSlot(ed,{...t,phoneticRules:['N99']}),/Filtro/);
  assert.throws(()=>e.prepareSlot(ed,{...t,phoneticRules:['N05']},'phonetics.1'),/No hay alternativas/);
  const scarce=e.prepareSubquestion(ed,{...targeted(ed,'phonetics'),desiredCount:2,seed:0,
    phoneticRules:['N05']});
  assert.equal(scarce.assignments[0]!.items.length,2);
  assert.equal(scarce.assignments[0]!.items[1]!.unavoidableRepeat,true);
});

test('la confirmación CAS no admite una ficha fonética de una ley excluida por el filtro',async()=>{
  const e=engine([
    record('phonetics',0,{phoneticRules:['N05']}),
    record('phonetics',1,{phoneticRules:['N07']}),
  ]);
  const db=repo(),ed=await create(db),t={...target(ed,'phonetics'),phoneticRules:['N05']};
  const plan=e.prepareSlot(ed,t,'phonetics.0');
  const injected={...plan,assignments:plan.assignments.map(a=>({...a,
    items:a.items.map(item=>({...item,candidateId:'phonetics.1'})),
  }))};
  await assert.rejects(e.commit(db,injected,LATER),/Propuesta académica no válida/);
  assert.equal((await db.loadEdition(ed.id))?.revision,1);
  const success=await e.commit(db,plan,LATER);
  assert.equal(choice(success.edition).options[1]!.slots[0]!.value,'phonetics-0');
});

test('un texto nuevo no reutiliza términos presentes en otros textos mientras quede banco nuevo',()=>{
  const ed=corpus(),other=ed.placements[1]!.questions.find(x=>x.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Falta la pregunta de elección');
  other.options.find(o=>o.kind==='prefix')!.slots=[
    slot('another.prefix.0','prefix-0'),slot('another.prefix.1','prefix-1'),
  ];
  const valid=validateEdition(ed),e=engine(),t=target(valid,'prefix');
  const view=e.previewSlot(valid,t);
  assert.ok(view.candidates.length>0);
  assert.equal(view.candidates.some(x=>x.value==='prefix-0'),false);
  assert.equal(view.candidates.some(x=>x.value==='prefix-1'),false);
  const group=e.prepareSubquestion(valid,{...targeted(valid,'prefix'),desiredCount:2,seed:0});
  const values=group.assignments[0]!.items.map(x=>e.bank.findVerified(x.candidateId!)!.value);
  assert.equal(new Set(values).size,2);
  assert.ok(values.every(v=>v!=='prefix-0'&&v!=='prefix-1'));
});

test('agotar las palabras nuevas del banco permite reutilizar las de otros textos, nunca inventarlas',()=>{
  const ed=corpus(),other=ed.placements[1]!.questions.find(x=>x.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Falta la pregunta de elección');
  other.options.find(o=>o.kind==='prefix')!.slots=Array.from({length:12},(_,i)=>
    slot('other.all.prefix.'+i,'prefix-'+i));
  const valid=validateEdition(ed),e=engine(),t=target(valid,'prefix');
  const choices=e.previewSlot(valid,t);
  assert.equal(choices.status,'ready');
  assert.equal(choices.candidates.length,12);
  const picked=e.prepareSlot(valid,t,null,3);
  assert.ok(picked.assignments[0]!.items[0]!.candidateId?.startsWith('prefix.'));
});

test('la selección de una pregunta completa evita repetir palabras entre textos y conserva el resto',async()=>{
  const ed=corpus(),other=ed.placements[1]!.questions.find(x=>x.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Falta la pregunta de elección');
  other.options.find(o=>o.kind==='latinism')!.slots=[slot('other.latinism.used','latinism-0')];
  const valid=validateEdition(ed),q=choice(valid),e=engine(),db=repo();
  await db.commitEdition(valid.id,0,{command:'create',targetId:valid.id,timestamp:NOW},()=>valid);
  const plan=e.prepareChoiceQuestion(valid,{placementId:'place.1',questionId:q.id,
    expectedRevision:1,seed:0,desiredCountByKind:{preverb:2,phonetics:2,prefix:2,latinism:2},
    sourceFormsByKind:{preverb:['instruxit','successerunt']}});
  const after=await e.commit(db,plan,LATER);
  const latinisms=choice(after.edition).options.find(o=>o.kind==='latinism')!.slots.map(x=>x.value);
  assert.ok(latinisms.every(v=>v!=='latinism-0'));
  assert.deepEqual(after.edition.placements[1],valid.placements[1]);
});

test('si el apartado pide más palabras de las distintas disponibles, reutiliza solo tras agotarlas',async()=>{
  const db=repo(),ed=await create(db),e=engine([record('prefix',0),record('prefix',1)]);
  const q=choice(ed),o=q.options.find(o=>o.kind==='prefix')!;
  const plan=e.prepareSubquestion(ed,{placementId:'place.1',questionId:q.id,optionId:o.id,
    expectedRevision:1,seed:0,desiredCount:4,newSlotIds:newSlots('prefix',2)});
  const chosen=plan.assignments[0]!.items.map(i=>e.bank.findVerified(i.candidateId!)!.value);
  assert.equal(new Set(chosen).size,2);
  assert.equal(chosen.length,4);
  assert.equal(plan.assignments[0]!.items.filter(i=>i.unavoidableRepeat).length,2);
  const saved=await e.commit(db,plan,LATER);
  const result=choice(saved.edition).options.find(x=>x.kind==='prefix')!.slots.map(x=>x.value);
  assert.deepEqual(result,chosen);
  assert.deepEqual(saved.edition.placements[1],ed.placements[1]);
});

test('una repetición falsa inyectada no supera la validación contra el banco',async()=>{
  const db=repo(),ed=await create(db),e=engine();
  const plan=e.prepareSubquestion(ed,{...targeted(ed,'prefix'),desiredCount:2,seed:0});
  const group=plan.assignments[0]!;
  const fake={...plan,assignments:[{optionId:group.optionId,items:[
    group.items[0]!,{...group.items[1]!,candidateId:group.items[0]!.candidateId,
      unavoidableRepeat:true},
  ]}]};
  await assert.rejects(e.commit(db,fake,LATER),/no está justificada/);
  assert.equal((await db.loadEdition(ed.id))!.revision,1);
});


test('fase 5: una palabra de origen manual queda protegida aunque el legado no marcara locked',async()=>{
  const ed=corpus(),q=choice(ed),manual={...slot('slot.prefix.1','valor docente',true),locked:false};
  q.options[2]!.slots[0]=manual;
  const valid=validateEdition(ed),e=engine(),targetSlot=target(valid,'prefix');
  assert.equal(e.previewSlot(valid,targetSlot).status,'locked');
  assert.throws(()=>e.prepareSlot(valid,targetSlot),/bloqueada|protegida/);
  const plan=e.prepareSubquestion(valid,{...targeted(valid,'prefix'),desiredCount:2,seed:0});
  assert.equal(plan.assignments[0]!.items[0]!.candidateId,null);
  const db=repo();
  await db.commitEdition(valid.id,0,{command:'create',targetId:valid.id,timestamp:NOW},()=>valid);
  const saved=await e.commit(db,plan,LATER);
  assert.deepEqual(choice(saved.edition).options[2]!.slots[0],manual);
  assert.deepEqual(saved.edition.placements[1],valid.placements[1]);
  assert.doesNotThrow(()=>e.prepareSlot(valid,targetSlot,'prefix.3',0,true));
});

test('fase 5: una decisión morfológica manual desbloqueada exige consentimiento expreso',()=>{
  const ed=withMorph(corpus());
  const q=ed.placements[0]!.questions.find(x=>x.kind==='morphology')!;
  if(q.kind!=='morphology')throw Error('Morfología ausente');
  q.words[0]!.reviewState='manual';
  q.words[0]!.locked=false;
  const clean=validateEdition(ed),e=engine();
  const targetMorph={placementId:'place.1',questionId:q.id,wordId:'morph.word',expectedRevision:1};
  assert.equal(e.previewMorph(clean,targetMorph).status,'locked');
  assert.throws(()=>e.prepareMorph(clean,targetMorph,'morphology.1'),/manual protegido/);
  assert.doesNotThrow(()=>e.prepareMorph(clean,targetMorph,'morphology.1',true));
});

test('fase 5: la misma palabra entre categorías distintas cuenta como uso previo',()=>{
  const ed=corpus();
  const other=ed.placements[1]!.questions.find(x=>x.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Pregunta ausente');
  other.options.find(o=>o.kind==='prefix')!.slots=[slot('p.otro','prefix-0')];
  const eligible=[
    record('latinism',300,{value:'prefix-0'}),
    record('latinism',301,{value:'término nuevo'}),
  ];
  const e=engine(eligible),valid=validateEdition(ed),t=target(valid,'latinism');
  const candidate=e.previewSlot(valid,t);
  assert.deepEqual(candidate.candidates.map(x=>x.value),['término nuevo']);
  const plan=e.prepareSubquestion(valid,{...targeted(valid,'latinism'),desiredCount:1,seed:0});
  assert.equal(e.bank.findVerified(plan.assignments[0]!.items[0]!.candidateId!)!.value,'término nuevo');
  const scarce=engine([eligible[0]!]).previewSlot(valid,t);
  assert.deepEqual(scarce.candidates.map(x=>x.value),['prefix-0']);
});


test('las preguntas y los apartados desactivados no agotan los términos nuevos del cuaderno',()=>{
  const ed=corpus();
  const other=ed.placements[1]!.questions.find(q=>q.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Pregunta ausente');
  other.options.find(o=>o.kind==='prefix')!.slots=[slot('active-used','prefix-0')];
  other.options.find(o=>o.kind==='latinism')!.slots=[slot('inactive-use','prefix-1')];
  other.options.find(o=>o.kind==='latinism')!.enabled=false;
  const e=engine([record('prefix',0),record('prefix',1)]);
  const valid=validateEdition(ed),t=target(valid,'prefix');
  assert.deepEqual(e.previewSlot(valid,t).candidates.map(c=>c.value),['prefix-1']);
  const plan=e.prepareSubquestion(valid,{...targeted(valid,'prefix'),desiredCount:1,seed:0});
  assert.equal(e.bank.findVerified(plan.assignments[0]!.items[0]!.candidateId!)!.value,'prefix-1');
  other.options.find(o=>o.kind==='latinism')!.enabled=true;
  other.enabled=false;
  // La pregunta entera desactivada tampoco reserva ninguna de sus palabras.
  const inactive=validateEdition(ed);
  assert.deepEqual(e.previewSlot(inactive,target(inactive,'prefix')).candidates
    .map(c=>c.value).sort(),['prefix-0','prefix-1']);
});

test('si hay otra palabra inédita, nunca se repite una ya usada; agotado el banco, se admite la reutilización',()=>{
  const ed=corpus();
  const other=ed.placements[1]!.questions.find(q=>q.kind==='choice');
  if(!other||other.kind!=='choice')throw Error('Pregunta ausente');
  other.options.find(o=>o.kind==='prefix')!.slots=[slot('used','prefix-0')];
  const rows=[record('prefix',0),record('prefix',1)];
  const e=engine(rows),valid=validateEdition(ed),t=target(valid,'prefix');
  assert.deepEqual(e.previewSlot(valid,t).candidates.map(c=>c.value),['prefix-1']);
  const exhausted=engine([rows[0]!]).previewSlot(valid,t);
  assert.deepEqual(exhausted.candidates.map(c=>c.value),['prefix-0']);
});
