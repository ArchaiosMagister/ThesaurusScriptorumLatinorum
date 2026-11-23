// Keep the original bank actions and the notebook editor in one runtime.
export function integrateNotebook(source) {
  const replace = (original, replacement) => {
    if (source.split(original).length !== 2) {
      throw new Error('Revisar el punto de integración de Cuadernos: ' + original);
    }
    source = source.replace(original, () => replacement);
  };

  source = "import { assessBankDifficulty, difficultyEvidence, difficultyText } from './atl-bank-difficulty.js';\n" + source;
  source = "import { appendDuplicateCards, createBankFilters, openBankReader } from './atl-bank-catalog.js';\n" + source;
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

const bankState = { query: '', author: 'all', sort: 'author-asc', difficulty: '', work: '', reference: '', origin: '', usage: '', mode: 'all', tags: [], includePending: false };
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
  replace("    if (source.teacherDocx)\n        form.append(", `    const difficulty = el('select');
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
    form.append(difficultyField);
    const glossary = vocabularyEditor(source);
    form.append(glossary.section);
    if (source.teacherDocx)
        form.append(`);
  replace("        const data = { title: value('title'), author: value('author'), work: value('work'),\n            reference: value('reference'), latin: value('latin') };",
    "        const data = { title: value('title'), author: value('author'), work: value('work'),\n            reference: value('reference'), latin: value('latin'), notes: value('notes'), difficulty: difficulty.value ? Number(difficulty.value) : null };");
  replace('            const loaded = await repo.load();\n            const current = loaded.corpus.texts.find(t => t.id === source.id);',
    `            await writeSource(async () => {
            const historical = await repo.load();
            const primary = historical.corpus.texts.some(text => text.id === source.id);
            const loaded = primary ? historical : await workspace.loadCorpus();
            const current = loaded.corpus.texts.find(t => t.id === source.id);
            const vocabulary = glossary.read();`);
  replace('            if (same) {', '            if (same && data.difficulty === (current.difficulty ?? null)) {');
  replace('const saveCopy = linked || (changedLatin && Boolean(current.teacherDocx));',
    'const saveCopy = (linked && !same) || (changedLatin && Boolean(current.teacherDocx));');
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
  replace('function openBankTextEditor(source) {', 'function openBankTextEditor(source, onClose) {');
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
    form.append(actions);
    form.addEventListener('submit', event => { event.preventDefault(); save.click(); });
    const modal = M.modal('Editar texto del banco', form, [{ label: 'Cancelar' }], { width: 'min(760px, 96vw)', noFocus: true, onClose });`);
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
        new Option('Dificultad: mayor primero', 'difficulty-desc'));
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
    const loadAnalysis = async () => {
        const saved = await bankAnalysisIndex(corpus.texts, catalogue, isRejectedProposal);
        if (!bank.isConnected) return;
        for (const [id, result] of saved) setAnalysis(id, result);
        populate();
        scheduleBankAnalysis(corpus.texts, (text, review) => {
            if (!bank.isConnected) return;
            const next = visibleBankAnalysis(text, review, catalogue, isRejectedProposal);
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
        const { work, reference, origin, usage, mode, tags } = filters.read();
        const referenceNeedle = foldLatin(reference);`);
  replace("            const author = t.source.author?.trim() ?? '';", `            const author = t.source.author?.trim() ?? '';
            if (difficultySelect.value && String(difficultyFor(t).level) !== difficultySelect.value) return false;
            if (work && t.source.work?.trim() !== work) return false;
            if (referenceNeedle && !foldLatin(t.source.reference ?? '').includes(referenceNeedle)) return false;
            if (origin && (t.origin?.kind ?? 'unknown') !== origin) return false;
            if (usage && usedSourceIds.has(t.id) !== (usage === 'used')) return false;
            if (tags.length) {
                const effectiveTags = [...t.tagIds, ...automaticFor(t.id), ...pendingFor(t.id)];
                const matches = id => matchesGrammarFilters(effectiveTags, [id], catalogue);
                if (!(mode === 'any' ? tags.some(matches) : tags.every(matches))) return false;
            }`);
  replace("            if (sortSelect.value === 'work-asc')\n                return workOrder || authorOrder || titleOrder || compare(a.id, b.id);",
    "            if (sortSelect.value === 'work-asc')\n                return workOrder || authorOrder || compareFilled(a.source.reference ?? '', b.source.reference ?? '') || titleOrder || compare(a.id, b.id);");
  replace('            return authorOrder || workOrder || titleOrder || compare(a.id, b.id);', `            if (sortSelect.value.startsWith('difficulty-')) {
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
        const isFiltered = Boolean(search.value.trim() || difficultySelect.value || criteria.work || criteria.reference.trim() || criteria.origin || criteria.usage ||
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
            difficulty.setAttribute('aria-label', 'Dificultad ' + difficultyText(assessment.level) +
                (assessment.manual ? ' · Docente' : ' · Estimada'));
            difficulty.title = difficulty.getAttribute('aria-label');
            read.append(difficulty);
            read.addEventListener('click', () => openBankReader({
                texts: currentResults(), selected: text, catalogue, modal: (...args) => M.modal(...args),
                edit: openBankTextEditor, tag: tagBankText, remove: removeBankText, usage: showTextUses,
                pendingTags: bankState.includePending ? pendingIndex : undefined, automaticFor, difficultyFor,
                isProtected: item => protectedIds.has(item.id),
                onClose: () => read.focus({ preventScroll: true }),
                onError: error => M.toast(String(error), 7000)
            }));
            rowSummary.append(read);`);
  const inlineStart = "            row.append(el('p', 'cuaderno-home-latin', text.latin));";
  const inlineEnd = '            target.append(row);';
  const start = source.indexOf(inlineStart);
  const end = source.indexOf(inlineEnd, start);
  if (start < 0 || end < 0) throw new Error('Revisar las tarjetas del banco.');
  source = source.slice(0, start) + `            const chips = el('div', 'grammar-chips cuaderno-bank-row-tags');
            const chosenTags = [...text.tagIds].sort((a, b) => Number(b.startsWith('custom.')) - Number(a.startsWith('custom.')));
            for (const id of chosenTags.slice(0, 2)) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip', item.label));
            }
            for (const id of pendingFor(text.id).slice(0, 1)) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip atl-pending-tag', 'Pendiente: ' + item.label));
            }
            const automatic = automaticFor(text.id);
            const reviewCount = analysisIndex.get(text.id)?.pending.length ?? 0;
            for (const id of automatic.slice(0, Math.max(0, 2 - text.tagIds.length))) {
                const item = catalogue.find(tag => tag.id === id);
                if (item) chips.append(el('span', 'grammar-chip', item.label + ' · Automática'));
            }
            const remaining = Math.max(0, automatic.length + text.tagIds.length - 2);
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
  source = source.slice(0, listingStart) + `        appendTextRows(listing, matching.slice(0, visibleResults));
        if (visibleResults < matching.length) listing.append(button(
            'Mostrar más textos (' + (matching.length - visibleResults) + ' restantes)', () => {
                visibleResults += 36;
                populate();
                listing.querySelectorAll('.atl-bank-card')[visibleResults - 36]?.focus();
            }, 'hbtn cuaderno-bank-show-more'));
    }
` + source.slice(listingEnd);
  replace("    const listing = el('div', 'cuaderno-home-bank-list');",
    "    const listing = el('div', 'cuaderno-home-bank-list');\n    let visibleResults = 36;");
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
  return source;
}
