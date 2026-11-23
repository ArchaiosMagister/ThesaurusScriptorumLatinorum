import { test, expect } from '@playwright/test';

/** Selecciona caracteres reales mediante Range, igual que el mecanismo nativo de Safari. */
async function selectText(page, startLine, startOffset, endLine, endOffset) {
  await page.evaluate(({ startLine, startOffset, endLine, endOffset }) => {
    const lines = Array.from(document.querySelectorAll('.reader-latin'));
    const first = lines[startLine].firstChild;
    const last = lines[endLine].firstChild;
    const range = document.createRange();
    range.setStart(first, startOffset);
    range.setEnd(last, endOffset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, { startLine, startOffset, endLine, endOffset });
}


test('biblioteca Examinator: buscar, elegir pasajes y guardarlos en un cuaderno', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  const author = page.getByRole('combobox', { name: 'Filtrar por autor' });
  await author.selectOption('Julio César');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(2);
  await page.locator('.lib-sidebar .work-row').filter({hasText:'De bello Gallico'}).click();
  await expect(page.locator('.lib-reader .reader-work')).toContainText('De bello Gallico');

  const add = page.getByRole('button', { name: 'Añadir selección a mis textos' });
  await expect(add).toBeDisabled();
  await selectText(page, 0, 0, 1, 30);
  await expect(page.locator('.selection-description')).toContainText('palabras seleccionadas');
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByRole('heading', { name: 'Nuevo texto' })).toBeVisible();
  const latin = await page.locator('.editor-form textarea').inputValue();
  expect(latin.split(/\s+/).length).toBeGreaterThan(6);
  await page.getByRole('button', { name: 'Guardar texto' }).click();
  await expect(page.locator('#phase2-status')).toContainText('Cambios guardados');

  await page.getByRole('button',{name:'Cuadernos'}).click();
  await page.getByPlaceholder('Nombre del cuaderno').fill('Cuaderno de prueba');
  await page.getByRole('button',{name:'Crear cuaderno'}).click();
  await page.getByRole('button',{name:'Añadir texto'}).click();
  await expect(page.locator('.notebook-contents li')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.getByRole('button',{name:'Mis textos'}).click();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Cuadernos'}).click();
  await expect(page.locator('.notebook-contents li')).toHaveCount(1);
});

test('tres autores y navegación por cita', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  const author=page.getByRole('combobox',{name:'Filtrar por autor'});
  await author.selectOption('Cornelio Nepote');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(25);
  await page.locator('.lib-sidebar .work-row').filter({hasText:'Miltiades'}).first().click();
  await expect(page.locator('.lib-reader .reader-work')).toContainText('Miltiades');
  await page.getByRole('textbox',{name:'Ir a pasaje'}).fill('2.1');
  await page.getByRole('button',{name:'Ir a',exact:true}).click();
  await expect(page.locator('.reader-line[data-c="2.1"]')).toHaveCount(1);

  await author.selectOption('Eutropio');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await page.locator('.lib-sidebar .work-row').first().click();
  await expect(page.locator('.lib-reader .reader-work')).toContainText('Breviarium');
});

test('la caché offline incluye realmente las 28 obras completas y el arranque', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.locator('.offline-indicator')).toContainText('preparada sin conexión');
  // WebKit CI no permite comprobar una navegación offline real con el Inspector:
  // setOffline interrumpe el navegador antes de que responda el Service Worker.
  // Sí podemos verificar que los archivos están almacenados, íntegros y accesibles
  // mediante la CacheStorage del navegador SIN utilizar la red.
  await page.context().setOffline(true);
  const result = await page.evaluate(async () => {
    const base = new URL('./', document.location.href);
    const catalogResponse = await caches.match(new URL('library/catalog.json', base));
    if (!catalogResponse) return { error: 'Catálogo no encontrado en caché' };
    const catalog = await catalogResponse.json();
    const authors = new Set();
    let checked = 0;
    for (const entry of catalog.works) {
      const response = await caches.match(new URL('library/' + entry.file, base));
      if (!response) return { error: 'Falta en caché ' + entry.file };
      const work = await response.json();
      if (work.urn !== entry.urn || !work.lines.length) {
        return { error: 'Contenido incompatible: ' + entry.file };
      }
      authors.add(work.author);
      checked++;
    }
    const shell = await caches.match(new URL('index.html', base));
    return { checked, authors:[...authors].sort(), shell:Boolean(shell) };
  });
  expect(result).toEqual({
    checked: 28,
    authors: ['Cornelio Nepote','Eutropio','Julio César'],
    shell: true,
  });
});

test('la biblioteca funciona montada en la subcarpeta de GitHub Pages', async ({ page }) => {
  await page.goto('/CuadernoTextosLatinos/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.getByRole('combobox',{name:'Filtrar por autor'}).selectOption('Julio César');
  await page.locator('.lib-sidebar .work-row').filter({hasText:'De bello Gallico'}).click();
  await expect(page.locator('.reader-line').first()).toBeVisible();
  await expect(page.locator('.lib-reader .reader-work')).toContainText('De bello Gallico');
  const paths = await page.evaluate(async()=>{
    const response=await fetch('./library/catalog.json');
    return { status:response.status, pathname:new URL('./library/catalog.json',location.href).pathname };
  });
  expect(paths).toEqual({status:200,pathname:'/CuadernoTextosLatinos/library/catalog.json'});
});

test('selecciona exactamente parte de una frase sin copiar la referencia', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.locator('.lib-sidebar .work-row').filter({ hasText: 'De bello Gallico' }).click();
  const add = page.getByRole('button', { name: 'Añadir selección a mis textos' });
  await expect(add).toBeDisabled();
  const index = await page.evaluate(() => Array.from(document.querySelectorAll('.reader-latin'))
    .findIndex(node => node.textContent.length > 60));
  expect(index).toBeGreaterThanOrEqual(0);
  const expected = await page.locator('.reader-latin').nth(index).evaluate(node => node.textContent.slice(7, 35).trim());
  const cite = await page.locator('.reader-ref').nth(index).textContent();
  await selectText(page, index, 7, index, 35);
  await expect(add).toBeEnabled();
  await expect(page.locator('.selection-description')).toContainText(cite);
  await add.click();
  await expect(page.locator('.editor-form textarea')).toHaveValue(expected);
  await expect(page.locator('.editor-form input').nth(3)).toHaveValue(cite);
});

test('selección nativa que abarca cuatro pasajes y empieza y termina a mitad de frase', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.locator('.lib-sidebar .work-row').filter({ hasText: 'De bello Gallico' }).click();
  // showWork carga el JSON de forma asíncrona: esperar al lector, no asumir
  // que estará listo tras pulsar una obra.
  await expect(page.locator('.reader-latin').nth(3)).toHaveCount(1);
  const index = await page.evaluate(() => Array.from(document.querySelectorAll('.reader-latin'))
    .findIndex((node,i,arr) => node.textContent.length > 60
      && i + 3 < arr.length && arr[i+3].textContent.length > 30));
  expect(index).toBeGreaterThanOrEqual(0);
  const expected = await page.evaluate((first) => {
    const spans = Array.from(document.querySelectorAll('.reader-latin')).slice(first, first + 4);
    const contents = spans.map(node=>node.textContent);
    return [contents[0].slice(15),contents[1],contents[2],contents[3].slice(0,18)]
      .map(part=>part.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }, index);
  const refs = await page.locator('.reader-ref').allTextContents();
  await selectText(page, index, 15, index + 3, 18);
  const add = page.getByRole('button', { name: 'Añadir selección a mis textos' });
  await expect(add).toBeEnabled();
  await expect(page.locator('.selection-description')).toContainText(refs[index]+'–'+refs[index+3]);
  await add.click();
  await expect(page.locator('.editor-form textarea')).toHaveValue(expected);
  for (const ref of refs.slice(index,index+4)) {
    expect(expected.includes(ref+' ')).toBe(false);
  }
});

test('la selección fuera del lector no activa el botón de incorporación', async ({ page }) => {
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.locator('.lib-sidebar .work-row').filter({ hasText: 'De bello Gallico' }).click();
  const add = page.getByRole('button',{ name:'Añadir selección a mis textos' });
  await expect(add).toBeDisabled();
  await page.evaluate(() => {
    const other = document.querySelector('.reader-work').firstChild;
    const range = document.createRange();
    range.selectNodeContents(other);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(add).toBeDisabled();
});

test('la portada abre la biblioteca independiente y filtra los textos guardados por referencia', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', {name:'Biblioteca de textos'}).click();
  await expect(page).toHaveURL(/biblioteca=1/);
  const status = page.locator('#phase2-status');
  await expect(status).toContainText('Biblioteca cargada');

  const editor = page.locator('.editor-form');
  for (const [title, author, work, reference] of [
    ['Primer pasaje', 'Julio César', 'De bello Gallico', '1.1'],
    ['Segundo pasaje', 'Cornelio Nepote', 'Miltiades', '2.1'],
  ]) {
    await page.getByRole('button', {name:'Nuevo texto', exact:true}).click();
    await editor.getByLabel('Título', {exact:true}).fill(title);
    await editor.getByLabel('Autor', {exact:true}).fill(author);
    await editor.getByLabel('Obra', {exact:true}).fill(work);
    await editor.getByLabel('Libro, capítulo o pasaje', {exact:true}).fill(reference);
    await editor.getByLabel('Texto latino', {exact:true}).fill('Gallia est omnis divisa.');
    await editor.getByRole('button', {name:'Guardar texto'}).click();
    await expect(status).toContainText('Cambios guardados');
  }

  await page.reload();
  await expect(status).toContainText('Biblioteca cargada');
  const rows = page.locator('.lib-sidebar .work-row');
  await expect(rows).toHaveCount(2);
  await page.getByText('Filtrar por referencia bibliográfica', {exact:true}).click();
  await page.getByRole('textbox', {name:'Filtrar por Autor', exact:true}).fill('cesar');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Primer pasaje');
  await page.getByRole('textbox', {name:'Filtrar por Obra', exact:true}).fill('Miltiades');
  await expect(rows).toHaveCount(0);
  await page.getByRole('textbox', {name:'Filtrar por Autor', exact:true}).clear();
  await page.getByRole('textbox', {name:'Filtrar por Libro, capítulo o pasaje', exact:true}).fill('2.1');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Segundo pasaje');
});

test('importar un TXT crea un borrador y conserva los textos existentes', async ({ page }) => {
  await page.goto('/?biblioteca=1');
  const form = page.locator('.editor-form');
  const status = page.locator('#phase2-status');
  await expect(status).toContainText('Biblioteca cargada');
  await form.getByLabel('Título', {exact:true}).fill('Texto anterior');
  await form.getByLabel('Texto latino', {exact:true}).fill('Gallia est omnis divisa.');
  await form.getByRole('button', {name:'Guardar texto'}).click();
  await expect(status).toContainText('Cambios guardados');
  await page.locator('.lib-sidebar input[type=file]').setInputFiles({
    name: 'Nepote.txt', mimeType: 'text/plain', buffer: Buffer.from('Magnā cum cūrā.')
  });
  await expect(form.getByLabel('Título', {exact:true})).toHaveValue('Nepote');
  await expect(form.getByLabel('Texto latino', {exact:true})).toHaveValue('Magnā cum cūrā.');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await form.getByRole('button', {name:'Guardar texto'}).click();
  await expect(status).toContainText('Cambios guardados');
  await page.reload();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(2);
});

test('la biblioteca conserva las notas y el vocabulario y permite filtrar la revisión', async ({ page }) => {
  await page.goto('/?biblioteca=1');
  const form = page.locator('.editor-form').first();
  const status = page.locator('#phase2-status');
  await expect(status).toContainText('Biblioteca cargada');
  await form.getByLabel('Título', {exact:true}).fill('Pasaje revisado');
  await form.getByLabel('Texto latino', {exact:true}).fill('Milites veniunt.');
  await form.getByLabel('Notas del texto', {exact:true}).fill('Contexto de la campaña.');
  await form.getByText('Vocabulario del texto', {exact:true}).click();
  await form.getByRole('button', {name:'Añadir entrada de vocabulario'}).click();
  await form.getByLabel('Lema', {exact:true}).fill('miles');
  await form.getByLabel('Enunciado', {exact:true}).fill('miles, militis');
  await form.getByLabel('Significado', {exact:true}).fill('soldado');
  await form.getByLabel('Etiquetas revisadas', {exact:true}).check();
  await form.getByRole('button', {name:'Guardar texto'}).click();
  await expect(status).toContainText('Cambios guardados');
  await page.reload();
  const filter = page.getByLabel('Filtrar por estado de revisión');
  await filter.selectOption('pending');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(0);
  await filter.selectOption('reviewed');
  await page.getByRole('button', {name:'Pasaje revisado'}).click();
  await expect(form.getByLabel('Notas del texto', {exact:true})).toHaveValue('Contexto de la campaña.');
  await form.getByText('Vocabulario del texto', {exact:true}).click();
  await expect(form.getByLabel('Significado', {exact:true})).toHaveValue('soldado');
  await form.getByLabel('Texto latino', {exact:true}).fill('Milites veniebant.');
  await expect(form.getByLabel('Etiquetas revisadas', {exact:true})).not.toBeChecked();
});
