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

export async function buildRootWorker(root) {
  const files = await list(root, 'modulos/');
  const shell = ['./', './index.html', './manifest.webmanifest', './navigation.js', './styles.css', './pwa.js',
    './backup-ui.js', './backup-store.js', './dropbox-sync.js', './dropbox-plan.js'];
  const template = await readFile(new URL('./root-worker.js', import.meta.url), 'utf8');
  const hash = createHash('sha256').update(template);
  for (const path of [...shell.slice(1), ...files]) hash.update(path).update(await readFile(join(root, path)));
  const revision = hash.digest('hex').slice(0, 20);
  await writeFile(join(root, 'sw.js'), template
    .replace('ATL_SHELL', JSON.stringify(shell))
    .replace('ATL_FILES', JSON.stringify(files))
    .replace('ATL_REVISION', JSON.stringify(revision)));
}
