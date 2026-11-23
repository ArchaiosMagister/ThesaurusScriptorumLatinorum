import assert from 'node:assert/strict';
import test from 'node:test';
import {onlineSearchUrl,parseOnlineSearch,onlinePageUrl,parseOnlinePage} from './online-sources.js';

test('URL CORS segura y sin datos del cuaderno',()=>{
  const u=new URL(onlineSearchUrl('Cicero'));
  assert.equal(u.host,'la.wikisource.org');
  assert.equal(u.searchParams.get('origin'),'*');
  assert.equal(u.searchParams.get('srsearch'),'Cicero');
  assert.equal(u.searchParams.get('srnamespace'),'0');
  assert.equal(new URL(onlinePageUrl('De officiis')).searchParams.get('page'),'De officiis');
  assert.throws(()=>onlineSearchUrl(' '),/2 a 150/);
});
test('solo acepta resultados y páginas con estructura verificable',()=>{
  assert.deepEqual(parseOnlineSearch({query:{search:[{pageid:12,title:'De officiis'},
    {pageid:'13',title:'Inválida'}]}}),[{id:12,title:'De officiis'}]);
  assert.throws(()=>parseOnlineSearch({query:{}}),/inválida/);
  assert.equal(parseOnlinePage({parse:{title:'De officiis',text:'<p>Quamquam</p>'}}).html,
    '<p>Quamquam</p>');
  assert.throws(()=>parseOnlinePage({error:{code:'missingtitle'}}),/incompleta/);
});
