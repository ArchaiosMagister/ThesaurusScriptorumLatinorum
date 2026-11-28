function replace(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Revisar la procedencia del banco: ' + from);
  return source.replace(from, () => to);
}

export function integrateOriginValidation(source) {
  source = replace(source, "['textRevisions']);", "['textRevisions', 'pauCvSeedVersion', 'pauNationalSeedVersion']);");
  source = replace(source, "    uniqueIds(corpus.texts, 'texts');", `    if (data.pauCvSeedVersion !== undefined) {
        if (!Number.isSafeInteger(data.pauCvSeedVersion) || data.pauCvSeedVersion < 1)
            invalid('corpus.pauCvSeedVersion', 'versión de banco PAU CV inválida');
        corpus.pauCvSeedVersion = data.pauCvSeedVersion;
    }
    if (data.pauNationalSeedVersion !== undefined) {
        if (!Number.isSafeInteger(data.pauNationalSeedVersion) || data.pauNationalSeedVersion < 1)
            invalid('corpus.pauNationalSeedVersion', 'versión de catálogo de Selectividad inválida');
        corpus.pauNationalSeedVersion = data.pauNationalSeedVersion;
    }
    corpus.texts = corpus.texts.map(normalizeSelectividadAuthor);
    uniqueIds(corpus.texts, 'texts');`);
  source = replace(source, "'vocabulary', 'lexical', 'preverbBases', 'warnings']);", "'vocabulary', 'lexical', 'preverbBases', 'warnings'], ['pauCv', 'nationalPau', 'textTemplate']);");
  source = replace(source, '  let preverbBases = null;', `  if (x.nationalPau !== undefined && (x.nationalPau !== true || x.pauCv !== undefined))
        invalid(path + '.nationalPau', 'identidad de Selectividad incompatible');
    if (x.textTemplate !== undefined && (x.textTemplate !== true || x.nationalPau || x.pauCv !== undefined))
        invalid(path + '.textTemplate', 'identidad de plantilla TXT incompatible');
    let preverbBases = null;`);
  source = replace(source, 'x.preverbBases.length !== 2', '!(x.nationalPau ? x.preverbBases.length > 0 && x.preverbBases.length <= 500 : x.preverbBases.length === 2)');
  source = replace(source, 'preverbBases = [', "preverbBases = x.nationalPau ? x.preverbBases.map((base, index) => nonBlank(base, path+'.preverbBases['+index+']',500)) : [");
  source = replace(source, "preverbBases, warnings };", "preverbBases, warnings, ...(x.pauCv === undefined ? {} : { pauCv: nonBlank(x.pauCv, path + '.pauCv', 120) }), ...(x.nationalPau ? { nationalPau:true } : {}), ...(x.textTemplate ? { textTemplate:true } : {}) };");
  source = replace(source, "['notes', 'vocabulary', 'reviewed', 'teacherDocx']);",
    "['notes', 'vocabulary', 'reviewed', 'teacherDocx', 'origin', 'difficulty', 'selectividad', 'courseIds', 'pauCv']);");
  return "import { communities } from '../ui/atl-bank-curriculum.js';\n" + replace(source, "        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(",
    `        ...(data.origin === undefined ? {} : { origin: textOrigin(data.origin, path + '.origin') }),
        ...(data.difficulty === undefined ? {} : { difficulty: textDifficulty(data.difficulty, path + '.difficulty') }),
        ...(data.pauCv === undefined ? {} : { pauCv: nonBlank(data.pauCv, path + '.pauCv', 120) }),
        ...(data.selectividad === undefined ? {} : { selectividad: selectividad(data.selectividad, path + '.selectividad') }),
         ...(data.courseIds === undefined ? {} : { courseIds: studyCourses(data.courseIds, path + '.courseIds') }),
        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(`) + `

function normalizeSelectividadAuthor(text) {
    if (text.id.startsWith('pau.national.') || (!text.selectividad && !text.teacherDocx?.pauCv)) return text;
    const canonical = author => typeof author === 'string' && /^c[eé]sar$/iu.test(author.trim()) ? 'Julio César' : author;
    const author = canonical(text.source.author);
    const doc = text.teacherDocx;
    const docAuthor = canonical(doc?.author);
    if (author === text.source.author && docAuthor === doc?.author) return text;
    return { ...text, source: { ...text.source, author },
        ...(doc && { teacherDocx: { ...doc, author: docAuthor } }) };
}

function studyCourses(value, path) {
    if (!Array.isArray(value) || value.length > 2 ||
        new Set(value).size !== value.length ||
        value.some(course => course !== '1bach' && course !== '2bach'))
        return invalid(path, 'cursos del pasaje inválidos');
    return value;
}
function selectividad(value, path) {
    const entry = record(value, path, [], ['year', 'community', 'hecho', 'session', 'model', 'option', 'series', 'sourceUrl']);
    if (entry.hecho !== undefined && typeof entry.hecho !== 'boolean') invalid(path + '.hecho', 'estado de Selectividad inválido');
    if (entry.year !== undefined && (!Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2099))
        invalid(path + '.year', 'año de Selectividad inválido');
    if (entry.community !== undefined && !communities.includes(entry.community))
        invalid(path + '.community', 'comunidad de Selectividad inválida');
    if (entry.session !== undefined && !['Ordinaria','Extraordinaria'].includes(entry.session)) invalid(path+'.session','convocatoria inválida');
    if (entry.model !== undefined && !['Examen oficial','Modelo orientativo'].includes(entry.model)) invalid(path+'.model','tipo de examen inválido');
    let sourceUrl;
    if (entry.sourceUrl !== undefined) {
        sourceUrl = nonBlank(entry.sourceUrl, path+'.sourceUrl', 1500);
        let link;
        try { link = new URL(sourceUrl); } catch { invalid(path+'.sourceUrl', 'URL del examen inválida'); }
        if (link.protocol !== 'https:' || link.username || link.password) invalid(path+'.sourceUrl', 'URL del examen inválida');
    }
    return { ...(entry.session && {session:entry.session}), ...(entry.model && {model:entry.model}),
        ...(entry.option !== undefined && {option:nonBlank(entry.option,path+'.option',120)}),
        ...(entry.series !== undefined && {series:nonBlank(entry.series,path+'.series',50)}),
        ...(sourceUrl && {sourceUrl}),
        ...(entry.year !== undefined && { year: entry.year }),
        ...(entry.community !== undefined && { community: entry.community }), ...(entry.hecho === true && { hecho: true }) };
}
function textDifficulty(value, path) {
    if (!Number.isInteger(value) || value < 1 || value > 5) return invalid(path, 'dificultad fuera de la escala 1–5');
    return value;
}
function textOrigin(value, path) {
    const origin = record(value, path, ['kind'], ['urn']);
    if (origin.kind === 'own' && !Object.hasOwn(origin, 'urn')) return { kind: 'own' };
    if (origin.kind === 'library') return { kind: 'library', urn: nonBlank(origin.urn, path + '.urn', 250) };
    return invalid(path, 'procedencia del pasaje inválida');
}
`;
}

export function integrateOriginWrites(source) {
  return replace(source, '        tagIds: previous?.tagIds ?? [],', `        tagIds: previous?.tagIds ?? [],
        ...((draft.pauCv ?? previous?.pauCv ?? previous?.teacherDocx?.pauCv) === undefined ? {} :
            { pauCv: draft.pauCv ?? previous?.pauCv ?? previous?.teacherDocx?.pauCv }),
         ...(draft.courseIds === undefined && previous?.courseIds === undefined
             ? {} : { courseIds: draft.courseIds ?? previous?.courseIds ?? [] }),
        ...((draft.difficulty === undefined ? previous?.difficulty : draft.difficulty) == null ? {}
            : { difficulty: draft.difficulty === undefined ? previous?.difficulty : draft.difficulty }),
        ...((draft.selectividad === undefined ? previous?.selectividad : draft.selectividad) == null ? {}
            : { selectividad: draft.selectividad === undefined ? previous?.selectividad : draft.selectividad }),
        ...(previous?.origin || draft.origin || (!previous && !Object.hasOwn(draft, 'origin'))
            ? { origin: previous?.origin ?? draft.origin ?? { kind: 'own' } }
            : {}),`);
}
