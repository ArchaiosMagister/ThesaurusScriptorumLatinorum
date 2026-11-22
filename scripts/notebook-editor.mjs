function replaceOnce(source, original, replacement) {
  if (source.split(original).length !== 2) throw new Error('Revisar el editor de Cuadernos: ' + original);
  return source.replace(original, () => replacement);
}

function replaceBlock(source, start, end, replacement = '') {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw new Error('Revisar el editor de Cuadernos: ' + start);
  return source.slice(0, first) + replacement + source.slice(last);
}

export function organizeNotebookEditor(source) {
  const replace = (original, replacement) => { source = replaceOnce(source, original, replacement); };
  replace('        editor.append(navMenus);', `        navMenus.classList.add('atl-edition-toolbar');
        element.insertBefore(navMenus, mobileSwitch);`);
  replace('            editor.append(repetitions);', '            element.insertBefore(repetitions, mobileSwitch);');
  replace('        for (const m of labels) {', "        for (const m of labels.filter(item => item.key !== 'text' && item.key !== 'vocabulary')) {");
  source = source.replaceAll("menu = 'text'", "menu = 'questions'");
  source = replaceBlock(source, "        else if (placement && menu === 'text')", "        else\n            panel.append(node('p', 'hint', 'Añade un texto",
    `        else if (placement && menu === 'questions') {
            const text = node('section', 'edition-menu-text card');
            text.append(node('h3', '', 'Texto'));
            menuText(text, placement);
            panel.append(text);
            menuQuestions(panel, placement);
        }
`);
  replace('    function paint() {\n        element.replaceChildren();', `    function paint() {
        const sameView = element.dataset.renderedPlacement === (selection()?.id ?? '') &&
            element.dataset.renderedMenu === menu;
        const scroll = [];
        if (sameView) for (let container = element; container; container = container.parentElement)
            if (container.scrollTop || container.scrollLeft)
                scroll.push([container, container.scrollTop, container.scrollLeft]);
        element.dataset.renderedPlacement = selection()?.id ?? '';
        element.dataset.renderedMenu = menu;
        element.replaceChildren();`);
  replace('        element.append(layout);\n        paintPreview();', `        element.append(layout);
        paintPreview();
        for (const [container, top, left] of scroll) container.scrollTo(left, top);`);
  source = replaceBlock(source, "                if (v.origin === 'manual' || v.glossesSeparated) {",
    '                if (options.onAnalyzeVocabulary && (v.collatinusSource');
  replace("        for (const q of p.questions) {\n            const section = node('section', 'edition-question-panel');",
    "        for (const q of p.questions) {\n            if (q.kind === 'choice') menuVocabulary(panel, p);\n            const section = node('section', 'edition-question-panel');");
  replace("        menu = 'notebook';\n        paint();\n        return true;\n    }\n    /** Sincronizar", "        menu = selection() ? 'questions' : 'notebook';\n        mobile = 'config';\n        paint();\n        return true;\n    }\n    /** Sincronizar");

  source = replaceBlock(source, '        // Un índice sin tarjeta redundante,', '        // Una vista de enunciado');
  replace('            const folded = foldedQuestions.has(foldKey);\n', '');
  source = replaceBlock(source, "            const toggle = action(folded ? '▸'", '            statement(section, foldKey',
    "            top.append(check, node('h3', '', heading), points);\n            section.append(top);\n");
  source = replaceBlock(source, "                    const advanced = node('details', 'edition-option-advanced');",
    '                    const advancedBody');
  source = replaceBlock(source, '                    advanced.append(advancedBody);', '                    opt.append(head);');
  replace('                    opt.append(addRow, advanced);', '                    opt.append(addRow, advancedBody);');
  source = replaceBlock(source, '                const wholeKey = p.id', '                const count = q.options',
    `                const wholeBody = node('div', 'edition-question-advanced-body');
                academics.renderQuestion(wholeBody, p, q);
                section.append(wholeBody);
`);
  replace("            if (q.kind === 'morphology')\n                academics.renderMorph(section, p, q);",
    `            if (q.kind === 'morphology') {
                academics.renderMorph(section, p, q);
                section.append(action('Elegir palabra en el texto', () => {
                    const latin = element.querySelector('.edition-menu-text textarea');
                    latin?.focus({ preventScroll: true });
                    latin?.scrollIntoView({ block: 'center' });
                }, 'tbtn'));
            }`);
  replace("    const foldedQuestions = new Set();\n", '');
  replace("    const expandedAcademicOptions = new Set();\n", '');

  source = replaceBlock(source, '        // Tres grupos visuales, conservando', '        const selectionMode',
    `        const entriesSection = node('section', 'edition-vocab-section edition-vocab-entries');
        const heading = node('h3', '', 'Vocabulario');
        heading.tabIndex = -1;
        entriesSection.append(heading);
        panel.append(entriesSection);
`);
  replace('        selectionSection.append(toolbar);', '        entriesSection.append(toolbar);');
  replace('        analysisSection.append(scan);\n        if (!options.onAnalyzeVocabulary)\n            renderVocabularySuggestions(analysisSection, p);',
    '        toolbar.append(scan);\n        if (!options.onAnalyzeVocabulary)\n            renderVocabularySuggestions(entriesSection, p);');
  replace("'Buscar otras formas con Collatinus (actualizar)'", "'Actualizar con Collatinus'");
  replace("                if (key === 'todo')\n                    void refreshCollatinusVocabulary(p);",
    "                void completeVocabularyForSelection();");
  replace("...x, vocabularySelectionMode: 'todo',\n                    vocabulary: x.vocabulary.map(v => ({ ...v, included: true }))",
    "...x, vocabulary: x.vocabulary.map(v => ({ ...v, included: true }))");
  replace("...x, vocabularySelectionMode: 'elegir',\n                    vocabulary: x.vocabulary.map(v => ({ ...v, included: false }))",
    "...x, vocabulary: x.vocabulary.map(v => ({ ...v, included: false }))");
  source = replaceBlock(source, '        const chosen = items.filter(v => v.included).length;', '        let preferred = [];',
    `        const count = node('p', 'hint');
        const updateCount = () => {
            const vocabulary = draft?.placements.find(item => item.id === p.id)?.vocabulary ?? items;
            count.textContent = vocabulary.length
                ? vocabulary.filter(entry => entry.included).length + ' de ' + vocabulary.length + ' entradas seleccionadas.'
                : 'El vocabulario se prepara al analizar el texto.';
        };
        count.setAttribute('role', 'status');
        updateCount();
        entriesSection.append(count);
`);
  replace("                    row.classList.toggle('off', !check.checked);",
    "                    row.classList.toggle('off', !check.checked);\n                    updateCount();");
  replace("        const add = action('Añadir entrada', () => {\n            const lemma = headword.value.trim();", `        const note = node('input', 'field-control');
        note.placeholder = 'Aclaración';
        note.setAttribute('aria-label', 'Aclaración nueva');
        const add = action('Añadir entrada', () => {
            const lemma = headword.value.trim();`);
  replace('            const manualMeaning = meaning.value.trim() || null;', '            const manualMeaning = meaning.value.trim() || null;\n            const manualNote = note.value.trim() || null;');
  replace('meaning: manualMeaning, note: null, included: true', 'meaning: manualMeaning, note: manualNote, included: true');
  replace('        row.append(headword, meaning, add);', '        row.append(headword, meaning, note, add);');

  const morphology = '            if (autoApply && activePlacement) await academics.classifyMarkedMorphology(activePlacement.id);';
  if (source.split(morphology).length !== 3) throw new Error('Revisar la navegación del editor de Cuadernos.');
  source = source.replaceAll(morphology, morphology + '\n            await completeVocabularyForSelection();');
  replace('        if (autoApply) await academics.classifyMarkedMorphology(placementId);',
    '        if (autoApply) await academics.classifyMarkedMorphology(placementId);\n        await completeVocabularyForSelection();');
  replace('    function prepareVocabulary(p) {', `    async function completeVocabularyForSelection() {
        const placement = selection();
        if (!options.onAnalyzeVocabulary || !placement?.text.latin.trim() ||
            placement.vocabulary.some(entry => entry.collatinusSource)) return;
        const editionId = draft.id;
        const { id, text, vocabularyQuantityMode } = placement;
        try {
            const entries = await options.onAnalyzeVocabulary(text.latin, vocabularyQuantityMode ?? 'modelo');
            if (draft?.id === editionId)
                await addCollatinusVocabulary(id, entries, text.latin);
        } catch (error) {
            setMessage('Collatinus: ' + (error.message || String(error)), true);
        }
    }
    function prepareVocabulary(p) {`);
  return source;
}

export function completeNotebookVocabulary(source) {
  source = replaceOnce(source, 'if (placement && !placement.vocabulary.length) {', 'if (placement) {');
  source = replaceOnce(source, "    if (!ids.length)\n        return [];\n    const entries = await callCollatinus('vocabEntries', { lids: ids, mode: quantity });",
    "    const entries = ids.length ? await callCollatinus('vocabEntries', { lids: ids, mode: quantity }) : [];");
  source = replaceOnce(source, '    return entries.filter(x => ids.includes(x.lid)).map(x => {', '    const vocabulary = entries.filter(x => ids.includes(x.lid)).map(x => {');
  return replaceOnce(source, "    });\n}\n// La escritura diferida del vocabulario", `    });
    const seen = new Set(vocabulary.map(entry => vocabularyKey(entry.lemma)));
    for (const token of tokens) {
        if (token.sel) continue;
        const saved = preferredFor(preferred, token.w);
        if (!saved || seen.has(vocabularyKey(saved.lemma))) continue;
        seen.add(vocabularyKey(saved.lemma));
        vocabulary.push({ ...saved, proper: false, forms: [token.w] });
    }
    return vocabulary;
}
// La escritura diferida del vocabulario`);
}
