import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessBankDifficulty } from '../scripts/bank-difficulty.js';

test('estima carga y longitud de frase, con una escala de uno a cinco', () => {
  assert.equal(assessBankDifficulty({ latin: 'Puella rosam legit.' }).level, 1);
  const short = 'Caesar Galliam petiit et ex oppido exiit.';
  assert.equal(assessBankDifficulty({ latin: short.repeat(25) }).level, 1);
  assert.equal(assessBankDifficulty({ latin: short.replace('.', ', ').repeat(15) }).level, 4);
  assert.equal(assessBankDifficulty({ latin: '[omissum] 123.' }).level, null);
});

test('pondera familias gramaticales, sin contar dos veces formas relacionadas', () => {
  const text = { latin: 'Cum venisset, milites discesserunt.', tagIds: ['gram.cum.historico'] };
  assert.equal(assessBankDifficulty(text, ['gram.subjuntivo']).level, 2);
  assert.equal(assessBankDifficulty(text, ['gram.subjuntivo', 'gram.relativo']).level, 3);
});

test('una calificación docente prevalece y el cambio del pasaje actualiza la estimación', () => {
  const text = { latin: 'Arma virumque cano.', difficulty: 4 };
  assert.equal(assessBankDifficulty(text).level, 4);
  assert.equal(assessBankDifficulty(text).estimate, 1);
  text.latin = 'Arma virumque cano '.repeat(40) + '.';
  assert.equal(assessBankDifficulty(text).estimate, 4);
  assert.equal(assessBankDifficulty(text).level, 4);
});
