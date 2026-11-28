import { nationalExamTextIdentity } from './pau-national-storage.js';

export const nationalSeedVersion = 1;
const seedTimestamp = '2026-11-28T00:00:00.000Z';

export function nationalSeedText(exam, passage) {
  const { community, year, session, model, url, series } = exam;
  const { option, title, latin, author, work, reference, notes, grammar } = passage;
  return {
    id: 'pau.national.seed.' + exam.id + '.' + passage.id,
    title, latin,
    source: { author: author || null, work: work || null, reference: reference || null },
    tagIds: Object.keys(grammar).sort(),
    createdAt: seedTimestamp, updatedAt: seedTimestamp,
    origin: { kind: 'own' }, courseIds: ['2bach'],
    selectividad: { ...(session && { session }), model, ...(option && { option }), ...(series && { series }), ...(url && { sourceUrl: url }), year, community },
    ...(notes && { notes })
  };
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

// A hash of the complete stored record, used only to recognise unedited factory data.
export function nationalSeedSignature(text) {
  let hash = 0xcbf29ce484222325n;
  for (const character of canonical(text))
    hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n);
  return hash.toString(16);
}

export function prepareNationalSeed(corpus, existing, exams, validate, catalogue, signatures) {
  if (corpus.pauNationalSeedVersion >= nationalSeedVersion || !exams.length) return corpus;
  const ids = new Set([...corpus.texts, ...existing.texts].map(text => text.id));
  const identities = new Set([...corpus.texts, ...existing.texts].map(nationalExamTextIdentity));
  const tags = new Map(corpus.tags.map(tag => [tag.id, tag]));
  const known = new Map(catalogue.map(tag => [tag.id, tag]));
  function register(id) {
    if (tags.has(id)) return;
    const tag = known.get(id);
    if (!tag || tag.kind !== 'catalogue') throw Error('Etiqueta de Selectividad desconocida: ' + id);
    if (tag.parentId) register(tag.parentId);
    tags.set(id, tag);
  }
  const previousVersion = corpus.pauNationalSeedVersion ?? 0;
  const texts = [...corpus.texts];
  const found = new Set();
  for (const exam of exams) {
    for (const passage of exam.passages) {
      const since = passage.since ?? exam.since ?? 1;
      if (!Number.isInteger(since) || since < 1 || since > nationalSeedVersion)
        throw Error('Versión inválida en el catálogo: ' + exam.id);
      const text = nationalSeedText(exam, passage);
      if (found.has(text.id) || signatures[text.id] !== nationalSeedSignature(text) ||
          !text.tagIds.length || Object.values(passage.grammar).some(span => !span || !text.latin.includes(span)))
        throw Error('Ficha de Selectividad inválida: ' + text.id);
      found.add(text.id);
      const key = nationalExamTextIdentity(text);
      if (since <= previousVersion || ids.has(text.id) || identities.has(key)) continue;
      text.tagIds.forEach(register);
      texts.push(text);
      ids.add(text.id);
      identities.add(key);
    }
  }
  if (found.size !== Object.keys(signatures).length) throw Error('El catálogo de Selectividad está incompleto.');
  return validate({ ...corpus, texts, tags: [...tags.values()], pauNationalSeedVersion: nationalSeedVersion });
}

export async function installNationalSeed({ repo, loadCombinedCorpus, validateCorpus, grammarCatalogue, signatures }) {
  if ((await repo.load()).corpus.pauNationalSeedVersion >= nationalSeedVersion) return false;
  const response = await fetch(new URL('./atl-pau-national-seed.json', import.meta.url));
  if (!response.ok) throw Error('No se ha podido cargar el catálogo de Selectividad.');
  const exams = await response.json();
  if (!Array.isArray(exams)) throw Error('El catálogo de Selectividad no es válido.');
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await repo.load();
    const existing = await loadCombinedCorpus();
    const next = prepareNationalSeed(current.corpus, existing, exams, validateCorpus,
      grammarCatalogue(current.corpus), signatures);
    if (next === current.corpus) return false;
    try {
      await repo.save(next, current.revision);
      return true;
    } catch (error) {
      if (error.name !== 'RevisionConflictError' || attempt === 2) throw error;
    }
  }
  return false;
}

export function isPristineNationalSeed(text, signatures) {
  return text.id.startsWith('pau.national.seed.') && signatures[text.id] === nationalSeedSignature(text);
}

export function isPristinePauFactory(corpus, signatures, isPristineCv, catalogue) {
  if (!corpus.pauNationalSeedVersion) return isPristineCv(corpus);
  if (corpus.pauNationalSeedVersion !== nationalSeedVersion || corpus.notebooks.length ||
      corpus.textRevisions?.length) return false;
  const cvTexts = corpus.texts.filter(text => !text.id.startsWith('pau.national.seed.'));
  const national = corpus.texts.filter(text => text.id.startsWith('pau.national.seed.'));
  if (national.length !== Object.keys(signatures).length ||
      !national.every(text => isPristineNationalSeed(text, signatures))) return false;
  const registry = new Map(catalogue.map(tag => [tag.id, tag]));
  const stored = new Map(corpus.tags.map(tag => [tag.id, tag]));
  function usedBy(texts) {
    const used = new Set();
    for (const text of texts) {
      for (const tagId of text.tagIds) {
        let id = tagId;
        while (id && !used.has(id)) {
          if (!stored.has(id) || canonical(stored.get(id)) !== canonical(registry.get(id))) return null;
          used.add(id);
          id = stored.get(id).parentId;
        }
      }
    }
    return used;
  }
  const used = usedBy(corpus.texts);
  if (!used || used.size !== stored.size) return false;
  if (!corpus.pauCvSeedVersion) return cvTexts.length === 0;
  const cvTags = usedBy(cvTexts);
  return isPristineCv({ ...corpus, texts: cvTexts, tags: corpus.tags.filter(tag => cvTags.has(tag.id)) });
}
