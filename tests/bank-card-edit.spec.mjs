import { expect, test } from '@playwright/test';

test('el margen superior coincide con la banda del título en los tres temas', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  for (const theme of ['light', 'dark', 'oled']) {
    await page.locator('#app-theme').selectOption(theme);
    const actual = await page.locator('header').evaluate(header => ({
      top: header.getBoundingClientRect().top,
      body: getComputedStyle(document.body).backgroundColor,
      title: getComputedStyle(header.querySelector('h1')).backgroundColor,
    }));
    expect(actual.top).toBe(44);
    expect(actual.body).toBe(actual.title);
  }
});

test('la tarjeta abre el editor directamente y Leer conserva el lector', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
  const modal = frame.locator('.modal').last();
  await modal.getByRole('textbox', { name: 'Título' }).fill('Texto de prueba');
  await modal.getByRole('textbox', { name: 'Texto latino' }).fill('Gallia est omnis divisa in partes tres.');
  await modal.getByRole('button', { name: 'Guardar en el banco' }).click();
  const card = bank.locator('.atl-bank-card');
  await card.click();
  await expect(modal.locator('.atl-bank-edit-form')).toBeVisible();
  await expect(modal.getByRole('textbox', { name: 'Texto latino' })).toHaveValue('Gallia est omnis divisa in partes tres.');
  await expect(frame.locator('.atl-bank-reader')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await bank.getByRole('button', { name: 'Leer «Texto de prueba»' }).click();
  await expect(frame.locator('.atl-bank-reader')).toBeVisible();
  await frame.getByRole('button', { name: 'Volver al listado' }).click();
});

test('el editor navega solo por resultados filtrados y protege los cambios', async ({page}) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', {name:'Banco de textos propios'});
  const modal = frame.locator('.modal').last();
  for(const [title,latin,author] of [
    ['A primero','Gallia est omnis divisa in partes tres.','César'],
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
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  await bank.locator('.atl-bank-card').filter({hasText:'A primero'}).click();
  await expect(modal.locator('.atl-edit-position')).toHaveText('1 de 2');
  await expect(modal.getByRole('button',{name:'Anterior',exact:true})).toBeDisabled();
  await modal.getByRole('button',{name:'Siguiente',exact:true}).click();
  await expect(modal.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('C tercero');
  await expect(modal.getByRole('button',{name:'Siguiente',exact:true})).toBeDisabled();
  await modal.getByRole('textbox',{name:'Título didáctico'}).fill('C corregido');
  page.once('dialog',dialog=>dialog.dismiss());
  await modal.getByRole('button',{name:'Anterior',exact:true}).click();
  await expect(modal.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('C corregido');
  page.once('dialog',dialog=>dialog.accept());
  await modal.getByRole('button',{name:'Anterior',exact:true}).click();
  await expect(modal.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('A primero');
  await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(bank.locator('.atl-bank-card').filter({hasText:'C corregido'})).toBeVisible();
});
