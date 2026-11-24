export function modernizeBank(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Revisar la interfaz del banco: ' + before);
    source = source.replace(before, () => after);
  };
  replace("        if (!selected.size) {", "        if (![...selected].some(bankTagAssignable)) {");
  replace("        for (const id of selected) {", "        for (const id of [...selected].filter(bankTagAssignable)) {");
  replace("    manual.append(search);", "    manual.append(createInfinitiveAssignment(setTag), search);");
  replace("            const chip = el('span', 'grammar-chip', nameOf(id));", `            const chip = isInfinitiveTag(id)
                ? button(nameOf(id) + ' ×', () => setTag(id, false), 'grammar-chip')
                : el('span', 'grammar-chip', nameOf(id));
            if (isInfinitiveTag(id)) chip.setAttribute('aria-label', 'Quitar «' + nameOf(id) + '»');`);
  replace("                for (const tag of all) {",
    "                for (const tag of all.filter(item => bankTagAssignable(item.id) || item.id === acceptedTag)) {");
  replace("    const manual = el('details', 'cuaderno-bank-manual');",
    `    const custom = el('form', 'atl-create-tag');
    const name = el('input');
    name.placeholder = 'Ej. Repaso del segundo trimestre';
    name.setAttribute('aria-label', 'Nombre de etiqueta propia');
    const feedback = el('p', 'small muted');
    feedback.setAttribute('role', 'status');
    const create = button('Añadir etiqueta propia', () => {
        const label = name.value.trim();
        if (!isCustomTagLabelValid(label)) {
            feedback.textContent = 'Introduce un nombre de etiqueta válido.';
            name.focus();
            return;
        }
        let tag = findTagByLabel(label, all);
        if (tag && !bankTagVisible(tag.id)) {
            feedback.textContent = 'Ese nombre se reserva para una categoría gramatical.';
            return;
        }
        if (!tag) {
            tag = { id: 'custom.' + crypto.randomUUID(), label, kind: 'custom', parentId: null };
            all.push(tag);
            appendTagOption(tag, list);
        }
        setTag(tag.id, true);
        feedback.textContent = '«' + tag.label + '» se aplicará al guardar.';
        name.value = '';
        name.focus();
    }, 'hbtn');
    custom.addEventListener('submit', event => { event.preventDefault(); create.click(); });
    custom.append(el('strong', '', 'Etiqueta propia'), name, create, feedback);
    panel.append(custom);
    const manual = el('details', 'cuaderno-bank-manual');`);
  replace("    for (const tag of all) {\n        const label = el('label', 'cuaderno-bank-tag-option'), check = el('input');",
    "    function appendTagOption(tag, target) {\n        const label = el('label', 'cuaderno-bank-tag-option'), check = el('input');");
  replace("        list.append(label);\n    }\n    search.addEventListener('input', () => {",
    "        target.append(label);\n    }\n    for (const tag of all.filter(item => bankTagAssignable(item.id) && !isInfinitiveTag(item.id))) appendTagOption(tag, list);\n    search.addEventListener('input', () => {");
  replace("                        const next = attachGrammarTags(saved.corpus, text.id, [...selected], allGrammarTags(corpus));",
    `                        const latest = allGrammarTags(saved.corpus, allGrammarTags(corpus));
                        const ids = [...selected].map(id => {
                            const staged = all.find(tag => tag.id === id);
                            return latest.some(tag => tag.id === id) ? id : findTagByLabel(staged.label, latest)?.id ?? id;
                        });
                        const next = attachGrammarTags(saved.corpus, text.id, ids, [...latest, ...all]);`);
  replace("el('span', 'cuaderno-bank-eyebrow', 'ARCHIVO DE TEXTOS'), el('h4', '', 'Banco de textos propios'), el('p', 'small muted', 'Consulta, ordena y edita tus pasajes sin abrir un cuaderno.')",
    "el('h4', '', 'Banco de textos propios')");
  replace("    bankActions.append(button('Pegar en el banco', () => pasteText('bank'), 'hbtn primary'), button('Biblioteca latina', openLibrary, 'hbtn'), button('Importar Word al banco', () => importWord('bank'), 'hbtn'), button('Auditar textos repetidos', openDuplicateAudit, 'hbtn'));",
    `    const addActions = el('div', 'atl-bank-action-group');
    addActions.setAttribute('aria-label', 'Añadir textos');
    addActions.append(button('Pegar en el banco', () => pasteText('bank'), 'hbtn primary'),
        button('Importar Word al banco', () => importWord('bank'), 'hbtn'),
        button('Importar PDF · PAU CV', openPauCvImport, 'hbtn'),
        button('Biblioteca latina', openLibrary, 'hbtn'));
    bankActions.append(addActions, button('Auditar textos repetidos', openDuplicateAudit, 'tbtn'));`);
  const from = source.indexOf("    bankToolbar.append(bankField('Buscar'");
  const to = source.indexOf('    const resetBankFilters', from);
  if (from < 0 || to < 0) throw Error('Revisar los filtros del banco.');
  source = source.slice(0, from) + `    bankToolbar.classList.add('atl-search-toolbar');
    const searchField = bankField('Buscar en el banco', search, 'cuaderno-bank-search');
    search.placeholder = 'Título, texto latino, autor, obra o referencia…';
    const searchClear = button('×', () => { search.value = ''; populate(); search.focus(); }, 'atl-search-clear');
    searchClear.setAttribute('aria-label', 'Borrar búsqueda');
    searchClear.hidden = !search.value;
    searchField.append(searchClear);
    bankToolbar.append(searchField, bankField('Curso', filters.course, 'atl-primary-course'),
        bankField('Autor', authorSelect, ''), bankField('Dificultad', difficultySelect, ''),
        bankField('Ordenar por', sortSelect, ''));
    const moreFilters = el('div', 'atl-bank-more');
    moreFilters.id = 'atl-bank-more-filters';
    moreFilters.hidden = !bankState.moreFilters;
    const filterToggle = button('Más filtros', () => {
        moreFilters.hidden = !moreFilters.hidden;
        bankState.moreFilters = !moreFilters.hidden;
        filterToggle.setAttribute('aria-expanded', String(bankState.moreFilters));
    }, 'tbtn');
    filterToggle.setAttribute('aria-controls', moreFilters.id);
    filterToggle.setAttribute('aria-expanded', String(!moreFilters.hidden));
    const filterFields = el('div', 'atl-bank-more-fields');
    filterFields.append(bankField('Obra', filters.work, ''), bankField('Referencia', filters.reference, ''),
        bankField('Procedencia', filters.origin, ''), bankField('Uso', filters.usage, ''));
    moreFilters.append(el('h5', 'atl-facet-heading', 'Procedencia y uso'));
    const examFields = el('div', 'atl-bank-more-fields');
    examFields.append(filters.examLabel, bankField('Año de Selectividad', filters.examYear, ''),
        bankField('Comunidad autónoma', filters.examCommunity, ''));
    moreFilters.append(filterFields, el('h5', 'atl-facet-heading', 'Selectividad'), examFields);
    const filterChips = el('div', 'grammar-chips atl-bank-active-tags');
    filterChips.setAttribute('aria-label', 'Etiquetas de filtro activas');
` + source.slice(to);
  replace('    bank.append(bankToolbar, filters.panel);', `    const shortcuts = el('div', 'grammar-chips atl-bank-tag-shortcuts');
    shortcuts.setAttribute('aria-label', 'Etiquetas usadas en el banco');
    const counts = new Map();
    for (const text of corpus.texts) for (const id of text.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const frequent = catalogue.filter(tag => counts.has(tag.id) && bankTagVisible(tag.id) && !isInfinitiveTag(tag.id)).sort((a, b) =>
        Number(b.kind === 'custom') - Number(a.kind === 'custom') ||
        counts.get(b.id) - counts.get(a.id) || bankCollator.compare(a.label, b.label)).slice(0, 5);
    const quickTags = new Map();
    for (const item of frequent) {
        const chip = button(item.label + ' · ' + counts.get(item.id), () => filters.toggleTag(item.id), 'grammar-chip atl-bank-tag-chip');
        chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(item.id, group, catalogue)) ?? 'custom';
        chip.setAttribute('aria-label', 'Ver textos con «' + item.label + '»');
        quickTags.set(item.id, chip);
        shortcuts.append(chip);
    }
    const quick = el('div', 'atl-bank-quick-tags');
    quick.hidden = !frequent.length;
    quick.append(el('span', 'atl-quick-label', 'Etiquetas frecuentes'), shortcuts);
    moreFilters.append(el('h5', 'atl-facet-heading', 'Gramática'), filters.panel);
    const searchPanel = el('div', 'atl-bank-search-panel');
    searchPanel.append(bankToolbar, quick, filterChips);
    bank.append(searchPanel);`);
  replace('    bank.append(bankResultCount);', `    const resultsHeader = el('div', 'atl-bank-results-header');
    const filterCount = el('span', 'atl-filter-count');
    filterCount.hidden = true;
    filterCount.setAttribute('aria-hidden', 'true');
    const filterTools = el('div', 'atl-filter-tools');
    filterTools.append(filterToggle, filterCount, resetBankFilters);
    resultsHeader.append(bankResultCount, filterTools);
    searchPanel.append(resultsHeader, moreFilters);`);
  replace('    bank.append(bulk);', '    resultsHeader.append(bulk);');
  replace(`    bulk.append(el('p', 'small muted', 'Selecciona los resultados de la búsqueda o marca textos individuales. ' +
        'Los cuadernos editoriales no se borrarán. Los textos de cuadernos históricos están protegidos.'));`, '');
  replace("            selection.append(checkbox, el('span', '', 'Seleccionar'));", '            selection.append(checkbox);');

  replace("    const bulk = el('div', 'cuaderno-bank-bulk');", `    const bulk = el('details', 'cuaderno-bank-bulk');
    const bulkHeading = el('summary', '', 'Gestionar selección');
    bulk.addEventListener('toggle', () => bank.classList.toggle('atl-selecting', bulk.open));`);
  replace('    bulk.append(selectedButton, deselect, removeSelected, selectionCount);', `    const bulkActions = el('div', 'atl-bank-action-group');
    bulkActions.append(selectedButton, deselect, removeSelected, selectionCount);
    bulk.append(bulkHeading, bulkActions);`);
  replace('        removeSelected.disabled = selectedForRemoval.size === 0;', `        bulkHeading.textContent = selectedForRemoval.size ? 'Gestionar selección · ' + selectedForRemoval.size : 'Gestionar selección';
        removeSelected.disabled = selectedForRemoval.size === 0;`);
  replace('            rowSummary.append(selection);', `            const footer = el('div', 'atl-bank-card-footer');
            const actions = el('div', 'atl-bank-card-actions');
            const tagAction = button('Etiquetar', () => tagBankText(text, restoreFocus, navigation), 'tbtn sm');
            tagAction.setAttribute('aria-label', 'Etiquetar «' + text.title + '»');
            const readAction = button('Leer', openReader, 'tbtn sm');
            readAction.setAttribute('aria-label', 'Leer «' + text.title + '»');
            actions.append(readAction, tagAction, selection);
            footer.append(actions);`);
  replace("                if (item) chips.append(el('span', 'grammar-chip', item.label));", `                if (item) {
                    const chip = button(item.label, () => filters.toggleTag(id), 'grammar-chip atl-bank-tag-chip');
                    chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, catalogue)) ?? 'custom';
                    chip.setAttribute('aria-label', 'Filtrar por etiqueta «' + item.label + '»');
                    chip.setAttribute('aria-pressed', String(filters.isActive(id)));
                    chips.append(chip);
                }`);
  replace('            row.append(chips);', '            footer.prepend(chips);\n            row.append(footer);');
  replace('        const isFiltered = Boolean(search.value.trim()', `        filterChips.replaceChildren();
        searchClear.hidden = !search.value;
        const clearFacet = (label, control, value) => {
            const chip = button(label + ' ×', () => {
                if (control.type === 'checkbox') control.checked = false;
                else control.value = value;
                populate();
            }, 'grammar-chip atl-bank-tag-chip atl-facet-chip');
            chip.setAttribute('aria-label', 'Quitar filtro «' + label + '»');
            filterChips.append(chip);
        };
        const activeSelect = (control, prefix, empty = '') => {
            if (control.value !== empty) clearFacet(prefix + ': ' + control.selectedOptions[0]?.textContent, control, empty);
        };
        activeSelect(filters.course, 'Curso');
        activeSelect(authorSelect, 'Autor', 'all');
        activeSelect(difficultySelect, 'Dificultad');
        activeSelect(filters.work, 'Obra');
        activeSelect(filters.origin, 'Procedencia');
        activeSelect(filters.usage, 'Uso');
        activeSelect(filters.examYear, 'Selectividad');
        activeSelect(filters.examCommunity, 'Comunidad');
        if (criteria.reference.trim()) clearFacet('Referencia: ' + criteria.reference.trim(), filters.reference, '');
        if (criteria.exam) clearFacet('Solo Selectividad', filters.examLabel.querySelector('input'), '');
        const advancedCount = [criteria.work, criteria.reference.trim(), criteria.origin, criteria.usage,
            criteria.exam, criteria.examYear, criteria.examCommunity, criteria.includePending, ...criteria.tags].filter(Boolean).length;
        filterCount.hidden = !advancedCount;
        filterCount.textContent = String(advancedCount);
        for (const [id, chip] of quickTags) chip.setAttribute('aria-pressed', String(criteria.tags.includes(id)));
        for (const id of criteria.tags) {
            const item = catalogue.find(tag => tag.id === id);
            if (!item) continue;
            const label = id === infinitiveId ? ['Infinitivo', criteria.infTime, criteria.infVoice].filter(Boolean).join(' ') : item.label;
            const chip = button(label + ' ×', () => filters.toggleTag(id), 'grammar-chip atl-bank-tag-chip');
            chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, catalogue)) ?? 'custom';
            chip.setAttribute('aria-label', 'Quitar filtro «' + label + '»');
            filterChips.append(chip);
        }
        const isFiltered = Boolean(search.value.trim()`);
  // Work on the generated tag editor alone; keep its persistence and Collatinus handlers.
  const tagStart = source.indexOf('function tagBankText(');
  const tagEnd = source.indexOf('function pasteText(', tagStart);
  if (tagStart < 0 || tagEnd < 0) throw Error('Revisar espacio de etiquetado.');
  let editor = source.slice(tagStart, tagEnd);
  const modalAnchor = "    M.modal('Etiquetas de «' + text.title + '»', panel,";
  if (!editor.includes(modalAnchor)) throw Error('Revisar ventana de etiquetas.');
  editor = editor.replace(modalAnchor, 
    "    const heading = el('div', 'atl-tag-heading');\n" +
    "    heading.append(el('h3', '', text.title), el('p', 'muted', [text.source.author, text.source.work, text.source.reference].filter(Boolean).join(' · ')));\n" +
    "    const summary = el('section', 'atl-tag-summary');\n" +
    "    summary.append(el('h3', '', 'Etiquetas confirmadas'), current);\n" +
    "    const left = el('div', 'atl-tag-passage-column');\n" +
    "    left.append(heading, passage, summary, review);\n" +
    "    const right = el('aside', 'atl-tag-catalog-column');\n" +
    "    manual.open = true;\n" +
    "    right.append(el('h3', '', 'Catálogo gramatical'), manual, custom);\n" +
    "    const intro = panel.querySelector(':scope > p');\n" +
    "    if (intro) { intro.classList.add('atl-tag-intro'); right.append(intro); }\n" +
    "    panel.replaceChildren(left, right);\n" +
    "    const dialog = M.modal('Etiquetas de «' + text.title + '»', panel,");
  // Insert width option at the end of the existing modal invocation.
  const close = editor.lastIndexOf(']);');
  if (close < 0) throw Error('Revisar cierre de etiquetado.');
  editor = editor.slice(0, close) + "], { width: 'min(1440px, 98vw)', noFocus: true });\n    dialog.el.classList.add('atl-bank-tag-modal');" + editor.slice(close + 3);
  editor = editor.replace("const chip = isInfinitiveTag(id)\n                ? button(nameOf(id) + ' ×', () => setTag(id, false), 'grammar-chip')\n                : el('span', 'grammar-chip', nameOf(id));\n            if (isInfinitiveTag(id)) chip.setAttribute('aria-label', 'Quitar «' + nameOf(id) + '»');",
    "const chip = button(nameOf(id) + ' ×', () => setTag(id, false), 'grammar-chip');\n            chip.setAttribute('aria-label', 'Quitar «' + nameOf(id) + '»');");
  editor = editor.replace("        label.append(check, el('span', '', ('· '.repeat(catalogDepth(tag, all))) + tag.label));",
    "        label.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(tag.id, group, all)) ?? 'custom';\n        label.append(check, el('span', '', ('· '.repeat(catalogDepth(tag, all))) + tag.label));");
  // Preserve the original save body, but share it between Save and navigation.
  const tagReplace = (from, to) => {
    if (editor.split(from).length !== 2) throw Error('Revisar navegación de etiquetas: ' + from);
    editor = editor.replace(from, () => to);
  };
  tagReplace('function tagBankText(text) {', 'function tagBankText(text, onClose, navigation) {');
  tagReplace('    const reviewReady = bankReviewKey(text).then(key => {',
    "    const initialTags = JSON.stringify([...selected].sort());\n" +
    "    const decisionFingerprint = () => JSON.stringify([[...rejected].sort(), [...corrected].sort(([a], [b]) => a.localeCompare(b))]);\n" +
    "    let initialDecisions = decisionFingerprint();\n" +
    "    const dirty = () => JSON.stringify([...selected].sort()) !== initialTags || decisionFingerprint() !== initialDecisions;\n" +
    "    const reviewReady = bankReviewKey(text).then(key => {");
  tagReplace('        if (pending.length) renderProposals();', '        initialDecisions = decisionFingerprint();\n        if (pending.length) renderProposals();');
  const modalStart = editor.indexOf("    const dialog = M.modal('Etiquetas de «'");
  const saveStart = editor.indexOf("{ label: 'Guardar etiquetas', primary: true, onclick: async () => {", modalStart);
  const saveEnd = editor.lastIndexOf("}}], { width: 'min(1440px, 98vw)'");
  if (modalStart < 0 || saveStart < 0 || saveEnd < saveStart) throw Error('Revisar guardado y navegación de etiquetas.');
  const saveBody = editor.slice(saveStart + "{ label: 'Guardar etiquetas', primary: true, onclick: async () => {".length, saveEnd);
  const afterModal = editor.indexOf("dialog.el.classList.add('atl-bank-tag-modal');", saveEnd);
  if (afterModal < 0) throw Error('Revisar clase del etiquetador.');
  editor = editor.slice(0, modalStart) + `    const ordered = navigation?.results() ?? [text];
    const index = ordered.findIndex(item => item.id === text.id);
    let destination = null, saving = false, allowClose = false;
    const nav = el('nav', 'atl-edit-nav atl-tag-nav');
    nav.setAttribute('aria-label', 'Navegar por los textos filtrados');
    const position = el('span', 'atl-edit-position');
    position.textContent = index < 0 ? 'Fuera del filtro' : (index + 1) + ' de ' + ordered.length;
    const persist = async () => {${saveBody}};
    const save = async () => {
        if (saving) return false;
        saving = true;
        panel.inert = true;
        try {
            await persist();
            allowClose = true;
            return true;
        } catch (error) {
            destination = null;
            M.toast('No se han guardado las etiquetas: ' + (error.message || String(error)), 6500);
            return false;
        } finally {
            saving = false;
            panel.inert = false;
        }
    };
    const move = async offset => {
        if (saving || index < 0) return;
        const target = ordered[index + offset];
        if (!target) return;
        await reviewReady;
        if (saving || !panel.isConnected) return;
        if (dirty()) {
            if (!window.confirm('Hay etiquetas sin guardar. ¿Guardarlas y abrir la otra ficha?')) return;
            destination = target.id;
            if (!await save()) return;
        } else {
            destination = target.id;
            allowClose = true;
        }
        dialog.close();
    };
    const previous = button('Anterior', () => move(-1), 'hbtn atl-edit-nav-button');
    const next = button('Siguiente', () => move(1), 'hbtn atl-edit-nav-button');
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index >= ordered.length - 1;
    nav.append(previous, position, next);
    const guard = () => allowClose || (!saving && (!dirty() || window.confirm('¿Cerrar sin guardar los cambios de etiquetas?')));
    const afterClose = () => {
        if (!destination) { onClose?.(); return; }
        const id = destination;
        destination = null;
        queueMicrotask(() => {
            const target = (navigation?.results() ?? []).find(item => item.id === id);
            if (target) tagBankText(target, onClose, navigation);
            else { onClose?.(); M.toast('El texto ya no coincide con los filtros activos.'); }
        });
    };
    const dialog = M.modal('Etiquetas de «' + text.title + '»', panel, [
        { label: 'Cancelar' }, { label: 'Guardar etiquetas', primary: true, onclick: save }
    ], { width: 'min(1440px, 98vw)', noFocus: true, beforeClose: guard, onClose: afterClose });
    dialog.el.classList.add('atl-bank-tag-modal');
    dialog.el.querySelector('.mh').insertBefore(nav, dialog.el.querySelector('.xbtn'));` + editor.slice(afterModal + "dialog.el.classList.add('atl-bank-tag-modal');".length);
  source = source.slice(0, tagStart) + editor + source.slice(tagEnd);
  return source;
}
