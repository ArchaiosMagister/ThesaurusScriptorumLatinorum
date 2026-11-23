import {test,expect} from '@playwright/test';

async function addText(page,{id,title,latin}){
  await page.goto('/');
  await page.evaluate(async(args)=>{
    const [{IndexedDbCorpusRepository},{upsertText}]=await Promise.all([
      import('/storage/indexeddb-corpus-repository.js'),
      import('/core/editor-operations.js'),
    ]);
    const store=new IndexedDbCorpusRepository();
    const snap=await store.load();
    const next=upsertText(snap.corpus,{title:args.title,latin:args.latin,
      author:'Julio César',work:'De bello Gallico',reference:'I 24'},
      args.id,'2026-11-16T18:00:00.000Z');
    await store.save(next,snap.revision);
  },{id,title,latin});
  await page.reload();
}

test('modificación preverbial: enunciado 3+2 sin dar los cinco derivados como respuestas',async({page})=>{
  await addText(page,{id:'teacher.preverb',title:'César preverbial',
    latin:'Instruxit aciem, ac deinde successerunt hostes.'});
  await page.getByRole('button',{name:'César preverbial',exact:true}).click();
  await page.getByRole('button',{name:'Preguntas',exact:true}).click();
  const option=page.locator('.edition-option').filter({hasText:'Modificación preverbial'});
  await option.getByRole('button',{name:'Generar Modificación preverbial'}).click();
  const statement=option.getByRole('textbox',{name:'Enunciado del apartado'});
  await expect(statement).toHaveValue(/instruxit.*\(3\).*successerunt.*\(2\)/i);
  await expect(option.locator('.edition-field-label').filter({hasText:'Palabra'})).toHaveCount(0);
  const paper=page.locator('.edition-paper');
  await expect(paper).toContainText('Cinco derivados en total');
  await expect(paper.locator('.edition-choice-options')).toContainText('instruxit');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'César preverbial',exact:true}).click();
  await page.getByRole('button',{name:'Preguntas',exact:true}).click();
  await expect(page.locator('.edition-option').filter({hasText:'Modificación preverbial'})
    .getByRole('textbox',{name:'Enunciado del apartado'})).toHaveValue(/instruxit.*\(3\).*successerunt.*\(2\)/i);
});

test('eliminar texto no elimina las copias de los cuadernos A4 preparados',async({page})=>{
  await addText(page,{id:'teacher.delete',title:'Texto para eliminar',
    latin:'Romani Galliam vicerunt.'});
  await page.getByRole('button',{name:'Texto para eliminar',exact:true}).click();
  await page.getByRole('button',{name:'Preparar cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Preparar 1 texto'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await page.getByRole('button',{name:'Textos',exact:true}).click();
  await page.getByRole('button',{name:'Texto para eliminar',exact:true}).click();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Eliminar texto Texto para eliminar'}).click();
  await expect(page.locator('.simple-source-row')).toHaveCount(0);
  const editions=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).map(x=>x.edition);
  });
  const prepared=editions.filter(x=>x.id!=='ed.seleccion-textos');
  expect(prepared).toHaveLength(1);
  expect(prepared[0].placements[0].text.title).toBe('Texto para eliminar');
  const sources=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts;
  });
  expect(sources).toHaveLength(0);
});
