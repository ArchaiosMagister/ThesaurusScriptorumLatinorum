import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCorpus} from './model.js';
import {upsertText} from './editor-operations.js';
import {attachGrammarTags} from './grammar-tags.js';
import {summarizeSelection} from './notebook-selection.js';

const at='2026-11-16T12:00:00.000Z';
const base={title:'Texto',author:'César',work:'De bello Gallico',reference:'I 1',latin:'Gallia est omnis divisa.'};
function corpus(){
  let source=emptyCorpus();
  for(const id of ['doc.a','doc.b','doc.c']){
    source=upsertText(source,{...base,title:id},id,at);
  }
  source=attachGrammarTags(source,'doc.a',['gram.infinitivo','gram.inf.presente','gram.inf.activo','gram.agente']);
  source=attachGrammarTags(source,'doc.b',['gram.infinitivo','gram.inf.perfecto','gram.inf.pasivo']);
  return source;
}

test('recuento de etiquetas usa solo los textos elegidos, nunca el corpus completo',()=>{
  const c=corpus();
  const only=summarizeSelection(c,['doc.a']);
  assert.equal(only.total,1);
  assert.equal(only.withoutTags,0);
  assert.equal(only.counts.find(t=>t.id==='gram.infinitivo')?.count,1);
  assert.equal(only.counts.some(t=>t.id==='gram.inf.perfecto'),false);
  const both=summarizeSelection(c,['doc.a','doc.b']);
  assert.equal(both.total,2);
  assert.equal(both.counts.find(t=>t.id==='gram.infinitivo')?.count,2);
  assert.equal(both.counts.find(t=>t.id==='gram.formas')?.count,2);
  assert.equal(both.counts.find(t=>t.id==='gram.agente')?.count,1);
  assert.equal(both.counts.find(t=>t.id==='gram.voz.pasiva'),undefined);
});
test('los padres no cuentan dos veces un texto con subetiquetas y el agente no implica pasiva',()=>{
  const c=corpus();
  const all=summarizeSelection(c,['doc.a','doc.b','doc.c','doc.a']);
  assert.equal(all.total,3);
  assert.equal(all.withoutTags,1);
  assert.equal(all.counts.find(t=>t.id==='gram.oracion')?.count,2);
  assert.equal(all.counts.find(t=>t.id==='gram.inf.forma')?.count,2);
  assert.equal(all.counts.find(t=>t.id==='gram.agente')?.count,1);
});
test('la ausencia de selección produce cero sin inventar etiquetas',()=>{
  const c=corpus();
  assert.deepEqual(summarizeSelection(c,[]),{total:0,withoutTags:0,counts:[]});
});
