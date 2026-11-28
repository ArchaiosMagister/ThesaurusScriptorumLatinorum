import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalTextRows,extractNationalPdfPages} from '../scripts/pau-national-pdf.js';
import {recognizeNationalExam} from '../scripts/pau-national-profiles.js';
import {scanCastillaLeonRows} from '../scripts/pau-national-cyl.js';
const viewport={transform:[1,0,0,-1,0,800],scale:1};
const transform=(_v,m)=>[m[0],-m[1],m[2],-m[3],m[4],800-m[5]];
const item=(str,x,y,width,fontName='f1')=>({str,width,fontName,transform:[12,0,0,12,x,800-y]});
test('national extraction preserves source diacritics and joins adjacent font runs',()=>{
 const rows=nationalTextRows([
   item('cālĕm',120,30,30),item('nŭ',110,30,10),item('▪',90,30,7),
   item('Texto',100,10,30),item('latino:',140,10,34),item('   ',0,0,10),
 ],viewport,transform);
 assert.deepEqual(rows.map(r=>r.text),['Texto latino:','▪ nŭcālĕm']);
 assert.equal(rows[1].runs.length,3);
});
function mock(pages,{failPage=false}={}){
 let destroyed=0,cleaned=0;
 const api={Util:{transform},getDocument(options){
   assert.equal(options.isEvalSupported,false);
   return {promise:Promise.resolve({numPages:pages.length,async getPage(n){
     return {getViewport:()=>viewport,async getTextContent(){
       if(failPage)throw Error('bad page');
       return {items:pages[n-1]};
     },cleanup(){cleaned++;}};
   }}),async destroy(){destroyed++;}};
 }};
 return {api,counts:()=>({destroyed,cleaned})};
}
const file={size:4,arrayBuffer:async()=>new Uint8Array([37,80,68,70]).buffer};
test('PDF lifecycle, empty-page warning and explicit refusal of scanned-only files',async()=>{
 const m=mock([[item('Latín II',10,20,35)],[]]);
 const result=await extractNationalPdfPages(file,{pdfjs:m.api});
 assert.equal(result.pages[0][0].text,'Latín II');
 assert.equal(result.pages.length,2);
 assert.match(result.warnings[0],/Página 2/);
 assert.deepEqual(m.counts(),{destroyed:1,cleaned:2});
 const scanned=mock([[]]);
 await assert.rejects(extractNationalPdfPages(file,{pdfjs:scanned.api}),/OCR/);
 assert.deepEqual(scanned.counts(),{destroyed:1,cleaned:1});
});
test('cleanup occurs on extraction failure; page count bounded',async()=>{
 const bad=mock([[item('text',0,0,20)]],{failPage:true});
 await assert.rejects(extractNationalPdfPages(file,{pdfjs:bad.api}),/bad page/);
 assert.deepEqual(bad.counts(),{destroyed:1,cleaned:1});
 const many=mock(Array.from({length:17},()=>[]));
 await assert.rejects(extractNationalPdfPages(file,{pdfjs:many.api}),/16 páginas/);
 assert.deepEqual(many.counts(),{destroyed:1,cleaned:0});
});
test('PDF rows feed the isolated profile without invoking CV or saving',async()=>{
 const lines=['Prueba de Acceso a la Universidad   Latín II','Castilla y León',
 'APARTADO 1: Traducción','TEXTO A: César, De bello Gallico',
 'Contexto A','Gallia est diuisa.','Cuestiones:','1.1 Traducción',
 'TEXTO B: Cicerón, In Catilinam','Contexto B','Romani adsunt.',
 'Cuestiones:','1.1 Traducción','LATÍN II – Ejercicio – Propuesta 1/2025',
 'APARTADO 2: Léxico','2.3 Explique la evolución y reglas fonéticas',
 '▪ noctem','APARTADO 3: Literatura'];
 const m=mock([lines.map((line,i)=>item(line,20,20+i*20,line.length*5))]);
 const extracted=await extractNationalPdfPages(file,{pdfjs:m.api});
 const scan=scanCastillaLeonRows(extracted.pages);
 assert.equal(scan.options.length,2);
 assert.deepEqual(scan.sharedLexical.phonetics,['noctem']);
 assert.deepEqual(scan.options[0].candidateRows.map(r=>r.text),['Contexto A','Gallia est diuisa.']);
});

test('a diagonal advisory-model label is metadata and a double call is unconfirmed',async()=>{
 const mark=item('MODELO ORIENTATIVO',30,50,150);
 mark.transform[1]=8;
 const lines=[item('Latín II',10,20,45),item('CONVOCATORIA ORDINARIA EXTRAORDINARIA DE 2025',10,35,330)];
 const extracted=await extractNationalPdfPages(file,{pdfjs:mock([[...lines,mark]]).api});
 assert.ok(extracted.pages.every(page=>page.every(row=>row.text!=='MODELO ORIENTATIVO')));
 assert.deepEqual(recognizeNationalExam(extracted).metadata,{
   community:'',year:2025,session:'',model:'Modelo orientativo'
 });
 assert.equal(recognizeNationalExam({...extracted,advisoryModel:false}).metadata.model,'');
});

test('Aragón: las cuatro opciones dejan fuera los fragmentos sintácticos y comparten el léxico',async()=>{
 const lines=['EJERCICIO DE: LATÍN II','CONVOCATORIA EXTRAORDINARIA DE 2024',
  'Elija una de las cuatro opciones propuestas A, B, C, D:',
  ...[...'ABCD'].flatMap(option=>[
    'OPCIÓN '+option,'Contexto de la opción (Nepote, Vidas 1.2).',
    'Dux legatos misit. Dux ibi mansit.','Notas:','1. legatos: enviados.',
    '1. Traducción del texto. (4 puntos)','2. Análisis morfológico. (1 punto)',
    '2.1. Análisis mofológico de uno de los siguientes términos (0,25 puntos)',
    '-dux / legatos (caso, número y género)',
    '3. Análisis sintáctico del segmento.','Dux ibi mansit.'
  ]),
  'BLOQUE 2 (2 puntos)','4.1. Explique el significado de las siguientes expresiones latinas',
  'a) ab initio c) de iure','b) ad hoc d) in situ',
  '4.2. Explique la evolución del latín al castellano','a) lactem c) noctem','b) aurum d) portam',
  'BLOQUE 3 (2 puntos)','OPCIÓN A','Literatura'];
 const m=mock([lines.map((line,i)=>item(line,20,10+i*12,line.length*5))]);
 const result=recognizeNationalExam(await extractNationalPdfPages(file,{pdfjs:m.api}));
 assert.equal(result.metadata.community,'Aragón');
 assert.deepEqual(result.records.map(record=>record.option),['A','B','C','D']);
 for (const {doc} of result.records) {
   assert.equal(doc.latin,'Dux legatos misit. Dux ibi mansit.');
   assert.deepEqual(doc.underlines.map(mark=>mark.exact),['legatos']);
   assert.deepEqual(doc.lexical.latinism,['ab initio','ad hoc','de iure','in situ']);
   assert.deepEqual(doc.lexical.phonetics,['lactem','aurum','noctem','portam']);
   assert.match(doc.warnings.join(' '),/ambigua: dux/u);
 }
});

test('Aragón histórico reconoce dos opciones sin incipits ni atribuciones fijas',()=>{
 const latinA='Nautae tempestatem timebant et omnes procul ab insula fugerunt.';
 const latinB='Magister pueros docuit et eos in scholam post meridiem uocauit.';
 const row=(text,italic=false)=>({text,runs:[{italic}]});
 const options=[
   [row('OPCIÓN A'),row('Un grupo de marineros huye (Autor, Obra II 3).'),row(latinA,true),
    row('1'),row('Notas'),row('tempestatem: tormenta.'),row('1. Traducción del texto.'),
    row('2.1. Análisis morfológico de timebant (accidentes flexivos).'),
    row('3. Análisis sintáctico del siguiente periodo.'),row(latinA,true)],
   [row('OPCIÓN B'),row('Un maestro reúne a sus alumnos.'),row('Otra autora, Otra obra 4, 2'),
    row(latinB,true),row('Notas:'),row('1. Traducción del texto.')]
 ];
 const result=recognizeNationalExam({pages:[[
   row('Universidad'),row('CONVOCATORIA DE SEPTIEMBRE DE 2013'),row('Zaragoza'),
   row('EJERCICIO DE: LATÍN II'),...options[0]],options[1]]});
 assert.equal(result.metadata.community,'Aragón');
 assert.equal(result.metadata.year,2013);
 assert.equal(result.metadata.session,'Extraordinaria');
 assert.deepEqual(result.records.map(item=>item.doc.latin),[latinA,latinB]);
 assert.equal(result.records[0].doc.author,'Autor');
 assert.equal(result.records[1].doc.author,'Otra autora');
 assert.deepEqual(result.records[0].doc.underlines.map(mark=>mark.exact),['timebant']);
 assert.ok(result.records.every(item=>item.requiresTranscriptReview));
});

test('un salto de página aragonés no entra en el pasaje y julio de 2020 se reconoce como ordinaria',()=>{
 const row=text=>({text,runs:[]});
 const sig='Elija una de las cuatro opciones propuestas A, B, C, D:';
 const lines=['Universidad de Zaragoza','CONVOCATORIA DE JULIO DE 2020',
   'EJERCICIO DE: LATÍN II','BLOQUE 1 (8 puntos)',sig];
 for(const option of 'ABCD') lines.push('OPCIÓN '+option,'Contexto (Autor, Obra 1).',
   'Pueri castra uident.', 'CONTINÚA AL DORSO','Ibi milites pugnant.','Notas:');
 lines.push('BLOQUE 2 (1 punto)','BLOQUE 3 (1 punto)');
 const result=recognizeNationalExam({pages:[lines.map(row)]});
 assert.equal(result.metadata.session,'Ordinaria');
 assert.equal(result.records.length,4);
 assert.ok(result.records.every(item=>item.doc.latin==='Pueri castra uident.\nIbi milites pugnant.'));
});

test('Murcia histórico separa títulos de varias líneas y una columna sin glosas',()=>{
 const row=(text,y,fontName='body',underline=false)=>({text,y,runs:[{fontName,start:0,end:text.length,underline}]});
 const prompt='Las cuestiones 1, 2 y 3 se responden siempre sobre el mismo texto.';
 const a='Nautae in portu manserunt et tandem in insulam uenerunt.';
 const b='Pueri librum legerunt et ad scholam redire decreuerunt.';
 const page=[
   row('308 – LATÍN II',10),row('EBAU2024 - JULIO',20),row(prompt,30),
   row('TEXTO A TEXTO B',40),row('Cuestión 1. Del texto seleccionado',150),
   row('Cuestión 4. Explica la evolución fonética del latín al castellano',220),row('pŏpŭlum, fŏcum y sŏmnum',230)
 ];
 const columns=[
   [row('ser siempre el mismo)',50),row('Llegada de los marineros',70,'title'),row(a,90),
    row('Nauta, -ae: marinero.',115)],
   [row('ser siempre el mismo)',50),row('Los alumnos deciden',70,'title'),
    row('volver a la escuela',80,'title'),row(b,100)]
 ];
 const result=recognizeNationalExam({pages:[page],columns:[columns]});
 assert.deepEqual(result.metadata,{community:'Región de Murcia',year:2024,session:'Extraordinaria',model:'Examen oficial'});
 assert.deepEqual(result.records.map(item=>item.doc.latin),[a,b]);
 assert.deepEqual(result.records.map(item=>item.doc.lexical.phonetics),
   [['pŏpŭlum','fŏcum','sŏmnum'],['pŏpŭlum','fŏcum','sŏmnum']]);
 assert.equal(result.records[1].notes,'Los alumnos deciden volver a la escuela');
 assert.equal(result.records[0].doc.vocabulary.length,1);
 assert.equal(result.records[1].doc.vocabulary.length,0);
 assert.ok(result.records.every(item=>item.requiresTranscriptReview));
});

test('Asturias histórico conserva las alternativas del original y separa texto, glosas y preguntas',()=>{
 const a='Nautae procul a portu fuerant, sed insulam laeti petiuerunt.';
 const b='Puella uoces amicorum audiuit et libros domum portauit.';
 const row=text=>({text,runs:[]});
 const part=(label,body,form)=>[
   'ALTERNATIVA '+label,'(Breve contexto del pasaje.)',body,'NOTA: uox: voz.',
   '1. Traducción del texto.','2. CUESTIONES:',
   '2.1.- Morfología: Analice morfológicamente “'+form+'”.',
   '2.2.- Sintaxis: Repita la frase.','2.3.- Léxico: Explique la evolución fonética de nŏctem.',
   '2.4.- Cuestión cultural: hable de literatura.'
 ];
 const result=recognizeNationalExam({pages:[[
   'Universidad de Oviedo',...part('I',a,'insulam'),...part('II',b,'libros')
 ].map(row)]});
 assert.deepEqual(result.records.map(item=>item.option),['I','II']);
 assert.deepEqual(result.records.map(item=>item.doc.latin),[a,b]);
 assert.deepEqual(result.records.map(item=>item.doc.underlines[0].exact),['insulam','libros']);
 assert.deepEqual(result.records[0].doc.lexical.phonetics,['nŏctem']);
 assert.deepEqual(result.records[0].doc.vocabulary,[{headword:'uox',meaning:'voz.'}]);
 assert.ok(result.records.every(item=>item.requiresTranscriptReview));
});

test('el modelo aragonés de 2027 reconoce la morfología explícita y omite el banco de distractores',()=>{
 const row=text=>({text,runs:[]});
 const page=[
  'MODELO ORIENTATIVO DE EXAMEN 2027','EJERCICIO DE: LATÍN II','BLOQUE 1 (6 puntos)',
  'Lea con detenimiento el siguiente texto.','Texto','Contexto (Autor, Obra 1.2).',
  'Nautae procul navigaverunt et ad insulam pervenerunt.','Notas:','1. Traducción del texto.',
  '2. Análisis morfológico.','2.1. Análisis morfológico de navigaverunt. Indíquese el modo.',
  '3. Análisis sintáctico del siguiente período.','BLOQUE 2 (2 puntos)',
  '4.1. Introduzca las expresiones latinas en los huecos.','in albis / sine die',
  '4.2. Explique la evolución del latín al castellano.','a) cálidŭm b) capŭt','BLOQUE 3 (2 puntos)'
 ].map(row);
 const result=recognizeNationalExam({pages:[page]});
 assert.deepEqual(result.metadata,{community:'Aragón',year:2027,session:'',model:'Modelo orientativo'});
 assert.deepEqual(result.records[0].doc.underlines.map(mark=>mark.exact),['navigaverunt']);
 assert.deepEqual(result.records[0].doc.lexical.phonetics,['cálidŭm','capŭt']);
 assert.deepEqual(result.records[0].doc.lexical.latinism,[]);
 const earlierPage=[
  row('CONVOCATORIA ORDINARIA EXTRAORDINARIA DE 2025'),page[1],
  row('BLOQUE 1 (6 puntos). Lea con detenimiento el siguiente texto.'),...page.slice(4)
 ];
 const earlier=recognizeNationalExam({pages:[earlierPage],advisoryModel:true});
 assert.deepEqual(earlier.metadata,{community:'Aragón',year:2025,session:'',model:'Modelo orientativo'});
 assert.equal(earlier.records.length,1);
});
