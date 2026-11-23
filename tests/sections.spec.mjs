import { expect, test } from '@playwright/test';

const path = '/ThesaurusScriptorumLatinorum/';

test('arrancan los tres módulos reales y se conserva el editor al cambiar de pestaña', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(path);
  await expect(page.getByRole('tab', { name: 'Banco de textos' })).toHaveAttribute('aria-selected', 'true');
  const tabRows = await page.getByRole('tablist', { name: 'Secciones' }).getByRole('tab')
    .evaluateAll(tabs => tabs.map(tab => Math.round(tab.getBoundingClientRect().top)));
  expect(new Set(tabRows).size).toBe(1);
  const notebookFrame = page.locator('#panel-cuaderno iframe');
  const notebook = notebookFrame.contentFrame();
  const bank = notebook.getByRole('region', { name: 'Banco de textos propios' });
  await expect(bank.getByRole('button', { name: 'Importar Word al banco' })).toBeVisible();
  await expect(bank.getByRole('button', { name: 'Auditar textos repetidos' })).toBeVisible();
  await expect(notebook.getByRole('heading', { name: 'Mis cuadernos' })).toBeHidden();
  await expect(notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true, includeHidden: true })).toBeHidden();
  await expect(notebook.getByText('Copia integral del espacio de trabajo', { exact: true })).toBeHidden();
  await expect(notebook.locator('#editor > .cuaderno-home:not(.atl-bank)')).toHaveAttribute('hidden', '');
  await expect(page.locator('#panel-examinator iframe')).toHaveCount(0);

  const originalNotebookFrame = await notebookFrame.elementHandle();
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await expect(notebook.getByRole('heading', { name: 'Mis cuadernos', exact: true })).toBeVisible();
  await expect(bank).toBeHidden();
  expect(await notebookFrame.evaluate((node, original) => node === original, originalNotebookFrame)).toBe(true);

  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await expect(exam.locator('#btnSave')).toBeAttached();
  await expect.poll(() => exam.locator('html').evaluate(() => Boolean(window.M?.S))).toBe(true);
  const originalFrame = await page.locator('#panel-examinator iframe').elementHandle();
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await page.getByRole('tab', { name: 'Examinator' }).click();
  expect(await page.locator('#panel-examinator iframe').evaluate((node, original) => node === original, originalFrame)).toBe(true);
  expect(errors).toEqual([]);
});

test('el banco conserva la búsqueda al cambiar de pestaña y permite guardar textos sin cuaderno', async ({ page }) => {
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  const bank = notebook.getByRole('region', { name: 'Banco de textos propios' });
  const wordPicker = page.waitForEvent('filechooser');
  await bank.getByRole('button', { name: 'Importar Word al banco' }).click();
  expect(await (await wordPicker).element().getAttribute('accept')).toContain('.docx');
  await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
  const modal = notebook.locator('.modal').last();
  await modal.getByRole('textbox', { name: 'Título' }).fill('Comienzo de la guerra de las Galias');
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await expect(modal).toBeHidden();
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(modal.getByRole('textbox', { name: 'Título' })).toHaveValue('Comienzo de la guerra de las Galias');
  await modal.getByRole('textbox', { name: 'Texto latino' }).fill('Gallia est omnis divisa in partes tres.');
  await modal.getByRole('button', { name: 'Guardar en el banco' }).click();
  const search = bank.getByRole('searchbox');
  await expect(bank.getByText('1 texto distinto', { exact: true })).toBeVisible();
  await search.fill('Gallia');
  await expect(bank.getByText('Comienzo de la guerra de las Galias', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await expect(bank).toBeHidden();
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(search).toHaveValue('Gallia');
});

test('las pestañas se pueden seleccionar mediante teclado y volver con el historial', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Banco de textos' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#cuadernos$/);
  await expect(page.getByRole('tab', { name: 'Cuadernos' })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Banco de textos' })).toHaveAttribute('aria-selected', 'true');
});

test('un pasaje de la biblioteca se guarda en el banco y el cuaderno abierto se conserva', async ({ page }) => {
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  const bank = notebook.getByRole('region', { name: 'Banco de textos propios' });
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  page.once('dialog', dialog => dialog.accept('Lecturas de latín'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  const edition = notebook.getByRole('combobox', { name: 'Elegir cuaderno' });
  await expect(edition).toBeVisible();
  const editionId = await edition.inputValue();
  expect(editionId).not.toBe('');

  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(edition).toBeHidden();
  await expect(notebook.locator('#preview')).toBeHidden();
  await bank.getByRole('button', { name: 'Biblioteca latina' }).click();
  const library = notebook.locator('#lib');
  await expect(library.getByRole('button', { name: 'Volver al banco' })).toBeVisible();
  await library.locator('.atl-library-author[data-author="César"] > summary').click();
  await library.locator('.lrow').filter({ hasText: 'Bellum Gallicum' }).click();
  const line = library.locator('.rtext .rx').first();
  await expect(line).toBeVisible();
  await line.evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await library.getByRole('button', { name: 'Guardar en el banco' }).click();
  await expect(bank.getByText('1 texto distinto', { exact: true })).toBeVisible();
  const count = bank.getByRole('status').first();
  await bank.getByText('Autor, obra y otros filtros', { exact: true }).click();
  const origin = bank.getByRole('combobox', { name: 'Filtrar textos por procedencia' });
  const usage = bank.getByRole('combobox', { name: 'Filtrar textos por uso' });
  await origin.selectOption('own');
  await expect(count).toContainText('Mostrando 0 de 1');
  await origin.selectOption('library');
  await usage.selectOption('unused');
  await expect(count).toContainText('Mostrando 1 de 1');
  await usage.selectOption('used');
  await expect(count).toContainText('Mostrando 0 de 1');

  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await expect(edition).toHaveValue(editionId);
  await expect(bank).toBeHidden();
  await notebook.getByRole('button', { name: 'Banco propio', exact: true }).click();
  await notebook.locator('.original-bank-picker').getByRole('button', { name: /^Añadir «/ }).click();
  await expect(notebook.locator('.original-bank-picker')).toBeHidden();
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(origin).toHaveValue('library');
  await expect(usage).toHaveValue('used');
  await expect(count).toContainText('Mostrando 1 de 1');
  await expect(bank.getByText('Usado en documentos', { exact: true })).toBeVisible();
});

async function seedBank(page) {
  const frame = page.frameLocator('#panel-cuaderno iframe');
  await frame.getByRole('button', { name: 'Importar Word al banco' }).waitFor();
  await frame.locator('html').evaluate(async () => {
    const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
    const { WorkspaceRepository } = await import('../storage/workspace-repository.js');
    const { upsertText } = await import('../core/editor-operations.js');
    const { attachGrammarTags } = await import('../core/grammar-tags.js');
    const repository = new IndexedDbCorpusRepository();
    const before = await repository.load();
    const workspace = new WorkspaceRepository();
    const workspaceBefore = await workspace.loadCorpus();
    const time = '2026-11-22T09:00:00.000Z';
    const absolute = 'gram.ablativo.absoluto';
    const participle = 'gram.participio';
    const examples = [
      ['Uno', 'Prima lux orta est.', '10', 'Bellum Gallicum', [absolute, participle]],
      ['Dos', 'Secunda lux orta est.', '2', 'Bellum Gallicum', [absolute, participle]],
      ['Tres', 'Tertia lux orta est.', '3', 'Bellum Gallicum', [absolute]],
      ['Cuatro', 'Quarta lux orta est.', '4', 'Bellum Civile', [absolute, participle]]
    ];
    let corpus = before.corpus;
    let editorial = workspaceBefore.corpus;
    for (const [title, latin, reference, work, tags] of examples) {
      const id = 'doc.' + title.toLowerCase();
      const draft = { title, latin, reference, work, author: 'César' };
      if (title === 'Cuatro') editorial = attachGrammarTags(upsertText(editorial, { ...draft, origin: undefined }, id, time), id, tags);
      else corpus = attachGrammarTags(upsertText(corpus, draft, id, time), id, tags);
    }
    await repository.save(corpus, before.revision);
    await workspace.saveCorpus(editorial, workspaceBefore.revision);
  });
  await page.reload();
  await frame.getByText('4 textos distintos', { exact: true }).waitFor();
  return frame;
}

test('el lector combina obra, búsqueda y etiquetas y recorre el orden de referencias', async ({ page }) => {
  await page.goto(path);
  const frame = await seedBank(page);
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  await bank.getByText('Autor, obra y otros filtros', { exact: true }).click();
  await bank.getByRole('combobox', { name: 'Filtrar textos por procedencia' }).selectOption('unknown');
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 1 de 4');
  await bank.getByRole('combobox', { name: 'Filtrar textos por procedencia' }).selectOption('');
  await bank.getByRole('combobox', { name: 'Filtrar textos por obra' }).selectOption('Bellum Gallicum');
  await bank.getByRole('searchbox').fill('lux');
  await bank.locator('.atl-grammar-filters > summary').click();
  for (const label of ['Ablativo absoluto', 'Participio concertado']) {
    const checkbox = bank.getByRole('checkbox', { name: label, exact: true, includeHidden: true });
    await checkbox.evaluate(node => {
      for (let group = node.closest('details'); group; group = group.parentElement.closest('details')) group.open = true;
    });
    await checkbox.check();
  }
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 2 de 4');
  await expect(bank.locator('.atl-bank-group').getByRole('heading', { name: 'César', exact: true })).toBeVisible();
  await expect(bank.locator('.atl-bank-work').getByRole('heading', { name: 'Bellum Gallicum', exact: true })).toBeVisible();
  const reference = bank.getByRole('textbox', { name: 'Filtrar textos por referencia' });
  await reference.fill('2');
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 1 de 4');
  await reference.clear();
  await bank.getByRole('button', { name: /^Dos / }).click();
  const reader = frame.locator('.atl-bank-reader');
  await expect(reader.getByRole('status')).toHaveText('1 de 2');
  await expect(reader.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled();
  await reader.getByRole('button', { name: 'Siguiente' }).click();
  await expect(reader.getByRole('heading', { name: 'Uno' })).toBeVisible();
  await expect(reader.getByRole('status')).toHaveText('2 de 2');
  await frame.getByRole('button', { name: 'Volver al listado' }).click();
  await expect(bank.getByRole('searchbox')).toHaveValue('lux');
  await bank.getByRole('combobox', { name: 'Coincidencia gramatical' }).selectOption('any');
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 3 de 4');
});

test('Examinator importa una copia del texto y mantiene el acceso a Perseus', async ({ page }) => {
  await page.goto(path);
  const bankFrame = await seedBank(page);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Banco de textos…' }).click();
  await expect(exam.getByRole('button', { name: /^Cuatro / })).toBeVisible();
  await exam.getByRole('searchbox', { name: 'Buscar en el banco de textos' }).fill('Secunda');
  await exam.getByRole('button', { name: /^Dos / }).click();
  await expect(exam.locator('[data-k="texto"]')).toHaveValue('Secunda lux orta est.');
  await expect(exam.locator('[data-k="titulo"]')).toHaveValue('Dos');
  await expect(exam.locator('[data-k="refCita"]')).toHaveValue('2');
  await expect.poll(() => exam.locator('html').evaluate(() => window.M.S.atlBankSource?.id)).toBe('doc.dos');
  await expect(exam.getByRole('button', { name: 'Elegir un fragmento…' })).toBeVisible();

  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await bankFrame.getByRole('button', { name: /^Dos / }).click();
  await bankFrame.getByRole('button', { name: 'Editar ficha' }).click();
  const dialog = bankFrame.locator('.modal').last();
  await dialog.getByRole('textbox', { name: 'Texto latino' }).fill('Roma clara est et antiqua.');
  await dialog.getByRole('button', { name: /guardar/i }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'Examinator' }).click();
  await expect(exam.locator('[data-k="texto"]')).toHaveValue('Secunda lux orta est.');
  await expect.poll(() => exam.locator('html').evaluate(() =>
    navigator.serviceWorker.controller?.scriptURL.endsWith('/ThesaurusScriptorumLatinorum/sw.js'))).toBe(true);
  await page.context().setOffline(true);
  try {
    await exam.getByRole('button', { name: 'Banco de textos…' }).click();
    await exam.getByRole('searchbox', { name: 'Buscar en el banco de textos' }).fill('Roma clara');
    await expect(exam.getByRole('button', { name: /^Dos / })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});

test('el control de actualización de la cabecera comprueba la PWA unificada', async ({ page }) => {
  await page.goto(path);
  const frame = page.frameLocator('#panel-cuaderno iframe');
  await frame.getByRole('button', { name: 'Importar Word al banco' }).waitFor();
  const update = page.getByRole('button', { name: 'Actualizar', exact: true });
  await expect(update).toBeVisible();
  await update.click();
  await expect(page.locator('#app-status')).toContainText(/actualizada|actualización|versión/i);
});

async function notebookSnapshot(frame, title) {
  return frame.locator('html').evaluate(async (_, name) => {
    const { WorkspaceRepository } = await import('../storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).find(item => item.edition.title === name);
  }, title);
}

test('Cuadernos incorpora varios pasajes y actualiza solo la copia elegida', async ({ page }) => {
  await page.goto(path);
  const frame = await seedBank(page);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  page.once('dialog', dialog => dialog.accept('Lecturas compartidas'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await frame.getByRole('button', { name: 'Banco propio', exact: true }).click();
  const picker = frame.locator('.original-bank-picker');
  await picker.getByRole('checkbox', { name: 'Seleccionar «Uno»' }).check();
  await picker.getByRole('searchbox', { name: 'Buscar textos guardados' }).fill('Secunda');
  await picker.getByRole('checkbox', { name: 'Seleccionar «Dos»' }).check();
  await picker.getByRole('button', { name: 'Añadir seleccionados (2)' }).click();
  await expect(picker).toBeHidden();
  const before = await notebookSnapshot(frame, 'Lecturas compartidas');
  expect(before.edition.placements.map(item => item.source.sourceId)).toEqual(['doc.uno', 'doc.dos']);
  expect(before.edition.placements[1].grammaticalTagIds).toContain('gram.ablativo.absoluto');

  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await frame.getByRole('button', { name: /^Dos / }).click();
  await frame.getByRole('button', { name: 'Editar ficha' }).click();
  const dialog = frame.locator('.modal').last();
  await dialog.getByRole('textbox', { name: 'Texto latino' }).fill('Secunda lux iterum orta est.');
  await dialog.getByRole('button', { name: /guardar/i }).click();
  await expect(dialog).toBeHidden();
  expect(await notebookSnapshot(frame, 'Lecturas compartidas')).toEqual(before);

  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const refresh = frame.getByRole('button', { name: 'Actualizar desde el banco' });
  page.once('dialog', prompt => prompt.dismiss());
  await refresh.click();
  expect(await notebookSnapshot(frame, 'Lecturas compartidas')).toEqual(before);
  page.once('dialog', prompt => prompt.accept());
  await refresh.click();
  await expect.poll(async () =>
    (await notebookSnapshot(frame, 'Lecturas compartidas')).edition.placements[1].text.latin
  ).toBe('Secunda lux iterum orta est.');
  const after = await notebookSnapshot(frame, 'Lecturas compartidas');
  expect(after.revision).toBeGreaterThan(before.revision);
  expect(after.edition.placements[0]).toEqual(before.edition.placements[0]);
  expect(after.edition.placements[1].questions).toEqual(before.edition.placements[1].questions);
  expect(after.edition.placements[1].vocabulary).toEqual(before.edition.placements[1].vocabulary);
  expect(after.edition.placements[1].grammaticalTagIds).toEqual(before.edition.placements[1].grammaticalTagIds);

  await frame.locator('.edition-menu-nav').getByRole('button', { name: 'Organizar cuaderno', exact: true }).click();
  const position = frame.getByRole('combobox', { name: 'Posición de Dos', exact: true });
  await position.selectOption('0');
  await expect(position).toBeFocused();
  await expect.poll(async () =>
    (await notebookSnapshot(frame, 'Lecturas compartidas')).edition.placements.map(item => item.source.sourceId)
  ).toEqual(['doc.dos', 'doc.uno']);
  const firstRow = frame.locator('.edition-notebook-row').filter({ hasText: 'Dos' });
  await firstRow.getByRole('button', { name: 'Editar «Dos»' }).click();
  await expect(frame.locator('.edition-menu-text textarea')).toHaveValue('Secunda lux iterum orta est.');
  await frame.locator('.edition-menu-nav').getByRole('button', { name: 'Organizar cuaderno', exact: true }).click();
  page.once('dialog', prompt => prompt.dismiss());
  await firstRow.getByRole('button', { name: 'Quitar del cuaderno' }).click();
  await expect(firstRow).toBeVisible();
  page.once('dialog', prompt => prompt.accept());
  await firstRow.getByRole('button', { name: 'Quitar del cuaderno' }).click();
  await expect.poll(async () =>
    (await notebookSnapshot(frame, 'Lecturas compartidas')).edition.placements.map(item => item.source.sourceId)
  ).toEqual(['doc.uno']);
  await page.reload();
  const card = frame.locator('.cuaderno-home-card').filter({ hasText: 'Lecturas compartidas' });
  await card.getByRole('button', { name: 'Abrir' }).click();
  expect((await notebookSnapshot(frame, 'Lecturas compartidas')).edition.placements[0]).toEqual(before.edition.placements[0]);
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(frame.getByText('4 textos distintos', { exact: true })).toBeVisible();
});

test('un Word importado desde Cuadernos se guarda en el banco con sus marcas', async ({ page }) => {
  const { zipStore } = await import('../dist/modulos/cuaderno-integrado/export/zip-store.js');
  const paragraph = text => '<w:p><w:r><w:t>' + text + '</w:t></w:r></w:p>';
  const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    paragraph('Texto de repaso · Latín II') +
    paragraph('Los romanos envían legados a Ptolomeo') + paragraph('Eutropio, Breviarium III 1') +
    '<w:p><w:r><w:t xml:space="preserve">Finito igitur Punico bello, quod per XXIII annos </w:t></w:r>' +
    '<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>tractum est</w:t></w:r>' +
    '<w:r><w:t xml:space="preserve">, Romani legatos </w:t></w:r>' +
    '<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>miserunt</w:t></w:r>' +
    '<w:r><w:t xml:space="preserve"> auxilia promittentes in Aegyptum.</w:t></w:r></w:p>' +
    paragraph('Vocabulario') + paragraph('Ægyptus, −ī: Egipto') +
    paragraph('Traducción del texto. (4p.)') + '</w:body></w:document>';
  const buffer = Buffer.from(zipStore([{ path: 'word/document.xml', content: xml }]));
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const frame = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Cuaderno Word'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await frame.getByRole('button', { name: 'Importar Word', exact: true }).click();
  await (await pending).setFiles({ name: 'eutropio.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer });
  await expect(frame.locator('.word-review-item')).toContainText('2 subrayados');
  await frame.getByRole('button', { name: 'Incorporar al cuaderno', exact: true }).click();
  await expect(frame.locator('.word-review')).toBeHidden();
  const { edition } = await notebookSnapshot(frame, 'Cuaderno Word');
  expect(edition.placements[0].source.sourceId).toMatch(/^doc\./);
  expect(edition.placements[0].text.markup.map(mark => mark.exact)).toContain('tractum est');
  expect(edition.placements[0].vocabulary).toEqual(expect.arrayContaining([
    expect.objectContaining({ headword: 'Ægyptus, −ī', meaning: 'Egipto', origin: 'manual', included: true, locked: true })
  ]));
  await expect.poll(async () => (await notebookSnapshot(frame, 'Cuaderno Word')).edition.placements[0].vocabulary
    .some(entry => entry.collatinusSource && !entry.included)).toBe(true);
  const morphology = edition.placements[0].questions.find(question => question.kind === 'morphology');
  expect(morphology.words.find(word => word.surface === 'miserunt')).toMatchObject({
    schoolCategory: 'verbo-personal', analysis: expect.stringMatching(/indicativo/i),
    provenance: { provider: 'Collatinus (propuesta contextual)' }
  });
  const download = page.waitForEvent('download');
  await frame.locator('#btnDocx').click();
  const wordDraft = frame.getByRole('button', { name: 'Exportar borrador Word' });
  await expect(wordDraft.or(frame.locator('.edition-save-state').filter({ hasText: /DOCX.*preparado/ }))).toBeVisible();
  if (await wordDraft.isVisible()) await wordDraft.click();
  expect((await download).suggestedFilename()).toMatch(/\.docx$/);

  await frame.locator('html').evaluate(() => {
    window.print = () => { document.body.dataset.printOpened = 'true'; };
  });
  await frame.locator('#btnPdf').click();
  const pdfDraft = frame.getByRole('button', { name: 'Imprimir borrador / Guardar PDF' });
  await expect(pdfDraft.or(frame.locator('body[data-print-opened]'))).toBeVisible();
  if (await pdfDraft.isVisible()) await pdfDraft.click();
  await expect(frame.locator('.edition-print-root')).toContainText('tractum est');
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await expect(frame.getByText('1 texto distinto', { exact: true })).toBeVisible();
  const duplicate = page.waitForEvent('filechooser');
  await frame.getByRole('button', { name: 'Importar Word al banco' }).click();
  await (await duplicate).setFiles({ name: 'eutropio.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer });
  const review = frame.locator('.word-review');
  await expect(review).toContainText('texto idéntico');
  await review.getByRole('button', { name: /^Abrir ficha «/ }).click();
  await expect(frame.locator('.modal').last()).toContainText('tractum est');
  await frame.getByRole('button', { name: 'Volver a la importación' }).click();
  await expect(review).toBeVisible();
});

async function clickExamToolbar(frame, selector) {
  const action = frame.locator(selector);
  await expect.poll(() => frame.locator('html').evaluate(() => Boolean(window.M?.S))).toBe(true);
  if (!await action.isVisible()) await frame.locator('#btnMobileMenu').click();
  await action.click();
}

test('Examinator actualiza el pasaje solo al confirmar y el archivo conserva el vínculo', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  await page.goto(path);
  const bank = await seedBank(page);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Banco de textos…' }).click();
  await exam.getByRole('button', { name: /^Dos / }).click();
  await exam.locator('[data-k="titulo"]').fill('Título docente del examen');
  const snapshot = () => exam.locator('html').evaluate(() => ({
    link: window.M.S.atlBankSource, text: window.M.S.texto, title: window.M.S.titulo, phonetics: window.M.S.evol
  }));
  const before = await snapshot();

  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await bank.getByRole('button', { name: /^Dos / }).click();
  await bank.getByRole('button', { name: 'Editar ficha' }).click();
  const edit = bank.locator('.modal').last();
  await edit.getByRole('textbox', { name: 'Texto latino' }).fill('Secunda lux Romam illuminavit.');
  await edit.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(edit).toBeHidden();
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const refresh = exam.getByRole('button', { name: 'Actualizar desde el banco' });
  const cancel = page.waitForEvent('dialog').then(dialog => dialog.dismiss());
  await refresh.click();
  await cancel;
  expect(await snapshot()).toEqual(before);
  const accept = page.waitForEvent('dialog').then(dialog => dialog.accept());
  await refresh.click();
  await accept;
  await expect(exam.locator('[data-k="texto"]')).toHaveValue('Secunda lux Romam illuminavit.');
  const updated = await snapshot();
  expect(updated.title).toBe(before.title);
  expect(updated.phonetics).toEqual(before.phonetics);
  expect(updated.link.id).toBe(before.link.id);
  expect(updated.link.updatedAt).not.toBe(before.link.updatedAt);
  await expect.poll(() => exam.locator('html').evaluate(() => window.M.S.textAnalyzed === window.M.S.texto)).toBe(true);

  const pending = page.waitForEvent('download');
  await clickExamToolbar(exam, '#btnSave');
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/\.examen$/);
  const saved = await readFile(await file.path());
  expect(JSON.parse(saved).atlBankSource).toEqual(updated.link);
  await exam.locator('[data-k="titulo"]').fill('Edición posterior sin guardar en el archivo');
  const chooser = page.waitForEvent('filechooser');
  await clickExamToolbar(exam, '#btnOpen');
  await (await chooser).setFiles({ name: 'latín.examen', mimeType: 'application/json', buffer: saved });
  await expect(exam.locator('[data-k="titulo"]')).toHaveValue(updated.title);
  expect(await snapshot()).toEqual(updated);
});

test('Examinator recupera un archivo de formato anterior sin exigir vínculo al banco', async ({ page }) => {
  await page.goto(path + '#examinator');
  const exam = page.frameLocator('#panel-examinator iframe');
  const original = {
    v: 1, titulo: 'Examen anterior', texto: 'Gallia est omnis divisa in partes tres.',
    textAnalyzed: 'Gallia est omnis divisa in partes tres.', refAutor: 'César',
    refObra: 'Bellum Gallicum', refCita: 'I 1', interlineadoPuntos: 24, pref: ['confero']
  };
  const chooser = page.waitForEvent('filechooser');
  await clickExamToolbar(exam, '#btnOpen');
  await (await chooser).setFiles({
    name: 'examen-anterior.examen', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original))
  });
  await expect(exam.locator('[data-k="titulo"]')).toHaveValue(original.titulo);
  await expect(exam.locator('[data-k="texto"]')).toHaveValue(original.texto);
  await expect(exam.getByRole('button', { name: 'Actualizar desde el banco' })).toBeHidden();
  expect(await exam.locator('html').evaluate(() => ({
    spacing: window.M.S.interlineadoPuntos, prefixes: window.M.S.pref
  }))).toEqual({ spacing: 24, prefixes: ['confero'] });
});

test('las listas académicas personales se usan en Cuadernos con procedencia local', async ({ page }) => {
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  await notebook.getByRole('button', { name: 'Importar Word al banco' }).waitFor();
  await page.getByRole('button', { name: 'Listas académicas', exact: true }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Prefijos', exact: true }).click();
  const before = await exam.locator('html').evaluate(() => window.M.S.pref);
  await exam.locator('.ltxt').fill('praedocens');
  await exam.getByRole('button', { name: 'Guardar esta lista' }).click();
  await expect(exam.getByText('Lista guardada.', { exact: true })).toBeVisible();
  expect(await exam.locator('html').evaluate(() => window.M.lists.prefijos)).toEqual(['praedocens']);
  expect(await exam.locator('html').evaluate(() => window.M.S.pref)).toEqual(before);
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  const profile = await notebook.locator('html').evaluate(async () => {
    const { createOfflineTeacherBankV1 } = await import('../core/academic-teacher-bank.js');
    const report = createOfflineTeacherBankV1();
    return {
      origins: Object.values(report.sourceReferences).map(item => item.sha),
      candidates: report.bank.verified('prefix').map(item => [item.value, item.evidence.provider])
    };
  });
  expect(profile.origins).toHaveLength(5);
  expect(profile.origins).toContain('805a0039dcc222ffb8ce50c4a4c5869a24c79559');
  expect(profile.candidates).toEqual([['praedocens', 'atl:lista-personal-docente']]);
});

test('el historial local distingue coincidencias anteriores y permite volver a abrir el examen', async ({ page }) => {
  await page.goto(path);
  const bank = await seedBank(page);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Banco de textos…' }).click();
  await exam.getByRole('button', { name: /^Dos / }).click();
  await expect(exam.locator('[data-k="texto"]')).toHaveValue('Secunda lux orta est.');
  await exam.locator('[data-k="titulo"]').fill('Examen registrado');
  const pending = page.waitForEvent('download');
  await clickExamToolbar(exam, '#btnSave');
  await pending;
  await expect(exam.getByText('Examen descargado (archivo .examen).', { exact: true })).toBeVisible();
  await exam.locator('html').evaluate(() => window.M.loadExam(window.M.newExam()));
  await exam.getByRole('button', { name: 'Banco de textos…' }).click();
  await exam.getByRole('button', { name: /^Dos / }).click();
  await expect(exam.getByText(/Coincidencia exacta · examen «Examen registrado»/)).toBeVisible();
  await exam.getByRole('button', { name: 'Usar de todos modos' }).click();
  await expect(exam.locator('[data-k="texto"]')).toHaveValue('Secunda lux orta est.');

  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await bank.locator('html').evaluate(async () => {
    const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
    const repository = new IndexedDbCorpusRepository();
    const saved = await repository.load();
    await repository.save({
      ...saved.corpus,
      notebooks: [...saved.corpus.notebooks, { id: 'hist.lecturas', title: 'Lecturas históricas', textIds: ['doc.uno', 'doc.dos'] }]
    }, saved.revision);
  });
  await bank.getByRole('button', { name: /^Dos / }).click();
  await bank.getByRole('button', { name: 'Ver usos anteriores' }).click();
  await expect(bank.getByText(/Coincidencia exacta · examen «Examen registrado»/)).toBeVisible();
  await expect(bank.getByText(/histórico «Lecturas históricas» · texto 2/)).toBeVisible();
  await bank.getByRole('button', { name: 'Leer cuaderno histórico' }).click();
  await expect(bank.locator('.modal details[open]').getByText('Secunda lux orta est.', { exact: true })).toBeVisible();
  await bank.locator('.modal').getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await bank.getByRole('button', { name: /^Dos / }).click();
  await bank.getByRole('button', { name: 'Ver usos anteriores' }).click();
  page.once('dialog', prompt => prompt.accept());
  await bank.getByRole('button', { name: 'Abrir examen' }).click();
  await expect(exam.locator('[data-k="titulo"]')).toHaveValue('Examen registrado');

  const outcomes = await exam.locator('html').evaluate(async () => {
    const { findTextUses } = await import('../shared/text-usage.js');
    const latin = 'Gallia est omnis divisa in partes tres quarum unam incolunt Belgae aliam Aquitani';
    const sample = (title, text, sourceId) => ({ document: { type: 'cuaderno', id: title, title }, latin: text, sourceId });
    return findTextUses([
      sample('Pasaje parcial', latin + ' tertiam Celtae'),
      sample('Con el mismo título', 'Roma antiqua clara est'),
      sample('Otra revisión', 'Galli Romam petunt', 'doc.test')
    ], { id: 'doc.test', title: 'Con el mismo título', latin }).map(match => [match.document.title, match.kind]);
  });
  expect(outcomes).toEqual([
    ['Otra revisión', 'Misma ficha · versión distinta'],
    ['Pasaje parcial', 'Coincidencia parcial']
  ]);
});

test('la PWA prepara las tres pestañas y vuelve a abrir la portada sin red', async ({ page }) => {
  const { createServer } = await import('node:http');
  const { once } = await import('node:events');
  const source = test.info().project.use.baseURL;
  let offline = false;
  let updated = false;
  const server = createServer(async (request, response) => {
    if (offline) {
      response.writeHead(503).end();
      return;
    }
    try {
      const result = await fetch(new URL(request.url, source));
      response.writeHead(result.status, { 'Content-Type': result.headers.get('Content-Type') || 'text/plain' });
      if (updated && request.url === path + 'sw.js') {
        const worker = (await result.text()).replace(/(const cacheName = prefix \+ "[a-f\d]+")/, '$1 + ":prueba"');
        response.end(worker);
      } else {
        response.end(Buffer.from(await result.arrayBuffer()));
      }
    } catch { response.writeHead(502).end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await page.goto('http://127.0.0.1:' + server.address().port + path);
    await page.getByRole('button', { name: 'Preparar sin conexión' }).click();
    await expect(page.locator('#app-status')).toHaveText(/tres pestañas están preparadas/, { timeout: 60000 });
    const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(item => item.scope));
    expect(registrations).toEqual([new URL(path, page.url()).href]);
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    offline = true;
    await page.reload();
    const notebook = page.frameLocator('#panel-cuaderno iframe');
    await expect(notebook.getByRole('button', { name: 'Importar Word al banco' })).toBeVisible();
    await page.getByRole('tab', { name: 'Cuadernos' }).click();
    await expect(notebook.getByRole('heading', { name: 'Mis cuadernos', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Examinator' }).click();
    const exam = page.frameLocator('#panel-examinator iframe');
    await expect(exam.getByRole('button', { name: 'Banco de textos…' })).toBeVisible();
    await exam.getByRole('button', { name: 'Banco de textos…' }).click();
    await expect(exam.getByRole('searchbox', { name: 'Buscar en el banco de textos' })).toBeVisible();
    await exam.locator('.modal').getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    await exam.locator('[data-k="titulo"]').fill('Conservado al actualizar');
    offline = false;
    updated = true;
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting)),
      { timeout: 45000 }).toBe(true);
    page.once('dialog', prompt => prompt.accept());
    const reload = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await reload;
    await expect(exam.locator('[data-k="titulo"]')).toHaveValue('Conservado al actualizar');
  } finally {
    server.close();
    server.closeAllConnections();
  }
});

test('la copia integral recupera banco, examen y listas y detecta diferencias antes de escribir', async ({ page, browser }) => {
  const { readFile } = await import('node:fs/promises');
  await page.goto(path);
  await seedBank(page);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Banco de textos…' }).click();
  await exam.getByRole('button', { name: /^Dos / }).click();
  await exam.locator('[data-k="titulo"]').fill('Examen de la copia');
  await page.evaluate(() => {
    localStorage.setItem('atl-v1:examinator.fs:/datos/listas/prefijos.json', JSON.stringify(['interponer']));
    localStorage.setItem('cuaderno-supabase-connection-v1', JSON.stringify({ unrelated: 'configuración privada de prueba' }));
  });
  const archive = page.waitForEvent('download');
  await clickExamToolbar(exam, '#btnSave');
  await archive;
  await expect(exam.getByText('Examen descargado (archivo .examen).', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copias de seguridad' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia integral' }).click();
  const file = await pending;
  const buffer = await readFile(await file.path());
  expect(buffer.toString()).not.toContain('configuración privada de prueba');

  const fresh = await browser.newContext();
  try {
    const restored = await fresh.newPage();
    await restored.goto(new URL(path, page.url()).href);
    await restored.getByRole('button', { name: 'Copias de seguridad' }).click();
    const input = restored.locator('#backup-file');
    const changed = JSON.parse(buffer);
    changed.exportedAt = '2000-01-01T00:00:00.000Z';
    await input.setInputFiles({ name: 'alterada.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
    await expect(restored.locator('#backup-preview')).toContainText('huella SHA-256');
    await expect(restored.getByRole('button', { name: 'Recuperar copia' })).toBeDisabled();
    await input.setInputFiles({ name: 'integral.json', mimeType: 'application/json', buffer });
    await expect(restored.locator('#backup-preview')).toContainText('Vista previa');
    restored.once('dialog', prompt => prompt.accept());
    await restored.getByRole('button', { name: 'Recuperar copia' }).click();
    await expect(restored.locator('#app-status')).toHaveText('Copia recuperada y verificada.');
    await expect(restored.frameLocator('#panel-cuaderno iframe').getByText('4 textos distintos', { exact: true })).toBeVisible();
    await restored.getByRole('tab', { name: 'Examinator' }).click();
    const recoveredExam = restored.frameLocator('#panel-examinator iframe');
    await expect(recoveredExam.locator('[data-k="titulo"]')).toHaveValue('Examen de la copia');
    expect(await recoveredExam.locator('html').evaluate(() => window.M.lists.prefijos)).toEqual(['interponer']);
    await recoveredExam.locator('[data-k="titulo"]').fill('Cambios en el navegador de destino');
    await restored.getByRole('button', { name: 'Copias de seguridad' }).click();
    await input.setInputFiles({ name: 'integral.json', mimeType: 'application/json', buffer });
    await expect(restored.locator('#backup-preview')).toContainText('más antigua');
    await expect(restored.getByRole('button', { name: 'Recuperar copia' })).toBeDisabled();
  } finally {
    await fresh.close();
  }
});

test('el panel de copias migra los formatos anteriores v1 y v2 de Cuaderno', async ({ page, browser }) => {
  await page.goto(path);
  const frame = await seedBank(page);
  const backups = await frame.locator('html').evaluate(async () => {
    const { createBackup } = await import('../core/backup.js');
    const { createWorkspaceBackup } = await import('../storage/workspace-backup.js');
    const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
    const { WorkspaceRepository } = await import('../storage/workspace-repository.js');
    const { corpus } = await new IndexedDbCorpusRepository().load();
    const classic = JSON.parse(await createBackup({
      ...corpus, texts: corpus.texts.map(({ origin, ...text }) => text)
    }));
    const editorial = JSON.parse(await createWorkspaceBackup(new WorkspaceRepository(), new Date(), corpus));
    classic.format = 'cuaderno-textos-latinos';
    editorial.format = 'cuaderno-textos-latinos-workspace';
    return [classic, editorial];
  });
  for (const [index, backup] of backups.entries()) {
    const fresh = await browser.newContext();
    try {
      const copy = await fresh.newPage();
      await copy.goto(new URL(path, page.url()).href);
      await copy.getByRole('button', { name: 'Copias de seguridad' }).click();
      await copy.locator('#backup-file').setInputFiles({
        name: 'version-' + (index + 1) + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))
      });
      await expect(copy.locator('#backup-preview')).toContainText('Vista previa');
      copy.once('dialog', prompt => prompt.accept());
      await copy.getByRole('button', { name: 'Recuperar copia' }).click();
      const bank = copy.frameLocator('#panel-cuaderno iframe');
      await expect(bank.getByText((index === 0 ? '3' : '4') + ' textos distintos', { exact: true })).toBeVisible();
    } finally {
      await fresh.close();
    }
  }
});

test('el banco filtra propuestas reales de Collatinus solo al incluirlas y conserva su revisión', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(path);
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  const paste = frame.locator('.modal').last();
  const card = bank.getByRole('button', { name: /^Pasaje de revisión / });
  await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
  await paste.getByRole('textbox', { name: 'Título' }).fill('Pasaje de revisión');
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill('Amatus est. Loquitur. Liber legendus.');
  await paste.getByRole('button', { name: 'Guardar en el banco' }).click();
  await card.click();
  await frame.getByRole('button', { name: 'Etiquetar', exact: true }).click();
  const review = frame.locator('.modal').last();
  const candidate = review.locator('.grammar-proposal-card').filter({ hasText: 'Amatus est · Voz pasiva · Pendiente' }).first();
  await review.getByRole('button', { name: 'Analizar con Collatinus' }).click();
  await expect(candidate).toBeVisible({ timeout: 45000 });
  await review.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.reload();

  await bank.locator('.atl-grammar-filters > summary').click();
  const passive = bank.getByRole('checkbox', { name: 'Voz pasiva', exact: true, includeHidden: true });
  await passive.evaluate(node => {
    for (let group = node.closest('details'); group; group = group.parentElement.closest('details')) group.open = true;
  });
  await passive.check();
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 0 de 1');
  const include = bank.getByRole('checkbox', { name: 'Incluir propuestas pendientes de Collatinus' });
  await include.check();
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 1 de 1');
  await expect(bank.getByText('Pendiente: Voz pasiva', { exact: true })).toBeVisible();
  await card.click();
  await expect(frame.locator('.atl-bank-reader')).toContainText('Propuestas pendientes:');
  await frame.getByRole('button', { name: 'Etiquetar', exact: true }).click();
  await expect(candidate).toBeVisible();
  await candidate.locator(':scope > summary').click();
  await expect(review.locator('.cuaderno-review-passage mark')).toHaveText('Amatus est');
  await candidate.getByRole('button', { name: 'Aceptar', exact: true }).click();
  await review.getByRole('button', { name: 'Guardar etiquetas', exact: true }).click();
  await expect(review).toBeHidden();
  await include.uncheck();
  await expect(bank.getByRole('status').first()).toContainText('Mostrando 1 de 1');
  await expect(bank.getByText('Voz pasiva', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(bank.getByText('Pendiente: Voz pasiva', { exact: true })).toBeHidden();

  await card.click();
  await frame.getByRole('button', { name: 'Editar ficha' }).click();
  await review.getByRole('textbox', { name: 'Texto latino' }).fill('Postea. Amatus est. Loquitur. Liber legendus.');
  await review.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(review).toBeHidden();
  await card.click();
  await frame.getByRole('button', { name: 'Etiquetar', exact: true }).click();
  const confirmed = review.locator('.grammar-proposal-card').filter({ hasText: 'Amatus est · Voz pasiva · Confirmada' }).first();
  await confirmed.locator(':scope > summary').click();
  await expect(review.locator('.cuaderno-review-passage mark')).toHaveText('Amatus est');
});

test('una ficha editorial recuperada admite notas y vocabulario reutilizables', async ({ page }) => {
  await page.goto(path);
  const frame = await seedBank(page);
  const card = frame.getByRole('button', { name: /^Cuatro / });
  await card.click();
  await frame.getByRole('button', { name: 'Editar ficha' }).click();
  const form = frame.locator('.modal').last();
  await form.getByRole('textbox', { name: 'Notas de la ficha' }).fill('Nota de la ficha editorial');
  await form.getByText('Vocabulario de la ficha', { exact: true }).click();
  await form.getByRole('button', { name: 'Añadir entrada de vocabulario' }).click();
  await form.getByRole('textbox', { name: 'Enunciado latino de vocabulario' }).fill('lux, lucis');
  await form.getByRole('textbox', { name: 'Traducción de vocabulario' }).fill('luz');
  await form.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(form).toBeHidden();
  await card.click();
  const reader = frame.locator('.atl-bank-reader');
  await expect(reader.getByText('Nota de la ficha editorial')).toBeVisible();
  await reader.getByText('Vocabulario de la ficha', { exact: true }).click();
  await expect(reader.getByText('lux, lucis', { exact: true })).toBeVisible();
  await frame.getByRole('button', { name: 'Volver al listado' }).click();
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  page.once('dialog', prompt => prompt.accept('Vocabulario recuperado'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await frame.getByRole('button', { name: 'Banco propio', exact: true }).click();
  await frame.getByRole('button', { name: 'Añadir «Cuatro» al cuaderno' }).click();
  await expect.poll(async () => (await notebookSnapshot(frame, 'Vocabulario recuperado')).edition.placements[0]?.vocabulary)
    .toEqual(expect.arrayContaining([expect.objectContaining({ headword: 'lux, lucis', meaning: 'luz', reviewState: 'manual' })]));
});

test('Examinator usa el banco fonético multietiqueta de Cuadernos', async ({ page }) => {
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  await notebook.getByRole('button', { name: 'Importar Word al banco' }).waitFor();
  const banks = await notebook.locator('html').evaluate(async () => {
    const { createOfflineTeacherBankV1 } = await import('../core/academic-teacher-bank.js');
    const { bank } = createOfflineTeacherBankV1();
    const all = bank.verified('phonetics');
    const multiple = all.find(row => row.phoneticRules.length > 1);
    const selected = [multiple.phoneticRules[0]];
    return { all: all.map(row => row.value), selected, multiple: multiple.value,
      restricted: bank.verified('phonetics', null, selected).map(row => row.value) };
  });
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await expect(exam.getByRole('button', { name: 'Banco de textos…' })).toBeVisible();
  const normalize = words => [...new Set(words.map(word => word.normalize('NFC').trim().toLowerCase()))].sort();
  const pools = await exam.locator('html').evaluate((_, selected) => {
    const filters = window.M.LexicalFilters;
    const exam = window.M.S;
    const full = { ...exam, evolNormas: null, evolSoloPatrimoniales: false };
    const candidates = filters.evolCandidates(full);
    const generated = { ...full, evol: [] };
    window.M.Propose.evol(generated);
    const before = structuredClone(generated.evol);
    const changed = window.M.Propose.evolOne(generated, 0);
    return {
      all: candidates.map(candidate => candidate.w),
      multipleLabels: candidates.some(candidate => candidate.labels.length > 1),
      restricted: filters.evolCandidates({ ...full, evolNormas: selected }).map(candidate => candidate.w),
      before, after: generated.evol, changed
    };
  }, banks.selected);
  expect(normalize(pools.all)).toEqual(normalize(banks.all));
  expect(normalize(pools.restricted)).toEqual(normalize(banks.restricted));
  expect(normalize(pools.restricted)).not.toContain(banks.multiple.toLowerCase());
  expect(pools.all).toHaveLength(normalize(pools.all).length);
  expect(pools.multipleLabels).toBe(true);
  expect(pools.changed).toBe(true);
  expect(pools.after.slice(1)).toEqual(pools.before.slice(1));
});

test('el selector común de tema está visible en Examinator y sincroniza las tres pestañas', async ({ page }) => {
  await page.goto(path + '#examinator');
  const theme = page.getByRole('combobox', { name: 'Tema' });
  await expect(theme).toBeVisible();
  const exam = page.frameLocator('#panel-examinator iframe');
  await expect(exam.getByRole('button', { name: 'Banco de textos…' })).toBeVisible();
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(exam.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  await expect(notebook.getByRole('button', { name: 'Importar Word al banco' })).toBeVisible();
  await expect(notebook.locator('html')).toHaveAttribute('data-cuaderno-theme', 'dark');
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await theme.selectOption('oled');
  await expect(notebook.locator('html')).toHaveAttribute('data-cuaderno-theme', 'oled');
  await expect(exam.locator('html')).toHaveAttribute('data-theme', 'oled');
  await page.reload();
  await expect(theme).toHaveValue('oled');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'oled');
  await expect(notebook.locator('html')).toHaveAttribute('data-cuaderno-theme', 'oled');
});

test('la auditoría agrupa fichas por coincidencia y permite eliminar desde el editor', async ({ page }) => {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Thesaurus Scriptorum Latinorum', exact: true })).toBeVisible();
  const frame = await seedBank(page);
  await frame.locator('html').evaluate(async () => {
    const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
    const { upsertText } = await import('../core/editor-operations.js');
    const repository = new IndexedDbCorpusRepository();
    const saved = await repository.load();
    let corpus = saved.corpus;
    for (const draft of [
      { id: 'doc.copia-a', title: 'Copia A', latin: 'Secunda lux orta est.', reference: '22' },
      { id: 'doc.copia-b', title: 'Copia B', latin: 'Secunda lux orta est.', reference: '23' },
      { id: 'doc.referencia-2', title: 'Otra versión', latin: 'Roma clara erat.', reference: '2' }
    ]) {
      corpus = upsertText(corpus, { ...draft, author: 'César', work: 'Bellum Gallicum' }, draft.id, new Date().toISOString());
    }
    await repository.save({ ...corpus, notebooks: [...corpus.notebooks, { id: 'hist.protegido', title: 'Cuaderno protegido', textIds: ['doc.dos'] }] }, saved.revision);
  });
  await page.reload();
  await frame.getByRole('button', { name: 'Auditar textos repetidos' }).click();
  const audit = frame.locator('.cuaderno-duplicate-audit');
  const identical = audit.locator('.atl-duplicate-group').filter({ hasText: 'Textos idénticos' });
  await expect(identical.locator('.atl-duplicate-card')).toHaveCount(3);
  await expect(audit.getByRole('heading', { name: 'Misma referencia bibliográfica' })).toBeVisible();
  await audit.getByRole('combobox', { name: 'Tipo de coincidencia' }).selectOption('identical');
  const category = identical.locator(':scope > summary');
  const first = identical.locator('.atl-duplicate-card').filter({ has: frame.locator('summary').filter({ hasText: /^Copia A/ }) });
  const second = identical.locator('.atl-duplicate-card').filter({ has: frame.locator('summary').filter({ hasText: /^Copia B/ }) });
  await category.click();
  await expect(first).toBeHidden();
  await category.click();
  const nextMatch = first.getByRole('button', { name: 'Siguiente · Copia B' });
  await expect(nextMatch).toBeHidden();
  await expect(first.locator('.atl-duplicate-opened')).toBeHidden();
  await first.locator('summary').first().click();
  await expect(first.locator('.atl-duplicate-opened')).toContainText('Secunda lux orta est.');
  await expect(nextMatch).toBeVisible();
  await nextMatch.click();
  await expect(nextMatch).toBeHidden();
  await expect(first.locator(':scope > details')).not.toHaveAttribute('open', '');
  await expect(second.locator(':scope > details')).toHaveAttribute('open', '');
  await expect(second.locator('summary').first()).toBeFocused();
  await identical.getByRole('button', { name: 'Editar «Dos»' }).click();
  const editor = frame.locator('.modal').last();
  const remove = editor.getByRole('button', { name: 'Eliminar del banco' });
  await expect(remove).toBeDisabled();
  await editor.getByRole('button', { name: 'Cancelar' }).click();

  await identical.getByRole('button', { name: 'Editar «Copia A»' }).click();
  page.once('dialog', prompt => prompt.dismiss());
  await remove.click();
  await expect(remove).toBeEnabled();
  page.once('dialog', prompt => prompt.accept());
  await remove.click();
  await expect(audit.getByRole('combobox', { name: 'Tipo de coincidencia' })).toHaveValue('identical');
  await expect(identical.locator('.atl-duplicate-card')).toHaveCount(2);
  await expect(audit.getByRole('button', { name: 'Editar «Copia A»' })).toHaveCount(0);
});

test('Cuadernos y Examinator muestran las mismas obras en desplegables de autor', async ({ page }) => {
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  await notebook.getByRole('button', { name: 'Biblioteca latina' }).click();
  const notebookLibrary = notebook.locator('#lib');
  const entries = library => library.locator('.atl-library-author').evaluateAll(groups =>
    groups.map(group => [group.dataset.author, [...group.querySelectorAll('.lrow')].map(work => work.textContent.trim())]));
  await expect(notebookLibrary.locator('.atl-library-author').first()).toBeVisible();
  const catalogue = await entries(notebookLibrary);
  const authors = catalogue.map(([author]) => author);
  expect(authors).toContain('Cornelio Nepote');
  expect(authors).toEqual([...authors].sort(new Intl.Collator('es', { sensitivity: 'base' }).compare));
  await notebookLibrary.getByRole('button', { name: 'Volver al banco' }).click();

  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Elegir un fragmento…' }).click();
  const examLibrary = exam.locator('#lib');
  await expect(examLibrary.locator('.atl-library-author').first()).toBeVisible();
  expect(await entries(examLibrary)).toEqual(catalogue);
  const nepote = examLibrary.locator('.atl-library-author[data-author="Cornelio Nepote"]');
  await expect(nepote.locator('.lrow.have').first()).toBeHidden();
  await nepote.locator('summary').click();
  await nepote.locator('.lrow.have').first().click();
  await expect(examLibrary.locator('.rtext .rx').first()).toBeVisible();
});

const lexicalPassage = 'Caesar Galliam petiit et ex oppido exiit. Hostes pontem fecerunt et ad flumen venerunt. ' +
  'Romani consilium ceperunt, signa tulerunt, multas copias duxerunt et castra moverunt. ' +
  'Caesar legatos misit; qui verba audiverunt, cuncta rettulerunt, dona dederunt et pacem fecerunt.';

async function checkLexicalVariation(button, values, minimum) {
  const initial = await values();
  expect(initial[0]).toBeTruthy();
  const seen = new Set([initial[0]]);
  let last = initial[0];
  for (let round = 0; round < 6; round++) {
    const scrollTop = locator => locator.evaluate(control => document.getElementById('editor').scrollTop);
    await button.evaluate(control => control.scrollIntoView({ block: 'center' }));
    const before = await scrollTop(button);
    expect(before).toBeGreaterThan(0);
    await button.click();
    await expect.poll(async () => (await values())[0]).not.toBe(last);
    expect(Math.abs(await scrollTop(button) - before)).toBeLessThanOrEqual(2);
    const [value, ...siblings] = await values();
    expect(siblings).toEqual(initial.slice(1));
    expect(siblings).not.toContain(value);
    seen.add(value);
    last = value;
  }
  expect(seen.size).toBeGreaterThanOrEqual(minimum);
}

test('Cuadernos regenera términos de léxico conservando los demás', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Cuaderno de léxico'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await notebook.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = notebook.locator('.original-paste');
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill(lexicalPassage);
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  const bases = notebook.locator('.edition-option').filter({ hasText: 'Modificación preverbial' });
  const generated = bases.locator('.edition-option-statement').first();
  let previous = await generated.innerText();
  const pairs = new Set([previous]);
  const otherTerms = notebook.locator('.edition-option-rows input');
  const readTerms = () => otherTerms.evaluateAll(rows => rows.map(input => input.value));
  const untouched = await readTerms();
  for (let round = 0; round < 6; round++) {
    await bases.getByRole('button', { name: 'Generar Modificación preverbial' }).click();
    await expect.poll(() => generated.innerText()).not.toBe(previous);
    previous = await generated.innerText();
    expect(previous).toMatch(/\(3\).*\(2\)/s);
    expect(await readTerms()).toEqual(untouched);
    pairs.add(previous);
  }
  expect(pairs.size).toBeGreaterThanOrEqual(3);
  const alphabetical = new Intl.Collator('es', { sensitivity: 'base' });
  const docRows = notebook.locator('.edition-paper .edition-choice-options li');
  for (const index of [1, 2, 3]) {
    const terms = await docRows.nth(index).locator('em').allTextContents();
    expect(terms).toHaveLength(4);
    expect(terms).toEqual([...terms].sort(alphabetical.compare));
  }

  for (const [name, minimum, previewIndex] of [[/Evolución fonética/i, 4, 1], [/Prefijos/i, 4, 2], [/Latinismos/i, 4, 3]]) {
    const option = notebook.locator('.edition-option').filter({ has: notebook.locator('.edition-option-head strong').filter({ hasText: name }) });
    const inputs = option.locator('.edition-option-rows input');
    await expect(inputs).toHaveCount(4);
    await checkLexicalVariation(option.locator('.edition-slot-regenerate').first(),
      () => inputs.evaluateAll(rows => rows.map(input => input.value)), minimum);
    const sortedTerms = await docRows.nth(previewIndex).locator('em').allTextContents();
    expect(sortedTerms).toEqual([...sortedTerms].sort(alphabetical.compare));
  }
});

test('Examinator regenera términos de las cuatro opciones de léxico conservando los demás', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.locator('[data-k="texto"]').fill(lexicalPassage);
  await expect.poll(() => exam.locator('html').evaluate(() => window.M?.S?.tokens?.length ?? 0)).toBeGreaterThan(20);
  await exam.locator('[data-act="q4all"]').click();
  for (const [kind, action, minimum] of [['prev', 'prevOne', 3], ['evol', 'evolOne', 4], ['pref', 'prefOne', 4], ['latin', 'latOne', 4]]) {
    await checkLexicalVariation(exam.locator(`[data-act="${action}"][data-k="0"]`),
      () => exam.locator(`[data-q="${kind}"]`).evaluateAll(rows => rows.map(input => input.value)), minimum);
    const alphabetic = await exam.locator('html').evaluate(() => window.M.Exam.q4(window.M.S)
      .slice(1).map(row => row.filter(part => part.i).map(part => part.t)));
    const collator = new Intl.Collator('es', { sensitivity: 'base' });
    for (const words of alphabetic) expect(words).toEqual([...words].sort(collator.compare));
  }
});

test('las descargas de biblioteca se comparten y las antiguas siguen disponibles', async ({ page }) => {
  const oldUrn = 'stoa0023.stoa001.perseus-lat2';
  await page.addInitScript(() => {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (url, ...args) => String(url).endsWith('/phi2003.phi001.perseus-lat1.xml')
      ? Promise.resolve(new Response('<!DOCTYPE TEI.2 PUBLIC "-//TEI P4//DTD Main DTD Driver File//EN" "http://www.tei-c.org/Guidelines/DTD/tei2.dtd">' +
        '<TEI.2><text><body><p>Fabula &mdash; nova.</p></body></text></TEI.2>'))
      : fetchOriginal(url, ...args);
  });
  await page.goto(path);
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  await notebook.getByRole('button', { name: 'Biblioteca latina' }).waitFor();
  const works = await notebook.locator('html').evaluate(async (_, urn) => {
    const { latinLibrary } = await import('../../shared/latin-library.js');
    const entries = await latinLibrary.call('catalog');
    const old = entries.find(work => work.urn === urn);
    const downloaded = entries.find(work => work.urn === 'phi2003.phi001.perseus-lat1');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('atl-v1:examinator');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('fs', 'readwrite');
        tx.objectStore('fs').put(JSON.stringify({ urn, levels: ['pasaje'], lines: [{ c: '1', k: 'p', t: 'Textus prior.' }] }),
          '/datos/textos/' + urn + '.json');
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
    return { old: old.i, downloaded: downloaded.i, author: downloaded.author };
  }, oldUrn);
  await notebook.getByRole('button', { name: 'Biblioteca latina' }).click();
  const notebookLibrary = notebook.locator('#lib');
  await notebookLibrary.locator('.lf').fill('Amiano Marcelino');
  await notebookLibrary.locator(`.lrow.have[data-i="${works.old}"]`).click();
  await expect(notebookLibrary.locator('.rtext')).toContainText('Textus prior.');
  await notebookLibrary.getByRole('button', { name: 'Volver al banco' }).click();

  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button', { name: 'Elegir un fragmento…' }).click();
  const examLibrary = exam.locator('#lib');
  await examLibrary.locator('.lf').fill(works.author);
  const newWork = examLibrary.locator(`.lrow[data-i="${works.downloaded}"]`);
  await newWork.getByRole('checkbox').check();
  await examLibrary.getByRole('button', { name: 'Descargar las marcadas' }).click();
  await expect(newWork).toHaveClass(/\bhave\b/);
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await notebook.getByRole('button', { name: 'Biblioteca latina' }).click();
  await notebookLibrary.locator('.lf').fill(works.author);
  await notebookLibrary.locator(`.lrow.have[data-i="${works.downloaded}"]`).click();
  await expect(notebookLibrary.locator('.rtext')).toContainText('Fabula — nova.');
});

test('Cuadernos reúne preguntas y vocabulario en la misma columna', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Editor de preguntas'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await notebook.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = notebook.locator('.original-paste');
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill(lexicalPassage);
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  const left = notebook.locator('.edition-settings');
  await expect(left.locator('.edition-question-panel > .edition-question-top h3')).toHaveText([
    '1. Traducción', '2. Sintaxis', '3. Morfología', '4. Elección'
  ]);
  await expect(left.locator('.edition-question-top h3, .edition-vocab-entries > h3')).toHaveText([
    '1. Traducción', '2. Sintaxis', '3. Morfología', 'Vocabulario', '4. Elección'
  ]);
  await expect(left.locator('.edition-question-index, .edition-question-fold, .edition-option-advanced')).toHaveCount(0);
  await expect(left.getByRole('button', { name: 'Generar pregunta 4', exact: true })).toBeVisible();
  const toolbar = notebook.locator('.atl-edition-toolbar');
  expect(await toolbar.evaluate(el => !el.closest('.edition-layout') &&
    el.getBoundingClientRect().top < el.parentElement.querySelector('.edition-layout').getBoundingClientRect().top)).toBe(true);
  for (const label of ['Editar texto', 'Organizar cuaderno']) {
    await expect(toolbar.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await toolbar.getByRole('button', { name: 'Organizar cuaderno', exact: true }).click();
  await expect(left.locator('.edition-question-panel')).toHaveCount(0);
  await expect(notebook.getByRole('button', { name: 'Editar etiquetas', exact: true })).toHaveCount(0);
  await expect(left.getByText('Formato y portada', { exact: true })).toBeVisible();
  await expect(left.getByText('Revisar repeticiones', { exact: true })).toBeVisible();
  await left.getByText('Formato y portada', { exact: true }).click();
  await expect(left.getByText('Tipografía', { exact: true })).toBeVisible();
  await expect(left.locator('.edition-question-panel')).toHaveCount(0);
  await expect(toolbar.getByRole('button', { name: 'Vocabulario', exact: true })).toHaveCount(0);
  await expect(toolbar.getByRole('button', { name: 'Texto', exact: true })).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Editar texto', exact: true }).click();
  await expect(left.locator('.edition-menu-text')).toContainText('Texto latino');
  await expect(left.getByRole('button', { name: 'Editar etiquetas', exact: true })).toHaveCount(1);
  await expect(left.getByRole('heading', { name: 'Vocabulario', exact: true })).toBeAttached();
  await expect(left.locator('.edition-question-panel')).toHaveCount(4);
});

test('Cuadernos ofrece el vocabulario completo y conserva las entradas y selecciones del usuario', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Cuaderno de vocabulario'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await notebook.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = notebook.locator('.original-paste');
  await paste.getByRole('textbox', { name: 'Texto latino' })
    .fill('Caesar Romam venit. Romani pontem faciunt et pacem petunt. Zorvalix.');
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  const vocabulary = notebook.locator('.edition-vocab-entries');
  const visibleRows = vocabulary.locator('.edition-vocab-row');
  await expect.poll(() => visibleRows.count()).toBeGreaterThan(6);
  const snapshot = async () => (await notebookSnapshot(notebook, 'Cuaderno de vocabulario')).edition.placements[0];
  const automatic = (await snapshot()).vocabulary;
  expect(automatic.some(entry => entry.lemma.toLowerCase().startsWith('caesar') && entry.included)).toBe(true);
  expect(automatic.some(entry => /romanus/i.test(entry.lemma) && entry.included)).toBe(true);
  expect(automatic.some(entry => !entry.included)).toBe(true);
  expect(automatic.every(entry => entry.included === entry.collatinusProper)).toBe(true);
  await vocabulary.getByRole('button', { name: 'Todo el texto' }).click();
  await expect(vocabulary.locator('.edition-vocab-include:not(:checked)')).toHaveCount(0);
  await vocabulary.getByRole('button', { name: 'Elegir las palabras' }).click();
  await expect(vocabulary.locator('.edition-vocab-include:not(:checked)').first()).toBeAttached();

  await vocabulary.getByRole('button', { name: 'Añadir una entrada a mano' }).click();
  await vocabulary.getByRole('textbox', { name: 'Enunciado nuevo' }).fill('Zorvalix');
  await vocabulary.getByRole('textbox', { name: 'Traducción nueva' }).fill('nombre de una persona');
  await vocabulary.getByRole('textbox', { name: 'Aclaración nueva' }).fill('glosa docente');
  await vocabulary.getByRole('button', { name: 'Añadir entrada' }).click();
  await vocabulary.getByRole('button', { name: 'Guardar corrección de Zorvalix' }).click();
  await expect(vocabulary.getByRole('button', { name: 'Corrección guardada de Zorvalix' })).toBeVisible();
  await expect.poll(async () => (await snapshot()).vocabulary.find(entry => entry.headword === 'Zorvalix')).toMatchObject({
    origin: 'manual', included: true, meaning: 'nombre de una persona', note: 'glosa docente'
  });
  const remembered = await notebook.locator('html').evaluate(async () => {
    const { PREFERRED_VOCABULARY_KEY, parsePreferredVocabulary } = await import('../core/vocabulary-preferences.js');
    return parsePreferredVocabulary(localStorage.getItem(PREFERRED_VOCABULARY_KEY)).find(entry => entry.headword === 'Zorvalix');
  });
  expect(remembered).toMatchObject({ note: 'glosa docente', meaning: 'nombre de una persona' });
});

test('ambos editores permiten elegir una aparición de una palabra repetida para subrayarla', async ({ page }) => {
  const latin = 'Caesar pontem fecit ut milites flumen transirent. Ille vidit tres milites fortes laborantes et iussit eos venire. Zorvalix Zorvalix.';
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Subrayados elegidos'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await notebook.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = notebook.locator('.original-paste');
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill(latin);
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  const { edition } = await notebookSnapshot(notebook, 'Subrayados elegidos');
  const order = await notebook.locator('html').evaluate(async (_, edition) => {
    const { applyMorphologyChoices, selectMorphologyForPlacement } = await import('../core/morph-selection-collatinus.js');
    const { MORPH_TYPES } = await import('../core/morph-categories.js');
    const placement = edition.placements[0];
    const original = placement.questions.find(question => question.kind === 'morphology').words;
    const first = original[0];
    const start = placement.text.latin.lastIndexOf('Zorvalix');
    const candidate = {
      start, end: start + 8, surface: 'Zorvalix', key: 'zorvalix', category: first.schoolCategory,
      lemmaId: first.lemmaId, analysis: first.analysis, source: 'collatinus'
    };
    const updated = applyMorphologyChoices(edition, placement.id, [candidate], new Date().toISOString(), first.id);
    const different = { ...candidate, category: MORPH_TYPES.find(type => original.every(word => word.schoolCategory !== type)) };
    const sameType = selectMorphologyForPlacement(edition, placement.id, [], first.id, [different]);
    const otherType = selectMorphologyForPlacement(edition, placement.id, [], first.id, [different], true);
    return { before: original.slice(1).map(word => word.surface), after: updated.placements[0].questions
      .find(question => question.kind === 'morphology').words.map(word => word.surface),
      sameType: sameType.length, fallback: otherType[0]?.surface };
  }, edition);
  expect(order.after).toEqual(['Zorvalix', ...order.before]);
  expect(order.sameType).toBe(0);
  expect(order.fallback).toBe('Zorvalix');
  await notebook.getByRole('button', { name: 'Elegir palabra en el texto' }).click();
  const editor = notebook.locator('.edition-menu-text textarea');
  const start = latin.lastIndexOf('Zorvalix');
  await editor.evaluate((area, start) => area.setSelectionRange(start, start + 'Zorvalix'.length), start);
  const replace = notebook.getByRole('combobox', { name: 'Subrayado que se sustituirá' });
  if (await replace.count()) await replace.selectOption({ index: 1 });
  await notebook.getByRole('button', { name: 'Subrayar palabra seleccionada' }).click();
  await expect.poll(async () => (await notebookSnapshot(notebook, 'Subrayados elegidos')).edition.placements[0].text.markup)
    .toEqual(expect.arrayContaining([expect.objectContaining({ exact: 'Zorvalix', startUtf16: start })]));

  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  await exam.locator('[data-k="texto"]').fill(latin);
  await expect(exam.locator('.subr .srow')).toHaveCount(4);
  const compareStyle = (frame, selector) => frame.locator(selector).first().evaluate(field => {
    const style = getComputedStyle(field);
    const card = getComputedStyle(field.closest('.card'));
    return [style.fontFamily, style.fontSize, style.fontStyle, card.padding, card.borderRadius, card.backgroundColor];
  });
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  await notebook.locator('.atl-edition-toolbar').getByRole('button', { name: 'Editar texto', exact: true }).click();
  const notebookStyles = await Promise.all(['.vrow .vh', '.qrow .it'].map(selector => compareStyle(notebook, selector)));
  const assertAlignedBadges = async frame => {
    const badges = frame.locator('.edition-academic-morph-row > .edition-morph-category:first-child');
    expect(await badges.count()).toBeGreaterThan(1);
    const metrics = await badges.evaluateAll(items => items.map(item => {
      const box = item.getBoundingClientRect(), style = getComputedStyle(item);
      return [box.width, box.height, style.justifyContent, style.textAlign];
    }));
    expect(new Set(metrics.map(metric => JSON.stringify(metric))).size).toBe(1);
    expect(metrics[0].slice(2)).toEqual(['center', 'center']);
  };
  await assertAlignedBadges(notebook);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  expect(await Promise.all(['.vrow .vh', '[data-q="pref"].it'].map(selector => compareStyle(exam, selector)))).toEqual(notebookStyles);
  const outcome = await exam.locator('html').evaluate(async () => {
    const M = window.M;
    const { replaceMark } = await import('./atl-exam-morphology.js');
    const tokens = ['Roma', 'venit', 'urbs'].map((w, i) => ({
      w, i, s: [0, 5, 11][i], e: [4, 10, 15][i], sel: { lid: i, morpho: i === 1 ? 'indicativo' : 'nominativo singular' },
      cands: [{ lid: i, lemma: w, pos: i === 1 ? 'v' : 'n', morphos: [i === 1 ? 'indicativo' : 'nominativo singular'] }]
    }));
    const first = { cat: 'sustantivo', toks: [0] }, second = { cat: 'verbo-personal', toks: [1] };
    const state = { texto: 'Roma venit urbs', tokens, subr: [first, second] };
    const changed = replaceMark(state, first);
    const fallback = { ...state, subr: [first], tokens: tokens.slice(0, 2) };
    const declined = replaceMark(fallback, first, () => false);
    const unchanged = fallback.subr[0] === first;
    const accepted = replaceMark(fallback, first, reading => reading.category === 'verbo-personal');
    const repeated = { texto: 'Roma Roma', subr: [first], tokens: [tokens[0], { ...tokens[0], i: 1, s: 5, e: 9 }] };
    const sameSpelling = replaceMark(repeated, first, () => true);
    const rows = M.Exam.q4({ ...M.S, prev: [{ txt: 'venio', n: 3 }, { txt: 'capio', n: 2 }],
      evol: [{ w: 'rosa' }, { w: 'aqua' }], pref: ['superponer', 'anteponer'], latin: ['vice versa', 'ad hoc'] });
    return { changed, declined, unchanged, accepted, sameSpelling, order: state.subr.map(mark => mark.toks[0]), lexical: rows.map(row => row.filter(item => item.i).map(item => item.t)) };
  });
  expect(outcome).toEqual({ changed: true, declined: false, unchanged: true, accepted: true, sameSpelling: false, order: [2, 1],
    lexical: [['venio', 'capio'], ['aqua', 'rosa'], ['anteponer', 'superponer'], ['ad hoc', 'vice versa']] });
  const initialTypes = await exam.locator('.subr .srow .lg').allTextContents();
  expect(new Set(initialTypes).size).toBe(4);
  await expect(exam.locator('.subr .legend')).toContainText('Infinitivo');
  await expect(exam.locator('.subr .legend')).toContainText('Participio');
  await assertAlignedBadges(exam);
  const badges = exam.locator('.subr .legend [data-category]');
  expect(new Set(await badges.evaluateAll(items => items.map(item =>
    getComputedStyle(item).getPropertyValue('--cat').trim()))).size).toBe(7);
  await exam.locator('html').evaluate(() => {
    const exam = window.M.S;
    exam.subr[0].analysis = 'análisis morfológico contextual muy largo '.repeat(12) + 'forma'.repeat(30);
    window.M.renderEditor();
  });
  expect(await exam.locator('.subr .srow').first().evaluate(row => row.scrollWidth <= row.clientWidth + 1)).toBe(true);
  await exam.locator('.subr .srow').first().getByRole('button', { name: 'Revisar análisis' }).click();
  await expect(exam.locator('.morph-reading option').first()).toBeAttached();
  await exam.getByRole('button', { name: 'Confirmar lectura' }).click();
  const word = exam.locator('.words .wd').filter({ hasText: /^Zorvalix$/ }).last();
  await word.click();
  await exam.locator('.pop [data-u]').click();
  await exam.locator('.morph-replacement').selectOption({ index: 1 });
  await exam.getByRole('button', { name: 'Subrayar', exact: true }).click();
  await expect(word).toHaveClass(/\bu\b/);
  await expect(exam.locator('.words .wd').filter({ hasText: /^Zorvalix$/ }).first()).not.toHaveClass(/\bu\b/);
  await expect(exam.locator('.subr .srow').filter({ hasText: 'Zorvalix' })).toContainText('Sin clasificar');
});

test('el banco permite crear, reutilizar y filtrar etiquetas propias desde las tarjetas', async ({ page }) => {
  await page.goto(path);
  const notebook = await seedBank(page);
  const bank = notebook.getByRole('region', { name: 'Banco de textos propios' });
  const modal = notebook.locator('.modal').last();
  const open = title => bank.getByRole('button', { name: 'Etiquetar «' + title + '»', exact: true }).click();
  const name = modal.getByRole('textbox', { name: 'Nombre de etiqueta propia' });
  await open('Uno');
  await name.fill('Repaso de invierno');
  await modal.getByRole('button', { name: 'Añadir etiqueta propia' }).click();
  await expect(modal.locator('.cuaderno-bank-current')).toContainText('Repaso de invierno');
  await modal.getByRole('button', { name: 'Guardar etiquetas', exact: true }).click();
  const chip = bank.getByRole('button', { name: 'Filtrar por etiqueta «Repaso de invierno»' });
  await expect(chip).toHaveAttribute('data-group', 'custom');
  await chip.click();
  await expect(bank.getByRole('status').last()).toContainText('Mostrando 1 de');
  await bank.getByRole('button', { name: 'Quitar filtro «Repaso de invierno»' }).click();
  await open('Dos');
  await name.fill('repaso de invierno');
  await name.press('Enter');
  await modal.getByRole('button', { name: 'Guardar etiquetas', exact: true }).click();
  await expect(chip).toHaveCount(2);
  await page.reload();
  await expect(chip).toHaveCount(2);
  const shortcut = bank.getByRole('button', { name: 'Ver textos con «Repaso de invierno»' });
  await expect(shortcut).toContainText('· 2');
  await shortcut.click();
  await expect(shortcut).toHaveAttribute('aria-pressed', 'true');
  await expect(bank.getByRole('status').last()).toContainText('Mostrando 2 de');
});

test('las copias manuales distinguen una versión idéntica, nueva, antigua y divergente', async ({ page, browser }) => {
  await page.goto(path);
  const bank = await seedBank(page);
  const capture = page => page.evaluate(async () => (await import('./backup-store.js')).captureBackup());
  const compare = (page, backup, apply = false) => page.evaluate(async ({ backup, apply }) => {
    const { readBackupFile, planRestore, restoreBackup } = await import('./backup-store.js');
    const payload = await readBackupFile(JSON.stringify(backup));
    const plan = await planRestore(payload);
    if (apply) await restoreBackup(payload, plan);
    return { comparison: plan.comparison, conflicts: plan.conflicts };
  }, { backup, apply });
  await page.evaluate(() => localStorage.setItem('atl-v1:examinator.asig', 'Versión inicial'));
  const initial = await capture(page);
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(page.url());
    await compare(other, initial, true);
    expect((await compare(other, initial)).comparison).toBe('same');
    await page.evaluate(() => localStorage.setItem('atl-v1:examinator.asig', 'Versión actualizada'));
    const newer = await capture(page);
    expect((await compare(other, newer, true)).comparison).toBe('newer');
    expect(await other.evaluate(() => localStorage.getItem('atl-v1:examinator.asig'))).toBe('Versión actualizada');
    expect((await compare(other, initial)).comparison).toBe('older');
    await page.evaluate(() => localStorage.removeItem('atl-v1:examinator.asig'));
    await bank.locator('html').evaluate(async () => {
      const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
      const repo = new IndexedDbCorpusRepository();
      const { corpus, revision } = await repo.load();
      await repo.save({ ...corpus, texts: corpus.texts.filter(text => text.id !== 'doc.uno') }, revision);
    });
    const removed = await capture(page);
    expect((await compare(other, removed, true)).comparison).toBe('newer');
    expect(await other.evaluate(() => localStorage.getItem('atl-v1:examinator.asig'))).toBeNull();
    expect((await capture(other)).contentHash).toBe(removed.contentHash);
    await page.evaluate(() => localStorage.setItem('atl-v1:examinator.asig', 'Cambio A'));
    await other.evaluate(() => localStorage.setItem('atl-v1:examinator.asig', 'Cambio B'));
    expect(await compare(other, await capture(page))).toMatchObject({ comparison: 'unknown',
      conflicts: expect.arrayContaining(['atl-v1:examinator.asig']) });
  } finally { await context.close(); }
});

test('Cuadernos y Examinator reservan el mismo ancho al menú y a la hoja', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 950 });
  await page.goto(path);
  await page.getByRole('tab', { name: 'Examinator' }).click();
  const exam = page.frameLocator('#panel-examinator iframe');
  const width = (frame, selector) => frame.locator(selector).evaluate(node => node.getBoundingClientRect().width);
  const expected = await Promise.all([width(exam, '#editor'), width(exam, '#preview')]);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const book = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Proporción de pantalla'));
  await book.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await expect(book.locator('.edition-preview-stack')).toBeVisible();
  expect(await Promise.all([width(book, '#editor'), width(book, '.edition-preview-stack')])).toEqual(expected);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(book.locator('.edition-preview-stack > .edition-preview')).toBeHidden();
  await expect(book.getByRole('combobox', { name: 'Ir a texto del cuaderno' })).toBeVisible();
  expect(await width(book, '#editor')).toBe(await width(book, '#main'));
  await book.locator('.edition-mobile-switch').getByRole('button', { name: 'Vista previa' }).click();
  await expect(book.locator('.edition-preview-stack')).toBeVisible();
  await expect(book.locator('.edition-settings')).toBeHidden();
});

test('las copias de Cuadernos abren un diálogo sin mover el botón', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Copia de aula'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  const trigger = notebook.locator('.cuaderno-editor-overview').getByRole('button', { name: 'Copias de seguridad' });
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.boundingBox();
  await trigger.click();
  const modal = notebook.locator('.modal').filter({ hasText: 'Copias de Cuadernos' });
  await expect(modal).toBeVisible();
  expect(await trigger.boundingBox()).toEqual(before);
  const download = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Copia del cuaderno', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^copia-cuaderno/);
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(trigger).toBeFocused();
});


test('la ficha Collatinus subraya la aparición elegida, ofrece sustitución y actualiza morfología sin cambiar otras preguntas', async ({ page }) => {
  const latin = lexicalPassage + ' Zorvalix Zorvalix.';
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const notebook = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', dialog => dialog.accept('Subrayado desde Collatinus'));
  await notebook.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await notebook.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = notebook.locator('.original-paste');
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill(latin);
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  const snapshot = () => notebookSnapshot(notebook, 'Subrayado desde Collatinus');
  await expect.poll(async () => Boolean((await snapshot())?.edition?.placements?.length)).toBe(true);
  const before = (await snapshot()).edition.placements[0];
  const priorMorph = before.questions.find(question => question.kind === 'morphology').words;
  const otherQuestions = before.questions.filter(question => question.kind !== 'morphology');
  const targetStart = latin.lastIndexOf('Zorvalix');
  const previewTab = notebook.locator('.edition-mobile-switch').getByRole('button', { name: 'Vista previa' });
  if (await previewTab.isVisible()) await previewTab.click();
  const paragraph = notebook.locator('.edition-paper .edition-latin').first();
  await expect(paragraph).toBeVisible();
  await paragraph.scrollIntoViewIfNeeded();
  const point = await paragraph.evaluate((element, start) => {
    const end = start + 'Zorvalix'.length;
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text, offset = 0, first = null, last = null, left = 0, right = 0;
    while ((text = walk.nextNode())) {
      const limit = offset + text.textContent.length;
      if (first === null && start >= offset && start < limit) { first = text; left = start - offset; }
      if (end > offset && end <= limit) { last = text; right = end - offset; break; }
      offset = limit;
    }
    if (!first || !last) throw Error('No se encontró la aparición exacta');
    const range = document.createRange();
    range.setStart(first, left); range.setEnd(last, right);
    const word = range.getBoundingClientRect();
    return { x: word.left + word.width / 2, y: word.top + word.height / 2 };
  }, targetStart);
  const frameBox = await page.locator('#panel-cuaderno iframe').boundingBox();
  expect(frameBox).not.toBeNull();
  await page.mouse.click(frameBox.x + point.x, frameBox.y + point.y);
  const card = notebook.locator('.edition-lexical-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Zorvalix');
  const add = card.getByRole('button', { name: 'Subrayar para análisis morfológico' });
  await expect(add).toBeVisible();
  if (priorMorph.length >= 4) {
    const select = card.getByRole('combobox', { name: 'Palabra subrayada que se sustituirá' });
    await expect(select).toBeVisible();
    await expect(add).toBeDisabled();
    await select.selectOption({ index: 1 });
    await expect(add).toBeEnabled();
  }
  await add.click();
  await expect.poll(async () => (await snapshot()).edition.placements[0].text.markup
    .some(mark => mark.kind === 'morph-underline' && mark.startUtf16 === targetStart && mark.exact === 'Zorvalix')).toBe(true);
  const after = (await snapshot()).edition.placements[0];
  expect(after.questions.filter(question => question.kind !== 'morphology')).toEqual(otherQuestions);
  expect(after.questions.find(question => question.kind === 'morphology').words.length).toBeLessThanOrEqual(4);
  await expect(notebook.locator('.edition-academic-morph-row').filter({ hasText: 'Zorvalix' })).toBeVisible();
});
