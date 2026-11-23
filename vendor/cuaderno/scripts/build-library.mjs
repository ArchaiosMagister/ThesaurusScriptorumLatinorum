/**
 * Genera una biblioteca estática sin depender de ningún servicio en ejecución.
 * La compilación usa las fuentes incorporadas en Thesaurus.
 *
 * César y Eutropio: misma fuente incorporada en Examinator2 del docente.
 * Nepote: textos TEI de Perseus (Halm/Fleckeisen, 1886).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { DOMParser } from '@xmldom/xmldom';

const PERSEUS_COMMIT = '192fef80a2fd785a389e6584ca2315fd1f80a94e';
const examinatorData = new URL('../../examinator/js/', import.meta.url);
const nepoteSources = new URL('../library-sources/nepote/', import.meta.url);
const RAW_PERSEUS = 'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/' + PERSEUS_COMMIT + '/';
const EUTROPIO_SOURCE = 'https://www.thelatinlibrary.com/eutropius.html';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const idOf = (urn) => urn.replace(/[^a-zA-Z0-9._-]/g, '_');

async function examinadorIncludes() {
  const source = await readFile(new URL('incluidos.js', examinatorData), 'utf8');
  const context = { EXDATA: {}, window: {} };
  context.window.EXDATA = context.EXDATA;
  vm.runInNewContext(source, context, { timeout: 12000, filename: 'Examinator2-incluidos.js' });
  // Eutropio forma parte de datos.js del Examinator2 del docente.
  const originalData = await readFile(new URL('datos.js', examinatorData), 'utf8');
  // Exactamente los archivos que alimentan el Collatinus de Examinator2,
  // empaquetados en un directorio que no modifica la copia original.
  await mkdir('dist/examinator-cuadernos/collatinus',{recursive:true});
  await writeFile('dist/examinator-cuadernos/collatinus/datos.js',originalData);
  await writeFile('dist/examinator-cuadernos/collatinus/incluidos.js',source);
  vm.runInNewContext(originalData, context, { timeout: 20000, filename: 'Examinator2-datos.js' });
  const files = Object.entries(context.EXDATA).filter(([key]) => key.startsWith('/app/data/incluidos/') && key.endsWith('.json'));
  const selected = [];
  for (const [path, contents] of files) {
    const data = JSON.parse(contents);
    if (!/(césar|caesar|eutropio|eutropius)/i.test(data.author)) continue;
    const isEutropio = /eutrop/i.test(data.author);
    if (!Array.isArray(data.lines) || data.lines.length === 0) {
      throw new Error('Faltan las líneas de ' + path);
    }
    selected.push({
      urn: data.urn,
      author: isEutropio ? 'Eutropio' : 'Julio César',
      title: data.title,
      latin: data.latin,
      genre: data.genre || 'Historia',
      levels: data.levels || [],
      lines: data.lines.filter((line) => line.t && line.c).map((line) => ({
        c: String(line.c), t: clean(line.t), k: line.k || 'p',
        ...(line.s ? {s:clean(line.s)} : {}),
      })),
      source: data.source || (isEutropio ? EUTROPIO_SOURCE : ''),
      license: data.license || 'Texto de The Latin Library incorporado en Examinator2.',
      editorial: data.desc || '',
      provenance: 'Examinator2',
    });
  }
  // Catálogo EXACTO que usa Examinator2 (motor: biblioteca.json).
  // Las obras que no son locales se descargan solo al elegirlas, nunca en masa.
  const rawBibliography = Object.entries(context.EXDATA)
    .find(([key]) => key.endsWith('/biblioteca.json'))?.[1];
  if (typeof rawBibliography !== 'string') throw new Error('El catálogo de Perseus de Examinator2 no está incluido en datos.js.');
  const originalCatalogue = JSON.parse(rawBibliography);
  if (!Array.isArray(originalCatalogue.obras) || typeof originalCatalogue.raw !== 'string'
    || originalCatalogue.obras.length < 25) {
    throw new Error('Catálogo Perseus de Examinator2 incompleto.');
  }
  const remote = originalCatalogue.obras.map((item, index) => {
    if (!Array.isArray(item) || item.length < 7 || item.some((value) => typeof value !== 'string')) {
      throw new Error('Ficha bibliográfica incompatible en Examinator2: ' + index);
    }
    const [urn, path, author, title, genre, latin, description] = item;
    if (!urn || !path || !author || !title || !genre || !latin || !/^[a-zA-Z0-9._-]+$/.test(urn)
      || path.includes('..') || /^https?:/i.test(path)) {
      throw new Error('Ficha bibliográfica inválida en Examinator2: ' + index);
    }
    return {urn,path,author,title,genre,latin,description};
  });
  const baseUrl = new URL(originalCatalogue.raw);
  if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== 'raw.githubusercontent.com'
    || !baseUrl.pathname.startsWith('/PerseusDL/canonical-latinLit/')) {
    throw new Error('La URL bibliográfica del catálogo no procede de PerseusDL.');
  }
  if (new Set(remote.map(x => x.urn)).size !== remote.length) {
    throw new Error('Obras con URN duplicada en Examinator2.');
  }
  if (!selected.some((work) => work.author === 'Julio César')
    || !selected.some((work) => work.author === 'Eutropio')) {
    throw new Error('Los tres autores no están cubiertos: faltan obras de César o Eutropio en Examinator2.');
  }
  return {selected, remote, baseUrl:baseUrl.href};
}

const latinLives = [
  'Milcíades', 'Temístocles', 'Arístides', 'Pausanias', 'Cimón',
  'Lisandro', 'Alcibíades', 'Trasíbulo', 'Conón', 'Dión',
  'Ifícrates', 'Cabrias', 'Timoteo', 'Datames', 'Epaminondas',
  'Pelópidas', 'Agesilao', 'Éumenes', 'Foción', 'Timoleón',
  'De los reyes', 'Amílcar', 'Aníbal', 'Catón', 'Ático',
];

function parseLife(xml, number) {
  const errors = [];
  const dom = new DOMParser({ onError: (level, msg) => errors.push(level + ': ' + msg) }).parseFromString(xml, 'application/xml');
  if (errors.some((error) => error.startsWith('fatalError') || error.startsWith('error'))) {
    throw new Error('XML de Nepote inválido: ' + errors.join('; '));
  }
  const name = clean(dom.getElementsByTagName('title').item(0)?.textContent) || latinLives[number - 1];
  const all = [...Array.from({ length: dom.getElementsByTagName('div').length }, (_, i) => dom.getElementsByTagName('div').item(i))];
  const chapters = all.filter((node) => node?.getAttribute('subtype') === 'chapter');
  if (!chapters.length) throw new Error('La obra de Nepote '+number+' carece de capítulos.');
  const lines = [];
  for (const chapter of chapters) {
    const n = chapter.getAttribute('n') || String(lines.length + 1);
    const segs = chapter.getElementsByTagName('seg');
    if (segs.length) {
      for (let i = 0; i < segs.length; i++) {
        const seg = segs.item(i);
        const t = clean(seg.textContent);
        if (t) lines.push({ c: n + '.' + (seg.getAttribute('n') || String(i + 1)), t, k: 'p' });
      }
    } else {
      const t = clean(chapter.textContent);
      if (t) lines.push({ c: n, t, k: 'p' });
    }
  }
  if (!lines.length) throw new Error('La obra de Nepote '+number+' no contiene texto válido.');
  const code = 'abo' + String(number).padStart(3, '0');
  return {
    urn: 'phi0588.' + code + '.perseus-lat2',
    author: 'Cornelio Nepote',
    title: latinLives[number - 1] || name,
    latin: name,
    genre: 'Biografía',
    levels: ['chapter', 'section'],
    lines,
    source: RAW_PERSEUS + 'data/phi0588/' + code + '/phi0588.' + code + '.perseus-lat2.xml',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    editorial: 'Cornelius Nepos, Vitae; Albert Fleckeisen / Karl Halm, Teubner, Leipzig, 1886; Perseus Digital Library.',
    provenance: 'Perseus TEI',
  };
}

async function nepote() {
  return Promise.all(latinLives.map(async (_, index) => {
    const number = index + 1;
    const code = 'abo' + String(number).padStart(3, '0');
    const xml = await readFile(new URL(code + '.xml', nepoteSources), 'utf8');
    return parseLife(xml, number);
  }));
}

const {selected:included,remote:examinatorRemote,baseUrl:examinatorBase} = await examinadorIncludes();
const works = [...included, ...await nepote()];
if (new Set(works.map((w) => w.urn)).size !== works.length) throw new Error('Obras duplicadas en la biblioteca.');
if (!['Julio César','Eutropio','Cornelio Nepote'].every((author) => works.some((w) => w.author === author))) {
  throw new Error('No están incorporados los tres autores obligatorios.');
}
if (works.some((w) => w.lines.length < 3 || w.lines.some((line) => !line.c || !line.t))) {
  throw new Error('Hay obras incompletas o con referencias vacías.');
}

await mkdir('dist/library/works', { recursive: true });
const catalogue = works.map(({ lines, ...work }) => {
  const file = 'works/' + idOf(work.urn) + '.json';
  return {
    urn: work.urn, author: work.author, title: work.title, latin: work.latin,
    genre: work.genre, levels: work.levels, source: work.source,
    license: work.license, editorial: work.editorial, provenance: work.provenance,
    count: lines.length, file,
  };
});
for (const work of works) {
  const filename = 'dist/library/works/' + idOf(work.urn) + '.json';
  await writeFile(filename, JSON.stringify(work));
}
await writeFile('dist/library/catalog.json', JSON.stringify({ version: 1, works: catalogue }));
await writeFile('dist/library/examinator-catalog.json',JSON.stringify({
  version:1, source:'Examinator2 / Perseus Digital Library',baseUrl:examinatorBase,
  entries:examinatorRemote,
}));
console.log('Biblioteca offline: ' + works.length + ' obras, ' + works.reduce((n,w)=>n+w.lines.length,0) + ' pasajes: '
  + [...new Set(works.map(w=>w.author))].join(', '));
