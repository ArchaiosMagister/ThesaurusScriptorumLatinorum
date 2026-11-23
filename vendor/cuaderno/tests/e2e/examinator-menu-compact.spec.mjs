import {test,expect} from '@playwright/test';

test('PR C: cinco menús compactos, controles uniformes y sin desbordes en escritorio, iPad e iPhone',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:840});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno de revisión visual'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Texto de prueba visual');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caelum et poeta, poena et proelium.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');

  const menus=[['Texto','text'],['Preguntas','questions'],['Vocabulario','vocabulary'],
    ['Formato','format'],['Organizar','notebook']];
  for(const size of [
    {width:1280,height:840,profile:'escritorio'},
    {width:820,height:1180,profile:'ipad'},
    {width:390,height:844,profile:'iphone'},
  ]){
    await page.setViewportSize({width:size.width,height:size.height});
    const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
    await expect(tabs.getByRole('button')).toHaveCount(5);
    const geometry=await tabs.getByRole('button').evaluateAll(buttons=>
      buttons.map(button=>button.getBoundingClientRect().width));
    expect(Math.max(...geometry)-Math.min(...geometry)).toBeLessThan(2);
    const editorWidth=await page.locator('#editor').evaluate(el=>el.getBoundingClientRect().width);
    if(size.width>=1200)expect(editorWidth).toBeLessThanOrEqual(605);
    if(size.width>700)expect(editorWidth/size.width).toBeCloseTo(.40,2);

    for(const [label,key] of menus){
      await tabs.getByRole('button',{name:label,exact:true}).click();
      const panel=page.locator('#editor .edition-menu-'+key);
      await expect(panel).toBeVisible();
      const metrics=await panel.evaluate(el=>({
        inner:el.clientWidth,scroll:el.scrollWidth,
        inputs:[...el.querySelectorAll('input.field-control,select.field-control')].map(i=>({
          font:parseFloat(getComputedStyle(i).fontSize),
          height:i.getBoundingClientRect().height,
        })),
      }));
      expect(metrics.scroll, size.profile+': '+label+' desbordado').toBeLessThanOrEqual(metrics.inner+3);
      if(key==='text'||key==='format'){
        expect(metrics.inputs.length).toBeGreaterThan(2);
        if(size.width<=760){
          expect(metrics.inputs.every(i=>i.font>=16),size.profile+': controles legibles').toBe(true);
        }else{
          expect(metrics.inputs.every(i=>i.height<=36),size.profile+': campos compactos').toBe(true);
        }
      }
    }
    await tabs.getByRole('button',{name:'Preguntas',exact:true}).click();
    await info.attach('menus-'+size.profile,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png',
    });
    const paper=await page.locator('.edition-paper').first().evaluate(el=>el.offsetWidth);
    expect(paper).toBeGreaterThan(780);
  }
  await expect(page.locator('#btnDocx')).toBeVisible();
  await expect(page.locator('#btnPdf')).toBeVisible();
  expect(errors).toEqual([]);
});
