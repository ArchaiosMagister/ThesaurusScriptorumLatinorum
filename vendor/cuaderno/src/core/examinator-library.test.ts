import assert from 'node:assert/strict';
import test from 'node:test';
import {parseExaminatorCatalogue,searchExaminatorWorks,originalWorkUrl} from './examinator-library.js';
const base='https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/192fef80a2fd785a389e6584ca2315fd1f80a94e/';
const entries=[
  {urn:'phi0448.phi001.perseus-lat2',path:'data/phi0448/phi001/example.xml',author:'Julio César',
    title:'Guerras de las Galias',latin:'Commentarii de bello Gallico',genre:'Historia',description:'Edición'},
  {urn:'phi0690.phi003.perseus-lat2',path:'data/phi0690/phi003/example.xml',author:'Virgilio',
    title:'Eneida',latin:'Aeneis',genre:'Épica',description:'Edición'},
];
test('catalogación idéntica en autor, obra, título latino, género y descargadas',()=>{
  const catalog=parseExaminatorCatalogue({version:1,source:'Examinator2',baseUrl:base,entries});
  assert.equal(catalog.entries.length,2);
  assert.deepEqual(searchExaminatorWorks(catalog.entries,'cesar','',false,new Set()),[entries[0]]);
  assert.deepEqual(searchExaminatorWorks(catalog.entries,'aeneis','',false,new Set()),[entries[1]]);
  assert.deepEqual(searchExaminatorWorks(catalog.entries,'','Épica',false,new Set()),[entries[1]]);
  assert.deepEqual(searchExaminatorWorks(catalog.entries,'','',true,new Set([entries[0]!.urn])),[entries[0]]);
  assert.equal(originalWorkUrl(catalog,entries[1]!),base+entries[1]!.path);
});
test('conserva alias docentes de las obras ya incluidas sin alterar el autor original',()=>{
  const records=[{...entries[0]!,author:'Caesar',
    local:{author:'Julio César',title:'Guerra de las Galias',latin:'De bello Gallico'}}];
  assert.equal(searchExaminatorWorks(records,'Julio César','',false,new Set()).length,1);
  assert.equal(searchExaminatorWorks(records,'De bello Gallico','',false,new Set()).length,1);
  assert.equal(searchExaminatorWorks(records,'Caesar','',false,new Set()).length,1);
});

test('no permite sustituir URLs ni añadir obras ajenas al catálogo',()=>{
  assert.throws(()=>parseExaminatorCatalogue({version:1,source:'other',
    baseUrl:'https://example.org/',entries}),/Fuente Perseus/);
  assert.throws(()=>parseExaminatorCatalogue({version:1,source:'Examinator2',baseUrl:base,
    entries:[{...entries[0],path:'../../secrets'}]}),/inválida/);
  const catalog=parseExaminatorCatalogue({version:1,source:'Examinator2',baseUrl:base,entries});
  assert.throws(()=>originalWorkUrl(catalog,{...entries[0]!,path:'other'}),/ajena/);
});
