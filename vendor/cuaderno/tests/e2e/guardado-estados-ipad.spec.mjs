import {test,expect} from '@playwright/test';

test('guardado del cuaderno y vocabulario: estados diferenciados y visibles en iPad/iPhone',async({page})=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Cuaderno estados'));
  await page.getByRole('button',{name:'Nuevo cuaderno'}).click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Título'}).fill('Prueba de estado');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Caesar urbem defendit.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  const badge=page.locator('#cuadernoHeaderSaveState');
  await expect(badge).toBeVisible();
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  const form=page.locator('#editor .edition-vocab-add');
  await form.locator('input').nth(0).fill('terra, -ae (f.)');
  await form.locator('input').nth(1).fill('tierra');
  await form.getByRole('button',{name:'Añadir entrada'}).click();
  // La lista se ordena y Collatinus puede repintarla: usar el valor
  // efectivo del input, no el orden de los lemas ni el atributo HTML.
  const index=await page.locator('#editor .edition-vocab-row').evaluateAll(rows=>
    rows.findIndex(row=>row.querySelector('input.edition-vocab-headword')?.value.startsWith('terra')));
  expect(index).toBeGreaterThanOrEqual(0);
  const preferred=page.locator('#editor .edition-vocab-row').nth(index);
  const save=preferred.locator('button.edition-vocab-save');
  const meaning=preferred.locator('input.edition-vocab-meaning');
  await expect(save).toHaveAttribute('data-save-state',/pending|saved/);
  await expect(badge).toBeVisible();
  await meaning.fill('');
  await save.click();
  await expect(badge).toHaveText('Error');
  await expect(badge).toHaveAttribute('data-state','error');
  await expect(badge).toHaveAttribute('aria-label',/Escribe un enunciado y una traducción/);
  await expect(save).toHaveAttribute('data-save-state','pending');
  await meaning.fill('tierra');
  await save.click();
  await expect(save).toHaveText('✓ Guardado');
  await expect(save).toHaveAttribute('data-save-state','saved');
  await expect(badge).toHaveText('Aviso');
  await expect(badge).toHaveAttribute('aria-label',/Corrección guardada para futuros cuadernos/);
  await meaning.fill('tierra cultivada');
  await expect(save).toHaveText('Guardar');
  await expect(save).toHaveAttribute('data-save-state','pending');

  for(const mode of ['light','dark','oled']){
    await page.locator('#btnCuadernoTheme').selectOption(mode);
    await expect(page.locator('html')).toHaveAttribute('data-cuaderno-theme',mode);
    for(const size of [{width:820,height:1180},{width:390,height:844}]){
      await page.setViewportSize(size);
      await expect(badge).toBeVisible();
      await expect(badge).not.toHaveCSS('display','none');
      expect(await badge.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(26);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('iPad: navegación y acciones siguen cómodas y hay foco visible',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  const pwa=page.locator('.cuaderno-home-pwa-details>summary');
  await expect(pwa).toBeVisible();
  expect(await pwa.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
  const bankEntry=page.locator('.cuaderno-home-bank');
  await expect(bankEntry).toBeVisible();
  const source=bankEntry.locator('input[type="search"]');
  await expect(source).toBeVisible();
  const metrics=await page.locator('#editor .cuaderno-bank-toolbar').evaluate(node=>({
    inputHeights:[...node.querySelectorAll('input,select')].map(el=>Math.round(el.getBoundingClientRect().height)),
    scroll:document.documentElement.scrollWidth-innerWidth,
  }));
  expect(new Set(metrics.inputHeights).size).toBe(1);
  expect(metrics.scroll).toBeLessThanOrEqual(2);
  await page.keyboard.press('Tab');
  await pwa.focus();
  await expect(pwa).toHaveCSS('outline-style','solid');

  page.once('dialog',d=>d.accept('iPad táctil'));
  await page.getByRole('button',{name:'Nuevo cuaderno'}).click();
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await expect(tabs.getByRole('button')).toHaveCount(5);
  for(const button of await tabs.getByRole('button').all())
    expect(await button.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(38);
  await page.locator('#btnOpen').click();
  const card=page.locator('.cuaderno-home-card').filter({hasText:'iPad táctil'});
  await expect(card.getByRole('button',{name:'Hacer copia'})).toBeVisible();
  expect(await card.getByRole('button',{name:'Hacer copia'})
    .evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
  await page.setViewportSize({width:390,height:844});
  expect(await card.getByRole('button',{name:'Hacer copia'})
    .evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(42);
});
