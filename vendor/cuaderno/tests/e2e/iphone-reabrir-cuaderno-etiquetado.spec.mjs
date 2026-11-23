import {test,expect} from '@playwright/test';

test('Safari iPhone: iniciar con un cuaderno guardado y etiquetas no accede a corpus sin inicializar',async({page})=>{
  test.setTimeout(150000);
  await page.setViewportSize({width:390,height:844});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();

  page.once('dialog',dialog=>dialog.accept('Cuaderno ya guardado en iPhone'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill('Pasaje con etiquetas anteriores');
  await modal.getByRole('textbox',{name:'Texto latino'})
    .fill('Caesar Galliam vicit. Romani castra moverunt.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');

  await page.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
  await modal.getByRole('textbox',{name:'Nueva etiqueta gramatical'})
    .fill('Etiqueta docente para Safari');
  await modal.getByRole('button',{name:'Añadir',exact:true}).click();
  await expect(modal.getByText('Etiquetas gramaticales (1)',{exact:true})).toBeVisible();
  await modal.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(page.locator('.cuaderno-current-tags')).toContainText('Etiqueta docente para Safari');
  await page.locator('#btnSave').click();

  // Reproducir el fallo real: el arranque reutiliza la primera edición
  // del IndexedDB y la pinta ANTES de volver a "Mis cuadernos".
  await page.reload();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(page.locator('#editor')).not.toContainText('No se ha podido iniciar el cuaderno');
  const card=page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno ya guardado en iPhone'});
  await expect(card).toBeVisible();
  await card.getByRole('button',{name:'Abrir',exact:true}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await expect(page.locator('.cuaderno-current-tags')).toContainText('Etiqueta docente para Safari');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Texto',exact:true}).click();
  await expect(page.locator('.edition-tags-summary')).toContainText('Etiqueta docente para Safari');
  await expect(page.locator('.edition-paper')).toContainText('Caesar Galliam vicit');
  expect(errors).toEqual([]);
});
