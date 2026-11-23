import { test, expect } from '@playwright/test';

test('motor académico WebKit: candidata verificada, CAS, recarga y deshacer sin tocar otro texto',async({page})=>{
  await page.goto('/?classic=1');
  const first=await page.evaluate(async()=>{
    const { createEdition, createPlacement }=await import('/core/edition-factory.js');
    const { VerifiedAcademicBankV1 }=await import('/core/academic-bank.js');
    const { AcademicQuestionEngineV1 }=await import('/core/academic-engine.js');
    const { WorkspaceRepository }=await import('/storage/workspace-repository.js');
    const now='2026-11-15T18:00:00.000Z',at='2026-11-15T18:01:00.000Z';
    let seq=0;
    const create=(id)=>createPlacement({id,title:'Texto de prueba',latin:'Arma virumque cano.',
      author:'Virgilio',work:'Aeneis',reference:'I 1',
      source:{kind:'manual',sourceId:null,urn:null,importedAt:now}},()=>`q.${++seq}`);
    const ed=createEdition({id:'edition.engine.e2e',title:'Prueba técnica',legacyNotebookId:null,
      timestamp:now,placements:[create('placement.1'),create('placement.2')]});
    const q=ed.placements[0].questions.find(x=>x.kind==='choice');
    const opt=q.options.find(x=>x.kind==='prefix');
    opt.slots=[{id:'word.1',value:'palabra-original',proposedLemmaId:null,
      origin:'generated',locked:false,provenance:{provider:'test-e2e',
        recordId:'slot.initial',bankRevision:'test.rev',decisionId:null}}];
    const dbName='academic-e2e-'+crypto.randomUUID();
    sessionStorage.setItem('academic-e2e-database',dbName);
    const repo=new WorkspaceRepository(dbName);
    await repo.commitEdition(ed.id,0,{command:'create',targetId:ed.id,timestamp:now},()=>ed);
    const bank=new VerifiedAcademicBankV1({id:'fixture.academic',revision:'test.rev',
      sourceName:'FICHA SINTÉTICA DE PRUEBA',verifiedBy:'test-e2e'},[{
      id:'candidate.1',kind:'prefix',value:'palabra-verificada-fixture',lemmaId:null,
      analysis:null,surface:null,sourceForm:null,courses:['latin-ii'],status:'verified',
      evidence:{provider:'test-e2e',recordId:'record.1',bankRevision:'test.rev',decisionId:null},
    }]);
    const engine=new AcademicQuestionEngineV1(bank);
    const plan=engine.prepareSlot(ed,{placementId:'placement.1',questionId:q.id,
      optionId:opt.id,slotId:'word.1',expectedRevision:1});
    const changed=await engine.commit(repo,plan,at);
    return {database:dbName,revision:changed.revision,
      value:changed.edition.placements[0].questions.find(x=>x.kind==='choice').options.find(x=>x.kind==='prefix').slots[0].value,
      neighbor:changed.edition.placements[1].text.latin};
  });
  expect(first.revision).toBe(2);
  expect(first.value).toBe('palabra-verificada-fixture');
  expect(first.neighbor).toBe('Arma virumque cano.');
  await page.reload();
  const recovered=await page.evaluate(async()=>{
    const { WorkspaceRepository }=await import('/storage/workspace-repository.js');
    const repo=new WorkspaceRepository(sessionStorage.getItem('academic-e2e-database'));
    const old=await repo.loadEdition('edition.engine.e2e');
    const history=await repo.history('edition.engine.e2e');
    const restored=await repo.undoLast('edition.engine.e2e',old.revision,'2026-11-15T18:02:00.000Z');
    const q=restored.edition.placements[0].questions.find(x=>x.kind==='choice');
    return {revision:old.revision,historyBefore:history.length,historyAfter:(await repo.history('edition.engine.e2e')).length,
      value:q.options.find(o=>o.kind==='prefix').slots[0].value,
      neighbor:restored.edition.placements[1].text.latin};
  });
  expect(recovered.revision).toBe(2);
  expect(recovered.historyBefore).toBe(2);
  expect(recovered.historyAfter).toBe(3);
  expect(recovered.value).toBe('palabra-original');
  expect(recovered.neighbor).toBe('Arma virumque cano.');
});
