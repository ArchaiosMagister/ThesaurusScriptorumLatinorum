import {test,expect} from '@playwright/test';

test('auditoría global en Inicio clasifica pares, filtra y no altera los textos',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  const source='Helvetii cum omnibus suis carris secuti impedimenta in unum locum contulerunt ipsi confertissima acie reiecto nostro equitatu phalange facta successerunt.';
  const before=await page.evaluate(async source=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText}=await import('/core/editor-operations.js');
    const repository=new IndexedDbCorpusRepository();
    const current=await repository.load();
    const entries=[
      {title:'Pasaje A',latin:source,author:'César',work:'De bello Gallico',reference:'I 24'},
      {title:'Pasaje B',latin:source.replace('contulerunt','contulērunt'),author:'Salustio',work:'Bellum Catilinae',reference:'4'},
      {title:'Pasaje C',latin:'Itaque '+source.slice(0,100)+' alio itinere profecti sunt.',author:'Cicerón',work:'Pro Archia',reference:'8'},
      {title:'Pasaje D',latin:'Milites pro castris constiterunt.',author:'Iulius Caesar',work:'Bellum Gallicum',reference:'1.24'},
    ];
    let result=current.corpus;
    for(const [i,data] of entries.entries())result=upsertText(result,data,'audit.'+i,'2026-11-20T12:00:00.000Z');
    await repository.save(result,current.revision);
    return JSON.stringify(result);
  },source);
  await page.reload();
  const bank=page.locator('.cuaderno-home-bank');
  await expect(bank).toContainText('4 textos distintos');
  await bank.getByRole('button',{name:'Auditar textos repetidos'}).click();
  const modal=page.locator('.modal').last();
  await expect(modal.getByText('Auditoría de textos repetidos')).toBeVisible();
  await expect(modal).toContainText('4 textos revisados');
  await expect(modal.locator('.cuaderno-duplicate-result')).toHaveCount(4);
  await expect(modal).toContainText('Textos idénticos: 1');
  await expect(modal).toContainText('Fragmentos compartidos: 2');
  await expect(modal).toContainText('Misma referencia: 1');
  await modal.getByRole('combobox',{name:'Tipo de coincidencia'}).selectOption('citation');
  await expect(modal.locator('.cuaderno-duplicate-result')).toHaveCount(1);
  await modal.locator('.cuaderno-duplicate-result').first().locator('summary').click();
  await expect(modal).toContainText('Pasaje A');
  await expect(modal).toContainText('Pasaje D');
  await expect(modal).toContainText('Cuadernos: Sin vinculación directa identificada');
  const after=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return JSON.stringify((await new IndexedDbCorpusRepository().load()).corpus);
  });
  expect(after).toBe(before,'la auditoría es estrictamente de solo lectura');
});

test('auditoría permite abrir una ficha para corregirla sin borrar cuadernos',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText}=await import('/core/editor-operations.js');
    const repo=new IndexedDbCorpusRepository();
    let snapshot=await repo.load();
    for(const [i,title] of ['Primera ficha','Segunda ficha'].entries()){
      snapshot.corpus=upsertText(snapshot.corpus,{
        title,latin:'Gallia est omnis divisa in partes tres.',
        author:i?'Salustio':'César',work:'Bellum Gallicum',reference:String(i+1),
      },'audit.'+i,'2026-11-20T12:00:00.000Z');
    }
    await repo.save(snapshot.corpus,snapshot.revision);
  });
  await page.reload();
  await page.getByRole('button',{name:'Auditar textos repetidos'}).click();
  const audit=page.locator('.modal').last();
  await expect(audit.locator('.cuaderno-duplicate-result')).toHaveCount(1);
  await audit.locator('.cuaderno-duplicate-result summary').first().click();
  await audit.getByRole('button',{name:'Editar segunda ficha'}).click();
  const editor=page.locator('.modal').last();
  await expect(editor.getByText('Editar texto del banco')).toBeVisible();
  await expect(editor.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('Segunda ficha');
  await editor.getByRole('button',{name:'Cancelar'}).click();
  const corpus=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus;
  });
  expect(corpus.texts).toHaveLength(2);
  expect(corpus.notebooks).toHaveLength(0);
});
