import { expect, test } from '@playwright/test';

test('la portada de cuadernos muestra tarjetas y conserva los datos académicos', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/#cuadernos');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  await expect(frame.getByRole('heading', { name: 'Mis cuadernos', exact: true })).toBeVisible();
  await expect(frame.getByText('Sincronización privada con Supabase', { exact: true })).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept('Lecturas de prueba'));
  await frame.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click();
  await expect(frame.getByRole('combobox', { name: 'Elegir cuaderno' })).toBeVisible();
  await page.reload();
  const card = frame.locator('.cuaderno-home-card').filter({ hasText: 'Lecturas de prueba' });
  await expect(card.getByText('0 textos', { exact: true })).toBeVisible();
  await expect(card.getByText('Sin especificar', { exact: true })).toHaveCount(2);
  await card.getByRole('button', { name: 'Editar datos' }).click();
  const modal = frame.locator('.modal').last();
  await modal.getByRole('textbox', { name: 'Curso', exact: true }).fill('2.º de Bachillerato');
  await modal.getByRole('textbox', { name: 'Curso académico', exact: true }).fill('2026-2027');
  await modal.getByRole('button', { name: 'Guardar datos' }).click();
  await expect(card.getByText('2.º de Bachillerato', { exact: true })).toBeVisible();
  await page.reload();
  await expect(card.getByText('2026-2027', { exact: true })).toBeVisible();
  await expect(card.getByText('2.º de Bachillerato', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Abrir cuaderno «Lecturas de prueba»' }).click();
  await expect(frame.getByRole('combobox', { name: 'Elegir cuaderno' })).toBeVisible();
});
