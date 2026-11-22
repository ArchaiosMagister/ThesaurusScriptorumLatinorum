export function modernizeBank(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Revisar la interfaz del banco: ' + before);
    source = source.replace(before, () => after);
  };
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
    "        target.append(label);\n    }\n    for (const tag of all) appendTagOption(tag, list);\n    search.addEventListener('input', () => {");
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
        button('Biblioteca latina', openLibrary, 'hbtn'));
    bankActions.append(addActions, button('Auditar textos repetidos', openDuplicateAudit, 'tbtn'));`);
  const from = source.indexOf("    bankToolbar.append(bankField('Buscar'");
  const to = source.indexOf('    const resetBankFilters', from);
  if (from < 0 || to < 0) throw Error('Revisar los filtros del banco.');
  source = source.slice(0, from) + `    bankToolbar.append(bankField('Buscar', search, 'cuaderno-bank-search'),
        bankField('Ordenar por', sortSelect, ''), bankField('Ver', viewSelect, ''));
    const moreFilters = el('details', 'atl-bank-more');
    moreFilters.open = bankState.moreFilters === true;
    moreFilters.addEventListener('toggle', () => { bankState.moreFilters = moreFilters.open; });
    const filterFields = el('div', 'atl-bank-more-fields');
    filterFields.append(bankField('Autor', authorSelect, ''), bankField('Obra', filters.work, ''),
        bankField('Referencia', filters.reference, ''), bankField('Procedencia', filters.origin, ''), bankField('Uso', filters.usage, ''));
    moreFilters.append(el('summary', '', 'Autor, obra y otros filtros'), filterFields);
    const filterChips = el('div', 'grammar-chips atl-bank-active-tags');
    filterChips.setAttribute('aria-label', 'Etiquetas de filtro activas');
` + source.slice(to);
  replace('    bank.append(bankToolbar, filters.panel);', `    const refinements = el('div', 'atl-bank-refinements');
    refinements.append(filters.panel, moreFilters);
    const shortcuts = el('div', 'grammar-chips atl-bank-tag-shortcuts');
    shortcuts.setAttribute('aria-label', 'Etiquetas usadas en el banco');
    const counts = new Map();
    for (const text of corpus.texts) for (const id of text.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const frequent = catalogue.filter(tag => counts.has(tag.id)).sort((a, b) =>
        Number(b.kind === 'custom') - Number(a.kind === 'custom') ||
        counts.get(b.id) - counts.get(a.id) || bankCollator.compare(a.label, b.label)).slice(0, 8);
    const quickTags = new Map();
    for (const item of frequent) {
        const chip = button(item.label + ' · ' + counts.get(item.id), () => filters.toggleTag(item.id), 'grammar-chip atl-bank-tag-chip');
        chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(item.id, group, catalogue)) ?? 'custom';
        chip.setAttribute('aria-label', 'Ver textos con «' + item.label + '»');
        quickTags.set(item.id, chip);
        shortcuts.append(chip);
    }
    bank.append(bankToolbar, refinements, shortcuts, filterChips);`);
  replace('    bank.append(bankResultCount);', `    const resultsHeader = el('div', 'atl-bank-results-header');
    resultsHeader.append(bankResultCount);
    bank.append(resultsHeader);`);
  replace('    bank.append(bulk);', '    resultsHeader.append(bulk);');
  replace("    const bulk = el('div', 'cuaderno-bank-bulk');", "    const bulk = el('details', 'cuaderno-bank-bulk');\n    const bulkHeading = el('summary', '', 'Gestionar selección');");
  replace('    bulk.append(selectedButton, deselect, removeSelected, selectionCount);', `    const bulkActions = el('div', 'atl-bank-action-group');
    bulkActions.append(selectedButton, deselect, removeSelected, selectionCount);
    bulk.append(bulkHeading, bulkActions);`);
  replace('        removeSelected.disabled = selectedForRemoval.size === 0;', `        bulkHeading.textContent = selectedForRemoval.size ? 'Gestionar selección · ' + selectedForRemoval.size : 'Gestionar selección';
        removeSelected.disabled = selectedForRemoval.size === 0;`);
  replace('            rowSummary.append(selection);', `            const actions = el('div', 'atl-bank-card-actions');
            const tagAction = button('Etiquetar', () => tagBankText(text), 'tbtn sm');
            tagAction.setAttribute('aria-label', 'Etiquetar «' + text.title + '»');
            actions.append(tagAction, selection);
            rowSummary.append(actions);`);
  replace("                if (item) chips.append(el('span', 'grammar-chip', item.label));", `                if (item) {
                    const chip = button(item.label, () => filters.toggleTag(id), 'grammar-chip atl-bank-tag-chip');
                    chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, catalogue)) ?? 'custom';
                    chip.setAttribute('aria-label', 'Filtrar por etiqueta «' + item.label + '»');
                    chip.setAttribute('aria-pressed', String(bankState.tags.includes(id)));
                    chips.append(chip);
                }`);
  replace('            for (const id of pendingFor(text.id).slice(0, 6)) {', `            if (text.tagIds.length > 6) chips.append(el('span', 'small muted', '+' + (text.tagIds.length - 6) + ' etiquetas'));
            for (const id of pendingFor(text.id).slice(0, 6)) {`);
  replace('        const isFiltered = Boolean(search.value.trim()', `        filterChips.replaceChildren();
        for (const [id, chip] of quickTags) chip.setAttribute('aria-pressed', String(criteria.tags.includes(id)));
        for (const id of criteria.tags) {
            const item = catalogue.find(tag => tag.id === id);
            if (!item) continue;
            const chip = button(item.label + ' ×', () => filters.toggleTag(id), 'grammar-chip atl-bank-tag-chip');
            chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, catalogue)) ?? 'custom';
            chip.setAttribute('aria-label', 'Quitar filtro «' + item.label + '»');
            filterChips.append(chip);
        }
        const isFiltered = Boolean(search.value.trim()`);
  return source;
}
