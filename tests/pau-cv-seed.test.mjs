import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareSeed,seedId,isPristineSeed,pauCvIdentity} from '../scripts/pau-cv-seed.js';
const rows=JSON.parse(await readFile(new URL('../scripts/pau-cv-seed-data.json',import.meta.url),'utf8'));
const empty=()=>({schemaVersion:1,texts:[],tags:[],notebooks:[]});
const catalogue=[...new Set(rows.flatMap(row=>Object.keys(row.verifiedGrammar)))].map(id=>({id,label:id,kind:'catalogue',parentId:null}));
const prepare=(corpus,existing,records,validate,reviewed)=>prepareSeed(corpus,existing,records,validate,catalogue,reviewed);
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
 const corpus=empty(), first=prepare(corpus,[],rows,x=>x);
 assert.equal(first.texts.length,88);assert.equal(first.pauCvSeedVersion,2);assert.ok(isPristineSeed(first));
 const deleted={...first,texts:first.texts.slice(1)};
 assert.equal(prepare(deleted,deleted.texts,rows,x=>x),deleted);assert.ok(!isPristineSeed(deleted));
 const personal={...first.texts[0],id:'doc.personal',title:'Mi título'};
 const next=prepare({...corpus,texts:[personal]},[personal],rows,x=>x);
 assert.equal(next.texts.length,88);assert.equal(next.texts[0],personal);
 assert.ok(!isPristineSeed(next));
});

test('la identidad PAU conserva convocatoria, reserva y opción aunque se edite el texto',()=>{
 const identity=(key)=>pauCvIdentity({teacherDocx:{pauCv:key}});
 assert.equal(identity('2026 ORDINARIA / A'),identity('2026 junio / A'));
 assert.notEqual(identity('2025 JUNIO / A'),identity('2025 JUNIO (reserva) / A'));
 assert.notEqual(identity('2025 JUNIO / A'),identity('2025 JUNIO / B'));
 assert.equal(pauCvIdentity({selectividad:{year:2026},notes:'PAU CV · ORDINARIA 2026 · Opción A\nContexto'}),identity('2026 junio / A'));
 assert.equal(pauCvIdentity({notes:'PAU CV · ORDINARIA 2026 · Opción A'}),'');
});

test('la identidad independiente de PAU sobrevive a la retirada de las marcas y a la edición de notas',()=>{
 assert.equal(pauCvIdentity({pauCv:'2025 JUNIO / A',notes:'Notas docentes',selectividad:{year:2025}}),pauCvIdentity({teacherDocx:{pauCv:'2025 ORDINARIA / A'}}));
});

test('migración v1: no restaura bajas ni toca etiquetas o revisiones docentes',()=>{
 const installed=prepare(empty(),[],rows,x=>x);
 const old={...installed,pauCvSeedVersion:1,tags:[],texts:installed.texts.map(t=>({...t,tagIds:[]})).slice(1)};
 old.texts[0]={...old.texts[0],tagIds:['gram.personal']};
 old.tags=[{id:'gram.personal',kind:'custom',parentId:null}];
 old.texts[1]={...old.texts[1],latin:old.texts[1].latin+' añadido'};
 const migrated=prepare(old,old.texts,rows,x=>x,t=>t.id===old.texts[2].id);
 assert.equal(migrated.texts.length,87);
 assert.equal(migrated.texts[0],old.texts[0]);assert.equal(migrated.texts[1],old.texts[1]);assert.equal(migrated.texts[2],old.texts[2]);
 assert.ok(migrated.texts[3].tagIds.length);
 assert.equal(prepare(migrated,migrated.texts,rows,x=>x),migrated);
});
