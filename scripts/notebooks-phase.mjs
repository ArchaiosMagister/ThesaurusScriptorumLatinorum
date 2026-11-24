function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Revisar la integración de Cuadernos: ' + from);
  return source.replace(from, () => to);
}

export function integrateNotebookWorkflow(source) {
  source = replaceOnce(source, 'function openOwnTexts() {', `async function openOwnTexts() {
    try { await reload(); }
    catch (error) { M.toast('No se pudo abrir el banco: ' + String(error), 6500); return; }
    if (!active()) return;
    const editionId = currentId;
    const marked = new Set();
    const incorporated = new Set();
    let adding = false;
    const batch = button('Añadir seleccionados (0)', () => addSources([...marked]), 'hbtn primary');
    batch.disabled = true;
    function updateBatch() {
        batch.textContent = 'Añadir seleccionados (' + marked.size + ')';
        batch.disabled = adding || !marked.size;
    }
    async function addSources(ids) {
        if (adding || !ids.length) return;
        adding = true;
        updateBatch();
        try {
            await writeSource(async () => {
                for (const id of ids) {
                    if (!active() || currentId !== editionId) throw Error('Vuelve al cuaderno donde elegiste los textos.');
                    const original = corpus.texts.find(text => text.id === id);
                    if (original && composer.activeEdition()?.excludedCourse &&
                        (original.courseIds ?? []).includes(composer.activeEdition().excludedCourse))
                        throw Error('El curso de este texto está excluido del cuaderno.');
                    if (!await composer.addSourceToNotebook(id)) throw Error('No se ha podido añadir un texto. Los anteriores se han guardado.');
                    marked.delete(id);
                    incorporated.add(id);
                    const placement = composer.activePlacement();
                    if (placement && !placement.vocabulary.length) {
                        void enrichVocabulary(placement.text.latin, placement.id, editionId);
                    }
                }
            });
            close();
        } finally {
            adding = false;
            updateBatch();
            await reload();
            render();
            if (panel.isConnected) populate();
        }
    }`);
  const availableTexts = /const\s+availableTexts\s*=\s*corpus\.texts\.filter\(\s*t\s*=>\s*!alreadyUsed\(t\)\s*\)\s*;/u;
  if (!availableTexts.test(source)) throw Error('Revisar la selección por curso en Cuadernos.');
  source = source.replace(availableTexts, () => "const excludedCourse = composer.activeEdition()?.excludedCourse;\n    const availableTexts = corpus.texts.filter(t => !alreadyUsed(t) &&\n      !(t.courseIds ?? []).includes(excludedCourse));");
  const alreadyCount = /const\s+alreadyCount\s*=\s*corpus\.texts\.length\s*-\s*availableTexts\.length\s*;/u;
  if (!alreadyCount.test(source)) throw Error('Revisar la contabilización de cursos de Cuadernos.');
  source = source.replace(alreadyCount, () => "const alreadyCount = corpus.texts.filter(alreadyUsed).length;\n    const excludedCount = corpus.texts.length - alreadyCount - availableTexts.length;\n    if (excludedCount) panel.append(el('p','small muted',\n      excludedCount + ' textos ocultos por el curso excluido del cuaderno.'));");
  source = replaceOnce(source, "    const alreadyUsed = (text) => usedIds.has(text.id) || placements.some(p =>",
    "    const alreadyUsed = (text) => usedIds.has(text.id) || (!text.teacherDocx && placements.some(p => !p.source.sourceId &&");
  source = replaceOnce(source, 'p.text.reference === text.source.reference);', 'p.text.reference === text.source.reference));');
  source = replaceOnce(source, '    panel.append(input, count, filtersPanel, list);', '    panel.append(input, count, filtersPanel, batch, list);');
  source = replaceOnce(source, "foldLatin([t.title, t.source.author ?? '', t.source.work ?? '', t.source.reference ?? '']",
    "foldLatin([t.title, t.latin, t.source.author ?? '', t.source.work ?? '', t.source.reference ?? '']");
  source = replaceOnce(source, '        const matching = availableTexts.filter(t => foldLatin(',
    '        const matching = availableTexts.filter(t => !incorporated.has(t.id) && foldLatin(');
  source = replaceOnce(source, "matching.length + ' de ' + availableTexts.length +",
    "matching.length + ' de ' + (availableTexts.length - incorporated.size) +");
  const startMarker = "            if (active()) {\n                const add = button('Añadir al cuaderno',";
  const endMarker = '            list.append(row);';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Revisar las acciones del selector de Cuadernos.');
  source = source.slice(0, start) + `            const choose = el('label', 'atl-notebook-source-choice');
            const check = el('input');
            check.type = 'checkbox';
            check.value = t.id;
            check.checked = marked.has(t.id);
            check.addEventListener('change', () => {
                if (check.checked) marked.add(t.id);
                else marked.delete(t.id);
                updateBatch();
            });
            choose.append(check, ' Seleccionar «' + t.title + '»');
            const add = button('Añadir al cuaderno', () => addSources([t.id]), 'hbtn');
            add.setAttribute('aria-label', 'Añadir «' + t.title + '» al cuaderno');
            row.append(choose, add);
` + source.slice(end);

  source = replaceOnce(source, '    const match = saved.corpus.texts.find(t => t.latin === clean.latin',
    '    const matches = saved.corpus.texts.filter(t => t.latin === clean.latin');
  source = replaceOnce(source, '    const distinctDocx = requiresDistinctDocxSource(match, normalized);', `    const exactWord = normalized && matches.find(text => text.teacherDocx && !requiresDistinctDocxSource(text, normalized));
    if (reviewedBatch && exactWord) return exactWord.id;
    const match = exactWord || matches[0];
    const distinctDocx = requiresDistinctDocxSource(match, normalized) || Boolean(normalized && match && !match.teacherDocx);`);
  source = replaceOnce(source, '    if (reviewedBatch)\n        return;', '    if (reviewedBatch)\n        return id;');
  source = replaceOnce(source, "                            throw Error('Vuelve al cuaderno donde elegiste los archivos.');\n                        if (!await composer.importTeacherDocument(data))",
    `                            throw Error('Vuelve al cuaderno donde elegiste los archivos.');
                        const sourceId = await saveBankText({ title: data.title, latin: data.latin,
                            author: data.author ?? '', work: data.work ?? '', reference: data.reference ?? '' }, data, true);
                        if (currentId !== editionId || !await composer.addSourceToNotebook(sourceId))`);
  source = replaceOnce(source, '        if (toBank) {\n            // La confirmación del lote',
    '        {\n            // La confirmación del lote');
  return source;
}

export function integrateEditionSourceRefresh(source) {
  return replaceOnce(source, '    function menuText(panel, p) {', `    async function refreshPlacementSource(placementId) {
        try {
            if (!await flush() || !draft || !options.findCorpusSource) return;
            const edition = draft;
            const placement = selection();
            if (!placement || placement.id !== placementId || !placement.source.sourceId) return;
            const source = await options.findCorpusSource(placement.source.sourceId);
            if (!source) throw new Error('La ficha ya no está en el banco. El cuaderno conserva su copia.');
            if (draft !== edition || selection()?.id !== placementId) throw new Error('El cuaderno cambió. Vuelve a intentarlo.');
            const fields = Object.entries({ latin: source.latin, author: source.source.author,
                work: source.source.work, reference: source.source.reference })
                .filter(([key, value]) => placement.text[key] !== value);
            if (!fields.length) {
                setMessage('El pasaje y la referencia coinciden con los del banco.');
                return;
            }
            const at = now();
            // Validate the whole change before touching the draft.
            let updated = edition;
            for (const [key, value] of fields) updated = editPlacementText(updated, placement.id, key, value, at);
            updated = validateEdition({ ...updated, placements: updated.placements.map(item => item.id === placement.id
                ? { ...item, source: { ...item.source, importedAt: at } }
                : item) });
            if (!window.confirm('¿Copiar el latín y la referencia actuales del banco? Se conservan el título docente, las preguntas, el vocabulario y las anotaciones. Las marcas afectadas quedarán pendientes de revisión.')) return;
            draft = updated;
            academics.clear();
            vocabPreview = null;
            exportReview = null;
            const saved = await flush();
            paint();
            if (saved) setMessage('Copia del banco actualizada y guardada. Revisa las marcas señaladas.');
        } catch (error) {
            setMessage('No se ha actualizado la copia: ' + (error.message || String(error)), true);
        }
    }

    function menuText(panel, p) {
        if (p.source.kind === 'corpus' && p.source.sourceId && options.findCorpusSource) {
            panel.append(action('Actualizar desde el banco', () => refreshPlacementSource(p.id)));
        }`);
}
