import { writeFile } from 'node:fs/promises';
import { test, expect } from './isolated-bank.mjs';

const path = '/ThesaurusScriptorumLatinorum/';
const label = 'Menú contextual del texto latino';
const original = 'Cæsar, cognito consilio hostium, legiones suas in castra reduxit.';

async function select(field, value, from = 0) {
  await field.evaluate((area, { value, from }) => {
    const start = area.value.indexOf(value, from);
    if (start < 0) throw new Error('Selección ausente: ' + value);
    area.focus({ preventScroll: true });
    area.setSelectionRange(start, start + value.length);
  }, { value, from });
}

async function action(frame, field, value, name, from) {
  await select(field, value, from);
  await field.press('Shift+F10');
  await frame.getByRole('menu', { name: label }).getByRole('menuitem', { name, exact: true }).click();
}

async function openExam(page) {
  await page.goto(path + '#examinator');
  const frame = page.frameLocator('#panel-examinator iframe');
  const field = frame.locator('textarea[data-k=texto]');
  await expect(field).toBeVisible();
  return { frame, field, body: frame.locator('body') };
}

async function bankFixture(page, annotate = false) {
  await page.goto(path);
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  const dialog = frame.locator('.modal').last();
  await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
  await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('Fuente contextual');
  const latin = dialog.getByRole('textbox', { name: 'Texto latino', exact: true });
  await latin.fill(original);
  if (annotate) await action(frame, latin, 'cognito consilio', 'Subrayar');
  await dialog.getByRole('button', { name: 'Guardar en el banco' }).click();
  const card = bank.locator('.atl-bank-card').filter({ hasText: 'Fuente contextual' });
  await card.click();
  return { frame, bank, card, dialog, field: dialog.getByRole('textbox', { name: 'Texto latino', exact: true }) };
}

test('Banco protege Selectividad, persiste subrayados y Cuaderno edita una copia', async ({ page }) => {
  const { frame, card, dialog, field } = await bankFixture(page, true);
  const save = dialog.getByRole('button', { name: 'Guardar cambios' });
  await dialog.getByRole('checkbox', { name: 'Selectividad', exact: true }).check();
  await save.click();
  await card.click();
  await select(field, 'cognito consilio');
  await field.press('Shift+F10');
  await expect(frame.getByRole('menuitem', { name: 'Quitar subrayado' })).toBeVisible();
  await field.press('Escape');
  await action(frame, field, 'hostium', 'Omitir fragmento […]');
  page.once('dialog', async warning => {
    expect(warning.message()).toContain('Selectividad');
    await warning.dismiss();
  });
  await save.click();
  await expect(dialog).toBeVisible();
  await action(frame, field, '[…]', 'Deshacer');
  await expect(field).toHaveValue(original);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  page.once('dialog', prompt => prompt.accept('Cuaderno contextual'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await frame.getByRole('button', { name: 'Banco propio', exact: true }).click();
  const picker = frame.locator('.original-bank-picker');
  await picker.getByRole('checkbox', { name: 'Seleccionar «Fuente contextual»' }).check();
  await picker.getByRole('button', { name: 'Añadir seleccionados (1)' }).click();
  await expect(picker).toBeHidden();
  await frame.getByRole('button', { name: 'Editar texto', exact: true }).click();
  const copy = frame.locator('.edition-menu-text textarea').last();
  await action(frame, copy, 'cognito consilio', 'Omitir fragmento […]');
  await expect(copy).toHaveValue('Cæsar, […] hostium, legiones suas in castra reduxit.');
  await expect(frame.locator('.edition-latin .edition-underlined').filter({ hasText: 'cognito consilio' })).toHaveCount(0);
  await action(frame, copy, '[…]', 'Deshacer');
  await expect(copy).toHaveValue(original);
  await expect(frame.locator('.edition-latin .edition-underlined').filter({ hasText: 'cognito consilio' }).first()).toHaveText('cognito consilio');
  await action(frame, copy, 'cognito consilio', 'Rehacer');
  await expect(copy).toHaveValue('Cæsar, […] hostium, legiones suas in castra reduxit.');
  await page.getByRole('tab', { name: 'Banco de textos' }).click();
  await card.click();
  await expect(field).toHaveValue(original);
});

test('Examinator opera sobre una aparición exacta y exporta Word y HTML de impresión', async ({ page }, info) => {
  const { frame, field, body } = await openExam(page);
  await field.fill('Caesar milit[es] Caesar copias misit.');
  await expect.poll(() => body.evaluate(() => window.M.S.textAnalyzed)).toContain('Caesar copias');
  await action(frame, field, '[es]', 'Quitar corchetes');
  await action(frame, field, 'es', 'Encerrar entre corchetes', 8);
  if (info.project.name === 'escritorio') {
    const coordinates = await field.evaluate(area => {
      area.style.font = '16px/22px monospace';
      area.focus();
      area.setSelectionRange(0, 0);
      const css = getComputedStyle(area);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '16px monospace';
      return { x: parseFloat(css.paddingLeft) + ctx.measureText('Caesar milit[es] Ca').width,
        y: parseFloat(css.paddingTop) + 10 };
    });
    await field.click({ button: 'right', position: coordinates });
    await expect(frame.getByRole('menu', { name: label })).toBeVisible();
    await frame.getByRole('menuitem', { name: 'Sustituir fragmento…' }).click();
    const dialog = frame.getByRole('dialog', { name: 'Sustituir fragmento…' });
    await expect(dialog.locator('blockquote')).toHaveText('Caesar');
    await dialog.getByRole('textbox').fill('Cæsar');
    await dialog.getByRole('button', { name: 'Aplicar' }).click();
    await expect(field).toHaveValue('Caesar milit[es] Cæsar copias misit.');
  }
  const lit = frame.locator('textarea[data-lit=texto]');
  await lit.fill('[Afranius Petreiusque] […] copias reduxerunt.');
  await action(frame, lit, 'Afranius Petreiusque', 'Subrayar');
  await expect(frame.locator('.litLatin u')).toHaveText('Afranius Petreiusque');
  await expect(frame.locator('.litLatin .nr')).toHaveText(['[', ']', '[…]']);
  const exported = await body.evaluate(async () => {
    const { M } = window;
    const encoded = await M.Exam.docx(M.S);
    const zip = await window.JSZip.loadAsync(encoded, { base64: true });
    const xml = await zip.file('word/document.xml').async('string');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const flags = [...parsed.getElementsByTagNameNS(ns, 'r')]
      .filter(run => ['[', ']', '[…]', 'Afranius Petreiusque'].includes(run.textContent))
      .map(run => [run.textContent, Boolean(run.getElementsByTagNameNS(ns, 'i').length),
        Boolean(run.getElementsByTagNameNS(ns, 'u').length)]);
    const print = new DOMParser().parseFromString(M.Exam.printDoc(M.S), 'text/html');
    return { flags, print: print.querySelector('.litLatin u').textContent,
      menu: Boolean(print.querySelector('.atl-latin-context')) };
  });
  expect(exported.flags).toContainEqual(['Afranius Petreiusque', true, true]);
  expect(exported.flags).toContainEqual(['[…]', false, false]);
  expect(exported.print).toBe('Afranius Petreiusque');
  expect(exported.menu).toBe(false);
  await body.evaluate(() => window.M.persistNow());
  await page.reload();
  await expect(lit).toHaveValue('[Afranius Petreiusque] […] copias reduxerunt.');
  await expect(frame.locator('.litLatin u')).toHaveText('Afranius Petreiusque');
});

test('botón táctil y teclado respetan el iframe, la selección y los tres temas', async ({ page, hasTouch }) => {
  const { frame, field } = await openExam(page);
  await field.fill(original);
  await expect.poll(() => frame.locator('body').evaluate(() => window.M.S.textAnalyzed)).toBe(original);
  for (const theme of ['light', 'dark', 'oled']) {
    await page.locator('#app-theme').selectOption(theme);
    if (hasTouch) {
      await field.tap();
      await select(field, 'hostium');
      await field.dispatchEvent('pointerup', { pointerType: 'touch', button: 0, bubbles: true });
      const trigger = frame.getByRole('button', { name: 'Abrir menú del texto latino' });
      await expect(trigger).toBeVisible();
      await trigger.tap();
    } else {
      await select(field, 'hostium');
      await field.press('Shift+F10');
    }
    const menu = frame.getByRole('menu', { name: label });
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(element => {
      const box = element.getBoundingClientRect(), view = window.visualViewport;
      return box.left >= 0 && box.top >= 0 && box.right <= view.width && box.bottom <= view.height;
    })).toBe(true);
    if (!hasTouch) {
      await menu.getByRole('menuitem').first().press('End');
      await expect(menu.getByRole('menuitem').last()).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    expect(await field.evaluate(area => area.value.slice(area.selectionStart, area.selectionEnd))).toBe('hostium');
  }
});

test('Banco consulta Collatinus, guarda vocabulario revisado y filtra una etiqueta anclada', async ({ page }) => {
  const { frame, card, dialog, field, bank } = await bankFixture(page);
  await action(frame, field, 'cognito consilio', 'Consultar Collatinus');
  const reading = frame.getByRole('dialog', { name: 'Lematización de cognito consilio' });
  await expect(reading.locator('.edition-lexical-lemma-name').first()).toBeVisible({ timeout: 15_000 });
  await reading.getByRole('button', { name: 'Cerrar ficha' }).click();

  await action(frame, field, 'hostium', 'Añadir al vocabulario');
  const vocabulary = frame.getByRole('dialog', { name: 'Añadir al vocabulario' });
  await expect(vocabulary.getByRole('textbox', { name: 'Enunciado latino' })).not.toHaveValue('hostium');
  await vocabulary.getByRole('textbox', { name: 'Significado en español' }).fill('enemigos en este pasaje');
  await vocabulary.getByRole('button', { name: 'Incorporar al vocabulario' }).click();

  await action(frame, field, 'cognito consilio hostium', 'Etiquetar gramaticalmente');
  const grammar = frame.getByRole('dialog', { name: 'Etiquetar gramaticalmente' });
  await grammar.getByRole('combobox', { name: 'Etiqueta gramatical' }).selectOption('gram.ablativo.absoluto');
  await grammar.getByRole('button', { name: 'Asignar al fragmento' }).click();
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  const chip = bank.getByRole('button', { name: 'Filtrar por etiqueta «Ablativo absoluto»' });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(card).toBeVisible();

  const snapshot = () => frame.locator('body').evaluate(async () => {
    const { IndexedDbCorpusRepository } = await import('../storage/indexeddb-corpus-repository.js');
    const { WorkspaceRepository } = await import('../storage/workspace-repository.js');
    const saved = await Promise.all([new IndexedDbCorpusRepository().load(), new WorkspaceRepository().loadCorpus()]);
    return saved.flatMap(item => item.corpus.texts).find(item => item.title === 'Fuente contextual');
  });
  const stored = await snapshot();
  expect(stored.tagIds).not.toContain('gram.ablativo.absoluto');
  expect(stored.grammaticalSpans).toMatchObject([{ startUtf16: 7, exact: 'cognito consilio hostium', tagIds: ['gram.ablativo.absoluto'] }]);
  expect(stored.vocabulary).toMatchObject([{ meaning: 'enemigos en este pasaje', origin: 'manual' }]);

  await bank.getByRole('button', { name: 'Leer «Fuente contextual»' }).click();
  const readOnly = frame.locator('.atl-reader-latin');
  await readOnly.evaluate(field => {
    field.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(field);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await readOnly.press('Shift+F10');
  await expect(frame.getByRole('menuitem')).toHaveText(['Consultar Collatinus']);
  await readOnly.press('Escape');
});

test('Examinator conserva el vocabulario docente e invalida sólo el étimo seleccionado', async ({ page }) => {
  const { frame, field, body } = await openExam(page);
  const sample = await body.evaluate(() => {
    const { M } = window;
    const candidates = M.LexicalFilters.evolCandidates(M.S).filter(item => /^[a-z]+$/iu.test(item.w));
    M.S.evol = [];
    return candidates[0].w;
  });
  const latin = `Cæsar ${sample} ${sample} hostium copias in castra reduxit.`;
  await field.fill(latin);
  await expect.poll(() => body.evaluate(() => window.M.S.textAnalyzed), { timeout: 20_000 }).toBe(latin);
  await action(frame, field, 'hostium', 'Consultar Collatinus');
  const card = frame.getByRole('dialog', { name: 'Análisis morfológico de hostium' });
  await expect(card.locator('.ex-latin-lemma-title').first()).toBeVisible();
  await card.getByRole('button', { name: 'Cerrar análisis' }).click();

  await action(frame, field, 'hostium', 'Añadir al vocabulario');
  const vocab = frame.getByRole('dialog', { name: 'Añadir al vocabulario' });
  await vocab.getByRole('textbox', { name: 'Significado en español' }).fill('enemigos (entrada de prueba)');
  await vocab.getByRole('button', { name: 'Incorporar al vocabulario' }).click();
  await action(frame, field, sample, 'Añadir a pregunta o ejercicio', latin.indexOf(sample) + 1);
  const choices = frame.getByRole('dialog', { name: 'Añadir a pregunta o ejercicio' });
  await choices.getByRole('button', { name: 'Evolución fonética', exact: true }).click();
  await expect(frame.locator('[data-q=evol]').first()).not.toHaveValue('');
  const positioned = () => body.evaluate(() => window.M.S.atlQuestionAnchors[0]?.anchor.startUtf16 ?? null);
  expect(await positioned()).toBe(latin.lastIndexOf(sample));
  await action(frame, field, sample, 'Omitir fragmento […]', latin.indexOf(sample) + 1);
  await expect.poll(positioned).toBe(null);
  await expect(frame.locator('[data-q=evol]').first()).toHaveValue('');
  await expect.poll(() => body.evaluate(() => window.M.S.vocabItems.find(item => item.manual)?.trad)).toBe('enemigos (entrada de prueba)');
  await action(frame, field, '[…]', 'Deshacer');
  expect(await positioned()).toBe(latin.lastIndexOf(sample));
  await expect(field).toHaveValue(latin);
});

test('el PDF generado y los estilos de impresión conservan los signos y el subrayado', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'Una exportación PDF basta, con impresión HTML comprobada en los tres perfiles.');
  const { frame, field, body } = await openExam(page);
  const latin = '[Afranius Petreiusque] […] copias reduxerunt.';
  await field.fill(latin);
  await expect.poll(() => body.evaluate(() => window.M.S.textAnalyzed)).toBe(latin);
  await action(frame, field, 'Afranius Petreiusque', 'Subrayar');
  const pdf = await body.evaluate(async () => {
    const M = window.M, html = M.Exam.printDoc(M.S);
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const passage = parsed.querySelector('.txt');
    const normal = [...passage.querySelectorAll('.nr')].map(sign => sign.textContent);
    const marked = [...passage.querySelectorAll('u')].map(sign => sign.textContent).join('');
    await window.atlLoadPdfExporter();
    const blob = await window.EXPdf.generate(html);
    return { normal, marked, bytes: [...new Uint8Array(await blob.arrayBuffer())] };
  });
  expect(pdf.normal).toEqual(['[', ']', '[…]']);
  expect(pdf.marked).toContain('Afranius Petreiusque');
  const binary = Buffer.from(pdf.bytes);
  expect(binary.subarray(0, 5).toString()).toBe('%PDF-');
  const output = info.outputPath('impresion-contextual.pdf');
  await writeFile(output, binary);
  await info.attach('impresion-contextual', { path: output, contentType: 'application/pdf' });
});

test('Cuaderno incorpora un ejercicio compatible sin regenerar las otras opciones', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('tab', { name: 'Cuadernos' }).click();
  const frame = page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog', prompt => prompt.accept('Ejercicios contextuales'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await frame.getByRole('button', { name: 'Pegar texto', exact: true }).click();
  const paste = frame.locator('.original-paste');
  const latin = 'Cæsar lupum portum abbatem advocatum conspexit.';
  await paste.getByRole('textbox', { name: 'Texto latino' }).fill(latin);
  await paste.getByRole('button', { name: 'Añadir al cuaderno' }).click();
  await expect(paste).toBeHidden();
  await frame.getByRole('button', { name: 'Editar texto', exact: true }).click();
  const editor = frame.locator('.edition-menu-text textarea').last();
  const snapshot = () => frame.locator('body').evaluate(async () => {
    const { WorkspaceRepository } = await import('../storage/workspace-repository.js');
    const entry = (await new WorkspaceRepository().listEditions()).find(row => row.edition.title === 'Ejercicios contextuales');
    return entry.edition.placements[0].questions.find(item => item.kind === 'choice').options;
  });
  const before = await snapshot();
  const originalWords = before.flatMap(item => item.slots.map(slot => slot.value.toLowerCase()));
  const selected = ['lupum', 'portum', 'abbatem', 'advocatum'].find(word => !originalWords.includes(word));
  await select(editor, selected);
  await editor.press('Shift+F10');
  await frame.getByRole('menuitem', { name: 'Añadir a pregunta o ejercicio' }).click();
  const panel = frame.getByRole('dialog', { name: 'Añadir a pregunta o ejercicio' });
  const phonetics = panel.getByRole('button', { name: /Evolución fonética/ }).first();
  await expect(phonetics).toBeVisible();
  await expect(panel.getByRole('button', { name: /Modificación preverbial/ })).toHaveCount(0);
  await phonetics.click();
  await expect(panel).toBeHidden();
  await expect.poll(async () => (await snapshot()).find(item => item.kind === 'phonetics').slots.some(slot =>
    slot.sourceAnchor?.exact === selected)).toBe(true);
  expect((await snapshot()).filter(item => item.kind !== 'phonetics')).toEqual(before.filter(item => item.kind !== 'phonetics'));
  await action(frame, editor, selected, 'Deshacer');
  await expect.poll(async () => (await snapshot()).find(item => item.kind === 'phonetics').slots.some(slot =>
    slot.sourceAnchor?.exact === selected)).toBe(false);
});

test('la ficha conserva la selección con clic secundario y pinta las omisiones en redonda', async ({ page }) => {
  const { frame, field } = await bankFixture(page);
  await select(field, 'cognito consilio');
  await field.click({ button: 'right' });
  await expect(frame.getByRole('menu', { name: label })).toBeVisible();
  await expect(field).toBeFocused();
  expect(await field.evaluate(area => area.value.slice(area.selectionStart, area.selectionEnd))).toBe('cognito consilio');
  await frame.getByRole('menuitem', { name: 'Omitir fragmento […]' }).click();
  const rendered = frame.locator('.atl-edit-latin-render');
  await expect(rendered.locator('.edition-roman')).toHaveText('[…]');
  await expect(rendered.locator('.edition-roman')).toHaveCSS('font-style', 'normal');
  await expect(rendered).toHaveCSS('font-style', 'italic');
  await field.fill('[...] copias reduxit.');
  await expect(rendered.locator('.edition-roman')).toHaveText('[...]');
});
