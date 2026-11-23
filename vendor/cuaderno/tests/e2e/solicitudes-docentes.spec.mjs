import {test,expect} from '@playwright/test';

async function prepareSource(page,title,latin){
  await page.goto('/');
  await page.getByRole('button',{name:'+ Texto propio'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill(title);
  await page.getByRole('textbox',{name:'Texto latino'}).fill(latin);
  await page.getByRole('button',{name:'Añadir y editar'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
}
async function getEditions(page){
  return page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).map(x=>x.edition);
  });
}

test('un texto puede eliminarse con confirmación sin tocar los cuadernos ya preparados',async({page})=>{
  await prepareSource(page,'Texto borrable','Helvetii in locum contulerunt.');
  await page.getByRole('button',{name:'Preparar cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Preparar 1 texto'}).click();
  await expect(page.locator('.edition-paper')).toHaveCount(1);
  const before=await getEditions(page);
  const prepared=before.find(x=>x.id!=='ed.seleccion-textos');
  expect(prepared?.placements[0].text.title).toBe('Texto borrable');
  await page.getByRole('button',{name:'Textos',exact:true}).click();
  await page.getByRole('button',{name:'Texto borrable',exact:true}).click();
  page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Eliminar texto Texto borrable'}).click();
  await expect(page.getByRole('button',{name:'Texto borrable',exact:true})).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Eliminar texto Texto borrable'}).click();
  await expect(page.getByRole('button',{name:'Texto borrable',exact:true})).toHaveCount(0);
  const corpus=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus;
  });
  expect(corpus.texts).toHaveLength(0);
  const after=await getEditions(page);
  expect(after.find(x=>x.id==='ed.seleccion-textos')?.placements).toHaveLength(0);
  expect(after.find(x=>x.id===prepared.id)?.placements).toEqual(prepared.placements);
});

test('lematización parcial automática y comillas del significado al añadir vocabulario',async({page})=>{
  await prepareSource(page,'Vocabulario de clase','Gallia est omnis divisa in partes tres.');
  const result=await getEditions(page);
  const work=result.find(x=>x.id==='ed.seleccion-textos');
  expect(work?.placements[0].vocabulary.length).toBeGreaterThan(0);
  expect(work.placements[0].vocabulary.every(v=>v.reviewState==='needs-review'||v.reviewState==='manual')).toBe(true);
  await page.getByRole('button',{name:'Vocabulario',exact:true}).click();
  await page.getByPlaceholder('Enunciado o lema').fill('acies, -ei');
  await page.getByPlaceholder('Significado', {exact:true}).fill('línea de batalla');
  await page.getByRole('button',{name:'Añadir entrada'}).click();
  await expect(page.locator('.edition-vocabulary-line').filter({hasText:'línea de batalla'}))
    .toContainText('‘línea de batalla’');
  await expect(page.locator('.edition-academic-review')).toHaveCount(0);
});

test('modificación preverbial toma dos verbos del texto y aplica 3 + 2 derivados sin confirmar',async({page})=>{
  await prepareSource(page,'Ejemplo preverbios','Instruxit aciem, successerunt hostes.');
  const panel=page.locator('.edition-option').filter({hasText:'Modificación preverbial'});
  await panel.getByRole('button',{name:'Generar Modificación preverbial'}).click();
  await expect(panel.getByRole('textbox',{name:'Enunciado del apartado'}))
    .toHaveValue(/instruxit.*\(3\).*successerunt.*\(2\)/);
  // Los cinco derivados son respuestas del alumno: el motor puede
  // prepararlos internamente, pero nunca deben imprimirse en el ejercicio.
  await expect(panel.getByRole('textbox',{name:'Palabra'})).toHaveCount(0);
  await expect(page.locator('.edition-academic-review')).toHaveCount(0);
  const editions=await getEditions(page);
  const p=editions.find(x=>x.id==='ed.seleccion-textos')?.placements[0];
  const q=p.questions.find(x=>x.kind==='choice');
  const preverb=q.options.find(o=>o.kind==='preverb');
  expect(preverb.slots).toHaveLength(0);
  expect(preverb.statement.value).toMatch(/instruxit.*\(3\).*successerunt.*\(2\)/);
  await page.reload();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await expect(page.locator('.edition-option').filter({hasText:'Modificación preverbial'})
    .getByRole('textbox',{name:'Enunciado del apartado'}))
    .toHaveValue(/instruxit/);
});
