import { GRAMMAR_GROUP_IDS, conflictsWithGrammarForm, matchesGrammarTag } from '../core/grammar-tags.js';
import { fingerprintForMark } from '../core/edition-validation.js';
import { bankTagAssignable } from './atl-bank-curriculum.js';
import { span } from '../../shared/latin-context-edit.js';
import { vocabularyIdentity } from '../core/vocabulary-preferences.js';
export { academicActions } from '../../shared/latin-context-academic.js';
export { consultNotebookSelection } from './latin-reading-card.js';

export function grammaticalGroups(catalogue) {
  const groupIds = [...GRAMMAR_GROUP_IDS, 'custom'];
  const byGroup = new Map(groupIds.map(id => [id, []]));
  for (const tag of catalogue.filter(tag => bankTagAssignable(tag.id))) {
    const group = GRAMMAR_GROUP_IDS.find(id => matchesGrammarTag(tag.id, id, catalogue)) ?? 'custom';
    byGroup.get(group).push(tag);
  }
  return groupIds.flatMap(id => {
    const tags = byGroup.get(id).sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return tags.length ? [{ label: catalogue.find(tag => tag.id === id)?.label ?? 'Otras etiquetas', tags }] : [];
  });
}

export function fragmentAnchor(latin, range) {
  return { ...span(latin, range), textFingerprint: fingerprintForMark(latin, range.start, range.end),
    reviewRequired: false };
}

export function assignGrammar(spans, latin, range, tagId, groups, newId) {
  if (!groups.some(group => group.tags.some(tag => tag.id === tagId))) throw new Error('La etiqueta ya no está disponible.');
  const current = spans.find(item => !item.reviewRequired && item.startUtf16 === range.start && item.endUtf16 === range.end);
  if (!current) return [...spans, { ...fragmentAnchor(latin, range), id: newId(), tagIds: [tagId] }];
  if (current.tagIds.includes(tagId)) return spans;
  if (conflictsWithGrammarForm(current.tagIds, tagId))
    throw new Error('El fragmento ya tiene una forma gramatical incompatible.');
  return spans.map(item => item === current ? { ...item, tagIds: [...item.tagIds, tagId] } : item);
}

export async function notebookVocabulary(latin, range, analyze, vocabulary, quantity = 'modelo') {
  const surface = latin.slice(range.start, range.end);
  const tokens = await analyze(latin);
  const token = tokens.find(item => item.s === range.start && item.e === range.end && item.w === surface);
  const key = vocabularyIdentity(token?.lplain || token?.lemma || surface);
  const entries = token?.sel ? await vocabulary(latin, quantity, token.sel.lid) : [];
  return entries.find(entry => vocabularyIdentity(entry.lemma) === key)
    ?? { lemma: token?.lplain || token?.lemma || surface, headword: token?.lemma || surface,
      meaning: token?.cands?.find(item => item.lid === token?.sel?.lid)?.trad };
}

export function findVocabulary(entries, proposal) {
  const keys = [proposal.lemma, proposal.headword, proposal.selected].filter(Boolean).map(vocabularyIdentity);
  return entries.find(entry => [entry.lemma, entry.headword].filter(Boolean).map(vocabularyIdentity).some(key => keys.includes(key)));
}
