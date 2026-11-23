import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

async function seedTwoTexts(page){
  await page.goto('/?classic=1');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const repo=new IndexedDbCorpusRepository();
    const current=await repo.load();
    const at='2026-11-16T10:00:00.000Z';
    await repo.save({...current.corpus,texts:[
      ...current.corpus.texts,
      {id:'redesign.cesar',title:'César · Helvecios',
       latin:'Helvetii impedimenta in unum locum contulerunt.',
       source:{author:'Julio César',work:'De bello Gallico',reference:'I 24'},
       tagIds:[],createdAt:at,updatedAt:at},
    ]},current.revision);
  });
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',d=>d.accept('Prueba de navegación'));
  await page.getByRole('button',{name:'+ Cuaderno'}).click();
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 2 de 2');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
}
async function editionData(page){
  return page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions())[0].edition;
  });
}

test('Biblioteca Examinator2: busca autores y títulos, conserva filtros y cita',async({page})=>{
  await page.goto('/?classic=1');
  await expect(page.locator('#phase2-status')).toContainText('Biblioteca cargada');
  await expect(page.locator('.lib-author-group')).toHaveCount(3);
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(28);
  const search=page.getByRole('searchbox',{name:'Buscar autor u obra'});
  await search.fill('cesar');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(2);
  await expect(page.locator('.lib-author-group h3')).toHaveText(['Julio César']);
  await search.fill('De bello Gallico');
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(1);
  await page.locator('.lib-sidebar .work-row').first().click();
  await expect(page.locator('.reader-work')).toContainText('De bello Gallico');
  const firstReference=await page.locator('.reader-line').first().getAttribute('data-c');
  assert.ok(firstReference);
  await page.getByRole('textbox',{name:'Ir a pasaje'}).fill(firstReference);
  await page.getByRole('button',{name:'Ir a',exact:true}).click();
  await expect(page.locator('#phase2-status')).toContainText('Mostrando el pasaje '+firstReference);
  await page.getByRole('button',{name:'Limpiar filtros'}).click();
  await expect(page.locator('.lib-sidebar .work-row')).toHaveCount(28);
  await expect(search).toHaveValue('');
  await expect(page.locator('.reader-work')).toContainText('De bello Gallico');
});

test('Editor: Anterior/Siguiente encima del A4, índice de preguntas sin regeneración',async({page})=>{
  await seedTwoTexts(page);
  const preview=page.locator('.edition-preview');
  const navigator=page.locator('.edition-preview-stack > .edition-navigation');
  await expect(navigator).toHaveCount(1);
  await expect(page.locator('.edition-shell > .edition-navigation')).toHaveCount(0);
  const positions=await page.evaluate(()=>{
    const n=document.querySelector('.edition-preview-stack > .edition-navigation').getBoundingClientRect();
    const paper=document.querySelector('.edition-preview .edition-paper').getBoundingClientRect();
    return {navBottom:n.bottom,paperTop:paper.top};
  });
  expect(positions.navBottom).toBeLessThan(positions.paperTop);
  await page.getByRole('button',{name:'Preguntas',exact:true}).click();
  const panel=page.locator('.edition-menu-content');
  await expect(panel.getByRole('navigation',{name:'Ir a una pregunta'})).toBeVisible();
  await expect(panel.locator('.edition-question-panel')).toHaveCount(4);
  await expect(panel.locator('.edition-question-jump')).toHaveCount(4);
  const before=await editionData(page);
  await panel.getByRole('button',{name:'4. Elección'}).click();
  assert.deepEqual(await editionData(page),before);
  await navigator.getByRole('button',{name:'Anterior'}).click();
  await expect(navigator.locator('.edition-counter')).toHaveText('Texto 1 de 2');
  await navigator.getByRole('button',{name:'Siguiente'}).click();
  await expect(navigator.locator('.edition-counter')).toHaveText('Texto 2 de 2');
  assert.deepEqual(await editionData(page),before);
  await navigator.getByRole('button',{name:'Ver cuaderno completo'}).click();
  await expect(preview.locator('.edition-paper')).toHaveCount(2);
  assert.deepEqual(await editionData(page),before);
});

test('iPad vertical: navegación A4 visible en Vista previa; controles y cambios se conservan',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await seedTwoTexts(page);
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  await page.getByRole('textbox',{name:'Título del texto'}).fill('Texto segundo revisado');
  await page.getByRole('button',{name:'Vista previa',exact:true}).click();
  const preview=page.locator('.edition-preview');
  await expect(preview).toBeVisible();
  const nav=page.locator('.edition-preview-stack > .edition-navigation');
  await expect(nav.getByRole('button',{name:'Anterior'})).toBeVisible();
  await expect(nav.getByRole('button',{name:'Siguiente'})).toBeDisabled();
  await nav.getByRole('button',{name:'Anterior'}).click();
  await expect(nav.locator('.edition-counter')).toHaveText('Texto 1 de 2');
  await nav.getByRole('button',{name:'Siguiente'}).click();
  await expect(preview.locator('.edition-paper-title')).toContainText('Texto segundo revisado');
  await page.getByRole('button',{name:'Configurar',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Título del texto'})).toHaveValue('Texto segundo revisado');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await page.getByRole('button',{name:'Vista previa',exact:true}).click();
  await nav.getByRole('button',{name:'Siguiente'}).click();
  await expect(preview.locator('.edition-paper-title')).toContainText('Texto segundo revisado');
});
