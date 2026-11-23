import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCorpus} from './model.js';
import {requiresDistinctDocxSource,upsertText} from './editor-operations.js';
import type {ParsedTeacherDocx} from './docx-import.js';

const at='2026-11-21T17:00:00.000Z';
const doc:ParsedTeacherDocx={
  title:'Primer examen',author:'César',work:'De bello Gallico',reference:'I 24',
  latin:'Gallia est omnis divisa in partes tres.',
  underlines:[{startUtf16:0,endUtf16:6,exact:'Gallia'}],
  vocabulary:[{headword:'Gallia, -ae',meaning:'Galia'}],
  lexical:{preverb:[],phonetics:[],prefix:[],latinism:[]},
  preverbBases:null,warnings:[],
};

test('una variante Word con otros subrayados conserva la versión anterior',()=>{
  const original=upsertText(emptyCorpus(),{
    title:doc.title,latin:doc.latin,author:'César',work:doc.work!,
    reference:doc.reference!,
  },'doc.original',at);
  const first={...original,texts:original.texts.map(t=>({...t,teacherDocx:doc}))};
  const existing=first.texts[0]!;
  const variant:ParsedTeacherDocx={...doc,title:'Segundo examen',underlines:[
    {startUtf16:7,endUtf16:10,exact:'est'},
  ]};
  assert.equal(requiresDistinctDocxSource(existing,variant),true);
  const targetId=requiresDistinctDocxSource(existing,variant)?'doc.variante':existing.id;
  const updated=upsertText(first,{
    title:variant.title,latin:variant.latin,author:'César',work:variant.work!,
    reference:variant.reference!,
  },targetId,at);
  const saved={...updated,texts:updated.texts.map(t=>t.id===targetId
    ?{...t,teacherDocx:variant}:t)};
  assert.equal(saved.texts.length,2);
  assert.deepEqual(saved.texts.find(t=>t.id==='doc.original')?.teacherDocx,doc);
  assert.deepEqual(saved.texts.find(t=>t.id==='doc.variante')?.teacherDocx,variant);
});

test('reimportar el mismo Word no necesita una segunda ficha',()=>{
  assert.equal(requiresDistinctDocxSource({teacherDocx:doc},{...doc}),false);
  assert.equal(requiresDistinctDocxSource({teacherDocx:doc},undefined),false);
  assert.equal(requiresDistinctDocxSource(undefined,doc),false);
});
