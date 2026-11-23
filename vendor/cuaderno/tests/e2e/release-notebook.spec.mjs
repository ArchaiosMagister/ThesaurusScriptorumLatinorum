import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

test('iPad: renombrar desde Cuadernos no cambia de editor ni modifica fichas',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/?nuevo=1');
  page.once('dialog',d=>d.accept('Cuaderno primero'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Pegar otro texto'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('Pasaje conservado');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Caesar Galliam vicit.');
  await page.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.getByRole('button',{name:'+ NUEVO'}).click();
  await page.getByRole('button',{name:'Cancelar y volver al texto'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  page.once('dialog',d=>d.accept('Cuaderno segundo'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  const before=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const editions=await new WorkspaceRepository().listEditions();
    return editions.find(e=>e.edition.title==='Cuaderno primero').edition;
  });
  const first=page.locator('.notebook-card').filter({hasText:'Cuaderno primero'});
  page.once('dialog',d=>d.accept('Cuaderno primero nuevo'));
  await first.getByRole('button',{name:'Renombrar'}).click();
  await expect(page.locator('.notebook-card').filter({hasText:'Cuaderno primero nuevo'})).toBeVisible();
  await page.getByRole('button',{name:'Editor',exact:true}).click();
  await expect(page.locator('.notebook-editor-head h2')).toHaveText('Cuaderno segundo');
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.locator('.notebook-card').filter({hasText:'Cuaderno primero nuevo'})
    .getByRole('button',{name:'Abrir'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  const after=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions())
      .find(e=>e.edition.title==='Cuaderno primero nuevo').edition;
  });
  assert.deepEqual(after.placements,before.placements);
  assert.equal(after.id,before.id);
  assert.equal(after.createdAt,before.createdAt);
});

test('borrar un cuaderno nuevo exige respaldo y no afecta a otro',async({page})=>{
  await page.goto('/?nuevo=1');
  page.once('dialog',d=>d.accept('Conservar'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  page.once('dialog',d=>d.accept('Eliminar'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  let dialogs=0;
  page.on('dialog',async d=>{dialogs++;await d.accept();});
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('.notebook-card').filter({has:page.getByRole('heading',{name:'Eliminar',exact:true})})
      .getByRole('button',{name:'Eliminar'}).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/copia-antes-de-eliminar-cuaderno-.*\.json/);
  await expect(page.locator('.notebook-card')).toHaveCount(1);
  expect(dialogs).toBe(2);
  await expect(page.locator('.notebook-card')).toContainText('Conservar');
  const persistent=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repo=new WorkspaceRepository();
    const editions=await repo.listEditions();
    return {editions,history:await repo.history(editions[0].edition.id)};
  });
  assert.equal(persistent.editions.length,1);
  assert.equal(persistent.history.length,1);
});

test('Cuaderno experimental: copia voluntaria y una confirmación para eliminar',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  for(const title of ['Conservar','Eliminar este']){
    page.once('dialog',dialog=>dialog.accept(title));
    await page.locator('#btnNew').click();
    await expect(page.locator('#editor .card')).toContainText(title);
  }
  await page.getByRole('button',{name:'Gestionar cuadernos',exact:true}).click();
  const backup=page.waitForEvent('download');
  await page.locator('.original-open-row').filter({hasText:'Conservar'})
    .getByRole('button',{name:'Hacer copia',exact:true}).click();
  expect((await backup).suggestedFilename()).toMatch(/^copia-cuaderno-.*\.json$/);
  const remove=page.getByRole('button',{name:'Eliminar cuaderno Eliminar este',exact:true});
  const dismissal=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());
  await Promise.all([dismissal,remove.click()]);
  await expect(remove).toBeVisible();
  let confirmations=0;
  const accept=async dialog=>{confirmations++;await dialog.accept();};
  page.on('dialog',accept);
  await remove.click();
  await expect(remove).toHaveCount(0);
  page.off('dialog',accept);
  expect(confirmations).toBe(1);
  const survivor=page.locator('.original-open-row').filter({hasText:'Conservar'});
  await survivor.getByRole('button',{name:'Abrir',exact:true}).click();
  await expect(page.locator('#editor .card')).toContainText('Conservar');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(page.locator('.cuaderno-home-card')).toHaveCount(1);
  await expect(page.locator('.cuaderno-home-card')).toHaveCount(1);
  await expect(page.locator('.cuaderno-home-card')).toContainText('Conservar');
});
