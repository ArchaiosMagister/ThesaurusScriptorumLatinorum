import test from 'node:test';
import assert from 'node:assert/strict';
import { createEdition,createPlacement } from './edition-factory.js';
import { VerifiedAcademicBankV1 } from './academic-bank.js';
import { suggestVocabulary,acceptVocabulary } from './vocabulary-suggestions.js';

const at='2026-11-15T14:00:00.000Z';
function fixture(){
  let seq=0;
  const p=createPlacement({id:'place.1',title:'Texto',latin:'Arate arate ignota arate.',
    author:null,work:null,reference:null,
    source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},()=> 'item.'+(++seq));
  return createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno',timestamp:at,placements:[p]});
}
const evidence={provider:'test:source',recordId:'lemma.1',bankRevision:'v1',decisionId:null};
function bank(){
  return new VerifiedAcademicBankV1({id:'testbank',revision:'v1',
    sourceName:'Prueba aislada',verifiedBy:'fixture'},[{
      id:'morph.1',kind:'morphology',value:'arate',surface:'arate',lemmaId:'aro',
      analysis:'V;IMP;ACT;PRS;2;PL',sourceForm:null,courses:['latin-ii'],
      status:'verified',evidence,
    }]);
}
test('La propuesta distingue forma repetida, lema evidenciado y forma desconocida',()=>{
  const edition=fixture(),p=edition.placements[0]!;
  const before=JSON.stringify(edition);
  const items=suggestVocabulary(p,bank());
  assert.equal(items.length,2);
  const aro=items.find(x=>x.surface.toLowerCase()==='arate')!;
  assert.equal(aro.occurrences,3);
  assert.equal(aro.lemma,'aro');
  assert.equal(aro.status,'lemma-documented');
  assert.equal(aro.selected,true);
  const unknown=items.find(x=>x.surface==='ignota')!;
  assert.equal(unknown.status,'unresolved');
  assert.equal(unknown.lemma,null);
  assert.equal(unknown.selected,false);
  assert.equal(JSON.stringify(edition),before);
});
test('Aceptar propuestas es explícito y conserva las entradas manuales preexistentes',()=>{
  const edition=fixture(),p=edition.placements[0]!;
  p.vocabulary.push({id:'voc.old',lemma:'liber',headword:'liber, libri',
    meaning:'libro',note:null,order:0,included:true,reviewState:'manual',
    origin:'manual',locked:true,provenance:null});
  const source=suggestVocabulary(p,bank());
  const decisions=source.map(x=>({surface:x.surface,selected:x.surface==='ignota',
    headword:x.surface==='ignota'?'ignotus, -a, -um':x.lemma??x.surface,
    meaning:x.surface==='ignota'?'desconocido':''}));
  let seq=0;
  const next=acceptVocabulary(edition,p.id,source,decisions,()=> 'voc.new.'+(++seq),at);
  assert.equal(next.placements[0]!.vocabulary.length,2);
  assert.deepEqual(next.placements[0]!.vocabulary[0],p.vocabulary[0]);
  assert.equal(next.placements[0]!.vocabulary[1]!.headword,'ignotus, -a, -um');
  assert.equal(next.placements[0]!.vocabulary[1]!.reviewState,'manual');
  assert.equal(edition.placements[0]!.vocabulary.length,1);
});
test('No se inventan significados ni se marca como verificada una propuesta',()=>{
  const edition=fixture(),p=edition.placements[0]!;
  const source=suggestVocabulary(p,bank());
  const decisions=source.map(x=>({surface:x.surface,selected:x.status==='lemma-documented',
    headword:x.lemma??x.surface,meaning:''}));
  const after=acceptVocabulary(edition,p.id,source,decisions,()=> 'voc.generated',at);
  const created=after.placements[0]!.vocabulary[0]!;
  assert.equal(created.lemma,'aro');assert.equal(created.meaning,null);
  assert.equal(created.origin,'generated');assert.equal(created.reviewState,'needs-review');
  assert.ok(created.provenance);
  assert.equal(suggestVocabulary(after.placements[0]!,bank()).length,1);
});
test('La aceptación rechaza duplicaciones y no muta el original',()=>{
  const e=fixture(),source=suggestVocabulary(e.placements[0]!,bank()),before=JSON.stringify(e);
  assert.throws(()=>acceptVocabulary(e,'place.1',source,[
    {surface:'Arate',selected:true,headword:'aro',meaning:''},
    {surface:'arate',selected:true,headword:'aro',meaning:''},
  ],()=> 'voc.x',at),/duplicada/);
  assert.equal(JSON.stringify(e),before);
});


test('Una forma desconocida aceptada sin significado permanece pendiente',()=>{
  const e=fixture(),candidates=suggestVocabulary(e.placements[0]!,bank());
  const choices=candidates.map(x=>({surface:x.surface,selected:x.surface==='ignota',
    headword:x.lemma??x.surface,meaning:''}));
  const next=acceptVocabulary(e,'place.1',candidates,choices,()=> 'voc.pending',at);
  const entry=next.placements[0]!.vocabulary[0]!;
  assert.equal(entry.headword,'ignota');
  assert.equal(entry.meaning,null);
  assert.equal(entry.reviewState,'needs-review');
  assert.equal(entry.origin,'generated');
  assert.equal(entry.provenance,null);
});
