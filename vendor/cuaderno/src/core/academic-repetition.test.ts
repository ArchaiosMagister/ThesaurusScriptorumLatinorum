import assert from 'node:assert/strict';
import test from 'node:test';
import {morphologyOccurrencesFreshFirst} from './academic-repetition.js';

test('fase 5: las formas nuevas van primero aunque quede una sola',()=>{
  const candidates=[
    {key:'arma',start:0},{key:'novum',start:5},
    {key:'arma',start:11},{key:'templum',start:17},
  ];
  const sorted=morphologyOccurrencesFreshFirst(candidates,new Set(['arma','templum']));
  assert.deepEqual(sorted.map(x=>x.key),['novum','arma','arma','templum']);
  assert.deepEqual(sorted.map(x=>x.start),[5,0,11,17]);
  assert.deepEqual(candidates.map(x=>x.key),['arma','novum','arma','templum']);
});
test('fase 5: sin formas utilizadas, se conserva el orden del pasaje',()=>{
  const original=[{key:'arma',start:0},{key:'novum',start:5}];
  assert.deepEqual(morphologyOccurrencesFreshFirst(original,new Set()),original);
});
test('fase 5: solo permite repetir cuando todas las candidatas han aparecido antes',()=>{
  const original=[{key:'arma',start:0},{key:'templum',start:5}];
  assert.deepEqual(morphologyOccurrencesFreshFirst(original,new Set(['arma','templum'])),original);
});
