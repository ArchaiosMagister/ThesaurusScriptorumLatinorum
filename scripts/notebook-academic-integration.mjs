import { requiredPatches as patches } from './required-patch.mjs';
const label = 'Acciones académicas del menú de Cuaderno y Banco';

export function integrateBankContextAcademic(source) {
  return patches(source, [
    ["import { bindBankContext, renderBankEditorialField }", "import { academicActions, consultNotebookSelection } from './atl-notebook-context-academic.js';\nimport { bankTagIds } from './atl-bank-review.js';\nimport { attachBankSpans, bindBankContext, renderBankEditorialField }"],
    ['    const context = bindBankContext(inputs.get(\'latin\'), source, M.toast);', `    const context = bindBankContext(inputs.get('latin'), source, M.toast,
        { analyze: analyzeLatin, vocabulary: collatinusVocabulary, glossary, catalogue: allGrammarTags(corpus) });`],
    ["    const visible = source.tagIds.filter(bankTagAssignable);", "    const visible = bankTagIds(source).filter(bankTagAssignable);"],
    ["item && !source.tagIds.includes(id) && bankTagAssignable(id)", "item && !bankTagIds(source).includes(id) && bankTagAssignable(id)"],
    ["const effectiveTags = [...t.tagIds,", "const effectiveTags = [...bankTagIds(t),"],
    ["const chosenTags = text.tagIds.filter(bankTagAssignable)", "const chosenTags = bankTagIds(text).filter(bankTagAssignable)"],
    ["            if (current.teacherDocx && (!changedLatin || contextual.edited)) {", `            next = attachBankSpans(next, id, contextual.spans, allGrammarTags(corpus));
            if (current.teacherDocx && (!changedLatin || contextual.edited)) {`],
    ["    const save = button(destination === 'bank' ? 'Guardar en el banco' : 'Añadir al cuaderno', async () => {", `    const draftSource = { latin: '' };
    const glossary = vocabularyEditor(draftSource);
    glossary.section.hidden = true;
    form.append(glossary.section);
    const context = bindBankContext(inputs.get('latin'), draftSource, M.toast,
        { analyze: analyzeLatin, vocabulary: collatinusVocabulary, glossary, catalogue: allGrammarTags(corpus) });
    const save = button(destination === 'bank' ? 'Guardar en el banco' : 'Añadir al cuaderno', async () => {`],
    ["                reference: value('reference'), latin: value('latin') };", `                reference: value('reference'), latin: value('latin') };
            const contextData = context.forSave(data.latin);
            if (contextData.underlines?.length) data.editorialUnderlines = contextData.underlines;
            if (contextData.spans?.length) data.grammaticalSpans = contextData.spans;
            const selectedVocabulary = glossary.read();
            if (selectedVocabulary?.length) data.vocabulary = selectedVocabulary;`],
    ["    const match = before.corpus.texts.find(t => t.latin === input.latin.trim()", `    const annotated = input.editorialUnderlines?.length || input.grammaticalSpans?.length || input.vocabulary?.length;
    const match = !annotated && before.corpus.texts.find(t => t.latin === input.latin.trim()`],
    ["        await repo.save(upsertText(before.corpus, input, id, new Date().toISOString()), before.revision);", `        const updated = upsertText(before.corpus, input, id, new Date().toISOString());
        await repo.save(attachBankSpans(updated, id, input.grammaticalSpans, allGrammarTags(corpus)), before.revision);`],
    ["    const match = exactWord || matches[0];", `    const annotated = clean.editorialUnderlines?.length || clean.grammaticalSpans?.length || clean.vocabulary?.length;
    const match = exactWord || (!annotated ? matches[0] : undefined);`],
    ["    const updated = upsertText(saved.corpus, { ...clean, id }, id, at);", `    const updated = attachBankSpans(upsertText(saved.corpus, { ...clean, id }, id, at),
        id, clean.grammaticalSpans, allGrammarTags(corpus));`],
    ["                if (needsReview) reviewNotice = ' Revisa los anclajes afectados por los cambios en el latín.';",
      "                if (needsReview || contextual.grammarReview) reviewNotice += ' Revisa los anclajes gramaticales afectados por los cambios en el latín.';"],
    ['            const openReader = () => openBankReader({', `            const openReader = () => openBankReader({
                consultLatin(field, range, point) {
                    const latin = field.textContent;
                    return academicActions(field, latin, range, point, { current: () => field.isConnected,
                        report: M.toast, consult: () => consultNotebookSelection(field, analyzeLatin, latin, range, point) });
                },`],
    ["    onAnalyzeVocabulary: (latin, quantity) => collatinusVocabulary(latin, quantity),",
      "    grammarCatalogue: () => allGrammarTags(corpus),\n    onAnalyzeVocabulary: collatinusVocabulary,"],
    ["async function collatinusVocabulary(latin, quantity) {", "async function collatinusVocabulary(latin, quantity, selectedLid) {"],
    ["    const ids = [...new Set(tokens.filter(t => t.sel).map(t => t.sel.lid))];",
      "    const ids = [...new Set(tokens.filter(t => t.sel && (selectedLid === undefined || t.sel.lid === selectedLid)).map(t => t.sel.lid))];"]
  ], label);
}

export function integrateBankSpanValidation(source) {
  return patches(source, [
    ["import { normalizeUnderlines", "import { grammarSpan } from './edition-validation.js';\nimport { normalizeUnderlines"],
    ["'pauCv', 'editorialUnderlines']);", "'pauCv', 'editorialUnderlines', 'grammaticalSpans']);"],
    ["        ...(data.editorialUnderlines === undefined", `        ...(data.grammaticalSpans === undefined ? {} : {
            grammaticalSpans: bankGrammarSpans(data.grammaticalSpans, path, nonBlank(data.latin, path + '.latin', 200_000))
        }),
        ...(data.editorialUnderlines === undefined`],
    ["function references(corpus) {", `function bankGrammarSpans(value, path, latin) {
    if (!Array.isArray(value) || value.length > 1000) return invalid(path, 'fragmentos gramaticales inválidos');
    const spans = value.map((row, index) => grammarSpan(row, path + '.grammaticalSpans.' + index, latin));
    uniqueIds(spans, path + '.grammaticalSpans');
    return spans;
}
function references(corpus) {`],
    ["        for (const id of entry.tagIds) {", "        for (const id of [...entry.tagIds, ...(entry.grammaticalSpans ?? []).flatMap(span => span.tagIds)]) {"]
  ], label);
}

export function integrateBankSpanWrites(source) {
  return patches(source, [
    ["        tagIds: previous?.tagIds ?? [],", `        tagIds: previous?.tagIds ?? [],
        ...(previous?.grammaticalSpans && previous.latin === draft.latin.trim() ? { grammaticalSpans: previous.grammaticalSpans } : {}),`],
    ["    const contentChanged = previous && (previous.title !== entry.title",
      "    const contentChanged = previous && (JSON.stringify(previous.editorialUnderlines) !== JSON.stringify(entry.editorialUnderlines) || previous.title !== entry.title"]
  ], label);
}

export function integrateNotebookExerciseValidation(source) {
  return patches(source, [
    ['function grammarSpan(input, path, latin)', 'export function grammarSpan(input, path, latin)'],
    ['function slot(input, path) {', 'function slot(input, path, latin) {'],
    ["'value', 'proposedLemmaId', 'origin', 'locked', 'provenance']);",
      "'value', 'proposedLemmaId', 'origin', 'locked', 'provenance'], ['sourceAnchor']);"],
    ["        locked: flag(d.locked, `${path}.locked`), provenance };",
      "        locked: flag(d.locked, `${path}.locked`), provenance,\n        ...(d.sourceAnchor === undefined ? {} : { sourceAnchor: exerciseAnchor(d.sourceAnchor, path + '.sourceAnchor', latin) }) };"],
    ['function option(input, path) {', 'function option(input, path, latin) {'],
    ["['preverbBaseIds', 'preverbBasesProtected']);", "['preverbBaseIds', 'preverbBasesProtected', 'contextBases']);"],
    ['slot(v, `${path}.slots[${i}]`)', 'slot(v, `${path}.slots[${i}]`, latin)'],
    ['    if (d.preverbBaseIds !== undefined) {', `    if (d.contextBases !== undefined) {
        if (kind !== 'preverb') fail(path, 'bases contextuales fuera de modificación preverbial');
        result.contextBases = array(d.contextBases, path + '.contextBases', 2).map((item, index) => {
            const where = path + '.contextBases.' + index;
            const row = object(item, where, ['index', 'baseId', 'anchor']);
            return { index: integer(row.index, where + '.index', 0, 1),
                baseId: str(row.baseId, where + '.baseId', 200), anchor: exerciseAnchor(row.anchor, where + '.anchor', latin) };
        });
        if (new Set(result.contextBases.map(item => item.index)).size !== result.contextBases.length)
            fail(path, 'bases contextuales repetidas');
    }
    if (d.preverbBaseIds !== undefined) {`],
    ['function question(input, path) {', 'function question(input, path, latin) {'],
    ['option(v, `${path}.options[${i}]`)', 'option(v, `${path}.options[${i}]`, latin)'],
    ['question(v, `${path}.questions[${i}]`)', 'question(v, `${path}.questions[${i}]`, sourceText.latin)'],
    ['function grammarReviewDecision(input, path, latin) {', `function exerciseAnchor(input, path, latin) {
    return grammarAnchor(object(input, path, grammarAnchorFields), path, latin);
}
function grammarReviewDecision(input, path, latin) {`]
  ], label);
}

export function integrateNotebookAcademicMenu(source) {
  return patches(source, [
    ['import { applyNotebookSnapshot', `import { academicActions, assignGrammar, consultNotebookSelection, findVocabulary,
    grammaticalGroups, notebookVocabulary } from './atl-notebook-context-academic.js';
import { applyNotebookSnapshot`],
    ['            report: setMessage,\n            history:', `            report: setMessage,
            academic(range, point) {
                const latin = field.value, current = placement();
                if (!current || current.text.latin !== latin) return [];
                const groups = grammaticalGroups(options.grammarCatalogue?.() ?? GRAMMAR_CATALOGUE);
                return academicActions(field, latin, range, point, {
                    current: () => placement()?.text.latin === latin,
                    report: setMessage,
                    consult: options.onAnalyzeMorphology && (() => consultNotebookSelection(field, options.onAnalyzeMorphology, latin, range, point)),
                    propose: options.onAnalyzeVocabulary && (() => notebookVocabulary(latin, range, options.onAnalyzeMorphology,
                        options.onAnalyzeVocabulary, placement().vocabularyQuantityMode)),
                    saveVocabulary(proposal) {
                        const before = read(), fresh = placement();
                        const existing = findVocabulary(fresh.vocabulary, proposal);
                        if (existing) {
                            apply((edition, at) => {
                                let next = editVocabulary(edition, p.id, existing.id, 'included', true, at);
                                if (existing.origin !== 'manual' && !existing.locked) {
                                    next = editVocabulary(next, p.id, existing.id, 'headword', proposal.headword, at);
                                    next = editVocabulary(next, p.id, existing.id, 'meaning', proposal.meaning, at);
                                }
                                return next;
                            });
                            history.record(before, read());
                            setMessage(existing.origin === 'manual' || existing.locked ?
                                'Entrada docente existente conservada.' : 'Entrada revisada e incorporada al vocabulario.');
                            return;
                        }
                        const order = Math.max(-1, ...fresh.vocabulary.map(item => item.order)) + 1;
                        apply((edition, at) => insertManualVocabulary(edition, p.id, {
                            id: freshId('voc'), lemma: (proposal.lemma || proposal.selected).slice(0, 250), headword: proposal.headword,
                            meaning: proposal.meaning, note: proposal.note ?? null, included: true, order,
                            provenance: null, reviewState: 'manual', origin: 'manual', locked: true
                        }, at));
                        history.record(before, read());
                        setMessage('Entrada incorporada al vocabulario.');
                    },
                    grammar: { groups, apply(tagId) {
                        const before = read();
                        const grammaticalSpans = assignGrammar(before.grammaticalSpans ?? [], latin, range, tagId, groups, () => freshId('span'));
                        if (write({ ...before, grammaticalSpans }, range) === false) return false;
                        history.record(before, read());
                        paint();
                        setMessage('Etiqueta asignada al fragmento.');
                    } },
                    exercises: async () => (await academics.contextExercises(current, range)).map(([label, run]) =>
                        [label, async () => {
                            const before = read();
                            const result = await run();
                            if (placement()) history.record(before, read());
                            return result;
                        }])
                });
            },
            history:`],
    ['        target.style.zoom = String(zoom / 100);', `        target.style.zoom = String(zoom / 100);
        if (options.onAnalyzeMorphology) {
            for (const field of target.querySelectorAll('.edition-latin')) {
                field.tabIndex = 0;
                bindLatinContext(field, { text: () => field.textContent, report: setMessage,
                    academic(range, point) {
                        const latin = field.textContent;
                        return academicActions(field, latin, range, point, { current: () => field.isConnected,
                            report: setMessage, consult: () => consultNotebookSelection(field, options.onAnalyzeMorphology, latin, range, point) });
                    } });
            }
        }`],
    ["        panel.append(tagPanel);", `        const review = (p.grammaticalSpans ?? []).filter(span => span.reviewRequired);
        if (review.length) tagPanel.append(node('p', 'hint', 'Revisa los fragmentos gramaticales afectados: ' +
            review.map(span => '«' + span.exact + '»').join(', ') + '.'));
        panel.append(tagPanel);`],
    ["importTeacherDocument(imported, text.id, text.tagIds)", "importTeacherDocument(imported, text.id, text.tagIds, text.grammaticalSpans)"],
    ["async function importTeacherDocument(doc, sourceId = null, sourceTagIds = []) {",
      "async function importTeacherDocument(doc, sourceId = null, sourceTagIds = [], sourceSpans = []) {"],
    ["        try {\n            // Prevalidar el documento completo", `        if (sourceSpans.length) place.grammaticalSpans = sourceSpans.map(span => ({ ...span, id: freshId('span') }));
        try {
            // Prevalidar el documento completo`]
  ], label);
}

export function integrateNotebookExerciseControls(source) {
  return patches(source, [
    ['import { AcademicQuestionEngineV1', `import { fragmentAnchor } from './atl-notebook-context-academic.js';
import { vocabularyIdentity } from '../core/vocabulary-preferences.js';
import { AcademicQuestionEngineV1`],
    ['    function markSelectedWord(target, replaceId) {', `    async function contextExercises(placement, range) {
        const latin = placement.text.latin, selected = latin.slice(range.start, range.end);
        const exact = safeToken(latin, range.start, range.end);
        const q = placement.questions.find(item => item.kind === 'choice' && item.enabled);
        const morph = placement.questions.find(item => item.kind === 'morphology' && item.enabled);
        const analyzed = exact && options.onAnalyzeMorphology ? await options.onAnalyzeMorphology(latin).catch(() => []) : [];
        const token = analyzed.find(item => item.s === range.start && item.e === range.end && item.w === selected);
        const out = [];
        const stale = p => !p || p.text.latin !== latin;
        function choiceItem(option, row, slot) {
            const title = optionName(option.kind) + (slot ? ' · sustituir «' + slot.value + '»' : '');
            out.push([title, () => withSaved(async state => {
                const p = state.edition.placements.find(item => item.id === placement.id);
                if (stale(p)) throw new Error('El latín del cuaderno cambió.');
                const current = p.questions.find(item => item.id === q.id)?.options.find(item => item.id === option.id);
                if (!current?.enabled || JSON.stringify(current) !== JSON.stringify(option)) throw new Error('El apartado ha cambiado.');
                const at = new Date().toISOString();
                const value = generatedAcademicValue(option.kind, row.value);
                const replacement = { id: slot?.id ?? 'slot.' + crypto.randomUUID(), value,
                    proposedLemmaId: row.lemmaId, origin: 'generated', locked: false,
                    provenance: row.evidence, sourceAnchor: fragmentAnchor(latin, range) };
                const options = current.slots.map(item => item.id === slot?.id ? replacement : item);
                if (!slot) options.push(replacement);
                await saveContextOption(state, p, q.id, { ...current, slots: options }, at, title);
            })]);
        }
        if (morph && token && morphChoiceFromToken(token, latin) &&
            !morph.words.some(word => word.surface === selected &&
                placement.text.markup.some(mark => mark.id === word.markId && mark.startUtf16 === range.start))) {
            const target = { placementId: placement.id, ...range, latin };
            if (morph.words.length < 4) out.push(['Análisis morfológico', () => markSelectedWord(target)]);
            else for (const word of morph.words.filter(item => !item.locked))
                out.push(['Análisis morfológico · sustituir «' + word.surface + '»', () => markSelectedWord(target, word.id)]);
        }
        if (!q) return out;
        const key = vocabularyIdentity;
        const occupied = new Set(q.options.flatMap(option => option.slots.filter(slot => !slot.sourceAnchor?.reviewRequired).map(slot => key(slot.value))));
        const forms = new Set([selected, token?.lplain, token?.lemma].filter(Boolean).map(key));
        for (const option of q.options.filter(item => item.enabled)) {
            if (option.kind === 'preverb') continue;
            if (!exact && option.kind !== 'latinism') continue;
            const rows = service().report.bank.verified(option.kind, null, option.kind === 'phonetics' ? rulesFor(q) : undefined);
            const row = rows.find(item => forms.has(key(item.value)) && !occupied.has(key(item.value)));
            if (!row) continue;
            const pending = option.slots.find(slot => slot.sourceAnchor?.reviewRequired && key(slot.value) === key(row.value));
            if (pending && !pending.locked) choiceItem(option, row, pending);
            else if (option.slots.length < countFor(option)) choiceItem(option, row);
            else for (const slot of option.slots.filter(item => !item.locked && item.origin !== 'manual')) choiceItem(option, row, slot);
        }
        const preverb = q.options.find(option => option.kind === 'preverb' && option.enabled && !option.statement.locked);
        if (!preverb || token?.cat !== 'v' || token.aux) return out;
        const catalogue = personalPreverbSnapshot(academicTeacherSnapshotV1);
        const baseId = preverbBaseKeyForForm(catalogue, selected) ??
            (token.lplain && preverbBaseKeyForForm(catalogue, token.lplain));
        if (!baseId) return out;
        const current = preverbBasesFor(preverb, placement);
        const baseIds = [current.sourceKeys[0], current.sourceKeys[3]];

        const bank = service().report.bank;
        const rows = bank.verified('preverb', baseId);
        for (const [index, count] of [[0, 3], [1, 2]]) {
            if (baseIds[1 - index] === baseId || baseIds[index] === baseId &&
                !preverb.contextBases?.some(item => item.index === index && item.anchor.reviewRequired)) continue;
            const otherRows = bank.verified('preverb', baseIds[1 - index]);
            const other = new Set(otherRows.map(item => key(item.value)));
            const eligible = rows.filter(item => !other.has(key(item.value)) && !occupied.has(key(item.value)));
            if (rows.some(item => other.has(key(item.value))) || eligible.length < count) continue;
            const title = 'Modificación preverbial · base ' + (index + 1);
            out.push([title, () => withSaved(async state => {
                const p = state.edition.placements.find(item => item.id === placement.id);
                if (stale(p) || JSON.stringify(p.questions.find(item => item.id === q.id)?.options.find(item => item.id === preverb.id)) !==
                    JSON.stringify(preverb)) throw new Error('El apartado preverbial ha cambiado.');
                const forms = [...current.forms], keys = [...baseIds];
                forms[index] = selected;
                keys[index] = baseId;
                const at = new Date().toISOString();
                const removed = new Set(bank.verified('preverb', baseIds[index]).map(row => row.evidence.recordId));
                const slots = preverb.slots.filter(slot => slot.locked || slot.origin === 'manual' ||
                    !removed.has(slot.provenance?.recordId));
                for (const record of eligible.slice(0, count)) slots.push({ id: 'slot.' + crypto.randomUUID(),
                    value: generatedAcademicValue('preverb', record.value), proposedLemmaId: record.lemmaId,
                    origin: 'generated', locked: false, provenance: record.evidence });
                await saveContextOption(state, p, q.id, { ...preverb, slots,
                    statement: { value: preverbStatement(forms), origin: 'generated', locked: false, lastEditAt: at },
                    preverbBaseIds: keys, preverbBasesProtected: true,
                    contextBases: [...(preverb.contextBases ?? []).filter(item => item.index !== index),
                        { index, baseId, anchor: fragmentAnchor(latin, range) }]
                }, at, title);
                manuallySelectedBases.delete(preverb.id);
            })]);
        }
        return out;
    }
    async function saveContextOption(state, placement, questionId, option, at, label) {
        const saved = await repository.commitEdition(state.edition.id, state.revision,
            { command: 'ui.context-exercise', targetId: option.id, timestamp: at }, original => ({
                ...original, updatedAt: at, placements: original.placements.map(p => p.id !== placement.id ? p : {
                    ...p, questions: p.questions.map(q => q.id !== questionId ? q : {
                        ...q, options: q.options.map(item => item.id === option.id ? option : item)
                    })
                })
            }));
        bind.saved(saved);
        bind.status(label + ' · actualizado.');
    }
    function markSelectedWord(target, replaceId) {`],
    ['            if (marks.some(mark => mark.startUtf16 < target.end && target.start < mark.endUtf16))',
      '            if (marks.some(mark => q.words.some(word => word.markId === mark.id) && mark.startUtf16 < target.end && target.start < mark.endUtf16))'],
    ["            const markId = 'mark.' + crypto.randomUUID();\n            const word = { id: 'morph.'", `            const reusable = marks.find(mark => mark.kind === 'morph-underline' && !mark.reviewRequired &&
                mark.startUtf16 === target.start && mark.endUtf16 === target.end);
            const markId = reusable?.id ?? 'mark.' + crypto.randomUUID();
            const word = { id: 'morph.'`],
    ["markup: [...marks, mark].sort", "markup: (reusable ? marks : [...marks, mark]).sort"],
    ["renderPaperSelect,savePaperSelection,markSelectedWord", "renderPaperSelect,savePaperSelection,markSelectedWord, contextExercises"]
  ], label);
}

export function integrateNotebookQuestionAnchors(source) {
  return patches(source, [
    ["import { morphTypeFromAnalysis", "import { preverbStatement } from './preverb-selection.js';\nimport { morphTypeFromAnalysis"],
    ['/** El título, autor, cita y latín de esta aparición', `export function reanchorNotebookChoices(options, previous, latin, change, warn) {
    const map = (anchor, phrase = false) => {
        if (!anchor || anchor.reviewRequired) return anchor;
        const moved = reanchorGrammarSpan(anchor, previous, latin, change);
        const preservedWord = !change || (phrase ? completeLatinSelection(latin, readRange(moved)) : fullWords(latin, readRange(moved)));
        if (moved.reviewRequired || !preservedWord) { warn?.(); return { ...anchor, reviewRequired: true }; }
        return moved;
    };
    return options.map(option => {
        const slots = option.slots.map(slot => slot.sourceAnchor ? { ...slot, sourceAnchor: map(slot.sourceAnchor, option.kind === 'latinism') } : slot);
        const forms = option.statement.value.match(/\\*([^*]+)\\* \\(3\\) y de \\*([^*]+)\\* \\(2\\)/u);
        if (!option.contextBases?.length || !forms || option.statement.origin !== 'generated') return { ...option, slots };
        const display = forms.slice(1);
        const contextBases = option.contextBases.filter(item => item.baseId === option.preverbBaseIds?.[item.index])
            .map(item => {
                const anchor = map(item.anchor);
                if (anchor.reviewRequired && display[item.index] === item.anchor.exact) display[item.index] = '…';
                else if (!anchor.reviewRequired && display[item.index] === item.anchor.exact) display[item.index] = anchor.exact;
                return { ...item, anchor };
            });
        return { ...option, slots, contextBases, statement: { ...option.statement, value: preverbStatement(display) } };
    });
}
/** El título, autor, cita y latín de esta aparición`],
    ["import { mapRange, readRange }", "import { completeLatinSelection, fullWords, mapRange, readRange }"],
    ["? { ...w, reviewState: 'needs-review' } : w) } : q)", `? { ...w, reviewState: 'needs-review' } : w) } :
                    q.kind === 'choice' ? { ...q, options: reanchorNotebookChoices(q.options, p.text.latin, newLatin) } : q)`],
    ["{ ...w, value, origin: 'manual', locked: true }", "{ ...w, value, origin: 'manual', locked: true, sourceAnchor: undefined }"]
  ], label);
}
