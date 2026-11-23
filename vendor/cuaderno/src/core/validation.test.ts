import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyCorpus, type CorpusV1 } from './model.js';
import { InvalidCorpusError } from './errors.js';
import { validateCorpus } from './validation.js';

const DATE = '2026-11-15T12:00:00.000Z';

function sample(): CorpusV1 {
  return {
    schemaVersion: 1,
    tags: [
      { id: 'complement.agent', label: 'Complemento agente', kind: 'catalogue', parentId: null },
      { id: 'voice.passive', label: 'Voz pasiva', kind: 'catalogue', parentId: null },
      { id: 'own.1', label: 'Construcción particular', kind: 'custom', parentId: null },
    ],
    texts: [{
      id: 'text.1', title: 'César, De bello Gallico I 24',
      latin: 'Helvētiī cum omnibus suīs carrīs ...',
      source: { author: 'César', work: 'De bello Gallico', reference: 'I 24' },
      tagIds: ['complement.agent', 'own.1'], createdAt: DATE, updatedAt: DATE,
    }],
    notebooks: [{ id: 'book.1', title: 'Cuaderno I', textIds: ['text.1'] }],
  };
}

test('el corpus inicial está vacío y es válido', () => {
  assert.deepEqual(validateCorpus(emptyCorpus()), emptyCorpus());
});

test('conserva macrones, autor, orden y etiquetas personalizadas', () => {
  const value = sample();
  assert.deepEqual(validateCorpus(value), value);
  assert.equal(validateCorpus(value).texts[0]?.latin, 'Helvētiī cum omnibus suīs carrīs ...');
});

test('complemento agente y pasiva no son etiquetas dependientes', () => {
  const value = sample();
  assert.deepEqual(value.texts[0]?.tagIds, ['complement.agent', 'own.1']);
  assert.doesNotThrow(() => validateCorpus(value));
});

test('rechaza identificadores duplicados', () => {
  const value = sample();
  value.tags.push(value.tags[0]!);
  assert.throws(() => validateCorpus(value), /identificador repetido/);
});

test('rechaza referencias colgantes sin borrar contenido', () => {
  const value = sample();
  value.texts[0]!.tagIds = ['no-existe'];
  assert.throws(() => validateCorpus(value), /etiqueta inexistente/);
});

test('rechaza textos inexistentes o repetidos en un cuaderno', () => {
  const missing = sample();
  missing.notebooks[0]!.textIds = ['desconocido'];
  assert.throws(() => validateCorpus(missing), /texto inexistente/);
  const repeated = sample();
  repeated.notebooks[0]!.textIds = ['text.1', 'text.1'];
  assert.throws(() => validateCorpus(repeated), /referencias repetidas/);
});

test('rechaza ciclos entre etiquetas y padres inexistentes', () => {
  const value = sample();
  value.tags[0]!.parentId = 'voice.passive';
  value.tags[1]!.parentId = 'complement.agent';
  assert.throws(() => validateCorpus(value), /ciclo jerárquico/);
  value.tags[1]!.parentId = 'no-existe';
  assert.throws(() => validateCorpus(value), /etiqueta padre inexistente/);
});

test('rechaza campos inesperados y fechas incoherentes', () => {
  const value = sample();
  assert.throws(() => validateCorpus({ ...value, password: 'no-debe-guardarse' }), InvalidCorpusError);
  value.texts[0]!.updatedAt = '2026-11-14T12:00:00.000Z';
  assert.throws(() => validateCorpus(value), /anterior a createdAt/);
});

test('no permite formularios de etiqueta sin texto ni referencias malformadas', () => {
  const value = sample();
  value.tags[2]!.label = '  ';
  assert.throws(() => validateCorpus(value), /texto no vacío/);
  value.tags[2]!.label = 'Nueva etiqueta';
  value.texts[0]!.tagIds = ['\u003cscript\u003e'];
  assert.throws(() => validateCorpus(value), /identificador inválido/);
});
