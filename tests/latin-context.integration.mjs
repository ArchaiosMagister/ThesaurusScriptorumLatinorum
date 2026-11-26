import test from 'node:test';
import assert from 'node:assert/strict';
import { editorialChange, span } from '../scripts/latin-context-edit.js';
import { emptyCorpus } from '../dist/modulos/cuaderno-integrado/core/model.js';
import { validateCorpus } from '../dist/modulos/cuaderno-integrado/core/validation.js';
import { attachGrammarTags } from '../dist/modulos/cuaderno-integrado/core/grammar-tags.js';
import { createEdition, placementFromCorpus } from '../dist/modulos/cuaderno-integrado/core/edition-factory.js';
import { createNotebookDocx } from '../dist/modulos/cuaderno-integrado/export/notebook-documents.js';
import { applyNotebookSnapshot, editNotebookSnapshot, notebookSnapshot } from '../dist/modulos/cuaderno-integrado/ui/atl-notebook-context.js';
import { fingerprintForMark } from '../dist/modulos/cuaderno-integrado/core/edition-validation.js';
import { subsetCorpus } from '../dist/partial-backup.js';
import { fingerprintEditorParts, mergeEditorParts } from '../app/dropbox-plan.js';

const at = '2026-11-26T12:00:00.000Z';
const source = {
  id: 'latin.a', title: 'Un pasaje editorial', latin: 'Cæsar, cognito consilio hostium, legiones suas in castra reduxit.',
  source: { author: null, work: null, reference: null }, tagIds: [], createdAt: at, updatedAt: at
};
const find = (latin, value) => ({ start: latin.indexOf(value), end: latin.indexOf(value) + value.length });
const fragmentAnchor = (latin, range) => ({ ...span(latin, range),
  textFingerprint: fingerprintForMark(latin, range.start, range.end), reviewRequired: false });
const tagId = 'gram.ablativo.absoluto';
function taggedSource() {
  const range = find(source.latin, 'cognito consilio hostium');
  const corpus = attachGrammarTags({ ...emptyCorpus(), texts: [source] }, source.id, [tagId]);
  return validateCorpus({ ...corpus, texts: [{ ...source,
    editorialUnderlines: [span(source.latin, range)],
    grammaticalSpans: [{ ...fragmentAnchor(source.latin, range), id: 'span.1', tagIds: [tagId] }] }] });
}

test('validación, copia parcial y Dropbox conservan marcas y etiquetas de fragmento', async () => {
  const old = validateCorpus({ ...emptyCorpus(), texts: [source] });
  assert.equal(old.texts[0].editorialUnderlines, undefined);
  const corpus = taggedSource();
  const copied = subsetCorpus(corpus, corpus.texts);
  assert.deepEqual(copied.texts, corpus.texts);
  assert.ok(copied.tags.some(tag => tag.id === tagId));
  assert.throws(() => validateCorpus({ ...copied, texts: [{ ...copied.texts[0], latin: 'Alter textus.' }] }), /anclaje|fragmento|fuera de rango/i);
  const editor = (corpus, revision) => ({ bank: { corpus: [['current', { revision, corpus }]] } });
  const hash = async value => JSON.stringify(value);
  const baseline = await fingerprintEditorParts(editor(old, 1), hash);
  const merged = await mergeEditorParts(editor(old, 1), editor(copied, 2), baseline, hash);
  assert.deepEqual(merged.bank.corpus[0][1].corpus.texts[0], copied.texts[0]);
});

test('Cuaderno reancla el ejercicio por aparición e invalida sólo la referencia afectada', () => {
  const latin = 'Lupum lupum in castra misit.';
  const second = { start: 6, end: 11 };
  let ids = 0;
  const nextId = () => 'item.' + ++ids;
  const p = placementFromCorpus({ ...source, latin }, 'place.1', at, nextId);
  const q = p.questions.find(item => item.kind === 'choice');
  const phonetics = q.options.find(item => item.kind === 'phonetics');
  phonetics.slots = [
    { id: 'slot.context', value: 'lupum', proposedLemmaId: null, origin: 'generated', locked: false,
      provenance: { provider: 'prueba', recordId: 'lupum', bankRevision: 'prueba.1', decisionId: null },
      sourceAnchor: fragmentAnchor(latin, second) },
    { id: 'slot.manual', value: 'portum', proposedLemmaId: null, origin: 'manual', locked: true, provenance: null }
  ];
  const edition = createEdition({ id: 'edition.1', legacyNotebookId: null, title: 'Cuaderno editorial', timestamp: at, placements: [p] });
  const first = find(latin, 'Lupum');
  const shortening = editorialChange(latin, first, 'replace', 'X');
  const result = editNotebookSnapshot(p, shortening, first, 'replace', nextId);
  assert.equal(result.invalid, 0);
  const anchor = result.next.choiceOptions.find(item => item.kind === 'phonetics').slots[0].sourceAnchor;
  assert.equal(anchor.startUtf16, 2);
  assert.equal(anchor.exact, 'lupum');
  const edited = applyNotebookSnapshot(edition, p.id, result.next, at).placements[0];
  const remove = editorialChange(edited.text.latin, { start: 2, end: 7 }, 'omit');
  const omitted = editNotebookSnapshot(edited, remove, { start: 2, end: 7 }, 'omit', nextId);
  assert.equal(omitted.invalid, 1);
  const post = applyNotebookSnapshot(edition, p.id, omitted.next, at);
  const applied = post.placements[0].questions.find(item => item.kind === 'choice').options.find(item => item.kind === 'phonetics');
  assert.equal(applied.slots[0].sourceAnchor.reviewRequired, true);
  assert.deepEqual(applied.slots[1], phonetics.slots[1]);
  assert.doesNotMatch(new TextDecoder().decode(createNotebookDocx(post)), />lupum</u);
  assert.deepEqual(applyNotebookSnapshot(post, p.id, notebookSnapshot(p), at), edition);
});

test('Word de Cuaderno separa omisiones y corchetes en redonda de las letras subrayadas', () => {
  const latin = '[Afranius Petreiusque] […] copias reduxerunt.';
  let ids = 0;
  const nextId = () => 'item.' + ++ids;
  const p = placementFromCorpus({ ...source, latin,
    editorialUnderlines: [span(latin, find(latin, 'Afranius Petreiusque'))] }, 'place.1', at, nextId);
  const doc = createEdition({ id: 'edition.1', legacyNotebookId: null, title: 'Edición latina', timestamp: at, placements: [p] });
  const word = new TextDecoder().decode(createNotebookDocx(doc));
  const run = [...word.matchAll(/<w:r>([\s\S]*?)<w:t xml:space="preserve">([^<]*)<\/w:t><\/w:r>/gu)];
  assert.ok(run.some(item => item[2] === 'Afranius Petreiusque' && /<w:i\/>.*<w:u/u.test(item[1])));
  assert.ok(run.some(item => item[2].includes('[…]') && !/<w:i|<w:u/u.test(item[1])));
  assert.ok(run.some(item => item[2] === '[' && !/<w:i/u.test(item[1])));
});
