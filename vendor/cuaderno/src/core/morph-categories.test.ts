import test from 'node:test';
import assert from 'node:assert/strict';
import {morphChoiceFromToken,morphTypeFromAnalysis,selectDiverseMorphology,type MorphChoice,MORPH_TYPES} from './morph-categories.js';
test('distingue siete tipos y excluye invariables y verbos sin modo',()=>{
  assert.deepEqual([
    morphTypeFromAnalysis('presente de indicativo activo','v'),
    morphTypeFromAnalysis('','p'),
    morphTypeFromAnalysis('infinitivo de presente activo','v'),
    morphTypeFromAnalysis('participio de perfecto pasivo: nominativo','v'),
    morphTypeFromAnalysis('nominativo singular','n'),
    morphTypeFromAnalysis('nominativo singular','a'),
    morphTypeFromAnalysis('','num','num. cardinal'),
  ],MORPH_TYPES);
  for(const pos of ['adv','conj','prep','i'])assert.equal(morphTypeFromAnalysis('',pos),null);
  assert.equal(morphTypeFromAnalysis('','v'),null);
  assert.equal(morphTypeFromAnalysis('V;PTCP;PERF;PASS','v'),'participio');
  assert.equal(morphTypeFromAnalysis('N;ABL;PL'),'sustantivo');
});
test('solo acepta una lectura seleccionada que pertenezca al token real',()=>{
  const latin='puellae amant.';
  const token={w:'amant',s:8,e:13,sent:0,pb:'',
    sel:{lid:7,morpho:'presente de indicativo activo'},
    cands:[{lid:7,lemma:'amo',im:'',pos:'v',morphos:['presente de indicativo activo']}]};
  assert.equal(morphChoiceFromToken(token,latin)?.category,'verbo-personal');
  assert.equal(morphChoiceFromToken({...token,e:12},latin),null);
  assert.equal(morphChoiceFromToken({...token,sel:{lid:8,morpho:'presente de indicativo activo'}},latin),null);
});
test('cuatro apariciones distintas sin repetir tipo ni palabra, con nuevas antes de usadas',()=>{
  const make=(surface:string,category:MorphChoice['category'],start:number):MorphChoice=>({
    surface,start,end:start+surface.length,key:surface,category,lemmaId:surface,analysis:'abc',source:'collatinus',
  });
  const rows=[make('rosa','sustantivo',0),make('puer','sustantivo',5),
    make('bonus','adjetivo',10),make('amat','verbo-personal',16),
    make('ille','pronombre',21),make('videre','infinitivo',26)];
  const selected=selectDiverseMorphology(rows,new Set(['rosa']),new Set(),new Map(),4);
  assert.equal(selected.length,4);
  assert.equal(new Set(selected.map(x=>x.category)).size,4);
  assert.equal(new Set(selected.map(x=>x.key)).size,4);
  assert.ok(!selected.some(x=>x.key==='rosa'));
});
test('con categorías ya ocupadas no se repiten ni se fuerzan cuatro si faltan',()=>{
  const row:MorphChoice={surface:'amat',start:0,end:4,key:'amat',category:'verbo-personal',
    lemmaId:'amo',analysis:'indicativo',source:'collatinus'};
  const two=selectDiverseMorphology([row],new Set(),new Set(['sustantivo']),new Map(),4);
  assert.equal(two.length,1);
  assert.deepEqual(selectDiverseMorphology([row],new Set(),new Set(['verbo-personal']),new Map(),4),[]);
});

test('no se reutiliza una categoría con palabra ya usada mientras haya cuatro categorías con vocablos nuevos',()=>{
  const types=['pronombre','verbo-personal','infinitivo','participio','sustantivo'] as const;
  const rows: MorphChoice[]=types.map((category,i)=>({
    surface:'forma-'+i,start:i*10,end:i*10+7,key:'forma-'+i,category,lemmaId:'lemma-'+i,
    analysis:'análisis',source:'collatinus',
  }));
  const selected=selectDiverseMorphology(rows,new Set(['forma-0']),new Set(),new Map(),4);
  assert.equal(selected.length,4);
  assert.ok(selected.every(x=>x.key!=='forma-0'),'No debe seleccionar la palabra usada');
});
