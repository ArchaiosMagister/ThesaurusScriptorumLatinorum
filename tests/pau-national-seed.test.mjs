import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { communities } from '../scripts/bank-curriculum.js';
import { assessBankDifficulty } from '../scripts/bank-difficulty.js';
import { nationalSeedSignature, nationalSeedText, prepareNationalSeed } from '../scripts/pau-national-seed.js';
import { nationalExamTextIdentity } from '../scripts/pau-national-storage.js';

const exams = JSON.parse(await readFile(new URL('../scripts/pau-national-seed-data.json',import.meta.url),'utf8'));
const passages = exams.flatMap(exam => exam.passages.map(passage => nationalSeedText(exam,passage)));
const signatures = Object.fromEntries(passages.map(text => [text.id,nationalSeedSignature(text)]));

test('cada comunidad tiene fichas con convocatoria, evidencia y dificultad reproducibles', () => {
  assert.deepEqual([...new Set(passages.map(text => text.selectividad.community))].sort(),
    communities.filter(community => !['Comunidad Valenciana','Ceuta','Melilla'].includes(community)).sort());
  assert.equal(new Set(passages.map(text => text.id)).size,passages.length);
  assert.equal(new Set(passages.map(nationalExamTextIdentity)).size,passages.length);
  for (const community of new Set(exams.map(exam => exam.community))) {
    for (const year of [2025,2026]) {
      const sessions = new Set(exams.filter(exam => exam.community === community && exam.year === year)
        .map(exam => exam.session).filter(Boolean));
      assert.deepEqual([...sessions].sort(),['Extraordinaria','Ordinaria'],community + ' ' + year);
    }
  }
  const printed = (id,option) => exams.find(exam => exam.id === id).passages.find(passage => passage.option === option).latin;
  assert.match(printed('canarias-2026-ordinaria','B'),/^Regante Fauno/u);
  assert.match(printed('canarias-2027-modelo','B'),/^Regnante Fauno/u);
  for (const exam of exams) {
    assert.match(exam.sha256,/^[a-f\d]{64}$/u);
    assert.ok(Number.isInteger(exam.year) && exam.passages.length > 0);
    if (exam.model === 'Examen oficial') assert.match(exam.session,/^(Ordinaria|Extraordinaria)$/u);
    for (const passage of exam.passages) {
      assert.ok(Object.keys(passage.grammar).length);
      for (const evidence of Object.values(passage.grammar)) assert.ok(passage.latin.includes(evidence));
      assert.ok([1,2,3,4,5].includes(assessBankDifficulty(nationalSeedText(exam,passage)).estimate));
    }
  }
});

test('el catálogo evita el mismo examen ya guardado y rechaza datos incompletos', () => {
  const catalogue = [...new Set(passages.flatMap(text => text.tagIds))]
    .map(id => ({id,label:id,kind:'catalogue',parentId:null}));
  const first = passages[0];
  const own = {...first,id:'own.pau',title:'Mi edición',tagIds:[]};
  const corpus = {schemaVersion:1,texts:[own],tags:[],notebooks:[]};
  const prepare = (input, data = exams) => prepareNationalSeed(input,input,data,value=>value,catalogue,signatures);
  const after = prepare(corpus);
  assert.equal(after.texts.length,passages.length);
  assert.equal(after.texts[0],own);
  assert.ok(!after.texts.some(text => text.id === first.id));
  const deletion = {...after,texts:after.texts.slice(1)};
  assert.equal(prepare(deletion),deletion);
  assert.throws(() => prepare(corpus,exams.slice(1)),/incompleto/u);
  const corrupted = structuredClone(exams);
  corrupted[0].passages[0].latin += ' Error.';
  assert.throws(() => prepare(corpus,corrupted),/Ficha de Selectividad inválida/u);
});
