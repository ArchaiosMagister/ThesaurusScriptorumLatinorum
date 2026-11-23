import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyCorpus} from './model.js';
import {createEdition,createPlacement} from './edition-factory.js';
import {fingerprintForMark,validateEdition} from './edition-validation.js';
import {editPlacementText} from './edition-operations.js';
import {summarizeNotebook} from './notebook-overview.js';

const time='2026-11-17T13:00:00.000Z';
const latin='Caesar Galliam vicit, cum milites secum duceret.';
function fixture(){
  let n=0;
  const placement=createPlacement({id:'p.1',title:'Texto',
    latin,author:'César',work:null,reference:null,
    source:{kind:'manual',sourceId:null,urn:null,importedAt:time}},
    ()=>'q.'+(++n));
  return createEdition({id:'ed.spans',legacyNotebookId:null,title:'Cuaderno',
    timestamp:time,placements:[placement]});
}
test('las ediciones históricas V1 conservan exactamente su forma JSON sin el campo opcional',()=>{
  const e=fixture();
  assert.deepEqual(validateEdition(e),e);
  assert.ok(!('grammaticalSpans' in e.placements[0]!));
});
test('fragmento anclado se valida y cuenta en la categoría padre',()=>{
  const e=fixture();
  const start=latin.indexOf('cum milites'),end=start+'cum milites secum duceret'.length;
  const annotated=validateEdition({...e,placements:[{...e.placements[0]!,
    grammaticalSpans:[{id:'span.1',startUtf16:start,endUtf16:end,
      exact:latin.slice(start,end),textFingerprint:fingerprintForMark(latin,start,end),
      tagIds:['gram.cum.historico'],reviewRequired:false}]}]});
  const counts=summarizeNotebook(annotated,emptyCorpus());
  assert.equal(counts.withoutTags,0);
  assert.equal(counts.counts.find(x=>x.id==='gram.cum.historico')?.count,1);
  assert.equal(counts.counts.find(x=>x.id==='gram.oracion')?.count,1);
  const altered=editPlacementText(annotated,'p.1','latin',latin.replace('milites','equites'),time);
  assert.equal(altered.placements[0]!.grammaticalSpans![0]!.reviewRequired,true);
  assert.equal(altered.placements[0]!.grammaticalSpans![0]!.exact,latin.slice(start,end));
  const shortened=editPlacementText(annotated,'p.1','latin','Caesar',time);
  assert.equal(shortened.placements[0]!.grammaticalSpans![0]!.reviewRequired,true);
  assert.equal(summarizeNotebook(shortened,emptyCorpus()).withoutTags,1);
  const prefix='Æneas · ';
  const moved=editPlacementText(annotated,'p.1','latin',prefix+latin,time);
  assert.equal(moved.placements[0]!.grammaticalSpans![0]!.startUtf16,start+prefix.length);
  assert.equal(moved.placements[0]!.grammaticalSpans![0]!.reviewRequired,false);
  const repeated=editPlacementText(annotated,'p.1','latin',prefix+latin+' '+latin,time);
  assert.equal(repeated.placements[0]!.grammaticalSpans![0]!.reviewRequired,true);
  assert.deepEqual(validateEdition(annotated),annotated);
});
test('se rechaza anclaje falso sin revisión y etiquetas duplicadas',()=>{
  const e=fixture();
  const span={id:'span.1',startUtf16:0,endUtf16:6,exact:'Cicero',
    textFingerprint:fingerprintForMark(latin,0,6),tagIds:['gram.oracion'],reviewRequired:false};
  assert.throws(()=>validateEdition({...e,placements:[{...e.placements[0]!,
    grammaticalSpans:[span]}]}),/desanclado/);
  assert.throws(()=>validateEdition({...e,placements:[{...e.placements[0]!,
    grammaticalSpans:[{...span,exact:'Caesar',tagIds:['gram.oracion','gram.oracion']}]}]}),/repetir/);
});

test('una decisión de Collatinus conserva las coordenadas verificables tras editar el pasaje',()=>{
  const e=fixture();
  const decision={kind:'reading',lid:15,morpho:'lectura docente',startUtf16:0,endUtf16:6,
    exact:'Caesar',textFingerprint:fingerprintForMark(latin,0,6),reviewRequired:false};
  const annotated=validateEdition({...e,placements:[{...e.placements[0]!,grammarReview:[decision]}]});
  const moved=editPlacementText(annotated,'p.1','latin','Æneas. '+latin,time);
  assert.equal(moved.placements[0]!.grammarReview![0]!.startUtf16,7);
  assert.equal(moved.placements[0]!.grammarReview![0]!.reviewRequired,false);
  const changed=editPlacementText(moved,'p.1','latin',latin.replace('Caesar','Cicero'),time);
  assert.equal(changed.placements[0]!.grammarReview![0]!.reviewRequired,true);
});
