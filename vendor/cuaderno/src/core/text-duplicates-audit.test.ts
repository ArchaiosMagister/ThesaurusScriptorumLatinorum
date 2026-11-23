import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLibraryDuplicates, findPossibleDuplicates, normalizedCitationKey, normalizedLatinKey } from './text-duplicates.js';
import type { LatinText } from './model.js';

type Source = Pick<LatinText, 'id' | 'title' | 'latin' | 'source'>;
const passage='Helvetii cum omnibus suis carris secuti impedimenta in unum locum contulerunt ipsi confertissima acie reiecto nostro equitatu phalange facta successerunt';
const make=(id:string, latin:string, author='Caesar',work='De bello Gallico',reference='I 24'):Source=>({
  id,title:'Ficha '+id,latin,source:{author,work,reference},
});

test('la auditoría agrupa coincidencias idénticas, fragmentos y citas una sola vez',()=>{
  const first=make('a',passage,'César','De bello Gallico','I.24');
  const literal=make('b',passage.replace('ipsi','ipsī'),'César','Bellum Gallicum','1.24');
  const overlap=make('c','Itaque '+passage.slice(0,105)+' discesserunt.','Salustio','Catilina','2');
  const citation=make('d','Novi milites ad castra proficiscuntur.','Julio César','Bellum Gallicum','I 24');
  const unrelated=make('e','Puer currit in via.','Cicerón','De officiis','1.2');
  const entries=[first,literal,overlap,citation,unrelated];
  const snapshot=JSON.stringify(entries);
  const found=auditLibraryDuplicates(entries);
  assert.deepEqual(found.filter(m=>m.firstId==='a'&&m.secondId==='b').map(m=>m.kind),['identical']);
  assert.deepEqual(found.filter(m=>m.firstId==='a'&&m.secondId==='c').map(m=>m.kind),['overlap']);
  assert.deepEqual(found.filter(m=>m.firstId==='a'&&m.secondId==='d').map(m=>m.kind),['citation']);
  assert.ok(!found.some(m=>m.firstId==='e'||m.secondId==='e'));
  assert.equal(new Set(found.map(m=>[m.firstId,m.secondId].join(':'))).size,found.length);
  assert.equal(JSON.stringify(entries),snapshot,'la auditoría no modifica el banco');
});

test('el informe encuentra todos los pares incluso por encima de cinco resultados',()=>{
  const entries=Array.from({length:7},(_,i)=>make('id.'+i,'Idem breve textum.'));
  const found=auditLibraryDuplicates(entries);
  assert.equal(found.length,21);
  assert.ok(found.every(m=>m.kind==='identical'));
});

test('la referencia romana, los títulos de César y los diptongos tienen clave estable',()=>{
  assert.equal(normalizedCitationKey({
    latin:'X',author:'C. Iulius Caesar',work:'Bellum civile',reference:'IV. 3',
  }),normalizedCitationKey({
    latin:'Y',author:'Julio César',work:'De bello civili',reference:'4,3',
  }));
  assert.equal(normalizedLatinKey('Cæsar uēnit.'),normalizedLatinKey('Caesar venit!'));
});

test('no marca solapamientos espurios cortos ni obras sin referencia',()=>{
  const a=make('a','in foro Romano','César','Bellum Gallicum','');
  const b=make('b','in foro Romano','Otro','Otra obra','');
  const c=make('c','in foro magno','Otro','Otra obra','');
  const found=auditLibraryDuplicates([a,b,c]);
  assert.deepEqual(found.map(m=>m.kind),['identical']);
  assert.equal(found[0]?.firstId,'a');
  assert.equal(found[0]?.secondId,'b');
});

test('los fragmentos largos con distinto contexto se reconocen aunque cambie la grafía',()=>{
  const first=make('a',passage,'Tito Livio','Ab urbe condita','VII 2');
  const second=make('b','Proinde ' + passage.replace('carris','carrīs')+' postero die.','Otro','Otra','I 7');
  const found=auditLibraryDuplicates([first,second]);
  assert.equal(found.length,1);
  assert.equal(found[0]?.kind,'overlap');
  assert.ok(found[0]!.sharedWords>=15);
});

test('detecta ocho palabras compartidas tras más de cuarenta fórmulas repetidas',()=>{
  const prefix='arma virumque cano troiae qui primus';
  const target=prefix+' ab oris';
  const longLatin=Array.from({length:45},()=>prefix+' discessit').join(' ')
    +' '+target+' postero die';
  const found=findPossibleDuplicates([make('old',longLatin)],{
    latin:target,author:'Salustio',work:'Catilina',reference:'18',
  });
  assert.equal(found.length,1,'el límite de posiciones no debe ocultar el solapamiento');
  assert.equal(found[0]?.kind,'overlap');
  assert.equal(found[0]?.sharedWords,8);
  assert.equal(found[0]?.excerpt,target);
});
