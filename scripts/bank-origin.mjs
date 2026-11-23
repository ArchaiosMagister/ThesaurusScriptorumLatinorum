function replace(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Revisar la procedencia del banco: ' + from);
  return source.replace(from, () => to);
}

export function integrateOriginValidation(source) {
  source = replace(source, "['notes', 'vocabulary', 'reviewed', 'teacherDocx']);",
    "['notes', 'vocabulary', 'reviewed', 'teacherDocx', 'origin', 'difficulty']);");
  return replace(source, "        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(",
    `        ...(data.origin === undefined ? {} : { origin: textOrigin(data.origin, path + '.origin') }),
        ...(data.difficulty === undefined ? {} : { difficulty: textDifficulty(data.difficulty, path + '.difficulty') }),
        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(`) + `

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
        ...((draft.difficulty === undefined ? previous?.difficulty : draft.difficulty) == null ? {}
            : { difficulty: draft.difficulty ?? previous?.difficulty }),
        ...(previous?.origin || draft.origin || (!previous && !Object.hasOwn(draft, 'origin'))
            ? { origin: previous?.origin ?? draft.origin ?? { kind: 'own' } }
            : {}),`);
}
