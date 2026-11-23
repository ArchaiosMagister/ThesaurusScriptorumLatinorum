import test from 'node:test';
import assert from 'node:assert/strict';
import { findPossibleDuplicates, normalizedLatinKey } from './text-duplicates.js';
import type { LatinText } from './model.js';

const passage = 'Helvetii cum omnibus suis carris secuti impedimenta in unum locum contulerunt; ipsi confertissima acie reiecto nostro equitatu phalange facta successerunt.';
const original = {
  id: 'source.1',
  title: 'Los helvecios atacan',
  latin: passage,
  source: { author: 'Julio César', work: 'De bello Gallico', reference: 'I 24' },
} satisfies Pick<LatinText, 'id' | 'title' | 'latin' | 'source'>;

test('detecta textos idénticos pese a signos y grafías tipográficas diferentes', () => {
  const copy = passage.replace(';', ',').replace('locum', 'lŏcum').replace('equitatu', 'equitatū');
  const matches = findPossibleDuplicates([original], { latin: copy, author: 'Caesar', work: 'Bellum Gallicum', reference: '1.24' });
  assert.equal(matches[0]?.kind, 'identical');
  assert.equal(matches[0]?.textId, 'source.1');
  assert.equal(original.latin, passage);
});

test('detecta pasajes compartidos que no son el texto completo', () => {
  const fragment = 'Igitur ' + passage.slice(0, 93) + ' et postea reliqui discesserunt.';
  const matches = findPossibleDuplicates([original], { latin: fragment, author: 'Otro', work: 'Otra obra', reference: '2' });
  assert.equal(matches[0]?.kind, 'overlap');
  assert.ok((matches[0]?.sharedWords ?? 0) >= 8);
  assert.match(matches[0]!.excerpt, /Helvetii/);
});

test('considera equivalentes las dos formas de citar el Bellum civile', () => {
  const civil = { ...original, source: { author: 'César', work: 'De bello civili', reference: 'II 5' } };
  const matches = findPossibleDuplicates([civil], {
    latin: 'Alia verba sine similitudine.',
    author: 'C. Iulius Caesar', work: 'Bellum civile', reference: '2.5',
  });
  assert.equal(matches[0]?.kind, 'citation');
});

test('no confunde referencias distintas de la misma obra', () => {
  const matches = findPossibleDuplicates([original], {
    latin: 'Alia verba sine similitudine.',
    author: 'César', work: 'Bellum Gallicum', reference: 'I 25',
  });
  assert.deepEqual(matches, []);
});

test('excluye la ficha que se está editando y conserva duplicados de otras fichas', () => {
  const other = { ...original, id: 'source.2', title: 'Segunda ficha' };
  const matches = findPossibleDuplicates([original, other], {
    latin: passage, author: 'César', work: 'Bellum Gallicum', reference: '1.24',
  }, 'source.1');
  assert.deepEqual(matches.map(match => match.textId), ['source.2']);
});

test('los fragmentos demasiado breves no provocan coincidencias parciales espurias', () => {
  const matches = findPossibleDuplicates([original], {
    latin: 'in unum locum', author: 'Otro', work: 'Otra obra', reference: '3',
  });
  assert.deepEqual(matches, []);
});

test('normaliza capítulos escritos con IV y cifras arábigas', () => {
  const entry = { ...original, source: { author: 'César', work: 'De bello Gallico', reference: 'IV 24' } };
  const matches = findPossibleDuplicates([entry], {
    latin: 'Frase nueva para la referencia.',
    author: 'Caesar', work: 'Bellum Gallicum', reference: '4.24',
  });
  assert.equal(matches[0]?.kind, 'citation');
});


test('normaliza igual las vocales con cantidad precompuesta y con macrón combinante',()=>{
  const composed='Māgnus exercitus Rōmānus in castra rediit; dūx milites laudāvit.';
  const decomposed=composed.normalize('NFD');
  assert.notEqual(composed,decomposed);
  assert.equal(normalizedLatinKey(composed),normalizedLatinKey(decomposed));
  const source={...original,latin:composed};
  const matches=findPossibleDuplicates([source],{
    latin:decomposed,author:'Otro',work:'Otro libro',reference:'2.3',
  });
  assert.equal(matches[0]?.kind,'identical');
  assert.equal(matches[0]?.sharedWords,9);
});
