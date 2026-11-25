// Keep the original bank actions and the notebook editor in one runtime.
export function integrateNotebook(source) {
  const replace = (original, replacement) => {
    if (source.split(original).length !== 2) {
      throw new Error('Revisar el punto de integración de Cuadernos: ' + original);
    }
    source = source.replace(original, () => replacement);
  };


  // Catalogue presentation belongs to the integrated app, not the pinned upstream.
  replace("import { openSupabaseSyncModal } from './supabase-sync-modal.js';\n", '');
  const syncStart = source.indexOf("    const sync = el('details', 'cuaderno-home-sync');");
  const syncEnd = source.indexOf('    home.append(sync);', syncStart);
  if (syncStart < 0 || syncEnd < 0) throw Error('Revisar la retirada de Supabase de Cuadernos.');
  source = source.slice(0, syncStart) + source.slice(syncEnd + '    home.append(sync);'.length);
  replace("    home.append(el('h3', '', 'Cuaderno de textos latinos'));", "    home.classList.add('atl-notebook-catalog');");
  replace("    heading.append(el('h4', '', 'Mis cuadernos'));", "    const headingCopy = el('div', 'atl-notebook-heading-copy');\n    headingCopy.append(el('span', 'atl-notebook-eyebrow', 'BIBLIOTECA PERSONAL'), el('h4', '', 'Mis cuadernos'));\n    heading.append(headingCopy);");
  replace("    const grid = el('div', 'cuaderno-home-grid');", "    const grid = el('div', 'cuaderno-home-grid');\n    grid.setAttribute('aria-label', 'Cuadernos guardados');");
  replace("    if (!saved.length)\n        grid.append(el('p', 'muted', 'No hay cuadernos todavía. Puedes crear uno nuevo.'));", "    headingCopy.append(el('p', 'muted', saved.length + (saved.length === 1 ? ' cuaderno guardado' : ' cuadernos guardados')));\n    if (!saved.length)\n        grid.append(el('p', 'atl-notebook-empty muted', 'No hay cuadernos todavía. Puedes crear uno nuevo.'));");
  const cardStart = source.indexOf("        card.append(el('h5', '', edition.title));");
  const cardEnd = source.indexOf('        if (edition.legacyNotebookId !== null)', cardStart);
  if (cardStart < 0 || cardEnd < 0) throw Error('Revisar el catálogo de cuadernos.');
  source = source.slice(0, cardStart) + `        const cover = el('div', 'atl-notebook-card-main');
        const title = el('h5');
        const openTitle = button(edition.title, () => openNotebook(edition.id), 'atl-notebook-title');
        openTitle.setAttribute('aria-label', 'Abrir cuaderno «' + edition.title + '»');
        title.append(openTitle);
        const count = el('span', 'atl-notebook-count', edition.placements.length + (edition.placements.length === 1 ? ' texto' : ' textos'));
        cover.append(title, count);
        const meta = el('dl', 'atl-notebook-meta');
        meta.append(el('dt', '', 'Curso'), el('dd', '', edition.notebookCourse || 'Sin especificar'),
            el('dt', '', 'Curso académico'), el('dd', '', edition.academicYear || 'Sin especificar'));
        card.append(cover, meta);
` + source.slice(cardEnd);
  replace("        card.append(buttons);", "        buttons.append(button('Editar datos', () => editNotebookMetadata(record), 'hbtn'));\n        card.append(buttons);");
  replace('function renderHome() {', `async function editNotebookMetadata(record) {
    const edition = record.edition;
    const content = el('div', 'atl-notebook-metadata-form');
    const field = (label, value, placeholder, maxLength) => {
        const wrapper = el('label', '');
        const input = el('input');
        input.type = 'text';
        input.value = value;
        input.placeholder = placeholder;
        input.maxLength = maxLength;
        wrapper.append(el('span', '', label), input);
        content.append(wrapper);
        return input;
    };
    const course = field('Curso', edition.notebookCourse ?? '', 'Ej. 2.º de Bachillerato', 100);
    const year = field('Curso académico', edition.academicYear ?? '', 'Ej. 2026-2027', 20);
    const error = el('p', 'small');
    error.setAttribute('role', 'alert');
    content.append(error);
    let saving = false;
    const modal = M.modal('Datos de «' + edition.title + '»', content, [
        { label: 'Cancelar' },
        { label: 'Guardar datos', primary: true, onclick: async () => {
            if (saving) return false;
            saving = true;
            try {
                if (!await composer.flush()) throw Error('Hay cambios pendientes de guardar.');
                const timestamp = new Date().toISOString();
                await workspace.commitEdition(edition.id, record.revision,
                    { command: 'ui.edit-notebook-metadata', targetId: edition.id, timestamp },
                    previous => {
                        if (!previous) throw Error('El cuaderno ya no existe.');
                        return { ...previous, updatedAt: timestamp, notebookCourse: course.value.trim(), academicYear: year.value.trim() };
                    });
                await reload();
                render();
                return true;
            } catch (cause) {
                error.textContent = 'No se han guardado los datos: ' + (cause.message || String(cause));
                return false;
            } finally { saving = false; }
        }}
    ]);
}
function renderHome() {`);

  source = "import { installPauCvSeed, pauCvIdentity, isVerifiedPauTag } from './atl-pau-cv-seed.js';\n" + source;
  source = "import { importPauCv } from './atl-pau-cv-import.js';\n" + source;
  replace('        await composer.open();\n        wireButtons();', `        await composer.open();
    try {
        if (await installPauCvSeed({ repo, loadCombinedCorpus, validateCorpus, grammarCatalogue: allGrammarTags })) await reload();
    } catch (error) {
        console.warn('Banco inicial PAU CV:', error);
        M.toast('No se ha podido incorporar el banco inicial PAU CV. Tus datos no se han modificado.', 7000);
    }
    wireButtons();`);
  source += `\nfunction openPauCvImport() {
    importPauCv({ modal: (...args) => M.modal(...args), toast: message => M.toast(message), save: records => writeSource(async () => {
        const current = await repo.load();
        const existing = await loadCombinedCorpus();
        let next = current.corpus, count = 0;
        const identities = new Set(existing.texts.map(pauCvIdentity).filter(Boolean));
        for (const { doc, year, session, option, notes } of records) {
            const key = pauCvIdentity({teacherDocx:doc});
            if (key && identities.has(key)) continue;
            const id = 'doc.' + crypto.randomUUID();
            next = upsertText(next, { title: doc.title, latin: doc.latin, author: doc.author,
                work: doc.work, reference: doc.reference, notes: ['PAU CV · ' + session + ' ' + year + ' · Opción ' + option, notes].filter(Boolean).join('\\n'),
                selectividad: {year, community: 'Comunidad Valenciana'}, pauCv: doc.pauCv, courseIds: ['2bach'], origin: {kind:'own'} }, id, new Date().toISOString());
            next = validateCorpus({...next,texts:next.texts.map(t => t.id === id ? {...t,teacherDocx:doc} : t)});
            if (key) identities.add(key);count++;
        }
        if (count) { await repo.save(next,current.revision);await reload();render(); }
        return count;
    }) });
}
`;
  source = "import { bankTagAssignable, bankTagVisible, isGrammarGrouping, isRetiredTag, compactGrammarTags, infinitiveId, isInfinitiveTag, matchesInfinitive, matchesSelectividad, selectividadLabel, selectividadSession, compareSelectividadYear } from './atl-bank-curriculum.js';\n" + source;
  source = "import { selectividadEditor, showBankPlanner } from './atl-bank-planner.js';\n" + source;
  source = "import { assessBankDifficulty, difficultyEvidence, difficultyText } from './atl-bank-difficulty.js';\n" + source;
  source = "import { appendDuplicateCards, createBankFilters, createInfinitiveAssignment, openBankReader } from './atl-bank-catalog.js';\n" + source;
  source = "import { contextualBankAnalysis, rulesVersion } from './atl-bank-context.js';\n" + source;
  source = "import { analyzeBankText, bankAnalysisIndex, bankReviewKey, carryBankReview, readBankReview, visibleBankAnalysis } from './atl-bank-review.js';\n" + source;
  source = "import { vocabularyEditor } from './atl-bank-vocabulary.js';\n" + source;
  source = "import { findTextUses, loadUsageIndex, recordedSourceIds, usageList } from '../../shared/text-usage.js';\n" + source;
  source = "import { notebookTexts } from '../core/editor-operations.js';\n" + source;
  source += "\nwindow.atlNotebookFlush = () => composer.flush();\n";
  replace('        void startCuadernoPwa();', '');
  replace("    document.querySelector('body > header')?.append(control);\n    setTheme(saved);",
    "    document.querySelector('body > header')?.append(control);\n    window.atlSetTheme = setTheme;\n    setTheme(window.parent.document.documentElement.dataset.theme || saved);");
  source += `\nwindow.atlOpenRelated = async (id, placementId, kind) => {
    if (kind === 'histórico') {
        const { corpus } = await repo.load();
        const book = corpus.notebooks.find(item => item.id === id);
        if (!book) throw new Error('El cuaderno histórico ya no está disponible.');
        const section = el('div');
        for (const [index, text] of notebookTexts(corpus, book).entries()) {
            if (!text) continue;
            const passage = el('details');
            passage.open = placementId === index + 1;
            passage.append(el('summary', '', (index + 1) + '. ' + text.title),
                el('p', 'atl-reader-latin', text.latin));
            section.append(passage);
        }
        M.modal('Cuaderno histórico · ' + book.title, section, [{label: 'Cerrar'}]);
        return;
    }
    await openNotebook(id);
    if (currentId === id && placementId && await composer.selectPlacement(placementId)) render();
};\n`;
  replace('    const bank = el(\'section\', \'cuaderno-home-bank\');', `    return home;
}

const bankState = { query: '', author: 'all', sort: 'author-asc', difficulty: '', work: '', reference: '', origin: '', course: '', usage: '', exam: false, excludeExam: false, examYear: '', examCommunity: '', examProgress: '', mode: 'all', tags: [], includePending: false };
let refreshBankProposals = () => {};
let bankAutomaticTags = () => [];
let refreshBankUses = () => {};
const bankAnalysisQueue = new Map();
let bankAnalysisRunning = false;

function scheduleBankAnalysis(texts, onResult = () => {}) {
    for (const text of texts) bankAnalysisQueue.set(text.id, { text, onResult });
    if (bankAnalysisRunning) return;
    bankAnalysisRunning = true;
    setTimeout(async () => {
        try {
            while (bankAnalysisQueue.size) {
                const [id, { text, onResult }] = bankAnalysisQueue.entries().next().value;
                bankAnalysisQueue.delete(id);
                const isCurrent = () => corpus.texts.some(item => item.id === text.id && item.latin === text.latin);
                if (!isCurrent()) continue;
                try {
                    const saved = await analyzeBankText(text, analyzeLatin,
                        (latin, tokens) => contextualBankAnalysis(latin, tokens, proposeCollatinusGrammar), isCurrent);
                    if (saved && isCurrent()) onResult(text, saved);
                } catch (error) {
                    console.warn('Análisis del Banco', error);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } finally {
            bankAnalysisRunning = false;
        }
    }, 0);
}


async function showTextUses(text) {
    const matches = findTextUses(await loadUsageIndex(), text);
    const modal = M.modal('Usos de «' + text.title + '»', usageList(matches, (document, placement) => {
        modal.close();
        window.parent.atlOpenRelated(document, placement).catch(error => M.toast(error.message, 6500));
    }), [{label: 'Cerrar'}]);
}

let usedSourceIds = new Set();
let usesReady = false;
let usesUnavailable = false;
let usageRequest = 0;
function updateUseBadges(view) {
    if (!view?.isConnected) return;
    for (const badge of view.querySelectorAll('[data-atl-source-use]')) {
        badge.hidden = !usedSourceIds.has(badge.dataset.atlSourceUse);
    }
}

// Progress is metadata, not a new revision of the Latin text.
async function setPauDone(id, done) {
    await writeSource(async () => {
        const historical = await repo.load();
        const editorial = await workspace.loadCorpus();
        const update = current => {
            let changed = false;
            const texts = current.texts.map(text => {
                if (!text.selectividad || (id !== null && text.id !== id) ||
                    Boolean(text.selectividad.hecho) === done) return text;
                changed = true;
                const selectividad = { ...text.selectividad };
                if (done) selectividad.hecho = true;
                else delete selectividad.hecho;
                return { ...text, selectividad };
            });
            return changed ? validateCorpus({ ...current, texts }) : current;
        };
        const nextHistorical = update(historical.corpus);
        const nextEditorial = update(editorial.corpus);
        if (nextHistorical !== historical.corpus) await repo.save(nextHistorical, historical.revision);
        if (nextEditorial !== editorial.corpus) await workspace.saveCorpus(nextEditorial, editorial.revision);
    });
    await reload();
    render();
}
function renderBank() {
    const bank = el('section', 'cuaderno-home-bank');`);
  replace('    home.append(bank);\n    return home;\n}', `    return bank;
}

let bankView;
function syncBankView() {
    const editor = document.getElementById('editor');
    const view = document.documentElement.dataset.atlView || location.hash.slice(1);
    const showBank = view === 'banco';
    document.body.dataset.atlBank = String(showBank);
    document.body.dataset.cuadernoHome = String(showBank || !active());
    if (showBank && !bankView) {
        bankView = el('div', 'card cuaderno-home atl-bank');
        bankView.append(renderBank());
        editor.append(bankView);
    }
    for (const section of editor.children) {
        section.hidden = (section === bankView) !== showBank;
    }
    if (showBank) {
        const request = ++usageRequest;
        void loadUsageIndex().then(entries => {
            if (request !== usageRequest) return;
            usedSourceIds = recordedSourceIds(corpus.texts, entries);
            usesReady = true;
            usesUnavailable = false;
            updateUseBadges(bankView);
            refreshBankUses();
        }).catch(() => {
            if (request !== usageRequest) return;
            usesUnavailable = true;
            refreshBankUses();
        });
    }
}

window.addEventListener('atl-view', () => {
    if (document.getElementById('editor').dataset.atlReady) syncBankView();
});`);
  replace('    [corpus, notebooks] = await Promise.all([loadCombinedCorpus(), workspace.listEditions()]);', `    const previous = corpus;
    [corpus, notebooks] = await Promise.all([loadCombinedCorpus(), workspace.listEditions()]);
    if (previous) {
        const latinById = new Map(previous.texts.map(text => [text.id, text.latin]));
        scheduleBankAnalysis(corpus.texts.filter(text => latinById.get(text.id) !== text.latin));
    }`);
  replace('    left.replaceChildren();', `    left.replaceChildren();
    left.dataset.atlReady = 'true';
    bankView = undefined;
    queueMicrotask(syncBankView);`);

  replace("button('Pegar en el banco', () => pasteText('bank'), 'hbtn primary')",
    "button('Pegar en el banco', () => pasteText('bank'), 'hbtn primary'), button('Biblioteca latina', openLibrary, 'hbtn')");
  replace("    if (!active()) {\n        M.toast('Abre o crea un cuaderno antes de seleccionar textos.', 5000);",
    "    if (!active() && document.body.dataset.atlBank !== 'true') {\n        M.toast('Abre o crea un cuaderno antes de seleccionar textos.', 5000);");
  replace("    void M.openLibrary().catch(e => M.toast('Biblioteca: ' + String(e), 5500));", `    const library = document.getElementById('lib');
    const fromBank = document.body.dataset.atlBank === 'true';
    library.dataset.atlBankOverlay = String(fromBank);
    void M.openLibrary().then(() => {
        library.querySelector('[data-act="close"]').textContent = fromBank ? 'Volver al banco' : 'Volver al cuaderno';
        library.querySelector('[data-act="use"]').textContent = fromBank ? 'Guardar en el banco' : 'Añadir al cuaderno';
    }).catch(e => M.toast('Biblioteca: ' + String(e), 5500));`);
  replace('M.setTextFromLibrary = (fragment) => {', `M.setTextFromLibrary = (fragment) => {
    if (document.getElementById('lib').dataset.atlBankOverlay === 'true') {
        const title = [fragment.obra, fragment.cita].filter(Boolean).join(' · ') || fragment.author;
        void writeSource(() => saveBankText({
            title, latin: fragment.text, author: fragment.author, work: fragment.obra, reference: fragment.cita,
            origin: { kind: 'library', urn: fragment.urn },
        })).catch(error => M.toast('No se ha guardado el fragmento: ' + String(error), 6500));
        return;
    }`);
  replace("        title: nextNotebookTextTitle(composer.activeEdition()?.placements ?? []),\n        latin: fragment.text, author: fragment.author, work: fragment.obra, reference: fragment.cita,",
    "        title: nextNotebookTextTitle(composer.activeEdition()?.placements ?? []),\n        latin: fragment.text, author: fragment.author, work: fragment.obra, reference: fragment.cita,\n        origin: { kind: 'library', urn: fragment.urn },");
  replace('let next = upsertText(loaded.corpus, { ...data, id }, id, new Date().toISOString());',
    `const ownVocabulary = current.teacherDocx && changedLatin ? glossary.read({ asOwn: true })
                : current.teacherDocx ? undefined : vocabulary;
            let next = upsertText(loaded.corpus, { ...data, id, origin: current.origin,
                vocabulary: ownVocabulary ?? current.vocabulary }, id, new Date().toISOString());
            if (saveCopy && !changedLatin) next = attachGrammarTags(next, id, current.tagIds, allGrammarTags(corpus));`);
  replace("        reference: source.source.reference ?? '', latin: source.latin,",
    "        reference: source.source.reference ?? '', latin: source.latin, notes: source.notes ?? '',");
  replace("        ['title', 'Título didáctico'], ['author', 'Autor'], ['work', 'Obra'],\n        ['reference', 'Referencia'], ['latin', 'Texto latino'],",
    "        ['title', 'Título didáctico'], ['author', 'Autor'], ['work', 'Obra'],\n        ['reference', 'Referencia'], ['latin', 'Texto latino'], ['notes', 'Notas de la ficha'],");
  replace("    if (source.teacherDocx)\n        form.append(", `    const courseField = el('fieldset', 'atl-bank-courses');
    courseField.append(el('legend', '', 'Cursos para los que es apto el texto'));
    const courseChecks = new Map();
    for (const [id, label] of [['1bach', '1.º Bachillerato'], ['2bach', '2.º Bachillerato']]) {
        const check = el('input');
        check.type = 'checkbox';
        check.checked = (source.courseIds ?? []).includes(id);
        courseChecks.set(id, check);
        const row = el('label', 'atl-tag-option');
        row.append(check, el('span', '', label));
        courseField.append(row);
    }
    const difficulty = el('select');
    difficulty.setAttribute('aria-label', 'Dificultad docente');
    difficulty.append(new Option('Automática', ''));
    for (let level = 1; level <= 5; level++) difficulty.append(new Option(difficultyText(level), String(level)));
    difficulty.value = source.difficulty === undefined ? '' : String(source.difficulty);
    const difficultyField = el('label', 'field atl-difficulty-editor');
    const estimate = el('span', 'small muted');
    difficultyField.append(el('span', '', 'Dificultad docente'), difficulty, estimate);
    difficulty.setAttribute('aria-describedby', 'atl-difficulty-estimate');
    estimate.id = 'atl-difficulty-estimate';
    const updateEstimate = () => {
        const latin = inputs.get('latin').value.trim();
        const unchanged = latin === source.latin;
        const result = assessBankDifficulty(unchanged ? source : { latin }, unchanged ? bankAutomaticTags(source.id) : []);
        estimate.textContent = 'Estimación automática: ' + difficultyText(result.estimate) + ' · ' + difficultyEvidence(result);
    };
    inputs.get('latin').addEventListener('input', updateEstimate);
    updateEstimate();
    const exam = selectividadEditor(source.selectividad);
    const sessionInfo = selectividadSession(source);
    if (sessionInfo) exam.container.append(el('p', 'small muted', 'Convocatoria: ' + sessionInfo.label));
    form.append(courseField, difficultyField, exam.container);
    const glossary = vocabularyEditor(source);
    form.append(glossary.section);
    if (source.teacherDocx)
        form.append(`);
  replace("        const data = { title: value('title'), author: value('author'), work: value('work'),\n            reference: value('reference'), latin: value('latin') };",
    "        const data = { title: value('title'), author: value('author'), work: value('work'),\n            reference: value('reference'), latin: value('latin'), notes: value('notes'), difficulty: difficulty.value ? Number(difficulty.value) : null, selectividad: exam.read(), courseIds: [...courseChecks].filter(([, check]) => check.checked).map(([id]) => id) };");
  replace('            const loaded = await repo.load();\n            const current = loaded.corpus.texts.find(t => t.id === source.id);',
    `            await writeSource(async () => {
            const historical = await repo.load();
            const primary = historical.corpus.texts.some(text => text.id === source.id);
            const loaded = primary ? historical : await workspace.loadCorpus();
            const current = loaded.corpus.texts.find(t => t.id === source.id);
            const vocabulary = glossary.read();`);
  replace('            if (same) {', `            if (same && data.difficulty === (current.difficulty ?? null) && JSON.stringify(data.selectividad) === JSON.stringify(current.selectividad ?? null) &&
                JSON.stringify(data.courseIds) === JSON.stringify(current.courseIds ?? [])) {`);
  replace('const saveCopy = linked || (changedLatin && Boolean(current.teacherDocx));',
    `const saveCopy = linked && !same && !current.teacherDocx;
            if (changedLatin && current.teacherDocx &&
                !window.confirm('Vas a modificar el texto latino importado de Word en esta misma ficha. ' +
                    'Las marcas y el vocabulario originales del DOCX dejarán de estar vinculados ' +
                    'a la nueva versión del texto. Los cuadernos ya creados conservarán su copia. ¿Continuar?')) return;`);
  replace("                data.reference === (current.source.reference ?? '');",
    "                data.reference === (current.source.reference ?? '') && data.notes === (current.notes ?? '') &&\n                (vocabulary === undefined || JSON.stringify(vocabulary) === JSON.stringify(current.teacherDocx?.vocabulary ?? current.vocabulary ?? []));");
  replace('            if (!confirmPossibleDuplicates(loaded.corpus, data, current.id))\n                return;',
    `            if (!same && (data.latin !== current.latin || data.author !== (current.source.author ?? '') ||
                data.work !== (current.source.work ?? '') || data.reference !== (current.source.reference ?? '')) &&
                !confirmPossibleDuplicates(await loadCombinedCorpus(), data, current.id)) return;`);
  replace('            if (!saveCopy && current.teacherDocx) {', '            if (!changedLatin && current.teacherDocx) {');
  replace("author: data.author || null, work: data.work || null, reference: data.reference || null };",
    "author: data.author || null, work: data.work || null, reference: data.reference || null,\n                    vocabulary: vocabulary ?? current.teacherDocx.vocabulary };");
  replace('            await repo.save(next, loaded.revision);\n            await reload();',
    `            if (primary) await repo.save(next, loaded.revision);
            else await workspace.saveCorpus(next, loaded.revision);
            let reviewNotice = '';
            try {
                const savedSource = next.texts.find(item => item.id === id);
                const needsReview = await carryBankReview(current, savedSource);
                if (needsReview) reviewNotice = ' Revisa los anclajes afectados por los cambios en el latín.';
            } catch {
                reviewNotice = ' El navegador no pudo actualizar el historial de anclajes.';
            }
            await reload();`);
  replace("            M.toast(saveCopy ? 'Versión nueva guardada; el original está protegido.' :\n                'Ficha del banco actualizada.');",
    "            M.toast((saveCopy ? 'Versión nueva guardada; el original está protegido.' :\n                'Ficha del banco actualizada.') + reviewNotice);");
  replace("                'Ficha del banco actualizada.') + reviewNotice);\n        }",
    "                'Ficha del banco actualizada.') + reviewNotice);\n            });\n        }");
  replace('function openBankTextEditor(source) {', 'function openBankTextEditor(source, onClose, navigation) {');
  replace("    form.append(save);\n    form.addEventListener('submit', event => { event.preventDefault(); save.click(); });\n    const modal = M.modal('Editar texto del banco', form, [{ label: 'Cancelar' }], { width: 'min(760px, 96vw)', noFocus: true });",
    `    const remove = button('Eliminar del banco', async () => {
        if (save.disabled) return;
        remove.disabled = save.disabled = true;
        try {
            await removeBankText(source);
            if (!corpus.texts.some(text => text.id === source.id)) close();
        } finally {
            save.disabled = false;
            remove.disabled = protectedBankSourceIds().has(source.id);
        }
    }, 'tbtn');
    remove.disabled = protectedBankSourceIds().has(source.id);
    const actions = el('div', 'atl-bank-edit-actions');
    actions.append(save, remove);
    if (remove.disabled) actions.append(el('span', 'small muted', 'Ficha protegida por un cuaderno histórico.'));
    form.classList.add('atl-bank-edit-form');
    const main = el('div', 'atl-bank-edit-main');
    const metadata = el('aside', 'atl-bank-edit-meta');
    const wordCount = el('span', 'atl-edit-word-count');
    const latinHeading = el('div', 'atl-edit-section-heading');
    latinHeading.append(el('h3', '', 'Texto latino'), wordCount);
    const latin = inputs.get('latin');
    latin.lang = 'la';
    const updateCount = () => {
        const count = latin.value.trim().split(/\\s+/u).filter(Boolean).length;
        wordCount.textContent = count + (count === 1 ? ' palabra' : ' palabras');
    };
    latin.addEventListener('input', updateCount);
    updateCount();
    const titleField = inputs.get('title').closest('label');
    titleField.classList.add('atl-edit-title-field');
    const latinField = latin.closest('label');
    latinField.classList.add('atl-edit-latin-field');
    latin.rows = 1;
    // Measure the actual wrapped lines, not a character-count approximation.
    const fitLatin = () => {
        if (!latin.isConnected || !latin.clientWidth) return;
        latin.style.height = '0px';
        const border = latin.offsetHeight - latin.clientHeight;
        latin.style.height = Math.ceil(latin.scrollHeight + border) + 'px';
    };
    let latinWidth = 0;
    const latinSizeObserver = new ResizeObserver(() => {
        const width = latin.clientWidth;
        if (width && width !== latinWidth) {
            latinWidth = width;
            fitLatin();
        }
    });
    latin.addEventListener('input', fitLatin);
    const notes = inputs.get('notes').closest('label');
    const notesPanel = el('details', 'atl-edit-notes');
    notesPanel.append(el('summary', '', 'Notas y contexto'), notes);
    notesPanel.open = Boolean(source.notes);
    const grammarSection = el('section', 'atl-text-grammar');
    grammarSection.setAttribute('aria-label', 'Etiquetas gramaticales confirmadas');
    const confirmed = el('div', 'grammar-chips atl-reader-tags');
    const grammar = allGrammarTags(corpus);
    const visible = source.tagIds.filter(bankTagAssignable);
    for (const id of visible) {
        const item = grammar.find(tag => tag.id === id);
        if (!item) continue;
        const chip = el('span', 'grammar-chip', item.label);
        chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, grammar)) ?? 'custom';
        confirmed.append(chip);
    }
    if (!confirmed.childElementCount) confirmed.append(el('span', 'small muted', 'Sin etiquetas confirmadas'));
    const grammarHeading = el('div', 'atl-edit-section-heading atl-edit-grammar-heading');
    const editTags = button('Editar etiquetas', () => {
        if (save.disabled) return;
        if (dirty()) {
            if (!window.confirm('Hay cambios sin guardar. ¿Guardarlos antes de editar las etiquetas?')) return;
            tagDestination = source.id;
            save.click();
        } else {
            tagDestination = source.id;
            close();
        }
    }, 'hbtn atl-edit-tags');
    grammarHeading.append(el('h3', '', 'Etiquetas gramaticales'), editTags);
    grammarSection.append(grammarHeading, confirmed);
    const automatic = el('div', 'grammar-chips atl-reader-tags atl-reader-automatic');
    for (const id of new Set(bankAutomaticTags(source.id))) {
        const item = grammar.find(tag => tag.id === id);
        if (item && !source.tagIds.includes(id) && bankTagAssignable(id))
            automatic.append(el('span', 'grammar-chip', item.label + ' · Automática'));
    }
    if (automatic.childElementCount) grammarSection.append(el('h4', '', 'Etiquetas automáticas'), automatic);
    const staleTags = el('p', 'small muted', 'El texto latino ha cambiado; las etiquetas corresponden a la versión guardada.');
    staleTags.hidden = true;
    latin.addEventListener('input', () => { staleTags.hidden = latin.value === source.latin; });
    grammarSection.append(staleTags);
    const identity = el('section', 'atl-edit-identity');
    const citation = el('p', 'atl-edit-citation');
    const updateCitation = () => {
        citation.textContent = ['author', 'work', 'reference'].map(key => inputs.get(key).value.trim()).filter(Boolean).join(' · ') || 'Sin referencia bibliográfica';
    };
    for (const key of ['author', 'work', 'reference']) inputs.get(key).addEventListener('input', updateCitation);
    updateCitation();
    const classification = el('div', 'atl-edit-classification');
    if (source.selectividad) classification.append(el('span', 'atl-edit-class-chip', selectividadLabel(source)));
    for (const course of source.courseIds ?? []) classification.append(el('span', 'atl-edit-class-chip', course === '1bach' ? '1.º Bachillerato' : '2.º Bachillerato'));
    identity.append(titleField, citation, classification);
    const passage = el('section', 'atl-edit-passage');
    passage.append(latinHeading, latinField);
    const supplementary = el('div', 'atl-edit-supplementary');
    supplementary.append(notesPanel, glossary.section);
    main.append(identity, passage, grammarSection, supplementary);
    const bibliographic = el('div', 'atl-edit-bibliography');
    bibliographic.append(el('h3', '', 'Referencia bibliográfica'),
        inputs.get('author').closest('label'), inputs.get('work').closest('label'),
        inputs.get('reference').closest('label'));
    exam.container.classList.add('atl-edit-exam');
    const teaching = el('div', 'atl-edit-teaching');
    teaching.append(el('h3', '', 'Clasificación docente'), courseField, difficultyField, exam.container);
    metadata.append(bibliographic, teaching);
    const columns = el('div', 'atl-bank-edit-columns');
    columns.append(main, metadata);
    form.prepend(columns);
    // The save operation keeps its existing validation and concurrency checks.
    const status = el('span', 'atl-edit-dirty', 'Sin cambios');
    status.setAttribute('role', 'status');
    const snapshot = () => JSON.stringify([...form.querySelectorAll('input, textarea, select')].map(field =>
        [field.type, field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value]));
    const initial = snapshot();
    const dirty = () => snapshot() !== initial;
    const updateDirty = () => { status.textContent = dirty() ? 'Cambios sin guardar' : 'Sin cambios'; status.dataset.dirty = String(dirty()); };
    form.addEventListener('input', updateDirty);
    form.addEventListener('change', updateDirty);
    form.addEventListener('click', () => queueMicrotask(updateDirty));
    const nav = el('nav', 'atl-edit-nav');
    nav.setAttribute('aria-label', 'Navegar por las fichas filtradas');
    const position = el('span', 'atl-edit-position');
    const ordered = navigation?.results() ?? [source];
    const index = ordered.findIndex(item => item.id === source.id);
    let destination = null, tagDestination = null, bypassClose = false;
    const move = offset => {
        if (save.disabled || index < 0) return;
        const target = ordered[index + offset];
        if (!target) return;
        if (dirty()) {
            if (!window.confirm('Hay cambios sin guardar. ¿Guardarlos y abrir la otra ficha?')) return;
            destination = target.id;
            save.click();
        } else {
            destination = target.id;
            close();
        }
    };
    const previous = button('Anterior', () => move(-1), 'hbtn atl-edit-nav-button');
    const next = button('Siguiente', () => move(1), 'hbtn atl-edit-nav-button');
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index >= ordered.length - 1;
    position.textContent = index < 0 ? 'Fuera del filtro' : (index + 1) + ' de ' + ordered.length;
    nav.append(previous, position, next);
    const guard = () => bypassClose || (!save.disabled && (!dirty() || window.confirm('¿Cerrar la ficha sin guardar los cambios?')));
    const afterClose = () => {
        latinSizeObserver.disconnect();
        const tagId = tagDestination;
        tagDestination = null;
        if (tagId) {
            queueMicrotask(() => {
                const current = corpus.texts.find(item => item.id === tagId);
                if (!current) { onClose?.(); M.toast('El texto ya no está en el banco.'); return; }
                tagBankText(current, returnedId => {
                    queueMicrotask(() => {
                        const updated = corpus.texts.find(item => item.id === (returnedId ?? tagId));
                        if (updated) openBankTextEditor(updated, onClose, navigation);
                        else onClose?.();
                    });
                }, navigation);
            });
            return;
        }
        const id = destination;
        destination = null;
        if (!id) { onClose?.(); return; }
        queueMicrotask(() => {
            const eligible = navigation?.results() ?? [];
            const target = eligible.find(item => item.id === id);
            if (target) openBankTextEditor(target, onClose, navigation);
            else { onClose?.(); M.toast('El texto ya no coincide con los filtros activos.'); }
        });
    };
    form.append(actions);
    actions.prepend(status);
    for (const notice of [...form.children].filter(child => child.matches('p.small.muted'))) { notice.classList.add('atl-edit-import-notice'); main.append(notice); }
    form.addEventListener('submit', event => { event.preventDefault(); save.click(); });
    const modal = M.modal('Editar texto del banco', form, [{ label: 'Cancelar' }], {
        width: 'min(1200px, 98vw)', noFocus: true, beforeClose: guard, onClose: afterClose
    });
    modal.el.classList.add('atl-bank-editor-modal');
    fitLatin();
    latinSizeObserver.observe(latinField);
    document.fonts?.ready.then(fitLatin);
    modal.el.querySelector('.mh').insertBefore(nav, modal.el.querySelector('.xbtn'));
    const cancel = modal.el.querySelector('.mf button');
    cancel.type = 'button';
    cancel.classList.add('atl-edit-cancel');
    actions.insertBefore(cancel, save);
    const footer = modal.el.querySelector('.mf');
    footer.classList.add('atl-edit-footer');
    footer.replaceChildren(actions);
    const rawClose = modal.close;
    const finish = () => { bypassClose = true; try { rawClose(); } finally { bypassClose = false; } };
    // Existing callers assign close = modal.close after this block.
    modal.close = finish;`); 
  const editorSaveStart = source.indexOf('function openBankTextEditor(');
  const editorSaveEnd = source.indexOf('    const remove = button(', editorSaveStart);
  if (editorSaveStart < 0 || editorSaveEnd < 0) throw Error('Revisar guardado de la ficha.');
  let editorSave = source.slice(editorSaveStart, editorSaveEnd);
  const notesField = "const field = key === 'latin' ? el('textarea') : el('input');";
  if (editorSave.split(notesField).length !== 2) throw Error('Revisar campo de notas de ficha.');
  editorSave = editorSave.replace(notesField, "const field = key === 'latin' || key === 'notes' ? el('textarea') : el('input');");
  const saveBegin = "const save = button('Guardar cambios', async () => {";
  const existingTry = '        save.disabled = true;\n        try {';
  if (editorSave.split(saveBegin).length !== 2 || editorSave.split(existingTry).length !== 2)
    throw Error('Revisar inicio del guardado del editor.');
  editorSave = editorSave.replace(existingTry, '').replace(saveBegin,
    saveBegin + '\n        if (save.disabled) return;\n        save.disabled = true;\n        form.inert = true;\n        try {');
  // If saving a protected text creates a copy, edit tags on the actual saved copy.
  const tagSaveAnchor = '            await reload();';
  if (editorSave.split(tagSaveAnchor).length !== 2) throw Error('Revisar destino del editor de etiquetas.');
  editorSave = editorSave.replace(tagSaveAnchor, tagSaveAnchor + '\n            if (tagDestination) tagDestination = id;');
  const saveFinally = /finally\s*\{\s*save\.disabled = false;\s*\}/gu;
  if ([...editorSave.matchAll(saveFinally)].length !== 1) throw Error('Revisar fin de guardado de ficha.');
  source = source.slice(0, editorSaveStart) + editorSave.replace(saveFinally,
    'finally { save.disabled = false; form.inert = false; destination = null; tagDestination = null; }') + source.slice(editorSaveEnd);
  replace('function openDuplicateAudit() {', "function openDuplicateAudit({ type = 'all', query: previousQuery = '', limit = 30 } = {}) {");
  replace("        ' No se cambia ni se borra ningún texto. Comprueba los pasajes antes de editar.'));",
    "        ' Comprueba los pasajes antes de editar las fichas.'));");
  replace('    let close = () => { }, visible = 30;',
    "    filter.value = type;\n    search.value = previousQuery;\n    let close = () => { }, visible = limit;");
  const firstPair = source.indexOf('        for (const pair of chosen.slice(0, visible)) {');
  const afterPairs = source.indexOf('        if (chosen.length > visible)', firstPair);
  if (firstPair < 0 || afterPairs < 0) throw new Error('Revisar las tarjetas de la auditoría.');
  source = source.slice(0, firstPair) + `        appendDuplicateCards(results, chosen.slice(0, visible), sources, {
            kindLabel, sourceReference, referencedIn, passage,
            edit(text) {
                const state = { type: filter.value, query: search.value, limit: visible };
                close();
                openBankTextEditor(text, () => openDuplicateAudit(state));
            }
        });
` + source.slice(afterPairs);
  replace('            if (matches.length)\n                card.append(', `            for (const match of matches) {
                const existing = corpus.texts.find(text => text.id === match.textId);
                if (!existing) continue;
                card.append(button('Abrir ficha «' + existing.title + '»', () => {
                    const preview = el('div');
                    preview.append(el('p', 'muted', [existing.source.author, existing.source.work, existing.source.reference]
                        .filter(Boolean).join(' · ')), el('p', 'atl-reader-latin', existing.latin));
                    M.modal(existing.title, preview, [{label: 'Volver a la importación'}]);
                }, 'tbtn'));
            }
            if (matches.length)
                card.append(`);
  replace("(m.kind === 'citation' ? 'misma referencia' : 'fragmento coincidente')",
    "(m.kind === 'citation' ? 'misma referencia con contenido distinto' : m.kind === 'identical' ? 'texto idéntico' : 'coincidencia parcial')");
  replace('en el banco general de Inicio.', 'en la pestaña Banco de textos.');
  replace("    bankToolbar.append(bankField('Buscar', search, 'cuaderno-bank-search'), bankField('Autor', authorSelect, ''), bankField('Ordenar por', sortSelect, ''), bankField('Ver', viewSelect, ''));", `    const catalogue = allGrammarTags(corpus);
    const filters = createBankFilters(corpus.texts, catalogue, bankState, populate);
    refreshBankUses = () => { if (bank.isConnected && bankState.usage) populate(); };
    const analysisIndex = new Map();
    const pendingIndex = new Map();
    const automaticFor = id => analysisIndex.get(id)?.automatic ?? [];
    bankAutomaticTags = automaticFor;
    const difficultyFor = text => assessBankDifficulty(text, automaticFor(text.id));
    const difficultySelect = el('select');
    difficultySelect.setAttribute('aria-label', 'Filtrar textos por dificultad');
    difficultySelect.append(new Option('Cualquier nivel', ''));
    for (let level = 1; level <= 5; level++) difficultySelect.append(new Option(difficultyText(level), String(level)));
    difficultySelect.value = bankState.difficulty;
    difficultySelect.addEventListener('change', populate);
    sortSelect.append(new Option('Dificultad: menor primero', 'difficulty-asc'),
        new Option('Dificultad: mayor primero', 'difficulty-desc'),
        new Option('Selectividad: año ascendente', 'exam-year-asc'),
        new Option('Selectividad: año descendente', 'exam-year-desc'));
    const pendingFor = id => bankState.includePending ? pendingIndex.get(id) ?? [] : [];
    const setAnalysis = (id, result) => {
        analysisIndex.set(id, result);
        pendingIndex.set(id, result.pending);
    };
    let refreshTimer;
    const refreshResults = () => {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => {
            refreshTimer = undefined;
            if (bank.isConnected) populate();
        }, 100);
    };
    function openPlanner() {
        showBankPlanner({
            read: async filtered => {
                const texts = filtered ? currentResults() : corpus.texts;
                const saved = await bankAnalysisIndex(texts, catalogue, isRejectedProposal);
                return { texts, catalogue, automatic: new Map([...saved].map(([id, review]) => [id, review.automatic])),
                    pendingAnalyses: texts.some(text => !saved.get(text.id)?.current) };
            },
            match: matchesGrammarTag,
            create: async (title, plan) => writeSource(async () => {
                const latest = await loadCombinedCorpus();
                const current = new Map(latest.texts.map(text => [text.id, text]));
                if (plan.some(({ text }) => JSON.stringify(text) !== JSON.stringify(current.get(text.id))))
                    throw Error('El Banco cambió desde la previsualización. Actualiza la cobertura.');
                const id = await composer.createNotebookNamed(title, plan);
                if (!id) throw Error('No se pudo crear el cuaderno.');
                currentId = id;
                rememberNotebook();
                await reload();
                render();
                return id;
            }),
            modal: (...args) => M.modal(...args)
        });
    }
    bankActions.append(button('Crear cuaderno por trimestres', () => openPlanner(), 'hbtn'));
    const loadAnalysis = async () => {
        const saved = await bankAnalysisIndex(corpus.texts, catalogue, isRejectedProposal);
        if (!bank.isConnected) return;
        // Rebuild the index: a deleted cache or a changed text must not keep
        // stale automatic tags visible from the previous refresh.
        analysisIndex.clear();
        pendingIndex.clear();
        for (const [id, result] of saved) setAnalysis(id, result);
        populate();
        scheduleBankAnalysis(corpus.texts.filter(text => !saved.get(text.id)?.current), (text, review) => {
            if (!bank.isConnected) return;
            const live = corpus.texts.find(item => item.id === text.id && item.latin === text.latin);
            if (!live) return;
            const next = visibleBankAnalysis(live, review, catalogue, isRejectedProposal);
            const previous = analysisIndex.get(text.id);
            setAnalysis(text.id, next);
            if (JSON.stringify(previous) !== JSON.stringify(next) && (previous || next.automatic.length || next.pending.length))
                refreshResults();
        });
    };
    refreshBankProposals = () => void loadAnalysis().catch(error => console.warn('Etiquetas del Banco', error));
    setTimeout(refreshBankProposals, 0);
    search.value = bankState.query;
    if (Array.from(authorSelect.options).some(option => option.value === bankState.author)) authorSelect.value = bankState.author;
    sortSelect.value = bankState.sort;
    bankToolbar.append(bankField('Buscar', search, 'cuaderno-bank-search'), bankField('Autor', authorSelect, ''),
        bankField('Obra', filters.work, ''), bankField('Referencia', filters.reference, ''), bankField('Procedencia', filters.origin, ''),
        bankField('Uso', filters.usage, ''), bankField('Ordenar por', sortSelect, ''), bankField('Ver', viewSelect, ''));`);
  replace('    const catalogue = allGrammarTags(corpus);\n    // Los filtros', '    // Los filtros');
  replace('    bank.append(bankToolbar);', '    bank.append(bankToolbar, filters.panel);');
  replace("        viewSelect.value = 'all';\n        populate();", "        difficultySelect.value = '';\n        filters.reset();\n        populate();");
  replace('    function currentResults() {', `    function currentResults() {
        const { work, reference, origin, course, usage, mode, tags, exam, excludeExam, examYear, examCommunity, examProgress, infTime, infVoice } = filters.read();
        const referenceNeedle = foldLatin(reference);`);
  replace("            const author = t.source.author?.trim() ?? '';", `            const author = t.source.author?.trim() ?? '';
            if (difficultySelect.value && String(difficultyFor(t).level) !== difficultySelect.value) return false;
            if (!matchesSelectividad(t, examYear, examCommunity, exam, excludeExam)) return false;
            if (examProgress && (!t.selectividad || Boolean(t.selectividad.hecho) !== (examProgress === 'done'))) return false;
            if (work && t.source.work?.trim() !== work) return false;
            if (course === 'unassigned' ? (t.courseIds ?? []).length > 0 :
                course && !(t.courseIds ?? []).includes(course)) return false;
            if (referenceNeedle && !foldLatin(t.source.reference ?? '').includes(referenceNeedle)) return false;
            if (origin && (t.origin?.kind ?? 'unknown') !== origin) return false;
            if (usage && usedSourceIds.has(t.id) !== (usage === 'used')) return false;
            if (tags.length) {
                const effectiveTags = [...t.tagIds, ...automaticFor(t.id), ...pendingFor(t.id)];
                const matches = id => id === infinitiveId ? matchesInfinitive(effectiveTags, infTime, infVoice) :
                    matchesGrammarFilters(effectiveTags, [id], catalogue);
                if (!(mode === 'any' ? tags.some(matches) : tags.every(matches))) return false;
            }`);
  replace("            if (sortSelect.value === 'work-asc')\n                return workOrder || authorOrder || titleOrder || compare(a.id, b.id);",
    "            if (sortSelect.value === 'work-asc')\n                return workOrder || authorOrder || compareFilled(a.source.reference ?? '', b.source.reference ?? '') || titleOrder || compare(a.id, b.id);");
  replace('            return authorOrder || workOrder || titleOrder || compare(a.id, b.id);', `            if (sortSelect.value.startsWith('exam-year-')) {
                const order = compareSelectividadYear(a, b, sortSelect.value === 'exam-year-desc');
                if (order) return order;
            }
            if (sortSelect.value.startsWith('difficulty-')) {
                const left = difficultyFor(a).level;
                const right = difficultyFor(b).level;
                if (left === null || right === null) return Number(right !== null) - Number(left !== null) || titleOrder || compare(a.id, b.id);
                const levelOrder = sortSelect.value === 'difficulty-desc' ? right - left : left - right;
                if (levelOrder) return levelOrder;
            }
            const referenceOrder = compareFilled(a.source.reference ?? '', b.source.reference ?? '');
            return authorOrder || workOrder || referenceOrder || titleOrder || compare(a.id, b.id);`);
  replace("        const isFiltered = Boolean(search.value.trim()) || authorSelect.value !== 'all';", `        const criteria = filters.read();
        Object.assign(bankState, criteria, { query: search.value, author: authorSelect.value, sort: sortSelect.value, difficulty: difficultySelect.value });
        const isFiltered = Boolean(search.value.trim() || difficultySelect.value || criteria.work || criteria.reference.trim() || criteria.origin || criteria.usage || criteria.course || criteria.exam || criteria.excludeExam || criteria.examYear || criteria.examCommunity || criteria.examProgress ||
            criteria.tags.length || criteria.includePending) || authorSelect.value !== 'all';
        if (criteria.usage && !usesReady) {
            bankResultCount.textContent = usesUnavailable ? 'No se pudo consultar el historial de usos.' : 'Consultando los usos registrados…';
            selectedButton.disabled = true;
            resetBankFilters.disabled = false;
            return;
        }
        selectedButton.disabled = false;`);
  replace('        const matching = currentResults();\n        const criteria = filters.read();',
    '        const criteria = filters.read();');
  replace('        selectedButton.disabled = false;', '        selectedButton.disabled = false;\n        const matching = currentResults();');
  replace("        resetBankFilters.disabled = !isFiltered && sortSelect.value === 'author-asc' && viewSelect.value === 'all';",
    "        resetBankFilters.disabled = !isFiltered && sortSelect.value === 'author-asc' && criteria.mode === 'all';");
  const rowStart = '            const row = el(\'details\', \'cuaderno-home-text\');';
  replace(rowStart, "            const row = el('article', 'cuaderno-home-text');");
  replace("            const rowSummary = el('summary', 'cuaderno-home-text-heading');",
    "            const rowSummary = el('div', 'cuaderno-home-text-heading');");
  replace('            rowSummary.append(titleGroup);', `            const read = el('button', 'atl-bank-card');
            read.type = 'button';
            read.append(titleGroup);
            const assessment = difficultyFor(text);
            const difficulty = el('span', 'atl-card-difficulty', assessment.level ? assessment.level + '/5' : '–');
            difficulty.dataset.manual = String(assessment.manual);
            difficulty.dataset.level = assessment.level ?? '';
            difficulty.setAttribute('aria-label', 'Dificultad ' + difficultyText(assessment.level) +
                (assessment.manual ? ' · Docente' : ' · Estimada'));
            difficulty.title = difficulty.getAttribute('aria-label');
            const cardMeta = el('span', 'atl-card-meta');
            if (Number.isInteger(text.selectividad?.year)) {
                const year = el('span', 'atl-card-pau-year', String(text.selectividad.year));
                year.setAttribute('aria-label', 'Año de Selectividad: ' + text.selectividad.year);
                cardMeta.append(year);
            }
            cardMeta.append(difficulty);
            read.append(cardMeta);
            read.title = 'Editar ficha';
            read.dataset.sourceId = text.id;
            const restoreFocus = () => {
                const current = [...document.querySelectorAll('.atl-bank-card')].find(item => item.dataset.sourceId === text.id);
                current?.focus({ preventScroll: true });
            };
            const navigation = { results: () => currentResults().filter(item => Boolean(item.selectividad) === Boolean(text.selectividad)) };
            read.addEventListener('click', () => openBankTextEditor(text, restoreFocus, navigation));
            const openReader = () => openBankReader({
                texts: navigation.results(), selected: text, catalogue, modal: (...args) => M.modal(...args),
                edit: item => openBankTextEditor(item, restoreFocus, navigation), tag: item => tagBankText(item, restoreFocus, navigation), remove: removeBankText, usage: showTextUses,
                pendingTags: bankState.includePending ? pendingIndex : undefined, automaticFor, difficultyFor,
                isProtected: item => protectedIds.has(item.id),
                onClose: restoreFocus,
                onError: error => M.toast(String(error), 7000)
            });
            rowSummary.append(read);`);
  replace("            const titleGroup = el('span', 'cuaderno-home-text-heading-info');", `            if (text.selectividad) sourceParts.push(selectividadLabel(text));
            const source = sourceParts.join(' · ');
            const titleGroup = el('span', 'cuaderno-home-text-heading-info');`);
  replace("            const source = [text.source.author, text.source.work, text.source.reference]\n                .filter(Boolean).join(' · ');",
    "            const sourceParts = [text.source.author, text.source.work, text.source.reference].filter(Boolean);");
  const inlineStart = "            row.append(el('p', 'cuaderno-home-latin', text.latin));";
  const inlineEnd = '            target.append(row);';
  const start = source.indexOf(inlineStart);
  const end = source.indexOf(inlineEnd, start);
  if (start < 0 || end < 0) throw new Error('Revisar las tarjetas del banco.');
  source = source.slice(0, start) + `            const chips = el('div', 'grammar-chips cuaderno-bank-row-tags');
            for (const course of text.courseIds ?? []) {
                chips.append(el('span', 'grammar-chip', course === '1bach' ? '1.º Bachillerato' : '2.º Bachillerato'));
            }
            const chosenTags = text.tagIds.filter(bankTagAssignable).sort((a, b) => Number(b.startsWith('custom.')) - Number(a.startsWith('custom.')));
            for (const id of chosenTags.slice(0, 2)) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip', item.label));
            }
            const pendingPriority = id => bankState.tags.includes(id) ? 2 :
                bankState.tags.some(filter => filter === infinitiveId
                    ? matchesInfinitive([id], bankState.infTime, bankState.infVoice)
                    : matchesGrammarTag(id, filter, catalogue)) ? 1 : 0;
            const pendingChips = pendingFor(text.id).filter(bankTagAssignable)
                .sort((a, b) => pendingPriority(b) - pendingPriority(a));
            for (const id of pendingChips.filter((id, index) => index === 0 || pendingPriority(id) > 0)) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip atl-pending-tag', 'Pendiente: ' + item.label));
            }
            const automatic = automaticFor(text.id).filter(bankTagAssignable);
            const reviewCount = analysisIndex.get(text.id)?.pending.filter(bankTagAssignable).length ?? 0;
            for (const id of automatic.slice(0, Math.max(0, 2 - chosenTags.length))) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip', item.label + ' · Automática'));
            }
            const remaining = Math.max(0, automatic.length + chosenTags.length - 2);
            if (remaining) chips.append(el('span', 'small muted', '+' + remaining));
            if (reviewCount && !bankState.includePending) chips.append(el('span', 'small muted', reviewCount + ' pendientes'));
            const usage = el('span', 'small muted', 'Usado en documentos');
            usage.dataset.atlSourceUse = text.id;
            usage.hidden = !usedSourceIds.has(text.id);
            chips.append(usage);
            row.append(chips);
` + source.slice(end);
  const listingStart = source.indexOf('        const addLazyRows =');
  const listingEnd = source.indexOf("    search.addEventListener('input', populate);", listingStart);
  if (listingStart < 0 || listingEnd < 0) throw Error('Revisar el listado del Banco.');
  source = source.slice(0, listingStart) + `        const chosen = [];
        const exams = [];
        for (const text of matching) (text.selectividad ? exams : chosen).push(text);
        appendBankSection('Textos elegidos', chosen);
        appendBankSection('Selectividad', exams);
    }
    function appendBankSection(title, texts) {
        if (!texts.length) return;
        const section = el('section', 'atl-bank-results-section');
        section.setAttribute('aria-label', title);
        const cards = el('div', 'cuaderno-home-bank-list');
        section.append(el('h4', '', title + ' (' + texts.length + ')'), cards);
        listing.append(section);
        const visible = visibleBySection.get(title) ?? pageSize;
        appendTextRows(cards, texts.slice(0, visible));
        if (visible < texts.length) {
            const more = button('Mostrar más textos (' + (texts.length - visible) + ' restantes)', () => {
                visibleBySection.set(title, visible + pageSize);
                populate();
                listing.querySelector('[aria-label="' + title + '"]')?.querySelectorAll('.atl-bank-card')[visible]?.focus();
            }, 'hbtn cuaderno-bank-show-more');
            cards.append(more);
        }
    }
` + source.slice(listingEnd);
  replace("    const listing = el('div', 'cuaderno-home-bank-list');",
    "    const listing = el('div', 'atl-bank-list');\n    const pageSize = 36;\n    const visibleBySection = new Map();");
  replace("    const sourceTags = new Map(corpus.texts.map(text => [text.id, text.tagIds]));\n    const idsFor = (id) => sourceTags.get(id) ?? [];\n", '');
  replace("    viewSelect.addEventListener('change', populate);", '');
  const viewStart = source.indexOf("    const viewSelect = el('select');");
  const viewEnd = source.indexOf("    const bankToolbar =", viewStart);
  if (viewStart < 0 || viewEnd < 0) throw Error('Revisar el selector de vista del Banco.');
  source = source.slice(0, viewStart) + source.slice(viewEnd);
  replace(`        bankResultCount.textContent = 'Mostrando ' + matching.length + ' de ' + corpus.texts.length +
            (corpus.texts.length === 1 ? ' texto' : ' textos') + ' · ' + (viewSelect.value === 'tags' ? 'clasificados por etiquetas' :
            viewSelect.value === 'list' ? 'lista ordenada' : 'lista y etiquetas');`, `        bankResultCount.textContent = 'Mostrando ' + matching.length + ' de ' + corpus.texts.length +
            (corpus.texts.length === 1 ? ' texto' : ' textos');`);
  replace("    passage.append(el('summary', '', 'Texto latino'), el('p', '', text.latin));",
    "    const fullPassage = el('p', '', text.latin);\n    passage.append(el('summary', '', 'Texto latino'), fullPassage);");
  replace("            row.append(proposalContext(text.latin, proposal));", `            row.append(proposalContext(text.latin, proposal));
            row.addEventListener('toggle', () => {
                if (!row.open) {
                    if (fullPassage.dataset.proposal === key) {
                        delete fullPassage.dataset.proposal;
                        fullPassage.textContent = text.latin;
                    }
                    return;
                }
                passage.open = true;
                fullPassage.dataset.proposal = key;
                fullPassage.replaceChildren(text.latin.slice(0, proposal.start),
                    el('mark', '', phrase), text.latin.slice(proposal.end));
            });`);
  const reviewLoad = source.indexOf('            if (!reviewKey) {');
  const reviewLoadEnd = source.indexOf('            const tokens = await analyzeLatin(text.latin);', reviewLoad);
  if (reviewLoad < 0 || reviewLoadEnd < 0) throw new Error('Revisar la carga de propuestas de Collatinus.');
  source = source.slice(0, reviewLoad) + '            await reviewReady;\n' + source.slice(reviewLoadEnd);
  replace('            const tokens = await analyzeLatin(text.latin);\n            pending = proposeCollatinusGrammar(text.latin, tokens);', `            const saved = await analyzeBankText(text, analyzeLatin,
                (latin, tokens) => contextualBankAnalysis(latin, tokens, proposeCollatinusGrammar),
                () => corpus.texts.some(item => item.id === text.id && item.latin === text.latin));
            if (!saved) return;
            pending = saved.pending;
            refreshBankProposals();`);
  replace("            status.textContent = pending.length + ' propuestas obtenidas; ninguna se añade automáticamente.';",
    "            status.textContent = 'Análisis completado.';");
  replace("    review.append(passage, analyze, status, result);", `    const complete = el('details', 'cuaderno-bank-evidence');
    complete.append(el('summary', '', 'Análisis morfológico completo'));
    let completeRequested = false;
    complete.addEventListener('toggle', async () => {
        if (!complete.open || completeRequested) return;
        completeRequested = true;
        const list = el('div');
        complete.append(list);
        list.textContent = 'Consultando Collatinus…';
        try {
            const tokens = await analyzeLatin(text.latin);
            if (!complete.isConnected) return;
            list.replaceChildren();
            for (const token of tokens) {
                const word = el('details');
                const chosen = token.cands?.find(candidate => candidate.lid === token.sel?.lid &&
                    candidate.morphos.includes(token.sel.morpho));
                word.append(el('summary', '', token.w + (chosen ? ' · ' + chosen.lemma + ' · ' +
                    (token.sel.morpho || chosen.im) : '')));
                for (const candidate of token.cands ?? []) {
                    for (const morph of candidate.morphos) {
                        if (candidate === chosen && morph === token.sel.morpho) continue;
                        word.append(el('p', 'small', candidate.lemma + ' · ' + (morph || candidate.im)));
                    }
                }
                list.append(word);
            }
        } catch (error) {
            list.textContent = 'Collatinus no está disponible para este pasaje.';
            completeRequested = false;
            complete.addEventListener('toggle', () => list.remove(), { once: true });
        }
    });
    review.append(passage, analyze, status, result, complete);`);
  replace("    M.modal('Etiquetas de «' + text.title + '»', panel, [{ label: 'Cancelar' },", `    const reviewReady = bankReviewKey(text).then(key => {
        reviewKey = key;
        const saved = readBankReview(key, text.latin);
        for (const rejectedKey of saved.rejected) rejected.add(rejectedKey);
        for (const [proposal, tag] of saved.corrected) corrected.set(proposal, tag);
        pending = saved.version === rulesVersion ? saved.pending : saved.pending.filter(proposal => {
            const key = proposalKey(proposal);
            return corrected.has(key) || isRejectedProposal(proposal, rejected, all);
        });
        if (pending.length) renderProposals();
        return saved;
    }).catch(() => { /* El etiquetado manual sigue disponible. */ });
    void reviewReady.then(async saved => {
        if (saved?.version === rulesVersion || !panel.isConnected) return;
        const current = await analyzeBankText(text, analyzeLatin,
            (latin, tokens) => contextualBankAnalysis(latin, tokens, proposeCollatinusGrammar),
            () => corpus.texts.some(item => item.id === text.id && item.latin === text.latin));
        if (current && panel.isConnected) {
            pending = current.pending;
            renderProposals();
        }
    }).catch(() => { status.textContent = 'No se pudo completar el análisis del pasaje.'; });
    M.modal('Etiquetas de «' + text.title + '»', panel, [{ label: 'Cancelar' },`);
  replace("{ label: 'Guardar etiquetas', primary: true, onclick: async () => {",
    "{ label: 'Guardar etiquetas', primary: true, onclick: async () => {\n                await reviewReady;");
  replace('JSON.stringify({ rejected: [...rejected], corrected: [...corrected] })',
    'JSON.stringify({ ...readBankReview(reviewKey, text.latin), rejected: [...rejected], corrected: [...corrected] })');
  replace('const discarded = isRejectedProposal(proposal, rejected, all), accepted = selected.has(acceptedTag);',
    'const discarded = isRejectedProposal(proposal, rejected, all), accepted = corrected.has(key) && selected.has(acceptedTag);');
  replace("const label = discarded ? 'Descartada' : accepted ? 'Confirmada' : 'Pendiente';",
    "const label = discarded ? 'Descartada' : accepted ? 'Confirmada' : proposal.state === 'automatic' ? 'Automática' : 'Pendiente';");
  replace("row.dataset.state = discarded ? 'dismissed' : accepted ? 'confirmed' : 'pending';",
    "row.dataset.state = discarded ? 'dismissed' : accepted ? 'confirmed' : proposal.state ?? 'pending';");
  replace('        for (const proposal of pending) {', `        const automaticWasOpen = result.dataset.automaticOpen === 'true';
        const automatic = el('details', 'atl-automatic-proposals');
        automatic.open = automaticWasOpen;
        automatic.append(el('summary', '', 'Etiquetas automáticas'));
        automatic.addEventListener('toggle', () => { result.dataset.automaticOpen = String(automatic.open); });
        for (const proposal of pending) {`);
  replace('            result.append(row);\n        }', `            if (row.dataset.state === 'automatic') automatic.append(row);
            else result.append(row);
        }
        if (automatic.children.length > 1) result.append(automatic);`);
  replace('choose.value = selections.get(key) ?? proposal.tagId;', 'choose.value = selections.get(key) ?? acceptedTag;');
  replace('            const acceptedTag = corrected.get(key) ?? proposal.tagId;',
    "            if (isGrammarGrouping(proposal.tagId) || isRetiredTag(proposal.tagId) || (!bankTagVisible(proposal.tagId) && !proposal.tagId.startsWith('gram.verbo.') && proposal.tagId !== 'gram.ut')) continue;\n            if (isVerifiedPauTag(text, proposal.tagId)) continue;\n            const acceptedTag = corrected.get(key) ?? proposal.tagId;");
  return source;
}
