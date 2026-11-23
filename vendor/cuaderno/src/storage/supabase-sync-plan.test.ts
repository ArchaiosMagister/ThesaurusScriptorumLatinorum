import test from 'node:test';
import assert from 'node:assert/strict';
import {acknowledgedCheckpoint,planWorkspaceSync,workspaceSyncDocuments,
  type SyncDocument,type RemoteSyncDocument} from './supabase-sync-plan.js';
import {createEdition} from '../core/edition-factory.js';

const at='2026-11-20T12:00:00.000Z';
const doc=(value:string):SyncDocument=>({kind:'edition',id:'ed.1',payload:
  createEdition({id:'ed.1',legacyNotebookId:null,title:value,timestamp:at,placements:[]})});
const remote=(value:string,revision:number):RemoteSyncDocument=>({
  ...doc(value),remoteRevision:revision,
});

test('sin checkpoint, nunca sobrescribe diferencias ya existentes en dos dispositivos',()=>{
  const actions=planWorkspaceSync([doc('Mac')],[remote('iPad',2)],[]);
  assert.equal(actions.length,1);
  assert.equal(actions[0]?.direction,'conflict');
  assert.equal(actions[0]?.expectedRemoteRevision,2);
});
test('primera incorporación y primera subida requieren aprobación externa',()=>{
  assert.equal(planWorkspaceSync([doc('Mac')],[],[])[0]?.direction,'upload');
  assert.equal(planWorkspaceSync([],[remote('Mac',1)],[])[0]?.direction,'download');
});
test('los dos extremos idénticos no duplican el cuaderno',()=>{
  assert.equal(planWorkspaceSync([doc('Igual')],[remote('Igual',1)],[])[0]?.direction,'unchanged');
});
test('reconoce cambios locales y remotos desde checkpoint',()=>{
  const baseline=remote('Antes',5);
  const checkpoint=acknowledgedCheckpoint(baseline);
  assert.equal(planWorkspaceSync([doc('Después')],[baseline],[checkpoint])[0]?.direction,'upload');
  assert.equal(planWorkspaceSync([doc('Antes')],[remote('Después',6)],[checkpoint])[0]?.direction,'download');
  assert.equal(planWorkspaceSync([doc('Mac')],[remote('iPad',6)],[checkpoint])[0]?.direction,'conflict');
});
test('jamás considera como borrado autorizado la ausencia en uno de los extremos',()=>{
  const baseline=remote('Antes',5);
  const checkpoint=acknowledgedCheckpoint(baseline);
  assert.equal(planWorkspaceSync([],[baseline],[checkpoint])[0]?.direction,'conflict');
  assert.equal(planWorkspaceSync([doc('Antes')],[],[checkpoint])[0]?.direction,'conflict');
});
test('el chequeo de ediciones preserva todo y no escribe una sola vez',()=>{
  const document=doc('Guardado');
  const original=JSON.stringify(document);
  const plans=planWorkspaceSync([document],[{...document,remoteRevision:1}],[]);
  assert.equal(plans[0]?.direction,'unchanged');
  assert.equal(JSON.stringify(document),original);
});
test('el historial se prepara por separado de la edición y del corpus',()=>{
  const edition=doc('Latin').payload as ReturnType<typeof createEdition>;
  const snapshot={
    workspaceRevision:2,corpus:null,editions:[{revision:1,edition}],history:[],migration:null,
  };
  const documents=workspaceSyncDocuments(snapshot);
  assert.deepEqual(documents.map(x=>x.kind),['edition']);
  assert.equal((documents[0]?.payload as typeof edition).title,'Latin');
});
test('rechaza claves duplicadas y revisiones remotas inconsistentes',()=>{
  assert.throws(()=>planWorkspaceSync([doc('A'),doc('B')],[],[]));
  assert.throws(()=>planWorkspaceSync([],[remote('A',0)],[]));
});
