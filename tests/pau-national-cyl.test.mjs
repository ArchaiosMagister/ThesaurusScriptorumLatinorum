import test from 'node:test';
import assert from 'node:assert/strict';
import {scanCastillaLeonRows,prepareCastillaLeonPassage} from '../scripts/pau-national-cyl.js';

// Synthetic layout inspired by the official 2025 documents, not a PDF extraction test.
// Official exam: https://www.usal.es/files/acceso/latin_ii_pau_julio_2025.pdf
const pages=[[
 'Latín II','Castilla y León','APARTADO 1: Traducción y análisis',
 'TEXTO A: César, De bello Gallico',
 'Contexto ficticio de dos','líneas para la opción A',
 'Gallia est omnis diuisa in partes tres.','Celtae Galliam incolunt.',
 'Cuestiones:','1.1 Traducción','1.2 Análisis morfológico de las palabras subrayadas',
 '1.3 Análisis sintáctico','Gallia est omnis diuisa.',
 'TEXTO B: Cicerón, In Catilinam','Contexto ficticio B',
 'Non omnes homines idem sentiunt.',
 'Cuestiones:','1.1 Traducción',
 'LATÍN II – Ejercicio – Propuesta 1/2025','Página 1 de 2'
],[
 '1.2 Análisis morfológico de las palabras subrayadas',
 '1.3 Análisis sintáctico','Non omnes homines idem sentiunt.',
 'APARTADO 2: Preguntas comunes','2.1 Significado de la expresión latina',
 '§ Ejemplo en castellano de in extremis','a. Una respuesta',
 '2.2 Derivados a partir del étimo latino','§ vox, vocis (f.)',
 '2.3 Indique la evolución del término y las reglas fonéticas',
 '§ noctem','APARTADO 3: Literatura','3.1 Una pregunta',
 'LATÍN II – Ejercicio – Propuesta 1/2025'
]];
test('detects both candidates and shared phonetics, excluding repeated syntactic excerpts',()=>{
 const scan=scanCastillaLeonRows(pages);
 assert.equal(scan.year,2025);
 assert.equal(scan.session,null);
 assert.equal(scan.isModel,false);
 assert.equal(scan.options[0].author,'Julio César');
 assert.equal(scan.options[0].candidateRows.length,4);
 assert.equal(scan.options[1].candidateRows.length,2);
 assert.deepEqual(scan.sharedLexical.phonetics,['noctem']);
 assert.ok(scan.warnings.some(x=>x.includes('marcas morfológicas')));
 const a=prepareCastillaLeonPassage(scan,'A',{start:2,end:4,session:'extraordinaria'});
 const b=prepareCastillaLeonPassage(scan,'B',{start:1,end:2});
 assert.equal(a.doc.latin,'Gallia est omnis diuisa in partes tres.\nCeltae Galliam incolunt.');
 assert.equal(a.doc.title,'Contexto ficticio de dos líneas para la opción A');
 assert.equal(b.doc.latin,'Non omnes homines idem sentiunt.');
 assert.deepEqual(a.doc.lexical.phonetics,b.doc.lexical.phonetics);
 assert.deepEqual(a.doc.underlines,[]);
 assert.deepEqual(a.doc.lexical.latinism,[]);
 assert.deepEqual(a.doc.lexical.prefix,[]);
 assert.equal(a.session,'extraordinaria');
 assert.equal(b.session,null);
 assert.equal(Object.hasOwn(a.doc,'pauCv'),false);
});
test('fails closed for incomplete boundaries, wrong community and unconfirmed row selection',()=>{
 assert.throws(()=>scanCastillaLeonRows([pages[0].filter(x=>!x.startsWith('TEXTO B'))]),/delimitado/);
 assert.throws(()=>scanCastillaLeonRows([['Latín II','Comunidad Valenciana']]),/No se identifica/);
 const scan=scanCastillaLeonRows(pages);
 assert.throws(()=>prepareCastillaLeonPassage(scan,'A'),/Confirma/);
 assert.throws(()=>prepareCastillaLeonPassage(scan,'A',{start:2,end:99}),/Confirma/);
});
test('model is not treated as an official session, ambiguous lexical bullet is not guessed',()=>{
 const model=pages.map(page=>page.map(x=>x.replace('Propuesta 1/2025','Modelo “0” / 2025')));
 model[1]=model[1].map(x=>x==='§ noctem'?'§ noctem, lactem':x);
 const scan=scanCastillaLeonRows(model);
 assert.equal(scan.isModel,true);
 assert.equal(scan.session,null);
 assert.deepEqual(scan.sharedLexical.phonetics,[]);
 assert.ok(scan.warnings.some(x=>x.includes('étimos')));
});

test('accents, quantity marks, split bullets and merged page footers from 2025 layout',()=>{
 const variant=pages.map(page=>page.flatMap(x=>{
   if(x==='APARTADO 1: Traducción y análisis')return ['APARTADO 1','Traducción y análisis'];
   if(x==='LATÍN II – Ejercicio – Propuesta 1/2025')return ['LATÍN II – Ejercicio – Propuesta 5/2025     1'];
   if(x==='Página 1 de 2')return ['Página 1'];
   if(x==='§ noctem')return ['▪','nŭcālĕm'];
   return [x];
 }));
 const scan=scanCastillaLeonRows(variant);
 assert.equal(scan.year,2025);
 assert.deepEqual(scan.sharedLexical.phonetics,['nŭcālĕm']);
 assert.equal(scan.warnings.filter(x=>x.includes('marcas morfológicas')).length,2);
 assert.ok(!scan.options[1].questions.some(x=>x.includes('Página')||x.includes('Propuesta')));
});
test('a community name in a quotation cannot authenticate an unrelated exam',()=>{
 const variant=pages.map(page=>page.map(x=>x==='Castilla y León'?'Otra comunidad':x==='§ Ejemplo en castellano de in extremis'?'§ Castilla y León aparece en una cita':x));
 assert.throws(()=>scanCastillaLeonRows(variant),/No se identifica/);
});
