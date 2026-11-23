import {test,expect} from '@playwright/test';

async function seed(page){
  await page.goto('/');
  await page.evaluate(async()=>{
    const [{IndexedDbCorpusRepository},{upsertText},{attachGrammarTags}]=await Promise.all([
      import('/storage/indexeddb-corpus-repository.js'),
      import('/core/editor-operations.js'),
      import('/core/grammar-tags.js'),
    ]);
    const repo=new IndexedDbCorpusRepository();
    const snap=await repo.load();
    const at='2026-11-16T15:00:00.000Z';
    let corpus=snap.corpus;
    for(const [id,title,latin] of [
      ['doc.demo.a','César A','Gallia est omnis divisa in partes tres.'],
      ['doc.demo.b','César B','Dixit hostes victos esse.'],
      ['doc.demo.c','César C','Romani iter fecerunt.'],
    ]){
      corpus=upsertText(corpus,{title,latin,author:'César',work:'De bello Gallico',reference:id},id,at);
    }
    corpus=attachGrammarTags(corpus,'doc.demo.a',['gram.infinitivo','gram.inf.presente','gram.agente']);
    corpus=attachGrammarTags(corpus,'doc.demo.b',['gram.infinitivo','gram.inf.perfecto','gram.inf.pasivo']);
    await repo.save(corpus,snap.revision);
  });
  await page.reload();
  await expect(page.getByRole('button',{name:'Preparar cuaderno',exact:true})).toBeVisible();
}

test('dos apartados: elegir texto abre automáticamente preguntas y papel A4 con anterior/siguiente',async({page})=>{
  await seed(page);
  const tabs=page.getByRole('navigation',{name:'Navegación principal'});
  await expect(tabs.getByRole('button')).toHaveCount(2);
  await page.getByRole('button',{name:'César A',exact:true}).click();
  await expect(page.locator('.edition-question-panel')).toHaveCount(4);
  await expect(page.locator('.edition-paper')).toHaveCount(1);
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.getByRole('textbox',{name:'Enunciado'}).first().fill('Traduce el texto elegido.');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('button',{name:'César B',exact:true}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 2 de 2');
  const nav=page.locator('.edition-preview-stack > .edition-navigation');
  await nav.getByRole('button',{name:'Anterior'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 2');
  await expect(page.getByRole('textbox',{name:'Enunciado'}).first()).toHaveValue('Traduce el texto elegido.');
  await nav.getByRole('button',{name:'Siguiente'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 2 de 2');
  await page.reload();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 2 de 2');
  await nav.getByRole('button',{name:'Anterior'}).click();
  await expect(page.getByRole('textbox',{name:'Enunciado'}).first()).toHaveValue('Traduce el texto elegido.');
  const editions=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).map(e=>e.edition);
  });
  expect(editions).toHaveLength(1);
  expect(editions[0].placements.map(p=>p.source.sourceId)).toEqual(['doc.demo.a','doc.demo.b']);
});

test('buscar autor y tocar pasaje crea texto y abre editor directamente, sin pasos intermedios',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Buscar autores',exact:true}).click();
  await page.getByRole('combobox',{name:'Filtrar autores'}).selectOption('Julio César');
  await expect(page.locator('.simple-work-item')).toHaveCount(2);
  await page.locator('.simple-work-item').filter({hasText:'De bello Gallico'}).click();
  await expect(page.locator('.simple-reader-line').first()).toBeVisible();
  await page.locator('.simple-reader-line').first().click();
  await expect(page.locator('.edition-paper')).toHaveCount(1);
  await expect(page.locator('.edition-question-panel')).toHaveCount(4);
  const saved=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts;
  });
  expect(saved).toHaveLength(1);
  await page.getByRole('button',{name:'Buscar autores',exact:true}).click();
  await page.locator('.simple-work-item').filter({hasText:'De bello Gallico'}).click();
  await page.locator('.simple-reader-line').first().click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
});

test('Preparar cuaderno: selección y recuento gramatical exacto, edición independiente y exportación',async({page})=>{
  await seed(page);
  await page.getByRole('button',{name:'César A',exact:true}).click();
  await page.getByRole('textbox',{name:'Enunciado'}).first().fill('Versión editada para clase.');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('button',{name:'Preparar cuaderno',exact:true}).click();
  await expect(page.locator('.simple-total')).toHaveText('3 textos seleccionados');
  await page.getByRole('checkbox',{name:'Incluir César C'}).uncheck();
  await expect(page.locator('.simple-total')).toHaveText('2 textos seleccionados');
  const count=page.locator('.simple-count-row').filter({has:page.locator('span').getByText('Oración de infinitivo',{exact:true})});
  await expect(count.locator('strong')).toHaveText('2');
  await expect(page.locator('.simple-count-row').filter({has:page.locator('span').getByText('Complemento agente',{exact:true})}).locator('strong')).toHaveText('1');
  await expect(page.locator('.simple-count-row').filter({has:page.locator('span').getByText('Infinitivo de perfecto',{exact:true})}).locator('strong')).toHaveText('1');
  await page.getByRole('textbox',{name:'Título del cuaderno'}).fill('Cuaderno de selectividad');
  await page.getByRole('button',{name:'Preparar 2 textos'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 2');
  await expect(page.getByRole('button',{name:'Exportar Word'})).toBeVisible();
  await page.getByRole('button',{name:'Preguntas',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Enunciado'}).first()).toHaveValue('Versión editada para clase.');
  const editions=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).map(e=>e.edition);
  });
  expect(editions).toHaveLength(2);
  expect(editions.find(e=>e.title==='Cuaderno de selectividad')?.placements.map(p=>p.source.sourceId))
    .toEqual(['doc.demo.a','doc.demo.b']);
  await page.getByRole('button',{name:'Textos',exact:true}).click();
  await page.getByRole('button',{name:'César A',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Enunciado'}).first()).toHaveValue('Versión editada para clase.');
});

test('iPad: vista previa y preguntas presentes en la misma página, menú principal en dos pasos',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await seed(page);
  await page.getByRole('button',{name:'César A',exact:true}).click();
  await expect(page.locator('.edition-question-panel')).toHaveCount(4);
  await expect(page.locator('.edition-preview-stack .edition-paper')).toBeVisible();
  await expect(page.locator('.edition-preview-stack .edition-navigation')).toBeVisible();
  const buttons=page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button');
  await expect(buttons).toHaveCount(2);
});
