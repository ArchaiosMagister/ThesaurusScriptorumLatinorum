import { test, expect } from '@playwright/test';

/** Pruebas de IndexedDB real en WebKit, no solo de fake-indexeddb en Node. */
test('workspace: guarda una edición, vuelve a abrirla y deshace tras recargar Safari/WebKit',async({page})=>{
  await page.goto('/?classic=1');
  const first=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const {createEdition,createPlacement}=await import('/core/edition-factory.js');
    const {editPlacementText}=await import('/core/edition-operations.js');
    const at='2026-11-15T18:00:00.000Z';
    const repo=new WorkspaceRepository('pr8-e2e-undo');
    let count=0;
    const p=createPlacement({id:'place.1',title:'Texto de César',latin:'Gallia est omnis divisa.',
      author:'César',work:'De bello Gallico',reference:'I, 1',
      source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},()=>`q.${++count}`);
    const edition=createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno',timestamp:at,placements:[p]});
    await repo.commitEdition('ed.1',0,{command:'create',targetId:'ed.1',timestamp:at},()=>edition);
    await repo.commitEdition('ed.1',1,{command:'edit',targetId:'place.1',timestamp:at},previous=>
      editPlacementText(previous,'place.1','title','Texto editado',at));
    const snapshot=await repo.snapshot();
    return {count:snapshot.history.length,title:snapshot.editions[0].edition.placements[0].text.title,
      revision:snapshot.editions[0].revision,epoch:snapshot.workspaceRevision};
  });
  expect(first).toEqual({count:2,title:'Texto editado',revision:2,epoch:2});
  await page.reload();
  const second=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repo=new WorkspaceRepository('pr8-e2e-undo');
    const restored=await repo.loadEdition('ed.1');
    const undone=await repo.undoLast('ed.1',restored.revision,'2026-11-15T18:02:00.000Z');
    return {title:undone.edition.placements[0].text.title,
      history:(await repo.history('ed.1')).length,revision:undone.revision};
  });
  expect(second).toEqual({title:'Texto de César',history:3,revision:3});
});

test('workspace: migra legado con copia y preserva el CorpusV1 original',async({page})=>{
  await page.goto('/?classic=1');
  const result=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const {prepareLegacyMigration,executeLegacyMigration}=await import('/storage/workspace-migration.js');
    const old=new IndexedDbCorpusRepository('pr8-e2e-legacy');
    const ws=new WorkspaceRepository('pr8-e2e-migrated');
    const at='2026-11-15T18:00:00.000Z';
    const corpus={schemaVersion:1,tags:[],texts:[
      {id:'t.1',title:'César',latin:'Rōma.',source:{author:'César',work:'De bello Gallico',reference:'1.1'},tagIds:[],createdAt:at,updatedAt:at},
    ],notebooks:[{id:'n.1',title:'Cuaderno',textIds:['t.1']}]};
    await old.save(corpus,0);
    const plan=await prepareLegacyMigration(old,new Date(at));
    const first=await executeLegacyMigration(ws,plan,
      {legacyBackupExported:true,confirmCreateWorkspace:true},old);
    const second=await executeLegacyMigration(ws,plan,
      {legacyBackupExported:true,confirmCreateWorkspace:true},old);
    const current=await ws.snapshot();
    return {first:first.status,second:second.status,
      oldRevision:(await old.load()).revision,oldLatin:(await old.load()).corpus.texts[0].latin,
      newLatin:current.editions[0].edition.placements[0].text.latin,
      points:current.editions[0].edition.placements[0].questions.map(q=>q.pointsHundredths),
      epoch:current.workspaceRevision};
  });
  expect(result).toEqual({first:'created',second:'already-present',oldRevision:1,
    oldLatin:'Rōma.',newLatin:'Rōma.',points:[400,100,100,200],epoch:1});
});

test('workspace: respaldo v2 y restauración previa verificación funcionan en WebKit',async({page})=>{
  await page.goto('/?classic=1');
  const result=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const {createEdition,createPlacement}=await import('/core/edition-factory.js');
    const {editPlacementText}=await import('/core/edition-operations.js');
    const {createWorkspaceBackup,prepareWorkspaceRestore,restoreWorkspaceBackup}=await import('/storage/workspace-backup.js');
    const at='2026-11-15T18:00:00.000Z';
    const ws=new WorkspaceRepository('pr8-e2e-backup');
    let seq=0;
    const p=createPlacement({id:'place.1',title:'Original',latin:'Ōrātiō bona.',author:null,work:null,reference:null,
      source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},()=>`q.${++seq}`);
    const edition=createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno',timestamp:at,placements:[p]});
    await ws.commitEdition('ed.1',0,{command:'create',targetId:'ed.1',timestamp:at},()=>edition);
    const backup=await createWorkspaceBackup(ws,new Date(at));
    await ws.commitEdition('ed.1',1,{command:'edit',targetId:'place.1',timestamp:at},before=>
      editPlacementText(before,'place.1','title','Temporal',at));
    const plan=await prepareWorkspaceRestore(ws,backup,new Date(at));
    const restored=await restoreWorkspaceBackup(ws,backup,{
      confirmReplace:true,safetyBackupExported:true,
      currentSafetyBackupJson:plan.currentSafetyBackupJson,
      expectedWorkspaceRevision:plan.expectedWorkspaceRevision,
    });
    return {title:restored.editions[0].edition.placements[0].text.title,
      history:restored.history.length,epoch:restored.workspaceRevision,
      latin:restored.editions[0].edition.placements[0].text.latin};
  });
  expect(result).toEqual({title:'Original',history:1,epoch:3,latin:'Ōrātiō bona.'});
});
