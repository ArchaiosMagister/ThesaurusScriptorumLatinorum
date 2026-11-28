import { prepareNationalPassage, nationalMorphologyMarks } from './pau-national-parser.js';

const value = row => row.text.trim();
const onlyDigits = /^\d+(?:\s+\d+)*$/u;
const lines = rows => rows.filter(row => !onlyDigits.test(value(row))).map(value);
const text = rows => lines(rows).join('\n');
const index = (rows, pattern, from = 0) => rows.findIndex((row, position) => position >= from && pattern.test(value(row)));
function range(rows, start, end) {
  const first = index(rows, start), last = index(rows, end, first + 1);
  if (first < 0 || last <= first + 1) throw Error('Confirma los límites del pasaje en el PDF.');
  return rows.slice(first + 1, last);
}
function record(rows, { option = '', notes = '', author = '', work = '', reference = '', forms = [], warnings = [] } = {}) {
  const latin = text(rows);
  if (!latin || latin.match(/[\p{L}]+/gu)?.length < 8) throw Error('El pasaje extraído parece incompleto.');
  const item = prepareNationalPassage({ latin, author, work, reference, notes });
  const marks = nationalMorphologyMarks(latin, forms);
  item.doc.underlines = marks.underlines;
  item.doc.warnings.push(...marks.warnings, ...warnings);
  return { ...item, option, requiresTranscriptReview: true };
}
function andalucia(rows) {
  const heads = rows.flatMap((row, i) => /^OPCI[ÓO]N [AB]$/iu.test(value(row)) ? [i] : []);
  if (heads.map(i => value(rows[i]).at(-1).toUpperCase()).join('') !== 'AB')
    throw Error('Confirma las opciones andaluzas.');
  const options = [rows.slice(heads[0] + 1, heads[1]), rows.slice(heads[1] + 1)];
  return options.map((body, i) => {
    const heading = value(body[0]).match(/^1\. Traduzca el siguiente texto de ([^,]+), (.+?), ([\d, –-]+)\s*\(valoraci[oó]n:/iu);
    const end = index(body, /^2\. Analice desde el punto de vista morfosint[aá]ctico/iu);
    if (!heading || end < 3) throw Error('Confirma el pasaje andaluz.');
    const content = body.slice(1, end).filter(row => !onlyDigits.test(value(row)));
    const firstLatin = content.findIndex(row => !row.runs?.[0]?.italic);
    if (firstLatin < 1 || !content[firstLatin].runs?.length)
      throw Error('Confirma dónde empieza el texto andaluz.');
    const font = content[firstLatin].runs[0].fontName;
    const boundary = content.findIndex((row, j) => j > firstLatin &&
      (/^(?:\d+[.)]?\s+|\*\s*)/u.test(value(row)) || row.runs?.[0]?.fontName !== font));
    const latin = content.slice(firstLatin, boundary < 0 ? undefined : boundary);
    const item = record(latin, { option: i ? 'B' : 'A', notes: text(content.slice(0, firstLatin)),
      author: heading[1], work: heading[2], reference: heading[3].trim(),
      warnings: ['Coteja las llamadas de nota y el alcance del análisis morfosintáctico.'] });
    if (boundary >= 0) item.doc.warnings.push('Consulta en el PDF las notas de este pasaje.');
    return item;
  });
}
function baleares(pages) {
  const optionPages = pages.filter(page => page.some(row => /^OPCI[ÓO] [AB]$/u.test(value(row))));
  if (optionPages.length !== 2) throw Error('Confirma las dos páginas de Baleares.');
  return optionPages.map((page, i) => {
    const start = index(page, /^OPCI[ÓO] [AB]$/u), notes = index(page, /^Notes:$/u, start + 1);
    const source = value(page[notes - 1]).match(/^([^,]+),\s*(.+?)\s+(\d+,\s*\d+)$/u);
    if (notes < start + 4 || !source) throw Error('Confirma la referencia del texto balear.');
    const body = page.slice(start + 1, notes - 1);
    const latinAt = body.findIndex(row => /^(?:Libo, profectus|Ac primum agros)\b/u.test(value(row)));
    if (latinAt < 1) throw Error('Confirma dónde empieza el latín balear.');
    return record(body.slice(latinAt), { option: i ? 'B' : 'A', notes: text(body.slice(0, latinAt)),
      author: source[1], work: source[2], reference: source[3],
      warnings: ['Revisa las palabras subrayadas en el original.'] });
  });
}
function cantabria(pages) {
  const rows = pages.flat();
  const body = range(rows, /^PARTE 1\. \[8 PUNTOS\].*dos textos latinos/iu,
    /^1\. (?:\[[^\]]+\] )?Anali[cz][ae] sint[aá]cticamente/iu);
  const heads = body.flatMap((row, i) => /^Texto [12]$/iu.test(value(row)) ? [i] : []);
  if (heads.map(i => value(body[i]).at(-1)).join('') !== '12')
    throw Error('Confirma las dos opciones cántabras.');
  return heads.map((head, i) => {
    const part = body.slice(head + 1, heads[i + 1]).filter(row => !onlyDigits.test(value(row)));
    const sourceAt = part.findIndex(row => /^\([^,]+,\s*[^()]+[0-9][^()]*\)$/u.test(value(row)));
    if (sourceAt < 2) throw Error('Confirma la cita y los límites del texto cántabro.');
    const [author, ...citation] = value(part[sourceAt]).slice(1, -1).split(/,\s*/u);
    const item = record(part.slice(1, sourceAt), {
      option: String(i + 1), notes: value(part[0]), author, reference: citation.join(', '),
      warnings: ['Coteja las marcas de morfología, las notas y los cortes de línea.']
    });
    item.doc.vocabulary = part.slice(sourceAt + 1).flatMap(row => {
      const entry = value(row).match(/^(?:\d+[. ]+)?([\p{L}\p{M}][^:]{0,70}):\s*(.+)$/u);
      return entry && row.runs?.some(run => run.italic) ? [{headword: entry[1], meaning: entry[2]}] : [];
    });
    return item;
  });
}
function castillaLeon(pages) {
  const selected = pages.slice(0, 2).map(page => {
    const start = index(page, /^OPCI[ÓO]N [AB]$/u), end = index(page, /^Cuestiones:$/u, start + 1);
    if (start < 0 || end < start + 4) throw Error('Confirma los dos textos de Castilla y León.');
    const source = value(page[start + 1]).split(',');
    const body = page.slice(start + 3, end).filter(row => value(row) !== '*');
    const note = body.findIndex(row => /^Imperativos\.$/u.test(value(row)));
    return record(note < 0 ? body : body.slice(0, note), { option: value(page[start]).slice(-1),
      notes: value(page[start + 2]), author: source[0], work: source.slice(1).join(',').trim(),
      warnings: ['Coteja el texto subrayado y las llamadas de nota.'] });
  });
  if (selected.length !== 2 || selected[0].option !== 'A' || selected[1].option !== 'B') throw Error('Confirma las opciones de Castilla y León.');
  return selected;
}
function castillaLaMancha(rows) {
  const block = range(rows, /^BLOQUE A\./u, /^BLOQUE B\./u);
  const heads = block.flatMap((row, i) => /^OPCI[ÓO]N [12]$/u.test(value(row)) ? [i] : []);
  if (heads.length !== 2) throw Error('Confirma las opciones manchegas.');
  const choices = [block.slice(heads[0] + 1, heads[1]), block.slice(heads[1] + 1)];
  return choices.map((body, i) => {
    const after = body.findIndex(row => /^(?:Caesar |Mittitur )/u.test(value(row)));
    const end = body.findIndex((row, j) => j >= after && /\((?:Caesar|Ovidio)[^()]*\)$/u.test(value(row)));
    if (after < 1 || end < after) throw Error('Confirma el final del texto de Castilla-La Mancha.');
    const source = value(body[end]).match(/\((Caesar|Ovidio),?\s*([^()]*)\)$/u);
    const passage = body.slice(after, end + 1).map((row, j) => ({ ...row,
      text: value(row).replace(/\s*\((?:Caesar|Ovidio)[^()]*\)$/u, '').replace(/\s*\([\d,]+\)/gu, '').trim() }));
    return record(passage, { option: String(i + 1), notes: text(body.slice(0, after)),
      author: source?.[1] ?? '', reference: source?.[2] ?? '',
      warnings: ['Coteja las puntuaciones intercaladas y las palabras en negrita.'] });
  });
}
function madrid(pages) {
  const exam = pages.slice(0, 2).flat();
  const first = index(exam, /^OPCI[ÓO]N A$/u), second = index(exam, /^OPCI[ÓO]N B$/u, first + 1);
  if (first < 0 || second < 0) throw Error('Confirma las dos opciones madrileñas.');
  return [exam.slice(first + 1, second), exam.slice(second + 1)].map((body, i) => {
    const source = index(body, /^\([^()]+\d[^()]*\)$/u);
    if (source < 3) throw Error('Confirma la cita y el pasaje madrileño.');
    const morph = body.slice(source + 1).map(value).join(' ').match(/Analice morfol[oó]gicamente las palabras ([\p{L}\p{M}, ]+), indicando/iu);
    const forms = morph?.[1].split(/,\s*|\s+y\s+/u).map(s => s.trim()) ?? [];
    return record(body.slice(1, source), { option: i ? 'B' : 'A', notes: value(body[0]),
      reference: value(body[source]).slice(1, -1), forms,
      warnings: ['Coteja las llamadas de nota en el pasaje.'] });
  });
}
function rioja(pages) {
  const page = pages[0];
  const end = index(page, /^11\. Responda a las siguientes preguntas/u);
  const first = index(page, /^A\)$/u), second = index(page, /^B\)$/u, first + 1);
  if (first < 0 || second < 0 || end < second) throw Error('Confirma las opciones riojanas.');
  return [page.slice(first + 1, second), page.slice(second + 1, end)].map((body, i) => {
    const source = value(body.at(-1)).match(/^\(([^,]+),\s*([^\d]+)\s+(\d[^()]*)\)$/u);
    if (!source || body.length < 3) throw Error('Confirma la referencia riojana.');
    return record(body.slice(1, -1), { option: i ? 'B' : 'A', notes: value(body[0]),
      author: source[1], work: source[2].trim(), reference: source[3],
      warnings: ['Coteja posibles errores de OCR con el PDF original.'] });
  });
}

function canarias(pages) {
  const optionPages = pages.filter(page => page.some(row => /^OPCI[ÓO]N [AB]$/u.test(value(row))));
  if (optionPages.length !== 2) throw Error('Confirma las dos opciones canarias.');
  return optionPages.map((page, i) => {
    const start = index(page, /^TRADUCCI[ÓO]N DEL SIGUIENTE TEXTO/u);
    const notes = index(page, /^NOTAS$/u, start + 1);
    if (start < 0 || notes < start + 3) throw Error('Confirma el texto canario.');
    return record(page.slice(start + 2, notes), { option: i ? 'B' : 'A', notes: value(page[start + 1]),
      warnings: ['Revisa las formas de la tabla morfológica y las notas del pasaje.'] });
  });
}
function aragon(pages) {
  const rows = pages.flat();
  const heads = rows.flatMap((row, i) => /^OPCI[ÓO]N [AB]$/iu.test(value(row)) ? [i] : []);
  if (heads.map(i => value(rows[i]).at(-1).toUpperCase()).join('') !== 'AB')
    throw Error('Confirma las dos opciones aragonesas.');
  return heads.map((head, i) => {
    const option = rows.slice(head + 1, heads[i + 1]);
    const notesAt = index(option, /^NOTAS:?$/iu);
    const translationAt = index(option, /^1\.\s*Traducci[oó]n del texto\b/iu);
    if (notesAt < 0 || translationAt <= notesAt)
      throw Error('Confirma el final del pasaje aragonés.');
    const body = option.slice(0, notesAt).filter(row => !onlyDigits.test(value(row)));
    const firstLatin = body.findIndex(row => row.runs?.[0]?.italic);
    if (firstLatin < 1 || !body.slice(firstLatin).every(row => row.runs?.[0]?.italic))
      throw Error('Confirma dónde empieza el texto aragonés.');
    const context = body.slice(0, firstLatin).map(value).join(' ');
    const last = value(body[firstLatin - 1]);
    const source = context.match(/\s*\(([^()]+\d[^()]*)\)\.?$/u);
    const standalone = /^(?:[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+){0,3}),\s*[^()]+\d/u.test(last);
    const citation = source?.[1] ?? (standalone ? last : '');
    const printed = citation.match(/^([^,]+),\s*(.+?)\s*,?\s+((?:[IVXLCDM]+[,.]?\s+)?\d[\d, .–-]*)$/u);
    const morph = option.slice(translationAt + 1);
    const morphEnd = index(morph, /^3\.\s*An[aá]lisis sint[aá]ctico/iu);
    const forms = morph.slice(0, morphEnd < 0 ? 0 : morphEnd).flatMap(row => {
      const prompt = value(row);
      const form = prompt.match(/^2\.[12]\.\s*An[aá]lisis morfo(?:l[oó]gico|sint[aá]ctico) de ([\p{L}\p{M}]+)\s*\(/iu)
        ?? prompt.match(/^[-–−\uF02D]\s*([\p{L}\p{M}]+)\s*\(/u);
      return form ? [form[1]] : [];
    });
    return record(body.slice(firstLatin), {
      option: i ? 'B' : 'A', notes: source ? context.slice(0, source.index).trim()
        : standalone ? text(body.slice(0, firstLatin - 1)) : context,
      author: printed?.[1], work: printed?.[2], reference: printed?.[3] ?? citation, forms,
      warnings: ['Coteja la referencia, la puntuación y las notas con el PDF.']
    });
  });
}
function cataluna(pages) {
  const page = pages.find(part => part.some(row => /^Feu la versi[oó] del text seg[uü]ent:$/iu.test(value(row))));
  if (!page) throw Error('No se reconoce la página de traducción catalana.');
  const body = range(page, /^Feu la versi[oó] del text seg[uü]ent:$/iu, /^L[eè]xic subratllat/iu);
  const source = value(body.at(-1)).match(/^([^.]*)\. (.*?),\s*([IVX\d, -]+)$/u);
  if (!source || body.length < 5) throw Error('Confirma la referencia catalana.');
  return [record(body.slice(2, -1), { notes: text(body.slice(0, 2)), author: source[1],
    work: source[2], reference: source[3],
    warnings: ['Revisa el léxico subrayado y los ejercicios de morfosintaxis independientes.'] })];
}
function extremadura(pages) {
  const page = pages[0];
  const first = index(page, /^TEXTO 1\. /u), second = index(page, /^TEXTO 2\. /u, first + 1);
  if (first < 0 || second < 0) throw Error('Confirma los dos textos extremeños.');
  return [page.slice(first, second), page.slice(second)].map((body, i) => {
    const introEnd = body.findIndex(row => /^\[.*$/u.test(value(row)));
    const latinAt = body.findIndex(row => /^(?:L\. Tarquinius|In angust[oō])/u.test(value(row)));
    const noteAt = body.findIndex((row, j) => j > latinAt && /^\d+$/u.test(value(row)) && /:/u.test(value(body[j + 1] ?? { text: '' })));
    if (introEnd < 1 || latinAt <= introEnd || noteAt <= latinAt) throw Error('Confirma los límites extremeños.');
    const source = value(body[0]).match(/^TEXTO [12]\. ([^,]+),\s*([^\d]+)\s+(\d[^.]*)/u);
    return record(body.slice(latinAt, noteAt), { option: String(i + 1), notes: text(body.slice(1, latinAt)),
      author: source?.[1] ?? '', work: source?.[2].trim() ?? '', reference: source?.[3] ?? '',
      warnings: ['Coteja las llamadas y las formas subrayadas en el original.'] });
  });
}
function galicia(pages) {
  const optionPages = pages.filter(page => page.some(row => /^OPCI[ÓO]N [AB]$/u.test(value(row))));
  if (optionPages.length !== 2) throw Error('Confirma las dos opciones gallegas.');
  return optionPages.map((page, i) => {
    const start = index(page, /^OPCI[ÓO]N [AB]$/u);
    const question = index(page, /^2\.-GRAM[ÁA]TICA/u, start + 1);
    if (question < start + 7) throw Error('Confirma el límite gallego.');
    const body = page.slice(start, question);
    const latinAt = body.findIndex(row => /^(?:Eodem tempore Tarentinis|Vulpinos catulos)/u.test(value(row)));
    if (latinAt < 3) throw Error('Confirma dónde empieza el latín gallego.');
    const latinEnd = body.findIndex((row, j) => j > latinAt && /^(?:Tarentini -orum|GRAM[ÁA]TICA)/u.test(value(row)));
    const finish = latinEnd < 0 ? body.length : latinEnd;
    return record(body.slice(latinAt, finish), { option: i ? 'B' : 'A', notes: value(body[latinAt - 1]),
      warnings: ['Coteja el fragmento subrayado y las dos versiones lingüísticas.'] });
  });
}
function asturiasAlternatives(pages) {
  const rows=pages.flat();
  const alternatives=/^ALTERNATIVA (I{1,2}|[AB])$/iu;
  const translation=/^1[.)]\s*TRADUCCI[ÓO]N DEL TEXTO\b/iu;
  const questions=/^2[.)]\s*CUESTIONES\b/iu;
  const letter='[\\p{L}\\p{M}]+';
  const single=new RegExp('^'+letter+'$','u');
  const options=rows.flatMap((row,index)=>{
    const label=value(row).match(alternatives)?.[1];
    return label ? [{label:label.toUpperCase(),index}] : [];
  });
  if (!options.length) {
    for (const page of pages) {
      const at=index(page,translation);
      const head=page.slice(0,at<0?0:at).flatMap(row=>value(row).match(/^OPCI[ÓO]N ([AB])(?: OPCI[ÓO]N \1)?$/iu)?.slice(1)??[]);
      if (new Set(head).size===1) options.push({label:head[0].toUpperCase(),part:page.slice(at+1)});
    }
  }
  if (!['A/B','I/II'].includes(options.map(item=>item.label).join('/'))) return null;
  return options.map(({label,index:head,part},i)=>{
    const preceding = !part;
    const option=part??rows.slice(head+1,options[i+1]?.index);
    const translationAt=index(option,translation);
    const questionAt=index(option,questions);
    if (questionAt<2 || (preceding && translationAt<2))
      throw Error('Confirma la traducción y las cuestiones de cada alternativa asturiana.');
    const textEnd=preceding?translationAt:questionAt;
    const printed=option.slice(0,textEnd).filter(row=>!onlyDigits.test(value(row)) &&
      !/^NO SE PERMITE EL USO DE NING[ÚU]N TIPO DE GRAM[ÁA]TICA$/iu.test(value(row)));
    const notesAt=index(printed,/^(?:NOTAS?\s*:|\*{1,3}(?:\s|:))/iu);
    const body=printed.slice(0,notesAt<0?undefined:notesAt);
    const context=body[0] && value(body[0]);
    const first=body[0]?.runs?.[0];
    const second=body[1]?.runs?.[0];
    if (!context || (!/^\([^()]+\)$/u.test(context) &&
      !(first?.italic && second && !second.italic && first.fontName!==second.fontName)))
      throw Error('Confirma dónde acaba la contextualización asturiana.');
    const markerRow=notesAt<0?'':value(printed[notesAt]);
    const calls=/^\*{1,3}(?:\s|:)/u.test(markerRow);
    const latinRows=body.slice(1).map(row=>calls?{...row,text:value(row).replace(/(?<=\p{L})\*{1,3}(?!\*)/gu,'')}:row);

    const morphAt=index(option,/^2\.1[. -]*Morfolog[ií]a\s*:/iu,questionAt+1);
    const endMorph=index(option,/^2\.2[. -]*Sintaxis\b/iu,morphAt+1);
    const morphology=morphAt>=0 && endMorph>morphAt ? option.slice(morphAt,endMorph) : [];
    const direct=lines(morphology).join(' ').match(/Analice morfol[oó]gicamente(?: en todas sus posibilidades)?\s*(?:las formas)?\s*:?\s+(.+)$/iu)?.[1];
    const quoted=direct?[...direct.matchAll(new RegExp('[“"«]('+letter+')[”"»]','gu'))].map(match=>match[1]):[];
    const explicit=morphology.slice(1).flatMap(row=>value(row).match(new RegExp('^[a-e]\\)\\s*('+letter+')[.:]?$','iu'))?.slice(1)??[]);
    const inline=direct?.replace(/[.:]$/u,'').split(/\s*,\s*|\s+y\s+/iu)??[];
    const forms=quoted.length?quoted:explicit.length?explicit:inline.every(form=>single.test(form))?inline:[];
    const item=record(latinRows,{option:label,notes:context,forms,
      warnings:['Coteja las notas, las preguntas léxicas y las llamadas del pasaje con el PDF.']});
    if (/^NOTAS?\s*:/iu.test(markerRow)) {
      item.doc.vocabulary=lines(printed.slice(notesAt)).join(' ').replace(/^NOTAS?\s*:\s*/iu,'')
        .split(/;\s*/u).flatMap(note=>{
          const entry=note.match(/^([\p{L}\p{M}][^:]{0,65}):\s*(.+)$/u);
          return entry?[{headword:entry[1],meaning:entry[2]}]:[];
        });
    }
    const lexAt=index(option,/^2\.3[. -]*L[ée]xico\s*:/iu,questionAt+1);
    const next=index(option,/^2\.4[. -]*/u,lexAt+1);
    const lexical=lexAt>=0 && next>lexAt ? lines(option.slice(lexAt,next)).join(' ') : '';
    item.doc.lexical.phonetics=[...lexical.matchAll(/(?:Explique|Comente|Escriba) la evoluci[oó]n fon[eé]tica (?:del lat[ií]n al castellano )?de ([^.:;]+)(?=[.:;]|$)/giu)]
      .flatMap(match=>{
        const forms=match[1].trim().split(/\s*,\s*|\s+y\s+/iu);
        return forms.every(form=>single.test(form))?forms:[];
      });
    return item;
  });
}

function asturias(columns) {
  const page = columns[0]?.[1] ?? [];
  const start = index(page, /^1\. TRADUCCI[ÓO]N DEL TEXTO$/u);
  const end = index(page, /^Universidad de Oviedo$/u, start + 1);
  if (start < 0 || end < start + 2) throw Error('Confirma la traducción asturiana.');
  return [record(page.slice(start + 1, end), {
    warnings: ['El examen ofrece grupos alternativos de morfología y léxico; revísalos antes de incorporarlos.']
  })];
}
function murcia(pages) {
  const page = pages[0];
  const heading = index(page, /^TEXTO A TEXTO B$/u);
  const end = index(page, /^Cuesti[oó]n 1\. Del texto seleccionado/u, heading + 1);
  const division = page[heading]?.runs.find(run => run.text.trim() === 'TEXTO B')?.x;
  if (heading < 0 || end < heading + 7 || !Number.isFinite(division)) throw Error('Confirma las columnas murcianas.');
  return ['A', 'B'].map((option, side) => {
    const chosen = page.slice(heading + 1, end).flatMap(row => {
      const runs = row.runs.filter(run => side ? run.x >= division - 1 : run.x < division - 1);
      if (!runs.length) return [];
      const offset = runs[0].start;
      return [{ ...row, text: row.text.slice(offset, runs.at(-1).end).trim() }];
    });
    const latinAt = chosen.findIndex(row => side ? /^Pallas anum simulat/u.test(value(row)) : /^Pugnatum est ingenti/u.test(value(row)));
    const noteAt = chosen.findIndex((row, i) => i > latinAt && /^Pompeius, -ii/u.test(value(row)));
    if (latinAt < 4) throw Error('Confirma el pasaje murciano.');
    const body = chosen.slice(latinAt, side || noteAt < 0 ? undefined : noteAt);
    return record(body, { option, notes: value(chosen[latinAt - 1]),
      warnings: ['Revisa en el original las palabras subrayadas y la lectura de las columnas.'] });
  });
}

export function recognizeHistoricExam(community, pages, columns = []) {
  const rows = pages.flat();
  const layouts = {
    'Andalucía': () => andalucia(rows), 'Islas Baleares': () => baleares(pages),
    'Cantabria': () => cantabria(pages), 'Castilla y León': () => castillaLeon(pages),
    'Castilla-La Mancha': () => castillaLaMancha(rows), 'Comunidad de Madrid': () => madrid(pages),
    'La Rioja': () => rioja(pages), 'Canarias': () => canarias(pages),
    'Aragón': () => aragon(pages), 'Cataluña': () => cataluna(pages),
    'Extremadura': () => extremadura(pages), 'Galicia': () => galicia(pages),
    'Asturias': () => asturiasAlternatives(pages) ?? asturias(columns), 'Región de Murcia': () => murcia(pages)
  };
  return layouts[community]?.();
}
