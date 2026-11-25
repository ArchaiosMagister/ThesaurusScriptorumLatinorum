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

test('Dropbox omite la descarga cuando coinciden las revisiones y migra el diario antiguo', async ({page}) => {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    const prefix = 'atl-v1:dropbox:';
    localStorage.setItem(prefix + 'connection', JSON.stringify({
      id: 'fast-test', refresh: 'test', account: 'account', appKey: 'key'
    }));
    localStorage.setItem(prefix + 'auto', 'false');
    window.cloud = { metadata: 0, downloads: 0, revision: 'rev1' };
    const original = window.fetch.bind(window);
    window.fetch = async (resource, options) => {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (url === 'https://api.dropboxapi.com/oauth2/token')
        return new Response(JSON.stringify({access_token: 'test', expires_in: 3600}));
      if (url.endsWith('/files/get_metadata')) {
        window.cloud.metadata++;
        return new Response(JSON.stringify({'.tag': 'file', rev: window.cloud.revision}));
      }
      if (url.endsWith('/files/download')) {
        window.cloud.downloads++;
        return new Response(JSON.stringify(window.cloud.envelope), {
          headers: {'Dropbox-API-Result': JSON.stringify({rev: window.cloud.revision})}
        });
      }
      return original(resource, options);
    };
  });
  await page.goto('/ThesaurusScriptorumLatinorum/');
  await expect(page.frameLocator('#panel-cuaderno iframe').getByRole('region', {name: 'Banco de textos propios'})).toBeVisible();
  await page.evaluate(async () => {
    const {readSyncData, syncFingerprint} = await import(new URL('./backup-store.js', location.href));
    const {data} = await readSyncData();
    const hash = await syncFingerprint(data);
    window.cloud.envelope = {format: 'thesaurus-dropbox-v1', hash, data};
    localStorage.setItem('atl-v1:dropbox:checkpoint:key:account', JSON.stringify({revision: 'rev1', hash}));
  });
  const dialog = await settings(page);
  await dialog.locator('#dropbox-auto').check();
  await dialog.getByRole('button', {name: 'Cerrar', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.cloud.metadata), {timeout: 20000}).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.cloud.downloads)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('atl-v1:dropbox:checkpoint:key:account'))).toBeNull();
  const migrated = await page.evaluate(async () => {
    const {readSyncState} = await import(new URL('./recovery-history.js', location.href));
    return readSyncState('checkpoint:key:account');
  });
  expect(migrated.revision).toBe('rev1');
  await page.evaluate(() => { window.cloud.revision = 'rev2'; window.dispatchEvent(new Event('online')); });
  await expect.poll(() => page.evaluate(() => window.cloud.downloads), {timeout: 20000}).toBeGreaterThan(0);
});
