import {test,expect} from '@playwright/test';

async function seedTexts(page){
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const repo=new IndexedDbCorpusRepository();
    const current=await repo.load();
    const at='2026-11-16T10:00:00.000Z';
    const texts=[
      {id:'bridge.cesar',title:'César I',latin:'Gallia est omnis divisa in partes tres.'},
      {id:'bridge.nepos',title:'Nepote I',latin:'Miltiades Atheniensis magnus imperator fuit.'},
      {id:'bridge.eutropius',title:'Eutropio I',latin:'Romulus urbem Romam condidit.'},
    ].map(t=>({...t,source:{author:t.title.split(' ')[0],work:'Obra',reference:'1.1'},
      tagIds:[],createdAt:at,updatedAt:at}));
    await repo.save({...current.corpus,texts:[...current.corpus.texts,...texts]},current.revision);
  });
  await page.reload();
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
}
async function getLegacy(page){
  return page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus;
  });
}
async function editions(page){
  return page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).map(x=>x.edition);
  });
}

test('un cuaderno de Cuadernos pasa a Preparar cuaderno sin duplicar ni borrar originales',async({page})=>{
  await seedTexts(page);
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.getByPlaceholder('Nombre del cuaderno').fill('Selección de clase');
  await page.getByRole('button',{name:'Crear cuaderno',exact:true}).click();
  await page.getByRole('combobox',{name:'Seleccionar texto para añadir'}).selectOption('bridge.cesar');
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();
  await page.getByRole('combobox',{name:'Seleccionar texto para añadir'}).selectOption('bridge.nepos');
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();
  await expect(page.locator('.notebook-contents li')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Cuaderno terminado'})).toBeEnabled();
  const original=await getLegacy(page);
  await page.getByRole('button',{name:'Cuaderno terminado'}).click();
  await expect(page.getByRole('heading',{name:'Editor de cuadernos'})).toBeVisible();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 2');
  let ed=await editions(page);
  expect(ed).toHaveLength(1);
  expect(ed[0].title).toBe('Selección de clase');
  expect(ed[0].legacyNotebookId).toBe(original.notebooks[0].id);
  expect(ed[0].placements.map(p=>p.source.sourceId)).toEqual(['bridge.cesar','bridge.nepos']);
  expect(await getLegacy(page)).toEqual(original);

  // Editar preguntas y título tras importar debe persistir aunque el usuario
  // vuelva a Cuadernos y añada más textos.
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  await page.getByRole('textbox',{name:'Título del texto'}).fill('César adaptado para 1.º');
  await page.getByRole('button',{name:'Preguntas',exact:true}).click();
  await page.getByRole('textbox',{name:'Enunciado'}).first().fill('Traduce el pasaje.');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.getByRole('combobox',{name:'Seleccionar texto para añadir'}).selectOption('bridge.eutropius');
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();
  await expect(page.locator('.notebook-contents li')).toHaveCount(3);
  await page.getByRole('button',{name:'Cuaderno terminado'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 3');
  ed=await editions(page);
  expect(ed).toHaveLength(1);
  expect(ed[0].placements.map(p=>p.source.sourceId)).toEqual(['bridge.cesar','bridge.nepos','bridge.eutropius']);
  expect(ed[0].placements[0].text.title).toBe('César adaptado para 1.º');
  expect(ed[0].placements[0].questions[0].statement.value).toBe('Traduce el pasaje.');

  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.getByRole('button',{name:'Cuaderno terminado'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 3');
  expect((await editions(page))[0].placements).toHaveLength(3);
  expect((await getLegacy(page)).notebooks[0].textIds).toEqual(['bridge.cesar','bridge.nepos','bridge.eutropius']);
});

test('Preparar cuaderno vacío ofrece traer un cuaderno existente y no borra otro editorial',async({page})=>{
  await seedTexts(page);
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.getByPlaceholder('Nombre del cuaderno').fill('Primero');
  await page.getByRole('button',{name:'Crear cuaderno',exact:true}).click();
  await page.getByRole('combobox',{name:'Seleccionar texto para añadir'}).selectOption('bridge.nepos');
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();

  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await expect(page.getByRole('heading',{name:'Comienza un cuaderno editorial'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Traer cuaderno existente'})).toBeVisible();
  await page.getByRole('combobox',{name:'Elegir cuaderno de Cuadernos'}).selectOption({label:'Primero (1 texto(s))'});
  await page.getByRole('button',{name:'Preparar cuaderno seleccionado'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  expect((await editions(page))[0].placements[0].source.sourceId).toBe('bridge.nepos');
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  expect((await editions(page))).toHaveLength(1);
});

test('se puede importar otro cuaderno histórico a un workspace con edición ya existente',async({page})=>{
  await seedTexts(page);
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',dialog=>dialog.accept('Edición nueva independiente'));
  await page.getByRole('button',{name:'+ Cuaderno'}).click();
  await page.getByRole('button',{name:'Cuadernos',exact:true}).click();
  await page.getByPlaceholder('Nombre del cuaderno').fill('Material previo');
  await page.getByRole('button',{name:'Crear cuaderno',exact:true}).click();
  await page.getByRole('combobox',{name:'Seleccionar texto para añadir'}).selectOption('bridge.cesar');
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await page.getByRole('combobox',{name:'Elegir cuaderno de Cuadernos'}).selectOption({
    label:'Material previo (1 texto(s))'
  });
  await page.getByRole('button',{name:'Preparar cuaderno seleccionado'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  const all=await editions(page);
  expect(all).toHaveLength(2);
  expect(all.find(e=>e.title==='Edición nueva independiente')?.placements).toHaveLength(0);
  expect(all.find(e=>e.title==='Material previo')?.placements.map(p=>p.source.sourceId)).toEqual(['bridge.cesar']);
});
