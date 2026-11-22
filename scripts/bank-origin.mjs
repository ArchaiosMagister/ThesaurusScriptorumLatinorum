function replace(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Revisar la procedencia del banco: ' + from);
  return source.replace(from, () => to);
}

export function integrateOriginValidation(source) {
  source = replace(source, "['notes', 'vocabulary', 'reviewed', 'teacherDocx']);",
    "['notes', 'vocabulary', 'reviewed', 'teacherDocx', 'origin']);");
  return replace(source, "        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(",
    `        ...(data.origin === undefined ? {} : { origin: textOrigin(data.origin, path + '.origin') }),
        ...(data.teacherDocx === undefined ? {} : { teacherDocx: teacherDocx(`) + `

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
        ...(previous?.origin || draft.origin || (!previous && !Object.hasOwn(draft, 'origin'))
            ? { origin: previous?.origin ?? draft.origin ?? { kind: 'own' } }
            : {}),`);
}
