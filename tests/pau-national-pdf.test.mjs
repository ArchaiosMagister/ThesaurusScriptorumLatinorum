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
