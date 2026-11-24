export const templatePrefix = 'atl-v1:curriculum-template:';
export const isTemplateKey = key => typeof key === 'string' &&
  /^atl-v1:curriculum-template:[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/u.test(key);

function validTags(tags) {
  return Array.isArray(tags) && tags.length <= 1000 && new Set(tags).size === tags.length &&
    tags.every(id => typeof id === 'string' && /^[\w.:-]{1,250}$/u.test(id));
}

export function validateTemplate(value) {
  const { name, settings } = value ?? {};
  const { terms, progression, exam, excludedCourses, filtered } = settings ?? {};
  const validCount = count => Number.isInteger(count) && count >= 0 && count <= 100;
  if (typeof name !== 'string' || !name.trim() || name.length > 150 ||
      !['cumulative', 'specific'].includes(progression) || !['all', 'exclude', 'only'].includes(exam) ||
      typeof filtered !== 'boolean' || !Array.isArray(excludedCourses) ||
      excludedCourses.some(course => !['1bach', '2bach', 'unassigned'].includes(course)) ||
      new Set(excludedCourses).size !== excludedCourses.length ||
      !Array.isArray(terms) || terms.length !== 3 ||
      terms.some(term => !term || !validCount(term.count) || !validCount(term.review) || !validTags(term.tags)) ||
      terms.reduce((sum, term) => sum + term.count + term.review, 0) > 100) {
    throw Error('La plantilla de programación no es válida.');
  }
  return { name: name.trim(), settings: { progression, exam, excludedCourses, filtered,
    terms: terms.map(({ tags, count, review }) => ({ tags, count, review })) } };
}

export function localTemplates(storage = localStorage) {
  return Object.keys(storage).filter(isTemplateKey).sort().map(key => [
    key, validateTemplate(JSON.parse(storage.getItem(key)))
  ]);
}
