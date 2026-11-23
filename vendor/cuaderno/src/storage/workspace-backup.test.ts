import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { createEdition, createPlacement, placementFromCorpus } from '../core/edition-factory.js';
import { notebookTexts } from '../core/editor-operations.js';
import { fingerprintForMark } from '../core/edition-validation.js';
import { validateCorpus } from '../core/validation.js';
import type { CorpusV1, LatinText } from '../core/model.js';
import { editPlacementText } from '../core/edition-operations.js';
import { emptyCorpus } from '../core/model.js';
import { createBackup } from '../core/backup.js';
import { WorkspaceRepository, WorkspaceConflictError, validateWorkspaceSnapshot } from './workspace-repository.js';
import {
  WorkspaceBackupError, combineNotebookCorpora, importNotebookDependencies,
  createNotebookBackup, readNotebookBackup, createWorkspaceBackup, prepareWorkspaceRestore,
  readWorkspaceBackup, restoreWorkspaceBackup,
} from './workspace-backup.js';

const factory=new IDBFactory();
let n=0;
const NOW='2026-11-15T18:00:00.000Z';
const LATER='2026-11-15T18:02:00.000Z';
const date=new Date(NOW);
function repo(){return new WorkspaceRepository('workspace-backup-pr8-'+(++n),factory);}
function edition(){
  let i=0;
  const p=createPlacement({id:'place.1',title:'Roma',latin:'Rōma antīqua erat.',author:'Eutropio',
    work:'Breviarium',reference:'1.1',source:{kind:'manual',sourceId:null,urn:null,importedAt:NOW}},
    ()=>'qid.'+(++i));
  return createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno',timestamp:NOW,placements:[p]});
}
async function fill(ws:WorkspaceRepository){
  const e=edition();
  await ws.saveCorpus(emptyCorpus(),0);
  await ws.commitEdition(e.id,0,{command:'create',targetId:e.id,timestamp:NOW},()=>e);
  return ws.commitEdition(e.id,1,{command:'edit',targetId:'place.1',timestamp:LATER},before=>
    editPlacementText(before!,'place.1','title','Cambiado',LATER));
}

test('backup v2 representa un snapshot atómico de corpus, ediciones e historial',async()=>{
  const ws=repo();await fill(ws);
  const json=await createWorkspaceBackup(ws,date);
  const {snapshot,preview}=await readWorkspaceBackup(json);
  assert.deepEqual(snapshot,await ws.snapshot());
  assert.equal(preview.notebookCount,1);
  assert.equal(preview.historyCount,2);
  assert.equal(preview.placementCount,1);
  assert.equal(preview.workspaceRevision,3);
  assert.equal(preview.exportedAt,NOW);
});

test('backup no acepta JSON v1 ni versiones desconocidas',async()=>{
  const ws=repo();
  const legacy=await createBackup(emptyCorpus(),date);
  await assert.rejects(readWorkspaceBackup(legacy),/No es una copia workspace v2/);
  const json=await createWorkspaceBackup(ws,date);
  const modified=JSON.parse(json) as Record<string,unknown>;
  modified.backupVersion=3;
  await assert.rejects(readWorkspaceBackup(JSON.stringify(modified)),/No es una copia workspace v2/);
  assert.equal((await ws.snapshot()).workspaceRevision,0);
});

test('tampering de contenido, hash o estructura de copia se rechaza sin modificar base',async()=>{
  const ws=repo();await fill(ws);
  const before=await ws.snapshot();
  const json=await createWorkspaceBackup(ws,date);
  const damaged=JSON.parse(json) as Record<string,unknown>;
  ((damaged.snapshot as {editions:{edition:{title:string}}[]}).editions[0]!.edition).title='Alterado';
  await assert.rejects(readWorkspaceBackup(JSON.stringify(damaged)),
    /SHA-256 diferente|último evento no coincide/);
  damaged.sha256='z'.repeat(64);
  await assert.rejects(readWorkspaceBackup(JSON.stringify(damaged)));
  await assert.rejects(readWorkspaceBackup('{bad json'));
  assert.deepEqual(await ws.snapshot(),before);
});

test('preflight de restauración emite copia previa y vista de destino sin escribir',async()=>{
  const ws=repo();
  await fill(ws);
  const first=await createWorkspaceBackup(ws,date);
  const snapshot=await ws.snapshot();
  const plan=await prepareWorkspaceRestore(ws,first,date);
  assert.equal(plan.current.workspaceRevision,snapshot.workspaceRevision);
  assert.equal(plan.target.workspaceRevision,snapshot.workspaceRevision);
  assert.equal((await readWorkspaceBackup(plan.currentSafetyBackupJson)).snapshot.workspaceRevision,snapshot.workspaceRevision);
  assert.deepEqual(await ws.snapshot(),snapshot);
});

test('restaurar recupera edición e historial, conservando CAS de revisión global',async()=>{
  const ws=repo();await fill(ws);
  const earlier=await createWorkspaceBackup(ws,date);
  const first=(await ws.loadEdition('ed.1'))!;
  await ws.commitEdition('ed.1',2,{command:'edit',targetId:'place.1',timestamp:LATER},before=>
    editPlacementText(before!,'place.1','title','Temporal',LATER));
  const before=await ws.snapshot();
  const planned=await prepareWorkspaceRestore(ws,earlier,date);
  assert.equal(planned.target.historyCount,2);
  assert.equal(planned.current.historyCount,3);
  const restored=await restoreWorkspaceBackup(ws,earlier,{
    confirmReplace:true,safetyBackupExported:true,
    currentSafetyBackupJson:planned.currentSafetyBackupJson,
    expectedWorkspaceRevision:planned.expectedWorkspaceRevision,
  });
  assert.equal(restored.workspaceRevision,before.workspaceRevision+1);
  assert.equal(restored.history.length,2);
  assert.deepEqual(await ws.loadEdition('ed.1'),first);
  assert.equal((await ws.snapshot()).editions[0]!.edition.placements[0]!.text.title,'Cambiado');
});

test('sin confirmación y copia anterior no es posible restaurar',async()=>{
  const ws=repo();await fill(ws);
  const backup=await createWorkspaceBackup(ws,date);
  const before=await ws.snapshot();
  await assert.rejects(restoreWorkspaceBackup(ws,backup,{
    confirmReplace:false,safetyBackupExported:true,currentSafetyBackupJson:backup,
    expectedWorkspaceRevision:before.workspaceRevision,
  }),WorkspaceBackupError);
  await assert.rejects(restoreWorkspaceBackup(ws,backup,{
    confirmReplace:true,safetyBackupExported:false,currentSafetyBackupJson:backup,
    expectedWorkspaceRevision:before.workspaceRevision,
  }),WorkspaceBackupError);
  assert.deepEqual(await ws.snapshot(),before);
});

test('si otra pestaña guarda tras preparar, la restauración no sobrescribe',async()=>{
  const ws=repo();await fill(ws);
  const backup=await createWorkspaceBackup(ws,date);
  const plan=await prepareWorkspaceRestore(ws,backup,date);
  const second=new WorkspaceRepository(ws.databaseName,factory);
  await second.commitEdition('ed.1',2,{command:'edit',targetId:'place.1',timestamp:LATER},before=>
    editPlacementText(before!,'place.1','title','Edición concurrente',LATER));
  await assert.rejects(restoreWorkspaceBackup(ws,backup,{
    confirmReplace:true,safetyBackupExported:true,currentSafetyBackupJson:plan.currentSafetyBackupJson,
    expectedWorkspaceRevision:plan.expectedWorkspaceRevision,
  }),WorkspaceConflictError);
  assert.equal((await ws.loadEdition('ed.1'))!.edition.placements[0]!.text.title,'Edición concurrente');
});

test('una copia previa de otro estado no autoriza sustituir el cuaderno actual',async()=>{
  const ws=repo();await fill(ws);
  const target=await createWorkspaceBackup(ws,date);
  await ws.commitEdition('ed.1',2,{command:'edit',targetId:'place.1',timestamp:LATER},before=>
    editPlacementText(before!,'place.1','title','Reciente',LATER));
  await assert.rejects(restoreWorkspaceBackup(ws,target,{
    confirmReplace:true,safetyBackupExported:true,
    currentSafetyBackupJson:target,
    expectedWorkspaceRevision:(await ws.snapshot()).workspaceRevision,
  }),WorkspaceBackupError);
  assert.equal((await ws.loadEdition('ed.1'))!.edition.placements[0]!.text.title,'Reciente');
});

test('el contrato de backup rechaza relaciones inconsistentes incluso con hash nuevo',async()=>{
  const ws=repo();await fill(ws);
  const snapshot=await ws.snapshot();
  const invalid=structuredClone(snapshot);
  invalid.editions[0]!.edition.placements[0]!.questions[0]!.id=invalid.editions[0]!.edition.placements[0]!.id;
  assert.throws(()=>validateWorkspaceSnapshot(invalid),/ID duplicado/);
});

test('restaurar una copia de otro dispositivo conserva un epoch global superior al del origen',async()=>{
  const source=repo();
  await fill(source); // epoch 3, edición 2
  const exported=await createWorkspaceBackup(source,date);
  const destination=repo(); // epoch 0, sin cuadernos
  const planned=await prepareWorkspaceRestore(destination,exported,date);
  assert.equal(planned.expectedWorkspaceRevision,0);
  const restored=await restoreWorkspaceBackup(destination,exported,{
    confirmReplace:true,safetyBackupExported:true,
    currentSafetyBackupJson:planned.currentSafetyBackupJson,
    expectedWorkspaceRevision:planned.expectedWorkspaceRevision,
  });
  assert.equal(restored.workspaceRevision,4);
  assert.equal(restored.editions[0]!.revision,2);
  assert.equal(restored.history.length,2);
  assert.equal(restored.editions[0]!.edition.placements[0]!.text.title,'Cambiado');
});

test('rechaza un backup cuya revisión editorial sobrepasa la revisión global',async()=>{
  const ws=repo();await fill(ws);
  const damaged=structuredClone(await ws.snapshot());
  damaged.workspaceRevision=1;
  assert.throws(()=>validateWorkspaceSnapshot(damaged),/revisión global/);
});


test('copia individual conserva toda la edición y rechaza un contenido modificado',async()=>{
  const ws=repo();
  const saved=await fill(ws);
  const json=await createNotebookBackup(saved.edition);
  assert.deepEqual((await readNotebookBackup(json))?.edition,saved.edition);
  assert.equal(await readNotebookBackup(await createWorkspaceBackup(ws,date)),null);
  const envelope=JSON.parse(json) as {payload:{placements:{text:{title:string}}[]}};
  envelope.payload.placements[0]!.text.title='Alterado';
  await assert.rejects(readNotebookBackup(JSON.stringify(envelope)),/huella/);
});

test('la copia integral portátil conserva el banco histórico y el historial editorial',async()=>{
  const ws=repo();
  const saved=await fill(ws);
  const historical=emptyCorpus();
  historical.tags.push({id:'custom.temario',label:'Temario propio',kind:'custom',parentId:null});
  historical.texts.push({id:'doc.temario',title:'Pasaje guardado',latin:'Roma antiqua erat.',
    source:{author:'Eutropio',work:'Breviarium',reference:'1.1'},tagIds:['custom.temario'],createdAt:NOW,updatedAt:NOW});
  const local=await ws.snapshot();
  const {snapshot}=await readWorkspaceBackup(await createWorkspaceBackup(ws,date,historical));
  assert.deepEqual(snapshot.corpus?.corpus,historical);
  assert.deepEqual(snapshot.editions,[saved]);
  assert.deepEqual(snapshot.history,local.history);
  assert.deepEqual(await ws.snapshot(),local);
});


test('la biblioteca combinada conserva revisiones vinculadas a cuadernos históricos y editoriales',()=>{
  const original:LatinText={id:'doc.hist',title:'Original',latin:'Roma antiqua erat.',
    source:{author:'Eutropio',work:'Breviarium',reference:'1.1'},tagIds:[],
    createdAt:NOW,updatedAt:NOW};
  const updated:LatinText={...original,title:'Editado',latin:'Roma magna erat.',updatedAt:LATER};
  const historical:CorpusV1={...emptyCorpus(),texts:[updated],
    textRevisions:[{id:'rev.hist',text:original}],
    notebooks:[{id:'book.hist',title:'Cuaderno histórico',textIds:['doc.hist'],
      retainedTexts:[{textId:'doc.hist',revisionId:'rev.hist'}]}]};
  const editorial:CorpusV1={...emptyCorpus(),texts:[{...original,id:'doc.ed'}],
    textRevisions:[{id:'rev.ed',text:{...original,id:'doc.ed'}}],
    notebooks:[{id:'book.ed',title:'Cuaderno editorial',textIds:['doc.ed'],
      retainedTexts:[{textId:'doc.ed',revisionId:'rev.ed'}]}]};
  const joined=combineNotebookCorpora(editorial,historical);
  assert.doesNotThrow(()=>validateCorpus(joined));
  assert.equal(joined.textRevisions?.length,2);
  assert.equal(notebookTexts(joined,joined.notebooks.find(book=>book.id==='book.hist')!)[0]!.latin,
    'Roma antiqua erat.');
  assert.equal(notebookTexts(joined,joined.notebooks.find(book=>book.id==='book.ed')!)[0]!.latin,
    'Roma antiqua erat.');
  const conflicting:CorpusV1={...emptyCorpus(),
    textRevisions:[{id:'rev.hist',text:{...original,latin:'Texto incompatible'}}]};
  assert.throws(()=>combineNotebookCorpora(conflicting,historical),/Colisión de versiones/);
});

test('importar copia no reutiliza ID de fuente o etiqueta ocupado por el corpus local',()=>{
  const incomingTag={id:'custom.same',label:'Etiqueta de origen',kind:'custom' as const,parentId:null};
  const localTag={...incomingTag,label:'Etiqueta local'};
  const incoming:LatinText={id:'doc.same',title:'Texto original',latin:'Gallia est omnis divisa.',
    source:{author:'César',work:'Bellum Gallicum',reference:'1.1'},
    tagIds:['custom.same'],createdAt:NOW,updatedAt:NOW};
  const localText:LatinText={...incoming,title:'Otro pasaje',latin:'Roma magna est.'};
  const dependencies:CorpusV1={...emptyCorpus(),texts:[incoming],tags:[incomingTag]};
  const local:CorpusV1={...emptyCorpus(),texts:[localText],tags:[localTag]};
  const historical:CorpusV1={...emptyCorpus(),texts:[incoming],tags:[incomingTag]};
  let item=0;
  const placement=placementFromCorpus(incoming,'place.1',NOW,()=>'item.'+(++item));
  const book=createEdition({id:'ed.import',legacyNotebookId:null,title:'Importado',
    timestamp:NOW,placements:[placement]});
  const restored=importNotebookDependencies(book,dependencies,local,historical);
  const importedPlacement=restored.edition.placements[0]!;
  const importedId=importedPlacement.source.sourceId!;
  const importedTagId=importedPlacement.grammaticalTagIds[0]!;
  assert.notEqual(importedId,'doc.same');
  assert.notEqual(importedTagId,'custom.same');
  assert.equal(restored.corpus.texts.find(text=>text.id===importedId)?.latin,incoming.latin);
  assert.deepEqual(restored.corpus.texts.find(text=>text.id===importedId)?.tagIds,[importedTagId]);
  assert.equal(restored.corpus.tags.find(tag=>tag.id===importedTagId)?.label,'Etiqueta de origen');
  assert.equal(restored.corpus.texts.find(text=>text.id==='doc.same')?.latin,localText.latin);
  assert.equal(restored.corpus.tags.find(tag=>tag.id==='custom.same')?.label,localTag.label);
  assert.doesNotThrow(()=>validateCorpus(restored.corpus));
  assert.doesNotThrow(()=>validateCorpus(combineNotebookCorpora(restored.corpus,historical)));
});


test('backup portátil conserva etiquetas de rechazos gramaticales y las remapea en otro dispositivo',async()=>{
  const source:LatinText={id:'doc.review',title:'César',latin:'Caesar Galliam vicit.',
    source:{author:'César',work:'Bellum Gallicum',reference:'1.1'},tagIds:[],
    createdAt:NOW,updatedAt:NOW};
  const tag={id:'custom.review',label:'Construcción rechazada',kind:'custom' as const,parentId:null};
  let item=0;
  const place=placementFromCorpus(source,'place.review',NOW,()=>'item.'+(++item));
  const latin=place.text.latin,begin=latin.indexOf('Caesar'),end=begin+6;
  place.grammarReview=[{kind:'rejected',tagId:tag.id,
    startUtf16:begin,endUtf16:end,exact:latin.slice(begin,end),
    textFingerprint:fingerprintForMark(latin,begin,end),reviewRequired:false}];
  const editionWithReview=createEdition({id:'ed.review',legacyNotebookId:null,title:'Decisiones docentes',
    timestamp:NOW,placements:[place]});
  const importedCorpus:CorpusV1={...emptyCorpus(),texts:[source],tags:[tag]};
  const backup=await readNotebookBackup(await createNotebookBackup(editionWithReview,importedCorpus));
  assert.ok(backup?.dependencies?.tags.some(item=>item.id===tag.id));
  const local:CorpusV1={...emptyCorpus(),
    tags:[{...tag,label:'Otra etiqueta con el mismo ID'}]};
  const restored=importNotebookDependencies(backup!.edition,backup!.dependencies!,local,emptyCorpus());
  const newTag=restored.edition.placements[0]!.grammarReview![0]!;
  assert.equal(newTag.kind,'rejected');
  if(newTag.kind==='rejected'){
    assert.notEqual(newTag.tagId,tag.id);
    assert.equal(restored.corpus.tags.find(item=>item.id===newTag.tagId)?.label,tag.label);
  }
  assert.equal(restored.corpus.tags.find(item=>item.id===tag.id)?.label,
    'Otra etiqueta con el mismo ID');
  assert.doesNotThrow(()=>validateCorpus(restored.corpus));
});
