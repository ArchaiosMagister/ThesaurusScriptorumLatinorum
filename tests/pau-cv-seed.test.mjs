import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareSeed,seedId,isPristineSeed} from '../scripts/pau-cv-seed.js';
const rows=JSON.parse(await readFile(new URL('../scripts/pau-cv-seed-data.json',import.meta.url),'utf8'));
const empty=()=>({schemaVersion:1,texts:[],tags:[],notebooks:[]});
test('44 exámenes, 88 fichas, 12 con léxico; marcas exactas, reservas y convocatorias independientes',()=>{
 assert.equal(rows.length,88);
 assert.equal(rows.filter(x=>x.doc.author==='Julio César').length,43);
 assert.equal(rows.filter(x=>x.doc.author==='César').length,0);
 assert.equal(new Set(rows.map(x=>seedId(x.doc))).size,88);
 assert.equal(rows.filter(x=>x.model==='actual').length,12);
 assert.equal(rows.filter(x=>x.session.includes('reserva')).length,4);
 for(const row of rows){
  const {doc}=row;assert.ok(doc.title&&doc.author&&doc.work&&doc.reference&&doc.latin.length>30);
  for(const mark of doc.underlines)assert.equal(doc.latin.slice(mark.startUtf16,mark.endUtf16),mark.exact);
  if(row.model==='antiguo')assert.ok(Object.values(doc.lexical).every(x=>!x.length)&&doc.preverbBases===null);
  else assert.ok(doc.lexical.phonetics.length===4&&doc.lexical.prefix.length===4&&doc.lexical.latinism.length===4&&doc.preverbBases.length===2);
 }
});
test('instalación aditiva, no restaura bajas, no sobrescribe una ficha existente',()=>{
 const corpus=empty(), first=prepareSeed(corpus,[],rows,x=>x);
 assert.equal(first.texts.length,88);assert.equal(first.pauCvSeedVersion,1);assert.ok(isPristineSeed(first));
 const deleted={...first,texts:first.texts.slice(1)};
 assert.equal(prepareSeed(deleted,deleted.texts,rows,x=>x),deleted);assert.ok(!isPristineSeed(deleted));
 const personal={...first.texts[0],id:'doc.personal',title:'Mi título'};
 const next=prepareSeed({...corpus,texts:[personal]},[personal],rows,x=>x);
 assert.equal(next.texts.length,88);assert.equal(next.texts[0],personal);
 assert.ok(!isPristineSeed(next));
});
