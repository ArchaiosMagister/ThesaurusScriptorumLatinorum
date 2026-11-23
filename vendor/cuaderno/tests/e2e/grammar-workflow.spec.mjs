import {test,expect} from '@playwright/test';

async function openGroup(page,scope,label){
  const group=page.locator(scope+' .grammar-group')
    .filter({has:page.locator('summary').getByText(label,{exact:true})});
  await group.locator('summary').click();
}

test('etiquetas jerárquicas: función/forma, agente distinto de pasiva y búsqueda AND',async({page})=>{
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.getByRole('button',{name:'Mis textos'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('César con AcI');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Caesar dixit Gallos venisse.');
  await openGroup(page,'.grammar-editor','Oraciones y construcciones');
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Oración de infinitivo'}).check();
  await openGroup(page,'.grammar-editor','Formas verbales y voz');
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Infinitivo de perfecto',exact:true}).check();
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Infinitivo activo'}).check();
  await openGroup(page,'.grammar-editor','Funciones sintácticas');
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Complemento agente'}).check();
  const snapshot=await page.evaluate(()=>import('/storage/indexeddb-corpus-repository.js').then(
    async({IndexedDbCorpusRepository})=>(await new IndexedDbCorpusRepository().load()).corpus));
  expect(snapshot.tags.length).toBe(0);
  await page.getByRole('button',{name:'Guardar texto'}).click();
  await expect(page.locator('#phase2-status')).toContainText('Cambios guardados');
  const tagged=await page.evaluate(()=>import('/storage/indexeddb-corpus-repository.js').then(
    async({IndexedDbCorpusRepository})=>(await new IndexedDbCorpusRepository().load()).corpus));
  expect(tagged.texts[0].tagIds).toEqual([
    'gram.infinitivo','gram.inf.perfecto','gram.inf.activo','gram.agente',
  ]);
  expect(tagged.tags.some(t=>t.id==='gram.formas')).toBe(true);

  await page.getByRole('button',{name:'Nuevo texto'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('César con ut');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Venit ut laboraret.');
  await openGroup(page,'.grammar-editor','Oraciones y construcciones');
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Ut final'}).check();
  await page.getByRole('textbox',{name:'Nueva etiqueta personalizada'}).fill('Dativo ético');
  await page.getByRole('button',{name:'Añadir etiqueta'}).click();
  await page.getByRole('button',{name:'Guardar texto'}).click();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(2);

  await page.reload();
  await page.getByRole('button',{name:'Mis textos'}).click();
  await page.locator('.grammar-filter > summary').click();
  await openGroup(page,'.grammar-filter','Oraciones y construcciones');
  await page.locator('.grammar-filter').getByRole('checkbox',{name:'Oración de infinitivo'}).check();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await expect(page.locator('.lib-sidebar .work-row').first()).toContainText('César con AcI');
  await openGroup(page,'.grammar-filter','Formas verbales y voz');
  await page.locator('.grammar-filter').getByRole('checkbox',{name:'Infinitivo de perfecto',exact:true}).check();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await page.locator('.grammar-filter').getByRole('checkbox',{name:'Infinitivo pasivo'}).check();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(0);
  await page.getByRole('button',{name:'Quitar filtros de etiquetas'}).click();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(2);
  const custom=page.locator('.lib-sidebar .work-row').filter({hasText:'César con ut'});
  await custom.click();
  await expect(page.locator('.grammar-editor').getByRole('checkbox',{name:'Dativo ético'})).toBeChecked();
});

test('cuaderno terminado activa preparación y conserva etiquetas en la aparición',async({page})=>{
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await page.getByRole('button',{name:'Mis textos'}).click();
  await page.getByRole('textbox',{name:'Título',exact:true}).fill('Texto con relativo');
  await page.getByRole('textbox',{name:'Texto latino'}).fill('Qui venit, laudatus est.');
  await openGroup(page,'.grammar-editor','Oraciones y construcciones');
  await page.locator('.grammar-editor').getByRole('checkbox',{name:'Relativo de enlace (falso relativo)'}).check();
  await page.getByRole('button',{name:'Guardar texto'}).click();
  await page.getByRole('button',{name:'Cuadernos'}).click();
  await page.getByPlaceholder('Nombre del cuaderno').fill('Preparación de 1.º');
  await page.getByRole('button',{name:'Crear cuaderno'}).click();
  await expect(page.getByRole('button',{name:'Cuaderno terminado'})).toBeDisabled();
  await page.getByRole('button',{name:'Añadir texto',exact:true}).click();
  await page.getByRole('button',{name:'Cuaderno terminado'}).click();
  await expect(page.getByRole('heading',{name:'Editor de cuadernos'})).toBeVisible();
  const editor=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions())[0].edition;
  });
  expect(editor.placements[0].grammaticalTagIds).toEqual(['gram.relativo.enlace']);
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
});
