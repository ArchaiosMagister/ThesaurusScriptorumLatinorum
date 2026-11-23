import {test,expect} from '@playwright/test';

async function pasteBank(page,{title,author='César',work='De bello Gallico',reference='I 24',latin}){
  const bank=page.locator('.cuaderno-home-bank');
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill(title);
  await modal.getByRole('textbox',{name:'Autor'}).fill(author);
  await modal.getByRole('textbox',{name:'Obra'}).fill(work);
  await modal.getByRole('textbox',{name:'Referencia'}).fill(reference);
  await modal.getByRole('textbox',{name:'Texto latino'}).fill(latin);
  return modal;
}

test('Banco autónomo: modifica una ficha sin crear cuaderno y conserva su ID',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  let modal=await pasteBank(page,{
    title:'Texto inicial',latin:'Gallia est omnis divisa in partes tres.',
  });
  await modal.getByRole('button',{name:'Guardar en el banco'}).click();
  await expect(bank).toContainText('1 texto distinto');
  const originalId=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts[0].id;
  });
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  const row=bank.locator('.cuaderno-home-text').filter({hasText:'Texto inicial'}).first();
  await row.locator('summary').first().click();
  await row.getByRole('button',{name:'Editar ficha'}).click();
  modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título didáctico'}).fill('Texto corregido');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Gallia in partes tres divisa erat.');
  await modal.getByRole('button',{name:'Guardar cambios'}).click();
  await expect(modal).toBeHidden({timeout:10000});
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  await expect(bank).toContainText('Texto corregido');
  await page.reload();
  const updated=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus;
  });
  expect(updated.notebooks).toHaveLength(0);
  expect(updated.texts).toHaveLength(1);
  expect(updated.texts[0].id).toBe(originalId);
  expect(updated.texts[0].latin).toBe('Gallia in partes tres divisa erat.');
});

test('Banco autónomo: advierte duplicado bibliográfico y deja decidir',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  const first=await pasteBank(page,{
    title:'Primer texto',latin:'Helvetii cum omnibus suis carris impedimenta in unum locum contulerunt.',
  });
  await first.getByRole('button',{name:'Guardar en el banco'}).click();
  const second=await pasteBank(page,{
    title:'Segundo texto',work:'Bellum Gallicum',reference:'1.24',
    latin:'Milites nostri ad castra subito se receperunt.',
  });
  let notice='';
  const cancel=page.waitForEvent('dialog').then(async dialog=>{
    notice=dialog.message(); await dialog.dismiss();
  });
  await Promise.all([cancel,second.getByRole('button',{name:'Guardar en el banco'}).click()]);
  expect(notice).toContain('Misma referencia bibliográfica');
  await expect(bank).toContainText('1 texto distinto');
  const accept=page.waitForEvent('dialog').then(dialog=>dialog.accept());
  await Promise.all([accept,second.getByRole('button',{name:'Guardar en el banco'}).click()]);
  await expect(bank).toContainText('2 textos distintos');
});
