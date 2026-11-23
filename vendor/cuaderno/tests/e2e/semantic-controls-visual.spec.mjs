import {test,expect} from '@playwright/test';

test('controles semánticos: colores, guardado, pestañas y tamaños en WebKit',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:840});
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();

  const homeWord=page.getByRole('button',{name:'Importar Word al banco'});
  const homeAdd=page.getByRole('button',{name:'Pegar en el banco'});
  const homeRemove=page.getByRole('button',{name:'Quitar seleccionados'});
  await expect(homeWord).toHaveClass(/cuaderno-ui-word/);
  await expect(homeAdd).toHaveClass(/cuaderno-ui-add/);
  await expect(homeRemove).toHaveClass(/cuaderno-ui-remove/);
  await info.attach('controles-inicio',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});

  page.once('dialog',dialog=>dialog.accept('Cuaderno controles'));
  await page.locator('#btnNew').click();
  await expect(page.locator('#btnDocx')).toBeVisible();
  await expect(page.locator('#btnPdf')).toBeVisible();
  const exportColors=await page.locator('#btnDocx, #btnPdf').evaluateAll(items=>
    items.map(item=>({background:getComputedStyle(item).backgroundColor,color:getComputedStyle(item).color})));
  expect(exportColors[0].background).not.toBe(exportColors[1].background);
  expect(exportColors[0].color).toBe('rgb(255, 255, 255)');
  expect(exportColors[1].color).toBe('rgb(255, 255, 255)');

  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Prueba de colores');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar et poeta ad urbem veniunt.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  const vocabulary=tabs.getByRole('button',{name:'Vocabulario'});
  await vocabulary.click();
  await expect(vocabulary).toHaveAttribute('aria-current','page');
  await expect(tabs.getByRole('button',{name:'Texto'})).toHaveAttribute('aria-current','false');
  await expect(vocabulary).toHaveCSS('box-shadow',/inset/);

  const form=page.locator('#editor .edition-vocab-add');
  await form.locator('input').nth(0).fill('terra, -ae (f.)');
  await form.locator('input').nth(1).fill('tierra');
  const addEntry=form.getByRole('button',{name:'Añadir entrada'});
  await expect(addEntry).toHaveClass(/cuaderno-ui-add/);
  await addEntry.click();
  const index=await page.locator('#editor .edition-vocab-row').evaluateAll(rows=>
    rows.findIndex(row=>row.querySelector('input.edition-vocab-headword')?.value.startsWith('terra')));
  expect(index).toBeGreaterThanOrEqual(0);
  const preferred=page.locator('#editor .edition-vocab-row').nth(index);
  const save=preferred.locator('button.edition-vocab-save');
  await expect(save).toHaveText('Guardar');
  await expect(save).toHaveClass(/cuaderno-ui-save/);
  await expect(save).toBeVisible();
  await expect(save).toHaveCSS('width','84px');
  // Collatinus puede repintar filas justo después de añadir una entrada.
  // Esperar estilos reales del botón conectado, nunca leer un nodo retirado.
  const style=async()=>save.evaluate(element=>{
    if(!element.isConnected)return null;
    const css=getComputedStyle(element);
    return {width:css.width,bg:css.backgroundColor};
  }).catch(()=>null);
  await expect.poll(style).toMatchObject({width:'84px'});
  const before=await style();
  expect(before?.width).toBe('84px');
  await save.click();
  await expect(save).toHaveText('✓ Guardado');
  await expect(save).toHaveClass(/is-saved/);
  await expect.poll(style).toMatchObject({width:'84px'});
  const after=await style();
  expect(after?.width).toBe('84px');
  expect(after?.bg).not.toBe(before?.bg);
  // Las entradas vinculadas a Collatinus usan «Restablecer» en vez de «Quitar».
  const deleteEntry=page.locator('#editor button.edition-vocab-remove').first();
  if(await deleteEntry.count())await expect(deleteEntry).toHaveClass(/cuaderno-ui-remove/);

  await tabs.getByRole('button',{name:'Preguntas'}).click();
  const regeneration=page.locator('#editor button.cuaderno-ui-regen').first();
  await expect(regeneration).toBeVisible();

  for(const viewport of [
    {width:1280,height:840,name:'escritorio'},
    {width:820,height:1180,name:'ipad'},
    {width:390,height:844,name:'iphone'},
  ]){
    await page.setViewportSize(viewport);
    await tabs.getByRole('button',{name:'Vocabulario'}).click();
    const geometry=await tabs.getByRole('button').evaluateAll(buttons=>
      buttons.map(button=>button.getBoundingClientRect().width));
    expect(Math.max(...geometry)-Math.min(...geometry)).toBeLessThan(2);
    await expect(page.locator('.edition-vocab-save').last()).toHaveCSS('width','84px');
    await info.attach('controles-'+viewport.name,{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png',
    });
  }
  expect(errors).toEqual([]);
});
