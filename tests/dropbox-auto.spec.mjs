import { expect, test } from './isolated-bank.mjs';

async function mockDropbox(page, enabled) {
  await page.addInitScript(enabled => {
    if (window.top !== window) return;
    const prefix = 'atl-v1:dropbox:';
    if (!localStorage.getItem(prefix + 'connection')) {
      localStorage.setItem(prefix + 'connection', JSON.stringify({
        id: 'test-connection', refresh: 'fake-token', account: 'test-account', appKey: 'testkey'
      }));
      if (enabled !== null) localStorage.setItem(prefix + 'auto', JSON.stringify(enabled));
    }
    window.dropboxAttempts = 0;
    const original = window.fetch.bind(window);
    window.fetch = (resource, options) => {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (url === 'https://api.dropboxapi.com/oauth2/token') {
        window.dropboxAttempts++;
        return Promise.resolve(new Response('{}', { status: 503 }));
      }
      return original(resource, options);
    };
  }, enabled);
  await page.goto('/ThesaurusScriptorumLatinorum/');
  await expect(page.frameLocator('#panel-cuaderno iframe').getByRole('region', { name: 'Banco de textos propios' })).toBeVisible();
}
async function settings(page) {
  await page.locator('#app-backup').click();
  await page.locator('#app-dropbox').click();
  return page.locator('#dropbox-dialog');
}
const attempts = page => page.evaluate(() => window.dropboxAttempts);

test('Dropbox automático se inicia sin pulsar sincronizar y se puede desactivar de forma persistente', async ({page}) => {
  await mockDropbox(page, null);
  await expect.poll(() => attempts(page), { timeout: 20000 }).toBeGreaterThan(0);
  await expect(page.locator('#app-dropbox-sync')).toBeEnabled();
  const dialog = await settings(page);
  await expect(dialog.locator('#dropbox-auto')).toBeChecked();
  await dialog.locator('#dropbox-auto').uncheck();
  await dialog.getByRole('button', {name: 'Cerrar', exact: true}).click();
  await page.reload();
  const reopened = await settings(page);
  await expect(reopened.locator('#dropbox-auto')).not.toBeChecked();
  await reopened.getByRole('button', {name: 'Cerrar', exact: true}).click();
  await page.waitForTimeout(3500);
  expect(await attempts(page)).toBe(0);
  await page.locator('#app-dropbox-sync').click();
  await expect.poll(() => attempts(page)).toBeGreaterThan(0);
});

test('Dropbox automático espera hasta cerrar el formulario del banco', async ({page}) => {
  await mockDropbox(page, false);
  const dialog = await settings(page);
  await dialog.locator('#dropbox-auto').check();
  await dialog.getByRole('button', {name: 'Cerrar', exact: true}).click();
  const frame = page.frameLocator('#panel-cuaderno iframe');
  await frame.getByRole('button', {name: 'Pegar en el banco'}).click();
  const modal = frame.locator('.modal').last();
  await expect(modal.getByRole('textbox', {name: 'Título', exact: true})).toBeVisible();
  await page.waitForTimeout(4000);
  expect(await attempts(page)).toBe(0);
  await modal.getByRole('button', {name: 'Cancelar', exact: true}).click();
  await expect.poll(() => attempts(page), {timeout: 20000}).toBeGreaterThan(0);
});
