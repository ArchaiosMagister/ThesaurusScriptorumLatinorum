import assert from 'node:assert/strict';
import test from 'node:test';
import {IDBFactory} from 'fake-indexeddb';
import {createEdition,createPlacement} from './edition-factory.js';
import {createOfflineTeacherBankV1} from './academic-teacher-bank.js';
import {AcademicMorphTokenSelectorV1,MorphTokenSelectionError,type MorphTokenTargetV1} from './academic-morph-selection.js';
import {WorkspaceRepository,WorkspaceConflictError} from '../storage/workspace-repository.js';

const AT='2026-11-15T19:30:00.000Z',AT2='2026-11-15T19:31:00.000Z';
let dbSeq=0;
const bank=createOfflineTeacherBankV1().bank;
const selector=new AcademicMorphTokenSelectorV1(bank);
function setup(latin='dux et dux'){
  let n=0;
  const text=(id:string)=>createPlacement({id,title:'Dos duces',latin,author:'César',work:'Bellum Gallicum',reference:'I 1',
    source:{kind:'manual',sourceId:null,urn:null,importedAt:AT}},()=>`q.${++n}`);
  const ed=createEdition({id:'edition.tokens',title:'Cuaderno',legacyNotebookId:null,timestamp:AT,
    placements:[text('p.one'),text('p.two')]});
  const q=ed.placements[0]!.questions.find(q=>q.kind==='morphology');
  if(!q||q.kind!=='morphology')throw new Error('Morph absent');
  const target: MorphTokenTargetV1={editionId:ed.id,placementId:'p.one',questionId:q.id,
    expectedRevision:1,startUtf16:7,endUtf16:10,markId:'mark.target',wordId:'morph.target'};
  const name='morph-token-integration-'+ ++dbSeq;
  const factory=new IDBFactory();
  const repo=new WorkspaceRepository(name,factory);
  return {ed,repo,target,name,factory};
}
test('hace falta escoger entre lecturas individuales de dux (nominativo/vocativo)',()=>{
  const {ed,target}=setup();
  const view=selector.preview(ed,target);
  assert.equal(view.surface,'dux');
  assert.equal(view.status,'ambiguous');
  assert.equal(view.candidates.length,2);
  assert.throws(()=>selector.prepare(ed,target),/docente debe elegir/);
});
test('subraya SOLO la segunda ocurrencia homógrafa y conserva todos los demás textos',async()=>{
  const {ed,repo,target,name,factory}=setup();
  await repo.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:AT},()=>ed);
  const selected=selector.preview(ed,target).candidates[0]!;
  const plan=selector.prepare(ed,target,selected.id);
  const out=await selector.commit(repo,plan,AT2);
  const first=out.edition.placements[0]!;
  assert.equal(first.text.markup.length,1);
  assert.equal(first.text.markup[0]!.startUtf16,7);
  assert.equal(first.text.markup[0]!.endUtf16,10);
  assert.equal(first.text.markup[0]!.exact,'dux');
  assert.deepEqual(out.edition.placements[1],ed.placements[1]);
  assert.equal(first.questions.find(q=>q.kind==='morphology')?.kind,'morphology');
  assert.deepEqual(first.questions.slice(0,2),ed.placements[0]!.questions.slice(0,2));
  assert.equal((await repo.history(ed.id)).length,2);
  const reloaded=new WorkspaceRepository(name,factory);
  const saved=await reloaded.loadEdition(ed.id);
  assert.equal(saved?.edition.placements[0]?.text.markup[0]?.startUtf16,7);
  const undone=await reloaded.undoLast(ed.id,out.revision,'2026-11-15T19:32:00.000Z');
  assert.equal(undone.edition.placements[0]!.text.markup.length,0);
});
test('ningún token parcial, intervalo duplicado o forma no verificada se incorpora',async()=>{
  const {ed,target,repo}=setup();
  assert.throws(()=>selector.preview(ed,{...target,startUtf16:8}),/parte de una palabra/);
  assert.throws(()=>selector.preview(ed,{...target,startUtf16:0,endUtf16:10}),/exactamente un token/);
  const none=selector.preview(ed,{...target,startUtf16:4,endUtf16:6});
  assert.equal(none.status,'no-candidates');
  assert.throws(()=>selector.prepare(ed,{...target,startUtf16:4,endUtf16:6}),/No hay análisis/);
  assert.equal((await repo.listEditions()).length,0);
});
test('dos pestañas no pueden confirmar la misma revisión ni reutilizar el subrayado',async()=>{
  const {ed,repo,target}=setup();
  await repo.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:AT},()=>ed);
  const candidate=selector.preview(ed,target).candidates[0]!;
  const plan=selector.prepare(ed,target,candidate.id);
  await selector.commit(repo,plan,AT2);
  await assert.rejects(selector.commit(repo,plan,'2026-11-15T19:32:00.000Z'),WorkspaceConflictError);
  const current=await repo.loadEdition(ed.id);
  assert.ok(current);
  assert.throws(()=>selector.preview(current.edition,{...target,expectedRevision:2}),MorphTokenSelectionError);
  assert.equal((await repo.history(ed.id)).length,2);
});
