import { test, expect } from '@playwright/test';

test('WebKit: selección docente real, normas fonéticas y homonimia no se convierten en bloqueos', async ({page})=>{
  await page.goto('/?classic=1');
  const outcome=await page.evaluate(async()=>{
    const [{createOfflineTeacherBankV1},{AcademicQuestionEngineV1},{createPlacement,createEdition}]=await Promise.all([
      import('/core/academic-teacher-bank.js'),import('/core/academic-engine.js'),import('/core/edition-factory.js'),
    ]);
    const report=createOfflineTeacherBankV1();
    const bank=report.bank;
    const preview=Object.fromEntries(['preverb','phonetics','prefix','latinism','morphology'].map(k=>[k,bank.statusCounts(k)]));
    const prefix=bank.verified('prefix').find(r=>r.value==='Interdependencia');
    const prefixAudit=prefix&&report.audit.get(prefix.id);
    const now='2026-11-15T20:00:00.000Z';let i=0;
    const placement=createPlacement({id:'p.test',title:'Texto',latin:'duces et arma',author:null,work:null,reference:null,
      source:{kind:'manual',sourceId:null,urn:null,importedAt:now}},()=>`q.test.${++i}`);
    const edition=createEdition({id:'ed.test',legacyNotebookId:null,title:'Cuaderno',timestamp:now,placements:[placement]});
    const question=edition.placements[0].questions.find(q=>q.kind==='choice');
    const phonetic=question.options.find(x=>x.kind==='phonetics');
    phonetic.slots=[{id:'word.fon',value:'elemento anterior',origin:'manual',locked:false,
      proposedLemmaId:null,provenance:null}];
    const engine=new AcademicQuestionEngineV1(bank);
    const qTarget={placementId:'p.test',questionId:question.id,optionId:phonetic.id,
      slotId:'word.fon',expectedRevision:1};
    const all=engine.previewSlot(edition,qTarget);
    const n05=engine.previewSlot(edition,{...qTarget,phoneticRules:['N05']});
    const other=engine.previewSlot(edition,{...qTarget,phoneticRules:['N07']});
    const preverbHomonym={plain:bank.verified('preverb','sero').length,
      qualifiedA:bank.verified('preverb','sero, -ere, -rui, sertum').length,
      qualifiedB:bank.verified('preverb','sero, -ere, sevi, satum').length};
    return {preview,counts:bank.count,allPhonetics:all.candidates.length,
      n05Fabam:n05.candidates.some(x=>x.value==='fabam'),
      n07Fabam:other.candidates.some(x=>x.value==='fabam'),
      prefixEligible:!!prefix,prefixWarning:prefixAudit?.semanticReviewRequired,
      prefixExternalVerification:prefixAudit?.individuallyExternallyVerified,
      preverbHomonym};
  });
  expect(outcome.counts).toBe(1965);
  expect(outcome.preview.preverb.verified).toBe(882);
  expect(outcome.preview.phonetics.verified).toBe(655);
  expect(outcome.preview.prefix.verified).toBe(286);
  expect(outcome.preview.latinism.verified).toBe(87);
  expect(outcome.preview.morphology.verified).toBe(55);
  expect(outcome.allPhonetics).toBe(655);
  expect(outcome.n05Fabam).toBe(true);
  expect(outcome.n07Fabam).toBe(false);
  expect(outcome.prefixEligible).toBe(true);
  expect(outcome.prefixWarning).toBe(true);
  expect(outcome.prefixExternalVerification).toBe(false);
  expect(outcome.preverbHomonym).toEqual({plain:0,qualifiedA:6,qualifiedB:4});
});
