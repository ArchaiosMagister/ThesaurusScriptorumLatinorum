import {test,expect} from '@playwright/test';

test('etiquetas por fragmento sobreviven a recarga y quedan en su cuaderno',async({page})=>{
  await page.goto('/?nuevo=1');
  page.once('dialog',d=>d.accept('Fragmentos A4'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Pegar otro texto'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('César');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Caesar Galliam vicit, cum milites secum duceret.');
  await page.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const panel=page.locator('.notebook-editor-aside .simple-grammar');
  await panel.locator('summary').first().click();
  await panel.getByText('Etiquetar fragmentos del texto (0)').click();
  const input=panel.getByRole('textbox',{name:'Seleccionar fragmento latino'});
  await input.evaluate(element=>{
    const textarea=element;
    const start=textarea.value.indexOf('cum milites');
    textarea.focus();textarea.setSelectionRange(start,start+'cum milites secum duceret'.length);
  });
  await panel.getByRole('combobox',{name:'Construcción del fragmento'}).selectOption('gram.cum.historico');
  await panel.getByRole('button',{name:'Etiquetar selección'}).click();
  await expect(page.locator('.simple-grammar-summary')).toContainText('Cum histórico');
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Abrir',exact:true}).click();
  await expect(page.locator('.simple-grammar-summary')).toContainText('Cum histórico');
});
