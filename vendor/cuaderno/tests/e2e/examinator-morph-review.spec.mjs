import {test,expect} from '@playwright/test';

async function createNotebook(page,latin){
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Revisión morfológica'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
  const modal=page.locator('.modal').last();
  await modal.getByRole('textbox',{name:'Texto latino'}).fill(latin);
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  return page.locator('.edition-question-panel[data-kind="morphology"]');
}

test('revisar un análisis ya verificado informa junto a la palabra y evita una falsa regeneración',async({page})=>{
  const morph=await createNotebook(page,'arate.');
  await page.locator('.edition-menu-nav').getByRole('button',{name:'Preguntas'}).click();
  const row=morph.locator('.edition-academic-morph-row').filter({hasText:'arate'});
  await expect(row).toContainText('V;IMP;ACT;PRS;2;PL');
  await row.getByRole('button',{name:'Revisar análisis de arate'}).click();
  await expect(morph.locator('.edition-morph-feedback')).toContainText(
    'ya tiene su único análisis verificado');
  await expect(morph.locator('.edition-morph-inline-review')).toHaveCount(0);
  await expect(row).toContainText('V;IMP;ACT;PRS;2;PL');
});

test('la forma ambigua exige selección explícita, sin elegir en silencio la primera lectura',async({page})=>{
  const morph=await createNotebook(page,'dux.');
  await page.locator('.edition-menu-nav').getByRole('button',{name:'Texto',exact:true}).click();
  const area=page.locator('.edition-menu-text textarea').first();
  await area.evaluate(node=>{node.focus();node.setSelectionRange(0,3);});
  await page.getByRole('button',{name:'Subrayar palabra seleccionada'}).click();
  // Una forma con NOM/VOC nunca debe elegir automáticamente la primera lectura.
  const initial=page.locator('.edition-academic-review').first();
  await expect(initial).toBeVisible();
  const initialChoice=initial.getByRole('combobox',{name:'Candidatura verificada'});
  await expect(initialChoice).toHaveValue('');
  await initialChoice.selectOption({index:1});
  await initial.getByRole('button',{name:'Confirmar propuesta'}).click();
  await page.locator('.edition-menu-nav').getByRole('button',{name:'Preguntas'}).click();
  const row=morph.locator('.edition-academic-morph-row').filter({hasText:'dux'});
  await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Revisar análisis de dux'}).click();
  const review=morph.locator('.edition-morph-inline-review');
  await expect(review).toBeVisible();
  const select=review.getByRole('combobox',{name:'Candidatura verificada'});
  await expect(select).toHaveValue('');
  await expect(select.locator('option')).toHaveCount(3);
  await select.selectOption({index:2});
  await review.getByRole('button',{name:'Confirmar propuesta'}).click();
  await expect(review).toHaveCount(0);
  await expect(morph.locator('.edition-academic-morph-row').filter({hasText:'dux'}))
    .toContainText('N;VOC;SG');
});
