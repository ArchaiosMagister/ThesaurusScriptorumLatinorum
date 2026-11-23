import test from 'node:test';
import assert from 'node:assert/strict';
import {latinWordAtOffset} from './latin-reading-card.js';
test('detecta palabras latinas con diacríticos y respeta sus límites',()=>{
 const latin='Puellae, āmat atque est.';
 assert.deepEqual(latinWordAtOffset(latin,2),{start:0,end:7,word:'Puellae'});
 assert.deepEqual(latinWordAtOffset(latin,10),{start:9,end:13,word:'āmat'});
 assert.equal(latinWordAtOffset(latin,-1),null);
 assert.equal(latinWordAtOffset(latin,500),null);
});
