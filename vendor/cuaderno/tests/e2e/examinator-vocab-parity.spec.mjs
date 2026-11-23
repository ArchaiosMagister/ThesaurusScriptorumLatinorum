import {test,expect} from '@playwright/test';

test('Vocabulario Examinator2: modos, æ/œ, hiatos, cantidades y preferencias aisladas',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',d=>d.accept('Cuaderno ligaduras'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Diptongos comprobados');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill(
    'Caelum et proelium, poena et poeta.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  const heads=page.locator('#editor .edition-vocab-headword');
  await expect.poll(async()=>(await heads.evaluateAll(nodes=>nodes.map(node=>node.value))).join(' | '),
    {timeout:110000}).toContain('cælum');
  await expect.poll(async()=>(await heads.evaluateAll(nodes=>nodes.map(node=>node.value))).join(' | '),
    {timeout:110000}).toContain('prœl');
  await expect(page.locator('.edition-vocab-include:checked')).toHaveCount(0);
  await page.getByRole('button',{name:'Todo el texto'}).click();
  await expect(page.locator('.edition-vocab-include:checked')).not.toHaveCount(0);
  const names=await heads.evaluateAll(nodes=>nodes.map(node=>node.value));
  expect(names.some(x=>x.startsWith('pœna'))).toBe(true);
  expect(names.some(x=>x.startsWith('poeta')&&!x.startsWith('pœta'))).toBe(true);
  await expect(page.locator('.edition-paper .edition-latin')).toContainText('Caelum et proelium');
  await page.getByRole('combobox',{name:'Cantidades vocálicas'}).selectOption('ninguna');
  await expect.poll(async()=>(await heads.evaluateAll(nodes=>nodes.map(node=>node.value))).join(' | '),
    {timeout:110000}).toContain('pœna');
  await expect(page.getByRole('combobox',{name:'Cantidades vocálicas'})).toHaveValue('ninguna');
  await page.getByRole('button',{name:'Desmarcar todas'}).click();
  await expect(page.locator('.edition-vocab-include:checked')).toHaveCount(0);
  await page.getByRole('button',{name:'Marcar todas',exact:true}).click();
  await expect(page.locator('.edition-vocab-include:checked')).not.toHaveCount(0);
  const idx=(await heads.evaluateAll(nodes=>nodes.map(node=>node.value))).findIndex(x=>x.startsWith('pœna'));
  expect(idx).toBeGreaterThanOrEqual(0);
  const row=page.locator('.edition-vocab-row').nth(idx);
  await row.locator('.edition-vocab-meaning').fill('pena | castigo');
  await row.locator('.edition-vocab-save').click();
  await expect(row.locator('.edition-vocab-save')).toContainText('Guardado');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(
    'cuaderno-examinator.vocabulario.v1')||'[]').some(x=>
    x.headword.startsWith('pœna')&&x.meaning==='pena | castigo'))).toBe(true);
  await page.locator('#btnSave').click();
  await expect(page.getByText('Cuaderno guardado.',{exact:true})).toBeVisible();
  await page.reload();
  await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno ligaduras'})
    .getByRole('button',{name:'Abrir'}).click();
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.getByRole('combobox',{name:'Cantidades vocálicas'})).toHaveValue('ninguna');
  await expect.poll(async()=>(await heads.evaluateAll(nodes=>nodes.map(node=>node.value))).join(' | '),
    {timeout:45000}).toContain('pœna');
  expect(errors).toEqual([]);
});
