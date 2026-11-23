import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFragment, findCitation, foldLatin, searchWorks, type LibraryWork, type LibraryEntry } from './library.js';

const work: LibraryWork = {
  urn:'phi0448.phi001', author:'Julio César', title:'La guerra de las Galias',
  latin:'De bello Gallico', genre:'Historia', levels:['book','chapter','section'],
  source:'https://example.org/source', license:'CC BY-SA 4.0', editorial:'Edición', provenance:'Examinator2',
  lines:[
    {c:'1.1.1',t:'Gallia est omnis divisa in partes tres.',k:'p'},
    {c:'1.1.2',t:'Quarum unam incolunt Belgae.',k:'p'},
    {c:'1.2.1',t:'Apud Helvetios longe nobilissimus fuit.',k:'p'},
  ],
};

test('busca por autor, título en latín y diacríticos', () => {
  const entries: LibraryEntry[] = [{...work,file:'works/one.json',count:3,lines:undefined} as unknown as LibraryEntry];
  assert.equal(searchWorks(entries,'Cesar').length,1);
  assert.equal(searchWorks(entries,'Gallico').length,1);
  assert.equal(searchWorks(entries,'Nepote').length,0);
  assert.equal(foldLatin('Helvētiī'), 'helvetii');
});

test('ir a un capítulo o apartado conserva la cita textual', () => {
  assert.equal(findCitation(work,'1.1.2'),1);
  assert.equal(findCitation(work,'1.1'),0);
  assert.equal(findCitation(work,'10.10'),-1);
});

test('selecciona fragmentos consecutivos con referencia exacta', () => {
  assert.deepEqual(buildFragment(work,0,1),{
    latin:'Gallia est omnis divisa in partes tres.\nQuarum unam incolunt Belgae.',
    reference:'1.1.1–1.1.2',
    wordCount:11,
  });
  assert.equal(buildFragment(work,1,1).reference,'1.1.2');
  assert.equal(buildFragment(work,1,0).reference,'1.1.1–1.1.2');
});

test('rechaza intervalos inválidos', () => {
  assert.throws(()=>buildFragment(work,-1,1));
  assert.throws(()=>buildFragment(work,0,9));
});
