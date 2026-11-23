import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyCorpus} from './model.js';
import {createEdition,createPlacement} from './edition-factory.js';
import {summarizeNotebook} from './notebook-overview.js';

const NOW='2026-11-17T09:00:00.000Z';
test('recuento único: dos apariciones de una fuente no suman dos por etiqueta',()=>{
  let sequence=0;
  const make=(id:string,sourceId:string,tags:string[])=>createPlacement({
    id,title:'Pasaje latino',latin:'Gallia est omnis divisa.',author:'César',work:'BG',
    reference:'I 1',grammaticalTagIds:tags,
    source:{kind:'corpus',sourceId,urn:null,importedAt:NOW},
  },()=> 'it.'+(++sequence));
  const a=make('place.1','source.1',['gram.ut.final']);
  const b=make('place.2','source.1',['gram.ut.final']);
  const c=make('place.3','source.2',[]);
  const e=createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno',
    timestamp:NOW,placements:[a,b,c]});
  const res=summarizeNotebook(e,emptyCorpus());
  assert.equal(res.total,3);
  assert.equal(res.distinctTexts,2);
  assert.equal(res.withoutTags,1);
  assert.equal(res.counts.find(x=>x.id==='gram.ut.final')?.count,1);
  assert.equal(res.counts.find(x=>x.id==='gram.ut')?.count,1);
  assert.equal(res.counts.find(x=>x.id==='gram.oracion')?.count,1);
});
test('fuentes distintas con la misma construcción sí cuentan por separado',()=>{
  let sequence=0;
  const placements=['source.1','source.2'].map((sourceId,index)=>createPlacement({
    id:'place.'+(index+1),title:'Texto',latin:'Arma virumque cano.',
    author:null,work:null,reference:null,grammaticalTagIds:['gram.ablativo.absoluto'],
    source:{kind:'corpus',sourceId,urn:null,importedAt:NOW},
  },()=> 'item.'+(++sequence)));
  const e=createEdition({id:'ed.2',legacyNotebookId:null,title:'Cuaderno',
    timestamp:NOW,placements});
  assert.equal(summarizeNotebook(e,emptyCorpus()).counts
    .find(x=>x.id==='gram.ablativo.absoluto')?.count,2);
});
