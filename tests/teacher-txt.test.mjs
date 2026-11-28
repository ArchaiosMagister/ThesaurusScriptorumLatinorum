import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTeacherTxt, teacherTxtTemplate} from '../scripts/teacher-txt.js';

test('la plantilla descargable conserva metadatos, el pasaje y los apartados escritos',()=>{
  const parsed=parseTeacherTxt(teacherTxtTemplate
    .replace('Título:','Título: Un pasaje')
    .replace('Autor:','Autor: César')
    .replace('Obra:','Obra: Guerra de las Galias')
    .replace('Texto:', 'Texto:\nCaesar copias misit.\nNauta legit.')
    .replace('Morfología:','Morfología: copias, misit')
    .replace('Modificación preverbial:','Modificación preverbial: legit (2), misit (3)')
    .replace('Prefijos:','Prefijos: transformar'));
  assert.equal(parsed.title,'Un pasaje');
  assert.equal(parsed.author,'César');
  assert.equal(parsed.work,'Guerra de las Galias');
  assert.equal(parsed.latin,'Caesar copias misit.\nNauta legit.');
  assert.deepEqual(parsed.underlines.map(mark=>mark.exact),['copias','misit']);
  assert.deepEqual(parsed.preverbBases,['misit','legit']);
  assert.deepEqual(parsed.lexical.prefix,['transformar']);
  assert.deepEqual(parsed.lexical.phonetics,[]);
  assert.equal(parsed.textTemplate,true);
});

test('la plantilla original y UTF-8 con BOM conservan los huecos',()=>{
  const parsed=parseTeacherTxt('\uFEFFTexto: Nauta aquam portat.\r\nMorfología: a, b, c, d\r\n'+
    'Modificación preverbial: x (3), y (2)\r\nLatinismos: a, b, c, d','leccion.txt');
  assert.equal(parsed.title,'leccion');
  assert.deepEqual(parsed.underlines,[]);
  assert.deepEqual(parsed.lexical.latinism,[]);
  assert.equal(parsed.preverbBases,null);
});

test('se rechazan falta de texto, ocurrencias ambiguas y cantidades incompatibles',()=>{
  assert.throws(()=>parseTeacherTxt('Texto:\nMorfología: aquam'),/Completa el campo/);
  assert.throws(()=>parseTeacherTxt('Texto: Aquam videt et aquam portat.\nMorfología: aquam'),/ambigua/);
  assert.throws(()=>parseTeacherTxt('Texto: Aquam portat.\nModificación preverbial: fert (1), mittit (4)'),/dos bases/);
});
