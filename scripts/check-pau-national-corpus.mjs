import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractNationalPdfPages } from './pau-national-pdf.js';
import { recognizeNationalExam } from './pau-national-profiles.js';

const args = process.argv.slice(2);
const [folder, inventory, output, split = 'development'] = args;
if (!folder || (args.length > 1 && (!inventory || !output)))
  throw Error('Uso: carpeta [inventario.json carpeta-de-resultados [development|prior-development|validation|holdout]]');
const require = createRequire(import.meta.url);
const assets = dirname(require.resolve('pdfjs-dist/package.json'));
const digest = data => createHash('sha256').update(data).digest('hex');

async function inspect(bytes) {
  try {
    const extraction = await extractNationalPdfPages(new Blob([bytes]), {pdfjs, assetRoot: assets});
    return {textPages: extraction.pages.filter(rows => rows.length).length, pages: extraction.pages.length,
      ...recognizeNationalExam(extraction)};
  } catch (error) {
    return {error: error.message, records: []};
  }
}

if (!inventory) {
  const results = {};
  for (const name of (await readdir(folder)).filter(name => /\.pdf$/iu.test(name)).sort())
    results[name] = await inspect(await readFile(join(folder, name)));
  console.log(JSON.stringify(results, null, 2));
} else {
  if (!['development', 'prior-development', 'validation', 'holdout'].includes(split))
    throw Error('Conjunto desconocido.');
  const manifest = JSON.parse(await readFile(inventory, 'utf8'));
  if (manifest.schema !== 1) throw Error('Versión de inventario desconocida.');
  const scripts = new URL('./', import.meta.url);
  const names = (await readdir(scripts)).filter(name => /^pau-national-.*\.js$/u.test(name)).sort();
  const version = createHash('sha256').update(process.version).update(pdfjs.version);
  for (const name of ['check-pau-national-corpus.mjs', ...names])
    version.update(name).update(digest(await readFile(new URL(name, scripts))));
  const revision = version.digest('hex');
  const cache = join(output, revision);
  await mkdir(cache, {recursive: true});
  const results = [];
  const root = resolve(folder);
  for (const row of manifest.entries.filter(row => row.split === split)) {
    const path = resolve(root, row.path);
    if (!path.startsWith(root + sep)) throw Error('Ruta fuera de la carpeta local.');
    const bytes = await readFile(path);
    if (digest(bytes) !== row.sha256) throw Error('El archivo local difiere del inventario: ' + row.path);
    const checkpoint = join(cache, row.sha256 + '.json');
    let result;
    try {
      result = JSON.parse(await readFile(checkpoint, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      result = await inspect(bytes);
      const temporary = checkpoint + '.' + process.pid + '.tmp';
      await writeFile(temporary, JSON.stringify(result));
      await rename(temporary, checkpoint);
    }
    results.push({path: row.path, sha256: row.sha256, region: row.region, year: row.year,
      session: row.session, quality: row.quality, type: row.type, family: row.family,
      pages: row.pages, ...result, checkpoint});
  }
  const summary = {};
  for (const result of results) {
    const stats = summary[result.region] ??= {documents: 0, extracted: 0, proposals: 0,
      withoutProposal: 0, routedToValencia: 0, extractionErrors: 0, transcriptReview: 0};
    stats.documents++;
    if (result.textPages) stats.extracted++;
    if (result.error) stats.extractionErrors++;
    if (result.valencian) stats.routedToValencia++;
    else if (!result.records.length) stats.withoutProposal++;
    stats.proposals += result.records.length;
    stats.transcriptReview += result.records.filter(record => record.requiresTranscriptReview).length;
  }
  await writeFile(join(output, split + '-' + revision.slice(0, 12) + '.json'), JSON.stringify({
    revision, inventory: manifest.zip_sha256, split, summary, results
  }, null, 2));
  console.log(JSON.stringify({revision, split, summary}, null, 2));
}
