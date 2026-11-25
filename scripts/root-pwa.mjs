import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function list(root, prefix) {
  const result = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await list(root, path + '/'));
    else if (entry.isFile() && !/(^|\/)(?:sw|service-worker)\.js$/.test(path)) result.push('./' + path);
  }
  return result.sort();
}

/**
 * Each generated asset receives its own digest, so a ready offline pack can be
 * upgraded without downloading unchanged academic banks, libraries and fonts.
 */
export async function buildRootWorker(root) {
  const files = await list(root, 'modulos/');
  const shell = ['./', './index.html', './manifest.webmanifest', './navigation.js', './styles.css', './ui-tokens.css', './pwa.js',
    './backup-ui.js', './recovery-history.js', './backup-store.js', './dropbox-sync.js', './dropbox-plan.js', './curriculum-templates.js', './partial-backup.js'];
  const template = await readFile(new URL('./root-worker.js', import.meta.url), 'utf8');
  const digests = {};
  for (const path of [...shell.slice(1), ...files]) {
    const bytes = await readFile(join(root, path));
    digests[path] = createHash('sha256').update(bytes).digest('hex');
  }
  const revision = createHash('sha256').update(template).update(JSON.stringify(digests)).digest('hex').slice(0, 20);
  await writeFile(join(root, 'sw.js'), template
    .replace('ATL_SHELL', JSON.stringify(shell))
    .replace('ATL_FILES', JSON.stringify(files))
    .replace('ATL_DIGESTS', JSON.stringify(digests))
    .replace('ATL_REVISION', JSON.stringify(revision)));
}
