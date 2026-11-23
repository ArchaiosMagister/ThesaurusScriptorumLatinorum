import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { emptyCorpus, type CorpusV1 } from '../core/model.js';
import { createBackup, readBackup } from '../core/backup.js';
import { IndexedDbCorpusRepository } from './indexeddb-corpus-repository.js';
import { WorkspaceRepository, WorkspaceMigrationConflictError } from './workspace-repository.js';
import { prepareLegacyMigration, executeLegacyMigration, prepareLegacyBackupImport } from './workspace-migration.js';

const factory = new IDBFactory();
let seq=0;
const AT='2026-11-15T18:00:00.000Z';
const fixed=new Date(AT);
function corpus():CorpusV1 {
  const c=emptyCorpus();
  c.texts=[
    {id:'text.1',title:'Gallia',latin:'Galliā est omnis divisa.',source:{author:'César',work:'De bello Gallico',reference:'1.1'},tagIds:[],createdAt:AT,updatedAt:AT},
    {id:'text.2',title:'Roma',latin:'Rōma antīqua erat.',source:{author:'Eutropio',work:'Breviarium',reference:'I 1'},tagIds:[],createdAt:AT,updatedAt:AT},
  ];
  c.notebooks=[
    {id:'legacy.notebook.1',title:'Cuaderno original',textIds:['text.2','text.1']},
    {id:'legacy.notebook.2',title:'Segundo cuaderno',textIds:['text.1']},
  ];
  return c;
}
async function fixture(){
  const id=++seq;
  const old=new IndexedDbCorpusRepository('old-migration-pr8-'+id,factory);
  const ws=new WorkspaceRepository('workspace-migration-pr8-'+id,factory);
  const c=corpus();
  await old.save(c,0);
  return {old,ws,c};
}
const yes={legacyBackupExported:true,confirmCreateWorkspace:true};

test('preflight lee, verifica y ofrece copia JSON v1 sin modificar workspace',async()=>{
  const {old,ws,c}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  assert.equal(plan.sourceRevision,1);
  assert.equal(plan.notebookCount,2);
  assert.equal(plan.placementCount,3);
  assert.equal(plan.textCount,2);
  assert.equal(plan.preview[0]?.title,'Cuaderno original');
  assert.deepEqual((await readBackup(plan.legacyBackupJson)).corpus,c);
  assert.deepEqual(await ws.snapshot(),{workspaceRevision:0,corpus:null,editions:[],history:[],migration:null});
});

test('migración copia textos y orden de cuadernos sin escribir ni actualizar el legado',async()=>{
  const {old,ws,c}=await fixture();
  const before=await old.load();
  const plan=await prepareLegacyMigration(old,fixed);
  const migrated=await executeLegacyMigration(ws,plan,yes,old);
  assert.equal(migrated.status,'created');
  assert.equal(migrated.sourceChangedAfterCommit,false);
  assert.deepEqual(await old.load(),before);
  const data=await ws.snapshot();
  assert.equal(data.workspaceRevision,1);
  assert.deepEqual(data.corpus?.corpus,c);
  assert.equal(data.corpus?.revision,1);
  assert.equal(data.editions.length,2);
  assert.equal(data.history.length,0);
  assert.deepEqual(data.editions.map(e=>e.revision),[1,1]);
  const first=data.editions[0]!.edition;
  assert.equal(first.legacyNotebookId,'legacy.notebook.1');
  assert.deepEqual(first.placements.map(x=>x.text.title),['Roma','Gallia']);
  assert.deepEqual(first.placements.map(x=>x.source.sourceId),['text.2','text.1']);
  assert.equal(first.placements[0]!.questions.length,4);
  assert.deepEqual(first.placements[0]!.questions.map(q=>q.pointsHundredths),[400,100,100,200]);
  assert.equal(first.placements[0]!.text.latin,'Rōma antīqua erat.');
  assert.equal(first.placements[1]!.text.latin,'Galliā est omnis divisa.');
  assert.deepEqual(data.migration?.notebookIdMap,{
    'legacy.notebook.1':first.id,'legacy.notebook.2':data.editions[1]!.edition.id,
  });
});

test('un texto repetido en dos cuadernos genera dos apariciones independientes',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  await executeLegacyMigration(ws,plan,yes,old);
  const eds=(await ws.listEditions()).map(x=>x.edition);
  assert.notEqual(eds[0]!.placements[1]!.id,eds[1]!.placements[0]!.id);
  assert.notEqual(eds[0]!.placements[1]!.questions[0]!.id,eds[1]!.placements[0]!.questions[0]!.id);
  assert.equal(eds[0]!.placements[1]!.source.sourceId,'text.1');
  assert.equal(eds[1]!.placements[0]!.source.sourceId,'text.1');
});

test('repetir el mismo plan no crea duplicados ni eventos',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  assert.equal((await executeLegacyMigration(ws,plan,yes,old)).status,'created');
  const snapshot=await ws.snapshot();
  assert.equal((await executeLegacyMigration(ws,plan,yes,old)).status,'already-present');
  assert.deepEqual(await ws.snapshot(),snapshot);
});

test('no se instala nada sin confirmar copia exportada y migración',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  await assert.rejects(executeLegacyMigration(ws,plan,{legacyBackupExported:false,confirmCreateWorkspace:true},old),/Primero exporta/);
  await assert.rejects(executeLegacyMigration(ws,plan,{legacyBackupExported:true,confirmCreateWorkspace:false},old),/Primero exporta/);
  assert.equal((await ws.snapshot()).workspaceRevision,0);
});

test('si el corpus histórico cambia después del preflight, se rechaza la migración',async()=>{
  const {old,ws,c}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  const changed=structuredClone(c);
  changed.texts[0]!.latin='Gallia nova';
  await old.save(changed,1);
  await assert.rejects(executeLegacyMigration(ws,plan,yes,old),/cambió después del preflight/);
  assert.deepEqual(await ws.snapshot(),{workspaceRevision:0,corpus:null,editions:[],history:[],migration:null});
  assert.deepEqual((await old.load()).corpus,changed);
});

test('si workspace ya tiene trabajo propio no lo sustituye por legado',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  await ws.saveCorpus(emptyCorpus(),0);
  const before=await ws.snapshot();
  await assert.rejects(executeLegacyMigration(ws,plan,yes,old),WorkspaceMigrationConflictError);
  assert.deepEqual(await ws.snapshot(),before);
});

test('plan corrupto o incompleto se rechaza antes del commit',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  await assert.rejects(executeLegacyMigration(ws,{...plan,sourceSha256:'f'.repeat(64)},yes,old),/no coinciden/);
  await assert.rejects(executeLegacyMigration(ws,{...plan,legacyBackupJson:plan.legacyBackupJson.replace('Gallia','Mallia')},yes,old));
  assert.equal((await ws.snapshot()).workspaceRevision,0);
});

test('un archivo backupVersion 1 se importa explícitamente sin necesidad de alterar la base histórica',async()=>{
  const {old,ws,c}=await fixture();
  const json=await createBackup(c,fixed);
  const plan=await prepareLegacyBackupImport(json,fixed);
  assert.equal(plan.sourceKind,'backup');
  assert.equal(plan.sourceRevision,0);
  const result=await executeLegacyMigration(ws,plan,yes);
  assert.equal(result.status,'created');
  assert.equal(result.sourceChangedAfterCommit,false);
  assert.deepEqual((await ws.loadCorpus()).corpus,c);
  assert.deepEqual((await old.load()).corpus,c);
});

test('un segundo plan de otro origen nunca pisa una migración ya realizada',async()=>{
  const {old,ws,c}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  await executeLegacyMigration(ws,plan,yes,old);
  const second=await prepareLegacyBackupImport(await createBackup(c,fixed),fixed);
  const before=await ws.snapshot();
  await assert.rejects(executeLegacyMigration(ws,second,yes),/otro estado/);
  assert.deepEqual(await ws.snapshot(),before);
});

test('convertir un cuaderno que supera el límite validado no crea ningún estado parcial',async()=>{
  const id=++seq;
  const ws=new WorkspaceRepository('migration-overflow-'+id,factory);
  const big=emptyCorpus();
  for(let i=0;i<1001;i++)big.texts.push({id:'t.'+i,title:'Texto '+i,latin:'Gallia.',
    source:{author:null,work:null,reference:null},tagIds:[],createdAt:AT,updatedAt:AT});
  big.notebooks=[{id:'notebook.huge',title:'Extenso',textIds:big.texts.map(t=>t.id)}];
  const plan=await prepareLegacyBackupImport(await createBackup(big,fixed),fixed);
  await assert.rejects(executeLegacyMigration(ws,plan,yes),/lista inválida|demasiado extensa/);
  assert.equal((await ws.snapshot()).workspaceRevision,0);
});

test('dos migraciones concurrentes del mismo plan son idempotentes',async()=>{
  const {old,ws}=await fixture();
  const plan=await prepareLegacyMigration(old,fixed);
  const other=new WorkspaceRepository(ws.databaseName,factory);
  const results=await Promise.all([executeLegacyMigration(ws,plan,yes,old),executeLegacyMigration(other,plan,yes,old)]);
  assert.deepEqual(results.map(r=>r.status).sort(),['already-present','created']);
  assert.equal((await ws.snapshot()).editions.length,2);
});

test('el pasaje retirado del banco sigue disponible al preparar y exportar un cuaderno', async () => {
  const { createNotebookDocx } = await import('../export/notebook-documents.js');
  const { deleteText, upsertText } = await import('../core/editor-operations.js');
  const { old, ws, c } = await fixture();
  const enriched = upsertText(c, {
    id: 'text.1', title: 'Gallia', latin: c.texts[0]!.latin, author: 'César',
    work: 'De bello Gallico', reference: '1.1',
  }, 'text.1', AT);
  await old.save(deleteText(enriched, 'text.1'), 1);
  const plan = await prepareLegacyMigration(old, fixed);
  await executeLegacyMigration(ws, plan, yes, old);
  const snapshot = (await ws.listEditions()).find(entry => entry.edition.legacyNotebookId === 'legacy.notebook.2');
  assert.equal(snapshot?.edition.placements[0]?.source.sourceId, 'text.1');
  assert.equal(snapshot?.edition.placements[0]?.text.latin, c.texts[0]?.latin);
  const docx = new TextDecoder().decode(createNotebookDocx(snapshot!.edition));
  assert.ok(docx.includes('Galliā est omnis divisa.'));
});
