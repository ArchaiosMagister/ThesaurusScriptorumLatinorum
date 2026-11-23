import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCorpus} from './model.js';
import {upsertText} from './editor-operations.js';
import {GRAMMAR_CATALOGUE,allGrammarTags,attachGrammarTags,findTagByLabel,
  matchesGrammarFilters,matchesGrammarTag,isCustomTagLabelValid,
} from './grammar-tags.js';

const now='2026-11-16T12:00:00.000Z';
const draft={title:'César',latin:'Gallia est omnis divisa.',author:'César',
  work:'De bello Gallico',reference:'I.1'};
function source(){
  return upsertText(emptyCorpus(),draft,'doc.1',now);
}

test('catálogo distingue función del infinitivo de tiempo y voz, y agente de pasiva',()=>{
  const byId=new Map(GRAMMAR_CATALOGUE.map(tag=>[tag.id,tag]));
  assert.equal(byId.get('gram.infinitivo')?.label,'Oración de infinitivo');
  assert.equal(byId.get('gram.inf.perfecto')?.parentId,'gram.inf.forma');
  assert.equal(byId.get('gram.inf.pasivo')?.parentId,'gram.inf.forma');
  assert.notEqual(byId.get('gram.agente')?.parentId,byId.get('gram.voz.pasiva')?.id);
  for(const id of ['gram.relativo.enlace','gram.acus.ext','gram.doble.dativo',
    'gram.dativo.aprox','gram.pron.enfatico','gram.pron.proximo','gram.pron.medio',
    'gram.pron.lejano','gram.ut.completiva','gram.ut.final','gram.ut.consecutiva']){
    assert.ok(byId.get(id),id);
  }
});

test('guardar varias etiquetas añade sus ancestros y preserva el corpus original',()=>{
  const initial=source();
  const saved=attachGrammarTags(initial,'doc.1',[
    'gram.infinitivo','gram.inf.perfecto','gram.inf.pasivo','gram.agente',
  ]);
  assert.equal(initial.tags.length,0);
  assert.equal(initial.texts[0]?.tagIds.length,0);
  assert.deepEqual(saved.texts[0]?.tagIds,[
    'gram.infinitivo','gram.inf.perfecto','gram.inf.pasivo','gram.agente',
  ]);
  assert.ok(saved.tags.some(tag=>tag.id==='gram.inf.forma'));
  assert.ok(saved.tags.some(tag=>tag.id==='gram.oracion'));
  assert.ok(saved.tags.some(tag=>tag.id==='gram.funciones'));
  assert.equal(matchesGrammarFilters(saved.texts[0]!.tagIds,[
    'gram.inf.forma','gram.inf.pasivo','gram.agente'],allGrammarTags(saved)),true);
  assert.equal(matchesGrammarFilters(saved.texts[0]!.tagIds,[
    'gram.inf.presente','gram.inf.pasivo'],allGrammarTags(saved)),false);
  assert.equal(matchesGrammarTag('gram.ut.final','gram.ut',GRAMMAR_CATALOGUE),true);
  assert.equal(matchesGrammarTag('gram.agente','gram.voz.pasiva',GRAMMAR_CATALOGUE),false);
});

test('etiqueta personalizada se conserva y se puede filtrar de forma combinada',()=>{
  const tag={id:'custom.usuario.ejemplo',kind:'custom' as const,
    label:'Perífrasis pasiva',parentId:null};
  let saved=attachGrammarTags(source(),'doc.1',['gram.ablativo.absoluto',tag.id],[tag]);
  assert.equal(saved.tags.find(t=>t.id===tag.id)?.kind,'custom');
  assert.equal(findTagByLabel('PERIFRASIS PASIVA',allGrammarTags(saved))?.id,tag.id);
  assert.equal(matchesGrammarFilters(saved.texts[0]!.tagIds,['gram.oracion',tag.id],
    allGrammarTags(saved)),true);
  saved=attachGrammarTags(saved,'doc.1',[tag.id,tag.id],[tag]);
  assert.deepEqual(saved.texts[0]!.tagIds,[tag.id]);
  assert.equal(saved.tags.filter(t=>t.id===tag.id).length,1);
});

test('etiquetas inválidas y pendientes no se guardan, sin corrupción',()=>{
  assert.equal(isCustomTagLabelValid(''),false);
  assert.equal(isCustomTagLabelValid('x'.repeat(161)),false);
  assert.equal(isCustomTagLabelValid('Dativo ético'),true);
  assert.throws(()=>attachGrammarTags(source(),'doc.1',['unknown.label']),/desconocida/);
});
