import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeUsages, selectEditor } from '../app/dropbox-plan.js';

test('Dropbox solo sustituye el espacio editorial si sigue la revisión conocida o está vacío', () => {
  assert.equal(selectEditor('a', 'a', null, false), 'same');
  assert.equal(selectEditor('a', 'b', null, true), 'download');
  assert.equal(selectEditor('a', 'b', 'a', false), 'download');
  assert.equal(selectEditor('a', 'b', 'b', false), 'upload');
  assert.throws(() => selectEditor('a', 'b', null, false), /difieren/);
  assert.throws(() => selectEditor('a', 'b', 'c', false), /difieren/);
});

test('Dropbox reúne los usos de ambos dispositivos y detecta modificaciones simultáneas', () => {
  const before = { title: 'Primer examen', snapshot: { texto: 'Gallia' } };
  const after = { ...before, snapshot: { texto: 'Roma' } };
  const another = { title: 'Segundo examen', snapshot: { texto: 'Hispania' } };
  const fingerprint = JSON.stringify;
  const checkpoint = new Map([['a', fingerprint(before)]]);
  assert.deepEqual(mergeUsages([['a', before]], [['a', after], ['b', another]], checkpoint, fingerprint),
    [['a', after], ['b', another]]);
  assert.deepEqual(mergeUsages([['a', after], ['b', another]], [['a', before]], checkpoint, fingerprint),
    [['a', after], ['b', another]]);
  assert.throws(() => mergeUsages([['a', after]], [['a', another]], checkpoint, fingerprint), /cambió/);
});
