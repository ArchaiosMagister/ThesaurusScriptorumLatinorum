import {test,expect} from '@playwright/test';

test('cabecera compacta: accesos originales, contador y distribución sin desbordes',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:840});
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',d=>d.accept('Cuaderno compacto'));
  await page.locator('#btnNew').click();

  const panel=page.locator('#editor .cuaderno-editor-overview');
  await expect(panel).toBeVisible();
  await expect(panel.locator('h3')).toHaveText('Cuaderno de textos latinos');
  await expect(panel.locator('.cuaderno-context-current')).toHaveText('Cuaderno compacto');
  await expect(panel.locator('.cuaderno-context-count')).toHaveText('0 textos');
  await expect(page.locator('#btnOpen')).toBeVisible();
  await expect(panel.getByRole('button',{name:'Gestionar cuadernos'})).toBeVisible();
  await expect(panel.getByRole('combobox',{name:'Elegir cuaderno'})).toBeVisible();
  await expect(panel.getByText('0 textos en este cuaderno.')).toHaveCount(0);

  await panel.getByRole('button',{name:'Gestionar cuadernos'}).click();
  await expect(page.locator('.modal .mh h2')).toHaveText('Gestionar cuadernos');
  await page.locator('.modal .mf button').click();
  const backups=panel.locator('details.cuaderno-context-backups');
  await backups.locator('summary').click();
  await expect(backups.getByRole('button',{name:'Copia del cuaderno'})).toBeVisible();
  await expect(backups.getByRole('button',{name:'Copia integral'})).toBeVisible();
  await expect(backups.getByRole('button',{name:'Restaurar copia'})).toBeVisible();
  await backups.locator('summary').click();

  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Un texto');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar in Gallia erat.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('#editor .cuaderno-context-count')).toHaveText('1 texto');

  for(const size of [
    {width:1280,height:840,name:'escritorio'},
    {width:820,height:1180,name:'ipad'},
    {width:390,height:844,name:'iphone'}
  ]){
    await page.setViewportSize({width:size.width,height:size.height});
    const metrics=await panel.evaluate(element=>({
      width:element.clientWidth,scroll:element.scrollWidth,
      top:element.querySelector('.cuaderno-context-top').getBoundingClientRect().height,
    }));
    expect(metrics.scroll,size.name+' no debe desbordarse').toBeLessThanOrEqual(metrics.width+3);
    expect(metrics.top,size.name+' cabecera visible').toBeGreaterThan(20);
    await info.attach('cabecera-'+size.name,{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png',
    });
  }
  await page.locator('#btnOpen').click();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('OLED: negro puro, A4 blanca, colores funcionales y persistencia en iPad',async({page},info)=>{
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  const theme=page.locator('#btnCuadernoTheme');
  await expect(theme).toHaveValue('light');
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','dark');
  await expect(theme).toHaveValue('dark');
  await theme.selectOption('oled');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','oled');
  await expect(theme).toHaveValue('oled');
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('#editor .cuaderno-home')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','oled');
  await expect(theme).toHaveValue('oled');

  page.once('dialog',d=>d.accept('Cuaderno OLED'));
  await page.locator('#btnNew').click();
  await expect(page.locator('#editor .cuaderno-editor-overview')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('#editor .edition-preview-stack')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('#editor .edition-menu-content')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('#btnDocx')).toHaveCSS('background-color','rgb(36, 91, 176)');
  await expect(page.locator('#btnPdf')).toHaveCSS('background-color','rgb(181, 38, 56)');

  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await expect(modal).toHaveCSS('background-color','rgb(0, 0, 0)');
  await modal.getByRole('textbox',{name:'Título'}).fill('Texto OLED');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar et milites venerunt.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-paper').first()).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(page.locator('.edition-paper').first()).toHaveCSS('color','rgb(21, 21, 21)');
  await info.attach('oled-ipad',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await page.setViewportSize({width:390,height:844});
  await info.attach('oled-iphone',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});

  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','light');
  await expect(theme).toHaveValue('light');
  expect(errors).toEqual([]);
});
