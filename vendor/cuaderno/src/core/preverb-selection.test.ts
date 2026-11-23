import test from 'node:test';
import assert from 'node:assert/strict';
import {TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1} from '../data/teacher-academic-snapshot.js';
import {choosePreverbBases,preverbStatement} from './preverb-selection.js';

const bank=TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1;
test('preverbios: dos bases distintas, 3 + 2 derivados y preferencia por el texto de ejemplo',()=>{
  const p=choosePreverbBases(bank,
    'Instruxit aciem; successerunt hostes, phalange facta.',()=>0);
  assert.equal(p.source,'passage');
  assert.deepEqual(p.forms,['instruxit','successerunt']);
  assert.equal(p.sourceKeys.length,5);
  assert.deepEqual(p.sourceKeys.slice(0,3),Array(3).fill(p.sourceKeys[0]));
  assert.deepEqual(p.sourceKeys.slice(3),Array(2).fill(p.sourceKeys[3]));
  assert.notEqual(p.sourceKeys[0],p.sourceKeys[3]);
  assert.equal(p.sourceKeys[0],'struo');
  assert.equal(p.sourceKeys[3],'cedo');
  assert.match(preverbStatement(p.forms),/instruxit.*\(3\).*successerunt.*\(2\)/);
});
test('preverbios: una sola base de texto, segunda del banco; nunca se duplica',()=>{
  const p=choosePreverbBases(bank,'Luna lucet; instruxit.',()=>0);
  assert.ok(p.source==='mixed'||p.source==='passage');
  assert.equal(p.forms[0],'instruxit');
  assert.notEqual(p.sourceKeys[0],p.sourceKeys[3]);
});
test('preverbios: sin bases en el texto, dos distintas del banco con distribución exacta',()=>{
  const a=choosePreverbBases(bank,'Luna clara sub nocte erat.',()=>0);
  const b=choosePreverbBases(bank,'Luna clara sub nocte erat.',()=>0.99);
  assert.equal(a.source,'bank');
  assert.equal(b.source,'bank');
  for(const v of [a,b]){
    assert.equal(v.sourceKeys.length,5);
    assert.notEqual(v.sourceKeys[0],v.sourceKeys[3]);
    assert.deepEqual(v.sourceKeys,[v.sourceKeys[0],v.sourceKeys[0],v.sourceKeys[0],
      v.sourceKeys[3],v.sourceKeys[3]]);
  }
});
test('preverbios: con vocabulario repetido, cada base se utiliza una sola vez',()=>{
  const p=choosePreverbBases(bank,'Instruxit, instruxit atque instruxit.',()=>0.3);
  assert.notEqual(p.sourceKeys[0],p.sourceKeys[3]);
});

test('preverbios: una base de pasaje ya utilizada pierde prioridad ante bases nuevas del banco',()=>{
  const p=choosePreverbBases(bank,'Instruxit aciem; successerunt.',()=>0,['struo','cedo']);
  assert.equal(p.source,'bank');
  assert.ok(!p.sourceKeys.includes('struo'));
  assert.ok(!p.sourceKeys.includes('cedo'));
  assert.notEqual(p.sourceKeys[0],p.sourceKeys[3]);
});
test('preverbios: agotadas las bases nuevas se admite reutilización documentada',()=>{
  const used=bank.preverbs.map(x=>x.ambiguousPrompt?x.enunciado:x.prompt);
  const p=choosePreverbBases(bank,'Luna clara sub nocte erat.',()=>0,used);
  assert.equal(p.source,'bank');
  assert.equal(p.sourceKeys.length,5);
  assert.notEqual(p.sourceKeys[0],p.sourceKeys[3]);
});
