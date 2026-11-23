import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('exportar una versión y recuperarla en IndexedDB actualiza el campo, incluso tras recargar', async ({ page }) => {
  await page.goto('/?classic=1');
  await page.locator('#diagnostics').evaluate((element) => { element.open = true; });
  await expect(page.locator('#diagnostics .phase')).toContainText('0.2.2');
  await expect(page.locator('#status')).toContainText('EJEMPLO sin guardar');

  const original = 'Helvētiī cōnsilia cēpērunt. Prima ōrātiō.';
  const changed = 'El texto se ha modificado y guardado después.';

  await page.locator('#latin-test').fill(original);
  await page.getByRole('button', { name: 'Guardar texto de prueba' }).click();
  await expect(page.locator('#last-text')).toHaveText(original);
  await expect(page.locator('#revision')).toHaveText('1');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar copia JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^cuaderno-textos-latinos-\d{4}-\d{2}-\d{2}T/);
  const contents = await readFile(await download.path(), 'utf8');
  const json = JSON.parse(contents);
  expect(json.corpus.texts[0].latin).toBe(original);
  expect(json.corpus.texts).toHaveLength(1);

  await page.locator('#latin-test').fill(changed);
  await page.getByRole('button', { name: 'Guardar texto de prueba' }).click();
  await expect(page.locator('#revision')).toHaveText('2');
  await expect(page.locator('#last-text')).toHaveText(changed);

  await page.locator('#backup-file').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
  await expect(page.locator('#backup-preview')).toBeVisible();
  await expect(page.locator('#backup-latin')).toHaveText(original);
  await expect(page.locator('#backup-warning')).toContainText('reaparecerá');
  await expect(page.locator('#restore-backup')).toBeDisabled();

  await page.locator('#confirm-replace').check();
  await page.getByRole('button', { name: 'Restaurar la copia verificada' }).click();
  await expect(page.locator('#status')).toContainText('RESTAURACIÓN CONFIRMADA');
  await expect(page.locator('#latin-test')).toHaveValue(original);
  await expect(page.locator('#last-text')).toHaveText(original);
  await expect(page.locator('#revision')).toHaveText('3');

  await page.reload();
  await expect(page.locator('#latin-test')).toHaveValue(original);
  await expect(page.locator('#last-text')).toHaveText(original);
  await expect(page.locator('#revision')).toHaveText('3');
});

test('bloquea copias que omitirían cambios sin guardar', async ({ page }) => {
  await page.goto('/?classic=1');
  await page.locator('#diagnostics').evaluate((element) => { element.open = true; });
  await expect(page.locator('#status')).toContainText('EJEMPLO sin guardar');
  await page.getByRole('button', { name: 'Exportar copia JSON' }).click();
  await expect(page.locator('#status')).toContainText('ejemplo sin guardar');

  await page.locator('#latin-test').fill('Unus');
  await page.getByRole('button', { name: 'Guardar texto de prueba' }).click();
  await page.locator('#latin-test').fill('Duo sin guardar');
  await page.getByRole('button', { name: 'Exportar copia JSON' }).click();
  await expect(page.locator('#status')).toContainText('modificaciones sin guardar');
});

test('avisa si el JSON no contiene ningún texto de prueba', async ({ page }) => {
  await page.goto('/?classic=1');
  await page.locator('#diagnostics').evaluate((element) => { element.open = true; });
  const validEmptyJson = await page.evaluate(async () => {
    const { createBackup } = await import('/core/backup.js');
    const { emptyCorpus } = await import('/core/model.js');
    return createBackup(emptyCorpus());
  });
  await page.locator('#backup-file').setInputFiles({
    name: 'copia-vacia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(validEmptyJson),
  });
  await expect(page.locator('#backup-preview')).toBeVisible();
  await expect(page.locator('#backup-warning')).toContainText('CERO textos');
  await expect(page.locator('#backup-latin')).toContainText('NO CONTIENE');
});

test('rechaza una copia manipulada sin borrar el texto local', async ({ page }) => {
  await page.goto('/?classic=1');
  await page.locator('#diagnostics').evaluate((element) => { element.open = true; });
  await page.locator('#latin-test').fill('Salvē, amīce');
  await page.getByRole('button', { name: 'Guardar texto de prueba' }).click();
  // La acción se ejecuta asíncronamente. Si elegimos el archivo antes de
  // completar IndexedDB, execute() descarta la inspección por estado busy.
  await expect(page.locator('#revision')).toHaveText('1');
  await expect(page.locator('#last-text')).toHaveText('Salvē, amīce');
  await expect(page.locator('#status')).toContainText('Guardado confirmado');
  const corrupt = await page.evaluate(async () => {
    const { createBackup } = await import('/core/backup.js');
    const { emptyCorpus } = await import('/core/model.js');
    const json = JSON.parse(await createBackup(emptyCorpus()));
    json.sha256 = '0'.repeat(64);
    return JSON.stringify(json);
  });
  await page.locator('#backup-file').setInputFiles({
    name: 'manipulada.json',
    mimeType: 'application/json',
    buffer: Buffer.from(corrupt),
  });
  await expect(page.locator('#status')).toContainText('SHA-256 distinto');
  await expect(page.locator('#backup-preview')).toBeHidden();
  await expect(page.locator('#restore-backup')).toBeDisabled();
  await expect(page.locator('#last-text')).toHaveText('Salvē, amīce');
  await expect(page.locator('#revision')).toHaveText('1');
});
