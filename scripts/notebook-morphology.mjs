export function integrateMorphologyControls(source) {
  return "import { morphChoiceFromToken } from '../core/morph-categories.js';\n" + source
    .replace('    async function fillMorphology(', `    async function classifyMarkedMorphology(placementId) {
        if (!options.onAnalyzeMorphology) return;
        await withSaved(async state => {
            const placement = state.edition.placements.find(p => p.id === placementId);
            const question = placement?.questions.find(q => q.kind === 'morphology');
            if (!question?.words.some(word => !word.locked && !word.analysis)) return;
            const latin = placement.text.latin;
            const tokens = await options.onAnalyzeMorphology(latin);
            const readings = new Map(tokens.map(token => [token.s, morphChoiceFromToken(token, latin)]));
            let changed = false;
            const words = question.words.map(word => {
                if (word.locked || word.analysis) return word;
                const mark = placement.text.markup.find(mark => mark.id === word.markId);
                const reading = mark && readings.get(mark.startUtf16);
                if (!reading || reading.end !== mark.endUtf16 || reading.surface !== word.surface) return word;
                changed = true;
                return { ...word, lemmaId: reading.lemmaId, analysis: reading.analysis,
                    schoolCategory: reading.category, reviewState: 'needs-review',
                    provenance: { provider: 'Collatinus (propuesta contextual)', recordId: reading.candidateId,
                        bankRevision: 'motor-offline', decisionId: null } };
            });
            if (!changed) return;
            const timestamp = new Date().toISOString();
            const saved = await repository.commitEdition(state.edition.id, state.revision,
                { command: 'ui.classify-morphology-marks', targetId: placementId, timestamp }, original => ({
                    ...original, updatedAt: timestamp,
                    placements: original.placements.map(p => p.id !== placementId ? p : {
                        ...p, questions: p.questions.map(q => q.id !== question.id ? q : { ...q, words })
                    })
                }));
            bind.saved(saved);
        });
    }
    async function fillMorphology(`)
    .replace(`            const selected = selectMorphologyForPlacement(state.edition, placementId, rows.filter(t => !ambiguousStarts.has(t.s)), replaceWordId, verified);
            if (!selected.length) {`,
    `            const candidates = rows.filter(t => !ambiguousStarts.has(t.s));
            const replaced = p.questions.find(q => q.kind === 'morphology')?.words.find(word => word.id === replaceWordId);
            let selected = selectMorphologyForPlacement(state.edition, placementId, candidates, replaceWordId, verified);
            if (!selected.length && replaced) {
                const alternative = selectMorphologyForPlacement(state.edition, placementId, candidates, replaceWordId, verified, true)[0];
                if (alternative && window.confirm('No queda otra palabra del mismo tipo. ¿Sustituir «' +
                        replaced.surface + '» por «' + alternative.surface + '» (' + MORPH_LABELS[alternative.category] + ')?'))
                    selected = [alternative];
                else {
                    const message = alternative ? 'Se conserva «' + replaced.surface + '».' :
                        'El pasaje no ofrece otra palabra del mismo tipo ni de un tipo disponible.';
                    morphNotice = { wordId: replaceWordId, message, error: false };
                    bind.repaint();
                    bind.status(message);
                    return;
                }
            }
            if (!selected.length) {`)
    .replace('            contextMorphReview = null;\n            bind.saved(changed);\n            const q = changed.edition',
      '            contextMorphReview = null;\n            morphNotice = null;\n            bind.saved(changed);\n            const q = changed.edition')
    .replace("                    another.setAttribute('aria-label', 'Otra palabra en lugar de ' + word.surface);",
      "                    another.setAttribute('aria-label', 'Otra palabra en lugar de ' + word.surface);\n                    another.disabled = word.locked;\n                    if (word.locked) another.title = 'Análisis protegido';")
    .replace("currentWord.provenance?.provider.startsWith('Collatinus')", "(!currentWord.analysis || currentWord.provenance?.provider.startsWith('Collatinus'))")
    .replace('!occupied.has(x.category)', '(!occupied.has(x.category) || x.category === currentWord.schoolCategory)')
    .replace("if (collision)\n                    throw new Error('Otra aparición ya utiliza esa categoría gramatical.');",
      "if (collision && existing.schoolCategory !== choice.category)\n                    throw new Error('Otra aparición ya utiliza esa categoría gramatical.');")
    .replace('clear, generateInitial, review,', 'clear, generateInitial, classifyMarkedMorphology, review,');
}

export function integrateMorphologyEdition(source) {
  return source
    .replace("throw Error('No se pudo guardar el documento importado.');",
      "throw Error('No se pudo guardar el documento importado.');\n            if (autoApply) await academics.classifyMarkedMorphology(place.id);")
    .replace("        session = moveSession(draft, session, { placementId });\n        academics.clear();",
      "        session = moveSession(draft, session, { placementId });\n        academics.clear();\n        if (autoApply) await academics.classifyMarkedMorphology(placementId);")
    .replace(/(            session = (?:\{ activeEditionId: id,[\s\S]*?\};|moveSession\(draft, session, command\);))\n            paint\(\);/g,
      "$1\n            const activePlacement = selection();\n            if (autoApply && activePlacement) await academics.classifyMarkedMorphology(activePlacement.id);\n            paint();");
}

export function integrateManualNotebookUnderline(source) {
  return source
    .replace("import { validateEdition } from '../core/edition-validation.js';",
      "import { validateEdition, fingerprintForMark } from '../core/edition-validation.js';")
    .replace('    function renderTextSelect(p, area) {', `    function markSelectedWord(target, replaceId) {
        return withSaved(async state => {
            const p = state.edition.placements.find(item => item.id === target.placementId);
            const q = p?.questions.find(item => item.kind === 'morphology');
            if (!q || !safeToken(p.text.latin, target.start, target.end))
                throw new Error('Selecciona exactamente una palabra latina completa.');
            const latin = p.text.latin;
            const removed = q.words.find(word => word.id === replaceId);
            if (replaceId && (!removed || removed.locked))
                throw new Error('El subrayado que quieres sustituir está protegido o ya no existe.');
            const marks = p.text.markup.filter(mark => mark.id !== removed?.markId);
            if (marks.some(mark => mark.startUtf16 < target.end && target.start < mark.endUtf16))
                throw new Error('Esta selección coincide con un subrayado existente.');
            const words = q.words.filter(word => word.id !== replaceId);
            if (words.length >= 4)
                throw new Error('Elige qué palabra subrayada sustituir.');
            const tokens = await options.onAnalyzeMorphology(latin).catch(() => []);
            const token = tokens.find(item => item.s === target.start && item.e === target.end);
            const reading = token && morphChoiceFromToken(token, latin);
            const surface = latin.slice(target.start, target.end);
            const markId = 'mark.' + crypto.randomUUID();
            const word = { id: 'morph.' + crypto.randomUUID(), markId, surface, lemmaId: reading?.lemmaId ?? null,
                analysis: reading?.analysis ?? null, ...(reading && { schoolCategory: reading.category }),
                provenance: reading ? { provider: 'Collatinus (propuesta contextual)', recordId: reading.candidateId,
                    bankRevision: 'motor-offline', decisionId: null } : null, reviewState: 'needs-review', locked: false };
            const mark = { id: markId, kind: 'morph-underline', startUtf16: target.start, endUtf16: target.end,
                exact: surface, textFingerprint: fingerprintForMark(latin, target.start, target.end), reviewRequired: false };
            const timestamp = new Date().toISOString();
            const saved = await repository.commitEdition(state.edition.id, state.revision,
                { command: 'ui.underline-selected-word', targetId: p.id, timestamp }, original => ({
                    ...original, updatedAt: timestamp, placements: original.placements.map(item => item.id !== p.id ? item : {
                        ...item, text: { ...item.text, markup: [...marks, mark].sort((a, b) => a.startUtf16 - b.startUtf16) },
                        questions: item.questions.map(question => question.id !== q.id ? question : { ...question, words: [...words, word] })
                    })
                }));
            bind.saved(saved);
            bind.status('Subrayado guardado: «' + surface + '».');
        });
    }
    function renderTextSelect(p, area) {`)
    .replace("        const add = button('Subrayar palabra seleccionada', () => {\n            const start = area.selectionStart, end = area.selectionEnd;\n            requestToken({ placementId: p.id, start, end });\n        });\n        row.append(label, add);",
      `        let replaceWord;
        const words = p.questions.find(question => question.kind === 'morphology')?.words ?? [];
        if (options.onAnalyzeMorphology && words.length >= 4) {
            replaceWord = el('select', 'field-control');
            replaceWord.setAttribute('aria-label', 'Subrayado que se sustituirá');
            replaceWord.append(new Option('Elige qué subrayado sustituir', ''));
            for (const word of words.filter(word => !word.locked)) replaceWord.append(new Option(word.surface, word.id));
        }
        let start = area.selectionStart, end = area.selectionEnd;
        const readRange = () => { start = area.selectionStart; end = area.selectionEnd; };
        for (const event of ['select', 'pointerup', 'keyup']) area.addEventListener(event, readRange);
        const add = button('Subrayar palabra seleccionada', () => {
            if (area.selectionEnd > area.selectionStart) readRange();
            const target = { placementId: p.id, start, end };
            if (options.onAnalyzeMorphology) markSelectedWord(target, replaceWord?.value);
            else requestToken(target);
        });
        for (const control of [replaceWord, add]) control?.addEventListener('pointerdown', () => {
            if (area.selectionEnd > area.selectionStart) readRange();
        });
        row.append(label);
        if (replaceWord) row.append(replaceWord);
        row.append(add);`)
    .replace(/renderPaperSelect,\s*savePaperSelection,/u, 'renderPaperSelect,savePaperSelection,markSelectedWord,');
}
