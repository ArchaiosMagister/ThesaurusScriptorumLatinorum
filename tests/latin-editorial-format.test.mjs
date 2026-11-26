import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../vendor/examinator/js/render.js',import.meta.url),'utf8');
const context={M:{esc:s=>s}};
vm.runInNewContext(source,context);
const E=context.M.Exam;
const plain=rs=>JSON.parse(JSON.stringify(rs));
test('Examinator aplica la misma tipografía antes y después de analizar el latín',()=>{
  const texto='[Afranius Petreiusque] […] milit[es] [...] [ … ]';
  const raw=plain(E.textRuns({texto}));
  assert.deepEqual(raw.filter(r=>r.n).map(r=>r.t),['[',']','[…]','[',']','[...]','[ … ]']);
  const tokens=[{s:1,e:9,w:'Afranius',i:0},{s:10,e:21,w:'Petreiusque',i:1}];
  const analyzed=plain(E.textRuns({texto,tokens,textAnalyzed:texto,subr:[{toks:[0]}]}));
  assert.equal(analyzed.map(r=>r.t).join(''),texto);
  assert.deepEqual(analyzed.filter(r=>r.n).map(r=>r.t),raw.filter(r=>r.n).map(r=>r.t));
  assert.deepEqual(analyzed.filter(r=>r.u).map(r=>[r.t,r.n]),[['Afranius',false]]);
});
test('Examinator reconoce una omisión aunque los runs la dividan',()=>{
  const texto='Rōma [ … ] venit';
  const s=texto.indexOf('…');
  const rs=plain(E.textRuns({texto,tokens:[{s,e:s+1,w:'…',i:0}]}));
  assert.equal(rs.map(r=>r.t).join(''),texto);
  assert.equal(rs.filter(r=>r.n).map(r=>r.t).join(''),'[ … ]');
});
