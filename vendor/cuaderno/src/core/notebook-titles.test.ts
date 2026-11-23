import test from 'node:test';
import assert from 'node:assert/strict';
import {nextNotebookTextTitle} from './notebook-titles.js';

const placement=(title:string)=>({text:{title}});
test('Un cuaderno nuevo comienza por Texto 1 y numera las apariciones correlativamente',()=>{
  assert.equal(nextNotebookTextTitle([]),'Texto 1');
  assert.equal(nextNotebookTextTitle([placement('Texto 1')]),'Texto 2');
  assert.equal(nextNotebookTextTitle([placement('Texto 1'),placement('Texto 2')]),'Texto 3');
});
test('Eliminar o reordenar no renumera textos ni produce títulos duplicados',()=>{
  const kept=[placement('Texto 3'),placement('Texto 1')];
  const original=structuredClone(kept);
  assert.equal(nextNotebookTextTitle(kept),'Texto 4');
  assert.deepEqual(kept,original);
  assert.equal(nextNotebookTextTitle([placement('Texto 2')]),'Texto 3');
});
test('Los títulos personalizados se conservan y no se confunden con bibliografía',()=>{
  assert.equal(nextNotebookTextTitle([placement('Los helvecios atacan'),
    placement('Julio César, De bello Gallico I 24')]),'Texto 3');
  assert.equal(nextNotebookTextTitle([placement('Introducción'),placement('Texto 4'),
    placement('Texto 2')]),'Texto 5');
  assert.equal(nextNotebookTextTitle([placement('Texto 2 (revisado)'),placement('texto 3')]),'Texto 4');
  assert.equal(nextNotebookTextTitle([placement('El relato de Eutropio')]),'Texto 2');
});
test('La numeración depende exclusivamente del cuaderno actual',()=>{
  const a=[placement('Texto 1'),placement('Texto 2')],b=[placement('Texto 1')];
  assert.equal(nextNotebookTextTitle(a),'Texto 3');
  assert.equal(nextNotebookTextTitle(b),'Texto 2');
  assert.equal(nextNotebookTextTitle([]),'Texto 1');
});
