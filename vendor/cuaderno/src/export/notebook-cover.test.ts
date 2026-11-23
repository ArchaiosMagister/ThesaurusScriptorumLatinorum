import test from 'node:test';
import assert from 'node:assert/strict';
import {createEdition, createPlacement} from '../core/edition-factory.js';
import {validateEdition} from '../core/edition-validation.js';
import {createNotebookDocx} from './notebook-documents.js';
import {zipStore} from './zip-store.js';

const jpg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD2aiiigD//2Q==';
const at='2026-11-20T12:00:00.000Z';
const edition=()=>{
  const text=createPlacement({
    id:'p.1',title:'Texto latino',latin:'Caesar Galliam vicit.',
    author:'César',work:'De bello Gallico',reference:'I 24',
    source:{kind:'manual',sourceId:null,urn:null,importedAt:at},
  },()=> 'item.'+Math.random().toString(36).slice(2));
  return createEdition({id:'ed.portada',legacyNotebookId:null,title:'Cuaderno de Latín II',
    timestamp:at,placements:[text]});
};
const cover={title:'CUADERNO DE LATÍN II',subtitle:'',course:'2026–2027',
  studentLabel:'NOMBRE Y APELLIDOS:',groupLabel:'GRUPO:',
  imageDataUrl:jpg,imageCredit:'Fotografía CC0',colorMode:'gray',reflection:true} as const;

test('las ediciones antiguas siguen siendo válidas y no reciben portada automáticamente',()=>{
  const old=edition();
  assert.ok(!Object.hasOwn(validateEdition(old),'cover'));
  assert.equal(createNotebookDocx(old).some(x=>x!==0),true);
});
test('una portada JPEG validada viaja dentro del DOCX sin rasterizar el texto',()=>{
  const old=edition();
  const updated=validateEdition({...old,cover});
  assert.deepEqual(updated.cover,cover);
  const bytes=createNotebookDocx(updated);
  const latin=new TextDecoder().decode(bytes);
  assert.match(latin,/word\/media\/cover.jpg/);
  assert.match(latin,/rIdCoverImage/);
  assert.match(latin,/CUADERNO DE LATÍN II/);
  assert.match(latin,/NOMBRE Y APELLIDOS:/);
  assert.match(latin,/Caesar Galliam vicit/);
  assert.match(latin,/w:pageBreakBefore/);
  assert.match(latin,/image\/jpeg/);
  assert.ok(bytes.includes(255),'la imagen está incrustada como bytes');
});
test('rechaza imágenes que no sean JPEG base64 y campos extraños',()=>{
  const old=edition();
  assert.throws(()=>validateEdition({...old,cover:{...cover,imageDataUrl:'https://example.org/image.jpg'}}));
  assert.throws(()=>validateEdition({...old,cover:{...cover,imageDataUrl:'data:image/svg+xml;base64,AAA='}}));
  assert.throws(()=>validateEdition({...old,cover:{...cover,colorMode:'sepia'}}));
  assert.throws(()=>validateEdition({...old,cover:{...cover,extra:'unknown'}}));
});
test('ZIP binario conserva el contenido sin convertirlo a texto UTF-8',()=>{
  const input=new Uint8Array([0,255,254,1,12,13]);
  const zip=zipStore([{path:'image.jpg',content:input}]);
  const filename=new TextDecoder().decode(zip).indexOf('image.jpg');
  assert.ok(filename>=0);
  assert.deepEqual(zip.slice(filename+9,filename+9+input.length),input);
});
