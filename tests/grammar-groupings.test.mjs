import test from 'node:test';
import assert from 'node:assert/strict';
import { bankTagAssignable, bankTagVisible, compactGrammarTags, matchesGrammarGrouping, isRetiredTag } from '../scripts/bank-curriculum.js';

test('las categorías generales son filtros y no etiquetas asignables', () => {
  for (const id of ['gram.voz.pasiva', 'gram.deponente', 'gram.subjuntivo']) {
    assert.equal(bankTagVisible(id), true);
    assert.equal(bankTagAssignable(id), false);
  }
  assert.equal(isRetiredTag('gram.concordancia.nominal'), true);
  assert.equal(bankTagAssignable('gram.concordancia.nominal'), false);
  assert.equal(bankTagAssignable('gram.pron.relativo'), true);
  assert.equal(bankTagAssignable('gram.verbo.presente.indicativo.activo'), true);
});
test('las formas específicas activan las agrupaciones sin mezclar participios y tiempos personales', () => {
  const passive = 'gram.verbo.pluscuamperfecto.subjuntivo.pasivo';
  assert.equal(matchesGrammarGrouping(passive, 'gram.voz.pasiva'), true);
  assert.equal(matchesGrammarGrouping(passive, 'gram.subjuntivo'), true);
  assert.equal(matchesGrammarGrouping(passive, 'gram.deponente'), false);
  assert.equal(matchesGrammarGrouping('gram.part.perfecto.pasivo', 'gram.voz.pasiva'), false);
  assert.equal(matchesGrammarGrouping('gram.inf.perfecto.pasivo', 'gram.voz.pasiva'), true);
  assert.equal(matchesGrammarGrouping('gram.part.perfecto.deponente', 'gram.deponente'), true);
  assert.equal(matchesGrammarGrouping('gram.verbo.perfecto.indicativo.deponente', 'gram.deponente'), true);
  assert.equal(matchesGrammarGrouping('gram.verbo.perfecto.indicativo.deponente', 'gram.voz.pasiva'), false);
  assert.equal(matchesGrammarGrouping('gram.subjuntivo', 'gram.subjuntivo'), true);
});
test('la depuración retira redundancias demostrables y mantiene datos sin equivalencia específica', () => {
  const specific = 'gram.verbo.pluscuamperfecto.subjuntivo.pasivo';
  assert.deepEqual(compactGrammarTags(['gram.concordancia.nominal', 'gram.voz.pasiva', 'gram.subjuntivo',
    specific, 'gram.deponente', 'gram.pron.relativo', 'custom.propio', specific]),
    [specific, 'gram.deponente', 'gram.pron.relativo', 'custom.propio']);
});
