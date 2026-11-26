import { publishBuild } from './publish-build.mjs';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { assertVendoredSources } from './vendor-upstreams.mjs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareLibrary } from './library-integration.mjs';
import { adaptModule } from './adapt.mjs';
import { prepareSharedAcademic } from './shared-academic.mjs';
import { buildRootWorker } from './root-pwa.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pins = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
const output = join(root, 'dist');
const staging = join(root, 'dist-build');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(tool, args, cwd) {
  execFileSync(tool, args, { cwd, stdio: 'inherit' });
}

const [cuaderno, examinator] = await assertVendoredSources(root, pins);
const notebookDist = join(cuaderno, 'dist');
await rm(notebookDist, { recursive: true, force: true });
const locked = await stat(join(cuaderno, 'package-lock.json')).then(() => true, () => false);
run(npm, [
  ...(locked ? ['ci'] : ['install', '--package-lock=false']),
  '--ignore-scripts', '--no-audit', '--no-fund',
], cuaderno);
run(npm, ['run', 'build'], cuaderno);

await rm(staging, { recursive: true, force: true });
await cp(join(root, 'app'), staging, { recursive: true });
// Earlier local builds installed cache-first workers under modulos/cuaderno/.
const notebook = join(staging, 'modulos', 'cuaderno-integrado');
const exam = join(staging, 'modulos', 'examinator');
await cp(notebookDist, notebook, { recursive: true });
const pdfjs = join(notebook, 'pdfjs');
await mkdir(pdfjs, { recursive: true });
for (const file of ['pdf.mjs', 'pdf.worker.mjs']) await cp(join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', file), join(pdfjs, file));
await cp(join(root, 'node_modules', 'pdfjs-dist', 'LICENSE'), join(pdfjs, 'LICENSE'));
for (const folder of ['standard_fonts','wasm','cmaps']) await cp(join(root, 'node_modules', 'pdfjs-dist', folder), join(pdfjs, folder), { recursive: true });
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
for (const file of ['latin-context-edit.js', 'latin-context-menu.js', 'latin-context-academic.js'])
  await cp(join(root, 'scripts', file), join(shared, file));
await cp(join(root, 'scripts', 'text-usage.js'), join(shared, 'text-usage.js'));
await cp(join(root, 'scripts', 'personal-academic.js'), join(shared, 'personal-academic.js'));
await cp(join(root, 'scripts', 'latin-library.js'), join(shared, 'latin-library.js'));
await prepareLibrary(notebook, exam, shared);
await adaptModule(notebook, 'cuaderno', ['', 'examinator-cuadernos'], academicRevision);
await adaptModule(exam, 'examinator', [''], academicRevision);
await buildRootWorker(staging);

// Preserve the last working build if the final filesystem operation fails.
await publishBuild(staging, output);
console.log('Compilación integrada disponible en dist/.');
