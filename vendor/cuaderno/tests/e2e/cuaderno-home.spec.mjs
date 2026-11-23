import {test,expect} from '@playwright/test';

test('Inicio: tarjetas y banco visibles sin desplegable ni hoja A4 vacía en iPhone e iPad',async({page})=>{
  for(const width of [390,820]){
    await page.setViewportSize({width,height:844});
    await page.goto('/examinator-cuadernos/');
    await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Banco de textos propios'})).toBeVisible();
    await expect(page.getByRole('combobox',{name:'Elegir cuaderno',exact:true})).toHaveCount(0);
    await expect(page.locator('#preview')).toBeHidden();
    await expect(page.getByRole('button',{name:'Nuevo cuaderno'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Importar cuaderno'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  }
});

test('Tarjetas: crear, volver, copia voluntaria, cancelación y borrado con una confirmación',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',d=>d.accept('Cuaderno en tarjetas'));
  await page.getByRole('button',{name:'Nuevo cuaderno'}).click();
  await expect(page.locator('#btnOpen')).toBeVisible();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill('Pasaje para banco');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar Galliam vicit.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await page.locator('#btnOpen').click();
  const card=page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno en tarjetas'});
  await expect(card).toBeVisible();
  await expect(card).toContainText('1 texto');
  const backup=page.waitForEvent('download');
  await card.getByRole('button',{name:'Hacer copia'}).click();
  expect((await backup).suggestedFilename()).toMatch(/^copia-cuaderno-.*\.json$/);
  const cancelDialog=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());
  await Promise.all([cancelDialog,card.getByRole('button',{name:'Eliminar'}).click()]);
  await expect(card).toBeVisible();
  let message='';
  const confirmDialog=page.waitForEvent('dialog').then(async dialog=>{
    message=dialog.message();await dialog.accept();
  });
  await Promise.all([confirmDialog,card.getByRole('button',{name:'Eliminar'}).click()]);
  expect(message).toContain('copia de seguridad');
  await expect(page.locator('.cuaderno-home-card')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Banco de textos propios'})).toBeVisible();
  await expect(page.locator('.cuaderno-home-bank')).toContainText('1 texto distinto');
  await page.locator('.cuaderno-home-bank .cuaderno-home-category').first()
    .locator('summary').first().click();
  await expect(page.locator('.cuaderno-home-bank')).toContainText('Pasaje para banco');
});


test('Banco propio: guarda y etiqueta un texto sin crear un cuaderno',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill('Texto sin cuaderno');
  await modal.getByRole('textbox',{name:'Autor'}).fill('César');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar exercitum ducit.');
  await modal.getByRole('button',{name:'Guardar en el banco'}).click();
  await expect(bank).toContainText('1 texto distinto');
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  const source=bank.locator('.cuaderno-home-text').filter({hasText:'Texto sin cuaderno'}).first();
  await source.locator('summary').first().click();
  await source.getByRole('button',{name:'Etiquetar'}).click();
  const tagModal=page.locator('.modal').last();
  await tagModal.getByText('Añadir o quitar etiquetas manualmente',{exact:true}).click();
  await tagModal.locator('.cuaderno-bank-tag-option').filter({hasText:'Oración de relativo'})
    .getByRole('checkbox').check();
  await tagModal.getByRole('button',{name:'Guardar etiquetas'}).click();
  await expect(bank.locator('.cuaderno-home-category').filter({has:
    page.locator('summary').filter({hasText:'Oraciones y construcciones (1)'})}).first()).toBeVisible();
  const stored=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const corpus=(await new IndexedDbCorpusRepository().load()).corpus;
    return corpus.texts.find(text=>text.title==='Texto sin cuaderno')?.tagIds??[];
  });
  expect(stored).toContain('gram.relativo');
  await expect(page.locator('.cuaderno-home-card')).toHaveCount(0);
});


test('Banco: Collatinus propone etiquetas pero sólo persisten las confirmadas',async({page})=>{
  test.setTimeout(90000); // en frío la carga completa de Collatinus puede tardar
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  const paste=page.locator('.modal').last();
  await paste.getByRole('textbox',{name:'Título'}).fill('Pasaje para etiquetado');
  await paste.getByRole('textbox',{name:'Texto latino'}).fill('Amatus est. Loquitur. Liber legendus.');
  await paste.getByRole('button',{name:'Guardar en el banco'}).click();
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  const source=bank.locator('.cuaderno-home-text').filter({hasText:'Pasaje para etiquetado'}).first();
  await source.locator('summary').first().click();
  await source.getByRole('button',{name:'Etiquetar'}).click();
  const review=page.locator('.modal').last();
  await expect(review.getByText('Sin etiquetas confirmadas')).toBeVisible();
  await review.getByRole('button',{name:'Analizar con Collatinus'}).click();
  await expect(review.getByRole('status')).toContainText('propuestas obtenidas',{timeout:45000});
  const candidate=review.locator('.grammar-proposal-card')
    .filter({hasText:'Amatus est · Voz pasiva · Pendiente'}).first();
  await expect(candidate).toBeVisible({timeout:15000});
  await candidate.locator('summary').first().click();
  await expect(candidate).toContainText('Requiere revisión sintáctica.');
  await candidate.getByText('Ver análisis y evidencia',{exact:true}).click();
  await expect(candidate).toContainText('formas adyacentes');
  // Analizar por sí solo no debe guardar etiquetas ni atribuir sintaxis automáticamente.
  const before=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts
      .find(t=>t.title==='Pasaje para etiquetado')?.tagIds??[];
  });
  expect(before).toEqual([]);
  await candidate.getByRole('button',{name:'Aceptar',exact:true}).click();
  await expect(review.locator('.cuaderno-bank-current')).toContainText('Voz pasiva');
  await review.getByRole('button',{name:'Guardar etiquetas'}).click();
  // El modal lanza una escritura asíncrona: esperar la confirmación real,
  // y después verificar la persistencia. Un clic no es un commit de IndexedDB.
  await expect(page.getByText('Etiquetas de la fuente guardadas.',{exact:true}))
    .toBeVisible({timeout:15000});
  await expect.poll(async()=>page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts
      .find(t=>t.title==='Pasaje para etiquetado')?.tagIds??[];
  }),{timeout:15000,message:'La etiqueta confirmada debe persistir en IndexedDB'})
    .toEqual(['gram.voz.pasiva']);
});


test('Editor: el banco filtra por dos etiquetas AND y conserva una sola aparición',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText}=await import('/core/editor-operations.js');
    const {attachGrammarTags}=await import('/core/grammar-tags.js');
    const repository=new IndexedDbCorpusRepository();
    const before=await repository.load(),now=new Date().toISOString();
    let corpus=before.corpus;
    const items=[
      ['doc.relpass','Texto relativo y pasivo','Qui venit, laudatus est.',
        ['gram.relativo','gram.voz.pasiva']],
      ['doc.rel','Texto solo relativo','Qui venit, laetus est.',['gram.relativo']],
      ['doc.pass','Texto solo pasivo','Caesar laudatus est.',['gram.voz.pasiva']],
    ];
    for(const [id,title,latin,tags] of items){
      corpus=upsertText(corpus,{title,latin,author:'',work:'',reference:''},id,now);
      corpus=attachGrammarTags(corpus,id,tags);
    }
    await repository.save(corpus,before.revision);
  });
  await page.reload();
  page.once('dialog',d=>d.accept('Cuaderno filtrado'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Banco propio'}).click();
  const panel=page.locator('.modal').last();
  await expect(panel.locator('.original-bank-result-count')).toHaveText('3 de 3 textos del banco');
  await panel.locator('.original-bank-filters>summary').click();
  await panel.locator('.original-bank-filter-group').filter({hasText:'Oraciones y construcciones'})
    .locator('summary').first().click();
  await panel.getByRole('checkbox',{name:'Oración de relativo',exact:true}).check();
  await expect(panel.locator('.original-bank-result-count')).toHaveText('2 de 3 textos del banco');
  await panel.locator('.original-bank-filter-group').filter({hasText:'Formas verbales y voz'})
    .locator('summary').first().click();
  await panel.getByRole('checkbox',{name:'Voz pasiva',exact:true}).check();
  await expect(panel.locator('.original-bank-result-count')).toHaveText('1 de 3 textos del banco');
  await expect(panel.locator('.original-own-row')).toHaveCount(1);
  await expect(panel.locator('.original-own-row')).toContainText('Texto relativo y pasivo');
  await panel.getByRole('button',{name:'Añadir «Texto relativo y pasivo» al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await expect(page.locator('.cuaderno-current-tags')).toContainText('Oración de relativo');
  await expect(page.locator('.cuaderno-current-tags')).toContainText('Voz pasiva');
  const menus=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await menus.getByRole('button',{name:'Texto',exact:true}).click();
  await expect(page.locator('.edition-tags-summary')).toContainText('Oración de relativo');
  await expect(page.locator('.edition-tags-summary')).toContainText('Voz pasiva');
  await menus.getByRole('button',{name:'Organizar'}).click();
  await expect(page.getByText('Organizar el cuaderno',{exact:true})).toBeVisible();
  await expect(page.locator('.edition-notebook-advanced')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'Banco propio'}).click();
  const reopened=page.locator('.modal').last();
  await expect(reopened.locator('.original-bank-result-count')).toContainText('2 de 2 textos del banco');
  await expect(reopened.locator('.original-bank-hidden-count')).toContainText('1 texto ya incorporado se oculta.');
  await expect(reopened.locator('.original-own-row')).toHaveCount(2);
  await expect(reopened.getByRole('button',{name:'Añadir «Texto relativo y pasivo» al cuaderno'})).toHaveCount(0);
  await reopened.getByRole('button',{name:'Cerrar'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
});


test('Banco del editor: modal sin desbordamiento en iPhone e iPad',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Cuaderno móvil'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Banco propio'}).click();
  const modal=page.locator('.modal').last();
  await expect(modal.locator('.original-bank-picker')).toBeVisible();
  for(const width of [390,820]){
    await page.setViewportSize({width,height:844});
    const layout=await page.evaluate(()=>{
      const rect=document.querySelector('.modal')?.getBoundingClientRect();
      const header=document.querySelector('body>header'),main=document.querySelector('#main');
      return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,
        headerWidth:header?.getBoundingClientRect().width,
        mainWidth:main?.getBoundingClientRect().width,
        left:rect?.left??-1,right:rect?.right??Number.POSITIVE_INFINITY};
    });
    expect(layout.pageWidth,JSON.stringify(layout)).toBeLessThanOrEqual(width+2);
    expect(layout.left).toBeGreaterThanOrEqual(-2);
    expect(layout.right).toBeLessThanOrEqual(width+2);
  }
  await modal.getByRole('button',{name:'Cerrar'}).click();
});


test('Banco: quitar varios textos con selección y confirmar sin borrar el cuaderno',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText}=await import('/core/editor-operations.js');
    const db=new IndexedDbCorpusRepository(),saved=await db.load(),now=new Date().toISOString();
    let corpus=saved.corpus;
    for(const [id,title,latin] of [
      ['bank.a','Pasaje A','Prima verba sunt.'],
      ['bank.b','Pasaje B','Secunda verba sunt.'],
      ['bank.c','Pasaje C','Tertia verba sunt.'],
    ])corpus=upsertText(corpus,{title,latin,author:'',work:'',reference:''},id,now);
    await db.save(corpus,saved.revision);
  });
  await page.reload();
  const bank=page.locator('.cuaderno-home-bank');
  await expect(bank).toContainText('3 textos distintos');
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  await bank.getByRole('checkbox',{name:'Seleccionar para quitar: Pasaje A'}).check();
  await expect(bank.locator('.cuaderno-bank-bulk')).toContainText('1 texto seleccionado');
  await bank.getByRole('checkbox',{name:'Seleccionar para quitar: Pasaje B'}).check();
  await expect(bank.locator('.cuaderno-bank-bulk')).toContainText('2 textos seleccionados');
  let prompt='';
  const confirmation=page.waitForEvent('dialog').then(async dialog=>{
    prompt=dialog.message();await dialog.accept();
  });
  await Promise.all([confirmation,bank.getByRole('button',{name:'Quitar seleccionados'}).click()]);
  expect(prompt).toContain('2 textos seleccionados');
  await expect(bank).toContainText('1 texto distinto');
  const stored=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts.map(t=>t.title);
  });
  expect(stored).toEqual(['Pasaje C']);
  await bank.getByRole('searchbox',{name:'Buscar en banco de textos propios'}).fill('Pasaje C');
  await bank.getByRole('button',{name:/Seleccionar resultados/}).click();
  await expect(bank.locator('.cuaderno-bank-bulk')).toContainText('1 texto seleccionado');
  await bank.getByRole('button',{name:'Desmarcar todos'}).click();
  await expect(bank.getByRole('button',{name:'Quitar seleccionados'})).toBeDisabled();
});

test('Banco: proteger de retirada masiva los textos utilizados en cuadernos históricos',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText,upsertNotebook,addTextToNotebook}=await import('/core/editor-operations.js');
    const db=new IndexedDbCorpusRepository(),saved=await db.load(),now=new Date().toISOString();
    let corpus=upsertText(saved.corpus,{title:'Fuente antigua',latin:'Quod erat demonstrandum.',
      author:'',work:'',reference:''},'legacy.text',now);
    corpus=upsertNotebook(corpus,'Cuaderno histórico','legacy.book');
    corpus=addTextToNotebook(corpus,'legacy.book','legacy.text');
    await db.save(corpus,saved.revision);
  });
  await page.reload();
  const bank=page.locator('.cuaderno-home-bank');
  await bank.locator('.cuaderno-home-category').first().locator('summary').first().click();
  await expect(bank.getByRole('checkbox',{name:'Seleccionar para quitar: Fuente antigua'})).toBeDisabled();
  await bank.locator('.cuaderno-home-text').filter({hasText:'Fuente antigua'})
    .first().locator('summary').first().click();
  await expect(bank.getByRole('button',{name:'Quitar del banco'})).toBeDisabled();
  await bank.getByRole('button',{name:/Seleccionar todo el banco/}).click();
  await expect(bank.getByRole('button',{name:'Quitar seleccionados'})).toBeDisabled();
});

test('Vista previa y Word: […] se muestra en redonda sin alterar el latín',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Cuaderno de omisiones'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar […] venit [...] et [ … ] dixit.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const latin=page.locator('.edition-latin').first();
  await expect(latin.locator('.edition-roman')).toHaveCount(3);
  await expect(latin.locator('.edition-roman').nth(0)).toHaveText('[…]');
  await expect(latin).toHaveCSS('font-style','italic');
  await expect(latin.locator('.edition-roman').first()).toHaveCSS('font-style','normal');
  await expect(latin).toContainText('Caesar […] venit [...] et [ … ] dixit.');
});
