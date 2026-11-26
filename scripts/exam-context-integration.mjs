import { requiredPatch as patch, requiredPatches as patches } from './required-patch.mjs';

const label = 'Menú filológico de Examinator';
export function integrateContextExam(source) {
  return patches(source, [
    ["    M.LatinReader?.reset(); // Cerrar tarjetas asociadas a palabras de la hoja anterior.", `    M.LatinReader?.reset();
    M.atlLatinContext?.bindExamPreview(sh, M.S);`],
    ['      const matched = stableTokenMap(oldTokens, toks);', `      const context = M.atlLatinContext;
      const contextual = typeof S.atlContextPending === 'string' && S.atlContextPending === text;
      const matched = contextual ? context.exactExamTokens(oldTokens, toks) : stableTokenMap(oldTokens, toks);`],
    ['      if (!await restoreTokenLemmas(oldTokens, toks, matched, current) || !current()) return;', `      const priorSelections = contextual ? oldTokens.map(token => token.atlManualReading ? token : { ...token, sel: null }) : oldTokens;
      if (!await restoreTokenLemmas(priorSelections, toks, matched, current) || !current()) return;`],
    ['    t.sel = { lid, morpho }; t.lemma = cd.lemma; t.proper = cd.proper;', `    t.sel = { lid, morpho }; t.lemma = cd.lemma; t.proper = cd.proper;
    t.atlManualReading = true;`],
    ['      if (!candidate || (next.sel && next.sel.lid === old.sel.lid)) continue;', `      if (!candidate) continue;
      if (old.atlManualReading) next.atlManualReading = true;
      if (next.sel?.lid === old.sel.lid && (!old.atlManualReading || next.sel.morpho === old.sel.morpho)) continue;`],
    ['      restoreQuestionChoices(S, oldTokens, oldSubr, oldPrev, matched);', `      if (contextual) {
        const invalid = context.restoreExamContextQuestions(S, oldSubr, oldPrev, matched, S.tokens.flatMap(token => P.prevCandidates({ ...S, tokens: [token] })));
        if (invalid) M.toast('Revisa las referencias de preguntas afectadas (' + invalid + ').', 6500);
      } else restoreQuestionChoices(S, oldTokens, oldSubr, oldPrev, matched);`],
    ['    S.subr = morphology.chooseMarks(S, saved);', `    S.subr = [...morphology.chooseMarks(S, saved), ...previousSubr.filter(mark => mark.anchor)];`],
    ['    for (const v of S.vocabItems || []) if (v.manual) items.push(v);', `    for (const v of S.vocabItems || []) {
      if (v.lid && lids.includes(v.lid)) continue;
      if (v.manual || v.eHead || v.eTrad || v.eNote) items.push({ ...v, manual: true });
    }`],
    ['      inp.oninput = () => { S.literatura[inp.dataset.lit] = inp.value; changed(); };', `      inp.oninput = () => {
        if (inp.dataset.lit === 'texto' && inp.value !== S.literatura.texto)
          preserveEditorial(S.literatura, inp.value);
        S.literatura[inp.dataset.lit] = inp.value; changed();
      };`],
    ['        S[inp.dataset.k] = inp.value;', `        if (inp.dataset.k === 'texto' && inp.value !== S.texto) {
          preserveEditorial(S, inp.value);
          delete S.atlContextPending;
        }
        S[inp.dataset.k] = inp.value;`],
    ["    renderSource();\n    $('.qty', ed).value = S.qty;", `    renderSource();
    for (const field of [$('.full textarea[data-k="texto"]', ed), $('.full textarea[data-lit="texto"]', ed)]) {
      const lit = field.hasAttribute('data-lit');
      M.atlLatinContext?.bindExamContext(field, S, lit, {
        current: () => M.S === S,
        report: M.toast,
        get morphology() { return morphology; },
        academicChanged() { renderWords(); renderVocab(); renderSubr(); renderQ4(); changed(); },
        changed(textChanged) {
          if (!lit && textChanged) {
            ++anaSeq;
            $('#busy').classList.add('hidden');
            if (S.texto !== S.textAnalyzed || S.atlContextPending === S.texto) void M.analyzeNow(true);
          }
          if (!lit) { renderWords(); renderSubr(); renderQ4(); }
          changed();
        }
      });
    }
    $('.qty', ed).value = S.qty;`],
    ['  function renderSource() {', `  function preserveEditorial(state, latin) {
    const invalid = M.atlLatinContext?.conservativeExamFormatting(state, latin);
    if (invalid) M.toast('Revisa los subrayados afectados (' + invalid + ').', 6500);
  }
  function renderSource() {`],
    ["    Object.assign(S, { source: 'lib', urn: d.urn, texto: d.text", `    delete S.atlContextPending;
    delete S.atlSpelling;
    delete S.atlQuestionAnchors;
    S.subr = S.subr.filter(mark => !mark.anchor);
    Object.assign(S, { source: 'lib', urn: d.urn, texto: d.text`],
    ['    M.renderEditor();\n    M.analyzeNow(true);\n    changed();', `    S.subr.push(...(d.bank?.underlines ?? []).map(anchor => ({ cat: 'editorial', toks: [], anchor })));
    M.renderEditor();
    M.analyzeNow(true);
    changed();`],
    ['    const textChanged = d.text !== S.texto;', `    const textChanged = d.text !== S.texto;
    if (textChanged) {
      delete S.atlContextPending;
      delete S.atlSpelling;
      delete S.atlQuestionAnchors;
      S.subr = S.subr.filter(mark => !mark.anchor);
      S.subr.push(...(d.bank.underlines ?? []).map(anchor => ({ cat: 'editorial', toks: [], anchor })));
    }`],
    ["          if (result.marks.length) S.subr = result.marks;", "          if (result.marks.length) S.subr = [...result.marks, ...S.subr.filter(mark => mark.anchor)];"],
    ["    if (S.texto && S.texto !== S.textAnalyzed) M.analyzeNow();", "    if (S.atlContextPending === S.texto || S.texto && S.texto !== S.textAnalyzed) M.analyzeNow(true);"],
    ["const saved = S.subr.filter(mark => mark.manual);", "const saved = S.subr.filter(mark => mark.manual && mark.toks.length);"],
    ["      S.subr = morphology.chooseMarks(S, proposed);", "      S.subr = [...morphology.chooseMarks(S, proposed), ...S.subr.filter(mark => mark.anchor)];"],
    ["      S.subr = morphology.chooseMarks(S, S.subr.filter(mark => mark.toks.length));", "      S.subr = [...morphology.chooseMarks(S, S.subr.filter(mark => mark.toks.length)), ...S.subr.filter(mark => mark.anchor)];"],
    ['    const list = S.subr;', '    const list = S.subr.filter(mark => mark.toks.length);'],
    ['S.subr === list && S.tokens[token.i] === token &&\n            morphology.setMark(S, token, Number($(\'.morph-replacement\', body).value))',
      "list.every(mark => S.subr.includes(mark)) && S.tokens[token.i] === token &&\n            morphology.setMark(S, token, S.subr.indexOf(list[Number($('.morph-replacement', body).value)]))"]
  ], label);
}

export function integrateExamContextValidation(source) {
  return patch(source, "    if (saved.prev && saved.prev.some", `    M.atlLatinContext?.validateExamContext(saved);
    if (saved.prev && saved.prev.some`, label);
}

export function integrateExamContextRender(source) {
  return patches(source, [
    ['  E.textRuns = function (S) {', '  function baseTextRuns(S) {'],
    ['  };\n  // La literatura mantiene intacto el texto', `  }
  E.textRuns = S => {
    const base = () => baseTextRuns(S);
    const runs = M.atlLatinContext?.examTextRuns(S, () => null);
    if (!runs) return base();
    for (const run of runs) run.t = run.t.replace(/\\s*\\n\\s*/g, ' ');
    return editorialRuns(runs);
  };
  // La literatura mantiene intacto el texto`],
    ['    return hit && hit.source === L.texto ? hit.value : L.texto;', `    return hit && hit.source === L.texto && hit.format === L.atlSpelling ? hit.value : L.texto;`],
    ['  E.prepareLiterature = async (S) => {', `  E.literatureRuns = S => {
    const L = S.literatura;
    const hit = latinLiteratureCache.get(L);
    const source = L.texto;
    const tokens = hit?.source === source ? hit.tokens : [];
    return editorialRuns(M.atlLatinContext?.examTextRuns({ ...L, tokens, textAnalyzed: source }, () => null)
      ?? [{ t: E.literatureLatin(S) }]);
  };
  E.prepareLiterature = async (S) => {`],
    ['    if (hit && hit.source === source) return false;\n    let result;\n    try { result = await M.call(\'ligateText\', { text: source }); }', `    const format = L.atlSpelling;
    const marked = Boolean(L.subr?.length || format?.length);
    if (hit && hit.source === source && hit.format === format && Boolean(hit.tokens) === marked) return false;
    let result, tokens;
    try {
      if (marked) {
        tokens = await M.call('analyze', { text: source });
        result = M.atlLatinContext.examTextRuns({ ...L, tokens, textAnalyzed: source }, () => [{ t: source }])
          .map(run => run.t).join('');
      } else result = await M.call('ligateText', { text: source });
    }`],
    ['    if (S.literatura !== L || L.texto !== source) return false;\n    latinLiteratureCache.set(L, { source, value: result });',
      '    if (S.literatura !== L || L.texto !== source || L.atlSpelling !== format) return false;\n    latinLiteratureCache.set(L, { source, value: result, tokens, format });'],
    ['runsHtml(editorialRuns([{ t: E.literatureLatin(S) }]))', 'runsHtml(E.literatureRuns(S))'],
    ['      const half = Math.round(W / 2), rest = W - half;', `      const latinParagraphs = [[]];
      for (const run of E.literatureRuns(S)) {
        run.t.split(/\\r?\\n/).forEach((line, index) => {
          if (index) latinParagraphs.push([]);
          if (line) latinParagraphs.at(-1).push({ t: line, i: !run.n, u: run.u });
        });
      }
      const formattedLiterature = latinParagraphs.map(runs => para(runs,
        '<w:spacing w:before="0" w:after="0" w:line="300" w:lineRule="auto"/>', litFont)).join('');
      const half = Math.round(W / 2), rest = W - half;`],
    ['litCell(litParagraphs(E.literatureLatin(S), true), half)', 'litCell(formattedLiterature, half)']
  ], label);
}
