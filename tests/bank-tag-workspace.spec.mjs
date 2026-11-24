import {test,expect} from './isolated-bank.mjs';
test('etiquetado con texto y catálogo visibles, selección persistente y filtros', async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await bank.getByRole('button',{name:'Pegar en el banco'}).click();
 const modal=frame.locator('.modal').last();
 await modal.getByRole('textbox',{name:'Título',exact:true}).fill('Texto para etiquetar');
 await modal.getByRole('textbox',{name:'Texto latino',exact:true}).fill('Caesar, acceptis litteris, profectus est.');
 await modal.getByRole('button',{name:'Guardar en el banco'}).click();
 await bank.getByRole('button',{name:'Etiquetar «Texto para etiquetar»',exact:true}).click();
 await expect(modal).toHaveClass(/atl-bank-tag-modal/);
 await expect(modal.locator('.cuaderno-review-passage')).toContainText('acceptis litteris');
 await expect(modal.locator('.cuaderno-bank-manual')).toHaveAttribute('open','');
 const search=modal.getByRole('searchbox',{name:'Buscar etiqueta en el catálogo'});
 await search.fill('ablativo absoluto');
 const checkbox=modal.locator('.cuaderno-bank-tag-options').getByRole('checkbox',{name:/Ablativo absoluto/i}).first();
 await checkbox.check();
 await expect(modal.locator('.cuaderno-bank-current')).toContainText(/Ablativo absoluto/i);
 await modal.getByRole('button',{name:'Guardar etiquetas',exact:true}).click();
 await expect(modal).toBeHidden();
 await bank.getByRole('button',{name:'Etiquetar «Texto para etiquetar»',exact:true}).click();
 await expect(modal.locator('.cuaderno-bank-current')).toContainText(/Ablativo absoluto/i);
});

test('etiquetar recorre los resultados filtrados y guarda antes de avanzar', async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 const modal=frame.locator('.modal').last();
 for(const [title,latin,author] of [
  ['A primero','Caesar, acceptis litteris, profectus est.','César'],
  ['B excluido','Senatus populusque Romanus.','Cicerón'],
  ['C tercero','Caesar exercitum in Galliam ducit.','César']
 ]){
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  await modal.getByRole('textbox',{name:'Título',exact:true}).fill(title);
  await modal.getByRole('textbox',{name:'Autor',exact:true}).fill(author);
  await modal.getByRole('textbox',{name:'Texto latino',exact:true}).fill(latin);
  await modal.getByRole('button',{name:'Guardar en el banco'}).click();
 }
 await bank.getByRole('combobox',{name:'Filtrar textos por autor'}).selectOption({label:'César'});
 await bank.getByRole('button',{name:'Etiquetar «A primero»',exact:true}).click();
 await expect(modal.locator('.atl-edit-position')).toHaveText('1 de 2');
 await expect(modal.getByRole('button',{name:'Anterior',exact:true})).toBeDisabled();
 await modal.getByRole('searchbox',{name:'Buscar etiqueta en el catálogo'}).fill('ablativo absoluto');
 await modal.locator('.cuaderno-bank-tag-options').getByRole('checkbox',{name:/Ablativo absoluto/i}).first().check();
 page.once('dialog',dialog=>dialog.dismiss());
 await modal.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(modal.locator('.atl-tag-heading h3')).toHaveText('A primero');
 page.once('dialog',dialog=>dialog.accept());
 await modal.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(modal.locator('.atl-tag-heading h3')).toHaveText('C tercero');
 await expect(modal.locator('.atl-edit-position')).toHaveText('2 de 2');
 await expect(modal.getByRole('button',{name:'Siguiente',exact:true})).toBeDisabled();
 await modal.getByRole('button',{name:'Anterior',exact:true}).click();
 await expect(modal.locator('.atl-tag-heading h3')).toHaveText('A primero');
 await expect(modal.locator('.cuaderno-bank-current')).toContainText(/Ablativo absoluto/i);
});
