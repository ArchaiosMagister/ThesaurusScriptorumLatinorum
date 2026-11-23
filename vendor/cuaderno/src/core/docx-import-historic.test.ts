import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {parseTeacherDocumentXml} from './docx-import.js';

const escape=(s:string)=>s.replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;');
const p=(s:string)=>'<w:p><w:r><w:t xml:space="preserve">'+escape(s)+'</w:t></w:r></w:p>';
function historicalDocx(source:string,latin='Quibus rebus cognitis ad urbem contenderunt.'):string{
  // Estructura real de los ocho Word históricos: cabecera, título, cita,
  // un solo párrafo latino, «Vocabulario», marcador A y preguntas.
  return '<?xml version="1.0" encoding="UTF-8"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    [
      p('Texto de repaso Latín II'),p('Nombre y apellidos: Fecha:'),
      p('Pasaje para comentar'),p(source),p(latin),p('Vocabulario'),p('A'),
      p('Traducción del texto. (4p.)'),p('Análisis sintáctico del texto. (1p.)'),
      p('Análisis morfológico de las palabras subrayadas. (1p.)'),
      p('Elige dos de estas tres preguntas (2p.):'),
      p('Modificación preverbial a partir de A (3) y de B (2).'),
      p('Evolución fonética de A, B, C y D.'),
      p('Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.'),
    ].join('')+'</w:body></w:document>';
}
const parse=(xml:string)=>new DOMParser().parseFromString(xml,'application/xml') as unknown as Document;

for(const [file,source,author,work,reference] of [
  ['antiguo examen 1a ev.docx','Eutropio, Breviarium VII 2','Eutropio','Breviarium','VII 2'],
  ['antiguo examen b 1a ev.docx','Julio César, De bello Gallico V 22','Julio César','De bello Gallico','V 22'],
  ['cesar.docx','Julio César, De bello civili I 18','Julio César','De bello civili','I 18'],
  ['eutrop.docx','Eutropio, Breviarium III','Eutropio','Breviarium','III'],
  ['eutropio2.docx','Eutropio, Breviarium VI 23 (bis)','Eutropio','Breviarium','VI 23 (bis)'],
  ['nepote adaptado.docx','Adaptado de Cornelio Nepote, Milcíades III','Cornelio Nepote','Milcíades','III'],
  ['nepote otro.docx','Cornelio Nepote, Milcíades III','Cornelio Nepote','Milcíades','III'],
] as const){
  test('Word histórico '+file+': cita reconocida y texto conservado',()=>{
    const doc=parseTeacherDocumentXml(historicalDocx(source),parse);
    assert.deepEqual([doc.author,doc.work,doc.reference],[author,work,reference]);
    assert.equal(doc.latin,'Quibus rebus cognitis ad urbem contenderunt.');
    assert.equal(doc.vocabulary.length,0);
    assert.ok(doc.warnings.some(s=>s.includes('No se detectaron subrayados')));
    if(file.includes('adaptado'))
      assert.ok(doc.warnings.some(s=>s.includes('pasaje adaptado')));
  });
}
test('nepote.docx: no convertir el marcador «Texto» en pasaje latino',()=>{
  assert.throws(()=>parseTeacherDocumentXml(
    historicalDocx('Cornelio Nepote, Milcíades VII','Texto'),parse),
    /marcador «Texto».+no un pasaje latino/iu);
});
test('cita de Nepote con referencia arábiga y libro latino con capítulos: compatibilidad',()=>{
  const nepote=parseTeacherDocumentXml(historicalDocx('Cornelio Nepote, Milcíades 10'),parse);
  assert.equal(nepote.reference,'10');
  const salustio=parseTeacherDocumentXml(
    historicalDocx('Salustio, Bellum Catilinæ LXI 4–5'),parse);
  assert.deepEqual([salustio.work,salustio.reference],['Bellum Catilinæ','LXI 4–5']);
  const capitulos=parseTeacherDocumentXml(historicalDocx('César, De bello Gallico 1.2.3'),parse);
  assert.equal(capitulos.reference,'1.2.3');
});
