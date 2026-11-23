import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {parseTeacherDocumentXml,type ParsedTeacherDocx} from './docx-import.js';
import {applyParsedTeacherDocx} from './docx-import-apply.js';
import {createEdition,createPlacement} from './edition-factory.js';
import {validateEdition} from './edition-validation.js';

const escape=(value:string)=>value.replace(/&/gu,'&amp;').replace(/</gu,'&lt;')
  .replace(/>/gu,'&gt;');
function p(segments:readonly (string|{text:string;underline?:boolean;italic?:boolean})[]):string{
  return '<w:p>'+segments.map(segment=>{
    const s=typeof segment==='string'?{text:segment}:segment;
    return '<w:r>'+(s.underline?'<w:rPr><w:u w:val="single"/></w:rPr>':
      s.italic?'<w:rPr><w:i/></w:rPr>':'')+
      '<w:t xml:space="preserve">'+escape(s.text)+'</w:t></w:r>';
  }).join('')+'</w:p>';
}
function word(paragraphs:string[]):string {
  return '<?xml version="1.0" encoding="UTF-8"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:body>'+paragraphs.join('')+'</w:body></w:document>';
}
const parse=(xml:string)=>new DOMParser().parseFromString(xml,'application/xml') as unknown as Document;
let seq=0;
const id=()=> 'item.'+(++seq);
function base(doc:ParsedTeacherDocx) {
  const time='2026-11-18T09:00:00.000Z';
  const placement=createPlacement({
    id:'place.1',source:{kind:'manual',sourceId:null,urn:null,importedAt:time},
    title:doc.title,latin:doc.latin,author:doc.author,
    work:doc.work,reference:doc.reference,
  },id);
  const e=createEdition({id:'ed.1',legacyNotebookId:null,title:'Prueba DOCX',
    timestamp:time,placements:[applyParsedTeacherDocx(placement,doc,id)]});
  return validateEdition(e).placements[0]!;
}
test('Eutropio: título/cita, cuatro subrayados, vocabulario real y A-D no son preguntas',()=>{
  const xml=word([
    p(['Texto de repaso   Latín II']),p(['Nombre y apellidos: Fecha:']),
    p(['Los romanos envían legados a Ptolomeo prometiéndole ayuda']),
    p(['Eutropio, ',{text:'Breviarium',italic:true},' III 1']),
    p(['Finito igitur Punico bello, quod per XXIII annos ',
      {text:'tractum est',underline:true},', Romani, iam ',{text:'clarissima',underline:true},
      ' gloria ',{text:'noti',underline:true},', legatos ad Ptolomæum miserunt auxilia ',
      {text:'ei',underline:true},'.']),
    p(['Vocabulario']),
    p(['Ægyptus, −ī: ‘Egipto’']),p(['grātĭās ăgĕre: “dar las gracias”']),
    p(['Traducción del texto. (4p.)']),
    p(['Análisis sintáctico del texto.']),p(['Análisis morfológico de las palabras subrayadas.']),
    p(['Elige dos de estas tres preguntas']),
    p(['Modificación preverbial a partir de A (3) y de B (2).']),
    p(['Evolución fonética de A, B, C y D.']),
    p(['Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.']),
  ]);
  const doc=parseTeacherDocumentXml(xml,parse);
  assert.equal(doc.title,'Los romanos envían legados a Ptolomeo prometiéndole ayuda');
  assert.deepEqual([doc.author,doc.work,doc.reference],['Eutropio','Breviarium','III 1']);
  assert.deepEqual(doc.underlines.map(x=>x.exact),['tractum est','clarissima','noti','ei']);
  assert.equal(doc.vocabulary.length,2);
  assert.deepEqual(doc.lexical.phonetics,[]);
  assert.deepEqual(doc.lexical.prefix,[]);
  assert.equal(doc.preverbBases,null);
  const x=base(doc);
  assert.equal(x.text.markup.length,4);
  assert.equal(x.questions.find(q=>q.kind==='morphology')?.kind,'morphology');
  const choice=x.questions.find(q=>q.kind==='choice');
  assert.ok(choice&&choice.kind==='choice');
  assert.equal(choice.options.length,4);
  assert.ok(choice.options.every(o=>o.enabled));
  assert.equal(choice.options.find(o=>o.kind==='latinism')?.statement.value,'Latinismos.');
  assert.equal(choice.options.find(o=>o.kind==='phonetics')?.slots.length,0);
  assert.equal(x.vocabulary.length,2);
});
test('Cicerón: términos reales se protegen y no se sustituyen por placeholders',()=>{
  const doc=parseTeacherDocumentXml(word([
    p(['Texto de repaso Latín II']),p(['Nombre y apellidos: Fecha:']),
    p(['Pontino y Flaco apaciguan la lucha y se apresa a los pretores']),
    p(['Cicerón, ',{text:'In Catilinam',italic:true},' III 6']),
    p(['Res prætoribus erat nota solis, ignorabatur a ceteris.']),
    p(['Vocabulario']),p(['Flaccus, –ī: ‘Flaco’']),
    p(['Traducción del texto. (4p.)']),p(['Análisis sintáctico']),p(['Análisis morfológico']),
    p(['Elige dos de estas tres preguntas']),
    p(['Modificación preverbial a partir de A (3) y de B (2).']),
    p(['Evolución fonética de cabannam, post, somnum, distinctum.']),
    p(['Señala el prefijo y el significado que aporta a estas palabras: depauperar, perjurio, reelegir, trasfondo.']),
  ]),parse);
  assert.deepEqual(doc.lexical.phonetics,['cabannam','post','somnum','distinctum']);
  assert.deepEqual(doc.lexical.prefix,['depauperar','perjurio','reelegir','trasfondo']);
  const x=base(doc);
  const choice=x.questions.find(q=>q.kind==='choice');
  assert.ok(choice&&choice.kind==='choice');
  assert.equal(choice.options.find(o=>o.kind==='phonetics')?.slots[0]?.locked,true);
  assert.equal(choice.options.find(o=>o.kind==='prefix')?.slots[3]?.value,'trasfondo');
});
test('César: bases reales se conservan dentro del enunciado de nuestra app',()=>{
  const doc=parseTeacherDocumentXml(word([
    p(['Texto de repaso Latín II']),p(['Nombre y apellidos: Fecha:']),
    p(['Los marselleses y los álbicos se alían contra César']),
    p(['Julio César, ',{text:'De bello civili',italic:true},' I 37']),
    p(['Quibus mandatis ',{text:'acceptis',underline:true},' Massilienses portas Cæsari clauserant.']),
    p(['Vocabulario']),p(['in fide esse: “ser de confianza” (+ gen.)']),
    p(['Traducción del texto.']),p(['Análisis sintáctico']),p(['Análisis morfológico']),
    p(['Elige dos de estas tres preguntas']),
    p(['Modificación preverbial a partir de instituerant (3) y de reficiebant (2).']),
    p(['Evolución fonética de A, B, C y D.']),
    p(['Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.']),
  ]),parse);
  assert.deepEqual(doc.preverbBases,['instituerant','reficiebant']);
  const x=base(doc);
  const choice=x.questions.find(q=>q.kind==='choice');
  assert.ok(choice&&choice.kind==='choice');
  const statement=choice.options.find(o=>o.kind==='preverb')!.statement;
  assert.match(statement.value,/\*instituerant\* \(3\) y de \*reficiebant\* \(2\)/u);
  assert.equal(statement.origin,'manual');
  assert.equal(statement.locked,true);
  assert.equal(x.vocabulary[0]?.note,'+ gen.');
});
test('Salustio y Nepote: vocabulario relleno A-D se descarta, subrayados y cita se conservan',()=>{
  for(const [title,ref,under] of ([
    ['Se encuentra el cuerpo de Catilina, aún con vida','LXI 4–5','repertus est'],
    ['Quieren asesinar a Alcibíades','10','sequi'],
  ] as const)){
    const doc=parseTeacherDocumentXml(word([
      p(['Texto de repaso Latín II']),p(['Nombre y apellidos: Fecha:']),
      p([title]),p(['Salustio, ',{text:'Bellum Catilinæ',italic:true},' '+ref]),
      p(['Catilina vero longe a suis inter hostium cadavera ',{text:under,underline:true},' et fugit.']),
      p(['Vocabulario']),p(['A']),p(['B']),p(['C']),p(['D']),
      p(['Traducción del texto.']),p(['Análisis sintáctico']),p(['Análisis morfológico']),
      p(['Elige dos de estas tres preguntas']),
      p(['Modificación preverbial a partir de A (3) y de B (2).']),
      p(['Evolución fonética de A, B, C y D.']),
      p(['Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.']),
    ]),parse);
    assert.equal(doc.vocabulary.length,0);
    assert.equal(doc.underlines[0]?.exact,under);
    assert.equal(doc.reference,ref);
    assert.ok(doc.warnings.some(x=>x.includes('vocabulario contiene letras')));
  }
});
