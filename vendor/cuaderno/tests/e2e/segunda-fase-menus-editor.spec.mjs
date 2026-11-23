import {test,expect} from '@playwright/test';

test('fase 2: Texto, Preguntas, Formato y Organizar conservan funciones y estado de desplegables',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:850});
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Cuaderno fase dos'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const dialog=page.locator('.modal');
  await dialog.getByRole('textbox',{name:'Título'}).fill('Texto de prueba');
  await dialog.getByRole('textbox',{name:'Texto latino'}).fill('Caesar et milites in Gallia erant.');
  await dialog.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');

  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Texto',exact:true}).click();
  const textPanel=page.locator('#editor .edition-menu-text');
  const bibliography=textPanel.locator('details.edition-bibliography');
  await expect(bibliography).toHaveAttribute('open','');
  await expect(textPanel.getByRole('textbox',{name:'Título del texto'})).toBeVisible();
  await expect(textPanel.getByRole('textbox',{name:'Texto latino'})).toBeVisible();
  await bibliography.getByRole('textbox',{name:'Autor'}).fill('Julio César');
  await bibliography.locator('summary').click();
  await expect(bibliography).not.toHaveAttribute('open','');
  await expect(textPanel.getByRole('textbox',{name:'Título del texto'})).toBeVisible();
  await expect(textPanel.getByRole('textbox',{name:'Texto latino'})).toBeVisible();
  await expect(bibliography.getByRole('textbox',{name:'Autor'})).toBeHidden();

  await tabs.getByRole('button',{name:'Preguntas'}).click();
  const questionPanel=page.locator('.edition-menu-questions');
  const cards=questionPanel.locator('.edition-question-panel');
  await expect(cards).toHaveCount(4);
  await expect(questionPanel.locator('.edition-question-jump')).toHaveCount(4);
  await expect(cards.first().locator('.edition-statement-text')).toBeVisible();
  await expect(cards.first().getByRole('textbox',{name:'Enunciado'})).toHaveCount(0);
  await cards.first().locator('.edition-question-fold').click();
  await expect(cards.first()).toHaveClass(/is-folded/);
  await expect(cards.first().getByRole('textbox',{name:'Enunciado'})).toHaveCount(0);
  await expect(cards.first().getByRole('checkbox',{name:'Incluir pregunta translation'})).toBeVisible();
  await questionPanel.getByRole('navigation',{name:'Ir a una pregunta'})
    .getByRole('button',{name:'Ir a pregunta 1: Traducción'}).click();
  await expect(cards.first()).not.toHaveClass(/is-folded/);
  await expect(cards.first().locator('.edition-statement-text')).toBeVisible();
  await cards.first().getByRole('button',{name:'Editar enunciado',exact:true}).click();
  await expect(cards.first().getByRole('textbox',{name:'Enunciado'})).toBeVisible();
  await cards.first().getByRole('button',{name:'Terminar edición de enunciado'}).click();
  await expect(questionPanel.locator('.edition-score, .edition-error').last()).toContainText('Total activo');

  await tabs.getByRole('button',{name:'Formato'}).click();
  const format=page.locator('.edition-menu-format');
  await expect(format.locator('details.edition-format-group')).toHaveCount(3);
  await expect(format.locator('.edition-format-typography')).toHaveAttribute('open','');
  await expect(format.locator('.edition-format-spacing')).toHaveAttribute('open','');
  await expect(format.locator('.edition-format-margins')).not.toHaveAttribute('open','');
  await expect(format.getByRole('combobox',{name:'Tipografía'})).toBeVisible();
  await format.locator('.edition-format-margins summary').click();
  await expect(format.getByRole('spinbutton',{name:'Margen Superior (cm)'})).toBeVisible();
  await format.getByRole('combobox',{name:'Tipografía'}).selectOption('Georgia');
  await expect(format.locator('.edition-format-margins')).toHaveAttribute('open','');
  await expect(format.getByRole('combobox',{name:'Tipografía'})).toHaveValue('Georgia');
  await expect(format.getByRole('button',{name:'Aplicar a todos los textos'})).toBeVisible();

  await tabs.getByRole('button',{name:'Organizar'}).click();
  const organizer=page.locator('.edition-menu-notebook');
  await expect(organizer.locator('.edition-organize-heading')).toHaveText('Organizar el cuaderno');
  await expect(organizer.locator('.edition-organize-primary h3')).toHaveText('Título y orden de los textos');
  await expect(organizer.locator('.edition-organize-primary h4').first()).toContainText('Orden de los textos');
  await expect(organizer.getByRole('textbox',{name:'Título del cuaderno'})).toBeVisible();
  await expect(organizer.locator('.edition-organize-primary .edition-notebook-row')).toHaveCount(1);
  await expect(organizer.locator('.edition-organize-review h3')).toHaveText('Revisión del cuaderno');
  await expect(organizer.locator('.edition-notebook-advanced')).toBeVisible();
  await organizer.locator('.edition-notebook-advanced summary').click();
  await expect(organizer.locator('.edition-notebook-advanced')).toHaveAttribute('open','');

  for(const viewport of [
    {width:1280,height:850,name:'escritorio'},
    {width:820,height:1180,name:'ipad'},
    {width:390,height:844,name:'iphone'},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    for(const [label,klass] of [['Texto','text'],['Preguntas','questions'],
      ['Formato','format'],['Organizar','notebook']]){
      await tabs.getByRole('button',{name:label,exact:true}).click();
      const panel=page.locator('#editor .edition-menu-'+klass);
      await expect(panel).toBeVisible();
      const geometry=await panel.evaluate(el=>({inner:el.clientWidth,scroll:el.scrollWidth}));
      expect(geometry.scroll,viewport.name+': '+label+' sin desbordes').toBeLessThanOrEqual(geometry.inner+3);
    }
    await tabs.getByRole('button',{name:'Formato'}).click();
    await info.attach('fase2-'+viewport.name,{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png',
    });
  }
  await tabs.getByRole('button',{name:'Texto'}).click();
  await expect(bibliography).not.toHaveAttribute('open','');
  await bibliography.locator('summary').click();
  await expect(bibliography.getByRole('textbox',{name:'Autor'})).toHaveValue('Julio César');
  await expect(page.locator('.edition-paper').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('fase 2: el índice de preguntas no altera las preguntas, el vocabulario ni el PDF/Word',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Verificación académico editorial'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const dialog=page.locator('.modal');
  await dialog.getByRole('textbox',{name:'Título'}).fill('Texto editorial');
  await dialog.getByRole('textbox',{name:'Texto latino'}).fill('Puer in horto ambulat.');
  await dialog.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Preguntas'}).click();
  const first=page.locator('.edition-question-panel').first();
  const originalStatement=await first.locator('.edition-statement-text').first().innerText();
  const originalLatin=await page.locator('.edition-latin').first().innerText();
  const originalPoints=await first.getByRole('spinbutton',{name:'Puntos'}).inputValue();
  await first.locator('.edition-question-fold').click();
  await expect(first).toHaveClass(/is-folded/);
  await first.locator('.edition-question-fold').click();
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.locator('.edition-vocab-section')).toHaveCount(3);
  await tabs.getByRole('button',{name:'Preguntas'}).click();
  await expect(first.locator('.edition-statement-text').first()).toHaveText(originalStatement);
  await expect(first.getByRole('spinbutton',{name:'Puntos'})).toHaveValue(originalPoints);
  await expect(page.locator('.edition-latin').first()).toHaveText(originalLatin);
  await expect(page.locator('#btnDocx')).toBeVisible();
  await expect(page.locator('#btnPdf')).toBeVisible();
});
