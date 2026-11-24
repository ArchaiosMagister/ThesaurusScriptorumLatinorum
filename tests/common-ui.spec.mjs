import { expect,test } from './isolated-bank.mjs';
test('copias y formularios comparten controles legibles en los tres temas',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 for(const theme of ['light','dark','oled']){
  await page.locator('#app-theme').selectOption(theme);
  await page.locator('#app-backup').click();
  const dialog=page.locator('#backup-dialog');
  await expect(dialog.getByRole('heading',{name:'Exportar',exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Recuperar copia'})).toBeDisabled();
  const root=await dialog.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,radius:parseFloat(getComputedStyle(el).borderRadius)}));
  expect(root.overflow).toBeLessThanOrEqual(1);
  expect(root.radius).toBeGreaterThanOrEqual(10);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await bank.getByRole('button',{name:'Pegar en el banco'}).click();
  const modal=frame.locator('.modal').last();
  const field=modal.getByRole('textbox',{name:'Título',exact:true});
  await expect(field).toBeVisible();
  const appearance=await field.evaluate(el=>({radius:parseFloat(getComputedStyle(el).borderRadius),height:el.getBoundingClientRect().height,foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
  expect(appearance.radius).toBeGreaterThanOrEqual(7);
  expect(appearance.height).toBeGreaterThanOrEqual(40);
  expect(appearance.foreground).not.toBe(appearance.background);
  await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 }
});
