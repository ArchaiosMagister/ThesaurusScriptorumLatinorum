import {test,expect} from '@playwright/test';

async function start(page,latin='arate arate.'){
  await page.goto('/?classic=1');
  await page.evaluate(async text=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const repository=new IndexedDbCorpusRepository();
    const snapshot=await repository.load();
    const date='2026-11-15T20:00:00.000Z';
    await repository.save({...snapshot.corpus,texts:[...snapshot.corpus.texts,{
      id:'academic.ui.seed',title:'Texto académico',latin:text,
      source:{author:'César',work:'De bello Gallico',reference:'I 24'},
      tagIds:[],createdAt:date,updatedAt:date,
    }]},snapshot.revision);
  },latin);
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',d=>d.accept('Cuaderno académico'));
  await page.getByRole('button',{name:'+ Cuaderno'}).click();
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await expect(page.getByText('Texto 1 de 1')).toBeVisible();
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect(page.locator('.edition-save-state')).toContainText('Guardado · revisión');
}
async function readEdition(page){
  return page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repo=new WorkspaceRepository();
    return (await repo.listEditions())[0].edition;
  });
}

test('academia: propuestas de prefijos solo cambian su apartado y respetan edición manual',async({page})=>{
  await start(page);
  await page.getByRole('button',{name:'Preguntas'}).click();
  const prefix=page.locator('.edition-option').filter({hasText:'Prefijos'});
  const before=await readEdition(page);
  await prefix.getByRole('button',{name:'Proponer apartado Prefijos'}).click();
  const box=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(box.getByText('Regenerar solo Prefijos')).toBeVisible();
  await expect(box.locator('li')).toHaveCount(4);
  expect(JSON.stringify(await readEdition(page))).toBe(JSON.stringify(before));
  await box.getByRole('button',{name:'Confirmar propuesta'}).click();
  await expect(page.getByRole('region',{name:'Revisar propuesta académica'})).toHaveCount(0);
  const after=await readEdition(page);
  const b=before.placements[0].questions.find(q=>q.kind==='choice');
  const a=after.placements[0].questions.find(q=>q.kind==='choice');
  expect(a.options.find(o=>o.kind==='prefix').slots).toHaveLength(4);
  expect(a.options.filter(o=>o.kind!=='prefix')).toEqual(b.options.filter(o=>o.kind!=='prefix'));
  expect(after.placements[0].questions.slice(0,3)).toEqual(before.placements[0].questions.slice(0,3));
  const again=page.locator('.edition-option').filter({hasText:'Prefijos'});
  await again.getByRole('textbox',{name:'Palabra'}).first().fill('interdependencia');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  const manualBefore=await readEdition(page);
  await again.getByRole('button',{name:'Proponer apartado Prefijos'}).click();
  const review=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(review).toContainText('se conserva «interdependencia»');
  await review.getByRole('button',{name:'Confirmar propuesta'}).click();
  const manualAfter=await readEdition(page);
  expect(manualAfter.placements[0].questions.find(q=>q.kind==='choice')
    .options.find(o=>o.kind==='prefix').slots[0].value).toBe('interdependencia');
  expect(manualAfter.placements[0].questions.find(q=>q.kind==='choice')
    .options.find(o=>o.kind==='prefix').slots[0].locked).toBe(true);
  await page.getByRole('button',{name:'Deshacer'}).click();
  const undo=await readEdition(page);
  expect(undo.placements[0].questions.find(q=>q.kind==='choice')
    .options.find(o=>o.kind==='prefix').slots[0].value).toBe('interdependencia');
  await page.locator('.edition-option').filter({hasText:'Prefijos'})
    .getByRole('button',{name:'Proponer solo esta palabra'}).first().click();
  const individual=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(individual.getByRole('checkbox',
    {name:'Autorizo sustituir esta decisión manual protegida.'})).not.toBeChecked();
  await individual.locator('select').selectOption({index:1});
  await individual.getByRole('button',{name:'Confirmar propuesta'}).click();
  await expect(page.locator('.edition-save-state')).toContainText('palabra manual está protegida');
  const notOverwritten=await readEdition(page);
  expect(notOverwritten).toEqual(undo);
  await individual.getByRole('checkbox',
    {name:'Autorizo sustituir esta decisión manual protegida.'}).check();
  await individual.getByRole('button',{name:'Confirmar propuesta'}).click();
  const changed=await readEdition(page);
  const originalOptions=notOverwritten.placements[0].questions.find(q=>q.kind==='choice').options;
  const nextOptions=changed.placements[0].questions.find(q=>q.kind==='choice').options;
  expect(nextOptions.find(o=>o.kind==='prefix').slots[0].value).not.toBe('interdependencia');
  expect(nextOptions.find(o=>o.kind==='prefix').slots.slice(1))
    .toEqual(originalOptions.find(o=>o.kind==='prefix').slots.slice(1));
  expect(nextOptions.filter(o=>o.kind!=='prefix')).toEqual(originalOptions.filter(o=>o.kind!=='prefix'));
});

test('academia: análisis morfológico selecciona ocurrencia exacta y guarda subrayado',async({page})=>{
  await start(page);
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  const latin=page.getByRole('textbox',{name:'Texto latino'});
  await latin.evaluate(el=>el.setSelectionRange(0,5));
  await page.getByRole('button',{name:'Subrayar palabra seleccionada'}).click();
  const box=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(box).toContainText('Subrayar y analizar «arate»');
  await box.getByRole('button',{name:'Confirmar propuesta'}).click();
  await expect(page.locator('.edition-underlined')).toHaveCount(1);
  await expect(page.locator('.edition-underlined')).toHaveText('arate');
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  await page.getByRole('textbox',{name:'Texto latino'}).evaluate(el=>el.setSelectionRange(6,11));
  await page.getByRole('button',{name:'Subrayar palabra seleccionada'}).click();
  await page.getByRole('region',{name:'Revisar propuesta académica'}).getByRole('button',{name:'Confirmar propuesta'}).click();
  await expect(page.locator('.edition-underlined')).toHaveCount(2);
  const edition=await readEdition(page);
  const p=edition.placements[0],q=p.questions.find(x=>x.kind==='morphology');
  expect(p.text.markup.map(x=>[x.startUtf16,x.endUtf16])).toEqual([[0,5],[6,11]]);
  expect(q.words).toHaveLength(2);
  expect(new Set(q.words.map(x=>x.markId)).size).toBe(2);
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await expect(page.locator('.edition-underlined')).toHaveCount(2);
});

test('academia: no certifica formas sin candidatos ni escribe datos',async({page})=>{
  await start(page,'xyzlexema.');
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  const before=await readEdition(page);
  await page.getByRole('textbox',{name:'Texto latino'}).evaluate(el=>el.setSelectionRange(0,9));
  await page.getByRole('button',{name:'Subrayar palabra seleccionada'}).click();
  await expect(page.locator('.edition-save-state')).toContainText('No hay candidatos elegibles');
  expect(await readEdition(page)).toEqual(before);
});

test('academia: modificación preverbial elige dos verbos para tres y dos derivados',async({page})=>{
  await start(page);
  await page.getByRole('button',{name:'Preguntas'}).click();
  const option=page.locator('.edition-option').filter({hasText:'Modificación preverbial'});
  const fields=option.locator('fieldset.edition-source-forms select');
  await expect(fields).toHaveCount(2);
  await expect(fields.nth(0)).not.toHaveValue('');
  await expect(fields.nth(1)).not.toHaveValue('');
  await option.getByRole('button',{name:'Proponer apartado Modificación preverbial'}).click();
  const box=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(box.locator('li')).toHaveCount(5);
  await box.getByRole('button',{name:'Confirmar propuesta'}).click();
  const e=await readEdition(page);
  const q=e.placements[0].questions.find(x=>x.kind==='choice');
  expect(q.options.find(o=>o.kind==='preverb').slots).toHaveLength(5);
});


test('academia: la selección nativa en la hoja A4 se ancla al token seleccionado',async({page})=>{
  await start(page,'arate arate.');
  await page.locator('.edition-latin').evaluate(paragraph=>{
    const text=paragraph.firstChild;
    if(!text||text.nodeType!==Node.TEXT_NODE)throw new Error('Fragmento latino inesperado');
    const r=document.createRange();r.setStart(text,6);r.setEnd(text,11);
    const selected=window.getSelection();selected.removeAllRanges();selected.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button',{name:'Subrayar selección de la hoja'}).click();
  const review=page.getByRole('region',{name:'Revisar propuesta académica'});
  await expect(review).toContainText('Subrayar y analizar «arate»');
  await review.getByRole('button',{name:'Confirmar propuesta'}).click();
  const edition=await readEdition(page);
  expect(edition.placements[0].text.markup.map(mark=>[mark.startUtf16,mark.endUtf16])).toEqual([[6,11]]);
  expect(edition.placements[0].questions.find(q=>q.kind==='morphology').words).toHaveLength(1);
});
