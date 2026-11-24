import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTemplateKey, localTemplates, validateTemplate } from '../app/curriculum-templates.js';

test('comprueba plantillas conservando el orden y los recuentos de cada trimestre', () => {
  const settings = {
    terms: [
      { tags: ['gram.subjuntivo', 'gram.ablativo.absoluto'], count: 10, review: 2 },
      { tags: ['gram.cum.historico'], count: 6, review: 0 },
      { tags: [], count: 3, review: 1 }
    ],
    progression: 'cumulative', exam: 'exclude', excludedCourses: ['2bach'], filtered: true
  };
  const value = { name: 'Curso base', settings };
  assert.deepEqual(validateTemplate(value), value);
  const key = 'atl-v1:curriculum-template:994637a3-ec84-412d-b35c-92fe772a0001';
  assert.equal(isTemplateKey(key), true);
  assert.equal(isTemplateKey('atl-v1:dropbox:session'), false);
  const storage = { [key]: JSON.stringify(value), getItem(id) { return this[id]; } };
  assert.deepEqual(localTemplates(storage), [[key, value]]);
  assert.throws(() => validateTemplate({ ...value, settings: { ...settings, exam: 'maybe' } }));
});
