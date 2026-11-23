import {test,expect} from '@playwright/test';

test('flujo directo: crear, pegar, guardar, + NUEVO cancelar, recuperar sin ficha vacía',async({page})=>{
  await page.goto('/?nuevo=1');
  await expect(page.getByRole('button',{name:'+ Crear cuaderno'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno prueba directa'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await expect(page.locator('.notebook-editor-head h2')).toHaveText('Cuaderno prueba directa');
  await expect(page.locator('.notebook-editor-head')).toContainText('0 textos');
  await page.getByRole('button',{name:'Pegar otro texto'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('César I 1');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Gallia est omnis divisa in partes tres.');
  await page.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.getByRole('button',{name:'+ NUEVO'}).click();
  await expect(page.locator('.notebook-editor-head')).toContainText('1 textos');
  await page.getByRole('button',{name:'Pegar otro texto'}).click();
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.reload();
  await page.getByRole('button',{name:'Abrir',exact:true}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await expect(page.locator('.edition-paper-title')).toContainText('César I 1');
});

test('el resumen gramatical se actualiza por cuaderno, sin modificar otro cuaderno',async({page})=>{
  await page.goto('/?nuevo=1');
  page.once('dialog',dialog=>dialog.accept('Primero'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Pegar otro texto'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('Texto A');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Caesar advenit.');
  await page.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const tags=page.locator('.notebook-editor-aside .simple-grammar');
  await tags.locator('summary').first().click();
  await tags.locator('.simple-tag-group > summary').filter({hasText:'Oraciones y construcciones'}).click();
  const utterance=tags.getByRole('checkbox',{name:'Ablativo absoluto'});
  await utterance.check();
  await expect(page.locator('.simple-grammar-summary')).toContainText('Ablativo absoluto');
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept('Segundo'));
  await page.getByRole('button',{name:'+ Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Biblioteca',exact:true}).click();
  await page.getByRole('button',{name:'Texto A',exact:true}).click();
  await expect(page.locator('.simple-grammar-summary')).not.toContainText('Ablativo absoluto');
  await page.reload();
  await expect(page.locator('.notebook-card')).toHaveCount(2);
});
