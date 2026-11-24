import { isTemplateKey, validateTemplate } from './curriculum-templates.js';
import { emptyCorpus } from './modulos/cuaderno-integrado/core/model.js';
import { validateCorpus } from './modulos/cuaderno-integrado/core/validation.js';
import { allGrammarTags } from './modulos/cuaderno-integrado/core/grammar-tags.js';
import { isRetiredTag } from './modulos/cuaderno-integrado/ui/atl-bank-curriculum.js';
import { bankReviewKey, readBankReview } from './modulos/cuaderno-integrado/ui/atl-bank-review.js';
import { findPossibleDuplicates, normalizedLatinKey } from './modulos/cuaderno-integrado/core/text-duplicates.js';

export const partialFormat = 'administrator-textorum-latinorum-partial';
export const partialTypes = ['bank', 'notebooks', 'templates', 'tag-exchange'];
const ids = items => new Set(items.map(item => item.id));
const sameSet = (a, b) => a.length === b.length && a.every(id => b.includes(id));
const idPattern = /^[\w.:-]{1,120}$/u;

export function subsetCorpus(corpus, texts, extraTags = []) {
  const catalogue = new Map(allGrammarTags(corpus).map(tag => [tag.id, tag]));
  const tags = new Map();
  function include(id) {
    if (tags.has(id)) return;
    const tag = catalogue.get(id);
    if (!tag) throw Error('Falta la definición de la etiqueta ' + id + '.');
    tags.set(id, tag);
    if (tag.parentId) include(tag.parentId);
  }
  for (const id of [...texts.flatMap(text => text.tagIds), ...extraTags]) include(id);
  return validateCorpus({ ...emptyCorpus(), texts, tags: [...tags.values()] });
}

export function mergeBank(local, deposits, incoming, equal) {
  const added = [];
  const conflicts = [];
  const indexed = new Map(deposits.map(text => [text.id, text]));
  const keys = new Set(deposits.map(text => normalizedLatinKey(text.latin)));
  for (const text of incoming.texts) {
    const old = indexed.get(text.id);
    if (old && equal(old, text)) continue;
    const key = normalizedLatinKey(text.latin);
    if (old || keys.has(key) ||
        findPossibleDuplicates([...deposits, ...added], { latin: text.latin, ...text.source }).some(item => item.kind === 'overlap')) {
      conflicts.push(text.title + ' · identificador o pasaje coincidente');
      continue;
    }
    added.push(text);
    keys.add(key);
    indexed.set(text.id, text);
  }
  const needed = subsetCorpus(incoming, added);
  const known = new Map(allGrammarTags(local).map(tag => [tag.id, tag]));
  const tags = new Map(local.tags.map(tag => [tag.id, tag]));
  for (const tag of needed.tags) {
    if (known.has(tag.id) && !equal(known.get(tag.id), tag))
      conflicts.push(tag.label + ' · definición de etiqueta incompatible');
    else tags.set(tag.id, tag);
  }
  if (conflicts.length) return { conflicts, added, corpus: local };
  return { conflicts, added, corpus: validateCorpus({ ...local, tags: [...tags.values()], texts: [...local.texts, ...added] }) };
}

export function parseProposals(proposals, baseline) {
  if (!Array.isArray(proposals) || proposals.length !== baseline.length) throw Error('Propuestas incompletas.');
  const valid = ids(baseline);
  const rows = new Map();
  for (const item of proposals) {
    if (!item || !valid.has(item.id) || rows.has(item.id) || !Array.isArray(item.tagIds) ||
        item.tagIds.length > 1000 || new Set(item.tagIds).size !== item.tagIds.length ||
        item.tagIds.some(id => typeof id !== 'string' || !idPattern.test(id))) {
      throw Error('Identificador o lista de etiquetas no válidos en las propuestas.');
    }
    rows.set(item.id, item.tagIds);
  }
  return rows;
}

export async function tagChanges(incoming, local, proposals, storage, removeCustom) {
  const byId = new Map(local.texts.map(text => [text.id, text]));
  const catalogue = new Map(allGrammarTags(local).map(tag => [tag.id, tag]));
  const originalTags = new Map(incoming.tags.map(tag => [tag.id, tag]));
  const result = [];
  for (const text of incoming.texts) {
    const current = byId.get(text.id);
    const proposed = proposals.get(text.id);
    const original = current?.tagIds ?? text.tagIds;
    const kept = removeCustom ? [] : original.filter(id => catalogue.get(id)?.kind === 'custom');
    const next = [...new Set([...proposed, ...kept])];
    const added = next.filter(id => !original.includes(id));
    const removed = original.filter(id => !next.includes(id));
    const row = { id: text.id, title: current?.title ?? text.title, added, removed,
      kept: original.filter(id => next.includes(id)), next, issue: '' };
    if (!current) row.issue = 'Identificador desconocido o texto eliminado';
    else if (text.latin !== current.latin) row.issue = 'El texto latino ha cambiado';
    else if (!sameSet(text.tagIds, current.tagIds)) row.issue = 'Las etiquetas han cambiado desde la exportación';
    else {
      const incompatible = next.filter(id => {
        const tag = catalogue.get(id);
        const old = originalTags.get(id);
        return !tag || (isRetiredTag(id) && !original.includes(id)) ||
          (old && (old.kind !== tag.kind || old.label !== tag.label || old.parentId !== tag.parentId));
      });
      if (incompatible.length) row.issue = 'Etiquetas desconocidas o incompatibles: ' + incompatible.join(', ');
      else if (added.length || removed.length) {
        const key = await bankReviewKey(current);
        const review = readBankReview(key, current.latin, storage);
        row.reviewKey = key;
        row.localReview = storage.getItem(key);
        if (review.rejected.some(key => added.includes(key.split(':').slice(2).join(':'))) ||
            review.corrected.some(([, id]) => removed.includes(id)))
          row.issue = 'Conflicto con una decisión de revisión del docente';
      }
    }
    result.push(row);
  }
  return result;
}

export function validateTemplateRows(rows) {
  if (!Array.isArray(rows) || rows.length > 10000 || rows.some(row =>
    !Array.isArray(row) || row.length !== 2 || !isTemplateKey(row[0])) ||
    new Set(rows.map(([key]) => key)).size !== rows.length) throw Error('La lista de plantillas no es válida.');
  return rows.map(([key, value]) => [key, validateTemplate(value)]);
}
