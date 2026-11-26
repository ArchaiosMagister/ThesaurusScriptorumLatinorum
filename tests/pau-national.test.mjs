import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalMorphologyMarks,recognizeNationalQuestions,prepareNationalPassage,parseExplicitNationalRows} from '../scripts/pau-national-parser.js';

test('compatible lists retain original quantity; unrelated questions ignored',()=>{
  const latin='Cæsar hostium copias uidit, suos milites parauit.';
  const result=recognizeNationalQuestions(latin,[
    '2. Analiza morfológicamente: hostium, copias, uidit, suos.',
    '3. Explica la evolución fonética al castellano: noctem, oculum, aurum, lactem.',
    '4. Explica las termas romanas.',
    '5. Explica el significado de los latinismos: in extremis, post mortem.',
    '6. Identifica el prefijo: pernoctar, transformar.',
    '7. Compón por modificación preverbial a partir de las bases: fero, eo.'
  ]);
  assert.equal(result.underlines.length,4);
  assert.deepEqual(result.lexical.phonetics,['noctem','oculum','aurum','lactem']);
  assert.deepEqual(result.lexical.latinism,['in extremis','post mortem']);
  assert.deepEqual(result.lexical.prefix,['pernoctar','transformar']);
  assert.deepEqual(result.preverbBases,['fero','eo']);
  assert.equal(result.ignored.length,1);
});
test('no invented items; incompatible target language and unparseable exercise excluded',()=>{
  const result=recognizeNationalQuestions('Gallia est.',[
    '1. Explica la evolución fonética al gallego: noctem, lactem.',
    '2. Explica la evolución fonética al castellano: noctem.',
    '3. Analiza morfológicamente las formas subrayadas.',
    '4. Explica los cambios fonéticos de las palabras del texto.'
  ]);
  assert.deepEqual(result.lexical.phonetics,['noctem']);
  assert.equal(result.ignored.length,1);
  assert.equal(result.warnings.length,2);
});
test('ambiguity and missing forms are never marked arbitrarily',()=>{
  const result=nationalMorphologyMarks('Caesar Caesar Cæsarem uidit.',['Caesar','Caesarem','fuit','uidit']);
  assert.deepEqual(result.underlines.map(x=>x.exact),['Cæsarem','uidit']);
  assert.equal(result.warnings.length,2);
  for(const mark of result.underlines) assert.equal('Caesar Caesar Cæsarem uidit.'.slice(mark.startUtf16,mark.endUtf16),mark.exact);
});
test('passage without compatible questions is preserved unchanged',()=>{
  const latin='Gallia est […] omnis diuisa in partes tres.';
  const result=prepareNationalPassage({latin,questions:['1. Describe la sociedad romana.']});
  assert.equal(result.doc.latin,latin);
  assert.deepEqual(result.doc.underlines,[]);
  assert.equal(result.review.ignored.length,1);
  assert.equal(Object.hasOwn(result.doc,'pauCv'),false);
});
test('explicit option boundaries keep each question with its own passage',()=>{
  const result=parseExplicitNationalRows([[
    'Opción A','Texto latino: Gallia est omnis diuisa in partes tres.',
    '1. Analiza morfológicamente: Gallia.',
    '2. Explica la evolución fonética: noctem,','lactem.',
    'Opción B','Texto latino: Romani ad urbem uenerunt.',
    '1. Analiza morfológicamente: Romani.'
  ]]);
  assert.equal(result.length,2);
  assert.deepEqual(result[0].doc.lexical.phonetics,['noctem','lactem']);
  assert.deepEqual(result[1].doc.lexical.phonetics,[]);
  assert.equal(result[1].doc.underlines[0].exact,'Romani');
  assert.throws(()=>parseExplicitNationalRows([['Latín II','Gallia est.']]),/Estructura no reconocida/);
});
