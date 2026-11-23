import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { createEdition, createPlacement } from '../core/edition-factory.js';
import { fingerprintForMark } from '../core/edition-validation.js';
import { createNotebookDocx, exportQuestionHeading, notebookExportWarnings } from './notebook-documents.js';
import { zipStore } from './zip-store.js';

const at='2026-11-15T15:00:00.000Z';
function fixture(){
  let index=0;
  const id=()=> 'item.'+(++index);
  const p=createPlacement({
    id:'place.1',title:'Los helvecios acumulan su equipaje',
    latin:'Rōma et Rōma, ăcĭes.',author:'Julio César',work:'De bello Gallico',
    reference:'I 24',
    source:{kind:'manual',sourceId:null,urn:null,importedAt:at},
  },id);
  p.text.markup.push({
    id:'mark.1',kind:'morph-underline',startUtf16:0,endUtf16:4,exact:'Rōma',
    textFingerprint:fingerprintForMark(p.text.latin,0,4),reviewRequired:false,
  });
  p.vocabulary.push({
    id:'voc.1',lemma:'acies',headword:'ăcĭes, –ēī',meaning:'línea de batalla',note:null,
    included:true,order:0,provenance:null,reviewState:'manual',origin:'manual',locked:true,
  });
  return createEdition({id:'ed.1',legacyNotebookId:null,title:'Cuaderno de César',
    timestamp:at,placements:[p]});
}
function files(bytes:Uint8Array):Map<string,string>{
  const decoder=new TextDecoder(),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const result=new Map<string,string>();let position=0;
  while(position+30<=bytes.length&&view.getUint32(position,true)===0x04034b50){
    const method=view.getUint16(position+8,true);
    assert.equal(method,0,'sin compresión externa');
    const length=view.getUint32(position+18,true);
    const nameLength=view.getUint16(position+26,true),extra=view.getUint16(position+28,true);
    const path=decoder.decode(bytes.slice(position+30,position+30+nameLength));
    const begin=position+30+nameLength+extra;
    const content=decoder.decode(bytes.slice(begin,begin+length));
    result.set(path,content);position=begin+length;
  }
  assert.equal(view.getUint32(position,true),0x02014b50,'directorio central');
  return result;
}
function validXml(text:string){
  let error='';
  const document=new DOMParser({errorHandler:{warning:()=>{},error:(m)=>{error+=m;},fatalError:(m)=>{error+=m;}}})
    .parseFromString(text,'text/xml');
  assert.equal(error,'');
  assert.ok(document.documentElement);
}
test('ZIP STORE es autónomo, acepta UTF-8 y escribe directorio central',()=>{
  const archive=zipStore([{path:'datos.xml',content:'<r>Rōma, æ, œ</r>'}]);
  const entries=files(archive);
  assert.equal(entries.get('datos.xml'),'<r>Rōma, æ, œ</r>');
  assert.equal(new DataView(archive.buffer,archive.byteOffset,4).getUint32(0,true),0x04034b50);
});
test('DOCX produce un paquete OOXML legible, con fuentes y número de páginas',()=>{
  const doc=fixture(),bytes=createNotebookDocx(doc),entries=files(bytes);
  for(const path of ['[Content_Types].xml','_rels/.rels','word/document.xml',
    'word/_rels/document.xml.rels','word/footer1.xml','word/styles.xml','word/settings.xml','docProps/core.xml']){
    assert.ok(entries.has(path),path);
    validXml(entries.get(path)!);
  }
  const xml=entries.get('word/document.xml')!;
  assert.match(xml,/Los helvecios acumulan su equipaje/);
  assert.match(xml,/De bello Gallico/);
  assert.match(xml,/Rōma/);
  assert.match(xml,/ăcĭes, –ēī/);
  assert.match(xml,/<w:t xml:space="preserve">: ‘línea de batalla’<\/w:t>/);
  assert.match(xml,/w:u w:val="single"/);
  assert.match(xml,/w:i\/>/);
  assert.match(xml,/Elige dos de estas cuatro preguntas \(2p\.\):/);
  assert.match(xml,/w:w="11906" w:h="16838"/);
  assert.match(xml,/w:footer="709"/);
  assert.match(entries.get('word/styles.xml')!,/w:line="273" w:lineRule="exact"/);
  assert.match(xml,/w:line="312" w:lineRule="exact"/);
  assert.match(xml,/w:after="60"/);
  assert.match(xml,/<w:tblW w:w="\d+" w:type="dxa"\/>/);
  assert.match(xml,/<w:tblGrid><w:gridCol w:w="\d+"\/><\/w:tblGrid>/);
  assert.match(xml,/<w:t xml:space="preserve">Vocabulario<\/w:t>/);
  assert.match(xml,/<w:pPr><w:keepNext\/><w:keepLines\/>/);
  assert.match(entries.get('word/footer1.xml')!,/NUMPAGES/);
  assert.match(entries.get('word/footer1.xml')!,/PAGE/);
  assert.equal((xml.match(/w:pageBreakBefore/g)??[]).length,0);
});
test('Word imprime prefijos generados en minúscula y respeta los manuales',()=>{
  const edition=fixture(),placement=edition.placements[0]!;
  const question=placement.questions.find(x=>x.kind==='choice');
  assert.ok(question&&question.kind==='choice');
  const prefix=question.options.find(o=>o.kind==='prefix');
  assert.ok(prefix);
  prefix.slots=[{
    id:'pref.generated',value:'antifaz',origin:'generated',locked:false,
    proposedLemmaId:null,provenance:{provider:'test',recordId:'ge.prefix.1',
      bankRevision:'fixture',decisionId:null},
  },{
    id:'pref.manual',value:'Ámbito personal',origin:'manual',locked:true,
    proposedLemmaId:null,provenance:null,
  }];
  const before=JSON.stringify(edition);
  const xml=files(createNotebookDocx(edition)).get('word/document.xml')!;
  assert.match(xml,/>antifaz</);
  assert.match(xml,/>Ámbito personal</);
  assert.doesNotMatch(xml,/>Antifaz</);
  assert.equal(JSON.stringify(edition),before);
});
test('Word conserva ligaduras y glosas separadas sin alterar el modelo',()=>{
  const edition=fixture(),p=edition.placements[0]!;
  p.vocabulary=[{
    id:'voc.oe',lemma:'poena',headword:'pœna, –æ',meaning:'pena | castigo',
    note:'f.',included:true,order:0,provenance:null,
    reviewState:'manual',origin:'manual',locked:true,glossesSeparated:true,
  },{
    id:'voc.ae',lemma:'caelum',headword:'cælum, –ī',meaning:'cielo',note:null,
    included:true,order:1,provenance:null,reviewState:'needs-review',
    origin:'generated',locked:false,collatinusSource:true,
  }];
  const before=JSON.stringify(edition);
  const xml=files(createNotebookDocx(edition)).get('word/document.xml')!;
  assert.match(xml,/pœna, –æ/);
  assert.match(xml,/cælum, –ī/);
  assert.match(xml,/‘pena’ ‘castigo’/);
  assert.equal(JSON.stringify(edition),before);
});
test('Cada texto posterior empieza en nueva página sin modificar la edición',()=>{
  const edition=fixture(),original=JSON.stringify(edition);
  edition.placements.push({...structuredClone(edition.placements[0]!),id:'place.2',
    text:{...structuredClone(edition.placements[0]!.text),title:'Segundo texto',markup:[]},
    vocabulary:[],questions:edition.placements[0]!.questions.map(q=>({...q,id:q.id+'.2'}))});
  // Los IDs de las opciones también deben ser únicos en la aparición nueva.
  const second=edition.placements[1]!;
  second.questions=second.questions.map(q=>q.kind==='choice'?{
    ...q,options:q.options.map(o=>({...o,id:o.id+'.2',slots:[]})),
  }:q);
  const contents=files(createNotebookDocx(edition)).get('word/document.xml')!;
  assert.equal((contents.match(/w:pageBreakBefore/g)??[]).length,1);
  assert.equal((contents.match(/w:pgSz/g)??[]).length,1);
  assert.equal(JSON.stringify(fixture()),original);
});
test('El número de apartados modifica solo el rótulo y nunca reajusta los puntos',()=>{
  const edition=fixture(),q=edition.placements[0]!.questions.find(q=>q.kind==='choice')!;
  assert.equal(exportQuestionHeading(q,true),'Elige dos de estas cuatro preguntas (2p.):');
  if(q.kind!=='choice')throw new Error('Plantilla inesperada');
  q.options[3]!.enabled=false;
  assert.equal(exportQuestionHeading(q,true),'Elige dos de estas tres preguntas (2p.):');
  assert.equal(q.pointsHundredths,200);
});
test('La exportación reporta observaciones académicas sin modificar ni ocultar textos',()=>{
  const edition=fixture(),snapshot=JSON.stringify(edition);
  assert.ok(notebookExportWarnings(edition).some(x=>x.includes('Faltan palabras')));
  createNotebookDocx(edition);
  assert.equal(JSON.stringify(edition),snapshot);
});

test('DOCX incluye exclusivamente preguntas: no exporta derivados-respuesta ni análisis morfológicos',()=>{
  const ed=fixture(),placement=ed.placements[0]!;
  const choice=placement.questions.find(q=>q.kind==='choice');
  const morph=placement.questions.find(q=>q.kind==='morphology');
  if(!choice||choice.kind!=='choice'||!morph||morph.kind!=='morphology')
    throw Error('Plantilla inesperada');
  const preverb=choice.options.find(o=>o.kind==='preverb')!;
  preverb.statement.value='Modificación preverbial a partir de *struo* (3) y de *cedo* (2).';
  preverb.slots=[{id:'private.preverb.answer',value:'RESPUESTA_OCULTA',proposedLemmaId:null,
    origin:'manual',locked:true,provenance:null}];
  morph.words=[{id:'private.morph.answer',markId:'mark.1',surface:'Rōma',
    lemmaId:'Roma',analysis:'ANALISIS_OCULTO',provenance:null,
    reviewState:'manual',locked:true}];
  const xml=files(createNotebookDocx(ed)).get('word/document.xml')!;
  assert.match(xml,/Modificación preverbial/);
  assert.match(xml,/struo/);
  assert.doesNotMatch(xml,/RESPUESTA_OCULTA/);
  assert.doesNotMatch(xml,/ANALISIS_OCULTO/);
  assert.match(xml,/Rōma/);
});

test('La edición Word separa Texto N de autor/obra/capítulo y respeta fuente común',()=>{
  const edition=fixture();
  edition.placements[0]!.text.title='Texto 1';
  edition.format.fontFamily='Georgia';
  const archive=files(createNotebookDocx(edition));
  const document=archive.get('word/document.xml')!;
  const parsed=new DOMParser().parseFromString(document,'text/xml');
  const paragraphs=Array.from(parsed.getElementsByTagName('w:p'));
  const paragraphText=(item:Element)=>item.textContent??'';
  const heading=paragraphs.findIndex(x=>paragraphText(x).includes('Texto 1'));
  assert.ok(heading>=0,'título editorial presente');
  assert.equal(paragraphText(paragraphs[heading]!), 'Texto 1');
  assert.match(paragraphText(paragraphs[heading+1]!),/Julio César.*De bello Gallico.*I 24/);
  assert.doesNotMatch(paragraphText(paragraphs[heading+1]!),/Texto 1/);
  assert.match(archive.get('word/styles.xml')!,/w:ascii="Georgia"/);
});


test('Word imprime […] en redonda, conservando cursiva latina y subrayados',()=>{
  const edition=fixture(),p=edition.placements[0]!;
  p.text.latin='Rōma […] et Gallia [...] bello [ … ] capta sunt.';
  // Se mantiene un subrayado de morfología real antes de la omisión.
  p.text.markup=[{id:'mark.1',kind:'morph-underline',startUtf16:0,endUtf16:4,
    exact:'Rōma',textFingerprint:fingerprintForMark(p.text.latin,0,4),reviewRequired:false}];
  const before=JSON.stringify(edition);
  const xml=files(createNotebookDocx(edition)).get('word/document.xml')!;
  assert.match(xml,/<w:r><w:t xml:space="preserve">\[…]<\/w:t><\/w:r>/);
  assert.match(xml,/<w:r><w:t xml:space="preserve">\[\.\.\.\]<\/w:t><\/w:r>/);
  assert.match(xml,/<w:r><w:t xml:space="preserve">\[ … \]<\/w:t><\/w:r>/);
  assert.match(xml,/<w:r><w:rPr><w:i\/><\/w:rPr><w:t xml:space="preserve"> et Gallia <\/w:t><\/w:r>/);
  assert.match(xml,/w:u w:val="single"/);
  assert.equal(JSON.stringify(edition),before);
});
