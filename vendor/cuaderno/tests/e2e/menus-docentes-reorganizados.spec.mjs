import {test,expect} from '@playwright/test';

test('menús docentes: acciones únicas conservadas y distribución compacta en escritorio/iPad/iPhone',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:850});
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Apariencia'})).toHaveValue('light');
  page.once('dialog',d=>d.accept('Cuaderno navegación compacta'));
  await page.locator('#btnNew').click();

  const header=page.locator('body > header');
  const panel=page.locator('.cuaderno-editor-overview');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await expect(header.getByRole('button',{name:'Mis cuadernos'})).toBeVisible();
  await expect(header.getByRole('button',{name:'Nuevo cuaderno'})).toBeVisible();
  await expect(header.locator('#btnSave')).toBeVisible();
  await expect(header.locator('#btnDocx')).toBeVisible();
  await expect(header.locator('#btnPdf')).toBeVisible();
  await expect(header.locator('#btnLib')).toHaveCount(0);
  await expect(header.locator('#btnLists')).toHaveCount(0);
  await expect(panel.locator('#btnLib')).toBeVisible();
  await expect(panel.locator('#btnLists')).toBeVisible();
  await expect(panel.locator('.cuaderno-add-primary button')).toHaveCount(2);
  await expect(panel.locator('.cuaderno-add-secondary button')).toHaveCount(2);
  await expect(tabs.getByRole('button')).toHaveCount(5);
  await expect(page.locator('#btnSettings')).toBeHidden();
  await header.getByRole('button',{name:'Más'}).click();
  await expect(page.locator('#btnSettings')).toBeVisible();
  await page.locator('#btnSettings').click();
  await expect(tabs.getByRole('button',{name:'Formato'})).toHaveAttribute('aria-current','page');

  await panel.getByRole('button',{name:'Pegar texto'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Texto de revisión');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar et milites in Gallia erant.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.locator('.edition-vocab-section')).toHaveCount(3);
  await expect(page.locator('.edition-vocab-selection h3')).toHaveText('Selección de palabras');
  await expect(page.locator('.edition-vocab-analysis h3')).toHaveText('Análisis con Collatinus');
  await expect(page.locator('.edition-vocab-entries h3')).toHaveText('Entradas editables');
  await expect(page.getByRole('group',{name:'Selección de vocabulario'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Cantidades vocálicas'})).toBeVisible();
  await expect(page.locator('.edition-vocab-entries .edition-vocab-add')).toBeVisible();
  await page.locator('#btnSave').click();
  await expect(page.locator('#btnSave')).toBeEnabled();

  for(const v of [
    {width:1280,height:850,name:'escritorio'},
    {width:820,height:1180,name:'ipad'},
    {width:390,height:844,name:'iphone'},
  ]){
    await page.setViewportSize({width:v.width,height:v.height});
    await expect(page.locator('.cuaderno-add-actions .hbtn')).toHaveCount(4);
    const geometry=await page.evaluate(()=>({
      page:document.documentElement.clientWidth,
      pageScroll:document.documentElement.scrollWidth,
      tabsWidth:document.querySelector('.edition-menu-nav')?.clientWidth??0,
      tabsScroll:document.querySelector('.edition-menu-nav')?.scrollWidth??0,
      headerWidth:document.querySelector('body>header')?.clientWidth??0,
    }));
    expect(geometry.pageScroll,v.name+' viewport sin desbordes').toBeLessThanOrEqual(geometry.page+3);
    expect(geometry.headerWidth,v.name+' cabecera en el viewport').toBeLessThanOrEqual(geometry.page+3);
    if(v.width===390)expect(geometry.tabsScroll).toBeGreaterThan(geometry.tabsWidth);
    await info.attach('menu-aprobado-'+v.name,{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png',
    });
  }
  await page.locator('#btnOpen').click();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(page.locator('#btnNew')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Apariencia: selector accesible, OLED persistente y papel A4 intacto',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const selector=page.getByRole('combobox',{name:'Apariencia'});
  await selector.selectOption('oled');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','oled');
  await page.reload();
  await expect(selector).toHaveValue('oled');
  page.once('dialog',d=>d.accept('Cuaderno visual OLED'));
  await page.locator('#btnNew').click();
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Prueba de papel OLED');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar in Gallia erat.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-paper').first()).toHaveCSS('background-color','rgb(255, 255, 255)');
  await selector.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','dark');
  await selector.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme','light');
});
