import { fingerprintForMark, validateEdition } from '../core/edition-validation.js';
import { reanchorGrammarSpan, reanchorNotebookChoices } from '../core/edition-operations.js';
import { fullWords, mapRange, overlaps, readRange, span, subtractRange, unmarkedRanges } from '../../shared/latin-context-edit.js';

function withAnchor(mark, latin, range) {
  return { ...mark, ...span(latin, range), textFingerprint: fingerprintForMark(latin, range.start, range.end),
    reviewRequired: false };
}

export function notebookMarks(placement, range) {
  const active = placement.text.markup.filter(mark => mark.kind === 'morph-underline' && !mark.reviewRequired).map(readRange);
  return {
    add: unmarkedRanges(range, active).some(part => /[\p{L}\p{M}]/u.test(placement.text.latin.slice(part.start, part.end))),
    remove: placement.text.markup.some(mark => mark.kind === 'morph-underline' && overlaps(range, readRange(mark)))
  };
}

export function notebookSnapshot(placement) {
  return {
    latin: placement.text.latin, markup: placement.text.markup, vocabulary: placement.vocabulary,
    grammaticalSpans: placement.grammaticalSpans, grammarReview: placement.grammarReview,
    morphology: placement.questions.find(q => q.kind === 'morphology')?.words,
    choiceOptions: placement.questions.find(q => q.kind === 'choice')?.options
  };
}

export function applyNotebookSnapshot(edition, id, snapshot, updatedAt) {
  const { latin, markup, vocabulary, grammaticalSpans, grammarReview, morphology, choiceOptions } = snapshot;
  return validateEdition({ ...edition, updatedAt, placements: edition.placements.map(placement => {
    if (placement.id !== id) return placement;
    const next = { ...placement, vocabulary, text: { ...placement.text, latin, markup },
      questions: placement.questions.map(q => q.kind === 'morphology' ? { ...q, words: morphology ?? [] } :
        q.kind === 'choice' && choiceOptions ? { ...q, options: choiceOptions } : q) };
    if (grammaticalSpans !== undefined) next.grammaticalSpans = grammaticalSpans;
    else delete next.grammaticalSpans;
    if (grammarReview !== undefined) next.grammarReview = grammarReview;
    else delete next.grammarReview;
    return next;
  }) });
}

export function editNotebookSnapshot(placement, change, range, action, newId) {
  const next = notebookSnapshot(placement);
  if (change && change.latin.length > 200_000) throw new Error('El texto latino supera la longitud admitida.');
  const words = new Map(next.morphology?.map(word => [word.markId, word]));
  const invalid = new Set();
  const newMark = part => withAnchor({ id: newId('mark'), kind: 'morph-underline' }, next.latin, part);
  if (change) {
    const affectedGrammar = [];
    const moveGrammar = item => {
      const moved = reanchorGrammarSpan(item, change.text, change.latin, change);
      if (!item.reviewRequired && moved.reviewRequired) affectedGrammar.push(item);
      return moved;
    };
    next.grammaticalSpans = next.grammaticalSpans?.map(moveGrammar);
    next.grammarReview = next.grammarReview?.map(moveGrammar);
    let exercisesInReview = 0;
    next.choiceOptions = next.choiceOptions && reanchorNotebookChoices(next.choiceOptions, change.text, change.latin, change, () => exercisesInReview++);
    next.latin = change.latin;
    next.markup = next.markup.flatMap(mark => {
      const word = words.get(mark.id);
      const mapped = mark.reviewRequired ? null : mapRange(readRange(mark), change, { preserveContent: true });
      if (mapped) {
        if (word && (!fullWords(next.latin, mapped) ||
          !fullWords(change.text, readRange(mark)))) invalid.add(word.markId);
        return [withAnchor(mark, next.latin, mapped)];
      }
      invalid.add(mark.id);
      return [];
    });
    return { next: reviewWords(next, invalid), invalid: invalid.size + affectedGrammar.length + exercisesInReview };
  }
  if (action === 'underline') {
    const active = next.markup.filter(mark => !mark.reviewRequired && mark.kind === 'morph-underline').map(readRange);
    const added = unmarkedRanges(range, active).filter(part => /[\p{L}\p{M}]/u.test(next.latin.slice(part.start, part.end)));
    next.markup = [...next.markup, ...added.map(newMark)];
  } else if (action === 'ununderline') {
    next.markup = next.markup.flatMap(mark => {
      if (mark.kind !== 'morph-underline' || !overlaps(readRange(mark), range)) return [mark];
      if (words.has(mark.id)) invalid.add(mark.id);
      if (mark.reviewRequired) return [];
      return subtractRange(readRange(mark), range).map(newMark);
    });
  }
  return { next: reviewWords(next, invalid), invalid: invalid.size };
}

function reviewWords(next, invalid) {
  const marks = new Map(next.markup.map(mark => [mark.id, mark]));
  next.morphology = next.morphology?.flatMap(word => {
    const mark = marks.get(word.markId);
    if (invalid.has(word.markId) || !mark) {
      if (word.locked) throw new Error('La edición afecta a un análisis protegido. Desbloquéalo en Preguntas para continuar.');
      return [];
    }
    if (mark.exact === word.surface) return [word];
    return [{ ...word, surface: mark.exact }];
  });
  next.markup.sort((a, b) => a.startUtf16 - b.startUtf16);
  return next;
}
