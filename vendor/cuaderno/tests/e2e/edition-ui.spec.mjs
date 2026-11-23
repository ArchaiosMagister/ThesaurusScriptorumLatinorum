import { test, expect } from '@playwright/test';

test('interfaz editorial: crea cuaderno, reutiliza texto y conserva cambios al navegar',async({page})=>{
  await page.goto('/?classic=1');
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const repo=new IndexedDbCorpusRepository();
    const current=await repo.load();
    const at='2026-11-15T20:00:00.000Z';
    await repo.save({...current.corpus,texts:[...current.corpus.texts,{
      id:'ui.demo.cesar',title:'César · Helvecios',
      latin:'Helvetii impedimenta in unum locum contulerunt.',
      source:{author:'Julio César',work:'De bello Gallico',reference:'I 24'},
      tagIds:[],createdAt:at,updatedAt:at,
    }]},current.revision);
  });
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',d=>d.accept('Cuaderno de prueba'));
  await page.getByRole('button',{name:'+ Cuaderno'}).click();
  await expect(page.getByText('Sin textos',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await expect(page.getByRole('button',{name:'Añadir desde Mis textos'})).toBeEnabled();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await expect(page.getByText('Texto 1 de 1')).toBeVisible();
  await page.getByRole('button',{name:'Preguntas'}).click();
  await expect(page.locator('.edition-paper')).toContainText('Elige dos de estas cuatro preguntas');
  await expect(page.locator('.edition-paper')).toContainText('Traducción del texto');
  await expect(page.locator('.edition-paper')).toContainText('Julio César');
  await page.getByRole('button',{name:'Cuaderno',exact:true}).click();
  await page.getByRole('button',{name:'Añadir desde Mis textos'}).click();
  await expect(page.getByText('Texto 2 de 2')).toBeVisible();
  await page.getByRole('button',{name:'Anterior'}).click();
  await expect(page.getByText('Texto 1 de 2')).toBeVisible();
  await page.getByRole('button',{name:'Texto',exact:true}).click();
  const title=page.getByRole('textbox',{name:'Título del texto'});
  await title.fill('Primer texto editado');
  await page.getByRole('button',{name:'Siguiente'}).click();
  await page.getByRole('button',{name:'Anterior'}).click();
  await expect(page.getByRole('textbox',{name:'Título del texto'})).toHaveValue('Primer texto editado');
  await page.getByRole('button',{name:'Ver cuaderno completo'}).click();
  await expect(page.locator('.edition-paper')).toHaveCount(2);
  await page.reload();
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  await expect(page.locator('.edition-paper')).toHaveCount(1);
  await expect(page.locator('.edition-paper')).toContainText('Primer texto editado');
});

test('interfaz editorial: editor manual no altera pregunta ni apartados vecinos',async({page})=>{
  await page.goto('/?classic=1');
  await page.getByRole('button',{name:'Preparar cuaderno'}).click();
  page.once('dialog',d=>d.accept('Cuaderno sin datos'));
  await page.getByRole('button',{name:'+ Cuaderno'}).click();
  await page.getByRole('button',{name:'Formato'}).click();
  await expect(page.getByRole('spinbutton',{name:'Tamaño del texto (pt)'})).toHaveValue('10.5');
  await expect(page.getByRole('spinbutton',{name:'Espacio adicional entre líneas (pt)'})).toHaveValue('3');
  await page.getByRole('button',{name:'Copia JSON'}).click();
  await expect(page.locator('.edition-save-state')).toContainText('Copia editorial JSON v2 preparada');
});
