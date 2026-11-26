import test from 'node:test';
import assert from 'node:assert/strict';
import { changeUnderlines, editorialChange, fullWords, mapRange, normalizeUnderlines,
  readRange, span, wordAt } from '../scripts/latin-context-edit.js';

function select(text, value, offset = 0) {
  const start = text.indexOf(value, offset);
  return { start, end: start + value.length };
}

test('selección por posición UTF-16 con ocurrencias repetidas, ligaduras y diacríticos', () => {
  const latin = '🦉 Cæsar, Cæsar\nco\u0304gnito.';
  assert.deepEqual(wordAt(latin, latin.lastIndexOf('Cæsar') + 2), select(latin, 'Cæsar', 8));
  assert.deepEqual(wordAt(latin, latin.indexOf('\u0304')), select(latin, 'co\u0304gnito'));
  assert.equal(wordAt(latin, latin.indexOf('\n') + 1)?.start, latin.indexOf('co'));
  assert.equal(wordAt(latin, 1), null);
  assert.equal(editorialChange(latin, { start: 1, end: 3 }, 'replace', 'X'), null);
});

test('corchetes de palabra completa, fragmento parcial y restitución múltiple', () => {
  const latin = 'Caesar milites in castra misit.';
  const added = editorialChange(latin, select(latin, 'es', 8), 'bracket');
  assert.equal(added.latin, 'Caesar milit[es] in castra misit.');
  assert.equal(editorialChange(added.latin, select(added.latin, 'es', 8), 'bracket'), null);
  assert.equal(editorialChange(added.latin, select(added.latin, 'es', 8), 'unbracket').latin, latin);
  assert.equal(editorialChange(added.latin, select(added.latin, '[es]'), 'unbracket').latin, latin);
  const phrase = 'Afranius Petreiusque';
  assert.equal(editorialChange(phrase, select(phrase, phrase), 'bracket').latin, '[' + phrase + ']');
  assert.equal(editorialChange('[Caesar] [milites]', { start: 0, end: '[Caesar] [milites]'.length }, 'unbracket'), null);
});

test('omisión conserva puntuación y saltos, y une los signos redundantes', () => {
  for (const [latin, value, expected] of [
    ['Cæsar,  cognito consilio hostium, legiones suas.', 'cognito consilio hostium', 'Cæsar, […], legiones suas.'],
    ['[Afranius Petreiusque] […] copias reduxerunt.', 'copias', '[Afranius Petreiusque] […] reduxerunt.'],
    ['Caesar copias   […]  misit.', 'copias', 'Caesar […]  misit.'],
    ['Caesar […]  copias  [...] misit.', 'copias', 'Caesar […] misit.'],
    ['Caesar\n    copias   misit.', 'copias', 'Caesar\n[…] misit.'],
    ['Caesar milites misit.', 'lit', 'Caesar mi […] es misit.']
  ]) assert.equal(editorialChange(latin, select(latin, value), 'omit').latin, expected);
});

test('ediciones precisas desplazan las marcas repetidas y sólo invalidan las afectadas', () => {
  const latin = '🦉 Caesar Caesar\nCaesar';
  const last = select(latin, 'Caesar', 11), middle = select(latin, 'Caesar', 8);
  const edit = editorialChange(latin, middle, 'replace', 'x');
  assert.equal(mapRange(middle, edit), null);
  assert.deepEqual(mapRange(last, edit), select(edit.latin, 'Caesar', 8));
  assert.equal(edit.latin, '🦉 Caesar x\nCaesar');
  const cut = editorialChange(latin, select(latin, 'sar'), 'bracket');
  assert.equal(mapRange(select(latin, 'Caesar'), cut, { token: true }), null);
  assert.ok(fullWords('cognitis rebus', { start: 0, end: 14 }));
  assert.equal(fullWords('cognitis,rebus', { start: 0, end: 14 }), false);
});

test('ligaduras respetan el alcance y proyectan marcas equivalentes', () => {
  const latin = 'Caesar CAESAR Oedipus foedus';
  const change = editorialChange(latin, select(latin, 'Caesar CAESAR Oedipus'), 'ligate');
  assert.equal(change.latin, 'Cæsar CÆSAR Œdipus foedus');
  const anchor = mapRange(select(latin, 'Oedipus'), change, { preserveContent: true, token: true });
  assert.equal(change.latin.slice(anchor.start, anchor.end), 'Œdipus');
  const reverse = editorialChange(change.latin, select(change.latin, 'Cæsar CÆSAR'), 'expand');
  assert.equal(reverse.latin, 'Caesar CAESAR Œdipus foedus');
});

test('subrayado compuesto, retirada parcial y rechazo de anclajes incompatibles', () => {
  const latin = '[Afranius Petreiusque] […] copias reduxerunt.';
  const whole = select(latin, 'Afranius Petreiusque');
  const marked = changeUnderlines(latin, [], whole, 'underline');
  assert.deepEqual(marked, [span(latin, whole)]);
  const removed = select(latin, ' Petreius');
  const rest = changeUnderlines(latin, marked, removed, 'ununderline');
  assert.deepEqual(rest.map(mark => mark.exact), ['Afranius', 'que']);
  assert.deepEqual(normalizeUnderlines(rest, latin), rest);
  assert.equal(normalizeUnderlines(rest, 'X' + latin), null);
});

test('seleccionar corchetes conserva anclajes de las palabras interiores', () => {
  const latin = 'A [Caesar Caesar] B';
  const last = select(latin, 'Caesar', 8);
  const edit = editorialChange(latin, select(latin, '[Caesar Caesar]'), 'unbracket');
  assert.deepEqual(mapRange(last, edit), select(edit.latin, 'Caesar', 8));
  assert.deepEqual(readRange(span(edit.latin, mapRange(last, edit))), { start: 9, end: 15 });
});
