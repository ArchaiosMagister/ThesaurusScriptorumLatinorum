import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bankTagVisible, buildCurriculum, matchesSelectividad } from '../scripts/bank-curriculum.js';

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
