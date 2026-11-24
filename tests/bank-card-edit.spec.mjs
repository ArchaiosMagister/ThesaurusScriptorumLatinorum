import { expect, test } from '@playwright/test';

test('el margen superior coincide con la banda del título en los tres temas', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  for (const theme of ['light', 'dark', 'oled']) {
    await page.locator('#app-theme').selectOption(theme);
    const actual = await page.locator('header').evaluate(header => ({
      top: header.getBoundingClientRect().top,
      body: getComputedStyle(document.body).backgroundColor,
      title: getComputedStyle(header.querySelector('h1')).backgroundColor,
    }));
    expect(actual.top).toBe(44);
    expect(actual.body).toBe(actual.title);
  }
});

test('la tarjeta abre el editor directamente y Leer conserva el lector', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', { name: 'Banco de textos propios' });
  await bank.getByRole('button', { name: 'Pegar en el banco' }).click();
  const modal = frame.locator('.modal').last();
  await modal.getByRole('textbox', { name: 'Título' }).fill('Texto de prueba');
  await modal.getByRole('textbox', { name: 'Texto latino' }).fill('Gallia est omnis divisa in partes tres.');
  await modal.getByRole('button', { name: 'Guardar en el banco' }).click();
  const card = bank.locator('.atl-bank-card');
  await card.click();
  await expect(modal.locator('.atl-bank-edit-form')).toBeVisible();
  await expect(modal.getByRole('textbox', { name: 'Texto latino' })).toHaveValue('Gallia est omnis divisa in partes tres.');
  await expect(frame.locator('.atl-bank-reader')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await bank.getByRole('button', { name: 'Leer «Texto de prueba»' }).click();
  await expect(frame.locator('.atl-bank-reader')).toBeVisible();
  await frame.getByRole('button', { name: 'Volver al listado' }).click();
});
