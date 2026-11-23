import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const modules = ['cuaderno', 'examinator'];

async function inventory(directory, base = directory) {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && ['.git', 'node_modules', 'dist', '.test-dist'].includes(entry.name)) continue;
    if (entry.isDirectory()) result.push(...await inventory(path, base));
    else if (entry.isFile()) {
      const content = await readFile(path);
      result.push({
        path: relative(base, path).split(sep).join('/'),
        sha256: createHash('sha256').update(content).digest('hex'),
      });
    } else throw new Error('Entrada no regular en el motor incorporado: ' + path);
  }
  return result;
}

/** La compilación corriente nunca necesita abrir ni clonar los repositorios antiguos. */
export async function assertVendoredSources(root = projectRoot, pins) {
  const pinned = pins ?? JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(root, 'vendor', 'manifest.json'), 'utf8'));
  } catch {
    throw new Error('Faltan los motores incorporados. Ejecuta npm run vendor antes de retirar los repositorios originales.');
  }
  const directories = [];
  for (const name of modules) {
    const original = pinned[name];
    const snapshot = manifest[name];
    if (!snapshot || snapshot.commit !== original.commit || snapshot.repository !== original.repository)
      throw new Error('La instantánea de ' + name + ' no corresponde a upstream.json.');
    const directory = join(root, 'vendor', name);
    const actual = await inventory(directory);
    if (JSON.stringify(actual) !== JSON.stringify(snapshot.files))
      throw new Error('La instantánea de ' + name + ' está incompleta o modificada.');
    directories.push(directory);
  }
  return directories;
}

/** Operación explícita de mantenimiento; NO se ejecuta durante build, test o Pages. */
export async function vendorPinnedSources(root = projectRoot) {
  const pins = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
  const vendor = join(root, 'vendor');
  await mkdir(vendor, { recursive: true });
  const manifest = { format: 1 };
  for (const name of modules) {
    const { repository, commit } = pins[name];
    if (!/^[0-9a-f]{40}$/u.test(commit) ||
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository))
      throw new Error('Revisión o repositorio de origen no válido: ' + name);
    const work = await mkdtemp(join(tmpdir(), 'atl-vendor-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: work, stdio: 'inherit' });
      execFileSync('git', ['fetch', '-q', '--no-tags', '--depth=1',
        'https://github.com/' + repository + '.git', commit], { cwd: work, stdio: 'inherit' });
      execFileSync('git', ['checkout', '-q', '--detach', commit], { cwd: work, stdio: 'inherit' });
      const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: work, encoding: 'utf8' }).trim();
      if (actual !== commit) throw new Error('Revisión inesperada de ' + name);
      const destination = join(vendor, name);
      await rm(destination, { recursive: true, force: true });
      await cp(work, destination, {
        recursive: true,
        filter: path => {
          const parts = relative(work, path).split(sep);
          return !parts.some(part => ['.git', 'node_modules', 'dist', '.test-dist'].includes(part));
        },
      });
      manifest[name] = { repository, commit, files: await inventory(destination) };
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(vendor, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await assertVendoredSources(root, pins);
  console.log('Motores y recursos integrados en vendor/ y verificados sin depender de sus repositorios.');
}

/**
 * Permite mantener los motores ya incorporados aunque sus antiguos repositorios
 * se hayan archivado o eliminado. Solo actualiza huellas locales, nunca consulta la red.
 */
export async function sealVendoredSources(root = projectRoot) {
  const pins = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
  const vendor = join(root, 'vendor');
  const manifest = { format: 1 };
  for (const name of modules) {
    const files = await inventory(join(vendor, name));
    if (!files.length) throw new Error('Motor local ausente: ' + name);
    manifest[name] = { ...pins[name], files };
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(vendor, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await assertVendoredSources(root, pins);
  console.log('Huellas locales renovadas. Se puede compilar sin consultar los repositorios antiguos.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--seal-local')) await sealVendoredSources();
  else await vendorPinnedSources();
}
