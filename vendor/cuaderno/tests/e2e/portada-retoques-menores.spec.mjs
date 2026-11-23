import {test,expect} from '@playwright/test';

test('retoques de Inicio: filtros alineados, PWA plegable y temas accesibles en escritorio/iPad/iPhone',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/examinator-cuadernos/');
  const home=page.locator('#editor .cuaderno-home');
  const pwa=home.locator('.cuaderno-home-pwa');
  const details=pwa.locator('details.cuaderno-home-pwa-details');
  await expect(home.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(home.getByRole('heading',{name:'Banco de textos propios'})).toBeVisible();
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(pwa.getByRole('button',{name:'Buscar actualizaciones'})).toBeVisible();
  await expect(pwa.locator('[data-pwa-install]')).toBeVisible();
  await details.locator('summary').click();
  await expect(details).not.toHaveAttribute('open');

  const theme=page.locator('#btnCuadernoTheme');
  for(const mode of ['light','dark','oled']){
    await theme.selectOption(mode);
    await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme',mode);
    for(const size of [{name:'desktop',width:1280,height:840},
      {name:'ipad',width:820,height:1180},{name:'iphone',width:390,height:844}]){
      await page.setViewportSize({width:size.width,height:size.height});
      const metrics=await page.locator('.cuaderno-bank-toolbar').evaluate(node=>{
        const controls=[...node.querySelectorAll('input,select')];
        return {
          heights:controls.map(control=>Math.round(control.getBoundingClientRect().height)),
          overflow:document.documentElement.scrollWidth-innerWidth,
          titleColor:getComputedStyle(document.querySelector('.cuaderno-home-card h5')??node).color,
        };
      });
      expect(metrics.heights.length).toBe(4);
      expect(new Set(metrics.heights).size,mode+' / '+size.name+' campos desiguales').toBe(1);
      expect(metrics.heights[0]).toBe(size.width<=600?44:39);
      expect(metrics.overflow,mode+' / '+size.name+' desbordamiento').toBeLessThanOrEqual(2);
      if(size.name==='ipad'){
        await info.attach('inicio-'+mode+'-ipad',{
          body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
      }
    }
  }

  await theme.selectOption('light');
  await page.setViewportSize({width:1280,height:840});
  page.once('dialog',d=>d.accept('Cuaderno de muestra'));
  await page.getByRole('button',{name:'Nuevo cuaderno'}).click();
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await expect(tabs.getByRole('button')).toHaveCount(5);
  for(const label of ['Texto','Preguntas','Vocabulario','Formato','Organizar']){
    const button=tabs.getByRole('button',{name:label,exact:true});
    await button.click();
    await expect(button).toHaveAttribute('aria-current','page');
    await expect(button).toHaveCSS('box-shadow',/inset/);
    await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await page.locator('#btnOpen').click();
  const card=home.locator('.cuaderno-home-card').filter({hasText:'Cuaderno de muestra'});
  await expect(card).toBeVisible();
  await expect(card.getByRole('button',{name:'Abrir'})).toBeVisible();
  await expect(card.getByRole('button',{name:'Hacer copia'})).toBeVisible();
  await expect(card.getByRole('button',{name:'Eliminar'})).toBeVisible();
  expect(errors).toEqual([]);
});
