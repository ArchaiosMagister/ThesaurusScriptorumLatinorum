// Compilar antes de ejecutar. Se usa el mismo worker y los mismos recursos que en la PWA.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';
import { contextualBankAnalysis } from '../scripts/bank-context.js';
import { proposeCollatinusGrammar } from '../dist/modulos/cuaderno-integrado/core/collatinus-grammar.js';

const folder = new URL('../dist/modulos/cuaderno-integrado/examinator-cuadernos/collatinus/', import.meta.url);
const assets = new Map(await Promise.all(['datos', 'incluidos', 'shim', 'motor', 'worker'].map(async name => [
  name + '.js', await readFile(new URL(name + '.js', folder), 'utf8')
])));
const context = vm.createContext({ setTimeout, console, TextDecoder, TextEncoder, URL });
context.self = context;
context.importScripts = (...names) => names.forEach(name => vm.runInContext(assets.get(name), context, { filename: name }));
let receive, reply;
context.addEventListener = (_, listener) => { receive = listener; };
context.postMessage = value => { reply = value; };
context.importScripts('worker.js');

async function analyze(latin) {
  await receive({ data: { id: 1, method: 'analyze', args: { text: latin } } });
  assert.equal(reply.error, undefined);
  return contextualBankAnalysis(latin, reply.result, proposeCollatinusGrammar);
}

const find = (rows, fragment, id) => rows.find(row => row.fragment === fragment && row.tagId === 'gram.' + id);

test('concordancia posesiva y exclusión del subjuntivo homógrafo', async () => {
  const rows = await analyze('Suas copias.');
  const agreement = find(rows, 'Suas copias', 'pronombres');
  assert.equal(agreement?.state, 'automatic');
  assert.match(agreement.evidence.join(' '), /acusativo femenino plural/);
  assert.ok(agreement.alternatives.some(reading => reading.includes('subjuntivo')));
  assert.ok(!rows.some(row => row.tagId.includes('subjuntivo')));
});

test('cum preposicional y conjuntivo, quod ambiguo y venit temporalmente ambiguo', async () => {
  const rows = await analyze('Cum militibus. Cum venisset. Quod dixit. Venit.');
  assert.equal(find(rows, 'Cum militibus', 'cum.preposicion')?.state, 'automatic');
  assert.equal(find(rows, 'Cum venisset', 'cum.conjuncion')?.state, 'automatic');
  assert.equal(find(rows, 'venisset', 'subjuntivo')?.state, 'automatic');
  assert.equal(find(rows, 'Quod', 'pron.relativo')?.state, 'pending');
  assert.ok(!rows.some(row => ['gram.relativo', 'gram.cum.historico'].includes(row.tagId)));
  assert.equal(find(rows, 'Venit', 'verbo.presente.indicativo.activo')?.state, 'pending');
  assert.ok(find(rows, 'Venit', 'verbo.presente.indicativo.activo').alternatives.some(value => value.includes('perfecto')));
});

test('tiempo y voz de formas compuestas con sum y los límites de oración', async () => {
  const rows = await analyze('Missi erant. Profectus est. Missi. Erant.');
  assert.ok(find(rows, 'Missi erant', 'verbo.pluscuamperfecto.indicativo.pasivo'));
  assert.ok(find(rows, 'Profectus est', 'verbo.perfecto.indicativo.deponente'));
  assert.ok(!rows.some(row => row.fragment.includes('.')));
});

test('las formas no personales no demuestran por sí solas una función sintáctica', async () => {
  const rows = await analyze('Urbe capta. Amavisse dicit. Amando discit. Liber legendus. Hoc dixisse fertur.');
  assert.ok(find(rows, 'capta', 'part.perfecto.pasivo'));
  assert.equal(find(rows, 'Amavisse', 'inf.perfecto.activo')?.state, 'automatic');
  assert.ok(find(rows, 'dixisse', 'inf.perfecto.activo'));
  assert.ok(!rows.some(row => ['gram.participio', 'gram.ablativo.absoluto', 'gram.infinitivo'].includes(row.tagId)));
});

test('un ablativo separado por coma puede requerir confirmar su función', async () => {
  const rows = await analyze('Urbe capta, milites discesserunt.');
  assert.equal(find(rows, 'Urbe capta', 'ablativo.absoluto')?.state, 'pending');
});

test('pasajes de César, Cicerón y Virgilio sin falsos positivos sintácticos', async () => {
  const caesar = await analyze('Gallia est omnis divisa in partes tres, quarum unam incolunt Belgae, aliam Aquitani.');
  assert.ok(find(caesar, 'quarum', 'pron.relativo'));
  assert.ok(!caesar.some(row => row.tagId === 'gram.relativo.enlace'));
  const cicero = await analyze('Quo usque tandem abutere, Catilina, patientia nostra?');
  assert.ok(!cicero.some(row => row.tagId === 'gram.interrogativa.indirecta'));
  const virgil = await analyze('Arma virumque cano, Troiae qui primus ab oris Italiam, fato profugus, Laviniaque venit litora.');
  assert.ok(find(virgil, 'qui', 'pron.relativo'));
  assert.ok(!virgil.some(row => row.fragment === 'Arma' && row.tagId.includes('imperativo')));
});
