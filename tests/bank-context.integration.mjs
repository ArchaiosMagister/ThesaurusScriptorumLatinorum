// Compilar antes de ejecutar. Se usa el mismo worker y los mismos recursos que en la PWA.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';
import { contextualBankAnalysis } from '../scripts/bank-context.js';
import { proposeCollatinusGrammar } from '../dist/modulos/cuaderno-integrado/core/collatinus-grammar.js';

const folder = new URL('../dist/modulos/cuaderno-integrado/examinator-cuadernos/collatinus/', import.meta.url);
const assets = new Map(await Promise.all(['datos', 'incluidos', 'shim', 'motor', 'worker'].map(async name => [
  name + '.js', await readFile(new URL(name + '.js', folder), 'utf8')
])));
const context = vm.createContext({ setTimeout, console, TextDecoder, TextEncoder, URL });
context.self = context;
context.importScripts = (...names) => names.forEach(name => vm.runInContext(assets.get(name), context, { filename: name }));
let receive, reply;
context.addEventListener = (_, listener) => { receive = listener; };
context.postMessage = value => { reply = value; };
context.importScripts('worker.js');

async function analyze(latin) {
  await receive({ data: { id: 1, method: 'analyze', args: { text: latin } } });
  assert.equal(reply.error, undefined);
  return contextualBankAnalysis(latin, reply.result, proposeCollatinusGrammar);
}

const find = (rows, fragment, id) => rows.find(row => row.fragment === fragment && row.tagId === 'gram.' + id);

test('concordancia posesiva y exclusión del subjuntivo homógrafo', async () => {
  for (const fragment of ['suas copias', 'Suas copias']) {
    const rows = await analyze(fragment + '.');
    const agreement = find(rows, fragment, 'pron.posesivo');
    assert.equal(agreement?.state, 'automatic');
    assert.match(agreement.evidence.join(' '), /acusativo femenino plural/);
    assert.ok(agreement.alternatives.some(reading => reading.includes('subjuntivo')));
    assert.ok(!rows.some(row => row.tagId.includes('subjuntivo')));
  }
});

test('cum conserva el análisis verbal pertinente, quod y venit mantienen sus ambigüedades', async () => {
  const rows = await analyze('Cum militibus. Cum venisset. Quod dixit. Venit.');
  assert.ok(!rows.some(row => row.tagId.startsWith('gram.cum.')));
  assert.equal(find(rows, 'venisset', 'subjuntivo')?.state, 'automatic');
  assert.equal(find(rows, 'Quod', 'pron.relativo')?.state, 'pending');
  assert.ok(!rows.some(row => ['gram.relativo', 'gram.cum.historico'].includes(row.tagId)));
  assert.equal(find(rows, 'Venit', 'verbo.presente.indicativo.activo')?.state, 'pending');
  assert.ok(find(rows, 'Venit', 'verbo.presente.indicativo.activo').alternatives.some(value => value.includes('perfecto')));
});

test('tiempo y voz de formas compuestas con sum y los límites de oración', async () => {
  const rows = await analyze('Missi erant. Profectus est. Missi. Erant.');
  assert.ok(find(rows, 'Missi erant', 'verbo.pluscuamperfecto.indicativo.pasivo'));
  assert.ok(find(rows, 'Profectus est', 'verbo.perfecto.indicativo.deponente'));
  assert.ok(!rows.some(row => row.fragment.includes('.')));
});

test('las formas no personales no demuestran por sí solas una función sintáctica', async () => {
  const rows = await analyze('Urbe capta. Amavisse dicit. Amando discit. Liber legendus. Hoc dixisse fertur.');
  assert.ok(find(rows, 'capta', 'part.perfecto.pasivo'));
  assert.equal(find(rows, 'Amavisse', 'inf.perfecto.activo')?.state, 'automatic');
  assert.ok(find(rows, 'dixisse', 'inf.perfecto.activo'));
  assert.ok(!rows.some(row => ['gram.participio', 'gram.ablativo.absoluto', 'gram.infinitivo'].includes(row.tagId)));
});

test('un ablativo separado por coma puede requerir confirmar su función', async () => {
  const rows = await analyze('Urbe capta, milites discesserunt.');
  assert.equal(find(rows, 'Urbe capta', 'ablativo.absoluto')?.state, 'pending');
});

test('pasajes de César, Cicerón y Virgilio sin falsos positivos sintácticos', async () => {
  const caesar = await analyze('Gallia est omnis divisa in partes tres, quarum unam incolunt Belgae, aliam Aquitani.');
  assert.ok(find(caesar, 'quarum', 'pron.relativo'));
  assert.ok(!caesar.some(row => row.tagId === 'gram.relativo.enlace'));
  const cicero = await analyze('Quo usque tandem abutere, Catilina, patientia nostra?');
  assert.ok(!cicero.some(row => row.tagId === 'gram.interrogativa.indirecta'));
  const virgil = await analyze('Arma virumque cano, Troiae qui primus ab oris Italiam, fato profugus, Laviniaque venit litora.');
  assert.ok(find(virgil, 'qui', 'pron.relativo'));
  assert.ok(!virgil.some(row => row.fragment === 'Arma' && row.tagId.includes('imperativo')));
});

test('al recuperar una versión anterior del latín se preservan las decisiones de esa versión', async()=>{
 const {bankReviewKey, carryBankReview, readBankReview, mergeCarriedReview}=await import('../dist/modulos/cuaderno-integrado/ui/atl-bank-review.js');
 const values=new Map();
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const old={id:'doc.audit',latin:'Gallia est clara.'};
 const current={id:old.id,latin:'Gallia est magna.'};
 const row={start:0,end:6,tagId:'gram.concordancia.nominal',evidence:[],alternatives:[],state:'pending'};
 const key='0:6:gram.concordancia.nominal';
 const before={version:2,rejected:[key],corrected:[],pending:[row]};
 const destination={version:2,rejected:[],corrected:[[key,'gram.pron.posesivo']],pending:[row]};
 assert.deepEqual(mergeCarriedReview(destination,before),destination);
 storage.setItem(await bankReviewKey(current),JSON.stringify(before));
 storage.setItem(await bankReviewKey(old),JSON.stringify(destination));
 await carryBankReview(current,old,storage);
 assert.deepEqual(readBankReview(await bankReviewKey(old),old.latin,storage),destination);
});

test('las marcas PAU compuestas y las marcas válidas no se pierden por un anclaje dudoso',async()=>{
 const {importPauMarks}=await import('../dist/modulos/examinator/atl-exam-morphology.js');
 const texto='missi sunt pacem';
 const tokens=[{i:0,w:'missi',s:0,e:5},{i:1,w:'sunt',s:6,e:10},{i:2,w:'pacem',s:11,e:16}];
 const state={texto,tokens};
 const rows=[{startUtf16:0,endUtf16:10,exact:'missi sunt'},{startUtf16:11,endUtf16:16,exact:'pacem'},{startUtf16:11,endUtf16:14,exact:'pac'}];
 const result=importPauMarks(state,rows);
 assert.deepEqual(result.marks.map(m=>m.toks),[[0,1],[2]]);
 assert.ok(result.marks.every(m=>m.manual));
 assert.deepEqual(result.missing,['pac']);
});


test('los 88 textos PAU conservan sus marcas y datos originales en el Word de Cuadernos',async()=>{
 const {createPlacement,createEdition}=await import('../dist/modulos/cuaderno-integrado/core/edition-factory.js');
 const {applyParsedTeacherDocx}=await import('../dist/modulos/cuaderno-integrado/core/docx-import-apply.js');
 const {createNotebookDocx}=await import('../dist/modulos/cuaderno-integrado/export/notebook-documents.js');
 const data=JSON.parse(await readFile(new URL('../scripts/pau-cv-seed-data.json',import.meta.url),'utf8'));
 const at='2026-11-24T00:00:00.000Z';
 function documentXml(bytes) {
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   let offset=0;
   while(offset+30<bytes.length&&view.getUint32(offset,true)===0x04034b50){
     const size=view.getUint32(offset+18,true),n=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
     const decoder=new TextDecoder();
     const path=decoder.decode(bytes.slice(offset+30,offset+30+n));
     const start=offset+30+n+extra;
     if(path==='word/document.xml')return decoder.decode(bytes.slice(start,start+size));
     offset=start+size;
   }
   assert.fail('Falta word/document.xml');
 }
 const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 let modern=0,compounds=0;
 for(const {doc} of data){
   let seq=0;
   const next=()=> 'item.'+(++seq);
   const base=createPlacement({id:'place.1',title:doc.title,latin:doc.latin,author:doc.author,work:doc.work,reference:doc.reference,source:{kind:'manual',sourceId:null,urn:null,importedAt:at}},next);
   const p=applyParsedTeacherDocx(base,doc,next);
   const edition=createEdition({id:'ed.1',legacyNotebookId:null,title:'Auditoría PAU',timestamp:at,placements:[p]});
   const xml=documentXml(createNotebookDocx(edition));
   assert.equal(p.pauCv,doc.pauCv);
   assert.deepEqual(p.text.markup.map(m=>m.exact),doc.underlines.map(m=>m.exact),doc.pauCv);
   // Inspect the actual underlined runs rather than mere occurrences in the document.
   const markedRuns=[...xml.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)].filter(m=>m[1].includes('<w:u w:val="single"/>')).map(m=>m[1]);
   for(const mark of doc.underlines){
     assert.ok(markedRuns.some(run=>run.includes('>'+escape(mark.exact)+'</w:t>')),doc.pauCv+' '+mark.exact);
     if(/\s/.test(mark.exact)) compounds++;
   }
   if(doc.preverbBases){
     modern++;
     const options=p.questions.find(q=>q.kind==='choice').options;
     for(const value of doc.preverbBases)assert.ok(xml.includes(escape(value)),doc.pauCv+' '+value);
     for(const kind of ['phonetics','prefix','latinism']){
       const expected=doc.lexical[kind];
       assert.deepEqual(options.find(o=>o.kind===kind).slots.map(s=>s.value),expected,doc.pauCv+' '+kind);
       for(const value of expected)assert.ok(xml.includes(escape(value)),doc.pauCv+' '+value);
     }
   }
 }
 assert.equal(data.length,88);
 assert.equal(modern,12);
 assert.equal(compounds,11);
});

test('etiquetado filológico PAU: catálogo real, evidencias literales y corpus validado',async()=>{
 const {prepareSeed,isPristineSeed,isVerifiedPauTag}=await import('../dist/modulos/cuaderno-integrado/ui/atl-pau-cv-seed.js');
 const {validateCorpus}=await import('../dist/modulos/cuaderno-integrado/core/validation.js');
 const {allGrammarTags}=await import('../dist/modulos/cuaderno-integrado/core/grammar-tags.js');
 const {bankTagAssignable}=await import('../dist/modulos/cuaderno-integrado/ui/atl-bank-curriculum.js');
 const data=JSON.parse(await readFile(new URL('../scripts/pau-cv-seed-data.json',import.meta.url),'utf8'));
 const empty=validateCorpus({schemaVersion:1,texts:[],tags:[],notebooks:[]});
 const catalogue=allGrammarTags(empty);
 for(const row of data)for(const [id,span] of Object.entries(row.verifiedGrammar)){
   assert.ok(catalogue.some(tag=>tag.id===id)&&bankTagAssignable(id),id);
   assert.ok(row.doc.latin.includes(span));
 }
 const result=prepareSeed(empty,[],data,validateCorpus,catalogue);
 assert.equal(result.texts.length,88);
 assert.equal(result.texts.reduce((n,t)=>n+t.tagIds.length,0),571);
 assert.ok(result.texts.every(t=>t.tagIds.length));
 assert.ok(isPristineSeed(result));
 assert.ok(result.texts.every(t=>t.tagIds.every(id=>isVerifiedPauTag(t,id))));
 const changed={...result,texts:result.texts.map((t,i)=>i?t:{...t,tagIds:[]})};
 assert.ok(!isPristineSeed(changed));
});
