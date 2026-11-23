import {test,expect} from '@playwright/test';

test('Wikisource latina: búsqueda en línea, revisión manual y alta en cuaderno',async({page})=>{
  await page.route('https://la.wikisource.org/w/api.php?**',async route=>{
    const url=new URL(route.request().url());
    if(url.searchParams.get('list')==='search'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        query:{search:[{pageid:16,title:'Cicero/De officiis'}]},
      })});
      return;
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      parse:{title:'Cicero/De officiis',
        text:'<div class="mw-parser-output"><p>Quamquam te, Marce fili, annum iam audientem Cratippum.</p><p>Accipere cupio.</p></div>'},
    })});
  });
  await page.goto('/?nuevo=1');
  page.once('dialog',dialog=>dialog.accept('Textos externos'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.locator('.notebook-editor-head').getByRole('button',{name:'Autores online'}).click();
  await page.getByRole('searchbox',{name:'Buscar obras online'}).fill('Cicero');
  await page.getByRole('button',{name:'Buscar online'}).click();
  await page.getByRole('button',{name:'Cicero/De officiis'}).click();
  await expect(page.getByRole('textbox',{name:'Fragmento latino (editable)'}))
    .toHaveValue(/Quamquam te/);
  const content=page.getByRole('textbox',{name:'Fragmento latino (editable)'});
  await content.fill('Quamquam te, Marce fili, annum iam audientem Cratippum.');
  await page.getByRole('button',{name:'Añadir fragmento revisado'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await expect(page.locator('.edition-paper-title')).toContainText('Cicero/De officiis');
});
