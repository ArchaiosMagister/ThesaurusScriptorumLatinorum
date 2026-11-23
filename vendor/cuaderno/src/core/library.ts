/** Contratos del catálogo literario de solo lectura incluido en la webapp. */
export interface LibraryLine {
  c: string;
  t: string;
  k: string;
  /** Hablante indicado por la edición TEI (como en Examinator2). */
  s?: string;
}
export interface LibraryWork {
  urn: string;
  author: string;
  title: string;
  latin: string;
  genre: string;
  levels: string[];
  lines: LibraryLine[];
  source: string;
  license: string;
  editorial: string;
  provenance: string;
}
export type LibraryEntry = Omit<LibraryWork, 'lines'> & {
  file: string;
  count: number;
};

export function foldLatin(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae').replace(/œ/g, 'oe')
    .toLocaleLowerCase('es').trim();
}

export function searchWorks(works: readonly LibraryEntry[], query: string, author = 'all'): LibraryEntry[] {
  const term = foldLatin(query);
  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  return works.filter((work) =>
    (author === 'all' || work.author === author)
    && (!term || foldLatin([work.author, work.title, work.latin, work.genre, work.urn].join(' ')).includes(term))
  ).sort((a,b) => collator.compare(a.author,b.author) || collator.compare(a.title,b.title));
}

/** Búsqueda por referencia: 1.1, 1.1.4, etc. */
export function findCitation(work: LibraryWork, query: string): number {
  const term = query.trim().replace(/[,: ]+/g,'.').replace(/^\.+|\.+$/g,'');
  if (!term) return -1;
  const exact = work.lines.findIndex((line) => line.c === term);
  if (exact >= 0) return exact;
  return work.lines.findIndex((line) => line.c.startsWith(term + '.'));
}

export function buildFragment(work: LibraryWork, a: number, b: number): { latin: string; reference: string; wordCount: number } {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0
    || a >= work.lines.length || b >= work.lines.length) {
    throw new Error('La selección del fragmento está fuera de la obra.');
  }
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const selected = work.lines.slice(start, end + 1);
  if (selected.length > 120) throw new Error('Selecciona como máximo 120 pasajes consecutivos.');
  const first = selected[0]!;
  const last = selected[selected.length - 1]!;
  const latin = selected.map((line) => line.t.trim()).filter(Boolean).join('\n');
  const reference = first.c === last.c ? first.c : first.c + '–' + last.c;
  return { latin, reference, wordCount: latin ? latin.split(/\s+/u).length : 0 };
}
