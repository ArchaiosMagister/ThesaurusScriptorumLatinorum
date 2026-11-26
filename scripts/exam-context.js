import { examAcademic, reanchorExamExercises, validateExamExercises } from './atl-exam-context-academic.js';
import { bindLatinContext, createContextHistory, showLatinField } from '../../shared/latin-context-menu.js';
import { changeUnderlines, fullWords, mapRange, normalizeUnderlines, overlaps, readRange, span, unmarkedRanges } from '../../shared/latin-context-edit.js';

const histories = new WeakMap();
const tokenRange = token => ({ start: token.s, end: token.e });

function storedMarks(state) {
  return state.subr?.flatMap(mark => mark.toks.length ? [] : mark.anchor ? [mark.anchor] : []) ?? [];
}

function tokenMark(mark, state) {
  const tokens = mark.toks.map(i => state.tokens?.[i]);
  if (tokens.length && tokens.every(token => token && token.w === state.texto.slice(token.s, token.e)))
    return { start: tokens[0].s, end: tokens.at(-1).e };
  return null;
}

function clearPrev(entry) {
  return { txt: '', n: entry.n, rows: [], lplain: '' };
}

function read(state, literature) {
  if (literature) return { texto: state.texto, subr: state.subr ?? [], atlSpelling: state.atlSpelling ?? [] };
  return {
    texto: state.texto, subr: state.subr, atlSpelling: state.atlSpelling ?? [],
    atlContextPending: state.atlContextPending ?? null, textAnalyzed: state.textAnalyzed,
    tokens: state.tokens, vocabItems: state.vocabItems, prev: state.prev, evol: state.evol, pref: state.pref, latin: state.latin,
    atlQuestionAnchors: state.atlQuestionAnchors ?? []
  };
}

function key(snapshot) {
  return JSON.stringify([snapshot.texto, snapshot.atlSpelling, snapshot.subr.map(mark => mark.toks.length ?
    [mark.cat, tokenMark(mark, snapshot), mark.manual, mark.lemmaId, mark.analysis] : mark.anchor),
    snapshot.prev?.map(entry => [entry.txt, entry.n, entry.lplain]), snapshot.evol, snapshot.pref, snapshot.latin, snapshot.atlQuestionAnchors,
    snapshot.vocabItems?.filter(item => item.manual || item.eHead || item.eTrad || item.eNote)]);
}

function reanchor(state, change, literature) {
  const project = anchor => {
    const range = mapRange(readRange(anchor), change, { preserveContent: true });
    return range ? [span(change.latin, range)] : [];
  };
  const editorial = storedMarks(state);
  const moved = editorial.flatMap(project);
  const atlSpelling = (state.atlSpelling ?? []).flatMap(project);
  if (change.orthography) atlSpelling.push(span(change.latin, change.range));
  const next = { ...state, texto: change.latin, atlSpelling,
    subr: moved.map(anchor => ({ cat: 'editorial', toks: [], anchor })) };
  let invalid = editorial.length - moved.length;
  if (literature) return { next, invalid };

  const byIndex = new Map();
  const before = state.textAnalyzed === state.texto || state.atlContextPending === state.texto;
  next.tokens = before ? state.tokens.flatMap(token => {
    const range = mapRange(tokenRange(token), change, { preserveContent: true, token: true });
    if (!range) return [];
    const w = change.latin.slice(range.start, range.end);
    const copy = { ...token, w, s: range.start, e: range.end, i: byIndex.size };
    if (w !== token.w) delete copy.lig;
    byIndex.set(token.i, copy.i);
    return [copy];
  }) : [];
  for (const mark of state.subr.filter(item => item.toks.length)) {
    const toks = mark.toks.map(i => byIndex.get(i));
    if (toks.some(i => i === undefined) || !fullWords(next.texto, {
      start: next.tokens[toks[0]].s, end: next.tokens[toks.at(-1)].e
    })) invalid++;
    else next.subr.push({ ...mark, toks });
  }
  next.prev = state.prev.map(entry => {
    if (!Number.isInteger(entry.i)) return entry;
    const i = byIndex.get(entry.i);
    if (i !== undefined) return { ...entry, i };
    if (entry.txt) invalid++;
    return clearPrev(entry);
  });
  invalid += reanchorExamExercises(state, next, change);
  next.atlContextPending = change.latin;
  return { next, invalid };
}

function uniqueAnchor(anchor, latin, before) {
  const start = latin.indexOf(anchor.exact);
  if (start < 0 || before.indexOf(anchor.exact) !== anchor.startUtf16 ||
      before.indexOf(anchor.exact, anchor.startUtf16 + 1) !== -1 ||
      latin.indexOf(anchor.exact, start + 1) !== -1) return null;
  return { start, end: start + anchor.exact.length };
}

export function conservativeExamFormatting(state, latin) {
  const move = marks => marks.flatMap(mark => {
    const range = uniqueAnchor(mark, latin, state.texto);
    return range ? [span(latin, range)] : [];
  });
  const before = storedMarks(state);
  const editorial = move(before);
  state.subr = [...(state.subr ?? []).filter(mark => mark.toks.length),
    ...editorial.map(anchor => ({ cat: 'editorial', toks: [], anchor }))];
  state.atlSpelling = move(state.atlSpelling ?? []);
  const invalid = state.atlQuestionAnchors?.length ?
    reanchorExamExercises(state, state, { latin }, (_, mark) => uniqueAnchor(mark, latin, state.texto)) : 0;
  return before.length - editorial.length + invalid;
}

export function exactExamTokens(previous, next) {
  const byStart = new Map(next.map(token => [token.s, token]));
  return new Map(previous.flatMap(token => {
    const candidate = byStart.get(token.s);
    return candidate && token.e === candidate.e && token.w === candidate.w ? [[token.i, candidate.i]] : [];
  }));
}

export function restoreExamContextQuestions(state, marks, previous, indices, candidates) {
  const restored = marks.flatMap(mark => {
    if (!mark.toks.length) return [mark];
    const toks = mark.toks.map(i => indices.get(i));
    return toks.some(i => i === undefined) ? [] : [{ ...mark, toks }];
  });
  state.subr = restored;
  let invalid = marks.length - restored.length;
  state.prev = previous.map(entry => {
    if (!Number.isInteger(entry.i)) return entry;
    const replacement = candidates.find(item => item.i === indices.get(entry.i) && item.lplain === entry.lplain);
    if (replacement) return { ...replacement, n: entry.n, txt: entry.txt };
    if (entry.txt) invalid++;
    return clearPrev(entry);
  });
  delete state.atlContextPending;
  return invalid;
}

export function bindExamContext(field, exam, literature, callbacks) {
  const state = literature ? exam.literatura : exam;
  if (!histories.has(state)) histories.set(state, createContextHistory((a, b) => key(a) === key(b)));
  const history = histories.get(state);
  const current = () => callbacks.current() && (!literature || exam.literatura === state);
  function write(snapshot, range) {
    if (!current()) throw new Error('El examen ha cambiado.');
    const changedText = snapshot.texto !== state.texto;
    Object.assign(state, structuredClone(snapshot));
    showLatinField(field, snapshot.texto, range);
    callbacks.changed(changedText);
    return range;
  }
  const all = () => [
    ...storedMarks(state).map(readRange),
    ...(!literature && (state.textAnalyzed === state.texto || state.atlContextPending === state.texto) ?
      state.subr.map(mark => tokenMark(mark, state)).filter(Boolean) : [])
  ];

  field.addEventListener('input', history.reset);
  bindLatinContext(field, {
    text: () => field.value,
    report: callbacks.report,
    academic: (range, point) => examAcademic(field, exam, literature, callbacks, range, point, change => {
      const before = structuredClone(read(state, literature));
      const result = change();
      history.record(before, structuredClone(read(state, literature)));
      return result;
    }),
    history: () => history.actions(() => read(state, literature), write),
    underlines(range) {
      const marks = all();
      return { add: unmarkedRanges(range, marks).some(part => /[\p{L}\p{M}]/u.test(state.texto.slice(part.start, part.end))),
        remove: marks.some(mark => overlaps(mark, range)) };
    },
    edit(change, range, action) {
      if (!current() || state.texto !== field.value) throw new Error('El latín del examen ha cambiado.');
      const before = structuredClone(read(state, literature));
      let result, selection = range;
      if (change) {
        result = reanchor(before, change, literature);
        selection = change.range;
      } else {
        const currentMarks = all().map(range => span(state.texto, range));
        const anchored = changeUnderlines(state.texto, currentMarks, range, action);
        const tokenMarks = before.subr.filter(mark => mark.toks.length);
        const kept = tokenMarks.filter(mark => {
          const anchor = tokenMark(mark, before);
          return !anchor || action === 'underline' || !overlaps(anchor, range);
        });
        const keptRanges = kept.map(mark => tokenMark(mark, before)).filter(Boolean);
        const stored = anchored.flatMap(mark => unmarkedRanges(readRange(mark), keptRanges))
          .map(part => ({ cat: 'editorial', toks: [], anchor: span(state.texto, part) }));
        result = { next: { ...before, subr: [...kept, ...stored] }, invalid: tokenMarks.length - kept.length };
      }
      write(result.next, selection);
      history.record(before, structuredClone(read(state, literature)));
      if (result.invalid) callbacks.report('Revisa los subrayados o preguntas afectados (' + result.invalid + ').', 6500);
      return selection;
    }
  });
}

// Called by the existing HTML and OOXML renderer, using the same subr array
// as the words panel. Auto-ligation remains in effect outside manual ranges.
export function examTextRuns(state, legacy) {
  const source = state.texto || '';
  const marked = storedMarks(state);
  const spelling = state.atlSpelling ?? [];
  if (!marked.length && !spelling.length && typeof state.atlContextPending !== 'string') return legacy();
  const ranges = normalizeUnderlines(marked, source)?.map(readRange) ?? [];
  const literal = normalizeUnderlines(spelling, source)?.map(readRange) ?? [];
  const valid = state.textAnalyzed === source || state.atlContextPending === source;
  const tokens = valid ? state.tokens ?? [] : [];
  for (const mark of (state.subr ?? []).filter(mark => mark.toks.length)) {
    const range = valid && tokenMark(mark, state);
    if (range) ranges.push(range);
  }
  const boundaries = [...new Set([0, source.length, ...ranges.flatMap(mark => [mark.start, mark.end]),
    ...tokens.flatMap(token => [token.s, token.e])])].sort((a, b) => a - b);
  const index = new Map(tokens.map(token => [token.s, token]));
  const runs = [];
  boundaries.slice(1).forEach((end, i) => {
    const start = boundaries[i], range = { start, end };
    const token = index.get(start);
    const exact = source.slice(start, end);
    const t = token?.e === end && token.w === exact && !literal.some(mark => overlaps(mark, range)) ?
      token.lig || exact : exact;
    if (!t) return;
    const u = ranges.some(mark => overlaps(mark, range));
    if (runs.at(-1)?.u === u) runs.at(-1).t += t;
    else runs.push({ t, u });
  });
  return runs;
}

export function validateExamContext(state) {
  validateExamExercises(state);
  for (const item of [state, state.literatura].filter(Boolean)) {
    const text = item.texto ?? '';
    const anchored = item.subr?.filter(mark => mark.anchor !== undefined) ?? [];
    if (anchored.some(mark => mark.cat !== 'editorial' || mark.toks.length) ||
        !normalizeUnderlines(anchored.map(mark => mark.anchor), text) ||
        item.atlSpelling !== undefined && !normalizeUnderlines(item.atlSpelling, text))
      throw new Error('Los anclajes editoriales no coinciden con el texto latino.');
  }
}

export function bindExamPreview(sheet, exam) {
  for (const field of sheet.querySelectorAll('.txt[lang="la"], .litLatin, p.txt')) {
    field.tabIndex = 0;
    const callbacks = { current: () => window.M.S === exam, report: window.M.toast };
    bindLatinContext(field, { text: () => field.textContent, report: callbacks.report,
      academic: (range, point) => examAcademic(field, exam, field.classList.contains('litLatin'), callbacks, range, point) });
  }
}
