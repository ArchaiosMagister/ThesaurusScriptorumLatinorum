import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bankTagVisible, buildCurriculum, planCurriculum, matchesInfinitive, matchesSelectividad, selectividadSession, selectividadLabel, compareSelectividadYear } from '../scripts/bank-curriculum.js';

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

test('excluir Selectividad conserva solo los textos no PAU',()=>{
 const pau={selectividad:{year:2026,community:'Comunidad Valenciana'}};
 assert.equal(matchesSelectividad(pau,'','',false,true),false);
 assert.equal(matchesSelectividad({},'','',false,true),true);
 assert.equal(matchesSelectividad({selectividad:{}},'','',false,true),false);
 assert.equal(matchesSelectividad({},'','',false,false),true);
});

test('la planificación aplica exclusiones a todos los grupos y permite sustituir sin repetir pasajes', () => {
  const entry = (id, tags, fields = {}) => ({
    text: { id, title: id, source: { author: id }, latin: id, ...fields }, tags, level: 2
  });
  const rows = [
    entry('a1', ['a']), entry('a2', ['a']), entry('a3', ['a']),
    entry('b1', ['b']), entry('b2', ['b']), entry('future', ['a', 'b']),
    entry('mixed', ['a'], { courseIds: ['1bach', '2bach'] }),
    entry('exam', ['a'], { selectividad: {} }),
    entry('copy', ['a'], { latin: 'a1' })
  ];
  const settings = {
    progression: 'specific', exam: 'exclude', excludedCourses: ['2bach'],
    terms: [{ tags: ['a'], count: 1, review: 1 }, { tags: ['b'], count: 1, review: 1 },
      { tags: ['c'], count: 1, review: 0 }]
  };
  const plan = planCurriculum(rows, settings, (a, b) => a.latin === b.latin);
  const [first, second, third, firstReview, secondReview] = plan.groups;
  assert.deepEqual(plan.coverage(first), { candidates: 5, covered: ['a'], uncovered: [], later: [] });
  assert.deepEqual(plan.coverage(third).uncovered, ['c']);
  assert.equal(plan.coverage(second).candidates, 3);
  assert.equal(firstReview.entries.length, 1);
  assert.equal(secondReview.entries.length, 1);
  const original = first.entries[0];
  assert.equal(plan.replace(first, 0), true);
  assert.notEqual(first.entries[0], original);
  const latin = plan.groups.flatMap(group => group.entries.map(row => row.text.latin));
  assert.equal(new Set(latin).size, latin.length);

  const cumulative = planCurriculum(rows, { ...settings, progression: 'cumulative' }, () => false);
  assert.equal(cumulative.coverage(cumulative.groups[2]).candidates, 7);
  const examsOnly = planCurriculum(rows, { ...settings, exam: 'only', excludedCourses: ['unassigned'] }, () => false);
  assert.ok(examsOnly.groups.every(group => !group.entries.length));
});

test('advierte si la cobertura necesita una etiqueta programada más adelante', () => {
  const plan = planCurriculum([{ text: { id: 'ab', title: 'AB', source: {} }, tags: ['a', 'b'], level: 2 }], {
    progression: 'cumulative', exam: 'all', excludedCourses: [],
    terms: [{ tags: ['a'], count: 1, review: 0 }, { tags: ['b'], count: 1, review: 0 }, { tags: [], count: 0, review: 0 }]
  }, () => false);
  assert.deepEqual(plan.coverage(plan.groups[0]).later, ['b']);
  assert.deepEqual(plan.coverage(plan.groups[1]).uncovered, ['b']);
});
