import assert from 'node:assert/strict';
import test from 'node:test';
import {createPlacement,createEdition} from './edition-factory.js';
import {validateEdition} from './edition-validation.js';
import {applyMorphologyChoices,removeMorphologyWord,selectMorphologyForPlacement} from './morph-selection-collatinus.js';
import type {CollatinusGrammarToken} from './collatinus-grammar.js';

const NOW='2026-11-21T10:00:00.000Z';
const LATER='2026-11-21T10:01:00.000Z';
const latin='puella bonus ille amat videre laudatus tres.';
let sequence=0;
const place=()=>createPlacement({id:'p.1',latin,title:'Texto latino',author:'Autor',work:'Obra',reference:'1',
  source:{kind:'manual',sourceId:null,urn:null,importedAt:NOW}},()=>('fixture.'+(++sequence)));
const edition=()=>createEdition({id:'edition.morph',legacyNotebookId:null,title:'Cuaderno',
  timestamp:NOW,placements:[place()]});
function token(surface:string,lid:number,morph:string,pos:string,im=''):CollatinusGrammarToken{
  const start=latin.indexOf(surface);assert.ok(start>=0);
  return {w:surface,s:start,e:start+surface.length,sent:0,pb:'',
    sel:{lid,morpho:morph},cands:[{lid,lemma:surface,im,pos,morphos:[morph]}]};
}
const tokens:CollatinusGrammarToken[]=[
 token('puella',1,'nominativo singular','n'),
 token('bonus',2,'nominativo singular','a'),
 token('ille',3,'nominativo singular','p'),
 token('amat',4,'presente de indicativo activo','v'),
 token('videre',5,'infinitivo de presente activo','v'),
 token('laudatus',6,'participio de perfecto pasivo: nominativo','v'),
 token('tres',7,'nominativo plural','num','num. cardinal'),
];
test('cuatro categorías distintas, con subrayados y análisis trazables solo como propuestas',()=>{
 const before=edition(),used=JSON.stringify(before);
 const suggestions=selectMorphologyForPlacement(before,'p.1',tokens);
 assert.equal(suggestions.length,4);
 const changed=applyMorphologyChoices(before,'p.1',suggestions,LATER);
 assert.equal(JSON.stringify(before),used,'la propuesta no modifica el cuaderno original');
 const q=changed.placements[0]!.questions.find(x=>x.kind==='morphology');
 assert.ok(q&&q.kind==='morphology');
 assert.equal(q.words.length,4);
 assert.equal(new Set(q.words.map(w=>w.schoolCategory)).size,4);
 assert.ok(q.words.every(w=>w.reviewState==='needs-review'));
 assert.ok(q.words.every(w=>w.provenance?.provider.startsWith('Collatinus')));
 assert.equal(changed.placements[0]!.text.markup.length,4);
 assert.deepEqual(validateEdition(JSON.parse(JSON.stringify(changed))),changed);
});
test('no se duplica ninguna categoría y se respeta el máximo de cuatro',()=>{
 const ed=edition(),options=selectMorphologyForPlacement(ed,'p.1',tokens);
 const selected=applyMorphologyChoices(ed,'p.1',options,LATER);
 const more=selectMorphologyForPlacement(selected,'p.1',tokens);
 assert.equal(more.length,0);
});
test('cambiar y quitar una aparición no altera las restantes ni el texto',()=>{
 const ed=edition(),options=selectMorphologyForPlacement(ed,'p.1',tokens);
 const selected=applyMorphologyChoices(ed,'p.1',options,LATER);
 const q=selected.placements[0]!.questions.find(x=>x.kind==='morphology');
 if(!q||q.kind!=='morphology')throw Error('pregunta perdida');
 const previous=q.words[0]!;
 const alternatives=selectMorphologyForPlacement(selected,'p.1',tokens,previous.id);
 assert.equal(alternatives.length,1);
 const replacement=applyMorphologyChoices(selected,'p.1',alternatives,LATER,previous.id);
 assert.equal(replacement.placements[0]!.text.latin,latin);
 const changedQ=replacement.placements[0]!.questions.find(x=>x.kind==='morphology');
 if(!changedQ||changedQ.kind!=='morphology')throw Error('pregunta perdida');
 assert.equal(changedQ.words.length,4);
 assert.ok(!changedQ.words.some(w=>w.id===previous.id));
 const rest=changedQ.words[0]!;
 const without=removeMorphologyWord(replacement,'p.1',rest.id,LATER);
 const after=without.placements[0]!.questions.find(x=>x.kind==='morphology');
 assert.ok(after&&after.kind==='morphology');
 assert.equal(after.words.length,3);
 assert.ok(!without.placements[0]!.text.markup.some(m=>m.id===rest.markId));
});
test('no sustituye formas protegidas ni permite dos categorías iguales',()=>{
 const ed=edition(),opts=selectMorphologyForPlacement(ed,'p.1',tokens);
 const selected=applyMorphologyChoices(ed,'p.1',opts,LATER);
 const q=selected.placements[0]!.questions.find(x=>x.kind==='morphology');
 if(!q||q.kind!=='morphology')throw Error('falta');
 q.words[0]!.locked=true;
 assert.throws(()=>selectMorphologyForPlacement(selected,'p.1',tokens,q.words[0]!.id),/protegida/);
 assert.throws(()=>removeMorphologyWord(selected,'p.1',q.words[0]!.id,LATER),/protegida/);
 assert.throws(()=>applyMorphologyChoices(edition(),'p.1',
  [opts[0]!,{...opts[0]!,surface:'bonus',key:'bonus',start:7,end:12}],LATER),/categoría/);
});
test('no bloquea cuadernos anteriores sin la nueva categoría opcional',()=>{
 const ed=edition(),options=selectMorphologyForPlacement(ed,'p.1',tokens);
 const selected=applyMorphologyChoices(ed,'p.1',options,LATER);
 const old=JSON.parse(JSON.stringify(selected));
 for(const word of old.placements[0].questions.find((q:{kind:string})=>q.kind==='morphology').words)
   delete word.schoolCategory;
 const restored=validateEdition(old);
 assert.equal(restored.placements[0]!.text.latin,latin);
});
