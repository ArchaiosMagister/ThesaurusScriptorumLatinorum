import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

export async function prepareLibrary(notebook, exam, shared) {
  const folder = join(notebook, 'library');
  const motor = await readFile(join(exam, 'js', 'motor.js'), 'utf8');
  const start = 'defs["core/tei.js"] = function (module, exports, require) {';
  const end = 'module.exports = { parseXml, convertTei };';
  const begin = motor.indexOf(start);
  const finish = motor.indexOf(end, begin);
  if (begin < 0 || finish < 0) throw new Error('No se encontró el conversor TEI de Examinator.');
  await writeFile(join(shared, 'perseus-tei.js'), motor.slice(begin + start.length, finish) + '\nexport { convertTei };\n');
  const catalogue = JSON.parse(await readFile(join(folder, 'catalog.json'), 'utf8'));
  const data = { EXDATA: {} };
  // The pinned upstream script only assigns bundled JSON to EXDATA.
  runInNewContext(await readFile(join(exam, 'js', 'incluidos.js'), 'utf8'), data, { timeout: 1000 });
  const existing = new Set(catalogue.works.map(work => work.urn));
  for (const encoded of Object.values(data.EXDATA)) {
    const work = JSON.parse(encoded);
    if (existing.has(work.urn)) continue;
    const { urn, author, title, latin, genre, levels, desc } = work;
    const file = 'works/' + urn + '.json';
    catalogue.works.push({ urn, author, title, latin, genre, levels, editorial: desc, file });
    await writeFile(join(folder, file), encoded);
    existing.add(urn);
  }
  await writeFile(join(folder, 'catalog.json'), JSON.stringify(catalogue));
}

export function integrateNotebookLibrary(source) {
  return "import { latinLibrary } from '../../shared/latin-library.js';\n" + source
    .replace(/^import .*from '\.\.\/(?:storage\/downloaded-works|core\/examinator-library)\.js';\n/gm, '')
    .replace(/^const (?:downloads|works|ownCache) = .*;\n/gm, '')
    .replace(/let catalogue;[\s\S]*?(?=const el =)/, '')
    .replace(/function item\(urn\) \{[\s\S]*?(?=function citation\()/, '')
    .replace(/host\.api = \{[\s\S]*?\n\};/, 'host.api = { web: true, ...latinLibrary };')
    .replace(/        const \[local, full, downloaded\][\s\S]*?(?=        \/\/ Inicializar el banco)/, '');
}

export function groupLibraryAuthors(source, useSharedLibrary = false) {
  if (useSharedLibrary) {
    source = source.replace('  const P = M.Propose;', `  const P = M.Propose;
  const sharedLibrary = () => import('../../shared/latin-library.js').then(module => module.latinLibrary);
  const call = async (...args) => (await sharedLibrary()).call(...args);
  const on = async (...args) => (await sharedLibrary()).on(...args);`)
      .replaceAll('M.call(', 'call(')
      .replaceAll("window.api.on('dl-", "void on('dl-");
  }
  const result = source.replace('    box.innerHTML = items.map((it) =>', `    const openAuthors = new Set(Array.from(box.querySelectorAll('.atl-library-author[open]'), group => group.dataset.author));
    const authors = new Map();
    for (const item of items) {
      if (!authors.has(item.author)) authors.set(item.author, []);
      authors.get(item.author).push(item);
    }
    const groups = Array.from(authors, ([author, works]) => {
      const opened = f || openAuthors.has(author) || works.some(work => work.urn === cur?.urn);
      return \`<details class="atl-library-author" data-author="\${esc(author)}" \${opened ? 'open' : ''}>
        <summary>\${esc(author)} <span class="small muted">(\${works.length})</span></summary>
        \${works.map((it) =>`)
    .replace('<b>${esc(it.author)}</b> · ${esc(it.title)}', '<b>${esc(it.title)}</b>')
    .replace("</div>`).join('') || '<div class=\"muted small\"", `</div>\`).join('')}</details>\`;
    });
    box.innerHTML = groups.join('') || '<div class="muted small"`);
  if (!result.includes("box.innerHTML = groups.join('')")) throw new Error('Revisar el listado de autores de la biblioteca.');
  return result;
}

export const libraryStyles = `
#lib .atl-library-author { border-bottom: 1px solid var(--rule); }
#lib .atl-library-author > summary { cursor: pointer; padding: .65rem .7rem; font-weight: 600; }
#lib .atl-library-author .lrow { padding-inline-start: 1.2rem; }
`;
