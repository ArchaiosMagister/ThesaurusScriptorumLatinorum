import test from 'node:test';
import assert from 'node:assert/strict';
import {splitInlineItalics,splitLatinOmissions} from './edition-inline-formatting.js';

test('cursivas de palabras latinas dentro del enunciado sin HTML ni pérdida textual',()=>{
  assert.deepEqual(splitInlineItalics('a partir de *instruxit* (3) y de *successerunt* (2).'),[
    {text:'a partir de ',italic:false},{text:'instruxit',italic:true},
    {text:' (3) y de ',italic:false},{text:'successerunt',italic:true},
    {text:' (2).',italic:false},
  ]);
  assert.deepEqual(splitInlineItalics('Texto sin cursiva'),[{text:'Texto sin cursiva',italic:false}]);
  assert.deepEqual(splitInlineItalics('*incompleto'),[{text:'*incompleto',italic:false}]);
});

test('omisiones entre corchetes en redonda sin eliminar, normalizar ni desplazar latín',()=>{
  const original='Caesar […] Gallos vicit [...] ac deinde [ … ] regressus est.';
  const parts=splitLatinOmissions(original);
  assert.deepEqual(parts.filter(part=>part.roman).map(part=>part.text),['[…]','[...]','[ … ]']);
  assert.equal(parts.map(part=>part.text).join(''),original);
  assert.deepEqual(splitLatinOmissions('Caesar Gallicos vicit.'),
    [{text:'Caesar Gallicos vicit.',roman:false}]);
});

test('corchetes en redonda y restituciones en cursiva, aun con rangos partidos',()=>{
  const original='[Afranius Petreiusque] milit[es] […]';
  const parts=splitLatinOmissions(original);
  assert.deepEqual(parts.filter(part=>part.roman).map(part=>part.text),['[',']','[',']','[…]']);
  assert.deepEqual(parts.filter(part=>!part.roman).map(part=>part.text),['Afranius Petreiusque',' milit','es',' ']);
  assert.equal(parts.map(part=>part.text).join(''),original);
  const omission=original.indexOf('[…]');
  assert.deepEqual(splitLatinOmissions(original,omission+1,omission+2),[{text:'…',roman:true}]);
  assert.deepEqual(splitLatinOmissions(original,1,9),[{text:'Afranius',roman:false}]);
});
