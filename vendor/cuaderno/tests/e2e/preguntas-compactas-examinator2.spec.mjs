import {test,expect} from '@playwright/test';

async function makeNotebook(page){
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Cuaderno compacto'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Texto de comprobación');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar cum militibus in Gallia erat. Deinde milites castra moverunt.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Preguntas'}).click();
  return tabs;
}
async function data(page){
  return page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repo=new WorkspaceRepository();
    return (await repo.listEditions())[0].edition;
  });
}

test('A B F: cabeceras compactas, índice mínimo y enunciados editables sin perder datos',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const tabs=await makeNotebook(page);
  const panel=page.locator('.edition-menu-questions');
  const qs=panel.locator('.edition-question-panel');
  await expect(qs).toHaveCount(4);
  await expect(panel.locator('.edition-question-jump')).toHaveCount(4);
  await expect(panel.locator('.edition-question-index>strong')).toHaveCount(0);
  await expect(qs.first().locator('.edition-question-status')).toHaveCount(0);
  await expect(qs.first().locator('.edition-question-top .edition-question-points')).toBeVisible();
  await expect(qs.first().getByRole('checkbox',{name:'Incluir pregunta translation'})).toBeChecked();
  await expect(qs.first().getByRole('textbox',{name:'Enunciado',exact:true})).toHaveCount(0);
  await expect(qs.first().locator('.edition-statement-text')).toBeVisible();

  await qs.first().getByRole('button',{name:'Editar enunciado',exact:true}).click();
  const field=qs.first().getByRole('textbox',{name:'Enunciado',exact:true});
  await expect(field).toBeVisible();
  await field.fill('Traduce el siguiente texto latino.');
  await qs.first().getByRole('button',{name:'Terminar edición de enunciado'}).click();
  await expect(qs.first().locator('.edition-statement-text')).toHaveText('Traduce el siguiente texto latino.');
  await expect(page.locator('.edition-paper').first()).toContainText('Traduce el siguiente texto latino.');

  await qs.first().locator('.edition-question-fold').click();
  await expect(qs.first()).toHaveClass(/is-folded/);
  await expect(qs.first().getByRole('checkbox',{name:'Incluir pregunta translation'})).toBeVisible();
  await expect(qs.first().getByRole('spinbutton',{name:'Puntos'})).toBeVisible();
  await panel.getByRole('navigation',{name:'Ir a una pregunta'})
    .getByRole('button',{name:'Ir a pregunta 1: Traducción'}).click();
  await expect(qs.first()).not.toHaveClass(/is-folded/);
  await expect(qs.first().locator('.edition-statement-text')).toHaveText('Traduce el siguiente texto latino.');
  await page.locator('#btnSave').click();
  await page.reload();
  await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno compacto'})
    .getByRole('button',{name:'Abrir'}).click();
  await tabs.getByRole('button',{name:'Preguntas'}).click();
  await expect(qs.first().locator('.edition-statement-text')).toHaveText('Traduce el siguiente texto latino.');
  expect(errors).toEqual([]);
});

test('C D E: pregunta cuatro en filas, regeneración individual y ajustes sin alterar el motor',async({page},info)=>{
  test.setTimeout(150000);
  await makeNotebook(page);
  const panel=page.locator('.edition-menu-questions');
  const choice=panel.locator('.edition-question-panel[data-kind=choice]');
  await expect(choice.locator('.edition-option')).toHaveCount(4);
  await expect(choice.locator('.edition-option > .edition-option-head')).toHaveCount(4);
  const prefix=choice.locator('.edition-option').filter({hasText:'Prefijos'});
  const section=prefix.locator('.edition-option-advanced');
  await expect(section).not.toHaveAttribute('open','');
  await expect(prefix.getByRole('button',{name:/^(Generar|Proponer apartado) Prefijos$/})).toBeVisible();
  await prefix.getByRole('button',{name:'Editar enunciado del apartado'}).click();
  const statement=prefix.getByRole('textbox',{name:'Enunciado del apartado'});
  await expect(statement).toBeVisible();
  const original=await statement.inputValue();
  await statement.fill('Prefijos: forma derivados.');
  await prefix.getByRole('button',{name:'Terminar edición de enunciado del apartado'}).click();
  await expect(prefix.locator('.edition-option-statement .edition-statement-text'))
    .toHaveText('Prefijos: forma derivados.');
  await section.locator('summary').click();
  await expect(section).toHaveAttribute('open','');
  await expect(prefix.getByText('Cantidad para este apartado',{exact:false})).toBeVisible();
  await expect(prefix.getByRole('checkbox',{name:/Permitir sustituir palabras manuales/})).toBeVisible();
  await section.locator('summary').click();
  const global=choice.locator('.edition-question-advanced');
  await expect(global).not.toHaveAttribute('open','');
  await global.locator(':scope > summary').click();
  await expect(global.getByRole('button',{name:/Generar pregunta 4|Proponer pregunta 4 completa/})).toBeVisible();
  await expect(panel.locator('.edition-score, .edition-error').last()).toContainText('Total activo');
  await expect(panel.locator('.edition-question-panel[data-kind=morphology] .edition-academic-morph')).toBeVisible();

  // El estado de las opciones avanzadas es puramente visual, igual que
  // plegar una tarjeta; no modifica sus lemas, enunciados ni puntuaciones.
  await page.locator('#btnSave').click();
  const before=await data(page);
  await global.locator(':scope > summary').click();
  await choice.locator('.edition-question-fold').click();
  await choice.locator('.edition-question-fold').click();
  expect(await data(page)).toEqual(before);
  await expect(prefix.locator('.edition-option-statement .edition-statement-text'))
    .toHaveText('Prefijos: forma derivados.');
  expect(original.length).toBeGreaterThan(0);
  for(const viewport of [
    {width:1280,height:840,name:'desktop'},
    {width:820,height:1180,name:'ipad'},
    {width:390,height:844,name:'iphone'},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const numbers=await panel.evaluate(el=>({
      width:el.clientWidth,content:el.scrollWidth,
      viewport:document.documentElement.clientWidth,
      doc:document.documentElement.scrollWidth,
    }));
    expect(numbers.content,viewport.name+' panel').toBeLessThanOrEqual(numbers.width+3);
    expect(numbers.doc,viewport.name+' documento').toBeLessThanOrEqual(numbers.viewport+3);
    await info.attach('preguntas-compactas-'+viewport.name,{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png',
    });
  }
});
