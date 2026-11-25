import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fingerprintEditorParts, mergeEditorParts, isRecoverableSync, mergeUsages, selectEditor, applyBankReviewDecision, unchangedCheckpoint, withWorkspaceLock } from '../app/dropbox-plan.js';

test('Dropbox solo sustituye el espacio editorial si sigue la revisión conocida o está vacío', () => {
  assert.equal(selectEditor('a', 'a', null, false), 'same');
  assert.equal(selectEditor('a', 'b', null, true), 'download');
  assert.equal(selectEditor('a', 'b', 'a', false), 'download');
  assert.equal(selectEditor('a', 'b', 'b', false), 'upload');
  assert.throws(() => selectEditor('a', 'b', null, false), /difieren/);
  assert.throws(() => selectEditor('a', 'b', 'c', false), /difieren/);
  assert.equal(selectEditor('a', 'b', 'c', false, 'remote'), 'download');
  assert.equal(selectEditor('a', 'b', 'c', false, 'local'), 'upload');
  assert.equal(selectEditor('a', 'b', 'b', false, 'remote'), 'upload');
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
  assert.deepEqual(mergeUsages([['x', modified]], [], base, fingerprint, null, 'remote'), []);
  assert.deepEqual(mergeUsages([], [['x', modified], ['y', old]], base, fingerprint, null, 'local'), [['y', old]]);
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

test('las bajas de revisiones no se recrean y no se heredan versiones obsoletas',()=>{
 const row={start:0,end:4,tagId:'gram.x',state:'automatic',evidence:[],alternatives:[]};
 const cached={version:2,rejected:[],corrected:[],pending:[{...row,evidence:['prueba']}]};
 assert.equal(applyBankReviewDecision(cached,undefined),null);
 const downgraded=applyBankReviewDecision(cached,{rejected:['0:4:gram.x'],corrected:[],pending:[]});
 assert.equal(downgraded.version,undefined);
 assert.deepEqual(downgraded.pending,[]);
 const current=applyBankReviewDecision(cached,{version:2,rejected:[],corrected:[],pending:[row]});
 assert.deepEqual(current.pending[0].evidence,['prueba']);
});

test('Dropbox combina fichas independientes y solicita elección para una baja incompatible', async () => {
  const editor = (texts, revision) => ({ bank: { corpus: [['current', { revision, corpus: { texts } }]] } });
  const a = { id: 'a', title: 'A' };
  const b = { id: 'b', title: 'B' };
  const localA = { ...a, title: 'A local' };
  const remoteB = { ...b, title: 'B Dropbox' };
  const hash = async data => JSON.stringify(data);
  const baseline = await fingerprintEditorParts(editor([a, b], 1), hash);
  assert.deepEqual(await mergeEditorParts(editor([localA, b], 2), editor([a, remoteB], 3), baseline, hash),
    editor([localA, remoteB], 3));
  await assert.rejects(mergeEditorParts(editor([b], 2), editor([localA, remoteB], 3), baseline, hash), /A local/);
  assert.deepEqual(await mergeEditorParts(editor([b], 2), editor([localA, remoteB], 3), baseline, hash, () => 'local'),
    editor([remoteB], 3));
});

test('solo omite la descarga cuando la revisión remota y la huella local coinciden y no hay diario pendiente', () => {
  const checkpoint = { revision: 'rev1', hash: 'a' };
  assert.equal(unchangedCheckpoint(checkpoint, 'a', 'rev1', null), true);
  assert.equal(unchangedCheckpoint(checkpoint, 'b', 'rev1', null), false);
  assert.equal(unchangedCheckpoint(checkpoint, 'a', 'rev2', null), false);
  assert.equal(unchangedCheckpoint(checkpoint, 'a', undefined, null), false);
  assert.equal(unchangedCheckpoint(checkpoint, 'a', 'rev1', {}), false);
  assert.equal(unchangedCheckpoint(null, 'a', 'rev1', null), false);
});

test('restauración y sincronización comparten la cola y la liberan incluso ante errores', async () => {
  const log = [];
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const first = withWorkspaceLock(async () => {
    log.push('restauración');
    await barrier;
    throw Error('interrumpida');
  }, null);
  const second = withWorkspaceLock(async () => { log.push('sincronización'); }, null);
  await Promise.resolve();
  assert.deepEqual(log, ['restauración']);
  release();
  await assert.rejects(first, /interrumpida/);
  await second;
  assert.deepEqual(log, ['restauración', 'sincronización']);
  const names = [];
  const locks = { request: (name, work) => { names.push(name); return work(); } };
  await withWorkspaceLock(() => {}, locks);
  await withWorkspaceLock(() => {}, locks);
  assert.deepEqual(names, ['atl-v1:dropbox', 'atl-v1:dropbox']);
});
