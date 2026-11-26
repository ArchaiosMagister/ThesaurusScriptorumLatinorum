import { academicActions } from '../../shared/latin-context-academic.js';
import { completeLatinSelection, fullWords, mapRange, normalizeUnderlines, readRange, span } from '../../shared/latin-context-edit.js';

const kinds = {
  evol: ['Evolución fonética', entry => entry?.w ?? ''],
  pref: ['Prefijos', entry => entry ?? ''],
  latin: ['Latinismos', entry => entry ?? '']
};

export function reanchorExamExercises(state, next, change, map = (range, _, kind) => mapRange(range, change, { preserveContent: true, token: kind !== 'latin' })) {
  let invalid = 0;
  next.atlQuestionAnchors = (state.atlQuestionAnchors ?? []).flatMap(item => {
    const field = kinds[item.kind];
    if (!field || field[1](state[item.kind]?.[item.index]) !== item.value) return [];
    const mapped = map(readRange(item.anchor), item.anchor, item.kind);
    if (mapped && completeLatinSelection(change.latin, mapped)) return [{ ...item, anchor: span(change.latin, mapped) }];
    next[item.kind] = [...next[item.kind]];
    next[item.kind][item.index] = item.kind === 'evol' ? { w: '', g: '' } : '';
    invalid++;
    return [];
  });
  return invalid;
}

export function validateExamExercises(state) {
  if (state.atlQuestionAnchors === undefined) return;
  const items = state.atlQuestionAnchors;
  if (!Array.isArray(items) || items.length > 12 || items.some(item => !item || !Object.hasOwn(kinds, item.kind) ||
      !Number.isInteger(item.index) || item.index < 0 || item.index > 3 || typeof item.value !== 'string' ||
      !normalizeUnderlines([item.anchor], state.texto)) ||
      new Set(items.map(item => item.kind + ':' + item.index)).size !== items.length)
    throw new Error('Las referencias de las preguntas no coinciden con el texto latino.');
}

export function examAcademic(field, exam, literature, callbacks, range, point, record = work => work()) {
  const M = window.M, latin = (field.value ?? field.textContent);
  const current = () => callbacks.current() && field.isConnected && (field.value ?? field.textContent) === latin;
  const tokenFor = async () => (await M.LatinReader.tokensForSelection(field, latin, range, literature))
    .find(token => token.s === range.start && token.e === range.end);
  const key = M.LexicalFilters.key;

  async function propose() {
    const token = await tokenFor(), selected = latin.slice(range.start, range.end);
    const lid = token?.sel?.lid;
    if (lid !== undefined) {
      const [entry] = await M.vocabEntries({ lids: [lid], mode: exam.qty }, [token]);
      if (entry) return { headword: entry.head, meaning: entry.trad, note: entry.note, lid, preferred: entry.preferred };
    }
    const fromBank = M.Vocabulary.find([selected], true) || M.Vocabulary.find([selected]);
    return fromBank ? { headword: fromBank.head, meaning: fromBank.trad, note: fromBank.note } : { headword: selected };
  }

  function saveVocabulary(proposal) {
    return record(() => {
      const find = entry => proposal.lid !== undefined && entry.lid === proposal.lid ||
        key(entry.head) === key(proposal.headword);
      const index = exam.vocabItems.findIndex(find);
      const previous = exam.vocabItems[index];
      const manual = previous?.manual || previous?.eHead || previous?.eTrad || previous?.eNote;
      if (manual) {
        previous.on = true;
        callbacks.report('Entrada docente existente conservada.', 5000);
      } else {
        const entry = { ...previous, lid: proposal.lid ?? previous?.lid, manual: true, on: true,
          head: proposal.headword, trad: proposal.meaning ?? '', note: proposal.note ?? '',
          eHead: true, eTrad: true, eNote: true };
        if (previous) exam.vocabItems[index] = entry;
        else exam.vocabItems.push(entry);
        callbacks.report('Entrada incorporada al vocabulario.', 5000);
      }
      callbacks.academicChanged();
    });
  }

  async function exercises() {
    const exact = fullWords(latin, range) && !/\s/u.test(latin.slice(range.start, range.end));
    const token = exact ? await tokenFor() : undefined;
    if (!current()) return [];
    const selected = latin.slice(range.start, range.end);
    const P = M.Propose, F = M.LexicalFilters;
    const vocabulary = new Set([selected, token?.lplain, token?.lemma].filter(Boolean).map(key));
    const result = [];
    const matches = value => vocabulary.has(key(value));
    function add(kind, value) {
      if (value === undefined) return;
      const [title, display] = kinds[kind];
      const word = display(value);
      const prior = exam[kind].slice();
      if (!word || prior.some(entry => key(display(entry)) === key(word))) return;
      const free = [0, 1, 2, 3].find(index => !display(prior[index]));
      const targets = free !== undefined ? [free] : [0, 1, 2, 3];
      for (const index of targets) result.push([title + (display(prior[index]) ? ' · sustituir «' + display(prior[index]) + '»' : ''), () => record(() => {
        if (!current() || JSON.stringify(exam[kind]) !== JSON.stringify(prior)) throw new Error('El apartado ha cambiado.');
        const next = prior.slice();
        next[index] = value;
        exam[kind] = next;
        exam.atlQuestionAnchors = [...(exam.atlQuestionAnchors ?? []).filter(item => item.kind !== kind || item.index !== index),
          { kind, index, value: word, anchor: span(latin, range) }];
        callbacks.academicChanged();
      })]);
    }

    const currentAnalysis = exam.textAnalyzed === latin && !exam.atlContextPending;
    const morph = exam.subr.filter(mark => mark.toks.length);
    if (token && currentAnalysis && callbacks.morphology?.readings(token).length &&
        !morph.some(mark => mark.toks.includes(token.i))) {
      const prior = exam.subr;
      const targets = morph.length < 4 ? [null] : morph;
      for (const existing of targets) {
        const name = 'Análisis morfológico' + (existing ?
          ' · sustituir «' + existing.toks.map(i => exam.tokens[i]?.w).join(' ') + '»' : '');
        result.push([name, () => record(() => {
          if (!current() || exam.subr !== prior || exam.tokens[token.i] !== token)
            throw new Error('Las apariciones morfológicas han cambiado.');
          if (!callbacks.morphology.setMark(exam, token, existing ? prior.indexOf(existing) : -1)) return false;
          callbacks.academicChanged();
        })]);
      }
    }

    if (!exam.atlPauLexical) {
      if (exact) {
        const evolution = F.evolCandidates(exam).find(item => matches(item.w));
        const usedLabels = new Set(exam.evol.map(item => item?.g));
        if (evolution) add('evol', { w: evolution.w, g: evolution.labels.find(item => !usedLabels.has(item)) ?? evolution.labels[0] });
        const prefix = (M.lists.prefijos ?? []).find(matches);
        if (prefix) add('pref', P.prefDisplay(prefix));
      }
      const latinism = F.latinPool(exam).map(P.latDisplay).find(matches);
      if (latinism) add('latin', latinism);

      const candidate = currentAnalysis && token && P.prevCandidates({ ...exam, tokens: [token] })[0];
      if (candidate && !exam.prev.some(item => item.lplain === candidate.lplain || key(item.txt) === key(candidate.txt))) {
        const prior = exam.prev;
        for (const [index, row] of prior.entries()) {
          const other = prior[1 - index];
          if (candidate.rows.length < row.n || other?.lplain && P.prevClashes(candidate, { ...other, rows: other.rows ?? [] })) continue;
          result.push(['Modificación preverbial · base ' + (index + 1), () => record(() => {
            if (!current() || exam.prev !== prior) throw new Error('Las bases preverbiales han cambiado.');
            exam.prev = prior.map((entry, i) => i === index ? { ...candidate, n: row.n } : entry);
            callbacks.academicChanged();
          })]);
        }
      }
    }
    return result;
  }

  const readOnly = !(field instanceof HTMLTextAreaElement) || field.readOnly;
  return academicActions(field, latin, range, point, {
    current,
    report: (message, error) => callbacks.report(message, error ? 6500 : 5000),
    consult: () => M.LatinReader.consult(field, latin, range, point, literature),
    ...(!literature && !readOnly ? { propose, saveVocabulary, exercises } : {})
  });
}
