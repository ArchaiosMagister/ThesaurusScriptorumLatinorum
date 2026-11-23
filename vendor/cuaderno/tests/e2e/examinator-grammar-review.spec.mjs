import {test,expect} from '@playwright/test';

test('Collatinus propone una pasiva y guarda únicamente la selección confirmada',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Revisión latina'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Amatus est. Loquitur. Liber legendus.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await page.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
  await modal.getByRole('button',{name:'Analizar etiquetas con Collatinus'}).click();
  const candidate=modal.locator('details').filter({has:page.getByText('Amatus est · Voz pasiva · Pendiente',{exact:true})});
  await candidate.locator('summary').click();
  await expect(candidate).toContainText('formas adyacentes');
  await expect(candidate).toContainText('Requiere revisión sintáctica.');
  await expect(modal.getByText('Etiquetar fragmentos del texto (0)',{exact:true})).toBeVisible();
  await candidate.getByRole('button',{name:'Aceptar',exact:true}).click();
  await expect(modal.getByText('Amatus est · Voz pasiva · Confirmada',{exact:true})).toBeVisible();
  await expect(modal.getByText('Etiquetar fragmentos del texto (1)',{exact:true})).toBeVisible();
  await expect(modal.getByText('Loquitur · Voz pasiva',{exact:false})).toHaveCount(0);
  await expect(modal.getByText('legendus · Gerundivo',{exact:false})).toHaveCount(0);
});

test('copia individual traslada etiquetas y fuentes a otro perfil sin duplicar el cuaderno',async({page,browser})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno de respaldo'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill('Pasaje transportable');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Amatus est. Loquitur.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await page.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
  await modal.getByRole('textbox',{name:'Nueva etiqueta gramatical'}).fill('Pasiva del temario');
  await modal.getByRole('button',{name:'Añadir',exact:true}).click();
  await expect(modal.getByText('Etiquetas gramaticales (1)',{exact:true})).toBeVisible();
  await modal.getByText('Etiquetar fragmentos del texto (0)',{exact:true}).click();
  await modal.getByRole('combobox',{name:'Construcción del fragmento'}).selectOption('gram.voz.pasiva');
  await modal.getByRole('textbox',{name:'Seleccionar fragmento latino'}).evaluate(area=>area.setSelectionRange(0,10));
  await modal.getByRole('button',{name:'Etiquetar selección'}).click();
  await expect(modal.getByText('Etiquetar fragmentos del texto (1)',{exact:true})).toBeVisible();
  await modal.getByText('Etiquetar fragmentos del texto (1)',{exact:true}).click();
  await modal.getByRole('combobox',{name:'Construcción del fragmento'}).selectOption('gram.formas');
  await modal.getByRole('textbox',{name:'Seleccionar fragmento latino'}).evaluate(area=>area.setSelectionRange(0,10));
  await modal.getByRole('button',{name:'Etiquetar selección'}).click();
  await modal.getByText('Etiquetar fragmentos del texto (1)',{exact:true}).click();
  await modal.getByRole('combobox',{name:/Etiqueta que quitar/}).selectOption('gram.formas');
  await modal.getByRole('button',{name:'Quitar etiqueta',exact:true}).click();
  await modal.getByText('Etiquetar fragmentos del texto (1)',{exact:true}).click();
  await expect(modal.locator('.notebook-fragment-row')).toContainText('Amatus est · Voz pasiva');
  await expect(modal.getByRole('combobox',{name:/Etiqueta que quitar/})).toHaveCount(0);
  await modal.getByRole('button',{name:'Analizar etiquetas con Collatinus'}).click();
  await modal.getByText(/Loquitur · .* · Pendiente/).click();
  const candidate=modal.locator('details').filter({has:page.getByText(/Loquitur · .* · Pendiente/)});
  await candidate.getByRole('button',{name:'Descartar',exact:true}).click();
  await expect(modal.getByText(/Loquitur · .* · Descartada/)).toBeVisible();
  await modal.getByRole('button',{name:'Cerrar'}).click();
  await page.getByText('Copias de seguridad',{exact:true}).click();
  const [download]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'Copia del cuaderno',exact:true}).click(),
  ]);
  const path=await download.path();
  const target=await browser.newContext();
  try{
    const restored=await target.newPage();
    await restored.goto('/examinator-cuadernos/');
    const restoredSelector=restored.getByRole('combobox',{name:'Elegir cuaderno',exact:true});
    await expect(restored.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
    const file=restored.locator('#editor .card input[type=file]');
    restored.once('dialog',dialog=>dialog.accept());
    await file.setInputFiles(path);
    await expect(restoredSelector.locator('option:checked')).toContainText('Cuaderno de respaldo');
    await file.setInputFiles(path);
    await expect(restored.getByText('Esta copia ya se había importado.',{exact:true})).toBeVisible();
    await expect(restoredSelector.locator('option')).toHaveCount(2);
    await restored.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
    const restoredModal=restored.locator('.modal').last();
    await expect(restoredModal.getByText('Etiquetar fragmentos del texto (1)',{exact:true})).toBeVisible();
    await restoredModal.getByText('Personalizadas',{exact:true}).click();
    await expect(restoredModal.getByLabel('Pasiva del temario',{exact:true})).toBeChecked();
    await restoredModal.getByRole('button',{name:'Analizar etiquetas con Collatinus'}).click();
    await expect(restoredModal.getByText(/Loquitur · .* · Descartada/)).toBeVisible();
    await restoredModal.getByRole('button',{name:'Cerrar'}).click();

    await restored.locator('#btnOpen').click();
    await expect(restored.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
    restored.once('dialog',dialog=>dialog.accept('Cuaderno nuevo'));
    await restored.locator('#btnNew').click();
    await restored.getByRole('button',{name:'Banco propio'}).click();
    await restored.getByRole('button',{name:'Añadir «Pasaje transportable» al cuaderno',exact:true}).click();
    await expect(restored.locator('.edition-counter')).toContainText('Texto 1 de 1');
    await restored.getByRole('button',{name:'Banco propio'}).click();
    const picker=restored.locator('.modal').last();
    // Un texto ya incorporado se oculta del selector de ese cuaderno.
    await expect(picker.getByRole('button',{name:'Quitar del banco: Pasaje transportable'})).toHaveCount(0);
    await picker.getByRole('button',{name:'Cerrar'}).click();
    await restored.locator('#btnOpen').click();
    // La retirada de una fuente usada se realiza desde el banco general de Inicio.
    const general=restored.locator('.cuaderno-home-bank');
    await general.locator('.cuaderno-home-category').first().locator('summary').first().click();
    const source=general.locator('.cuaderno-home-text').filter({hasText:'Pasaje transportable'}).first();
    await source.locator('summary').first().click();
    restored.once('dialog',dialog=>dialog.accept());
    await source.getByRole('button',{name:'Quitar del banco'}).click();
    await restored.locator('.cuaderno-home-card').filter({hasText:'Cuaderno nuevo'})
      .getByRole('button',{name:'Abrir'}).click();
    await expect(restored.locator('.edition-paper-title')).toHaveText('Pasaje transportable');
  }finally{
    await target.close();
  }
  await expect(page.getByRole('combobox',{name:'Elegir cuaderno',exact:true}).locator('option')).toHaveCount(2);
});

test('la revisión reutiliza un análisis y mantiene el pasaje junto a la propuesta', async ({page}) => {
  let analyses = 0, warmups = 0;
  await page.exposeFunction('countCollatinusAnalysis', () => { analyses++; });
  await page.exposeFunction('countCollatinusWarm', () => { warmups++; });
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function(message, ...args) {
      if (message?.method === 'analyze') window.countCollatinusAnalysis();
      if (message?.method === 'warm') window.countCollatinusWarm();
      return post.call(this, message, ...args);
    };
  });
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  expect(warmups).toBe(0); // La portada no prepara Collatinus por anticipado.
  page.once('dialog',dialog=>dialog.accept('Prueba de análisis'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Amavisse dicit.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await page.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
  await expect.poll(()=>warmups).toBe(1);
  const analyze=modal.getByRole('button',{name:'Analizar etiquetas con Collatinus'});
  for (let i = 0; i < 2; i++) {
    await analyze.click();
    const proposal=modal.getByText('Amavisse · Infinitivo de perfecto activo · Pendiente',{exact:true});
    await expect(proposal).toBeVisible();
    await expect(analyze).toBeEnabled();
  }
  await modal.getByText('Amavisse · Infinitivo de perfecto activo · Pendiente',{exact:true}).click();
  await expect(modal.locator('.cuaderno-proposal-context mark')).toHaveText('Amavisse');
  await expect(modal.locator('.cuaderno-review-passage')).toContainText('Amavisse dicit.');
  expect(analyses).toBe(1);
  expect(warmups).toBe(1); // Dos análisis no reinician el motor.
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('cuaderno-collatinus-analysis-v2');
    const keys = await cache.keys();
    return Promise.all(keys.map(async key => ({
      key: new URL(key.url).pathname, forms: (await (await cache.match(key)).json()).map(token => token.w),
    })));
  });
  expect(cached).toContainEqual({
    key: expect.stringMatching(/analysis-[a-f0-9]{24}-[a-f0-9]{64}$/),
    forms: ['Amavisse', 'dicit'],
  });
});
