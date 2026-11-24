import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bankTagVisible, buildCurriculum, matchesInfinitive, matchesSelectividad, selectividadSession, selectividadLabel, compareSelectividadYear } from '../scripts/bank-curriculum.js';

function row(index, level, ...tags) {
  return { text: { id: String(index), title: 'Pasaje ' + index }, level, tags };
}

test('50 pasajes distintos distribuidos por dificultad y un repaso de cinco niveles', () => {
  const rows = Array.from({ length: 50 }, (_, i) => row(i, 1 + Math.floor(i / 10), i % 2 ? 'a' : 'b'));
  const plan = buildCurriculum(rows, ['a', 'b'], [15, 15, 15, 5]);
  assert.deepEqual(plan.groups.map(group => group.entries.length), [15, 15, 15, 5]);
  assert.deepEqual(plan.groups[3].entries.map(item => item.level), [1, 2, 3, 4, 5]);
  const teaching = plan.groups.slice(0, 3).flatMap(group => group.entries.map(entry => entry.level));
  assert.deepEqual(teaching, [...teaching].sort());
  assert.equal(new Set(plan.groups.flatMap(group => group.entries.map(entry => entry.text.id))).size, 50);
});

test('repara un fallo de la selección voraz y distingue ausencias del Banco', () => {
  const rows = [row(1, 1, 'a', 'b', 'c', 'd'), row(2, 2, 'a', 'b', 'e'), row(3, 3, 'c', 'd', 'f')];
  const plan = buildCurriculum(rows, ['a', 'b', 'c', 'd', 'e', 'f', 'missing'], [1, 1, 0, 0]);
  assert.deepEqual(plan.groups.flatMap(group => group.entries.map(entry => entry.text.id)), ['2', '3']);
  assert.deepEqual(plan.missing, ['missing']);
  assert.deepEqual(plan.uncovered, []);
});

test('conserva las etiquetas específicas y cruza año y comunidad', () => {
  assert.equal(bankTagVisible('gram.pron.demostrativo'), false);
  assert.equal(bankTagVisible('gram.pron.proximo'), true);
  assert.equal(bankTagVisible('gram.cum.preposicion'), false);
  assert.equal(bankTagVisible('gram.cum.historico'), true);
  const text = { selectividad: { year: 2024, community: 'Galicia' } };
  assert.equal(matchesSelectividad(text, '2024', 'Galicia', true), true);
  assert.equal(matchesSelectividad(text, '2024', 'Andalucía', false), false);
  assert.equal(matchesSelectividad({}, '', '', true), false);
  assert.equal(matchesSelectividad({}, '', '', false), true);
});

test('retira las categorías pedidas y con tiempo y voz exige una sola forma compatible', () => {
  for (const id of ['gram.interrogativa.indirecta', 'gram.gerundio', 'gram.gerundivo'])
    assert.equal(bankTagVisible(id), false);
  assert.equal(matchesInfinitive(['gram.inf.presente.pasivo'], 'presente', 'pasivo'), true);
  assert.equal(matchesInfinitive(['gram.inf.presente.activo', 'gram.inf.perfecto.pasivo'], 'presente', 'pasivo'), false);
  assert.equal(matchesInfinitive(['gram.inf.presente', 'gram.inf.pasivo'], 'presente', 'pasivo'), false);
  assert.equal(matchesInfinitive(['gram.inf.futuro.deponente'], '', 'deponente'), true);
  assert.equal(matchesInfinitive(['gram.infinitivo'], '', ''), false);
});

test('convocatoria original, reserva y orden cronológico de PAU',()=>{
 const item=(year,session,option='A')=>({selectividad:{year,community:'Comunidad Valenciana'},teacherDocx:{pauCv:year+' '+session+' / '+option}});
 const old=item(2006,'JUNIO'), september=item(2006,'SEPTIEMBRE'), recent=item(2026,'ORDINARIA'), reserve=item(2025,'JUNIO (reserva)'), ordinary=item(2025,'JUNIO','B'), undated={};
 assert.equal(selectividadSession(old).label,'Ordinaria (junio) · Opción A');
 assert.equal(selectividadSession(september).label,'Extraordinaria (septiembre) · Opción A');
 assert.equal(selectividadSession(reserve).label,'Ordinaria (junio) · Reserva · Opción A');
 assert.equal(selectividadSession({...reserve,teacherDocx:undefined,notes:'PAU CV · JUNIO (reserva) 2025 · Opción A · p. 48'}).label,selectividadSession(reserve).label);
 assert.equal(selectividadSession({selectividad:{year:2026}}),null);
 assert.match(selectividadLabel(recent),/2026 · Ordinaria · Opción A/);
 const rows=[reserve,undated,recent,september,ordinary,old];
 assert.deepEqual([...rows].sort((a,b)=>compareSelectividadYear(a,b)),[old,september,ordinary,reserve,recent,undated]);
 assert.deepEqual([...rows].sort((a,b)=>compareSelectividadYear(a,b,true)),[recent,ordinary,reserve,old,september,undated]);
});
