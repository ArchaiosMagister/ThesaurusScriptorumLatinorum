import { splitLatinOmissions } from '../core/edition-inline-formatting.js';
import { validateCorpus } from '../core/validation.js';
import { attachGrammarTags } from '../core/grammar-tags.js';
import { academicActions, assignGrammar, consultNotebookSelection, grammaticalGroups, notebookVocabulary } from './atl-notebook-context-academic.js';
import { bindLatinContext, createContextHistory, showLatinField } from '../../shared/latin-context-menu.js';
import { changeUnderlines, mapRange, overlaps, readRange, span, unmarkedRanges } from '../../shared/latin-context-edit.js';
import { fingerprintForMark } from '../core/edition-validation.js';
import { reanchorGrammarSpan } from '../core/edition-operations.js';

export function bindBankContext(field, source, report, { analyze, vocabulary, glossary, catalogue }) {
  const original = source.editorialUnderlines?.length ? source.editorialUnderlines : source.teacherDocx?.underlines ?? [];
  let state = { latin: field.value, marks: original, spans: source.grammaticalSpans ?? [], invalid: 0, edits: [], contextual: false };
  const history = createContextHistory();
  const read = () => ({ ...state, vocabulary: glossary.snapshot() });
  function write(next, range) {
    const { vocabulary, ...text } = next;
    if (vocabulary) glossary.restore(vocabulary);
    state = text;
    showLatinField(field, next.latin, range);
    field.dispatchEvent(new Event('atl-latin-change', { bubbles: true }));
    return range;
  }
  function move(next, change) {
    return next.marks.flatMap(mark => {
      const range = mapRange(readRange(mark), change, { preserveContent: true });
      return range ? [span(change.latin, range)] : [];
    });
  }

  field.addEventListener('input', () => {
    const latin = field.value;
    if (latin === state.latin) return;
    const marks = state.marks.flatMap(mark => {
      const { start, end } = readRange(mark);
      const updated = reanchorGrammarSpan({ ...mark, reviewRequired: false,
        textFingerprint: fingerprintForMark(state.latin, start, end) }, state.latin, latin);
      return updated.reviewRequired ? [] : [span(latin, readRange(updated))];
    });
    const spans = state.spans.map(item => reanchorGrammarSpan(item, state.latin, latin));
    state = { ...state, latin, marks, spans, invalid: state.invalid + state.marks.length - marks.length, edits: null };
    history.reset();
  });
  const groups = grammaticalGroups(catalogue);
  bindLatinContext(field, {
    text: () => field.value, report: (message, error) => report(message, error ? 6500 : 5000),
    academic(range, point) {
      const latin = state.latin;
      return academicActions(field, latin, range, point, {
        current: () => field.value === latin,
        report: (message, error) => report(message, error ? 6500 : 5000),
        consult: () => consultNotebookSelection(field, analyze, latin, range, point),
        propose: () => notebookVocabulary(latin, range, analyze, vocabulary),
        saveVocabulary: proposal => {
          const before = read();
          if (glossary.addContext(proposal)) {
            glossary.section.hidden = false;
            history.record(before, read());
          } else report('El vocabulario ya contiene una entrada para esta palabra.', 5000);
        },
        grammar: { groups, apply(tagId) {
          const spans = assignGrammar(state.spans, latin, range, tagId, groups, () => 'span.' + crypto.randomUUID());
          const before = read();
          write({ ...state, spans });
          history.record(before, read());
          report('Etiqueta asignada al fragmento. Guarda los cambios de la ficha.', 5000);
        } }
      });
    },
    history: () => history.actions(read, write),
    underlines(range) {
      const active = state.marks.map(readRange);
      return {
        add: unmarkedRanges(range, active).some(part => /[\p{L}\p{M}]/u.test(state.latin.slice(part.start, part.end))),
        remove: active.some(part => overlaps(part, range))
      };
    },
    edit(change, range, action) {
      const before = read();
      let next, result = range;
      if (change) {
        const marks = move(state, change);
        const spans = state.spans.map(item => reanchorGrammarSpan(item, state.latin, change.latin, change));
        next = { ...state, latin: change.latin, marks, spans, invalid: state.invalid + state.marks.length - marks.length,
          edits: state.edits && [...state.edits, change], contextual: true };
        result = change.range;
      } else {
        next = { ...state, marks: changeUnderlines(state.latin, state.marks, range, action), contextual: true };
      }
      write(next, result);
      history.record(before, read());
      if (next.invalid > before.invalid) report('Revisa los subrayados afectados por el cambio.', 6000);
      return result;
    }
  });

  function changedMarks() { return JSON.stringify(state.marks) !== JSON.stringify(original); }
  function changedTags() { return JSON.stringify(state.spans) !== JSON.stringify(source.grammaticalSpans ?? []); }
  function dirty() { return changedMarks() || changedTags(); }
  return {
    dirty,
    forSave(latin) {
      let marks = state.marks, spans = state.spans, edits = state.edits;
      if (latin !== state.latin) {
        const start = state.latin.length - state.latin.trimStart().length;
        const end = start + latin.length;
        const trim = { text: state.latin, latin, edits: [[0, start, ''], [end, state.latin.length, '']] };
        marks = move(state, trim);
        spans = spans.map(item => reanchorGrammarSpan(item, state.latin, latin, trim));
        edits = edits && [...edits, trim];
      }
      return { spans: changedTags() || source.grammaticalSpans ? spans : undefined, underlines: changedMarks() || source.editorialUnderlines || state.contextual ? marks : undefined,
        edited: state.contextual, changed: dirty(), invalid: state.invalid + state.marks.length - marks.length,
        grammarReview: spans.filter(item => item.reviewRequired).length, change: edits };
    }
  };
}

export function attachBankSpans(corpus, id, spans, catalogue) {
  if (!spans) return corpus;
  const source = corpus.texts.find(item => item.id === id);
  const allIds = [...new Set([...source.tagIds, ...spans.flatMap(span => span.tagIds)])];
  const withDefinitions = attachGrammarTags(corpus, id, allIds, catalogue);
  return validateCorpus({ ...withDefinitions, texts: withDefinitions.texts.map(item => item.id === id
    ? { ...item, tagIds: source.tagIds, grammaticalSpans: spans } : item) });
}

// Keep the native control for editing, selection and the clipboard.
export function renderBankEditorialField(field, ligate) {
  const layer = document.createElement('div');
  layer.className = 'atl-edit-latin-render';
  layer.setAttribute('aria-hidden', 'true');
  const wrapper = document.createElement('div');
  wrapper.className = 'atl-edit-latin-surface';
  field.before(wrapper);
  wrapper.append(field, layer);
  function scroll() {
    layer.scrollTop = field.scrollTop;
    layer.scrollLeft = field.scrollLeft;
  }
  let source, preview;
  function paint() {
    const value = field.value;
    const reading = source === value && !field.matches(':focus') ? preview ?? value : value;
    const parts = splitLatinOmissions(reading);
    layer.hidden = reading === value && !parts.some(part => part.roman);
    wrapper.classList.toggle('has-editorial-signs', !layer.hidden);
    layer.replaceChildren(...(!layer.hidden ? parts.map(part => {
      if (!part.roman) return document.createTextNode(part.text);
      const sign = document.createElement('span');
      sign.className = 'edition-roman';
      sign.textContent = part.text;
      return sign;
    }) : []));
    scroll();
  }
  async function refresh() {
    const value = field.value;
    paint();
    if (field.matches(':focus') || source === value || !/ae|oe/i.test(value)) return;
    source = value;
    preview = undefined;
    try {
      const result = await ligate(value);
      if (source !== value) return;
      preview = typeof result === 'string' ? result : undefined;
      paint();
    } catch {
      if (source === value) source = undefined;
    }
  }
  field.addEventListener('input', refresh);
  field.addEventListener('atl-latin-change', refresh);
  field.addEventListener('focus', paint);
  field.addEventListener('blur', refresh);
  field.addEventListener('scroll', scroll);
  void refresh();
}
