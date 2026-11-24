function replace(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Revisar la procedencia del banco: ' + from);
  return source.replace(from, () => to);
}

export function integrateOriginValidation(source) {
  source = replace(source, "'vocabulary', 'lexical', 'preverbBases', 'warnings']);", "'vocabulary', 'lexical', 'preverbBases', 'warnings'], ['pauCv']);");
  source = replace(source, "preverbBases, warnings };", "preverbBases, warnings, ...(x.pauCv === undefined ? {} : { pauCv: nonBlank(x.pauCv, path + '.pauCv', 120) }) };");
  source = replace(source, "['notes', 'vocabulary', 'reviewed', 'teacherDocx']);",
    "['notes', 'vocabulary', 'reviewed', 'teacherDocx', 'origin', 'difficulty', 'selectividad', 'courseIds']);");
  return "import { communities } from '../ui/atl-bank-curriculum.js';\n" + replace(source, "        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(",
    `        ...(data.origin === undefined ? {} : { origin: textOrigin(data.origin, path + '.origin') }),
        ...(data.difficulty === undefined ? {} : { difficulty: textDifficulty(data.difficulty, path + '.difficulty') }),
        ...(data.selectividad === undefined ? {} : { selectividad: selectividad(data.selectividad, path + '.selectividad') }),
         ...(data.courseIds === undefined ? {} : { courseIds: studyCourses(data.courseIds, path + '.courseIds') }),
        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(`) + `

function studyCourses(value, path) {
    if (!Array.isArray(value) || value.length > 2 ||
        new Set(value).size !== value.length ||
        value.some(course => course !== '1bach' && course !== '2bach'))
        return invalid(path, 'cursos del pasaje inválidos');
    return value;
}
function selectividad(value, path) {
    const entry = record(value, path, [], ['year', 'community']);
    if (entry.year !== undefined && (!Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2099))
        invalid(path + '.year', 'año de Selectividad inválido');
    if (entry.community !== undefined && !communities.includes(entry.community))
        invalid(path + '.community', 'comunidad de Selectividad inválida');
    return { ...(entry.year !== undefined && { year: entry.year }),
        ...(entry.community !== undefined && { community: entry.community }) };
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
         ...(draft.courseIds === undefined && previous?.courseIds === undefined
             ? {} : { courseIds: draft.courseIds ?? previous?.courseIds ?? [] }),
        ...((draft.difficulty === undefined ? previous?.difficulty : draft.difficulty) == null ? {}
            : { difficulty: draft.difficulty ?? previous?.difficulty }),
        ...((draft.selectividad === undefined ? previous?.selectividad : draft.selectividad) == null ? {}
            : { selectividad: draft.selectividad ?? previous?.selectividad }),
        ...(previous?.origin || draft.origin || (!previous && !Object.hasOwn(draft, 'origin'))
            ? { origin: previous?.origin ?? draft.origin ?? { kind: 'own' } }
            : {}),`);
}
