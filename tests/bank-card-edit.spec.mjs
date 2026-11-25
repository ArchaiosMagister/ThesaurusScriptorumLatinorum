import { expect, test } from './isolated-bank.mjs';

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

test('fallo de validación al navegar no deja un destino pendiente',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 const modal=frame.locator('.modal').last();
 for(const [title,latin] of [['A uno','Roma magna est.'],['B dos','Gallia clara est.']]){
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  await modal.getByRole('textbox',{name:'Título',exact:true}).fill(title);
  await modal.getByRole('textbox',{name:'Texto latino',exact:true}).fill(latin);
  await modal.getByRole('button',{name:'Guardar en el banco'}).click();
 }
 await bank.locator('.atl-bank-card').filter({hasText:'A uno'}).click();
 await modal.getByRole('textbox',{name:'Título didáctico'}).fill('');
 page.once('dialog',d=>d.accept());
 await modal.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(frame.locator('.toast').last()).toContainText('obligatorios');
 page.once('dialog',d=>d.accept());
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 await expect(modal).toBeHidden();
 await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
});

test('la ficha puede retirar dificultad y procedencia PAU sin restaurarlas al guardar',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await bank.getByRole('button',{name:'Pegar en el banco'}).click();
 const modal=frame.locator('.modal').last();
 await modal.getByRole('textbox',{name:'Título',exact:true}).fill('Clasificación reversible');
 await modal.getByRole('textbox',{name:'Texto latino',exact:true}).fill('Roma magna est.');
 await modal.getByRole('button',{name:'Guardar en el banco'}).click();
 await bank.locator('.atl-bank-card').click();
 await modal.getByRole('combobox',{name:'Dificultad docente'}).selectOption('5');
 await modal.getByRole('checkbox',{name:'Selectividad',exact:true}).check();
 await modal.getByRole('spinbutton',{name:'Año de Selectividad'}).fill('2026');
 await modal.getByRole('button',{name:'Guardar cambios'}).click();
 await bank.locator('.atl-bank-card').click();
 await expect(modal.getByRole('combobox',{name:'Dificultad docente'})).toHaveValue('5');
 await expect(modal.getByRole('checkbox',{name:'Selectividad',exact:true})).toBeChecked();
 await modal.getByRole('combobox',{name:'Dificultad docente'}).selectOption('');
 await modal.getByRole('checkbox',{name:'Selectividad',exact:true}).uncheck();
 await modal.getByRole('button',{name:'Guardar cambios'}).click();
 await bank.locator('.atl-bank-card').click();
 await expect(modal.getByRole('combobox',{name:'Dificultad docente'})).toHaveValue('');
 await expect(modal.getByRole('checkbox',{name:'Selectividad',exact:true})).not.toBeChecked();
});


test('el campo latino de la ficha crece y encoge según el texto y el ancho disponible', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  const modal = frame.locator('.modal').last();
  const shortText = 'Roma magna est.';
  const longText = Array(12).fill('Gallia est omnis divisa in partes tres.').join('\n');
  for (const [title, latin] of [['A breve', shortText], ['B extenso', longText]]) {
    await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(title);
    await modal.getByRole('textbox', { name: 'Texto latino', exact: true }).fill(latin);
    await modal.getByRole('button', { name: 'Guardar en el banco' }).click();
  }
  await bank.locator('.atl-bank-card').filter({ hasText: 'A breve' }).click();
  const latin = modal.getByRole('textbox', { name: 'Texto latino', exact: true });
  const dimensions = () => latin.evaluate(node => ({
    height: node.getBoundingClientRect().height,
    overflow: node.scrollHeight - node.clientHeight
  }));
  await expect.poll(async () => (await dimensions()).height).toBeLessThan(115);
  const shortHeight = (await dimensions()).height;
  await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(latin).toHaveValue(longText);
  await expect.poll(async () => (await dimensions()).height).toBeGreaterThan(shortHeight + 100);
  await expect.poll(async () => (await dimensions()).overflow).toBeLessThanOrEqual(2);
  await latin.fill(shortText);
  await expect.poll(async () => (await dimensions()).height).toBeLessThan(115);
  const wrapped = Array(12).fill('Gallia est omnis divisa in partes tres.').join(' ');
  await latin.fill(wrapped);
  const wideHeight = (await dimensions()).height;
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await dimensions()).height).toBeGreaterThan(wideHeight);
  await expect.poll(async () => (await dimensions()).overflow).toBeLessThanOrEqual(2);
});


test('Selectividad: marcar hecho, filtrar, conservar al recargar y reiniciar todos', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  const modal = frame.locator('.modal').last();
  for (const [title, latin, pau] of [['A PAU','Roma magna est.',true], ['B PAU','Gallia clara est.',true], ['C ordinario','Italia pulchra est.',false]]) {
    await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(title);
    await modal.getByRole('textbox', { name: 'Texto latino', exact: true }).fill(latin);
    await modal.getByRole('button', { name: 'Guardar en el banco' }).click();
    if (pau) {
      await bank.locator('.atl-bank-card').filter({ hasText: title }).click();
      await modal.getByRole('checkbox', { name: 'Selectividad', exact: true }).check();
      await modal.getByRole('button', { name: 'Guardar cambios' }).click();
    }
  }
  const first = bank.getByRole('checkbox', { name: 'Hecho: A PAU' });
  const second = bank.getByRole('checkbox', { name: 'Hecho: B PAU' });
  await expect(bank.getByRole('checkbox', { name: 'Hecho: C ordinario' })).toHaveCount(0);
  await first.check();
  await expect(first).toBeChecked();
  await second.check();
  await page.reload();
  await expect(first).toBeChecked();
  await expect(second).toBeChecked();
  await bank.getByRole('button', { name: 'Más filtros' }).click();
  const progress = bank.getByRole('combobox', { name: 'Filtrar por estado de Selectividad' });
  await progress.selectOption('done');
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  const reset = bank.getByRole('button', { name: 'Reiniciar todos los «Hecho»' });
  page.once('dialog', d => d.dismiss());
  await reset.click();
  await expect(first).toBeChecked();
  page.once('dialog', d => d.accept());
  await reset.click();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(0);
  await progress.selectOption('todo');
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  await expect(first).not.toBeChecked();
  await expect(second).not.toBeChecked();
});

test('los filtros gramaticales se ajustan a la pantalla estrecha sin desbordar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const bank = page.frameLocator('#panel-cuaderno iframe').getByRole('region', { name: 'Banco de textos propios' });
  await bank.getByRole('button', { name: 'Más filtros' }).click();
  const panel = bank.locator('.atl-grammar-filters');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  const groups = panel.locator('.atl-filter-family');
  await expect(groups.first()).toBeVisible();
  await panel.getByRole('searchbox', { name: 'Buscar etiquetas gramaticales' }).fill('ablativo absoluto');
  await expect(panel.getByRole('checkbox', { name: 'Ablativo absoluto', exact: true })).toBeVisible();
  await panel.getByRole('checkbox', { name: 'Ablativo absoluto', exact: true }).check();
  await expect(panel.getByRole('checkbox', { name: 'Ablativo absoluto', exact: true })).toBeChecked();
});
