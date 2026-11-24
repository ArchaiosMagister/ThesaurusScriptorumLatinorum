function required(source, old, next) {
  if (source.split(old).length !== 2) throw Error('Revisar el punto de integración del itinerario: ' + old);
  return source.replace(old, () => next);
}

export function integratePeriodValidation(source) {
  source = required(source, "['cover']);", "['cover', 'excludedCourse']);");
  source = required(source, "...(d.cover===undefined?{}:{cover:coverData(d.cover)})",
    "...(d.cover===undefined?{}:{cover:coverData(d.cover)}),...(d.excludedCourse===undefined?{}:{excludedCourse:choice(d.excludedCourse,'edition.excludedCourse',['1bach','2bach'])})");
  source = required(source, "['grammaticalSpans', 'grammarReview', 'vocabularySelectionMode', 'vocabularyQuantityMode']);",
    "['grammaticalSpans', 'grammarReview', 'vocabularySelectionMode', 'vocabularyQuantityMode', 'period']);");
  return required(source, "text: sourceText,\n        questions: array(d.questions", `text: sourceText,
        ...(d.period === undefined ? {} : { period: choice(d.period, path + '.period', ['trimestre-1', 'trimestre-2', 'trimestre-3', 'repaso']) }),
        questions: array(d.questions`);
}

export function integrateCurriculumComposer(source) {
  source = required(source, 'async function createNotebookNamed(title) {', 'async function createNotebookNamed(title, plan = []) {');
  source = required(source, "        menu = selection() ? 'questions' : 'notebook';",
    "        menu = selection() && !draft.placements.some(item => item.period) ? 'questions' : 'notebook';");
  const start = source.indexOf('    async function createNotebookNamed(title, plan = []) {');
  const end = source.indexOf('    async function addSourceToNotebook(', start);
  if (start < 0 || end < 0) throw Error('No se localiza la creación de cuadernos.');
  const creation = required(source.slice(start, end),
    'const fresh = createEdition({ id, legacyNotebookId: null, title: title.trim(), timestamp: at, placements: [] });',
    `const placements = plan.map(({ text, placementTags, period }) => {
                const place = placementFromCorpus({ ...text, tagIds: placementTags }, freshId('place'), at, () => freshId('item'));
                const doc = text.teacherDocx;
                const content = doc ? applyParsedTeacherDocx(place, { ...doc, title: text.title, latin: text.latin,
                    author: text.source.author, work: text.source.work, reference: text.source.reference }, () => freshId('item')) : place;
                return { ...content, period };
            });
            const fresh = createEdition({ id, legacyNotebookId: null, title: title.trim(), timestamp: at, placements });`);
  return source.slice(0, start) + creation + source.slice(end);
}

export function integrateCurriculumExport(source) {
  source = required(source, 'function placementContent(p, index, f, hasCover = false) {',
    'function placementContent(p, index, f, hasCover = false, periodLabel = "") {');
  source = required(source, 'pageBreak: index > 0 || hasCover',
    'pageBreak: !periodLabel && (index > 0 || hasCover)');
  source = required(source, '    return heading + source + latin(p, f)', `    const section = periodLabel ? paragraph(periodLabel,
        paraProps({ align: 'center', after: 8, keepNext: true, pageBreak: index > 0 || hasCover }),
        { bold: true, sizePt: f.fontSizePt }) : '';
    return section + heading + source + latin(p, f)`);
  return "import { periods } from '../ui/atl-bank-curriculum.js';\n" + required(source,
    "edition.placements.map((p, i) => placementContent(p, i, f, Boolean(edition.cover))).join('');",
    `edition.placements.map((p, i) => {
            const label = p.period !== edition.placements[i - 1]?.period
                ? periods.find(([key]) => key === p.period)?.[1] : '';
            return placementContent(p, i, f, Boolean(edition.cover), label);
        }).join('');`);
}
