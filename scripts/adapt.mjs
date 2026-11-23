import { integratePeriodValidation, integrateCurriculumComposer, integrateCurriculumExport } from './curriculum-integration.mjs';
import { simplifyNotebookOrganization, simplifyNotebookHeader, stableNotebookOverview } from './notebook-organizer.mjs';
import { modernizeBank } from './bank-interface.mjs';
import { sharedExamEditorStyle, alignNotebookEditorMarkup } from './exam-editor-style.mjs';
import { integrateExamMorphology } from './exam-morphology-integration.mjs';
import { integrateLatinReadingCard, integrateReadingCardPreview } from './reading-card-integration.mjs';
import { organizeNotebookEditor, completeNotebookVocabulary } from './notebook-editor.mjs';
import { varyPreverbControls, varyPreverbSelection } from './preverb-regeneration.mjs';
import { groupLibraryAuthors, integrateNotebookLibrary, libraryStyles } from './library-integration.mjs';
import { integrateMorphologyControls, integrateMorphologyEdition, integrateManualNotebookUnderline } from './notebook-morphology.mjs';
import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { integrateNotebook } from './notebook-integration.mjs';
import { integrateNotebookWorkflow, integrateEditionSourceRefresh } from './notebooks-phase.mjs';
import { integrateOriginValidation, integrateOriginWrites } from './bank-origin.mjs';

const namespace = 'atl-v1:';

const cuadernoNames = [
  'cuaderno-textos-latinos', 'cuaderno-textos-latinos-workspace',
  'cuaderno-textos-latinos-biblioteca-examinator2', 'cuaderno-original-examinator2-obras',
  'cuaderno-collatinus-examinator-v1', 'cuaderno-collatinus-examinator-v1.fs:',
  'cuaderno-collatinus-analysis-v2', 'cuaderno-examinator-ultimo-v1',
  'cuaderno-banco-review-v1:', 'cuaderno-collatinus-revision-v1:', 'cuaderno-ui-theme-v1',
  'cuaderno-examinator.vocabulario.v1'
];

export function adaptStorage(source, module) {
  if (module === 'cuaderno') {
    const exact = cuadernoNames.map(name => name.replace(/[.]/g, '\\.')).join('|');
    return source
      .replace(new RegExp("(['\`\"])(" + exact + ")(?=\\1)", 'g'), '$1' + namespace + '$2')
      .replace(/(['"])(cuaderno-textos-|cuaderno-examinator:)(?=[\da-f]+\1|\1)/g, '$1' + namespace + '$2');
  }
  return source
    .replace(/(['"])(examinator)(?=\1|\.)/g, '$1' + namespace + '$2')
    .replace(/(['"])(examinator2-)(?=v\d|\1)/g, '$1' + namespace + '$2');
}

export function embeddedHtml(html) {
  if (!/<\/head>/i.test(html)) throw new Error('La página de origen carece de cabecera HTML.');
  return html
    .replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*\bname=["']apple-mobile-web-app-(?:capable|title|status-bar-style)["'][^>]*>\s*/gi, '')
    .replace(/<\/head>/i, '<link rel="stylesheet" href="./integracion.css">\n</head>');
}

async function scripts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return scripts(path);
    return entry.name.endsWith('.js') ? [path] : [];
  }));
  return nested.flat();
}

export async function adaptModule(directory, module, pages, academicRevision) {
  const checks = module === 'cuaderno'
    ? [
      ['storage/workspace-repository.js', 'cuaderno-textos-latinos-workspace'],
      ['storage/indexeddb-corpus-repository.js', 'cuaderno-textos-latinos'],
      ['storage/downloaded-works.js', 'cuaderno-textos-latinos-biblioteca-examinator2'],
      ['examinator-cuadernos/service-worker.js', 'cuaderno-examinator:']
    ]
    : [['js/shim.js', 'examinator.fs:'], ['sw.js', 'examinator2-']];
  for (const [path, expected] of checks) {
    const original = await readFile(join(directory, path), 'utf8');
    if (!adaptStorage(original, module).includes(namespace + expected)) {
      throw new Error('Revisar aislamiento de almacenamiento en ' + path);
    }
  }
  for (const file of await scripts(directory)) {
    const original = await readFile(file, 'utf8');
    const adapted = adaptStorage(original, module);
    if (adapted !== original) await writeFile(file, adapted);
  }
  let notebookRevision;
  let examRevision;
  const examAssets = [
    './atl-exam-bank.js', './atl-exam-morphology.js',
    '../shared/text-usage.js',
    ...['storage/indexeddb-corpus-repository', 'core/errors', 'core/model', 'core/validation',
      'core/edition-validation', 'core/morph-categories', 'core/edition-model', 'core/library',
      'storage/workspace-repository', 'storage/workspace-backup', 'core/grammar-tags', 'core/editor-operations',
      'core/text-duplicates']
      .map(path => '../cuaderno-integrado/' + path + '.js')
  ];
  const notebookPage = 'examinator-cuadernos';
  const notebookStyles = module === 'cuaderno'
    ? await readFile(new URL('./notebook-integration.css', import.meta.url), 'utf8') + '\n' +
      sharedExamEditorStyle(await readFile(join(directory, '..', 'examinator', 'styles.css'), 'utf8'))
    : '';
  const usage = await readFile(new URL('./text-usage.js', import.meta.url), 'utf8');
  const personalAcademic = await readFile(new URL('./personal-academic.js', import.meta.url), 'utf8');
  if (module === 'cuaderno') {
    const validation = join(directory, 'core', 'validation.js');
    await writeFile(validation, integrateOriginValidation(await readFile(validation, 'utf8')));
    const editionValidation = join(directory, 'core', 'edition-validation.js');
    await writeFile(editionValidation, integratePeriodValidation(await readFile(editionValidation, 'utf8')));
    const operations = join(directory, 'core', 'editor-operations.js');
    await writeFile(operations, integrateOriginWrites(await readFile(operations, 'utf8')));
    const editionOperations = join(directory, 'core', 'edition-operations.js');
    const editionSource = await readFile(editionOperations, 'utf8');
    if (!editionSource.includes('function reanchorGrammarSpan(')) throw new Error('Revisar el anclaje gramatical.');
    await writeFile(editionOperations, editionSource.replace('function reanchorGrammarSpan(', 'export function reanchorGrammarSpan('));
    const morphSelection = join(directory, 'core', 'morph-selection-collatinus.js');
    const originalMorphSelection = await readFile(morphSelection, 'utf8');
    const updatedMorphSelection = originalMorphSelection
      .replace('replaceWordId = null, verifiedChoices = [])', 'replaceWordId = null, verifiedChoices = [], allowDifferentCategory = false)')
      .replace('const options = replace ? candidates.filter(c => c.key !== key(replace.surface)) : candidates;', `
    const occupiedForms = new Set(others.map(word => key(word.surface)));
    const type = replace && category(replace);
    const options = replace ? candidates.filter(c => c.key !== key(replace.surface) && !occupiedForms.has(c.key) &&
        (allowDifferentCategory || !type || c.category === type)) : candidates;`.trimStart())
      .replace('words: [...existing, ...newWords]', 'words: removed ? question.words.flatMap(word => word.id === replaceWordId ? newWords : [word]) : [...existing, ...newWords]');
    if (updatedMorphSelection === originalMorphSelection) throw Error('Revisar la sustitución morfológica en Cuadernos.');
    await writeFile(morphSelection, updatedMorphSelection);
    const academicEngine = join(directory, 'core', 'academic-engine.js');
    await writeFile(academicEngine, (await readFile(academicEngine, 'utf8')) + `
const lexicalCollator = new Intl.Collator('es', { sensitivity: 'base' });
export function lexicalValuesForDocument(option) {
    const values = option.slots.map(slot => displayedAcademicSlotValue(option.kind, slot));
    return option.kind === 'preverb' ? values : values.sort(lexicalCollator.compare);
}
`);
    const documents = join(directory, 'export', 'notebook-documents.js');
    await writeFile(documents, integrateCurriculumExport(await readFile(documents, 'utf8'))
      .replace('import { displayedAcademicSlotValue }', 'import { lexicalValuesForDocument }')
      .replace('option.slots.forEach((slot, index) => {', 'lexicalValuesForDocument(option).forEach((value, index) => {')
      .replace('displayedAcademicSlotValue(option.kind, slot)', 'value'));
    const file = join(directory, 'ui', 'examinator-notebook-app.js');
    const catalogue = await readFile(new URL('./bank-catalog.mjs', import.meta.url), 'utf8');
    const bankReview = await readFile(new URL('./bank-review.js', import.meta.url), 'utf8');
    const bankVocabulary = await readFile(new URL('./bank-vocabulary.js', import.meta.url), 'utf8');
    await writeFile(join(directory, 'ui', 'atl-bank-catalog.js'), catalogue);
    await cp(new URL('./bank-difficulty.js', import.meta.url), join(directory, 'ui', 'atl-bank-difficulty.js'));
    await cp(new URL('./bank-curriculum.js', import.meta.url), join(directory, 'ui', 'atl-bank-curriculum.js'));
    await cp(new URL('./bank-planner.js', import.meta.url), join(directory, 'ui', 'atl-bank-planner.js'));
    await writeFile(join(directory, 'ui', 'atl-bank-review.js'), bankReview);
    await cp(new URL('./bank-context.js', import.meta.url), join(directory, 'ui', 'atl-bank-context.js'));
    const grammarTags = join(directory, 'core', 'grammar-tags.js');
    const grammarSource = await readFile(grammarTags, 'utf8');
    const catalogueStart = 'export const GRAMMAR_CATALOGUE = [';
    if (!grammarSource.includes(catalogueStart)) throw new Error('Revisar el catálogo gramatical integrado.');
    await writeFile(grammarTags, "import { contextualTags } from '../ui/atl-bank-context.js';\n" +
      grammarSource.replace(catalogueStart, catalogueStart + '\n    ...contextualTags,')
      .replace('Cercanía (hic)', 'Demostrativo hic')
      .replace('Media distancia (iste)', 'Demostrativo iste')
      .replace('Lejanía (ille)', 'Demostrativo ille'));

    await writeFile(join(directory, 'ui', 'atl-bank-vocabulary.js'), bankVocabulary);
    const integrated = stableNotebookOverview(simplifyNotebookHeader(modernizeBank(completeNotebookVocabulary(integrateNotebookLibrary(integrateNotebookWorkflow(integrateNotebook(await readFile(file, 'utf8'))))))))
      .replaceAll('./pwa-controls.js', './atl-pwa.js').replace("./edition-app.js", "./atl-edition.js")
      .replace("button('Gestionar cuadernos', openNotebooks", "button('Todos los cuadernos', openNotebooks");
    await writeFile(join(directory, 'ui', 'atl-repertorios.js'), integrated);
    const edition = simplifyNotebookOrganization(alignNotebookEditorMarkup(organizeNotebookEditor(integrateMorphologyEdition(integrateEditionSourceRefresh(await readFile(join(directory, 'ui', 'edition-app.js'), 'utf8'))))));
    const readingCardFile = join(directory, 'ui', 'latin-reading-card.js');
    const readingCard = integrateLatinReadingCard(await readFile(readingCardFile, 'utf8'));
    await writeFile(readingCardFile, readingCard);
    const editionWithCards = integrateReadingCardPreview(integrateCurriculumComposer(edition));
    await writeFile(join(directory, 'ui', 'atl-edition.js'), editionWithCards
      .replace('import { displayedAcademicSlotValue }', 'import { displayedAcademicSlotValue, lexicalValuesForDocument }')
      .replace('option.slots.forEach((slot, index) => {', 'lexicalValuesForDocument(option).forEach((value, index) => {')
      .replace('displayedAcademicSlotValue(option.kind, slot)', 'value'));
    const teacher = join(directory, 'core', 'academic-teacher-bank.js');
    const teacherSource = "import { withPersonalLists } from '../../shared/personal-academic.js';\n" +
      (await readFile(teacher, 'utf8')).replace('return importTeacherAcademicSources(academicTeacherSnapshotV1);',
        'return withPersonalLists(importTeacherAcademicSources(academicTeacherSnapshotV1), academicTeacherSnapshotV1);');
    await writeFile(teacher, teacherSource);
    const preverbs = join(directory, 'core', 'preverb-selection.js');
    await writeFile(preverbs, varyPreverbSelection(await readFile(preverbs, 'utf8')));
    const controls = join(directory, 'ui', 'academic-controls.js');
    const academicControls = varyPreverbControls(integrateMorphologyControls("import { personalPreverbSnapshot } from '../../shared/personal-academic.js';\n" +
      (await readFile(controls, 'utf8'))
        .replace('const bases = teacherPreverbBases(academicTeacherSnapshotV1);',
          'const personalBases = () => teacherPreverbBases(personalPreverbSnapshot(academicTeacherSnapshotV1));')
        .replaceAll('choosePreverbBases(academicTeacherSnapshotV1,', 'choosePreverbBases(personalPreverbSnapshot(academicTeacherSnapshotV1),')
        .replaceAll('of bases)', 'of personalBases())').replaceAll('bases.find(', 'personalBases().find(')));
    await writeFile(controls, integrateManualNotebookUnderline(academicControls));
    const libraryFile = join(directory, notebookPage, 'js', 'library.js');
    const library = groupLibraryAuthors((await readFile(libraryFile, 'utf8'))
      .replace("    M.toast('Fragmento copiado al examen. Escribe el título del texto.');", ''));
    await writeFile(libraryFile, library);
    const utilitiesFile = join(directory, notebookPage, 'js', 'util.js');
    const utilities = (await readFile(utilitiesFile, 'utf8'))
      .replace("  const m = M.el('div', { class: 'modal' });",
        "  bg.dataset.atlBankOverlay = document.body.dataset.atlBank || 'false';\n  const m = M.el('div', { class: 'modal' });")
      .replace("if (e.key === 'Escape') close();", "if (e.key === 'Escape' && bg.getClientRects().length) close();");
    await writeFile(utilitiesFile, utilities);
    const pwaFile = join(directory, 'ui', 'pwa-controls.js');
    const pwa = (await readFile(pwaFile, 'utf8'))
      .replace(/        const worker = new URL\([^\n]+\);\n/, '')
      .replace(/registration = await navigator\.serviceWorker\.register\(worker\.href, \{[\s\S]*?\n\s*\}\);/,
        'registration = await navigator.serviceWorker.getRegistration();\n            if (!registration) return;');
    await writeFile(join(directory, 'ui', 'atl-pwa.js'), pwa);
    await writeFile(pwaFile, pwa);
    const classic = join(directory, 'ui', 'library-app.js');
    await writeFile(classic, (await readFile(classic, 'utf8'))
      .replace("navigator.serviceWorker.register('./service-worker.js')", 'navigator.serviceWorker.ready'));
    notebookRevision = createHash('sha256').update(integrated).update(notebookStyles)
      .update(library).update(utilities).update(pwa).update(catalogue).update(bankReview).update(bankVocabulary).update(edition)
      .update(academicRevision).update(usage).update(personalAcademic).update(academicControls).update(teacherSource)
       .update(readingCard).update(editionWithCards)
      .digest('hex').slice(0, 12);
  } else {
    // Conservar el generador PDF en caché, pero no ejecutarlo hasta su uso en iOS.
    const shimPath = join(directory, 'js', 'shim.js');
    const shim = await readFile(shimPath, 'utf8');
    const pdfCall = '        const blob = await window.EXPdf.generate(html);';
    if (shim.split(pdfCall).length !== 2) throw new Error('Revisar la exportación PDF de Examinator.');
    await writeFile(shimPath, shim.replace(pdfCall, '        await window.atlLoadPdfExporter();\n' + pdfCall));
    await writeFile(join(directory, 'js', 'atl-pdf-loader.js'),
      await readFile(new URL('./lazy-pdf-loader.js', import.meta.url), 'utf8'));
    // JSZip solo se necesita en el momento de exportar un DOCX, no al abrir
    // el editor. Conservamos la biblioteca original en el paquete sin conexión.
    const renderFileWord = join(directory, 'js', 'render.js');
    const originalRender = await readFile(renderFileWord, 'utf8');
    const wordEntry = '  E.docx = async function (S) {';
    if (originalRender.split(wordEntry).length !== 2)
      throw new Error('Revisar el punto de exportación Word de Examinator.');
    await writeFile(renderFileWord, originalRender.replace(wordEntry,
      wordEntry + '\n    await window.atlLoadWordExporter();'));
    await writeFile(join(directory, 'js', 'atl-word-loader.js'),
      await readFile(new URL('./lazy-word-loader.js', import.meta.url), 'utf8'));
    const bankScript = await readFile(new URL('./exam-bank.js', import.meta.url), 'utf8');
    await writeFile(join(directory, 'atl-exam-bank.js'), bankScript);
    const mainFile = join(directory, 'js', 'exam.js');
    const original = await readFile(mainFile, 'utf8');
    const button = '<button class="tbtn libBtn" data-act="lib">Elegir un fragmento…</button>';
    const copy = '    M.renderEditor();\n    M.analyzeNow(true);\n    changed();';
    if (!original.includes(button) || !original.includes(copy)) throw new Error('Revisar el selector de textos de Examinator.');
    const exam = original.replace(button, button + '\n          <button class="tbtn" type="button" data-act="atlBank">Banco de textos…</button>' +
      '\n          <button class="tbtn hidden" type="button" data-act="atlBankRefresh">Actualizar desde el banco</button>')
      .replace("    $('.libBtn', ed).classList.toggle('hidden', S.source !== 'lib');",
        "    $('.libBtn', ed).classList.toggle('hidden', S.source !== 'lib');\n" +
        "    $('[data-act=atlBankRefresh]', ed).classList.toggle('hidden', typeof S.atlBankSource?.id !== 'string' || !S.atlBankSource.id);")
      .replace(copy, `    if (d.bank) {
      S.titulo = d.bank.title;
      S.atlBankSource = { id: d.bank.id, updatedAt: d.bank.updatedAt };
    } else {
      delete S.atlBankSource;
    }
` + copy)
      .replace('  async function onClick(e) {', `  M.refreshFromBank = function (d) {
    const S = M.S;
    const textChanged = d.text !== S.texto;
    Object.assign(S, { texto: d.text, refAutor: d.author, refObra: d.obra, refCita: d.cita,
      atlBankSource: { id: d.bank.id, updatedAt: d.bank.updatedAt } });
    M.renderEditor();
    if (textChanged) void M.analyzeNow();
    changed();
  };

  async function onClick(e) {`);
    const morphology = await readFile(new URL('./exam-morphology.js', import.meta.url), 'utf8');
    await writeFile(join(directory, 'atl-exam-morphology.js'), morphology);
    const editor = integrateExamMorphology(exam)
      .replace(/^      \$\{\(v\.manual \|\| v\.glosasSeparadas\) .*\n/m, '')
      .replace(/      if \(e\.target\.classList\.contains\('vsplit'\)\) \{[\s\S]*?(?=      if \(!e\.target\.classList\.contains\('von'\))/, '')
      .replace("const S = M.S, box = $('#editor .q4'); if (!box) return;",
        "const S = M.S, box = $('#editor .q4'); if (!box) return;\n    const editor = $('#editor'), scrollTop = editor.scrollTop;")
      .replace("    $$('select[data-q=prevn]', box).forEach", match => "    editor.scrollTop = scrollTop;\n" + match);
    await writeFile(join(directory, 'js', 'atl-exam-editor.js'), editor);
    const renderFile = join(directory, 'js', 'render.js');
    await writeFile(renderFile, (await readFile(renderFile, 'utf8')).replace(
      ' }))\n      .sort((a, b) => coll.compare(a.txt, b.txt));', ' }));'));
    const nativeStart = await readFile(join(directory, 'js', 'start.js'), 'utf8');
    const start = nativeStart.replace("    const data = JSON.stringify(Object.assign({ examinator: 1 }, M.S));", `    const current = M.S;
    if (M.atlRecordExam && typeof current.atlArchiveId !== 'string') current.atlArchiveId = crypto.randomUUID();
    const data = JSON.stringify(Object.assign({ examinator: 1 }, current));`)
      .replace("    if (p) M.toast('Guardado: '", `    if (M.atlRecordExam && (p || window.api.web)) {
      try { await M.atlRecordExam(current.atlArchiveId, current.titulo || baseName(current), JSON.parse(data)); }
      catch (error) { M.toast('Archivo descargado. No se pudo registrar en el historial local.', 6500); }
      M.persistNow();
    }
    if (p) M.toast('Guardado: '`)
      .replace('  function showLatinSpacingWarning(value) {',
        '  M.atlRestoreExam = saved => M.loadExam(restoreExam(saved));\n  function showLatinSpacingWarning(value) {')
      .replace("      M.toast('Examen abierto.');", `      if (M.atlRecordExam) {
        if (typeof loaded.atlArchiveId !== 'string') loaded.atlArchiveId = crypto.randomUUID();
        try { await M.atlRecordExam(loaded.atlArchiveId, loaded.titulo || baseName(loaded), loaded); }
        catch (error) { M.toast('Examen abierto. No se pudo registrar en el historial local.', 6500); return; }
        M.persist();
      }
      M.toast('Examen abierto.');`);
    await writeFile(join(directory, 'js', 'atl-exam-start.js'), start);
    const lists = (await readFile(join(directory, 'js', 'lists.js'), 'utf8'))
      .replaceAll("if (cur === 'preverbios' && M.S.texto) M.analyzeNow(true);", '');
    await writeFile(join(directory, 'js', 'atl-exam-lists.js'), lists);
    const library = (await readFile(join(directory, 'js', 'library.js'), 'utf8'))
      .replace("    if (target === 'literatura') {\n      M.S.literatura = { texto: r.text, traduccion: '', autor: cur.author, obra: cur.latin, cita: r.cita, urn: cur.urn };", `    const passage = { urn: cur.urn, text: r.text, author: cur.author, obra: cur.latin, cita: r.cita };
    const isLiterature = target === 'literatura';
    const apply = () => {
    if (isLiterature) {
      M.S.literatura = { texto: passage.text, traduccion: '', autor: passage.author, obra: passage.obra, cita: passage.cita, urn: passage.urn };`)
      .replace('    M.setTextFromLibrary({ urn: cur.urn, text: r.text, author: cur.author, obra: cur.latin, cita: r.cita });',
        '    M.setTextFromLibrary(passage);')
      .replace("    M.toast('Fragmento copiado al examen. Escribe el título del texto.');", `    M.toast('Fragmento copiado al examen. Escribe el título del texto.');
    };
    if (M.atlReviewLibraryUse) void M.atlReviewLibraryUse(passage, apply).catch(error => M.toast(error.message, 6500));
    else apply();`);
    await writeFile(join(directory, 'js', 'atl-exam-library.js'), groupLibraryAuthors(library, true));
    const filterFile = join(directory, 'js', 'lexico-filtros.js');
    const filters = (await readFile(filterFile, 'utf8'))
      .replace('  F.key = key;', '  F.key = key;\n  const excluded = new Set((globalThis.ATLTeacherBank?.excludedPhonetics || []).map(key));')
      .replace('    const total = F.normas.length;\n    const restricted = selected.size !== total;\n', '')
      .replace(/    \/\/ Sin filtros activos,[\s\S]*?    if \(!selected.size\)/,
        '    if (!selected.size)')
      .replace('      if (id && !selected.has(id)) return null;\n      if (!id && (restricted || onlyPatrimonial)) return null; // sin homologación',
        '      if (!id || !selected.has(id)) return null;')
      .replace('        const hits = byEtimo.get(key(word));\n        if (!hits || !hits.length) return !restricted && !onlyPatrimonial; // altas personales sin filtro',
        `        const spelling = key(word);
        if (excluded.has(spelling)) return false;
        const hits = byEtimo.get(spelling);
        if (!hits?.length) return !onlyPatrimonial && !knownEtima.has(spelling);`)
      .replace('  const byEtimo = new Map();', `  const knownEtima = new Set((source.fonetica?.items || []).map(item => key(item.latin)));
  const byEtimo = new Map();`)
      .replace('  const latinNum =', `  F.evolCandidates = (S) => {
    const byWord = new Map();
    for (const group of F.evolPool(S)) {
      for (const word of group.palabras) {
        const id = key(word);
        if (!byWord.has(id)) byWord.set(id, { w: word, labels: new Set() });
        byWord.get(id).labels.add(group.nombre);
      }
    }
    return [...byWord.values()].map(row => ({ w: row.w, labels: [...row.labels] }));
  };
  const latinNum =`);
    await writeFile(join(directory, 'js', 'atl-exam-filters.js'), filters);
    const proposalFile = join(directory, 'js', 'propose.js');
    const originalProposals = await readFile(proposalFile, 'utf8');
    const proposals = originalProposals.replace(/  \/\* ---------- evolución fonética:[\s\S]*?(?=  \/\/ El banco fonético)/, `  /* ---------- evolución fonética ---------- */
  function phoneticEntry(candidate, otherEntries) {
    const usedLabels = new Set(otherEntries.map(entry => entry.g));
    const g = candidate.labels.find(label => !usedLabels.has(label)) ?? candidate.labels[0];
    return { g, w: candidate.w };
  }

  P.evol = function (S) {
    S.evol = [];
    for (const candidate of M.shuffle(M.LexicalFilters.evolCandidates(S)).slice(0, 4)) {
      S.evol.push(phoneticEntry(candidate, S.evol));
    }
    return S.evol.length === 4;
  };

  P.evolOne = function (S, k) {
    const others = (S.evol || []).filter((entry, index) => index !== k && entry);
    const key = M.LexicalFilters.key;
    const blocked = new Set([...others.map(entry => key(entry.w)), key(S.evol[k]?.w)]);
    const replacement = M.pick(M.LexicalFilters.evolCandidates(S).filter(entry => !blocked.has(key(entry.w))));
    if (!replacement) return false;
    S.evol[k] = phoneticEntry(replacement, others);
    return true;
  };

`);
    if (proposals === originalProposals) throw new Error('Revisar el sorteo fonético de Examinator.');
    await writeFile(join(directory, 'js', 'atl-exam-propose.js'), proposals);
    examRevision = createHash('sha256').update(editor).update(morphology).update(bankScript).update(start).update(usage).update(lists).update(library)
      .update(filters).update(proposals)
      .update(JSON.stringify(examAssets)).update(academicRevision)
      .digest('hex').slice(0, 12);
  }
  for (const page of pages) {
    const path = join(directory, page, 'index.html');
    const stylesheet = page === notebookPage || module === 'examinator' ? 'atl-style.css' : 'integracion.css';
    let html = embeddedHtml(await readFile(path, 'utf8')).replace('./integracion.css', './' + stylesheet);
    if (module === 'examinator') {
      html = html.replace('js/exam.js', 'js/atl-exam-editor.js').replace('js/start.js', 'js/atl-exam-start.js')
        .replace('<script src="js/pwa.js"></script>', '')
        .replace('<script src="lib/html2pdf.bundle.min.js"></script>', '<script src="js/atl-pdf-loader.js"></script>')
        .replace('<script src="lib/jszip.min.js"></script>', '<script src="js/atl-word-loader.js"></script>')
        .replace('js/lists.js', 'js/atl-exam-lists.js')
        .replace('js/library.js', 'js/atl-exam-library.js')
        .replace('js/lexico-filtros.js', 'js/atl-exam-filters.js')
        .replace('js/propose.js', 'js/atl-exam-propose.js')
        .replace('<script src="js/bancos-datos.js"></script>', '<script src="../academic/teacher-bank.js"></script>\n<script src="js/bancos-datos.js"></script>')
        .replace('</body>', '<script type="module" src="./atl-exam-bank.js"></script>\n</body>');
    }
    if (page === notebookPage) {
      html = html.replace('../ui/examinator-notebook-app.js', '../ui/atl-repertorios.js');
      await writeFile(join(directory, page, 'atl-index.html'), html);
      await writeFile(join(directory, page, 'atl-cuadernos.html'), html);
      await writeFile(join(directory, page, 'atl-repertorios.html'), html);
    }
    await writeFile(path, html);
    const installControls = '#btnInstall, #btnUpdate, [data-pwa-install], [data-pwa-check] { display: none !important; }\n';
    let morphologyStyles = '';
    if (module === 'examinator') {
      const bridge = await readFile(join(directory, '..', 'cuaderno-integrado', notebookPage, 'bridge.css'), 'utf8');
      const start = bridge.indexOf('/* Tipos de palabra,');
      const end = bridge.indexOf('/* Tarjeta de lectura de Collatinus:', start);
      if (start < 0 || end < 0) throw Error('Revisar los estilos de morfología de Cuadernos.');
      morphologyStyles = bridge.slice(start, end).replaceAll('data-cuaderno-theme', 'data-theme');
    }
    const examStyles = module === 'examinator' ? `
.atl-exam-bank-list { display: grid; gap: .5rem; }
.atl-exam-bank-text { display: grid; gap: .25rem; text-align: start; white-space: normal; }
.atl-exam-bank-text i { font-family: var(--text-font); }
#editor .subr .sw { white-space: normal; }
#editor .subr .atl-morph-actions { display: flex; flex-wrap: wrap; gap: 5px; max-width: 100%; }
.morph-reading, .morph-replacement { min-width: 0; max-width: 100%; }

` : '';
    const diagnostics = module === 'cuaderno' && page === '' ? '#diagnostics { display: none; }\n' : '';
    const badgeAlignment = module === 'examinator' || page === notebookPage ? `
#editor .edition-morph-category {
  justify-content: center;
  text-align: center;
}
#editor .edition-academic-morph-row > .edition-morph-category:first-child {
  box-sizing: border-box;
  flex: 0 0 7rem;
  min-height: 1.5rem;
}
` : '';
    await writeFile(join(directory, page, stylesheet),
      installControls + diagnostics + examStyles + morphologyStyles + libraryStyles + (page === notebookPage ? notebookStyles : '') + badgeAlignment);
    const workerPath = join(directory, page, module === 'examinator' ? 'sw.js' : 'service-worker.js');
    const updates = await readFile(workerPath, 'utf8');
    const worker = page === notebookPage
      ? updates.replaceAll('../../examinator2-original/', '../examinator2-original/')
        .replace(/^(const CACHE_NAME = .+)"([^"]+)";$/m, '$1"$2-' + notebookRevision + '";')
      : module === 'examinator'
        ? updates.replace(/^(const VERSION = .+?)';$/m, "$1-" + examRevision + "';")
        : updates;
    const marker = module === 'examinator' ? 'const PRECACHE = [' : 'const FILES = [';
    if (!worker.includes(marker)) throw new Error('Revisar recursos sin conexión en ' + workerPath);
    const additions = ['./' + stylesheet, ...(module === 'examinator'
      ? [...examAssets, './js/atl-exam-editor.js', './js/atl-exam-start.js', './js/atl-exam-lists.js',
        './js/atl-exam-library.js', './js/atl-exam-filters.js', './js/atl-exam-propose.js',
         './js/atl-pdf-loader.js', './js/atl-word-loader.js'] : [])];
    additions.push(page === notebookPage ? '../../academic/teacher-bank.js' : '../academic/teacher-bank.js');
    if (module === 'cuaderno') additions.push(page === notebookPage
      ? '../../shared/personal-academic.js' : '../shared/personal-academic.js');
    if (page === notebookPage) {
      additions.push('./atl-index.html', './atl-cuadernos.html', './atl-repertorios.html', '../ui/atl-repertorios.js', '../ui/atl-edition.js',
        '../ui/atl-pwa.js', '../ui/atl-bank-catalog.js', '../ui/atl-bank-review.js', '../ui/atl-bank-difficulty.js', '../ui/atl-bank-curriculum.js', '../ui/atl-bank-planner.js',
        '../ui/atl-bank-vocabulary.js', '../../shared/text-usage.js');
    }
    await writeFile(workerPath, worker.replace(marker, marker + additions.map(path => JSON.stringify(path)).join(',') + ','));
  }
}
