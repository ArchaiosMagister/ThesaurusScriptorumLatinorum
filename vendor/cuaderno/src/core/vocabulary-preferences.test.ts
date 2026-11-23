import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parsePreferredVocabulary,putPreferredVocabulary,preferredFor,
  vocabularyKey,vocabularySortKey} from './vocabulary-preferences.js';

test('ligaduras y cantidades identifican el mismo lema en las preferencias',()=>{
  for(const lemma of ['cælum','cāelum','caelum','Caelum']){
    assert.equal(vocabularyKey(lemma),'caelum');
  }
  assert.equal(vocabularyKey('pœna'),'poena');
  assert.equal(vocabularyKey('Pōena'),'poena');
  assert.equal(vocabularySortKey('pœna'),'poena');
});
test('guardar corrige un lema sin duplicarlo y conserva las glosas separadas',()=>{
  const original={lemma:'caelum',headword:'cælum, –ī',meaning:'cielo',
    note:'n.',glossesSeparated:false};
  const changed={...original,headword:'cælum, -ī',meaning:'cielo | firmamento',
    glossesSeparated:true};
  const next=putPreferredVocabulary([original],changed);
  assert.equal(next.length,1);
  assert.deepEqual(preferredFor(next,'cāelum'),changed);
  assert.deepEqual(parsePreferredVocabulary(JSON.stringify(next)),next);
});
test('no sobrescribir un banco corrupto y rechazar significados vacíos',()=>{
  assert.throws(()=>parsePreferredVocabulary('{'),'JSON');
  assert.throws(()=>putPreferredVocabulary([],{lemma:'a',headword:'a',
    meaning:'',note:'',glossesSeparated:false}),/incompleta/);
  assert.deepEqual(parsePreferredVocabulary(null),[]);
});
