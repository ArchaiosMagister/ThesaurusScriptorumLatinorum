import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRecoverableSync, mergeUsages, selectEditor } from '../app/dropbox-plan.js';

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

test('Dropbox propaga bajas conocidas en ambos sentidos y nunca las restaura silenciosamente', () => {
  const old = { title: 'Examen original', snapshot: { texto: 'Gallia' } };
  const modified = { ...old, snapshot: { texto: 'Roma' } };
  const fingerprint = JSON.stringify;
  const base = new Map([['x', fingerprint(old)]]);
  assert.deepEqual(mergeUsages([], [['x', old]], base, fingerprint), []);
  assert.deepEqual(mergeUsages([['x', old]], [], base, fingerprint), []);
  assert.deepEqual(mergeUsages([['x', modified]], [['x', old]], base, fingerprint), [['x', modified]]);
  assert.deepEqual(mergeUsages([['x', old]], [['x', modified]], base, fingerprint), [['x', modified]]);
  assert.throws(() => mergeUsages([], [['x', modified]], base, fingerprint), /eliminó/);
  assert.throws(() => mergeUsages([['x', modified]], [], base, fingerprint), /eliminó/);
  assert.deepEqual(mergeUsages([], [['y', old]], new Map(), fingerprint), [['y', old]]);
  assert.deepEqual(mergeUsages([['y', old]], [], new Map(), fingerprint), [['y', old]]);
});

test('Una sincronización interrumpida solo se reanuda si cada almacén coincide con antes o después', () => {
  const before = { corpus: 'a', editions: 'b', exams: 'c' };
  const after = { corpus: 'A', editions: 'B', exams: 'C' };
  assert.equal(isRecoverableSync({ corpus: 'A', editions: 'b', exams: 'c' }, before, after), true);
  assert.equal(isRecoverableSync({ corpus: 'A', editions: 'B', exams: 'C' }, before, after), true);
  assert.equal(isRecoverableSync({ corpus: 'A', editions: 'tercero', exams: 'c' }, before, after), false);
  assert.equal(isRecoverableSync({ corpus: 'A' }, before, after), false);
});
