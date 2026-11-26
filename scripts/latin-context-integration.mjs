import { requiredPatch as patch, requiredPatches as patches } from './required-patch.mjs';

const bank = 'Menú filológico del Banco';
const notebook = 'Menú filológico de Cuaderno';

export function integrateContextGrammar(source) {
  return patches(source, [
    ["import { fingerprintForMark", "import { mapRange, readRange } from '../../shared/latin-context-edit.js';\nimport { fingerprintForMark"],
    ['function reanchorGrammarSpan(span, previous, latin)', 'function reanchorGrammarSpan(span, previous, latin, change)'],
    ['    if (span.reviewRequired)\n        return span;', `    if (span.reviewRequired)
        return span;
    if (change) {
        const mapped = mapRange(readRange(span), change, { preserveContent: true });
        if (!mapped)
            return { ...span, reviewRequired: true };
        const { start, end } = mapped;
        return { ...span, startUtf16: start, endUtf16: end, exact: latin.slice(start, end),
            textFingerprint: fingerprintForMark(latin, start, end) };
    }`]
  ], notebook);
}

export function integrateContextNotebook(source) {
  return patches(source, [
    ["import { createEdition", `import { bindLatinContext, createContextHistory, showLatinField } from '../../shared/latin-context-menu.js';
import { applyNotebookSnapshot, editNotebookSnapshot, notebookMarks, notebookSnapshot } from './atl-notebook-context.js';
import { createEdition`],
    ['    function menuText(panel, p) {', `    const contextHistories = new Map();
    function bindNotebookContext(field, p) {
        const editionId = draft.id;
        const key = editionId + ':' + p.id;
        if (!contextHistories.has(key)) contextHistories.set(key, createContextHistory());
        const history = contextHistories.get(key);
        const placement = () => draft?.id === editionId && draft.placements.find(item => item.id === p.id);
        const read = () => placement() && notebookSnapshot(placement());
        function write(snapshot, range) {
            if (!placement()) throw new Error('La aparición ya no está abierta.');
            const before = draft;
            apply((edition, at) => applyNotebookSnapshot(edition, p.id, snapshot, at));
            if (before === draft) return false;
            clearTimeout(vocabularyAnalysisTimer);
            showLatinField(field, snapshot.latin, range);
            return range;
        }
        field.addEventListener('input', history.reset);
        bindLatinContext(field, {
            text: () => field.value,
            report: setMessage,
            history: () => history.actions(read, write),
            underlines: range => {
                const current = placement();
                return current ? notebookMarks(current, range) : {};
            },
            edit(change, range, action) {
                const current = placement();
                if (!current || current.text.latin !== field.value) throw new Error('El latín de la aparición ha cambiado.');
                const before = notebookSnapshot(current);
                const result = editNotebookSnapshot(current, change, range, action, freshId);
                const selected = change?.range ?? range;
                if (write(result.next, selected) === false) return;
                history.record(before, read());
                if (result.invalid) setMessage('Revisa las marcas o referencias afectadas (' + result.invalid + ').');
                return selected;
            }
        });
    }
    function menuText(panel, p) {`],
    ['        if (textArea)\n            panel.append(academics.renderTextSelect(p, textArea));', `        if (textArea) {
            bindNotebookContext(textArea, p);
            panel.append(academics.renderTextSelect(p, textArea));
        }`]
  ], notebook);
}

export function integrateContextCorpus(source) {
  return patches(source, [
    ["import { communities", "import { normalizeUnderlines } from '../../shared/latin-context-edit.js';\nimport { communities"],
    ["'courseIds', 'pauCv']);", "'courseIds', 'pauCv', 'editorialUnderlines']);"],
    ['        ...(data.origin === undefined', `        ...(data.editorialUnderlines === undefined ? {} : {
            editorialUnderlines: normalizeUnderlines(data.editorialUnderlines, nonBlank(data.latin, path + '.latin', 200_000)) ??
                invalid(path + '.editorialUnderlines', 'anclajes de subrayado inválidos')
        }),
        ...(data.origin === undefined`]
  ], bank);
}

export function integrateContextWrites(source) {
  return patch(source, '        tagIds: previous?.tagIds ?? [],', `        tagIds: previous?.tagIds ?? [],
        ...((draft.editorialUnderlines ?? (previous?.latin === draft.latin.trim() ? previous.editorialUnderlines : undefined)) === undefined ? {} :
            { editorialUnderlines: draft.editorialUnderlines ?? previous.editorialUnderlines }),`, bank);
}

export function integrateContextFactory(source) {
  return patches(source, [
    ["import { validateEdition } from './edition-validation.js';", "import { validateEdition, fingerprintForMark } from './edition-validation.js';"],
    ['    placement.vocabulary =', `    if (text.grammaticalSpans?.length) placement.grammaticalSpans = text.grammaticalSpans.map(span => ({ ...span, id: nextId() }));
    placement.text.markup = (text.editorialUnderlines ?? []).map(mark => ({
        ...mark, id: nextId(), kind: 'morph-underline', reviewRequired: false,
        textFingerprint: fingerprintForMark(text.latin, mark.startUtf16, mark.endUtf16)
    }));
    placement.vocabulary =`]
  ], bank);
}

export function integrateContextBank(source) {
  source = "import { bindBankContext, renderBankEditorialField } from './atl-bank-editorial-context.js';\n" + source;
  return patches(source, [
    ["    const glossary = vocabularyEditor(source);", `    const glossary = vocabularyEditor(source);
    const context = bindBankContext(inputs.get('latin'), source, M.toast);`],
    ['        if (!data.title || !data.latin)', `        const contextual = context.forSave(data.latin);
        if (!data.title || !data.latin)`],
    ['            if (same && data.difficulty', '            if (same && !contextual.changed && data.difficulty'],
    ['            if (changedLatin && current.teacherDocx &&', `            if (changedLatin && !saveCopy && (current.selectividad || current.teacherDocx?.pauCv) &&
                (contextual.edited || !current.teacherDocx) && !window.confirm(
                'Este es un texto de Selectividad. ¿Confirmas que quieres guardar el latín modificado?')) return;
            if (changedLatin && current.teacherDocx && !contextual.edited &&`],
    ['const ownVocabulary = current.teacherDocx && changedLatin', 'const ownVocabulary = current.teacherDocx && changedLatin && !contextual.edited'],
    ['                vocabulary: ownVocabulary ?? current.vocabulary },', `                vocabulary: ownVocabulary ?? current.vocabulary,
                editorialUnderlines: current.teacherDocx && contextual.edited ? [] : contextual.underlines },`],
    ['            if (!changedLatin && current.teacherDocx) {', '            if (current.teacherDocx && (!changedLatin || contextual.edited)) {'],
    ['                    vocabulary: vocabulary ?? current.teacherDocx.vocabulary };', `                    latin: data.latin, underlines: contextual.underlines ?? current.teacherDocx.underlines,
                    vocabulary: vocabulary ?? current.teacherDocx.vocabulary };`],
    ['const saveCopy = linked && !same && !current.teacherDocx;', 'const saveCopy = linked && (!same || contextual.changed) && !current.teacherDocx;'],
    ['if (saveCopy && !changedLatin) next = attachGrammarTags', 'if (saveCopy) next = attachGrammarTags'],
    ["    latinField.classList.add('atl-edit-latin-field');", "    latinField.classList.add('atl-edit-latin-field');\n    renderBankEditorialField(latin, text => callCollatinus('ligateText', { text }));"],
    ["latin.addEventListener('input', updateCount);", "latin.addEventListener('input', updateCount);\n    latin.addEventListener('atl-latin-change', updateCount);"],
    ["        field.addEventListener('input', () => fitReading(field));", "        field.addEventListener('input', () => fitReading(field));\n        field.addEventListener('atl-latin-change', () => fitReading(field));"],
    ['            let reviewNotice = \'\';', `            let reviewNotice = contextual.invalid ? ' Revisa los subrayados afectados (' + contextual.invalid + ').' : '';`],
    ['                const needsReview = await carryBankReview(current, savedSource);', '                const needsReview = await carryBankReview(current, savedSource, localStorage, contextual.change);'],
    ['    const dirty = () => snapshot() !== initial', '    const dirty = () => context.dirty() || snapshot() !== initial'],
    ["form.addEventListener('input', updateDirty);", "form.addEventListener('input', updateDirty);\n    form.addEventListener('atl-latin-change', updateDirty);"],
    ["inputs.get('latin').addEventListener('input', updateEstimate);", "inputs.get('latin').addEventListener('input', updateEstimate);\n    inputs.get('latin').addEventListener('atl-latin-change', updateEstimate);"],
    ["latin.addEventListener('input', () => { staleTags.hidden = latin.value === source.latin; });",
      "for (const event of ['input', 'atl-latin-change']) latin.addEventListener(event, () => { staleTags.hidden = latin.value === source.latin; });"]
  ], bank);
}
