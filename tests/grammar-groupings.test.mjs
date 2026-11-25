import test from 'node:test';
import assert from 'node:assert/strict';
import { bankTagAssignable, bankTagVisible, compactGrammarTags, matchesGrammarGrouping, isRetiredTag, plannerFiniteFamilies, plannerFiniteFamily } from '../scripts/bank-curriculum.js';

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

test('el planificador separa los ocho bloques por tema, modo y voz', () => {
  const expected = [
    'Infectum · indicativo activo', 'Infectum · indicativo pasivo',
    'Infectum · subjuntivo activo', 'Infectum · subjuntivo pasivo',
    'Perfectum · indicativo activo', 'Perfectum · indicativo pasivo',
    'Perfectum · subjuntivo activo', 'Perfectum · subjuntivo pasivo'
  ];
  assert.deepEqual(plannerFiniteFamilies.slice(0, 8), expected);
  const observed = new Set();
  for (const [theme, mood, tenses] of [
    ['Infectum', 'indicativo', ['presente', 'imperfecto', 'futuro', 'futuro-imperfecto', 'futuro.imperfecto']],
    ['Infectum', 'subjuntivo', ['presente', 'imperfecto']],
    ['Perfectum', 'indicativo', ['perfecto', 'pluscuamperfecto', 'futuro-anterior', 'futuro-perfecto', 'futuroperfecto', 'futuro.perfecto']],
    ['Perfectum', 'subjuntivo', ['perfecto', 'pluscuamperfecto']]
  ]) {
    for (const voice of ['activo', 'pasivo']) {
      for (const tense of tenses) {
        const family = plannerFiniteFamily('gram.verbo.' + tense + '.' + mood + '.' + voice);
        assert.equal(family, theme + ' · ' + mood + ' ' + voice);
        observed.add(family);
      }
    }
  }
  assert.deepEqual([...observed], expected);
});
test('imperativos, deponentes y formas no personales no contaminan los ocho bloques', () => {
  for (const tense of ['presente', 'futuro']) {
    for (const voice of ['activo', 'pasivo']) {
      assert.equal(plannerFiniteFamily('gram.verbo.' + tense + '.imperativo.' + voice), 'Imperativo');
    }
  }
  for (const id of ['gram.verbo.presente.indicativo.deponente', 'gram.verbo.perfecto.subjuntivo.deponente', 'gram.verbo.presente.imperativo.deponente']) {
    assert.equal(plannerFiniteFamily(id), 'Verbos deponentes');
  }
  for (const id of ['gram.inf.perfecto.pasivo', 'gram.part.perfecto.pasivo', 'gram.subjuntivo', 'gram.voz.pasiva', 'gram.verbo']) {
    assert.equal(plannerFiniteFamily(id), null);
  }
});
