import assert from 'node:assert/strict';
import test from 'node:test';
import { AcademicQuestionEngineV1 } from './academic-engine.js';
import { createEdition, createPlacement } from './edition-factory.js';
import {
  importTeacherAcademicSources, teacherAuditRecord, teacherPreverbBases,
  TeacherAcademicImportError, type TeacherAcademicSourceSnapshotV1,
} from './academic-teacher-adapter.js';
import { createOfflineTeacherBankV1 } from './academic-teacher-bank.js';

const sha='a'.repeat(40);
const path={preverb:'data/modificacion-preverbial-docente.json',prefix:'data/prefijos-docente.json',
  latinism:'data/latinismos-docente.json',phonetics:'data/fonetica/banco_examenes.json',
  morphology:'data/lemmas/verified-overrides.json'};
const now='2026-11-15T19:30:00.000Z';
function fixture():TeacherAcademicSourceSnapshotV1 {
  return {
    schemaVersion:1,repo:'ArchaiosMagister/GeneradorExamenes',
    sources:{preverb:{path:path.preverb,sha},prefix:{path:path.prefix,sha},latinism:{path:path.latinism,sha},
      phonetics:{path:path.phonetics,sha},morphology:{path:path.morphology,sha}},
    preverbs:[
      {id:47,prompt:'mitto',enunciado:'mitto, -ere, misi, missum',derivatives:['admitto','remitto'],ambiguousPrompt:false},
      {id:84,prompt:'sero',enunciado:'sero, -ere, -rui, sertum',derivatives:['insero'],ambiguousPrompt:true},
    ],
    prefixes:[
      {prompt:'Antifaz',prefix:'ANTE-/ANTI- (anterioridad)',meaningHint:'delante del rostro',meaningStatus:'revisado: valor espacial de ante-'},
      {prompt:'Interdependencia',prefix:'INTER-',meaningHint:'entre',meaningStatus:'orientativo; requiere validación semántica caso por caso'},
    ],
    latinisms:[{number:1,prompt:'a posteriori',answer:'Después de examinar el asunto'}],
    phonetics:[{id:'EVF-0104',latin:'fabam',castellano:'haba',normas:['N05'],estado:'APTO_PROPUESTO',
      tipoTransmision:null,fuente:'https://example.org/ficha'}],
    morphology:[
      {lemma:'dux',form:'dux',tags:'N;NOM;SG',reference:'https://example.org/dux',note:null},
      {lemma:'dux',form:'dux',tags:'N;VOC;SG',reference:'https://example.org/dux',note:null},
    ],
  };
}
function edition(){
  let id=0;
  const placement=createPlacement({id:'p1',title:'César',latin:'dux ex castris advenit.',author:'César',work:'Bellum Gallicum',
    reference:'I 1',source:{kind:'manual',sourceId:null,urn:null,importedAt:now}},()=>`test.${++id}`);
  const book=createEdition({id:'edition1',legacyNotebookId:null,title:'Cuaderno',timestamp:now,placements:[placement]});
  const q=book.placements[0]!.questions.find(q=>q.kind==='choice');
  if(!q||q.kind!=='choice')throw Error('Pregunta 4 ausente');
  q.options[0]!.slots=[{id:'slot.preverb',value:'abduco',origin:'manual',locked:false,proposedLemmaId:null,provenance:null}];
  q.options[3]!.slots=[{id:'slot.latinism',value:'ad hoc',origin:'manual',locked:false,proposedLemmaId:null,provenance:null}];
  return {book,q};
}
test('elegibilidad docente: derivados atestiguados y latinismos son utilizables como enunciados',()=>{
  const result=importTeacherAcademicSources(fixture());
  const bank=result.bank;
  assert.equal(bank.count,9);
  assert.deepEqual(bank.verified('preverb','mitto').map(x=>x.value),['admitto','remitto']);
  assert.equal(bank.verified('preverb','sero').length,0);
  assert.deepEqual(bank.verified('preverb','sero, -ere, -rui, sertum').map(x=>x.value),['insero']);
  assert.deepEqual(bank.verified('latinism').map(x=>x.value),['a posteriori']);
  assert.equal(result.pendingByKind.preverb,0);
  assert.equal(bank.manifest.revision.includes(sha.slice(0,12)),true);
});
test('fichas aptas y prefijos de significado orientativo se sortean con sus reservas visibles',()=>{
  const r=importTeacherAcademicSources(fixture());
  assert.deepEqual(r.bank.verified('phonetics').map(x=>x.value),['fabam']);
  assert.deepEqual(r.bank.verified('phonetics',null,['N05']).map(x=>x.value),['fabam']);
  assert.equal(r.bank.verified('phonetics',null,['N07']).length,0);
  assert.equal(r.bank.verified('phonetics',null,[]).length,0);
  assert.deepEqual(r.bank.verified('prefix').map(x=>x.value),['Antifaz','Interdependencia']);
  const record=teacherAuditRecord(r,'ge.phonetics.EVF-0104');
  assert.equal(record?.status,'verified');
  assert.equal(record?.teacherEligible,true);
  assert.equal(record?.individuallyExternallyVerified,false);
  assert.deepEqual(record?.phoneticRules,['N05']);
  assert.equal(record?.sourceReference,'https://example.org/ficha');
  assert.equal(record?.meaning,'haba');
  const prefix=teacherAuditRecord(r,'ge.prefix.2');
  assert.equal(prefix?.semanticReviewRequired,true);
  assert.equal(prefix?.teacherEligible,true);
  assert.equal(prefix?.individuallyExternallyVerified,false);
  assert.match(prefix?.note??'',/orientativo/);
  const morphology=teacherAuditRecord(r,'ge.morphology.1');
  assert.equal(morphology?.individuallyExternallyVerified,true);
});
test('formas con dos lecturas individuales mantienen dos candidatos verificados pero nunca uno preferido',()=>{
  const r=importTeacherAcademicSources(fixture());
  assert.equal(r.bank.verified('morphology','dux').length,2);
  assert.notEqual(r.bank.verified('morphology','dux')[0]?.analysis,r.bank.verified('morphology','dux')[1]?.analysis);
  assert.equal(r.bank.verified('morphology','duces').length,0);
  const bases=teacherPreverbBases(fixture());
  assert.equal(bases[1]?.requiresDisambiguation,true);
  assert.equal(bases[1]?.selectionKey,'sero, -ere, -rui, sertum');
});
test('motor real con lista docente restringe candidatos por base, apartado y estado',()=>{
  const r=importTeacherAcademicSources(fixture());
  const engine=new AcademicQuestionEngineV1(r.bank);
  const {book,q}=edition();
  const preverb=q.options[0]!;
  const preview=engine.previewSlot(book,{placementId:'p1',questionId:q.id,optionId:preverb.id,
    slotId:preverb.slots[0]!.id,sourceForm:'mitto',expectedRevision:0});
  // La fuente aporta dos candidatos verificados, pero la entrada manual del
  // cuaderno no se sustituye sin autorización expresa.
  assert.equal(preview.status,'locked');
  assert.equal(preview.candidates.length,2);
  assert.equal(engine.previewSlot(book,{placementId:'p1',questionId:q.id,optionId:preverb.id,
    slotId:preverb.slots[0]!.id,sourceForm:'sero',expectedRevision:0}).status,'no-candidates');
  assert.equal(engine.previewSlot(book,{placementId:'p1',questionId:q.id,optionId:preverb.id,
    slotId:preverb.slots[0]!.id,sourceForm:'sero, -ere, -rui, sertum',expectedRevision:0}).status,'locked');
  const anotherSlot=q.options[3]!.slots[0]!;
  assert.equal(engine.previewSlot(book,{placementId:'p1',questionId:q.id,optionId:q.options[3]!.id,
    slotId:anotherSlot.id,expectedRevision:0}).candidates.length,1);
});
test('casos desconocidos, duplicados o revisión de fuente inválida se rechazan antes de publicar banco',()=>{
  const s=fixture();
  assert.throws(()=>importTeacherAcademicSources({...s,sources:{...s.sources,
    preverb:{path:'otra-ruta.json',sha}}}),TeacherAcademicImportError);
  assert.throws(()=>importTeacherAcademicSources({...s,preverbs:[...s.preverbs,s.preverbs[0]!]}),/Duplicado/);
  assert.throws(()=>importTeacherAcademicSources({...s,phonetics:[{...s.phonetics[0]!,normas:['N99']}]}),/Normas fuera/);
  assert.throws(()=>importTeacherAcademicSources({...s,morphology:[{...s.morphology[0]!,reference:'fuente sin URL'}]}),/HTTPs/);
});
test('el snapshot completo de GeneradorExamenes tiene el inventario revisado y está disponible offline',()=>{
  const r=createOfflineTeacherBankV1();
  const stats={preverb:r.bank.statusCounts('preverb'),phonetics:r.bank.statusCounts('phonetics'),
    prefix:r.bank.statusCounts('prefix'),latinism:r.bank.statusCounts('latinism'),
    morphology:r.bank.statusCounts('morphology')};
  assert.deepEqual(stats.preverb,{verified:882,needsReview:0,rejected:0});
  assert.deepEqual(stats.phonetics,{verified:655,needsReview:0,rejected:0});
  assert.deepEqual(stats.prefix,{verified:286,needsReview:0,rejected:0});
  assert.deepEqual(stats.latinism,{verified:87,needsReview:0,rejected:0});
  assert.deepEqual(stats.morphology,{verified:55,needsReview:0,rejected:0});
  assert.equal(r.bank.count,1965);
  assert.equal(r.bank.verified('morphology','dux').length,2);
  assert.equal(r.bank.verified('preverb','mitto').some(x=>x.value==='remitto'),true);
  assert.equal(r.bank.verified('phonetics').length,655);
  assert.equal(r.bank.verified('phonetics',null,['N05']).some(x=>x.value==='fabam'),true);
  assert.equal(r.bank.verified('prefix').some(x=>x.value==='Interdependencia'),true);
  assert.equal(r.bank.verified('preverb','sero').length,0);
  assert.equal(r.bank.verified('preverb','sero, -ere, -rui, sertum').length,6);
});


test('las decisiones de exclusión siguen prevaleciendo sobre un estado APTO_PROPUESTO',()=>{
  const example=fixture().phonetics[0]!;
  const x=importTeacherAcademicSources({...fixture(),phonetics:[
    {...example,latin:'chœrilum',id:'EVF-5000'},
    {...example,id:'EVF-5001',estado:'REVISAR'},
    {...example,id:'EVF-5002',estado:'EXCLUIDA'},
  ]});
  assert.equal(x.bank.verified('phonetics').length,0);
  assert.deepEqual(x.bank.statusCounts('phonetics'),{verified:0,needsReview:1,rejected:2});
  assert.equal(teacherAuditRecord(x,'ge.phonetics.EVF-5000')?.teacherEligible,false);
  assert.throws(()=>importTeacherAcademicSources({...fixture(),phonetics:[
    {...example,normas:['N05','N05']},
  ]}),/repetidas/);
  assert.throws(()=>x.bank.verified('phonetics',null,['N99']),/Filtro/);
});

test('las bases homónimas se diferencian por enunciado completo sin bloquear compuestos admitidos',()=>{
  const s=fixture();
  const data={...s,preverbs:[...s.preverbs,
    {id:85,prompt:'sero',enunciado:'sero, -ere, sevi, satum',derivatives:['obsero'],ambiguousPrompt:true},
    {id:118,prompt:'volo',enunciado:'volo, -are, -avi, -atum',derivatives:['advolo'],ambiguousPrompt:true},
    {id:119,prompt:'volo',enunciado:'volo, velle, volui',derivatives:['malo'],ambiguousPrompt:true},
  ]};
  const report=importTeacherAcademicSources(data);
  assert.equal(report.bank.verified('preverb','sero').length,0);
  assert.deepEqual(report.bank.verified('preverb','sero, -ere, -rui, sertum').map(x=>x.value),['insero']);
  assert.deepEqual(report.bank.verified('preverb','sero, -ere, sevi, satum').map(x=>x.value),['obsero']);
  assert.deepEqual(report.bank.verified('preverb','volo, -are, -avi, -atum').map(x=>x.value),['advolo']);
  assert.deepEqual(report.bank.verified('preverb','volo, velle, volui').map(x=>x.value),['malo']);
  assert.equal(report.pendingByKind.preverb,0);
});
