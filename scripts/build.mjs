import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareLibrary } from './library-integration.mjs';
import { adaptModule } from './adapt.mjs';
import { prepareSharedAcademic } from './shared-academic.mjs';
import { buildRootWorker } from './root-pwa.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pins = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
const sources = join(root, '.upstream');
const output = join(root, 'dist');
const staging = join(root, 'dist-build');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(tool, args, cwd) {
  execFileSync(tool, args, { cwd, stdio: 'inherit' });
}

function gitText(directory, ...args) {
  return execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
}

async function checkout(name) {
  const { repository, commit } = pins[name];
  const directory = join(sources, name);
  const present = await stat(join(directory, '.git')).then(() => true, () => false);
  if (!present) {
    await mkdir(directory, { recursive: true });
    run('git', ['init'], directory);
  }
  const head = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], {
    cwd: directory, encoding: 'utf8'
  });
  if (head.error) throw head.error;
  if (head.status !== 0 && head.status !== 1) throw new Error('No se pudo leer HEAD en ' + directory);
  const actual = head.stdout.trim();
  if (actual === commit && !gitText(directory, 'status', '--porcelain', '--untracked-files=no')) {
    return directory;
  }
  if (actual && gitText(directory, 'status', '--porcelain', '--untracked-files=no')) {
    throw new Error('La copia de origen tiene cambios locales: ' + directory);
  }
  run('git', ['fetch', '--no-tags', '--depth=1', 'https://github.com/' + repository + '.git', commit], directory);
  run('git', ['checkout', '--detach', commit], directory);
  if (gitText(directory, 'rev-parse', 'HEAD') !== commit) throw new Error('Revisión inesperada de ' + name);
  return directory;
}

await mkdir(sources, { recursive: true });
const [cuaderno, examinator] = await Promise.all([checkout('cuaderno'), checkout('examinator')]);
const notebookDist = join(cuaderno, 'dist');
await rm(notebookDist, { recursive: true, force: true });
const locked = await stat(join(cuaderno, 'package-lock.json')).then(() => true, () => false);
run(npm, [locked ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund'], cuaderno);
run(npm, ['run', 'build'], cuaderno);

await rm(staging, { recursive: true, force: true });
await cp(join(root, 'app'), staging, { recursive: true });
// Earlier local builds installed cache-first workers under modulos/cuaderno/.
const notebook = join(staging, 'modulos', 'cuaderno-integrado');
const exam = join(staging, 'modulos', 'examinator');
await cp(notebookDist, notebook, { recursive: true });
await mkdir(exam, { recursive: true });

const examFiles = ['index.html', 'styles.css', 'fonts.css', 'icon.png', 'icon-192.png', 'icono.svg',
  'manifest.webmanifest', 'sw.js', 'FUENTES.md', 'js', 'lib', 'fonts'];
for (const entry of examFiles) {
  await cp(join(examinator, entry), join(exam, entry), { recursive: true });
}

const fontAssets = join(notebook, 'examinator2-original');
await mkdir(fontAssets);
for (const entry of ['fonts.css', 'icon.png', 'fonts']) {
  await cp(join(examinator, entry), join(fontAssets, entry), { recursive: true });
}

const academicRevision = await prepareSharedAcademic(notebook, exam, join(staging, 'modulos', 'academic'));
const shared = join(staging, 'modulos', 'shared');
await mkdir(shared, { recursive: true });
await cp(join(root, 'scripts', 'text-usage.js'), join(shared, 'text-usage.js'));
await cp(join(root, 'scripts', 'personal-academic.js'), join(shared, 'personal-academic.js'));
await cp(join(root, 'scripts', 'latin-library.js'), join(shared, 'latin-library.js'));
await prepareLibrary(notebook, exam, shared);
await adaptModule(notebook, 'cuaderno', ['', 'examinator-cuadernos'], academicRevision);
await adaptModule(exam, 'examinator', [''], academicRevision);
await buildRootWorker(staging);

await rm(output, { force: true, recursive: true });
await rename(staging, output);
console.log('Compilación integrada disponible en dist/.');
