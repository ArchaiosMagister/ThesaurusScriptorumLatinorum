import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function setup(page){
  await page.goto('/?classic=1');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const repository=new IndexedDbCorpusRepository();
    const s=await repository.load(),at='2026-11-15T15:00:00.000Z';
    await repository.save({...s.corpus,texts:[...s.corpus.texts,{
      id:'vocab.export.seed',title:'Los helvecios',latin:'Arate arate ignota.',
      source:{author:'Julio César',work:'De bello Gallico',reference:'I 24'},
      tagIds:[],createdAt:at,updatedAt:at,
    }]},s.revision);
  });
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',dialog=>dialog.accept('Cuaderno latino de prueba'));
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
    return (await new WorkspaceRepository().listEditions())[0].edition;
  });
}

test('Vocabulario: no se añade nada sin confirmación; no se inventan significados',async({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Vocabulario'}).click();
  const before=await readEdition(page);
  await page.getByRole('button',{name:'Proponer vocabulario del texto'}).click();
  const preview=page.getByRole('region',{name:'Propuestas de vocabulario'});
  await expect(preview.locator('.edition-vocab-candidate')).toHaveCount(2);
  expect(await readEdition(page)).toEqual(before);
  const unknown=preview.locator('.edition-vocab-candidate').filter({hasText:'ignota'});
  await expect(unknown.getByRole('checkbox',{name:'Añadir ignota'})).not.toBeChecked();
  await unknown.getByRole('checkbox',{name:'Añadir ignota'}).check();
  await unknown.getByRole('textbox',{name:'Enunciado del vocabulario'})
    .fill('ignotus, -a, -um');
  await unknown.getByRole('textbox',{name:'Significado (rellenar por el docente)'})
    .fill('desconocido');
  await preview.getByRole('button',{name:'Añadir términos seleccionados'}).click();
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  const edition=await readEdition(page);
  const vocab=edition.placements[0].vocabulary;
  expect(vocab).toHaveLength(2);
  expect(vocab.find(x=>x.headword==='aro').meaning).toBeNull();
  expect(vocab.find(x=>x.headword==='aro').reviewState).toBe('needs-review');
  expect(vocab.find(x=>x.headword==='ignotus, -a, -um').meaning).toBe('desconocido');
  expect(vocab.find(x=>x.headword==='ignotus, -a, -um').origin).toBe('manual');
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await expect(page.locator('.edition-vocabulary')).toContainText('significado pendiente');
  await expect(page.locator('.edition-vocabulary')).toContainText('desconocido');
});

test('Exportación Word: archivo OOXML real y aviso para borradores',async({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Exportar Word'}).click();
  const review=page.getByRole('region',{name:'Revisión previa a exportar'});
  await expect(review).toContainText('Faltan palabras seleccionadas');
  const downloadEvent=page.waitForEvent('download');
  await review.getByRole('button',{name:'Exportar borrador Word'}).click();
  const download=await downloadEvent;
  assert.match(download.suggestedFilename(),/^cuaderno-.+-borrador\.docx$/);
  const file=await download.path();
  assert.ok(file);
  const contents=await readFile(file);
  assert.equal(contents.toString('ascii',0,2),'PK');
  assert.ok(contents.includes(Buffer.from('word/document.xml')));
  assert.ok(contents.includes(Buffer.from('Elige dos de estas cuatro preguntas')));
  await expect(page.locator('.edition-save-state')).toContainText('DOCX de borrador preparado');
});

test('Exportación PDF: usa impresión nativa con hojas A4 completas, no capturas',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{window.__printCalls=0;window.print=()=>{window.__printCalls++;};});
  await page.getByRole('button',{name:'PDF / Imprimir'}).click();
  const review=page.getByRole('region',{name:'Revisión previa a exportar'});
  await review.getByRole('button',{name:'Imprimir borrador / Guardar PDF'}).click();
  expect(await page.evaluate(()=>window.__printCalls)).toBe(1);
  await expect(page.locator('.edition-print-root .edition-paper')).toHaveCount(1);
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.edition-print-root')).toBeVisible();
  const paper=page.locator('.edition-print-root .edition-paper');
  await expect(paper).toContainText('Los helvecios');
  await expect(paper).toContainText('Elige dos de estas cuatro preguntas');
  expect(await paper.evaluate(e=>getComputedStyle(e).width)).not.toBe('0px');
});


test('PDF Safari/WebKit: dos textos, sin alto de hoja obligatorio ni salto posterior',async({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await expect(page.getByText('Texto 2 de 2')).toBeVisible();
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.evaluate(()=>{window.__printCalls=0;window.print=()=>{window.__printCalls++;};});
  await page.getByRole('button',{name:'PDF / Imprimir'}).click();
  await page.getByRole('region',{name:'Revisión previa a exportar'})
    .getByRole('button',{name:'Imprimir borrador / Guardar PDF'}).click();
  expect(await page.evaluate(()=>window.__printCalls)).toBe(1);
  await page.emulateMedia({media:'print'});
  const pages=page.locator('.edition-print-root .edition-paper');
  await expect(pages).toHaveCount(2);
  const dimensions=await pages.evaluateAll(nodes=>nodes.map(node=>{
    const css=getComputedStyle(node);
    return {minHeight:css.minHeight,height:css.height,breakBefore:css.breakBefore,
      breakAfter:css.breakAfter,pageBreakAfter:css.pageBreakAfter};
  }));
  expect(dimensions[0].minHeight).toBe('0px');
  expect(dimensions[0].breakAfter).toBe('auto');
  expect(dimensions[1].breakAfter).toBe('auto');
  expect(['page','always']).toContain(dimensions[1].breakBefore);
});

test('iPad vertical: Configurar y Vista previa alternan sin perder preguntas ni vocabulario',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await setup(page);
  await page.getByRole('button',{name:'Preguntas'}).click();
  const before=await readEdition(page);
  await expect(page.locator('.edition-settings')).toBeVisible();
  await expect(page.locator('.edition-preview')).toBeHidden();
  await page.getByRole('button',{name:'Vista previa',exact:true}).click();
  await expect(page.locator('.edition-settings')).toBeHidden();
  await expect(page.locator('.edition-preview')).toBeVisible();
  const paper=page.locator('.edition-preview .edition-paper');
  await expect(paper).toContainText('Elige dos de estas cuatro preguntas (2p.):');
  await expect(paper).toContainText('Arate arate ignota.');
  await page.getByRole('button',{name:'Configurar',exact:true}).click();
  await expect(page.locator('.edition-settings')).toBeVisible();
  expect(await readEdition(page)).toEqual(before);
});

test('Oscuro/OLED: papel editorial de fondo blanco y tinta legible',async({page})=>{
  await page.setViewportSize({width:1180,height:820});
  await page.emulateMedia({colorScheme:'dark'});
  await setup(page);
  const result=await page.locator('.edition-preview .edition-paper').evaluate(node=>{
    const style=getComputedStyle(node);
    return {background:style.backgroundColor,color:style.color};
  });
  expect(result.background).toBe('rgb(255, 255, 255)');
  expect(result.color).toBe('rgb(21, 21, 21)');
});
