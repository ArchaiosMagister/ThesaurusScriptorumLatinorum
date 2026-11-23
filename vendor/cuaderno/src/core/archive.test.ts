import assert from 'node:assert/strict';
import test from 'node:test';
import { deserializeCorpus, migrateCorpus, serializeCorpus } from './archive.js';
import { InvalidCorpusError, UnsupportedSchemaVersionError } from './errors.js';
import { emptyCorpus } from './model.js';

test('exportar e importar preserva los datos y la versión', () => {
  const input = emptyCorpus();
  assert.deepEqual(deserializeCorpus(serializeCorpus(input)), input);
});

test('un JSON corrupto no se interpreta como corpus vacío', () => {
  assert.throws(() => deserializeCorpus('{mal json'), InvalidCorpusError);
});

test('una versión futura no se sobrescribe ni se degrada', () => {
  assert.throws(() => migrateCorpus({ schemaVersion: 2 }), UnsupportedSchemaVersionError);
});

test('una versión anterior sin migración explícita se rechaza', () => {
  assert.throws(() => migrateCorpus({ schemaVersion: 0 }), UnsupportedSchemaVersionError);
});

test('el serializador valida antes de generar un archivo', () => {
  const invalid = { ...emptyCorpus(), notebooks: [{ id: 'n.1', title: 'N', textIds: ['t.1'] }] };
  assert.throws(() => serializeCorpus(invalid), /texto inexistente/);
});
