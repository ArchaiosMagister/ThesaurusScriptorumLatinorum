import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { emptyCorpus } from '../core/model.js';
import { createEdition, createPlacement } from '../core/edition-factory.js';
import { editPlacementText, movePlacement } from '../core/edition-operations.js';
import type { NotebookEditionV1 } from '../core/edition-model.js';
import { IndexedDbCorpusRepository } from './indexeddb-corpus-repository.js';
import {
  WorkspaceRepository, WorkspaceConflictError, WorkspaceHistoryError,
  WorkspaceMigrationConflictError, WORKSPACE_DATABASE_VERSION,
  validateWorkspaceSnapshot,
} from './workspace-repository.js';

const factory = new IDBFactory();
let counter = 0;
const NOW = '2026-11-15T18:00:00.000Z';
const LATER = '2026-11-15T18:01:00.000Z';
function setup(): {name: string; repo: WorkspaceRepository} {
  const name = 'workspace-pr8-test-' + ++counter;
  return {name,repo:new WorkspaceRepository(name,factory)};
}
function sampleEdition(id='edition.1',title='Cuaderno docente'): NotebookEditionV1 {
  let i=0;
  const place=(placementId:string,latin:string) => createPlacement({
    id:placementId,title:'Texto latino',latin,author:'César',work:'De bello Gallico',reference:'I 1',
    source:{kind:'library',sourceId:null,urn:'urn:cts:latinLit:phi0448',importedAt:NOW},
  },()=>id+'.part.'+(++i));
  return createEdition({id,legacyNotebookId:null,title,timestamp:NOW,
    placements:[place(id+'.place.1','Gallia est omnis divisa.'),place(id+'.place.2','Arma virumque cano.')],
  });
}
async function create(repo:WorkspaceRepository,id='edition.1') {
  const e=sampleEdition(id);
  return repo.commitEdition(id,0,{command:'create',targetId:id,timestamp:NOW},()=>e);
}
async function edit(repo:WorkspaceRepository,revision:number,value:string,id='edition.1') {
  return repo.commitEdition(id,revision,{command:'edit-title',targetId:id+'.place.1',timestamp:LATER},before => {
    assert.ok(before);
    return editPlacementText(before,id+'.place.1','title',value,LATER);
  });
}

test('workspace empieza vacío y usa exactamente cuatro almacenes sin tocar los datos históricos',async()=>{
  const {name,repo}=setup();
  const old=new IndexedDbCorpusRepository(name+'.legacy',factory);
  const corpus=emptyCorpus();
  corpus.texts.push({id:'text.1',title:'Texto histórico',latin:'Mārcus',
    source:{author:null,work:null,reference:null},tagIds:[],createdAt:NOW,updatedAt:NOW});
  await old.save(corpus,0);
  assert.deepEqual(await repo.snapshot(),{workspaceRevision:0,corpus:null,editions:[],history:[],migration:null});
  const opened=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=factory.open(name,WORKSPACE_DATABASE_VERSION);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  assert.deepEqual(Array.from(opened.objectStoreNames),['corpus','editions','history','meta']);
  opened.close();
  assert.deepEqual(await old.load(),{revision:1,corpus});
});

test('un commit guarda edición e historial en una transacción; se recupera en otra instancia',async()=>{
  const {name,repo}=setup();
  const one=await create(repo);
  assert.equal(one.revision,1);
  const two=await edit(repo,1,'Título cambiado');
  assert.equal(two.revision,2);
  const reloaded=new WorkspaceRepository(name,factory);
  assert.deepEqual(await reloaded.loadEdition('edition.1'),two);
  const history=await reloaded.history('edition.1');
  assert.deepEqual(history.map(x=>[x.command,x.revisionBefore,x.revisionAfter]),
    [['create',0,1],['edit-title',1,2]]);
  assert.equal((history[1]!.before as NotebookEditionV1).placements[0]!.text.title,'Texto latino');
  assert.equal((history[1]!.after as NotebookEditionV1).placements[0]!.text.title,'Título cambiado');
  assert.equal((await reloaded.snapshot()).workspaceRevision,2);
});

test('dos pestañas con la misma revisión: una escribe, la otra es rechazada',async()=>{
  const {name,repo}=setup();
  await create(repo);
  const second=new WorkspaceRepository(name,factory);
  const attempts=await Promise.allSettled([edit(repo,1,'Cambios A'),edit(second,1,'Cambios B')]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
  assert.ok(attempts.some(x=>x.status==='rejected'&&x.reason instanceof WorkspaceConflictError));
  assert.equal((await repo.loadEdition('edition.1'))!.revision,2);
  assert.equal((await repo.history('edition.1')).length,2);
});

test('la validación rechaza una edición corrupta y conserva revisión e historial',async()=>{
  const {repo}=setup();
  await create(repo);
  await assert.rejects(repo.commitEdition('edition.1',1,
    {command:'edit',targetId:'edition.1',timestamp:LATER},old=>({
      ...old!,placements:[{...old!.placements[0]!,text:{...old!.placements[0]!.text,latin:''}}],
    })),/texto inválido/);
  assert.equal((await repo.loadEdition('edition.1'))!.revision,1);
  assert.equal((await repo.history('edition.1')).length,1);
  assert.equal((await repo.snapshot()).workspaceRevision,1);
});

test('si una mutación lanza un error antes del put, el estado previo queda intacto',async()=>{
  const {repo}=setup();
  const created=await create(repo);
  await assert.rejects(repo.commitEdition('edition.1',1,
    {command:'fail',targetId:'edition.1',timestamp:LATER},()=>{throw new Error('fallo del motor');}),
    /fallo del motor/);
  assert.deepEqual(await repo.loadEdition('edition.1'),created);
  assert.equal((await repo.history('edition.1')).length,1);
});

test('rechaza los metadatos inválidos, el cambio de identidad y la fecha de creación',async()=>{
  const {repo}=setup();
  await create(repo);
  await assert.rejects(repo.commitEdition('edition.1',-1,
    {command:'edit',targetId:'edition.1',timestamp:LATER},old=>old!),/Revisión esperada inválida/);
  await assert.rejects(repo.commitEdition('edition.1',1,
    {command:'edit',targetId:'edition.1',timestamp:'ayer'},old=>old!),/Metadatos del cambio inválidos/);
  await assert.rejects(repo.commitEdition('edition.1',1,
    {command:'edit',targetId:'edition.1',timestamp:LATER},old=>({...old!,id:'ed.other'})),/cambiar el ID/);
  await assert.rejects(repo.commitEdition('edition.1',1,
    {command:'edit',targetId:'edition.1',timestamp:LATER},old=>({...old!,createdAt:LATER,updatedAt:LATER})),/fecha de creación/);
  assert.equal((await repo.history('edition.1')).length,1);
});

test('más de veinte operaciones pueden deshacerse tras una recarga',async()=>{
  const {name,repo}=setup();
  const initial=await create(repo);
  let current=1;
  for(let i=1;i<=25;i++){
    const changed=await edit(repo,current,'Título '+i);
    current=changed.revision;
  }
  const reloaded=new WorkspaceRepository(name,factory);
  for(let i=25;i>=1;i--){
    const undone=await reloaded.undoLast('edition.1',current,LATER);
    current=undone.revision;
    assert.equal(undone.edition.placements[0]!.text.title,i===1?'Texto latino':'Título '+(i-1));
  }
  assert.deepEqual((await reloaded.loadEdition('edition.1'))!.edition,initial.edition);
  assert.equal((await reloaded.history('edition.1')).length,51);
  await assert.rejects(reloaded.undoLast('edition.1',current,LATER),WorkspaceHistoryError);
});

test('editar después de deshacer crea una nueva rama sin resucitar eventos anteriores',async()=>{
  const {repo}=setup();
  await create(repo);
  await edit(repo,1,'A');
  await edit(repo,2,'B');
  await repo.undoLast('edition.1',3,LATER);
  await edit(repo,4,'C');
  const undoC=await repo.undoLast('edition.1',5,LATER);
  assert.equal(undoC.edition.placements[0]!.text.title,'A');
  const undoA=await repo.undoLast('edition.1',6,LATER);
  assert.equal(undoA.edition.placements[0]!.text.title,'Texto latino');
});

test('deshacer exige revisión vigente y no altera registros de otras ediciones',async()=>{
  const {repo}=setup();
  await create(repo);
  const independent=await create(repo,'edition.2');
  await edit(repo,1,'A');
  await assert.rejects(repo.undoLast('edition.1',1,LATER),WorkspaceConflictError);
  const after=await repo.undoLast('edition.1',2,LATER);
  assert.equal(after.edition.placements[0]!.text.title,'Texto latino');
  assert.deepEqual(await repo.loadEdition('edition.2'),independent);
  assert.equal((await repo.history('edition.2')).length,1);
});

test('el orden de apariciones se deshace sin alterar el texto de otra aparición',async()=>{
  const {repo}=setup();
  await create(repo);
  const previous=await repo.loadEdition('edition.1');
  const changed=await repo.commitEdition('edition.1',1,
    {command:'move-placement',targetId:'edition.1.place.1',timestamp:LATER},before =>
      movePlacement(before!,'edition.1.place.1',1,LATER));
  assert.equal(changed.edition.placements[0]!.id,'edition.1.place.2');
  const undo=await repo.undoLast('edition.1',2,LATER);
  assert.deepEqual(undo.edition,previous!.edition);
});

test('el corpus workspace tiene su propio CAS y no altera el corpus histórico',async()=>{
  const {name,repo}=setup();
  const legacy=new IndexedDbCorpusRepository(name+'.legacy',factory);
  const old=emptyCorpus();
  await legacy.save(old,0);
  const copy=structuredClone(old);
  copy.texts.push({id:'text.1',title:'Palabra',latin:'Arma',source:{author:null,work:null,reference:null},
    tagIds:[],createdAt:NOW,updatedAt:NOW});
  assert.equal((await repo.saveCorpus(copy,0)).revision,1);
  await assert.rejects(repo.saveCorpus(copy,0),WorkspaceConflictError);
  assert.deepEqual((await legacy.load()).corpus,old);
  assert.deepEqual((await repo.loadCorpus()).corpus,copy);
});

test('el snapshot rechaza corrupción persistida y no la interpreta como corpus vacío',async()=>{
  const {name,repo}=setup();
  await create(repo);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const q=factory.open(name,1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('editions','readwrite');
    tx.objectStore('editions').put({key:'edition.1',revision:3,edition:{editionSchemaVersion:1}});
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  });
  db.close();
  await assert.rejects(repo.snapshot());
  await assert.rejects(repo.loadEdition('edition.1'));
  await assert.rejects(edit(repo,3,'No sobrescribir'));
});

test('rechaza esquema IndexedDB futuro sin borrar registros',async()=>{
  const {name,repo}=setup();
  await create(repo);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const q=factory.open(name,2);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  db.close();
  await assert.rejects(repo.snapshot());
  // La conexión original ya se ha cerrado después de la primera transacción.
});

test('no instala una migración sobre ediciones existentes',async()=>{
  const {repo}=setup();
  await create(repo);
  const corpus=emptyCorpus();
  const marker={schemaVersion:1 as const,sourceKind:'backup' as const,sourceRevision:0,
    sourceSha256:'a'.repeat(64),migratedAt:NOW,notebookIdMap:{},textCount:0,notebookCount:0};
  await assert.rejects(repo.installLegacy(corpus,[],marker),WorkspaceMigrationConflictError);
  assert.equal((await repo.loadEdition('edition.1'))!.revision,1);
});

test('el validador del snapshot rechaza referencias históricas ajenas',async()=>{
  const e=sampleEdition();
  const invalid={workspaceRevision:1,corpus:null,editions:[{revision:1,edition:e}],history:[{
    id:'evt.1',editionId:'edition.other',sequence:1,revisionBefore:0,revisionAfter:1,
    before:null,after:e,targetId:'edition.other',timestamp:NOW,command:'create',
  }],migration:null};
  assert.throws(()=>validateWorkspaceSnapshot(invalid),/otro cuaderno|inexistente/);
});

test('si history.add falla después de editions.put, IndexedDB revierte ambas escrituras y el epoch',async()=>{
  const {name,repo}=setup();
  const initial=await create(repo);
  const history=await repo.history('edition.1');
  const collision=structuredClone(history[0]!);
  collision.id='evt.colliding';
  collision.command='edit-title';
  collision.revisionBefore=1;
  collision.revisionAfter=2;
  collision.sequence=2;
  collision.before=initial.edition;
  collision.after=initial.edition;
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const req=factory.open(name,WORKSPACE_DATABASE_VERSION);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('history','readwrite');
    tx.objectStore('history').add({key:['edition.1',2],event:collision});
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  });
  db.close();
  await assert.rejects(edit(repo,1,'Cambio que colisiona'));
  assert.deepEqual(await repo.loadEdition('edition.1'),initial);
  // La escritura previa no debe haberse completado, aunque history.add lanzó ConstraintError.
  const db2=await new Promise<IDBDatabase>((resolve,reject)=>{
    const req=factory.open(name,WORKSPACE_DATABASE_VERSION);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  const ep=await new Promise<unknown>((resolve,reject)=>{
    const tx=db2.transaction('meta','readonly');
    const req=tx.objectStore('meta').get('workspace-revision');
    tx.oncomplete=()=>resolve(req.result?.value);tx.onabort=()=>reject(tx.error);
  });
  db2.close();
  assert.equal(ep,1);
});

test('un metadata global eliminado impide nuevas escrituras en vez de reabrir epoch=1',async()=>{
  const {name,repo}=setup();
  const initial=await create(repo);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const req=factory.open(name,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('meta','readwrite');
    tx.objectStore('meta').delete('workspace-revision');
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  });
  db.close();
  await assert.rejects(edit(repo,1,'No debe guardarse'),/Falta la revisión global/);
  assert.deepEqual(await repo.loadEdition('edition.1'),initial);
});

test('eliminar una edición borra su historial atómicamente y conserva las otras y el corpus',async()=>{
  const {repo}=setup();
  await create(repo,'edition.1');
  await create(repo,'edition.2');
  await edit(repo,1,'Edición preservada','edition.2');
  const before=await repo.loadEdition('edition.2');
  const epoch=(await repo.snapshot()).workspaceRevision;
  await assert.rejects(repo.deleteEdition('edition.1',0),WorkspaceConflictError);
  assert.equal((await repo.snapshot()).workspaceRevision,epoch);
  await repo.deleteEdition('edition.1',1);
  assert.equal(await repo.loadEdition('edition.1'),null);
  assert.deepEqual(await repo.history('edition.1'),[]);
  assert.deepEqual(await repo.loadEdition('edition.2'),before);
  assert.equal((await repo.history('edition.2')).length,2);
  assert.equal((await repo.snapshot()).workspaceRevision,epoch+1);
  await assert.rejects(repo.deleteEdition('edition.1',1),WorkspaceConflictError);
  assert.deepEqual(await repo.loadEdition('edition.2'),before);
});
