import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createEdition,createPlacement} from './edition-factory.js';
import {validateEdition} from './edition-validation.js';
import {editVocabulary} from './edition-operations.js';

const at='2026-11-19T00:00:00.000Z';
test('V1 histórico sigue válido; las opciones nuevas se conservan tras validar',()=>{
  let seq=0;
  const p=createPlacement({id:'place.vocab',title:'Ejemplo',latin:'Pœna cælum.',
    author:null,work:null,reference:null,
    source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},()=> 'item.'+(++seq));
  p.vocabulary.push({id:'voc.1',lemma:'poena',headword:'pœna, –æ',
    meaning:'pena | castigo',note:null,included:true,order:0,
    provenance:null,reviewState:'needs-review',origin:'generated',locked:false});
  const e=createEdition({id:'ed.vocab',legacyNotebookId:null,title:'Prueba',timestamp:at,placements:[p]});
  const historical=validateEdition(e);
  assert.equal(historical.placements[0]?.vocabularySelectionMode,undefined);
  assert.equal(historical.placements[0]?.vocabulary[0]?.glossesSeparated,undefined);
  e.placements[0]!.vocabulary[0]!.glossesSeparated=true;
  e.placements[0]!.vocabulary[0]!.collatinusSource=true;
  e.placements[0]!.vocabularySelectionMode='todo';
  e.placements[0]!.vocabularyQuantityMode='ninguna';
  const extended=validateEdition(e);
  assert.equal(extended.placements[0]?.vocabulary[0]?.glossesSeparated,true);
  assert.equal(extended.placements[0]?.vocabulary[0]?.collatinusSource,true);
  assert.equal(extended.placements[0]?.vocabularyQuantityMode,'ninguna');
  const checked=editVocabulary(extended,'place.vocab','voc.1','included',false,at);
  assert.equal(checked.placements[0]?.vocabulary[0]?.origin,'generated');
  assert.equal(checked.placements[0]?.vocabulary[0]?.locked,false);
  assert.equal(checked.placements[0]?.vocabulary[0]?.included,false);
  assert.throws(()=>validateEdition({...e,placements:[{...e.placements[0],vocabularyQuantityMode:'invalido'}]}));
});
