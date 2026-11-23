import { test, expect } from '@playwright/test';

test('WebKit: selecciona solo un homógrafo con análisis explícito, persiste y deshace', async ({ page }) => {
  await page.goto('/?classic=1');
  const result = await page.evaluate(async () => {
    const [{createPlacement,createEdition},{WorkspaceRepository},{createOfflineTeacherBankV1},{AcademicMorphTokenSelectorV1}]=await Promise.all([
      import('/core/edition-factory.js'),import('/storage/workspace-repository.js'),
      import('/core/academic-teacher-bank.js'),import('/core/academic-morph-selection.js'),
    ]);
    const at='2026-11-15T20:00:00.000Z';
    let n=0;
    const place=(id)=>createPlacement({id,title:'Homonimia',latin:'dux et dux',author:'César',work:'Bellum Gallicum',reference:'I 1',
      source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},()=>`q.${++n}`);
    const book=createEdition({id:'ed.morph.e2e',legacyNotebookId:null,title:'Cuaderno',timestamp:at,placements:[place('p.a'),place('p.b')]});
    const morphology=book.placements[0].questions.find(q=>q.kind==='morphology');
    const target={editionId:book.id,placementId:'p.a',questionId:morphology.id,
      expectedRevision:1,startUtf16:7,endUtf16:10,markId:'mark.2',wordId:'analysis.2'};
    const bank=createOfflineTeacherBankV1().bank;
    const selector=new AcademicMorphTokenSelectorV1(bank);
    const preview=selector.preview(book,target);
    const repository=new WorkspaceRepository('pr9-morph-e2e-webkit');
    await repository.commitEdition(book.id,0,{command:'create',targetId:book.id,timestamp:at},()=>book);
    const plan=selector.prepare(book,target,preview.candidates[0].id);
    const updated=await selector.commit(repository,plan,'2026-11-15T20:01:00.000Z');
    const reopened=new WorkspaceRepository('pr9-morph-e2e-webkit');
    const restored=await reopened.loadEdition(book.id);
    const mark=restored?.edition.placements[0].text.markup[0];
    const otherTextUnchanged=JSON.stringify(restored?.edition.placements[1])===JSON.stringify(book.placements[1]);
    const returned=await reopened.undoLast(book.id,updated.revision,'2026-11-15T20:02:00.000Z');
    return {status:preview.status,candidates:preview.candidates.length,mark,otherTextUnchanged,
      afterUndo:returned.edition.placements[0].text.markup.length,history:(await reopened.history(book.id)).length};
  });
  expect(result.status).toBe('ambiguous');
  expect(result.candidates).toBe(2);
  expect(result.mark.startUtf16).toBe(7);
  expect(result.mark.endUtf16).toBe(10);
  expect(result.mark.exact).toBe('dux');
  expect(result.otherTextUnchanged).toBe(true);
  expect(result.afterUndo).toBe(0);
  expect(result.history).toBe(3);
});
