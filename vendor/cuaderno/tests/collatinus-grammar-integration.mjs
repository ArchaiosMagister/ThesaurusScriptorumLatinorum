// Ejecutar tras npm run build. Usa el motor y el léxico exactos del artefacto.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { proposeCollatinusGrammar } from '../dist/core/collatinus-grammar.js';

const context=vm.createContext({setTimeout,console,TextDecoder,TextEncoder,URL});
context.self=context;
const assets=new Map(await Promise.all(['datos','incluidos','shim','motor','worker'].map(async name=>{
  const url=new URL('../dist/examinator-cuadernos/collatinus/'+name+'.js',import.meta.url);
  return [name+'.js',await readFile(url,'utf8')];
})));
function load(name){
  vm.runInContext(assets.get(name),context,{filename:name});
}
let receive, reply;
context.importScripts=(...names)=>names.forEach(load);
context.addEventListener=(type, listener)=>{
  assert.equal(type,'message');
  receive=listener;
};
context.postMessage=message=>{ reply=message; };
load('worker.js');
const latin='Venit. Cum amicis venit. Cum veniret, quod dicit auditur. Amatus est. Missi erant. Loquitur. '+
  'Amavisse dicit. Amaturum esse dicit. Si veniat. Rogat ut audiat. Amando discit. Liber legendus. Quid faciat nescio. '+
  'Amatum iri dicit. Locutum esse dicit. Locuturum esse dicit. Loqui dicit.';
await receive({data:{id:1,method:'analyze',args:{text:latin}}});
assert.equal(reply.id,1);
assert.equal(reply.error,undefined);
const tokens=reply.result;
assert.equal(JSON.stringify(tokens),JSON.stringify(await context.api.call('analyze',{text:latin})));
const extended = '[omissum. quod] ' + latin.replace('Quid faciat nescio.', 'Quid dicat ignoramus.');
let analyzedFragments = 0;
const originalCall = context.api.call.bind(context.api);
context.api.call = (method, args) => {
  if (method === 'analyze') analyzedFragments++;
  return originalCall(method, args);
};
await receive({data:{id:3,method:'analyze',args:{text:extended}}});
assert.equal(reply.id,3);
assert.equal(reply.error,undefined);
assert.equal(analyzedFragments,1);
assert.equal(JSON.stringify(reply.result),JSON.stringify(await originalCall('analyze',{text:extended})));
let vocabularyCalls = 0;
const previousCall = context.api.call.bind(context.api);
context.api.call = (method, args) => {
  if (method === 'vocabEntries') vocabularyCalls++;
  return previousCall(method, args);
};
const vocabRequest={lids:[tokens[0].sel.lid],mode:'modelo'};
await receive({data:{id:2,method:'vocabEntries',args:vocabRequest}});
assert.equal(reply.id,2);
assert.ok(reply.result.some(item=>item.lid===tokens[0].sel.lid),reply.error);
const firstVocabulary = JSON.stringify(reply.result);
await receive({data:{id:4,method:'vocabEntries',args:{...vocabRequest,lids:[...vocabRequest.lids]}}});
assert.equal(reply.id,4);
assert.equal(JSON.stringify(reply.result),firstVocabulary);
assert.equal(vocabularyCalls,1,'una petición idéntica debe reutilizar los mismos lemas');
await receive({data:{id:5,method:'vocabEntries',args:{...vocabRequest,mode:'todas'}}});
assert.equal(reply.id,5);
assert.equal(vocabularyCalls,2,'las cantidades vocálicas diferentes requieren un resultado propio');
const proposals=proposeCollatinusGrammar(latin,tokens);
const has=(fragment,id)=>proposals.some(p=>latin.slice(p.start,p.end)===fragment&&p.tagId===id);
const venit=tokens[0].cands.flatMap(c=>c.morphos);
assert.ok(venit.some(m=>m.startsWith('presente de indicativo')));
assert.ok(venit.some(m=>m.startsWith('perfecto de indicativo')));
assert.ok(tokens.filter(t=>t.w==='Cum').every(t=>t.cands.some(c=>c.pos.includes('r'))&&t.cands.some(c=>c.pos==='c')));
assert.ok(has('quod','gram.pron.relativo'));
assert.ok(has('Amatus est','gram.voz.pasiva'));
assert.ok(has('Missi erant','gram.voz.pasiva'));
assert.ok(has('Loquitur','gram.deponente'));
assert.ok(!has('Loquitur','gram.voz.pasiva'));
assert.ok(has('Amavisse','gram.inf.perfecto.activo'));
assert.ok(has('Amaturum esse','gram.inf.futuro.activo'));
assert.ok(has('Amatum iri','gram.inf.futuro.pasivo'));
assert.ok(has('Locutum esse','gram.inf.perfecto.deponente'));
assert.ok(has('Locuturum esse','gram.inf.futuro.deponente'));
assert.ok(has('Loqui','gram.inf.presente.deponente'));
assert.ok(has('Si veniat','gram.condicional'));
assert.ok(has('ut audiat','gram.ut'));
const manualTags=['gram.gerundio','gram.gerundivo','gram.interrogativa.indirecta'];
assert.ok(!proposals.some(p=>manualTags.includes(p.tagId)));
console.log('Collatinus integrado: '+tokens.length+' tokens y '+proposals.length+' propuestas verificadas.');
